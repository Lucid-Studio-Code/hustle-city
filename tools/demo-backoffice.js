// Biff City : données de DÉMO pour le back office (≈ 400 joueurs fictifs sur 60 jours).
// Remplit une base SÉPARÉE (server/demo.db) : la vraie base server/hustle.db n'est jamais touchée.
//   node tools/demo-backoffice.js
//   DB=server/demo.db PORT=5301 node server/server.js   →   http://localhost:5301/admin/
// Le tirage est fixe (même graine) : relancer donne la même démo, recalée sur l'heure actuelle.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { DatabaseSync } = require('node:sqlite');
process.env.TZ = process.env.TZ || 'Europe/Paris';
const ROOT = path.join(__dirname, '..');
const DBFILE = path.join(ROOT, 'server', 'demo.db');
if (/hustle\.db/.test(DBFILE)) throw new Error('jamais la vraie base');
const { initDb } = require(path.join(ROOT, 'server', 'schema.js'));

// ---------------------------------------------------------------- réglages du jeu (data.js)
const ctx = { window: {} }; vm.createContext(ctx);
['js/layout.js', 'js/data.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));
const D = ctx.window.DATA;

// ---------------------------------------------------------------- hasard reproductible
let seed = 20261005;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const R = (a, b) => a + rnd() * (b - a), RI = (a, b) => Math.floor(R(a, b + 1)), pick = a => a[Math.floor(rnd() * a.length)];
const wpick = list => { const tot = list.reduce((t, x) => t + x[1], 0); let r = rnd() * tot; for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; } return list[0][0]; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const MIN = 60000, H = 3600000, DAY = 86400000, NOW = Date.now();

// ---------------------------------------------------------------- base neuve
['', '-wal', '-shm'].forEach(x => { try { fs.unlinkSync(DBFILE + x); } catch (e) {} });
const db = new DatabaseSync(DBFILE); initDb(db);
db.exec('PRAGMA synchronous = OFF; BEGIN');
const st = sql => db.prepare(sql);
const insP = st(`INSERT INTO players (pid, secret, name, tag, skin, lvl, xp, worth, cash, lingots, boosters, avatar, frame, created, last_seen, sessions, play_ms, platform, ver, banned, ban_reason, notes, save, save_at,
  tz, lang, screen, ip, country, cc, region, city, lat, lon, geo_src) VALUES (${Array(35).fill('?').join(', ')})`);
const insE = st('INSERT INTO events (pid, t, type, data) VALUES (?, ?, ?, ?)');
const insS = st('INSERT INTO sessions (pid, start, last, ms) VALUES (?, ?, ?, ?)');
const insH = st('INSERT INTO save_history (pid, t, lvl, worth, save) VALUES (?, ?, ?, ?, ?)');
const insT = st('INSERT INTO tickets (pid, t, created, status, subject) VALUES (?, ?, ?, ?, ?)');
const insM = st('INSERT INTO ticket_msgs (ticket, t, from_admin, text) VALUES (?, ?, ?, ?)');
const insI = st('INSERT INTO inbox (pid, t, title, text, gift, claimed) VALUES (?, ?, ?, ?, ?, ?)');
const insL = st('INSERT INTO admin_log (t, action, data) VALUES (?, ?, ?)');
const ev = (pid, t, type, data) => insE.run(pid, Math.round(t), type, JSON.stringify(data || {}));

// ---------------------------------------------------------------- d'où ils viennent
const CITIES = [
  ['Paris', 'Île-de-France', 48.857, 2.352, 60], ['Saint-Denis', 'Île-de-France', 48.936, 2.357, 14], ['Créteil', 'Île-de-France', 48.79, 2.455, 8], ['Argenteuil', 'Île-de-France', 48.947, 2.248, 7],
  ['Marseille', "Provence-Alpes-Côte d'Azur", 43.296, 5.37, 30], ['Lyon', 'Auvergne-Rhône-Alpes', 45.764, 4.836, 26], ['Toulouse', 'Occitanie', 43.605, 1.444, 17], ['Nice', "Provence-Alpes-Côte d'Azur", 43.71, 7.262, 10],
  ['Nantes', 'Pays de la Loire', 47.218, -1.554, 12], ['Strasbourg', 'Grand Est', 48.573, 7.752, 10], ['Montpellier', 'Occitanie', 43.611, 3.877, 11], ['Bordeaux', 'Nouvelle-Aquitaine', 44.838, -0.579, 13],
  ['Lille', 'Hauts-de-France', 50.629, 3.057, 14], ['Rennes', 'Bretagne', 48.117, -1.678, 8], ['Reims', 'Grand Est', 49.258, 4.032, 4], ['Le Havre', 'Normandie', 49.494, 0.108, 4],
  ['Saint-Étienne', 'Auvergne-Rhône-Alpes', 45.44, 4.387, 4], ['Toulon', "Provence-Alpes-Côte d'Azur", 43.124, 5.928, 4], ['Grenoble', 'Auvergne-Rhône-Alpes', 45.188, 5.724, 6], ['Dijon', 'Bourgogne-Franche-Comté', 47.322, 5.041, 3],
  ['Angers', 'Pays de la Loire', 47.478, -0.563, 3], ['Nîmes', 'Occitanie', 43.837, 4.36, 3], ['Clermont-Ferrand', 'Auvergne-Rhône-Alpes', 45.778, 3.087, 3], ['Le Mans', 'Pays de la Loire', 48.006, 0.199, 2],
  ['Aix-en-Provence', "Provence-Alpes-Côte d'Azur", 43.53, 5.447, 3], ['Brest', 'Bretagne', 48.39, -4.486, 2], ['Tours', 'Centre-Val de Loire', 47.394, 0.685, 3], ['Amiens', 'Hauts-de-France', 49.894, 2.296, 2],
  ['Limoges', 'Nouvelle-Aquitaine', 45.834, 1.262, 2], ['Perpignan', 'Occitanie', 42.699, 2.895, 2], ['Metz', 'Grand Est', 49.12, 6.176, 3], ['Rouen', 'Normandie', 49.443, 1.099, 3], ['Mulhouse', 'Grand Est', 47.75, 7.336, 2]
].map(c => ({ city: c[0], region: c[1], lat: c[2], lon: c[3], w: c[4], country: 'France', cc: 'FR', tz: 'Europe/Paris', lang: 'fr-FR' }));
[['Bruxelles', 'Bruxelles', 50.847, 4.357, 9], ['Liège', 'Wallonie', 50.633, 5.567, 4], ['Charleroi', 'Wallonie', 50.411, 4.444, 3]].forEach(c => CITIES.push({ city: c[0], region: c[1], lat: c[2], lon: c[3], w: c[4], country: 'Belgique', cc: 'BE', tz: 'Europe/Brussels', lang: 'fr-BE' }));
[['Genève', 'Genève', 46.204, 6.143, 5], ['Lausanne', 'Vaud', 46.52, 6.633, 3]].forEach(c => CITIES.push({ city: c[0], region: c[1], lat: c[2], lon: c[3], w: c[4], country: 'Suisse', cc: 'CH', tz: 'Europe/Zurich', lang: 'fr-CH' }));
[['Montréal', 'Québec', 45.502, -73.567, 7], ['Québec', 'Québec', 46.814, -71.208, 3]].forEach(c => CITIES.push({ city: c[0], region: c[1], lat: c[2], lon: c[3], w: c[4], country: 'Canada', cc: 'CA', tz: 'America/Montreal', lang: 'fr-CA' }));
[['Casablanca', 'Casablanca-Settat', 33.573, -7.59, 6], ['Rabat', 'Rabat-Salé-Kénitra', 34.02, -6.835, 3], ['Marrakech', 'Marrakech-Safi', 31.629, -7.981, 2]].forEach(c => CITIES.push({ city: c[0], region: c[1], lat: c[2], lon: c[3], w: c[4], country: 'Maroc', cc: 'MA', tz: 'Africa/Casablanca', lang: 'fr-MA' }));
CITIES.push({ city: 'Luxembourg', region: 'Luxembourg', lat: 49.611, lon: 6.13, w: 2, country: 'Luxembourg', cc: 'LU', tz: 'Europe/Luxembourg', lang: 'fr-LU' });
CITIES.push({ city: 'Saint-Denis', region: 'La Réunion', lat: -20.882, lon: 55.45, w: 3, country: 'La Réunion', cc: 'RE', tz: 'Indian/Reunion', lang: 'fr-FR' });
CITIES.push({ city: 'Dakar', region: 'Dakar', lat: 14.716, lon: -17.467, w: 2, country: 'Sénégal', cc: 'SN', tz: 'Africa/Dakar', lang: 'fr-SN' });

// ---------------------------------------------------------------- appareils
const DEVICES = [
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1', ['390x844', '393x852', '430x932', '375x667'], 44],
  ['Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36', ['412x915', '384x854', '360x800'], 36],
  ['Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1', ['820x1180', '1024x1366'], 5],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', ['1440x900', '1512x982'], 6],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', ['1920x1080', '1366x768'], 9]
];

