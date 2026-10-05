// Hustle City : serveur du jeu en ligne + back office.
// Lancer : node server/server.js   (variables : PORT=5300, ADMIN_TOKEN=…, DB=server/hustle.db, TZ=Europe/Paris, AD_EUR=0.012)
// Il sert le jeu (/game.html), l'API des joueurs (/api/…) et le back office (/admin/, protégé par ADMIN_TOKEN).
// Base : SQLite intégré à Node (aucun service externe, sauf la localisation des IP via ip-api.com, gratuite et sans clé).
// Pour publier : le déployer tel quel sur un petit serveur (Node ≥ 22).
process.env.TZ = process.env.TZ || 'Europe/Paris';   // les jours et les heures des statistiques sont ceux de la France
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { DatabaseSync } = require('node:sqlite');
const { initDb } = require('./schema');
const { clientIp, makeGeo } = require('./geo');
const ROOT = path.join(__dirname, '..'), PORT = +process.env.PORT || 5300;
const DBFILE = process.env.DB || path.join(__dirname, 'hustle.db');
const TOKEN_FILE = path.join(__dirname, '.admin-token');
const AD_EUR = +process.env.AD_EUR || 0.012;   // revenu estimé d'une pub récompensée vue (≈ 12 € pour 1 000 pubs)
// jeton du back office : variable d'environnement, sinon un jeton créé au premier lancement (gardé dans server/.admin-token)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || (fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : (() => { const t = crypto.randomBytes(18).toString('base64url'); fs.writeFileSync(TOKEN_FILE, t); return t; })());

const db = new DatabaseSync(DBFILE);
initDb(db);
const q = (sql, ...a) => db.prepare(sql).all(...a), q1 = (sql, ...a) => db.prepare(sql).get(...a), run = (sql, ...a) => db.prepare(sql).run(...a);
const now = () => Date.now(), DAY = 86400000, ONLINE_MS = 150000;
const getCfg = () => { const r = q1("SELECT v FROM config WHERE k = 'live'"); return r ? JSON.parse(r.v) : {}; };
const log = (action, data) => run('INSERT INTO admin_log (t, action, data) VALUES (?, ?, ?)', now(), action, JSON.stringify(data || {}));
const locate = makeGeo(db);
const J = s => { try { return JSON.parse(s || '{}') || {}; } catch (e) { return {}; } };

// anciennes bases : on reconstruit les sessions à partir des événements « session »
if (!q1('SELECT 1 x FROM sessions LIMIT 1') && q1("SELECT 1 x FROM events WHERE type = 'session' LIMIT 1"))
  db.exec("INSERT INTO sessions (pid, start, last, ms) SELECT pid, t, t, 0 FROM events WHERE type = 'session'");

// les réglages du jeu (prix des offres, noms) : lus dans js/data.js, comme le fait le jeu
let GAME = {};
function loadGame() {
  try {
    const ctx = { window: {} }; vm.createContext(ctx);
    ['js/layout.js', 'js/data.js'].forEach(f => { const p = path.join(ROOT, f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx); });
    GAME = ctx.window.DATA || {};
  } catch (e) { console.error('data.js illisible :', e.message); }
}
loadGame();
const euro = s => +String(s || '0').replace(/[^\d,.]/g, '').replace(',', '.') || 0;
const priceOf = id => euro(((GAME.IAP || []).find(x => x.id === id) || {}).price);
const spendOf = d => +d.eur || priceOf(d.id);

function send(res, code, obj, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Cache-Control': 'no-store' });
  res.end(type ? obj : JSON.stringify(obj));
}
function body(req) { return new Promise(ok => { let b = ''; req.on('data', c => { b += c; if (b.length > 3e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ok({}); } }); }); }
// un joueur s'identifie par son pid + un secret créé par son jeu (pas de mot de passe)
function player(b) { const p = b.pid && q1('SELECT * FROM players WHERE pid = ?', String(b.pid)); return p && p.secret === b.secret ? p : null; }
const inboxFor = pid => q('SELECT id, t, title, text, gift FROM inbox WHERE pid = ? AND claimed = 0 ORDER BY t', pid).map(m => ({ ...m, gift: m.gift ? JSON.parse(m.gift) : null }));
const str = (v, n) => v == null ? null : String(v).slice(0, n);

