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
const { makePush } = require('./push');
const ROOT = path.join(__dirname, '..'), PORT = +process.env.PORT || 5300;
const DBFILE = process.env.DB || path.join(__dirname, 'hustle.db');
const TOKEN_FILE = path.join(__dirname, '.admin-token');
const AD_EUR = +process.env.AD_EUR || 0.012;   // revenu estimé d'une pub récompensée vue (≈ 12 € pour 1 000 pubs)
// jeton du back office : variable d'environnement, sinon un jeton créé au premier lancement (gardé dans server/.admin-token)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || (fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : (() => { const t = crypto.randomBytes(18).toString('base64url'); fs.writeFileSync(TOKEN_FILE, t); return t; })());

const db = new DatabaseSync(DBFILE);
initDb(db);
const PUSH = makePush(db);   // notifications téléphone (application iPhone / Android)
const q = (sql, ...a) => db.prepare(sql).all(...a), q1 = (sql, ...a) => db.prepare(sql).get(...a), run = (sql, ...a) => db.prepare(sql).run(...a);
const now = () => Date.now(), DAY = 86400000, ONLINE_MS = 150000;
const getCfg = () => { const r = q1("SELECT v FROM config WHERE k = 'live'"); return r ? JSON.parse(r.v) : {}; };
const log = (action, data) => run('INSERT INTO admin_log (t, action, data) VALUES (?, ?, ?)', now(), action, JSON.stringify(data || {}));
const J = s => { try { return JSON.parse(s || '{}') || {}; } catch (e) { return {}; } };
// ------------------------------------------------------------------ vie privée : l'IP n'est jamais gardée en clair (empreinte, pour le cache de localisation)
const ipHash = ip => ip ? crypto.createHmac('sha256', 'ip:' + ADMIN_TOKEN).update(String(ip)).digest('base64url').slice(0, 22) : '';
const locate = makeGeo(db, ipHash);
// anciennes bases : IP en clair → empreinte, positions arrondies (~10 km), cache rangé par IP en clair (ou échecs) vidé
for (const r of q("SELECT pid, ip FROM players WHERE ip LIKE '%.%' OR ip LIKE '%:%'")) run('UPDATE players SET ip = ? WHERE pid = ?', ipHash(r.ip), r.pid);
db.exec(`UPDATE players SET lat = ROUND(lat, 1), lon = ROUND(lon, 1) WHERE lat IS NOT NULL; DELETE FROM geo_cache WHERE ip LIKE '%.%' OR ip LIKE '%:%' OR data LIKE '%"fail"%';`);
// durée de conservation : événements 13 mois, cache de localisation 30 jours (au démarrage puis chaque jour)
function purge() { run('DELETE FROM events WHERE t < ?', now() - 395 * DAY); run('DELETE FROM geo_cache WHERE t < ?', now() - 30 * DAY); }
purge(); setInterval(purge, DAY);

// ------------------------------------------------------------------ limites par IP (en mémoire, sans dépendance) : seau de jetons
// 240 requêtes / min sur /api (un joueur en fait ~5 : large, même à plusieurs derrière la même box 4G), 10 nouveaux joueurs / heure
const buckets = new Map();
function limit(k, n, ms) { const T = now(), b = buckets.get(k) || { v: n, t: T }; b.v = Math.min(n, b.v + (T - b.t) * n / ms); b.t = T; buckets.set(k, b); if (b.v < 1) return false; b.v--; return true; }
setInterval(() => { const T = now(); for (const [k, b] of buckets) if (T - b.t > 3600000) buckets.delete(k); }, 600000);

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

// CORS seulement sur /api (l'appli iPhone / Android parle depuis capacitor://localhost ou https://localhost) ; jamais sur /admin/api
function send(res, code, obj, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', ...(res.api ? { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } : {}), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(type ? obj : JSON.stringify(obj));
}
// corps JSON : 300 ko au plus sur /api (1 Mo pour /api/sync, qui porte la sauvegarde), 3 Mo au back office (6 Mo pour une image) ; au-delà → 413
function body(req, max) {
  max = max || req.maxBody || 3e6;
  return new Promise((ok, ko) => { let b = '', n = 0, big = false;
    req.on('data', c => { if (big) return; n += c.length; if (n > max) { big = true; ko(Object.assign(new Error('Trop gros.'), { code: 413 })); } else b += c; });
    req.on('end', () => { if (big) return; try { ok(JSON.parse(b || '{}') || {}); } catch (e) { ok({}); } }); });
}
// un joueur s'identifie par son pid + un secret créé par son jeu (pas de mot de passe)
function player(b) { const p = b.pid && q1('SELECT * FROM players WHERE pid = ?', String(b.pid)); return p && p.secret === b.secret ? p : null; }
const inboxFor = pid => q('SELECT id, t, title, text, gift FROM inbox WHERE pid = ? AND claimed = 0 ORDER BY t', pid).map(m => ({ ...m, gift: m.gift ? JSON.parse(m.gift) : null }));
const str = (v, n) => v == null ? null : String(v).slice(0, n);

