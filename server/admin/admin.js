/* Biff City · back office : le socle (connexion, navigation, outils communs, avatar des joueurs), le tableau de bord et la carte.
   Les autres onglets : admin-stats.js (statistiques), admin-players.js (joueurs + fiche), admin-ops.js (SAV, événements, message à tous, journal).
   Parle à server/server.js (API /admin/api/…, jeton Bearer). */
(function () {
  'use strict';
  const D = window.DATA || {}, IMG = new Set(window.ASSETS || []), AV = window.ASSET_V || 1;
  const HC = window.HC = { D, PAGES: {}, charts: [], timers: [], period: +(lsGet('hc.period') || 30) };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }

  // ------------------------------------------------------------ petits outils
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const has = n => IMG.has(n), src = n => `/assets/img/${n}.${(window.ASSETS_JPG || []).includes(n) ? 'jpg' : (window.ASSETS_WEBP || []).includes(n) ? 'webp' : 'png'}?v=${(window.ASSET_H || {})[n] || AV}`;
  const img = (n, cls = '', alt = '') => has(n) ? `<img class="${cls}" src="${src(n)}" alt="${esc(alt)}" loading="lazy">` : '';
  const first = (...names) => names.find(has) || null;
  const fmt = (n, d = 0) => n == null || isNaN(n) ? '–' : (+n).toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const short = n => { n = +n || 0; const a = Math.abs(n); return a >= 1e9 ? fmt(n / 1e9, 1) + ' Md' : a >= 1e6 ? fmt(n / 1e6, a >= 1e7 ? 1 : 2) + ' M' : a >= 1e4 ? fmt(n / 1e3, a >= 1e5 ? 0 : 1) + ' k' : fmt(n); };
  const cash = n => `${short(n)}<i class="cur"></i>`, lingots = n => `${fmt(n)}<i class="lgt"></i>`, boosters = n => `${fmt(n)}<i class="bst"></i>`;
  const eur = (n, d = 2) => (+n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = (n, d = 0) => n == null ? '–' : fmt(n, d) + ' %';
  const ago = t => { if (!t) return '–'; const s = Math.round((Date.now() - t) / 1000), m = Math.round(s / 60); return s < 60 ? 'à l\'instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : m < 1440 * 60 ? `il y a ${Math.round(m / 1440)} j` : `il y a ${Math.round(m / 43200)} mois`; };
  const dt = (t, o) => t ? new Date(t).toLocaleString('fr-FR', o || { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–';
  const day = t => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hm = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dur = ms => { const m = Math.round((ms || 0) / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
  const minTxt = m => m == null ? '–' : m < 1 ? '< 1 min' : m < 60 ? fmt(m, m < 10 ? 1 : 0) + ' min' : `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')}`;
  const flag = cc => typeof cc === 'string' && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '🌍';
  const dlabel = d => { const [y, m, dd] = d.split('-'); return `${dd}/${m}`; };
  const delta = (cur, prev, inv) => { if (prev == null || !isFinite(prev) || prev === 0) return ''; const v = (cur / prev - 1) * 100; if (Math.abs(v) < 1) return '<span class="kd flat">=</span>'; const up = v > 0; return `<span class="kd ${up !== !!inv ? 'up' : 'down'}">${up ? '▲' : '▼'} ${fmt(Math.abs(v))} %</span>`; };
  Object.assign(HC, { $, $$, esc, has, src, img, first, fmt, short, cash, lingots, boosters, eur, pct, ago, dt, day, hm, dur, minTxt, flag, dlabel, delta, lsGet, lsSet });

  // ------------------------------------------------------------ messages, fenêtres
  HC.toast = (t, icon, err) => { const el = document.createElement('div'); el.className = 'toast' + (err ? ' err' : ''); el.innerHTML = (icon ? img(icon) : '') + esc(t); $('#toasts').appendChild(el); setTimeout(() => el.remove(), 2800); };
  HC.confirm = (title, text, okLabel = 'Confirmer', cls = 'green') => new Promise(ok => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><p>${text}</p><div class="mb"><button class="btn ghost" data-r="0">Annuler</button><button class="btn ${cls}" data-r="1">${esc(okLabel)}</button></div></div>`;
    document.body.appendChild(bg); bg.onclick = e => { const b = e.target.closest('[data-r]'); if (b || e.target === bg) { bg.remove(); ok(b ? b.dataset.r === '1' : false); } };
  });
  HC.prompt = (title, text, ph = '', val = '') => new Promise(ok => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><p>${text}</p><input id="pm-in" placeholder="${esc(ph)}" value="${esc(val)}"><div class="mb"><button class="btn ghost" data-r="0">Annuler</button><button class="btn" data-r="1">Valider</button></div></div>`;
    document.body.appendChild(bg); const inp = $('#pm-in', bg); inp.focus();
    const done = r => { bg.remove(); ok(r ? inp.value : null); };
    bg.onclick = e => { const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); else if (e.target === bg) done(false); };
    inp.onkeydown = e => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); };
  });

  // ------------------------------------------------------------ serveur
  let TOKEN = lsGet('hc.admin') || '';
  HC.api = async function api(p, body) {
    const r = await fetch(p, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { showLogin('Ce jeton ne marche pas.'); throw new Error('401'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { HC.toast(j.err || 'Erreur du serveur', null, true); throw new Error(j.err || r.status); }
    return j;
  };

  // ------------------------------------------------------------ la photo de profil d'un joueur, comme dans le jeu (skin + cadre + pin's)
  const SHOP = D.EV_SHOP || (D.SIX && D.SIX.shop) || [];
  HC.skinImg = skin => { const s = (D.SKINS || []).some(x => x.id === skin) ? skin : 'survet'; return first(`skin-${s}-bust`, `skin-${s}`, 'skin-survet-bust'); };
  HC.frameOf = id => SHOP.find(x => x.id === id && x.kind === 'frame') || null;
  HC.pinOf = id => SHOP.find(x => x.id === id && x.kind === 'avatar') || null;
  HC.frameImg = fr => fr && has('frame-' + fr.id.replace('fr-', '')) ? 'frame-' + fr.id.replace('fr-', '') : null;
  HC.crest = team => { const n = 'crest-r' + ((+team || 0) + 1); if (has(n)) return `<img src="${src(n)}" alt="">`;
    const t = (D.SIX && D.SIX.teams || [])[team] || ['?', 0, '#9b5de5', '#fff', '?'];
    return `<svg viewBox="0 0 60 66"><path d="M30 3 L55 11 V33 C55 49 43 59 30 63 C17 59 5 49 5 33 V11 Z" fill="${t[2]}" stroke="#2a1a10" stroke-width="4"/><path d="M30 10 L48 16 V33 C48 45 40 52 30 56 Z" fill="${t[3]}" opacity=".85"/></svg>`; };
  // Coupe des Morts : la mascotte d'une équipe (image team-<id>), sinon son emoji sur sa couleur
  HC.cdmCrest = id => { const t = ((D.CDM && D.CDM.teams) || []).find(x => x.id === id) || { emo: '🏆', color: '#ffd23f' }, n = id === 'gold' ? 'ev-cdm-cup' : 'team-' + id;
    return has(n) ? `<img src="${src(n)}" alt="">` : `<span class="cdm-dot" style="background:${t.color}">${t.emo}</span>`; };
  HC.isOnline = p => p && (p.online || (p.last_seen && Date.now() - p.last_seen < 150000));
  HC.avatar = (p, size = 44, opt = {}) => {
    p = p || {}; const fr = HC.frameOf(p.frame), pin = HC.pinOf(p.avatar), fi = HC.frameImg(fr), ring = fr && !fi;
    return `<span class="av ${ring ? 'ring' : ''}" style="--s:${size}px;${ring ? `--f1:${fr.colors[0]};--f2:${fr.colors[1]}` : ''}" title="${esc(p.name || '')}">`
      + `<span class="av-in"><img src="${src(HC.skinImg(p.skin))}" alt="" loading="lazy"></span>`
      + (fi ? `<img class="av-fr" src="${src(fi)}" alt="">` : '')
      + (pin ? `<span class="av-pin">${pin.cdm ? HC.cdmCrest(pin.cdm) : HC.crest(pin.team)}</span>` : '')
      + (opt.online !== false && HC.isOnline(p) ? '<i class="av-on"></i>' : '') + (p.banned ? '<i class="av-ban"></i>' : '') + '</span>';
  };
  HC.who = (p, size = 40, sub) => `<span class="who">${HC.avatar(p, size)}<div><b>${esc(p.name || '(sans nom)')}</b><small>${sub != null ? sub : `#${esc(p.tag || '')}${p.city ? ' · ' + flag(p.cc) + ' ' + esc(p.city) : ''}`}</small></div></span>`;
  HC.skinName = id => ((D.SKINS || []).find(s => s.id === id) || {}).name || (id === 'gold' ? 'Gold (exclusif)' : id || '–');
  // le modèle du téléphone : exact dans l'application (code envoyé par le téléphone), sinon deviné d'après la taille d'écran
  const IPH = { '10,1': '8', '10,4': '8', '10,2': '8 Plus', '10,5': '8 Plus', '10,3': 'X', '10,6': 'X', '11,2': 'XS', '11,4': 'XS Max', '11,6': 'XS Max', '11,8': 'XR', '12,1': '11', '12,3': '11 Pro', '12,5': '11 Pro Max', '12,8': 'SE (2e gén.)',
    '13,1': '12 mini', '13,2': '12', '13,3': '12 Pro', '13,4': '12 Pro Max', '14,4': '13 mini', '14,5': '13', '14,2': '13 Pro', '14,3': '13 Pro Max', '14,6': 'SE (3e gén.)', '14,7': '14', '14,8': '14 Plus', '15,2': '14 Pro', '15,3': '14 Pro Max',
    '15,4': '15', '15,5': '15 Plus', '16,1': '15 Pro', '16,2': '15 Pro Max', '17,3': '16', '17,4': '16 Plus', '17,1': '16 Pro', '17,2': '16 Pro Max', '17,5': '16e', '18,3': '17', '18,1': '17 Pro', '18,2': '17 Pro Max', '18,4': 'Air' };
  const IPH_SCREEN = { '320x568': 'SE (1re gén.)', '375x667': '8 ou SE', '414x736': '8 Plus', '375x812': 'X, XS, 11 Pro ou 12/13 mini', '414x896': '11, XR ou 11 Pro Max', '390x844': '12, 13, 14 ou 16e', '428x926': '12/13 Pro Max ou 14 Plus',
    '393x852': '14 Pro, 15 ou 16', '430x932': '14 Pro Max, 15 Plus/Pro Max ou 16 Plus', '402x874': '16 Pro ou 17', '440x956': '16 Pro Max ou 17 Pro Max', '420x912': 'Air' };
  const SAMSUNG = { S901: 'Galaxy S22', S906: 'Galaxy S22+', S908: 'Galaxy S22 Ultra', S911: 'Galaxy S23', S916: 'Galaxy S23+', S918: 'Galaxy S23 Ultra', S921: 'Galaxy S24', S926: 'Galaxy S24+', S928: 'Galaxy S24 Ultra', S931: 'Galaxy S25', S936: 'Galaxy S25+', S938: 'Galaxy S25 Ultra',
    A145: 'Galaxy A14', A146: 'Galaxy A14', A155: 'Galaxy A15', A156: 'Galaxy A15', A256: 'Galaxy A25', A346: 'Galaxy A34', A356: 'Galaxy A35', A525: 'Galaxy A52', A526: 'Galaxy A52', A528: 'Galaxy A52s', A536: 'Galaxy A53', A546: 'Galaxy A54', A556: 'Galaxy A55', F731: 'Galaxy Z Flip5', F741: 'Galaxy Z Flip6', F946: 'Galaxy Z Fold5', F956: 'Galaxy Z Fold6' };
  HC.device = p => {
    const ua = p.platform || '', [sz, code = ''] = String(p.screen || '').split(' ');
    const ip = code.match(/^iPhone(\d+,\d+)$/); if (ip) return 'iPhone ' + (IPH[ip[1]] || code.replace('iPhone', ''));
    if (/iPad/.test(ua) || /^iPad/.test(code)) return 'iPad';
    if (/iPhone/.test(ua)) { const [w, h] = (sz || '').split('x').map(Number), k = Math.min(w, h) + 'x' + Math.max(w, h); return IPH_SCREEN[k] ? 'iPhone ' + IPH_SCREEN[k] : 'iPhone'; }
    const am = code || (ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/) || [])[1] || '';
    if (/Android/.test(ua) || code) { const sm = am.match(/SM-([A-Z]\d{3})/); if (sm) return (SAMSUNG[sm[1]] || 'Samsung ' + am); return am && am !== 'K' ? am : 'Android'; }
    return HC.platform(ua);
  };
  HC.platform = ua => { ua = ua || ''; return /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux|CrOS/.test(ua) ? 'Linux' : ua ? 'Autre' : '–'; };
  HC.offerName = id => ((D.IAP || []).find(x => x.id === id) || {}).name || id || 'Offre du moment';
  HC.offerPrice = id => ((D.IAP || []).find(x => x.id === id) || {}).price || '';

  // ------------------------------------------------------------ ce que veulent dire les boutons et les événements du jeu
  HC.ACTS = {
    bld: ['Entrer dans un lieu de la ville', 'nav-city'], phoneApp: ['Ouvrir une appli du téléphone', 'app-msg'], slSpin: ['Machine à sous', 'slot-seven'], slBet: ['Changer la mise (machine)', 'chip-25'],
    rlSpin: ['Roulette', 'roulette-hub'], rlBet: ['Miser à la roulette', 'chip-100'], bPick: ['Choisir un pari', 'app-bets'], bPlace: ['Valider un ticket de pari', 'nav-bets'], bStake: ['Changer la mise d\'un pari', 'chip-10'],
    scratchGo: ['Acheter un ticket à gratter', 'tk-flash'], scrReveal: ['Gratter un ticket', 'ticket-flash'], mineHarvest: ['Récolter le minage', 'rig-2'], mineStart: ['Lancer un minage', 'rig-1'], mineCool: ['Refroidir la machine', 'rigv-1'],
    boosterOpen: ['Ouvrir un booster', 'booster-pack'], boosterBuy: ['Acheter un booster', 'booster-pack'], kBooster: ['Booster au Kiosque', 'booster-pack'], itBuy: ['Acheter un objet', 'cat-sneaker'], itSell: ['Revendre un objet', 'icon-cash'], itemInfo: ['Regarder un objet', 'cat-watch'],
    pc: ['Allumer le PC', 'pc-1'], claimQuest: ['Valider une mission', 'app-missions'], claimDaily: ['Cadeau du jour', 'hdr-daily'], kTip: ['Acheter un tuyau', 'tip-sport'], collection: ['Ouvrir le classeur', 'app-binder'],
    sixPick: ['Prono du tournoi', 'bld-six'], profile: ['Voir son profil', 'icon-star'], clubGo: ['Entrer au Club', 'bld-club'], clubSpot: ['Coin du Club', 'ic-club-dance'], agCollect: ['Encaisser PrivéFans', 'app-agence'], agence: ['Ouvrir PrivéFans', 'app-agence'],
    upgrades: ['Ouvrir les améliorations', 'btn-upgrade'], adWatch: ['Lancer une pub', 'bonus-lingots'], adClaim: ['Récompense de pub', 'bonus-lingots'], iapSoon: ['Cliquer sur une offre payante', 'icon-treasure'], evBuy: ['Achat boutique de l\'événement', 'bld-six'],
    stockBuy: ['Acheter des actions', 'bld-tour'], propCollect: ['Encaisser un loyer', 'app-immo'], propBuy: ['Acheter un bien', 'app-immo'], rigUp: ['Améliorer la machine', 'rig-3'], habitStart: ['Prendre une habitude', 'hab-drink'], coachGo: ['Suivre un conseil de Momo', 'btn-momo'],
    roomUp: ['Déménager', 'bld-appart'], lookBuy: ['Acheter un look', 'skin-flambeur-bust'], crBuy: ['Acheter de la crypto', 'app-crypto'], crSell: ['Vendre de la crypto', 'app-crypto'], goPlace: ['Prendre le bus', 'ic-bus'], supportSend: ['Écrire au support', 'app-msg']
  };
  HC.actLabel = a => (HC.ACTS[a] || [a || '?'])[0];
  HC.actIcon = a => (HC.ACTS[a] || [])[1] || 'icon-bolt';
  const ACH = Object.fromEntries((D.ACHIEVEMENTS || []).map(a => [a.id, a.name]));
  HC.evDesc = (e, withName = true) => {
    let d = {}; try { d = typeof e.data === 'string' ? JSON.parse(e.data || '{}') : (e.data || {}); } catch (x) {}
    const n = withName ? `<b>${esc(e.name || 'Un joueur')}</b> ` : '';
    switch (e.type) {
      case 'install': return { i: 'ev-boost', t: `${n}a installé le jeu`, c: 'pink' };
      case 'session': return { i: 'icon-bolt', t: `${n}a ouvert le jeu` };
      case 'levelup': return { i: 'hdr-levelup', t: `${n}est passé au <b>niveau ${esc(d.lvl)}</b>` };
      case 'achievement': return { i: 'icon-trophy', t: `${n}a gagné le succès <b>« ${esc(ACH[d.id] || d.id)} »</b>` };
      case 'trophy': return { i: 'cat-trophy', t: `${n}a gagné un trophée` };
      case 'iap_click': return { i: 'icon-treasure', t: `${n}a regardé l'offre <b>${esc(HC.offerName(d.id))}</b>` };
      case 'iap_buy': return { i: 'icon-cash', t: `${n}a acheté <b>${esc(HC.offerName(d.id))}</b> (${eur(d.eur || 0)})${d.sim ? ' <span class="tag warn">simulé</span>' : ''}`, c: 'green' };
      case 'ad': return { i: 'bonus-lingots', t: `${n}a regardé une pub` };
      case 'gift_received': return { i: 'icon-gift', t: `${n}a reçu son cadeau ${esc(d.g || '')}` };
      case 'bet': return { i: 'app-bets', t: `${n}${d.state === 'won' ? 'a gagné' : 'a perdu'} un pari de ${cash(d.stake || 0)}` };
      case 'act': return { i: HC.actIcon(d.a), t: `${n}${esc(HC.actLabel(d.a).toLowerCase())}` };
      default: return { i: 'icon-star', t: `${n}${esc(e.type)}` };
    }
  };

  // ------------------------------------------------------------ graphiques (Chart.js, thème sombre)
  if (window.Chart) {
    Chart.defaults.color = '#a99fc9'; Chart.defaults.font.family = "'Nunito', system-ui, sans-serif"; Chart.defaults.font.weight = 700; Chart.defaults.font.size = 12;
    Chart.defaults.borderColor = 'rgba(255,255,255,.06)'; Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.plugins.legend.labels.boxHeight = 10; Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Object.assign(Chart.defaults.plugins.tooltip, { backgroundColor: '#fffdf6', titleColor: '#2a1a10', bodyColor: '#2a1a10', borderColor: '#2a1a10', borderWidth: 2, cornerRadius: 12, padding: 10, titleFont: { family: "'Lilita One'", size: 14, weight: 400 }, bodyFont: { weight: 800 }, boxPadding: 4 });
    Chart.defaults.animation.duration = 700;
  }
  HC.COL = { yellow: '#ffd23f', green: '#3ddc84', pink: '#ff3cac', blue: '#4fb3f0', purple: '#9b5de5', orange: '#ff8a3d', red: '#ff4d5e', cyan: '#33e1d6', cream: '#fff4dc' };
  HC.PALETTE = ['#ffd23f', '#ff3cac', '#4fb3f0', '#3ddc84', '#9b5de5', '#ff8a3d', '#33e1d6', '#ff4d5e', '#c9a4ff', '#fff4dc'];
  const grad = (ctx, c) => { const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height || 240); g.addColorStop(0, c + '66'); g.addColorStop(1, c + '00'); return g; };
  HC.chart = (id, cfg) => { const el = document.getElementById(id); if (!el || !window.Chart) return null; const ch = new Chart(el, cfg); HC.charts.push(ch); return ch; };
  HC.line = (id, labels, sets, opt = {}) => HC.chart(id, { type: 'line', data: { labels, datasets: sets.map(s => ({ tension: .35, borderWidth: 3, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: s.color, pointHoverBorderColor: '#2a1a10', pointHoverBorderWidth: 2,
    borderColor: s.color, fill: s.fill !== false, backgroundColor: c => s.fill === false ? s.color : grad(c.chart.ctx, s.color), yAxisID: s.y || 'y', ...s })) },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: sets.length > 1, position: 'top', align: 'end' } },
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } }, y: { beginAtZero: true, ticks: { precision: 0, ...(opt.yfmt ? { callback: opt.yfmt } : {}) }, grid: { color: 'rgba(255,255,255,.05)' } } }, ...opt.options } });
  HC.bars = (id, labels, sets, opt = {}) => HC.chart(id, { type: 'bar', data: { labels, datasets: sets.map(s => ({ backgroundColor: s.color, borderColor: '#2a1a10', borderWidth: opt.border === false ? 0 : 1.5, borderRadius: 6, borderSkipped: false, maxBarThickness: 34, ...s })) },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: opt.horizontal ? 'y' : 'x', interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: sets.length > 1, position: 'top', align: 'end' } },
      scales: { x: { stacked: !!opt.stacked, grid: { display: !!opt.horizontal, color: 'rgba(255,255,255,.05)' }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: opt.horizontal ? 6 : 12 } }, y: { stacked: !!opt.stacked, beginAtZero: true, grid: { display: !opt.horizontal, color: 'rgba(255,255,255,.05)' }, ticks: { precision: 0, ...(opt.yfmt ? { callback: opt.yfmt } : {}) } } }, ...opt.options } });
  HC.donut = (id, labels, data, colors, opt = {}) => HC.chart(id, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: colors || HC.PALETTE, borderColor: '#221a3f', borderWidth: 3, hoverOffset: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: opt.legend || 'right', labels: { padding: 12, font: { size: 12.5, weight: 800 } } } } } });
  // barres horizontales en HTML (avec icônes du jeu)
  HC.hbars = (rows, o = {}) => { const max = Math.max(1, ...rows.map(r => r.n)); return rows.length ? rows.map(r => `<div class="hb" ${r.click ? `data-go="${r.click}" style="cursor:pointer"` : ''}><span class="hl">${r.icon || ''}<span title="${esc(r.plain || '')}">${r.label}</span></span><span class="bar"><i style="width:${Math.max(2, r.n / max * 100)}%;${r.color || o.color ? `--bc:${r.color || o.color}` : ''}"></i></span><em>${r.v != null ? r.v : fmt(r.n)}${r.sub ? `<small>${r.sub}</small>` : ''}</em></div>`).join('') : HC.empty('Pas encore de données.'); };
  HC.empty = (t, icon = 'guide') => `<div class="empty">${icon ? img(icon) : ''}${t}</div>`;   // icon = null : le texte seul
  HC.loading = () => `<div class="loading">${img('guide')}</div>`;
  HC.kpi = (icon, value, label, o = {}) => `<div class="kpi ${o.cls || ''} ${o.go ? 'click' : ''}" style="--kc:${o.color || 'var(--yellow)'}" ${o.go ? `data-go="${o.go}"` : ''} ${o.title ? `title="${esc(o.title)}"` : ''}><div class="ki">${o.html || img(icon)}</div><div style="min-width:0"><div class="kv">${value}${o.delta || ''}</div><div class="kl">${label}</div></div></div>`;
  HC.secTitle = (icon, t, sub, id) => `<div class="sec-title" ${id ? `id="${id}"` : ''}>${img(icon)}<h2>${t}</h2>${sub ? `<small>${sub}</small>` : ''}</div>`;
  HC.periodChips = () => `<div class="chips">${[7, 30, 90].map(d => `<button class="chip ${HC.period === d ? 'on' : ''}" data-period="${d}">${d} jours</button>`).join('')}</div>`;

  // ------------------------------------------------------------ navigation
  const NAV = [
    { id: 'dash', label: 'Tableau de bord', icon: 'nav-trading' },
    { id: 'map', label: 'Carte des joueurs', icon: 'nav-city' },
    { id: 'stats', label: 'Statistiques', icon: 'app-crypto' },
    { id: 'players', label: 'Joueurs', icon: 'skin-hoodie-bust', round: true },
    { id: 'support', label: 'SAV et avis bêta', icon: 'app-msg', badge: 'nb-sav' },
    { id: 'promos', label: 'Promos', icon: 'ic-promo' },
    { id: 'items', label: 'Objets du jeu', icon: 'app-objets' },
    { id: 'live', label: 'Événements et nouveautés', icon: 'bld-six' },
    { id: 'broadcast', label: 'Message à tous', icon: 'gift-big' },
    { id: 'notifs', label: 'Notifications', icon: 'app-msg' },
    { id: 'logs', label: 'Journal', icon: 'hdr-missions' }
  ];
  const PARENT = { player: 'players' };
  $('#nav').innerHTML = NAV.map(n => `<button data-go="${n.id}"><span class="ni">${n.round ? `<img src="${src(n.icon)}" alt="" style="border-radius:50%;object-fit:cover;object-position:50% 10%;background:radial-gradient(circle at 50% 35%,#ffe9f6,#c9a4ff);border:2px solid #2a1a10;width:28px;height:28px">` : img(n.icon)}</span><span>${n.label}</span>${n.badge ? `<i class="badge" id="${n.badge}"></i>` : ''}</button>`).join('');
  const params = () => new URLSearchParams(location.hash.slice(1));
  HC.go = (page, extra = {}) => { const p = new URLSearchParams({ page, ...extra }); const h = '#' + p.toString(); if (location.hash === h) route(); else location.hash = h; };
  HC.params = params;
  document.addEventListener('click', e => {
    const per = e.target.closest('[data-period]'); if (per) { HC.period = +per.dataset.period; lsSet('hc.period', HC.period); route(); return; }
    const g = e.target.closest('[data-go]'); if (g && !e.target.closest('a')) { const [pg, k, v] = g.dataset.go.split(':'); $('#app').classList.remove('menu'); HC.go(pg, k ? { [k]: v } : {}); return; }
    const pl = e.target.closest('[data-pid]'); if (pl && !e.target.closest('button:not([data-pid]), input, textarea, select')) { HC.go('player', { pid: pl.dataset.pid }); }
  });
  $('#burger').onclick = () => $('#app').classList.toggle('menu');
  $('#app').addEventListener('click', e => { if (e.target === $('#app') && $('#app').classList.contains('menu')) $('#app').classList.remove('menu'); });
  let current = '';
  async function route() {
    const p = params(), page = HC.PAGES[p.get('page')] ? p.get('page') : 'dash';
    HC.charts.forEach(c => { try { c.destroy(); } catch (e) {} }); HC.charts = [];
    HC.timers.forEach(clearInterval); HC.timers = []; HC.onLive = null;
    if (HC.cleanup) { try { HC.cleanup(); } catch (e) {} HC.cleanup = null; }
    const nav = PARENT[page] || page;
    $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === nav));
    $('#tb-t').textContent = (NAV.find(n => n.id === nav) || {}).label || '';
    if (current !== page + location.hash) window.scrollTo(0, 0); current = page + location.hash;
    $('#main').innerHTML = HC.loading();
    try { await HC.PAGES[page](p); } catch (e) { if (e.message !== '401') { console.error(e); $('#main').innerHTML = HC.empty('Oups, cette page n\'a pas pu se charger : ' + esc(e.message)); } }
  }
  HC.route = route;
  // pastille du SAV : nombre de conversations qui attendent une réponse
  const savBadge = () => HC.api('/admin/api/tickets?status=ouvert&q=').then(r => { const b = document.getElementById('nb-sav'); if (b) { const n = (r.list || []).length; b.textContent = n || ''; b.style.display = n ? '' : 'none'; } }).catch(() => {});
  setTimeout(savBadge, 1500); setInterval(savBadge, 60000);
  window.addEventListener('hashchange', route);
  HC.main = html => { $('#main').innerHTML = html; };

  // ------------------------------------------------------------ en direct : compteur « en ligne » + badge SAV (toutes les 20 s)
  async function pollLive() {
    if (!TOKEN || $('#app').classList.contains('hidden')) return;
    try { const L = await HC.api('/admin/api/live'); HC.live = L; $('#live-n').textContent = L.online.length; $('#live-n2').textContent = L.online.length;  if (HC.onLive) HC.onLive(L); } catch (e) {}
  }
  setInterval(pollLive, 20000);

  // ------------------------------------------------------------ connexion
  function showLogin(err) { $('#login').classList.remove('hidden'); $('#app').classList.add('hidden'); $('#tok-err').textContent = err || ''; setTimeout(() => $('#tok').focus(), 50); }
  async function enter() { $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); await pollLive(); route(); }
  $('#lg-form').onsubmit = async e => { e.preventDefault(); TOKEN = $('#tok').value.trim(); if (!TOKEN) return; lsSet('hc.admin', TOKEN); try { await HC.api('/admin/api/config'); enter(); } catch (x) {} };
  $('#logout').onclick = () => { lsSet('hc.admin', null); TOKEN = ''; showLogin(); };
  // jeton passé dans l'adresse (#token=…) : on le garde puis on l'efface de l'adresse
  { const p = params(); if (p.get('token')) { TOKEN = p.get('token'); lsSet('hc.admin', TOKEN); p.delete('token'); history.replaceState(null, '', location.pathname + (p.toString() ? '#' + p.toString() : '')); } }

  // ================================================================== TABLEAU DE BORD
  HC.PAGES.dash = async () => {
    const [o, L] = await Promise.all([HC.api('/admin/api/overview?days=' + HC.period), HC.api('/admin/api/live')]);
    const k = o.kpi, s = o.series, pv = o.prev, hello = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';
    HC.main(`<div class="page-head"><div><h1>${hello} patronne !</h1><div class="sub">Ce qui se passe dans Biff City, en un coup d'œil · ${HC.period} derniers jours</div></div><div class="tools">${HC.periodChips()}<button class="btn sm ghost" data-go="dash">Actualiser</button></div></div>
      <div class="kpis k4">
        ${HC.kpi(null, `<span id="k-on">${fmt(L.online.length)}</span>`, 'joueurs en ligne maintenant', { cls: 'live', color: 'var(--green)', html: '<span class="dot" style="width:16px;height:16px"></span>', go: 'map' })}
        ${HC.kpi('icon-bolt', fmt(k.dau), 'joueurs aujourd\'hui', { color: 'var(--yellow)', delta: delta(k.dau, pv.avgDau), title: 'Comparé à la moyenne par jour de la période précédente' })}
        ${HC.kpi('nav-city', fmt(k.wau), 'joueurs sur 7 jours', { color: 'var(--blue)' })}
        ${HC.kpi('app-missions', fmt(k.mau), 'joueurs sur 30 jours', { color: 'var(--purple)' })}
        ${HC.kpi('ev-boost', fmt(k.installs), `nouveaux joueurs (${o.days} j)`, { color: 'var(--pink)', delta: delta(k.installs, pv.installs) })}
        ${HC.kpi('hdr-levelup', pct(o.retention[1]), 'reviennent le lendemain', { color: 'var(--green)', title: 'Rétention J1 : part des nouveaux joueurs qui rejouent le jour suivant leur installation' })}
        ${HC.kpi('ev-xp', minTxt(k.avgSessMin), 'par partie en moyenne', { color: 'var(--orange)', delta: delta(k.avgSessMin, pv.avgSessMin) })}
        ${HC.kpi('icon-treasure', eur(o.money.total, 0), `revenu estimé (${o.days} j)`, { color: 'var(--yellow)', delta: delta(o.money.revenue, pv.revenue), title: 'Achats simulés + pubs vues (estimation)' })}
      </div>
      <div class="dash-top">
        <div class="card"><div class="card-h">${img('app-crypto')}Joueurs actifs chaque jour<small>barres roses : nouveaux joueurs</small></div><div class="chart lg"><canvas id="c-dau"></canvas></div></div>
        <div class="card now-card"><div class="card-h"><span class="dot"></span>En ce moment<small>mis à jour toutes les 20 s</small></div>
          <div class="now-big"><b id="now-n">${L.online.length}</b><span>joueurs dans la ville<br><small id="now-sub"></small></span></div>
          <div class="av-cloud" id="now-av"></div></div>
      </div>
      <div class="grid g3" style="margin-top:16px">
        <div class="card"><div class="card-h">${img('nav-city')}D'où ils jouent<small><a href="#page=map">voir la carte</a></small></div><div class="mini-map" id="mini-map"></div></div>
        <div class="card"><div class="card-h">${img('icon-gift')}Ce qui vient de se passer</div><div class="feed" id="feed"></div></div>
        <div class="card"><div class="card-h">${img('icon-cash')}Les plus riches<small>patrimoine</small></div><div id="top-rich">${o.economy.top.slice(0, 6).map((p, i) => `<div class="feed-row" data-pid="${esc(p.pid)}"><span class="lvl" style="background:${['#ffd23f', '#c9c9d6', '#e0915a'][i] || 'var(--purple)'};color:${i < 3 ? '#2a1a10' : '#fff'}">${i + 1}</span>${HC.who(p, 38, `Niveau ${esc(p.lvl)} · ${esc(HC.skinName(p.skin))}`)}<span class="num" style="margin-left:auto">${cash(p.worth)}</span></div>`).join('')}</div></div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-h">${img('icon-bolt')}Ce qu'ils font le plus<small>${o.days} derniers jours</small></div>${HC.hbars(o.acts.slice(0, 8).map(a => ({ label: esc(HC.actLabel(a.a)), icon: img(HC.actIcon(a.a)), n: a.n, sub: `${fmt(a.u)} joueurs` })))}</div>
        <div class="card"><div class="card-h">${img('icon-treasure')}Argent gagné par jour<small>estimation : achats + pubs</small></div><div class="chart"><canvas id="c-rev"></canvas></div></div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-h">${img('hdr-levelup')}Jusqu'où ils montent<small><a href="#page=stats&s=progression">détails</a></small></div>${funnelHtml(o.funnel)}</div>
        <div class="card" id="lp-card"><div class="card-h">${img('nav-city')}La vitrine biffcity.fr<small>visites et clics vers la bêta</small></div><p class="muted">Chargement…</p></div>
      </div>`);
    // vitrine : visites, part mobile, clics « Jouer à la bêta », d'où viennent les visiteurs (TikTok, Instagram…)
    HC.api('/admin/api/lp?days=' + HC.period).then(L => { const c = document.getElementById('lp-card'); if (!c) return; const pc = (a, b) => b ? Math.round(a / b * 100) + ' %' : '—';
      c.innerHTML = `<div class="card-h">${img('nav-city')}La vitrine biffcity.fr<small>${L.days} derniers jours</small></div>
        <div class="kpis k4" style="margin:6px 0 10px">${HC.kpi(null, fmt(L.views), 'visites')}${HC.kpi(null, fmt(L.beta), 'clics « Jouer »')}${HC.kpi(null, pc(L.beta, L.views), 'des visiteurs cliquent')}${HC.kpi(null, pc(L.mobile, L.views), 'sur téléphone')}</div>
        ${L.sources.length ? `<table class="tbl"><tr><th>Provenance</th><th>Visites</th><th>Clics</th></tr>${L.sources.map(r => `<tr><td>${esc(r.s)}</td><td>${fmt(r.views)}</td><td>${fmt(r.beta)}</td></tr>`).join('')}</table>` : '<p class="muted">Aucune visite pour l\'instant.</p>'}`; }).catch(() => {});
    const lab = s.map(x => dlabel(x.d));
    const ch = HC.chart('c-dau', { type: 'bar', data: { labels: lab, datasets: [
      { type: 'line', label: 'Joueurs actifs', data: s.map(x => x.dau), borderColor: HC.COL.yellow, borderWidth: 3, tension: .35, pointRadius: 0, pointHoverRadius: 5, fill: true, backgroundColor: c => grad(c.chart.ctx, HC.COL.yellow), order: 1 },
      { type: 'line', label: 'Sur 7 jours', data: s.map(x => x.wau), borderColor: HC.COL.blue, borderWidth: 2, borderDash: [5, 4], tension: .35, pointRadius: 0, fill: false, yAxisID: 'y', hidden: true },
      { type: 'bar', label: 'Nouveaux', data: s.map(x => x.installs), backgroundColor: HC.COL.pink, borderRadius: 5, maxBarThickness: 18, order: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', align: 'end' } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    void ch;
    HC.bars('c-rev', lab, [{ label: 'Achats', data: s.map(x => x.revenue), color: HC.COL.green }, { label: 'Pubs', data: s.map(x => x.adRevenue), color: HC.COL.blue }], { stacked: true, yfmt: v => v + ' €' });
    const drawNow = L2 => {
      $('#now-n').textContent = L2.online.length; $('#k-on').textContent = L2.online.length;
      const cities = new Set(L2.online.map(p => p.city).filter(Boolean)); $('#now-sub').textContent = cities.size ? `dans ${cities.size} ville${cities.size > 1 ? 's' : ''}` : '';
      $('#now-av').innerHTML = L2.online.length ? L2.online.slice(0, 24).map(p => `<div class="who-mini" data-pid="${esc(p.pid)}">${HC.avatar(p, 50)}<small>${esc(p.name)}</small><span class="c">niv. ${esc(p.lvl || 1)}${p.city ? ' · ' + esc(p.city) : ''}</span></div>`).join('') : HC.empty('Personne en ce moment.', 'guide');
      const prevTop = $('#feed').dataset.t || 0;
      $('#feed').innerHTML = L2.feed.slice(0, 30).map(e => { const x = HC.evDesc(e); return `<div class="feed-row ${prevTop && e.t > prevTop ? 'new' : ''}" data-pid="${esc(e.pid)}"><span class="fi">${img(x.i)}</span><span class="ft">${x.t}</span><time>${ago(e.t)}</time></div>`; }).join('') || HC.empty('Rien pour l\'instant.');
      $('#feed').dataset.t = L2.feed[0] ? L2.feed[0].t : 0;
    };
    drawNow(L); HC.onLive = drawNow;
    HC.miniMap('mini-map');
  };
  function funnelHtml(F) {
    const top = F[0] ? F[0].n : 0;
    return `<div class="funnel">${F.map((f, i) => `<div class="fn-row"><span class="fl">${i === 0 ? 'Tous' : 'Niv. ' + f.lvl}</span><span class="fb"><i style="width:${top ? Math.max(1, f.n / top * 100) : 0}%"></i><span>${fmt(f.n)}</span></span><span class="fp">${top ? fmt(f.n / top * 100, f.n / top < .1 ? 1 : 0) : 0} %<small class="mut">${i ? (F[i - 1].n ? '−' + fmt(100 - f.n / F[i - 1].n * 100) + ' % vs avant' : '') : 'des joueurs'}</small></span></div>`).join('')}</div>`;
  }
  HC.funnelHtml = funnelHtml;

  // ================================================================== CARTE
  // fond de carte sombre gratuit et sans clé (Esri « Dark Gray Canvas ») + noms des villes par-dessus
  const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', ATTR = 'Fond de carte &copy; Esri, HERE, Garmin, &copy; OpenStreetMap';
  const tiles = (map, labels) => { L.tileLayer(TILES, { maxZoom: 16, attribution: ATTR }).addTo(map); if (labels) L.tileLayer(LABELS, { maxZoom: 16, pane: 'overlayPane', opacity: .8 }).addTo(map); };
  const FR_BOUNDS = [[41.2, -5.3], [51.3, 9.8]];
  function cityIcon(pt, k = 1) {
    const sz = Math.round((22 + Math.min(40, Math.sqrt(pt.n) * 6)) * k);
    return L.divIcon({ className: '', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], html: `<div class="mk ${pt.online ? 'on' : ''}" style="font-size:${Math.max(12, sz / 2.6)}px">${+pt.n || 0}</div>` });
  }
  function popupHtml(pt) {
    return `<b class="pc">${flag(pt.cc)} ${esc(pt.city || '?')}</b><small>${esc(pt.country || '')}</small><div style="margin-top:6px;font-weight:800">${fmt(pt.n)} joueur${pt.n > 1 ? 's' : ''}${pt.online ? ` · <span style="color:#1f9d55">${fmt(pt.online)} en ligne</span>` : ''}<br>${fmt(pt.active7)} actifs cette semaine · ${fmt(pt.new7)} nouveaux</div><small>${pt.names.map(esc).join(', ')}${pt.n > pt.names.length ? '…' : ''}</small>`;
  }
  async function drawMap(map, layer, avLayer, data, withAvatars, k) {
    layer.clearLayers(); avLayer.clearLayers();
    data.points.forEach(pt => L.marker([pt.lat, pt.lon], { icon: cityIcon(pt, k), zIndexOffset: pt.online ? 500 : pt.n }).bindPopup(popupHtml(pt)).addTo(layer));
    if (withAvatars) data.online.forEach((p, i) => {
      const a = (i * 137.5) * Math.PI / 180, r = .05 + (i % 3) * .02;
      L.marker([p.lat + Math.sin(a) * r, p.lon + Math.cos(a) * r * 1.4], { zIndexOffset: 1000, icon: L.divIcon({ className: 'mk-av', iconSize: [40, 40], iconAnchor: [20, 20], html: HC.avatar({ ...p, online: true }, 40) }) })
        .bindPopup(`<b class="pc">${esc(p.name)}</b><small>#${esc(p.tag)} · niveau ${esc(p.lvl || 1)} · ${esc(p.city || '')}</small><div style="margin-top:6px"><a href="#page=player&pid=${encodeURIComponent(p.pid)}" style="color:#9b5de5;font-weight:900">Voir sa fiche →</a></div>`).addTo(avLayer);
    });
  }
  HC.miniMap = async id => {
    const el = document.getElementById(id); if (!el || !window.L) { if (el) el.innerHTML = HC.empty('Carte indisponible (pas d\'internet ?)'); return; }
    const data = await HC.api('/admin/api/map');
    const map = L.map(el, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile }).fitBounds(FR_BOUNDS);
    tiles(map, false);
    const layer = L.layerGroup().addTo(map), av = L.layerGroup().addTo(map); drawMap(map, layer, av, data, false, .62);
    HC.cleanup = () => map.remove();
  };
  HC.PAGES.map = async () => {
    const data = await HC.api('/admin/api/map');
    HC.main(`<div class="page-head"><div><h1>Carte des joueurs</h1><div class="sub">D'où viennent les joueurs. Les points verts qui pulsent : quelqu'un joue en ce moment.</div></div>
        <div class="tools"><label class="chip" style="cursor:pointer" title="Affiche sur la carte l’avatar de chaque joueur en train de jouer, à l’endroit où il se trouve"><input type="checkbox" id="m-av" checked style="width:15px;height:15px"> Avatars de ceux qui jouent en ce moment</label><button class="btn sm ghost" id="m-fr">France</button><button class="btn sm ghost" id="m-world">Monde</button></div></div>
      <div class="map-wrap"><div style="position:relative"><div id="bigmap"></div><div class="map-legend"><span><i style="background:#9b5de5"></i>joueurs d'une ville</span><span><i style="background:#3ddc84"></i>quelqu'un joue maintenant</span></div></div>
        <div class="map-side">
          <div class="card now-card"><div class="card-h"><span class="dot"></span>En ligne maintenant<small id="m-n"></small></div><div id="m-online" style="max-height:300px;overflow-y:auto"></div></div>
          <div class="card" style="flex:1"><div class="card-h">${img('nav-city')}Pays<small>${fmt(data.total)} joueurs</small></div><div id="m-ctry"></div>
            ${data.unknown ? `<p class="help" style="margin-top:10px">${fmt(data.unknown)} joueur${data.unknown > 1 ? 's' : ''} pas encore localisé${data.unknown > 1 ? 's' : ''} (ils le seront à leur prochaine connexion).</p>` : ''}</div>
        </div></div>`);
    if (!window.L) { $('#bigmap').innerHTML = HC.empty('La carte a besoin d\'internet pour s\'afficher.'); return; }
    const map = L.map('bigmap', { zoomControl: true, worldCopyJump: true }).fitBounds(FR_BOUNDS);
    tiles(map, true);
    const layer = L.layerGroup().addTo(map), avl = L.layerGroup().addTo(map);
    let D2 = data;
    const side = d => {
      $('#m-n').textContent = d.online.length + ' joueur' + (d.online.length > 1 ? 's' : '');
      $('#m-online').innerHTML = d.online.length ? d.online.map(p => `<div class="feed-row" data-pid="${esc(p.pid)}">${HC.who({ ...p, online: true }, 38, `Niveau ${esc(p.lvl || 1)} · ${flag(p.cc)} ${esc(p.city || '?')}`)}<time>${ago(p.last_seen)}</time></div>`).join('') : HC.empty('Personne en ce moment.');
      $('#m-ctry').innerHTML = d.countries.map(c => `<div class="ctry" data-cc="${esc(c.cc)}"><span class="flag">${flag(c.cc)}</span><b>${esc(c.country)}</b>${c.online ? `<span class="tag ok">${fmt(c.online)} en ligne</span>` : ''}<em>${fmt(c.n)}</em></div>`).join('');
      $$('#m-ctry .ctry').forEach(el => el.onclick = () => { const pts = d.points.filter(p => p.cc === el.dataset.cc); if (pts.length) map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lon])).pad(.4), { maxZoom: 9 }); });
    };
    const draw = () => { drawMap(map, layer, avl, D2, $('#m-av').checked); side(D2); };
    draw();
    $('#m-av').onchange = draw;
    $('#m-fr').onclick = () => map.fitBounds(FR_BOUNDS); $('#m-world').onclick = () => map.setView([30, 5], 2);
    HC.timers.push(setInterval(async () => { try { D2 = await HC.api('/admin/api/map'); draw(); } catch (e) {} }, 30000));
    HC.cleanup = () => map.remove();
  };

  // ------------------------------------------------------------ démarrage (après le chargement des autres fichiers)
  window.addEventListener('DOMContentLoaded', () => { if (!TOKEN) showLogin(); else HC.api('/admin/api/config').then(enter).catch(() => {}); });
})();
