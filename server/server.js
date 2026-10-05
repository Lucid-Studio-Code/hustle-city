// Hustle City : serveur du jeu en ligne + back office.
// Lancer : node server/server.js   (variables : PORT=5300, ADMIN_TOKEN=…, DB=server/hustle.db)
// Il sert le jeu (/game.html), l'API des joueurs (/api/…) et le back office (/admin/, protégé par ADMIN_TOKEN).
// Base : SQLite intégré à Node (aucun service externe). Pour publier : le déployer tel quel sur un petit serveur (Node ≥ 22).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const ROOT = path.join(__dirname, '..'), PORT = +process.env.PORT || 5300;
const DBFILE = process.env.DB || path.join(__dirname, 'hustle.db');
const TOKEN_FILE = path.join(__dirname, '.admin-token');
// jeton du back office : variable d'environnement, sinon un jeton créé au premier lancement (gardé dans server/.admin-token)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || (fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : (() => { const t = crypto.randomBytes(18).toString('base64url'); fs.writeFileSync(TOKEN_FILE, t); return t; })());

const db = new DatabaseSync(DBFILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS players (pid TEXT PRIMARY KEY, secret TEXT, name TEXT, tag TEXT, skin TEXT, lvl INT, worth REAL, cash REAL, lingots INT,
    created INT, last_seen INT, sessions INT DEFAULT 0, play_ms INT DEFAULT 0, platform TEXT, ver TEXT, banned INT DEFAULT 0, ban_reason TEXT, notes TEXT, save TEXT, save_at INT);
  CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, pid TEXT, t INT, type TEXT, data TEXT);
  CREATE INDEX IF NOT EXISTS ev_t ON events(t); CREATE INDEX IF NOT EXISTS ev_pid ON events(pid, t); CREATE INDEX IF NOT EXISTS ev_type ON events(type, t);
  CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY, pid TEXT, t INT, status TEXT DEFAULT 'ouvert', subject TEXT);
  CREATE TABLE IF NOT EXISTS ticket_msgs (id INTEGER PRIMARY KEY, ticket INT, t INT, from_admin INT, text TEXT);
  CREATE TABLE IF NOT EXISTS inbox (id INTEGER PRIMARY KEY, pid TEXT, t INT, title TEXT, text TEXT, gift TEXT, claimed INT DEFAULT 0);
  CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT);
  CREATE TABLE IF NOT EXISTS admin_log (id INTEGER PRIMARY KEY, t INT, action TEXT, data TEXT);