// ------------------------------------------------------------------ nettoyage de tout ce qu'envoie un joueur (anti-XSS : rien de brut n'est gardé, ni renvoyé aux autres ou au back office)
const BIG = 1e15, num = (v, max = BIG) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0; };
const maxLvl = () => GAME.MAX_LVL || 40, lvlOf = v => Math.min(maxLvl(), Math.max(1, Math.floor(num(v)) || 1));
const cleanId = v => typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v) ? v : null;   // perso, photo, cadre
const cleanTag = v => /^\d{1,6}$/.test(String(v ?? '')) ? String(v) : '';
const txt = (v, n) => v == null ? null : String(v).replace(/[\u0000-\u001f\u007f<>"'`\\]/g, '').slice(0, n);   // fuseau, langue, écran, appareil, version
const PID_RE = /^[\w-]{4,64}$/, SECRET_RE = /^[\w-]{8,128}$/;
// pseudo : 16 caractères (comme le champ du jeu), sans caractère de contrôle ni < > " ' ` & ; un gros mot (FR / EN, même en l33t) → « Joueur »
const BAD_ANY = /fuck|salop|connard|connass|encul|niquer|niquetamere|niktamere|putain|batard|nigg|negre|negro|fagg|hitler|nazi|bitch|cunt|whore|asshole|porn|pedophil|pedoph|tapette|bougnoul|youpin|chinetoq|bamboula|pouffiasse|petasse|grognasse|enfoir|suceu|branleu|tamere|tasoeur/;
const BAD_WORD = /^(con|cons|conne|pute|putes|pd|pede|pedo|bite|bites|cul|sex|sexe|dick|shit|merde|viol|chatte|couille|couilles|teub|tg|ntm|fdp|nique|slut|rape|kys|nazis?)$/;
function cleanName(v) {
  const n = Array.from(String(v ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff<>"'`&\\]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 16).join('').trim();
  const k = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[013457@$]/g, c => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' }[c]));
  return n && (BAD_ANY.test(k.replace(/[^a-z]/g, '')) || k.split(/[^a-z]+/).some(w => BAD_WORD.test(w))) ? 'Joueur' : n;
}
// le résumé envoyé à chaque synchro, nettoyé
const cleanSummary = s => ({ lvl: lvlOf(s.lvl), xp: Math.floor(num(s.xp, 1e9)), worth: Math.round(num(s.worth)), cash: Math.round(num(s.cash)), lingots: Math.floor(num(s.lingots, 1e9)), boosters: Math.floor(num(s.boosters, 1e6)),
  skin: cleanId(s.skin), avatar: cleanId(s.avatar), frame: cleanId(s.frame), name: cleanName(s.name), tag: cleanTag(s.tag) });

// ------------------------------------------------------------------ anti-triche du classement des fortunes (valeurs envoyées par le jeu)
// Plafonds volontairement larges, qu'un très bon joueur ne touche jamais. Repères (js/data.js) : plus gros gain d'un coup ≈ 50 000
// (7-7-7 à 100 × 500, grattage « Millionnaire » 50 000), roulette 500 × 35 = 17 500 par jeton, pari combiné au niveau 40 (mise max 24 020)
// ≈ quelques centaines de milliers ; cryptos : alertes flash de ±20 % ; tools/bot.js (session active normale) reste très loin de tout ça.
// Donc par synchro : gain ≤ A(niveau) = 200 000 + 30 000 × niveau, + une part de ce qu'on a déjà (25 % + 50 % par heure écoulée, 400 % au plus),
// + les cadeaux en cash du back office touchés depuis ; et sur la journée : ≤ 6 × la valeur du début de journée, ou + 4 × A (empêche l'effet boule de neige).
// XP (total depuis le niveau 1) : + 1 500 + 40 × niveau d’avant par minute écoulée (la vraie progression est bien plus lente, xpCap dans game.js).
// Première synchro (nouveau joueur, partie restaurée, drapeau levé au back office) : seulement un plafond absolu selon le niveau.
// Au-delà : la valeur gardée est rabotée, et le joueur est marqué « suspect » (sorti des classements publics, badge au back office).
const XPT = () => GAME.XP_TABLE || [], xpTot = (l, x) => XPT().slice(1, l).reduce((a, b) => a + b, 0) + x;
function xpFrom(tot) { let l = 1; while (l < maxLvl() && tot >= (XPT()[l] || Infinity)) tot -= XPT()[l++]; return { lvl: l, xp: Math.floor(tot) }; }
const AC_A = l => 200000 + 30000 * l;
function antiCheat(p, s) {   // rabote s (résumé nettoyé) d'après les valeurs déjà connues de p ; renvoie { n: valeurs rabotées, ac: repères à garder }
  const T = now(), dk = dkey(T), old = J(p.ac), gift = num(old.g, 1e12); let n = 0;
  if (!p.sync_at) {
    const cap = 1e6 + 2e5 * s.lvl * s.lvl; ['worth', 'cash'].forEach(k => { if (s[k] > cap) { s[k] = cap; n++; } });
    return { n, ac: { d: dk, w: s.worth, c: s.cash } };
  }
  const h = Math.min(Math.max(T - p.sync_at, 60000), 7 * DAY) / 3600000;
  const prevTot = xpTot(lvlOf(p.lvl), num(p.xp)), capXp = prevTot + 1500 + 40 * lvlOf(p.lvl) * h * 60;   // XP d'abord : le niveau gardé sert au plafond d'argent
  if (xpTot(s.lvl, s.xp) > capXp) { Object.assign(s, xpFrom(capXp)); n++; }
  const A = AC_A(s.lvl) + gift, ac = old.d === dk ? { d: dk, w: num(old.w), c: num(old.c) } : { d: dk, w: num(p.worth), c: num(p.cash) };
  [['worth', 'w'], ['cash', 'c']].forEach(([k, b]) => {
    const prev = num(p[k]), cap = Math.min(prev + A + prev * Math.min(4, .25 + .5 * h), Math.max(ac[b] * 6, ac[b] + 4 * A) + gift);
    if (s[k] > cap) { s[k] = Math.round(cap); n++; }
  });
  return { n, ac };
}

// ------------------------------------------------------------------ objets du jeu ajoutés / modifiés au back office (config live « content »)
// Les images envoyées sont rangées dans server/uploads (hors du dépôt) et servies à tous sur /media/<fichier>.
const UPLOADS = process.env.UPLOADS || path.join(__dirname, 'uploads');
const MEDIA_RE = /^[a-z0-9-]{1,80}\.(png|jpg|webp)$/;
const MEDIA_TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
function imageKind(buf) {   // on regarde les premiers octets, pas le nom du fichier
  if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) return 'png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const isDate = v => typeof v === 'string' && v.length < 40 && !isNaN(Date.parse(v));
// on ne garde que ce que le jeu sait afficher, avec des valeurs sûres
function cleanContent(c) {
  const out = { items: {} }, items = (c && c.items) || {}, cats = GAME.ITEM_CATS || {}, known = new Map((GAME.ITEMS || []).map(i => [i.id, i]));
  const series = new Set((GAME.SERIES || []).map(x => x.id));
  Object.entries(items).slice(0, 600).forEach(([id, e]) => {
    if (!/^[a-z0-9-]{2,48}$/.test(id) || !e || typeof e !== 'object') return;
    const x = {}, orig = known.get(id);
    if (e.name != null) { const n = String(e.name).trim().slice(0, 60); if (n) x.name = n; }
    if (e.p0 != null && +e.p0 > 0) x.p0 = Math.min(1e7, Math.max(1, Math.round(+e.p0)));
    if (['C', 'R', 'E', 'L'].includes(e.r)) x.r = e.r;
    if (e.hidden) x.hidden = true;
    if (isDate(e.from)) x.from = new Date(e.from).toISOString();
    if (isDate(e.until)) x.until = new Date(e.until).toISOString();
    if (typeof e.img === 'string' && /^\/media\//.test(e.img) && MEDIA_RE.test(e.img.slice(7))) x.img = e.img;
    if (typeof e.tag === 'string') x.tag = slug(e.tag).slice(0, 20);
    if (e.new) {
      if (orig) return;   // un nouvel objet ne remplace jamais un objet du jeu
      if (!cats[e.cat] || e.cat === 'trophy' || !x.name || !x.p0) return;
      Object.assign(x, { new: true, cat: e.cat, r: x.r || 'C', p0first: Math.min(1e7, Math.max(1, Math.round(+e.p0first || x.p0))), created: +e.created || now() });
      if (e.cat === 'card') { if (!series.has(e.series)) return; x.series = e.series; }
    } else {
      if (!orig) return;
      if (cats[e.cat] && orig.cat !== e.cat && !['card', 'trophy'].includes(orig.cat) && !['card', 'trophy'].includes(e.cat)) x.cat = e.cat;
      if (orig.cat === 'card') delete x.img;   // l'image d'une carte existante ne se change pas ici
      if (!Object.keys(x).length) return;
    }
    out.items[id] = x;
  });
  return out;
}
function saveLive(cfg) {
  run("INSERT INTO config (k, v) VALUES ('live', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(cfg));
  run("INSERT INTO config (k, v) VALUES ('live_at', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", String(now()));
}

// ------------------------------------------------------------------ classements des événements (Tournoi, Coupe des Morts)
db.exec(`CREATE TABLE IF NOT EXISTS six_pts (ed TEXT, pid TEXT, pts INT, good INT, t INT, PRIMARY KEY (ed, pid));
  CREATE TABLE IF NOT EXISTS cdm_pts (ed TEXT, pid TEXT, team TEXT, pts INT, t INT, win INT, win_n INT, day TEXT, day_n INT DEFAULT 0, PRIMARY KEY (ed, pid));
  CREATE INDEX IF NOT EXISTS cdm_team ON cdm_pts(ed, team, pts);`);
{ const have = new Set(db.prepare('PRAGMA table_info(cdm_pts)').all().map(c => c.name)); if (!have.has('day')) db.exec('ALTER TABLE cdm_pts ADD COLUMN day TEXT; ALTER TABLE cdm_pts ADD COLUMN day_n INT DEFAULT 0;'); }
{ const have = new Set(db.prepare('PRAGMA table_info(six_pts)').all().map(c => c.name)); if (!have.has('day')) db.exec('ALTER TABLE six_pts ADD COLUMN win INT DEFAULT 0; ALTER TABLE six_pts ADD COLUMN win_n INT DEFAULT 0; ALTER TABLE six_pts ADD COLUMN day TEXT; ALTER TABLE six_pts ADD COLUMN day_n INT DEFAULT 0;'); }
const ED_RE = /^[\w-]{1,24}$/, CDM_CAP = 600, CDM_DAY = 4000;
// Tournoi : 9 points par minute (3 bons pronos d'un coup), 27 par jour (le surplus est renvoyé plus tard par le jeu), jamais plus que 3 × les matchs déjà finis
const SIX_MIN = 9, SIX_DAY = 27;
function sixMax(ed) {   // points possibles à cette heure-ci pour une édition (= date du jour 1, ou « real » = vrai calendrier ; « …-test » : tout)
  const S = GAME.SIX || {}, M = S.matches || [], per = S.pts || 3, live = (S.liveMin || 100) * 60000;
  if (/-test$/.test(ed) || !M.length) return per * (M.length || 15);
  const base = ed === 'real' ? null : Date.parse(ed + 'T00:00Z'); if (base !== null && isNaN(base)) return 0;
  return per * M.filter(([day, iso]) => (base === null ? Date.parse(iso) : base + (day - 1) * DAY + Date.parse(iso) % DAY) + live <= now()).length;
}   // anti-triche : 600 points par minute, 4 000 par jour au plus (un joueur très actif en fait ~1 500)
// réglages de la Coupe : ceux du back office (config « cdm »), sinon ceux de js/data.js
function cdmCfg() {
  const G = GAME.CDM || {}, c = getCfg().cdm || {}, start = Date.parse(c.start || G.start), end = Date.parse(c.end || G.end);
  return { on: c.on != null ? !!c.on : G.on !== false, start, end, prio: c.prio || G.prio || 'cdm', ed: String(c.ed || G.ed || new Date(start).getFullYear()) };
}
// classements publics : ni bannis ni suspects (le suspect se voit quand même à sa place : il ne sait pas qu'il est sorti du classement)
const pubRow = (r, pid) => ({ name: cleanName(r.name) || 'Joueur', skin: cleanId(r.skin), avatar: cleanId(r.avatar), frame: cleanId(r.frame), pts: Math.round(num(r.pts)), me: r.pid === pid });
function sixBoard(ed, pid) {
  const W = "s.ed = ? AND p.banned = 0 AND p.suspect = 0", J = 'FROM six_pts s JOIN players p ON p.pid = s.pid';
  const top = q(`SELECT s.pid, s.pts, p.name, p.skin, p.avatar, p.frame ${J} WHERE ${W} ORDER BY s.pts DESC, s.t ASC LIMIT 10`, ed);
  const total = q1(`SELECT COUNT(*) n ${J} WHERE ${W}`, ed).n, me = pid && q1(`SELECT s.pid, s.pts, s.t, p.name, p.skin, p.avatar, p.frame ${J} WHERE s.ed = ? AND s.pid = ?`, ed, pid);
  if (!me) return { top: top.map(r => pubRow(r, pid)), total, rank: 0, around: [], aroundStart: 0 };
  const rank = 1 + q1(`SELECT COUNT(*) n ${J} WHERE ${W} AND s.pts > ?`, ed, me.pts).n;
  const above = q(`SELECT s.pid, s.pts, p.name, p.skin, p.avatar, p.frame ${J} WHERE ${W} AND s.pts > ? ORDER BY s.pts ASC LIMIT 2`, ed, me.pts).reverse();
  const below = q(`SELECT s.pid, s.pts, p.name, p.skin, p.avatar, p.frame ${J} WHERE ${W} AND s.pts <= ? AND s.pid != ? ORDER BY s.pts DESC, s.t ASC LIMIT 2`, ed, me.pts, pid);
  return { top: top.map(r => pubRow(r, pid)), total, rank, around: [...above, me, ...below].map(r => pubRow(r, pid)), aroundStart: rank - above.length };
}
function cdmBoard(ed, pid, n = 5) {
  const J = 'FROM cdm_pts c JOIN players p ON p.pid = c.pid', W = 'c.ed = ? AND p.banned = 0 AND p.suspect = 0';
  const totals = {}, count = {}, top = {};
  q(`SELECT c.team, SUM(c.pts) s, COUNT(*) n ${J} WHERE ${W} GROUP BY c.team`, ed).forEach(r => { totals[r.team] = r.s; count[r.team] = r.n; });
  ((GAME.CDM && GAME.CDM.teams) || []).forEach(t => { totals[t.id] = totals[t.id] || 0; count[t.id] = count[t.id] || 0;
    top[t.id] = q(`SELECT c.pid, c.pts, p.name, p.skin, p.avatar, p.frame ${J} WHERE ${W} AND c.team = ? ORDER BY c.pts DESC, c.t ASC LIMIT ?`, ed, t.id, n).map(r => pubRow(r, pid)); });
  const mine = pid && q1('SELECT team, pts FROM cdm_pts WHERE ed = ? AND pid = ?', ed, pid);
  const me = mine ? { team: mine.team, pts: mine.pts, rank: 1 + q1(`SELECT COUNT(*) n ${J} WHERE ${W} AND c.team = ? AND c.pts > ?`, ed, mine.team, mine.pts).n } : null;
  return { totals, count, top, me };
}

// ------------------------------------------------------------------ API des joueurs
const api = {
  async 'POST /api/leaderboard'(req, res) {   // classement des fortunes : le top 10, puis le joueur et ses voisins
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' });
    const cols = 'pid, name, tag, skin, avatar, frame, lvl, worth', W = "banned = 0 AND suspect = 0 AND name != ''", top = q(`SELECT ${cols} FROM players WHERE ${W} ORDER BY worth DESC LIMIT 10`);
    const rank = 1 + (q1(`SELECT COUNT(*) n FROM players WHERE ${W} AND worth > ?`, p.worth || 0).n), total = q1(`SELECT COUNT(*) n FROM players WHERE ${W}`).n;
    const above = q(`SELECT ${cols} FROM players WHERE ${W} AND worth > ? ORDER BY worth ASC LIMIT 2`, p.worth || 0).reverse();
    const below = q(`SELECT ${cols} FROM players WHERE ${W} AND worth <= ? AND pid != ? ORDER BY worth DESC LIMIT 2`, p.worth || 0, p.pid);
    const me = q1(`SELECT ${cols} FROM players WHERE pid = ?`, p.pid);
    const strip = r => ({ name: cleanName(r.name), tag: cleanTag(r.tag), skin: cleanId(r.skin), avatar: cleanId(r.avatar), frame: cleanId(r.frame), lvl: lvlOf(r.lvl), worth: Math.round(num(r.worth)), me: r.pid === p.pid });
    send(res, 200, { total, rank, top: top.map(strip), around: [...above, me, ...below].map(strip), aroundStart: rank - above.length });
  },
  async 'POST /api/push-token'(req, res) {   // l'application envoie son adresse de notification (une par téléphone)
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' }); if (!PUSH.save(p.pid, b.token, b.platform)) return send(res, 400, { err: 'token' }); send(res, 200, { ok: true });
  },
  async 'POST /api/hello'(req, res) {
    const b = await body(req); if (!b.pid || !b.secret || typeof b.pid !== 'string' || typeof b.secret !== 'string') return send(res, 400, { err: 'pid' });
    const ip = clientIp(req), name = cleanName(b.name), tag = cleanTag(b.tag), ver = txt(b.ver, 20);
    let p = q1('SELECT * FROM players WHERE pid = ?', b.pid);
    if (!p) { if (!PID_RE.test(b.pid) || !SECRET_RE.test(b.secret)) return send(res, 400, { err: 'pid' });
      if (!limit('new:' + ip, 10, 3600000)) return send(res, 429, { err: 'Trop de nouvelles parties depuis cette connexion, réessaie plus tard.', retry: 3600 });
      run('INSERT INTO players (pid, secret, name, tag, created, last_seen, platform, ver) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', b.pid, b.secret, name, tag, now(), now(), txt(b.platform, 160) || '', ver || '');
      run('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)', b.pid, now(), 'install', '{}'); p = q1('SELECT * FROM players WHERE pid = ?', b.pid); }
    else if (p.secret !== b.secret) return send(res, 403, { err: 'secret' });
    run('UPDATE players SET sessions = sessions + 1, last_seen = ?, name = ?, tag = ?, platform = ?, ver = ?, tz = ?, lang = ?, screen = ?, ip = ? WHERE pid = ?', now(), name || p.name, tag || p.tag, txt(b.platform, 160) || p.platform, ver || p.ver,
      txt(b.tz, 60) || p.tz, txt(b.lang, 20) || p.lang, txt(b.screen, 40) || p.screen, ipHash(ip), b.pid);
    run('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)', b.pid, now(), 'session', JSON.stringify({ ver }));
    run('INSERT INTO sessions (pid, start, last, ms) VALUES (?, ?, ?, 0)', b.pid, now(), now());
    send(res, 200, { ok: true, banned: !!p.banned, banReason: p.ban_reason || '', config: getCfg(), inbox: inboxFor(b.pid) });
    locate(b.pid, ip, txt(b.tz, 60) || p.tz, p.geo_src);   // après la réponse : jamais d'attente pour le joueur
  },
  async 'POST /api/sync'(req, res) {
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' });
    const raw = b.summary && typeof b.summary === 'object' ? b.summary : {}, s = cleanSummary(raw), ms = Math.floor(num(b.playMs, 600000)), A = antiCheat(p, s);
    if (A.n) console.warn(`anti-triche : ${p.pid} (${A.n} valeur(s) rabotée(s))`);
    run('UPDATE players SET last_seen = ?, lvl = ?, worth = ?, cash = ?, lingots = ?, skin = ?, name = ?, tag = ?, play_ms = play_ms + ?, xp = ?, boosters = ?, avatar = ?, frame = ?, tz = COALESCE(?, tz), lang = COALESCE(?, lang), screen = COALESCE(?, screen), sync_at = ?, ac = ?, suspect = suspect + ? WHERE pid = ?',
      now(), s.lvl, s.worth, s.cash, s.lingots, s.skin || '', s.name || p.name, s.tag || p.tag, ms, s.xp, s.boosters, s.avatar, s.frame,
      txt(raw.tz, 60), txt(raw.lang, 20), txt(raw.screen, 40), now(), JSON.stringify(A.ac), A.n ? 1 : 0, p.pid);
    // session en cours (une nouvelle si le joueur revient après plus de 30 min)
    const se = q1('SELECT id, last FROM sessions WHERE pid = ? ORDER BY id DESC LIMIT 1', p.pid);
    if (se && now() - se.last < 30 * 60000) run('UPDATE sessions SET last = ?, ms = ms + ? WHERE id = ?', now(), ms, se.id);
    else { run('INSERT INTO sessions (pid, start, last, ms) VALUES (?, ?, ?, ?)', p.pid, now() - ms, now(), ms); run('UPDATE players SET sessions = sessions + 1 WHERE pid = ?', p.pid); }
    if (typeof b.save === 'string' && b.save.length < 1e6) {
      run('UPDATE players SET save = ?, save_at = ? WHERE pid = ?', b.save, now(), p.pid);
      // historique : une copie toutes les 10 min au plus, les 20 dernières gardées (pour restaurer une partie abîmée)
      const last = q1('SELECT t FROM save_history WHERE pid = ? ORDER BY t DESC LIMIT 1', p.pid);
      if (!last || now() - last.t > 600000) {
        run('INSERT INTO save_history (pid, t, lvl, worth, save) VALUES (?, ?, ?, ?, ?)', p.pid, now(), s.lvl, s.worth, b.save);
        run('DELETE FROM save_history WHERE pid = ? AND id NOT IN (SELECT id FROM save_history WHERE pid = ? ORDER BY t DESC LIMIT 20)', p.pid, p.pid);
      }
    }
    // événements : type court et sans caractère spécial, date plausible, données en JSON (échappées à l'affichage du back office)
    const ins = db.prepare('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)'), T = now();
    (Array.isArray(b.events) ? b.events : []).slice(0, 500).forEach(e => { if (!e || !/^[\w-]{1,40}$/.test(String(e.type))) return; const t = +e.t;
      ins.run(p.pid, t > T - 30 * DAY && t < T + 60000 ? Math.floor(t) : T, String(e.type), (JSON.stringify(e.data && typeof e.data === 'object' ? e.data : {}) || '{}').slice(0, 2000)); });
    send(res, 200, { ok: true, banned: !!p.banned, banReason: p.ban_reason || '', inbox: inboxFor(p.pid), cfgAt: (q1("SELECT v FROM config WHERE k = 'live_at'") || {}).v || 0 });
  },
  async 'POST /api/claim'(req, res) {
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' });
    const m = q1('SELECT gift FROM inbox WHERE id = ? AND pid = ? AND claimed = 0', +b.id || 0, p.pid), g = m && J(m.gift);
    run('UPDATE inbox SET claimed = 1 WHERE id = ? AND pid = ?', +b.id || 0, p.pid);
    // anti-triche : un cadeau en cash du back office est compté à la prochaine synchro ; une partie restaurée repart comme une première synchro
    if (g && g.restore) run('UPDATE players SET sync_at = NULL, ac = NULL WHERE pid = ?', p.pid);
    else if (g && +g.cash) { const ac = J(p.ac); ac.g = num(ac.g, 1e12) + num(g.cash, 1e12); run('UPDATE players SET ac = ? WHERE pid = ?', JSON.stringify(ac), p.pid); }
    send(res, 200, { ok: true });
  },
  'GET /api/health'(req, res) { q1('SELECT 1 x'); send(res, 200, { ok: true, t: now() }); },   // pour la surveillance (.github/workflows/uptime.yml)
  async 'POST /api/delete-me'(req, res) {   // RGPD : { pid, secret } → efface le joueur et tout ce qui le concerne, dans toutes les tables
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' });
    const n = {}, del = (tbl, sql, ...a) => { n[tbl] = Number(run(sql, ...a).changes); };
    db.exec('BEGIN');
    try {
      del('ticket_msgs', 'DELETE FROM ticket_msgs WHERE ticket IN (SELECT id FROM tickets WHERE pid = ?)', p.pid);
      ['events', 'sessions', 'save_history', 'push_tokens', 'cdm_pts', 'six_pts', 'tickets', 'inbox'].forEach(t => del(t, `DELETE FROM ${t} WHERE pid = ?`, p.pid));
      if (p.ip) del('geo_cache', 'DELETE FROM geo_cache WHERE ip = ?', p.ip);
      run("UPDATE admin_log SET data = REPLACE(data, ?, 'supprimé') WHERE INSTR(data, ?) > 0", p.pid, p.pid);   // le journal garde l'action, plus le joueur
      del('players', 'DELETE FROM players WHERE pid = ?', p.pid);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    log('delete-me', { n }); send(res, 200, { ok: true });
  },
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
  },
  // -------- événements : classements en ligne (vrais joueurs seulement)
  async 'POST /api/six'(req, res) {   // Tournoi des 6 Quartiers : { ed, add, good, played } (points gagnés depuis la dernière fois, comme la Coupe) → top 10, ta place, tes voisins, took
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' });
    const ed = String(b.ed || ''); if (!ED_RE.test(ed)) return send(res, 400, { err: 'ed' });
    let row = q1('SELECT * FROM six_pts WHERE ed = ? AND pid = ?', ed, p.pid), took = 0;
    // ancien jeu ({ pts } = son total) : on n'en prend que l'écart avec ce qui est déjà compté, avec les mêmes plafonds
    const add = Math.round(b.add != null ? num(b.add, 1e4) : Math.max(0, num(b.pts, 1e4) - (row ? row.pts : 0)));
    if (!row && (b.played || add)) { run('INSERT INTO six_pts (ed, pid, pts, good, t, win, win_n, day, day_n) VALUES (?, ?, 0, 0, ?, 0, 0, ?, 0)', ed, p.pid, now(), dkey(now())); row = q1('SELECT * FROM six_pts WHERE ed = ? AND pid = ?', ed, p.pid); }
    if (row && add) {
      // anti-triche : 9 points par minute, 27 par jour, jamais plus que 3 × les matchs finis (le surplus n'est pas compté : le jeu le renvoie plus tard)
      const fresh = now() - (row.win || 0) > 60000, used = fresh ? 0 : row.win_n || 0, dk = dkey(now()), dn = row.day === dk ? row.day_n || 0 : 0;
      took = Math.max(0, Math.min(add, SIX_MIN - used, SIX_DAY - dn, sixMax(ed) - row.pts));
      if (took) run('UPDATE six_pts SET pts = pts + ?, t = ?, win = ?, win_n = ?, day = ?, day_n = ? WHERE ed = ? AND pid = ?', took, now(), fresh ? now() : row.win, used + took, dk, dn + took, ed, p.pid);
    }
    if (row) run('UPDATE six_pts SET good = ? WHERE ed = ? AND pid = ?', Math.min(Math.floor(num(b.good, 15)), Math.floor((row.pts + took) / ((GAME.SIX && GAME.SIX.pts) || 3))), ed, p.pid);
    send(res, 200, { ...sixBoard(ed, p.pid), took });
  },
  async 'POST /api/cdm'(req, res) {   // Coupe des Morts : { ed, team, add } → totaux des 4 équipes, top 5 de ton équipe, ta place
    const b = await body(req), p = player(b); if (!p) return send(res, 403, { err: 'auth' });
    const ed = String(b.ed || ''), C = cdmCfg(), test = /^test-\d+$/.test(ed); if (!ED_RE.test(ed)) return send(res, 400, { err: 'ed' });
    let row = q1('SELECT * FROM cdm_pts WHERE ed = ? AND pid = ?', ed, p.pid), took = 0;
    const team = (GAME.CDM && GAME.CDM.teams || []).some(t => t.id === b.team) ? b.team : null;
    // on accepte les points seulement pendant la Coupe (5 min de marge à la fin), pour l'édition en cours (ou une édition de test)
    const open = test || (ed === C.ed && C.on && now() >= C.start && now() <= C.end + 300000);
    if (team && open && !row) { run('INSERT INTO cdm_pts (ed, pid, team, pts, t, win, win_n) VALUES (?, ?, ?, 0, ?, ?, 0)', ed, p.pid, team, now(), now()); row = q1('SELECT * FROM cdm_pts WHERE ed = ? AND pid = ?', ed, p.pid); }
    const add = Math.max(0, Math.round(+b.add || 0));
    if (row && open && add) {
      // anti-triche : 600 points par minute et 4 000 par jour au plus (le surplus de la minute est renvoyé plus tard par le jeu, celui du jour est perdu)
      const fresh = now() - row.win > 60000, used = fresh ? 0 : row.win_n, dk = dkey(now()), dn = row.day === dk ? row.day_n || 0 : 0;
      took = Math.max(0, Math.min(add, CDM_CAP - used, CDM_DAY - dn));
      run('UPDATE cdm_pts SET pts = pts + ?, t = ?, win = ?, win_n = ?, day = ?, day_n = ? WHERE ed = ? AND pid = ?', took, now(), fresh ? now() : row.win, used + took, dk, dn + took, ed, p.pid);
      if (dn + took >= CDM_DAY) took = add;   // plafond du jour atteint : le jeu n'a pas à renvoyer le reste
    }
    send(res, 200, { ...cdmBoard(ed, p.pid), took, team: row ? row.team : null });
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
const PCOLS = 'pid, name, tag, skin, avatar, frame, lvl, xp, worth, cash, lingots, boosters, created, last_seen, sessions, play_ms, banned, suspect, platform, cc, country, city, lang';

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
    if (f === 'suspect') where.push('suspect > 0');
    if (f === 'payers') where.push("pid IN (SELECT DISTINCT pid FROM events WHERE type = 'iap_buy')");
    if (f === 'new') { where.push('created >= ?'); args.push(now() - 7 * DAY); }
    if (f === 'gone') { where.push('last_seen < ?'); args.push(now() - 7 * DAY); }
    if (g('cc')) { where.push('cc = ?'); args.push(g('cc')); }
    if (g('lmin')) { where.push('lvl >= ?'); args.push(+g('lmin')); }
    if (g('lmax')) { where.push('lvl <= ?'); args.push(+g('lmax')); }
    const W = where.join(' AND '), lim = Math.min(500, +g('limit') || 60), off = +g('offset') || 0, sm = spendMap();
    const rows = q(`SELECT ${PCOLS} FROM players WHERE ${W} ORDER BY ${sort} LIMIT ? OFFSET ?`, ...args, lim, off).map(p => ({ ...p, online: online(p), spent: sm[p.pid] ? Math.round(sm[p.pid].eur * 100) / 100 : 0 }));
    const T = now(), all = q('SELECT cc, country, banned, suspect, last_seen, created, pid FROM players');
    send(res, 200, { rows, total: q1(`SELECT COUNT(*) n FROM players WHERE ${W}`, ...args).n,
      counts: { all: all.length, online: all.filter(p => p.last_seen >= T - ONLINE_MS).length, payers: Object.keys(sm).length, banned: all.filter(p => p.banned).length, suspect: all.filter(p => p.suspect > 0).length, new: all.filter(p => p.created >= T - 7 * DAY).length, gone: all.filter(p => p.last_seen < T - 7 * DAY).length },
      countries: countBy(all, p => p.cc ? p.cc + '|' + (p.country || p.cc) : null) });
  },
  'GET /admin/api/player'(req, res, u) {
    const pid = u.searchParams.get('pid'), p = q1('SELECT * FROM players WHERE pid = ?', pid); if (!p) return send(res, 404, { err: 'introuvable' });
    const { secret, ac, ip, ...pub } = p, sm = spendMap()[pid];
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
    if (b.dry) return send(res, 200, { ok: true, n: pids.length, phones: PUSH.count(pids), pushOn: PUSH.on });
    const ins = db.prepare('INSERT INTO inbox (pid, t, title, text, gift) VALUES (?, ?, ?, ?, ?)'); pids.forEach(pid => ins.run(pid, now(), b.title || 'Hustle City', b.text || '', gift));
    // et en notification sur le téléphone (application), si demandé
    if (b.push !== false && PUSH.on) PUSH.toPlayers(pids, b.title || 'Hustle City', (b.text || '').slice(0, 180)).then(n => n && log('push', { title: b.title, n })).catch(() => {});
    log(b.pid === '*' ? 'broadcast' : 'gift', { ...b, n: pids.length }); send(res, 200, { ok: true, n: pids.length, phones: PUSH.on ? PUSH.count(pids) : 0 });
  },
  async 'POST /admin/api/ban'(req, res) { const b = await body(req); run('UPDATE players SET banned = ?, ban_reason = ? WHERE pid = ?', b.ban ? 1 : 0, b.reason || '', b.pid); log(b.ban ? 'ban' : 'unban', b); send(res, 200, { ok: true }); },
  // anti-triche : lever le drapeau « Suspect » (la prochaine synchro repart comme une première : sa fortune actuelle est reprise telle quelle)
  async 'POST /admin/api/suspect'(req, res) { const b = await body(req); run('UPDATE players SET suspect = 0, sync_at = NULL, ac = NULL WHERE pid = ?', String(b.pid || '')); log('suspect-clear', { pid: b.pid }); send(res, 200, { ok: true }); },
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
  'GET /admin/api/cdm'(req, res) {   // Coupe des Morts : totaux des équipes, nombre de joueurs, meilleurs joueurs (édition en cours)
    const C = cdmCfg(), B = cdmBoard(C.ed, null, 3);
    const best = q('SELECT c.pid, c.team, c.pts, p.name, p.tag, p.skin, p.avatar, p.frame FROM cdm_pts c JOIN players p ON p.pid = c.pid WHERE c.ed = ? AND p.banned = 0 ORDER BY c.pts DESC LIMIT 10', C.ed);
    send(res, 200, { ...C, ...B, best, players: Object.values(B.count).reduce((a, b) => a + b, 0) });
  },
  async 'POST /admin/api/config'(req, res) {
    const b = await body(req);
    // les objets du jeu ont leur propre page : une autre page qui ne les connaît pas ne doit jamais les effacer
    if (b.content) b.content = cleanContent(b.content); else { const cur = getCfg().content; if (cur) b.content = cur; }
    saveLive(b); const { content, ...rest } = b; log('config', rest); send(res, 200, { ok: true });
  },
  async 'POST /admin/api/content'(req, res) {   // page « Objets du jeu » : remplace tout le contenu ajouté / modifié
    const b = await body(req), cfg = getCfg(), before = (cfg.content || {}).items || {};
    cfg.content = cleanContent(b); saveLive(cfg);
    const ids = Object.keys(cfg.content.items), changed = ids.filter(id => JSON.stringify(before[id]) !== JSON.stringify(cfg.content.items[id])), gone = Object.keys(before).filter(id => !cfg.content.items[id]);
    log('content', { n: ids.length, changed: changed.slice(0, 20), removed: gone.slice(0, 20) }); send(res, 200, { ok: true, content: cfg.content });
  },
  async 'POST /admin/api/upload'(req, res) {   // une image (PNG, JPG ou WebP, 4 Mo au plus), envoyée en base64
    const b = await body(req, 6e6), m = /^data:image\/[a-z+]+;base64,(.+)$/s.exec(String(b.data || '')) || [null, String(b.data || '')];
    let buf; try { buf = Buffer.from(m[1], 'base64'); } catch (e) { return send(res, 400, { err: 'Image illisible.' }); }
    if (buf.length > 4 * 1048576) return send(res, 400, { err: 'Image trop lourde (4 Mo au plus).' });
    const kind = imageKind(buf); if (!kind) return send(res, 400, { err: 'Il faut une image PNG, JPG ou WebP.' });
    fs.mkdirSync(UPLOADS, { recursive: true });
    const name = `${slug(b.name) || 'image'}-${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10)}.${kind}`;
    fs.writeFileSync(path.join(UPLOADS, name), buf); log('upload', { name, size: buf.length });
    send(res, 200, { ok: true, url: '/media/' + name, size: buf.length });
  },
  'GET /admin/api/events'(req, res, u) {
    const type = u.searchParams.get('type'), before = +u.searchParams.get('before') || 0;
    const w = ["e.type != 'act'"], a = []; if (type) { w.push('e.type = ?'); a.push(type); } if (before) { w.push('e.t < ?'); a.push(before); }
    send(res, 200, q(`SELECT e.t, e.type, e.data, e.pid, p.name, p.tag, p.skin, p.avatar, p.frame FROM events e LEFT JOIN players p ON p.pid = e.pid WHERE ${w.join(' AND ')} ORDER BY e.t DESC LIMIT 200`, ...a));
  },
  'GET /admin/api/log'(req, res) { send(res, 200, q('SELECT * FROM admin_log ORDER BY t DESC LIMIT 200')); },
  'GET /admin/api/broadcasts'(req, res) { send(res, 200, q("SELECT * FROM admin_log WHERE action = 'broadcast' OR (action = 'gift' AND data LIKE '%\"pid\":\"*\"%') ORDER BY t DESC LIMIT 30")); },
  // -------- notifications sur le téléphone des joueurs (page « Notifications »)
  'GET /admin/api/push'(req, res) {
    send(res, 200, { on: PUSH.on, phones: PUSH.count(q('SELECT pid FROM players').map(r => r.pid)),
      plan: q('SELECT * FROM push_plan WHERE sent = 0 ORDER BY at'), sent: q('SELECT * FROM push_plan WHERE sent = 1 ORDER BY at DESC LIMIT 30') });
  },
  async 'POST /admin/api/push'(req, res) {   // { title, body, filter, at? (ms), dry? }
    const b = await body(req), pids = pushTargets(b.filter || {});
    if (b.dry) return send(res, 200, { ok: true, n: pids.length, phones: PUSH.count(pids), on: PUSH.on });
    const title = String(b.title || 'Hustle City').slice(0, 60), text = String(b.body || '').slice(0, 180);
    if (!text) return send(res, 400, { err: 'texte vide' });
    const at = +b.at > now() + 30000 ? +b.at : now();
    const r = db.prepare('INSERT INTO push_plan (at, title, body, filter, sent, n) VALUES (?, ?, ?, ?, 0, 0)').run(at, title, text, JSON.stringify(b.filter || {}));
    log('push-plan', { title, at, filter: b.filter }); if (at <= now()) await pushDue(); send(res, 200, { ok: true, id: Number(r.lastInsertRowid), at });
  },
  async 'POST /admin/api/push-cancel'(req, res) { const b = await body(req); run('DELETE FROM push_plan WHERE id = ? AND sent = 0', +b.id); log('push-cancel', b); send(res, 200, { ok: true }); }
};
// qui reçoit une notification : tous, ou un groupe (absents depuis N jours, actifs cette semaine, niveau minimum)
db.exec('CREATE TABLE IF NOT EXISTS push_plan (id INTEGER PRIMARY KEY AUTOINCREMENT, at INT, title TEXT, body TEXT, filter TEXT, sent INT DEFAULT 0, n INT DEFAULT 0)');
function pushTargets(f) {
  const w = ['banned = 0'], a = [];
  if (+f.away) { w.push('last_seen < ?'); a.push(now() - +f.away * DAY); }
  if (f.active7) { w.push('last_seen >= ?'); a.push(now() - 7 * DAY); }
  if (+f.minLvl) { w.push('lvl >= ?'); a.push(+f.minLvl); }
  return q(`SELECT pid FROM players WHERE ${w.join(' AND ')}`, ...a).map(r => r.pid);
}
async function pushDue() {   // envoie les notifications programmées dont l'heure est passée
  for (const p of q('SELECT * FROM push_plan WHERE sent = 0 AND at <= ?', now())) {
    run('UPDATE push_plan SET sent = 1 WHERE id = ?', p.id);
    const pids = pushTargets(JSON.parse(p.filter || '{}')), n = PUSH.on ? await PUSH.toPlayers(pids, p.title, p.body).catch(() => 0) : 0;
    run('UPDATE push_plan SET n = ? WHERE id = ?', n, p.id); log('push', { title: p.title, n });
  }
}
setInterval(() => pushDue().catch(() => {}), 60000);

// anciennes lignes : pseudos et identifiants d'images nettoyés comme les nouveaux (une fois, au démarrage)
for (const r of q('SELECT pid, name, tag, skin, avatar, frame FROM players')) {
  const c = { name: cleanName(r.name), tag: cleanTag(r.tag), skin: cleanId(r.skin) || '', avatar: cleanId(r.avatar), frame: cleanId(r.frame) };
  if (c.name !== (r.name || '') || c.tag !== (r.tag || '') || c.skin !== (r.skin || '') || c.avatar !== r.avatar || c.frame !== r.frame) run('UPDATE players SET name = ?, tag = ?, skin = ?, avatar = ?, frame = ? WHERE pid = ?', c.name, c.tag, c.skin, c.avatar, c.frame, r.pid);
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
// fichiers servis : LISTE BLANCHE (ce que chargent game.html, index.html, la page confidentialité et le back office ; images .png ou .webp). Le reste (CLAUDE.md, tools/, server/, .git, ios/, android/, package.json…) → 404.
const PUB_FILES = new Set(['/index.html', '/game.html', '/confidentialite.html', '/manifest.webmanifest', '/og.jpg']), PUB_DIRS = ['/js/', '/css/', '/assets/'];
// en-têtes de sécurité des pages : pas d'affichage dans un cadre d'un autre site ; CSP seulement pour le back office (celle du jeu reste à faire : trop risqué)
const ADMIN_CSP = "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https://server.arcgisonline.com https://unpkg.com; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const htmlHeaders = adm => ({ 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': adm ? ADMIN_CSP : "frame-ancestors 'none'" });
const ICON = path.join(ROOT, 'assets/app/icon-180.png');   // la plus petite icône de l'appli, pour /favicon.ico
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), key = req.method + ' ' + u.pathname;
  res.api = u.pathname.startsWith('/api/');
  if (req.method === 'OPTIONS') return res.api ? send(res, 204, {}) : (res.writeHead(204), res.end());
  try {
    if (res.api) {
      if (!limit('ip:' + clientIp(req), 240, 60000)) { res.setHeader('Retry-After', '60'); return send(res, 429, { err: 'Trop de requêtes, réessaie dans une minute.', retry: 60 }); }
      req.maxBody = key === 'POST /api/sync' ? 1e6 : 3e5;
      if (+req.headers['content-length'] > req.maxBody) { res.setHeader('Connection', 'close'); return send(res, 413, { err: 'Trop gros.' }); }
      if (api[key]) return await api[key](req, res, u); return send(res, 404, { err: 'route' });
    }
    if (u.pathname.startsWith('/admin/api/')) {
      if ((req.headers.authorization || '') !== 'Bearer ' + ADMIN_TOKEN) return send(res, 401, { err: 'Jeton du back office invalide.' });
      if (admin[key]) return await admin[key](req, res, u); return send(res, 404, { err: 'route' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { err: 'méthode' });
    // images envoyées depuis le back office (objets du jeu) : publiques, jamais modifiées (le nom contient l'empreinte de l'image)
    if (u.pathname.startsWith('/media/')) {
      const name = u.pathname.slice(7); if (!MEDIA_RE.test(name)) return send(res, 404, '404', 'text/plain');
      return fs.readFile(path.join(UPLOADS, name), (e, data) => { if (e) return send(res, 404, '404', 'text/plain');
        res.writeHead(200, { 'Content-Type': MEDIA_TYPES[name.split('.').pop()], 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable' }); res.end(data); });
    }
    if (u.pathname === '/favicon.ico') return fs.readFile(ICON, (e, data) => { if (e) { res.writeHead(204); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }); res.end(data); });
    let p; try { p = decodeURIComponent(u.pathname); } catch (e) { return send(res, 404, '404', 'text/plain'); }
    let f = null, adm = false;
    if (p === '/') p = '/index.html';
    if (p === '/admin') { res.writeHead(301, { Location: '/admin/' }); return res.end(); }
    if (p === '/admin/') { f = path.join(__dirname, 'admin', 'index.html'); adm = true; }
    else if (/^\/admin\/[\w-]+\.(html|js|css)$/.test(p)) { f = path.join(__dirname, 'admin', p.slice(7)); adm = true; }
    else if (PUB_FILES.has(p) || PUB_DIRS.some(d => p.startsWith(d))) f = path.join(ROOT, p);
    // le chemin final doit rester dans le dossier autorisé, sans morceau caché (.DS_Store, .git…) ni « .. », et avec une extension connue
    const base = adm ? path.join(__dirname, 'admin') : ROOT, ext = f ? path.extname(f) : '';
    if (!f || !f.startsWith(base + path.sep) || p.split('/').some(x => x.startsWith('.')) || !types[ext] || ext === '.json') return send(res, 404, '404', 'text/plain');
    fs.readFile(f, (e, data) => { if (e) return send(res, 404, '404', 'text/plain');
      // cache du navigateur : un fichier avec sa version dans l'adresse (?v=…) ne change jamais → gardé 1 an ; une image sans version → 1 jour ; les pages → toujours revérifiées
      const cc = ext === '.html' || ext === '.webmanifest' ? 'no-cache' : /[?&]v=/.test(req.url) && !/[?&]t=/.test(req.url) ? 'public, max-age=31536000, immutable' : /\.(png|jpe?g|webp|svg|woff2?)$/.test(ext) ? 'public, max-age=86400' : 'no-cache';
      res.writeHead(200, { 'Content-Type': types[ext], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': cc, ...(ext === '.html' ? htmlHeaders(adm) : {}) }); res.end(req.method === 'HEAD' ? undefined : data); });
  } catch (e) {
    if (e.code === 413) { res.setHeader('Connection', 'close'); send(res, 413, { err: 'Trop gros.' }); return res.on('finish', () => req.destroy()); }
    console.error(e); send(res, 500, { err: 'Erreur du serveur.' });
  }
}).listen(PORT, () => console.log(`Hustle City en ligne sur http://localhost:${PORT}  ·  back office : http://localhost:${PORT}/admin/  ·  base : ${path.basename(DBFILE)}  ·  jeton : dans server/.admin-token (ou ADMIN_TOKEN)`));