// ------------------------------------------------------------------ API des joueurs
const api = {
  async 'POST /api/hello'(req, res) {
    const b = await body(req); if (!b.pid || !b.secret) return send(res, 400, { err: 'pid' });
    let p = q1('SELECT * FROM players WHERE pid = ?', b.pid);
    if (!p) { run('INSERT INTO players (pid, secret, name, tag, created, last_seen, platform, ver) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', b.pid, b.secret, b.name || '', b.tag || '', now(), now(), b.platform || '', b.ver || '');
      run('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)', b.pid, now(), 'install', '{}'); p = q1('SELECT * FROM players WHERE pid = ?', b.pid); }
    else if (p.secret !== b.secret) return send(res, 403, { err: 'secret' });
    const ip = clientIp(req);
    run('UPDATE players SET sessions = sessions + 1, last_seen = ?, name = ?, tag = ?, platform = ?, ver = ?, tz = ?, lang = ?, screen = ?, ip = ? WHERE pid = ?', now(), b.name || p.name, b.tag || p.tag, b.platform || p.platform, b.ver || p.ver,
      str(b.tz, 60) || p.tz, str(b.lang, 20) || p.lang, str(b.screen, 20) || p.screen, ip, b.pid);
    run('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)', b.pid, now(), 'session', JSON.stringify({ ver: b.ver }));
    run('INSERT INTO sessions (pid, start, last, ms) VALUES (?, ?, ?, 0)', b.pid, now(), now());
    send(res, 200, { ok: true, banned: !!p.banned, banReason: p.ban_reason || '', config: getCfg(), inbox: inboxFor(b.pid) });
    locate(b.pid, ip, b.tz || p.tz, p.geo_src);   // après la réponse : jamais d'attente pour le joueur
  },
  async 'POST /api/sync'(req, res) {
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' });
    const s = b.summary || {}, ms = Math.min(Math.max(+b.playMs || 0, 0), 600000);
    run('UPDATE players SET last_seen = ?, lvl = ?, worth = ?, cash = ?, lingots = ?, skin = ?, name = ?, tag = ?, play_ms = play_ms + ?, xp = ?, boosters = ?, avatar = ?, frame = ?, tz = COALESCE(?, tz), lang = COALESCE(?, lang), screen = COALESCE(?, screen) WHERE pid = ?',
      now(), s.lvl || 0, s.worth || 0, s.cash || 0, s.lingots || 0, s.skin || '', s.name || p.name, s.tag || p.tag, ms, s.xp || 0, s.boosters || 0, str(s.avatar, 40), str(s.frame, 40),
      str(s.tz, 60), str(s.lang, 20), str(s.screen, 20), p.pid);
    // session en cours (une nouvelle si le joueur revient après plus de 30 min)
    const se = q1('SELECT id, last FROM sessions WHERE pid = ? ORDER BY id DESC LIMIT 1', p.pid);
    if (se && now() - se.last < 30 * 60000) run('UPDATE sessions SET last = ?, ms = ms + ? WHERE id = ?', now(), ms, se.id);
    else { run('INSERT INTO sessions (pid, start, last, ms) VALUES (?, ?, ?, ?)', p.pid, now() - ms, now(), ms); run('UPDATE players SET sessions = sessions + 1 WHERE pid = ?', p.pid); }
    if (b.save && b.save.length < 2.5e6) {
      run('UPDATE players SET save = ?, save_at = ? WHERE pid = ?', b.save, now(), p.pid);
      // historique : une copie par heure au plus, les 12 dernières gardées (pour restaurer une partie abîmée)
      const last = q1('SELECT t FROM save_history WHERE pid = ? ORDER BY t DESC LIMIT 1', p.pid);
      if (!last || now() - last.t > 3600000) {
        run('INSERT INTO save_history (pid, t, lvl, worth, save) VALUES (?, ?, ?, ?, ?)', p.pid, now(), s.lvl || 0, s.worth || 0, b.save);
        run('DELETE FROM save_history WHERE pid = ? AND id NOT IN (SELECT id FROM save_history WHERE pid = ? ORDER BY t DESC LIMIT 12)', p.pid, p.pid);
      }
    }
    const ins = db.prepare('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)');
    (b.events || []).slice(0, 500).forEach(e => ins.run(p.pid, +e.t || now(), String(e.type).slice(0, 40), JSON.stringify(e.data || {}).slice(0, 2000)));
    send(res, 200, { ok: true, banned: !!p.banned, banReason: p.ban_reason || '', inbox: inboxFor(p.pid), cfgAt: (q1("SELECT v FROM config WHERE k = 'live_at'") || {}).v || 0 });
  },
  async 'POST /api/claim'(req, res) { const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' }); run('UPDATE inbox SET claimed = 1 WHERE id = ? AND pid = ?', +b.id, p.pid); send(res, 200, { ok: true }); },
  async 'GET /api/config'(req, res) { send(res, 200, getCfg()); },
  async 'POST /api/support'(req, res) {
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' }); const text = String(b.text || '').slice(0, 2000).trim(); if (!text) return send(res, 400, { err: 'vide' });
    let t = q1("SELECT * FROM tickets WHERE pid = ? AND status != 'fermé' ORDER BY t DESC", p.pid);
    if (!t) { run('INSERT INTO tickets (pid, t, created, subject) VALUES (?, ?, ?, ?)', p.pid, now(), now(), text.slice(0, 80)); t = q1('SELECT * FROM tickets WHERE pid = ? ORDER BY id DESC', p.pid); }
    else run("UPDATE tickets SET status = 'ouvert', t = ? WHERE id = ?", now(), t.id);
    run('INSERT INTO ticket_msgs (ticket, t, from_admin, text) VALUES (?, ?, 0, ?)', t.id, now(), text);
    send(res, 200, { ok: true });
  },
  async 'POST /api/restore'(req, res) {   // récupérer sa partie sur un nouvel appareil : pid + secret (le « code de récupération »)
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'Code inconnu.' }); send(res, 200, { ok: true, save: p.save });
  }
};