// ---------------------------------------------------------------- pseudos
const BASES = ['Kenzo', 'Lina', 'Yanis', 'Inès', 'Sofiane', 'Chloé', 'Mehdi', 'Sarah', 'Bilal', 'Emma', 'Rayan', 'Nadia', 'Théo', 'Jade', 'Moussa', 'Léa', 'Karim', 'Zoé', 'Adam', 'Maëlys',
  'Nabil', 'Camille', 'Ilyes', 'Manon', 'Samy', 'Océane', 'Djibril', 'Lou', 'Wassim', 'Anaïs', 'Hugo', 'Yasmine', 'Enzo', 'Lucie', 'Amine', 'Clara', 'Nolan', 'Kenza', 'Malik', 'Romane',
  'Ryad', 'Ambre', 'Ismaël', 'Eva', 'Lenny', 'Noa', 'Younes', 'Alicia', 'Mattéo', 'Assia', 'Tom', 'Dounia', 'Liam', 'Maya', 'Nassim', 'Elsa', 'Kylian', 'Sirine', 'Axel', 'Lilou'];
const NICKS = ['LaFouine', 'BigBoss', 'Le_Requin', 'MiniMoula', 'Cash_Kid', 'Baraka', 'TonTonFlingue', 'Gold_Digger', 'RoiDuQuartier', 'LaDaronne', 'P\'tit_Loup', 'Smooth', 'Zizou_bis',
  'Mister_Lingot', 'Queen_B', 'Le_Banquier', 'Hustler', 'Grosse_Cote', 'Frérot', 'Dealmaker', 'Mama_Mia', 'NoLimit', 'TicketGagnant', 'JackpotJo', 'Kaïra', 'Bling', 'La_Comète', 'Turbo', 'Pépite', 'Flash'];
