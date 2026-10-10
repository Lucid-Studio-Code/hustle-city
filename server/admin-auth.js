// Biff City : connexion au back office avec un vrai compte admin (e-mail + mot de passe + code par e-mail).
// - Mot de passe : scrypt (node:crypto) avec sel, table admin_users. Jamais en clair, ni en base ni dans les journaux.
// - Code à 6 chiffres envoyé par e-mail après un bon mot de passe (10 min, 5 essais, un nouveau toutes les 60 s au plus).
//   Tant que le SMTP n'est pas réglé (page Sécurité) : connexion sans code, pour ne jamais bloquer l'accès.
// - Session : cookie « hc_adm » HttpOnly, Secure, SameSite=Strict, Path=/admin, 12 h ; seule son empreinte SHA-256 est gardée (admin_sessions).
// - Anti-force-brute : 5 mots de passe / codes faux en 15 min par IP et par compte → 429 pendant 15 min ; chaque tentative est notée (admin_auth_log).
// - L'ADMIN_TOKEN (en-tête Authorization) reste l'accès de secours : il permet aussi de recréer le compte (mot de passe oublié).
const crypto = require('crypto'), { promisify } = require('util');
const { sendMail, ready, addrOf } = require('./mail');
const scrypt = promisify(crypto.scrypt);
const SESSION_MS = 12 * 3600000, CODE_MS = +process.env.ADMIN_CODE_MS || 10 * 60000,   // ADMIN_CODE_MS : seulement pour les tests
  CODE_TRIES = 5, RESEND_MS = 60000, PW_TRY = 5, PW_MS = 15 * 60000, PW_MIN = 12;
