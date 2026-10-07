/* Hustle City : interface (HUD, ville, appart, fenêtres) */
(function () {
  'use strict';
  const D = window.DATA, G = window.GAME;
  const $ = s => document.querySelector(s);
  const IMG = new Set(window.ASSETS || []);
  const st = () => G.st;

  // ------------------------------------------------------------ formats
  const CUR = '<i class="cur"></i>';
  function eur(n, dec, plain) {
    const a = Math.abs(n);
    const d = dec != null ? dec : a < 10 && a % 1 ? 2 : 0;
    return (n < 0 ? '−' : '') + a.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) + (plain ? '' : CUR);
  }
  function short(n, plain) {
    const a = Math.abs(n), s = n < 0 ? '−' : '', c = plain ? '' : CUR;
    if (a >= 1e6) return s + (a / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M' + c;
    if (a >= 1e4) return s + (a / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k' + c;
    return eur(n, null, plain);
  }
  function coinPx(p, plain) {
    const d = p >= 1000 ? 0 : p >= 1 ? 2 : p >= .01 ? 4 : 6;
    return p.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) + (plain ? '' : CUR);
  }
  function pct(a, b) { if (!b) return ''; const v = (a / b - 1) * 100; return `<span class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1).replace('.', ',')} %</span>`; }
  function mmss(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`; }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ------------------------------------------------------------ images (repli emoji tant que le visuel n'existe pas)
  const EMO = { 'bld-parking': '🅿️',
    cash: '💵', lingot: '🪙', gear: '⚙️', wallet: '💼', chart: '📈', dice: '🎲', ticket: '🎟️', trophy: '🏆', home: '🏠', city: '🏙️', lock: '🔒', check: '✅', star: '⭐', gift: '🎁',
    'ic-ev-cdm': '🎃', 'bld-appart': '🏢', 'bld-balto': '🍺', 'bld-casino': '🎰', 'bld-shop': '🛍️', 'bld-club': '🎉', 'bld-kiosque': '📰', 'bld-bijou': '💍', 'bld-garage': '🏎️', 'bld-tour': '🏙️',
    pc: '🖥️', trading: '📈', shop: '🛍️', bolt: '⚡', rig: '🧰', bed: '🛏️', foot: '⚽', basket: '🏀', tennis: '🎾', slot: '🎰', roulette: '🎡', scratch: '🎟️', guide: '🧢'
  };
  const ICON_FILE = { cash: 'icon-cash', lingot: 'icon-lingot', gear: 'icon-gear', trophy: 'icon-trophy', lock: 'icon-lock', check: 'icon-check', star: 'icon-star', gift: 'icon-gift', wallet: 'nav-wallet', ticket: 'nav-bets', home: 'nav-home', city: 'nav-city', trading: 'nav-trading', shop: 'nav-shop', bolt: 'icon-bolt', dice: 'icon-dice' };
  // REMOTE_IMG : images envoyées depuis le back office (objets ajoutés), servies par le serveur du jeu (js/content.js)
  const REMOTE = () => window.REMOTE_IMG || {};
  function has(name) { return IMG.has(name) || !!REMOTE()[name]; }
  // chargé depuis internet (mise à jour auto) mais joué sur ton ordi : les images viennent de ton dossier, c'est bien plus rapide
  // (une image absente de ton dossier est reprise sur internet, voir plus bas)
  const IMG_LOCAL = /^https:\/\/cdn\.jsdelivr\.net\//.test(document.baseURI) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? location.origin + '/' : '';
  function src(name) { return REMOTE()[name] || `${IMG_LOCAL}assets/img/${name}.png?v=${window.ASSET_V || 1}`; }
  if (IMG_LOCAL) document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && !t.dataset.cdn && t.src.startsWith(IMG_LOCAL)) { t.dataset.cdn = 1; t.src = new URL(t.src.slice(IMG_LOCAL.length), document.baseURI).href; } }, true);
  function pic(name, emo, cls = '') { return `<span class="pic ${cls}">${has(name) ? `<img src="${src(name)}" alt="" draggable="false">` : `<span class="emo">${emo || EMO[name] || '❔'}</span>`}</span>`; }
  // « de » + un nom propre, à la française : de Les Paniers → des Paniers, de Le Royal → du Royal, de Axion → d'Axion
  function de(n) { n = String(n); const m = n.match(/^(Les|Le|La|L') ?(.*)$/);
    if (m) return { Les: 'des ', Le: 'du ', La: 'de la ', "L'": "de l'" }[m[1]] + m[2];
    return /^[aeiouyhàâäéèêëîïôöûüAEIOUYHÀÂÉÈÊÎÔÛ]/.test(n) ? "d'" + n : 'de ' + n; }
  function ic(key) { const f = ICON_FILE[key] || key; return `<i class="ic">${has(f) ? `<img src="${src(f)}" alt="" draggable="false">` : `<span class="emo">${EMO[key] || '•'}</span>`}</i>`; }
  const ico = (n, e) => has(n) ? `<img class="ico" src="${src(n)}" alt="" draggable="false">` : e;
  // l'ordinateur de l'appart suit le style de la machine à miner (pcv-r1…r4) ; la vieille tour garde le vieux PC
  const pcLook = () => { const r = st().rig ? st().rig.lvl : 0; return r > 0 && has('pcv-r' + Math.min(r, 4)) ? 'pcv-r' + Math.min(r, 4) : has('pcv-' + G.pcLvl()) ? 'pcv-' + G.pcLvl() : 'pc-0'; };
  // cadrage vertical des créatures communes dans leur fenêtre (0 = haut du dessin, 100 = bas) : le perso et ce qu'il fait
  const CREA_FY = { 'cr-pigeonnard': 8, 'cr-trotilezard': 12, 'cr-escargoat': 22, 'cr-taupecash': 50, 'cr-herissnik': 62, 'cr-poubellou': 45 };
  // mise à jour sans tout redessiner : on ne touche que ce qui a changé (les images déjà affichées restent en place).
  // Évite le clignotement des écrans rafraîchis chaque seconde (appart, téléphone), surtout sur Android / Samsung.
  function morph(el, html) {
    const t = document.createElement('template'); t.innerHTML = html; patch(el, t.content);
    function patch(a, b) {
      const A = [...a.childNodes], B = [...b.childNodes];
      B.forEach((nb, i) => { const na = A[i];
        if (!na) return a.appendChild(nb.cloneNode(true));
        if (na.nodeType !== nb.nodeType || na.nodeName !== nb.nodeName) return a.replaceChild(nb.cloneNode(true), na);
        if (nb.nodeType === 3) { if (na.nodeValue !== nb.nodeValue) na.nodeValue = nb.nodeValue; return; }
        if (nb.nodeType !== 1) return;
        for (const at of [...na.attributes]) if (!nb.hasAttribute(at.name)) na.removeAttribute(at.name);
        for (const at of [...nb.attributes]) if (na.getAttribute(at.name) !== at.value) na.setAttribute(at.name, at.value);
        patch(na, nb); });
      for (let i = A.length - 1; i >= B.length; i--) A[i].remove();
    }
  }
  const frameImg = x => x && has('frame-' + x.id.replace('fr-', '')) ? 'frame-' + x.id.replace('fr-', '') : null;
  const decoImg = x => x.img || 'deco-' + x.id;
  // pin's de la photo de profil : écusson d'une équipe du tournoi, ou pin's d'un camp de la Coupe des Morts
  const pinArt = x => !x ? '' : x.cdm ? (has('pin-' + x.cdm) ? `<span class="crest"><img src="${src('pin-' + x.cdm)}" alt="" draggable="false"></span>` : cdmCrest(x.cdm, 'pin')) : teamCrest('rugby', x.team);
  function hydrateIcons(root = document) { root.querySelectorAll('i.ic[data-icon]').forEach(el => { el.outerHTML = ic(el.dataset.icon); }); }
  function skinPic(id, bust) { const sk = D.SKINS.find(s => s.id === id) || D.SKINS[0]; const n = `skin-${sk.id}${bust ? '-bust' : ''}`; return pic(has(n) ? n : `skin-${sk.id}`, ['🧑🏽', '👩🏾', '🧑🏻', '👱🏽‍♀️', '😎', '👩🏼‍💼', '👑'][D.SKINS.indexOf(sk)]); }
  // une carte de sport s'affiche TOUJOURS comme une vraie carte (format carte, cadre selon la rareté), jamais comme un simple écusson
  function itemPic(it) {
    if (it.cat === 'card') return `<span class="card-mini">${miniCard(it)}</span>`;   // toutes les cartes au même format
    return it.img ? (has(it.img) || !it.team ? pic(it.img, D.ITEM_CATS[it.cat].icon) : teamCrest(it.team[0], it.team[1])) : pic(`item-${it.id}`, D.ITEM_CATS[it.cat].icon);
  }
  // « Joueuse de l'Union Graffiti », « Joueur du FC Bitume », « Joueur des Night Hoopers »
  function playerOf(it) {
    const c = it.club, who = it.f ? 'Joueuse' : 'Joueur';
    if (/^Les /.test(c)) return `${who} des ${c.slice(4)}`;
    if (it.team && it.team[0] === 'basket') return `${who} des ${c}`;
    return /^[AEIOUÉÈÂ]/i.test(c) ? `${who} de l'${c}` : `${who} du ${c}`;
  }
  function miniCard(it) {
    const sp = it.team ? it.team[0] : '', bg = sp && has('card-bg-' + sp) ? `<img class="mc-bg" src="${src('card-bg-' + sp)}" alt="">` : '';
    const crea = !it.custom && (D.SERIES.find(x => x.id === it.series) || {}).col === 'crea', full = it.art && 'full-' + it.art.replace(/^art-/, '');
    if (crea || !sp) { const im = crea ? 'item-' + it.id : has(full) ? full : it.art && has(it.art) ? it.art : 'item-' + it.id, nm0 = it.name.replace(/^Carte /, '').replace(/^./, c => c.toUpperCase());
      return `<span class="tcg full mini ${crea ? 'crea' : ''} r${it.r} t-${it.series}"><span class="tcg-card"><span class="fa-bg"></span><span class="fa-img fa-ill"><img src="${src(im)}" alt=""></span><span class="fa-rar">${RSYM[it.r]}</span>
        <span class="fa-plate"><b class="${nm0.length > 14 ? 'xl' : ''}">${nm0}</b></span><i class="tcg-holo"></i></span></span>`; }
    const art = it.art && has(it.art) ? `<span class="fa-img fa-ill"><img src="${src(it.art)}" alt=""></span>` : sp === 'tennis' && has(it.img) ? `<span class="fa-img fa-player"><img src="${src(it.img)}" alt=""></span>` : `<span class="fa-crest">${teamCrest(sp, it.team[1])}</span>`;
    const nm = it.name.replace(/^Carte /, '');
    return `<span class="tcg full mini r${it.r} t-${it.series}"><span class="tcg-card"><span class="fa-bg"></span>${bg}${art}<span class="fa-rar">${RSYM[it.r]}</span>
      <span class="fa-plate"><b class="${nm.length > 14 ? 'xl' : ''}">${nm}</b></span><i class="tcg-holo"></i></span></span>`;
  }
  // écusson d'une équipe (ou portrait d'un joueur de tennis) ; à défaut d'image, un blason dessiné à ses couleurs
  function teamCrest(sport, i, cls = '') {
    const t = D.TEAMS[sport][i], n = (D.SPORTS[sport] || D.SIX).img + (i + 1);
    if (has(n)) return `<span class="crest ${cls} ${sport}"><img src="${src(n)}" alt="" draggable="false"></span>`;
    const ini = t[0].replace(/^(FC|AS|US|Les|Stade|Racing|Sporting|Real|Inter|Dynamo|Atlético|Olympique)\s/i, '').split(/[\s.]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `<span class="crest ${cls} ${sport}"><svg viewBox="0 0 60 66"><path d="M30 3 L55 11 V33 C55 49 43 59 30 63 C17 59 5 49 5 33 V11 Z" fill="${t[2]}" stroke="#2a1a10" stroke-width="4"/><path d="M30 10 L48 16 V33 C48 45 40 52 30 56 Z" fill="${t[3]}" opacity=".85"/><text x="30" y="40" text-anchor="middle" font-family="Lilita One" font-size="${t[4] ? 24 : 20}" fill="#fff" stroke="#2a1a10" stroke-width="3" paint-order="stroke">${t[4] || ini}</text></svg></span>`;
  }
  const teamIdx = (sport, name) => D.TEAMS[sport].findIndex(t => t[0] === name);
  function coinIco(c) { return `<span class="cico" style="background:${c.color}">${has('coin-' + c.id) ? `<img src="${src('coin-' + c.id)}" alt="">` : c.sym}</span>`; }

  // ------------------------------------------------------------ sons (petits bips synthétisés, comme Mama Kana)
  let actx = null;
  function beep(freqs, dur = .08, type = 'square', vol = .05) {
    if (!st().sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * dur;
        o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur * .95);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur);
      });
    } catch (e) {}
  }
  // les sons viennent de js/audio.js (doux, fabriqués en direct) ; on garde les mêmes noms partout
  const sfx = new Proxy({}, { get: (_, k) => () => { try { window.AUDIO && window.AUDIO.sfx[k] && window.AUDIO.sfx[k](); } catch (e) {} } });

  // ------------------------------------------------------------ message de Momo, effets
  // même carte que Mama Kana : la tête du perso + le texte, au-dessus de la barre du bas ; un appui mène à l'action liée
  let toastT;
  function toast(msg, bad, act, id, who) {
    const t = $('#toast');
    t.innerHTML = `<span class="t-who">${pic(who && has(who) ? who : 'guide', '🧢')}</span><span class="t-txt">${msg}</span>`;
    t.classList.toggle('bad', !!bad);
    if (act) { t.dataset.act = act; if (id) t.dataset.id = id; else delete t.dataset.id; t.classList.add('tapme'); }
    else { delete t.dataset.act; delete t.dataset.id; t.classList.remove('tapme'); }
    if (bad) sfx.err();
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3600);
  }
  function floatTxt(txt, x, y, neg) {
    const r = appBox(), el = document.createElement('div');
    el.className = 'float' + (neg ? ' neg' : ''); el.innerHTML = txt;
    el.style.left = ((x ?? r.left + r.width / 2) - r.left) + 'px'; el.style.top = ((y ?? r.top + r.height * .45) - r.top) + 'px';
    $('#fx').appendChild(el); setTimeout(() => el.remove(), 1400);
  }
  // l'intérieur de #app (sans sa bordure) : le repère des éléments posés en absolu dedans
  const appBox = () => { const A = $('#app'), r = A.getBoundingClientRect(); return { left: r.left + A.clientLeft, top: r.top + A.clientTop, width: A.clientWidth, height: A.clientHeight, right: r.left + A.clientLeft + A.clientWidth, bottom: r.top + A.clientTop + A.clientHeight }; };
  function rain(kind = 'bill', n = 26) {
    if (st().calm) n = Math.min(n, 6); if (st().vibrate !== false && n > 10 && navigator.vibrate) try { navigator.vibrate(40); } catch (e) {}
    const fx = $('#fx'), cols = ['#ffd23f', '#3ddc84', '#ff3cac', '#4fb3f0', '#9b5de5'];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      if (kind === 'bill') { el.className = 'bill'; el.textContent = Math.random() < .7 ? '💵' : '💰'; }
      else { el.className = 'confetti'; el.style.background = cols[i % cols.length]; }
      el.style.left = Math.random() * 100 + '%'; el.style.animationDuration = (1.4 + Math.random() * 1.6) + 's'; el.style.animationDelay = Math.random() * .5 + 's';
      fx.appendChild(el); setTimeout(() => el.remove(), 3800);
    }
  }
  function bump(id) { const el = $(id); if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  // billets qui s'envolent vers la pilule de cash
  function flyTo(fromEl, toSel, n = 6, icon = 'cash') {
    const to = $(toSel); if (!fromEl || !to) return;
    const r = appBox(), a = fromEl.getBoundingClientRect(), b = to.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div'); el.className = 'flybill'; el.innerHTML = ic(icon);
      const x0 = a.left + a.width * (.3 + Math.random() * .4) - r.left - 18, y0 = a.top + a.height * (.3 + Math.random() * .4) - r.top - 18;
      el.style.left = x0 + 'px'; el.style.top = y0 + 'px'; $('#fx').appendChild(el);
      setTimeout(() => { el.style.transform = `translate(${b.left + b.width / 2 - r.left - 18 - x0}px, ${b.top + b.height / 2 - r.top - 18 - y0}px) scale(.55)`; el.style.opacity = '.4'; }, 30 + i * 70);
      setTimeout(() => el.remove(), 1000 + i * 70);
    }
    setTimeout(() => bump(toSel), 800);
  }
  // fenêtres en file d'attente (niveau, événements…) : une à la fois
  const pending = [];
  function queue(fn) { pending.push(fn); if (!modalOpen() && pending.length === 1) nextPending(); }
  // pendant une visite de Momo, les fenêtres en attente (succès, niveau…) patientent : sinon elles s'ouvrent par-dessus la visite
  let pendWait = null;
  function nextPending() {
    if (window.TUTO && window.TUTO.active) { if (!pendWait) pendWait = setTimeout(() => { pendWait = null; if (!modalOpen()) nextPending(); }, 800); return; }
    const f = pending.shift(); if (f) f();
  }

  // ------------------------------------------------------------ fenêtres
  let modalClose = null, modalRefresh = null, tabHandler = null;
  function openModal({ title, icon, body, tabs, tab, full, center, onClose, refresh, onTab, theme }) {
    const m = $('#modal');
    m.className = full ? 'full' : '';
    m.innerHTML = `<div class="sheet ${center ? 'center' : ''} ${theme ? 'th-' + theme : ''}">
      <div class="sheet-head">${icon ? ic(icon) : ''}<span>${title}</span><button class="sheet-close" data-act="closeModal" aria-label="Fermer">×</button></div>
      ${tabs ? `<div class="tabs">${tabs.map(t => `<button class="tab ${t.id === tab ? 'on' : ''} ${t.locked ? 'tab-locked' : ''}" data-tab="${t.id}" ${t.locked ? 'disabled' : ''}>${t.locked ? `<span class="tab-lock">${ic('lock')}</span>` : ''}<span class="tab-lbl">${t.label}${t.locked && t.lvl ? `<small>Niveau ${t.lvl}</small>` : ''}</span></button>`).join('')}</div>` : ''}
      <div class="sheet-body">${body}</div></div>`;
    modalClose = onClose || null; modalRefresh = refresh || null; tabHandler = onTab || null;
    m.onclick = e => { if (e.target === m) closeModal(); };
  }
  let liveTick = false;   // rafraîchissement automatique (chaque seconde) : on ne touche que ce qui change, sinon l'écran clignote sur Android
  function setBody(html) { const b = $('#modal .sheet-body'); if (b) { const y = b.scrollTop; if (liveTick) morph(b, html); else b.innerHTML = html; b.scrollTop = y; } }
  function closeModal() { const m = $('#modal'); m.className = 'hidden'; m.innerHTML = ''; const f = modalClose; modalClose = null; modalRefresh = null; tabHandler = null; if (f) f(); setTimeout(() => { if (!modalOpen()) nextPending(); }, 250); }
  function modalOpen() { return !$('#modal').classList.contains('hidden'); }

  function dialog(who, text, btn = 'OK', cb) {
    const el = document.createElement('div'); el.className = 'dlg';
    el.innerHTML = `<div class="who">${pic('guide', '🧢')}</div><div class="say"><span class="nm">${who}</span>${text}<div style="margin-top:10px;text-align:right"><button class="btn green sm">${btn}</button></div></div>`;
    el.querySelector('button').onclick = () => { el.remove(); cb && cb(); };
    $('#app').appendChild(el);
  }

  // ------------------------------------------------------------ HUD
  function renderHud() {
    const s = st();
    $('#cash').textContent = short(s.cash, true);
    $('#lingots').textContent = s.lingots;
    $('#lvl').textContent = s.lvl;
    $('#hud-name').textContent = s.name || '';
    const need = G.xpNeed(); $('#xpfill').style.width = (need === Infinity ? 100 : Math.min(100, s.xp / need * 100)) + '%';
    $('#xptext').textContent = need === Infinity ? 'MAX' : `${s.xp}/${need}`;
    { const w = short(G.worth()); if ($('#worth-v').innerHTML !== w) $('#worth-v').innerHTML = w; }
    const av = s.avatar && D.EV_SHOP.find(x => x.id === s.avatar), fr = s.frame && D.EV_SHOP.find(x => x.id === s.frame);
    const avKey = (s.avatar || s.skin) + '|' + (s.frame || '');
    if ($('#avatar-img').dataset.k !== avKey) {
      $('#avatar-img').dataset.k = avKey;
      $('#avatar-img').innerHTML = (s.skin ? skinPic(s.skin, true) : '') + (av ? `<span class="av-pin">${pinArt(av)}</span>` : '');
      $('#avatar-img').classList.remove('crest-av');
      const a = $('#hud .avatar'); a.classList.toggle('framed', !!fr); a.style.setProperty('--f1', fr ? fr.colors[0] : ''); a.style.setProperty('--f2', fr ? fr.colors[1] : ''); a.dataset.emo = fr && !frameImg(fr) ? fr.emo : ''; a.classList.toggle('framed-img', !!frameImg(fr)); a.querySelector('.av-frame-img')?.remove(); if (frameImg(fr)) a.insertAdjacentHTML('beforeend', `<img class="av-frame-img" src="${src(frameImg(fr))}" alt="">`);
    }
    const m = G.mood(), col = { calm: '#9aa', bull: '#3ddc84', bear: '#ff8a3d', fomo: '#ff3cac', krach: '#ff2d2d' }[m.id];
    const wx = WEATHER[m.id] || WEATHER.calm; if ($('#mood').dataset.k !== m.id) { $('#mood').dataset.k = m.id; $('#mood').innerHTML = `<span class="mood-ic">${wxIc(m.id)}</span>${wx[1]}`; } $('#mood').className = 'm-' + m.id; void col;
    const open = s.bets.filter(b => b.state === 'open').length; const bb = $('#badge-bets'); bb.textContent = open; bb.classList.toggle('hidden', !open);
    const hot = G.rigInfo().hot; $('#badge-rig').classList.toggle('hidden', !(hot && scene === 'city'));
    const ub = $('#btn-upg'), canUp = !!G.upgradeReady(), reach = canUp || G.upgradeReachable(); ub.classList.toggle('glow', canUp); ub.querySelector('.badge').classList.toggle('hidden', !reach);
    // boutons du côté droit (comme Mama Kana) : Récompenses, Booster, Cadeau
    const rw = G.questsReady() + G.chalReady() + G.weekReady();
    $('#trophy .badge').classList.toggle('hidden', !rw); $('#trophy .badge').textContent = rw;
    const nb = G.boosterCount(), bst = $('#btn-booster');
    bst.querySelector('.badge').classList.toggle('hidden', !nb); bst.querySelector('.badge').textContent = nb; bst.classList.toggle('glow', G.boosterFree());
    const gift = $('#btn-gift'), dr = G.dailyReady();
    gift.classList.toggle('glow', dr); gift.querySelector('.badge').classList.toggle('hidden', !dr);
    renderNextBtn();
    promoUi(); renderCap();
    $('.six-badge')?.classList.toggle('hidden', G.panneau() === 'cdm' ? !G.cdmBadge() : G.eventOff() || !G.sixBadge());
    renderQuest(); renderBuffs(); renderDealBtn(); renderPhoneBtn();
    renderTicker();
  }

  // ------------------------------------------------------------ bouton « Idée » : le coach
  // Il regarde où en est le joueur et lui dit quoi faire pour avancer (jamais un achat au hasard).
  // Chaque étape : ic (emoji), t (titre), d (détail), go (ce que fait « Y aller »), p (priorité), now (à faire tout de suite).
  function nextUnlock() {
    const s = st(), L = [];
    D.BUILDINGS.forEach(b => b.lvl > s.lvl && L.push([b.lvl, `le ${b.name.replace(/^(Le|La) /, '')}`.replace('le Lucky', 'le Lucky'), b.tag]));
    Object.values(D.SPORTS).forEach(x => x.lvl > s.lvl && L.push([x.lvl, `les paris ${x.name.toLowerCase()}`, x.league]));
    Object.entries(D.ITEM_CATS).forEach(([, c]) => !c.noBuy && c.lvl > s.lvl && L.push([c.lvl, `les ${c.name.toLowerCase()} ${{ comptoir: 'au Comptoir', bijou: 'à la Bijouterie', garage: 'au Garage' }[c.shop] || ''}`, 'des objets qui prennent de la valeur']));
    D.SCRATCH.forEach(t => t.lvl > s.lvl && L.push([t.lvl, `le ticket ${t.name}`, `jusqu'à ${short(t.prizes[t.prizes.length - 1][0])}`]));
    D.COINS.forEach(c => c.lvl > s.lvl && L.push([c.lvl, `la crypto ${c.name}`, c.desc.split('.')[0]]));
    if (D.COMBI_LVL > s.lvl) L.push([D.COMBI_LVL, 'les paris combinés', 'plusieurs matchs, une grosse cote']);
    if (D.AGENCE.lvl > s.lvl) L.push([D.AGENCE.lvl, (D.SKINS.find(k => k.id === s.skin) || {}).g === 'f' ? 'ta page PrivéFans' : 'ton agence PrivéFans', (D.SKINS.find(k => k.id === s.skin) || {}).g === 'f' ? 'devenir créatrice de contenu' : 'manager des créatrices de contenu']);
    D.CITY_SHOP.forEach(x => x.lvl > s.lvl && L.push([x.lvl, `la déco « ${x.name} »`, 'pour ta ville']));
    L.sort((x, y) => x[0] - y[0]);
    return L.length ? { lvl: L[0][0], what: L.filter(x => x[0] === L[0][0]).map(x => x[1]) } : null;
  }
  // icônes des conseils de Momo : l'emoji sert de clé (et de repli tant que l'image manque)
  const COACH_IC = { '🏆': 'icon-trophy', '🎁': 'icon-gift', '⚡': 'icon-bolt', '📩': 'app-msg', '📸': 'app-agence', '🃏': 'booster-pack', '🎃': 'ic-ev-cdm', '🏉': 'bld-six', '💬': 'app-msg',
    '🛠️': 'btn-setup', '📒': 'app-binder', '🛍️': 'nav-shop', '💰': 'icon-cash', '🎟️': 'ticket-flash', '🎰': 'casino-machine', '📰': 'bld-kiosque', '⛏️': 'ic-pickaxe', '🌡️': 'ic-heat', '🎯': 'ic-target', '🔓': 'ic-unlock' };
  const coachIc = e => ico(COACH_IC[e] || '', e);
  function coach() {
    const s = st(), L = [], add = (p, ic, t, d, go, now) => L.push({ p, ic, t, d, go, now: !!now });
    const rw = G.questsReady() + G.chalReady() + G.weekReady();
    if (rw) add(100, '🏆', `${rw} récompense${rw > 1 ? 's' : ''} à récupérer`, 'Tes missions ou tes défis sont réussis : encaisse.', () => openRewards(), true);
    if (G.dailyReady()) add(95, '🎁', 'Ton cadeau du jour t\'attend', 'Reviens chaque jour : il grossit avec la série.', () => openDaily(), true);
    const ri = G.rigInfo();
    if (ri.ready) add(90, '⛏️', 'Ta récolte est prête', 'Ton minage est fini : viens voir ce qu\'il y a dedans.', () => questGo('rig'), true);
    else if (ri.idle) add(89, '⛏️', 'Ta machine est à l\'arrêt', 'Choisis une crypto à miner : elle bosse pendant que tu fais autre chose.', () => questGo('rig'), true);
    else if (!ri.burnt && ri.heat >= 70) add(92, '🌡️', `Ta machine chauffe : ${Math.round(ri.heat)} %`, 'Refroidis-la avant 100 %, sinon la récolte en prend un coup.', () => questGo('rig'), true);
    const fl = s.crypto.flash; if (fl && fl.applied && !fl.acted && (!fl.up || G.holdValue(fl.id) >= 1)) add(86, '⚡', `Alerte flash : ${G.coin(fl.id).name} ${fl.up ? '+' : '−'}${Math.round((fl.k - 1) * 100)} %`, fl.up ? 'Vends avant que ça retombe.' : 'Ça plonge : achète pas cher ?', () => questGo('pc'), true);
    const tr = G.traderState(); if (!tr.claimed && tr.profit >= G.traderGoal()) add(87, '🎯', 'Défi du trader réussi', 'Va chercher tes lingots sur ton PC.', () => questGo('pc'), true);
    if (window.AGENCE && AGENCE.offer()) add(84, '📩', 'Une de tes créatrices hésite à partir', 'Une agence rivale lui fait les yeux doux : décide vite.', () => AGENCE.open(), true);
    if (window.AGENCE && AGENCE.pending() >= 30 + s.lvl * 10) add(76, '📸', `${short(AGENCE.pending())} de commission t'attendent`, 'Tes créatrices ont bossé : encaisse ta part sur PrivéFans.', () => AGENCE.open(), true);
    if (G.boosterCount()) add(85, '🃏', `${G.boosterCount()} booster${G.boosterCount() > 1 ? 's' : ''} à ouvrir`, 'Des cartes à collectionner et des récompenses.', () => openBoosters('open'), true);
    if (G.panneau() === 'cdm') { const S = G.cdmState(), T = G.cdmTeam(S.team);
      if (S.final && !S.final.seen) add(83, '🎃', 'La Coupe des Morts est finie', 'Va voir le classement final et récupérer tes récompenses au Panneau.', () => goCdm(), true);
      else if (G.cdmPhase() === 'on' && !T) add(82, '🎃', 'La Coupe des Morts a commencé', 'Zombies, Vampires, Démons ou Fantômes : choisis ton camp au Panneau.', () => goCdm(), true);
      else if (G.cdmPhase() === 'on') { const n = G.cdmNightReady(), k = G.cdmStepsReady();
        if (n || k) add(83, '🎃', n ? `${n} défi${n > 1 ? 's' : ''} de la nuit réussi${n > 1 ? 's' : ''}` : 'Un palier de la Coupe est atteint', 'Récupère tes points et tes récompenses au Panneau.', () => goCdm(n ? 'nights' : 'steps'), true);
        else add(42, '🎃', `Fais gagner les ${T.name}`, 'Paris, boosters, récoltes, défis de la nuit : tout rapporte des points à ton équipe.', () => goCdm('nights')); } }
    if (G.panneau() === 'six' && G.sixBadge()) add(80, '🏉', 'Le tournoi t\'attend', 'Fais tes pronos du jour : c\'est gratuit et ça rapporte des lingots.', () => openSix(), true);
    if (s.deal && Date.now() < s.deal.end) add(78, '💬', `${s.deal.name} te propose une affaire`, 'L\'offre ne dure pas : regarde vite.', () => openPhone('msg'), true);
    const up = G.upgradeReady();
    if (up) add(75, '🛠️', { pc: 'Tu peux te payer un meilleur PC', rig: 'Tu peux améliorer ta machine', room: 'Tu peux déménager' }[up], { pc: 'Moins de frais sur la crypto.', rig: 'Elle minera plus vite.', room: 'Plus de place pour tes objets.' }[up], () => openUpgrades(), true);
    // une série presque finie, avec la carte qui manque en rayon
    if (G.catUnlocked('card')) D.SERIES.filter(x => !s.colClaimed[x.id] && G.seriesHave(x.id) > 0).forEach(se => {
      const all = G.seriesCards(se.id), left = all.length - G.seriesHave(se.id);
      if (left > 2) return;
      if (G.seriesDone && G.seriesDone(se.id)) return add(88, '📒', `Série « ${se.name} » complète !`, `Réclame ta prime de ${short(se.reward.cash)}.`, () => openBoosters('col'), true);
      const miss = all.find(it => !(s.owned[it.id] || []).length && G.inStock(it.id));
      add(60, '📒', `${left === 1 ? 'Plus qu\'une carte' : 'Plus que 2 cartes'} pour finir « ${se.name} »`, miss ? `${miss.name} est au Comptoir. Prime : ${short(se.reward.cash)}.` : `Ouvre des boosters ou guette le Comptoir. Prime : ${short(se.reward.cash)}.`,
        () => miss ? questGo('shop') : openBoosters('col'));
    });
    const q = G.questFocus();
    if (q && !G.questState(q).done) add(50, '🎯', `Mission : ${q.txt}`, `${q.cash ? `+${short(q.cash)}` : `+${q.lingots || 0} lingots`} et de l'XP pour monter de niveau.`, () => questGo(q.go));
    const nu = nextUnlock();
    if (nu) add(40, '🔓', `Niveau ${nu.lvl} : ${nu.what.slice(0, 2).join(' et ')}`, `Encore ${Math.max(0, G.xpNeed() - s.xp)} XP. Missions, paris, soirées : tout en rapporte.`, () => openRewards());
    if (!up) {
      // toujours l'objectif le plus proche : machine, appart, PC ou déco de la ville encore à acheter
      const nx = G.rigNext(), np = G.pcNext && G.pcNext(), nr = D.ROOMS[s.room + 1];
      const goal = [nx && { n: 'améliorer ta machine', p: nx.price, go: () => openUpgrades() }, np && { n: 'un meilleur PC', p: np.price, go: () => openUpgrades() },
        nr && { n: 'déménager', p: G.cost(nr.cost), go: () => openUpgrades() },
        ...D.CITY_SHOP.filter(x => x.cash && (x.lvl || 1) <= s.lvl && !G.evOwned(x.id)).map(x => ({ n: `la déco « ${x.name} »`, p: x.cash, go: () => openBoutique('deco') }))]
        .filter(Boolean).sort((a, b) => a.p - b.p)[0];
      if (goal) s.cash >= goal.p ? add(30, '🛍️', `Tu peux t'offrir ${goal.n}`, 'Va voir en boutique : elle trouvera sa place dans ta ville.', goal.go)
        : add(30, '💰', `Encore ${short(goal.p - s.cash)} pour ${goal.n}`, 'Récolte ta machine, place un pari malin ou revends un objet qui a pris de la valeur.', goal.go);
    }
    // toujours au moins une idée faisable tout de suite avec ce qu'on a en poche (pas que des choses verrouillées ou trop chères)
    const doable = [
      () => { const c = D.ITEMS.filter(i => i.cat === 'card' && G.inStock(i.id) && !(s.owned[i.id] || []).length && G.buyPrice(i.id) <= s.cash).sort((a, b) => G.buyPrice(a.id) - G.buyPrice(b.id))[0];
        return c && [45, '🃏', `${c.name} est au Comptoir pour ${short(G.buyPrice(c.id))}`, 'Une carte de plus pour ta collection : sa cote peut grimper.', () => questGo('shop')]; },
      () => { const t = D.SCRATCH.filter(x => (x.lvl || 1) <= s.lvl && x.price <= s.cash).sort((a, b) => a.price - b.price)[0];
        return t && [44, '🎟️', `Gratte un ${t.name} à ${short(t.price)}`, `Jusqu'à ${short(Math.max(...t.prizes.map(p => p[0])))} à gagner au Royal.`, () => questGo('scratch')]; },
      () => s.lvl >= 2 && s.cash >= 1 && [43, '🎰', 'Un tour de machine à sous', 'Dès 1 de mise au Lucky Palace : aligne 3 symboles.', () => questGo('casino')]
    ].map(f => f()).filter(Boolean)[0];
    if (doable) add(...doable);
    add(10, '📰', 'Achète un tuyau au Kiosque', 'Le journal te dit quel match a le plus de chances : ça aide à bien parier.', () => questGo('kiosque'));
    // un seul conseil par sujet (ex. une seule série de cartes à finir, pas deux), le plus important d'abord
    const topic = x => ({ '📒': 'cartes', '🃏': 'cartes' })[x.ic] || x.ic, seen = new Set();
    return L.sort((a, b) => b.p - a.p).filter(x => !seen.has(topic(x)) && seen.add(topic(x)));
  }
  // le prochain cap, toujours visible en ville : ce qui s'ouvre au niveau suivant et où on en est
  const rkImg = r => has(r.img) ? r.img : r.alt || r.img;   // image du palier (en attendant la sienne : un objet du jeu)
  let capKey = '', capAt = 0, capOff = null;
  function renderCap() {
    const b = $('#next-cap'); if (!b) return; const s = st(), nu = nextUnlock();
    const show = s.tutoDone && nu; b.classList.toggle('hidden', !show); if (!show) return;
    // il passe quelques secondes de temps en temps (au lancement, puis toutes les 4 min), jamais en permanence
    const t = Date.now(); if (!capAt) capAt = t + 20000;
    if (t >= capAt && !modalOpen() && scene === 'city') { capAt = t + 240000; b.classList.add('on'); clearTimeout(capOff); capOff = setTimeout(() => b.classList.remove('on'), 7000); }
    const need = G.xpNeed(), pct = isFinite(need) ? Math.min(100, s.xp / need * 100) : 100, togo = nu.lvl - s.lvl;
    const key = `${nu.lvl}|${nu.what[0]}|${Math.round(pct)}`; if (key === capKey) return; capKey = key;
    b.innerHTML = `<span class="nc-lock">${ic('lock')}</span><span class="nc-txt"><small>Prochain déblocage · niveau ${nu.lvl}</small><b>${nu.what[0].replace(/^./, c => c.toUpperCase())}</b></span><span class="nc-bar"><i style="width:${pct.toFixed(0)}%"></i></span>`;
    hydrateIcons(b);
    // un nouveau rang de fortune : on le fête
    const rk = G.rankOf(); if (s.rankMax == null) s.rankMax = rk.i;
    if (rk.i > s.rankMax) { s.rankMax = rk.i; queue(() => { sfx.level(); rain('bill', 50); openModal({ title: 'Street cred !', icon: 'trophy', center: true, body: `<div class="levelup"><div class="rays">${skinPic(s.skin)}</div><div class="rk-big">${pic(rkImg(rk), rk.emo)}</div><div class="lv-big stroke">${rk.name.toUpperCase()}</div><p class="hint-line center">Ta street cred monte : ton patrimoine passe <b>${short(rk.n)}</b>, tout le quartier en parle.${rk.next ? ` Prochain palier : <b>${rk.next.name}</b> à ${short(rk.next.n)}.` : ''}</p><button class="btn green wide" data-act="closeModal">La classe</button></div>` }); }); }
  }
  let nextClicked = false, nextKey = '', tipT = 0, tipLast = 0;
  function renderNextBtn() {
    const btn = $('#btn-next'); if (!btn) return;
    btn.classList.toggle('hidden', !st().tutoDone); if (!st().tutoDone) return;
    const top = coach()[0], urgent = top && top.now;
    const key = top ? top.t : '';
    if (key !== nextKey) { nextKey = key; nextClicked = false; btn.querySelector('.nx-pic').innerHTML = has('btn-momo') ? `<img src="${src('btn-momo')}" alt="">` : pic('guide', '🧢'); btn.querySelector('b').textContent = 'Momo';
      // Momo souffle l'idée quand quelque chose d'important apparaît (pas plus d'une fois par minute)
      if (urgent && Date.now() - tipLast > 60000) showNextTip(top); }
    btn.classList.toggle('glow', !!urgent && !nextClicked); btn.querySelector('.badge').classList.toggle('hidden', !urgent || nextClicked);
  }
  function showNextTip(n) {
    const t = $('#next-tip'); if (!t || modalOpen() || phoneOpen() || (window.TUTO && TUTO.active)) return;
    tipLast = Date.now();
    t.innerHTML = `<span class="t-who">${pic('guide', '🧢')}</span><span><b>${coachIc(n.ic)} ${n.t}</b><small>${n.d}</small></span>`;
    t.classList.add('on'); clearTimeout(tipT); tipT = setTimeout(() => t.classList.remove('on'), 6000);
  }
  let coachList = [];
  function coachBody() {
    coachList = coach().slice(0, 4);
    return `<div class="coach-top"><span class="t-who">${pic('guide', '🧢')}</span><p><b>Momo</b>Voilà ce que je ferais à ta place, dans l'ordre :</p></div>` +
      coachList.map((c, i) => `<div class="card coach-step ${c.now ? 'now' : ''}"><span class="cs-ic">${coachIc(c.ic)}</span><div class="grow"><b>${c.t}</b><small>${c.d}</small></div><button class="btn sm ${i === 0 ? 'green' : 'blue'}" data-act="coachGo" data-i="${i}">Y aller</button></div>`).join('');
  }
  function goNextBuy() {
    nextClicked = true; $('#btn-next .badge')?.classList.add('hidden'); $('#btn-next')?.classList.remove('glow');
    $('#next-tip')?.classList.remove('on');
    openModal({ title: 'Momo', icon: 'btn-momo', body: coachBody() });
  }

  // ------------------------------------------------------------ bouton « Améliorations » : la machine et l'appart, côte à côte
  function upgradesBody() {
    const s = st(), nx = G.rigNext(), nr = D.ROOMS[s.room + 1], sk = D.SKINS.find(k => k.id === s.skin) || D.SKINS[0];
    const rimg = l => has('minerv-' + l) ? 'minerv-' + l : 'rig-' + l, room = i => has(`room-${sk.g}-${i}`) ? `room-${sk.g}-${i}` : 'room-' + i;
    const rig = nx ? `<div class="card up-card ${s.cash >= nx.price ? 'ready' : ''}"><div class="up-img">${pic(rimg(s.rig.lvl + 1), EMO.rig)}</div><div class="up-info"><small class="muted">Machine à crypto · niveau ${s.rig.lvl + 2} / ${D.RIG.length}</small><b>${nx.nx.name}</b>
        <p><span class="up">×${nx.mult.toFixed(1).replace('.', ',')}</span> plus rapide : ≈ ${short(nx.perHour)} par heure, et elle tient ${nx.nx.heatMin} min avant de chauffer.</p>
        <button class="btn ${s.cash >= nx.price ? 'green' : ''} wide" data-act="rigUp" ${s.cash >= nx.price ? '' : 'disabled'}>Améliorer · ${short(nx.price)}</button>${mixBtn(nx.price, 'rigUpL')}</div></div>`
      : `<div class="card center"><b>Machine à crypto</b><p>Au maximum. Respect.</p></div>`;
    const rp = nr && G.cost(nr.cost), full = G.ownedCount() >= G.roomSlots();
    const flat = nr ? `<div class="card up-card ${s.cash >= rp ? 'ready' : ''}"><div class="up-img up-room" style="background-image:url(${src(room(s.room + 1))})"></div><div class="up-info"><small class="muted">Ton appart${full ? ' · étagères pleines !' : ''}</small><b>${nr.name}</b>
        <p>${nr.desc} <b>${nr.slots} places</b> pour ta collection (tu en as ${D.ROOMS[s.room].slots}).</p>
        <button class="btn ${s.cash >= rp ? 'green' : ''} wide" data-act="roomUp" ${s.cash >= rp ? '' : 'disabled'}>Emménager · ${short(rp)}</button>${mixBtn(rp, 'roomUpL')}</div></div>`
      : `<div class="card center"><b>Ton appart</b><p>Le plus bel appart du quartier. Respect.</p></div>`;
    const pn = G.pcNext(), fpc = f => (f * 100).toFixed(1).replace('.', ',').replace(',0', '') + ' %';
    const pcCard = pn ? `<div class="card up-card"><div class="up-img">${pic(has('pcv-' + (G.pcLvl() + 1)) ? 'pcv-' + (G.pcLvl() + 1) : 'pc-0', EMO.pc)}</div><div class="up-info"><small class="muted">Ton PC · niveau ${G.pcLvl() + 2} / ${D.PCS.length}</small><b>${pn.nx.name}</b>
        <p>${pn.nx.desc} Frais sur tes cryptos : <span class="up">${fpc(G.fee())} → ${fpc(pn.nx.fee)}</span> à chaque achat et vente.</p>
        <button class="btn ${s.cash >= pn.price ? 'green' : ''} wide" data-act="pcUp" ${s.cash >= pn.price ? '' : 'disabled'}>Améliorer · ${short(pn.price)}</button>${mixBtn(pn.price, 'pcUpL')}</div></div>`
      : D.PC_UPGRADES ? `<div class="card center"><b>Ton PC</b><p>Au maximum : ${fpc(G.fee())} de frais seulement.</p></div>` : '';
    return `<p class="hint-line">Ton matos. En vert : tu as de quoi te le payer. Sinon tu peux compléter avec des lingots, ou payer avec ton patrimoine (on revend tes cryptos, puis tes objets).</p>${rig}${pcCard}${flat}`;
  }
  function openUpgrades() { openModal({ title: 'Mon setup', icon: 'btn-setup', full: true, body: upgradesBody(), refresh: () => setBody(upgradesBody()) }); }

  // ------------------------------------------------------------ carte mission (apparaît quelques secondes, comme Mama Kana)
  let questKey = '', questPeekUntil = 0;
  function peekQuest(ms = 6000) { questPeekUntil = Math.max(questPeekUntil, Date.now() + ms); updateQuestVis(); setTimeout(updateQuestVis, ms + 50); }
  function updateQuestVis() { const q = G.questFocus(); $('#quest').classList.toggle('peek', !!q && (G.questState(q).done || Date.now() < questPeekUntil) && !(window.TUTO && TUTO.active)); }
  setInterval(() => { if (!modalOpen()) peekQuest(); }, 180000);
  function renderQuest() {
    const q = G.questFocus(), el = $('#quest');
    if (!q) { el.classList.add('hidden'); return; }
    const s = G.questState(q), n = D.QUESTS.indexOf(q) + 1;
    const key = q.id + ':' + s.v + ':' + s.done;
    updateQuestVis();
    if (key === questKey) return;
    const newQuest = questKey.split(':')[0] !== q.id; questKey = key;
    el.classList.remove('hidden'); el.classList.toggle('done', s.done);
    el.innerHTML = `<i class="qi">${ic(s.done ? 'check' : 'trophy')}</i><div class="qtxt"><b class="qtitle stroke">Mission ${n}${s.done ? ' · réussie !' : ''}</b>` +
      `<span>${s.done ? 'Touche pour ta récompense' : q.txt}</span><div class="qbar"><div style="width:${(s.done ? 1 : s.v / q.n) * 100}%"></div></div></div>` +
      `<span class="reward stroke">${q.cash ? `${ic('cash')}${q.cash}` : `${ic('lingot')}${q.lingots || 0}`}</span>`;
    if (newQuest) peekQuest(); else updateQuestVis();
  }
  // pastilles des effets en cours : mini-événement, paris gratuits, tickets offerts
  function renderBuffs() {
    const s = st(), ev = G.eventNow(), chips = [];
    if (ev) chips.push(`<div class="buff ev-chip" data-act="eventInfo">${has('ev-' + ev.id) ? ic('ev-' + ev.id) : ic(ev.icon)}<span>${ev.short}<b>${mmss(G.eventLeft())}</b></span></div>`);
    if (s.freebets.length) chips.push(`<div class="buff" data-act="freebetInfo">${ic('ticket')}<span>Pari gratuit<b>${s.freebets.length > 1 ? `${s.freebets.length} × ` : ''}${s.freebets[0]}<i class="cur"></i></b></span></div>`);
    if (s.freeTickets) chips.push(`<div class="buff" data-act="scratchGo">${pic('ticket-flash', '🎟️', 'bpic')}<span>Grattage<b>${s.freeTickets} offert${s.freeTickets > 1 ? 's' : ''}</b></span></div>`);
    const html = chips.join(''), el = $('#buffs');
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  // bon plan d'un contact : bulle sur le côté gauche, avec son portrait et le temps qui reste
  function renderDealBtn() {
    const d = st().deal, el = $('#btn-deal');
    if (!d || Date.now() > d.end) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const k = d.id + d.type;
    if (el.dataset.k !== k) { el.dataset.k = k; el.innerHTML = `<span class="dl-face">${pic(d.img, '🧑')}</span><b class="stroke">Bon plan</b><small></small><span class="badge ok">!</span>`; }
    el.querySelector('small').textContent = mmss(d.end - Date.now());
  }
  let tickerKey = '';
  function renderTicker() {
    const s = st(), coins = D.COINS.filter(G.coinUnlocked);
    const key = coins.map(c => s.crypto.prices[c.id].toPrecision(4)).join('|');
    if (key === tickerKey) return; tickerKey = key;
    const part = coins.map(c => { const h = s.crypto.hist[c.id], ref = h[Math.max(0, h.length - 60)], v = (s.crypto.prices[c.id] / ref - 1) * 100; return `<span>${c.sym} ${coinPx(s.crypto.prices[c.id])} <b class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1).replace('.', ',')}%</b></span>`; }).join('');
    // on remplace seulement le texte : la position du défilement est gardée (pas de saut)
    tickPending = part; if ($('#ticker .track')) return;
    tickApply();
  }
  let tickPending = '';
  function tickApply() {
    const part = tickPending; if (!part) return; tickPending = '';
    let tr = $('#ticker .track'); if (!tr) { $('#ticker').innerHTML = '<div class="track"></div>'; tr = $('#ticker .track'); }
    const one = document.createElement('span'); one.innerHTML = part; one.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'; tr.appendChild(one);
    const w = one.offsetWidth || 1, rep = Math.max(1, Math.ceil(($('#ticker').offsetWidth + 40) / w)); one.remove();
    tr.innerHTML = `<span class="tk-half">${part.repeat(rep)}</span><span class="tk-half">${part.repeat(rep)}</span>`;
  }
  // défilement fluide à vitesse constante (25 px par seconde), image par image
  let tickX = 0, tickT = 0;
  function tickLoop(t) {
    const tr = document.querySelector('#ticker .track'), half = tr && tr.firstElementChild;
    if (half) {
      const dt = tickT ? Math.min(100, t - tickT) : 0, hw = half.offsetWidth;
      tickX += dt * .025;
      // à chaque tour complet, on prend les nouveaux prix : le texte change au même endroit, sans saut
      if (hw > 0 && tickX >= hw) { tickX -= hw; if (tickPending) tickApply(); }
      tr.style.transform = `translate3d(${-tickX.toFixed(2)}px,0,0)`;
    }
    tickT = t; requestAnimationFrame(tickLoop);
  }
  requestAnimationFrame(tickLoop);

  // ------------------------------------------------------------ ville
  const cam = { x: 0, y: 0, s: 1, w: 0, h: 0 };
  function layoutMap() {
    const map = $('#map'), inner = $('#map-inner'), W = map.clientWidth, H = map.clientHeight;
    const mw = W, mh = W * 16 / 9; const s = Math.max(1, H / mh);
    cam.w = mw * s; cam.h = mh * s; cam.s = s;
    inner.style.width = mw + 'px'; inner.style.height = mh + 'px';
    clampCam(); applyCam();
  }
  function clampCam() { const map = $('#map'); cam.x = Math.min(0, Math.max(map.clientWidth - cam.w, cam.x)); cam.y = Math.min(0, Math.max(map.clientHeight - cam.h, cam.y)); }
  function applyCam() { $('#map-inner').style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.s})`; }
  function focusBld(id) {
    const b = D.BUILDINGS.find(x => x.id === id), map = $('#map');
    cam.x = -(cam.w * b.x / 100 - map.clientWidth / 2); cam.y = -(cam.h * (b.y - 8) / 100 - map.clientHeight * .5);
    clampCam(); applyCam();
  }
  // vue de départ : le haut de la place (casino) juste sous le bandeau, le reste en dessous
  function focusTop() { const map = $('#map'); cam.x = -(cam.w - map.clientWidth) / 2; cam.y = -cam.h * .06; clampCam(); applyCam(); }
  function focusMap(yPct) { const map = $('#map'); cam.x = -(cam.w - map.clientWidth) / 2; cam.y = -(cam.h * yPct / 100 - map.clientHeight * .55); clampCam(); applyCam(); }
  // enseigne d'un lieu : couleur et picto propres à chaque endroit (le style d'ensemble se règle en CSS via data-sign sur #app)
  const SIGN = { six: ['#e63946', 'star'], casino: ['#ff3cac', 'dice'], appart: ['#4fb3f0', 'home'], shop: ['#ffc933', 'trophy'], balto: ['#3ddc84', 'ticket'], kiosque: ['#ff8a3d', 'booster-pack'], club: ['#16b8c8', 'star'], bus: ['#a867e3', 'city'] };
  const plaque = (b, locked) => `<span class="plaque" style="--sc:${(SIGN[b.id] || [])[0] || '#4fb3f0'}"><i class="pq-ic">${ic((SIGN[b.id] || [])[1] || 'star')}</i><b>${b.id === 'six' ? (G.panneau() === 'cdm' ? D.CDM.short : G.eventOff() ? 'Le Panneau' : b.name) : b.name}</b>${locked ? `<small>${ic('lock')}Niveau ${b.lvl}</small>` : b.id === 'six' ? `<small class="pq-timer">${sixTimer()}</small>` : ''}</span>`;
  // compte à rebours de l'événement, sous le nom du Tournoi sur la carte
  const nextEvDays = () => { const t = G.nextEventAt(); return t ? Math.max(1, Math.ceil((t - Date.now()) / 86400000)) : 0; };
  function sixTimer() {
    if (G.panneau() === 'cdm') return cdmTimer();
    const ph = G.sixPhase(), t = ph === 'before' ? G.sixKick(0) - Date.now() : G.sixEnd() - Date.now();
    if (G.eventOff()) { const n = nextEvDays(); return n ? `Prochain dans ${n} j` : 'Bientôt'; }
    if (ph === 'over') return 'Terminé';
    const m = Math.max(0, Math.floor(t / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mn = m % 60;
    const left = d ? `${d} j ${h} h` : h ? `${h} h ${String(mn).padStart(2, '0')}` : `${mn} min ${String(Math.floor(t / 1000) % 60).padStart(2, '0')}`;
    return ph === 'before' ? `Commence dans ${left}` : `${ico('ic-timer', '⏱')} Encore ${left}`;
  }
  function renderCity() {
    const s = st(), inner = $('#map-inner');
    const look = st().cityLook || 'base', bgN = has('bg-city-' + look) ? 'bg-city-' + look : 'bg-city';
    const bg = has(bgN) ? `<img class="bg" src="${src(bgN)}" alt="" draggable="false">` : '<div class="bg-fallback"></div>';
    const cols = { appart: '#8ecae6', balto: '#2d6a4f', casino: '#9b5de5', shop: '#ffb703', bijou: '#e0aaff', garage: '#adb5bd', tour: '#90e0ef' };
    // enseigne : plaque de rue émaillée posée au-dessus du toit (ne recouvre jamais le bâtiment d'en dessous)
    inner.innerHTML = bg + D.BUILDINGS.map(b => {
      if (b.needVehicle && !placing && !G.parkedCount()) return '';
      // arrêt de bus : dessiné dans le décor, on pose juste une zone à toucher et son enseigne
      if (b.spot) return `<button class="bld spot ${b.flip ? 'flip' : ''}" data-act="bld" data-id="${b.id}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%">${plaque(b, false)}<span class="spot-zone"></span></button>`;
      const locked = s.lvl < b.lvl;
      const img = b.id === 'six' && G.panneau() === 'cdm' ? (has('ev-cdm-board') ? pic('ev-cdm-board') : cdmBoardArt()) : b.id === 'six' && G.eventOff() && !(look !== 'base' && has(`bld-six-${look}`)) ? (has('bld-six-off') ? pic('bld-six-off') : `<span class="six-off-fb">${pic('bld-six')}</span>`) : has(`bld-${b.id}-${look}`) ? pic(`bld-${b.id}-${look}`) : has('bld-' + b.id) ? pic('bld-' + b.id) : b.id === 'six' ? sixBoardArt() : `<span class="ph" style="background:${cols[b.id]}">${EMO['bld-' + b.id]}</span>`;
      const k = (has(`bld-${b.id}-${look}`) && (D.BLD_SCALE || {})[`bld-${b.id}-${look}`]) || 1;   // le skin de la ville ne change pas la taille du bâtiment
      return `<button class="bld ${locked ? 'locked' : ''} ${b.flip ? 'flip' : ''}" data-act="bld" data-id="${b.id}" style="left:${b.x}%;top:${b.y}%;width:${(b.w * k).toFixed(2)}%">
        ${plaque(b, locked)}
        ${img}${b.id === 'six' ? '<span class="badge ok six-badge hidden">!</span>' : ''}
      </button>`;
    }).join('') + D.EV_SHOP.concat(D.CITY_SHOP).filter(x => x.kind === 'deco' && (placing || G.evUsed(x.id))).map(x => `<span class="ev-deco ${placing ? 'adm' : ''} ${x.flip ? 'flip' : ''}" data-deco="${x.id}" style="left:${x.x}%;top:${x.y}%;width:${x.w}%">${has(decoImg(x)) ? pic(decoImg(x)) : `<i>${x.emo}</i>`}</span>`).join('');
    hydrateIcons(inner);
    if (!placing) { liftPlaques(); inner.querySelectorAll('img').forEach(i => i.complete || i.addEventListener('load', liftPlaques, { once: true })); }
  }
  // les noms des bâtiments passent toujours devant les bâtiments : on les recopie dans un calque au-dessus de toute la ville
  function liftPlaques() {
    const inner = $('#map-inner'); if (!inner) return; const R = inner.getBoundingClientRect(); if (!R.width) return;
    let lay = inner.querySelector('.plq-layer'); if (!lay) { lay = document.createElement('div'); lay.className = 'plq-layer'; inner.appendChild(lay); }
    lay.innerHTML = [...inner.querySelectorAll('.bld')].map(b => { const p = b.querySelector('.plaque'); if (!p) return ''; p.style.visibility = 'hidden'; const r = p.getBoundingClientRect();
      const k = R.width / inner.offsetWidth || 1;   // la ville peut être zoomée : on revient à sa taille réelle
      return `<button class="bld plq-copy ${b.classList.contains('locked') ? 'locked' : ''}" data-act="bld" data-id="${b.dataset.id}" style="left:${(r.left + r.width / 2 - R.left) / k}px;top:${(r.top - R.top) / k}px">${p.outerHTML.replace('visibility: hidden;', '')}</button>`; }).join('');
  }
  window.addEventListener('resize', () => setTimeout(liftPlaques, 100));
  // panneau de la ville (dessiné en attendant une image) : il affiche l'événement en cours
  function sixBoardArt() {
    const ph = G.sixPhase(), line = ph === 'before' ? 'BIENTÔT' : ph === 'on' ? 'EN COURS' : 'TERMINÉ';
    return `<span class="six-board"><svg viewBox="0 0 160 130"><rect x="22" y="70" width="10" height="58" rx="3" fill="#6b4a2e" stroke="#2a1a10" stroke-width="3"/><rect x="128" y="70" width="10" height="58" rx="3" fill="#6b4a2e" stroke="#2a1a10" stroke-width="3"/>
      <rect x="6" y="6" width="148" height="82" rx="12" fill="#1b2a5c" stroke="#2a1a10" stroke-width="4"/><rect x="13" y="13" width="134" height="68" rx="8" fill="#fffdf6" stroke="#2a1a10" stroke-width="2"/>
      <ellipse cx="34" cy="47" rx="15" ry="10" fill="#c8743a" stroke="#2a1a10" stroke-width="2.5" transform="rotate(-30 34 47)"/><path d="M27 51 L41 43 M31 47 l2 3 M35 45 l2 3" stroke="#fff" stroke-width="1.8" fill="none" transform="rotate(0)"/>
      <text x="96" y="33" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="15" fill="#1b2a5c">TOURNOI DES</text><text x="96" y="55" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="20" fill="#e63946">6 QUARTIERS</text>
      <rect x="62" y="62" width="68" height="14" rx="7" fill="${ph === 'on' ? '#e63946' : ph === 'before' ? '#ffc933' : '#9a8a7a'}"/><text x="96" y="73" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="10" fill="#fff">${line}</text></svg></span>`;
  }
  function initPan() {
    const map = $('#map'); let drag = null, moved = 0;
    map.addEventListener('pointerdown', e => { if (placing && e.target.closest('.bld')) return; drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; moved = 0; });
    window.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy)); cam.x = drag.cx + dx; cam.y = drag.cy + dy; clampCam(); applyCam(); });
    window.addEventListener('pointerup', () => { drag = null; });
    map.addEventListener('click', e => { if (moved > 8) { e.stopPropagation(); e.preventDefault(); } }, true);
    window.addEventListener('resize', () => { layoutMap(); });
  }
  // ------------------------------------------------------------ La Tour : immobilier (loyers) + bourse (actions et dividendes)
  let towerTab = 'immo';
  function towerBody() {
    const s = st();
    if (towerTab === 'immo') {
      const card = p => { const o = G.props()[p.id], lock = s.lvl < p.lvl, pend = G.propPending(p.id), days = Math.round(p.price / p.rent);
        const art = has('item-' + p.id) ? pic('item-' + p.id) : `<span class="tw-emo">${p.icon}</span>`;
        if (o) { const v = Math.round(G.propValue(p.id) * (1 - D.PROP.sellFee)), d = v - o.paid;
          return `<div class="card tw-card own"><div class="tw-art">${art}</div><div class="grow"><b>${p.name}</b><small>Loyer : <b class="up">+${short(p.rent)}/jour</b></small><small>Vaut ${short(v)} à la revente · <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${short(Math.abs(d))}</span></small>
            <div class="tw-acts"><button class="btn xs green" data-act="propCollect" data-id="${p.id}" ${pend >= 1 ? '' : 'disabled'}>Encaisser ${short(pend)}</button><button class="btn xs red" data-act="propSell" data-id="${p.id}">Vendre</button></div></div></div>`; }
        return `<div class="card tw-card ${lock ? 'locked' : ''}"><div class="tw-art">${art}</div><div class="grow"><b>${p.name}</b><small>${p.desc}</small><small>Loyer <b class="up">+${short(p.rent)}/jour</b> · remboursé en ~${days} jours</small>
          <div class="tw-acts">${lock ? `<button class="btn xs" disabled>${ic('lock')} Niveau ${p.lvl}</button>` : `<button class="btn xs green" data-act="propBuy" data-id="${p.id}" ${s.cash >= p.price ? '' : 'disabled'}>Acheter ${short(p.price)}</button>`}</div></div></div>`; };
      return `<div class="price-explain"><small class="pe-title">L'immobilier, comment ça marche ?</small><div class="pe-story"><div class="pe-box buy"><small>1. Tu achètes</small><b>un bien</b></div><span class="pe-arr">→</span><div class="pe-box mid"><small>2. Chaque jour</small><b>un loyer</b></div><span class="pe-arr">→</span><div class="pe-box sell"><small>3. Tu encaisses</small><b>même absent</b></div></div>
        <small class="pe-foot">Les loyers s'accumulent jusqu'à ${D.PROP.maxDays} jours : passe les encaisser. Un bien prend un peu de valeur chaque jour, mais gare aux pépins de proprio.</small></div>${D.PROPS.map(card).join('')}`;
    }
    const b = G.bourse(), lock = s.lvl < D.BOURSE.lvl;
    const row = c => { const p = b.prices[c.id], h = b.hist[c.id], v = b.hold[c.id] * p * (1 - D.BOURSE.fee), g = v - b.cost[c.id];
      return `<div class="card st-card"><div class="st-top"><span class="st-sym" style="background:${c.color}">${has('item-st-' + c.id) ? pic('item-st-' + c.id) : c.sym}</span><div class="grow"><b>${c.name}</b><small>${c.sector}${c.div ? ` · dividende ${(c.div * 100).toFixed(1).replace('.', ',')} %/jour` : ' · pas de dividende'}</small></div>
        <div class="st-px"><b>${p < 100 ? p.toFixed(2).replace('.', ',') : Math.round(p)}<i class="cur"></i></b>${pct(p, h[0])}</div></div>${sparkSvg(h.slice(-60), 300, 30, p >= h[0] ? '#1f9d55' : '#d33')}
        ${v >= .5 ? `<small class="st-own">Tu en as pour <b>${short(v)}</b> · <span class="${g >= 0 ? 'up' : 'down'}">${g >= 0 ? '+' : '−'}${short(Math.abs(g))} ${g >= 0 ? 'de gagné' : 'de perdu'}</span></small>` : ''}
        <div class="st-acts">${[100, 500, 2000].map(x => `<button class="btn xs green" data-act="stockBuy" data-id="${c.id}" data-v="${x}" ${!lock && s.cash >= x ? '' : 'disabled'}>+${short(x)}</button>`).join('')}${v >= .5 ? `<button class="btn xs red" data-act="stockSell" data-id="${c.id}">Tout vendre</button>` : ''}</div></div>`; };
    return `<div class="price-explain"><small class="pe-title">La bourse, comment ça marche ?</small><div class="pe-story"><div class="pe-box buy"><small>1. Tu achètes</small><b>des actions</b></div><span class="pe-arr">→</span><div class="pe-box mid"><small>2. Chaque jour</small><b>dividendes</b></div><span class="pe-arr">→</span><div class="pe-box sell"><small>3. Tu revends</small><b>si ça a monté</b></div></div>
      <small class="pe-foot">Plus calme que la crypto. Les dividendes tombent tout seuls dans ton cash${b.divs >= 1 ? ` (déjà <b>+${short(b.divs)}</b> touchés)` : ''}. Frais : ${D.BOURSE.fee * 100} % à l'achat et à la vente.</small></div>
      ${lock ? `<p class="hint-line center">${ic('lock')} La bourse ouvre au niveau ${D.BOURSE.lvl}.</p>` : ''}${D.STOCKS.map(row).join('')}`;
  }
  function openTower(tab) { if (tab) towerTab = tab; openModal({ title: 'La Tour', icon: 'bld-tour', full: true, tabs: [{ id: 'immo', label: 'Immobilier' }, { id: 'bourse', label: 'Bourse' }], tab: towerTab, body: towerBody(), refresh: () => setBody(towerBody()), onTab: id => { towerTab = id; setBody(towerBody()); } }); }
  // ------------------------------------------------------------ Mon parking : tes voitures et motos garées sur leurs places
  function parkingBody() {
    const s = st(), cars = Object.keys(s.owned).flatMap(id => G.placeOf(id) === 'park' ? s.owned[id].map(() => G.item(id)) : []), n = G.garageSlots();
    // les voitures sur les places en épi, les motos sur la grande place du milieu : jamais l'une à la place de l'autre (sauf s'il n'y a plus de place du bon type)
    const P = D.PARK_SLOTS, motos = cars.filter(c => c.cat === 'moto'), autos = cars.filter(c => c.cat !== 'moto');
    const carSpots = P.car.concat(motos.length ? [] : [P.big]), motoSpots = P.moto.slice(0, motos.length ? P.moto.length : 0);
    const placed = autos.map((c, i) => [c, carSpots[i]]).concat(motos.map((m, i) => [m, motoSpots[i] || P.car[autos.length + i - motoSpots.length]]));
    const slots = placed.filter(([, p]) => p).sort((a, b) => a[1][1] - b[1][1]).map(([it, [x, y, w]]) =>
      `<button class="pk-car" data-act="itemInfo" data-id="${it.id}" aria-label="${esc(it.name)}" style="left:${x}%;top:${y}%;width:${w}%">${itemPic(it)}</button>`).join('');
    // pleine page comme l'appart : le parking remplit tout l'écran, la place reste calée sur le dessin quel que soit le téléphone
    return `<div class="park-full"><div class="pk-stage">${has('parking-bg') ? `<img class="pk-bg" src="${src('parking-bg')}" alt="">` : ''}${slots}</div>
      <div class="pk-foot"><span class="pk-count">${cars.length} / ${n} places</span><button class="btn green" data-act="goPlace" data-id="garage">Garage Prestige</button></div></div>`;
  }
  function openParking() { openModal({ title: 'Mon parking', icon: has('bld-parking') ? 'bld-parking' : 'bld-garage', full: true, theme: 'park', body: parkingBody(), refresh: () => setBody(parkingBody()) }); }
  function openBus() {
    const s = st();
    openModal({ title: 'Arrêt de bus', icon: has('ic-bus') ? 'ic-bus' : 'city', body: `<p class="hint-line">Le bus t'emmène dans les autres quartiers de la ville. Ils ouvriront au fur et à mesure que tu montes en niveau.</p>` +
      D.EXT_PLACES.map(b => { const lock = s.lvl < b.lvl;
        return `<button class="row ${lock ? 'locked' : ''}" ${lock ? 'disabled' : `data-act="goPlace" data-id="${b.id}"`} style="width:100%;text-align:left"><div style="width:64px;height:64px;flex:0 0 64px">${pic('bld-' + b.id, '🏙️')}</div>
        <div class="grow"><h4>${b.name}</h4><p>${b.tag}</p></div>${lock ? `<span class="rw-tag">${ic('lock')}Niveau ${b.lvl}</span>` : '<span class="btn xs green">Y aller</span>'}</button>`; }).join('') });
  }
  // ------------------------------------------------------------ back-office (adresse du jeu + #admin, ou l'ancien #placer)
  // On fait glisser les bâtiments et TOUS les objets de la ville (même ceux qu'on n'a pas achetés), on règle leur taille,
  // et un objet qui en chevauche un autre passe en rouge. « Publier » (seulement sur localhost) écrit js/layout.js
  // et le met en ligne pour tout le monde. En attendant, les réglages restent dans ce navigateur.
  let placing = false;
  const ADM_KEY = 'hustleCity.admin', admLocal = !!window.HC_DEV;
  const admSaved = () => { try { return JSON.parse(localStorage.getItem(ADM_KEY) || '{}'); } catch (e) { return {}; } };
  function placerMode() {
    if (!window.HC_DEV || (location.hash !== '#placer' && location.hash !== '#admin')) return;
    placing = true;
    // une seule fois : on oublie les vieux brouillons de placement (ils ont remis les décos à zéro le 03/10)
    try { if (!localStorage.getItem('hustleCity.admFix2')) { localStorage.removeItem(ADM_KEY); localStorage.setItem('hustleCity.admFix2', '1'); } } catch (e) {}
    const sv = admSaved(), old = (() => { try { return JSON.parse(localStorage.getItem('hustleCity.placer') || '{}'); } catch (e) { return {}; } })();
    D.BUILDINGS.forEach(b => Object.assign(b, old[b.id] || {}, (sv.buildings || {})[b.id] || {}));
    const decos = D.EV_SHOP.concat(D.CITY_SHOP).filter(x => x.kind === 'deco');
    decos.forEach(d => Object.assign(d, (sv.decos || {})[d.id] || {}));
    if (sv.slot) Object.assign(D.SLOT.ui, sv.slot);
    Object.entries(localVals()).forEach(([p, v]) => { try { setVal(p, v); } catch (e) {} });
    Object.entries(sv.club || {}).forEach(([id, p]) => { const z = D.CLUB.spots.find(x => x.id === id); if (z) Object.assign(z, p); });
    renderCity();
    $('#app').insertAdjacentHTML('beforeend', `<div id="placer" class="adm"><b>Back-office</b><span id="pl-cur">Fais glisser un bâtiment ou un objet</span>
      <span class="pl-size hidden"><button class="btn xs blue" id="pl-minus">−</button><button class="btn xs blue" id="pl-plus">+</button><button class="btn xs yellow" id="pl-flip">⇋ Miroir</button></span>
      <button class="btn xs blue" id="pl-room">Appart</button><button class="btn xs blue" id="pl-club">Club</button><button class="btn xs blue" id="pl-slot">Machine</button><button class="btn xs purple" id="pl-val">Valeurs</button><button class="btn xs purple" id="pl-test">Tests</button><button class="btn xs purple" id="pl-txt">✏️ Textes</button><button class="btn green xs" id="pl-pub">Publier</button><button class="btn xs" id="pl-reset">Annuler</button><textarea id="placer-out" readonly></textarea></div>`);
    const name = el => el.dataset.deco ? decos.find(d => d.id === el.dataset.deco).name : D.BUILDINGS.find(b => b.id === el.dataset.id).name;
    const box = el => { const r = (el.querySelector('.pic img, .pic, i') || el).getBoundingClientRect(), k = .18; return { l: r.left + r.width * k, r: r.right - r.width * k, t: r.top + r.height * k, b: r.bottom - r.height * k }; };
    const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    // chevauchements : un objet ne doit toucher ni un autre objet, ni un bâtiment
    const clashes = () => {
      const ds = [...$('#map-inner').querySelectorAll('.ev-deco')], bs = [...$('#map-inner').querySelectorAll('.bld:not(.spot)')], bad = new Set();
      ds.forEach((d, i) => { const r = box(d); ds.slice(i + 1).forEach(e => { if (hit(r, box(e))) { bad.add(d); bad.add(e); } }); bs.forEach(b => { if (hit(r, box(b))) bad.add(d); }); });
      ds.forEach(d => d.classList.toggle('clash', bad.has(d))); return [...bad].map(name);
    };
    const data = () => ({ buildings: Object.fromEntries(D.BUILDINGS.map(b => [b.id, { x: b.x, y: b.y, w: b.w, flip: !!b.flip }])), decos: Object.fromEntries(decos.map(d => [d.id, { x: d.x, y: d.y, w: d.w, flip: !!d.flip }])) });
    const save = () => { const o = data(); try { localStorage.setItem(ADM_KEY, JSON.stringify(o)); } catch (e) {} $('#placer-out').value = JSON.stringify(o); };
    let cur = null, sel = null;
    const show = () => { if (!sel) return; const o = sel.dataset.deco ? decos.find(d => d.id === sel.dataset.deco) : D.BUILDINGS.find(b => b.id === sel.dataset.id); $('#pl-cur').textContent = `${o.name.replace(/^(Le|La|Mon) /, '')} · x${o.x} y${o.y}${o.w ? ' · taille ' + o.w : ''}${o.flip ? ' · miroir' : ''}`; $('.pl-size').classList.toggle('hidden', false); };
    $('#map-inner').addEventListener('pointerdown', e => {
      const el = e.target.closest('.bld, .ev-deco'); if (!el) return;
      const r = $('#map-inner').getBoundingClientRect(), o = el.dataset.deco ? decos.find(d => d.id === el.dataset.deco) : D.BUILDINGS.find(x => x.id === el.dataset.id);
      cur = { el, o, dx: o.x - (e.clientX - r.left) / r.width * 100, dy: o.y - (e.clientY - r.top) / r.height * 100 };
      $('#map-inner').querySelectorAll('.adm-sel').forEach(x => x.classList.remove('adm-sel')); sel = el; el.classList.add('dragging', 'adm-sel'); show(); e.preventDefault(); e.stopPropagation();
    }, true);
    window.addEventListener('pointermove', e => {
      if (!cur) return; const r = $('#map-inner').getBoundingClientRect();
      cur.o.x = Math.round(((e.clientX - r.left) / r.width * 100 + cur.dx) * 2) / 2; cur.o.y = Math.round(((e.clientY - r.top) / r.height * 100 + cur.dy) * 2) / 2;
      cur.el.style.left = cur.o.x + '%'; cur.el.style.top = cur.o.y + '%'; show(); clashes();
    });
    window.addEventListener('pointerup', () => { if (cur) { cur.el.classList.remove('dragging'); cur = null; save(); clashes(); } });
    const selObj = () => sel && (sel.dataset.deco ? decos.find(x => x.id === sel.dataset.deco) : D.BUILDINGS.find(b => b.id === sel.dataset.id));
    const size = k => { const d = selObj(); if (!d) return; d.w = Math.max(3, Math.min(sel.dataset.deco ? 30 : 60, Math.round((d.w + k) * 2) / 2)); sel.style.width = d.w + '%'; show(); save(); clashes(); };
    const flip = () => { const d = selObj(); if (!d) return; d.flip = !d.flip; sel.classList.toggle('flip', d.flip); save(); };
    $('#pl-minus').onclick = () => size(-.5); $('#pl-plus').onclick = () => size(.5); $('#pl-flip').onclick = flip;
    $('#pl-room').onclick = () => setScene('appart');
    $('#pl-club').onclick = () => openClub();
    $('#pl-val').onclick = () => openValues();
    $('#pl-test').onclick = () => openModal({ title: 'Tests', icon: 'gear', body: testsBody() });
    $('#pl-slot').onclick = () => { if (!has('casino-machine')) return toast('L\'image de la machine à sous n\'est pas encore faite.'); window.CASINO.open('slot'); };
    $('#pl-txt').onclick = () => { textEdit = !textEdit; $('#pl-txt').classList.toggle('green', textEdit); $('#app').classList.toggle('txt-edit', textEdit); toast(textEdit ? 'Touche un texte pour le changer. Re-touche ✏️ Textes pour rejouer normalement.' : 'Mode textes coupé.'); };
    $('#app').insertAdjacentHTML('afterbegin', '<div id="admin-banner">🛠️ MODE ADMIN · rien ne change chez les joueurs avant « Publier » <button id="adm-quit">Quitter</button></div>');
    $('#adm-quit').onclick = () => { history.replaceState(null, '', location.href.split('#')[0]); location.reload(); };
    $('#pl-pub').onclick = () => publishLayout(clashes);
    $('#pl-reset').onclick = () => { if (!confirm('Annuler tous tes réglages pas encore publiés ?')) return; try { localStorage.removeItem(ADM_KEY); localStorage.removeItem('hustleCity.placer'); localStorage.removeItem('hustleCity.roomPlacer2'); localStorage.removeItem(TXT_KEY); localStorage.removeItem(VAL_KEY); } catch (e) {} location.reload(); };
    save(); setTimeout(clashes, 300);
  }
  // ------------------------------------------------------------ textes modifiables (back-office, bouton ✏️ Textes)
  // On remplace un texte affiché par un autre : « texte d'origine » → « nouveau texte ». Ça marche pour tout texte fixe
  // (titres, boutons, menus, explications). Publié dans js/layout.js (texts) : appliqué chez tout le monde.
  const TXT_KEY = 'hustleCity.adminTexts';
  let textEdit = false;
  const localTexts = () => { try { return JSON.parse(localStorage.getItem(TXT_KEY) || '{}'); } catch (e) { return {}; } };
  const allTexts = () => Object.assign({}, (window.LAYOUT && window.LAYOUT.texts) || {}, placing ? localTexts() : {});
  let TX = allTexts();
  const origOf = new WeakMap();
  function applyTexts(root) {
    if (!Object.keys(TX).length || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const v = n.nodeValue, k = v.trim(); if (k && Object.prototype.hasOwnProperty.call(TX, k) && TX[k] !== k) { origOf.set(n, k); n.nodeValue = v.replace(k, TX[k]); } }
  }
  new MutationObserver(ms => { if (!Object.keys(TX).length) return; ms.forEach(m => m.type === 'characterData' ? applyTexts(m.target.parentNode) : m.addedNodes.forEach(x => x.nodeType === 3 ? applyTexts(x.parentNode) : x.nodeType === 1 && applyTexts(x))); })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
  setTimeout(() => applyTexts(document.body), 0);
  document.addEventListener('click', e => {
    if (!textEdit || e.target.closest('#placer, #admin-banner, #rplacer')) return;
    const el = e.target; const tn = [...el.childNodes].find(x => x.nodeType === 3 && x.nodeValue.trim()); if (!tn) return;
    e.preventDefault(); e.stopPropagation();
    const cur = tn.nodeValue.trim(), orig = origOf.get(tn) || Object.keys(TX).find(k => TX[k] === cur) || cur;
    const nv = prompt(`Texte d'origine :\n« ${orig} »\n\nNouveau texte (vide = remettre l'original) :`, cur);
    if (nv == null) return;
    const L = localTexts(); if (nv.trim() && nv.trim() !== orig) L[orig] = nv.trim(); else L[orig] = orig;
    try { localStorage.setItem(TXT_KEY, JSON.stringify(L)); } catch (er) {}
    TX = allTexts(); tn.nodeValue = tn.nodeValue.replace(cur, TX[orig] || orig); origOf.set(tn, orig);
    toast('Texte changé. Pense à « Publier ».');
  }, true);

  // ------------------------------------------------------------ éditeur de valeurs (back-office, bouton « Valeurs ») : prix, niveaux, effets, textes d'offres
  // chemin « TABLE#id.champ » / « TABLE.position.champ » ; appliqué tout de suite ici, publié dans layout.js (values)
  const VAL_KEY = 'hustleCity.adminValues';
  const localVals = () => { try { return JSON.parse(localStorage.getItem(VAL_KEY) || '{}'); } catch (e) { return {}; } };
  const allVals = () => Object.assign({}, (window.LAYOUT && window.LAYOUT.values) || {}, placing ? localVals() : {});
  const VTAB = () => ({ CITY_SHOP: D.CITY_SHOP, IAP: D.IAP, PROMOS: D.PROMOS, AGENCE: D.AGENCE, CLUB: D.CLUB, RIG: D.RIG, PCS: D.PCS, ROOMS: D.ROOMS });
  function valObj(path) { const [t, ...rest] = path.split('.'); const [tn, id] = t.split('#'); let o = VTAB()[tn]; if (id) o = (Array.isArray(o) ? o : o.gear).find(x => x.id === id); for (let i = 0; i < rest.length - 1; i++) o = o[rest[i]]; return [o, rest[rest.length - 1]]; }
  function setVal(path, v) { const [o, k] = valObj(path); if (o) o[k] = v; }
  function valSchema() {
    const G_ = [], f = (path, label, type = 'num') => ({ path, label, type });
    G_.push({ t: '🛍️ Boutique : décos de la ville', rows: D.CITY_SHOP.map(x => ({ n: x.emo + ' ' + x.name, f: [f(`CITY_SHOP#${x.id}.name`, 'Nom', 'text'), f(`CITY_SHOP#${x.id}.${x.lingots ? 'lingots' : 'cash'}`, x.lingots ? 'Prix (lingots)' : 'Prix'), f(`CITY_SHOP#${x.id}.lvl`, 'Niveau')] })) });
    G_.push({ t: '📸 PrivéFans : objets', rows: D.AGENCE.gear.map(g => ({ n: g.icon + ' ' + g.name, f: [f(`AGENCE#${g.id}.name`, 'Nom', 'text'), f(`AGENCE#${g.id}.cost`, g.sub ? 'Prix / jour' : 'Prix'), f(`AGENCE#${g.id}.rev`, 'Revenus %', 'pct'), f(`AGENCE#${g.id}.subs`, 'Abonnés %', 'pct'), f(`AGENCE#${g.id}.mood`, 'Moral / h')] })) });
    G_.push({ t: '💎 Promos (une par jour)', rows: D.PROMOS.map((p, i) => ({ n: p.title, f: [f(`PROMOS.${i}.title`, 'Titre', 'text'), f(`PROMOS.${i}.desc`, 'Détail', 'text'), f(`PROMOS.${i}.off`, 'Réduction %')] })) });
    G_.push({ t: '💳 Achats intégrés', rows: D.IAP.map((x, i) => ({ n: x.name, f: [f(`IAP.${i}.name`, 'Nom', 'text'), f(`IAP.${i}.price`, 'Prix affiché', 'text'), ...(x.n ? [f(`IAP.${i}.n`, 'Lingots')] : [f(`IAP.${i}.desc`, 'Détail', 'text')])] })) });
    G_.push({ t: '🎉 Le Club', rows: [{ n: 'Prix', f: [f('CLUB.entryBase', 'Entrée (base)'), f('CLUB.entryPer', 'Entrée + par niveau'), f('CLUB.drinkBase', 'Cocktail (base)'), f('CLUB.drinkPer', 'Cocktail + par niveau'), f('CLUB.djTip', 'Pourboire DJ'), f('CLUB.vipLingots', 'Carré VIP (lingots)'), f('CLUB.nightMin', 'Durée soirée (min)'), f('CLUB.cooldownMin', 'Attente videur (min)')] }] });
    G_.push({ t: '⛏️ Machines à miner', rows: D.RIG.map((r, i) => ({ n: `${i + 1}. ${r.name}`, f: [f(`RIG.${i}.name`, 'Nom', 'text'), f(`RIG.${i}.cost`, 'Prix'), f(`RIG.${i}.heatMin`, 'Endurance (min)')] })) });
    G_.push({ t: '🖥️ PC', rows: D.PCS.map((r, i) => ({ n: `${i + 1}. ${r.name}`, f: [f(`PCS.${i}.name`, 'Nom', 'text'), f(`PCS.${i}.cost`, 'Prix'), f(`PCS.${i}.fee`, 'Frais %', 'pct')] })) });
    G_.push({ t: '🏠 Chambres', rows: D.ROOMS.map((r, i) => ({ n: `${i + 1}. ${r.name}`, f: [f(`ROOMS.${i}.name`, 'Nom', 'text'), f(`ROOMS.${i}.cost`, 'Prix'), f(`ROOMS.${i}.slots`, 'Places')] })) });
    return G_;
  }
  const valOpen = new Set();
  function valuesBody() {
    const L = localVals();
    return `<p class="hint-line">Change un chiffre ou un texte : c'est appliqué tout de suite ici. Les joueurs ne le voient qu'après <b>Publier</b>. Les champs modifiés sont en jaune.</p>` +
      valSchema().map((g, gi) => `<div class="card val-g"><button class="val-h" data-act="valToggle" data-i="${gi}">${g.t}<i>${valOpen.has(gi) ? '▾' : '▸'}</i></button>${valOpen.has(gi) ? g.rows.map(r => `<div class="val-row"><b>${esc(r.n)}</b><div class="val-f">${r.f.map(x => {
        const [o, k] = valObj(x.path), v = o ? o[k] : '', shown = x.type === 'pct' ? (v ? Math.round(v * 1000) / 10 : '') : v == null ? '' : v;
        return `<label class="${L[x.path] !== undefined ? 'chg' : ''}"><small>${x.label}</small><input data-vpath="${x.path}" data-vtype="${x.type}" type="${x.type === 'text' ? 'text' : 'number'}" step="any" value="${esc(String(shown))}"></label>`; }).join('')}</div></div>`).join('') : ''}</div>`).join('') +
      `<div class="grid2" style="margin-top:8px"><button class="btn red" data-act="valReset">Annuler mes changements</button><button class="btn green" data-act="valPub">Publier</button></div>`;
  }
  function openValues() { openModal({ title: 'Valeurs du jeu', icon: 'gear', full: true, body: valuesBody() }); }
  document.addEventListener('change', e => {
    const el = e.target.closest && e.target.closest('[data-vpath]'); if (!el || !placing) return;
    const t = el.dataset.vtype, raw = el.value; let v = t === 'text' ? raw : parseFloat(String(raw).replace(',', '.'));
    if (t !== 'text' && !isFinite(v)) return toast('Il faut un nombre.', true);
    if (t === 'pct') v = v / 100;
    const L = localVals(); L[el.dataset.vpath] = v; try { localStorage.setItem(VAL_KEY, JSON.stringify(L)); } catch (er) {}
    setVal(el.dataset.vpath, v); el.closest('label').classList.add('chg'); renderCity(); renderHud();
  });

  // ------------------------------------------------------------ back-office : panneau « Tests » (essayer chaque fonction sans attendre)
  const TESTS = [
    ['💰 +1 000 de cash', () => G.addCash(1000)], ['🪙 +50 lingots', () => G.addLingots(50)], ['⭐ +1 niveau', () => G.addXp(Math.max(1, G.xpNeed() - st().xp))],
    ['⛏️ Finir le minage', () => { const m = st().mine; if (!m) return 'Aucun minage en cours.'; m.start -= m.dur; }],
    ['🌡️ Machine à 90 %', () => { const m = st().mine; if (!m) return 'Aucun minage en cours.'; const o = D.MINE.find(x => x.id === m.id); m.cool = 0; m.start = Date.now() - Math.min(m.dur - 60000, .9 * D.RIG[m.lvl].heatMin / o.heat * 60000); }],
    ['🎁 Offre du jour (pop-up)', () => offerToday(true)],
    ['⚡ Alerte flash', () => { const c = st().crypto; c.flash = null; c.nextFlash = 1; }],
    ['📰 Actu crypto', () => { st().crypto.nextNews = 1; }],
    ['📈 Tuyau crypto d\'un pote', () => { st().crypto.moodUntil = Date.now() + 5 * 60000; st().nextCryptoTipAt = 1; }],
    ['⚽ Tuyau match d\'un pote', () => { st().nextTipAt = 1; }],
    ['🤝 Bon plan', () => { st().deal = null; st().nextDealAt = 0; }],
    ['🛍️ Rumeur au Comptoir', () => { st().market.nextRumor = Date.now(); }],
    ['🎉 Mini-événement', () => { st().event = null; st().nextEventAt = 0; }],
    ['📩 Dilemme PrivéFans', () => { const a = st().agence; if (!a || !a.crew.length) return 'Lance d\'abord PrivéFans (niveau 6).'; a.dil = null; a.nextDil = 1; window.AGENCE && AGENCE.sim(); }],
    ['🔁 Perso garçon / fille', () => { const g = (D.SKINS.find(k => k.id === st().skin) || D.SKINS[0]).g; st().skin = g === 'f' ? 'survet' : 'doudoune'; renderHud(); }],
    ['🎃 Coupe : +200 points', () => { if (G.cdmPhase() !== 'on') return 'La Coupe des Morts n\'est pas en cours (dates au back office, ou #cdm-test).'; if (!G.cdmState().team) return 'Choisis d\'abord ton camp au Panneau.'; G.cdmAdd(200, 'test'); }],
    ['🎃 Coupe : défis de la nuit réussis', () => { if (G.cdmPhase() !== 'on' || !G.cdmState().team) return 'Coupe pas en cours, ou camp pas choisi.'; G.cdmNight().list.forEach(c => { c.base = (st().stats[c.k] || 0) - c.goal; }); }],
    ['🎃 Coupe : revoir le choix du camp', () => { const S = G.cdmState(); S.team = null; S.night = null; }],
    ['🎓 Revoir le tutoriel', () => { if (!confirm('Relancer le tutoriel depuis le début ?')) return 'Annulé.'; st().tutoDone = false; st().tutoStep = 0; st().bldTuto = {}; G.save(); location.hash = ''; location.reload(); }]
  ];
  function testsBody() { return `<p class="hint-line">Pour essayer chaque fonction sans attendre. Ça ne touche que <b>ta</b> partie, rien n'est publié.</p><div class="grid2 tests">${TESTS.map((t, i) => `<button class="btn blue sm" data-act="admTest" data-i="${i}">${t[0]}</button>`).join('')}</div>`; }

  // Publier : bâtiments + objets de la ville + disposition des 3 chambres + textes, pour tout le monde
  async function publishLayout(clashes) {
    const bad = clashes ? clashes() : [];
    if (bad.length) return toast(`Pas publié : ${[...new Set(bad)].join(', ')} ${bad.length > 1 ? 'se chevauchent' : 'chevauche quelque chose'}. Décale-les d'abord.`, true);
    const sv = admSaved(), rooms = D.ROOMS.map((_, i) => roomLayout(i));
    // on publie TOUJOURS l'état complet (ce qui est affiché), jamais seulement ce que ce navigateur a retenu :
    // sinon une publication faite depuis la chambre envoyait « aucune déco » et tout revenait à sa place d'origine
    const decoAll = D.EV_SHOP.concat(D.CITY_SHOP).filter(x => x.kind === 'deco');
    const body = { buildings: Object.fromEntries(D.BUILDINGS.map(b => [b.id, { x: b.x, y: b.y, w: b.w, flip: !!b.flip }])), decos: Object.fromEntries(decoAll.map(d => [d.id, { x: d.x, y: d.y, w: d.w, flip: !!d.flip }])), rooms, values: allVals(), slot: D.SLOT.ui, club: Object.fromEntries(D.CLUB.spots.map(p => [p.id, { x: p.x, y: p.y, w: p.w, h: p.h }])), texts: allTexts() };
    if (!admLocal) { try { await navigator.clipboard.writeText(JSON.stringify(body)); } catch (e) {} return toast('Publier marche seulement sur ton Mac (localhost:5190). Réglages copiés : colle-les à Claude.'); }
    toast('Publication en cours…');
    try {
      const r = await fetch('/admin/layout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), j = await r.json();
      if (!r.ok) return toast(j.err || 'La publication a échoué.', true);
      try { localStorage.removeItem(ADM_KEY); localStorage.removeItem('hustleCity.placer'); localStorage.removeItem('hustleCity.roomPlacer2'); localStorage.removeItem(TXT_KEY); localStorage.removeItem(VAL_KEY); } catch (e) {}
      if (window.LAYOUT) { window.LAYOUT.texts = body.texts; window.LAYOUT.values = body.values; }
      toast('Publié ! Le jeu en ligne se met à jour d\'ici une minute.');
    } catch (e) { toast('Le serveur du jeu n\'a pas répondu : relance « node tools/serve.js ».', true); }
  }
  // mode placement de la chambre : adresse du jeu + #placer-appart. On fait glisser le PC, la machine et les places des étagères.
  // on peut l'ouvrir de 3 façons : l'adresse avec #placer-appart, un changement d'adresse sans recharger, ou les Réglages
  window.addEventListener('hashchange', () => { if (location.hash === '#placer-appart') roomPlacer(true); else if (location.hash === '#placer' || location.hash === '#admin' || location.hash === '#test' || location.hash === '#neuf' || G.TEST || placing) location.reload(); });
  // ------------------------------------------------------------ éditeur de chambre (back-office) : les 3 chambres, chaque objet
  // déplacer (doigt ou flèches), taille, miroir, aperçu de chaque niveau de PC / machine, copie vers les autres chambres, publier
  const curG = () => (D.SKINS.find(k => k.id === st().skin) || D.SKINS[0]).g;
  const RP_NAME = k => k === 'pc' ? '🖥️ PC' : k === 'rig' ? '⛏️ Machine' : k === 'light' ? '💻 Ordi PrivéFans (lit)' : k === 'shelf' ? '📚 Toutes les étagères' : `📦 Place ${+k.slice(4) + 1}`;
  function roomPlacer(force) {
    if (!window.HC_DEV || (!force && location.hash !== '#placer-appart')) return;
    if (RP.on || !st().skin) return;
    closeModal(); RP.on = true; RP.room = st().room; RP.L = roomLayout(RP.room); RP.sel = RP.sel || 'pc';
    RP.pv = RP.pv || { pc: G.pcLvl(), rig: st().rig.lvl }; setScene('appart');
    const objs = () => ['pc', 'rig', 'light', 'shelf', ...RP.L.slots.slice(0, D.ROOMS[RP.room].slots).map((_, i) => 'slot' + i)];
    $('#app').insertAdjacentHTML('beforeend', `<div id="rplacer" class="${RP.top ? 'top' : ''} ${RP.more ? 'more' : ''}">
      <div class="rp-row"><select id="rp-sel"></select><button class="btn xs" data-n="-1,0">←</button><button class="btn xs" data-n="0,-1">↑</button><button class="btn xs" data-n="0,1">↓</button><button class="btn xs" data-n="1,0">→</button>
        <button class="btn xs" id="rp-minus">−</button><button class="btn xs" id="rp-plus">+</button><button class="btn xs" id="rp-flip">↔</button><button class="btn xs purple" id="rp-more">⋯</button></div>
      <div class="rp-row rp-x"><b>Chambre</b>${D.ROOMS.map((x, i) => `<button class="btn xs rp-room" data-i="${i}">${i + 1}</button>`).join('')}<button class="btn xs purple" id="rp-g"></button>
        <small>PC</small>${D.PCS.map((x, i) => `<button class="btn xs rp-pv" data-k="pc" data-i="${i}">${i + 1}</button>`).join('')}<small>Mach.</small>${D.RIG.map((x, i) => `<button class="btn xs rp-pv" data-k="rig" data-i="${i}">${i + 1}</button>`).join('')}</div>
      <div class="rp-row rp-x"><span id="rp-cur"></span><button class="btn xs" id="rp-one" title="Remettre cet objet">⟲</button></div>
      <div class="rp-row rp-x"><button class="btn xs blue" id="rp-copyto">Copier vers les autres chambres</button><button class="btn xs red" id="rp-reset">↺ Chambre</button><button class="btn xs" id="rp-move" title="Haut / bas">⇅</button><button class="btn xs green" id="rp-copy">Publier</button><button class="btn xs blue" id="rp-close">Fini</button></div>
      <textarea id="rp-out" readonly></textarea></div>`);
    $('#rp-more').onclick = () => { RP.more = !RP.more; $('#rplacer').classList.toggle('more', RP.more); };
    const save = () => { const all = roomSaved(); all[RP.room] = RP.L; try { localStorage.setItem('hustleCity.roomPlacer2', JSON.stringify(all)); } catch (e) {} };
    const cur = () => { const k = RP.sel; if (k === 'shelf') return { x: '–', y: '–', w: RP.L.shelf.w }; if (k.startsWith('slot')) { const p = RP.L.slots[+k.slice(4)]; return { x: p[0], y: p[1], w: RP.L.shelf.w }; } return RP.L[k]; };
    const out = () => {
      save(); const o = cur();
      $('#rp-sel').innerHTML = objs().map(k => `<option value="${k}" ${k === RP.sel ? 'selected' : ''}>${RP_NAME(k)}</option>`).join('');
      $('#rp-cur').textContent = `x ${o.x} · y ${o.y} · taille ${o.w}${o.flip ? ' · miroir' : ''}`;
      $('#rp-g').textContent = (RP.g || curG()) === 'f' ? '♀ Fille' : '♂ Garçon';
      document.querySelectorAll('.rp-room').forEach(b => b.classList.toggle('green', +b.dataset.i === RP.room));
      document.querySelectorAll('.rp-pv').forEach(b => b.classList.toggle('yellow', +b.dataset.i === RP.pv[b.dataset.k]));
      $('#rp-flip').classList.toggle('yellow', !!o.flip); $('#rp-flip').disabled = RP.sel === 'shelf' || RP.sel.startsWith('slot');
    };
    const redraw = () => { renderAppart(); out(); };
    RP.out = out; redraw();
    document.querySelectorAll('.rp-room').forEach(b => b.onclick = () => { RP.room = +b.dataset.i; RP.L = roomLayout(RP.room); if (!objs().includes(RP.sel)) RP.sel = 'pc'; redraw(); });
    document.querySelectorAll('.rp-pv').forEach(b => b.onclick = () => { RP.pv[b.dataset.k] = +b.dataset.i; redraw(); });
    $('#rp-g').onclick = () => { RP.g = (RP.g || curG()) === 'f' ? 'm' : 'f'; redraw(); };
    $('#rp-sel').onchange = e => { RP.sel = e.target.value; redraw(); };
    const nudge = (dx, dy) => { const k = RP.sel, st = .5; if (k === 'shelf') RP.L.slots = RP.L.slots.map(([x, y]) => [x + dx * st, y + dy * st]); else if (k.startsWith('slot')) { const p = RP.L.slots[+k.slice(4)]; p[0] += dx * st; p[1] += dy * st; } else { RP.L[k].x += dx * st; RP.L[k].y += dy * st; } redraw(); };
    document.querySelectorAll('#rplacer [data-n]').forEach(b => b.onclick = () => { const [dx, dy] = b.dataset.n.split(',').map(Number); nudge(dx, dy); });
    const size = d => { if (RP.sel === 'shelf' || RP.sel.startsWith('slot')) { RP.L.shelf.w = Math.max(2, Math.round((RP.L.shelf.w + d / 2) * 10) / 10); RP.L.shelf.h = Math.round(RP.L.shelf.w * .77 * 10) / 10; } else RP.L[RP.sel].w = Math.max(3, Math.round((RP.L[RP.sel].w + d / 2) * 10) / 10); redraw(); };
    $('#rp-minus').onclick = () => size(-1); $('#rp-plus').onclick = () => size(1);
    $('#rp-flip').onclick = () => { const o = RP.L[RP.sel]; if (o && !RP.sel.startsWith('slot')) { o.flip = !o.flip; redraw(); } };
    $('#rp-one').onclick = () => { const all = roomSaved(); const base = (delete all[RP.room], localStorage.setItem('hustleCity.roomPlacer2', JSON.stringify(all)), roomLayout(RP.room));
      const k = RP.sel; if (k === 'shelf') { RP.L.slots = base.slots; RP.L.shelf = base.shelf; } else if (k.startsWith('slot')) RP.L.slots[+k.slice(4)] = base.slots[+k.slice(4)]; else RP.L[k] = base[k]; redraw(); };
    $('#rp-copyto').onclick = () => { if (!confirm(`Copier la disposition de la chambre ${RP.room + 1} vers les 2 autres ?`)) return; const all = roomSaved(); D.ROOMS.forEach((_, i) => { if (i !== RP.room) all[i] = JSON.parse(JSON.stringify(RP.L)); }); try { localStorage.setItem('hustleCity.roomPlacer2', JSON.stringify(all)); } catch (e) {} toast('Copié dans les 3 chambres. Pense à « Publier ».'); };
    $('#rp-copy').onclick = () => publishLayout();
    $('#rp-move').onclick = () => { RP.top = !RP.top; $('#rplacer').classList.toggle('top', RP.top); };
    $('#rp-close').onclick = () => { RP.on = false; RP.drag = null; RP.g = null; $('#rplacer')?.remove(); if (location.hash === '#placer-appart') history.replaceState(null, '', location.href.split('#')[0]); renderAppart(); if (placing) setScene('city'); };
    $('#rp-reset').onclick = () => { if (!confirm('Remettre toute cette chambre comme à l\'origine ?')) return; const all = roomSaved(); delete all[RP.room]; try { localStorage.setItem('hustleCity.roomPlacer2', JSON.stringify(all)); } catch (e) {} RP.L = roomLayout(RP.room); redraw(); };
    if (RP.bound) return; RP.bound = true;
    $('#scene-appart').addEventListener('pointerdown', e => {
      if (!RP.on) return;
      const t = e.target.closest('[data-rp]'); if (!t) return;
      e.preventDefault(); e.stopPropagation(); RP.sel = t.dataset.rp;
      const st2 = $('#scene-appart .room-stage').getBoundingClientRect(), k = RP.sel, o = k.startsWith('slot') ? RP.L.slots[+k.slice(4)] : [RP.L[k].x, RP.L[k].y];
      $('#rplacer')?.classList.add('ghost');
      RP.drag = { st2, dx: o[0] - (e.clientX - st2.left) / st2.width * 100, dy: o[1] - (e.clientY - st2.top) / st2.height * 100 };
      renderAppart(); RP.out();
    }, true);
    window.addEventListener('pointermove', e => {
      if (!RP.drag) return; const { st2, dx, dy } = RP.drag, k = RP.sel;
      const x = Math.round(((e.clientX - st2.left) / st2.width * 100 + dx) * 2) / 2, y = Math.round(((e.clientY - st2.top) / st2.height * 100 + dy) * 2) / 2;
      if (k.startsWith('slot')) RP.L.slots[+k.slice(4)] = [x, y]; else { RP.L[k].x = x; RP.L[k].y = y; }
      renderAppart(); RP.out();
    });
    window.addEventListener('pointerup', () => { if (RP.drag) { RP.drag = null; $('#rplacer')?.classList.remove('ghost'); RP.out(); } });
  }
  function openBuilding(id) {
    if (id === 'six') return openSix();
    if (id === 'kiosque') return openKiosk();
    if (id === 'bus') return openBus();
    if (id === 'parking') return openParking();
    if (id === 'club' && st().lvl >= D.CLUB.lvl) return openClub();
    const b = D.BUILDINGS.find(x => x.id === id);
    if (st().lvl < b.lvl) return;   // la plaque du bâtiment affiche déjà le niveau
    if (id === 'appart') return setScene('appart');
    if (id === 'balto') return window.BALTO.open();
    if (id === 'casino') return window.CASINO.open();
    if (id === 'shop') return openShop();
  }

  // ------------------------------------------------------------ appart
  let scene = 'city';
  function setScene(s) {
    scene = s;
    $('#scene-city').classList.toggle('hidden', s !== 'city');
    $('#scene-appart').classList.toggle('hidden', s !== 'appart');
    $('#app').classList.toggle('in-appart', s === 'appart');
    const btn = $('#btn-scene');
    btn.querySelector('b').textContent = s === 'city' ? 'Appart' : 'Ville';
    btn.querySelector('.ic').outerHTML = ic(s === 'city' ? 'home' : 'city');
    if (s === 'appart') renderAppart();
    renderHud();
    if (placing) { if (s === 'appart' && !RP.on) setTimeout(() => roomPlacer(true), 0); if (s !== 'appart' && RP.on) $('#rp-close')?.click(); }
  }
  // ------------------------------------------------------------ appart : chaque objet affiche une bulle qui dit ce qu'il fait
  // disposition d'une chambre : celle du jeu, ou celle réglée à la main (mode #placer-appart, gardée dans ce navigateur)
  const roomSaved = () => { try { return JSON.parse(localStorage.getItem('hustleCity.roomPlacer2') || '{}'); } catch (e) { return {}; } };
  function roomLayout(i) {
    const base = D.ROOM_LAYOUT[i], sv = roomSaved()[i] || {};
    return { pc: Object.assign({}, base.pc, sv.pc), rig: Object.assign({}, base.rig, sv.rig), light: Object.assign({ x: 84, y: 58, w: 13 }, base.light, sv.light), shelf: Object.assign({}, base.shelf, sv.shelf), slots: sv.slots || base.slots || D.SHELF_SLOTS.map(x => x.slice()) };
  }
  const RP = { on: false, room: 0, sel: 'pc', drag: null };
  // bulle de l'objet PrivéFans (ordi portable sur le lit) : ce qu'il y a à encaisser, ou une alerte
  function agBubble() {
    const A_ = window.AGENCE; if (!A_ || !A_.unlocked()) return '';
    if (A_.offer()) return `<button class="obj-bubble hot" data-act="agence"><span><b>${ico('app-msg', '📩')} Elle hésite à partir</b><small>Touche vite</small></span></button>`;
    const p = A_.pending(), me = (D.SKINS.find(k => k.id === st().skin) || D.SKINS[0]).g === 'f';
    if (!st().agence || !st().agence.crew.length) return `<button class="obj-bubble" data-act="agence"><span><small>PrivéFans</small><b>${me ? 'Lance ta page' : 'Ouvre ton agence'}</b></span></button>`;
    return `<button class="obj-bubble ${p >= 1 ? 'up' : ''}" data-act="agence"><span><small>PrivéFans</small><b>${p >= 1 ? `+${short(p)} à encaisser` : 'Ouvrir'}</b></span></button>`;
  }
  const BUBBLE_GAP = 1.2;   // écart (en % de la hauteur de la chambre) entre le haut de l'objet et la pointe de sa bulle
  window.addEventListener('resize', () => placeBubbles());
  function placeBubbles() {
    const stage = document.querySelector('#scene-appart .room-stage'); if (!stage) return;
    const R = stage.getBoundingClientRect(); if (!R.width) return;
    stage.querySelectorAll('.bubble-at[data-for]').forEach(b => {
      const k = b.dataset.for;
      const els = k === 'shelf' ? [...stage.querySelectorAll('.shelf-item')] : [stage.querySelector(`.room-obj[data-rp="${k}"]`)].filter(Boolean);
      if (!els.length) return;
      const rs = els.map(e => { const img = e.querySelector('img') || e; return img.getBoundingClientRect(); });
      // pour l'étagère : la rangée du haut (les objets les plus hauts), centrée sur toute l'étagère
      const top = Math.min(...rs.map(r => r.top)), row = k === 'shelf' ? rs.filter(r => r.top < top + 8) : rs;
      const cx = k === 'shelf' ? (() => { const sl = (RP.on ? RP.L : roomLayout(st().room)).slots.slice(0, 4); return (Math.min(...sl.map(p => p[0])) + Math.max(...sl.map(p => p[0]))) / 2; })()
        : ((Math.min(...row.map(r => r.left)) + Math.max(...row.map(r => r.right))) / 2 - R.left) / R.width * 100;
      b.style.left = cx + '%'; b.style.top = ((top - R.top) / R.height * 100 - BUBBLE_GAP) + '%';
    });
    // règle prioritaire : jamais deux bulles collées. On les écarte (chacune de la moitié), en restant dans la pièce.
    const MIN = 8, bs = [...stage.querySelectorAll('.bubble-at[data-for]')].filter(b => b.offsetWidth);
    for (let pass = 0; pass < 4; pass++) {
      const box = bs.map(b => { const r = b.getBoundingClientRect(); return { b, l: r.left, r: r.right, t: r.top, btm: r.bottom }; }).sort((x, y) => x.l - y.l);
      let moved = false;
      for (let i = 0; i < box.length; i++) for (let j = i + 1; j < box.length; j++) {
        const A = box[i], B = box[j]; if (A.btm <= B.t || B.btm <= A.t) continue;   // pas à la même hauteur
        const over = A.r + MIN - B.l; if (over <= 0) continue;
        const shift = (b, d) => { const cur = parseFloat(b.style.left), w = b.offsetWidth / R.width * 100; b.style.left = Math.min(100 - w / 2 - 1, Math.max(w / 2 + 1, cur + d / R.width * 100)) + '%'; };
        shift(A.b, -over / 2); shift(B.b, over / 2); moved = true;
      }
      if (!moved) break;
    }
  }
  function renderAppart() {
    const s = st(), R = RP.on ? RP.room : s.room, r = D.ROOMS[R], el = $('#scene-appart');
    const rig = G.rigInfo();
    const owned = []; Object.entries(s.owned).forEach(([id, a]) => { const it = G.item(id); if (G.placeOf(id) === 'shelf') a.forEach(() => owned.push(it)); });   // trophées compris : ils prennent une place
    owned.sort((a, b) => G.sellPrice(b.id) - G.sellPrice(a.id));
    const onShelf = owned.slice(0, r.slots), shImg = it => it.img && has(it.img) ? it.img : 'item-' + it.id;   // trophées : image « ach-… »
    const sk = D.SKINS.find(k => k.id === s.skin) || D.SKINS[0], gg = (RP.on && RP.g) || sk.g, rb = has(`room-${gg}-${R}`) ? `room-${gg}-${R}` : 'room-' + R;
    const rl = RP.on ? RP.pv.rig : s.rig.lvl, pl = RP.on ? RP.pv.pc : G.pcLvl();
    const L = RP.on ? RP.L : roomLayout(R), rigImg = has('minerv-' + rl) ? 'minerv-' + rl : 'rig-' + rl, pcImg = RP.on ? (has('pcv-' + pl) ? 'pcv-' + pl : 'pc-' + pl) : pcLook();
    const place = o => `left:${o.x}%;top:${o.y}%;width:${o.w}%`;
    const shelf = L.slots.slice(0, r.slots).map(([x, y], i) => {
      const it = onShelf[i];
      if (RP.on) return `<span class="shelf-item rp-slot ${RP.sel === 'slot' + i || RP.sel === 'shelf' ? 'sel' : ''}" data-rp="slot${i}" style="left:${x}%;top:${y}%;width:${L.shelf.w}%;height:${L.shelf.h}%">${it ? pic(shImg(it), D.ITEM_CATS[it.cat].icon) : `<em>${i + 1}</em>`}</span>`;
      return it ? `<button class="shelf-item" data-act="itemInfo" data-id="${it.id}" style="left:${x}%;top:${y}%;width:${L.shelf.w}%;height:${L.shelf.h}%">${pic(shImg(it), D.ITEM_CATS[it.cat].icon)}</button>` : '';
    }).join('');
    // bulle de la machine : ce qu'il y a dedans (en billets) et la chaleur ; on la vide d'un geste
    const rigBubble = rig.idle ? `<button class="obj-bubble hot" data-act="rigQuick"><span><b>À l'arrêt</b><small>Choisis quoi miner</small></span></button>`
      : rig.ready ? `<button class="obj-bubble hot" data-act="rigQuick"><span><b>${ico('ic-pickaxe', '⛏️')} Récolte prête !</b><small>Touche pour voir</small></span></button>`
      : `<button class="obj-bubble ${rig.burnt ? 'down' : rig.heat >= 80 ? 'hot' : ''}" data-act="rigQuick"><i class="ring" style="--p:${Math.round(rig.pct * 100)}"></i><span><b>${rig.burnt ? `${ico('ic-burn', '💥')} Surchauffe` : rig.heat >= 80 ? `${ico('ic-heat', '🌡️')} ${Math.round(rig.heat)} % : refroidis !` : G.coin(rig.run.id).name}</b><small>Fini dans ${mmss(rig.left)}</small></span></button>`;
    // bulle du PC : ce que valent tes cryptos, gagné ou perdu
    const cv = G.cryptoValue(), cc = D.COINS.reduce((a, c) => a + (s.crypto.hold[c.id] > 0 ? s.crypto.cost[c.id] : 0), 0), diff = cv - cc;
    const pcBubble = cv >= .01
      ? `<button class="obj-bubble ${diff >= 0 ? 'up' : 'down'}" data-act="pc"><span><small>Tes cryptos</small><b>${short(cv)} <em>${diff >= 0 ? '▲' : '▼'} ${short(Math.abs(diff), true)}</em></b></span></button>`
      : `<button class="obj-bubble" data-act="pc"><span><small>Mon PC</small><b>Investir</b></span></button>`;
    const iv = owned.reduce((a, it) => a + G.sellPrice(it.id), 0);
    morph(el, `
      <div class="room-stage">
        ${has(rb) ? `<img class="room-bg" src="${src(rb)}" alt="">` : `<div class="room-fallback r${s.room}"></div>`}
        ${shelf}
        ${onShelf.length ? `<div class="bubble-at" data-for="shelf"><button class="obj-bubble shelf-b" data-act="collectionInfo"><span><small>Ta collection</small><b>${short(iv)}</b></span></button></div>` : ''}
        <button class="room-obj ${L.pc.flip ? 'flip' : ''} ${RP.on && RP.sel === 'pc' ? 'rp-sel' : ''}" data-act="${RP.on ? 'noop' : 'pc'}" data-rp="pc" style="${place(L.pc)};transform:translate(-50%, ${-(1 - (D.PC_DROP[pl] || 0)) * 100}%)">${pic(pcImg, EMO.pc)}</button>
        <div class="bubble-at" data-for="pc">${pcBubble}</div>
        ${has(rb + '-fg') ? `<img class="room-fg" src="${src(rb + '-fg')}" alt="">` : ''}
        ${s.lvl >= D.AGENCE.lvl || RP.on ? `<button class="room-obj ${L.light.flip ? 'flip' : ''} ${RP.on && RP.sel === 'light' ? 'rp-sel' : ''}" data-act="${RP.on ? 'noop' : 'agence'}" data-rp="light" style="${place(L.light)}">${(n => has(n) ? pic(n) : null)('bed-laptop-' + gg) || `<span class="bed-emo">💻<i>${gg === 'f' ? '💗' : '❤️'}</i></span>`}</button>
        <div class="bubble-at" data-for="light">${agBubble()}</div>` : ''}
        <button class="room-obj ${L.rig.flip ? 'flip' : ''} ${!rig.idle && !rig.burnt && rig.heat >= 80 ? 'hot' : ''} ${rig.burnt ? 'burnt' : ''} ${rig.ready ? 'ready' : ''} ${RP.on && RP.sel === 'rig' ? 'rp-sel' : ''}" data-act="${RP.on ? 'noop' : 'rig'}" data-rp="rig" style="${place(L.rig)}">${pic(rigImg, EMO.rig)}</button>
        <div class="bubble-at" data-for="rig">${rigBubble}</div>
      </div>
      <div class="room-head">
        <div class="rt-row"><div class="room-title stroke">${r.name} · ${Math.min(owned.length, r.slots)}/${r.slots} places</div><button class="help-pin" data-act="roomHelp" aria-label="Comment ça marche ?">?</button></div>
      </div>`);
    placeBubbles(); el.querySelectorAll('img').forEach(i => { if (!i.complete) i.addEventListener('load', placeBubbles, { once: true }); });
  }
  function openRoomHelp() {
    openModal({ title: 'Ton appart', icon: 'home', center: true, body: `
      <div class="help-row">${pic(has('minerv-' + st().rig.lvl) ? 'minerv-' + st().rig.lvl : 'rig-0', EMO.rig)}<div><b>La machine à crypto</b><p>Elle fabrique de l'argent toute seule, même quand tu n'es pas là. Elle chauffe et s'arrête au bout d'un moment : touche sa bulle pour encaisser, ça la relance.</p></div></div>
      <div class="help-row">${pic(pcLook(), EMO.pc)}<div><b>Ton PC</b><p>Tu y achètes des cryptos : des monnaies dont le prix bouge tout le temps. Achète quand c'est bas, revends quand c'est haut. Si ça baisse, tu perds.</p></div></div>
      <div class="help-row"><span class="pic help-phone"><i class="ph-mini"><i></i></i></span><div><b>Ton téléphone</b><p>Pour déménager (appli Appart'Immo), voir ta banque, tes paris et les messages de tes contacts.</p></div></div>
      <div class="help-row">${pic('item-c-holo', '🃏')}<div><b>Tes étagères</b><p>Tes objets de collection s'y exposent. Leur prix bouge aussi : touche un objet pour voir combien il vaut et le revendre.</p></div></div>
      <button class="btn green wide" data-act="closeModal">Compris</button>` });
  }

  // ------------------------------------------------------------ crypto (PC), expliqué simplement
  let cryptoSel = 'btk', crAmt = null, cryptoView = 'list', howOpen = false;
  // l'encadré « C'est quoi, une crypto ? » reste ouvert même quand la page se met à jour (toutes les secondes)
  document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('howto-crypto')) howOpen = e.target.open; }, true);
  // humeur du marché présentée comme une météo
  const WEATHER = { calm: ['☁️', 'Calme', 'Les prix bougent peu.'], bull: ['☀️', 'Ça monte', 'La tendance est à la hausse. Ça zigzague quand même : une baisse de quelques minutes, c\'est normal.'], bear: ['🌧️', 'Ça baisse', 'La tendance est à la baisse, doucement. Quelques remontées, mais ça descend sur la durée.'],
    fomo: ['🚀', 'Folie', 'Tout le monde achète, ça s\'envole… et ça peut retomber d\'un coup.'], krach: ['⛈️', 'Panique', 'Tout s\'effondre. Certains en profitent pour acheter pas cher.'] };
  const wxIc = id => ico('wx-' + (WEATHER[id] ? id : 'calm'), (WEATHER[id] || WEATHER.calm)[0]);
  function sparkSvg(h, w = 64, hgt = 28, color) {
    if (h.length < 2) return '';
    const mn = Math.min(...h), mx = Math.max(...h), r = mx - mn || 1;
    const pts = h.map((v, i) => `${(i / (h.length - 1) * w).toFixed(1)},${(hgt - 2 - (v - mn) / r * (hgt - 4)).toFixed(1)}`).join(' ');
    const up = h[h.length - 1] >= h[0];
    return `<svg viewBox="0 0 ${w} ${hgt}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color || (up ? '#1f9d55' : '#d33a2c')}" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
  }
  function chartSvg(h, color) {
    const w = 320, hgt = 150; if (h.length < 2) return '';
    const mn = Math.min(...h), mx = Math.max(...h), r = mx - mn || 1;
    const pts = h.map((v, i) => [i / (h.length - 1) * w, hgt - 12 - (v - mn) / r * (hgt - 24)]);
    const line = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
    const up = h[h.length - 1] >= h[0], c = color || (up ? '#3ddc84' : '#ff4d5e');
    return `<svg class="chart" viewBox="0 0 ${w} ${hgt}" preserveAspectRatio="none">
      <polygon points="0,${hgt} ${line} ${w},${hgt}" fill="${c}" opacity=".18"/>
      <polyline points="${line}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  }
  const riskTag = c => { const k = G.coinRisk(c); return `<span class="risk r${k.n}"><i>${'●'.repeat(k.n)}${'○'.repeat(4 - k.n)}</i>${k.label}</span>`; };
  const trend = (a, b) => { const v = (a / b - 1) * 100; return `<span class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1).replace('.', ',')} %</span>`; };
  function openCrypto(sel) {
    if (sel) { cryptoSel = sel; cryptoView = 'coin'; }
    else cryptoView = window.TUTO && TUTO.active ? 'coin' : 'list';
    openModal({ title: 'Mon PC', icon: 'trading', full: true, body: cryptoBody(), refresh: () => setBody(cryptoBody()) });
  }
  function cryptoBody() {
    const s = st(), m = G.mood(), w = WEATHER[m.id] || WEATHER.calm;
    const weather = `<div class="weather w-${m.id}" data-act="moodInfo"><span class="w-ic">${wxIc(m.id)}</span><div><small>La météo du marché</small><b>${w[1]}</b><p>${w[2]} Change dans ${mmss(s.crypto.moodUntil - Date.now())}.</p></div></div>`;
    const ct = G.tipBought('crypto'), tipBox = ct ? `<div class="tip-banner">${ico('tip-crypto', '📰')} <span><b>Ton tuyau du Kiosque</b>« ${esc(ct.txt)} »</span></div>` : '';
    if (cryptoView === 'list') {
      const cv = G.cryptoValue(), cc = D.COINS.reduce((a, c) => a + (s.crypto.hold[c.id] > 0 ? s.crypto.cost[c.id] : 0), 0);
      const list = D.COINS.map(k => {
        const lock = !G.coinUnlocked(k), hh = s.crypto.hist[k.id], p = s.crypto.prices[k.id], hv = G.holdValue(k.id);
        return `<button class="coin-card ${lock ? 'locked' : ''}" data-act="${lock ? 'noop' : 'coinSel'}" data-id="${k.id}">
          ${coinIco(k)}<div class="cc-mid"><b>${k.name}</b>${lock ? `<small>${ic('lock')}Niveau ${k.lvl}</small>` : riskTag(k)}
          ${hv >= .01 ? `<small class="cc-own">Tu en as pour <b>${short(hv)}</b> · ${(d => d >= 0 ? `<span class="up">+${short(d)} de gagné</span>` : `<span class="down">−${short(-d)} de perdu</span>`)(hv - s.crypto.cost[k.id])}</small>` : ''}</div>
          ${lock ? '' : `<div class="cc-right">${sparkSvg(hh.slice(-60), 64, 26)}<small>${trend(p, hh[Math.max(0, hh.length - 60)])}<em>5 min</em></small></div>`}</button>`;
      }).join('');
      return `${weather}${tipBox}
        ${cv >= .01 ? `<div class="pf-card"><small>Tes cryptos valent</small><b>${short(cv)}</b><p>Tu y as mis ${short(cc)} : ${cv - cc >= 0 ? `<span class="up">+${short(cv - cc)} de gagné</span>` : `<span class="down">${short(cv - cc)} de perdu</span>`}</p></div>` : ''}
        <details class="howto-crypto" ${howOpen ? 'open' : ''}><summary>C'est quoi, une crypto ?</summary><p>Une monnaie sur Internet dont le prix change tout le temps. Tu achètes avec tes billets, puis tu revends plus tard. <b>Si le prix a monté, tu gagnes la différence. S'il a baissé, tu perds.</b> Personne ne sait à l'avance : c'est un pari.</p></details>
        ${traderCard()}${flashBanner()}
        <h3 class="sec">Choisis une crypto</h3><div class="coin-list">${list}</div>`;
    }
    const c = G.coin(cryptoSel), p = s.crypto.prices[c.id], h = s.crypto.hist[c.id];
    const hold = s.crypto.hold[c.id], val = hold * p, cost = s.crypto.cost[c.id], risk = G.coinRisk(c);
    const amt = crAmt != null ? +crAmt : Math.min(50, Math.floor(s.cash));
    const chips = [10, 25, 50, 100, 500].filter(v => v <= Math.max(10, s.cash));
    const if100 = 100 * p / h[0];
    return `<button class="back-link" data-act="coinBack">← Toutes les cryptos</button>
      <div class="coin-head">${coinIco(c)}<div><b>${c.name}</b>${riskTag(c)}<p>${c.desc} ${risk.desc}</p></div></div>
      <div class="card chart-card">
        <div class="cc-line"><span>Il y a 15 min</span><b>${trend(p, h[0])}</b><span>Maintenant</span></div>
        ${chartSvg(h)}
        <p class="chart-say">Si tu avais mis <b>100<i class="cur"></i></b> il y a 15 min, tu aurais maintenant <b class="${if100 >= 100 ? 'up' : 'down'}">${eur(if100, 0)}</b>.</p>
      </div>
      ${hold > 0 ? `<div class="pos-card ${val - cost >= 0 ? 'up' : 'down'}"><small>Ce que tu as en ${c.name}</small>
        <div class="pos-line"><span>Tu as mis<b>${short(cost)}</b></span><i>→</i><span>Ça vaut<b>${short(val)}</b></span><span class="pos-diff">${val - cost >= 0 ? 'Gagné' : 'Perdu'}<b>${val - cost >= 0 ? '+' : '−'}${short(Math.abs(val - cost))}</b></span></div>
        <div class="sell-row">${[[.25, '¼'], [.5, 'la moitié'], [1, 'tout']].map(([f, l]) => `<button class="btn ${f === 1 ? 'red' : 'blue'} sm" data-act="crSell" data-f="${f}"><span>Vendre ${l}</span><small>+${short(val * f * (1 - G.fee()))}</small></button>`).join('')}</div></div>` : ''}
      <div class="card invest-card"><h4>Investir dans ${c.name}</h4>
        <p>Choisis combien de billets tu mets. Tu n'achètes pas forcément une pièce entière (1 ${c.sym} = ${coinPx(p)}) : un petit bout suffit.</p>
        <div class="seg chips">${chips.map(v => `<button class="btn xs ${+amt === v ? 'yellow' : 'blue'}" data-act="crAmt" data-v="${v}">${v}</button>`).join('')}<button class="btn xs blue" data-act="crAmt" data-v="max">Tout</button></div>
        <input class="amt" id="cr-amt" type="number" inputmode="decimal" min="1" value="${amt || ''}" placeholder="Autre montant">
        <button class="btn green wide big-act" data-act="crBuy" ${s.cash >= 1 ? '' : 'disabled'}>Investir <span id="cr-amt-lbl">${eur(amt || 0)}</span></button>
        <p class="muted center">Tu as ${eur(s.cash)} en poche. La plateforme prend ${(G.fee() * 100).toFixed(1).replace('.', ',').replace(',0', '')} % à chaque achat et vente (un meilleur PC = moins de frais).</p></div>
      ${coinNewsHtml(c)}${ordersHtml(c, hold)}
      ${weather}${tipBox}`;
  }
  // la crypto à regarder selon la météo : celle qui bouge le plus profite le plus d'une hausse (et souffre le plus d'une baisse)
  function moodPick() {
    const s = st(), m = G.mood().id, C = D.COINS.filter(c => G.coinUnlocked(c));
    const held = C.filter(c => G.holdValue(c.id) >= 1).sort((a, b) => G.holdValue(b.id) - G.holdValue(a.id));
    const wild = (rug) => C.filter(c => rug || !c.rug).sort((a, b) => b.vol - a.vol)[0], calm = C.slice().sort((a, b) => a.vol - b.vol)[0];
    let c, t, d, btn;
    if (m === 'bull') { c = wild(false); t = `${c.name} : c'est elle qui grimpe le plus`; d = 'Elle bouge fort : quand le marché monte, elle monte plus que les autres. Mais si ça se retourne, elle chute plus vite aussi.'; btn = 'Voir'; }
    else if (m === 'fomo') { c = wild(true); t = `${c.name} : la plus folle du moment`; d = 'Tout le monde achète : elle peut s\'envoler… et retomber d\'un coup. Ne mets que ce que tu peux perdre, et revends vite.'; btn = 'Voir'; }
    else if ((m === 'bear' || m === 'krach') && held.length) { c = held[0]; t = `Tu as ${short(G.holdValue(c.id))} en ${c.name}`; d = m === 'krach' ? 'Tout s\'effondre : vendre maintenant limite la casse. Ou garder si tu crois à la remontée.' : 'Le marché baisse : elle risque de perdre de la valeur dans les prochaines minutes. Vendre maintenant ?'; btn = 'Vendre ?'; }
    else if (m === 'krach') { c = wild(false); t = `${c.name} est en soldes`; d = 'Panique générale : les prix s\'écroulent. Pour les joueurs, c\'est le moment d\'acheter pas cher… si ça remonte.'; btn = 'Voir'; }
    else if (m === 'bear') { c = calm; t = 'Garde plutôt tes billets'; d = `Quand ça baisse, mieux vaut attendre que ça reparte. Si tu veux quand même acheter, ${c.name} est la plus tranquille.`; btn = 'Voir'; }
    else { c = calm; t = `${c.name} : la plus tranquille`; d = 'Le marché dort : bon moment pour acheter sans stress, avant que ça bouge.'; btn = 'Voir'; }
    const h = s.crypto.hist[c.id], p = s.crypto.prices[c.id];
    return `<div class="card mood-pick"><small>👀 À regarder maintenant</small><div class="mp-row">${coinIco(c)}<div class="grow"><b>${t}</b><p>${d}</p></div></div>
      <div class="mp-foot"><span>${trend(p, h[Math.max(0, h.length - 60)])} <em>5 min</em></span><button class="btn sm ${btn === 'Vendre ?' ? 'red' : 'green'}" data-act="moodCoin" data-id="${c.id}">${btn === 'Voir' ? `Voir ${c.name}` : btn}</button></div></div>`;
  }
  function traderCard() {
    const tr = G.traderState(), goal = G.traderGoal(), done = tr.profit >= goal, n = D.PCX.trader.lingots + Math.floor(st().lvl / 3);
    return `<div class="card trader ${tr.claimed ? 'got' : done ? 'ready' : ''}"><span class="tr-ic">${ico('ic-target', '🎯')}</span><div class="grow"><b>Défi du trader</b><small>${tr.claimed ? 'Réussi aujourd\'hui. Reviens demain !' : `Fais <b>+${short(goal)}</b> de bénéfice en revendant des cryptos aujourd'hui`}</small>
      ${tr.claimed ? '' : `<div class="kh-bar"><i style="width:${Math.min(100, tr.profit / goal * 100)}%"></i></div><small>${short(Math.max(0, tr.profit))} / ${short(goal)}</small>`}
      <p class="rw-get">Tu gagnes ${chips(0, n)}</p></div>
      ${tr.claimed ? '<span class="rw-done">✓ Déjà récupéré</span>' : done ? '<button class="btn green sm" data-act="traderClaim">Réclamer</button>' : ''}</div>`;
  }
  function flashBanner() {
    const s = st(), f = s.crypto.flash; if (!f) return '';
    const c = G.coin(f.id);
    if (!f.applied) return `<div class="flash-banner soon"><span class="fb-ic">${ico('ic-bell', '🔔')}</span><div class="grow"><b>Ton PC a repéré un mouvement sur ${c.name}</b><small>Ça va bouger dans ${mmss(f.at - Date.now())}. Prépare-toi !</small></div><button class="btn xs blue" data-act="coinSel" data-id="${f.id}">Voir</button></div>`;
    const hold = s.crypto.hold[f.id] || 0, val = hold * s.crypto.prices[f.id], net = val * (1 - G.fee()), gain = net - (s.crypto.cost[f.id] || 0);
    // à la hausse on propose de vendre ; à la baisse, on propose d'acheter pas cher (vendre au creux n'a pas de sens)
    const sell = f.up && hold > 0 && val >= .01 ? `<button class="btn xs ${gain >= 0 ? 'green' : 'red'} fb-sell" data-act="flashSell"><span>Vendre · +${short(net)}</span><small>${gain >= 0 ? `gagné +${short(gain)}` : `perdu ${short(gain)}`}</small></button>` : '';
    return `<div class="flash-banner ${f.up ? 'up' : 'down'}"><span class="fb-ic">${ico('icon-bolt', '⚡')}</span><div class="grow"><b>${c.name} ${f.up ? '+' : '−'}${Math.round((f.k - 1) * 100)} % d'un coup !</b><small>${f.up ? (hold > 0 ? 'Vends avant que ça retombe' : 'Ça va sûrement retomber') : 'Ça plonge : acheter pas cher ?'} · encore ${mmss(f.back - Date.now())}</small></div>
      ${sell || `<button class="btn xs blue" data-act="coinSel" data-id="${f.id}">${f.up ? 'Voir' : 'Acheter'}</button>`}</div>`;
  }
  function coinNewsHtml(c) {
    const L = (st().crypto.news || []).filter(n => n.id === c.id).slice(0, 3);
    return `<h3 class="sec">Les actus ${de(c.name)}</h3>${L.length ? L.map(n => `<div class="card cn-item ${n.until > Date.now() ? 'live' : 'old'}"><div class="cn-src"><b>${n.src}</b><span class="cn-rel r-${n.rel === 'Sérieux' ? 1 : n.rel === 'Moyen' ? 2 : 3}">${n.rel}</span><small>${ago(n.t)}</small></div><p>${n.said ? ico('ic-up', '📈') : ico('ic-down', '📉')} ${esc(n.txt)}</p>
        ${n.until > Date.now() ? '' : `<small class="cn-verdict ${n.said === n.real ? 'up' : 'down'}">${n.said === n.real ? '✓ C\'était vrai' : '✗ C\'était faux'}</small>`}</div>`).join('') : '<p class="hint-line">Pas d\'actu pour l\'instant. Elles tombent toutes les 10 min environ.</p>'}`;
  }
  function ordersHtml(c, hold) {
    const s = st(), O = (s.crypto.orders || []).filter(o => o.id === c.id), lock = G.pcLvl() < D.PCX.ordersPc, p = s.crypto.prices[c.id];
    const has_ = t => O.find(o => o.type === t);
    const row = (t, label, opts) => { const o = has_(t);
      return `<div class="ord-row"><span>${label}</span>${o ? `<b>${o.pct > 0 ? '+' : '−'}${Math.round(Math.abs(o.pct) * 100)} % ✓ <small class="muted">(${o.type === 'buy' ? `${short(o.eur)} à ` : 'à '}${coinPx(o.price)})</small></b><button class="btn xs red" data-act="ordCancel" data-t="${t}">Annuler</button>`
        : opts.map(v => `<button class="btn xs blue" data-act="ordAdd" data-t="${t}" data-p="${v}" ${t !== 'buy' && !(hold > 0) ? 'disabled' : ''}>${v > 0 ? '+' : ''}${Math.round(v * 100)} %</button>`).join('')}</div>`; };
    return `<h3 class="sec">Ordres automatiques</h3>${lock ? `<div class="explain">${ico('icon-lock', '🔒')} Avec le <b>PC gamer</b>, ton PC achète et vend tout seul quand le prix atteint ce que tu veux, même quand tu n'es pas là.</div>`
      : `<div class="card orders"><p class="hint-line">Ton PC le fait tout seul quand le prix y arrive, même si tu n'es pas là.</p>
        ${row('take', 'Tout vendre s\'il monte de', [.1, .25, .5])}${row('stop', 'Tout vendre s\'il baisse de', [-.1, -.2])}${row('buy', `Acheter ${short(Math.min(50, Math.floor(s.cash)) || 0)} s'il baisse de`, [-.1, -.2])}</div>`}`;
  }

  // ------------------------------------------------------------ machine à crypto
  // il manque un peu de cash ? on complète avec des lingots (1 lingot = 20 billets)
  function mixBtn(price, act) {
    const s = st(), n = G.lingotsFor(price), kind = { rigUpL: 'rig', pcUpL: 'pc', roomUpL: 'room' }[act];
    const pat = s.cash < price && G.liquidPlan(price).ok ? `<button class="btn purple wide" style="margin-top:6px" data-act="patPay" data-k="${kind}">Payer avec ton patrimoine</button>` : '';
    if (!n || n > s.lingots) return pat;
    return `<button class="btn gold wide" style="margin-top:6px" data-act="${act}">Compléter avec ${ic('lingot')}${n}</button><p class="hint-line center" style="margin:4px 0 0">Il te manque ${short(price - s.cash)} : 1 lingot vaut ${D.LINGOT.rate}<i class="cur"></i>.</p>` + pat;
  }
  // payer avec son patrimoine : on montre ce qui va être revendu, avec gagné/perdu, avant de confirmer
  function openPatPay(k) {
    const price = G.upPrice(k), pl = G.liquidPlan(price), name = { rig: 'la nouvelle machine', pc: 'le nouveau PC', room: 'le déménagement' }[k];
    const rows = pl.steps.map(x => { const d = x.get - x.cost; return `<div class="pat-row"><span>${x.kind === 'coin' ? (x.frac >= .99 ? 'Tout ton' : `${Math.round(x.frac * 100)} % de ton`) + ' ' + x.name : x.name}</span><b>+${short(x.get)}</b><small class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? 'gagné' : 'perdu'} ${short(Math.abs(d))}</small></div>`; }).join('');
    openModal({ title: 'Payer avec ton patrimoine', icon: 'wallet', center: true, body: `<p class="hint-line">Pour payer ${name} (${short(price)}), il te manque <b>${short(pl.need)}</b>. On revend :</p>
      <div class="card pat-list">${rows}</div><p class="hint-line">Ce qui est revendu ne pourra plus monter. Réfléchis : vendre au mauvais moment, c'est perdre.</p>
      <div class="grid2"><button class="btn" data-act="upgrades">Annuler</button><button class="btn purple" data-act="patGo" data-k="${k}">Vendre et payer</button></div>` });
  }
  // ------------------------------------------------------------ la machine à miner (façon Mama Farm)
  // 3 états : à l'arrêt (on choisit quoi miner), en marche (chaleur, refroidir), finie (on récolte → écran de récolte)
  const coinQty = q => q >= 100 ? Math.round(q).toLocaleString('fr-FR') : q >= 1 ? q.toFixed(2).replace('.', ',') : q.toPrecision(3).replace('.', ',');
  const deC = n => /^[AEIOUYÉ]/i.test(n) ? `d'${n}` : `de ${n}`;
  const coinPic = id => has('coin-' + id) ? `<img src="${src('coin-' + id)}" alt="">` : `<b>${G.coin(id).sym}</b>`;
  const flames = n => ico('ic-flame', '🔥').repeat(Math.max(1, Math.min(4, Math.ceil(n))));
  function minePicker() {
    const s = st();
    return `<h3 class="sec">Choisis quoi miner</h3><div class="mine-grid">${D.MINE.map(o => {
      const c = G.coin(o.id), lock = s.rig.lvl < o.need, lv = Math.max(s.rig.lvl, o.need), est = G.powerH(lv) * o.min / 60 * o.mult, maxHeat = o.heat * o.min / D.RIG[lv].heatMin;
      const cools = Math.max(0, Math.ceil((maxHeat - 1) / .5));
      return `<div class="card mine-opt ${lock ? 'locked' : ''}"><span class="mo-coin">${coinPic(o.id)}</span><b>${c.name}</b><small class="mo-tag">${o.tag}</small>
        <div class="mo-row"><span>${ico('ic-timer', '⏱️')} ${o.min < 60 ? o.min + ' min' : o.min / 60 + ' h'}</span><span>${ico('icon-cash', '💰')} ≈ ${short(est)}</span></div>
        <div class="mo-row"><span title="Chaleur">${flames(maxHeat * 2)}</span><span>${cools ? `À refroidir ×${cools}` : 'Ne chauffe pas'}</span></div>
        ${lock ? `<button class="btn xs" disabled>${ic('lock')} Machine niv. ${o.need + 1}</button>` : `<button class="btn xs green" data-act="mineStart" data-id="${o.id}">Miner</button>`}</div>`;
    }).join('')}</div><p class="hint-line">Ce que tu mines est payé au <b>cours du moment</b> à la récolte : si la crypto monte pendant ce temps, tu gagnes plus. Les cryptos « tout ou rien » peuvent rapporter le double… ou presque rien.</p>`;
  }
  function mineRunning(i) {
    const c = G.coin(i.run.id), heat = Math.min(100, Math.round(i.heat));
    return `<div class="mine-run ${i.burnt ? 'burnt' : ''}"><div class="mr-coin"><i class="ring big" style="--p:${Math.round(i.pct * 100)}"></i>${coinPic(i.run.id)}</div>
        <div><b>Minage ${deC(c.name)}</b><small>Fini dans <strong>${mmss(i.left)}</strong></small><small>Déjà ≈ ${short(i.value)} (au cours du moment)</small></div></div>
      <div class="gauge"><div class="g-lbl"><span>${ico('ic-heat', '🌡️')} Chaleur</span><b class="${heat >= 80 ? 'down' : ''}">${i.burnt ? 'Surchauffe !' : heat + ' %'}</b></div><div class="g-bar heat ${heat >= 80 ? 'hot' : ''}"><i style="width:${heat}%"></i></div></div>
      ${i.burnt ? `<p class="mine-warn">${ico('ic-burn', '💥')} Elle a surchauffé : la récolte perdra ${Math.round(D.FINDS.burnt * 100)} % et un virus est plus probable. La prochaine fois, refroidis-la avant 100 %.</p>`
        : `<button class="btn blue wide" data-act="mineCool" ${i.coolLeft > 0 ? 'disabled' : ''}>${i.coolLeft > 0 ? `${ico('ic-fan', '💨')} Le ventilo souffle… ${mmss(i.coolLeft)}` : `${ico('ic-fan', '💨')} Refroidir (−50 % de chaleur)`}</button>
           <p class="hint-line center" style="margin-top:4px">À 100 %, elle surchauffe : la récolte en prend un coup. Passe la refroidir de temps en temps.</p>`}
      <button class="btn gold wide mine-skip" data-act="mineSkip" ${st().lingots >= G.mineSkipCost() ? '' : 'disabled'}>${ico('icon-bolt', '⚡')} Finir maintenant · ${ic('lingot')}${G.mineSkipCost()}</button>`;
  }
  function rigBody() {
    const s = st(), i = G.rigInfo(), nx = G.rigNext(), img = l => has('minerv-' + l) ? 'minerv-' + l : 'rig-' + l;
    const top = `<div class="rig-top">${pic(img(s.rig.lvl), EMO.rig)}<div><b>${i.r.name}</b><small>Machine niveau ${s.rig.lvl + 1} / ${D.RIG.length} · puissance ≈ ${short(i.perHour)} par heure</small></div></div>`;
    const main = i.idle ? minePicker()
      : i.ready ? `<div class="mine-ready"><span class="mr-coin pop">${coinPic(i.run.id)}</span><b>Ton minage ${deC(G.coin(i.run.id).name)} est fini !</b><small>Qu'est-ce qu'il y a dedans ?</small>
          <button class="btn green wide big-act pulse" data-act="mineHarvest">${ico('ic-pickaxe', '⛏️')} Récolter</button></div>`
      : mineRunning(i);
    const up = nx ? `<h3 class="sec">Améliorer ta machine</h3><div class="card up-card"><div class="up-img">${pic(img(s.rig.lvl + 1), EMO.rig)}</div><div class="up-info"><b>${nx.nx.name}</b>
        <p><span class="up">×${nx.mult.toFixed(1).replace('.', ',')}</span> plus puissante, elle chauffe moins, et elle débloque ${D.MINE.filter(o => o.need === s.rig.lvl + 1).map(o => G.coin(o.id).name).join(' et ') || 'plus de trouvailles'}.</p>
        <button class="btn ${s.cash >= nx.price ? 'green' : ''} wide" data-act="rigUp" ${s.cash >= nx.price ? '' : 'disabled'}>Améliorer · ${short(nx.price)}</button>
        ${mixBtn(nx.price, 'rigUpL')}</div></div>` : '<div class="explain center">Ta machine est au maximum. Respect.</div>';
    return top + main + up;
  }
  function openRig() { openModal({ title: 'Machine à crypto', icon: 'bolt', full: true, body: rigBody(), refresh: () => setBody(rigBody()) }); }
  // l'écran de récolte : ce qu'on a miné, et la trouvaille éventuelle
  const FIND_TXT = {
    gold: ['🟨', 'Bloc doré !', 'Tu es tombé sur un bloc rare : la récolte vaut ×3.'],
    lingots: ['🪙', 'Des lingots !', n => `Coincés dans la machine : +${n} lingots.`],
    card: ['🃏', 'Une carte !', x => `Planquée derrière le ventilo : ${x.name}${x.dup ? ' (doublon revendu)' : ''}.`],
    wallet: ['👛', 'Un vieux portefeuille !', n => `Un portefeuille crypto oublié : ≈ ${short(n)} d'Axion en plus, rangés dans ton PC.`],
    virus: ['🦠', 'Un virus !', 'Un virus s\'est glissé dans ta machine : −40 % sur la récolte.']
  };
  const FIND_IMG = { gold: 'cat-gold', lingots: 'icon-lingot', card: 'card-back', wallet: 'nav-wallet', virus: 'ic-virus' };
  function showHarvest(r) {
    const c = G.coin(r.id), f = r.find && FIND_TXT[r.find.kind];
    const fTxt = f ? (typeof f[2] === 'function' ? f[2](r.find.kind === 'card' ? r.find : r.find.n) : f[2]) : '';
    openModal({ title: 'Récolte', icon: 'bolt', center: true, body: `<div class="harvest">
        <span class="hv-coin">${coinPic(r.id)}</span><small>Minage ${deC(c.name)} terminé</small>
        <b class="hv-amt stroke">+${coinQty(r.amt)} ${c.sym}</b><small class="hv-val">≈ ${short(r.value)} au cours du moment · rangé dans ton PC</small>${r.burnt ? `<p class="mine-warn">${ico('ic-burn', '💥')} Surchauffe : −35 % sur cette récolte.</p>` : ''}
        ${f ? `<div class="hv-find ${r.find.kind}"><span>${ico(FIND_IMG[r.find.kind] || '', f[0])}</span><div><b>${f[1]}</b><small>${fTxt}</small></div></div>` : '<p class="hint-line center">Pas de trouvaille cette fois. La prochaine, peut-être…</p>'}
        <button class="btn gold wide" data-act="hvSell" data-id="${r.id}" data-q="${r.amt}">Vendre tout de suite · +${short(r.value * (1 - G.fee()))}</button>
        <p class="hint-line center" style="margin:2px 0 6px">Ou garde-la : si ${c.name} monte, ta récolte vaudra plus.</p>
        <div class="grid2"><button class="btn" data-act="coinSelPc" data-id="${r.id}">Voir sur mon PC</button><button class="btn green" data-act="rig">Relancer un minage</button></div></div>` });
    sfx.coin(); if (r.find && r.find.kind !== 'virus') { sfx.win && sfx.win(); rain('confetti', 24); }

  }

  // ------------------------------------------------------------ le téléphone : toujours dans la poche, avec ses notifications
  // notifications : st.notifs = [{ id, t, app, title, txt, act, seen, read }] ; le bouton affiche le nombre de non vues
  const APPS = [
    { id: 'immo', name: 'Appart\'Immo', img: 'app-immo', emo: '🏠', bg: '#ff8a3d' },
    { id: 'bank', name: 'Banque', img: 'app-bank', emo: '💼', bg: '#3f9a3a' },
    { id: 'crypto', name: 'Crypto', img: 'app-crypto', emo: '📈', bg: '#1b2a5c' },
    { id: 'bets', name: 'Mes paris', img: 'app-bets', emo: '🎟️', bg: '#e63946' },
    { id: 'msg', name: 'Messages', img: 'app-msg', emo: '💬', bg: '#8a4dd4' },
    { id: 'missions', name: 'Missions', img: 'app-missions', emo: '🏆', bg: '#f2b01e' },
    { id: 'agence', name: 'PrivéFans', img: 'app-agence', emo: '📸', bg: '#ff4f8b' },
    { id: 'binder', name: 'Classeur', img: 'app-binder', emo: '📒', bg: '#139c8c' },
    { id: 'settings', name: 'Réglages', img: 'app-settings', emo: '⚙️', bg: '#8d99a6' }
  ];
  const appIcon = (a, cls = '') => `<i class="ph-ic ${cls}" style="--bg:${a.bg}">${has(a.img) ? `<img src="${src(a.img)}" alt="">` : a.emo}</i>`;
  const EXTRA = { six: { name: 'Tournoi', emo: '🏉', bg: '#e63946', img: 'bld-six' }, cdm: { name: 'Coupe des Morts', emo: '🎃', bg: '#ff7a1a', img: 'ic-ev-cdm' }, rig: { name: 'Ma machine', emo: '⚡', bg: '#ff8a3d', img: 'icon-bolt' }, gift: { name: 'Cadeau', emo: '🎁', bg: '#e63946', img: 'icon-gift' }, news: { name: 'Actus', emo: '📰', bg: '#4fb3f0', img: 'bld-kiosque' } };
  const appOf = id => APPS.find(a => a.id === id) || Object.assign({ id }, EXTRA[id] || { name: 'Infos', emo: '🔔', bg: '#4fb3f0', img: 'app-infos' });
  const notifs = () => (st().notifs = st().notifs || []);
  function notify(app, title, txt, act, quiet, thread, img) {
    const n = { id: Date.now() + Math.random(), t: Date.now(), app, title, txt, act, thread, img: img || (thread && chats()[thread] && chats()[thread].img), seen: false, read: false };
    notifs().unshift(n); if (notifs().length > 40) notifs().length = 40;
    renderPhoneBtn(true, !quiet && !hush);
    if (!quiet && !phoneOpen()) banner(n);
  }
  const unseen = () => notifs().filter(n => !n.seen).length;
  // son de notif : seulement quand une vraie notif s'affiche, jamais pour l'ambiance (météo, actus), et pas plus d'une fois toutes les 30 s
  let hush = false, lastPing = 0;
  const softNotify = (...a) => { hush = true; try { notify(...a); } finally { hush = false; } };
  function renderPhoneBtn(ping, sound) {
    const b = $('#phone-btn'); if (!b) return;
    const n = unseen(), bd = b.querySelector('.badge');
    bd.textContent = n > 9 ? '9+' : n; bd.classList.toggle('hidden', !n);
    if (ping) { b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring'); if (sound && !st().quiet && !phoneOpen() && Date.now() - lastPing > 30000) { lastPing = Date.now(); sfx.notif(); } }
  }
  // petite notification qui glisse en haut de l'écran, comme sur un vrai téléphone
  function banner(n) {
    if (st().quiet) return;
    let el = $('#ph-banner'); if (!el) { $('#app').insertAdjacentHTML('beforeend', '<button id="ph-banner" data-act="phoneNotif"></button>'); el = $('#ph-banner'); }
    const a = appOf(n.app);
    el.dataset.id = n.id;
    el.innerHTML = `${n.img ? pic(n.img, '🧑', 'nt-face') : appIcon(a, 'sm')}<span><small>${a.name} · maintenant</small><b>${n.title}</b><em>${n.txt}</em></span>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(banner._t); banner._t = setTimeout(() => el.classList.remove('show'), 4200);
  }
  const ago = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'maintenant' : m < 60 ? `il y a ${m} min` : `il y a ${Math.floor(m / 60)} h`; };
  const faceOf = n => n.img || (n.app === 'msg' && ((chats()[n.thread || n.title] || {}).img || (D.DEALS.contacts.find(c => c.name === n.title) || {}).img));
  const notifCard = n => { const a = appOf(n.app), f = faceOf(n); return `<button class="ph-notif ${n.read ? 'read' : ''}" data-act="phoneNotif" data-id="${n.id}">${f ? pic(f, '🧑', 'nt-face') : appIcon(a, 'sm')}<span><small>${a.name} · ${ago(n.t)}</small><b>${n.title}</b><em>${n.txt}</em></span></button>`; };
  // conversations avec les contacts : chaque message reçu peut proposer des réponses rapides (« Je parie », « J'achète »…)
  const chats = () => (st().chats = st().chats || {});
  let chatOpen = null;
  function chatPush(name, img, msg) {
    const c = chats()[name] = chats()[name] || { name, img, msgs: [], unread: 0 };
    if (img) c.img = img; msg.t = Date.now(); c.msgs.push(msg); if (c.msgs.length > 30) c.msgs.splice(0, c.msgs.length - 30);
    if (msg.from === 'them') c.unread++; c.last = msg.t;
    if (phoneOpen() && phoneApp === 'chat' && chatOpen === name) { c.unread = 0; drawPhone(); }
  }
  // ménage : messages et notifications de plus de 10 min disparaissent (au lancement du jeu, puis chaque minute)
  const MSG_TTL = 10 * 60000;
  function purgeOld() {
    const lim = Date.now() - MSG_TTL;
    Object.keys(chats()).forEach(k => { if (phoneOpen() && phoneApp === 'chat' && chatOpen === k) return;
      const c = chats()[k]; c.msgs = c.msgs.filter(m => (m.t || 0) >= lim);
      if (!c.msgs.length) delete chats()[k]; else c.unread = Math.min(c.unread, c.msgs.filter(m => m.from === 'them').length); });
    st().notifs = notifs().filter(n => (n.t || 0) >= lim);
    renderPhoneBtn(); if (phoneOpen() && phoneApp !== 'chat') drawPhone();
  }
  setInterval(purgeOld, 60000);
  const chatUnread = () => Object.values(chats()).reduce((a, c) => a + c.unread, 0);
  // dans un message, un gain (+35 % d'abonnés) ou une perte (−18 de moral) passe à la ligne, en vert ou en rouge
  const GAIN_RX = /(^|\s)([+−]\s?\d[\d,.]*(?:\s\d{3})*(?:\s?%|\s?k)?(?:\s?<i class="cur"><\/i>)?(?:\s(?:d['’]abonnés|abonnés|de moral|lingots?|d['’]XP|XP|de pourboires|fans))?)/g;
  const gainLines = t => t.replace(GAIN_RX, (_, sp, g) => `<br><b class="${g[0] === '+' ? 'msg-up' : 'msg-down'}">${g.trim()}</b> `);
  function bubbleHtml(c, m, i) {
    if (m.from === 'me') return `<div class="bub out">${m.txt}</div>`;
    let extra = '';
    if (m.offer) { const it = G.item(m.offer.id); extra = `<div class="bub in offer"><span class="of-art">${itemPic(it)}</span><span><b>${G.what(it, true)}</b><small>${(f => m.offer.type === 'sell' ? `Il te ${f} vend` : `Il te ${f} rachète`)(/^la /.test(G.what(it)) ? 'la' : 'le')} <strong>${short(m.offer.price)}</strong>${m.offer.type === 'buy' && paidFor(m.offer.id) != null ? `<br>${gainTxt(m.offer.id, m.offer.price)}` : ` · cote ${short(st().market.prices[m.offer.id])}`}</small></span></div>`; }
    if (m.match) { const x = G.match(m.match); if (x) extra = `<div class="bub in offer match"><span class="of-crests">${teamCrest(x.sport, D.TEAMS[x.sport].findIndex(t => t[0] === x.home), 'mini')}${teamCrest(x.sport, D.TEAMS[x.sport].findIndex(t => t[0] === x.away), 'mini')}</span><span><b>${x.home} – ${x.away}</b><small>${x.state === 'soon' ? `Coup d'envoi dans ${mmss(x.kickoff - Date.now())}` : x.state === 'live' ? 'En direct' : 'Terminé'}</small></span></div>`; }
    if (m.item && !m.offer) { const it = G.item(m.item); extra = `<div class="bub in offer"><span class="of-art">${itemPic(it)}</span><span><b>${G.what(it, true)}</b><small>Cote ${short(st().market.prices[m.item])}</small></span></div>`; }
    // réponses rapides : seulement sur le dernier message encore ouvert
    let acts = '';
    if (m.acts && !m.done) {
      const expired = (m.kind === 'deal' && (!st().deal || st().deal.id !== m.offer.id)) || (m.match && (!G.match(m.match) || G.match(m.match).state !== 'soon'));
      acts = expired ? '<div class="chat-acts"><small class="chat-exp">Trop tard, c\'est passé.</small></div>'
        : `<div class="chat-acts">${m.acts.map((a, k) => `<button class="btn sm ${k ? '' : 'green'}" data-act="chatAct" data-n="${esc(c.name)}" data-i="${i}" data-k="${k}">${a.label}</button>`).join('')}</div>`;
    }
    // les anciens messages (avant la v22) ne disaient pas « la carte » : on corrige à l'affichage
    const it = m.item && G.item(m.item), txt = it ? m.txt.replace(`« ${it.name} »`, G.what(it)) : m.txt;
    return `<div class="bub in">${gainLines(txt)}</div>${extra}${acts}`;
  }
  let phoneApp = 'home';
  const phoneOpen = () => !!$('#phone-layer.on');
  function appBadge(id) {
    const s = st();
    if (id === 'msg') return chatUnread();
    if (id === 'missions') return G.questsReady() + G.chalReady();
    if (id === 'boosters') return G.boosterCount();
    if (id === 'agence') return window.AGENCE ? (AGENCE.offer() ? 1 : 0) + (AGENCE.pending() >= 50 ? 1 : 0) : 0;
    if (id === 'bets') return notifs().filter(n => n.app === 'bets' && !n.read).length;
    return 0;
  }
  function phoneBody() {
    const s = st(), sk = D.SKINS.find(k => k.id === s.skin) || D.SKINS[0], now = new Date();
    const hh = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const status = `<div class="ph-status"><b>${hh}</b><span><svg class="ph-sig" viewBox="0 0 17 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="4.6" y="5.5" width="3" height="6.5" rx="1"/><rect x="9.2" y="3" width="3" height="9" rx="1"/><rect x="13.8" y="0" width="3" height="12" rx="1"/></svg>5G <i class="ph-batt"><i style="width:${60 + (now.getMinutes() % 35)}%"></i></i></span></div>`;
    const head = t => `${status}<div class="ph-bar"><button class="ph-back" data-act="phoneHome">‹</button><b>${t}</b><span></span></div>`;
    if (phoneApp === 'immo') {
      return head('Appart\'Immo') + `<div class="ph-scroll"><p class="ph-hint">Des annonces près de chez toi. Plus grand = plus de place pour exposer ta collection.</p>` +
        D.ROOMS.map((r, i) => { const img = has(`room-${sk.g}-${i}`) ? `room-${sk.g}-${i}` : 'room-' + i, mine = i === s.room, past = i < s.room, price = G.cost(r.cost);
          return `<div class="ph-ad ${mine ? 'mine' : ''}"><div class="ph-photo" style="background-image:url(${src(img)})">${mine ? '<span class="ph-tag">Chez toi</span>' : ''}</div>
            <div class="ph-ad-txt"><b>${r.name}</b><small>${r.desc}</small><small>${ico('ic-shelf', '📦')} ${r.slots} places pour tes objets</small></div>
            ${i === s.room + 1 && s.cash < price ? mixBtn(price, 'roomUpL') : ''}
            <div class="ph-ad-foot"><b>${r.cost ? short(price) : 'Ton premier chez-toi'}</b>${mine || past ? '' : `<button class="btn xs ${i === s.room + 1 && s.cash >= price ? 'green' : ''}" data-act="roomUp" ${i === s.room + 1 && s.cash >= price ? '' : 'disabled'}>${i === s.room + 1 ? 'Emménager' : 'Plus tard'}</button>`}</div></div>`; }).join('') + '</div>';
    }
    if (phoneApp === 'notifs') {
      const L = notifs();
      return head('Notifications') + `<div class="ph-scroll">${L.length ? L.map(notifCard).join('') + '<button class="ph-clear" data-act="phoneClear">Tout effacer</button>' : '<p class="ph-hint center">Rien de neuf. Profite.</p>'}</div>`;
    }
    if (phoneApp === 'msg') {
      const L = Object.values(chats()).sort((a, b) => b.last - a.last);
      return head('Messages') + `<div class="ph-scroll">${L.length ? L.map(c => { const lm = c.msgs[c.msgs.length - 1]; return `<button class="chat-row" data-act="chatOpen" data-n="${esc(c.name)}">${pic(c.img, '🧑', 'chat-face')}<span><b>${c.name}</b><small>${lm.from === 'me' ? 'Toi : ' : ''}${lm.txt.replace(/<[^>]+>/g, '')}</small></span><em>${ago(c.last)}</em>${c.unread ? `<i class="badge ok">${c.unread}</i>` : ''}</button>`; }).join('')
        : '<p class="ph-hint center">Pas encore de message. Tes contacts t\'écrivent quand ils ont un plan ou un tuyau (le Club aide à en rencontrer).</p>'}</div>`;
    }
    if (phoneApp === 'chat') {
      const c = chats()[chatOpen]; if (!c) { phoneApp = 'msg'; return phoneBody(); }
      return `${status}<div class="ph-bar"><button class="ph-back" data-act="phoneApp" data-id="msg">‹</button><span class="chat-title">${pic(c.img, '🧑', 'chat-face')}<b>${c.name}</b></span><span></span></div>
        <div class="ph-scroll chat">${c.msgs.map((m, i) => bubbleHtml(c, m, i)).join('')}</div>`;
    }
    const recent = notifs().filter(n => !n.read).slice(0, 2);
    return `<div class="ph-home" style="${has('phone-wall') ? `background-image:url(${src('phone-wall')})` : ''}">${status}
      <div class="ph-clock">${hh}</div><small class="ph-date">${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
      ${recent.length ? `<div class="ph-stack">${recent.map(notifCard).join('')}<button class="ph-all" data-act="phoneApp" data-id="notifs">Toutes les notifications (${notifs().length})</button></div>` : `<button class="ph-all solo" data-act="phoneApp" data-id="notifs">${ico('app-infos', '🔔')} Notifications</button>`}
      <div class="ph-apps">${APPS.map(a => { const n = appBadge(a.id); return `<button class="ph-app" data-act="phoneApp" data-id="${a.id}">${appIcon(a)}<span>${a.name}</span>${n ? `<em class="badge ok">${n > 9 ? '9+' : n}</em>` : ''}</button>`; }).join('')}</div></div>`;
  }
  function openChat(name) { const c = chats()[name]; if (!c) return openPhone('msg'); chatOpen = name; c.unread = 0; if (!phoneOpen()) openPhone('chat'); else { phoneApp = 'chat'; drawPhone(); } const sc = $('#phone-layer .ph-scroll'); if (sc) sc.scrollTop = sc.scrollHeight; }
  // redessine le téléphone en gardant la position de lecture (fil de discussion, listes)
  function drawPhone() { const p = $('#phone-layer .phone'); if (!p) return; const sc = p.querySelector('.ph-scroll'), y = sc ? sc.scrollTop : 0, same = p.dataset.view === phoneApp + (chatOpen || ''); if (same) morph(p, phoneBody()); else p.innerHTML = phoneBody(); p.dataset.view = phoneApp + (chatOpen || ''); const n = p.querySelector('.ph-scroll'); if (n && same) n.scrollTop = y; }
  function openPhone(app) {
    let el = $('#phone-layer'); if (!el) { $('#app').insertAdjacentHTML('beforeend', '<div id="phone-layer"><div class="phone"></div></div>'); el = $('#phone-layer'); el.addEventListener('click', e => { if (e.target === el) closePhone(); }); }
    phoneApp = app || 'home'; notifs().forEach(n => n.seen = true); renderPhoneBtn(); $('#ph-banner')?.classList.remove('show');
    drawPhone(); el.classList.add('on'); sfx.tap();
  }
  function closePhone() { const el = $('#phone-layer'); if (el) el.classList.remove('on'); }
  function openRoom() { openPhone('immo'); }

  // ------------------------------------------------------------ habitudes (au Royal : fumer, boire ; au Club : sortir)
  function habitsBody(where) {
    const s = st();
    return (where === 'club' ? '' : `<p class="hint-line">Une habitude donne un vrai bonus… et un malus qui coûte chaque jour. Arrêter prend ${D.QUIT_H} h : pendant le sevrage, tu gardes le malus sans le bonus.</p>`) +
      D.HABITS.filter(h => !where || h.where === where).map(h => {
        const state = G.habitState(h.id), lock = s.lvl < h.lvl, x = s.habits[h.id];
        if (h.auto) {
          const on = state !== 'off', left = G.clubQuitLeft(), n = G.clubNightsLeft();
          return `<div class="card habit-card ${lock ? 'locked' : ''}">
          <div class="hstack" style="justify-content:space-between"><h4 style="font-size:18px">${ico('hab-' + h.id, h.icon)} ${h.name}</h4>${on ? '<span class="rtag rE">Ton habitude</span>' : ''}</div>
          <p style="margin-top:6px"><b class="up">＋</b> ${h.bonus}</p><p><b class="down">－</b> ${h.malus}</p>
          <p class="hab-auto">${lock ? `Au niveau ${h.lvl}.` : on ? `Pour t'en défaire, ne remets pas les pieds au Club pendant ${D.QUIT_H} h. Il reste <b>${Math.ceil(left / 3600000)} h</b> : chaque soirée relance le compteur.`
            : `<span class="hab-count"><span>Tes sorties ces ${h.auto.days} derniers jours</span><span class="hc-pips">${Array.from({ length: h.auto.nights }, (_, i) => `<i class="${i < h.auto.nights - n ? 'on' : ''}"></i>`).join('')}<b>${h.auto.nights - n} / ${h.auto.nights}</b></span></span>À ${h.auto.nights} sorties en ${h.auto.days} jours, ça devient ton habitude.`}</p></div>`;
        }
        return `<div class="card habit-card ${lock ? 'locked' : ''}">
          <div class="hstack" style="justify-content:space-between"><h4 style="font-size:18px">${ico('hab-' + h.id, h.icon)} ${h.name}</h4>
          ${state === 'on' ? '<span class="rtag rE">Ton habitude</span>' : state === 'quitting' ? `<span class="rtag lose">Sevrage ${mmss(x.quitUntil - Date.now())}</span>` : ''}</div>
          <p style="margin-top:6px"><b class="up">＋</b> ${h.bonus}</p><p><b class="down">－</b> ${h.malus}</p>
          <div style="margin-top:10px">${lock ? `<button class="btn sm wide" disabled>Niveau ${h.lvl}</button>`
            : state === 'on' ? `<button class="btn sm red wide" data-act="habitQuit" data-id="${h.id}">Arrêter (sevrage ${D.QUIT_H} h)</button>`
            : state === 'quitting' ? '<button class="btn sm wide" disabled>Tiens bon…</button>'
            : `<button class="btn sm purple wide" data-act="habitStart" data-id="${h.id}">${h.id === 'club' ? 'Commencer à sortir' : `Se mettre à ${h.name.toLowerCase()}`}</button>`}</div></div>`;
      }).join('');
  }
  function openHabits(where) { openModal({ title: 'Habitudes', icon: 'star', full: true, body: habitsBody(where), refresh: () => setBody(habitsBody(where)) }); }

  // ------------------------------------------------------------ le Club (boîte de nuit)
  // back-office : les zones du Club se déplacent au doigt et sont publiées avec le reste
  let clubSel = null;
  function saveClubZones() { const sv = admSaved(); sv.club = Object.fromEntries(D.CLUB.spots.map(p => [p.id, { x: p.x, y: p.y, w: p.w, h: p.h }])); try { localStorage.setItem(ADM_KEY, JSON.stringify(sv)); } catch (e) {} }
  document.addEventListener('pointerdown', e => {
    if (!placing) return; const el = e.target.closest('.club-spot'); if (!el) return;
    const room = el.closest('.club-room'), r = room.getBoundingClientRect(), p = D.CLUB.spots.find(x => x.id === el.dataset.id); clubSel = p.id;
    e.preventDefault(); e.stopPropagation();
    const mv = ev => { p.x = Math.round((ev.clientX - r.left) / r.width * 200) / 2; p.y = Math.round((ev.clientY - r.top) / r.height * 200) / 2; el.style.left = p.x + '%'; el.style.top = p.y + '%'; };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); saveClubZones(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }, true);
  // back-office : les zones de la machine à sous (écran, LED, mises, bouton, levier) se calent sur l'image casino-machine
  // glisser = déplacer ; poignée en bas à droite = taille. Publiées avec le reste.
  function saveSlotZones() { const sv = admSaved(); sv.slot = JSON.parse(JSON.stringify(D.SLOT.ui)); try { localStorage.setItem(ADM_KEY, JSON.stringify(sv)); } catch (e) {} }
  document.addEventListener('pointerdown', e => {
    if (!placing) return; const el = e.target.closest('.real-slot [data-zone]'); if (!el) return;
    const box = el.closest('.real-slot').getBoundingClientRect(), Z = D.SLOT.ui[el.dataset.zone], r = el.getBoundingClientRect();
    const resize = e.clientX > r.right - 18 && e.clientY > r.bottom - 18, x0 = e.clientX, y0 = e.clientY, s0 = { ...Z };
    e.preventDefault(); e.stopPropagation();
    const mv = ev => { const dx = (ev.clientX - x0) / box.width * 100, dy = (ev.clientY - y0) / box.height * 100;
      if (resize) { Z.w = Math.max(4, Math.round((s0.w + dx) * 2) / 2); Z.h = Math.max(3, Math.round((s0.h + dy) * 2) / 2); } else { Z.x = Math.round((s0.x + dx) * 2) / 2; Z.y = Math.round((s0.y + dy) * 2) / 2; }
      Object.assign(el.style, { left: Z.x + '%', top: Z.y + '%', width: Z.w + '%', height: Z.h + '%' }); };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); saveSlotZones(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }, true);
  document.addEventListener('click', e => { if (placing && e.target.closest('.real-slot [data-zone]')) { e.preventDefault(); e.stopPropagation(); } }, true);
  // Le Club : d'abord le videur (entrée), puis une vraie salle avec des coins à toucher (image club-room, sinon néons dessinés)
  function clubBody() {
    const s = st(), wait = G.clubWait(), e = G.clubEntry(), C = D.CLUB;
    if (!G.clubIn() && !placing) {
      return `<div class="club-door">${has('club-door') ? `<img class="cd-bg" src="${src('club-door')}" alt="">` : '<div class="cd-bg neon"></div>'}
          <div class="cd-say"><b>${ico('ic-videur', '🚪')} Le videur</b><p>${wait ? `« Toi, je t'ai vu tout à l'heure. Reviens dans ${mmss(wait)}… ou fais-moi changer d'avis. »` : `« Ce soir c'est ${short(e)} l'entrée. Tu rentres ? »`}</p>
          <button class="btn green wide" data-act="clubGo" ${wait || s.cash < e ? 'disabled' : ''}>${wait ? `Reviens dans ${mmss(wait)}` : `Entrer · ${short(e)}`}</button>
          ${wait ? `<button class="btn gold wide" style="margin-top:8px" data-act="clubVip" ${s.lingots >= D.LINGOT.club && s.cash >= e ? '' : 'disabled'}><span>Entrer quand même · ${ic('lingot')}${D.LINGOT.club} + ${short(e)}</span></button>` : ''}</div></div>
        ${habitsBody('club')}`;
    }
    const c = G.clubIn() ? s.club : { end: Date.now() + 1, done: {}, dj: false }, left = c.end - Date.now();
    const spots = C.spots.map(p => { const done = c.done[p.id];
      return `<button class="club-spot ${done ? 'done' : ''} cs-${p.id}" data-act="clubSpot" data-id="${p.id}" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%"><span class="cs-tag">${ico('ic-club-' + p.id, p.icon)} ${p.name}${done ? ' ✓' : ''}</span></button>`; }).join('');
    return `<div class="club-room">${has('club-room') ? `<img class="cr-bg" src="${src('club-room')}" alt="">` : '<div class="cr-bg neon"><i class="ball"></i><i class="floor"></i></div>'}${spots}
        <div class="club-timer">${placing ? `${ico('btn-setup', '🛠️')} Fais glisser les zones (− / + pour la taille), puis Publier` : `${ico('hab-club', '🎉')} Soirée : <b>${mmss(left)}</b>${c.dj ? ` · ${ico('ic-club-dj', '🎧')} ton son passe` : ''}`}</div></div>
      ${placing ? '<div class="grid2" style="margin-top:8px"><button class="btn xs blue" data-act="clubZone" data-k="-1">− taille</button><button class="btn xs blue" data-act="clubZone" data-k="1">+ taille</button></div>' : ''}
      <div class="club-legend">${C.spots.filter(p => p.id !== 'door').map(p => `<div class="${c.done[p.id] ? 'done' : ''}"><span>${ico('ic-club-' + p.id, p.icon)}</span><b>${p.name}</b><small>${p.id === 'bar' ? `${short(G.cost ? G.cost(C.drink(s.lvl)) : C.drink(s.lvl))} · ` : p.id === 'dj' ? `${short(C.djTip)} · ` : p.id === 'vip' ? `${C.vipLingots} lingots · ` : ''}${p.desc}</small></div>`).join('')}</div>
      <h3 class="sec">Ton habitude</h3>${habitsBody('club')}`;
  }
  // porte du Club : la carte du videur est en haut, on cale l'image pour que sa tête apparaisse juste en dessous
  function fitClubDoor() {
    const d = document.querySelector('#modal .club-door'), img = d && d.querySelector('img.cd-bg'), say = d && d.querySelector('.cd-say');
    if (!img || !say || !img.naturalWidth) return;
    const W = d.clientWidth, H = d.clientHeight, k = Math.max(W / img.naturalWidth, H / img.naturalHeight), ih = img.naturalHeight * k;
    const want = say.offsetTop + say.offsetHeight + 8 - .345 * ih;   // le haut de la tête du videur est à ~35 % de l'image
    img.style.objectPosition = `50% ${Math.round(Math.min(0, Math.max(H - ih, want)))}px`;
  }
  window.addEventListener('resize', fitClubDoor);
  function openClub() { openModal({ title: 'Le Club', icon: 'bld-club', full: true, theme: 'club', body: clubBody(), refresh: () => { setBody(clubBody()); fitClubDoor(); } }); const im = document.querySelector('#modal .club-door img.cd-bg'); if (im) im.complete ? fitClubDoor() : im.addEventListener('load', fitClubDoor); }

  // ------------------------------------------------------------ la Boutique (bouton du bas) : déco de la ville + achats intégrés
  let bqTab = 'deco';
  // saison commerciale en cours (Halloween, Black Friday, Noël), sinon l'offre du jour certains jours, sinon rien (simple boutique)
  const mmdd = d => String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function bfDate(y) { const d = new Date(y, 10, 1); const th = (4 - d.getDay() + 7) % 7 + 1 + 21; return new Date(y, 10, th + 1); }   // vendredi après le 4e jeudi de novembre
  function seasonNow() {
    const now = new Date(), y = now.getFullYear(), today = new Date(y, now.getMonth(), now.getDate());
    return D.SEASONS.find(x => { const at = v => { if (v.startsWith('bf')) { const b = bfDate(y); b.setDate(b.getDate() + (+v.slice(3) || 0)); return b; } const [m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };
      const a = at(x.from), b = at(x.to); x._end = new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1); return today >= a && today <= b; }) || null;
  }
  // une promo programmée dans le back office passe en premier (la plus ancienne qui a commencé)
  function campaignNow() {
    const t = Date.now(), c = (D.CAMPAIGNS || []).filter(x => x.on !== false && Date.parse(x.start) <= t && t < Date.parse(x.end)).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
    if (!c) return null; const lk = (D.PROMO_LOOKS || {})[c.look] || D.PROMO_LOOKS.promo;
    return { id: c.offer, off: c.kind === 'off' ? +c.value : 0, bonus: c.kind === 'bonus' ? +c.value : 0, title: c.title, desc: c.desc,
      season: { id: 'c-' + c.id, name: c.name || 'Promo', img: has(lk[0]) ? lk[0] : 'ic-promo', color: lk[1], _end: new Date(Date.parse(c.end)) } };
  }
  const promoNow = () => { const cp = campaignNow(); if (cp) return cp; const se = seasonNow(); if (se) return { ...se.deal, season: se };
    return D.PROMO_DAYS.includes(new Date().getDay()) ? D.PROMOS[Math.floor(Date.now() / 86400000) % D.PROMOS.length] : null; };
  const promoLeft = () => { const p = promoNow(); if (p && p.season) return p.season._end - Date.now(); const d = new Date(); d.setHours(24, 0, 0, 0); return d - Date.now(); };
  // le bouton à gauche : visuel de saison ou de promo ; sans promo, il alterne entre la boutique de lingots, « Ma ville » (décos) et, pour un nouveau joueur, l'offre de bienvenue
  let promoMode = '';
  const welcomeOk = () => { const s = st(); return !(s.iapOwned || {})['x-start'] && s.lvl >= 2 && s.lvl <= 15; };
  function promoUi() {
    const b = $('#btn-promo'); if (!b) return; const p = promoNow();
    const cyc = ['shop', 'ville'].concat(welcomeOk() ? ['welcome'] : []);
    const mode = p ? (p.season ? p.season.id : 'promo') : cyc[Math.floor(Date.now() / 7000) % cyc.length];
    if (mode !== promoMode) { promoMode = mode;
      const img = p && p.season ? p.season.img : p ? 'ic-promo' : { shop: 'ic-shop-lingots', ville: 'ic-shop-ville', welcome: 'pack-start' }[mode];
      const fb = { shop: ic('lingot'), ville: pic('deco-dc-bench', '🏙️'), welcome: pic('booster-pack', '🎁') }[mode] || ic('lingot');
      b.className = 'pm-' + (p && p.season ? 'season' : mode) + ' pm-flip'; b.style.setProperty('--pm', p && p.season ? p.season.color : '');
      b.querySelector('.pr-rib').textContent = p && p.season ? p.season.name.toUpperCase() : p ? 'PROMO' : { shop: 'BOUTIQUE', ville: 'BOUTIQUE', welcome: 'BIENVENUE' }[mode];
      b.querySelector('.pr-ic').innerHTML = has(img) ? `<img src="${src(img)}" alt="">` : has('ic-promo') && p ? `<img src="${src('ic-promo')}" alt="">` : fb;
      setTimeout(() => b.classList.remove('pm-flip'), 450);
    }
    const t = $('#promo-t'); if (t) { if (!p) t.textContent = ''; else { const ms = promoLeft(), h = Math.floor(ms / 3600000); t.textContent = h >= 48 ? `${Math.floor(h / 24)} j` : h >= 1 ? `${h} h` : mmss(ms); } }
  }
  const leftTxt = ms => { const h = Math.floor(ms / 3600000); return h >= 48 ? `${Math.floor(h / 24)} jours` : h >= 1 ? `${h} h ${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}` : mmss(ms); };
  const eur2 = v => (Math.floor(v * 100 + 1e-6) / 100).toFixed(2).replace('.', ',') + ' €';   // 2,99 € à −50 % → 1,49 €
  const priceNum = x => parseFloat(x.price.replace(',', '.'));
  // ce que contient une offre, en pastilles illustrées
  function giveChips(x) {
    const g = x.give || (x.kind === 'lingots' ? { lingots: x.n } : {}), out = [];
    if (g.lingots) out.push(`<span class="gc gc-l">${ic('lingot')}<b>${g.lingots.toLocaleString('fr-FR')}</b></span>`);
    if (g.boosters) out.push(`<span class="gc gc-b">${has('booster-pack') ? `<img src="${src('booster-pack')}" alt="">` : '🃏'}<b>×${g.boosters}</b></span>`);
    if (g.cash) out.push(`<span class="gc gc-c">${ic('cash')}<b>${short(g.cash, true)}</b></span>`);
    if (g.rig) out.push(`<span class="gc gc-r">${ico('rigv-2', '⚡')}<b>Machine niv. 2</b></span>`);
    if (g.noAds) out.push(`<span class="gc gc-n">${ico('pack-noads', '🚫')}<b>Plus de pub imposée</b></span>`);
    if (g.passDays) out.push(`<span class="gc">${ic('lingot')}<b>+15 / jour</b></span>`, `<span class="gc">${has('booster-pack') ? `<img src="${src('booster-pack')}" alt="">` : '🃏'}<b>+1 / jour</b></span>`);
    if (g.skin) out.push(`<span class="gc gc-s">${has('skin-' + g.skin) ? `<img src="${src('skin-' + g.skin)}" alt="">` : '👑'}<b>Skin Gold</b></span>`);
    return out.join('');
  }
  // image d'une offre (en attendant les visuels dédiés : une composition avec les images du jeu)
  const PACK_IMG = { 'x-start': 'pack-start', 'x-noads': 'pack-noads', 'x-pass': 'pack-pass', 'x-collec': 'pack-collec', 'x-gold': 'skin-gold', 'x-magnat': 'pack-magnat' };
  function offerArt(x) {
    if (x.kind === 'lingots') { const k = D.IAP.filter(i => i.kind === 'lingots').indexOf(x) + 1;
      return has('shop-lingot-' + k) ? `<img src="${src('shop-lingot-' + k)}" alt="">` : `<span class="lg-stack n${Math.min(k, 4)}">${Array.from({ length: Math.min(k, 4) }, () => `<img src="${src('icon-lingot')}" alt="">`).join('')}</span>`; }
    const im = PACK_IMG[x.id]; if (im && has(im)) return `<img src="${src(im)}" alt="">`;
    const g = x.give || {}, n = [g.boosters, g.lingots, g.cash].filter(Boolean).length;
    return `<span class="ip-compo n${n}">${g.boosters && has('booster-pack') ? `<img class="ip-a" src="${src('booster-pack')}" alt="">` : ''}${g.lingots && has('bonus-lingots') ? `<img class="ip-b" src="${src('bonus-lingots')}" alt="">` : ''}${g.cash && has('bonus-cash') ? `<img class="ip-c" src="${src('bonus-cash')}" alt="">` : ''}${g.noAds ? '<i class="ip-e">🚫</i>' : g.skin ? '<i class="ip-e">👑</i>' : ''}</span>`;
  }
  // l'offre mise en avant : choisie selon le joueur (nouveau, gros joueur de pubs, collectionneur, à court de lingots…)
  function offerFor() {
    const s = st(), own = s.iapOwned || {}, p = promoNow(), X = id => D.IAP.find(i => i.id === id);
    if (p && X(p.id)) return { x: X(p.id), p, why: p.season ? `Spécial ${p.season.name}` : 'Offre du jour' };
    if (welcomeOk()) return { x: X('x-start'), why: 'Offre de bienvenue', sub: 'Une seule fois, pour bien démarrer.' };
    if (!G.adState().noAds && (s.adsSeen || 0) >= 3) return { x: X('x-noads'), why: 'Marre des pubs ?', sub: 'Plus aucune pub qui coupe ton jeu.' };
    const cards = D.ITEMS.filter(i => i.cat === 'card' && (s.owned[i.id] || []).length).length;
    if (cards >= 12) return { x: X('x-collec'), why: 'Pour ton classeur', sub: `Tu as déjà ${cards} cartes : complète tes séries.` };
    if (s.lingots < 40) return { x: X('l-600'), why: 'Recharge tes lingots', sub: 'De quoi t\'offrir boosters et décos.' };
    if (!G.passOn()) return { x: X('x-pass'), why: 'Le meilleur rapport', sub: 'Des lingots et un booster chaque jour.' };
    return { x: own['x-magnat'] ? X('l-1300') : X('x-magnat'), why: 'Pour les grands', sub: '' };
  }
  function priceBtn(x, p, cls) {
    const off = p && p.id === x.id && p.off;
    return `<button class="btn ${cls || 'gold'} iap-buy" data-act="iapSoon" data-id="${x.id}">${off ? `<s>${x.price}</s>${eur2(priceNum(x) * (1 - p.off / 100))}` : x.price}${x.per ? `<small class="iap-per">/ ${x.per}</small>` : ''}</button>`;
  }
  function shopHero() {
    const o = offerFor(); if (!o || !o.x) return ''; const { x, p } = o;
    const badge = p ? (p.off ? `−${p.off} %` : `+${p.bonus} %`) : '';
    return `<div class="shop-hero2 ${p && p.season ? 'season' : ''}" style="${p && p.season ? `--pm:${p.season.color}` : ''}">
      ${has('shop-hero') ? `<img class="sh2-bg" src="${src('shop-hero')}" alt="">` : '<i class="sh2-bills"></i>'}
      ${p && p.season ? `<span class="sh2-for"><i>${ico('icon-star', '★')}</i>Spécial ${p.season.name}</span>` : `<span class="sh2-for"><i>${ico('icon-star', '★')}</i>Rien que pour toi<em>${o.why}</em></span>`}
      <div class="sh2-row"><div class="sh2-art" style="--ad:-${Date.now() % 3200}ms">${offerArt(x)}${badge ? `<span class="sh2-badge">${badge}</span>` : ''}</div>
        <div class="sh2-info"><b>${p ? p.title : x.name}</b><small>${p ? p.desc : o.sub || x.desc || ''}</small><div class="give-chips">${giveChips(x)}</div></div></div>
      <div class="sh2-buy">${priceBtn(x, p, 'green big')}${p ? `<small>${ico('ic-timer', '⏱')} Finit dans ${leftTxt(promoLeft())}</small>` : x.once ? '<small>Une seule fois par compte</small>' : ''}</div></div>`;
  }
  // carte « regarder une pub » : récompense en lingots, quelques fois par jour
  function adCard() {
    const a = G.adState(), ready = a.left && !a.wait;
    return `<div class="card ad-card"><span class="ad-ic ${has('ic-ad-reward') ? 'img' : ''}">${has('ic-ad-reward') ? `<img src="${src('ic-ad-reward')}" alt="">` : '▶'}</span><div class="grow"><b>Regarde une pub : +${a.reward} ${ic('lingot')}</b>
      <small>${a.left ? `Encore ${a.left} aujourd'hui${a.wait ? ` · prochaine dans ${mmss(a.wait)}` : ''}` : 'C\'est tout pour aujourd\'hui, reviens demain.'}</small></div>
      <button class="btn green sm" data-act="adWatch" ${ready ? '' : 'disabled'}>Regarder</button></div>`;
  }
  // offre de bienvenue : proposée régulièrement aux nouveaux joueurs (dès le niveau 3, tous les 2 jours, 5 fois au plus)
  // l'offre du jour : une fenêtre par jour au plus (à la première visite du jour), avec une offre qui change d'un jour à l'autre :
  // promo en cours, pack de départ (nouveaux joueurs), sans pub, pass, collectionneur… jamais deux fois la même de suite
  const OFFER_TXT = {
    'x-start': ['Le pack du débutant', 'Pour démarrer fort dans le quartier. Proposé <b>une seule fois</b> par compte.'],
    'x-noads': ['Fini les pubs', 'Plus aucune pub qui coupe ton jeu (après tes montées de niveau), <b>pour toujours</b>. Tu peux toujours regarder une pub quand tu veux pour gagner des lingots.'],
    'x-pass': ['Le Pass Hustle', 'Un <b>abonnement mensuel</b> : des lingots tout de suite, puis <b>15 lingots et 1 booster chaque jour</b>. Sans engagement, tu l\'arrêtes quand tu veux.'],
    'x-collec': ['Pour ton classeur', '<b>20 boosters</b> d\'un coup pour compléter tes séries plus vite.'],
    'x-magnat': ['Le pack Magnat', 'Tout pour devenir le patron du quartier, skin Gold compris.']
  };
  function offerToday(force) {
    const s = st(), own = s.iapOwned || {}, ok = id => { const x = D.IAP.find(i => i.id === id); return x && !(x.once && own[id]); };
    if (!force && (G.TEST || !s.tutoDone || s.lvl < 3 || (window.TUTO && window.TUTO.active))) return;
    const o = s.offerPop = s.offerPop || { day: '', last: '' }, day = new Date().toDateString();
    if (!force && o.day === day) return;
    const p = promoNow(), cands = [p && p.id, welcomeOk() && 'x-start', !G.adState().noAds && 'x-noads', !G.passOn() && 'x-pass', 'x-collec', s.lvl >= 15 && 'x-magnat'].filter(id => id && ok(id));
    const id = cands.find(c => c !== o.last) || cands[0]; if (!id) return;
    o.day = day; o.last = id; G.save && G.save();
    const x = D.IAP.find(i => i.id === id), pr = p && p.id === id ? p : null, [title, txt] = pr ? [pr.title, pr.desc] : OFFER_TXT[id] || [x.name, x.desc || ''];
    const art = id === 'x-start' && has('pop-starter') ? `<img src="${src('pop-starter')}" alt="">` : offerArt(x);
    queue(() => openModal({ title: pr ? (pr.season ? pr.season.name : 'Promo du jour') : id === 'x-start' ? 'Offre de bienvenue' : 'L\'offre du jour', icon: 'gift', center: true, body: `<div class="welcome-pop ${id === 'x-start' ? '' : 'wp-pack'}">
      <div class="wp-art" style="${pr && pr.season ? `--pm:${pr.season.color}` : ''}">${art}${pr ? `<span class="sh2-badge">${pr.off ? `−${pr.off} %` : `+${pr.bonus} %`}</span>` : ''}</div>
      <h3>${title}</h3><p>${txt}</p>
      <div class="give-chips">${giveChips(x)}</div>
      ${priceBtn(x, pr, 'green big')}<button class="wp-later" data-act="closeModal">Plus tard</button></div>` }));
  }
  const maybeWelcome = force => offerToday(force);
  const PACK_COL = { 'x-start': '#5fc73a', 'x-noads': '#45a8ec', 'x-pass': '#a867e3', 'x-collec': '#ff8a3d', 'x-gold': '#e0a21d', 'x-magnat': '#e63946' };
  function boutiqueBody() {
    const s = st();
    if (bqTab === 'vip') {
      const L = D.IAP.filter(x => x.kind === 'lingots'), P = D.IAP.filter(x => x.kind === 'pack'), owned = s.iapOwned || {}, p = promoNow(), top = offerFor();
      const pass = G.passOn() ? `<div class="explain center">🎟️ Pass Hustle actif : 15 lingots et 1 booster en plus avec ton cadeau du jour, encore ${Math.ceil((s.passUntil - Date.now()) / 86400000)} j.</div>` : '';
      return `${shopHero()}${pass}
        <h3 class="sec">Lingots <small>· plus le sac est gros, plus il y a de bonus</small></h3>
        ${adCard()}
        <div class="lg-grid">${L.map(x => { const bonus = p && p.id === x.id && p.bonus; return `<div class="lg-card ${x.best ? 'best' : ''}">
          <div class="lg-art">${offerArt(x)}${(() => { const tot = bonus ? Math.round(x.n * (1 + bonus / 100)) : x.n, free = tot - Math.round(priceNum(x)) * 50; /* base : 50 lingots par euro */ return free > 0 ? `<span class="lg-tag gift">${free.toLocaleString('fr-FR')} offerts</span>` : ''; })()}</div><b>${ic('lingot')}${(bonus ? Math.round(x.n * (1 + bonus / 100)) : x.n).toLocaleString('fr-FR')}</b>${x.best ? `<span class="lg-best">${x.best}</span>` : `<small>${x.name}</small>`}${priceBtn(x, p)}</div>`; }).join('')}</div>
        <h3 class="sec">Packs</h3><div class="ip-list">${P.filter(x => !(top && top.x === x && !(x.once && owned[x.id]))).map(x => { const done = x.once && owned[x.id];
          return `<div class="ip-card ${done ? 'done' : ''}" style="--ip:${PACK_COL[x.id] || '#a867e3'}"><div class="ip-art">${offerArt(x)}</div><div class="ip-info">${x.tag ? `<span class="ip-tag">${x.tag}</span>` : ''}<b>${x.name}</b><div class="give-chips">${giveChips(x)}</div></div>
            ${done ? '<span class="iap-own">✓ Acheté</span>' : priceBtn(x, p, 'purple')}</div>`; }).join('')}</div>
`;
    }
    const item = x => { const own = G.evOwned(x.id), used = G.evUsed(x.id), lock = s.lvl < (x.lvl || 1), can = x.lingots ? s.lingots >= x.lingots : s.cash >= x.cash;
      const price = x.lingots ? `${ic('lingot')}${x.lingots}` : short(x.cash);
      const btn = own ? `<button class="btn xs ${used ? '' : 'blue'}" data-act="bqUse" data-id="${x.id}">${used ? 'Ranger' : 'Poser en ville'}</button>`
        : lock ? `<button class="btn xs" disabled>${ic('lock')} Niveau ${x.lvl}</button>` : `<button class="btn xs ${x.lingots ? 'gold' : 'green'}" data-act="bqBuy" data-id="${x.id}" ${can ? '' : 'disabled'}>${price}</button>`;
      return `<div class="card ev-item ${used ? 'used' : ''}"><div class="ev-art">${has('deco-' + x.id) ? pic('deco-' + x.id) : `<span class="ev-emo">${x.emo}</span>`}</div><b>${x.name}</b>${own ? `<small class="up">${used ? '✓ Dans ta ville' : 'À toi'}</small>` : `<small class="muted">${x.desc}</small>`}${btn}</div>`; };
    // looks du quartier : en haut de l'onglet, avec un aperçu de la ville
    const own = G.looksOwned(), cur = s.cityLook || 'base';
    const look = L => { const ready = L.id === 'base' || (has('bg-city-' + L.id) && ['casino', 'appart', 'shop', 'balto', 'kiosque', 'six'].every(b => has(`bld-${b}-${L.id}`))), has_ = own.includes(L.id), on = cur === L.id, lock = s.lvl < L.lvl;
      const price = L.lingots ? `${ic('lingot')}${L.lingots}` : short(L.cash), can = L.lingots ? s.lingots >= L.lingots : s.cash >= L.cash;
      const btn = !ready ? '<button class="btn xs" disabled>Bientôt</button>' : on ? '<span class="lk-on">✓ Ta ville</span>' : has_ ? `<button class="btn xs blue" data-act="lookBuy" data-id="${L.id}">Mettre</button>`
        : lock ? `<button class="btn xs" disabled>${ic('lock')} Niveau ${L.lvl}</button>` : `<button class="btn xs ${L.lingots ? 'gold' : 'green'}" data-act="lookBuy" data-id="${L.id}" ${can ? '' : 'disabled'}>${price}</button>`;
      // look en vente limitée : un compte à rebours à la place de « Spécial » ; passé la date, il n'est plus en vente (ceux qui l'ont le gardent)
      const left = L.until ? Date.parse(L.until) - Date.now() : 0, gone = L.until && left <= 0 && !has_;
      if (gone) return '';
      const tag = L.until && !has_ ? `<span class="lk-tag">${ico('ic-timer', '⏱')} ${left > 864e5 ? `Encore ${Math.ceil(left / 864e5)} j` : `Encore ${Math.max(1, Math.ceil(left / 36e5))} h`}</span>` : '';
      return `<div class="card lk-card ${on ? 'on' : ''} ${L.special ? 'special' : ''}">${tag}<div class="lk-prev" style="background-image:url(${src(L.id === 'base' || !has('bg-city-' + L.id) ? 'bg-city' : 'bg-city-' + L.id)})"></div><b>${L.name}</b><small>${L.desc}</small>${btn}</div>`; };
    return `<h3 class="sec">Le look du quartier <small>· toute la ville change, bâtiments compris</small></h3><div class="grid2 lk-grid">${D.CITY_LOOKS.map(look).join('')}</div>
      <h3 class="sec">Les décos</h3><p class="hint-line">Embellis ton quartier : chaque déco a <b>sa place</b> dans la ville, et elle est à toi pour toujours.</p><div class="grid2 ev-grid">${D.CITY_SHOP.map(item).join('')}</div>`;
  }
  // écran de pub (emplacement réservé : la vraie régie se branchera ici dans la version mobile)
  let adTimer = null;
  function adShow() {
    let el = $('#ad-layer'); if (!el) { $('#app').insertAdjacentHTML('beforeend', '<div id="ad-layer"></div>'); el = $('#ad-layer'); }
    let left = D.ADS.watchS;
    const draw = () => { el.innerHTML = `<div class="ad-top"><span>Publicité</span>${left > 0 ? `<em>${left} s</em>` : ''}<button class="ad-x" data-act="adQuit" aria-label="Fermer">×</button></div>
      <div class="ad-box">${has('logo') ? `<img src="${src('logo')}" alt="">` : '<b>HUSTLE CITY</b>'}<p>Espace publicitaire</p></div>
      <div class="ad-bar"><i style="width:${Math.round((1 - left / D.ADS.watchS) * 100)}%"></i></div>
      ${left > 0 ? `<p class="ad-hint">Encore ${left} s pour gagner tes ${D.ADS.reward} lingots</p>` : `<button class="btn green wide ad-claim" data-act="adClaim">Récupérer +${D.ADS.reward} lingots</button>`}`; };
    el.className = 'on'; draw(); clearInterval(adTimer);
    adTimer = setInterval(() => { left--; draw(); if (left <= 0) clearInterval(adTimer); }, 1000);
  }
  // après une pub imposée : un petit bandeau discret (pas une fenêtre) qui propose le pack Sans pub, 7 s puis il repart
  function noAdsNudge() {
    if (st().noAds) return; const x = D.IAP.find(i => i.id === 'x-noads'); if (!x) return;
    let el = $('#noads-nudge'); if (!el) { $('#app').insertAdjacentHTML('beforeend', '<div id="noads-nudge"></div>'); el = $('#noads-nudge'); }
    el.innerHTML = `<button class="nn-main" data-act="noAdsGo">${has('pack-noads') ? `<img src="${src('pack-noads')}" alt="">` : '<i>🚫</i>'}<span><b>Marre des pubs ?</b><small>Pack Sans pub, pour toujours</small></span><em>${x.price}</em></button><button class="nn-x" data-act="noAdsHide" aria-label="Fermer">×</button>`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(noAdsNudge._t); noAdsNudge._t = setTimeout(() => el.classList.remove('on'), 7000);
  }
  // pub imposée après une montée de niveau : pas avant le niveau 5, pas plus d'une toutes les 30 min, jamais avec le pack Sans pub
  const FORCED_S = 15;
  function maybeInterstitial() {
    const s = st(); if (G.TEST || s.noAds || s.lvl < 5 || Date.now() - (s.adForcedAt || 0) < 30 * 60000) return nextPending();
    s.adForcedAt = Date.now(); s.adsSeen = (s.adsSeen || 0) + 1; window.ONLINE && ONLINE.ev && ONLINE.ev('ad_forced', { lvl: s.lvl });
    let el = $('#ad-layer'); if (!el) { $('#app').insertAdjacentHTML('beforeend', '<div id="ad-layer"></div>'); el = $('#ad-layer'); }
    let left = FORCED_S;
    const draw = () => { el.innerHTML = `<div class="ad-top"><span>Publicité</span>${left > 0 ? `<em>${left} s</em>` : ''}</div>
      <div class="ad-box">${has('logo') ? `<img src="${src('logo')}" alt="">` : '<b>HUSTLE CITY</b>'}<p>Espace publicitaire</p></div>
      <div class="ad-bar"><i style="width:${Math.round((1 - left / FORCED_S) * 100)}%"></i></div>
      ${left > 0 ? '<p class="ad-hint">Le jeu reprend juste après</p>' : '<button class="btn green wide ad-claim" data-act="adForcedEnd">Continuer</button>'}
      `; };
    el.className = 'on'; draw(); clearInterval(adTimer);
    adTimer = setInterval(() => { left--; draw(); if (left <= 0) clearInterval(adTimer); }, 1000);
  }
  function adClose() { clearInterval(adTimer); const el = $('#ad-layer'); if (el) { el.className = ''; el.innerHTML = ''; } }
  function openBoutique(tab) {
    if (tab) bqTab = tab;
    openModal({ title: 'Boutique', icon: 'shop', full: true, tabs: [{ id: 'deco', label: 'Ma ville' }, { id: 'vip', label: 'Lingots & exclus' }], tab: bqTab,
      body: boutiqueBody(), onTab: id => { bqTab = id; setBody(boutiqueBody()); }, refresh: () => setBody(boutiqueBody()) });
  }

  // ------------------------------------------------------------ Le Kiosque
  let kioskTab = 'news', boosterReveal = null;
  function kioskBody() {
    const s = st();
    if (kioskTab === 'booster') {
      const B = D.KIOSK.booster, lock = s.lvl < B.lvl, n = G.boosterCount();
      return `<div class="bst-hero">${packArt()}<div class="bst-count">${n ? `Tu as <b>${n}</b> booster${n > 1 ? 's' : ''} à ouvrir` : 'Aucun booster à ouvrir'}</div>
          <p class="hint-line">Le marchand de journaux vend aussi les paquets de cartes. Chaque booster : 3 récompenses et 1 carte de collection qui a une vraie cote.</p>
          ${n ? '<button class="btn green bst-open pulse" data-act="boosterOpen">Ouvrir un booster</button>' : ''}
          <button class="btn ${n ? '' : 'green'}" data-act="kBooster" ${lock || s.cash < G.boosterPrice() ? 'disabled' : ''}>${lock ? `Niveau ${B.lvl}` : `Acheter un booster · ${short(G.boosterPrice())}`}</button>
          <button class="btn blue" data-act="collection">Voir mon classeur</button></div>`;
    }
    // en haut : le compte à rebours du prochain journal, bien visible, et comment un tuyau fait gagner
    const leftMs = G.editionLeft(), ED = D.KIOSK.editionMin * 60000;
    return `<div class="kiosk-hero">
        <div class="kh-row"><div class="kh-clock"><span class="kh-ic">${ico('bld-kiosque', '📰')}</span><div class="grow"><small>Prochain journal</small><b>${mmss(leftMs)}</b><div class="kh-bar"><i style="width:${Math.round((1 - leftMs / ED) * 100)}%"></i></div></div></div>
          <button class="btn gold sm kh-now" data-act="kRefresh" ${s.lingots >= D.LINGOT.kiosk ? '' : 'disabled'}><span>Tout de suite</span><span>${ic('lingot')}${D.LINGOT.kiosk}</span></button></div>
        <div class="pe-story"><div class="pe-box buy"><small>1. Tu achètes</small><b>${ico('bld-kiosque', '📰')}</b><small>le tuyau</small></div><span class="pe-arr">→</span>
          <div class="pe-box mid"><small>2. Tu mises</small><b>${ico('ic-sport-foot', '⚽')}</b><small>dans son sens</small></div><span class="pe-arr">→</span>
          <div class="pe-box sell"><small>3. Tu gagnes</small><b>${ico('icon-cash', '💰')}</b><small>plus souvent</small></div></div>
        <small class="pe-foot">Juste un peu plus souvent que le hasard : ne mise jamais tout.</small></div>` +
      D.KIOSK.tips.map(t => {
        const b = G.tipBought(t.id), lock = s.lvl < (t.lvl || 1);
        return `<div class="card tip-card ${lock ? 'locked' : ''}"><div class="tc-head"><h4>${ico('tip-' + t.id, t.icon)} ${t.name}</h4>${b ? '<span class="rtag win">Lu</span>' : ''}</div>
          <p>${b ? `<b>« ${esc(b.txt)} »</b>` : t.desc}</p>
          ${b ? '' : lock ? `<button class="btn xs wide" disabled>Niveau ${t.lvl}</button>`
            : `<div class="tc-acts"><button class="btn xs" data-act="kTip" data-id="${t.id}" ${s.cash < G.tipPrice(t) ? 'disabled' : ''}>Acheter · ${short(G.tipPrice(t))}</button>
              <button class="btn xs gold" data-act="kTipL" data-id="${t.id}" ${s.lingots < G.tipLingots(t) ? 'disabled' : ''}>${ic('lingot')}${G.tipLingots(t)}</button></div>`}</div>`;
      }).join('');
  }
  function openKiosk(tab) {
    if (tab) kioskTab = tab; boosterReveal = null;
    openModal({ title: 'Le Kiosque', icon: 'bld-kiosque', full: true, tabs: [{ id: 'news', label: 'Tuyaux du jour' }, { id: 'booster', label: 'Boosters' }], tab: kioskTab,
      body: kioskBody(), onTab: id => { kioskTab = id; boosterReveal = null; setBody(kioskBody()); }, refresh: () => setBody(kioskBody()) });
  }

  // ------------------------------------------------------------ Tournoi des 6 Quartiers : pronos gratuits, classement, cartes
  let sixTab = 'pronos', sixHowOpen = false;
  const sixPastOpen = new Set();
  const fDay = t => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const fHour = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  function untilTxt(ms) { const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24; return d >= 1 ? `${d} j ${h} h` : mmss(ms); }
  function sixBody() {
    const s = st(), S = D.SIX, ph = G.sixPhase(), ms = G.sixMatches(), pts = G.sixPoints(), rank = G.sixRank(), info = G.sixBoardInfo(), n = info.total;
    const next = ms.find(m => m.state === 'soon');
    const head = `<div class="six-hero"><div class="sh-top">${has('bld-six') ? `<span class="six-board">${pic('bld-six')}</span>` : sixBoardArt()}<div><b>${S.name}</b><small>${ph === 'before' ? `Coup d'envoi le ${fDay(G.sixKick(0))} · dans <strong>${untilTxt(G.sixKick(0) - Date.now())}</strong>` : ph === 'on' ? `En cours · journée ${(next || ms[ms.length - 1]).day} / 5` : 'Tournoi terminé'}${G.sixTest() ? ' · <em>mode test</em>' : ''}</small></div></div>
      <div class="sh-chips"><span><small>Tes points</small><b>${pts}</b></span><span><small>Ta place</small><b>${rank ? `${rank}<sup>${rank === 1 ? 'er' : 'e'}</sup> / ${n}` : '–'}</b></span><span><small>Bons pronos</small><b>${ms.filter(m => m.ok).length} / ${ms.filter(m => m.state === 'done' && m.pick != null).length}</b></span></div></div>`;
    if (sixTab === 'board') {
      const rows = info.rows, me = rows.find(r => r.me), top = rows.filter(r => r.rank && r.rank <= 10 && rows.indexOf(r) < 10);
      const row = r => `<div class="sb-row ${r.me ? 'me' : ''}"><span class="sb-rk">${r.rank || '–'}</span><span class="sb-nm">${r.me ? `${esc(r.name)} (toi)` : esc(r.name)}</span><b>${r.pts} pts</b></div>`;
      const fin = G.sixState().final;
      return head + (fin && !fin.claimed ? `<div class="card center six-end"><b>${fin.rank ? `Tournoi terminé : tu finis ${fin.rank}<sup>${fin.rank === 1 ? 'er' : 'e'}</sup> !` : 'Tournoi terminé !'}</b><p>Ta récompense : ${chips(0, G.sixReward(fin.rank).lingots, G.sixReward(fin.rank).boosters ? `<span class="need">${packArt(true)}${G.sixReward(fin.rank).boosters}</span>` : '')}</p><button class="btn green wide" data-act="sixClaim">Récupérer</button></div>` : '') +
        `<h3 class="sec">Les équipes</h3><div class="six-board-list">${G.sixTable().map((t, k) => `<div class="sb-row"><span class="sb-rk">${k + 1}</span>${teamCrest('rugby', t.k, 'mini')}<span class="sb-nm">${t.name}</span><small class="muted">${t.j} m · ${t.diff >= 0 ? '+' : ''}${t.diff}</small><b>${t.pts} pts</b></div>`).join('')}</div>
        <p class="hint-line sx-pts-note">4 points la victoire, 2 le nul, 1 point de bonus si on perd de 7 points ou moins.</p>
        <h3 class="sec">Les joueurs${info.online ? ` <small>· ${n.toLocaleString('fr-FR')} joueur${n > 1 ? 's' : ''}</small>` : ''}</h3><p class="hint-line">${S.pts} points par bon prono.</p>${info.online ? `<div class="six-board-list">${top.map(row).join('')}${top.includes(me) ? '' : `<div class="sb-gap">…</div>${rows.filter(r => !top.includes(r)).map(row).join('')}`}</div>` : `<div class="six-board-list">${row(me)}</div><p class="hint-line center offline-line">Classement en direct indisponible hors ligne.</p>`}
        <h3 class="sec">À la fin du tournoi</h3><div class="six-rew">${S.rewards.map((r, i) => `<div><small>${r.top === 1 ? '1<sup>er</sup>' : r.top === 999 ? 'Tous les autres' : `Top ${r.top}`}</small>${chips(0, r.lingots, r.boosters ? `<span class="need">${packArt(true)}${r.boosters}</span>` : '')}</div>`).join('')}</div>`;
    }
    if (sixTab === 'shop') {
      const closed = ph === 'over', price = x => x.lingots ? `${ic('lingot')}${x.lingots}` : short(x.cash);
      const can = x => x.lingots ? s.lingots >= x.lingots : s.cash >= x.cash;
      const art = x => x.kind === 'avatar' ? `<span class="ev-avpin">${skinPic(s.skin, true)}<span class="av-pin">${teamCrest('rugby', x.team)}</span></span>` : x.kind === 'frame' ? (frameImg(x) ? `<span class="ev-frame-only"><img src="${src(frameImg(x))}" alt=""></span>` : `<span class="ev-frame" style="--f1:${x.colors[0]};--f2:${x.colors[1]}">${skinPic(s.skin, true)}<em>${x.emo}</em></span>`) : has('deco-' + x.id) ? pic('deco-' + x.id) : `<span class="ev-emo">${x.emo}</span>`;
      const item = x => { const own = G.evOwned(x.id), used = G.evUsed(x.id);
        const btn = own ? `<button class="btn xs ${used ? '' : 'blue'}" data-act="evUse" data-id="${x.id}">${x.kind === 'deco' ? (used ? 'Ranger' : 'Poser en ville') : used ? 'Retirer' : 'Utiliser'}</button>`
          : closed ? '<button class="btn xs" disabled>Fermé</button>' : `<button class="btn xs ${x.lingots ? 'gold' : 'green'}" data-act="evBuy" data-id="${x.id}" ${can(x) ? '' : 'disabled'}>${price(x)}</button>`;
        return `<div class="card ev-item ${used ? 'used' : ''}"><div class="ev-art">${art(x)}</div><b>${x.name.replace(/^Photo : /, '')}</b>${own ? `<small class="up">${used ? '✓ Utilisé' : 'À toi'}</small>` : x.desc ? `<small class="muted">${x.desc}</small>` : ''}${btn}</div>`; };
      const grp = (k, t, sub) => `<h3 class="sec">${t} <small>· ${sub}</small></h3><div class="grid2 ev-grid">${S.shop.filter(x => x.kind === k).map(item).join('')}</div>`;
      return head + `<p class="hint-line">Des objets <b>exclusifs</b> du tournoi : tu les gardes pour toujours, mais on ne peut les acheter que pendant l'événement.${closed ? ' <b>La boutique est fermée.</b>' : ''}</p>` +
        grp('avatar', 'Pin\'s supporter', 'l\'écusson de ton équipe, accroché sur ta photo') + grp('frame', 'Cadres', 'autour de ta photo') + grp('deco', 'Pour la ville', 'posés sur la carte');
    }
    if (sixTab === 'cards') {
      const cards = D.ITEMS.filter(i => i.event === 'six'), on = G.sixCardsOn();
      return head + `<p class="hint-line">Une série en <b>édition limitée</b> : ces cartes ne sortent des boosters que pendant le tournoi (environ 1 booster sur 3). Après, on ne peut plus en avoir : leur cote grimpe.</p>
        <div class="explain center">${on ? '🃏 En ce moment dans les boosters !' : ph === 'before' ? 'Dans les boosters dès le début du tournoi.' : 'Plus dans les boosters : seulement d\'occasion, au Comptoir.'}</div>
        <div class="grid2 six-cards">${cards.map(it => { const have = (s.owned[it.id] || []).length; return `<div class="card center ${have ? '' : 'missing'}">${itemPic(it)}<b>${it.name}</b><small class="muted">${have ? ownGain(it.id) : 'Pas encore'}</small></div>`; }).join('')}</div>
        ${on ? '<button class="btn green wide" data-act="boosters">Ouvrir mes boosters</button>' : ''}`;
    }
    // pronos, journée par journée
    const T = S.teams, lab = ['1', 'N', '2'];
    const card = m => {
      const btn = (p, txt) => `<button class="sx-pick ${m.pick === p ? 'on' : ''} ${m.state === 'done' && m.res === p ? 'win' : ''}" data-act="sixPick" data-i="${m.i}" data-p="${p}" ${m.state !== 'soon' ? 'disabled' : ''}>${txt}</button>`;
      const st2 = m.state === 'soon' ? `${fDay(m.kickoff)} · ${fHour(m.kickoff)}` : m.state === 'live' ? '<span class="live-pill"><i></i>LIVE</span>' : 'Terminé';
      const res = m.state === 'done' ? (m.pick == null ? '<span class="sx-res">Match terminé</span>' : m.ok ? `<span class="sx-res ok">✓ Bon prono : +${S.pts} pts, +${S.lingotPerGood} lingot</span>` : '<span class="sx-res ko">✗ Raté</span>') : m.state === 'soon' && m.pick == null ? '<span class="sx-res todo">À toi de jouer : choisis ton prono</span>' : '';
      const o = G.sixOdds(m.i), ru = G.sixRumor(m.i), form = t => `<span class="sx-form">${G.sixForm(t).map(x => `<i class="f${x}">${x}</i>`).join('')}</span>`;
      return `<div class="sx-match ${m.state}"><div class="sx-top"><small>${st2}</small>${res}</div>
        <div class="sx-teams"><span class="sx-t">${teamCrest('rugby', m.h, 'mini')}<span><b>${T[m.h][0]}</b>${form(m.h)}</span></span><span class="sx-score">${m.state === 'soon' ? 'vs' : `${m.sh} - ${m.sa}`}</span><span class="sx-t r"><span><b>${T[m.a][0]}</b>${form(m.a)}</span>${teamCrest('rugby', m.a, 'mini')}</span></div>
        <div class="sx-odds"><i style="width:${o[0] * 100}%"></i><i style="width:${o[1] * 100}%"></i><i style="width:${o[2] * 100}%"></i></div>
        <div class="sx-odds-l"><span>${Math.round(o[0] * 100)} %</span><span>Chances d'après les bookmakers</span><span>${Math.round(o[2] * 100)} %</span></div>
        ${ru ? `<p class="sx-rumor ${m.state === 'done' ? (ru.real ? 'true' : 'false') : ''}">${ico('ic-rumor', '🗞️')} <b>Rumeur :</b> ${ru.txt} <em>${m.state === 'done' ? (ru.real ? '✓ C\'était vrai' : '✗ C\'était faux') : 'Vrai ou faux ?'}</em></p>` : ''}
        <div class="sx-picks">${btn(0, shortTeam(T[m.h][0]))}${btn(1, 'Nul')}${btn(2, shortTeam(T[m.a][0]))}</div></div>`;
    };
    const cur = G.sixCurDay();
    // Une journée terminée tient sur UNE ligne (bons pronos, points) ; on la déplie d'un geste pour voir les scores.
    // Les journées à venir sont regroupées en une seule ligne. La journée en cours est toujours en haut.
    const pastRow = m => {
          const res = m.pick == null ? 'none' : m.ok ? 'ok' : 'ko', pk = m.pick == null ? 'Match terminé' : m.pick === 1 ? 'Nul' : shortTeam(m.pick === 0 ? m.home : m.away);
          return `<div class="sx-p ${res}"><span class="sx-pt">${teamCrest('rugby', m.h, 'mini')}<b>${shortTeam(m.home)}</b></span><span class="sx-ps">${m.sh}-${m.sa}</span><span class="sx-pt r"><b>${shortTeam(m.away)}</b>${teamCrest('rugby', m.a, 'mini')}</span>
            <span class="sx-pv">${res === 'ok' ? `✓ ${pk}<em>+${S.pts} pts</em>` : res === 'ko' ? `✗ ${pk}` : pk}</span></div>`; };
    const today = [], upcoming = [], locked = [], past = [];
    [1, 2, 3, 4, 5].forEach(d => {
      const L = ms.filter(m => m.day === d).sort((a, b) => a.kickoff - b.kickoff), open = G.sixDayOpen(d);
      if (!open) return locked.push(d);
      if (L.every(m => m.state === 'done')) {
        const good = L.filter(m => m.ok).length, isOpen = sixPastOpen.has(d);
        return past.unshift(`<div class="sx-pday ${isOpen ? 'open' : ''}"><button class="sx-pline" data-act="sixPast" data-d="${d}"><b>Journée ${d}</b><span>${good} / ${L.length} bons pronos</span><em>+${good * S.pts} pts</em><i>${isOpen ? '▾' : '▸'}</i></button>${isOpen ? `<div class="sx-past">${L.map(pastRow).join('')}</div>` : ''}</div>`);
      }
      if (d === cur) return today.push(`<div class="sx-today"><div class="sx-today-h"><b>${ico('bld-six', '🏉')} Journée ${d}</b><small>${fDay(L[0].kickoff)}</small></div>${L.filter(m => m.state !== 'done').map(card).join('')}${L.some(m => m.state === 'done') ? `<div class="sx-past">${L.filter(m => m.state === 'done').map(pastRow).join('')}</div>` : ''}</div>`);
      upcoming.push(`<h3 class="sec">Journée ${d} <small>· ${fDay(L[0].kickoff)}</small></h3>${L.map(card).join('')}`);
    });
    const lockTxt = locked.length ? `<div class="sx-locked">${ico('icon-lock', '🔒')} ${locked.length > 1 ? `Journées ${locked[0]} à ${locked[locked.length - 1]}` : `Journée ${locked[0]}`} : ${locked.length > 1 ? 'elles s\'ouvrent' : 'elle s\'ouvre'} une par une, quand la précédente est finie.</div>` : '';
    const how = `<button class="sx-how" data-act="sixHow">${sixHowOpen ? '▾' : '▸'} Comment ça marche ?</button>${sixHowOpen ? `<p class="hint-line">Pronos <b>gratuits</b> : choisis le gagnant de chaque match avant le coup d'envoi. Bon prono = <b>${S.pts} points</b> et <b>+${S.lingotPerGood} lingot</b>. La <b>forme</b> : V = victoire, N = nul, D = défaite. Les rumeurs sont vraies… une fois sur deux.</p>` : ''}`;
    return head + how + today.join('') + upcoming.join('') + lockTxt + (past.length ? `<h3 class="sec">Journées passées</h3>${past.join('')}` : '');
  }
  const shortTeam = n => n.split(' ')[0];
  // pas d'événement : un panneau de quartier sobre qui annonce le prochain
  function openPanneau() {
    const t = G.nextEventAt(), n = nextEvDays();
    const when = t ? new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
    openModal({ title: 'Le Panneau', icon: 'star', center: true, body: `<div class="panneau-off">
      <div class="po-board">${has('bld-six-off') ? pic('bld-six-off') : `<span class="six-off-fb">${pic('bld-six')}</span>`}</div>
      <b class="po-title">Pas d'événement en cours</b>
      ${G.cdmPhase() === 'before' && G.cdmT()[0] === t ? `<p class="center po-cdm">${ico('ic-ev-cdm', '🎃')} <b>${D.CDM.name}</b> arrive pour Halloween : Zombies, Vampires, Démons ou Fantômes, tu choisiras ton camp !</p>` : ''}
      <p class="center">${t ? `Reviens dans <b>${n} jour${n > 1 ? 's' : ''}</b> : le prochain commence le <b>${when}</b>.` : 'Le prochain arrive bientôt : il sera annoncé ici.'}</p>
      <p class="hint-line center">Tes pin's et tes cadres restent dans ton profil.</p></div>` });
  }
  // fin du tournoi : un récap (scores, ta place, tes récompenses), puis le Panneau redevient normal
  function openSixRecap() {
    const S = D.SIX, fin = G.sixState().final, ms = G.sixMatches(), info = G.sixBoardInfo(), rows = info.rows, me = rows.find(r => r.me) || {}, tab = G.sixTable(), champ = tab[0];
    const good = ms.filter(m => m.ok).length, played = ms.filter(m => m.pick != null).length, rw = G.sixReward(fin.rank);
    const cards = D.ITEMS.filter(i => i.event === 'six'), got = cards.filter(i => (st().owned[i.id] || []).length).length;
    const sup = r => r === 1 ? 'er' : 'e';
    const podium = rows.filter(r => r.rank && r.rank <= 3).slice(0, 3).map((r, k) => `<div class="rc-pod p${k + 1} ${r.me ? 'me' : ''}"><i>${ico(['medal-gold', 'medal-silver', 'medal-bronze'][k], ['🥇', '🥈', '🥉'][k])}</i><b>${esc(r.me ? 'Toi' : r.name)}</b><small>${r.pts} pts</small></div>`).join('');
    openModal({ title: 'Tournoi terminé', icon: 'star', center: true, body: `<div class="six-recap">
      <div class="rc-top">${has('bld-six') ? `<span class="six-board">${pic('bld-six')}</span>` : sixBoardArt()}<div><small>${S.name}</small><b>${fin.rank ? `Tu finis ${fin.rank}<sup>${sup(fin.rank)}</sup> sur ${info.total.toLocaleString('fr-FR')}` : `${G.sixPoints()} points`}</b></div></div>
      <div class="sh-chips rc-chips"><span><small>Tes points</small><b>${G.sixPoints()}</b></span><span><small>Bons pronos</small><b>${good} / ${played}</b></span><span><small>Cartes limitées</small><b>${got} / ${cards.length}</b></span></div>
      ${info.online ? `<h3 class="sec">Le podium des joueurs</h3><div class="rc-podium">${podium}</div>` : '<p class="hint-line center offline-line">Classement en direct indisponible hors ligne.</p>'}${me.rank > 3 ? `<p class="hint-line center">Toi : ${me.rank}<sup>${sup(me.rank)}</sup> avec ${me.pts} points.</p>` : ''}
      <h3 class="sec">Le classement des équipes</h3><div class="six-board-list">${tab.map((t, k) => `<div class="sb-row ${k === 0 ? 'me' : ''}"><span class="sb-rk">${k + 1}</span>${teamCrest('rugby', t.k, 'mini')}<span class="sb-nm">${t.name}${k === 0 ? ` ${ico('icon-trophy', '🏆')}` : ''}</span><b>${t.pts} pts</b></div>`).join('')}</div>
      <h3 class="sec">Tes récompenses</h3><div class="rc-rew">${chips(0, rw.lingots + good * S.lingotPerGood, rw.boosters ? `<span class="need">${packArt(true)}${rw.boosters}</span>` : '')}<small>dont ${good * S.lingotPerGood} lingot${good > 1 ? 's' : ''} déjà gagnés avec tes bons pronos</small></div>
      <button class="btn green wide big" data-act="sixRecapOk">${fin.claimed ? 'Super !' : 'Récupérer mes récompenses'}</button>
      <p class="hint-line center">${champ ? `${champ.name} remporte le tournoi. ` : ''}Rendez-vous au prochain événement, sur le Panneau !</p></div>` });
  }
  function openSix(tab) {
    if (G.panneau() === 'cdm') return openCdm(tab === 'pronos' ? null : tab);
    const fin = G.sixState().final;
    if (G.sixPhase() === 'over' && fin && !G.eventOff()) return openSixRecap();
    if (G.eventOff()) return openPanneau();
    if (tab) sixTab = tab; else sixTab = 'pronos';
    G.sixSeenNow(); renderHud();
    openModal({ title: D.SIX.name, icon: 'star', full: true, tabs: [{ id: 'pronos', label: 'Pronos' }, { id: 'board', label: 'Classement' }, { id: 'cards', label: 'Cartes' }, { id: 'shop', label: 'Boutique' }], tab: sixTab,
      body: sixBody(), onTab: id => { sixTab = id; setBody(sixBody()); }, refresh: () => setBody(sixBody()) });
  }

  // ------------------------------------------------------------ La Coupe des Morts (Halloween) : 4 équipes, des points pour ton camp, défis de la nuit, bonbons
  // Le Panneau de la place l'affiche pendant ses dates (avant le tournoi). Images à venir : team-<équipe>, ev-cdm-*, pin-<équipe>, frame-cdm, deco-* (repli emoji en attendant).
  let cdmTab = 'team', cdmHowOpen = false;
  const fmtN = n => Math.round(n).toLocaleString('fr-FR');
  const candyIc = () => has('ev-cdm-candy') ? `<img class="cdm-ci" src="${src('ev-cdm-candy')}" alt="">` : '<i class="cdm-ce">🍬</i>';
  const candy = n => `<span class="cdm-candy">${candyIc()}<b>${n}</b></span>`;
  // écusson d'une équipe (mascotte) : l'image si elle existe, sinon l'emoji sur un rond à sa couleur
  function cdmCrest(id, cls = '') {
    const T = G.cdmTeam(id) || { emo: '🏆', color: '#ffd23f', dark: '#7a5a00' }, n = id === 'gold' ? 'ev-cdm-cup' : 'team-' + id;
    return `<span class="cdm-crest ${cls} ${has(n) ? 'img' : ''}" style="--tc:${T.color};--td:${T.dark}">${has(n) ? `<img src="${src(n)}" alt="" draggable="false">` : `<i>${T.emo}</i>`}</span>`;
  }
  const cdmCup = () => has('ev-cdm-cup') ? `<img src="${src('ev-cdm-cup')}" alt="">` : '<i>🏆</i>';
  function cdmTimer() {
    if (G.cdmPhase() !== 'on') return 'Terminée';
    const t = G.cdmT()[1] - Date.now(), m = Math.max(0, Math.floor(t / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mn = m % 60;
    return `${ico('ic-ev-cdm', '🎃')} Encore ${d ? `${d} j ${h} h` : h ? `${h} h ${String(mn).padStart(2, '0')}` : `${mn} min`}`;
  }
  // le Panneau habillé pour Halloween (dessiné en attendant l'image ev-cdm-board)
  function cdmBoardArt() {
    return `<span class="six-board cdm-board"><svg viewBox="0 0 160 130"><rect x="22" y="70" width="10" height="58" rx="3" fill="#3a2a1e" stroke="#120a06" stroke-width="3"/><rect x="128" y="70" width="10" height="58" rx="3" fill="#3a2a1e" stroke="#120a06" stroke-width="3"/>
      <rect x="6" y="6" width="148" height="82" rx="12" fill="#2a1048" stroke="#120a06" stroke-width="4"/><rect x="13" y="13" width="134" height="68" rx="8" fill="#170a2a" stroke="#ff7a1a" stroke-width="2"/>
      <circle cx="33" cy="48" r="14" fill="#ff7a1a" stroke="#120a06" stroke-width="2.5"/><path d="M26 45 l4 -3 l2 4 Z M36 45 l4 -3 l1 4 Z M25 53 q8 6 16 0" stroke="#120a06" stroke-width="2" fill="#120a06"/><rect x="31" y="31" width="4" height="6" rx="1" fill="#3d7a1e"/>
      <text x="96" y="35" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="14" fill="#c9a4ff">LA COUPE</text><text x="96" y="57" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="19" fill="#ff7a1a">DES MORTS</text>
      <rect x="62" y="63" width="68" height="13" rx="6.5" fill="#5bbf3a"/><text x="96" y="73" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="9.5" fill="#120a06">${G.cdmPhase() === 'on' ? 'EN COURS' : 'TERMINÉE'}</text></svg></span>`;
  }
  // haut de la fenêtre : la Coupe, le temps qui reste, tes points, tes bonbons, ta place dans ton équipe
  function cdmHero() {
    const S = G.cdmState(), B = G.cdmBoard(), bg = has('ev-cdm-bg') ? ` style="--bg:url('${new URL(src('ev-cdm-bg'), location.href).href}')"` : '';
    return `<div class="cdm-hero ${bg ? 'has-bg' : ''}"${bg}><div class="ch-top"><span class="ch-cup">${cdmCup()}</span><div><b>${D.CDM.name}</b><small>${G.cdmPhase() === 'on' ? `Fin dans <strong>${untilTxt(G.cdmT()[1] - Date.now())}</strong>` : 'Terminée'}${G.cdmTest() ? ' · <em>mode test</em>' : ''}</small></div></div>
      ${S.team ? `<div class="sh-chips"><span><small>Tes points</small><b>${fmtN(S.pts)}</b></span><span><small>Bonbons</small><b class="ch-candy">${candyIc()}${S.candy}</b></span><span><small>Dans ton équipe</small><b>${B.online ? `${B.rank}<sup>${B.rank === 1 ? 'er' : 'e'}</sup>` : '–'}</b></span></div>` : ''}</div>`;
  }
  const offLine = () => '<p class="hint-line center offline-line">Classement en direct indisponible hors ligne.</p>';
  // la course des 4 équipes
  function cdmRace(B, mine) {
    const max = Math.max(1, ...B.teams.map(t => t.total));
    return `<div class="cdm-race ${B.online ? '' : 'off'}">${[...B.teams].sort((a, b) => a.rank - b.rank).map(t => `<div class="cdm-lane ${t.id === mine ? 'me' : ''}" style="--tc:${t.color}">
      <span class="cl-rk">${B.online ? t.rank : ''}</span>${cdmCrest(t.id, 'mini')}<span class="cl-mid"><b>${t.name}${t.id === mine ? ' <em>ton équipe</em>' : ''}</b>${B.online ? `<span class="cl-bar"><i style="width:${Math.max(3, t.total / max * 100)}%"></i></span>` : ''}</span>
      <b class="cl-pts">${B.online || t.id === mine ? fmtN(t.total) : '–'}</b></div>`).join('')}</div>${B.online ? '' : offLine()}`;
  }
  // ce que donne une récompense (palier ou fin de Coupe)
  function cdmRew(x, team) {
    const S = G.cdmState(), id = x.pin ? 'pn-' + (team || S.team) : x.item, it = id && D.EV_SHOP.find(o => o.id === id);
    return chips(x.cash || 0, x.lingots || 0, (x.boosters ? `<span class="need">${packArt(true)}${x.boosters}</span>` : '') + (it ? `<span class="need cdm-rit" title="${esc(it.name)}">${evArt(it, true)}</span>` : ''));
  }
  // image d'un objet de la boutique (pin's, cadre, déco, booster)
  function evArt(x, mini) {
    if (x.kind === 'avatar') return mini ? pinArt(x) : `<span class="ev-avpin">${skinPic(st().skin, true)}<span class="av-pin">${pinArt(x)}</span></span>`;
    if (x.kind === 'frame') return frameImg(x) ? `<span class="ev-frame-only"><img src="${src(frameImg(x))}" alt=""></span>` : mini ? `<i class="cdm-emo">${x.emo}</i>` : `<span class="ev-frame" style="--f1:${x.colors[0]};--f2:${x.colors[1]}">${skinPic(st().skin, true)}<em>${x.emo}</em></span>`;
    if (x.kind === 'booster') return mini ? packArt(true) : `<span class="cdm-pack">${packArt()}${x.n > 1 ? `<em>×${x.n}</em>` : ''}</span>`;
    return has(decoImg(x)) ? pic(decoImg(x)) : `<span class="ev-emo">${x.emo}</span>`;
  }
  const CDM_LBL = { bets: 'Placer un pari', betsWon: 'Gagner un pari', combiWon: 'Gagner un combiné', scratch: 'Gratter un ticket', spins: 'Un tour de machine à sous', roulette: 'Un tour de roulette',
    bigWin: 'Un gain ×100 au casino', boosters: 'Ouvrir un booster', rigCollect: 'Récolter ta machine', rigCool: 'Refroidir ta machine', tips: 'Acheter un tuyau', itemBuy: 'Acheter un objet',
    itemProfit: 'Revendre un objet en bénéfice', cryptoBuy: 'Acheter de la crypto', cryptoProfit: 'Vendre une crypto en bénéfice', deals: 'Accepter un bon plan', clubNights: 'Une soirée au Club',
    clubSpots: 'Un coin du Club', series: 'Finir une série de cartes', agActs: 'Une activité PrivéFans', quest: 'Réussir une mission', chal: 'Réussir un défi du jour', week: 'Réussir un objectif de la semaine', daily: 'Prendre ton cadeau du jour' };
  function cdmBody() {
    const S = G.cdmState(), C = D.CDM, T = G.cdmTeam(S.team), B = G.cdmBoard(), on = G.cdmPhase() === 'on', head = cdmHero();
    if (cdmTab === 'nights') {
      const N = G.cdmNight(), Bn = C.nightBonus, by = (S.day && S.day.d === N.d && S.day.by) || {};
      const rows = N.list.map((c, i) => { const v = Math.min(c.goal, G.chalValue(c)), done = v >= c.goal;
        return `<div class="card cdm-night ${c.got ? 'got' : done ? 'ready' : ''}"><div class="cn-l"><b>${c.t}</b><span class="cn-bar"><i style="width:${v / c.goal * 100}%"></i></span><small>${v} / ${c.goal}</small></div>
          ${c.got ? '<span class="cn-ok">✓</span>' : done && on ? `<button class="btn xs green" data-act="cdmNight" data-i="${i}">+${C.nightPts} pts</button>` : `<span class="cn-pts">+${C.nightPts} pts</span>`}</div>`; }).join('');
      const how = Object.entries(C.pts).map(([k, p]) => `<div class="sb-row"><span class="sb-nm">${CDM_LBL[k] || k}</span><small class="muted">${by[k] || 0} / ${p[1]} aujourd'hui</small><b>+${p[0]}</b></div>`).join('');
      return head + `<h3 class="sec">Les défis de la nuit <small>· nouveaux à minuit</small></h3>${rows}
        <p class="hint-line center">Les 3 réussis : <b>+${Bn.pts} pts</b> et <b>${Bn.candy}</b> ${candyIc()} en bonus${N.bonus ? ' <b class="up">✓</b>' : ''}.</p>
        <button class="sx-how" data-act="cdmHow">${cdmHowOpen ? '▾' : '▸'} Comment gagner des points ?</button>
        ${cdmHowOpen ? `<p class="hint-line">Tout ce que tu fais dans le jeu rapporte des points à ton équipe, avec un maximum par jour pour chaque action. <b>${C.perCandy} points = 1 bonbon</b>.</p><div class="six-board-list cdm-how">${how}</div>` : ''}`;
    }
    if (cdmTab === 'steps') {
      return head + `<p class="hint-line">Tes points perso débloquent des récompenses. Elles restent à récupérer jusqu'à la fin de la Coupe.</p>` + C.steps.map((x, i) => { const got = S.steps[i], ok = S.pts >= x.n;
        return `<div class="card cdm-step ${got ? 'got' : ok ? 'ready' : ''}"><span class="cs-n"><b>${fmtN(x.n)}</b><small>points</small></span><span class="cs-rew">${cdmRew(x)}</span>
          ${got ? '<span class="cn-ok">✓</span>' : ok ? `<button class="btn xs green" data-act="cdmStep" data-i="${i}">Récupérer</button>` : `<span class="cs-left">encore ${fmtN(x.n - S.pts)}</span>`}</div>`; }).join('');
    }
    if (cdmTab === 'shop') {
      const item = x => { const own = x.kind !== 'booster' && G.evOwned(x.id), used = own && G.evUsed(x.id), left = x.kind === 'booster' ? x.max - (S.bought[x.id] || 0) : 1;
        const btn = own ? `<button class="btn xs ${used ? '' : 'blue'}" data-act="cdmUse" data-id="${x.id}">${x.kind === 'deco' ? (used ? 'Ranger' : 'Poser en ville') : used ? 'Retirer' : 'Utiliser'}</button>`
          : !on ? '<button class="btn xs" disabled>Fermé</button>' : left <= 0 ? '<button class="btn xs" disabled>Épuisé</button>'
          : `<button class="btn xs gold cdm-buy" data-act="cdmBuy" data-id="${x.id}" ${S.candy >= x.candy ? '' : 'disabled'}>${candyIc()}${x.candy}</button>`;
        return `<div class="card ev-item ${used ? 'used' : ''}"><div class="ev-art">${evArt(x)}</div><b>${x.name}</b>${own ? `<small class="up">${used ? '✓ Utilisé' : 'À toi'}</small>` : x.kind === 'booster' ? `<small class="muted">Encore ${left} en stock</small>` : x.desc ? `<small class="muted">${x.desc}</small>` : ''}${btn}</div>`; };
      const grp = (k, t, sub) => `<h3 class="sec">${t} <small>· ${sub}</small></h3><div class="grid2 ev-grid">${C.shop.filter(x => x.kind === k && !x.noSale).map(item).join('')}</div>`;
      return head + `<p class="hint-line">Tu payes en <b>bonbons</b> ${candyIc()} : 1 bonbon tous les ${C.perCandy} points. Tes objets restent à toi pour toujours.${on ? '' : ' <b>La boutique est fermée.</b>'}</p>` +
        grp('deco', 'Pour la ville', 'posés sur la carte') + grp('avatar', 'Pin\'s', 'sur ta photo de profil') + grp('frame', 'Cadre', 'autour de ta photo') + grp('booster', 'Boosters', 'des cartes en plus');
    }
    // l'équipe : la course, ta part, le top 5, les récompenses de fin
    const top = B.top.map((r, k) => `<div class="sb-row ${r.me ? 'me' : ''}"><span class="sb-rk">${B.online ? k + 1 : '–'}</span><span class="sb-nm">${esc(r.me ? `${r.name} (toi)` : r.name)}</span><b>${fmtN(r.pts)} pts</b></div>`).join('');
    const meRow = B.online && !B.top.some(r => r.me) ? `<div class="sb-gap">…</div><div class="sb-row me"><span class="sb-rk">${B.rank}</span><span class="sb-nm">${esc(st().name)} (toi)</span><b>${fmtN(S.pts)} pts</b></div>` : '';
    return head + `<h3 class="sec">La course des équipes${B.online ? ` <small>· ${fmtN(B.players)} joueur${B.players > 1 ? 's' : ''}</small>` : ''}</h3>${cdmRace(B, S.team)}
      <div class="card cdm-mine" style="--tc:${T.color};--td:${T.dark}">${cdmCrest(T.id)}<div><b>${T.name}</b><small>« ${T.motto} »</small><p>Ta part : <b>${fmtN(S.pts)} pts</b>${B.online ? ` · ${B.rank}<sup>${B.rank === 1 ? 'er' : 'e'}</sup> sur ${fmtN(B.of)}` : ''}</p></div></div>
      <h3 class="sec">Le top 5 des ${T.name}</h3><div class="six-board-list">${top}${meRow}</div>
      <h3 class="sec">À la fin de la Coupe</h3><div class="six-rew cdm-rew">${C.rewards.map(r => `<div><small>${r.place === 1 ? '1<sup>re</sup> équipe' : `${r.place}<sup>e</sup>`}</small>${r.chest && has('ev-cdm-chest') ? `<img class="cdm-chest" src="${src('ev-cdm-chest')}" alt="">` : ''}${cdmRew(r)}</div>`).join('')}</div>
      <p class="hint-line center">Et pour tous : <b>la Coupe des Morts</b> en trophée, à poser sur tes étagères. Récompense d'équipe dès <b>${C.minReward} points</b>.</p>`;
  }
  // avant de rejoindre : les 4 camps en grand
  function cdmChooseBody() {
    const B = G.cdmBoard();
    return cdmHero() + `<p class="hint-line center">Choisis ton camp ! Tout ce que tu fais dans le jeu rapporte des points à ton équipe. <b>Ton choix est définitif</b> jusqu'à la fin de la Coupe.</p>
      <div class="grid2 cdm-pick">${D.CDM.teams.map(t => { const b = B.teams.find(x => x.id === t.id);
        return `<button class="cdm-tcard" style="--tc:${t.color};--td:${t.dark}" data-act="cdmPick" data-id="${t.id}">${cdmCrest(t.id, 'big')}<b>${t.name}</b><small>« ${t.motto} »</small>${B.online ? `<em>${b.rank}<sup>${b.rank === 1 ? 're' : 'e'}</sup> · ${fmtN(b.total)} pts · ${fmtN(b.players)} joueur${b.players > 1 ? 's' : ''}</em>` : ''}</button>`; }).join('')}</div>${B.online ? '' : offLine()}`;
  }
  function cdmTabs() { const n = G.cdmNightReady(), k = G.cdmStepsReady(), dot = x => x ? ` <i class="tab-dot">${x}</i>` : '';
    return [{ id: 'team', label: 'Équipes' }, { id: 'nights', label: 'Défis' + dot(n) }, { id: 'steps', label: 'Paliers' + dot(k) }, { id: 'shop', label: 'Boutique' }]; }
  function openCdm(tab) {
    const S = G.cdmState(), ph = G.cdmPhase();
    if (S.final && !S.final.seen) return openCdmRecap();
    G.cdmSeenNow(); renderHud(); if (window.ONLINE && ONLINE.cdmSync) ONLINE.cdmSync();
    if (!S.team) {
      if (ph !== 'on') return openPanneau();
      return openModal({ title: D.CDM.name, icon: 'ic-ev-cdm', full: true, theme: 'cdm', body: cdmChooseBody(), refresh: () => { if (!G.cdmState().team) setBody(cdmChooseBody()); } });
    }
    if (tab) cdmTab = tab;
    openModal({ title: D.CDM.name, icon: 'ic-ev-cdm', full: true, theme: 'cdm', tabs: cdmTabs(), tab: cdmTab,
      body: cdmBody(), onTab: id => { cdmTab = id; setBody(cdmBody()); }, refresh: () => { setBody(cdmBody()); document.querySelectorAll('#modal .tab').forEach((b, i) => { const l = b.querySelector('.tab-lbl'), t = cdmTabs()[i]; if (l && t && l.innerHTML !== t.label) l.innerHTML = t.label; }); } });
  }
  // on y va depuis Momo, une notif ou le téléphone : la ville, centrée sur le Panneau
  function goCdm(tab) { closeModal(); setScene('city'); focusBld('six'); openCdm(tab); }
  function cdmConfirm(id) {
    const t = G.cdmTeam(id); if (!t) return;
    openModal({ title: 'Ton camp', icon: 'ic-ev-cdm', center: true, theme: 'cdm', body: `<div class="cdm-confirm" style="--tc:${t.color};--td:${t.dark}">${cdmCrest(t.id, 'big')}
      <b>Rejoindre les ${t.name} ?</b><small>« ${t.motto} »</small><p class="hint-line center">C'est pour toute la Coupe : tu ne pourras plus changer de camp.</p>
      <div class="grid2"><button class="btn" data-act="cdmBack">Je réfléchis</button><button class="btn green" data-act="cdmJoin" data-id="${t.id}">Je les rejoins !</button></div></div>` });
  }
  // fin de la Coupe : le classement final, ta part, tes récompenses ; ensuite le Panneau redevient normal
  function openCdmRecap() {
    const S = G.cdmState(), f = S.final, T = G.cdmTeam(S.team), r = f.ok ? G.cdmReward(f.place) : null, sup = n => n === 1 ? 're' : 'e';
    const order = f.order.length ? `<h3 class="sec">Le classement final</h3><div class="six-board-list">${f.order.map((t, k) => { const x = G.cdmTeam(t.id);
      return `<div class="sb-row ${t.id === S.team ? 'me' : ''}"><span class="sb-rk">${k + 1}</span>${cdmCrest(t.id, 'mini')}<span class="sb-nm">${x.name}${k === 0 ? ` ${ico('icon-trophy', '🏆')}` : ''}</span><b>${fmtN(t.total)} pts</b></div>`; }).join('')}</div>` : offLine();
    openModal({ title: 'Coupe des Morts terminée', icon: 'ic-ev-cdm', center: true, theme: 'cdm', body: `<div class="cdm-recap">
      <div class="rc-top"><span class="ch-cup">${f.place === 1 && has('ev-cdm-chest') ? `<img src="${src('ev-cdm-chest')}" alt="">` : cdmCup()}</span><div><small>${D.CDM.name}</small><b>${f.place ? `Les ${T.name} finissent ${f.place}<sup>${sup(f.place)}</sup> !` : `Merci d'avoir défendu les ${T.name} !`}</b></div></div>
      <div class="sh-chips rc-chips"><span><small>Tes points</small><b>${fmtN(f.pts)}</b></span><span><small>Dans ton équipe</small><b>${f.rank ? `${f.rank}<sup>${f.rank === 1 ? 'er' : 'e'}</sup>` : '–'}</b></span><span><small>Bonbons gagnés</small><b>${S.candyAll}</b></span></div>
      ${order}
      <h3 class="sec">Tes récompenses</h3><div class="rc-rew cdm-final-rew">${r ? cdmRew(r) : ''}<span class="rw-chips"><span class="need cdm-rit" title="La Coupe des Morts (trophée)">${cdmCup()}</span></span>
        <small>${r ? `${f.place ? `Récompense de la ${f.place}<sup>${sup(f.place)}</sup> équipe` : 'Récompense de participation'}, plus la Coupe des Morts pour tes étagères.` : `La Coupe des Morts pour tes étagères (récompense d'équipe dès ${D.CDM.minReward} points).`}</small></div>
      <button class="btn green wide big" data-act="cdmRecapOk">${f.claimed ? 'Super !' : 'Récupérer mes récompenses'}</button>
      <p class="hint-line center">Rendez-vous l'an prochain pour une nouvelle Coupe !</p></div>` });
  }

  // ------------------------------------------------------------ Le Comptoir (objets de collection)
  let shopTab = 'card';
  let justBought = null;
  // « Achetée » seulement si on vient de l'acheter dans cet arrivage ; une carte qu'on a depuis longtemps est « Possédée »
  const boughtNow = id => { const a = st().owned[id] || [], e = a[a.length - 1]; return !!e && e.paid > 0 && e.t >= Date.now() - (30 * 60000 - G.stockLeft()); };
  let shopPlace = 'comptoir';
  const shopOfItem = id => { const it = id && G.item(id); return (it && D.ITEM_CATS[it.cat] || {}).shop || 'comptoir'; };
  const SHOP_PLACES = { comptoir: { title: 'Le Comptoir', icon: 'trophy', who: 'le Comptoir' }, bijou: { title: 'Bijouterie Diamant', icon: 'bld-bijou', who: 'la Bijouterie' }, garage: { title: 'Garage Prestige', icon: 'bld-garage', who: 'le Garage' } };
  function openShop(tab, place) {
    if (place) shopPlace = place; else if (!tab || (D.ITEM_CATS[tab] && D.ITEM_CATS[tab].shop !== shopPlace)) shopPlace = tab && D.ITEM_CATS[tab] ? D.ITEM_CATS[tab].shop : 'comptoir';
    if (tab) shopTab = tab;
    const tabs = Object.entries(D.ITEM_CATS).filter(([k, c]) => !c.noBuy && c.shop === shopPlace).map(([k, c]) => ({ id: k, label: `${ico('cat-' + k, '')}${c.name}`, locked: !G.catUnlocked(k), lvl: c.lvl }));
    tabs.push({ id: 'news', label: 'Actus' });   // chaque boutique a ses actus : celles de ses propres objets
    if (!tabs.find(t => t.id === shopTab) || tabs.find(t => t.id === shopTab).locked) shopTab = (tabs.find(t => !t.locked) || tabs[0]).id;
    const P = SHOP_PLACES[shopPlace];
    openModal({ title: P.title, icon: P.icon, full: true, tabs, tab: shopTab, body: shopBody(), refresh: () => setBody(shopBody()), onTab: id => { shopTab = id; setBody(shopBody()); } });
  }
  function shopBody() {
    const s = st();
    if (shopTab === 'news') {
      // chaque rumeur avec l'objet concerné, sa cote, et de quoi agir tout de suite
      const n = s.market.news.filter(x => x.item && shopOfItem(x.item) === shopPlace);
      return `<p class="hint-line">Les rumeurs font bouger les prix. <b>Ça monte ?</b> Achète vite. <b>Ça chute ?</b> Revends avant que ça baisse encore.</p>` +
        (n.length ? n.map(x => {
          const it = x.item && G.item(x.item); if (!it) return '';
          const mine = (s.owned[it.id] || []).length, h = s.market.hist[it.id];
          const canBuy = G.catUnlocked(it.cat);
          return `<div class="news-card ${x.up ? 'up' : 'down'}"><span class="nc-arrow">${x.up ? '▲' : '▼'}</span>
            <div class="nc-top"><span class="nc-pic">${itemPic(it)}</span><div class="nc-txt"><small>${x.tip ? 'Un pote t\'a prévenu' : x.up ? 'Ça monte' : 'Ça chute'} · ${ago(x.t)}</small><b>${esc(x.txt.replace(/^Pause clope : (.)/, (_, c) => c.toUpperCase()))}</b>
            <span class="nc-px">Cote ${short(s.market.prices[it.id])} ${trend(s.market.prices[it.id], h[Math.max(0, h.length - 30)])}</span>
            <span class="nc-fee">${mine ? `Le Comptoir te la reprend <b>${short(G.sellPrice(it.id))}</b> : il garde 10 % de commission.${(paid => paid > 0 ? (d => ` Tu l'avais payée ${short(paid)} : ${d >= 0 ? `<span class="up">+${short(d)} de gagné</span>` : `<span class="down">−${short(-d)} de perdu</span>`}.`)(G.sellPrice(it.id) - paid) : ` Tu l'as eue gratuitement : <span class="up">+${short(G.sellPrice(it.id))} de gagné</span>.`)(s.owned[it.id][0].paid)}` : `Le Comptoir te la vend <b>${short(G.buyPrice(it.id))}</b> : la cote + 5 % pour lui.`}</span></div></div>
            <div class="nc-acts">${mine ? `<button class="btn red sm" data-act="itSell" data-id="${it.id}">Vendre ${short(G.sellPrice(it.id))}</button>`
              : canBuy && !G.inStock(it.id) ? '<span class="nc-note">Pas en rayon en ce moment</span>' : canBuy ? `<button class="btn green sm" data-act="itBuy" data-id="${it.id}" ${s.cash >= G.buyPrice(it.id) ? '' : 'disabled'}>Acheter ${short(G.buyPrice(it.id))}</button>` : '<span class="nc-note">Se trouve dans les boosters</span>'}</div></div>`;
        }).join('') : '<p class="hint-line center">Pas de rumeur pour l\'instant. Repasse plus tard.</p>');
    }
    const items = D.ITEMS.filter(i => i.cat === shopTab && (G.inStock(i.id) || (s.owned[i.id] || []).length)), mt = G.tipBought('market'), sale = G.evOn('sale');
    const card = (it, onShelf) => {
      const h = s.market.hist[it.id], p = s.market.prices[it.id], mine = (s.owned[it.id] || []).length;
      // en rayon, une carte achetée reste visible mais grisée avec un tampon « Achetée » (elle se revend plus bas, dans « Tes cartes »)
      if (onShelf && mine) return `<div class="card item-card bought ${justBought && justBought.id === it.id && Date.now() - justBought.t < 900 ? 'just' : ''}"><span class="rtag r${it.r}">${{ C: 'Commun', R: 'Rare', E: 'Épique', L: 'Légendaire' }[it.r]}</span>
        <div class="ib-art">${itemPic(it)}<span class="ib-stamp">${ic('check')} ${boughtNow(it.id) ? 'Achetée' : 'Possédée'}</span></div></div>`;
      return `<div class="card item-card"><span class="rtag r${it.r}">${{ C: 'Commun', R: 'Rare', E: 'Épique', L: 'Légendaire' }[it.r]}</span>
        ${it.cat === 'card' ? `<button class="zoom-btn" data-act="cardZoom" data-id="${it.id}" aria-label="Voir en grand">${itemPic(it)}</button>` : itemPic(it)}<h4>${it.name}</h4><div class="price"><small>Cote</small>${short(p)}</div><div class="chg">${pct(p, h[0])} ${sparkSvg(h.slice(-40), 60, 18, p >= h[0] ? '#1f9d55' : '#d33a2c')}</div>
        <small class="muted own-line">${mine ? ownGain(it.id) : `Vendu ${short(G.buyPrice(it.id))} (cote + 5 %)`}</small>
        <div class="hstack" style="width:100%">${mine ? `<button class="btn xs red" style="flex:1" data-act="itSell" data-id="${it.id}">Vendre ${short(G.sellPrice(it.id))}</button>`
          : `<button class="btn xs green" style="flex:1" data-act="itBuy" data-id="${it.id}" ${s.cash >= G.buyPrice(it.id) ? '' : 'disabled'}>Acheter ${short(G.buyPrice(it.id))}</button>`}</div></div>`;
    };
    // cartes : les grandes cartes, puis les cartes des boosters vendues d'occasion, série par série
    const grid = shopTab === 'card'
      ? (() => { const R = { C: 0, R: 1, E: 2, L: 3 }, shelf = items.filter(i => G.inStock(i.id)).sort((a, b) => R[a.r] - R[b.r]), mine = items.filter(i => (s.owned[i.id] || []).length);
          return `<h3 class="sec">En rayon <small>· 3 communes et 1 plus rare</small></h3><div class="grid2">${shelf.map(i => card(i, true)).join('') || '<p class="hint-line">Tout est parti : attends le prochain arrivage.</p>'}</div>` +
            (mine.length ? `<h3 class="sec">Tes cartes <small>· à revendre</small></h3><div class="grid2">${mine.map(i => card(i)).join('')}</div>` : ''); })()
      : `<div class="grid2">${items.map(i => card(i)).join('')}</div>`;
    // comment on gagne : une petite histoire en 3 étapes, avec de vrais chiffres
    const buyEx = sale ? 89 : 105;
    return `${mt ? `<div class="tip-banner">${ico('tip-market', '📰')} <span><b>Ton tuyau du Kiosque</b>« ${esc(mt.txt)} »</span></div>` : ''}
      <div class="price-explain"><small class="pe-title">Comment on gagne de l'argent ici ?</small>
        <div class="pe-story"><div class="pe-box buy"><small>1. Tu achètes</small><b>${buyEx}<i class="cur"></i></b></div><span class="pe-arr">→</span>
          <div class="pe-box mid"><small>2. Son prix monte</small><b>130<i class="cur"></i></b></div><span class="pe-arr">→</span>
          <div class="pe-box sell"><small>3. Tu revends</small><b>117<i class="cur"></i></b></div></div>
        <div class="pe-win">Gagné : <b>+${117 - buyEx}<i class="cur"></i></b></div>
        <small class="pe-foot">${sale ? '<b>Déstockage : −15 % à l\'achat en ce moment !</b> ' : ''}La <b>cote</b>, c'est le prix du marché : ${SHOP_PLACES[shopPlace].who} te vend un peu au-dessus (+5 %) et te rachète un peu en dessous (−10 %). Il faut donc que la cote monte pour être gagnant.</small></div>
      <div class="stock-chip">${ico('ic-truck', '🚚')}<span class="grow">Nouvel arrivage dans <b>${mmss(G.stockLeft())}</b> : les rayons changent toutes les 30 min.</span><button class="btn gold xs" data-act="stockSkip" ${s.lingots >= G.stockSkipCost() ? '' : 'disabled'}>${ico('icon-bolt', '⚡')} Maintenant · ${ic('lingot')}${G.stockSkipCost()}</button></div>
      ${(pl => pl === 'safe' ? (nx => `<div class="shelf-chip ${G.safeCount() >= G.safeSlots() ? 'full' : ''}">${ico('ic-shelf', '🔐')} Ton coffre : <b>${G.safeCount()} / ${G.safeSlots()}</b> places${nx ? ` <button class="btn xs ${s.cash >= nx.cost ? 'green' : ''}" data-act="safeUp" ${s.cash >= nx.cost ? '' : 'disabled'}>${nx.name} · ${nx.slots} places · ${short(nx.cost)}</button>` : ''}</div>`)(D.SAFES[(s.safeLvl || 0) + 1])
        : pl === 'park' ? `<div class="shelf-chip ${G.parkedCount() >= G.garageSlots() ? 'full' : ''}">${ico('bld-garage', '🅿️')} Ton parking : <b>${G.parkedCount()} / ${G.garageSlots()}</b> places${D.GARAGES[(s.garageLvl || 0) + 1] ? ` <button class="btn xs ${s.cash >= D.GARAGES[(s.garageLvl || 0) + 1].cost ? 'green' : ''}" data-act="garageUp" ${s.cash >= D.GARAGES[(s.garageLvl || 0) + 1].cost ? '' : 'disabled'}>${D.GARAGES[(s.garageLvl || 0) + 1].slots} places · ${short(D.GARAGES[(s.garageLvl || 0) + 1].cost)}</button>` : ''}</div>`
        : pl === 'binder' ? `<div class="shelf-chip">${ico('ic-shelf', '🏠')} Les cartes vont dans ton classeur : aucune limite.</div>`
        : `<div class="shelf-chip ${G.ownedCount() >= G.roomSlots() ? 'full' : ''}">${ico('ic-shelf', '🏠')} Place chez toi : <b>${G.ownedCount()} / ${G.roomSlots()}</b>${G.ownedCount() >= G.roomSlots() ? ' · plein, déménage via ton téléphone' : ''}</div>`)((D.ITEM_CATS[shopTab] || {}).place)}
      ${shopTab === 'card' ? `<button class="row col-link" data-act="collection" style="width:100%;text-align:left"><span class="cl-ic">${packArt(true)}</span><div class="grow"><h4>Mon classeur</h4><p>Toutes tes cartes, série par série.</p></div><span class="btn sm blue">Ouvrir</span></button>` : ''}
      ${grid}`;
  }
  // ce que j'ai payé → ce qu'on me reprend → gagné / perdu (gratuit si l'objet vient d'un booster ou d'une récompense)
  function ownGain(id) {
    const a = st().owned[id] || []; if (!a.length) return '';
    const paid = a[0].paid || 0, sp = G.sellPrice(id), d = sp - paid;
    return `<span class="own-gain">${paid ? `Acheté ${short(paid)}` : 'Eu gratuitement'} → repris ${short(sp)} · <b class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? 'gagné +' : 'perdu '}${short(Math.abs(d))}</b></span>`;
  }
  function openItem(id) {
    const s = st(), it = G.item(id), a = s.owned[id] || [], h = s.market.hist[id];
    const paid = a.length ? a[0].paid : 0, sp = G.sellPrice(id), diff = sp - paid;
    openModal({ title: D.ITEM_CATS[it.cat].name, icon: 'trophy', center: true, body: `<div class="center">
      <div class="item-big">${itemPic(it)}</div><div class="big" style="font-size:20px">${it.name}</div>
      <span class="rtag r${it.r}">${{ C: 'Commun', R: 'Rare', E: 'Épique', L: 'Légendaire' }[it.r]}</span>${trophyHow(it) ? `<p class="trophy-how">${ico('icon-trophy', '🏆')} ${esc(trophyHow(it))}</p>` : ''}</div>
      <div class="card chart-card"><div class="cc-line"><span>Il y a 2 h</span><b>${trend(s.market.prices[id], h[0])}</b><span>Maintenant</span></div>${chartSvg(h)}</div>
      <div class="pos-card ${paid ? (diff >= 0 ? 'up' : 'down') : 'up'}"><small>Ce qu'il vaut</small>
        <div class="pos-line"><span>${paid ? 'Tu l\'as payé' : 'Gagné'}<b>${paid ? short(paid) : 'gratuit'}</b></span><i>→</i><span>Tu le revends<b>${short(sp)}</b></span><span class="pos-diff">${diff >= 0 ? 'Gagné' : 'Perdu'}<b>${diff >= 0 ? '+' : '−'}${short(Math.abs(diff))}</b></span></div>
        <p class="muted">Sa cote du jour est ${eur(s.market.prices[id])}. Le Comptoir te le reprend 10 % moins cher : c'est sa commission.</p></div>
      ${a.length > 1 ? `<p class="hint-line center">Tu en as ${a.length}.</p>` : ''}
      <div class="grid2"><button class="btn red" data-act="itSell" data-id="${id}">Vendre ${short(sp)}</button><button class="btn" data-act="closeModal">Garder</button></div>` });
  }


  // ------------------------------------------------------------ portefeuille, missions, cadeau, profil, réglages
  function walletBody() {
    const s = st(), cv = G.cryptoValue(), iv = G.itemsValue(), w = G.worth();
    const bar = (v, c) => `<div style="height:14px;border:2px solid var(--ink);border-radius:8px;overflow:hidden;background:#fff"><div style="height:100%;width:${w ? v / w * 100 : 0}%;background:${c}"></div></div>`;
    const coins = D.COINS.filter(c => s.crypto.hold[c.id] > 0).map(c => {
      const v = G.holdValue(c.id), cost = s.crypto.cost[c.id], d = v - cost;
      return `<div class="own-row"><button class="own-main" data-act="goCoin" data-id="${c.id}">${coinIco(c)}<span class="own-txt"><b>${c.name}</b><small>Tu as mis ${short(cost)} → <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${short(Math.abs(d))}</span></small></span></button>
        <div class="own-val"><b>${short(v)}</b><button class="btn red xs" data-act="wSellCoin" data-id="${c.id}">Vendre</button></div></div>`;
    }).join('');
    // collection : la valeur tout de suite, si elle monte ou descend, et la vente en un geste
    const items = Object.entries(s.owned).sort((x, y) => G.sellPrice(y[0]) * y[1].length - G.sellPrice(x[0]) * x[1].length).map(([id, a]) => {
      const it = G.item(id), sp = G.sellPrice(id), h = s.market.hist[id], paid = a[0].paid, d = sp - paid;
      return `<div class="own-row"><button class="own-main" data-act="itemInfo" data-id="${id}"><span class="own-pic">${itemPic(it)}</span><span class="own-txt"><b>${it.name}${a.length > 1 ? ` <em>×${a.length}</em>` : ''}</b>
          <small>${trend(s.market.prices[id], h[0])} <span class="muted">en 2 h</span></small>
          <small>${paid ? `Payé ${short(paid)} → <span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${short(Math.abs(d))}</span>` : '<span class="up">Gagné gratuitement</span>'}</small></span></button>
        <div class="own-val"><b>${short(sp)}</b><button class="btn red xs" data-act="itSell" data-id="${id}">Vendre</button></div></div>`;
    }).join('');
    return `<div class="card center"><div class="muted">Patrimoine total</div><div class="big" style="font-size:34px">${eur(w)}</div></div>
      <div class="card" style="margin-top:8px">
        <div class="hstack" style="justify-content:space-between"><b class="wl-k">${ic('cash')} Cash</b><b>${eur(s.cash)}</b></div>${bar(s.cash, '#3ddc84')}
        <div class="hstack" style="justify-content:space-between;margin-top:8px"><b class="wl-k">${ico('coin-btk', '🪙')} Crypto</b><b>${eur(cv)}</b></div>${bar(cv, '#f7931a')}
        <div class="hstack" style="justify-content:space-between;margin-top:8px"><b class="wl-k">${ico('cat-sneaker', '🏆')} Objets</b><b>${eur(iv)}</b></div>${bar(iv, '#9b5de5')}
      </div>
      <h3 class="sec">Crypto</h3>${coins || '<p class="hint-line center">Aucune crypto. Direction ton PC, dans ton appart.</p>'}
      <h3 class="sec">Collection <small>· prix de revente</small></h3>${items || '<p class="hint-line center">Aucun objet. Passe au Comptoir.</p>'}`;
  }
  function openWallet() { openModal({ title: 'Portefeuille', icon: 'wallet', full: true, body: walletBody(), refresh: () => setBody(walletBody()) }); }
  // ------------------------------------------------------------ Récompenses (bouton trophée) : défis du jour, missions, niveaux
  let rewardsTab = 'missions';
  const chips = (cash, lingots, extra = '') => `<span class="rw-chips">${cash ? `<span class="need">${ic('cash')}${short(cash, true)}</span>` : ''}${lingots ? `<span class="need">${ic('lingot')}${lingots}</span>` : ''}${extra}</span>`;
  const untilMidnight = () => { const m = new Date(); m.setHours(24, 0, 0, 0); return m - Date.now(); };
  function rewardsBody() {
    const s = st();
    let body = '';
    if (rewardsTab === 'defis') {
      const ch = G.chal(), nGot = ch.list.filter(c => c.got).length;
      body += `<p class="hint-line">3 défis par jour, renouvelés dans <b>${mmss(untilMidnight())}</b>. Chaque défi : <b>${G.chalCash()}<i class="cur"></i></b>. Les 3 réussis : <b>1 booster + 2 lingots</b> !</p>`;
      ch.list.forEach((c, i) => {
        const v = Math.min(c.goal, G.chalValue(c)), ready = !c.got && v >= c.goal;
        body += `<div class="row rw-row ${c.got ? 'owned' : ready ? 'focus ready' : 'open'}"><div class="art">${ic(c.got ? 'check' : 'star')}</div><div class="info">
          <h4>Défi ${i + 1}</h4><p class="rw-do">${c.t.replace('{n}', c.goal)}</p>
          ${c.got ? '' : `<div class="bar"><div style="width:${(v / c.goal * 100).toFixed(0)}%"></div><span>${v} / ${c.goal}</span></div>`}
          <p class="rw-get">Tu gagnes ${chips(G.chalCash(), 0)}</p></div>
          <div class="btns">${c.got ? '<span class="rw-done">✓ Déjà récupéré</span>' : ready ? `<button class="btn green" data-act="claimChal" data-id="${i}">Réclamer</button>` : ''}</div></div>`;
      });
      body += `<div class="chal-bonus ${ch.bonus ? 'got' : ''}">${packArt(true)}<div><b>Bonus des 3 défis</b><small>${ch.bonus ? '2 lingots et 1 booster déjà récupérés aujourd\'hui. Reviens demain !' : `${nGot} / 3 défis réussis`}</small></div>${ch.bonus ? (G.boosterCount() ? '<button class="btn sm purple" data-act="boosters">Ouvrir</button>' : '<span class="got-tag">✓ Récupéré</span>') : `<span class="stroke">${ic('lingot')}2 + booster</span>`}</div>`;
    } else if (rewardsTab === 'missions') {
      const got = G.questsClaimed();
      body += `<p class="hint-line">Missions réussies : <b>${got} / ${D.QUESTS.length}</b>. De nouvelles missions s'ouvrent en montant de niveau : fais-les dans l'ordre que tu veux !</p>`;
      const focus = G.questFocus();
      // ordre : à réclamer, en cours, à venir, puis les missions déjà obtenues tout en bas
      const rows = [];
      D.QUESTS.forEach((q, n) => {
        const qs = G.questState(q), lock = !qs.open, it = q.trophy ? G.item(q.trophy) : null;
        if (lock && q.lvl > s.lvl + 5) return;
        const state = lock ? 'locked' : qs.claimed ? 'owned' : qs.done ? 'focus ready' : focus === q ? 'focus' : 'open';
        const btn = lock ? `<span class="rw-tag">${ic('lock')}Niveau ${q.lvl}</span>` : qs.claimed ? `<span class="rw-done">✓ Déjà récupérée</span>` : qs.done ? `<button class="btn green" data-act="claimQuest" data-id="${q.id}">Réclamer</button>` : `<button class="btn blue rw-go" data-act="questGo" data-id="${q.id}">Y aller</button>`;
        rows.push([qs.claimed ? 3 : lock ? 2 : qs.done ? 0 : 1, `<div class="row rw-row ${state}"><div class="art">${ic(qs.claimed ? 'check' : lock ? 'lock' : 'trophy')}</div><div class="info">
          <h4>Mission ${n + 1}</h4><p class="rw-do">${q.txt}</p>
          ${!qs.claimed && !lock ? `<div class="bar"><div style="width:${Math.min(100, qs.v / q.n * 100).toFixed(0)}%"></div><span>${q.n >= 1000 ? `${short(qs.v, true)} / ${short(q.n, true)}` : `${qs.v} / ${q.n}`}</span></div>` : ''}
          <p class="rw-get">${qs.claimed ? 'Tu as gagné' : 'Tu gagnes'} ${chips(q.cash, q.lingots, it ? `<span class="need">${pic('item-' + it.id, '🏆', 'tiny')}${it.name.replace(/^Trophée /, '')}</span>` : '')}</p></div>
          <div class="btns">${btn}</div></div>`]);
      });
      body += rows.map((r, i) => [r, i]).sort((x, y) => x[0][0] - y[0][0] || x[1] - y[1]).map(x => x[0][1]).join('');
      if (got >= D.QUESTS.length) body += '<p class="hint-line">Tu as terminé toutes les missions. Respect !</p>';
    } else {
      const need = G.xpNeed();
      // street cred : le rang qui suit ton patrimoine, avec les moyens de le faire grimper
      const rk = G.rankOf(), pct = rk.next ? (G.credWorth() - rk.n) / (rk.next.n - rk.n) * 100 : 100;
      const ways = [['shop', has('app-objets') ? 'app-objets' : 'app-binder', 'Objets qui montent', G.catUnlocked('card')], ['pc', 'app-crypto', 'Investir en crypto', true], ['rig', has('app-minage') ? 'app-minage' : 'app-bank', 'Lancer un minage', true]].filter(w => w[3]);
      const lab = n => n ? short(n, true) : '0';
      body += `<div class="cred-card"><div class="cred-top"><span class="cred-emo">${pic(rkImg(rk), rk.emo)}</span><div class="cred-now"><small>Ta street cred</small><b>${rk.name}</b></div>
          ${rk.next ? `<div class="cred-next"><small>Prochain palier</small><b>${pic(rkImg(rk.next), rk.next.emo, 'cn-ic')}${rk.next.name}</b><em>encore ${short(rk.next.n - G.credWorth(), true)}</em></div>` : '<div class="cred-next"><b>Tu es au sommet</b></div>'}</div>
        <p class="cred-how">Elle suit ton <b>record de patrimoine</b> (cash, crypto, objets, immobilier) : elle ne redescend jamais.</p>
        <div class="cred-track">${D.RANKS.map((r, k) => `<div class="ct-step ${k < rk.i ? 'done' : k === rk.i ? 'now' : ''}"><i>${pic(rkImg(r), r.emo)}</i><b>${r.name}</b><small>${lab(r.n)}</small>${k === rk.i && rk.next ? `<span class="ct-fill" style="--p:${Math.min(100, pct).toFixed(0)}%"></span>` : ''}</div>`).join('')}</div>
        <div class="cred-ways">${ways.map(w => `<button class="btn xs" data-act="credGo" data-id="${w[0]}">${pic(w[1], '', 'cw-ic')}<span>${w[2]}</span></button>`).join('')}</div></div>`;
      // objectifs de la semaine, en compact
      const w = G.week(), R = D.WEEK_REWARD, left = G.weekLeft(), wGot = w.list.filter(c => c.got).length;
      body += `<div class="wk-card"><div class="wk-head"><b>Objectifs de la semaine</b><small>Nouveaux dans ${left} j</small></div>
        <p class="wk-rew">Chaque objectif : ${chips(R.cash(s.lvl), R.lingots)}</p>${w.list.map((c, i) => {
        const v = Math.min(c.goal, G.chalValue(c)), ready = !c.got && v >= c.goal;
        return `<div class="wk-row ${c.got ? 'got' : ''}"><span class="wk-t">${c.t.replace('{n}', c.goal)}</span>${c.got ? '<em>✓ Récupéré</em>' : ready ? `<button class="btn green xs" data-act="claimWeek" data-id="${i}">Réclamer</button>` : `<span class="wk-v">${v} / ${c.goal}</span>`}</div>`; }).join('')}
        <div class="wk-bonus ${w.bonus ? 'got' : ''}">${packArt(true)}<span><b>Les 4 réussis</b> : ${R.bonus.boosters} boosters + ${R.bonus.lingots} ${ic('lingot')}</span><em>${w.bonus ? '✓' : `${wGot} / 4`}</em></div></div>`;
      body += `<h3 class="sec">Niveaux <small>· chaque niveau : billets, lingots, booster et nouveautés</small></h3>`;
      body += `<div class="lv-now"><span class="rw-lv stroke">${s.lvl}</span><div class="grow"><small>Ton niveau</small><b>Niveau ${s.lvl}</b>${isFinite(need) ? `<div class="bar"><div style="width:${Math.min(100, s.xp / need * 100).toFixed(0)}%"></div><span>${s.xp} / ${need} XP</span></div>` : '<small>Niveau max atteint, respect.</small>'}</div></div>`;
      for (let L = s.lvl + 1; L <= Math.min(D.MAX_LVL, s.lvl + 4); L++) {
        const r = D.LEVEL_REWARD(L), done = L <= s.lvl, next = L === s.lvl + 1, un = unlocksAt(L);
        const tag = done ? `<span class="rw-tag ok">${ic('check')}Obtenu</span>` : next ? '<span class="rw-tag next">Prochain</span>' : `<span class="rw-tag">${ic('lock')}À venir</span>`;
        body += `<div class="row rw-row rw-lvl ${done ? 'owned' : next ? 'focus' : 'locked'}"><div class="art"><span class="rw-lv stroke">${L}</span></div><div class="info">
          <h4>Niveau ${L}</h4>
          ${next ? `<p class="rw-do">Encore ${Math.max(0, need - s.xp)} XP</p>` : ''}
          <p class="rw-get">Tu gagnes ${chips(r.cash, r.lingots, `<span class="need">${packArt(true)}1 booster</span>`)}</p>
          ${un.length ? `<div class="unlocks rw-unlocks">${un.map(unlockTile).join('')}</div>` : ''}</div>
          <div class="btns">${tag}</div></div>`;
      }
    }
    return body;
  }
  function openRewards(tab, scrollCur) {
    if (tab) rewardsTab = tab;
    else rewardsTab = G.questsReady() ? 'missions' : G.chalReady() ? 'defis' : G.weekReady() ? 'levels' : rewardsTab;
    const labels = () => ({ defis: `Défis du jour${G.chalReady() ? ` <span class="tab-badge">${G.chalReady()}</span>` : ''}`, missions: `Missions${G.questsReady() ? ` <span class="tab-badge">${G.questsReady()}</span>` : ''}`, levels: `Niveaux${G.weekReady() ? ` <span class="tab-badge">${G.weekReady()}</span>` : ''}` });
    const tabs = Object.entries(labels()).map(([id, label]) => ({ id, label }));
    // les pastilles des onglets se mettent à jour dès qu'on réclame
    const retab = () => { const L = labels(); document.querySelectorAll('#modal .tab').forEach(t => { if (L[t.dataset.tab] != null && t.innerHTML !== L[t.dataset.tab]) t.innerHTML = L[t.dataset.tab]; }); };
    openModal({ title: 'Récompenses', icon: 'hdr-missions', full: true, tabs, tab: rewardsTab, body: rewardsBody(),
      onTab: id => { rewardsTab = id; setBody(rewardsBody()); }, refresh: () => { setBody(rewardsBody()); retab(); } });
    if (scrollCur) scrollToCur();
  }
  function scrollToCur() { const c = $('#modal .rw-row.focus'), b = $('#modal .sheet-body'); if (c && b) b.scrollTop = c.offsetTop - b.offsetTop - 12; }

  // ce qui s'ouvre à un niveau (fenêtre Niveaux, montée de niveau)
  function unlocksAt(L) {
    const u = [];
    D.BUILDINGS.filter(b => b.lvl === L && !b.spot).forEach(b => u.push({ img: 'bld-' + b.id, name: b.name, how: b.tag, go: b.id }));
    D.COINS.filter(c => c.lvl === L && L > 1).forEach(c => u.push({ html: coinIco(c), name: c.name, how: 'Nouvelle crypto à trader' }));
    Object.entries(D.SPORTS).filter(([, x]) => x.lvl === L && L > 1).forEach(([k, x]) => u.push({ html: teamCrest(k, 0), name: `Paris ${x.name.toLowerCase()}`, how: 'Plus de matchs où parier', go: 'balto' }));
    Object.entries(D.ITEM_CATS).filter(([, c]) => c.lvl === L && L > 1).forEach(([k, c]) => u.push({ img: (D.ITEMS.find(i => i.cat === k && has('item-' + i.id)) || D.ITEMS.find(i => i.cat === k)).id.replace(/^/, 'item-'), name: c.name, how: 'Achète, attends que ça monte, revends' }));
    D.SKINS.filter(k => k.lvl === L && L > 1).forEach(k => u.push({ img: `skin-${k.id}-bust`, name: k.name }));
    if (L === D.ROULETTE.lvl) u.push({ img: 'roulette-hub', emo: '🎡', name: 'Roulette', how: 'Au Lucky Palace', go: 'casino' });
    if (L === D.COMBI_LVL) u.push({ img: 'nav-bets', emo: '🎟️', name: 'Paris combinés' });
    D.SCRATCH.filter(t => t.lvl === L && L > 1).forEach(t => u.push({ img: has('ticket-' + t.id) ? 'ticket-' + t.id : 'ticket-flash', emo: '🎟️', name: t.name }));
    D.HABITS.filter(h => h.lvl === L).forEach(h => u.push({ img: 'hab-' + h.id, emo: h.icon, name: h.name }));
    if (L === D.EVENTS.lvl) u.push({ img: 'ev-boost', emo: '⚡', name: 'Mini-événements' });
    if (L === D.DEALS.lvl) u.push({ img: 'guide', name: 'Bons plans' });
    if (L === D.AGENCE.lvl) u.push({ img: 'app-agence', emo: '📸', name: (D.SKINS.find(k => k.id === st().skin) || {}).g === 'f' ? 'Ta page PrivéFans' : 'Agence PrivéFans', how: 'Des revenus chaque heure, même absent' });
    D.CITY_SHOP.filter(x => x.lvl === L && L > 1).forEach(x => u.push({ img: 'deco-' + x.id, emo: x.emo, name: x.name }));
    D.EXT_PLACES.filter(b => b.lvl === L).forEach(b => u.push({ img: 'bld-' + b.id, name: b.name + ' (en bus)' }));
    D.PROPS.filter(p => p.lvl === L).forEach(p => u.push({ img: 'item-' + p.id, emo: p.icon, name: p.name, how: 'Un loyer qui tombe chaque jour' }));
    if (L === D.BOURSE.lvl) u.push({ img: 'item-st-kbc', emo: '📈', name: 'La bourse', how: 'Des actions et des dividendes' });
    D.CITY_LOOKS.filter(x => x.lvl === L && (x.cash || x.lingots)).forEach(x => u.push({ img: 'bg-city-' + x.id, emo: '🏙️', name: x.name }));
    return u;
  }
  function unlockTile(u) { return `<div class="ul"><span class="ul-ic">${u.html || pic(u.img || '', u.emo || '⭐')}</span><span class="ul-nm">${u.name}</span></div>`; }

  // ------------------------------------------------------------ Cadeau du jour (série de 7 jours)
  function openDaily() {
    const body = () => {
      const ready = G.dailyReady(), day = G.dailyDay(), N = D.DAILY.days.length;
      const done = d => (ready ? d < day : d <= day);
      const rew = r => `<span>${ic('cash')}${short(r.cash, true)}</span><span>${ic('lingot')}${r.lingots}</span>${r.boosters ? `<span>${packArt(true)}+${r.boosters}</span>` : ''}`;
      const tiles = Array.from({ length: N }, (_, i) => {
        const d = i + 1, r = G.dailyReward(d);
        return `<div class="dl-day ${done(d) ? 'done' : ''} ${d === day ? 'today' : ''} ${r.big ? 'big' : ''}"><b>Jour ${d}</b><div class="dl-art">${pic(r.big ? 'gift-big' : 'icon-gift', '🎁')}</div><div class="dl-rew">${rew(r)}</div>${done(d) ? `<i class="dl-ok">${ic('check')}</i>` : ''}</div>`;
      }).join('');
      const r = G.dailyReward(day);
      return `<div class="dl-hero ${ready ? 'ready' : ''}">${pic(ready ? (r.big ? 'gift-big' : 'icon-gift') : 'gift-open', '🎁')}</div>
        <p class="hint-line dl-txt">${ready ? `Jour ${day} de ta série : ${rew(r)}` : `Cadeau récupéré ! Le prochain arrive dans <b>${mmss(untilMidnight())}</b>. Reviens demain pour continuer ta série.`}</p>
        <div class="dl-grid">${tiles}</div>
        <p class="hint-line">Reviens chaque jour : si tu rates un jour, la série repart au jour 1. Le jour 7 est un gros cadeau !</p>
        <button class="btn ${ready ? 'green pulse' : ''} wide" data-act="claimDaily" ${ready ? '' : 'disabled'}>${ready ? 'Récupérer mon cadeau' : 'Reviens demain'}</button>`;
    };
    openModal({ title: 'Cadeau du jour', icon: 'hdr-daily', full: true, body: body(), refresh: () => setBody(body()) });
  }

  // ------------------------------------------------------------ Boosters et classeur (comme Mama Kana)
  let boosterTab = 'open', colTab = 'sport';
  const RAR = { C: 'Commune', R: 'Rare', E: 'Épique', L: 'Légendaire' }, RSYM = { C: '●', R: '◆', E: '★', L: '✦' };
  function packArt(mini) { return mini ? `<i class="bst-mini">${has('booster-pack') ? `<img src="${src('booster-pack')}" alt="">` : '🃏'}</i>` : `<div class="bst-pack">${pic('booster-pack', '🃏')}<i class="bst-gloss"></i></div>`; }
  const CARD_ALL = D.ITEMS.filter(i => i.series && G.cardOk(i));
  // numéro d'une carte dans SA collection (sport ou créatures) : 03/98
  const colOf = c => (D.SERIES.find(x => x.id === c.series) || {}).col || 'sport';
  const colCards = c => CARD_ALL.filter(x => colOf(x) === colOf(c));
  const cardNo = c => `${String(colCards(c).indexOf(c) + 1).padStart(2, '0')}/${colCards(c).length}`;
  // carte façon jeu de cartes : une carte de collection (it) ou une carte récompense (c.kind)
  function tcgCard(c, extra = '') {
    let d;
    if (c.kind && c.kind !== 'col') {
      const art = { cash: ic('cash'), lingots: ic('lingot'), xp: ic('star'), ticket: pic('ticket-flash', '🎟️'), freebet: ic('ticket'), airdrop: coinIco(D.COINS[0]) }[c.kind];
      const stat = c.kind === 'cash' || c.kind === 'freebet' || c.kind === 'airdrop' ? `${short(c.n, true)}<i class="cur"></i>` : c.kind === 'xp' ? `+${c.n}` : `×${c.n}`;
      const txt = { cash: 'Direct dans ta poche.', lingots: 'De l\'or, direct dans ta réserve.', xp: 'Expérience gagnée tout de suite.', ticket: `${c.n} tickets à gratter offerts au Royal.`,
        freebet: 'Une mise offerte au Royal : si tu gagnes, tu touches le bénéfice.', airdrop: 'Des Axion versés dans ton portefeuille crypto.' }[c.kind];
      d = { type: 'item', name: c.name, art: has('bonus-' + c.kind) ? `<div class="tcg-sub full"><img src="${src('bonus-' + c.kind)}" alt=""></div>` : `<div class="tcg-sub ico">${art}</div>`, stat, ability: 'Récompense', text: txt, flav: 'Trouvé dans un booster du Kiosque.', rarity: c.rarity, label: 'Bonus' };
    } else {
      const it = G.item(c.id), se = D.SERIES.find(x => x.id === it.series), no = cardNo(it);
      const t = it.team ? D.TEAMS[it.team[0]][it.team[1]] : null;
      // cartes rares et plus : l'illustration remplit toute la carte, seuls le nom et la cote restent en bandeau
      if (it.r !== 'C' || it.series === 'classics') {
        const nm = it.name.replace(/^Carte /, '').replace(/^./, ch => ch.toUpperCase());
        const full = it.art && 'full-' + it.art.replace(/^art-/, '');   // grande illustration verticale (full-k-…) quand elle existe
        const art = full && has(full) ? `<span class="fa-img fa-ill"><img src="${src(full)}" alt=""></span>` : it.art && has(it.art) && !it.img ? `<span class="fa-img fa-ill"><img src="${src(it.art)}" alt=""></span>` : !it.img ? `<span class="fa-img">${pic('item-' + it.id, '🃏')}</span>` : it.art && has(it.art) ? `<span class="fa-img fa-ill"><img src="${src(it.art)}" alt=""></span>` : it.team[0] === 'tennis' ? `<span class="fa-img fa-player"><img src="${src(it.img)}" alt=""></span>` : `<span class="fa-crest">${teamCrest(it.team[0], it.team[1])}</span>`;
        const cbg = it.team && has('card-bg-' + it.team[0]) ? `<img class="mc-bg" src="${src('card-bg-' + it.team[0])}" alt="">` : '';
        // cartes Créatures : seule l'illustration est gardée, le cadre est celui du jeu (le même pour toutes)
        const crea = colOf(it) === 'crea';
        return `<div class="tcg full r${it.r} t-${it.series} ${crea ? 'crea' : ''} ${extra}"><div class="tcg-card"><div class="fa-bg"></div>${cbg}${art}
          <span class="fa-rar">${RSYM[it.r]}</span><span class="fa-no">${no}</span>
          <div class="fa-plate"><b class="${nm.length > 16 ? 'xl' : ''}">${nm}</b>${it.club ? `<em class="fa-club">${playerOf(it)}</em>` : it.role ? `<em class="fa-club">${it.role}</em>` : ''}<small>${RAR[it.r]} · ${priceWord(it.id)}</small></div>
          <i class="tcg-holo"></i></div></div>`;
      }
      // créature commune : carte classique (illustration dans sa fenêtre, texte dessous), comme les communes de sport ; le full art est réservé aux rares et plus
      if (it.kind === 'creature') d = { type: it.series, name: it.name, art: `<div class="tcg-sub ill-art crea-art"><img class="cr-blur" src="${src('item-' + it.id)}" alt=""><img class="cr-main" src="${src('item-' + it.id)}" alt="" style="--fy:${CREA_FY[it.id] ?? 38}%"></div>`, stat: '', ability: se.name, text: priceSentence(it.id), flav: se.name, rarity: it.r, label: se.sub || se.name, no };
      else d = { type: it.series, name: it.name.replace(/^Carte /, '').replace(/^./, ch => ch.toUpperCase()), art: it.img ? `${has('card-bg-' + it.team[0]) ? `<img class="art-bg" src="${src('card-bg-' + it.team[0])}" alt="">` : ''}${it.art && has(it.art) ? `<div class="tcg-sub ill-art"><img src="${src(it.art)}" alt=""></div>` : `<div class="tcg-sub crest-art">${teamCrest(it.team[0], it.team[1])}</div>`}` : it.art && has(it.art) ? `<div class="tcg-sub ill-art"><img src="${src(it.art)}" alt=""></div>` : `<div class="tcg-sub item">${pic('item-' + it.id, '🃏')}</div>`,
        stat: t ? `${t[1]}` : '', ability: it.club ? playerOf(it) : t ? (it.team[0] === 'tennis' ? 'Classement' : 'Force') : 'Collector', text: priceSentence(it.id), flav: se.name, rarity: it.r, label: it.kind === 'staff' ? it.role : it.kind === 'player' ? (it.f ? 'Joueuse' : 'Joueur') : it.kind === 'team' ? 'Équipe' : se.sub, no };
    }
    return `<div class="tcg r${d.rarity} t-${d.type} ${extra}"><div class="tcg-card"><div class="tcg-in">
      <div class="tcg-top"><b class="tcg-name ${d.name.length > 16 ? 'xl' : d.name.length > 11 ? 'l' : ''}">${d.name}</b>${d.stat ? `<span class="tcg-stat">${d.stat}</span>` : ''}</div>
      <div class="tcg-art">${d.art}</div>
      <div class="tcg-line">${d.label}</div>
      <div class="tcg-txt"><b>${d.ability}</b><p>${d.text}</p></div>
      <div class="tcg-foot"><span class="tcg-rsym">${RSYM[d.rarity]}</span><span>${RAR[d.rarity]}</span><span class="tcg-no">${d.no || 'Hustle City'}</span></div>
      </div><i class="tcg-holo"></i></div></div>`;
  }
  function boostersBody() {
    const s = st();
    if (boosterTab === 'open') {
      const n = G.boosterCount(), free = G.boosterFree(), ch = G.chal(), got = ch.list.filter(c => c.got).length, ready = G.chalReady();
      return `<div class="bst-hero">${packArt()}<div class="bst-count">${n ? `Tu as <b>${n}</b> booster${n > 1 ? 's' : ''} à ouvrir` : 'Plus de booster pour aujourd\'hui'}</div>
          <p class="hint-line">${free ? 'Ton <b>booster du jour</b> est gratuit !' : `Prochain booster gratuit dans <b>${mmss(untilMidnight())}</b>.`} Chaque booster : 3 récompenses + 1 carte de collection qui a une vraie cote.</p>
          <button class="btn green bst-open ${n ? 'pulse' : ''}" data-act="boosterOpen" ${n ? '' : 'disabled'}>Ouvrir un booster</button>
          <button class="btn" data-act="boosterBuy" ${s.lingots >= D.BOOSTER.cost ? '' : 'disabled'}>Acheter un booster · ${ic('lingot')}${D.BOOSTER.cost}</button></div>
        <h3 class="sec">Chances par carte de collection</h3><div class="bst-odds">${Object.entries(D.BOOSTER.colWeights).map(([k, w]) => `<span class="rtag r${k}">${RAR[k]} ${w} %</span>`).join('')}</div>
        <div class="bst-defis ${ready ? 'hot' : ''}"><div class="bd-ic">${ic('trophy')}</div><div class="bd-info"><b>Défis du jour · ${got}/3</b><small>${ch.bonus ? 'Booster du jour gagné ! Nouveaux défis demain.' : ready ? `${ready} défi${ready > 1 ? 's' : ''} à réclamer !` : 'Réussis les 3 défis : <b>1 booster + 2 lingots</b> offerts.'}</small>
          <div class="bd-dots">${ch.list.map(c => `<i class="bd-dot ${c.got ? 'got' : G.chalValue(c) >= c.goal ? 'ready' : ''}">${c.got ? '✓' : ''}</i>`).join('')}</div></div>
          <button class="btn ${ready ? 'green pulse' : ''}" data-act="goDefis">${ready ? 'Réclamer' : 'Voir'}</button></div>`;
    }
    // deux collections dans le classeur : cartes de sport et cartes Créatures
    const ALL = CARD_ALL.filter(c => colOf(c) === colTab);
    const got = ALL.filter(c => (s.owned[c.id] || []).length).length;
    const val = CARD_ALL.reduce((a, c) => a + (s.owned[c.id] || []).length * G.sellPrice(c.id), 0);
    const nCrea = CARD_ALL.filter(c => colOf(c) === 'crea').length;
    let body = `<div class="col-tabs"><button class="${colTab === 'sport' ? 'on' : ''}" data-act="colTab" data-id="sport">${ic('trophy')} Cartes de sport</button><button class="${colTab === 'crea' ? 'on' : ''}" data-act="colTab" data-id="crea">${ico('cat-crea', '🐲')} Créatures</button></div>
      <div class="col-top"><div class="col-bar"><i style="width:${(got / Math.max(1, ALL.length) * 100).toFixed(1)}%"></i></div><b>${got} / ${ALL.length} cartes</b></div>
      <p class="hint-line">Ton classeur vaut <b>${short(val)}</b> à la revente. Touche une carte pour la voir en grand et la revendre. Complète une série pour une grosse récompense.</p>
      ${colTab === 'crea' && nCrea < 10 ? '<p class="hint-line"><b>Nouvelles créatures en route :</b> elles arrivent dans les boosters au fil des mises à jour.</p>' : ''}`;
    for (const se of D.SERIES.filter(x => (x.col || 'sport') === colTab)) {
      const cards = G.seriesCards(se.id), have = G.seriesHave(se.id), done = G.seriesDone(se.id), claimed = s.colClaimed[se.id];
      if (!cards.length) continue;
      body += `<div class="col-set"><div class="col-head"><b>${se.name}</b><small>${have}/${cards.length}</small></div>
        <div class="col-grid tcg-grid">${cards.map(c => { const n = (s.owned[c.id] || []).length; return n
          ? `<div class="col-slot" data-act="cardZoom" data-id="${c.id}">${tcgCard({ id: c.id }, 'mini')}${n > 1 ? `<i class="col-n">×${n}</i>` : ''}</div>`
          : `<div class="col-slot miss"><div class="tcg-back ${colTab === 'crea' ? 'crea' : ''}"><span>${cardNo(c).slice(0, 2)}</span></div></div>`; }).join('')}</div>
        <div class="col-rew">Série complète : ${chips(se.reward.cash, se.reward.lingots)} ${claimed ? '<span class="rw-done">✓ Déjà récupérée</span>' : done ? `<button class="btn green" data-act="claimSeries" data-id="${se.id}">Réclamer</button>` : ''}</div></div>`;
    }
    return body;
  }
  function openBoosters(tab) {
    if (tab) boosterTab = tab;
    openModal({ title: 'Boosters', icon: 'booster-pack', full: true, tabs: [{ id: 'open', label: 'Boosters' }, { id: 'col', label: 'Classeur' }], tab: boosterTab, body: boostersBody(),
      onTab: id => { boosterTab = id; setBody(boostersBody()); }, refresh: () => { if (boosterTab === 'open') setBody(boostersBody()); } });
  }
  // carte en grand : on la penche avec le doigt, reflets holographiques ; on peut la revendre
  // ce qu'un objet rapporte VRAIMENT au joueur : son prix de revente s'il l'a, son prix d'achat s'il est en rayon (la cote seule prêtait à confusion)
  const priceWord = id => (st().owned[id] || []).length ? `revente ${short(G.sellPrice(id))}` : G.inStock(id) ? `prix ${short(G.buyPrice(id))}` : `cote ${short(st().market.prices[id])}`;
  const priceSentence = id => (st().owned[id] || []).length ? `Tu la revends ${short(G.sellPrice(id))} au Comptoir.` : G.inStock(id) ? `Au Comptoir : ${short(G.buyPrice(id))}.` : `Cote du jour : ${short(st().market.prices[id])}.`;
  function cardZoom(id) {
    const n = (st().owned[id] || []).length, it = G.item(id), canBuy = !n && G.catUnlocked(it.cat) && G.inStock(id) && !(it.noBuy && !it.series);
    let el = $('#cardzoom'); if (!el) { $('#app').insertAdjacentHTML('beforeend', '<div id="cardzoom"></div>'); el = $('#cardzoom'); }
    el.innerHTML = `<div class="cz-card">${tcgCard({ id })}</div><div class="cz-acts">${n ? `<p class="cz-gain">${ownGain(id)}</p><button class="btn red" data-act="czSell" data-id="${id}">Revendre ${short(G.sellPrice(id))}</button>` : canBuy ? `<button class="btn green" data-act="czBuy" data-id="${id}" ${st().cash >= G.buyPrice(id) ? '' : 'disabled'}>Acheter ${short(G.buyPrice(id))}</button>` : ''}<button class="btn" data-act="czClose">Fermer</button></div><p class="cz-hint">${n > 1 ? `Tu l'as en ${n} exemplaires · ` : ''}penche la carte avec le doigt</p>`;
    el.className = 'on'; sfx.tap();
    const card = el.querySelector('.tcg');
    el.onpointermove = e => {
      const r = card.getBoundingClientRect(), cl = v => Math.max(-.5, Math.min(.5, v)), x = cl((e.clientX - r.left) / r.width - .5), y = cl((e.clientY - r.top) / r.height - .5);   // doigt hors de la carte : on reste au bord (sinon le reflet se coupait)
      card.classList.add('touched'); card.style.transform = `rotateY(${(x * 22).toFixed(1)}deg) rotateX(${(-y * 22).toFixed(1)}deg)`;
      card.style.setProperty('--hx', `${((x + .5) * 100).toFixed(0)}%`); card.style.setProperty('--hy', `${((y + .5) * 100).toFixed(0)}%`);
    };
    el.onclick = e => { if (e.target === el) closeZoom(); };
  }
  function closeZoom() { const el = $('#cardzoom'); if (el) { el.className = ''; el.innerHTML = ''; } }
  // ouverture comme à la main : le paquet tremble et s'ouvre, les cartes forment une pile ; touche = retourner, touche encore = la suivante
  function packOpening(cards) {
    let el = $('#pack'); if (!el) { $('#app').insertAdjacentHTML('beforeend', '<div id="pack"></div>'); el = $('#pack'); }
    const ORD = { C: 0, R: 1, E: 2, L: 3 };
    const deck = cards.filter(c => c.kind !== 'col').sort((a, b) => ORD[a.rarity] - ORD[b.rarity]).concat(cards.filter(c => c.kind === 'col'));
    const front = c => tcgCard(c) + (c.kind === 'col' ? (c.dup ? `<span class="pk-tag">Doublon revendu · +${short(c.sold || 0)}</span>` : '<span class="pk-tag new">Nouvelle carte !</span>') : '');
    el.className = 'on';
    // le paquet brille de la couleur de la meilleure carte qu'il contient (comme dans les vrais jeux)
    const best = deck.reduce((a, c) => Math.max(a, ORD[c.rarity]), 0);
    el.dataset.best = 'CREL'[best];
    el.innerHTML = `<div class="pk-stage">${packArt()}</div><i class="pk-rays"></i><i class="pk-flash"></i><b class="pk-rar stroke"></b>
      <div class="pk-stack">${deck.map((c, i) => `<div class="pk-card r${c.rarity}" style="--i:${i};--n:${deck.length - i};z-index:${deck.length - i}"><div class="pk-in"><div class="pk-back">${has('card-back') ? '' : has('logo') ? `<img src="${src('logo')}" alt="">` : 'HUSTLE CITY'}</div><div class="pk-front">${front(c)}</div></div></div>`).join('')}</div>
      <p class="pk-hint stroke">Touche la carte pour la retourner</p>
      <div class="pk-recap hidden">${deck.map(c => `<div class="pk-mini">${front(c)}</div>`).join('')}</div>
      <button class="btn green pk-done hidden" data-act="packDone">Super !</button>`;
    sfx.tap();
    setTimeout(() => { el.classList.add('torn'); sfx.win(); rain('confetti', 30); }, 900);
    setTimeout(() => el.classList.add('dealt'), 1300);
    const cardsEl = [...el.querySelectorAll('.pk-card')], hint = el.querySelector('.pk-hint');
    // effets de révélation selon la rareté : éclair blanc, rayons qui tournent, étincelles, bandeau du nom de rareté
    const reveal = r => {
      el.dataset.r = r; el.classList.remove('rv'); void el.offsetWidth; el.classList.add('rv');
      el.querySelector('.pk-rar').textContent = { C: '', R: 'RARE !', E: 'ÉPIQUE !', L: 'LÉGENDAIRE !' }[r];
      const n = { C: 6, R: 12, E: 20, L: 32 }[r], col = { C: '#fff', R: '#7fc4ff', E: '#d7a6ff', L: '#ffd23f' }[r];
      for (let i = 0; i < n; i++) {
        const p = document.createElement('i'); p.className = 'pk-spark'; p.textContent = i % 3 ? '✦' : '★';
        const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * (r === 'L' ? 200 : 120);
        p.style.cssText = `color:${col};--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px;font-size:${10 + Math.random() * (r === 'C' ? 8 : 18)}px;animation-delay:${Math.random() * .12}s`;
        el.appendChild(p); setTimeout(() => p.remove(), 1300);
      }
      if (r === 'L' || r === 'E') { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 500); }
    };
    let k = 0, busy = false;
    el.querySelector('.pk-stack').addEventListener('click', e => {
      e.stopPropagation();
      if (busy || !el.classList.contains('dealt')) return;
      sfx.flip();
      const c = cardsEl[k]; if (!c) return;
      busy = true; setTimeout(() => { busy = false; }, 350);
      if (!c.classList.contains('flip')) {
        c.classList.add('flip');
        const r = c.className.match(/r([CREL])/)[1];
        reveal(r);
        if (r === 'E' || r === 'L') { sfx.level(); rain(r === 'L' ? 'bill' : 'confetti', r === 'L' ? 50 : 30); } else if (r === 'R') sfx.win(); else sfx.coin();
        hint.textContent = k < cardsEl.length - 1 ? 'Touche pour la carte suivante' : 'Touche pour voir tes cartes';
        return;
      }
      c.classList.add('gone'); sfx.tap(); k++; el.dataset.r = ''; el.querySelector('.pk-rar').textContent = '';
      if (k >= cardsEl.length) {
        hint.classList.add('hidden');
        setTimeout(() => { el.querySelector('.pk-stack').classList.add('hidden'); el.querySelector('.pk-recap').classList.remove('hidden'); el.querySelector('.pk-done').classList.remove('hidden'); }, 300);
      } else hint.textContent = 'Touche la carte pour la retourner';
    });
  }

  // ------------------------------------------------------------ bon plan d'un contact
  // rachat : « tu l'as payé X → il t'en donne Y = +Z » (plus parlant que la cote)
  const paidFor = id => { const a = st().owned[id]; return a && a.length ? a[0].paid : null; };
  const gainTxt = (id, price) => { const p = paidFor(id); if (p == null) return ''; const g = Math.round(price - p); return `Acheté ${short(p)} · <b class="${g >= 0 ? 'up' : 'down'}">${g >= 0 ? 'tu gagnes +' : 'tu perds '}${short(Math.abs(g))}</b>`; };
  function openDeal() {
    const d = st().deal; if (!d) return;
    const body = () => {
      const x = st().deal; if (!x) return '<p class="center">L\'offre a expiré.</p>';
      const it = G.item(x.id), cote = st().market.prices[x.id], diff = x.type === 'sell' ? (1 - x.price / cote) : (x.price / cote - 1);
      return `<div class="deal-top"><span class="deal-face">${pic(x.img, '🧑')}</span><div class="say"><b>${x.name}</b>« ${x.line} »</div></div>
        <div class="card deal-card center"><span class="rtag r${it.r}">${RAR[it.r]}</span><div class="deal-art">${itemPic(it)}</div><h4>${it.name}</h4>
          <div class="deal-prices"><div><small>${x.type === 'buy' && paidFor(x.id) != null ? 'Acheté' : 'Cote'}</small><b>${short(x.type === 'buy' && paidFor(x.id) != null ? paidFor(x.id) : cote)}</b></div><div class="arrow">${x.type === 'sell' ? '→' : '→'}</div><div class="hot"><small>${x.type === 'sell' ? 'Il te le vend' : 'Il te le rachète'}</small><b>${short(x.price)}</b></div></div>
          <p class="deal-gain">${x.type === 'sell' ? `${Math.round(diff * 100)} % sous la cote` : paidFor(x.id) != null ? `${gainTxt(x.id, x.price)} (au Comptoir, tu aurais ${short(G.sellPrice(x.id))})` : `${Math.round(diff * 100)} % au-dessus de la cote (au Comptoir, tu aurais ${short(G.sellPrice(x.id))})`}</p>
          <p class="muted">L'offre expire dans <b>${mmss(x.end - Date.now())}</b></p></div>
        <div class="grid2"><button class="btn green" data-act="dealOk">${x.type === 'sell' ? `Acheter ${short(x.price)}` : `Vendre ${short(x.price)}`}</button><button class="btn" data-act="dealNo">Refuser</button></div>`;
    };
    openModal({ title: 'Bon plan', icon: 'star', center: true, body: body(), refresh: () => setBody(body()) });
  }
  // profil : le perso, les chiffres qui comptent, tes plus belles pièces, tes trophées, et les styles (payants)
  const skinsOwned = () => { const s = st(); s.skinsOwned = s.skinsOwned || [s.skin]; if (s.skin && !s.skinsOwned.includes(s.skin)) s.skinsOwned.push(s.skin); return s.skinsOwned; };
  function profileBody() {
    const s = st(), S = s.stats, xpPct = isFinite(G.xpNeed()) ? Math.min(100, Math.round(s.xp / G.xpNeed() * 100)) : 100;
    const tile = (ico, v, l) => `<div class="pf-tile"><span class="pf-ti">${ico}</span><b>${v}</b><small>${l}</small></div>`;
    const cards = G.cardsLive(), haveCards = cards.filter(i => (s.owned[i.id] || []).length).length;
    const winRate = S.bets ? Math.round((S.betsWon || 0) / S.bets * 100) : 0;
    const RK = { L: 4, E: 3, R: 2, C: 1 }, best = Object.keys(s.owned).filter(id => s.owned[id].length && G.item(id).cat === 'card').map(id => ({ it: G.item(id), v: G.sellPrice(id), paid: s.owned[id][0].paid })).sort((a, b) => (RK[b.it.r] || 0) - (RK[a.it.r] || 0) || b.v - a.v).slice(0, 3);
    const trophies = D.ITEMS.filter(i => i.cat === 'trophy' && !i.ach).map(t => ({ t, has: (s.owned[t.id] || []).length, q: D.QUESTS.find(q => q.trophy === t.id) }));
    // seuls les trophées qui ont leur image sont exposés (les autres arrivent avec les lots succès)
    const achs = D.ACHIEVEMENTS.filter(a => has('ach-' + a.id)).map(a => ({ a, done: !!(s.ach && s.ach[a.id]), v: Math.min(a.n, G.achValue(a)) }));
    const own = skinsOwned();
    return `<div class="card pf-hero"><div class="pf-skin">${skinPic(s.skin)}</div>
        <div class="pf-id"><div class="big">${esc(s.name)}<small class="pf-tag">#${s.tag || (s.tag = String(1000 + Math.floor(Math.random() * 9000)))}</small></div><span class="pf-lvl">Niveau ${s.lvl}</span><span class="pf-rank" title="Street cred">${pic(rkImg(G.rankOf()), G.rankOf().emo)}${G.rankOf().name}</span>
          <div class="pf-xp"><i style="width:${xpPct}%"></i></div><small>${isFinite(G.xpNeed()) ? `${s.xp} / ${G.xpNeed()} XP` : 'Niveau max atteint'}</small>
          <div class="pf-worth"><small>Patrimoine</small><b>${short(G.worth())}</b>${S.worth ? `<small>Record : ${short(S.worth)}</small>` : ''}</div></div></div>
      ${photoLooks()}
      <h3 class="sec">Tes chiffres</h3>
      <div class="pf-tiles">${tile(pic('nav-bets', '🎟️'), `${S.betsWon || 0}<small>/${S.bets || 0}</small>`, `paris gagnés${S.bets ? ` · ${winRate} %` : ''}`)}${tile(pic('item-c-holo', '🃏'), `${haveCards}<small>/${cards.length}</small>`, 'cartes collectionnées')}${tile(pic(has('app-objets') ? 'app-objets' : 'tip-market', '🏷️'), S.itemProfit || 0, 'reventes gagnantes')}
        ${tile(pic('hab-club', '🪩'), S.clubNights || 0, 'soirées au Club')}${tile(pic('cat-trophy', '🏆'), trophies.filter(x => x.has).length + '<small>/' + trophies.length + '</small>', 'trophées')}${tile(pic('casino-machine', '🎰'), (S.spins || 0) + (S.roulette || 0), 'tours au casino')}</div>
      ${best.length ? `<h3 class="sec">Tes cartes les plus rares</h3><div class="pf-best">${best.map((x, k) => `<div class="pf-gem ${k === 0 ? 'top' : ''}"><span class="pf-rank">${k + 1}</span><div class="pf-art">${itemPic(x.it)}</div><b>${esc(x.it.name)}</b><span class="pf-v">${short(x.v)}</span>${x.paid > 0 ? `<small class="${x.v >= x.paid ? 'up' : 'down'}">${x.v >= x.paid ? '+' : '−'}${short(Math.abs(x.v - x.paid))}</small>` : '<small class="up">cadeau</small>'}</div>`).join('')}</div>` : ''}
      <h3 class="sec">Ton style <small>· un look acheté reste à toi</small></h3>
      <div class="skin-grid">${D.SKINS.map(k => { const lock = s.lvl < k.lvl, has = own.includes(k.id), on = k.id === s.skin;
        if (k.iap && !has) { const x = D.IAP.find(i => i.id === k.iap); return `<div class="card sk-iap"><div class="sp">${skinPic(k.id)}</div><b>${k.name}</b><small class="muted">Exclusif</small><button class="btn gold xs" data-act="iapSoon" data-id="${k.iap}">${x ? x.price : 'Boutique'}</button></div>`; }
        return `<button class="card ${lock ? 'locked' : ''} ${on ? 'on' : ''}" data-act="${lock || on ? 'noop' : 'setSkin'}" data-id="${k.id}" ${!lock && !has && s.cash < k.cost ? 'disabled' : ''}>
        <div class="sp">${skinPic(k.id)}</div><b>${k.name}</b><small class="${!lock && !has && !on ? 'sk-price' : 'muted'}">${lock ? `${ic('lock')} Niveau ${k.lvl}` : on ? 'Porté' : has ? 'Mettre' : short(k.cost)}</small></button>`; }).join('')}</div>
      <h3 class="sec">Tes trophées <small>· ${trophies.filter(x => x.has).length + achs.filter(x => x.done).length} / ${trophies.length + achs.length}</small></h3>
      <div class="pf-trophies">${[...trophies.map(x => ({ done: !!x.has, html: `<div class="pf-tr ${x.has ? 'has' : 'no'}"><div class="pf-art">${itemPic(x.t)}</div><b>${x.t.name.replace(/^Trophée\s*/, '').replace(/[«»]/g, '').trim()}</b><small>${x.has ? (x.q ? `✓ Gagné : ${x.q.txt.toLowerCase()}` : '✓ Gagné') : x.q ? `À gagner : ${x.q.txt.toLowerCase()}` : 'À gagner'}</small></div>` })),
        ...achs.map(x => ({ done: x.done, html: `<div class="pf-tr ${x.done ? 'has' : 'no'}"><div class="pf-art">${has('ach-' + x.a.id) ? pic('ach-' + x.a.id) : '<span class="pf-tr-emo">🏆</span>'}</div><b>${x.a.name}</b><small>${x.done ? `✓ ${x.a.txt}` : x.a.txt}</small>${x.done ? '' : `<i class="pf-a-bar"><i style="width:${Math.round(x.v / x.a.n * 100)}%"></i></i>`}</div>` }))]
        .sort((p, q) => q.done - p.done).map(x => x.html).join('')}</div>
      ${leaderHtml()}`;
  }
  // ---- classement des fortunes : le top 10 toujours visible, puis ta place et tes voisins
  // le vrai classement, celui des joueurs du serveur (plus aucun joueur inventé) ; hors ligne : on le dit simplement
  let LB = null, lbAt = 0;
  function lbLoad() {
    if (Date.now() - lbAt < 60000) return; lbAt = Date.now();
    if (window.ONLINE && ONLINE.on && ONLINE.leaderboard) ONLINE.leaderboard().then(r => { if (r && r.top) { LB = r; if ($('#modal .lb-card')) setBody(profileBody()); } });
  }
  function leaderHtml() {
    lbLoad();
    if (!LB) return `<h3 class="sec">Les plus riches du quartier</h3><div class="lb-card lb-off"><p class="hint-line center">${window.ONLINE && ONLINE.on ? 'Chargement du classement…' : 'Le classement des joueurs s\'affiche quand tu es connecté à internet.'}</p></div>`;
    const d = LB, rk = r => r === 1 ? ico('medal-gold', '🥇') : r === 2 ? ico('medal-silver', '🥈') : r === 3 ? ico('medal-bronze', '🥉') : r;
    const row = (p, r) => `<div class="lb-row ${p.me ? 'me' : ''}"><span class="lb-rk">${rk(r)}</span><span class="lb-av">${skinPic(p.skin, true)}</span><span class="lb-nm"><b>${esc(p.me ? `${p.name} (toi)` : p.name)}</b><small>Niveau ${p.lvl || 1}</small></span><b class="lb-w">${short(p.worth)}</b></div>`;
    const inTop = d.rank <= 10, around = inTop ? [] : d.around;
    return `<h3 class="sec">Les plus riches du quartier <small>· ${d.total.toLocaleString('fr-FR')} joueurs</small></h3>
      <div class="lb-card"><div class="lb-me">Ta place : <b>${d.rank.toLocaleString('fr-FR')}<sup>${d.rank === 1 ? 'er' : 'e'}</sup></b> sur ${d.total.toLocaleString('fr-FR')}${d.rank > 1 ? ` · encore <b>${short(Math.max(0, ((inTop ? d.top[d.rank - 2] : d.around[d.rank - d.aroundStart - 1]) || {}).worth - G.worth() + 1))}</b> pour passer devant` : ' · tu es le plus riche !'}</div>
        ${d.top.map((p, i) => row(p, i + 1)).join('')}${around.length ? `<div class="lb-gap">• • •</div>${around.map((p, i) => row(p, d.aroundStart + i)).join('')}` : ''}</div>
      <p class="hint-line center">Le classement suit ton patrimoine : cash, crypto, objets, immobilier.</p>`;
  }
  // pin's et cadres achetés : on choisit ici lequel porter (ou aucun), même après la fin de l'événement
  function photoLooks() {
    const s = st(), mine = k => D.EV_SHOP.filter(x => x.kind === k && G.evOwned(x.id));
    const pins = mine('avatar'), frames = mine('frame'), curFr = s.frame && D.EV_SHOP.find(x => x.id === s.frame);
    if (!pins.length && !frames.length) return `<h3 class="sec">Ta photo de profil</h3><p class="hint-line">Les <b>pin's</b> et les <b>cadres</b> s'achètent pendant les événements, au Panneau de la place. Ici, tu choisiras lequel porter.</p>`;
    const chip = (k, id, on, art, name) => `<button class="pf-chip ${on ? 'on' : ''}" data-act="pfLook" data-k="${k}" data-id="${id || ''}" title="${esc(name)}" aria-label="${esc(name)}">${art}</button>`;
    const none = k => chip(k, '', !s[k], '<span class="pf-none">∅</span>', 'Aucun');
    const frArt = x => frameImg(x) ? `<img src="${src(frameImg(x))}" alt="">` : `<span class="ev-frame" style="--f1:${x.colors[0]};--f2:${x.colors[1]}"><em>${x.emo}</em></span>`;
    const line = (t, k, L, art) => L.length ? `<div class="pf-line"><small>${t}</small><div class="pf-chips">${none(k)}${L.map(x => chip(k, x.id, s[k] === x.id, art(x), x.name.replace(/^Photo : /, ''))).join('')}</div></div>` : '';
    return `<div class="card pf-photo-row"><span class="ev-avpin pf-prev" ${curFr && !frameImg(curFr) ? `style="border-color:${curFr.colors[0]};box-shadow:0 0 0 3px ${curFr.colors[1]}"` : ''}>${skinPic(s.skin, true)}${curFr && frameImg(curFr) ? `<img class="pf-fr" src="${src(frameImg(curFr))}" alt="">` : ''}${s.avatar ? `<span class="av-pin">${pinArt(D.EV_SHOP.find(x => x.id === s.avatar))}</span>` : ''}</span>
      <div class="pf-pick"><b>Ta photo de profil</b>${line("Pin's", 'avatar', pins, x => pinArt(x))}${line('Cadre', 'frame', frames, frArt)}</div></div>`;
  }
  function openProfile() { openModal({ title: 'Profil', icon: 'star', full: true, body: profileBody(), refresh: () => setBody(profileBody()) }); }
  // réglages façon jeu mobile : conseils qui défilent, son, affichage, notifications, compte et sauvegarde, aide
  let tipTimer = null, tipI = 0;
  const setRow = (act, label, on, sub) => `<button class="set-row" data-act="${act}"><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span><i class="set-sw ${on ? 'on' : ''}"><i></i></i></button>`;
  function settingsBody() {
    const s = st();
    return `<div class="tip-carousel" data-act="tipNext"><div class="tc-txt" id="tc-txt">${D.TIPS[tipI % D.TIPS.length]}</div><div class="tc-dots">${D.TIPS.slice(0, 8).map((_, k) => `<i class="${k === tipI % 8 ? 'on' : ''}"></i>`).join('')}</div></div>
      <h3 class="sec">Son</h3><div class="card set-card">${setRow('setToggle" data-k="music', 'Musique', s.music !== false, 'Une petite boucle lo-fi')}${setRow('soundToggle', 'Effets sonores', s.sound)}${setRow('setToggle" data-k="vibrate', 'Vibrations', s.vibrate !== false, 'Sur téléphone, quand tu gagnes')}</div>
      <h3 class="sec">Affichage</h3><div class="card set-card">${setRow('setToggle" data-k="calm', 'Animations réduites', !!s.calm, 'Moins de confettis et d\'effets')}<div class="set-row"><span><b>Langue</b></span><em>Français</em></div></div>
      <h3 class="sec">Notifications</h3><div class="card set-card">${setRow('setToggle" data-k="quiet', 'Bandeaux en jeu', !s.quiet, 'Les messages qui glissent en haut de l\'écran')}${setRow('setToggle" data-k="noPush', 'Rappels hors du jeu', !s.noPush, 'Récolte prête, loyers… (version téléphone)')}</div>
      <h3 class="sec">Compte</h3><div class="card set-card">
        <div class="set-row"><span><b>Ton pseudo</b><small>${esc(s.name || '')}</small></span><button class="btn xs blue" data-act="setName">Changer</button></div>
        <div class="set-row"><span><b>Se connecter</b><small>Apple, Google : avec la version App Store et Google Play</small></span><button class="btn xs" disabled>Bientôt</button></div>
        <div class="set-row"><span><b>Sauvegarder ma partie</b><small>Un code à garder pour la retrouver sur un autre appareil</small></span><button class="btn xs green" data-act="saveExport">Copier</button></div>
        <div class="set-row"><span><b>Récupérer une sauvegarde</b><small>Colle le code d'une partie</small></span><button class="btn xs yellow" data-act="saveImport">Coller</button></div></div>
      <h3 class="sec">Aide</h3><div class="card set-card">
        <button class="set-row" data-act="howto"><span><b>Comment jouer</b></span><em>›</em></button>
        <button class="set-row" data-act="tutoAgain"><span><b>Revoir le tuto</b></span><em>›</em></button>
        <div class="set-row"><span><b>Tutos de Momo</b><small>${st().noTuto ? 'Coupés : plus d\'explications quand un lieu s\'ouvre' : 'Momo t\'explique chaque nouveau lieu'}</small></span><button class="btn xs ${st().noTuto ? 'green' : ''}" data-act="tutoToggle">${st().noTuto ? 'Remettre' : 'Couper'}</button></div>
        ${isStandalone() ? '' : `<button class="set-row" data-act="installHelp"><span><b>Mettre le jeu sur mon écran d'accueil</b><small>Comme une appli, en plein écran</small></span><em>›</em></button>`}
        ${window.ONLINE && ONLINE.on ? `<button class="set-row" data-act="onlineCode"><span><b>Code de récupération</b><small>Pour retrouver ta partie sur un autre appareil</small></span><em>›</em></button>` : ''}
        <button class="set-row" data-act="legal"><span><b>Conditions et confidentialité</b></span><em>›</em></button></div>
      ${admLocal ? `<h3 class="sec">Pour tester</h3><div class="card set-card"><button class="set-row" data-act="adminOpen"><span><b>Back-office</b><small>Placer la ville et l'appart</small></span><em>›</em></button>
        <button class="set-row" onclick="location.hash='#test'"><span><b>Partie test</b><small>Tout débloqué, cash illimité</small></span><em>›</em></button>
        <button class="set-row" onclick="location.hash='#neuf'"><span><b>Nouvelle partie d'essai</b><small>Depuis le début, avec le tuto</small></span><em>›</em></button></div>` : ''}
      <button class="btn red wide" style="margin-top:12px" data-act="resetAsk">Recommencer à zéro</button>
      <p class="muted center" style="margin-top:10px">Hustle City v${((document.querySelector('script[src*="ui.js"]') || {}).src || '').match(/v=(\d+)/)?.[1] || ''} · un jeu : l'argent du jeu est fictif, il ne s'achète pas et ne vaut rien en vrai. Les vrais jeux d'argent sont interdits aux mineurs.</p>`;
  }
  function openSettings() {
    openModal({ title: 'Réglages', icon: 'hdr-settings', full: true, body: settingsBody(), onClose: () => clearInterval(tipTimer) });
    clearInterval(tipTimer); tipTimer = setInterval(() => { if (!$('#tc-txt')) return clearInterval(tipTimer); nextTip(); }, 6000);
  }
  function nextTip() { tipI++; const t = $('#tc-txt'); if (!t) return; t.classList.remove('in'); void t.offsetWidth; t.innerHTML = D.TIPS[tipI % D.TIPS.length]; t.classList.add('in');
    document.querySelectorAll('.tc-dots i').forEach((d, k) => d.classList.toggle('on', k === tipI % 8)); }
  function openHowto() {
    openModal({ title: 'Comment jouer', icon: 'star', body: `<div class="card" style="font-size:13px;line-height:1.55">
      <b>Le but</b> : faire grimper ton patrimoine (cash + crypto + objets).<br><br>
      ${ico('bld-appart', '🏢')} <b>Ton appart</b> : ton PC pour trader la crypto, ton rig qui mine de l'Axion (relance-le quand il surchauffe), et tes étagères où s'exposent tes objets.<br><br>
      ${ico('bld-balto', '🍺')} <b>Le Royal</b> : paris sportifs (cotes réelles, le bookmaker garde 7 %) et tickets à gratter.<br><br>
      ${ico('bld-casino', '🎰')} <b>Lucky Palace</b> : machine à sous et roulette européenne. Sur la durée, la maison gagne.<br><br>
      ${ico('bld-shop', '🛍️')} <b>Le Comptoir</b> : cartes, sneakers, montres. Leur cote bouge toute la journée. Tes trophées aussi valent de l'argent.</div>` });
  }

  // ------------------------------------------------------------ accueil
  function startScreen() {
    const el = $('#start'); el.className = 'first';
    const logo = has('logo') ? `<img src="${src('logo')}" alt="Hustle City">` : '<div class="t1">HUSTLE</div><div class="t2">CITY</div>';
    let sel = 'survet'; if (!st().tag) st().tag = String(1000 + Math.floor(Math.random() * 9000));
    const draw = () => {
      el.innerHTML = `<div class="logo">${logo}<div class="tagline">Deviens riche. Facilement.*<small>*ou pas</small></div></div>
        <div class="form">
          <div class="skins">${D.SKINS.filter(k => !k.iap).map(k => `<button class="skin ${k.id === sel ? 'sel' : ''} ${k.lvl > 1 ? 'locked' : ''}" data-skin="${k.id}" ${k.lvl > 1 ? 'disabled' : ''}>${skinPic(k.id)}<b>${k.lvl > 1 ? `Niv. ${k.lvl}` : k.name}</b></button>`).join('')}</div>
          <input class="name" id="st-name" maxlength="16" placeholder="Ton blaze" value="${esc(st().name || '')}">
          <button class="btn green start-btn" id="st-go" style="min-height:62px;font-size:26px">C'est parti</button>
          <button class="st-restore" data-act="restoreCode">J'ai déjà une partie : coller mon code</button>
        </div>`;
      startBg(el);
      el.querySelectorAll('.skin').forEach(b => b.onclick = () => { sel = b.dataset.skin; const n = $('#st-name').value; draw(); $('#st-name').value = n; });
      $('#st-go').onclick = () => {
        const n = $('#st-name').value.trim();
        if (n.length < 3) return toast('Ton blaze : 3 lettres minimum.', true);
        // deux joueurs peuvent choisir le même blaze : le numéro (#4821) les distingue. La vraie vérification viendra avec les comptes en ligne.
        st().name = n; st().tag = st().tag || String(1000 + Math.floor(Math.random() * 9000)); st().skin = sel; G.save(); el.remove(); boot2(true);
      };
    };
    draw();
  }
  function intro() {
    const s = st();
    dialog('Ton cousin Momo', `Wesh ${esc(s.name)} ! Bienvenue à Hustle City. T'as 200<i class="cur"></i> en poche et un vieux PC. Commence par <b>ton appart</b> : relance le minage et achète un peu de crypto.`, 'Vas-y', () => {
      dialog('Ton cousin Momo', 'Et au <b>Royal</b>, en face, y a les paris sur le foot. Mais retiens : le patron gagne toujours plus que les clients.', 'Compris', () => { s.tutoDone = true; G.save(); });
    });
  }

  // ouvrir une appli du téléphone qui a sa propre fenêtre
  function phoneGo(id) {
    if (id === 'bank') return openWallet();
    if (id === 'crypto') return openCrypto();
    if (id === 'bets') { notifs().forEach(n => { if (n.app === 'bets') n.read = true; }); return window.BALTO.openMyBets(); }
    if (id === 'missions') return openRewards();
    if (id === 'boosters') return openBoosters('open');
    if (id === 'agence') return window.AGENCE ? AGENCE.open() : toast('L\'agence ouvre très bientôt.');
    if (id === 'binder') return openBoosters('col');
    if (id === 'settings') return openSettings();
    if (id === 'shopNews') { const last = (st().market.news || [])[0]; return st().lvl >= 2 ? openShop('news', shopOfItem(last && last.item)) : null; }
    if (id === 'deal') return openPhone('msg');
    if (id === 'rig') { setScene('appart'); return openRig(); }
    if (id === 'gift') return openDaily();
    if (id === 'six') { closeModal(); setScene('city'); focusBld('six'); return openSix('pronos'); }
    if (id === 'cdm') return goCdm();
  }
  // « Y aller » : mène à l'endroit où se fait la mission
  function questGo(go) {
    closeModal();
    const bld = { balto: 'balto', scratch: 'balto', casino: 'casino', shop: 'shop' }[go];
    if (bld) { const b = D.BUILDINGS.find(x => x.id === bld); if (st().lvl < b.lvl) return toast(`${b.name} ouvre au niveau ${b.lvl}.`); }
    switch (go) {
      case 'rig': setScene('appart'); return openRig();
      case 'pc': setScene('appart'); return openCrypto();
      case 'balto': setScene('city'); focusBld('balto'); return window.BALTO.open('bets');
      case 'scratch': setScene('city'); focusBld('balto'); return window.BALTO.open('scratch');
      case 'casino': setScene('city'); focusBld('casino'); return window.CASINO.open();
      case 'shop': setScene('city'); focusBld('shop'); return openShop();
      case 'kiosque': setScene('city'); focusBld('kiosque'); return openKiosk('news');
      case 'boosters': return openBoosters('open');
      case 'collection': return openBoosters('col');
      case 'deal': return st().deal ? openDeal() : toast('Pas de bon plan pour l\'instant : un contact t\'en proposera bientôt.');
      case 'wallet': return openWallet();
    }
  }

  // ------------------------------------------------------------ actions
  const A = {
    noop() {},
    closeModal,
    bld: el => { if (!placing) openBuilding(el.dataset.id); },
    toggleScene: () => setScene(scene === 'city' ? 'appart' : 'city'),
    pc: () => openCrypto(),
    rig: () => openRig(),
    rigUpOpen: () => { openRig(); setTimeout(() => { const c = $('#modal .up-card'), b = $('#modal .sheet-body'); if (c && b) b.scrollTop = c.offsetTop - b.offsetTop - 40; }, 30); },
    room: () => openRoom(),
    roomUp() { const r = G.roomUpgrade(); if (r.err) return toast(r.err, true); rain('confetti'); closeModal(); renderAppart(); },
    rigCollect() { A.mineHarvest(); },
    rigQuick(el, e) { e.stopPropagation(); const i = G.rigInfo(); if (i.ready) return A.mineHarvest(); if (!i.idle && !i.burnt && i.heat >= 50 && i.coolLeft <= 0) return A.mineCool(); openRig(); },
    mineStart(el) { const r = G.mineStart(el.dataset.id); if (r.err) return toast(r.err, true); sfx.tap(); toast(`C'est parti : ta machine mine ${deC(G.coin(el.dataset.id).name).replace(/^de /, 'du ')}.`); refresh(); },
    stockSkip() { const r = G.stockSkip(); if (r.err) return toast(r.err, true); sfx.coin(); toast(`Nouvel arrivage ! (−${r.n} lingots)`); refresh(); },
    mineSkip() { const r = G.mineSkip(); if (r.err) return toast(r.err, true); sfx.coin(); floatTxt(`⚡ −${r.n} lingots`); refresh(); },
    mineCool() { const r = G.mineCool(); if (r.err) return toast(r.err, true); sfx.tap(); floatTxt('💨 −50 %'); refresh(); },
    hvSell(el) { const id = el.dataset.id, q = +el.dataset.q, h = st().crypto.hold[id] || 0; if (!(h > 0)) return toast('Plus rien à vendre.', true);
      const r = G.sellCrypto(id, Math.min(1, q / h)); if (r.err) return toast(r.err, true); sfx.coin(); floatTxt(`+${eur(r.net)}`); el.disabled = true; el.innerHTML = `Vendu · +${short(r.net)}`; refresh(); },
    coinSelPc(el) { const id = el.dataset.id; closeModal(); setTimeout(() => openCrypto(id), 60); },
    mineHarvest() { const r = G.mineHarvest(); if (r.err) return toast(r.err, true); sfx.harvest(); closeModal(); setTimeout(() => { showHarvest(r); refresh(); }, 80); },
    roomHelp: () => openRoomHelp(),
    wSellCoin(el) { cryptoSel = el.dataset.id; sellCoin(1); },
    collectionInfo: () => openWallet(),
    coinBack() { cryptoView = 'list'; setBody(cryptoBody()); },
    rigUpL() { const r = G.rigUpgrade(true); if (r.err) return toast(r.err, true); rain('confetti', 18); refresh(); },
    roomUpL() { const r = G.roomUpgrade(true); if (r.err) return toast(r.err, true); rain('confetti'); closeModal(); closePhone(); setScene('appart'); },
    pcUp() { const r = G.pcUpgrade(); if (r.err) return toast(r.err, true); rain('confetti', 18); refresh(); },
    pcUpL() { const r = G.pcUpgrade(true); if (r.err) return toast(r.err, true); rain('confetti', 18); refresh(); },
    rigUp() { const r = G.rigUpgrade(); if (r.err) return toast(r.err, true); rain('confetti', 18); refresh(); },
    coinSel: el => { cryptoSel = el.dataset.id; cryptoView = 'coin'; crAmt = null; setBody(cryptoBody()); $('#modal .sheet-body').scrollTop = 0; },
    goCoin: el => { closeModal(); setScene('appart'); openCrypto(el.dataset.id); },
    crAmt(el) { crAmt = el.dataset.v === 'max' ? Math.floor(st().cash * 100) / 100 : +el.dataset.v; setBody(cryptoBody()); },
    crBuy(el) { const v = parseFloat($('#cr-amt').value); const r = G.buyCrypto(cryptoSel, v); if (r.err) return toast(r.err, true); sfx.coin(); crAmt = null; refresh(); },
    crSell(el) { sellCoin(+(el.dataset.f || 1)); },
    shopGo: () => openShop(),
    goPlace(el) { const id = el.dataset.id; closeModal(); id === 'tour' ? openTower() : openShop(null, id); },
    safeUp() { const r = G.safeUp(); if (r.err) return toast(r.err, true); sfx.win(); toast('Coffre agrandi !'); refresh(); },
    garageUp() { const r = G.garageUp(); if (r.err) return toast(r.err, true); sfx.win(); toast('Parking agrandi !'); refresh(); },
    propBuy(el) { const r = G.propBuy(el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 30); toast(`${G.prop(el.dataset.id).name} : c'est à toi ! Les loyers tombent chaque jour.`); refresh(); },
    propCollect(el) { const r = G.propCollect(el.dataset.id); if (r.err) return toast(r.err, true); sfx.coin(); flyTo(el, '#pill-cash'); toast(r.issue ? `${r.issue.txt} : −${eur(r.issue.cost)}. Tu encaisses quand même ${eur(r.got)}.` : `Loyers encaissés : +${eur(r.got)}.`, !!r.issue); refresh(); },
    propSell(el) { if (!confirm('Vendre ce bien ?')) return; const r = G.propSell(el.dataset.id); if (r.err) return toast(r.err, true); sfx.coin(); toast(`Vendu ${eur(r.v)} : ${r.profit >= 0 ? `+${eur(r.profit)} de gagné` : `${eur(r.profit)} de perdu`}.`, r.profit < 0); refresh(); },
    stockBuy(el) { const v = el.dataset.v === 'all' ? st().cash : +el.dataset.v; const r = G.stockBuy(el.dataset.id, v); if (r.err) return toast(r.err, true); sfx.coin(); refresh(); },
    stockSell(el) { const c = D.STOCKS.find(x => x.id === el.dataset.id), r = G.stockSell(el.dataset.id, 1); if (r.err) return toast(r.err, true); sfx.coin(); toast(r.profit >= 0 ? `${c.name} vendue : <b>+${eur(r.profit)} de gagné</b>.` : `${c.name} vendue : ${eur(r.profit)} de perdu.`, r.profit < 0); refresh(); },
    lookBuy(el) { const r = G.lookBuy(el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 30); toast('Ta ville change de look !'); renderCity(); refresh(); },
    itBuy(el) { const r = G.buyItem(el.dataset.id); if (r.err) return toast(r.err, true); justBought = { id: el.dataset.id, t: Date.now() }; sfx.buy(); flyTo(el, '#pill-cash', 4); refresh(); },
    itSell(el) { const r = G.sellItem(el.dataset.id); if (r.err) return toast(r.err, true); floatTxt(`+${eur(r.p)}`); toast(r.paid ? (r.profit >= 0 ? `Vendu avec ${eur(r.profit)} de bénéfice` : `Vendu à perte : ${eur(r.profit)}`) : `Vendu ${eur(r.p)}`, r.paid && r.profit < 0); if ($('#modal .sheet.center')) closeModal(); refresh(); },
    itemInfo: el => openItem(el.dataset.id),
    wallet: () => openWallet(),
    quests: () => openRewards(),
    rewards: () => openRewards(),
    nextBuy: () => goNextBuy(),
    cdmPick(el) { sfx.tap(); cdmConfirm(el.dataset.id); },
    cdmBack() { sfx.tap(); openCdm(); },
    cdmGo() { goCdm(); },
    cdmJoin(el) { const r = G.cdmJoin(el.dataset.id); if (r.err) return toast(r.err, true); sfx.level(); rain('confetti', 50); cdmTab = 'team'; openCdm('team'); renderHud(); toast(`Bienvenue chez les ${r.T.name} ! ${r.T.motto}`); },
    cdmNight(el) { const r = G.cdmNightClaim(+el.dataset.i); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', r.bonus ? 40 : 15); setBody(cdmBody()); renderHud(); },
    cdmStep(el) { const r = G.cdmStepClaim(+el.dataset.i); if (r.err) return toast(r.err, true); sfx.level(); rain('confetti', 30); if (r.g.refund) toast(`Tu l'avais déjà : +${r.g.refund} bonbons à la place.`); setBody(cdmBody()); renderCity(); renderHud(); },
    cdmBuy(el) { const r = G.cdmBuy(el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 20); setBody(cdmBody()); renderCity(); renderHud(); },
    cdmUse(el) { const r = G.evUse(el.dataset.id); if (r.err) return toast(r.err, true); sfx.tap(); setBody(cdmBody()); renderCity(); renderHud(); },
    cdmHow() { cdmHowOpen = !cdmHowOpen; setBody(cdmBody()); },
    cdmRecapOk() { const claimed = G.cdmState().final.claimed; G.cdmRecapSeen(); if (!claimed) { sfx.level(); rain('confetti', 60); } closeModal(); renderCity(); renderHud(); },
    sixPast(el) { const d = +el.dataset.d; sixPastOpen.has(d) ? sixPastOpen.delete(d) : sixPastOpen.add(d); setBody(sixBody()); },
    sixHow() { sixHowOpen = !sixHowOpen; setBody(sixBody()); },
    coachGo(el) { const c = coachList[+el.dataset.i]; closeModal(); if (c) setTimeout(c.go, 60); },
    upgrades: () => openUpgrades(),
    sixBoard: () => { sixTab = 'board'; openSix('board'); },
    roomPlace: () => roomPlacer(true),
    adminOpen() { location.hash = '#admin'; },
    patPay: el => openPatPay(el.dataset.k),
    patGo(el) { const k = el.dataset.k, r = G.liquidate(G.upPrice(k)); if (r.err) return toast(r.err, true);
      const u = k === 'rig' ? G.rigUpgrade() : k === 'pc' ? G.pcUpgrade() : G.roomUpgrade(); if (u.err) return toast(u.err, true);
      sfx.win(); rain('confetti', 24); openUpgrades(); renderHud(); },
    evBuy(el) { const r = G.evBuy(el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 20); setBody(sixBody()); renderCity(); renderHud(); },
    evUse(el) { const r = G.evUse(el.dataset.id); if (r.err) return toast(r.err, true); sfx.tap(); setBody(sixBody()); renderCity(); renderHud(); },
    sixPick(el) { const r = G.sixPick(+el.dataset.i, +el.dataset.p); if (r.err) return toast(r.err, true); sfx.tap(); setBody(sixBody()); },
    sixRecapOk() { const claimed = G.sixState().final.claimed; G.sixRecapSeen(); if (!claimed) { sfx.level(); rain('confetti', 50); } closeModal(); renderCity(); renderHud(); },
    sixClaim(el) { const r = G.claimSix(); if (r.err) return toast(r.err, true); sfx.level(); rain('confetti', 40); setBody(sixBody()); renderHud(); },
    quest() { const q = G.questFocus(); openRewards(q && G.questState(q).done ? 'missions' : undefined); },
    claimQuest(el) { const r = G.claimQuest(el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 16); flyTo(el, '#pill-cash'); refresh(); },
    lvlGo(el) { closeModal(); setScene('city'); focusBld(el.dataset.id); },
    nextCap() { openRewards('levels', true); },
    credGo(el) { questGo(el.dataset.id); },
    claimWeek(el) { const r = G.claimWeek(+el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); flyTo(el, '#pill-lingots'); if (r.bonus) { rain('bill', 40); toast('Semaine bouclée : 3 boosters et 15 lingots !'); } refresh(); },
    claimChal(el) { const r = G.claimChal(+el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); flyTo(el, '#pill-cash'); if (r.bonus) rain('bill', 30); refresh(); },
    questGo(el) { questGo(D.QUESTS.find(q => q.id === el.dataset.id).go); },
    daily: () => openDaily(),
    claimDaily(el) { const r = G.claimDaily(); if (r.err) return toast(r.err, true); sfx.win(); rain('bill', 24); flyTo(el, '#pill-cash', 8); toast(`Jour ${r.day} : +${eur(r.r.cash)} et ${r.r.lingots} lingots${r.r.boosters ? ` et ${r.r.boosters} booster${r.r.boosters > 1 ? 's' : ''}` : ''} !`); refresh(); },
    boosters: () => openBoosters('open'),
    collection: () => openBoosters('col'),
    boosterOpen() { const r = G.openBooster(); if (r.err) return toast(r.err, true); closeModal(); sfx.tear(); packOpening(r.cards); renderHud(); },
    boosterBuy() { const r = G.buyBooster(); if (r.err) return toast(r.err, true); sfx.coin(); refresh(); },
    packDone() { const el = $('#pack'); el.className = ''; el.innerHTML = ''; refresh(); nextPending(); },
    goDefis: () => openRewards('defis'),
    claimSeries(el) { const r = G.claimSeries(el.dataset.id); if (r.err) return toast(r.err, true); sfx.level(); rain('bill', 40); toast(`Série « ${r.se.name} » complète : +${eur(r.se.reward.cash)} et ${r.se.reward.lingots} lingots !`); refresh(); },
    cardZoom: el => cardZoom(el.dataset.id),
    czClose: () => closeZoom(),
    czBuy(el) { const r = G.buyItem(el.dataset.id); if (r.err) return toast(r.err, true); sfx.coin(); closeZoom(); refresh(); },
    czSell(el) { const id = el.dataset.id, r = G.sellItem(id); if (r.err) return toast(r.err, true); sfx.coin(); closeZoom(); refresh(); },
    deal: () => openPhone('msg'),
    dealOk() { const r = G.acceptDeal(); if (r.err) return toast(r.err, true); sfx.win(); if (phoneOpen()) drawPhone(); else closeModal(); refresh(); },
    dealNo() { G.refuseDeal(); if (phoneOpen()) drawPhone(); else closeModal(); renderHud(); },
    eventInfo() { const ev = G.eventNow(); if (!ev) return; openModal({ title: ev.name, icon: has('ev-' + ev.id) ? 'ev-' + ev.id : ev.icon, center: true, body: `<p class="center">${ev.desc}</p><p class="center muted">Encore ${mmss(G.eventLeft())}.</p><button class="btn green wide" data-act="eventGo">J'y vais</button>` }); },
    eventGo() { const ev = G.eventNow(); closeModal(); if (!ev) return; questGo({ xp: 'balto', boost: 'balto', rig: 'rig', sale: 'shop' }[ev.id]); },
    freebetInfo() { openModal({ title: 'Pari gratuit', icon: 'ticket', center: true, body: `<p class="center">Tu as ${st().freebets.length} pari${st().freebets.length > 1 ? 's' : ''} gratuit${st().freebets.length > 1 ? 's' : ''} : ${st().freebets.map(n => eur(n)).join(', ')}.</p><p class="center muted">Au Royal, coche « Utiliser mon pari gratuit » sur ton ticket. La mise est offerte : si tu gagnes, tu touches le bénéfice.</p><button class="btn green wide" data-act="eventGoRoyal">Au Royal</button>` }); },
    eventGoRoyal() { closeModal(); questGo('balto'); },
    scratchGo() { questGo('scratch'); },
    soundToggle() { st().sound = !st().sound; G.save(); setBody(settingsBody()); },
    setToggle(el) { const k = el.dataset.k, s = st(); if (k === 'vibrate' || k === 'music') s[k] = s[k] === false; else s[k] = !s[k]; if (k === 'music' && window.AUDIO) AUDIO.music(s.music !== false); document.body.classList.toggle('calm', !!s.calm); G.save(); setBody(settingsBody()); },
    tipNext() { nextTip(); },
    leaveTest() { location.replace(location.href.split('#')[0]); setTimeout(() => location.reload(), 50); },
    setName() { const n = prompt('Ton nouveau pseudo :', st().name || ''); if (n && n.trim()) { st().name = n.trim().slice(0, 16); G.save(); renderHud(); setBody(settingsBody()); toast('Pseudo changé !'); } },
    saveExport() { G.save(); const code = 'HC1.' + btoa(unescape(encodeURIComponent(localStorage.getItem('hustleCity.v1') || JSON.stringify(st()))));
      try { navigator.clipboard.writeText(code); toast('Code de sauvegarde copié : garde-le précieusement.'); } catch (e) { prompt('Copie ce code :', code); } },
    saveImport() { const c = prompt('Colle ton code de sauvegarde :'); if (!c) return;
      try { const j = JSON.parse(decodeURIComponent(escape(atob(c.trim().replace(/^HC1\./, ''))))); if (!j || typeof j.cash !== 'number' || !j.skin) throw 0;
        if (!confirm(`Remplacer ta partie actuelle par celle-ci (niveau ${j.lvl}) ?`)) return; localStorage.setItem('hustleCity.v1', JSON.stringify(j)); location.reload(); }
      catch (e) { toast('Ce code ne marche pas.', true); } },
    async restoreCode() {   // code de partie (« HC1.… » copié sur l'ancienne adresse ou dans Réglages) collé à la main
      let c = ''; try { c = (await navigator.clipboard.readText() || '').trim(); } catch (e) {}
      if (!/^HC1\./.test(c)) c = (prompt('Colle ton code de partie :') || '').trim(); if (!c) return;
      try { const raw = decodeURIComponent(escape(atob(c.replace(/^HC1\./, '')))), j = JSON.parse(raw); if (!j || !j.skin) throw 0;
        localStorage.setItem('hustleCity.v1', raw); sessionStorage.setItem('hc-imported', String(j.lvl || 1)); location.reload(); }
      catch (e) { toast('Ce code ne marche pas : vérifie qu\'il commence par HC1.', true); } },
    installNow() { if (!installEvt) return; installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; closeModal(); }); },
    tutoToggle() { const s = st(); s.noTuto = !s.noTuto; if (s.noTuto) { s.tutoDone = true; if (window.TUTO && TUTO.active) TUTO.skip(); } else { s.bldTuto = {}; s.featTutoFix = 0; }   /* seuls les lieux pas encore atteints auront leur tuto */ G.save(); toast(s.noTuto ? 'Tutos coupés.' : 'Tutos remis : Momo t\'expliquera les prochains lieux.'); setBody(settingsBody()); },
    installHelp() { openInstall(); },
    legal() { openModal({ title: 'Conditions', icon: 'star', body: `<div class="card" style="font-size:13px;line-height:1.55"><b>Un jeu, rien que le jeu.</b> Les billets, lingots, cryptos, actions et objets n'existent que dans Hustle City : ils ne s'échangent pas contre de l'argent réel.<br><br><b>Tes données</b> : ta partie est enregistrée sur ton appareil. Rien n'est envoyé ailleurs tant que tu ne te connectes pas (bientôt).<br><br><b>Jeux d'argent</b> : les paris, casinos et tickets du jeu sont fictifs. Les vrais sont interdits aux mineurs. Besoin d'aide ? Joueurs Info Service : 09 74 75 13 13.</div>` }); },
    trading() { openCrypto(); },
    moodCoin(el) { closeModal(); setTimeout(() => openCrypto(el.dataset.id), 60); },
    flashSell() { const f = st().crypto.flash; if (!f) return; const c = G.coin(f.id), r = G.sellCrypto(f.id, 1); if (r.err) return toast(r.err, true); sfx.coin(); floatTxt(`+${eur(r.net)}`); toast(r.profit >= 0 ? `Vendu au bon moment : <b>${eur(r.profit)} de gagné</b> sur ${c.name}.` : `Vendu : ${eur(r.profit)} sur ${c.name}.`); refresh(); },
    traderClaim() { const r = G.claimTrader(); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 20); toast(`Défi du trader réussi : +${r.n} lingots !`); refresh(); },
    ordAdd(el) { const t = el.dataset.t, r = G.addOrder(cryptoSel, t, +el.dataset.p, t === 'buy' ? Math.min(50, Math.floor(st().cash)) : 0); if (r.err) return toast(r.err, true); sfx.tap(); toast('Ordre posé : ton PC s\'en occupe.'); refresh(); },
    ordCancel(el) { G.cancelOrder(cryptoSel, el.dataset.t); refresh(); },
    colTab(el) { colTab = el.dataset.id; setBody(boostersBody()); },
    boutique(el) { closeModal(); openBoutique(el && el.dataset && el.dataset.id || undefined); },
    valToggle(el) { const i = +el.dataset.i; valOpen.has(i) ? valOpen.delete(i) : valOpen.add(i); setBody(valuesBody()); },
    valPub() { publishLayout(); },
    admTest(el) { const t = TESTS[+el.dataset.i]; if (!t || !placing) return; const r = t[1](); toast(r || `${t[0]} : fait. Ça arrive dans quelques secondes si c'est une notification.`); refresh(); },
    valReset() { if (!confirm('Annuler tous tes changements de valeurs pas encore publiés ?')) return; try { localStorage.removeItem(VAL_KEY); } catch (e) {} location.reload(); },
    welcomeTest() { maybeWelcome(true); },
    promo(el) { openBoutique(el && el.dataset && el.dataset.id === 'vip' ? 'vip' : promoMode === 'ville' ? 'deco' : 'vip'); },
    agence() { if (window.AGENCE) AGENCE.open(); },
    bqBuy(el) { const r = G.shopBuy(el.dataset.id); if (r.err) return toast(r.err, true); sfx.coin(); toast(`${r.x.name} posé${/e$/.test(r.x.name.split(' ')[0]) ? 'e' : ''} dans ta ville !`); renderCity(); refresh(); },
    bqUse(el) { G.evUse(el.dataset.id); renderCity(); refresh(); },
    iapSoon() { toast('Les achats en vrai argent arriveront avec la version App Store et Google Play.'); },
    profile: () => openProfile(),
    setSkin(el) { const k = D.SKINS.find(x => x.id === el.dataset.id), own = skinsOwned(); if (!k || st().lvl < (k.lvl || 1)) return; if (k.iap && !own.includes(k.id)) { closeModal(); return openBoutique('vip'); }
      const cur = D.SKINS.find(x => x.id === st().skin) || {}, ag = st().agence;
      if (cur.g !== k.g && ag && ag.crew && ag.crew.length) {
        // changer de genre de look = reconversion PrivéFans : on prévient avant
        const toF = k.g === 'f', pend = Math.floor(window.AGENCE.pending()), price = own.includes(k.id) ? 0 : k.cost;
        return openModal({ title: 'Reconversion', icon: 'star', center: true, body: `<p class="center">${toF
          ? `Avec ce look, tu fermes ton <b>agence PrivéFans</b> : tes créatrices partent, et tu pourras lancer <b>ta propre page</b> de créatrice, en partant de zéro.`
          : `Avec ce look, tu fermes <b>ta page PrivéFans</b> : tes abonnés partent, et tu pourras monter <b>ton agence</b> et recruter des créatrices, en partant de zéro.`}</p>
          <div class="card center"><small>${pend >= 1 ? 'Tu encaisses tout de suite' : 'Rien en attente à encaisser'}</small>${pend >= 1 ? `<b>+${eur(pend)}</b>` : ''}</div>
          ${price ? `<p class="hint-line center">Le look coûte ${eur(price)}.</p>` : ''}
          <div class="grid2"><button class="btn" data-act="profile">Annuler</button><button class="btn green" data-act="skinSwitch" data-id="${k.id}">Je change</button></div>` });
      }
      if (!own.includes(k.id)) { if (!G.pay(k.cost)) return toast('Pas assez de cash pour ce look.', true); own.push(k.id); sfx.coin(); toast(`Nouveau look : ${k.name} !`); }
      st().skin = k.id; G.save(); setBody(profileBody()); renderHud(); },
    pfLook(el) {
      const k = el.dataset.k, id = el.dataset.id || null; if (k !== 'avatar' && k !== 'frame') return;
      if (id && !G.evOwned(id)) return;
      st()[k] = id; G.save(); sfx.tap(); setBody(profileBody()); renderHud();
    },
    adWatch() {
      const a = G.adState(); if (!a.left || a.wait) return;
      adShow();
    },
    adForcedEnd() { adClose(); nextPending(); setTimeout(noAdsNudge, 600); },
    noAdsGo() { $('#noads-nudge')?.classList.remove('on'); openBoutique('vip'); },
    noAdsHide() { $('#noads-nudge')?.classList.remove('on'); },
    adNoAds() { if ($('#ad-layer .ad-claim')) adClose(); else return toast('Attends la fin de la pub, puis tu pourras ouvrir la boutique.'); openBoutique('vip'); },
    adClaim() { const r = G.adReward(); adClose(); if (r.err) return toast(r.err, true); sfx.coin(); rain('confetti', 16); toast(`+${r.n} lingots, merci !`); renderHud(); refresh(); },
    adQuit() { adClose(); toast('Pub interrompue : pas de lingots cette fois.', true); },
    supportOpen() { openModal({ title: 'Support', icon: 'star', center: true, body: `<p class="hint-line">Explique ton souci : la réponse arrive dans ton téléphone, dans les messages.</p><textarea id="sup-txt" class="sup-txt" maxlength="2000" placeholder="Ton message…"></textarea><button class="btn green wide" data-act="supportSend">Envoyer</button>` }); },
    async supportSend() { const t = ($('#sup-txt') || {}).value || ''; if (t.trim().length < 5) return toast('Écris un peu plus, stp.', true);
      try { const r = await window.ONLINE.support(t); if (!r.ok) throw 0; closeModal(); toast('Message envoyé au support !'); } catch (e) { toast('Envoi impossible pour l\'instant, réessaie plus tard.', true); } },
    onlineCode() { openModal({ title: 'Code de récupération', icon: 'star', center: true, body: `<p class="hint-line">Garde ce code précieusement : sur un autre appareil, il te rend ta partie.</p><div class="card center sup-code">${esc(window.ONLINE.code())}</div><button class="btn blue wide" data-act="onlineCopy">Copier</button><h3 class="sec">Récupérer une partie</h3><input id="rec-code" class="sup-in" placeholder="Colle ton code ici"><button class="btn wide" data-act="onlineRestore">Récupérer</button><p class="hint-line center">Attention : la partie de cet appareil sera remplacée.</p>` }); },
    onlineCopy() { try { navigator.clipboard.writeText(window.ONLINE.code()); toast('Code copié !'); } catch (e) { toast('Copie impossible : recopie-le à la main.', true); } },
    async onlineRestore() { try { await window.ONLINE.restore(($('#rec-code') || {}).value || ''); } catch (e) { toast(e.message || 'Code inconnu.', true); } },
    skinSwitch(el) {
      const k = D.SKINS.find(x => x.id === el.dataset.id), own = skinsOwned(); if (!k || st().lvl < (k.lvl || 1)) return;
      if (!own.includes(k.id)) { if (!G.pay(k.cost)) return toast('Pas assez de cash pour ce look.', true); own.push(k.id); }
      const n = window.AGENCE.reconvert();
      st().skin = k.id; if (st().bldTuto) delete st().bldTuto.agence;   // Momo présentera le nouveau PrivéFans
      G.save(); sfx.coin(); if (n) floatTxt(`+${eur(n)}`);
      toast(k.g === 'f' ? 'Nouveau look ! Ta page PrivéFans t\'attend dans ton téléphone.' : 'Nouveau look ! Ton agence PrivéFans t\'attend dans ton téléphone.');
      openProfile(); renderHud();
    },
    settings: () => openSettings(),
    howto: () => openHowto(),
    tutoAgain() { closeModal(); setScene('city'); st().tutoStep = 0; window.TUTO.start(0); },
    resetAsk() { openModal({ title: 'Recommencer', center: true, body: '<p class="center">Tout ton argent, tes cryptos et tes objets seront effacés.</p><button class="btn red wide" data-act="resetGo">Tout effacer</button>' }); },
    resetGo() { G.reset(); location.reload(); },
    moodInfo() { const m = G.mood(), w = WEATHER[m.id] || WEATHER.calm; if (modalOpen()) return; openModal({ title: 'Météo du marché', center: true, body: `<div class="weather w-${m.id}"><span class="w-ic">${wxIc(m.id)}</span><div><b>${w[1]}</b><p>${w[2]}</p></div></div>${moodPick()}<p class="hint-line center">Elle change toutes les 20 minutes et fait bouger toutes les cryptos en même temps. Quand ça monte, tes cryptos prennent de la valeur ; quand ça baisse, elles en perdent.</p><button class="btn green wide" data-act="closeModal">Compris</button>` }); },
    mybets: () => window.BALTO.openMyBets(),
    kRefresh() { const r = G.kioskRefresh(); if (r.err) return toast(r.err, true); sfx.coin(); refresh(); },
    kTipL(el) { const r = G.buyTip(el.dataset.id, true); if (r.err) return toast(r.err, true); refresh(); },
    kTip(el) { const r = G.buyTip(el.dataset.id); if (r.err) return toast(r.err, true); refresh(); },
    kBooster() { const r = G.buyBoosterCash(); if (r.err) return toast(r.err, true); sfx.coin(); setBody(kioskBody()); renderHud(); },
    habits: () => openHabits(),
    phone: () => openPhone(),
    phoneHome() { phoneApp = 'home'; drawPhone(); },
    phoneClose: () => closePhone(),
    phoneClear() { st().notifs = []; drawPhone(); renderPhoneBtn(); },
    phoneNotif(el) { const n = notifs().find(x => String(x.id) === el.dataset.id); $('#ph-banner')?.classList.remove('show'); if (!n) return openPhone('notifs'); n.read = n.seen = true; renderPhoneBtn(); const go = { msg: 'msg', bets: 'bets', crypto: 'crypto', missions: 'missions', boosters: 'boosters', news: 'shopNews', bank: 'bank', rig: 'rig', gift: 'gift', six: 'six', cdm: 'cdm' }[n.app]; if (n.app === 'msg') { const name = n.thread || n.title; if (!chats()[name]) { const ct = D.DEALS.contacts.find(c => c.name === name); chatPush(name, (ct && ct.img) || 'guide', { from: 'them', txt: n.txt }); chats()[name].unread = 0; } return openChat(name); } closePhone(); phoneGo(go || n.app); },
    phoneApp(el) { const id = el.dataset.id; if (id === 'immo' || id === 'notifs' || id === 'msg') { phoneApp = id; drawPhone(); } else { closePhone(); phoneGo(id); } },
    chatOpen(el) { openChat(el.dataset.n); },
    chatAct(el) {
      const c = chats()[el.dataset.n], m = c && c.msgs[+el.dataset.i], a = m && m.acts[+el.dataset.k]; if (!a || m.done) return;
      m.done = a.label; c.msgs.push({ from: 'me', txt: a.label, t: Date.now() }); c.last = Date.now(); sfx.tap();
      // une réponse a toujours une suite visible : l'action, puis la réplique du contact
      if (a.act === 'dealOk' || a.act === 'dealNo') {
        const live = st().deal && m.offer && st().deal.id === m.offer.id;
        if (live) { a.act === 'dealOk' ? A.dealOk() : A.dealNo(); }
        const ok = a.act === 'dealOk' && live && !st().deal;
        setTimeout(() => chatPush(c.name, null, { from: 'them', txt: !live ? 'Trop tard, j\'ai trouvé quelqu\'un d\'autre.' : ok ? pick(['Marché conclu 🤝', 'Plaisir de faire affaire.', 'T\'as eu le flair.']) : a.act === 'dealNo' ? pick(['Ok, tant pis 🤷', 'Comme tu veux, la prochaine fois.', 'Dommage, c\'était une affaire.']) : 'Hmm, ça n\'a pas marché.' }), 700);
        return drawPhone();
      }
      if (a.act === 'bet') { closePhone(); return window.BALTO.openWithPick(a.m, a.p); }
      if (a.act === 'crypto') { closePhone(); setScene('appart'); return openCrypto(a.id); }
      if (a.act === 'shop') { closePhone(); return st().lvl >= 2 ? openShop('news', shopOfItem(a.id)) : toast('Le Comptoir ouvre au niveau 2.'); }
      if (a.act === 'ag' && window.AGENCE) { const r = AGENCE.choose(a.d, a.k); setTimeout(() => chatPush(c.name, null, { from: 'them', txt: r }), 900); refresh(); return drawPhone(); }
      setTimeout(() => chatPush(c.name, null, { from: 'them', txt: pick(['Tant pis pour toi 😏', 'Ok, comme tu veux.', 'Tu me remercieras pas alors !', 'Ça marche, la prochaine fois.']) }), 900);
      drawPhone();
    },
    clubGo() { const r = G.clubEnter(); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 24); toast('Tu es dans la place ! Touche les coins de la salle.'); refresh(); },
    clubVip() { const r = G.clubEnter(true); if (r.err) return toast(r.err, true); sfx.win(); toast('Quelques lingots, et le videur s\'écarte.'); refresh(); },
    clubZone(el) { const p = D.CLUB.spots.find(x => x.id === clubSel); if (!p) return toast('Touche d\'abord une zone.'); const k = +el.dataset.k * 2; p.w = Math.max(8, p.w + k); p.h = Math.max(6, p.h + k * .6); saveClubZones(); setBody(clubBody()); },
    clubSpot(el) {
      if (placing) return;
      const id = el.dataset.id; if (id === 'door') { closeModal(); return; }
      const r = G.clubDo(id); if (r.err) return toast(r.err, true);
      const msg = { dance: `Tu as mis le feu à la piste ! +${r.xp} XP`, dj: 'Le DJ passe ton son : la piste rapporte ×1,5.', bar: `Un cocktail au bar. +${r.xp} XP`,
        lounge: r.meet ? 'Tu as rencontré quelqu\'un qui a un plan pour toi… regarde tes messages.' : 'Bonne discussion, mais personne d\'intéressant ce soir.',
        vip: `Carré VIP ! +${r.xp} XP${r.lingots ? `, +${r.lingots} lingots` : ''}${r.meet ? ', et un contact te propose une affaire' : ''}.` }[id];
      if (id === 'dance' || id === 'vip') { sfx.win(); rain('confetti', 26); } else sfx.tap();
      if (r.xp) floatTxt(`+${r.xp} XP`); toast(msg); refresh();
    },
    habitStart(el) { const r = G.startHabit(el.dataset.id); if (r.err) return toast(r.err, true); refresh(); },
    habitQuit(el) { const r = G.quitHabit(el.dataset.id); if (r.err) return toast(r.err, true); refresh(); }
  };
  function rigDone(r, el) {
    sfx.coin(); floatTxt(`+${eur(r.eur)}`);
    if (r.mode === 'sell') flyTo(el, '#pill-cash');
    refresh();
  }
  function sellCoin(frac) { const c = G.coin(cryptoSel), r = G.sellCrypto(cryptoSel, frac); if (r.err) return toast(r.err, true); sfx.coin(); floatTxt(`+${eur(r.net)}`); toast(r.profit >= 0 ? `Vendu : tu récupères ${eur(r.net)}, soit <b>${eur(r.profit)} de gagné</b> sur ${c.name}.` : `Vendu : tu récupères ${eur(r.net)}. Tu as <b>perdu ${eur(-r.profit)}</b> sur ${c.name}.`, r.profit < 0); refresh(); }
  function refresh() { renderHud(); if (modalRefresh) modalRefresh(); if (scene === 'appart') renderAppart(); }
  function register(acts) { Object.assign(A, acts); }

  document.addEventListener('click', e => {
    const tab = e.target.closest('#modal .tab');
    if (tab && !tab.disabled) { const id = tab.dataset.tab; document.querySelectorAll('#modal .tab').forEach(t => t.classList.toggle('on', t === tab)); if (tabHandler) tabHandler(id); return; }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = A[el.dataset.act]; if (fn) fn(el, e);
  });

  // ------------------------------------------------------------ événements du jeu
  // montée de niveau : la grande fenêtre de Mama Kana (gains, nouveautés, ouvrir le booster offert)
  function showLevelUp(e) {
    sfx.level(); rain('confetti', 60);
    const un = unlocksAt(e.lvl), s = st();
    openModal({ title: 'Niveau supérieur !', icon: 'hdr-levelup', center: true, body: `<div class="levelup"><div class="rays">${skinPic(s.skin)}</div>
      <div class="lv-big stroke">NIVEAU ${e.lvl} !</div>
      <div class="gains"><span>${ic('cash')}+${short(e.cash, true)}</span><span>${ic('lingot')}+${e.lingots}</span><span>${packArt(true)}+1 booster</span></div>
      <p class="hint-line center">Mise max au Royal : <b>${G.betMax()}<i class="cur"></i></b></p>
      ${un.length ? `<div class="ul-title">Nouveautés débloquées</div><div class="unlocks">${un.map(unlockTile).join('')}</div>${un.some(u => u.how) ? `<ul class="ul-hows">${un.filter(u => u.how).map(u => `<li><b>${u.name}</b><span>${u.how}</span></li>`).join('')}</ul>` : ''}` : ''}
      <div class="grid2"><button class="btn purple" data-act="boosterOpen">Ouvrir le booster</button>${un.find(x => x.go) ? `<button class="btn green" data-act="lvlGo" data-id="${un.find(x => x.go).go}">Aller voir !</button>` : '<button class="btn green" data-act="closeModal">Trop bien !</button>'}</div></div>` });
  }
  // la partie a été ouverte dans un autre onglet : celui-ci s'arrête net pour ne rien écraser
  G.on('asleep', () => {
    if (document.getElementById('tab-lock')) return;
    const el = document.createElement('div'); el.id = 'tab-lock';
    el.innerHTML = `<div class="tl-box"><b>Ta partie est ouverte ailleurs</b><p>Hustle City tourne dans un autre onglet. Pour ne rien perdre, on joue dans un seul onglet à la fois : celui-ci est en pause.</p><button class="btn green wide">Jouer dans cet onglet</button></div>`;
    el.querySelector('button').onclick = () => location.reload();
    document.body.appendChild(el);
  });
  G.on('levelup', e => { queue(() => showLevelUp(e)); queue(maybeInterstitial); renderCity(); });
  // mini-événement : annoncé par Momo en bas de l'écran (rien ne cache le haut du jeu), la pastille reste en haut
  G.on('event', ev => { notify('missions', `⚡ ${ev.name} pendant ${Math.round(D.EVENTS.time / 60)} min`, ev.desc); });
  G.on('deal', d => {
    chatPush(d.name, d.img, { from: 'them', kind: 'deal', txt: d.line, offer: { id: d.id, type: d.type, price: d.price }, acts: [{ label: d.type === 'sell' ? 'J\'achète' : 'Je vends', act: 'dealOk' }, { label: 'Non merci', act: 'dealNo' }] });
    notify('msg', d.name, `${d.line} (${d.type === 'sell' ? 'il vend' : 'il rachète'} ${G.what(G.item(d.id))})`, null, false, d.name);
  });
  // un pote envoie un prono : on peut répondre « Je parie » et le Royal s'ouvre avec le pronostic déjà coché
  G.on('mineHot', h => notify('rig', `🌡️ Ta machine chauffe : ${h} %`, 'Elle tremble ! Refroidis-la avant 100 %, sinon ta récolte en prend un coup.'));
  G.on('mineBurnt', () => notify('rig', 'Ta machine a surchauffé', 'La récolte en prend un coup : la prochaine fois, refroidis-la avant 100 %.'));
  G.on('stockNews', n => { if ((G.bourse().hold[n.c.id] || 0) > 0) softNotify('missions', `${n.c.name} ${n.up ? '+' : ''}${n.pct} % d'un coup`, n.up ? 'Bons résultats : l\'action grimpe.' : 'Mauvaise nouvelle : l\'action chute.'); });
  G.on('tipResult', r => {
    const score = `${r.m.home} ${r.m.sh} – ${r.m.sa} ${r.m.away}`;
    const txt = r.right ? (r.followed ? pick([`Tu vois, je te l'avais dit ! ${score} 😎`, `Qui c'est le boss des pronos ? ${score}, comme prévu 💸`, `Je t'avais dit de me faire confiance ! ${score}`])
        : pick([`Je t'avais dit pourtant… ${score}. La prochaine fois tu m'écoutes 😏`, `${score}. T'aurais dû me suivre, frérot.`]))
      : (r.followed ? pick([`Désolé… je me suis complètement planté. ${score} 😬`, `Aïe, ${score}. Je te dois un café, désolé.`, `Pardon, mes sources m'ont trahi. ${score}…`])
        : pick([`Bon… ${score}, t'as bien fait de pas m'écouter 😅`, `${score}. Ok, cette fois t'avais mieux vu que moi.`]));
    chatPush(r.name, r.img, { from: 'them', txt }); notify('msg', r.name, txt, null, false, r.name);
  });
  G.on('friendTip', f => {
    const m = G.match(f.m); if (!m) return;
    const who = m.sport === 'foot' && f.pick === 1 ? 'un match nul' : `${f.pick === 0 ? m.home : m.away} gagne`;
    const txt = pick([`Crois-moi : ${who} sur ${m.home} – ${m.away}. J'ai mes sources.`, `Gros tuyau : ${who}. ${m.home} – ${m.away}, tu me remercieras.`, `Mise sur ${who.replace(' gagne', '')}, ${m.home} – ${m.away}. Je le sens trop.`]);
    chatPush(f.name, f.img, { from: 'them', txt, match: f.m, acts: [{ label: 'Je parie', act: 'bet', m: f.m, p: f.pick }, { label: 'Pas confiance', act: 'no' }] });
    notify('msg', f.name, txt, null, false, f.name);
  });
  G.on('cryptoTip', f => {
    const c = D.COINS.find(x => x.id === f.coin); if (!c) return;
    const txt = f.up ? pick([`Mon cousin bosse dans la crypto : ${c.name} va grimper d'ici ${f.min} min. Achète avant les autres.`, `Ça chuchote fort sur ${c.name} : ça va monter dans ${f.min} min. Moi j'en prends.`])
      : pick([`Sors ${de(c.name)} si t'en as : ça va chuter d'ici ${f.min} min, crois-moi.`, `Info de mon cousin : ${c.name} va dégringoler dans ${f.min} min. Vends avant.`]);
    chatPush(f.name, f.img, { from: 'them', txt, acts: [{ label: f.up ? 'J\'achète' : 'Je regarde', act: 'crypto', id: f.coin }, { label: 'Pas confiance', act: 'no' }] });
    notify('msg', f.name, txt, null, false, f.name);
  });
  G.on('flashSoon', f => notify('crypto', '🔔 Ton PC a repéré quelque chose', `${G.coin(f.id).name} va bouger d'un coup dans 1 min. Prépare-toi !`));
  G.on('flash', f => notify('crypto', `⚡ ${G.coin(f.id).name} ${f.up ? '+' : '−'}${Math.round((f.k - 1) * 100)} % d'un coup !`, f.up ? 'Si tu en as, c\'est le moment de vendre : ça va sûrement retomber.' : 'Ça plonge : ça pourrait remonter dans quelques minutes.'));
  G.on('coinNews', n => { if (st().crypto.hold[n.id] > 0) softNotify('crypto', `📰 ${n.src} (${n.rel.toLowerCase()})`, n.txt); });
  G.on('orderDone', ({ o, r }) => notify('crypto', '🤖 Ordre exécuté', r.err ? `Ton ordre sur ${G.coin(o.id).name} n'a pas pu passer : ${r.err}` : o.type === 'buy' ? `Ton PC a acheté du ${G.coin(o.id).name}.` : `Ton PC a tout vendu : ${r.profit >= 0 ? `+${short(r.profit)} de gagné` : `${short(r.profit)} de perdu`}.`));
  G.on('mood', m => { const w = WEATHER[m.id] || WEATHER.calm; softNotify('crypto', `Météo du marché : ${w[0]} ${w[1]}`, w[2]); });
  G.on('news', n => {
    if (n.smoke) {
      const t = n.txt.replace(/^🚬 Pause clope : un pote te glisse que /, '');
      const ct = G.contactFor('Karim');
      chatPush(ct.name, ct.img, { from: 'them', txt: `Entre nous : ${t}`, item: n.item, acts: [{ label: n.up ? 'J\'y vais' : 'Je regarde', act: 'shop', id: n.item }, { label: 'Merci', act: 'no' }] });
      return notify('msg', ct.name, `Entre nous : ${t}`, null, false, ct.name);
    }
    softNotify(n.txt.includes('effondre') ? 'crypto' : 'news', n.bad ? 'Ça baisse !' : 'Ça monte !', n.txt);
  });
  // Coupe des Morts : Momo l'annonce, les gros gains de points s'affichent, une notif si ton équipe se fait doubler
  G.on('cdmStart', () => { notify('cdm', '🎃 La Coupe des Morts a commencé', 'Zombies, Vampires, Démons ou Fantômes : choisis ton camp au Panneau et fais gagner ton équipe !');
    setTimeout(() => toast('🎃 La Coupe des Morts a commencé ! Choisis ton camp au Panneau, sur la place.', false, 'cdmGo'), 1500); });
  G.on('cdmPts', e => { if (e.n >= 10 && !document.hidden) floatTxt(`+${e.n} pts 🎃`); });
  G.on('cdmPassed', e => e.by && notify('cdm', '🎃 Ton équipe a besoin de toi', `Les ${e.by.name} passent devant ! Gagne des points pour que les ${e.me.name} repassent.`));
  G.on('cdmEnd', f => { const T = G.cdmTeam(G.cdmState().team); notify('cdm', '🏆 La Coupe des Morts est finie', `${f.place && T ? `Les ${T.name} finissent ${f.place}${f.place === 1 ? 're' : 'e'} ! ` : ''}Va chercher tes récompenses au Panneau, sur la place.`); renderCity(); });
  G.on('sixRemind', m => notify('six', '🏉 Pense à ton prono', `${m.home} – ${m.away} commence bientôt. C'est gratuit !`));
  G.on('sixResult', m => notify('six', m.ok ? '🏉 Bon prono !' : '🏉 Prono raté', `${m.home} ${m.sh} - ${m.sa} ${m.away}.${m.ok ? ` +${D.SIX.pts} points et +${D.SIX.lingotPerGood} lingot.` : ''} ${G.sixRank() ? ` Tu es ${G.sixRank()}e au classement.` : ''}`));
  G.on('sixEnd', f => notify('six', '🏆 Tournoi terminé', `${f.rank ? `Tu finis ${f.rank}${f.rank === 1 ? 'er' : 'e'} ! ` : ''}Va récupérer ta récompense au Panneau, sur la place.`));
  // trophée gagné : même fête que le passage de niveau (rayons, confettis), avec le trophée au centre
  // comment un trophée s'obtient (succès, mission, événement) : affiché quand on le gagne et quand on le regarde
  function trophyHow(it) {
    if (!it || it.cat !== 'trophy') return '';
    const a = it.ach && (D.ACHIEVEMENTS || []).find(x => x.id === it.ach); if (a) return `Succès « ${a.name} » : ${a.txt}`;
    const q = (D.QUESTS || []).find(x => x.trophy === it.id); if (q) return `Mission réussie : ${q.txt}.`;
    if (it.id === 't-cdm') return 'Tu as participé à la Coupe des Morts (Halloween).';
    return '';
  }
  function showTrophy(it) {
    sfx.level(); rain('confetti', 50);
    openModal({ title: 'Trophée gagné !', icon: 'trophy', center: true, body: `<div class="levelup trophy-pop"><div class="rays">${itemPic(it)}</div>
      <div class="lv-big stroke">${it.name.replace(/^Trophée\s*/, '').replace(/[«»]/g, '').trim()}</div>
      ${trophyHow(it) ? `<p class="trophy-how">${ico('icon-trophy', '🏆')} ${esc(trophyHow(it))}</p>` : ''}
      <p class="hint-line center">Il rejoint tes étagères, dans ton appart.</p>
      <button class="btn green wide" data-act="closeModal">Trop fort !</button></div>` });
  }
  G.on('achievement', a => queue(() => { sfx.win(); rain('confetti', 40);
    openModal({ title: 'Nouveau trophée !', icon: 'trophy', center: true, body: `<div class="levelup trophy-pop"><div class="rays">${has('ach-' + a.id) ? pic('ach-' + a.id) : `<span class="ach-emo">🏆</span>`}</div>
      <div class="lv-big stroke">${a.name}</div><p class="trophy-how">${ico('icon-trophy', '🏆')} Gagné en réussissant : ${esc(a.txt)}</p><div class="gains"><span>${ic('lingot')}+${a.lingots}</span></div>
      <button class="btn green wide" data-act="closeModal">Trop bien !</button></div>` }); }));
  G.on('achBulk', L => queue(() => dialog('Trophées', `Nouveaux <b>trophées</b> ! Tu viens d'en débloquer <b>${L.length}</b>, soit <b>+${L.reduce((t, a) => t + a.lingots, 0)} lingots</b>. Retrouve-les dans ton profil.`, 'Génial')));
  G.on('trophy', it => { if (it) queue(() => showTrophy(it)); });
  G.on('bailout', line => dialog('Coup de pouce', `${line}<br><b>+${D.BAILOUT.amount}<i class="cur"></i></b>`, 'Merci'));
  G.on('betResult', ({ b, offline }) => {
    const l = b.legs[0], what = b.legs.length > 1 ? `Combiné ×${b.legs.length}` : l.home ? `${l.home} – ${l.away}` : 'Ton pari';
    if (b.state === 'won') { if (!offline) { sfx.win(); rain('bill'); bump('#pill-cash'); } notify('bets', `Ticket gagnant : +${eur(b.gain)} !`, what, null, offline); }
    else notify('bets', 'Ticket perdu', `${what}. Le Royal encaisse.`, null, offline);
  });
  G.on('money', () => bump('#pill-cash'));
  G.on('quit', h => (() => dialog(h.auto ? 'Fini les nuits blanches' : 'Sevrage terminé', h.auto ? `${D.QUIT_H} h sans mettre les pieds au Club : ${ico('hab-' + h.id, h.icon)} ${h.name} n'est plus ton habitude. Plus de frais chaque jour, ta machine refroidit normalement.` : `Tu as arrêté : ${h.icon} ${h.name}. Ta santé remonte.`, 'Fier de moi'))());
  G.on('habitAuto', h => (() => dialog('Nouvelle habitude', `${ico('hab-' + h.id, h.icon)} <b>${h.name}</b> : ${h.auto.nights} soirées en ${h.auto.days} jours, tu ne peux plus t'en passer.<br><br><b class="up">＋</b> ${h.bonus}<br><b class="down">－</b> ${h.malus}<br><br>Pour t'en défaire : ${D.QUIT_H} h sans mettre les pieds au Club.`, 'Compris'))());

  // ------------------------------------------------------------ démarrage
  let lastSave = 0;
  // notifications « du quotidien » : machine pleine, cadeau et booster du jour
  function dailyNotifs() {
    const s = st(), ri = G.rigInfo(), hot = ri.hot;
    if (ri.ready && !s.rigNotified) { s.rigNotified = true; notify('rig', '⛏️ Ta récolte est prête', `Ton minage ${deC(G.coin(ri.run.id).name)} est fini. Viens voir ce qu'il y a dedans !`); }
    if (!ri.ready) s.rigNotified = false;
    if (!ri.idle && !ri.ready && !ri.burnt && ri.heat >= 80 && s.heatNotified !== ri.run.start) { s.heatNotified = ri.run.start; notify('rig', '🌡️ Ta machine chauffe', 'Elle est à plus de 80 %. Refroidis-la vite, sinon elle surchauffe.'); }
    const day = new Date().toDateString();
    if (s.notifDay !== day && s.tutoDone) {
      s.notifDay = day;
      if (G.dailyReady()) notify('gift', 'Ton cadeau du jour t\'attend', `Jour ${G.dailyDay()} de ta série. Ne la casse pas !`);
      if (G.boosterFree()) notify('boosters', 'Booster gratuit disponible', 'Ton booster du jour est prêt à être ouvert.');
    }
  }
  let lastParked = null, lastPn = null;
  function loop() {
    G.simulate(false); dailyNotifs();
    // le parking apparaît / disparaît de la ville selon qu'on a un véhicule
    { const pk = G.parkedCount() > 0; if (pk !== lastParked) { lastParked = pk; renderCity(); } }
    { const pn = G.panneau(); if (pn !== lastPn) { lastPn = pn; renderCity(); } }
    if (phoneOpen() && (phoneApp === 'home' || phoneApp === 'chat' || phoneApp === 'msg')) drawPhone();
    renderHud(); document.querySelectorAll('.pq-timer').forEach(e => { const v = sixTimer(); if (e.dataset.v !== v) { e.dataset.v = v; e.innerHTML = v; } });
    if (scene === 'appart' && !modalOpen() && !RP.on) renderAppart();
    if (modalRefresh && !document.activeElement?.matches('input')) { liveTick = true; try { modalRefresh(); } finally { liveTick = false; } }
    if (Date.now() - lastSave > 5000) { G.save(); lastSave = Date.now(); }
  }
  function hudBottom() { const h = $('#hud'); if (h) $('#app').style.setProperty('--hud-b', (h.getBoundingClientRect().bottom - appBox().top) + 'px'); }
  window.addEventListener('resize', hudBottom);
  function cleanChats() { const sk = st().skin; Object.keys(chats()).forEach(k => { const c = chats()[k]; if (sk && c.img && c.img.includes(sk + '-')) delete chats()[k]; }); }
  function boot2(first) {
    // images posées en dur dans game.html (bouton setup, booster) : même chemin que les autres, sinon elles cassent quand le jeu vient d'internet
    document.querySelectorAll('img[src^="assets/img/"]').forEach(i => { const m = i.getAttribute('src').match(/img\/(.+?)\.png/); if (m) i.src = src(m[1]); });
    cleanChats(); purgeOld();
    document.body.classList.toggle('calm', !!st().calm);
    if (G.TEST || (window.HC_DEV && /^#neuf/.test(location.hash))) $('#app').insertAdjacentHTML('afterbegin', '<div id="test-banner">' + (G.TEST ? 'PARTIE TEST' : 'PARTIE D\'ESSAI') + ' <button data-act="leaveTest">Quitter</button></div>');
    promoUi();
    hydrateIcons(); hudBottom(); setTimeout(hudBottom, 300);
    layoutMap(); renderCity(); focusTop(); renderHud(); placerMode(); roomPlacer();
    setInterval(loop, 1000);
    if (!st().tutoDone) setTimeout(() => window.TUTO.start(), 500);
    setTimeout(() => offerToday(), 30000);
  }
  // fin de l'écran de chargement : on attend les images du premier écran (la barre suit), puis on l'affiche
  function preload(html, then) {
    // un vrai chargement : tout ce qu'il faut pour jouer sans trou (ville, bâtiments, interface, ton perso, ton appart), polices comprises
    const s = st(), look = s.cityLook && s.cityLook !== 'base' ? '-' + s.cityLook : '', A = window.ASSETS || [];
    const want = n => /^(bld-|icon-|nav-|btn-|hdr-|app-|ui-|ic-promo|ic-shop|deco-|tip-|coin-|ev-)/.test(n) || ['bg-city', 'bg-city' + look, 'bg-accueil', 'booster-pack', 'card-back', 'guide', 'logo', 'phone-wall'].includes(n)
      || (s.skin && n.startsWith('skin-' + s.skin)) || (s.room != null && (n === `room-${((D.SKINS.find(k => k.id === s.skin) || {}).g || 'm')}-${s.room}` || n === 'room-' + s.room))   /* seulement TA chambre */ || /^(minerv|pcv|rig|pc)-/.test(n);
    const L = [...new Set([...(html.matchAll(/src="([^"]+)"/g))].map(m => m[1]).concat(A.filter(want).map(src)))];
    let n = 0; const tot = L.length + 1, one = () => { n++; if (window.HC_LOAD) window.HC_LOAD.set(n / tot, n, tot); };
    const fonts = (document.fonts && document.fonts.ready || Promise.resolve()).then(one);
    const all = Promise.all([fonts, ...L.map(u => new Promise(ok => { const i = new Image(); i.onload = i.onerror = () => { one(); ok(); }; i.src = u; }))]);
    Promise.race([all, new Promise(ok => setTimeout(ok, 25000))]).then(() => window.HC_LOAD ? window.HC_LOAD.done(then) : then());
  }
  // décor de l'accueil : la rue animée si elle existe, sinon la ville vue du ciel
  const startBg = el => { el.classList.toggle('acc', has('bg-accueil')); if (has('bg-accueil')) el.style.setProperty('--acc', `url("${src('bg-accueil')}")`);
    // même scène que l'écran de chargement (si une image de chargement existe), sinon la ville (adresse complète : la variable CSS est lue depuis css/)
    const sc = has('bg-city') ? new URL(src('bg-city'), document.baseURI).href : ''; if (sc) {   /* accueil : la ville (la scène du chargement passait derrière ton perso) */ el.style.setProperty('--sc', `url("${sc}")`); el.classList.add('has-scene'); }
    if (!el.querySelector(':scope > .st-fx')) el.insertAdjacentHTML('afterbegin', '<div class="st-fx"><i class="st-scene"></i><i class="st-rays"></i></div>'); };
  // déménagement : l'ancienne adresse (GitHub) envoie la partie vers le nouveau site, dans l'adresse (#import=…, jamais envoyée à un serveur)
  const NEW_SITE = 'https://hustle.lucidstudio.fr/';
  function movedAway() {
    if (!/github\.io$/.test(location.hostname)) return false;
    let code = '', me = null; try { const raw = localStorage.getItem('hustleCity.v1'); me = raw && JSON.parse(raw); if (me && me.skin) code = btoa(unescape(encodeURIComponent(raw))); else me = null; } catch (e) {}
    const el = $('#start'); el.className = 'first'; startBg(el);
    const href = NEW_SITE + (code ? '#import=' + code : '');
    const steps = [
      `<div class="mv-ic">📦</div><h2>Le jeu a déménagé !</h2><p>Hustle City a maintenant sa <b>propre adresse</b> :<br><b class="mv-url">hustle.lucidstudio.fr</b></p><p>C'est plus rapide, et ta partie y est <b>sauvegardée en ligne</b> : tu ne la perdras plus.</p>
       <button class="btn green" data-mv="1">Suivant</button>`,
      code ? `<div class="mv-ic">🎒</div><h2>Emmène ta partie</h2><div class="mv-me">${skinPic(me.skin)}<span><b>${esc(me.name || 'Toi')}</b><small>Niveau ${me.lvl || 1} · ${short(me.cash || 0)}</small></span></div>
       <ol class="mv-steps"><li>Appuie sur <b>« Emmener ma partie »</b>.</li><li>Le nouveau site s'ouvre <b>avec ta partie</b> dedans.</li><li>C'est tout ! À partir de maintenant, joue <b>uniquement</b> là-bas.</li></ol>
       <a class="btn green" href="${href}" data-copy="HC1.${code}">Emmener ma partie</a><p class="mv-note">Ton code de partie est aussi copié : si ta partie n'apparaît pas, colle-le sur le nouveau site (« J'ai déjà une partie »).</p>`
        : `<div class="mv-ic">🏙️</div><h2>Rendez-vous là-bas</h2><p>Aucune partie trouvée sur ce téléphone : tu commences directement sur le nouveau site.</p><a class="btn green" href="${href}">Y aller</a>`];
    const draw = k => { el.innerHTML = `<div class="logo">${has('logo') ? `<img src="${src('logo')}" alt="Hustle City">` : ''}</div><div class="mv-card">${steps[k]}<div class="mv-dots">${steps.map((_, i) => `<i class="${i === k ? 'on' : ''}"></i>`).join('')}</div></div><span></span>`;
      startBg(el); el.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => draw(+b.dataset.mv));
      el.querySelectorAll('[data-copy]').forEach(a => a.addEventListener('click', () => { try { navigator.clipboard.writeText(a.dataset.copy); } catch (e) {} })); };
    draw(0); return true;
  }
  // mettre le jeu sur l'écran d'accueil du téléphone (comme une appli) : Android propose son bouton « Installer », iPhone se fait à la main
  let installEvt = null; window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  const isStandalone = () => window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || !!window.Capacitor;
  function openInstall(arrived) {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), chromeIos = /CriOS/.test(navigator.userAgent);
    const steps = ios ? [`Touche <b class="mv-key">⬆︎ Partager</b> ${chromeIos ? 'en haut à droite' : 'en bas de l\'écran'}.`, 'Fais défiler et touche <b>« Sur l\'écran d\'accueil »</b>.', 'Touche <b>« Ajouter »</b> en haut à droite.']
      : ['Touche <b class="mv-key">⋮</b> en haut à droite de ton navigateur.', 'Touche <b>« Ajouter à l\'écran d\'accueil »</b> ou <b>« Installer l\'appli »</b>.', 'Confirme : l\'icône Hustle City apparaît avec tes applis.'];
    openModal({ title: arrived ? 'Ta partie est arrivée !' : 'Hustle City en appli', icon: 'star', center: true, body: `
      ${arrived ? `<p class="center hint-line">🎉 Tout est là, niveau ${arrived}. Dernière étape :</p>` : ''}
      <div class="inst-head">${has('logo') ? `<img src="${src('logo')}" alt="">` : ''}<b>Mets le jeu sur ton écran d'accueil</b><small>Il s'ouvrira en plein écran, comme une vraie appli, et ta partie sera toujours là.</small></div>
      ${installEvt ? '<div class="center"><button class="btn green" data-act="installNow">Installer Hustle City</button></div><p class="center hint-line">ou à la main :</p>' : ''}
      <ol class="mv-steps">${steps.map(x => `<li>${x}</li>`).join('')}</ol>
      <div class="center"><button class="btn" data-act="closeModal">${arrived ? 'Plus tard' : 'OK'}</button></div>` });
  }
  // arrivée sur le nouveau site avec une partie : on l'enregistre (après confirmation s'il y en a déjà une)
  function importFromHash() {
    const m = location.hash.match(/^#import=([A-Za-z0-9+/=]+)/); if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    try { const raw = decodeURIComponent(escape(atob(m[1]))), j = JSON.parse(raw); if (!j || !j.skin) return;
      const cur = localStorage.getItem('hustleCity.v1'), c = cur && JSON.parse(cur);
      if (c && c.skin && (c.lvl || 1) >= (j.lvl || 1) && !confirm(`Tu as déjà une partie ici (niveau ${c.lvl}). La remplacer par celle que tu ramènes (niveau ${j.lvl}) ?`)) return;
      localStorage.setItem('hustleCity.v1', raw); window.__imported = j.lvl || 1;
    } catch (e) {}
  }
  function boot() {
    if (movedAway()) return;
    importFromHash();
    try { const k = sessionStorage.getItem('hc-imported'); if (k) { sessionStorage.removeItem('hc-imported'); window.__imported = +k; } } catch (e) {}
    if (!has('icon-cash')) document.body.classList.add('no-cash-img');
    initPan();
    const report = G.load();
    if (!st().skin) return preload(D.SKINS.filter(k => !k.iap).map(k => skinPic(k.id)).join('') + (has('logo') ? `<img src="${src('logo')}">` : ''), startScreen);
    // écran d'accueil comme Mama Kana : le logo, ton perso, « Continuer »
    const el = $('#start'), s = st();
    const html = `<div class="st-top">${has('logo') ? `<img class="st-logo" src="${src('logo')}" alt="Hustle City">` : '<div class="logo"><div class="t1">HUSTLE</div><div class="t2">CITY</div></div>'}<span class="st-tag">Deviens riche. Facilement.*</span></div>
      <div class="st-hero">${skinPic(s.skin)}</div>
      <div class="st-bottom"><p class="st-hello"><span>Re, <b>${esc(s.name)}</b> ! Le quartier t'attend.</span></p><button class="btn green start-btn" id="st-go">Continuer</button>
      <p class="start-note">*ou pas. Réservé aux adultes</p></div>`;
    preload(html, () => { el.className = 'welcome'; el.innerHTML = html; startBg(el); welcomeGo(); if (window.__imported) $('#st-go').click(); });   // partie ramenée : on entre direct dans le jeu
    const welcomeGo = () => $('#st-go').onclick = () => {
      sfx.tap(); el.classList.add('gone'); setTimeout(() => el.remove(), 400);
      boot2(false);
      if (window.__imported) setTimeout(() => openInstall(window.__imported), 1200);
      if (report && (Math.abs(report.worthDiff) >= 1 || report.bets)) queue(() => openModal({ title: 'Pendant ton absence', icon: 'star', center: true, body: `<p class="center">Tu es parti ${mmss(report.away * 1000)}.</p><div class="card center"><div class="muted">Ton patrimoine a bougé de</div><div class="big ${report.worthDiff >= 0 ? 'up' : 'down'}">${report.worthDiff >= 0 ? '+' : ''}${eur(report.worthDiff)}</div>${report.bets ? `<p>${report.bets} pari(s) gagné(s) pendant ce temps.</p>` : ''}</div><button class="btn green wide" style="margin-top:10px" data-act="closeModal">OK</button>` }));
    };
  }
  document.addEventListener('input', e => { if (e.target.id === 'cr-amt') { crAmt = e.target.value; const l = $('#cr-amt-lbl'); if (l) l.innerHTML = eur(+crAmt || 0); } });
  window.addEventListener('beforeunload', () => G.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });

  window.UI = { unlocksAt: L => unlocksAt(L), de, chatPush, notify, habitsBody, focusBld, eur, short, pct, mmss, esc, pic, ic, ico, has, src, toast, floatTxt, rain, openModal, setBody, closeModal, register, refresh, sparkSvg, dialog, teamCrest, teamIdx, sfx, flyTo, queue, packArt, openBoosters, openRewards, get scene() { return scene; }, get pending() { return pending.length; } };
  let booted = false; const go = () => { if (!booted) { booted = true; boot(); } };
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => setTimeout(go, 0)); else setTimeout(go, 0);
})();