const FEM = new Set(['Lina', 'Inès', 'Chloé', 'Sarah', 'Emma', 'Nadia', 'Jade', 'Léa', 'Zoé', 'Maëlys', 'Camille', 'Manon', 'Océane', 'Lou', 'Anaïs', 'Yasmine', 'Lucie', 'Clara', 'Kenza', 'Romane', 'Ambre', 'Eva', 'Noa', 'Alicia', 'Assia', 'Dounia', 'Maya', 'Elsa', 'Sirine', 'Lilou', 'Queen_B', 'LaDaronne', 'Mama_Mia', 'La_Comète', 'Pépite']);
let lastBase = '';
const used = new Set();
function pseudo() {
  for (let k = 0; k < 50; k++) {
    const b = rnd() < .22 ? pick(NICKS) : pick(BASES), s = wpick([['', 2], [String(RI(1, 99)), 3], ['_' + pick(['zr', 'b', 'lsc', 'off', 'pro', 'du13', 'du93', 'k', 'tv', 'gg']), 2], ['.' + pick('abcdefgklmnprsz'), 2], [String(pick([93, 92, 94, 95, 77, 78, 13, 69, 59, 31, 33, 67, 2007, 2008, 2009])), 2]]);
    const n = b + s; if (!used.has(n.toLowerCase())) { used.add(n.toLowerCase()); lastBase = b; return n; }
  }
  return 'Joueur' + RI(1000, 9999);
}

// ---------------------------------------------------------------- progression (minutes jouées → niveau), cf. CLAUDE.md
const LV = [[0, 1], [12, 2], [35, 3], [60, 4], [90, 5], [150, 6], [220, 7], [290, 8], [360, 9], [430, 10], [560, 11], [700, 12], [820, 13], [950, 14], [1150, 15], [1350, 16], [1500, 17], [1650, 18], [1800, 19], [1950, 20],
  [2150, 22], [2450, 25], [2900, 28], [3400, 30], [4200, 33], [5200, 36], [6500, 40]];
function lvlAt(m) { for (let i = LV.length - 1; i >= 0; i--) if (m >= LV[i][0]) { const nx = LV[i + 1]; if (!nx) return 40; return Math.floor(LV[i][1] + (m - LV[i][0]) / (nx[0] - LV[i][0]) * (nx[1] - LV[i][1])); } return 1; }

// ---------------------------------------------------------------- ce qu'on touche dans le jeu
const ACTS = [['bld', 12], ['phoneApp', 10], ['slSpin', 9], ['bPick', 8], ['bPlace', 6], ['scratchGo', 5], ['scrReveal', 5], ['mineHarvest', 5], ['mineStart', 5], ['boosterOpen', 4],
  ['itBuy', 3], ['itSell', 3], ['pc', 3], ['rlSpin', 3], ['claimQuest', 3], ['claimDaily', 2], ['kTip', 2], ['collection', 2], ['sixPick', 2.5], ['profile', 1.5], ['clubGo', 1.5],
  ['agCollect', 2], ['upgrades', 1], ['adWatch', 1], ['iapSoon', .6], ['evBuy', .3], ['stockBuy', .5], ['propCollect', .8], ['rigUp', .6], ['habitStart', 1], ['coachGo', 2]];
const ACT_LVL = { slSpin: 3, rlSpin: 7, scratchGo: 2, scrReveal: 2, itBuy: 2, itSell: 2, collection: 2, clubGo: 6, agCollect: 14, stockBuy: 25, propCollect: 22, sixPick: 4 };
const IAPW = [['x-start', 30], ['l-50', 18], ['l-280', 14], ['x-noads', 10], ['x-pass', 12], ['l-600', 6], ['x-collec', 5], ['l-1300', 3], ['x-gold', 3], ['x-magnat', 1], ['l-3500', .6]];
const priceOf = id => +String((D.IAP.find(x => x.id === id) || {}).price || '0').replace(/[^\d,]/g, '').replace(',', '.');
const hourW = [.3, .15, .08, .05, .04, .05, .15, .5, .8, .7, .7, .9, 1.4, 1.5, 1, .9, 1, 1.5, 2, 2.3, 2.6, 2.7, 2.2, 1.1];
function startHour() { return wpick(hourW.map((w, h) => [h, w])); }