`);
const q = (sql, ...a) => db.prepare(sql).all(...a), q1 = (sql, ...a) => db.prepare(sql).get(...a), run = (sql, ...a) => db.prepare(sql).run(...a);
const now = () => Date.now(), DAY = 86400000;
const getCfg = () => { const r = q1("SELECT v FROM config WHERE k = 'live'"); return r ? JSON.parse(r.v) : {}; };
const log = (action, data) => run('INSERT INTO admin_log (t, action, data) VALUES (?, ?, ?)', now(), action, JSON.stringify(data || {}));

function send(res, code, obj, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Cache-Control': 'no-store' });
  res.end(type ? obj : JSON.stringify(obj));
}
function body(req) { return new Promise(ok => { let b = ''; req.on('data', c => { b += c; if (b.length > 3e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ok({}); } }); }); }
// un joueur s'identifie par son pid + un secret créé par son jeu (pas de mot de passe)
function player(b) { const p = b.pid && q1('SELECT * FROM players WHERE pid = ?', String(b.pid)); return p && p.secret === b.secret ? p : null; }
const inboxFor = pid => q('SELECT id, t, title, text, gift FROM inbox WHERE pid = ? AND claimed = 0 ORDER BY t', pid).map(m => ({ ...m, gift: m.gift ? JSON.parse(m.gift) : null }));

// ------------------------------------------------------------------ API des joueurs
const api = {
  async 'POST /api/hello'(req, res) {
    const b = await body(req); if (!b.pid || !b.secret) return send(res, 400, { err: 'pid' });
    let p = q1('SELECT * FROM players WHERE pid = ?', b.pid);
    if (!p) { run('INSERT INTO players (pid, secret, name, tag, created, last_seen, platform, ver) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', b.pid, b.secret, b.name || '', b.tag || '', now(), now(), b.platform || '', b.ver || '');
      run('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)', b.pid, now(), 'install', '{}'); p = q1('SELECT * FROM players WHERE pid = ?', b.pid); }
    else if (p.secret !== b.secret) return send(res, 403, { err: 'secret' });
    run('UPDATE players SET sessions = sessions + 1, last_seen = ?, name = ?, tag = ?, platform = ?, ver = ? WHERE pid = ?', now(), b.name || p.name, b.tag || p.tag, b.platform || p.platform, b.ver || p.ver, b.pid);
    run('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)', b.pid, now(), 'session', JSON.stringify({ ver: b.ver }));
    send(res, 200, { ok: true, banned: !!p.banned, banReason: p.ban_reason || '', config: getCfg(), inbox: inboxFor(b.pid) });
  },
  async 'POST /api/sync'(req, res) {
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' });
    const s = b.summary || {};
    run('UPDATE players SET last_seen = ?, lvl = ?, worth = ?, cash = ?, lingots = ?, skin = ?, name = ?, tag = ?, play_ms = play_ms + ? WHERE pid = ?',
      now(), s.lvl || 0, s.worth || 0, s.cash || 0, s.lingots || 0, s.skin || '', s.name || p.name, s.tag || p.tag, Math.min(+b.playMs || 0, 600000), p.pid);
    if (b.save && b.save.length < 2.5e6) run('UPDATE players SET save = ?, save_at = ? WHERE pid = ?', b.save, now(), p.pid);
    const ins = db.prepare('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)');
    (b.events || []).slice(0, 500).forEach(e => ins.run(p.pid, +e.t || now(), String(e.type).slice(0, 40), JSON.stringify(e.data || {}).slice(0, 2000)));
    send(res, 200, { ok: true, banned: !!p.banned, banReason: p.ban_reason || '', inbox: inboxFor(p.pid), cfgAt: (q1("SELECT v FROM config WHERE k = 'live_at'") || {}).v || 0 });
  },
  async 'POST /api/claim'(req, res) { const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' }); run('UPDATE inbox SET claimed = 1 WHERE id = ? AND pid = ?', +b.id, p.pid); send(res, 200, { ok: true }); },
  async 'GET /api/config'(req, res) { send(res, 200, getCfg()); },
  async 'POST /api/support'(req, res) {
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' }); const text = String(b.text || '').slice(0, 2000).trim(); if (!text) return send(res, 400, { err: 'vide' });
    let t = q1("SELECT * FROM tickets WHERE pid = ? AND status != 'fermé' ORDER BY t DESC", p.pid);
    if (!t) { run('INSERT INTO tickets (pid, t, subject) VALUES (?, ?, ?)', p.pid, now(), text.slice(0, 80)); t = q1('SELECT * FROM tickets WHERE pid = ? ORDER BY id DESC', p.pid); }
    else run("UPDATE tickets SET status = 'ouvert', t = ? WHERE id = ?", now(), t.id);
    run('INSERT INTO ticket_msgs (ticket, t, from_admin, text) VALUES (?, ?, 0, ?)', t.id, now(), text);
    send(res, 200, { ok: true });
  },
  async 'POST /api/restore'(req, res) {   // récupérer sa partie sur un nouvel appareil : pid + secret (le « code de récupération »)
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'Code inconnu.' }); send(res, 200, { ok: true, save: p.save });
  }
};

// ------------------------------------------------------------------ API du back office
function stats(days) {
  const t0 = now() - days * DAY, out = { days: [] };
  for (let i = days - 1; i >= 0; i--) {
    const a = new Date(now() - i * DAY); a.setHours(0, 0, 0, 0); const b = a.getTime() + DAY;
    const dau = q1("SELECT COUNT(DISTINCT pid) n FROM events WHERE t >= ? AND t < ? AND type = 'session'", a.getTime(), b).n;
    const inst = q1('SELECT COUNT(*) n FROM players WHERE created >= ? AND created < ?', a.getTime(), b).n;
    const ads = q1("SELECT COUNT(*) n FROM events WHERE t >= ? AND t < ? AND type = 'ad'", a.getTime(), b).n;
    const iap = q1("SELECT COUNT(*) n FROM events WHERE t >= ? AND t < ? AND type = 'iap_click'", a.getTime(), b).n;
    const ld = `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}-${String(a.getDate()).padStart(2, '0')}`;   // date locale (pas UTC)
    out.days.push({ d: ld, dau, installs: inst, ads, iap });
  }
  const P = q1('SELECT COUNT(*) n, AVG(lvl) lvl, AVG(play_ms) play, SUM(lingots) lingots FROM players').n ? q1('SELECT COUNT(*) n, AVG(lvl) lvl, AVG(play_ms) play, SUM(lingots) lingots FROM players') : { n: 0 };
  out.players = P.n; out.avgLvl = Math.round((P.lvl || 0) * 10) / 10; out.avgPlayMin = Math.round((P.play || 0) / 60000);
  out.active7 = q1("SELECT COUNT(DISTINCT pid) n FROM events WHERE type = 'session' AND t >= ?", now() - 7 * DAY).n;
  out.active1 = q1("SELECT COUNT(DISTINCT pid) n FROM events WHERE type = 'session' AND t >= ?", now() - DAY).n;
  // rétention : parmi les joueurs installés il y a au moins N jours, combien sont revenus entre N et N+1 jours après
  const ret = n => { const c = q('SELECT pid, created FROM players WHERE created <= ?', now() - (n + 1) * DAY); if (!c.length) return null;
    const back = c.filter(p => q1("SELECT 1 x FROM events WHERE pid = ? AND type = 'session' AND t >= ? AND t < ?", p.pid, p.created + n * DAY, p.created + (n + 1) * DAY)).length; return Math.round(back / c.length * 100); };
  out.retention = { d1: ret(1), d7: ret(7), d30: ret(30) };
  out.levels = q('SELECT lvl, COUNT(*) n FROM players GROUP BY lvl ORDER BY lvl');
  out.topActs = q("SELECT json_extract(data, '$.a') a, COUNT(*) n FROM events WHERE type = 'act' AND t >= ? GROUP BY a ORDER BY n DESC LIMIT 25", t0);
  out.evTypes = q('SELECT type, COUNT(*) n FROM events WHERE t >= ? GROUP BY type ORDER BY n DESC', t0);
  out.iapTop = q("SELECT json_extract(data, '$.id') id, COUNT(*) n FROM events WHERE type = 'iap_click' AND t >= ? GROUP BY id ORDER BY n DESC", t0);
  out.openTickets = q1("SELECT COUNT(*) n FROM tickets WHERE status = 'ouvert'").n;
  out.economy = q1('SELECT SUM(cash) cash, SUM(lingots) lingots, AVG(worth) worth, MAX(worth) maxWorth FROM players');
  return out;
}
const admin = {
  'GET /admin/api/stats'(req, res, u) { send(res, 200, stats(Math.min(90, +u.searchParams.get('days') || 30))); },
  'GET /admin/api/players'(req, res, u) {
    const s = '%' + (u.searchParams.get('q') || '') + '%', sort = { recent: 'last_seen DESC', lvl: 'lvl DESC', worth: 'worth DESC', new: 'created DESC' }[u.searchParams.get('sort')] || 'last_seen DESC';
    send(res, 200, q(`SELECT pid, name, tag, skin, lvl, worth, cash, lingots, created, last_seen, sessions, play_ms, banned, platform, ver FROM players WHERE name LIKE ? OR tag LIKE ? OR pid LIKE ? ORDER BY ${sort} LIMIT 200`, s, s, s));
  },
  'GET /admin/api/player'(req, res, u) {
    const pid = u.searchParams.get('pid'), p = q1('SELECT * FROM players WHERE pid = ?', pid); if (!p) return send(res, 404, { err: 'introuvable' });
    const { secret, ...pub } = p;
    send(res, 200, { ...pub, recovery: pid + '.' + secret, events: q('SELECT t, type, data FROM events WHERE pid = ? ORDER BY t DESC LIMIT 200', pid),
      tickets: q('SELECT * FROM tickets WHERE pid = ? ORDER BY t DESC', pid), inbox: q('SELECT * FROM inbox WHERE pid = ? ORDER BY t DESC LIMIT 50', pid) });
  },
  async 'POST /admin/api/gift'(req, res) {   // cadeau ou message pour un joueur (pid) ou pour tous (pid = '*')
    const b = await body(req), gift = b.gift && Object.keys(b.gift).some(k => +b.gift[k]) ? JSON.stringify(b.gift) : null;
    const pids = b.pid === '*' ? q('SELECT pid FROM players').map(r => r.pid) : [b.pid];
    const ins = db.prepare('INSERT INTO inbox (pid, t, title, text, gift) VALUES (?, ?, ?, ?, ?)'); pids.forEach(pid => ins.run(pid, now(), b.title || 'Hustle City', b.text || '', gift));
    log('gift', b); send(res, 200, { ok: true, n: pids.length });
  },
  async 'POST /admin/api/ban'(req, res) { const b = await body(req); run('UPDATE players SET banned = ?, ban_reason = ? WHERE pid = ?', b.ban ? 1 : 0, b.reason || '', b.pid); log('ban', b); send(res, 200, { ok: true }); },
  async 'POST /admin/api/notes'(req, res) { const b = await body(req); run('UPDATE players SET notes = ? WHERE pid = ?', b.notes || '', b.pid); send(res, 200, { ok: true }); },
  async 'POST /admin/api/save'(req, res) {   // remettre une sauvegarde (SAV) : le jeu la recharge à sa prochaine connexion
    const b = await body(req); try { JSON.parse(b.save); } catch (e) { return send(res, 400, { err: 'Sauvegarde illisible.' }); }
    const ins = 'INSERT INTO inbox (pid, t, title, text, gift) VALUES (?, ?, ?, ?, ?)'; run(ins, b.pid, now(), 'Ta partie a été restaurée', 'Le support a remis ta partie en état.', JSON.stringify({ restore: b.save }));
    log('restore', { pid: b.pid }); send(res, 200, { ok: true });
  },
  'GET /admin/api/tickets'(req, res, u) {
    const st = u.searchParams.get('status') || 'ouvert';
    send(res, 200, q('SELECT tk.*, p.name, p.tag, p.lvl FROM tickets tk LEFT JOIN players p ON p.pid = tk.pid WHERE (? = \'tous\' OR tk.status = ?) ORDER BY tk.t DESC LIMIT 200', st, st)
      .map(t => ({ ...t, msgs: q('SELECT * FROM ticket_msgs WHERE ticket = ? ORDER BY t', t.id) })));
  },
  async 'POST /admin/api/reply'(req, res) {   // la réponse arrive dans le téléphone du joueur (messagerie « Support »)
    const b = await body(req), t = q1('SELECT * FROM tickets WHERE id = ?', +b.ticket); if (!t) return send(res, 404, { err: 'ticket' });
    if (b.text) { run('INSERT INTO ticket_msgs (ticket, t, from_admin, text) VALUES (?, ?, 1, ?)', t.id, now(), b.text); run('INSERT INTO inbox (pid, t, title, text, gift) VALUES (?, ?, ?, ?, ?)', t.pid, now(), 'Support Hustle City', b.text, b.gift ? JSON.stringify(b.gift) : null); }
    run('UPDATE tickets SET status = ? WHERE id = ?', b.status || 'répondu', t.id); send(res, 200, { ok: true });
  },
  'GET /admin/api/config'(req, res) { send(res, 200, getCfg()); },
  async 'POST /admin/api/config'(req, res) {
    const b = await body(req); run("INSERT INTO config (k, v) VALUES ('live', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(b));
    run("INSERT INTO config (k, v) VALUES ('live_at', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", String(now())); log('config', b); send(res, 200, { ok: true });
  },
  'GET /admin/api/events'(req, res, u) { const type = u.searchParams.get('type'); send(res, 200, q(`SELECT e.t, e.type, e.data, e.pid, p.name, p.tag FROM events e LEFT JOIN players p ON p.pid = e.pid ${type ? 'WHERE e.type = ?' : ''} ORDER BY e.t DESC LIMIT 300`, ...(type ? [type] : []))); },
  'GET /admin/api/log'(req, res) { send(res, 200, q('SELECT * FROM admin_log ORDER BY t DESC LIMIT 200')); },
  'GET /admin/api/data'(req, res) {   // les réglages du jeu (data.js) pour l'éditeur de valeurs
    send(res, 200, { file: fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8').length });
  }
};

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), key = req.method + ' ' + u.pathname;
  if (req.method === 'OPTIONS') return send(res, 204, {});
  try {
    if (api[key]) return await api[key](req, res, u);
    if (u.pathname.startsWith('/admin/api/')) {
      if ((req.headers.authorization || '') !== 'Bearer ' + ADMIN_TOKEN) return send(res, 401, { err: 'Jeton du back office invalide.' });
      if (admin[key]) return await admin[key](req, res, u); return send(res, 404, { err: 'route' });
    }
    // fichiers : le jeu (racine du projet) et le back office (/admin/ → server/admin/)
    let p = decodeURIComponent(u.pathname); if (p === '/admin' || p === '/admin/') p = '/server/admin/index.html'; else if (p.startsWith('/admin/')) p = '/server/admin/' + p.slice(7);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || f.includes('.admin-token') || f.endsWith('.db')) return send(res, 403, { err: 'interdit' });
    fs.readFile(f, (e, data) => { if (e) return send(res, 404, '404', 'text/plain'); send(res, 200, data, types[path.extname(f)] || 'application/octet-stream'); });
  } catch (e) { console.error(e); send(res, 500, { err: String(e.message || e) }); }
}).listen(PORT, () => console.log(`Hustle City en ligne sur http://localhost:${PORT}  ·  back office : http://localhost:${PORT}/admin/  ·  jeton : ${ADMIN_TOKEN}`));
