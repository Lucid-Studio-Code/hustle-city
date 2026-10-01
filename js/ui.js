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
  const EMO = {
    cash: '💵', lingot: '🪙', gear: '⚙️', wallet: '💼', chart: '📈', dice: '🎲', ticket: '🎟️', trophy: '🏆', home: '🏠', city: '🏙️', lock: '🔒', check: '✅', star: '⭐', gift: '🎁',
    'bld-appart': '🏢', 'bld-balto': '🍺', 'bld-casino': '🎰', 'bld-shop': '🛍️', 'bld-club': '🎉', 'bld-kiosque': '📰', 'bld-bijou': '💍', 'bld-garage': '🏎️', 'bld-tour': '🏙️',
    pc: '🖥️', trading: '📈', bolt: '⚡', rig: '🧰', bed: '🛏️', foot: '⚽', basket: '🏀', tennis: '🎾', slot: '🎰', roulette: '🎡', scratch: '🎟️', guide: '🧢'
  };
  const ICON_FILE = { cash: 'icon-cash', lingot: 'icon-lingot', gear: 'icon-gear', trophy: 'icon-trophy', lock: 'icon-lock', check: 'icon-check', star: 'icon-star', gift: 'icon-gift', wallet: 'nav-wallet', ticket: 'nav-bets', home: 'nav-home', city: 'nav-city', trading: 'nav-trading', bolt: 'icon-bolt' };
  function has(name) { return IMG.has(name); }
  function src(name) { return `assets/img/${name}.png?v=${window.ASSET_V || 1}`; }
  function pic(name, emo, cls = '') { return `<span class="pic ${cls}">${has(name) ? `<img src="${src(name)}" alt="" draggable="false">` : `<span class="emo">${emo || EMO[name] || '❔'}</span>`}</span>`; }
  function ic(key) { const f = ICON_FILE[key] || key; return `<i class="ic">${has(f) ? `<img src="${src(f)}" alt="" draggable="false">` : `<span class="emo">${EMO[key] || '•'}</span>`}</i>`; }
  function hydrateIcons(root = document) { root.querySelectorAll('i.ic[data-icon]').forEach(el => { el.outerHTML = ic(el.dataset.icon); }); }
  function skinPic(id, bust) { const sk = D.SKINS.find(s => s.id === id) || D.SKINS[0]; const n = `skin-${sk.id}${bust ? '-bust' : ''}`; return pic(has(n) ? n : `skin-${sk.id}`, ['🧑🏽', '👩🏾', '🧑🏻', '👱🏽‍♀️', '😎', '👩🏼‍💼'][D.SKINS.indexOf(sk)]); }
  function itemPic(it) { return it.img ? (has(it.img) ? pic(it.img) : teamCrest(it.team[0], it.team[1])) : pic(`item-${it.id}`, D.ITEM_CATS[it.cat].icon); }
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
  const sfx = {
    tap: () => beep([660], .05, 'triangle', .05),
    coin: () => beep([988, 1319], .08, 'square', .035),
    win: () => beep([523, 659, 784, 1047], .08, 'triangle', .07),
    level: () => beep([523, 659, 784, 1047, 1319], .12, 'square', .04),
    err: () => beep([200, 150], .1, 'sawtooth', .04),
    goal: () => beep([784, 988, 1175, 1568], .09, 'square', .045)
  };

  // ------------------------------------------------------------ message de Momo, effets
  // même carte que Mama Kana : la tête du perso + le texte, au-dessus de la barre du bas ; un appui mène à l'action liée
  let toastT;
  function toast(msg, bad, act, id) {
    const t = $('#toast');
    t.innerHTML = `<span class="t-who">${pic('guide', '🧢')}</span><span class="t-txt">${msg}</span>`;
    t.classList.toggle('bad', !!bad);
    if (act) { t.dataset.act = act; if (id) t.dataset.id = id; else delete t.dataset.id; t.classList.add('tapme'); }
    else { delete t.dataset.act; delete t.dataset.id; t.classList.remove('tapme'); }
    if (bad) sfx.err();
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3600);
  }
  function floatTxt(txt, x, y, neg) {
    const r = $('#app').getBoundingClientRect(), el = document.createElement('div');
    el.className = 'float' + (neg ? ' neg' : ''); el.innerHTML = txt;
    el.style.left = ((x ?? r.left + r.width / 2) - r.left) + 'px'; el.style.top = ((y ?? r.top + r.height * .45) - r.top) + 'px';
    $('#fx').appendChild(el); setTimeout(() => el.remove(), 1400);
  }
  function rain(kind = 'bill', n = 26) {
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
    const r = $('#app').getBoundingClientRect(), a = fromEl.getBoundingClientRect(), b = to.getBoundingClientRect();
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
  function nextPending() { const f = pending.shift(); if (f) f(); }

  // ------------------------------------------------------------ fenêtres
  let modalClose = null, modalRefresh = null, tabHandler = null;
  function openModal({ title, icon, body, tabs, tab, full, center, onClose, refresh, onTab }) {
    const m = $('#modal');
    m.className = full ? 'full' : '';
    m.innerHTML = `<div class="sheet ${center ? 'center' : ''}">
      <div class="sheet-head">${icon ? ic(icon) : ''}<span>${title}</span><button class="sheet-close" data-act="closeModal" aria-label="Fermer">×</button></div>
      ${tabs ? `<div class="tabs">${tabs.map(t => `<button class="tab ${t.id === tab ? 'on' : ''}" data-tab="${t.id}" ${t.locked ? 'disabled' : ''}>${t.label}</button>`).join('')}</div>` : ''}
      <div class="sheet-body">${body}</div></div>`;
    modalClose = onClose || null; modalRefresh = refresh || null; tabHandler = onTab || null;
    m.onclick = e => { if (e.target === m) closeModal(); };
  }
  function setBody(html) { const b = $('#modal .sheet-body'); if (b) { const y = b.scrollTop; b.innerHTML = html; b.scrollTop = y; } }
  function closeModal() { if (G.tilted() && $('#modal .sheet-head')?.textContent.includes('Lucky Palace')) return toast(`🍺 Tilt : encore ${mmss(G.st.tiltUntil - Date.now())} à la table.`, true); const m = $('#modal'); m.className = 'hidden'; m.innerHTML = ''; const f = modalClose; modalClose = null; modalRefresh = null; tabHandler = null; if (f) f(); setTimeout(() => { if (!modalOpen()) nextPending(); }, 250); }
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
    $('#worth-v').innerHTML = short(G.worth());
    const av = s.avatar && D.SIX.shop.find(x => x.id === s.avatar), fr = s.frame && D.SIX.shop.find(x => x.id === s.frame);
    const avKey = (s.avatar || s.skin) + '|' + (s.frame || '');
    if ($('#avatar-img').dataset.k !== avKey) {
      $('#avatar-img').dataset.k = avKey;
      $('#avatar-img').innerHTML = av ? teamCrest('rugby', av.team) : s.skin ? skinPic(s.skin, true) : '';
      $('#avatar-img').classList.toggle('crest-av', !!av);
      const a = $('#hud .avatar'); a.classList.toggle('framed', !!fr); a.style.setProperty('--f1', fr ? fr.colors[0] : ''); a.style.setProperty('--f2', fr ? fr.colors[1] : ''); a.dataset.emo = fr ? fr.emo : '';
    }
    const m = G.mood(), col = { calm: '#9aa', bull: '#3ddc84', bear: '#ff8a3d', fomo: '#ff3cac', krach: '#ff2d2d' }[m.id];
    const wx = WEATHER[m.id] || WEATHER.calm; $('#mood').innerHTML = `<span class="mood-ic">${wx[0]}</span>${wx[1]}`; $('#mood').className = 'm-' + m.id; void col;
    $('#pill-lingots .plus').classList.toggle('ready', G.dailyReady());
    const open = s.bets.filter(b => b.state === 'open').length; const bb = $('#badge-bets'); bb.textContent = open; bb.classList.toggle('hidden', !open);
    const hot = G.rigInfo().hot; $('#badge-rig').classList.toggle('hidden', !(hot && scene === 'city'));
    const ub = $('#btn-upg'), canUp = !!G.upgradeReady(); ub.classList.toggle('glow', canUp); ub.querySelector('.badge').classList.toggle('hidden', !canUp);
    // boutons du côté droit (comme Mama Kana) : Récompenses, Booster, Cadeau
    const rw = G.questsReady() + G.chalReady();
    $('#trophy .badge').classList.toggle('hidden', !rw); $('#trophy .badge').textContent = rw;
    const nb = G.boosterCount(), bst = $('#btn-booster');
    bst.querySelector('.badge').classList.toggle('hidden', !nb); bst.querySelector('.badge').textContent = nb; bst.classList.toggle('glow', G.boosterFree());
    const gift = $('#btn-gift'), dr = G.dailyReady();
    gift.classList.toggle('glow', dr); gift.querySelector('.badge').classList.toggle('hidden', !dr);
    renderNextBtn();
    $('.six-badge')?.classList.toggle('hidden', !G.sixBadge());
    renderQuest(); renderBuffs(); renderDealBtn(); renderPhoneBtn();
    renderTicker();
  }

  // ------------------------------------------------------------ bouton « prochain achat » : l'image de la prochaine amélioration utile
  // on propose la moins chère entre la machine suivante et l'appart suivant ; Momo prévient quand on peut se la payer
  // ce qui fait avancer, hors « Matos » (qui a son propre bouton) : une carte pour finir une série, un objet qu'une rumeur fait monter
  function nextBuy() {
    const s = st(), L = [];
    if (G.catUnlocked('card')) {
      const se = D.SERIES.filter(x => !s.colClaimed[x.id] && G.seriesHave(x.id) > 0).sort((x, y) => (G.seriesCards(x.id).length - G.seriesHave(x.id)) - (G.seriesCards(y.id).length - G.seriesHave(y.id)))[0];
      const miss = se && G.seriesCards(se.id).filter(c => !(s.owned[c.id] || []).length && G.inStock(c.id)).sort((x, y) => G.buyPrice(x.id) - G.buyPrice(y.id))[0];
      if (miss) { const left = G.seriesCards(se.id).length - G.seriesHave(se.id);
        L.push({ kind: 'card', it: miss, name: G.what(miss, true), price: G.buyPrice(miss.id),
          why: `${left === 1 ? 'La dernière carte' : `Encore ${left} cartes`} pour finir « ${se.name} » : +${short(se.reward.cash)} à la clé.` }); }
    }
    if (s.lvl >= 2) {
      const n = s.market.news.find(x => x.up && Date.now() - x.t < 20 * 60000 && G.item(x.item) && G.catUnlocked(G.item(x.item).cat) && G.inStock(x.item) && !(s.owned[x.item] || []).length);
      if (n) { const it = G.item(n.item); L.push({ kind: 'rumor', it, name: G.what(it, true), price: G.buyPrice(it.id), why: 'Une rumeur la fait grimper : achète avant que ça monte encore.' }); }
    }
    if (!L.length) return null;
    const list = L.sort((a, b) => a.price - b.price);
    return list[Math.floor(Date.now() / 120000) % list.length];
  }
  let nextKey = '', nextWasReady = false, tipT = 0, tipLast = 0;
  function renderNextBtn() {
    const n = nextBuy(), btn = $('#btn-next'); if (!btn) return;
    btn.classList.toggle('hidden', !n || !st().tutoDone); if (!n) return;
    const ready = st().cash >= n.price, key = n.kind + (n.it ? n.it.id : '');
    if (key !== nextKey) { nextKey = key; nextWasReady = false; $('#next-tip')?.classList.remove('on'); btn.querySelector('.nx-pic').innerHTML = n.it ? itemPic(n.it) : packArt(true); }
    btn.querySelector('b').innerHTML = short(n.price);
    // il brille seulement quelques secondes, quand Momo lance sa bulle (pas en continu)
    btn.classList.toggle('glow', ready && $('#next-tip')?.classList.contains('on')); btn.querySelector('.badge').classList.toggle('hidden', !ready);
    // la bulle : dès que ça devient payable, puis toutes les 3 min tant que ce n'est pas acheté
    if (ready && !nextWasReady || ready && Date.now() - tipLast > 180000) showNextTip(n);
    nextWasReady = ready;
  }
  function showNextTip(n) {
    const t = $('#next-tip'); if (!t || modalOpen() || phoneOpen() || (window.TUTO && TUTO.active)) return;
    tipLast = Date.now();
    t.innerHTML = `<span class="t-who">${pic('guide', '🧢')}</span><span><b>Hé, achète ça, ça va t'aider !</b><small>${n.name} · ${n.why}</small></span>`;
    t.classList.add('on'); clearTimeout(tipT); tipT = setTimeout(() => t.classList.remove('on'), 6000);
  }
  function goNextBuy() {
    $('#next-tip')?.classList.remove('on');
    const n = nextBuy(); if (!n) return;
    if (n.it) {
      setScene('city'); focusBld('shop'); openShop(n.it.cat);
      // on descend jusqu'à la carte proposée et on la fait briller
      return setTimeout(() => { const c = $(`#modal [data-act=itBuy][data-id="${n.it.id}"]`)?.closest('.item-card'), b = $('#modal .sheet-body');
        if (c && b) { b.scrollTop = c.offsetTop - b.offsetTop - 60; c.classList.add('spot'); } }, 50);
    }
    return openRoom();
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
      : `<div class="card center"><b>Ton PC</b><p>Au maximum : ${fpc(G.fee())} de frais seulement.</p></div>`;
    return `<p class="hint-line">Ton matos. En vert : tu as de quoi te le payer.</p>${rig}${pcCard}${flat}`;
  }
  function openUpgrades() { openModal({ title: 'Matos', icon: 'star', full: true, body: upgradesBody(), refresh: () => setBody(upgradesBody()) }); }

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
    if (ev) chips.push(`<div class="buff ev-chip" data-act="eventInfo">${ic(ev.icon)}<span>${ev.short}<b>${mmss(G.eventLeft())}</b></span></div>`);
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
  const plaque = (b, locked) => `<span class="plaque" style="--sc:${(SIGN[b.id] || [])[0] || '#4fb3f0'}"><i class="pq-ic">${ic((SIGN[b.id] || [])[1] || 'star')}</i><b>${b.name}</b>${locked ? `<small>${ic('lock')}Niveau ${b.lvl}</small>` : ''}</span>`;
  function renderCity() {
    const s = st(), inner = $('#map-inner');
    const bg = has('bg-city') ? `<img class="bg" src="${src('bg-city')}" alt="" draggable="false">` : '<div class="bg-fallback"></div>';
    const cols = { appart: '#8ecae6', balto: '#2d6a4f', casino: '#9b5de5', shop: '#ffb703', bijou: '#e0aaff', garage: '#adb5bd', tour: '#90e0ef' };
    // enseigne : plaque de rue émaillée posée au-dessus du toit (ne recouvre jamais le bâtiment d'en dessous)
    inner.innerHTML = bg + D.BUILDINGS.map(b => {
      // arrêt de bus : dessiné dans le décor, on pose juste une zone à toucher et son enseigne
      if (b.spot) return `<button class="bld spot" data-act="bld" data-id="${b.id}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%">${plaque(b, false)}<span class="spot-zone"></span></button>`;
      const locked = s.lvl < b.lvl;
      const img = has('bld-' + b.id) ? pic('bld-' + b.id) : b.id === 'six' ? sixBoardArt() : `<span class="ph" style="background:${cols[b.id]}">${EMO['bld-' + b.id]}</span>`;
      return `<button class="bld ${locked ? 'locked' : ''}" data-act="bld" data-id="${b.id}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%">
        ${plaque(b, locked)}
        ${img}${b.id === 'six' ? '<span class="badge ok six-badge hidden">!</span>' : ''}
      </button>`;
    }).join('') + D.SIX.shop.filter(x => x.kind === 'deco' && G.evUsed(x.id)).map(x => `<span class="ev-deco" style="left:${x.x}%;top:${x.y}%;width:${x.w}%">${has('deco-' + x.id) ? pic('deco-' + x.id) : `<i>${x.emo}</i>`}</span>`).join('');
    hydrateIcons(inner);
  }
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
  function openBus() {
    const s = st();
    openModal({ title: 'Arrêt de bus', icon: 'city', body: `<p class="hint-line">Le bus t'emmène dans les autres quartiers de la ville. Ils ouvriront au fur et à mesure que tu montes en niveau.</p>` +
      D.EXT_PLACES.map(b => `<div class="row locked"><div style="width:64px;height:64px;flex:0 0 64px">${pic('bld-' + b.id, '🏙️')}</div>
        <div class="grow"><h4>${b.name}</h4><p>${b.tag}</p></div><span class="rw-tag">${ic('lock')}${s.lvl < b.lvl ? `Niveau ${b.lvl}` : 'Bientôt'}</span></div>`).join('') });
  }
  // ------------------------------------------------------------ mode placement (lien du jeu + #placer) : on fait glisser les bâtiments,
  // les positions s'affichent pour me les envoyer ; elles restent enregistrées sur ce téléphone pour voir le résultat
  let placing = false;
  function placerMode() {
    if (location.hash !== '#placer') return;
    placing = true;
    let saved = {}; try { saved = JSON.parse(localStorage.getItem('hustleCity.placer') || '{}'); } catch (e) {}
    D.BUILDINGS.forEach(b => { if (saved[b.id]) Object.assign(b, saved[b.id]); });
    renderCity();
    $('#app').insertAdjacentHTML('beforeend', '<div id="placer"><b>Placement</b><span id="pl-cur">Fais glisser un bâtiment</span><button class="btn green xs" id="pl-copy">Copier</button><button class="btn xs" id="pl-reset" aria-label="Remettre comme avant">↺</button><textarea id="placer-out" readonly></textarea></div>');
    const out = (b) => { $('#placer-out').value = D.BUILDINGS.map(b => `${b.name} : x ${b.x}, y ${b.y}`).join('\n'); if (b) $("#pl-cur").textContent = `${b.name.replace(/^(Le|La|Mon) /, "")} · x${b.x} y${b.y}`; };
    out();
    const save = () => { const o = {}; D.BUILDINGS.forEach(b => o[b.id] = { x: b.x, y: b.y }); try { localStorage.setItem('hustleCity.placer', JSON.stringify(o)); } catch (e) {} out(); };
    let cur = null;
    $('#map-inner').addEventListener('pointerdown', e => {
      const el = e.target.closest('.bld'); if (!el) return;
      const r = $('#map-inner').getBoundingClientRect(), b = D.BUILDINGS.find(x => x.id === el.dataset.id);
      cur = { el, b, dx: b.x - (e.clientX - r.left) / r.width * 100, dy: b.y - (e.clientY - r.top) / r.height * 100 };
      el.classList.add('dragging'); e.preventDefault();
    });
    window.addEventListener('pointermove', e => {
      if (!cur) return; const r = $('#map-inner').getBoundingClientRect();
      cur.b.x = Math.round(((e.clientX - r.left) / r.width * 100 + cur.dx) * 2) / 2; cur.b.y = Math.round(((e.clientY - r.top) / r.height * 100 + cur.dy) * 2) / 2;
      cur.el.style.left = cur.b.x + '%'; cur.el.style.top = cur.b.y + '%'; out(cur.b);
    });
    window.addEventListener('pointerup', () => { if (cur) { cur.el.classList.remove('dragging'); cur = null; save(); } });
    $('#pl-copy').onclick = () => { const t = $('#placer-out'); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Positions copiées : colle-les-moi dans la conversation.')).catch(() => { t.select(); toast('Sélectionné : copie le texte et envoie-le-moi.'); }); };
    $('#pl-reset').onclick = () => { try { localStorage.removeItem('hustleCity.placer'); } catch (e) {} location.reload(); };
  }
  // mode placement de la chambre : adresse du jeu + #placer-appart. On fait glisser le PC, la machine et les places des étagères.
  // on peut l'ouvrir de 3 façons : l'adresse avec #placer-appart, un changement d'adresse sans recharger, ou les Réglages
  window.addEventListener('hashchange', () => { if (location.hash === '#placer-appart') roomPlacer(true); else if (location.hash === '#placer') location.reload(); });
  function roomPlacer(force) {
    if (!force && location.hash !== '#placer-appart') return;
    if (RP.on || !st().skin) return;
    closeModal(); RP.on = true; RP.room = st().room; RP.L = roomLayout(RP.room); setScene('appart');
    $('#app').insertAdjacentHTML('beforeend', `<div id="rplacer" class="${RP.top ? 'top' : ''}"><div class="rp-row">${D.ROOMS.map((x, i) => `<button class="btn xs rp-room" data-i="${i}">${i + 1}</button>`).join('')}<span class="rp-sep"></span>
      <button class="btn xs" id="rp-minus">−</button><button class="btn xs" id="rp-plus">+</button><span class="rp-sep"></span>
      <button class="btn xs green" id="rp-copy">Copier</button><button class="btn xs red" id="rp-reset" aria-label="Remettre">↺</button><button class="btn xs" id="rp-move" aria-label="Déplacer la barre">⇅</button><button class="btn xs blue" id="rp-close">Fini</button></div>
      <span id="rp-cur"></span><textarea id="rp-out" readonly></textarea></div>`);
    const name = k => k === 'pc' ? 'PC' : k === 'rig' ? 'Machine' : 'Place ' + (+k.slice(4) + 1);
    const out = () => {
      const all = roomSaved(); all[RP.room] = RP.L; try { localStorage.setItem('hustleCity.roomPlacer', JSON.stringify(all)); } catch (e) {}
      $('#rp-out').value = D.ROOMS.map((x, i) => { const l = i === RP.room ? RP.L : roomLayout(i); return `Chambre ${i + 1} : pc ${l.pc.x},${l.pc.y},${l.pc.w} · machine ${l.rig.x},${l.rig.y},${l.rig.w} · étagère ${l.shelf.w}x${l.shelf.h} · places ${l.slots.map(p => p.join(',')).join(' ')}`; }).join('\n');
      const o = RP.sel.startsWith('slot') ? RP.L.slots[+RP.sel.slice(4)] : [RP.L[RP.sel].x, RP.L[RP.sel].y];
      $('#rp-cur').textContent = `Chambre ${RP.room + 1} · ${name(RP.sel)} · x${o[0]} y${o[1]} · fais glisser pour déplacer`;
      document.querySelectorAll('.rp-room').forEach(b => b.classList.toggle('green', +b.dataset.i === RP.room));
    };
    const redraw = () => { renderAppart(); out(); };
    RP.out = out; redraw();
    document.querySelectorAll('.rp-room').forEach(b => b.onclick = () => { RP.room = +b.dataset.i; RP.L = roomLayout(RP.room); RP.sel = 'pc'; redraw(); });
    const size = d => { if (RP.sel.startsWith('slot')) { RP.L.shelf.w = Math.max(2, Math.round((RP.L.shelf.w + d / 2) * 10) / 10); RP.L.shelf.h = Math.round(RP.L.shelf.w * .77 * 10) / 10; } else RP.L[RP.sel].w = Math.max(5, RP.L[RP.sel].w + d); redraw(); };
    $('#rp-minus').onclick = () => size(-1); $('#rp-plus').onclick = () => size(1);
    $('#rp-copy').onclick = () => { const t = $('#rp-out'); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Positions copiées : colle-les-moi dans la conversation.')).catch(() => { t.select(); }); };
    $('#rp-move').onclick = () => { RP.top = !RP.top; $('#rplacer').classList.toggle('top', RP.top); };
    $('#rp-close').onclick = () => { RP.on = false; RP.drag = null; $('#rplacer')?.remove(); if (location.hash === '#placer-appart') history.replaceState(null, '', location.pathname); renderAppart(); };
    $('#rp-reset').onclick = () => { const all = roomSaved(); delete all[RP.room]; try { localStorage.setItem('hustleCity.roomPlacer', JSON.stringify(all)); } catch (e) {} RP.L = roomLayout(RP.room); redraw(); };
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
  }
  // ------------------------------------------------------------ appart : chaque objet affiche une bulle qui dit ce qu'il fait
  // disposition d'une chambre : celle du jeu, ou celle réglée à la main (mode #placer-appart, gardée dans ce navigateur)
  const roomSaved = () => { try { return JSON.parse(localStorage.getItem('hustleCity.roomPlacer') || '{}'); } catch (e) { return {}; } };
  function roomLayout(i) {
    const base = D.ROOM_LAYOUT[i], sv = roomSaved()[i] || {};
    return { pc: Object.assign({}, base.pc, sv.pc), rig: Object.assign({}, base.rig, sv.rig), shelf: Object.assign({}, base.shelf, sv.shelf), slots: sv.slots || base.slots || D.SHELF_SLOTS.map(x => x.slice()) };
  }
  const RP = { on: false, room: 0, sel: 'pc', drag: null };
  function renderAppart() {
    const s = st(), R = RP.on ? RP.room : s.room, r = D.ROOMS[R], el = $('#scene-appart');
    const rig = G.rigInfo();
    const owned = []; Object.entries(s.owned).forEach(([id, a]) => { const it = G.item(id); if (!it.noBuy) a.forEach(() => owned.push(it)); });
    owned.sort((a, b) => G.sellPrice(b.id) - G.sellPrice(a.id));
    const sk = D.SKINS.find(k => k.id === s.skin) || D.SKINS[0], rb = has(`room-${sk.g}-${R}`) ? `room-${sk.g}-${R}` : 'room-' + R;
    const L = RP.on ? RP.L : roomLayout(R), rigImg = has('minerv-' + s.rig.lvl) ? 'minerv-' + s.rig.lvl : 'rig-' + s.rig.lvl, pcImg = has('pcv-' + G.pcLvl()) ? 'pcv-' + G.pcLvl() : 'pc-' + G.pcLvl();
    const place = o => `left:${o.x}%;top:${o.y}%;width:${o.w}%`;
    const shelf = L.slots.slice(0, r.slots).map(([x, y], i) => {
      const it = owned[i];
      if (RP.on) return `<span class="shelf-item rp-slot ${RP.sel === 'slot' + i ? 'sel' : ''}" data-rp="slot${i}" style="left:${x}%;top:${y}%;width:${L.shelf.w}%;height:${L.shelf.h}%">${it ? pic('item-' + it.id, D.ITEM_CATS[it.cat].icon) : `<em>${i + 1}</em>`}</span>`;
      return it ? `<button class="shelf-item" data-act="itemInfo" data-id="${it.id}" style="left:${x}%;top:${y}%;width:${L.shelf.w}%;height:${L.shelf.h}%">${pic('item-' + it.id, D.ITEM_CATS[it.cat].icon)}</button>` : '';
    }).join('');
    // bulle de la machine : ce qu'il y a dedans (en billets) et la chaleur ; on la vide d'un geste
    const rigBubble = rig.hot
      ? `<button class="obj-bubble hot" data-act="rigQuick"><span><b>Pleine, arrêtée !</b><small>Touche : +${short(rig.value)}</small></span></button>`
      : `<button class="obj-bubble" data-act="rigQuick"><i class="ring" style="--p:${Math.round(rig.pct * 100)}"></i><span><b>+${short(rig.value)}</b><small>S'arrête dans ${mmss(rig.left)}</small></span></button>`;
    // bulle du PC : ce que valent tes cryptos, gagné ou perdu
    const cv = G.cryptoValue(), cc = D.COINS.reduce((a, c) => a + (s.crypto.hold[c.id] > 0 ? s.crypto.cost[c.id] : 0), 0), diff = cv - cc;
    const pcBubble = cv >= .01
      ? `<button class="obj-bubble ${diff >= 0 ? 'up' : 'down'}" data-act="pc"><span><small>Tes cryptos</small><b>${short(cv)} <em>${diff >= 0 ? '▲' : '▼'} ${short(Math.abs(diff), true)}</em></b></span></button>`
      : `<button class="obj-bubble" data-act="pc"><span><small>Mon PC</small><b>Investir</b></span></button>`;
    const iv = owned.reduce((a, it) => a + G.sellPrice(it.id), 0);
    el.innerHTML = `
      <div class="room-stage">
        ${has(rb) ? `<img class="room-bg" src="${src(rb)}" alt="">` : `<div class="room-fallback r${s.room}"></div>`}
        ${shelf}
        ${owned.length ? `<button class="obj-bubble shelf-b" data-act="collectionInfo" style="left:16%;top:22%"><span><small>Ta collection</small><b>${short(iv)}</b></span></button>` : ''}
        <button class="room-obj ${RP.on && RP.sel === 'pc' ? 'rp-sel' : ''}" data-act="${RP.on ? 'noop' : 'pc'}" data-rp="pc" style="${place(L.pc)}">${pic(pcImg, EMO.pc)}</button>
        <div class="bubble-at" style="left:${L.pc.x - 6}%;top:${L.pc.y - L.pc.w * .42}%">${pcBubble}</div>
        ${has(rb + '-fg') ? `<img class="room-fg" src="${src(rb + '-fg')}" alt="">` : ''}
        <button class="room-obj ${rig.hot ? 'hot' : ''} ${RP.on && RP.sel === 'rig' ? 'rp-sel' : ''}" data-act="${RP.on ? 'noop' : 'rig'}" data-rp="rig" style="${place(L.rig)}">${pic(rigImg, EMO.rig)}</button>
        <div class="bubble-at rig-b" style="left:${L.rig.x + 9}%;top:${L.rig.y - L.rig.w * .95}%">${rigBubble}</div>
      </div>
      <div class="room-head">
        <div class="rt-row"><div class="room-title stroke">${r.name} · ${Math.min(owned.length, r.slots)}/${r.slots} places</div><button class="help-pin" data-act="roomHelp" aria-label="Comment ça marche ?">?</button></div>
      </div>`;
  }
  function openRoomHelp() {
    openModal({ title: 'Ton appart', icon: 'home', center: true, body: `
      <div class="help-row">${pic(has('minerv-' + st().rig.lvl) ? 'minerv-' + st().rig.lvl : 'rig-0', EMO.rig)}<div><b>La machine à crypto</b><p>Elle fabrique de l'argent toute seule, même quand tu n'es pas là. Elle chauffe et s'arrête au bout d'un moment : touche sa bulle pour encaisser, ça la relance.</p></div></div>
      <div class="help-row">${pic(has('pcv-' + G.pcLvl()) ? 'pcv-' + G.pcLvl() : 'pc-0', EMO.pc)}<div><b>Ton PC</b><p>Tu y achètes des cryptos : des monnaies dont le prix bouge tout le temps. Achète quand c'est bas, revends quand c'est haut. Si ça baisse, tu perds.</p></div></div>
      <div class="help-row"><span class="pic"><span class="emo">📱</span></span><div><b>Ton téléphone</b><p>Pour déménager (appli Appart'Immo), voir ta banque, tes paris et les messages de tes contacts.</p></div></div>
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
    const weather = `<div class="weather w-${m.id}" data-act="moodInfo"><span class="w-ic">${w[0]}</span><div><small>La météo du marché</small><b>${w[1]}</b><p>${w[2]} Change dans ${mmss(s.crypto.moodUntil - Date.now())}.</p></div></div>`;
    const ct = G.tipBought('crypto'), tipBox = ct ? `<div class="tip-banner">📰 <span><b>Ton tuyau du Kiosque</b>« ${esc(ct.txt)} »</span></div>` : '';
    if (cryptoView === 'list') {
      const cv = G.cryptoValue(), cc = D.COINS.reduce((a, c) => a + (s.crypto.hold[c.id] > 0 ? s.crypto.cost[c.id] : 0), 0);
      const list = D.COINS.map(k => {
        const lock = !G.coinUnlocked(k), hh = s.crypto.hist[k.id], p = s.crypto.prices[k.id], hv = G.holdValue(k.id);
        return `<button class="coin-card ${lock ? 'locked' : ''}" data-act="${lock ? 'noop' : 'coinSel'}" data-id="${k.id}">
          ${coinIco(k)}<div class="cc-mid"><b>${k.name}</b>${lock ? `<small>${ic('lock')}Niveau ${k.lvl}</small>` : riskTag(k)}
          ${hv >= .01 ? `<small class="cc-own">Tu en as pour <b>${short(hv)}</b> ${trend(hv, s.crypto.cost[k.id])}</small>` : ''}</div>
          ${lock ? '' : `<div class="cc-right">${sparkSvg(hh.slice(-60), 64, 26)}<small>${trend(p, hh[Math.max(0, hh.length - 60)])}<em>5 min</em></small></div>`}</button>`;
      }).join('');
      return `${weather}${tipBox}
        ${cv >= .01 ? `<div class="pf-card"><small>Tes cryptos valent</small><b>${short(cv)}</b><p>Tu y as mis ${short(cc)} : ${cv - cc >= 0 ? `<span class="up">+${short(cv - cc)} de gagné</span>` : `<span class="down">${short(cv - cc)} de perdu</span>`}</p></div>` : ''}
        <details class="howto-crypto" ${howOpen ? 'open' : ''}><summary>C'est quoi, une crypto ?</summary><p>Une monnaie sur Internet dont le prix change tout le temps. Tu achètes avec tes billets, puis tu revends plus tard. <b>Si le prix a monté, tu gagnes la différence. S'il a baissé, tu perds.</b> Personne ne sait à l'avance : c'est un pari.</p></details>
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
      ${weather}${tipBox}`;
  }

  // ------------------------------------------------------------ machine à crypto
  // il manque un peu de cash ? on complète avec des lingots (1 lingot = 20 billets)
  function mixBtn(price, act) {
    const s = st(), n = G.lingotsFor(price);
    if (!n || n > s.lingots) return '';
    return `<button class="btn gold wide" style="margin-top:6px" data-act="${act}">Compléter avec ${ic('lingot')}${n}</button><p class="hint-line center" style="margin:4px 0 0">Il te manque ${short(price - s.cash)} : 1 lingot vaut ${D.LINGOT.rate}<i class="cur"></i>.</p>`;
  }
  function openRig() {
    const body = () => {
      const s = st(), i = G.rigInfo(), nx = G.rigNext(), img = l => has('minerv-' + l) ? 'minerv-' + l : 'rig-' + l;
      const full = i.perHour * i.heatMs / 3600000;
      return `<div class="rig-top">${pic(img(s.rig.lvl), EMO.rig)}<div><b>${i.r.name}</b><small>Machine niveau ${s.rig.lvl + 1} / ${D.RIG.length}</small>
          <p>Elle fabrique de l'Axion (une crypto) toute seule, même quand tu n'es pas là. Elle rapporte environ <b>${short(i.perHour)} par heure</b>.</p></div></div>
        <div class="gauge"><div class="g-lbl"><span>💰 Dans la machine</span><b>${short(i.value)}</b></div><div class="g-bar cashbar"><i style="width:${Math.min(100, i.value / full * 100)}%"></i></div></div>
        <div class="gauge"><div class="g-lbl"><span>🌡️ Chaleur</span><b class="${i.hot ? 'down' : ''}">${i.hot ? 'Trop chaude : arrêtée' : `S'arrête dans ${mmss(i.left)}`}</b></div><div class="g-bar heat ${i.hot ? 'hot' : ''}"><i style="width:${Math.round(i.pct * 100)}%"></i></div></div>
        <button class="btn green wide big-act" data-act="rigCollect" data-mode="sell" ${i.value >= .01 ? '' : 'disabled'}>Encaisser ${short(i.value * (1 - G.fee()))}</button>
        <p class="hint-line center" style="margin-top:6px">L'argent va direct dans ta poche, et la machine refroidit puis repart.</p>
        ${nx ? `<h3 class="sec">Améliorer ta machine</h3><div class="card up-card"><div class="up-img">${pic(img(s.rig.lvl + 1), EMO.rig)}</div><div class="up-info"><b>${nx.nx.name}</b>
            <p><span class="up">×${nx.mult.toFixed(1).replace('.', ',')}</span> plus rapide : ≈ ${short(nx.perHour)} par heure, et elle tient ${nx.nx.heatMin} min avant de chauffer.</p>
            <p class="muted">${isFinite(nx.payback) ? `Remboursée en ≈ ${Math.max(1, Math.round(nx.payback))} h de minage (au prix actuel de l'Axion).` : ''}</p>
            <button class="btn ${s.cash >= nx.price ? 'green' : ''} wide" data-act="rigUp" ${s.cash >= nx.price ? '' : 'disabled'}>Améliorer · ${short(nx.price)}</button>
            ${mixBtn(nx.price, 'rigUpL')}</div></div>`
          : '<div class="explain center">Ta machine est au maximum. Respect.</div>'}`;
    };
    openModal({ title: 'Machine à crypto', icon: 'bolt', full: true, body: body(), refresh: () => setBody(body()) });
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
    { id: 'boosters', name: 'Boosters', img: 'app-boosters', emo: '🃏', bg: '#ff6fb5' },
    { id: 'binder', name: 'Classeur', img: 'app-binder', emo: '📒', bg: '#139c8c' },
    { id: 'settings', name: 'Réglages', img: 'app-settings', emo: '⚙️', bg: '#8d99a6' }
  ];
  const appIcon = (a, cls = '') => `<i class="ph-ic ${cls}" style="--bg:${a.bg}">${has(a.img) ? `<img src="${src(a.img)}" alt="">` : a.emo}</i>`;
  const EXTRA = { six: { name: 'Tournoi', emo: '🏉', bg: '#e63946', img: '' }, rig: { name: 'Ma machine', emo: '⚡', bg: '#ff8a3d', img: '' }, gift: { name: 'Cadeau', emo: '🎁', bg: '#e63946', img: 'icon-gift' }, news: { name: 'Actus', emo: '📰', bg: '#4fb3f0', img: '' } };
  const appOf = id => APPS.find(a => a.id === id) || Object.assign({ id }, EXTRA[id] || { name: 'Infos', emo: '🔔', bg: '#4fb3f0', img: '' });
  const notifs = () => (st().notifs = st().notifs || []);
  function notify(app, title, txt, act, quiet, thread, img) {
    const n = { id: Date.now() + Math.random(), t: Date.now(), app, title, txt, act, thread, img: img || (thread && chats()[thread] && chats()[thread].img), seen: false, read: false };
    notifs().unshift(n); if (notifs().length > 40) notifs().length = 40;
    renderPhoneBtn(true);
    if (!quiet && !phoneOpen()) banner(n);
  }
  const unseen = () => notifs().filter(n => !n.seen).length;
  function renderPhoneBtn(ping) {
    const b = $('#phone-btn'); if (!b) return;
    const n = unseen(), bd = b.querySelector('.badge');
    bd.textContent = n > 9 ? '9+' : n; bd.classList.toggle('hidden', !n);
    if (ping) { b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring'); beep([1175, 1568], .07, 'sine', .05); }
  }
  // petite notification qui glisse en haut de l'écran, comme sur un vrai téléphone
  function banner(n) {
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
  const chatUnread = () => Object.values(chats()).reduce((a, c) => a + c.unread, 0);
  function bubbleHtml(c, m, i) {
    if (m.from === 'me') return `<div class="bub out">${m.txt}</div>`;
    let extra = '';
    if (m.offer) { const it = G.item(m.offer.id); extra = `<div class="bub in offer"><span class="of-art">${itemPic(it)}</span><span><b>${G.what(it, true)}</b><small>${(f => m.offer.type === 'sell' ? `Il te ${f} vend` : `Il te ${f} rachète`)(/^la /.test(G.what(it)) ? 'la' : 'le')} <strong>${short(m.offer.price)}</strong> · cote ${short(st().market.prices[m.offer.id])}</small></span></div>`; }
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
    return `<div class="bub in">${txt}</div>${extra}${acts}`;
  }
  let phoneApp = 'home';
  const phoneOpen = () => !!$('#phone-layer.on');
  function appBadge(id) {
    const s = st();
    if (id === 'msg') return chatUnread();
    if (id === 'missions') return G.questsReady() + G.chalReady();
    if (id === 'boosters') return G.boosterCount();
    if (id === 'bets') return notifs().filter(n => n.app === 'bets' && !n.read).length;
    return 0;
  }
  function phoneBody() {
    const s = st(), sk = D.SKINS.find(k => k.id === s.skin) || D.SKINS[0], now = new Date();
    const hh = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const status = `<div class="ph-status"><b>${hh}</b><span>▂▄▆ 5G <i class="ph-batt"><i style="width:${60 + (now.getMinutes() % 35)}%"></i></i></span></div>`;
    const head = t => `${status}<div class="ph-bar"><button class="ph-back" data-act="phoneHome">‹</button><b>${t}</b><span></span></div>`;
    if (phoneApp === 'immo') {
      return head('Appart\'Immo') + `<div class="ph-scroll"><p class="ph-hint">Des annonces près de chez toi. Plus grand = plus de place pour exposer ta collection.</p>` +
        D.ROOMS.map((r, i) => { const img = has(`room-${sk.g}-${i}`) ? `room-${sk.g}-${i}` : 'room-' + i, mine = i === s.room, past = i < s.room, price = G.cost(r.cost);
          return `<div class="ph-ad ${mine ? 'mine' : ''}"><div class="ph-photo" style="background-image:url(${src(img)})">${mine ? '<span class="ph-tag">Chez toi</span>' : ''}</div>
            <div class="ph-ad-txt"><b>${r.name}</b><small>${r.desc}</small><small>📦 ${r.slots} places pour tes objets</small></div>
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
      ${recent.length ? `<div class="ph-stack">${recent.map(notifCard).join('')}<button class="ph-all" data-act="phoneApp" data-id="notifs">Toutes les notifications (${notifs().length})</button></div>` : `<button class="ph-all solo" data-act="phoneApp" data-id="notifs">🔔 Notifications</button>`}
      <div class="ph-apps">${APPS.map(a => { const n = appBadge(a.id); return `<button class="ph-app" data-act="phoneApp" data-id="${a.id}">${appIcon(a)}<span>${a.name}</span>${n ? `<em class="badge ok">${n > 9 ? '9+' : n}</em>` : ''}</button>`; }).join('')}</div></div>`;
  }
  function openChat(name) { const c = chats()[name]; if (!c) return openPhone('msg'); chatOpen = name; c.unread = 0; if (!phoneOpen()) openPhone('chat'); else { phoneApp = 'chat'; drawPhone(); } const sc = $('#phone-layer .ph-scroll'); if (sc) sc.scrollTop = sc.scrollHeight; }
  // redessine le téléphone en gardant la position de lecture (fil de discussion, listes)
  function drawPhone() { const p = $('#phone-layer .phone'); if (!p) return; const sc = p.querySelector('.ph-scroll'), y = sc ? sc.scrollTop : 0, same = p.dataset.view === phoneApp + (chatOpen || ''); p.innerHTML = phoneBody(); p.dataset.view = phoneApp + (chatOpen || ''); const n = p.querySelector('.ph-scroll'); if (n && same) n.scrollTop = y; }
  function openPhone(app) {
    let el = $('#phone-layer'); if (!el) { $('#app').insertAdjacentHTML('beforeend', '<div id="phone-layer"><div class="phone"></div></div>'); el = $('#phone-layer'); el.addEventListener('click', e => { if (e.target === el) closePhone(); }); }
    phoneApp = app || 'home'; notifs().forEach(n => n.seen = true); renderPhoneBtn(); $('#ph-banner')?.classList.remove('show');
    drawPhone(); el.classList.add('on'); sfx.tap();
  }
  function closePhone() { const el = $('#phone-layer'); if (el) el.classList.remove('on'); }
  function openRoom() { openPhone('immo'); }

  // ------------------------------------------------------------ habitudes (au Balto : fumer, boire ; au Club : sortir)
  function habitsBody(where) {
    const s = st();
    return `<p class="hint-line">Une habitude donne un vrai bonus… et un malus qui coûte chaque jour. Arrêter prend ${D.QUIT_H} h : pendant le sevrage, tu gardes le malus sans le bonus.</p>` +
      D.HABITS.filter(h => !where || h.where === where).map(h => {
        const state = G.habitState(h.id), lock = s.lvl < h.lvl, x = s.habits[h.id];
        return `<div class="card habit-card ${lock ? 'locked' : ''}">
          <div class="hstack" style="justify-content:space-between"><h4 style="font-size:18px">${h.icon} ${h.name}</h4>
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
  function clubBody() {
    const s = st(), wait = G.clubWait(), e = G.clubEntry();
    return `<div class="club-hero">${pic('bld-club', '🎉')}<p>Musique à fond, néons, et du beau monde. Une soirée fait monter ton XP… et on y rencontre des gens qui ont des plans.</p></div>
      <div class="card club-night"><h4>🎉 Une soirée</h4>
        <p><b class="up">＋</b> ${D.CLUB.xp(s.lvl)} XP · ${Math.round(D.CLUB.meet * 100)} % de chances de rencontrer un contact qui te propose un bon plan · parfois un carré VIP (+3 lingots)</p>
        <button class="btn green wide" data-act="clubGo" ${wait || s.cash < e ? 'disabled' : ''}>${wait ? `Le videur te reconnaît : reviens dans ${mmss(wait)}` : `Entrer · ${short(e)}`}</button>
        ${wait ? `<button class="btn gold wide" style="margin-top:8px" data-act="clubVip" ${s.lingots >= D.LINGOT.club && s.cash >= e ? '' : 'disabled'}><span>Entrer quand même · ${ic('lingot')}${D.LINGOT.club}</span></button>
          <p class="hint-line center" style="margin-top:4px">Les lingots convainquent le videur. L'entrée (${short(e)}) reste à payer.</p>` : ''}</div>
      <h3 class="sec">Ton habitude</h3>${habitsBody('club')}`;
  }
  function openClub() { openModal({ title: 'Le Club', icon: 'bld-club', full: true, body: clubBody(), refresh: () => setBody(clubBody()) }); }

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
    const leftMs = G.editionLeft(), ED = D.KIOSK.editionMin * 60000, rel = Math.round(D.KIOSK.sportReliability * 10);
    return `<div class="kiosk-hero">
        <div class="kh-row"><div class="kh-clock"><span class="kh-ic">📰</span><div class="grow"><small>Prochain journal</small><b>${mmss(leftMs)}</b><div class="kh-bar"><i style="width:${Math.round((1 - leftMs / ED) * 100)}%"></i></div></div></div>
          <button class="btn gold sm kh-now" data-act="kRefresh" ${s.lingots >= D.LINGOT.kiosk ? '' : 'disabled'}><span>Tout de suite</span><span>${ic('lingot')}${D.LINGOT.kiosk}</span></button></div>
        <div class="pe-story"><div class="pe-box buy"><small>1. Tu achètes</small><b>📰</b><small>le tuyau</small></div><span class="pe-arr">→</span>
          <div class="pe-box mid"><small>2. Tu mises</small><b>⚽</b><small>dans son sens</small></div><span class="pe-arr">→</span>
          <div class="pe-box sell"><small>3. Tu gagnes</small><b>💰</b><small>plus souvent</small></div></div>
        <small class="pe-foot">Juste environ ${rel} fois sur 10 : ne mise pas tout.</small></div>` +
      D.KIOSK.tips.map(t => {
        const b = G.tipBought(t.id), lock = s.lvl < (t.lvl || 1);
        return `<div class="card tip-card ${lock ? 'locked' : ''}"><div class="tc-head"><h4>${t.icon} ${t.name}</h4>${b ? '<span class="rtag win">Lu</span>' : ''}</div>
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
  let sixTab = 'pronos';
  const fDay = t => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const fHour = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  function untilTxt(ms) { const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24; return d >= 1 ? `${d} j ${h} h` : mmss(ms); }
  function sixBody() {
    const s = st(), S = D.SIX, ph = G.sixPhase(), ms = G.sixMatches(), pts = G.sixPoints(), rank = G.sixRank(), n = S.rivals.length + 1;
    const next = ms.find(m => m.state === 'soon');
    const head = `<div class="six-hero"><div class="sh-top">${sixBoardArt()}<div><b>${S.name}</b><small>${ph === 'before' ? `Coup d'envoi le ${fDay(G.sixKick(0))} · dans <strong>${untilTxt(G.sixKick(0) - Date.now())}</strong>` : ph === 'on' ? `En cours · journée ${(next || ms[ms.length - 1]).day} / 5` : 'Tournoi terminé'}${G.sixTest() ? ' · <em>mode test</em>' : ''}</small></div></div>
      <div class="sh-chips"><span><small>Tes points</small><b>${pts}</b></span><span><small>Ta place</small><b>${rank}<sup>${rank === 1 ? 'er' : 'e'}</sup> / ${n}</b></span><span><small>Bons pronos</small><b>${ms.filter(m => m.ok).length} / ${ms.filter(m => m.state === 'done' && m.pick != null).length}</b></span></div></div>`;
    if (sixTab === 'board') {
      const rows = G.sixBoard(), me = rows.find(r => r.me), top = rows.slice(0, 10);
      const row = r => `<div class="sb-row ${r.me ? 'me' : ''}"><span class="sb-rk">${r.rank}</span><span class="sb-nm">${r.me ? `${esc(r.name)} (toi)` : esc(r.name)}</span><b>${r.pts} pts</b></div>`;
      const fin = G.sixState().final;
      return head + (fin && !fin.claimed ? `<div class="card center six-end"><b>Tournoi terminé : tu finis ${fin.rank}<sup>${fin.rank === 1 ? 'er' : 'e'}</sup> !</b><p>Ta récompense : ${chips(0, G.sixReward(fin.rank).lingots, G.sixReward(fin.rank).boosters ? `<span class="need">${packArt(true)}${G.sixReward(fin.rank).boosters}</span>` : '')}</p><button class="btn green wide" data-act="sixClaim">Récupérer</button></div>` : '') +
        `<h3 class="sec">Les équipes</h3><div class="six-board-list">${G.sixTable().map((t, k) => `<div class="sb-row"><span class="sb-rk">${k + 1}</span>${teamCrest('rugby', t.k, 'mini')}<span class="sb-nm">${t.name}</span><small class="muted">${t.j} m · ${t.diff >= 0 ? '+' : ''}${t.diff}</small><b>${t.pts} pts</b></div>`).join('')}</div>
        <p class="hint-line">4 points la victoire, 2 le nul, 1 point de bonus si on perd de 7 points ou moins.</p>
        <h3 class="sec">Les joueurs</h3><p class="hint-line">${S.pts} points par bon prono.</p><div class="six-board-list">${top.map(row).join('')}${top.includes(me) ? '' : `<div class="sb-gap">…</div>${row(me)}`}</div>
        <h3 class="sec">À la fin du tournoi</h3><div class="six-rew">${S.rewards.map((r, i) => `<div><small>${r.top === 1 ? '1<sup>er</sup>' : r.top === 999 ? 'Tous les autres' : `Top ${r.top}`}</small>${chips(0, r.lingots, r.boosters ? `<span class="need">${packArt(true)}${r.boosters}</span>` : '')}</div>`).join('')}</div>`;
    }
    if (sixTab === 'shop') {
      const closed = ph === 'over', price = x => x.lingots ? `${ic('lingot')}${x.lingots}` : short(x.cash);
      const can = x => x.lingots ? s.lingots >= x.lingots : s.cash >= x.cash;
      const art = x => x.kind === 'avatar' ? teamCrest('rugby', x.team) : x.kind === 'frame' ? `<span class="ev-frame" style="--f1:${x.colors[0]};--f2:${x.colors[1]}">${skinPic(s.skin, true)}<em>${x.emo}</em></span>` : has('deco-' + x.id) ? pic('deco-' + x.id) : `<span class="ev-emo">${x.emo}</span>`;
      const item = x => { const own = G.evOwned(x.id), used = G.evUsed(x.id);
        const btn = own ? `<button class="btn xs ${used ? '' : 'blue'}" data-act="evUse" data-id="${x.id}">${x.kind === 'deco' ? (used ? 'Ranger' : 'Poser en ville') : used ? 'Retirer' : 'Utiliser'}</button>`
          : closed ? '<button class="btn xs" disabled>Fermé</button>' : `<button class="btn xs ${x.lingots ? 'gold' : 'green'}" data-act="evBuy" data-id="${x.id}" ${can(x) ? '' : 'disabled'}>${price(x)}</button>`;
        return `<div class="card ev-item ${used ? 'used' : ''}"><div class="ev-art">${art(x)}</div><b>${x.name.replace(/^Photo : /, '')}</b>${own ? `<small class="up">${used ? '✓ Utilisé' : 'À toi'}</small>` : x.desc ? `<small class="muted">${x.desc}</small>` : ''}${btn}</div>`; };
      const grp = (k, t, sub) => `<h3 class="sec">${t} <small>· ${sub}</small></h3><div class="grid2 ev-grid">${S.shop.filter(x => x.kind === k).map(item).join('')}</div>`;
      return head + `<p class="hint-line">Des objets <b>exclusifs</b> du tournoi : tu les gardes pour toujours, mais on ne peut les acheter que pendant l'événement.${closed ? ' <b>La boutique est fermée.</b>' : ''}</p>` +
        grp('avatar', 'Photos de profil', 'l\'écusson de ton équipe') + grp('frame', 'Cadres', 'autour de ta photo') + grp('deco', 'Pour la ville', 'posés sur la carte');
    }
    if (sixTab === 'cards') {
      const cards = D.ITEMS.filter(i => i.event === 'six'), on = G.sixCardsOn();
      return head + `<p class="hint-line">Une série en <b>édition limitée</b> : ces cartes ne sortent des boosters que pendant le tournoi (environ 1 booster sur 3). Après, on ne peut plus en avoir : leur cote grimpe.</p>
        <div class="explain center">${on ? '🃏 En ce moment dans les boosters !' : ph === 'before' ? 'Dans les boosters dès le début du tournoi.' : 'Plus dans les boosters : seulement d\'occasion, au Comptoir.'}</div>
        <div class="grid2 six-cards">${cards.map(it => { const have = (s.owned[it.id] || []).length; return `<div class="card center ${have ? '' : 'missing'}">${itemPic(it)}<b>${it.name}</b><small class="muted">${have ? `Tu l'as · cote ${short(s.market.prices[it.id])}` : 'Pas encore'}</small></div>`; }).join('')}</div>
        ${on ? '<button class="btn green wide" data-act="boosters">Ouvrir mes boosters</button>' : ''}`;
    }
    // pronos, journée par journée
    const T = S.teams, lab = ['1', 'N', '2'];
    const card = m => {
      const btn = (p, txt) => `<button class="sx-pick ${m.pick === p ? 'on' : ''} ${m.state === 'done' && m.res === p ? 'win' : ''}" data-act="sixPick" data-i="${m.i}" data-p="${p}" ${m.state !== 'soon' ? 'disabled' : ''}>${txt}</button>`;
      const st2 = m.state === 'soon' ? `${fDay(m.kickoff)} · ${fHour(m.kickoff)}` : m.state === 'live' ? '<span class="live-dot">●</span> En direct' : 'Terminé';
      const res = m.state === 'done' ? (m.pick == null ? '<span class="sx-res">Pas de prono</span>' : m.ok ? `<span class="sx-res ok">✓ Bon prono : +${S.pts} pts, +${S.lingotPerGood} lingot</span>` : '<span class="sx-res ko">✗ Raté</span>') : m.state === 'soon' && m.pick == null ? '<span class="sx-res todo">À toi de jouer : choisis ton prono</span>' : '';
      const o = G.sixOdds(m.i), ru = G.sixRumor(m.i), form = t => `<span class="sx-form">${G.sixForm(t).map(x => `<i class="f${x}">${x}</i>`).join('')}</span>`;
      return `<div class="sx-match ${m.state}"><div class="sx-top"><small>${st2}</small>${res}</div>
        <div class="sx-teams"><span class="sx-t">${teamCrest('rugby', m.h, 'mini')}<span><b>${T[m.h][0]}</b>${form(m.h)}</span></span><span class="sx-score">${m.state === 'soon' ? 'vs' : `${m.sh} - ${m.sa}`}</span><span class="sx-t r"><span><b>${T[m.a][0]}</b>${form(m.a)}</span>${teamCrest('rugby', m.a, 'mini')}</span></div>
        <div class="sx-odds"><i style="width:${o[0] * 100}%"></i><i style="width:${o[1] * 100}%"></i><i style="width:${o[2] * 100}%"></i></div>
        <div class="sx-odds-l"><span>${Math.round(o[0] * 100)} %</span><span>Chances d'après les bookmakers</span><span>${Math.round(o[2] * 100)} %</span></div>
        ${ru && m.state === 'soon' ? `<p class="sx-rumor">🗞️ <b>Rumeur :</b> ${ru.txt} <em>Vrai ou faux ?</em></p>` : ''}
        <div class="sx-picks">${btn(0, shortTeam(T[m.h][0]))}${btn(1, 'Nul')}${btn(2, shortTeam(T[m.a][0]))}</div></div>`;
    };
    const cur = G.sixCurDay();
    const days = [1, 2, 3, 4, 5].map(d => {
      const L = ms.filter(m => m.day === d).sort((a, b) => a.kickoff - b.kickoff), open = G.sixDayOpen(d);
      if (!open) return `<h3 class="sec">Journée ${d} <small>· ${fDay(L[0].kickoff)}</small></h3><div class="sx-locked">🔒 S'ouvre quand la journée ${d - 1} est finie.<small>${L.map(m => `${T[m.h][0]} – ${T[m.a][0]}`).join('<br>')}</small></div>`;
      if (d === cur) return `<div class="sx-today"><div class="sx-today-h"><b>🏉 Journée ${d} · en cours</b><small>${fDay(L[0].kickoff)}</small></div>${L.map(card).join('')}</div>`;
      return `<h3 class="sec">Journée ${d} <small>· ${fDay(L[0].kickoff)}</small></h3>${L.map(card).join('')}`;
    }).join('');
    return head + `<p class="hint-line">Pronos <b>gratuits</b> : choisis le gagnant de chaque match avant le coup d'envoi. Bon prono = <b>${S.pts} points</b> et <b>+${S.lingotPerGood} lingot</b>. Regarde la <b>forme</b> des équipes (V = victoire, N = nul, D = défaite) et leurs chances. Les rumeurs sont vraies… une fois sur deux.</p>${days}`;
  }
  const shortTeam = n => n.split(' ')[0];
  function openSix(tab) {
    if (tab) sixTab = tab; else sixTab = 'pronos';
    G.sixSeenNow(); renderHud();
    setTimeout(() => { const d = $('#modal .sx-today'), b = $('#modal .sheet-body'); if (d && b) b.scrollTop = d.offsetTop - b.offsetTop - 8; }, 40);
    openModal({ title: D.SIX.name, icon: 'star', full: true, tabs: [{ id: 'pronos', label: 'Pronos' }, { id: 'board', label: 'Classement' }, { id: 'cards', label: 'Cartes' }, { id: 'shop', label: 'Boutique' }], tab: sixTab,
      body: sixBody(), onTab: id => { sixTab = id; setBody(sixBody()); }, refresh: () => setBody(sixBody()) });
  }

  // ------------------------------------------------------------ Le Comptoir (objets de collection)
  let shopTab = 'card';
  function openShop(tab) {
    if (tab) shopTab = tab;
    const tabs = Object.entries(D.ITEM_CATS).filter(([k, c]) => !c.noBuy).map(([k, c]) => ({ id: k, label: c.name, locked: !G.catUnlocked(k) }));
    tabs.push({ id: 'news', label: 'Actus' });
    if (tabs.find(t => t.id === shopTab)?.locked) shopTab = 'card';
    openModal({ title: 'Le Comptoir', icon: 'trophy', full: true, tabs, tab: shopTab, body: shopBody(), refresh: () => setBody(shopBody()), onTab: id => { shopTab = id; setBody(shopBody()); } });
  }
  function shopBody() {
    const s = st();
    if (shopTab === 'news') {
      // chaque rumeur avec l'objet concerné, sa cote, et de quoi agir tout de suite
      const n = s.market.news;
      return `<p class="hint-line">Les rumeurs font bouger les prix. <b>Ça monte ?</b> Achète vite. <b>Ça chute ?</b> Revends avant que ça baisse encore.</p>` +
        (n.length ? n.map(x => {
          const it = x.item && G.item(x.item); if (!it) return '';
          const mine = (s.owned[it.id] || []).length, h = s.market.hist[it.id];
          const canBuy = G.catUnlocked(it.cat);
          return `<div class="news-card ${x.up ? 'up' : 'down'}"><span class="nc-arrow">${x.up ? '▲' : '▼'}</span>
            <div class="nc-top"><span class="nc-pic">${itemPic(it)}</span><div class="nc-txt"><small>${x.tip ? 'Un pote t\'a prévenu' : x.up ? 'Ça monte' : 'Ça chute'} · ${ago(x.t)}</small><b>${esc(x.txt.replace(/^Pause clope : (.)/, (_, c) => c.toUpperCase()))}</b>
            <span class="nc-px">Prix du jour ${short(s.market.prices[it.id])} ${trend(s.market.prices[it.id], h[Math.max(0, h.length - 30)])}</span></div></div>
            <div class="nc-acts">${mine ? `<button class="btn red sm" data-act="itSell" data-id="${it.id}">Vendre ${short(G.sellPrice(it.id))}</button>`
              : canBuy && !G.inStock(it.id) ? '<span class="nc-note">Pas en rayon en ce moment</span>' : canBuy ? `<button class="btn green sm" data-act="itBuy" data-id="${it.id}" ${s.cash >= G.buyPrice(it.id) ? '' : 'disabled'}>Acheter ${short(G.buyPrice(it.id))}</button>` : '<span class="nc-note">Se trouve dans les boosters</span>'}</div></div>`;
        }).join('') : '<p class="hint-line center">Pas de rumeur pour l\'instant. Repasse plus tard.</p>');
    }
    const items = D.ITEMS.filter(i => i.cat === shopTab && (G.inStock(i.id) || (s.owned[i.id] || []).length)), mt = G.tipBought('market'), sale = G.evOn('sale');
    const card = it => {
      const h = s.market.hist[it.id], p = s.market.prices[it.id], mine = (s.owned[it.id] || []).length;
      return `<div class="card item-card"><span class="rtag r${it.r}">${{ C: 'Commun', R: 'Rare', E: 'Épique', L: 'Légendaire' }[it.r]}</span>
        ${itemPic(it)}<h4>${it.name}</h4><div class="price"><small>Cote</small>${short(p)}</div><div class="chg">${pct(p, h[0])} ${sparkSvg(h.slice(-40), 60, 18)}</div>
        <small class="muted own-line">${mine ? 'Tu l\'as' : 'Tu ne l\'as pas'}</small>
        <div class="hstack" style="width:100%">${mine ? `<button class="btn xs red" style="flex:1" data-act="itSell" data-id="${it.id}">Vendre ${short(G.sellPrice(it.id))}</button>`
          : `<button class="btn xs green" style="flex:1" data-act="itBuy" data-id="${it.id}" ${s.cash >= G.buyPrice(it.id) ? '' : 'disabled'}>Acheter ${short(G.buyPrice(it.id))}</button>`}</div></div>`;
    };
    // cartes : les grandes cartes, puis les cartes des boosters vendues d'occasion, série par série
    const grid = shopTab === 'card'
      ? `<h3 class="sec">Les grandes cartes</h3><div class="grid2">${items.filter(i => !i.noBuy).map(card).join('')}</div>` +
        D.SERIES.filter(se => se.id !== 'classics' && items.some(i => i.series === se.id)).map(se => `<h3 class="sec">${se.name} <small>· d'occasion</small></h3><div class="grid2">${items.filter(i => i.series === se.id).map(card).join('')}</div>`).join('')
      : `<div class="grid2">${items.map(card).join('')}</div>`;
    // comment on gagne : une petite histoire en 3 étapes, avec de vrais chiffres
    const buyEx = sale ? 89 : 105;
    return `${mt ? `<div class="tip-banner">📰 <span><b>Ton tuyau du Kiosque</b>« ${esc(mt.txt)} »</span></div>` : ''}
      <div class="price-explain"><small class="pe-title">Comment on gagne de l'argent ici ?</small>
        <div class="pe-story"><div class="pe-box buy"><small>1. Tu achètes</small><b>${buyEx}<i class="cur"></i></b></div><span class="pe-arr">→</span>
          <div class="pe-box mid"><small>2. Son prix monte</small><b>130<i class="cur"></i></b></div><span class="pe-arr">→</span>
          <div class="pe-box sell"><small>3. Tu revends</small><b>117<i class="cur"></i></b></div></div>
        <div class="pe-win">Gagné : <b>+${117 - buyEx}<i class="cur"></i></b></div>
        <small class="pe-foot">${sale ? '<b>Déstockage : −15 % à l\'achat en ce moment !</b> ' : ''}Le Comptoir garde une petite part à l'achat et à la revente : il faut que le prix monte pour être gagnant.</small></div>
      <div class="stock-chip">🚚 Nouvel arrivage dans <b>${mmss(G.stockLeft())}</b> : les rayons changent toutes les 30 min.</div>
      <div class="shelf-chip ${G.ownedCount() >= G.roomSlots() ? 'full' : ''}">🏠 Place chez toi : <b>${G.ownedCount()} / ${G.roomSlots()}</b>${G.ownedCount() >= G.roomSlots() ? ' · plein, déménage via ton téléphone' : ''}${shopTab === 'card' ? ' · les cartes vont dans ton classeur' : ''}</div>
      ${shopTab === 'card' ? `<button class="row col-link" data-act="collection" style="width:100%;text-align:left"><span class="cl-ic">${packArt(true)}</span><div class="grow"><h4>Mon classeur</h4><p>Toutes tes cartes, série par série.</p></div><span class="btn sm blue">Ouvrir</span></button>` : ''}
      ${grid}`;
  }
  function openItem(id) {
    const s = st(), it = G.item(id), a = s.owned[id] || [], h = s.market.hist[id];
    const paid = a.length ? a[0].paid : 0, sp = G.sellPrice(id), diff = sp - paid;
    openModal({ title: D.ITEM_CATS[it.cat].name, icon: 'trophy', center: true, body: `<div class="center">
      <div class="item-big">${itemPic(it)}</div><div class="big" style="font-size:20px">${it.name}</div>
      <span class="rtag r${it.r}">${{ C: 'Commun', R: 'Rare', E: 'Épique', L: 'Légendaire' }[it.r]}</span></div>
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
        <div class="hstack" style="justify-content:space-between"><b>💵 Cash</b><b>${eur(s.cash)}</b></div>${bar(s.cash, '#3ddc84')}
        <div class="hstack" style="justify-content:space-between;margin-top:8px"><b>🪙 Crypto</b><b>${eur(cv)}</b></div>${bar(cv, '#f7931a')}
        <div class="hstack" style="justify-content:space-between;margin-top:8px"><b>🏆 Objets</b><b>${eur(iv)}</b></div>${bar(iv, '#9b5de5')}
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
      body += `<p class="hint-line">3 défis par jour, renouvelés dans <b>${mmss(untilMidnight())}</b>. Chaque défi : <b>${G.chalCash()}<i class="cur"></i></b>. Les 3 réussis : <b>1 booster + 3 lingots</b> !</p>`;
      ch.list.forEach((c, i) => {
        const v = Math.min(c.goal, G.chalValue(c)), ready = !c.got && v >= c.goal;
        body += `<div class="row rw-row ${c.got ? 'owned' : ready ? 'focus ready' : 'open'}"><div class="art">${ic(c.got ? 'check' : 'star')}</div><div class="info">
          <h4>Défi ${i + 1}</h4><p class="rw-do">${c.t.replace('{n}', c.goal)}</p>
          ${c.got ? '' : `<div class="bar"><div style="width:${(v / c.goal * 100).toFixed(0)}%"></div><span>${v} / ${c.goal}</span></div>`}
          <p class="rw-get">Tu gagnes ${chips(G.chalCash(), 0)}</p></div>
          <div class="btns">${c.got ? `<span class="rw-tag ok">${ic('check')}Obtenu</span>` : ready ? `<button class="btn green" data-act="claimChal" data-id="${i}">Réclamer</button>` : ''}</div></div>`;
      });
      body += `<div class="chal-bonus ${ch.bonus ? 'got' : ''}">${packArt(true)}<div><b>Bonus des 3 défis</b><small>${ch.bonus ? 'Obtenu aujourd\'hui, bravo !' : `${nGot} / 3 défis réussis`}</small></div><span class="stroke">${ic('lingot')}3 + booster</span></div>`;
    } else if (rewardsTab === 'missions') {
      const got = G.questsClaimed();
      body += `<p class="hint-line">Missions réussies : <b>${got} / ${D.QUESTS.length}</b>. De nouvelles missions s'ouvrent en montant de niveau : fais-les dans l'ordre que tu veux !</p>`;
      const focus = G.questFocus();
      D.QUESTS.forEach((q, n) => {
        const qs = G.questState(q), lock = !qs.open, it = q.trophy ? G.item(q.trophy) : null;
        if (lock && q.lvl > s.lvl + 5) return;
        const state = lock ? 'locked' : qs.claimed ? 'owned' : qs.done ? 'focus ready' : focus === q ? 'focus' : 'open';
        const btn = lock ? `<span class="rw-tag">${ic('lock')}Niveau ${q.lvl}</span>` : qs.claimed ? `<span class="rw-tag ok">${ic('check')}Obtenue</span>` : qs.done ? `<button class="btn green" data-act="claimQuest" data-id="${q.id}">Réclamer</button>` : `<button class="btn blue rw-go" data-act="questGo" data-id="${q.id}">Y aller</button>`;
        body += `<div class="row rw-row ${state}"><div class="art">${ic(qs.claimed ? 'check' : lock ? 'lock' : 'trophy')}</div><div class="info">
          <h4>Mission ${n + 1}</h4><p class="rw-do">${q.txt}</p>
          ${!qs.claimed && !lock ? `<div class="bar"><div style="width:${Math.min(100, qs.v / q.n * 100).toFixed(0)}%"></div><span>${q.n >= 1000 ? `${short(qs.v, true)} / ${short(q.n, true)}` : `${qs.v} / ${q.n}`}</span></div>` : ''}
          <p class="rw-get">Tu gagnes ${chips(q.cash, q.lingots, it ? `<span class="need">${pic('item-' + it.id, '🏆', 'tiny')}${it.name.replace(/^Trophée /, '')}</span>` : '')}</p></div>
          <div class="btns">${btn}</div></div>`;
      });
      if (got >= D.QUESTS.length) body += '<p class="hint-line">Tu as terminé toutes les missions. Respect !</p>';
    } else {
      const need = G.xpNeed();
      body += '<p class="hint-line">Gagne de l\'XP en pariant, en tradant, en jouant et en collectionnant. À chaque niveau : des billets, des lingots, un booster et des nouveautés.</p>';
      for (let L = 2; L <= D.MAX_LVL; L++) {
        const r = D.LEVEL_REWARD(L), done = L <= s.lvl, next = L === s.lvl + 1, un = unlocksAt(L);
        const tag = done ? `<span class="rw-tag ok">${ic('check')}Obtenu</span>` : next ? '<span class="rw-tag next">Prochain</span>' : `<span class="rw-tag">${ic('lock')}À venir</span>`;
        body += `<div class="row rw-row rw-lvl ${done ? 'owned' : next ? 'focus' : 'locked'}"><div class="art"><span class="rw-lv stroke">${L}</span></div><div class="info">
          <h4>Niveau ${L}</h4>
          ${next ? `<p class="rw-do">Il te faut encore ${Math.max(0, need - s.xp)} XP</p><div class="bar"><div style="width:${Math.min(100, s.xp / need * 100).toFixed(0)}%"></div><span>${s.xp} / ${need} XP</span></div>` : ''}
          <p class="rw-get">Tu gagnes ${chips(r.cash, r.lingots, `<span class="need">${packArt(true)}1 booster</span>`)}</p>
          ${un.length ? `<div class="unlocks rw-unlocks">${un.map(unlockTile).join('')}</div>` : ''}</div>
          <div class="btns">${tag}</div></div>`;
      }
    }
    return body;
  }
  function openRewards(tab, scrollCur) {
    if (tab) rewardsTab = tab;
    else rewardsTab = G.questsReady() ? 'missions' : G.chalReady() ? 'defis' : rewardsTab;
    const labels = () => ({ defis: `Défis du jour${G.chalReady() ? ` <span class="tab-badge">${G.chalReady()}</span>` : ''}`, missions: `Missions${G.questsReady() ? ` <span class="tab-badge">${G.questsReady()}</span>` : ''}`, levels: 'Niveaux' });
    const tabs = Object.entries(labels()).map(([id, label]) => ({ id, label }));
    // les pastilles des onglets se mettent à jour dès qu'on réclame
    const retab = () => { const L = labels(); document.querySelectorAll('#modal .tab').forEach(t => { if (L[t.dataset.tab] != null && t.innerHTML !== L[t.dataset.tab]) t.innerHTML = L[t.dataset.tab]; }); };
    openModal({ title: 'Récompenses', icon: 'hdr-missions', full: true, tabs, tab: rewardsTab, body: rewardsBody(),
      onTab: id => { rewardsTab = id; setBody(rewardsBody()); scrollToCur(); }, refresh: () => { setBody(rewardsBody()); retab(); } });
    if (scrollCur !== false) scrollToCur();
  }
  function scrollToCur() { const c = $('#modal .rw-row.focus'), b = $('#modal .sheet-body'); if (c && b) b.scrollTop = c.offsetTop - b.offsetTop - 12; }

  // ce qui s'ouvre à un niveau (fenêtre Niveaux, montée de niveau)
  function unlocksAt(L) {
    const u = [];
    D.BUILDINGS.filter(b => b.lvl === L && !b.spot).forEach(b => u.push({ img: 'bld-' + b.id, name: b.name }));
    D.COINS.filter(c => c.lvl === L && L > 1).forEach(c => u.push({ html: coinIco(c), name: c.name }));
    Object.entries(D.SPORTS).filter(([, x]) => x.lvl === L && L > 1).forEach(([k, x]) => u.push({ html: teamCrest(k, 0), name: `Paris ${x.name.toLowerCase()}` }));
    Object.entries(D.ITEM_CATS).filter(([, c]) => c.lvl === L && L > 1).forEach(([k, c]) => u.push({ img: 'item-' + D.ITEMS.find(i => i.cat === k).id, name: c.name }));
    D.SKINS.filter(k => k.lvl === L && L > 1).forEach(k => u.push({ img: `skin-${k.id}-bust`, name: k.name }));
    if (L === D.ROULETTE.lvl) u.push({ emo: '🎡', name: 'Roulette' });
    if (L === D.COMBI_LVL) u.push({ emo: '🎟️', name: 'Paris combinés' });
    D.SCRATCH.filter(t => t.lvl === L && L > 1).forEach(t => u.push({ img: 'ticket-' + t.id, emo: '🎟️', name: t.name }));
    D.HABITS.filter(h => h.lvl === L).forEach(h => u.push({ emo: h.icon, name: h.name }));
    if (L === D.EVENTS.lvl) u.push({ emo: '⚡', name: 'Mini-événements' });
    if (L === D.DEALS.lvl) u.push({ img: 'guide', name: 'Bons plans' });
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
  let boosterTab = 'open';
  const RAR = { C: 'Commune', R: 'Rare', E: 'Épique', L: 'Légendaire' }, RSYM = { C: '●', R: '◆', E: '★', L: '✦' };
  function packArt(mini) { return mini ? `<i class="bst-mini">${has('booster-pack') ? `<img src="${src('booster-pack')}" alt="">` : '🃏'}</i>` : `<div class="bst-pack">${pic('booster-pack', '🃏')}<i class="bst-gloss"></i></div>`; }
  const CARD_ALL = D.ITEMS.filter(i => i.series);
  // carte façon jeu de cartes : une carte de collection (it) ou une carte récompense (c.kind)
  function tcgCard(c, extra = '') {
    let d;
    if (c.kind && c.kind !== 'col') {
      const art = { cash: ic('cash'), lingots: ic('lingot'), xp: ic('star'), ticket: pic('ticket-flash', '🎟️'), freebet: ic('ticket'), airdrop: coinIco(D.COINS[0]) }[c.kind];
      const stat = c.kind === 'cash' || c.kind === 'freebet' || c.kind === 'airdrop' ? `${short(c.n, true)}<i class="cur"></i>` : c.kind === 'xp' ? `+${c.n}` : `×${c.n}`;
      const txt = { cash: 'Direct dans ta poche.', lingots: 'De l\'or, direct dans ta réserve.', xp: 'Expérience gagnée tout de suite.', ticket: 'Deux Cash Flash offerts au Balto.',
        freebet: 'Une mise offerte au Balto : si tu gagnes, tu touches le bénéfice.', airdrop: 'Des Axion versés dans ton portefeuille crypto.' }[c.kind];
      d = { type: 'item', name: c.name, art: `<div class="tcg-sub ico">${art}</div>`, stat, ability: 'Récompense', text: txt, flav: 'Trouvé dans un booster du Kiosque.', rarity: c.rarity, label: 'Bonus' };
    } else {
      const it = G.item(c.id), se = D.SERIES.find(x => x.id === it.series), no = CARD_ALL.indexOf(it) + 1;
      const t = it.team ? D.TEAMS[it.team[0]][it.team[1]] : null;
      // cartes rares et plus : l'illustration remplit toute la carte, seuls le nom et la cote restent en bandeau
      if (it.r !== 'C' || it.series === 'classics') {
        const nm = it.name.replace(/^Carte /, '').replace(/^./, ch => ch.toUpperCase());
        const art = !it.img ? `<span class="fa-img">${pic('item-' + it.id, '🃏')}</span>` : it.team[0] === 'tennis' ? `<span class="fa-img fa-player"><img src="${src(it.img)}" alt=""></span>` : `<span class="fa-crest">${teamCrest(it.team[0], it.team[1])}</span>`;
        return `<div class="tcg full r${it.r} t-${it.series} ${extra}"><div class="tcg-card"><div class="fa-bg"></div>${art}
          <span class="fa-rar">${RSYM[it.r]}</span><span class="fa-no">${String(no).padStart(2, '0')}/${CARD_ALL.length}</span>
          <div class="fa-plate"><b class="${nm.length > 16 ? 'xl' : ''}">${nm}</b><small>${RAR[it.r]} · cote ${short(st().market.prices[it.id])}</small></div>
          <i class="tcg-holo"></i></div></div>`;
      }
      d = { type: it.series, name: it.name.replace(/^Carte /, '').replace(/^./, ch => ch.toUpperCase()), art: it.img ? `<div class="tcg-sub crest-art">${teamCrest(it.team[0], it.team[1])}</div>` : `<div class="tcg-sub item">${pic('item-' + it.id, '🃏')}</div>`,
        stat: t ? `${t[1]}` : '', ability: t ? (it.team[0] === 'tennis' ? 'Classement' : 'Force') : 'Collector', text: `Cote du jour : ${short(st().market.prices[it.id])}`, flav: se.name, rarity: it.r, label: se.sub, no };
    }
    return `<div class="tcg r${d.rarity} t-${d.type} ${extra}"><div class="tcg-card"><div class="tcg-in">
      <div class="tcg-top"><b class="tcg-name ${d.name.length > 16 ? 'xl' : d.name.length > 11 ? 'l' : ''}">${d.name}</b>${d.stat ? `<span class="tcg-stat">${d.stat}</span>` : ''}</div>
      <div class="tcg-art">${d.art}</div>
      <div class="tcg-line">${d.label}</div>
      <div class="tcg-txt"><b>${d.ability}</b><p>${d.text}</p></div>
      <div class="tcg-foot"><span class="tcg-rsym">${RSYM[d.rarity]}</span><span>${RAR[d.rarity]}</span><span class="tcg-no">${d.no ? `${String(d.no).padStart(2, '0')}/${CARD_ALL.length}` : 'Hustle City'}</span></div>
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
        <div class="bst-defis ${ready ? 'hot' : ''}"><div class="bd-ic">${ic('trophy')}</div><div class="bd-info"><b>Défis du jour · ${got}/3</b><small>${ch.bonus ? 'Booster du jour gagné ! Nouveaux défis demain.' : ready ? `${ready} défi${ready > 1 ? 's' : ''} à réclamer !` : 'Réussis les 3 défis : <b>1 booster + 3 lingots</b> offerts.'}</small>
          <div class="bd-dots">${ch.list.map(c => `<i class="bd-dot ${c.got ? 'got' : G.chalValue(c) >= c.goal ? 'ready' : ''}">${c.got ? '✓' : ''}</i>`).join('')}</div></div>
          <button class="btn ${ready ? 'green pulse' : ''}" data-act="goDefis">${ready ? 'Réclamer' : 'Voir'}</button></div>`;
    }
    const got = CARD_ALL.filter(c => (s.owned[c.id] || []).length).length;
    const val = CARD_ALL.reduce((a, c) => a + (s.owned[c.id] || []).length * G.sellPrice(c.id), 0);
    let body = `<div class="col-top"><div class="col-bar"><i style="width:${(got / CARD_ALL.length * 100).toFixed(1)}%"></i></div><b>${got} / ${CARD_ALL.length} cartes</b></div>
      <p class="hint-line">Ton classeur vaut <b>${short(val)}</b> à la revente. Touche une carte pour la voir en grand et la revendre. Complète une série pour une grosse récompense.</p>`;
    for (const se of D.SERIES) {
      const cards = G.seriesCards(se.id), have = G.seriesHave(se.id), done = G.seriesDone(se.id), claimed = s.colClaimed[se.id];
      body += `<div class="col-set"><div class="col-head"><b>${se.name}</b><small>${have}/${cards.length}</small></div>
        <div class="col-grid tcg-grid">${cards.map(c => { const n = (s.owned[c.id] || []).length; return n
          ? `<div class="col-slot" data-act="cardZoom" data-id="${c.id}">${tcgCard({ id: c.id }, 'mini')}${n > 1 ? `<i class="col-n">×${n}</i>` : ''}</div>`
          : `<div class="col-slot miss"><div class="tcg-back"><span>${String(CARD_ALL.indexOf(c) + 1).padStart(2, '0')}</span></div></div>`; }).join('')}</div>
        <div class="col-rew">Série complète : ${chips(se.reward.cash, se.reward.lingots)} ${claimed ? `<span class="rw-tag ok">${ic('check')}Obtenue</span>` : done ? `<button class="btn green" data-act="claimSeries" data-id="${se.id}">Réclamer</button>` : ''}</div></div>`;
    }
    return body;
  }
  function openBoosters(tab) {
    if (tab) boosterTab = tab;
    openModal({ title: 'Boosters', icon: 'booster-pack', full: true, tabs: [{ id: 'open', label: 'Boosters' }, { id: 'col', label: 'Classeur' }], tab: boosterTab, body: boostersBody(),
      onTab: id => { boosterTab = id; setBody(boostersBody()); }, refresh: () => { if (boosterTab === 'open') setBody(boostersBody()); } });
  }
  // carte en grand : on la penche avec le doigt, reflets holographiques ; on peut la revendre
  function cardZoom(id) {
    const n = (st().owned[id] || []).length; if (!n) return;
    let el = $('#cardzoom'); if (!el) { $('#app').insertAdjacentHTML('beforeend', '<div id="cardzoom"></div>'); el = $('#cardzoom'); }
    el.innerHTML = `<div class="cz-card">${tcgCard({ id })}</div><div class="cz-acts"><button class="btn red" data-act="czSell" data-id="${id}">Revendre ${short(G.sellPrice(id))}</button><button class="btn" data-act="czClose">Fermer</button></div><p class="cz-hint">${n > 1 ? `Tu l'as en ${n} exemplaires · ` : ''}penche la carte avec le doigt</p>`;
    el.className = 'on'; sfx.tap();
    const card = el.querySelector('.tcg');
    el.onpointermove = e => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `rotateY(${(x * 22).toFixed(1)}deg) rotateX(${(-y * 22).toFixed(1)}deg)`;
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
  function openDeal() {
    const d = st().deal; if (!d) return;
    const body = () => {
      const x = st().deal; if (!x) return '<p class="center">L\'offre a expiré.</p>';
      const it = G.item(x.id), cote = st().market.prices[x.id], diff = x.type === 'sell' ? (1 - x.price / cote) : (x.price / cote - 1);
      return `<div class="deal-top"><span class="deal-face">${pic(x.img, '🧑')}</span><div class="say"><b>${x.name}</b>« ${x.line} »</div></div>
        <div class="card deal-card center"><span class="rtag r${it.r}">${RAR[it.r]}</span><div class="deal-art">${itemPic(it)}</div><h4>${it.name}</h4>
          <div class="deal-prices"><div><small>Cote</small><b>${short(cote)}</b></div><div class="arrow">${x.type === 'sell' ? '→' : '→'}</div><div class="hot"><small>${x.type === 'sell' ? 'Il te le vend' : 'Il te le rachète'}</small><b>${short(x.price)}</b></div></div>
          <p class="deal-gain">${x.type === 'sell' ? `${Math.round(diff * 100)} % sous la cote` : `${Math.round(diff * 100)} % au-dessus de la cote (au Comptoir, tu aurais ${short(G.sellPrice(x.id))})`}</p>
          <p class="muted">L'offre expire dans <b>${mmss(x.end - Date.now())}</b></p></div>
        <div class="grid2"><button class="btn green" data-act="dealOk">${x.type === 'sell' ? `Acheter ${short(x.price)}` : `Vendre ${short(x.price)}`}</button><button class="btn" data-act="dealNo">Refuser</button></div>`;
    };
    openModal({ title: 'Bon plan', icon: 'star', center: true, body: body(), refresh: () => setBody(body()) });
  }
  function openProfile() {
    const s = st();
    openModal({ title: 'Profil', icon: 'star', full: true, body: `
      <div class="card prof-hero"><div class="ph">${skinPic(s.skin)}</div>
        <div><div class="big">${esc(s.name)}</div><p>Niveau ${s.lvl}</p><p>Patrimoine : <b>${eur(G.worth())}</b></p></div></div>
      <h3 class="sec">Ton style</h3>
      <div class="skin-grid">${D.SKINS.map(k => `<button class="card ${s.lvl < k.lvl ? 'locked' : ''} ${k.id === s.skin ? 'on' : ''}" data-act="${s.lvl < k.lvl ? 'noop' : 'setSkin'}" data-id="${k.id}">
        <div class="sp">${skinPic(k.id)}</div><b>${k.name}</b><small class="muted">${s.lvl < k.lvl ? `Niveau ${k.lvl}` : k.id === s.skin ? 'Porté' : 'Choisir'}</small></button>`).join('')}</div>
      <h3 class="sec">Tes stats</h3>
      <div class="card" style="font-size:14px;line-height:1.8">Paris : <b>${s.stats.bets || 0}</b> (gagnés : ${s.stats.betsWon || 0})<br>Tours de machine : <b>${s.stats.spins || 0}</b><br>Tickets grattés : <b>${s.stats.scratch || 0}</b><br>Parties de roulette : <b>${s.stats.roulette || 0}</b></div>` });
  }
  function openSettings() {
    openModal({ title: 'Réglages', icon: 'hdr-settings', center: true, body: `
      <div class="explain">${D.TIPS[Math.floor(Math.random() * D.TIPS.length)]}</div>
      <button class="btn ${st().sound ? 'green' : ''} wide set-sound" data-act="soundToggle">${ic(st().sound ? 'icon-sound' : 'icon-mute')}Son : ${st().sound ? 'activé' : 'coupé'}</button>
      <button class="btn blue wide" style="margin-top:8px" data-act="howto">Comment jouer</button>
      <button class="btn purple wide" style="margin-top:8px" data-act="tutoAgain">Revoir le tuto</button>
      <button class="btn blue wide" style="margin-top:8px" data-act="roomPlace">Placer les objets de la chambre</button>
      <button class="btn red wide" style="margin-top:8px" data-act="resetAsk">Recommencer à zéro</button>
      <p class="muted center" style="margin-top:10px">Hustle City est un jeu : l'argent du jeu est fictif : il ne s'achète pas et ne vaut rien en vrai. Les vrais jeux d'argent sont interdits aux mineurs.</p>` });
  }
  function openHowto() {
    openModal({ title: 'Comment jouer', icon: 'star', body: `<div class="card" style="font-size:13px;line-height:1.55">
      <b>Le but</b> : faire grimper ton patrimoine (cash + crypto + objets).<br><br>
      🏢 <b>Ton appart</b> : ton PC pour trader la crypto, ton rig qui mine de l'Axion (relance-le quand il surchauffe), et tes étagères où s'exposent tes objets.<br><br>
      🍺 <b>Le Balto</b> : paris sportifs (cotes réelles, le bookmaker garde 7 %) et tickets à gratter.<br><br>
      🎰 <b>Lucky Palace</b> : machine à sous et roulette européenne. Sur la durée, la maison gagne.<br><br>
      🛍️ <b>Le Comptoir</b> : cartes, sneakers, montres. Leur cote bouge toute la journée. Tes trophées aussi valent de l'argent.</div>` });
  }

  // ------------------------------------------------------------ accueil
  function startScreen() {
    const el = $('#start'); el.className = has('splash') ? 'splash' : '';
    const logo = has('logo') ? `<img src="${src('logo')}" alt="Hustle City">` : '<div class="t1">HUSTLE</div><div class="t2">CITY</div>';
    let sel = 'survet';
    const draw = () => {
      el.innerHTML = `<div class="logo">${logo}<div class="tagline">Deviens riche. Facilement.*<small>*ou pas</small></div></div>
        <div class="form">
          <div class="skins">${D.SKINS.map(k => `<button class="skin ${k.id === sel ? 'sel' : ''} ${k.lvl > 1 ? 'locked' : ''}" data-skin="${k.id}" ${k.lvl > 1 ? 'disabled' : ''}>${skinPic(k.id)}<b>${k.lvl > 1 ? `Niv. ${k.lvl}` : k.name}</b></button>`).join('')}</div>
          <input class="name" id="st-name" maxlength="16" placeholder="Ton blaze" value="${esc(st().name || '')}">
          <button class="btn green start-btn" id="st-go" style="min-height:62px;font-size:26px">C'est parti</button>
        </div>`;
      el.querySelectorAll('.skin').forEach(b => b.onclick = () => { sel = b.dataset.skin; const n = $('#st-name').value; draw(); $('#st-name').value = n; });
      $('#st-go').onclick = () => {
        const n = $('#st-name').value.trim();
        if (n.length < 3) return toast('Ton blaze : 3 lettres minimum.', true);
        st().name = n; st().skin = sel; G.save(); el.remove(); boot2(true);
      };
    };
    draw();
  }
  function intro() {
    const s = st();
    dialog('Ton cousin Momo', `Wesh ${esc(s.name)} ! Bienvenue à Hustle City. T'as 200<i class="cur"></i> en poche et un vieux PC. Commence par <b>ton appart</b> : relance le minage et achète un peu de crypto.`, 'Vas-y', () => {
      dialog('Ton cousin Momo', 'Et au <b>Balto</b>, en face, y a les paris sur le foot. Mais retiens : le patron gagne toujours plus que les clients.', 'Compris', () => { s.tutoDone = true; G.save(); });
    });
  }

  // ouvrir une appli du téléphone qui a sa propre fenêtre
  function phoneGo(id) {
    if (id === 'bank') return openWallet();
    if (id === 'crypto') return openCrypto();
    if (id === 'bets') { notifs().forEach(n => { if (n.app === 'bets') n.read = true; }); return window.BALTO.openMyBets(); }
    if (id === 'missions') return openRewards();
    if (id === 'boosters') return openBoosters('open');
    if (id === 'binder') return openBoosters('col');
    if (id === 'settings') return openSettings();
    if (id === 'shopNews') return st().lvl >= 2 ? openShop('news') : null;
    if (id === 'deal') return openPhone('msg');
    if (id === 'rig') { setScene('appart'); return openRig(); }
    if (id === 'gift') return openDaily();
    if (id === 'six') { closeModal(); setScene('city'); focusBld('six'); return openSix('pronos'); }
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
    rigCollect(el) { const r = G.rigCollect(el.dataset.mode || 'keep'); if (r.err) return toast(r.err, true); rigDone(r, el); },
    rigQuick(el, e) { e.stopPropagation(); const r = G.rigCollect('sell'); if (r.err) return toast(r.err, true); rigDone(r, el); },
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
    itBuy(el) { const r = G.buyItem(el.dataset.id); if (r.err) return toast(r.err, true); refresh(); },
    itSell(el) { const r = G.sellItem(el.dataset.id); if (r.err) return toast(r.err, true); floatTxt(`+${eur(r.p)}`); toast(r.paid ? (r.profit >= 0 ? `Vendu avec ${eur(r.profit)} de bénéfice` : `Vendu à perte : ${eur(r.profit)}`) : `Vendu ${eur(r.p)}`, r.paid && r.profit < 0); if ($('#modal .sheet.center')) closeModal(); refresh(); },
    itemInfo: el => openItem(el.dataset.id),
    wallet: () => openWallet(),
    quests: () => openRewards(),
    rewards: () => openRewards(),
    nextBuy: () => goNextBuy(),
    upgrades: () => openUpgrades(),
    roomPlace: () => roomPlacer(true),
    evBuy(el) { const r = G.evBuy(el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 20); setBody(sixBody()); renderCity(); renderHud(); },
    evUse(el) { const r = G.evUse(el.dataset.id); if (r.err) return toast(r.err, true); sfx.tap(); setBody(sixBody()); renderCity(); renderHud(); },
    sixPick(el) { const r = G.sixPick(+el.dataset.i, +el.dataset.p); if (r.err) return toast(r.err, true); sfx.tap(); setBody(sixBody()); },
    sixClaim(el) { const r = G.claimSix(); if (r.err) return toast(r.err, true); sfx.level(); rain('confetti', 40); setBody(sixBody()); renderHud(); },
    quest() { const q = G.questFocus(); openRewards(q && G.questState(q).done ? 'missions' : undefined); },
    claimQuest(el) { const r = G.claimQuest(el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 16); flyTo(el, '#pill-cash'); if (r.trophy) toast(`🏆 ${r.trophy.name} rejoint ton appart !`); refresh(); },
    claimChal(el) { const r = G.claimChal(+el.dataset.id); if (r.err) return toast(r.err, true); sfx.win(); flyTo(el, '#pill-cash'); if (r.bonus) { toast('Les 3 défis du jour : 1 booster et 3 lingots en plus !', false, 'boosters'); rain('bill', 30); } refresh(); },
    questGo(el) { questGo(D.QUESTS.find(q => q.id === el.dataset.id).go); },
    daily: () => openDaily(),
    claimDaily(el) { const r = G.claimDaily(); if (r.err) return toast(r.err, true); sfx.win(); rain('bill', 24); flyTo(el, '#pill-cash', 8); toast(`Jour ${r.day} : +${eur(r.r.cash)} et ${r.r.lingots} lingots${r.r.boosters ? ` et ${r.r.boosters} booster${r.r.boosters > 1 ? 's' : ''}` : ''} !`); refresh(); },
    boosters: () => openBoosters('open'),
    collection: () => openBoosters('col'),
    boosterOpen() { const r = G.openBooster(); if (r.err) return toast(r.err, true); closeModal(); packOpening(r.cards); renderHud(); },
    boosterBuy() { const r = G.buyBooster(); if (r.err) return toast(r.err, true); sfx.coin(); refresh(); },
    packDone() { const el = $('#pack'); el.className = ''; el.innerHTML = ''; refresh(); nextPending(); },
    goDefis: () => openRewards('defis'),
    claimSeries(el) { const r = G.claimSeries(el.dataset.id); if (r.err) return toast(r.err, true); sfx.level(); rain('bill', 40); toast(`Série « ${r.se.name} » complète : +${eur(r.se.reward.cash)} et ${r.se.reward.lingots} lingots !`); refresh(); },
    cardZoom: el => cardZoom(el.dataset.id),
    czClose: () => closeZoom(),
    czSell(el) { const id = el.dataset.id, r = G.sellItem(id); if (r.err) return toast(r.err, true); sfx.coin(); closeZoom(); refresh(); },
    deal: () => openPhone('msg'),
    dealOk() { const r = G.acceptDeal(); if (r.err) return toast(r.err, true); sfx.win(); if (phoneOpen()) drawPhone(); else closeModal(); refresh(); },
    dealNo() { G.refuseDeal(); if (phoneOpen()) drawPhone(); else closeModal(); renderHud(); },
    eventInfo() { const ev = G.eventNow(); if (!ev) return; openModal({ title: ev.name, icon: ev.icon, center: true, body: `<p class="center">${ev.desc}</p><p class="center muted">Encore ${mmss(G.eventLeft())}.</p><button class="btn green wide" data-act="eventGo">J'y vais</button>` }); },
    eventGo() { const ev = G.eventNow(); closeModal(); if (!ev) return; questGo({ xp: 'balto', boost: 'balto', rig: 'rig', sale: 'shop' }[ev.id]); },
    freebetInfo() { openModal({ title: 'Pari gratuit', icon: 'ticket', center: true, body: `<p class="center">Tu as ${st().freebets.length} pari${st().freebets.length > 1 ? 's' : ''} gratuit${st().freebets.length > 1 ? 's' : ''} : ${st().freebets.map(n => eur(n)).join(', ')}.</p><p class="center muted">Au Balto, coche « Utiliser mon pari gratuit » sur ton ticket. La mise est offerte : si tu gagnes, tu touches le bénéfice.</p><button class="btn green wide" data-act="eventGoBalto">Au Balto</button>` }); },
    eventGoBalto() { closeModal(); questGo('balto'); },
    scratchGo() { questGo('scratch'); },
    soundToggle() { st().sound = !st().sound; G.save(); openSettings(); },
    trading() { openCrypto(); },
    profile: () => openProfile(),
    setSkin(el) { st().skin = el.dataset.id; G.save(); openProfile(); renderHud(); },
    settings: () => openSettings(),
    howto: () => openHowto(),
    tutoAgain() { closeModal(); setScene('city'); st().tutoStep = 0; window.TUTO.start(0); },
    resetAsk() { openModal({ title: 'Recommencer', center: true, body: '<p class="center">Tout ton argent, tes cryptos et tes objets seront effacés.</p><button class="btn red wide" data-act="resetGo">Tout effacer</button>' }); },
    resetGo() { G.reset(); location.reload(); },
    moodInfo() { const m = G.mood(), w = WEATHER[m.id] || WEATHER.calm; if (modalOpen()) return; openModal({ title: 'Météo du marché', center: true, body: `<div class="weather w-${m.id}"><span class="w-ic">${w[0]}</span><div><b>${w[1]}</b><p>${w[2]}</p></div></div><p class="hint-line center">Elle change toutes les 20 minutes et fait bouger toutes les cryptos en même temps. Quand ça monte, tes cryptos prennent de la valeur ; quand ça baisse, elles en perdent.</p><button class="btn green wide" data-act="closeModal">Compris</button>` }); },
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
    phoneNotif(el) { const n = notifs().find(x => String(x.id) === el.dataset.id); $('#ph-banner')?.classList.remove('show'); if (!n) return openPhone('notifs'); n.read = n.seen = true; renderPhoneBtn(); const go = { msg: 'msg', bets: 'bets', crypto: 'crypto', missions: 'missions', boosters: 'boosters', news: 'shopNews', bank: 'bank', rig: 'rig', gift: 'gift', six: 'six' }[n.app]; if (n.app === 'msg') { const name = n.thread || n.title; if (!chats()[name]) { const ct = D.DEALS.contacts.find(c => c.name === name); chatPush(name, (ct && ct.img) || 'guide', { from: 'them', txt: n.txt }); chats()[name].unread = 0; } return openChat(name); } closePhone(); phoneGo(go || n.app); },
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
      if (a.act === 'shop') { closePhone(); return st().lvl >= 2 ? openShop('news') : toast('Le Comptoir ouvre au niveau 2.'); }
      setTimeout(() => chatPush(c.name, null, { from: 'them', txt: pick(['Tant pis pour toi 😏', 'Ok, comme tu veux.', 'Tu me remercieras pas alors !', 'Ça marche, la prochaine fois.']) }), 900);
      drawPhone();
    },
    clubGo(el) { const r = G.clubNight(); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 30); floatTxt(`+${r.xp} XP`); toast(`Grosse soirée ! +${r.xp} XP${r.vip ? ', et un carré VIP : +3 lingots' : ''}.${r.meet ? ' Tu as rencontré quelqu\'un qui a un plan pour toi…' : ''}`, false, r.meet ? 'deal' : null); refresh(); },
    clubVip(el) { const r = G.clubNight(true); if (r.err) return toast(r.err, true); sfx.win(); rain('confetti', 30); floatTxt(`+${r.xp} XP`); toast(`Grosse soirée ! +${r.xp} XP${r.vip ? ', et un carré VIP : +3 lingots' : ''}.${r.meet ? ' Tu as rencontré quelqu\'un qui a un plan pour toi…' : ''}`, false, r.meet ? 'deal' : null); refresh(); },
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
      <p class="hint-line center">Mise max au Balto : <b>${G.betMax()}<i class="cur"></i></b></p>
      ${un.length ? `<div class="ul-title">Nouveautés débloquées</div><div class="unlocks">${un.map(unlockTile).join('')}</div>` : ''}
      <div class="grid2"><button class="btn purple" data-act="boosterOpen">Ouvrir le booster</button><button class="btn green" data-act="closeModal">Trop bien !</button></div></div>` });
  }
  G.on('levelup', e => { queue(() => showLevelUp(e)); renderCity(); });
  // mini-événement : annoncé par Momo en bas de l'écran (rien ne cache le haut du jeu), la pastille reste en haut
  G.on('event', ev => { sfx.goal(); notify('missions', `⚡ ${ev.name} pendant ${Math.round(D.EVENTS.time / 60)} min`, ev.desc); });
  G.on('deal', d => {
    chatPush(d.name, d.img, { from: 'them', kind: 'deal', txt: d.line, offer: { id: d.id, type: d.type, price: d.price }, acts: [{ label: d.type === 'sell' ? 'J\'achète' : 'Je vends', act: 'dealOk' }, { label: 'Non merci', act: 'dealNo' }] });
    notify('msg', d.name, `${d.line} (${d.type === 'sell' ? 'il vend' : 'il rachète'} ${G.what(G.item(d.id))})`, null, false, d.name);
  });
  // un pote envoie un prono : on peut répondre « Je parie » et le Balto s'ouvre avec le pronostic déjà coché
  G.on('friendTip', f => {
    const m = G.match(f.m); if (!m) return;
    const who = m.sport === 'foot' && f.pick === 1 ? 'un match nul' : `${f.pick === 0 ? m.home : m.away} gagne`;
    const txt = pick([`Crois-moi : ${who} sur ${m.home} – ${m.away}. J'ai mes sources.`, `Gros tuyau : ${who}. ${m.home} – ${m.away}, tu me remercieras.`, `Mise sur ${who.replace(' gagne', '')}, ${m.home} – ${m.away}. Je le sens trop.`]);
    chatPush(f.name, f.img, { from: 'them', txt, match: f.m, acts: [{ label: 'Je parie', act: 'bet', m: f.m, p: f.pick }, { label: 'Pas confiance', act: 'no' }] });
    notify('msg', f.name, txt, null, false, f.name);
  });
  G.on('mood', m => { const w = WEATHER[m.id] || WEATHER.calm; notify('crypto', `Météo du marché : ${w[0]} ${w[1]}`, w[2]); });
  G.on('news', n => {
    if (n.smoke) {
      const t = n.txt.replace(/^🚬 Pause clope : un pote te glisse que /, '');
      const ct = G.contactFor('Karim');
      chatPush(ct.name, ct.img, { from: 'them', txt: `Entre nous : ${t}`, item: n.item, acts: [{ label: n.up ? 'J\'y vais' : 'Je regarde', act: 'shop', id: n.item }, { label: 'Merci', act: 'no' }] });
      return notify('msg', ct.name, `Entre nous : ${t}`, null, false, ct.name);
    }
    notify(n.txt.includes('effondre') ? 'crypto' : 'news', n.bad ? 'Ça baisse !' : 'Ça monte !', n.txt);
  });
  G.on('sixRemind', m => notify('six', '🏉 Pense à ton prono', `${m.home} – ${m.away} commence bientôt. C'est gratuit !`));
  G.on('sixResult', m => notify('six', m.ok ? '🏉 Bon prono !' : '🏉 Prono raté', `${m.home} ${m.sh} - ${m.sa} ${m.away}.${m.ok ? ` +${D.SIX.pts} points et +${D.SIX.lingotPerGood} lingot.` : ''} Tu es ${G.sixRank()}e au classement.`));
  G.on('sixEnd', f => notify('six', '🏆 Tournoi terminé', `Tu finis ${f.rank}${f.rank === 1 ? 'er' : 'e'} ! Va récupérer ta récompense au Panneau, sur la place.`));
  G.on('trophy', it => { if (it) setTimeout(() => toast(`🏆 Trophée gagné : ${it.name}`), 600); });
  G.on('bailout', line => dialog('Coup de pouce', `${line}<br><b>+${D.BAILOUT.amount}<i class="cur"></i></b>`, 'Merci'));
  G.on('betResult', ({ b, offline }) => {
    const l = b.legs[0], what = b.legs.length > 1 ? `Combiné ×${b.legs.length}` : l.home ? `${l.home} – ${l.away}` : 'Ton pari';
    if (b.state === 'won') { if (!offline) { sfx.win(); rain('bill'); bump('#pill-cash'); } notify('bets', `Ticket gagnant : +${eur(b.gain)} !`, what, null, offline); }
    else notify('bets', 'Ticket perdu', `${what}. Le Balto encaisse.`, null, offline);
  });
  G.on('money', () => bump('#pill-cash'));
  G.on('tilt', () => toast(`🍺 Tilt ! Tu veux te refaire : impossible de quitter la table pendant ${D.TILT.min} min.`, true));
  G.on('quit', h => dialog('Sevrage terminé', `Tu as arrêté : ${h.icon} ${h.name}. Ta santé remonte.`, 'Fier de moi'));

  // ------------------------------------------------------------ démarrage
  let lastSave = 0;
  // notifications « du quotidien » : machine pleine, cadeau et booster du jour
  function dailyNotifs() {
    const s = st(), hot = G.rigInfo().hot;
    if (hot && !s.rigNotified) { s.rigNotified = true; notify('rig', 'Ta machine est pleine', 'Elle a chauffé et s\'est arrêtée. Encaisse pour la relancer.'); }
    if (!hot) s.rigNotified = false;
    const day = new Date().toDateString();
    if (s.notifDay !== day && s.tutoDone) {
      s.notifDay = day;
      if (G.dailyReady()) notify('gift', 'Ton cadeau du jour t\'attend', `Jour ${G.dailyDay()} de ta série. Ne la casse pas !`);
      if (G.boosterFree()) notify('boosters', 'Booster gratuit disponible', 'Ton booster du jour est prêt à être ouvert.');
    }
  }
  function loop() {
    G.simulate(false); dailyNotifs();
    if (phoneOpen() && (phoneApp === 'home' || phoneApp === 'chat' || phoneApp === 'msg')) drawPhone();
    renderHud();
    if (scene === 'appart' && !modalOpen() && !RP.on) renderAppart();
    if (modalRefresh && !document.activeElement?.matches('input')) modalRefresh();
    if (Date.now() - lastSave > 5000) { G.save(); lastSave = Date.now(); }
  }
  function hudBottom() { const h = $('#hud'); if (h) $('#app').style.setProperty('--hud-b', (h.getBoundingClientRect().bottom - $('#app').getBoundingClientRect().top) + 'px'); }
  window.addEventListener('resize', hudBottom);
  function cleanChats() { const sk = st().skin; Object.keys(chats()).forEach(k => { const c = chats()[k]; if (sk && c.img && c.img.includes(sk + '-')) delete chats()[k]; }); }
  function boot2(first) {
    cleanChats();
    hydrateIcons(); hudBottom(); setTimeout(hudBottom, 300);
    layoutMap(); renderCity(); focusTop(); renderHud(); placerMode(); roomPlacer();
    setInterval(loop, 1000);
    if (!st().tutoDone) setTimeout(() => window.TUTO.start(), 500);
  }
  function boot() {
    if (!has('icon-cash')) document.body.classList.add('no-cash-img');
    initPan();
    const report = G.load();
    if (!st().skin) return startScreen();
    // écran d'accueil comme Mama Kana : le logo, ton perso, « Continuer »
    const el = $('#start'), s = st();
    el.className = 'welcome';
    el.innerHTML = `<div class="st-top">${has('logo') ? `<img class="st-logo" src="${src('logo')}" alt="Hustle City">` : '<div class="logo"><div class="t1">HUSTLE</div><div class="t2">CITY</div></div>'}<span class="st-tag">Deviens riche. Facilement.*</span></div>
      <div class="st-hero">${skinPic(s.skin)}</div>
      <div class="st-bottom"><p class="st-hello stroke">Re, ${esc(s.name)} !</p><button class="btn green start-btn" id="st-go">Continuer</button>
      <p class="start-note">*ou pas · jeu gratuit · argent fictif, sans aucune valeur réelle · réservé aux adultes</p></div>`;
    $('#st-go').onclick = () => {
      sfx.tap(); el.classList.add('gone'); setTimeout(() => el.remove(), 400);
      boot2(false);
      if (report && (Math.abs(report.worthDiff) >= 1 || report.bets)) queue(() => openModal({ title: 'Pendant ton absence', icon: 'star', center: true, body: `<p class="center">Tu es parti ${mmss(report.away * 1000)}.</p><div class="card center"><div class="muted">Ton patrimoine a bougé de</div><div class="big ${report.worthDiff >= 0 ? 'up' : 'down'}">${report.worthDiff >= 0 ? '+' : ''}${eur(report.worthDiff)}</div>${report.bets ? `<p>${report.bets} pari(s) gagné(s) pendant ce temps.</p>` : ''}</div><button class="btn green wide" style="margin-top:10px" data-act="closeModal">OK</button>` }));
    };
  }
  document.addEventListener('input', e => { if (e.target.id === 'cr-amt') { crAmt = e.target.value; const l = $('#cr-amt-lbl'); if (l) l.innerHTML = eur(+crAmt || 0); } });
  window.addEventListener('beforeunload', () => G.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });

  window.UI = { notify, habitsBody, focusBld, eur, short, pct, mmss, esc, pic, ic, has, src, toast, floatTxt, rain, openModal, setBody, closeModal, register, refresh, sparkSvg, dialog, teamCrest, teamIdx, sfx, flyTo, queue, packArt, openBoosters, openRewards, get scene() { return scene; } };
  let booted = false; const go = () => { if (!booted) { booted = true; boot(); } };
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => setTimeout(go, 0)); else setTimeout(go, 0);
})();