// ---------------------------------------------------------------- inventaire plausible pour un niveau donné
const catLvl = c => (D.UNLOCK.cats || {})[c] || (D.ITEM_CATS[c] || {}).lvl || 1;
function buildSave(p) {
  const L = p.lvl, wealth = p.wealth, t = p.lastSeen;
  const owned = {}, items = D.ITEMS.filter(i => i.cat !== 'trophy' && catLvl(i.cat) <= L);
  const pool = items.filter(i => i.p0 <= Math.max(300, wealth * .5));
  const nOwn = Math.min(pool.length, Math.round(L * R(.6, 1.6)));
  for (let k = 0; k < nOwn; k++) { const it = pick(pool); if (!owned[it.id]) owned[it.id] = [{ paid: Math.round(it.p0 * R(.8, 1.15)), t: Math.round(R(p.created, t)) }]; }
  // trophées gagnés
  D.ITEMS.filter(i => i.cat === 'trophy').forEach(i => { if (rnd() < Math.min(.9, L / 25)) owned[i.id] = [{ paid: 0, t: Math.round(R(p.created, t)) }]; });
  const stats = { bets: Math.round(L * R(3, 14)), betsWon: 0, spins: L >= 3 ? Math.round(L * R(4, 25)) : 0, roulette: L >= 7 ? Math.round(L * R(1, 6)) : 0, scratch: Math.round(L * R(1, 6)),
    clubNights: L >= 6 ? Math.round((L - 5) * R(.2, 1.2)) : 0, boostersOpened: Math.round(L * R(.6, 2.2)), mined: Math.round(L * R(1, 4)) };
  stats.betsWon = Math.round(stats.bets * R(.3, .48)); stats.worth = Math.round(wealth);
  const ach = {}; D.ACHIEVEMENTS.forEach(a => { const v = stats[a.stat]; if (v != null && v >= a.n) ach[a.id] = Math.round(R(p.created, t)); });
  const props = {}; if (L >= 22) D.PROPS.slice(0, L >= 30 ? 3 : L >= 25 ? 2 : 1).forEach(x => { if (rnd() < .7) props[x.id] = { t: Math.round(R(p.created, t)), last: t - RI(1, 40) * H }; });
  const evItems = {}; if (p.avatar) evItems[p.avatar] = Math.round(R(p.created, t)); if (p.frame) evItems[p.frame] = Math.round(R(p.created, t));
  if (L >= 6 && rnd() < .2) evItems[pick(['dc-posts', 'dc-flags', 'dc-ball'])] = t - RI(1, 4) * DAY;
  const hold = {}; D.COINS.forEach(c => { hold[c.id] = rnd() < .5 ? +(R(0, 3) * (L + 1) * 10 / c.p0).toFixed(4) : 0; });
  return { v: 1, progV: 2, created: p.created, last: t, name: p.name, tag: p.tag, skin: p.skin, cash: p.cash, lingots: p.lingots, lvl: L, xp: p.xp,
    stats, quests: {}, owned, room: L >= 12 ? 2 : L >= 5 ? 1 : 0, rig: { lvl: Math.min(4, Math.floor(L / 6)), start: t, pending: 0 },
    crypto: { hold, cost: {}, prices: {} }, market: { prices: {} }, boosters: p.boosters, ach, props, evItems, avatar: p.avatar || undefined, frame: p.frame || undefined,
    safeLvl: L >= 13 ? Math.min(3, Math.floor((L - 10) / 8)) : 0, garageLvl: L >= 18 ? Math.min(2, Math.floor((L - 16) / 8)) : 0,
    cityLooks: ['base'].concat(L >= 10 && rnd() < .4 ? ['renov'] : []), daily: { streak: RI(0, 9) }, habits: {}, tutoDone: L > 2, sound: true };
}