const COOKIE = 'hc_adm', EMAIL_RE = /^[^\s@<>"'`,;]{1,64}@[a-z0-9.-]{1,180}\.[a-z]{2,}$/i;
const shaHex = v => crypto.createHash('sha256').update(String(v)).digest('hex');

function makeAdminAuth({ db, q, q1, run, send, body, limit, left, ipKey, clientIp, isLocalReq, log, same, txt, now }) {
  db.exec(`CREATE TABLE IF NOT EXISTS admin_users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, pw TEXT, created INT, updated INT);
    CREATE TABLE IF NOT EXISTS admin_sessions (id INTEGER PRIMARY KEY, th TEXT UNIQUE, uid INT, created INT, expires INT, last INT, ip TEXT, ua TEXT);
    CREATE TABLE IF NOT EXISTS admin_auth_log (id INTEGER PRIMARY KEY, t INT, email TEXT, ok INT, what TEXT, ip TEXT, ua TEXT);`);
  const purge = () => { run('DELETE FROM admin_sessions WHERE expires < ?', now()); run('DELETE FROM admin_auth_log WHERE t < ?', now() - 180 * 86400000); };
  purge(); setInterval(purge, 3600000);

  // ---------------------------------------------------------------- mots de passe (format : scrypt$N$r$p$sel$empreinte)
  async function hashPw(pw) { const salt = crypto.randomBytes(16), h = await scrypt(String(pw), salt, 64, { N: 16384, r: 8, p: 1 }); return `scrypt$16384$8$1$${salt.toString('base64')}$${h.toString('base64')}`; }
  async function checkPw(stored, pw) {
    const [k, N, r, p, salt, h] = String(stored || '').split('$'); if (k !== 'scrypt' || !h) return false;
    const want = Buffer.from(h, 'base64'), got = await scrypt(String(pw), Buffer.from(salt, 'base64'), want.length, { N: +N, r: +r, p: +p, maxmem: 64 * 1048576 });
    return crypto.timingSafeEqual(want, got);
  }
  let DUMMY = ''; hashPw('pas-de-compte').then(h => { DUMMY = h; });   // même durée de calcul quand l'e-mail n'existe pas
  const pwOk = (pw, pw2) => typeof pw !== 'string' || pw.length < PW_MIN ? `Le mot de passe doit faire au moins ${PW_MIN} caractères.` : pw.length > 200 ? 'Mot de passe trop long.' : pw2 != null && pw !== pw2 ? 'Les deux mots de passe ne sont pas les mêmes.' : '';

  // ---------------------------------------------------------------- journal des connexions (jamais le mot de passe ni le code)
  const ua = req => txt(req.headers['user-agent'], 160) || '';
  const ipOf = req => ipKey(clientIp(req));
  const authLog = (req, email, ok, what) => run('INSERT INTO admin_auth_log (t, email, ok, what, ip, ua) VALUES (?, ?, ?, ?, ?, ?)', now(), String(email || '').slice(0, 120), ok ? 1 : 0, what, ipOf(req), ua(req));
  const user = () => q1('SELECT * FROM admin_users ORDER BY id LIMIT 1');
  const smtpCfg = () => { const r = q1("SELECT v FROM config WHERE k = 'smtp'"); try { return r ? JSON.parse(r.v) : {}; } catch (e) { return {}; } };
  const mask = e => { const [a, d] = String(e).split('@'); return (a || '').slice(0, 1) + '•••@' + (d || ''); };

  // ---------------------------------------------------------------- sessions
  const cookieOf = req => { const m = new RegExp('(?:^|;\\s*)' + COOKIE + '=([\\w-]{20,100})').exec(req.headers.cookie || ''); return m ? m[1] : ''; };
  const setCookie = (req, res, v, age) => res.setHeader('Set-Cookie', `${COOKIE}=${v}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${isLocalReq(req) ? '' : '; Secure'}`);   // Secure partout sauf en local (http://localhost)
  function openSession(req, res, u) {
    const t = crypto.randomBytes(32).toString('base64url');
    run('INSERT INTO admin_sessions (th, uid, created, expires, last, ip, ua) VALUES (?, ?, ?, ?, ?, ?, ?)', shaHex(t), u.id, now(), now() + SESSION_MS, now(), ipOf(req), ua(req));
    setCookie(req, res, t, SESSION_MS / 1000);
  }
  function sessionOf(req) {
    const t = cookieOf(req); if (!t) return null;
    const s = q1('SELECT s.id, s.uid, s.last, u.email FROM admin_sessions s JOIN admin_users u ON u.id = s.uid WHERE s.th = ? AND s.expires > ?', shaHex(t), now()); if (!s) return null;
    if (now() - s.last > 60000) run('UPDATE admin_sessions SET last = ? WHERE id = ?', now(), s.id);
    return { via: 'session', sid: s.id, uid: s.uid, email: s.email };
  }
  // CSRF : le cookie SameSite=Strict n'est jamais envoyé par un autre site ; en plus, toute requête POST du back office doit venir de la page elle-même
  function csrfOk(req) {
    const sfs = req.headers['sec-fetch-site'], origin = req.headers.origin;
    if (sfs && sfs !== 'same-origin' && sfs !== 'none') return false;
    if (origin) { try { if (new URL(origin).host !== String(req.headers.host || '')) return false; } catch (e) { return false; } }
    return true;
  }
  const blocked = (req, email) => left('pw-ip:' + ipOf(req), PW_TRY, PW_MS) < 1 || (email && left('pw-acct:' + email, PW_TRY, PW_MS) < 1);
  const fail = (req, email) => { limit('pw-ip:' + ipOf(req), PW_TRY, PW_MS); if (email) limit('pw-acct:' + email, PW_TRY, PW_MS); if (blocked(req, email)) console.warn(`back office : ${PW_TRY} échecs de connexion en 15 min (connexion ${ipOf(req)}${email ? ', compte ' + email : ''}), bloqué 15 min`); };
  const tooMany = res => { res.setHeader('Retry-After', String(PW_MS / 1000)); return send(res, 429, { err: 'Trop d\'essais ratés : réessaie dans 15 minutes.' }); };

  // ---------------------------------------------------------------- code par e-mail (en mémoire : un redémarrage oblige à recommencer)
  const challenges = new Map();
  setInterval(() => { for (const [k, c] of challenges) if (c.exp < now()) challenges.delete(k); }, 60000);
  async function sendCode(c) {
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    await sendMail(smtpCfg(), c.email, `Ton code de connexion Biff City : ${code}`, `Bonjour,\n\nTon code pour entrer dans le back office de Biff City : ${code}\n\nIl est valable 10 minutes. Si ce n'est pas toi qui essaies de te connecter, change ton mot de passe (page Sécurité du back office).\n\nBiff City`);
    Object.assign(c, { h: shaHex(code), exp: now() + CODE_MS, tries: 0, sent: now() });
  }

  // ---------------------------------------------------------------- routes publiques (écran de connexion)
  const routes = {
    'GET /admin/login/state'(req, res) { send(res, 200, { hasUser: !!user() }); },
    async 'POST /admin/login/password'(req, res) {
      const b = await body(req, 2e4), email = String(b.email || '').trim().toLowerCase().slice(0, 200), pw = String(b.password || '').slice(0, 200);
      if (blocked(req, email)) { authLog(req, email, 0, 'bloqué (trop d\'essais)'); return tooMany(res); }
      const u = email && q1('SELECT * FROM admin_users WHERE email = ?', email), good = await checkPw(u ? u.pw : DUMMY, pw);
      if (!u || !good) { fail(req, email); authLog(req, email, 0, 'mot de passe faux'); return send(res, 401, { err: 'E-mail ou mot de passe incorrect.' }); }
      if (!ready(smtpCfg())) { openSession(req, res, u); authLog(req, email, 1, 'connexion (sans code : e-mail pas réglé)'); return send(res, 200, { ok: true }); }
      const ch = crypto.randomBytes(18).toString('base64url'), c = { uid: u.id, email: u.email, n: 1 };
      try { await sendCode(c); } catch (e) { console.warn('SMTP :', e.message); authLog(req, email, 0, 'code pas envoyé (SMTP)'); return send(res, 502, { err: 'Le code n\'a pas pu être envoyé par e-mail. Réessaie, ou entre avec le jeton de secours.' }); }
      challenges.set(ch, c); authLog(req, email, 1, 'mot de passe bon, code envoyé'); send(res, 200, { code: true, ch, to: mask(u.email) });
    },
    async 'POST /admin/login/code'(req, res) {
      const b = await body(req, 2e4), c = challenges.get(String(b.ch || ''));
      if (!c || c.exp < now()) { challenges.delete(String(b.ch || '')); return send(res, 401, { err: 'Code expiré : recommence la connexion.', restart: true }); }
      if (blocked(req, c.email)) { authLog(req, c.email, 0, 'bloqué (trop d\'essais)'); return tooMany(res); }
      if (!same(shaHex(String(b.code || '').replace(/\D/g, '')), c.h)) {
        c.tries++; fail(req, c.email); authLog(req, c.email, 0, 'code faux');
        if (c.tries >= CODE_TRIES) { challenges.delete(String(b.ch)); return send(res, 401, { err: `${CODE_TRIES} codes faux : recommence la connexion.`, restart: true }); }
        return send(res, 401, { err: `Code incorrect (encore ${CODE_TRIES - c.tries} essai${CODE_TRIES - c.tries > 1 ? 's' : ''}).` });
      }
      challenges.delete(String(b.ch)); const u = q1('SELECT * FROM admin_users WHERE id = ?', c.uid); if (!u) return send(res, 401, { err: 'Compte introuvable.', restart: true });
      openSession(req, res, u); authLog(req, u.email, 1, 'connexion (code bon)'); send(res, 200, { ok: true });
    },
    async 'POST /admin/login/resend'(req, res) {
      const b = await body(req, 2e4), c = challenges.get(String(b.ch || ''));
      if (!c || c.exp < now()) return send(res, 401, { err: 'Code expiré : recommence la connexion.', restart: true });
      const wait = Math.ceil((c.sent + RESEND_MS - now()) / 1000); if (wait > 0) return send(res, 429, { err: `Attends encore ${wait} s avant de redemander un code.`, wait });
      if (c.n >= 5) return send(res, 429, { err: 'Trop de codes demandés : recommence la connexion.', restart: true });
      try { await sendCode(c); c.n++; } catch (e) { console.warn('SMTP :', e.message); return send(res, 502, { err: 'Le code n\'a pas pu être envoyé par e-mail.' }); }
      authLog(req, c.email, 1, 'nouveau code envoyé'); send(res, 200, { ok: true, to: mask(c.email) });
    },
    async 'POST /admin/logout'(req, res) {
      const s = sessionOf(req); if (s) { run('DELETE FROM admin_sessions WHERE id = ?', s.sid); authLog(req, s.email, 1, 'déconnexion'); }
      setCookie(req, res, '', 0); send(res, 200, { ok: true });
    }
  };

  // ---------------------------------------------------------------- API du back office (déjà connecté : req.admin = { via: 'session' | 'token', … })
  const smtpPub = () => { const c = smtpCfg(); return { host: c.host || '', port: +c.port || 465, user: c.user || '', from: c.from || '', passSet: !!c.pass, ready: ready(c) }; };
  const api = {
    'GET /admin/api/me'(req, res) {
      const u = user(); if (req.admin.via === 'token') authLog(req, u ? u.email : '', 1, 'entrée avec le jeton de secours');
      send(res, 200, { via: req.admin.via, email: req.admin.email || (u ? u.email : ''), hasUser: !!u, smtp: ready(smtpCfg()) });
    },
    async 'POST /admin/api/account'(req, res) {   // créer (ou recréer, mot de passe oublié) le compte : seulement avec le jeton de secours
      if (req.admin.via !== 'token') return send(res, 403, { err: 'Pour changer de mot de passe, passe par la page Sécurité.' });
      const b = await body(req, 2e4), email = String(b.email || '').trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return send(res, 400, { err: 'Adresse e-mail invalide.' });
      const bad = pwOk(b.password, b.password2); if (bad) return send(res, 400, { err: bad });
      const pw = await hashPw(b.password);
      db.exec('BEGIN'); try { run('DELETE FROM admin_sessions'); run('DELETE FROM admin_users'); run('INSERT INTO admin_users (email, pw, created, updated) VALUES (?, ?, ?, ?)', email, pw, now(), now()); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
      authLog(req, email, 1, 'compte admin créé'); log('admin-account', { email }); send(res, 200, { ok: true });
    },
    async 'POST /admin/api/password'(req, res) {   // { old, password, password2 } ; les autres sessions sont fermées
      if (req.admin.via !== 'session') return send(res, 403, { err: 'Connecte-toi avec ton compte pour changer de mot de passe.' });
      const b = await body(req, 2e4), u = q1('SELECT * FROM admin_users WHERE id = ?', req.admin.uid);
      if (blocked(req, u.email)) return tooMany(res);
      if (!(await checkPw(u.pw, String(b.old || '')))) { fail(req, u.email); authLog(req, u.email, 0, 'changement de mot de passe : ancien faux'); return send(res, 400, { err: 'L\'ancien mot de passe n\'est pas le bon.' }); }
      const bad = pwOk(b.password, b.password2); if (bad) return send(res, 400, { err: bad });
      run('UPDATE admin_users SET pw = ?, updated = ? WHERE id = ?', await hashPw(b.password), now(), u.id); run('DELETE FROM admin_sessions WHERE uid = ? AND id != ?', u.id, req.admin.sid);
      authLog(req, u.email, 1, 'mot de passe changé'); send(res, 200, { ok: true });
    },
    'GET /admin/api/security'(req, res) {
      const u = user();
      send(res, 200, { via: req.admin.via, email: u ? u.email : '', smtp: smtpPub(),
        sessions: q('SELECT id, created, expires, last, ip, ua FROM admin_sessions WHERE expires > ? ORDER BY last DESC', now()).map(s => ({ ...s, current: s.id === req.admin.sid })),
        log: q('SELECT t, email, ok, what, ip, ua FROM admin_auth_log ORDER BY t DESC LIMIT 100') });
    },
    async 'POST /admin/api/session-revoke'(req, res) {   // { id } ou { others: true } (toutes sauf celle-ci)
      const b = await body(req, 2e4), n = b.others ? run('DELETE FROM admin_sessions WHERE id != ?', req.admin.sid || 0).changes : run('DELETE FROM admin_sessions WHERE id = ?', +b.id || 0).changes;
      authLog(req, req.admin.email || '', 1, `session${b.others ? 's' : ''} fermée${b.others ? 's' : ''} (${Number(n)})`); send(res, 200, { ok: true, n: Number(n) });
    },
    async 'POST /admin/api/smtp'(req, res) {   // { host, port, user, pass (vide = garder), from } ; le mot de passe n'est jamais renvoyé
      const b = await body(req, 2e4), cur = smtpCfg();
      if (b.clear) { run("DELETE FROM config WHERE k = 'smtp'"); log('smtp', { clear: true }); return send(res, 200, { ok: true, smtp: smtpPub() }); }
      const host = String(b.host || '').trim().toLowerCase(), port = Math.round(+b.port || 465), user = String(b.user || '').trim(), from = String(b.from || '').replace(/[\r\n]/g, '').trim();
      if (!/^[a-z0-9.-]{3,190}$/.test(host)) return send(res, 400, { err: 'Serveur SMTP invalide.' });
      if (!(port > 0 && port < 65536)) return send(res, 400, { err: 'Port invalide.' });
      if (!user || user.length > 200 || /[\r\n]/.test(user)) return send(res, 400, { err: 'Identifiant invalide.' });
      if (from.length > 200 || (from && !addrOf(from))) return send(res, 400, { err: 'Expéditeur invalide (ex. : Biff City <contact@biffcity.fr>).' });
      const pass = typeof b.pass === 'string' && b.pass.trim() ? b.pass.replace(/\s+/g, '').slice(0, 200) : cur.pass || '';   // mot de passe d'application Google : les espaces ne comptent pas
      run("INSERT INTO config (k, v) VALUES ('smtp', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify({ host, port, user, pass, from }));
      log('smtp', { host, port, user, from, pass: pass ? 'configuré' : 'vide' }); send(res, 200, { ok: true, smtp: smtpPub() });
    },
    async 'POST /admin/api/smtp-test'(req, res) {
      const u = user(), to = (u && u.email) || smtpCfg().user;
      if (!limit('smtp-test', 10, 3600000)) return send(res, 429, { err: 'Trop d\'e-mails de test, réessaie plus tard.' });
      try { await sendMail(smtpCfg(), to, 'Biff City : e-mail de test', 'Bonjour,\n\nSi tu lis ceci, l\'envoi des codes de connexion du back office marche.\n\nBiff City'); }
      catch (e) { return send(res, 502, { err: e.message }); }
      log('smtp-test', { to }); send(res, 200, { ok: true, to });
    }
  };
  return { routes, api, sessionOf, csrfOk, authLog };
}
module.exports = { makeAdminAuth };