// ------------------------------------------------------------------ outils de calcul
const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dkey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const weekStart = t => { const d = new Date(dayStart(t)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const countBy = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x); if (k == null || k === '') return; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n); };
function platformOf(ua) {
  ua = ua || ''; if (/iPhone/.test(ua)) return 'iPhone'; if (/iPad/.test(ua)) return 'iPad'; if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android' : 'Tablette Android';
  if (/Macintosh|Mac OS/.test(ua)) return 'Mac'; if (/Windows/.test(ua)) return 'Windows'; if (/Linux|CrOS/.test(ua)) return 'Linux'; return ua ? 'Autre' : null;
}
function spendMap() {
  const m = {}; q("SELECT pid, t, data FROM events WHERE type = 'iap_buy'").forEach(e => { const d = J(e.data), x = m[e.pid] = m[e.pid] || { eur: 0, n: 0, last: 0 }; x.eur += spendOf(d); x.n++; x.last = Math.max(x.last, e.t); });
  return m;
}
const PCOLS = 'pid, name, tag, skin, avatar, frame, lvl, xp, worth, cash, lingots, boosters, created, last_seen, sessions, play_ms, banned, platform, cc, country, city, lang';

// ------------------------------------------------------------------ statistiques (tout l'onglet Statistiques et le tableau de bord)
function overview(days) {
  const T = now(), today = dayStart(T), dayList = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); dayList.push(d.getTime()); }
  const t0 = dayList[0], prev0 = t0 - days * DAY;
  const P = q(`SELECT ${PCOLS} FROM players`);
  const S = q('SELECT pid, start, ms FROM sessions WHERE start >= ?', Math.min(t0 - 31 * DAY, T - 96 * DAY));
  const byDay = new Map(); S.forEach(s => { const d = dayStart(s.start); if (!byDay.has(d)) byDay.set(d, new Set()); byDay.get(d).add(s.pid); });
  const activeBetween = (a, b) => { const u = new Set(); for (const [d, set] of byDay) if (d >= a && d < b) set.forEach(x => u.add(x)); return u; };
  const E = q("SELECT pid, t, type, data FROM events WHERE t >= ? AND type IN ('ad', 'iap_click', 'iap_buy')", prev0);
  const Sp = S.filter(s => s.start >= t0);
  // -------- séries par jour
  const series = dayList.map((d, i) => {
    const dEnd = new Date(d); dEnd.setDate(dEnd.getDate() + 1); const de = dEnd.getTime();
    const ss = Sp.filter(s => s.start >= d && s.start < de), ev = E.filter(x => x.t >= d && x.t < de);
    const buys = ev.filter(x => x.type === 'iap_buy'), rev = buys.reduce((t, x) => t + spendOf(J(x.data)), 0), ads = ev.filter(x => x.type === 'ad').length;
    const w7 = new Date(d); w7.setDate(w7.getDate() - 6); const m30 = new Date(d); m30.setDate(m30.getDate() - 29);
    return { d: dkey(d), dau: (byDay.get(d) || new Set()).size, wau: activeBetween(w7.getTime(), de).size, mau: activeBetween(m30.getTime(), de).size,
      installs: P.filter(p => p.created >= d && p.created < de).length, sessions: ss.length,
      avgSessMin: ss.length ? Math.round(ss.reduce((t, s) => t + (s.ms || 0), 0) / ss.length / 6000) / 10 : 0,
      ads, iapClicks: ev.filter(x => x.type === 'iap_click').length, buys: buys.length, revenue: Math.round(rev * 100) / 100, adRevenue: Math.round(ads * AD_EUR * 100) / 100 };
  });
  const sum = k => series.reduce((t, x) => t + x[k], 0);
  // -------- période précédente (pour les flèches ↑ ↓)
  const prevE = E.filter(x => x.t >= prev0 && x.t < t0), prevS = S.filter(s => s.start >= prev0 && s.start < t0);
  const prevDauSum = (() => { let n = 0; for (const [d, set] of byDay) if (d >= prev0 && d < t0) n += set.size; return n; })();
  const prev = { installs: P.filter(p => p.created >= prev0 && p.created < t0).length, sessions: prevS.length,
    revenue: prevE.filter(x => x.type === 'iap_buy').reduce((t, x) => t + spendOf(J(x.data)), 0), ads: prevE.filter(x => x.type === 'ad').length,
    avgDau: Math.round(prevDauSum / days * 10) / 10, avgSessMin: prevS.length ? Math.round(prevS.reduce((t, s) => t + (s.ms || 0), 0) / prevS.length / 6000) / 10 : 0 };
  // -------- sessions
  const lens = Sp.filter(s => s.ms > 0).map(s => s.ms / 60000);
  const buckets = [['< 1 min', 0, 1], ['1-3 min', 1, 3], ['3-10 min', 3, 10], ['10-30 min', 10, 30], ['30-60 min', 30, 60], ['+ 1 h', 60, 1e9]].map(([k, a, b]) => ({ k, n: lens.filter(x => x >= a && x < b).length }));
  const perPlayer = countBy(Sp, s => s.pid).map(x => x.n);
  const spp = [['1', 1, 1], ['2-3', 2, 3], ['4-7', 4, 7], ['8-15', 8, 15], ['16-30', 16, 30], ['30 +', 31, 1e9]].map(([k, a, b]) => ({ k, n: perPlayer.filter(x => x >= a && x <= b).length }));
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  Sp.forEach(s => { const d = new Date(s.start); heat[(d.getDay() + 6) % 7][d.getHours()]++; });
  // -------- rétention (cohortes)
  const sessByPid = {}; S.forEach(s => (sessByPid[s.pid] = sessByPid[s.pid] || []).push(s.start));
  const back = (p, n) => (sessByPid[p.pid] || []).some(t => t >= p.created + n * DAY && t < p.created + (n + 1) * DAY);
  const retOf = (list, n) => { const el = list.filter(p => p.created + (n + 1) * DAY <= T); return el.length ? Math.round(el.filter(p => back(p, n)).length / el.length * 100) : null; };
  const weekly = days > 7, cohortStart = weekly ? weekStart(t0) : t0, cmap = new Map();
  P.filter(p => p.created >= cohortStart).forEach(p => { const k = weekly ? weekStart(p.created) : dayStart(p.created); if (!cmap.has(k)) cmap.set(k, []); cmap.get(k).push(p); });
  const RN = [1, 3, 7, 14, 30];
  const cohorts = [...cmap.entries()].sort((a, b) => b[0] - a[0]).map(([k, list]) => ({ d: dkey(k), weekly, n: list.length, r: Object.fromEntries(RN.map(n => [n, retOf(list, n)])) }));
  const recent = P.filter(p => p.created >= T - 95 * DAY);
  const retention = Object.fromEntries(RN.map(n => [n, retOf(recent, n)]));
  // -------- progression
  const MAXL = GAME.MAX_LVL || 40;
  const funnelAt = [1, 2, 5, 10, 14, 20, 25, 30, 40].filter(x => x <= MAXL);
  const funnel = funnelAt.map(l => ({ lvl: l, n: P.filter(p => (p.lvl || 1) >= l).length }));
  const levels = Array.from({ length: MAXL }, (_, i) => ({ lvl: i + 1, n: P.filter(p => (p.lvl || 1) === i + 1).length }));
  const gone = P.filter(p => p.last_seen < T - 7 * DAY);
  const churn = Array.from({ length: MAXL }, (_, i) => { const at = P.filter(p => (p.lvl || 1) === i + 1).length, g = gone.filter(p => (p.lvl || 1) === i + 1).length; return { lvl: i + 1, n: g, rate: at ? Math.round(g / at * 100) : 0 }; });
  // -------- économie
  const worths = P.map(p => p.worth || 0);
  const wb = [['< 1 k', 0, 1e3], ['1-5 k', 1e3, 5e3], ['5-20 k', 5e3, 2e4], ['20-100 k', 2e4, 1e5], ['100 k-1 M', 1e5, 1e6], ['+ 1 M', 1e6, 1e15]].map(([k, a, b]) => ({ k, n: worths.filter(x => x >= a && x < b).length }));
  const economy = { cash: P.reduce((t, p) => t + (p.cash || 0), 0), lingots: P.reduce((t, p) => t + (p.lingots || 0), 0), boosters: P.reduce((t, p) => t + (p.boosters || 0), 0),
    avgWorth: P.length ? worths.reduce((a, b) => a + b, 0) / P.length : 0, medWorth: median(worths), avgLingots: P.length ? P.reduce((t, p) => t + (p.lingots || 0), 0) / P.length : 0,
    medLingots: median(P.map(p => p.lingots || 0)), buckets: wb,
    top: [...P].sort((a, b) => (b.worth || 0) - (a.worth || 0)).slice(0, 10) };
  // -------- argent (achats intégrés + pubs)
  const EP = E.filter(x => x.t >= t0), offers = {};
  (GAME.IAP || []).forEach(o => { offers[o.id] = { id: o.id, name: o.name, price: o.price, eur: euro(o.price), clicks: 0, buys: 0, revenue: 0 }; });
  EP.forEach(x => { if (x.type === 'ad') return; const d = J(x.data), id = d.id || '?', o = offers[id] = offers[id] || { id, name: id, price: '', eur: 0, clicks: 0, buys: 0, revenue: 0 };
    if (x.type === 'iap_click') o.clicks++; else { o.buys++; o.revenue += spendOf(d); } });
  const sm = spendMap(), payersAll = Object.keys(sm).length, payersP = new Set(EP.filter(x => x.type === 'iap_buy').map(x => x.pid)).size;
  const revenue = sum('revenue'), adRevenue = sum('adRevenue'), dauSum = sum('dau');
  const money = { revenue, adRevenue, total: revenue + adRevenue, payers: payersP, payersAll, conv: P.length ? Math.round(payersAll / P.length * 1000) / 10 : 0,
    arpdau: dauSum ? (revenue + adRevenue) / dauSum : 0, arppu: payersP ? revenue / payersP : 0, ads: sum('ads'), adsPerDau: dauSum ? sum('ads') / dauSum : 0, adEur: AD_EUR,
    offers: Object.values(offers).filter(o => o.clicks || o.buys).map(o => ({ ...o, revenue: Math.round(o.revenue * 100) / 100 })).sort((a, b) => b.revenue - a.revenue || b.clicks - a.clicks),
    topPayers: Object.entries(sm).sort((a, b) => b[1].eur - a[1].eur).slice(0, 8).map(([pid, x]) => ({ ...(P.find(p => p.pid === pid) || { pid }), eur: Math.round(x.eur * 100) / 100, n: x.n })) };
  // -------- usage
  const acts = q("SELECT json_extract(data, '$.a') a, COUNT(*) n, COUNT(DISTINCT pid) u FROM events WHERE type = 'act' AND t >= ? GROUP BY a ORDER BY n DESC LIMIT 24", t0);
  const live = P.filter(p => p.last_seen >= T - ONLINE_MS).length;
  // -------- SAV
  const TK = q('SELECT id, pid, t, created, status FROM tickets'), msgs = q('SELECT ticket, t, from_admin FROM ticket_msgs ORDER BY t');
  const firstResp = []; TK.filter(t => (t.created || t.t) >= t0).forEach(t => { const m = msgs.filter(x => x.ticket === t.id), a = m.find(x => !x.from_admin), r = a && m.find(x => x.from_admin && x.t >= a.t); if (r) firstResp.push((r.t - a.t) / 60000); });
  const support = { open: TK.filter(t => t.status === 'ouvert').length, waiting: TK.filter(t => t.status === 'en attente').length, closed: TK.filter(t => t.status === 'fermé').length,
    newInPeriod: TK.filter(t => (t.created || t.t) >= t0).length, avgRespMin: firstResp.length ? firstResp.reduce((a, b) => a + b, 0) / firstResp.length : null, medRespMin: firstResp.length ? median(firstResp) : null,
    perDay: dayList.map(d => ({ d: dkey(d), n: TK.filter(t => dayStart(t.created || t.t) === d).length })) };
  const todaySet = byDay.get(today) || new Set();
  return {
    days, generated: T, tz: process.env.TZ, series, prev,
    kpi: { players: P.length, online: live, dau: todaySet.size, wau: activeBetween(today - 6 * DAY, today + DAY).size, mau: activeBetween(today - 29 * DAY, today + DAY).size,
      installs: sum('installs'), sessions: sum('sessions'), avgDau: Math.round(dauSum / days * 10) / 10,
      avgSessMin: lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0, medSessMin: median(lens), sessPerDau: dauSum ? Sp.length / dauSum : 0,
      avgPlayMin: P.length ? P.reduce((t, p) => t + (p.play_ms || 0), 0) / P.length / 60000 : 0, avgLvl: P.length ? P.reduce((t, p) => t + (p.lvl || 1), 0) / P.length : 0, banned: P.filter(p => p.banned).length },
    sessions: { buckets, perPlayer: spp, heat }, retention, cohorts, funnel, levels, churn, goneCount: gone.length, economy, money, acts,
    skins: countBy(P, p => p.skin), platforms: countBy(P, p => platformOf(p.platform)), countries: countBy(P, p => p.country || null), cities: countBy(P, p => p.city ? `${p.city}|${p.cc || ''}` : null).slice(0, 12),
    langs: countBy(P, p => (p.lang || '').slice(0, 2) || null), support
  };
}