// ---------------------------------------------------------------- les joueurs
const N = 412, players = [];
const archetypes = [['flash', 42], ['casual', 31], ['regular', 19], ['hardcore', 8]];
for (let i = 0; i < N; i++) {
  // installations : de plus en plus nombreuses (bouche-à-oreille) + un pic il y a 19 jours (une vidéo qui a tourné)
  let ago = rnd() < .12 ? R(18.4, 20) : 60 * Math.pow(rnd(), 1.45);
  const created = NOW - ago * DAY - RI(0, 50) * MIN;
  const arch = wpick(archetypes), name = pseudo(), g = FEM.has(lastBase) ? 'f' : NICKS.includes(lastBase) ? (rnd() < .5 ? 'm' : 'f') : 'm';
  const c = wpick(CITIES.map(x => [x, x.w])), dv = wpick(DEVICES.map(d => [d, d[2]]));
  players.push({ i, pid: (rnd().toString(36).slice(2, 8) + rnd().toString(36).slice(2, 8)).slice(0, 12), secret: rnd().toString(36).slice(2) + rnd().toString(36).slice(2),
    name, tag: String(RI(1000, 9999)), g, arch, created, geo: c, ua: dv[0], screen: pick(dv[1]) });
}
// ~15 joueurs « en ligne maintenant » : on les choisit parmi les fidèles
const pool = players.filter(p => p.arch === 'regular' || p.arch === 'hardcore' || (p.arch === 'casual' && NOW - p.created < 9 * DAY));
const liveSet = new Set(); while (liveSet.size < 15 && liveSet.size < pool.length) liveSet.add(pick(pool).pid);

const SIX_PINS = D.SIX.shop.filter(x => x.kind === 'avatar').map(x => x.id), SIX_FRAMES = D.SIX.shop.filter(x => x.kind === 'frame').map(x => x.id);
let totalEvents = 0;
for (const p of players) {
  const life = { flash: R(0, 2.5), casual: R(2, 18), regular: R(12, 70), hardcore: R(30, 90) }[p.arch];
  const pDay = { flash: .55, casual: .5, regular: .72, hardcore: .9 }[p.arch];
  const sessMed = { flash: 4, casual: 7, regular: 11, hardcore: 17 }[p.arch];
  const adsLike = rnd() < .45 ? R(.1, .9) : 0, isLive = liveSet.has(p.pid);
  const sessions = []; let d = 0;
  const lastDay = Math.floor((NOW - p.created) / DAY);
  while (d <= lastDay) {
    const age = d, decay = Math.exp(-age / Math.max(1, life));
    const active = d === 0 || rnd() < pDay * decay * (1 + .25 * ([0, 6].includes(new Date(p.created + d * DAY).getDay())));
    if (active) {
      const ns = d === 0 ? RI(1, 3) : wpick([[1, 5], [2, 3], [3, 1.5], [4, .6]]);
      for (let k = 0; k < ns; k++) {
        let start;
        if (d === 0 && k === 0) start = p.created;
        else { const base = new Date(p.created + d * DAY); base.setHours(startHour(), RI(0, 59), RI(0, 59), 0); start = base.getTime(); }
        if (start < p.created || start > NOW - 20 * MIN) continue;
        const ms = Math.max(.4, Math.exp(Math.log(sessMed) + gauss() * .75)) * MIN;
        sessions.push({ start, ms: Math.round(ms) });
      }
    }
    d++;
  }
  if (isLive) sessions.push({ start: NOW - RI(2, 35) * MIN, ms: 0, live: true });
  sessions.sort((a, b) => a.start - b.start);
  // dédoublonnage : pas deux sessions qui se chevauchent
  const S = []; sessions.forEach(s => { const last = S[S.length - 1]; if (!last || s.start > last.start + last.ms + 5 * MIN) S.push(s); });
  S.forEach(s => { if (s.live) s.ms = NOW - s.start - RI(5, 50) * 1000; });
  // progression au fil des sessions
  let mins = 0, lvl = 1; const skill = { flash: 1, casual: 1.15, regular: 1.5, hardcore: 2.4 }[p.arch] * R(.85, 1.2);
  const tag = p.pid;
  ev(tag, p.created, 'install', {}); totalEvents++;
  let iapBias = p.arch === 'hardcore' ? .09 : p.arch === 'regular' ? .03 : .004;
  const buys = [];
  for (const s of S) {
    insS.run(tag, s.start, s.start + s.ms, s.ms);
    ev(tag, s.start, 'session', { ver: '128' });
    mins += s.ms / MIN;
    const L2 = Math.min(40, lvlAt(mins * skill * R(.95, 1.05)));
    for (let l = lvl + 1; l <= L2; l++) ev(tag, s.start + s.ms * (l - lvl) / (L2 - lvl + 1), 'levelup', { lvl: l });
    lvl = Math.max(lvl, L2);
    // boutons touchés
    const nActs = Math.round(R(2, 4) * Math.sqrt(s.ms / MIN) + 1);
    for (let k = 0; k < nActs; k++) { let a = wpick(ACTS); if ((ACT_LVL[a] || 1) > lvl) a = 'bld'; ev(tag, s.start + rnd() * s.ms, 'act', { a }); }
    totalEvents += nActs;
    // pubs
    if (adsLike && rnd() < adsLike) { const na = RI(1, 3); for (let k = 0; k < na; k++) { ev(tag, s.start + rnd() * s.ms, 'act', { a: 'adClaim' }); ev(tag, s.start + rnd() * s.ms, 'ad', {}); } }
    // offres
    if (rnd() < .07 + iapBias) { const id = wpick(IAPW); ev(tag, s.start + rnd() * s.ms, 'iap_click', { id }); if (rnd() < iapBias * 1.6) { const tb = s.start + rnd() * s.ms; buys.push({ id, t: tb }); ev(tag, tb, 'iap_buy', { id, eur: priceOf(id), sim: true }); iapBias *= .7; } }
    if (rnd() < .3) ev(tag, s.start + rnd() * s.ms, 'bet', { state: rnd() < .42 ? 'won' : 'lost', stake: RI(5, 20 + lvl * 25), gain: 0 });
    if (rnd() < .06) ev(tag, s.start + rnd() * s.ms, 'achievement', { id: pick(D.ACHIEVEMENTS).id });
  }
  const last = S[S.length - 1];
  // les joueurs « en ligne » le restent 4 h (le temps de faire le tour de la démo)
  p.lastSeen = isLive ? NOW + 4 * H - RI(5, 55) * 1000 : last.start + last.ms;
  p.sessions = S.length; p.playMs = S.reduce((t, s) => t + s.ms, 0); p.lvl = lvl; p.mins = mins * skill;
  const need = D.XP_TABLE[Math.min(lvl, D.XP_TABLE.length - 1)] || 100; p.xp = lvl >= 40 ? 0 : RI(0, need - 1);
  // fortune : grossit avec le niveau, très inégale
  p.wealth = Math.round(250 * Math.pow(1.28, lvl) * Math.exp(gauss() * .7));
  p.cash = Math.round(p.wealth * R(.15, .55)); p.lingots = Math.round(5 + lvl * R(2, 8) + buys.reduce((t, b) => t + ((D.IAP.find(x => x.id === b.id) || {}).n || 120), 0) * R(.2, .8));
  p.boosters = RI(0, Math.min(12, 1 + Math.floor(lvl / 3)));
  p.skin = p.g === 'm' ? (lvl >= 9 && rnd() < .35 ? 'flambeur' : pick(['survet', 'hoodie'])) : (lvl >= 20 && rnd() < .45 ? 'boss' : pick(['doudoune', 'sportive']));
  if (buys.some(b => b.id === 'x-gold' || b.id === 'x-magnat') && D.SKINS.some(s => s.id === 'gold')) p.skin = 'gold';
  const sixActive = p.lastSeen > NOW - 4 * DAY && lvl >= 4;
  p.avatar = sixActive && rnd() < .38 ? pick(SIX_PINS) : null;
  p.frame = lvl >= 5 && rnd() < (sixActive ? .28 : .06) ? pick(SIX_FRAMES) : null;
  p.buys = buys;
  const save = buildSave(p);
  p.save = JSON.stringify(save);
  // historique de sauvegardes (les joueurs actifs)
  if (S.length > 4) { const nh = Math.min(6, Math.floor(S.length / 4)); for (let k = nh; k >= 1; k--) { const sv = S[Math.max(0, S.length - 1 - k * 3)]; const hl = Math.max(1, lvl - k); insH.run(tag, sv.start + sv.ms, hl, Math.round(p.wealth * Math.pow(.85, k)), JSON.stringify({ ...save, lvl: hl, cash: Math.round(p.cash * Math.pow(.8, k)) })); } }
}

