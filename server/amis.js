// Biff City : jouer entre amis (appli « Potes » du téléphone, js/amis.js). Réglages : AMIS dans js/data.js.
// - On s'ajoute par « Pseudo#1234 » (majuscules, accents et espaces ignorés) : demande à accepter. Deux demandes croisées = potes tout de suite.
//   Le couple pseudo + tag est rendu unique ici (uniqTag) : un doublon reçoit un autre tag, renvoyé au jeu.
// - Un pote ne voit de l'autre qu'un résumé ARRONDI (niveau, patrimoine à 2 chiffres, dernière connexion, plus belle carte…),
//   jamais sa sauvegarde, son pid ni son secret : chaque joueur a un identifiant public (fid) pour les gestes entre potes.
// - Fil d'actu : gros pari gagné, carte légendaire, palier de niveau, « il t'a dépassé » ; une notif par pote et par heure (le reste est regroupé), 50 entrées gardées.
// - Parrainage : le filleul arrive par le lien d'un pote (?ami=Pseudo%231234) et devient son pote ; récompenses par la boîte de réception (table inbox).
//   Un filleul ne compte qu'une fois, jamais depuis l'appareil du parrain, et 20 filleuls récompensés au plus par parrain.
const crypto = require('crypto');

function makeAmis({ db, q, q1, run, send, body, player, limit, now, cleanName, cleanTag, cleanId, lvlOf, num, game, cdmEd, push, log, DAY, ONLINE_MS }) {
  // réglages : ceux de js/data.js (et du back-office), sinon ceux-ci
  const DEF = { max: 100, pendingOut: 20, pendingIn: 50, perMin: 5, bigWin: 3000, lvlStep: 5, feedMax: 50, feedHourly: 1,
    parrain: { filleulLingots: 10, filleulBoosters: 1, parrainLingots: 25, parrainBoosters: 1, parrainRare: 1, lvl: 5, pinAt: 3, maxRewarded: 20, pin: 'pn-parrain', frame: 'fr-parrain' } };
  const A = () => { const g = game().AMIS || {}; return { ...DEF, ...g, parrain: { ...DEF.parrain, ...(g.parrain || {}) } }; };
  const J = s => { try { return JSON.parse(s || '{}') || {}; } catch (e) { return {}; } };

  // ---------------------------------------------------------------- identité : pseudo#tag unique, fid public
  // clé de comparaison d'un pseudo : minuscules, sans accent ni espace (« Lucky Max » = « luckymax »)
  const nameKey = n => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
  const randTag = n => String(10 ** (n - 1) + crypto.randomInt(9 * 10 ** (n - 1)));
  function uniqTag(pid, name, tag) {
    const k = nameKey(name); if (!k) return tag;
    const taken = t => q('SELECT name FROM players WHERE tag = ? AND pid != ?', t, pid).some(r => nameKey(r.name) === k);
    if (tag && !taken(tag)) return tag;
    for (let i = 0; i < 60; i++) { const t = randTag(i < 40 ? 4 : 5); if (!taken(t)) return t; }
    return randTag(6);
  }
  function fidOf(pid) {
    const r = q1('SELECT fid FROM players WHERE pid = ?', pid); if (!r) return null; if (r.fid) return r.fid;
    const f = crypto.randomBytes(8).toString('base64url'); run('UPDATE players SET fid = ? WHERE pid = ?', f, pid); return f;
  }
  const byFid = f => typeof f === 'string' && /^[\w-]{6,16}$/.test(f) ? q1('SELECT * FROM players WHERE fid = ?', f) : null;
  // « Pseudo#1234 », « pseudo # 1234 », « Pseudo1234 » (4 chiffres collés)
  function findCode(code) {
    const s = String(code || '').normalize('NFC').trim().slice(0, 40), m = s.match(/^(.+?)\s*#\s*(\d{1,6})$/) || s.match(/^(.+?)\s*(\d{4})$/);
    if (!m) return null; const k = nameKey(m[1]);
    return q('SELECT * FROM players WHERE tag = ?', m[2]).find(r => nameKey(r.name) === k) || null;
  }

  // ---------------------------------------------------------------- ce qu'un pote voit de l'autre (tout arrondi)
  const round2 = v => { v = Math.round(num(v)); if (v < 100) return v; const r = 10 ** (Math.floor(Math.log10(v)) - 1); return Math.round(v / r) * r; };
  const sround = v => (v < 0 ? -1 : 1) * round2(Math.abs(v));
  // dernière connexion : « en ligne » (0), sinon en minutes arrondies (5 min, puis l'heure, puis le jour)
  const ago = t => { const m = Math.max(0, (now() - (t || 0)) / 60000); return now() - (t || 0) < ONLINE_MS ? 0 : m < 60 ? Math.max(1, Math.round(m / 5) * 5) : m < 2880 ? Math.round(m / 60) * 60 : Math.round(m / 1440) * 1440; };
  const pub = r => ({ fid: fidOf(r.pid), name: cleanName(r.name) || 'Joueur', tag: cleanTag(r.tag), skin: cleanId(r.skin), avatar: cleanId(r.avatar), frame: cleanId(r.frame), lvl: lvlOf(r.lvl), worth: round2(r.worth), ago: ago(r.last_seen) });
  const COLS = 'pid, name, tag, skin, avatar, frame, lvl, worth, last_seen';
  const friendsOf = pid => q(`SELECT ${COLS.split(', ').map(c => 'p.' + c).join(', ')}, f.t since FROM friends f JOIN players p ON p.pid = f.b WHERE f.a = ? ORDER BY p.last_seen DESC`, pid);
  const isFriend = (a, b) => !!q1('SELECT 1 x FROM friends WHERE a = ? AND b = ?', a, b);
  const nFriends = pid => q1('SELECT COUNT(*) n FROM friends WHERE a = ?', pid).n;
  function befriend(a, b) { const t = now(); run('INSERT OR IGNORE INTO friends (a, b, t) VALUES (?, ?, ?)', a, b, t); run('INSERT OR IGNORE INTO friends (a, b, t) VALUES (?, ?, ?)', b, a, t);
    run('DELETE FROM friend_req WHERE (from_pid = ? AND to_pid = ?) OR (from_pid = ? AND to_pid = ?)', a, b, b, a); }
  // gains aux paris depuis lundi (gagné − misé), pour le classement de la semaine
  const weekStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  function weekGains(pids) {
    if (!pids.length) return {}; const m = {};
    q(`SELECT pid, SUM(COALESCE(json_extract(data, '$.gain'), 0)) - SUM(COALESCE(json_extract(data, '$.stake'), 0)) g FROM events WHERE type = 'bet' AND t >= ? AND pid IN (${pids.map(() => '?').join(',')}) GROUP BY pid`, weekStart(now()), ...pids).forEach(r => { m[r.pid] = sround(r.g || 0); });
    return m;
  }

  // ---------------------------------------------------------------- fil d'actu : une entrée par destinataire, regroupée par pote et par heure
  function addFeed(to, from, kind, data, solo) {
    const C = A(), last = !solo && q1('SELECT id, data FROM feed WHERE pid = ? AND from_pid = ? AND kind NOT IN (\'ok\', \'join\') AND t > ? ORDER BY t DESC LIMIT 1', to, from, now() - 3600000 / Math.max(1, C.feedHourly));
    if (last) { const d = J(last.data); d.more = (+d.more || 0) + 1; run('UPDATE feed SET data = ? WHERE id = ?', JSON.stringify(d), last.id); return; }   // même heure : regroupé, sans nouvelle notif
    run('INSERT INTO feed (pid, t, kind, from_pid, data, seen) VALUES (?, ?, ?, ?, ?, 0)', to, now(), kind, from, JSON.stringify(data || {}));
    run('DELETE FROM feed WHERE pid = ? AND id NOT IN (SELECT id FROM feed WHERE pid = ? ORDER BY t DESC LIMIT ?)', to, to, Math.max(10, C.feedMax | 0));
  }
  const feedOut = r => { const p = q1(`SELECT ${COLS} FROM players WHERE pid = ?`, r.from_pid); return { id: r.id, t: r.t, kind: r.kind, data: J(r.data), who: p ? pub(p) : null }; };
  // après chaque synchro (server.js) : ce que le joueur vient de faire part chez ses potes
  function onSync(p, s, evs, raw) {
    const C = A(), pals = q('SELECT b FROM friends WHERE a = ?', p.pid).map(r => r.b);
    if (pals.length) {
      const out = [];
      (evs || []).forEach(e => { const d = e.data || {};
        if (e.type === 'bet' && d.state === 'won' && num(d.gain) >= C.bigWin) out.push(['bet', { gain: round2(d.gain) }]);
        if (e.type === 'legend' && typeof d.id === 'string') out.push(['legend', { id: String(d.id).slice(0, 40) }]);
        if (e.type === 'levelup' && C.lvlStep > 0 && lvlOf(d.lvl) % C.lvlStep === 0 && lvlOf(d.lvl) <= s.lvl) out.push(['lvl', { lvl: lvlOf(d.lvl) }]); });
      // le meilleur moment de la synchro (une seule entrée par pote) : légendaire, puis gros gain, puis niveau
      const best = out.find(x => x[0] === 'legend') || out.filter(x => x[0] === 'bet').sort((a, b) => b[1].gain - a[1].gain)[0] || out.find(x => x[0] === 'lvl');
      if (best) pals.forEach(f => addFeed(f, p.pid, best[0], best[1]));
      // il vient de passer devant un pote au patrimoine
      const before = num(p.worth), after = s.worth;
      if (after > before) q(`SELECT pid FROM players WHERE pid IN (${pals.map(() => '?').join(',')}) AND worth >= ? AND worth < ?`, ...pals, before, after).forEach(r => addFeed(r.pid, p.pid, 'pass', {}));
    }
    // parrainage : tuto fini → cadeau du filleul ; niveau atteint → cadeau du parrain (et le pin's au 3e)
    const rf = q1('SELECT * FROM referrals WHERE filleul = ?', p.pid); if (!rf) return;
    const P = C.parrain, par = q1('SELECT name, tag FROM players WHERE pid = ?', rf.parrain), pn = par ? `${cleanName(par.name)}#${cleanTag(par.tag)}` : 'un pote';
    if (!rf.tuto && raw && raw.tuto) {
      run('UPDATE referrals SET tuto = 1 WHERE filleul = ?', p.pid);
      const g = { lingots: P.filleulLingots | 0, boosters: P.filleulBoosters | 0 };
      if (g.lingots > 0 || g.boosters > 0) gift(p.pid, 'Cadeau de parrainage', `Tu es arrivé grâce à ${pn} : voilà de quoi bien démarrer.`, g);
    }
    if (!rf.lvl && s.lvl >= P.lvl && par) {
      run('UPDATE referrals SET lvl = 1 WHERE filleul = ?', p.pid);
      const paid = q1('SELECT COUNT(*) n FROM referrals WHERE parrain = ? AND paid = 1', rf.parrain).n, me = `${cleanName(p.name) || 'Ton filleul'}`;
      if (paid < P.maxRewarded) {
        run('UPDATE referrals SET paid = 1 WHERE filleul = ?', p.pid);
        const g = { lingots: P.parrainLingots | 0, boosters: P.parrainBoosters | 0, rare: P.parrainRare | 0 };
        if (g.lingots > 0 || g.boosters > 0 || g.rare > 0) gift(rf.parrain, 'Parrainage', `${me} vient de passer niveau ${P.lvl} grâce à toi : ta récompense est arrivée !`, g);
        if (paid + 1 === P.pinAt && (P.pin || P.frame)) gift(rf.parrain, 'Tu es Parrain !', `${P.pinAt} potes invités au niveau ${P.lvl} : le pin's et le cadre Parrain sont à toi. Mets-les sur ta photo depuis ton profil.`, { pin: P.pin || undefined, frame: P.frame || undefined });
      }
    }
  }
  const gift = (pid, title, text, g) => run('INSERT INTO inbox (pid, t, title, text, gift) VALUES (?, ?, ?, ?, ?)', pid, now(), title, text, JSON.stringify(g));

  // ---------------------------------------------------------------- demandes
  function request(p, t) {   // p demande t en pote → { ok, err, friends }
    const C = A();
    if (t.pid === p.pid) return { err: 'C\'est toi, ça ! Partage plutôt ton identifiant à un pote.' };
    if (t.banned) return { err: 'Ce joueur est introuvable.' };
    if (isFriend(p.pid, t.pid)) return { err: `${cleanName(t.name)} est déjà ton pote.` };
    if (q1('SELECT 1 x FROM friend_req WHERE from_pid = ? AND to_pid = ?', p.pid, t.pid)) return { err: 'Demande déjà envoyée : il doit l\'accepter.' };
    if (nFriends(p.pid) >= C.max) return { err: `Tu as déjà ${C.max} potes : retire-en un pour en ajouter un autre.` };
    // demande croisée : il t'avait déjà demandé → vous êtes potes tout de suite
    if (q1('SELECT 1 x FROM friend_req WHERE from_pid = ? AND to_pid = ?', t.pid, p.pid)) {
      if (nFriends(t.pid) >= C.max) return { err: 'Il a déjà trop de potes.' };
      befriend(p.pid, t.pid); addFeed(t.pid, p.pid, 'ok', {}, true); return { ok: true, friends: true };
    }
    if (q1('SELECT COUNT(*) n FROM friend_req WHERE from_pid = ?', p.pid).n >= C.pendingOut) return { err: `${C.pendingOut} demandes attendent déjà une réponse : patiente un peu.` };
    if (q1('SELECT COUNT(*) n FROM friend_req WHERE to_pid = ?', t.pid).n >= C.pendingIn) return { err: 'Il a trop de demandes en attente, réessaie plus tard.' };
    run('INSERT INTO friend_req (from_pid, to_pid, t, seen) VALUES (?, ?, ?, 0)', p.pid, t.pid, now());
    if (push && push.on) push.toPlayers([t.pid], 'Demande de pote', `${cleanName(p.name) || 'Un joueur'} veut être ton pote sur Biff City.`).catch(() => {});
    return { ok: true };
  }
  const reqRow = (r, pidCol) => { const x = q1(`SELECT ${COLS} FROM players WHERE pid = ?`, r[pidCol]); return x ? { ...pub(x), t: r.t } : null; };
  // ce qui est neuf depuis la dernière fois (pop-up de demande, notifs du fil) : donné une seule fois
  function fresh(pid) {
    const R = q('SELECT * FROM friend_req WHERE to_pid = ? AND seen = 0 ORDER BY t', pid), F = q('SELECT * FROM feed WHERE pid = ? AND seen = 0 ORDER BY t', pid);
    if (R.length) run('UPDATE friend_req SET seen = 1 WHERE to_pid = ? AND seen = 0', pid);
    if (F.length) run('UPDATE feed SET seen = 1 WHERE pid = ? AND seen = 0', pid);
    return { req: R.map(r => reqRow(r, 'from_pid')).filter(Boolean), feed: F.map(feedOut).filter(x => x.who), n: q1('SELECT COUNT(*) n FROM friend_req WHERE to_pid = ?', pid).n };
  }

  // ---------------------------------------------------------------- fiche d'un pote (tirée de sa sauvegarde, résumée côté serveur)
  const RK = { L: 4, E: 3, R: 2, C: 1 };
  function fiche(t) {
    const o = J(t.save), G = game(), items = G.ITEMS || [], prices = (o.market && o.market.prices) || {};
    const owned = Object.keys(o.owned || {}).filter(id => Array.isArray(o.owned[id]) && o.owned[id].length);
    const cards = owned.map(id => items.find(i => i.id === id)).filter(i => i && i.cat === 'card');
    const bc = cards.sort((a, b) => (RK[b.r] || 0) - (RK[a.r] || 0) || num(prices[b.id]) - num(prices[a.id]))[0];
    const trophies = owned.filter(id => { const i = items.find(x => x.id === id); return i && i.cat === 'trophy' && !i.ach; }).length + Object.keys(o.ach || {}).filter(k => o.ach[k]).length;
    const team = q1('SELECT team FROM cdm_pts WHERE ed = ? AND pid = ?', cdmEd(), t.pid);
    const win = q1("SELECT MAX(json_extract(data, '$.gain')) g FROM events WHERE pid = ? AND type = 'bet' AND t > ? AND json_extract(data, '$.state') = 'won'", t.pid, now() - 7 * DAY);
    return { ...pub(t), card: bc ? { id: bc.id, name: bc.name, r: bc.r, v: round2(prices[bc.id] || bc.p0 || 0) } : null, cards: cards.length, trophies, team: team ? cleanId(team.team) : null, bestWin: win && win.g ? round2(win.g) : 0,
      since: (q1('SELECT t FROM friends WHERE a = ? AND b = ?', t.pid, t.pid) || {}).t || null };
  }

  // ---------------------------------------------------------------- routes (POST, { pid, secret, … })
  const auth = async (req, res) => { const b = await body(req), p = player(b); if (!p) { send(res, 403, { err: 'auth' }); return [b, null]; } return [b, p]; };
  const routes = {
    async 'POST /api/amis'(req, res) {   // tout l'écran Potes : moi, mes potes, les demandes, le fil, les classements
      const [, p] = await auth(req, res); if (!p) return;
      if (!limit('amis:' + p.pid, 20, 60000)) return send(res, 429, { err: 'Doucement, réessaie dans un instant.' });
      const L = friendsOf(p.pid), me = q1(`SELECT ${COLS} FROM players WHERE pid = ?`, p.pid), wk = weekGains([p.pid, ...L.map(r => r.pid)]);
      const row = (r, mine) => ({ ...pub(r), week: wk[r.pid] || 0, me: !!mine });
      send(res, 200, { ok: true, me: { ...row(me, true), worth: Math.round(num(me.worth)) }, friends: L.map(r => row(r)),
        reqIn: q('SELECT * FROM friend_req WHERE to_pid = ? ORDER BY t DESC', p.pid).map(r => reqRow(r, 'from_pid')).filter(Boolean),
        reqOut: q('SELECT * FROM friend_req WHERE from_pid = ? ORDER BY t DESC', p.pid).map(r => reqRow(r, 'to_pid')).filter(Boolean),
        feed: q('SELECT * FROM feed WHERE pid = ? ORDER BY t DESC LIMIT ?', p.pid, Math.max(10, A().feedMax | 0)).map(feedOut).filter(x => x.who),
        filleuls: q1('SELECT COUNT(*) n FROM referrals WHERE parrain = ? AND paid = 1', p.pid).n, max: A().max });
    },
    async 'POST /api/amis/poll'(req, res) {   // le jeu demande toutes les 20 s s'il y a du neuf
      const [, p] = await auth(req, res); if (!p) return;
      if (!limit('amipoll:' + p.pid, 8, 60000)) return send(res, 200, { ok: true, req: [], feed: [], later: true });
      send(res, 200, { ok: true, ...fresh(p.pid) });
    },
    async 'POST /api/amis/add'(req, res) {   // { code: « Pseudo#1234 » }
      const [b, p] = await auth(req, res); if (!p) return;
      if (!limit('amiadd:' + p.pid, A().perMin, 60000) || !limit('amiaddd:' + p.pid, 60, DAY)) return send(res, 429, { err: 'Trop de demandes d\'un coup : attends une minute.' });
      const t = findCode(b.code); if (!t) return send(res, 200, { err: 'Personne avec cet identifiant. Vérifie le pseudo et les chiffres après le #.' });
      const r = request(p, t); send(res, 200, r.ok ? { ok: true, friends: !!r.friends, who: pub(t) } : { err: r.err });
    },
    async 'POST /api/amis/answer'(req, res) {   // { fid, ok } : accepter ou refuser une demande reçue
      const [b, p] = await auth(req, res); if (!p) return; const t = byFid(b.fid);
      const r = t && q1('SELECT * FROM friend_req WHERE from_pid = ? AND to_pid = ?', t.pid, p.pid); if (!r) return send(res, 200, { err: 'Cette demande n\'existe plus.' });
      if (b.ok) {
        if (nFriends(p.pid) >= A().max) return send(res, 200, { err: `Tu as déjà ${A().max} potes : retire-en un d'abord.` });
        if (nFriends(t.pid) >= A().max) { run('DELETE FROM friend_req WHERE id = ?', r.id); return send(res, 200, { err: 'Il a déjà trop de potes.' }); }
        befriend(p.pid, t.pid); addFeed(t.pid, p.pid, 'ok', {}, true);   // A est prévenu : « B a accepté »
      } else run('DELETE FROM friend_req WHERE id = ?', r.id);   // refus discret : l'autre voit juste sa demande disparaître
      send(res, 200, { ok: true });
    },
    async 'POST /api/amis/cancel'(req, res) {   // { fid } : retirer une demande envoyée
      const [b, p] = await auth(req, res); if (!p) return; const t = byFid(b.fid); if (t) run('DELETE FROM friend_req WHERE from_pid = ? AND to_pid = ?', p.pid, t.pid); send(res, 200, { ok: true });
    },
    async 'POST /api/amis/remove'(req, res) {   // { fid } : retirer un pote (des deux côtés, sans prévenir)
      const [b, p] = await auth(req, res); if (!p) return; const t = byFid(b.fid);
      if (t) { run('DELETE FROM friends WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)', p.pid, t.pid, t.pid, p.pid); run('DELETE FROM feed WHERE (pid = ? AND from_pid = ?) OR (pid = ? AND from_pid = ?)', p.pid, t.pid, t.pid, p.pid); }
      send(res, 200, { ok: true });
    },
    async 'POST /api/amis/fiche'(req, res) {   // { fid } : la fiche d'un pote (ou la sienne)
      const [b, p] = await auth(req, res); if (!p) return; if (!limit('amifiche:' + p.pid, 30, 60000)) return send(res, 429, { err: 'Doucement.' });
      const t = byFid(b.fid); if (!t || (t.pid !== p.pid && !isFriend(p.pid, t.pid))) return send(res, 200, { err: 'Ce joueur n\'est pas (ou plus) ton pote.' });
      const f = fiche(t); f.since = t.pid === p.pid ? null : (q1('SELECT t FROM friends WHERE a = ? AND b = ?', p.pid, t.pid) || {}).t || null; send(res, 200, { ok: true, fiche: f });
    },
    async 'POST /api/amis/parrain'(req, res) {   // { code, dev } : arrivé par le lien d'invitation d'un pote
      const [b, p] = await auth(req, res); if (!p) return; if (!limit('amiparrain:' + p.pid, 5, 3600000)) return send(res, 429, { err: 'Plus tard.' });
      const t = findCode(b.code); if (!t) return send(res, 200, { err: 'Lien d\'invitation inconnu.', gone: true });
      if (t.pid === p.pid) return send(res, 200, { err: 'C\'est ton propre lien.', gone: true });
      const P = A().parrain, old = q1('SELECT parrain FROM referrals WHERE filleul = ?', p.pid);
      // même appareil que le parrain (son navigateur, ou même connexion + même téléphone + même écran) : pas de parrainage
      const sameDev = (b.dev && t.save_dev && String(b.dev) === t.save_dev) || (p.ip && p.ip === t.ip && p.platform === t.platform && p.screen && p.screen === t.screen);
      // un vrai nouveau : compte de moins de 3 jours, pas encore au niveau des récompenses
      const newbie = now() - (p.created || 0) < 3 * DAY && lvlOf(p.lvl) < P.lvl;
      if (!old && newbie && !sameDev && !t.banned) {
        run('INSERT OR IGNORE INTO referrals (filleul, parrain, t) VALUES (?, ?, ?)', p.pid, t.pid, now());
        if (!isFriend(p.pid, t.pid) && nFriends(p.pid) < A().max && nFriends(t.pid) < A().max) befriend(p.pid, t.pid);
        addFeed(t.pid, p.pid, 'join', {}, true); log('parrainage', { filleul: p.pid, parrain: t.pid });
        return send(res, 200, { ok: true, referral: true, friends: isFriend(p.pid, t.pid), who: pub(t) });
      }
      if (sameDev) log('parrainage-refuse', { filleul: p.pid, parrain: t.pid, why: 'appareil' });
      const r = request(p, t);   // déjà joueur, ou même appareil : une simple demande de pote
      send(res, 200, r.ok ? { ok: true, referral: false, friends: !!r.friends, who: pub(t) } : { err: r.err, gone: true });
    }
  };

  // ---------------------------------------------------------------- back office : fiche joueur
  function forAdmin(pid) {
    const L = q(`SELECT p.pid, p.name, p.tag, p.lvl, p.worth, p.last_seen, f.t FROM friends f JOIN players p ON p.pid = f.b WHERE f.a = ? ORDER BY f.t DESC`, pid);
    const F = q('SELECT r.*, p.name, p.tag, p.lvl FROM referrals r LEFT JOIN players p ON p.pid = r.filleul WHERE r.parrain = ? ORDER BY r.t DESC', pid);
    const by = q1('SELECT r.parrain, p.name, p.tag FROM referrals r LEFT JOIN players p ON p.pid = r.parrain WHERE r.filleul = ?', pid);
    return { friends: L, filleuls: F, parrain: by || null, pendingIn: q1('SELECT COUNT(*) n FROM friend_req WHERE to_pid = ?', pid).n, pendingOut: q1('SELECT COUNT(*) n FROM friend_req WHERE from_pid = ?', pid).n };
  }
  // RGPD (« Supprimer mes données ») : tout ce qui concerne le joueur, des deux côtés
  function forget(pid) {
    run('DELETE FROM friends WHERE a = ? OR b = ?', pid, pid); run('DELETE FROM friend_req WHERE from_pid = ? OR to_pid = ?', pid, pid);
    run('DELETE FROM feed WHERE pid = ? OR from_pid = ?', pid, pid); run('DELETE FROM referrals WHERE filleul = ? OR parrain = ?', pid, pid);
  }
  return { routes, onSync, uniqTag, forAdmin, forget };
}
module.exports = { makeAmis };