// ------------------------------------------------------------------ API du back office
const online = p => p.last_seen >= now() - ONLINE_MS;
const admin = {
  'GET /admin/api/overview'(req, res, u) { send(res, 200, overview(Math.max(7, Math.min(90, +u.searchParams.get('days') || 30)))); },
  'GET /admin/api/live'(req, res) {   // en ce moment : joueurs en ligne + derniers événements
    const on = q(`SELECT ${PCOLS} FROM players WHERE last_seen >= ? ORDER BY last_seen DESC LIMIT 80`, now() - ONLINE_MS);
    const feed = q(`SELECT e.t, e.type, e.data, e.pid, p.name, p.tag, p.skin, p.avatar, p.frame FROM events e LEFT JOIN players p ON p.pid = e.pid WHERE e.type NOT IN ('act', 'session') ORDER BY e.t DESC LIMIT 40`);
    send(res, 200, { online: on, feed, openTickets: q1("SELECT COUNT(*) n FROM tickets WHERE status = 'ouvert'").n, t: now() });
  },
  'GET /admin/api/map'(req, res) {
    const T = now(), P = q('SELECT pid, name, tag, skin, avatar, frame, lvl, last_seen, created, city, country, cc, lat, lon FROM players');
    const pts = {}; P.filter(p => p.lat != null).forEach(p => { const k = (p.city || '?') + '|' + (p.cc || ''); const x = pts[k] = pts[k] || { city: p.city, country: p.country, cc: p.cc, lat: 0, lon: 0, n: 0, online: 0, active7: 0, new7: 0, names: [] };
      x.lat += p.lat; x.lon += p.lon; x.n++; if (p.last_seen >= T - ONLINE_MS) x.online++; if (p.last_seen >= T - 7 * DAY) x.active7++; if (p.created >= T - 7 * DAY) x.new7++; if (x.names.length < 6) x.names.push(p.name); });
    const points = Object.values(pts).map(x => ({ ...x, lat: x.lat / x.n, lon: x.lon / x.n })).sort((a, b) => b.n - a.n);
    const countries = countBy(P, p => p.country ? p.country + '|' + (p.cc || '') : null).map(x => { const [country, cc] = x.k.split('|'); return { country, cc, n: x.n, online: P.filter(p => p.cc === cc && p.last_seen >= T - ONLINE_MS).length }; });
    send(res, 200, { points, countries, online: P.filter(p => p.last_seen >= T - ONLINE_MS && p.lat != null), unknown: P.filter(p => p.lat == null).length, total: P.length });
  },
  'GET /admin/api/players'(req, res, u) {
    const g = k => u.searchParams.get(k) || '';
    const s = '%' + g('q') + '%', sort = { recent: 'last_seen DESC', lvl: 'lvl DESC, xp DESC', worth: 'worth DESC', new: 'created DESC', lingots: 'lingots DESC', play: 'play_ms DESC', name: 'name COLLATE NOCASE' }[g('sort')] || 'last_seen DESC';
    const where = ['(name LIKE ? OR tag LIKE ? OR pid LIKE ? OR city LIKE ?)'], args = [s, s, s, s];
    const f = g('filter');
    if (f === 'online') { where.push('last_seen >= ?'); args.push(now() - ONLINE_MS); }
    if (f === 'banned') where.push('banned = 1');
    if (f === 'payers') where.push("pid IN (SELECT DISTINCT pid FROM events WHERE type = 'iap_buy')");
    if (f === 'new') { where.push('created >= ?'); args.push(now() - 7 * DAY); }
    if (f === 'gone') { where.push('last_seen < ?'); args.push(now() - 7 * DAY); }
    if (g('cc')) { where.push('cc = ?'); args.push(g('cc')); }
    if (g('lmin')) { where.push('lvl >= ?'); args.push(+g('lmin')); }
    if (g('lmax')) { where.push('lvl <= ?'); args.push(+g('lmax')); }
    const W = where.join(' AND '), lim = Math.min(500, +g('limit') || 60), off = +g('offset') || 0, sm = spendMap();
    const rows = q(`SELECT ${PCOLS} FROM players WHERE ${W} ORDER BY ${sort} LIMIT ? OFFSET ?`, ...args, lim, off).map(p => ({ ...p, online: online(p), spent: sm[p.pid] ? Math.round(sm[p.pid].eur * 100) / 100 : 0 }));
    const T = now(), all = q('SELECT cc, country, banned, last_seen, created, pid FROM players');
    send(res, 200, { rows, total: q1(`SELECT COUNT(*) n FROM players WHERE ${W}`, ...args).n,
      counts: { all: all.length, online: all.filter(p => p.last_seen >= T - ONLINE_MS).length, payers: Object.keys(sm).length, banned: all.filter(p => p.banned).length, new: all.filter(p => p.created >= T - 7 * DAY).length, gone: all.filter(p => p.last_seen < T - 7 * DAY).length },
      countries: countBy(all, p => p.cc ? p.cc + '|' + (p.country || p.cc) : null) });
  },
  'GET /admin/api/player'(req, res, u) {
    const pid = u.searchParams.get('pid'), p = q1('SELECT * FROM players WHERE pid = ?', pid); if (!p) return send(res, 404, { err: 'introuvable' });
    const { secret, ...pub } = p, sm = spendMap()[pid];
    send(res, 200, { ...pub, online: online(p), recovery: pid + '.' + secret, spent: sm ? Math.round(sm.eur * 100) / 100 : 0,
      buys: q("SELECT t, data FROM events WHERE pid = ? AND type = 'iap_buy' ORDER BY t DESC", pid).map(e => ({ t: e.t, ...J(e.data), eur: spendOf(J(e.data)) })),
      ads: q1("SELECT COUNT(*) n FROM events WHERE pid = ? AND type = 'ad'", pid).n,
      events: q("SELECT t, type, data FROM events WHERE pid = ? AND type != 'act' ORDER BY t DESC LIMIT 250", pid),
      acts: q("SELECT json_extract(data, '$.a') a, COUNT(*) n FROM events WHERE pid = ? AND type = 'act' GROUP BY a ORDER BY n DESC LIMIT 8", pid),
      sessionsList: q('SELECT start, last, ms FROM sessions WHERE pid = ? ORDER BY start DESC LIMIT 60', pid),
      history: q('SELECT id, t, lvl, worth, LENGTH(save) size FROM save_history WHERE pid = ? ORDER BY t DESC', pid),
      tickets: q('SELECT * FROM tickets WHERE pid = ? ORDER BY t DESC', pid).map(t => ({ ...t, msgs: q('SELECT * FROM ticket_msgs WHERE ticket = ? ORDER BY t', t.id) })),
      inbox: q('SELECT * FROM inbox WHERE pid = ? ORDER BY t DESC LIMIT 50', pid) });
  },
  async 'POST /admin/api/gift'(req, res) {   // cadeau ou message pour un joueur (pid), ou pour tous (pid = '*', avec un filtre facultatif)
    const b = await body(req), gift = b.gift && Object.keys(b.gift).some(k => +b.gift[k]) ? JSON.stringify(Object.fromEntries(Object.entries(b.gift).filter(([, v]) => +v).map(([k, v]) => [k, +v]))) : null;
    let pids;
    if (b.pid === '*') {
      const f = b.filter || {}, w = ['1 = 1'], a = [];
      if (f.active7) { w.push('last_seen >= ?'); a.push(now() - 7 * DAY); }
      if (f.minLvl) { w.push('lvl >= ?'); a.push(+f.minLvl); }
      if (f.cc) { w.push('cc = ?'); a.push(f.cc); }
      if (!f.banned) w.push('banned = 0');
      pids = q(`SELECT pid FROM players WHERE ${w.join(' AND ')}`, ...a).map(r => r.pid);
    } else pids = [b.pid];
    if (b.dry) return send(res, 200, { ok: true, n: pids.length });
    const ins = db.prepare('INSERT INTO inbox (pid, t, title, text, gift) VALUES (?, ?, ?, ?, ?)'); pids.forEach(pid => ins.run(pid, now(), b.title || 'Hustle City', b.text || '', gift));
    log(b.pid === '*' ? 'broadcast' : 'gift', { ...b, n: pids.length }); send(res, 200, { ok: true, n: pids.length });
  },
  async 'POST /admin/api/ban'(req, res) { const b = await body(req); run('UPDATE players SET banned = ?, ban_reason = ? WHERE pid = ?', b.ban ? 1 : 0, b.reason || '', b.pid); log(b.ban ? 'ban' : 'unban', b); send(res, 200, { ok: true }); },
  async 'POST /admin/api/notes'(req, res) { const b = await body(req); run('UPDATE players SET notes = ? WHERE pid = ?', b.notes || '', b.pid); log('notes', { pid: b.pid }); send(res, 200, { ok: true }); },
  async 'POST /admin/api/save'(req, res) {   // remettre une sauvegarde (SAV) : le jeu la recharge à sa prochaine connexion
    const b = await body(req); let save = b.save;
    if (b.hist) { const h = q1('SELECT save FROM save_history WHERE id = ? AND pid = ?', +b.hist, b.pid); if (!h) return send(res, 404, { err: 'Copie introuvable.' }); save = h.save; }
    try { JSON.parse(save); } catch (e) { return send(res, 400, { err: 'Sauvegarde illisible.' }); }
    run('INSERT INTO inbox (pid, t, title, text, gift) VALUES (?, ?, ?, ?, ?)', b.pid, now(), 'Ta partie a été restaurée', 'Le support a remis ta partie en état.', JSON.stringify({ restore: save }));
    log('restore', { pid: b.pid, hist: b.hist || null }); send(res, 200, { ok: true });
  },
  'GET /admin/api/tickets'(req, res, u) {
    const st = u.searchParams.get('status') || 'tous', s = '%' + (u.searchParams.get('q') || '') + '%';
    const L = q(`SELECT tk.*, p.name, p.tag, p.lvl, p.skin, p.avatar, p.frame, p.last_seen FROM tickets tk LEFT JOIN players p ON p.pid = tk.pid
      WHERE (? = 'tous' OR tk.status = ?) AND (p.name LIKE ? OR tk.subject LIKE ? OR p.tag LIKE ?) ORDER BY (tk.status = 'ouvert') DESC, tk.t DESC LIMIT 300`, st, st, s, s, s);
    send(res, 200, { list: L.map(t => { const m = q('SELECT t, from_admin, text FROM ticket_msgs WHERE ticket = ? ORDER BY t', t.id); return { ...t, online: t.last_seen >= now() - ONLINE_MS, n: m.length, last: m[m.length - 1] || null }; }),
      counts: Object.fromEntries(['ouvert', 'en attente', 'fermé'].map(k => [k, q1('SELECT COUNT(*) n FROM tickets WHERE status = ?', k).n])) });
  },
  'GET /admin/api/ticket'(req, res, u) {
    const t = q1('SELECT * FROM tickets WHERE id = ?', +u.searchParams.get('id')); if (!t) return send(res, 404, { err: 'ticket' });
    const p = q1(`SELECT ${PCOLS}, notes FROM players WHERE pid = ?`, t.pid) || {};
    send(res, 200, { ...t, msgs: q('SELECT * FROM ticket_msgs WHERE ticket = ? ORDER BY t', t.id), player: { ...p, online: p.pid ? online(p) : false }, others: q('SELECT id, status, subject, t FROM tickets WHERE pid = ? AND id != ? ORDER BY t DESC', t.pid, t.id) });
  },
  async 'POST /admin/api/reply'(req, res) {   // la réponse arrive dans le téléphone du joueur (messagerie « Support »)
    const b = await body(req), t = q1('SELECT * FROM tickets WHERE id = ?', +b.ticket); if (!t) return send(res, 404, { err: 'ticket' });
    const gift = b.gift && Object.keys(b.gift).some(k => +b.gift[k]) ? JSON.stringify(Object.fromEntries(Object.entries(b.gift).filter(([, v]) => +v).map(([k, v]) => [k, +v]))) : null;
    if (b.text || gift) {
      const text = b.text || 'Petit geste du support, merci pour ta patience !';
      run('INSERT INTO ticket_msgs (ticket, t, from_admin, text) VALUES (?, ?, 1, ?)', t.id, now(), text + (gift ? ' [cadeau : ' + Object.entries(JSON.parse(gift)).map(([k, v]) => `${v} ${k}`).join(', ') + ']' : ''));
      run('INSERT INTO inbox (pid, t, title, text, gift) VALUES (?, ?, ?, ?, ?)', t.pid, now(), 'Support Hustle City', text, gift);
    }
    run('UPDATE tickets SET status = ?, t = ? WHERE id = ?', b.status || 'en attente', now(), t.id);
    log('reply', { ticket: t.id, pid: t.pid, status: b.status || 'en attente', gift: gift ? JSON.parse(gift) : null }); send(res, 200, { ok: true });
  },
  'GET /admin/api/config'(req, res) { send(res, 200, getCfg()); },
  async 'POST /admin/api/config'(req, res) {
    const b = await body(req); run("INSERT INTO config (k, v) VALUES ('live', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(b));
    run("INSERT INTO config (k, v) VALUES ('live_at', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", String(now())); log('config', b); send(res, 200, { ok: true });
  },
  'GET /admin/api/events'(req, res, u) {
    const type = u.searchParams.get('type'), before = +u.searchParams.get('before') || 0;
    const w = ["e.type != 'act'"], a = []; if (type) { w.push('e.type = ?'); a.push(type); } if (before) { w.push('e.t < ?'); a.push(before); }
    send(res, 200, q(`SELECT e.t, e.type, e.data, e.pid, p.name, p.tag, p.skin, p.avatar, p.frame FROM events e LEFT JOIN players p ON p.pid = e.pid WHERE ${w.join(' AND ')} ORDER BY e.t DESC LIMIT 200`, ...a));
  },
  'GET /admin/api/log'(req, res) { send(res, 200, q('SELECT * FROM admin_log ORDER BY t DESC LIMIT 200')); },
  'GET /admin/api/broadcasts'(req, res) { send(res, 200, q("SELECT * FROM admin_log WHERE action = 'broadcast' OR (action = 'gift' AND data LIKE '%\"pid\":\"*\"%') ORDER BY t DESC LIMIT 30")); }
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
    // fichiers : le jeu (racine du projet) et le back office (/admin/ → server/admin/). Le reste de server/ n'est jamais servi.
    let p = decodeURIComponent(u.pathname);
    if (p.startsWith('/server/')) return send(res, 403, { err: 'interdit' });
    if (p === '/admin' || p === '/admin/') p = '/server/admin/index.html'; else if (p.startsWith('/admin/')) p = '/server/admin/' + p.slice(7);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || f.includes('.admin-token') || /\.db(-wal|-shm)?$/.test(f)) return send(res, 403, { err: 'interdit' });
    fs.readFile(f, (e, data) => { if (e) return send(res, 404, '404', 'text/plain'); send(res, 200, data, types[path.extname(f)] || 'application/octet-stream'); });
  } catch (e) { console.error(e); send(res, 500, { err: String(e.message || e) }); }
}).listen(PORT, () => console.log(`Hustle City en ligne sur http://localhost:${PORT}  ·  back office : http://localhost:${PORT}/admin/  ·  base : ${path.basename(DBFILE)}  ·  jeton : dans server/.admin-token (ou ADMIN_TOKEN)`));