// ---------------------------------------------------------------- comptes suspendus, notes internes
const byLvl = [...players].sort((a, b) => b.lvl - a.lvl);
const banned = [[byLvl[3], 'Triche : cash modifié à la main dans la sauvegarde.'], [pick(players), 'Insultes répétées au support.'], [pick(players.filter(p => p.arch === 'flash')), 'Compte en double pour récupérer les cadeaux de bienvenue.']];
banned.forEach(([p, why]) => { p.banned = 1; p.banReason = why; });
const notes = [[byLvl[0], 'Meilleur joueur depuis le lancement. Toujours poli, remonte des bugs utiles.'], [byLvl[1], 'A acheté le Pack Magnat. À chouchouter (bêta-testeur ?).'],
  [players.find(p => p.buys.length), 'Payeur : a eu un souci de lingots non reçus le mois dernier, réglé avec +50.'], [pick(players), 'Demande souvent des lingots gratuits au support.']];
notes.forEach(([p, n]) => { if (p) p.notes = n; });

for (const p of players) {
  const c = p.geo, jitter = () => (rnd() - .5) * .08;
  insP.run(p.pid, p.secret, p.name, p.tag, p.skin, p.lvl, p.xp, p.wealth, p.cash, p.lingots, p.boosters, p.avatar, p.frame, Math.round(p.created), Math.round(p.lastSeen), p.sessions, Math.round(p.playMs),
    p.ua, '128', p.banned || 0, p.banReason || null, p.notes || null, p.save, Math.round(p.lastSeen), c.tz, c.lang, p.screen, `82.${RI(1, 250)}.${RI(1, 250)}.${RI(1, 250)}`,
    c.country, c.cc, c.region, c.city, c.lat + jitter(), c.lon + jitter(), rnd() < .9 ? 'ip' : 'fuseau');
}

// ---------------------------------------------------------------- SAV : de vraies conversations
const TICKETS = [
  { s: "J'ai perdu toute ma partie", m: ["Bonjour, j'ai changé de téléphone et j'ai plus rien, j'étais niveau 14 !!", 'Je comprends, on regarde ça. Tu as noté ton code de récupération (Réglages → Sauvegarde) ?', "non je savais pas que ça existait..."], st: 'ouvert' },
  { s: 'Mes lingots de la pub ne sont pas arrivés', m: ["J'ai regardé 3 pubs et j'ai eu que 1 fois les lingots", "Désolé pour ça ! Je t'ai remis les lingots manquants, ils arrivent à ta prochaine connexion.", 'Merci beaucoup 🙏'], st: 'fermé', gift: { lingots: 6 } },
  { s: 'Bug au casino, la machine reste bloquée', m: ['La machine à sous tourne dans le vide et je peux plus rien faire', 'Merci du signalement ! Est-ce que ça le fait encore si tu relances le jeu ?'], st: 'en attente' },
  { s: 'Comment on débloque le Club ?', m: ['Je vois le Club mais il est fermé, il faut faire quoi ?', "Le Club ouvre au niveau 6 : continue tes missions et tu y seras très vite !"], st: 'fermé' },
  { s: "Le tournoi ne s'affiche pas", m: ['Le panneau du tournoi des 6 quartiers est gris chez moi', "Le tournoi s'ouvre au niveau 4. Tu es niveau 3, encore un petit effort !", "ah d'accord merci"], st: 'fermé' },
  { s: 'Arnaque le ticket à gratter', m: ["J'ai gratté 3 symboles pareils et j'ai rien gagné, c'est une arnaque"], st: 'ouvert' },
  { s: "J'ai acheté le pack de départ", m: ["J'ai cliqué sur le pack de départ mais il se passe rien, j'ai pas été débité ?", "Les achats ne sont pas encore ouverts : rien n'a été débité, promis. Ils arrivent avec la version App Store."], st: 'fermé' },
  { s: 'Ma créatrice est partie', m: ["Lola a quitté mon agence d'un coup, j'avais tout misé sur elle", 'Une agence rivale peut débaucher une créatrice si son moral est bas. Je t\'offre 2 boosters pour te consoler !'], st: 'en attente', gift: { boosters: 2 } },
  { s: 'Proposition', m: ['Vous pourriez ajouter un mode à plusieurs ? Pour parier contre ses potes', "Super idée, je la note pour la suite !"], st: 'fermé' },
  { s: 'Mon cash a disparu', m: ["Hier j'avais 45 000 et là j'ai 12 000, je comprends pas", "Tu avais une voiture en vente ? Je regarde ta partie et je reviens vers toi."], st: 'en attente' },
  { s: 'Le jeu rame sur mon téléphone', m: ['Ça lag beaucoup dans la ville, surtout le soir'], st: 'ouvert' },
  { s: 'Pseudo', m: ['Je peux changer mon pseudo ? Je me suis trompé'], st: 'ouvert' },
  { s: 'Merci', m: ['Juste pour dire que le jeu est trop bien, je joue tous les soirs', 'Merci, ça fait super plaisir ! Petit cadeau pour toi.'], st: 'fermé', gift: { lingots: 10 } },
  { s: 'Crypto qui baisse tout le temps', m: ['Mon Axion a perdu 40 % en une heure, c\'est normal ?', "Oui, une alerte flash peut faire plonger une crypto, puis elle remonte en partie. Attends un peu avant de vendre !"], st: 'fermé' },
  { s: 'Montre introuvable', m: ['La montre graal est jamais en vente au Comptoir', "Elle est à la Bijouterie Diamant, qui ouvre au niveau 10 !", 'Je suis niveau 12 et elle y est pas'], st: 'ouvert' },
  { s: 'Récompense du tournoi', m: ["J'ai fini 2e du tournoi et j'ai pas eu mes lingots"], st: 'ouvert' },
  { s: 'Compte suspendu ??', m: ["Pourquoi mon compte est suspendu ? J'ai rien fait"], st: 'ouvert' },
  { s: 'Booster vide', m: ["J'ai ouvert un booster et il y avait que des doublons", 'Les doublons sont revendus tout de suite, regarde ton cash : il a dû monter !', 'ah oui ok 👍'], st: 'fermé' },
  { s: 'Les notifications', m: ["Je reçois pas les notifs quand ma machine est pleine"], st: 'en attente' },
  { s: 'Achat de la supercar', m: ['La supercar coûte trop cher, impossible à avoir'], st: 'fermé' }
];
const tkPlayers = [...players].filter(p => !p.banned).sort(() => rnd() - .5);
TICKETS.forEach((T0, k) => {
  const p = k === 16 ? banned[0][0] : tkPlayers[k];
  const start = Math.min(p.lastSeen, NOW - RI(1, 7 * 24) * 20 * MIN - (T0.st === 'fermé' ? RI(1, 20) * DAY : 0));
  let t = Math.max(p.created + H, start);
  const msgs = [];
  T0.m.forEach((txt, j) => { const admin = j % 2 === 1; t += admin ? RI(4, 600) * MIN : RI(2, 180) * MIN; if (t > NOW - MIN) t = NOW - RI(1, 30) * MIN; msgs.push([t, admin ? 1 : 0, txt + (admin && T0.gift && j === T0.m.length - 1 - (T0.m.length % 2 ? 1 : 0) ? ' [cadeau : ' + Object.entries(T0.gift).map(([a, b]) => `${b} ${a}`).join(', ') + ']' : '')]); });
  const r = insT.run(p.pid, msgs[msgs.length - 1][0], msgs[0][0], T0.st, T0.s);
  msgs.forEach(m => insM.run(r.lastInsertRowid, m[0], m[1], m[2]));
  if (T0.gift) insI.run(p.pid, msgs[1][0], 'Support Biff City', T0.m[1], JSON.stringify(T0.gift), 1);
});

// ---------------------------------------------------------------- réglages en direct (comme si elle avait déjà publié)
const at = (d, h) => { const x = new Date(NOW + d * DAY); x.setHours(h, 0, 0, 0); return x.toISOString(); };
const live = {
  news: [{ id: 'n-six', title: 'Le Tournoi des 6 Quartiers est lancé !', text: 'Fais tes pronos gratuits au Panneau de la place : 3 points et 1 lingot par bon prono.', until: at(6, 23) },
    { id: 'n-v128', title: 'Nouveau : 40 niveaux', text: 'La progression passe à 40 niveaux, avec une nouveauté tous les 1 à 3 niveaux.', until: at(2, 23) }],
  nextEvent: at(33, 18), sixStart: dkey(NOW - 4 * DAY), maintenance: { on: false, text: 'Petite mise à jour en cours, on revient dans 10 minutes !' },
  seasons: D.SEASONS, promos: D.PROMOS, promoDays: D.PROMO_DAYS, ads: { ...D.ADS }, values: { 'BOOSTER.cost': 12 }
};
function dkey(t) { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
st("INSERT INTO config (k, v) VALUES ('live', ?)").run(JSON.stringify(live));
st("INSERT INTO config (k, v) VALUES ('live_at', ?)").run(String(NOW - 3 * H));

// ---------------------------------------------------------------- messages à tous, cadeaux, actions passées
const bc = [[NOW - 21 * DAY, 'Merci pour les 100 joueurs !', 'Vous êtes déjà 100 à hustler dans la ville. Voilà un petit cadeau.', { lingots: 10 }],
  [NOW - 9 * DAY, 'Désolé pour la panne de ce matin', 'Le serveur a fait une sieste. Pour se faire pardonner :', { lingots: 15, boosters: 1 }],
  [NOW - 4 * DAY - 2 * H, 'Le tournoi commence !', 'Les 6 Quartiers s\'affrontent : fais tes pronos au Panneau.', null]];
bc.forEach(([t, title, text, gift]) => {
  const tgt = players.filter(p => p.created < t);
  tgt.forEach(p => insI.run(p.pid, t, title, text, gift ? JSON.stringify(gift) : null, p.lastSeen > t ? 1 : 0));
  insL.run(t, 'broadcast', JSON.stringify({ pid: '*', title, text, gift: gift || {}, n: tgt.length }));
  tgt.filter(p => p.lastSeen > t && gift).forEach(p => ev(p.pid, Math.min(p.lastSeen, t + RI(1, 60) * H), 'gift_received', { g: Object.entries(gift).map(([a, b]) => `+${b} ${a}`).join(', ') }));
});
banned.forEach(([p, why]) => insL.run(NOW - RI(1, 15) * DAY, 'ban', JSON.stringify({ pid: p.pid, ban: true, reason: why })));
insL.run(NOW - 3 * H, 'config', JSON.stringify(live));
insL.run(NOW - 26 * H, 'gift', JSON.stringify({ pid: byLvl[1].pid, title: 'Merci !', text: 'Merci pour ton soutien.', gift: { lingots: 50 } }));
insL.run(NOW - 5 * DAY, 'restore', JSON.stringify({ pid: byLvl[8].pid }));

db.exec('COMMIT');
const c = db.prepare('SELECT (SELECT COUNT(*) FROM players) p, (SELECT COUNT(*) FROM events) e, (SELECT COUNT(*) FROM sessions) s, (SELECT COUNT(*) FROM tickets) t').get();
console.log(`Démo prête : ${DBFILE}\n  ${c.p} joueurs, ${c.s} sessions, ${c.e} événements, ${c.t} tickets SAV, ${liveSet.size} joueurs en ligne maintenant.\n  Lancer : DB=server/demo.db PORT=5301 node server/server.js  →  http://localhost:5301/admin/`);
