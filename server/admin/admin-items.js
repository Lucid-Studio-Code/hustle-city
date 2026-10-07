/* Hustle City · back office : les OBJETS DU JEU (voir, modifier, ajouter).
   Tout ce qui est fait ici part dans la config « live » sous la clé content.items (route POST /admin/api/content) :
   - un objet du jeu modifié : seulement ce qui change (nom, prix de départ, rareté, boutique, image, caché, dates) ;
   - un nouvel objet : { new: true, cat, name, r, p0, img, series… }. Les images vont sur le serveur (/admin/api/upload → /media/…).
   Le jeu les applique avec js/content.js. */
(function () {
  'use strict';
  const HC = window.HC, D = HC.D, { $, $$, esc, img, has, src, short } = HC;
  const CATS = D.ITEM_CATS || {}, SERIES = D.SERIES || [];
  const SHOPS = { comptoir: { name: 'Le Comptoir', icon: 'bld-shop' }, bijou: { name: 'Bijouterie Diamant', icon: 'bld-bijou' }, garage: { name: 'Garage Prestige', icon: 'bld-garage' } };
  const RAR = { C: 'Commun', R: 'Rare', E: 'Épique', L: 'Légendaire' };
  const BOOST_MAX = (D.BOOSTER || {}).maxCard || 600;
  // les fêtes : des dates prêtes à l'emploi (la prochaine fois qu'elles arrivent)
  const PRESETS = [
    { id: 'halloween', name: 'Halloween', icon: 'ic-promo-halloween', from: [10, 24], to: [11, 1] },
    { id: 'noel', name: 'Noël', icon: 'ic-promo-noel', from: [12, 15], to: [12, 27] },
    { id: 'bf', name: 'Black Friday', icon: 'ic-promo-bf', from: 'bf', to: 4 },
    { id: 'valentin', name: 'Saint-Valentin', emo: '💘', from: [2, 7], to: [2, 15] },
    { id: 'ete', name: 'L\'été', emo: '☀️', from: [7, 1], to: [9, 1] }
  ];
  function presetDates(p) {
    const n = new Date(), mk = y => {
      if (p.from === 'bf') { const d = new Date(y, 10, 1); const f = new Date(y, 10, (4 - d.getDay() + 7) % 7 + 1 + 22); const t = new Date(f); t.setDate(f.getDate() + p.to); return [f, t]; }
      const f = new Date(y, p.from[0] - 1, p.from[1]), t = new Date(y + (p.to[0] < p.from[0] ? 1 : 0), p.to[0] - 1, p.to[1]); return [f, t];
    };
    let [f, t] = mk(n.getFullYear()); if (t < n) [f, t] = mk(n.getFullYear() + 1);
    return [f, t];
  }
  const pad = n => String(n).padStart(2, '0');
  const toLocal = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fromLocal = v => v ? new Date(v).toISOString() : null;
  const dday = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).replace(/^1 /, '1er ');
  const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // ------------------------------------------------------------ les objets tels que le jeu les voit
  const ORIG = new Map((D.ITEMS || []).map(i => [i.id, i]));
  const inGame = i => !i.needArt || has(i.needArt);   // une carte sans son image n'existe pas encore dans le jeu
  const kindOf = it => it.cat === 'card' ? 'card' : it.cat === 'trophy' ? 'trophy' : (CATS[it.cat] || {}).shop || 'comptoir';
  const whereTxt = it => it.cat === 'card' ? 'Boosters et Comptoir' : it.cat === 'trophy' ? 'À gagner (vitrine)' : (SHOPS[(CATS[it.cat] || {}).shop] || {}).name || '';
  function picOf(it) {   // l'image de l'objet (adresse)
    if (it.img && /^\/media\//.test(it.img)) return it.img;
    if (it.cat === 'card') { const full = it.art && 'full-' + it.art.replace(/^art-/, ''); const n = [full, it.art, 'item-' + it.id, it.img].find(x => x && has(x)); return n ? src(n) : null; }
    return has('item-' + it.id) ? src('item-' + it.id) : null;
  }
  const picHtml = (it, cls = '') => { const u = picOf(it); return u ? `<img class="${cls}" src="${esc(u)}" alt="" loading="lazy">` : `<span class="ob-emo ${cls}">${(CATS[it.cat] || {}).icon || '❔'}</span>`; };
  const nowIn = it => { const t = Date.now(); return !it.hidden && (!it.from || t >= Date.parse(it.from)) && (!it.until || t < Date.parse(it.until)); };
  function stateTag(it) {
    if (it.hidden) return '<span class="tag ko">Caché</span>';
    if (it.from || it.until) { const t = Date.now(), a = it.from ? Date.parse(it.from) : 0, b = it.until ? Date.parse(it.until) : Infinity;
      return t < a ? `<span class="tag blue">À partir du ${dday(it.from)}</span>` : t >= b ? '<span class="tag">Terminé</span>' : `<span class="tag ok">En vente${it.until ? ' jusqu\'au ' + dday(it.until) : ''}</span>`; }
    return '';
  }

  HC.PAGES.items = async (P) => {
    const cfg = await HC.api('/admin/api/config');
    let items = JSON.parse(JSON.stringify(((cfg.content || {}).items) || {}));
    const view = { f: HC.lsGet('hc.items.f') || 'all', q: '' };
    const merged = o => { const e = items[o.id]; return e ? { ...o, ...e, _mod: true } : { ...o }; };
    const all = () => [...[...ORIG.values()].filter(inGame).map(merged), ...Object.entries(items).filter(([id, e]) => e.new).map(([id, e]) => ({ id, ...e, custom: true }))];

    async function publish(next, msg) {
      const r = await HC.api('/admin/api/content', { items: next });
      items = r.content.items; HC.toast(msg || 'Publié : les joueurs le voient dans la minute', 'icon-check');
    }

    // ================================================================ la liste
    const FILTERS = [
      ['all', 'Tout', 'icon-star'], ['comptoir', 'Le Comptoir', 'bld-shop'], ['bijou', 'Bijouterie', 'bld-bijou'], ['garage', 'Garage', 'bld-garage'],
      ['card', 'Cartes', 'cat-card'], ['trophy', 'Trophées', 'cat-trophy'], ['new', 'Ajoutés par toi', 'icon-gift'], ['mod', 'Modifiés', 'icon-gear'], ['off', 'Cachés ou à dates', 'icon-lock']
    ];
    const match = (it, f) => f === 'all' ? true : f === 'new' ? it.custom : f === 'mod' ? it._mod : f === 'off' ? (it.hidden || it.from || it.until) : kindOf(it) === f;
    function listView() {
      const L = all(), q = slug(view.q);
      const shown = L.filter(it => match(it, view.f) && (!q || slug(it.name).includes(q))).sort((a, b) => (b.custom ? 1 : 0) - (a.custom ? 1 : 0) || (b.created || 0) - (a.created || 0));
      HC.main(`<div class="page-head"><div><h1>Objets du jeu</h1><div class="sub">Tous les objets que les joueurs achètent, gagnent ou collectionnent. Clique sur un objet pour le modifier.</div></div>
          <button class="btn lg green" id="ob-new">+ Nouvel objet</button></div>
        <div class="ob-bar"><div class="chips">${FILTERS.map(([k, l, ic]) => `<button class="chip ${view.f === k ? 'on' : ''}" data-f="${k}">${img(ic)}${l} <b>${L.filter(it => match(it, k)).length}</b></button>`).join('')}</div>
          <input id="ob-q" type="search" placeholder="Chercher un objet…" value="${esc(view.q)}"></div>
        <div class="ob-grid" id="ob-grid">${shown.map(tile).join('') || HC.empty('Aucun objet ici.')}</div>`);
      $('#ob-new').onclick = () => editor(null);
      $$('[data-f]').forEach(b => b.onclick = () => { view.f = b.dataset.f; HC.lsSet('hc.items.f', view.f); listView(); });
      $('#ob-q').oninput = e => { view.q = e.target.value; const y = e.target.selectionStart; listView(); const i = $('#ob-q'); i.focus(); i.setSelectionRange(y, y); };
      $$('[data-it]').forEach(b => b.onclick = () => editor(b.dataset.it));
    }
    function tile(it) {
      const sh = whereTxt(it);
      return `<button class="ob-tile ${nowIn(it) ? '' : 'dim'}" data-it="${esc(it.id)}"><span class="ob-r r${esc(it.r)}">${RAR[it.r] || ''}</span>
        <span class="ob-pic">${picHtml(it)}</span><b>${esc(it.name)}</b><span class="ob-p">${short(it.p0)}<i class="cur"></i></span>
        <small>${esc(sh)}</small><span class="ob-tags">${it.custom ? '<span class="tag pink">Ajouté</span>' : it._mod ? '<span class="tag warn">Modifié</span>' : ''}${stateTag(it)}</span></button>`;
    }

    // ================================================================ créer / modifier
    function editor(id) {
      const isNew = !id, o = id ? ORIG.get(id) : null, e = id ? items[id] || {} : {};
      const base = isNew ? null : o ? { ...o, ...e } : { id, ...e, custom: true };
      const c = isNew ? { id: '', isNew: true, custom: true, kind: null, cat: null, series: null, name: '', r: 'R', p0: 500, img: null, hidden: false, from: null, until: null, tag: null }
        : { ...base, isNew: false, kind: kindOf(base) };
      c.mode = c.hidden ? 'hidden' : (c.from || c.until) ? 'dates' : 'always';
      let pending = null;   // nouvelle image pas encore envoyée : { before, after, use }
      const isCard = () => c.cat === 'card', canImg = () => c.custom || !isCard(), canCat = () => c.custom ? true : !['card', 'trophy'].includes(base.cat);
      const steps = [];
      // ---- 1. l'image
      steps.push(() => `<section class="card pm-step"><div class="pm-sn">1</div><div class="pm-sb"><h3>L'image</h3>
        ${canImg() ? `<p class="help">Une image PNG, JPG ou WebP (4 Mo au plus). Sur fond blanc ? Je peux retirer le blanc pour toi.</p>
          <label class="ob-drop" id="ob-drop"><input type="file" id="ob-file" accept="image/png,image/jpeg,image/webp" hidden>
            <span>${img('icon-gift')}<b>${c.img || pending ? 'Changer l\'image' : 'Choisir une image'}</b><small>ou glisse-la ici</small></span></label>
          <div id="ob-imgs"></div>` : '<p class="help">L\'image des cartes du jeu ne se change pas ici.</p><div id="ob-imgs"></div>'}</div></section>`);
      // ---- 2. le type
      steps.push(() => `<section class="card pm-step"><div class="pm-sn">2</div><div class="pm-sb"><h3>${isNew ? 'Ce que c\'est' : 'Où il se vend'}</h3>
        ${!canCat() ? `<p class="help">${isCard() ? `Carte de collection, série « ${esc((SERIES.find(s => s.id === c.series) || {}).name || '')} ». Elle sort des boosters et se trouve parfois au Comptoir.` : 'Trophée : on ne l\'achète pas, on le gagne en jouant.'}</p>`
        : `${isNew ? `<div class="ob-kinds">
            <button class="pm-pick ${c.kind === 'shop' ? 'on' : ''}" data-kind="shop">${img('nav-shop')}<b>Objet de boutique</b><small>s'achète et se revend</small></button>
            <button class="pm-pick ${c.kind === 'card' ? 'on' : ''}" data-kind="card">${img('cat-card')}<b>Carte de collection</b><small>boosters et classeur</small></button>
            <button class="pm-pick off" disabled>${img('deco-dc-bench')}<b>Déco de la ville</b><small>bientôt</small></button>
            <button class="pm-pick off" disabled>${img('cat-trophy')}<b>Trophée</b><small>bientôt</small></button>
            <button class="pm-pick off" disabled>${img('skin-hoodie-bust')}<b>Look du perso</b><small>bientôt</small></button></div>` : ''}
          <div id="ob-sub"></div>`}</div></section>`);
      // ---- 3. nom, prix, rareté
      steps.push(() => `<section class="card pm-step"><div class="pm-sn">3</div><div class="pm-sb"><h3>Le nom et le prix</h3>
        <div class="fld"><label for="ob-name">Nom</label><input id="ob-name" maxlength="60" value="${esc(c.name)}" placeholder="Ex. : Citrouille dorée"></div>
        <div class="fld"><label>Rareté</label><div class="chips">${Object.entries(RAR).map(([k, l]) => `<button class="chip ob-rc r${k} ${c.r === k ? 'on' : ''}" data-r="${k}">${l}</button>`).join('')}</div></div>
        <div class="fld"><label for="ob-p0">Prix de départ</label><div class="ob-price-in"><input id="ob-p0" type="number" min="1" max="10000000" value="${esc(c.p0)}"><i class="cur"></i></div>
          <p class="help">C'est le prix de départ : ensuite la cote bouge toute seule, un peu au-dessus ou en dessous. La boutique la vend 5 % plus cher et la rachète 10 % moins cher.</p>
          <p class="help" id="ob-hint"></p></div></div></section>`);
      // ---- 4. quand
      steps.push(() => `<section class="card pm-step"><div class="pm-sn">4</div><div class="pm-sb"><h3>Quand il est disponible</h3>
        <div class="chips"><button class="chip ${c.mode === 'always' ? 'on' : ''}" data-mode="always">Toujours</button><button class="chip ${c.mode === 'dates' ? 'on' : ''}" data-mode="dates">Entre deux dates</button><button class="chip ${c.mode === 'hidden' ? 'on' : ''}" data-mode="hidden">Caché</button></div>
        <div id="ob-when" style="margin-top:12px"></div></div></section>`);

      HC.main(`<div class="page-head"><div><h1>${isNew ? 'Nouvel objet' : esc(c.name)}</h1><div class="sub">${isNew ? '4 étapes. L\'aperçu à droite montre ce que voit le joueur.' : 'Change ce que tu veux, l\'aperçu suit.'}</div></div><button class="btn ghost" id="ob-back">← Tous les objets</button></div>
        <div class="pm-ed"><div class="pm-steps">${steps.map(f => f()).join('')}
          <div class="pm-save">${!isNew && c.custom ? '<button class="btn red" id="ob-del">Retirer du jeu</button>' : ''}${!isNew && !c.custom && items[id] ? '<button class="btn ghost" id="ob-reset">Remettre comme avant</button>' : ''}
            <button class="btn ghost" id="ob-cancel">Annuler</button><button class="btn lg green" id="ob-go">${img('icon-check')}Publier</button></div></div>
          <aside class="pm-prev" id="ob-prev"></aside></div>`);

      // ---------- sous-choix du type (boutique / série)
      function sub() {
        const el = $('#ob-sub'); if (!el) return;
        if (c.kind === 'card') {
          const grp = col => SERIES.filter(s => (s.col || 'sport') === col && s.id !== 'rugby');
          el.innerHTML = `<p class="help" style="margin-top:12px">Dans quelle série du classeur ?</p>` + [['sport', 'Cartes de sport'], ['crea', 'Cartes Créatures']].map(([k, l]) => `<div class="ob-sl">${l}</div><div class="pm-offers">${grp(k).map(s => `<button class="pm-pick ${c.series === s.id ? 'on' : ''}" data-series="${s.id}"><b>${esc(s.name)}</b><small>${esc(s.sub || '')}</small></button>`).join('')}</div>`).join('');
          $$('[data-series]', el).forEach(b => b.onclick = () => { c.series = b.dataset.series; c.cat = 'card'; sub(); prev(); });
        } else if (c.kind && c.kind !== 'trophy') {
          el.innerHTML = `<p class="help" style="margin-top:12px">Dans quelle boutique, et dans quel rayon ?</p>` + Object.entries(SHOPS).map(([sk, s]) => `<div class="ob-shoprow"><span class="ob-sn">${img(s.icon)}${s.name}</span><div class="chips">${Object.entries(CATS).filter(([k, x]) => x.shop === sk && k !== 'card').map(([k, x]) => `<button class="chip ${c.cat === k ? 'on' : ''}" data-cat="${k}">${has('cat-' + k) ? img('cat-' + k) : x.icon} ${x.name}</button>`).join('')}</div></div>`).join('')
            + (c.cat && CATS[c.cat] ? `<p class="help">${CATS[c.cat].place === 'park' ? 'Il prend une place dans le parking du joueur.' : CATS[c.cat].place === 'safe' ? 'Il se range dans le coffre du joueur.' : 'Il prend une place sur les étagères de l\'appart.'} Visible à partir du niveau ${CATS[c.cat].lvl}.</p>` : '');
          $$('[data-cat]', el).forEach(b => b.onclick = () => { c.cat = b.dataset.cat; sub(); prev(); });
        } else el.innerHTML = '';
      }
      // ---------- l'image : chargement, fond blanc, avant / après
      function imgs() {
        const el = $('#ob-imgs'); if (!el) return;
        if (!pending) { const u = !isNew ? picOf(c) : null; el.innerHTML = u ? `<div class="ob-ba one"><div><span class="ob-chk"><img src="${esc(u)}" alt=""></span><small>Image actuelle</small></div></div>` : ''; return; }
        el.innerHTML = `<div class="ob-ba"><div><span class="ob-chk"><img src="${pending.before}" alt=""></span><small>Avant</small></div><div><span class="ob-chk"><img src="${pending.use ? pending.after : pending.before}" alt=""></span><small>${pending.use ? 'Après (fond retiré)' : 'Gardée telle quelle'}</small></div></div>
          <label class="ob-cut"><input type="checkbox" id="ob-cut" ${pending.use ? 'checked' : ''}> Retirer le fond blanc</label>
          ${pending.use ? `<div class="ob-tol"><span>Retirer un peu</span><input type="range" id="ob-tol" min="4" max="80" value="${pending.tol}"><span>beaucoup</span></div>` : ''}`;
        $('#ob-cut').onchange = ev => { pending.use = ev.target.checked; if (pending.use && !pending.after) cut(); imgs(); prev(); };
        if ($('#ob-tol')) $('#ob-tol').onchange = ev => { pending.tol = +ev.target.value; cut(); imgs(); prev(); };
      }
      function cut() { pending.after = removeWhite(pending.canvas, pending.tol); }
      function load(file) {
        if (!file) return; if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return HC.toast('Il faut une image PNG, JPG ou WebP', null, true);
        if (file.size > 12 * 1048576) return HC.toast('Image trop lourde', null, true);
        const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => {
          const k = Math.min(1, 768 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          const white = looksWhite(cv);
          pending = { canvas: cv, before: cv.toDataURL('image/png'), after: null, use: white, tol: 28 }; if (white) cut(); imgs(); prev();
          const dl = $('#ob-drop b'); if (dl) dl.textContent = 'Changer l\'image';
        }; im.src = r.result; }; r.readAsDataURL(file);
      }
      // ---------- le conseil de prix : ce que valent les objets du même rayon
      function hint() {
        const el = $('#ob-hint'); if (!el) return;
        const same = [...ORIG.values()].filter(i => inGame(i) && i.cat === c.cat && i.r === c.r && i.id !== c.id).map(i => i.p0);
        el.innerHTML = c.cat && same.length ? `Repère : les objets « ${RAR[c.r].toLowerCase()} » de ce rayon valent entre <b>${short(Math.min(...same))}</b> et <b>${short(Math.max(...same))}</b>.` : '';
        if (isCard()) el.innerHTML += ` ${+c.p0 <= BOOST_MAX ? 'Elle peut sortir des boosters.' : `Au-dessus de ${BOOST_MAX}, elle ne sort pas des boosters : seulement au Comptoir.`}`;
      }
      // ---------- quand
      function when() {
        const el = $('#ob-when');
        if (c.mode === 'always') el.innerHTML = '<p class="help">En vente tout le temps.</p>';
        else if (c.mode === 'hidden') el.innerHTML = `<p class="help">Plus personne ne le voit en boutique.${isNew ? '' : ' Ceux qui l\'ont déjà le gardent.'}</p>`;
        else {
          el.innerHTML = `<div class="chips">${PRESETS.map(p => `<button class="chip ${c.tag === p.id ? 'on' : ''}" data-pre="${p.id}">${p.icon && has(p.icon) ? img(p.icon) : p.emo || ''} ${p.name}</button>`).join('')}</div>
            <div class="row2" style="margin-top:12px"><div class="fld"><label for="ob-from">À partir du</label><input type="datetime-local" id="ob-from" value="${toLocal(c.from)}"></div><div class="fld"><label for="ob-until">Jusqu'au</label><input type="datetime-local" id="ob-until" value="${toLocal(c.until)}"></div></div>
            <p class="help" id="ob-wh"></p>`;
          $$('[data-pre]', el).forEach(b => b.onclick = () => { const p = PRESETS.find(x => x.id === b.dataset.pre), [f, t] = presetDates(p); c.tag = p.id; c.from = f.toISOString(); c.until = t.toISOString(); when(); prev(); });
          $('#ob-from').onchange = ev => { c.from = fromLocal(ev.target.value); c.tag = null; when(); prev(); };
          $('#ob-until').onchange = ev => { c.until = fromLocal(ev.target.value); c.tag = null; when(); prev(); };
          const a = c.from ? Date.parse(c.from) : 0, b = c.until ? Date.parse(c.until) : 0;
          $('#ob-wh').innerHTML = !c.from || !c.until ? 'Choisis une fête ou deux dates.' : b <= a ? '<span style="color:var(--red)">La fin doit être après le début.</span>'
            : b < Date.now() ? '<span style="color:var(--red)">Ces dates sont déjà passées.</span>' : Date.now() >= a ? `En vente dès que tu publies, jusqu'au ${dday(c.until)}. Ensuite il disparaît des boutiques, ceux qui l'ont le gardent.` : `Il arrivera tout seul en boutique le ${dday(c.from)}, et partira le ${dday(c.until)}.`;
        }
      }
      // ---------- l'aperçu : la carte de l'objet dans la boutique du jeu
      function prev() {
        hint();
        const u = pending ? (pending.use ? pending.after : pending.before) : (!isNew ? picOf(c) : null);
        const pic = u ? `<img src="${esc(u)}" alt="">` : `<span class="ob-emo">${(CATS[c.cat] || {}).icon || '❔'}</span>`, p = Math.max(1, +c.p0 || 0);
        const where = isCard() ? 'Boosters et Comptoir' : c.cat === 'trophy' ? 'Vitrine' : c.cat ? (SHOPS[CATS[c.cat].shop] || {}).name : 'Choisis où il se vend (étape 2)';
        const icon = isCard() ? 'booster-pack' : c.cat && CATS[c.cat] ? (SHOPS[CATS[c.cat].shop] || {}).icon : 'nav-shop';
        const visible = c.mode === 'always' || (c.mode === 'dates' && c.from && c.until && Date.now() >= Date.parse(c.from) && Date.now() < Date.parse(c.until));
        $('#ob-prev').innerHTML = `<div class="prev-lbl">Ce que voit le joueur</div>
          <div class="ob-phone"><div class="ob-ph-h">${img(icon)}<b>${esc(where)}</b></div>
            ${isCard() ? `<div class="ob-tcg r${esc(c.r)}"><span class="ob-tcg-img">${pic}</span><span class="ob-tcg-r">${{ C: '●', R: '◆', E: '★', L: '♛' }[c.r]}</span><b>${esc(c.name || 'Nom de la carte')}</b></div>
              <div class="ob-tcg-p"><small>Cote</small> ${short(p)}<i class="cur"></i></div>`
            : `<div class="ob-icard"><span class="ob-rtag r${esc(c.r)}">${RAR[c.r] || ''}</span><span class="ob-ipic">${pic}</span><h4>${esc(c.name || 'Nom de l\'objet')}</h4>
              <div class="ob-ip"><small>Cote</small>${short(p)}<i class="cur"></i></div><small class="ob-im">Vendu ${short(Math.ceil(p * 1.05))} (cote + 5 %)</small>
              <span class="ob-buy">Acheter ${short(Math.ceil(p * 1.05))}<i class="cur"></i></span></div>`}
          </div>
          <div class="ob-sum">${visible ? `<span class="tag ok">Visible ${c.mode === 'dates' ? 'jusqu\'au ' + dday(c.until) : 'tout le temps'}</span>` : c.mode === 'hidden' ? '<span class="tag ko">Caché</span>' : c.from ? `<span class="tag blue">Arrive le ${dday(c.from)}</span>` : ''}
            <small class="help">${isCard() ? 'Dans le classeur et les boosters.' : c.custom ? 'Une nouveauté reste toujours en rayon pendant ses dates.' : 'En rayon quand l\'arrivage le propose (toutes les 30 min).'}
            Revente au joueur : ${short(Math.floor(p * .9))}.</small></div>`;
      }
      // ---------- branchements
      sub(); imgs(); when(); prev();
      $$('[data-kind]').forEach(b => b.onclick = () => { c.kind = b.dataset.kind; c.cat = c.kind === 'card' ? 'card' : (c.cat && c.cat !== 'card' ? c.cat : null); if (c.kind !== 'card') c.series = null;
        $$('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); sub(); prev(); });
      if ($('#ob-file')) { $('#ob-file').onchange = ev => load(ev.target.files[0]);
        const dz = $('#ob-drop'); dz.ondragover = ev => { ev.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over');
        dz.ondrop = ev => { ev.preventDefault(); dz.classList.remove('over'); load(ev.dataTransfer.files[0]); }; }
      $('#ob-name').oninput = ev => { c.name = ev.target.value; prev(); };
      $('#ob-p0').oninput = ev => { c.p0 = Math.round(+ev.target.value || 0); prev(); };
      $$('[data-r]').forEach(b => b.onclick = () => { c.r = b.dataset.r; $$('[data-r]').forEach(x => x.classList.toggle('on', x === b)); prev(); });
      $$('[data-mode]').forEach(b => b.onclick = () => { c.mode = b.dataset.mode; if (c.mode === 'dates' && !c.from) { const [f, t] = [new Date(), new Date(Date.now() + 7 * 864e5)]; c.from = f.toISOString(); c.until = t.toISOString(); }
        $$('[data-mode]').forEach(x => x.classList.toggle('on', x === b)); when(); prev(); });
      $('#ob-back').onclick = $('#ob-cancel').onclick = () => listView();
      if ($('#ob-del')) $('#ob-del').onclick = async () => {
        if (!(await HC.confirm('Retirer « ' + c.name + ' » du jeu ?', 'Il disparaît des boutiques. Les joueurs qui l\'ont déjà le gardent.', 'Retirer', 'red'))) return;
        const next = { ...items }; delete next[c.id]; await publish(next, 'Objet retiré des boutiques'); listView(); };
      if ($('#ob-reset')) $('#ob-reset').onclick = async () => {
        if (!(await HC.confirm('Remettre « ' + o.name + ' » comme avant ?', 'Nom, prix, image et disponibilité reviennent à ceux d\'origine.', 'Remettre', 'red'))) return;
        const next = { ...items }; delete next[c.id]; await publish(next, 'Objet remis comme avant'); listView(); };
      $('#ob-go').onclick = async () => {
        const name = c.name.trim(), p0 = Math.round(+c.p0 || 0);
        if (!name) return HC.toast('Donne-lui un nom', null, true);
        if (!(p0 >= 1)) return HC.toast('Il faut un prix', null, true);
        if (isNew && !c.kind) return HC.toast('Étape 2 : choisis ce que c\'est', null, true);
        if (isNew && !c.cat) return HC.toast(c.kind === 'card' ? 'Étape 2 : choisis la série' : 'Étape 2 : choisis la boutique', null, true);
        if (isCard() && c.custom && !c.series) return HC.toast('Étape 2 : choisis la série', null, true);
        if (isNew && !pending) return HC.toast('Étape 1 : ajoute une image', null, true);
        if (c.mode === 'dates' && !(c.from && c.until && Date.parse(c.until) > Date.parse(c.from))) return HC.toast('Étape 4 : vérifie les dates', null, true);
        const btn = $('#ob-go'); btn.disabled = true;
        try {
          let url = c.img && /^\/media\//.test(c.img) ? c.img : null;
          if (pending) {
            const id0 = isNew ? newId(name) : c.id;
            const data = pending.use ? pending.after : pending.before;
            url = (await HC.api('/admin/api/upload', { data, name: id0 })).url; c.id = id0;
          }
          const avail = c.mode === 'hidden' ? { hidden: true } : c.mode === 'dates' ? { from: c.from, until: c.until, ...(c.tag ? { tag: c.tag } : {}) } : {};
          const next = { ...items };
          if (c.custom) {
            const id1 = c.id || newId(name);
            next[id1] = { new: true, cat: c.cat, ...(isCard() ? { series: c.series } : {}), name, r: c.r, p0, p0first: (items[id1] || {}).p0first || p0, img: url, created: (items[id1] || {}).created || Date.now(), ...avail };
          } else {
            const x = {}; if (name !== o.name) x.name = name; if (p0 !== o.p0) x.p0 = p0; if (c.r !== o.r) x.r = c.r; if (c.cat !== o.cat) x.cat = c.cat; if (url) x.img = url; Object.assign(x, avail);
            if (Object.keys(x).length) next[c.id] = x; else delete next[c.id];
          }
          await publish(next, isNew && isCard() ? 'Nouvelle carte : elle sort des boosters dans la minute' : isNew ? (c.mode === 'dates' && Date.parse(c.from) > Date.now() ? 'Objet programmé : il arrivera tout seul' : 'Nouvel objet en boutique : les joueurs le voient dans la minute') : 'Modifications publiées');
          listView();
        } catch (err) { btn.disabled = false; }
      };
    }
    // un identifiant tiré du nom, jamais déjà pris
    function newId(name) {
      const b = ('n-' + slug(name)).slice(0, 40).replace(/-+$/, '') || 'n-objet'; let id = b, k = 2;
      while (ORIG.has(id) || items[id]) id = b + '-' + k++;
      return id;
    }
    if (P.get('new')) editor(null); else if (P.get('id')) editor(P.get('id')); else listView();
  };

  // ------------------------------------------------------------ retirer le fond blanc (dans le navigateur, avant l'envoi)
  // On part des bords de l'image et on efface tout le blanc qui y touche (le blanc À L'INTÉRIEUR de l'objet reste),
  // puis on adoucit le contour et on recadre au plus près.
  function looksWhite(cv) {
    const { width: w, height: h } = cv, d = cv.getContext('2d').getImageData(0, 0, w, h).data; let n = 0, t = 0;
    const at = (x, y) => { const i = (y * w + x) * 4; t++; if (d[i + 3] > 200 && d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) n++; };
    for (let x = 0; x < w; x += 4) { at(x, 0); at(x, h - 1); } for (let y = 0; y < h; y += 4) { at(0, y); at(w - 1, y); }
    return n / t > .6;
  }
  function removeWhite(cv, tol) {
    const w = cv.width, h = cv.height, ctx = cv.getContext('2d'), id = ctx.getImageData(0, 0, w, h), d = id.data;
    const dist = i => 255 * 3 - d[i] - d[i + 1] - d[i + 2];   // 0 = blanc pur
    const lim = tol * 3, seen = new Uint8Array(w * h), st = [];
    const push = p => { if (!seen[p] && (d[p * 4 + 3] < 20 || dist(p * 4) <= lim)) { seen[p] = 1; st.push(p); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); } for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (st.length) { const p = st.pop(), x = p % w, y = (p / w) | 0; d[p * 4 + 3] = 0;
      if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (y > 0) push(p - w); if (y < h - 1) push(p + w); }
    // contour : les pixels clairs collés au vide deviennent semi-transparents (pas de liseré blanc)
    for (let p = 0; p < w * h; p++) { if (seen[p]) continue; const x = p % w, y = (p / w) | 0;
      if ((x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) || (y > 0 && seen[p - w]) || (y < h - 1 && seen[p + w])) { const k = Math.min(1, dist(p * 4) / (lim * 3 + 1)); d[p * 4 + 3] = Math.round(d[p * 4 + 3] * Math.max(.25, k)); } }
    // recadrage au plus près (avec une petite marge)
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const out = document.createElement('canvas');
    if (x1 < 0) { out.width = w; out.height = h; out.getContext('2d').putImageData(id, 0, 0); return out.toDataURL('image/png'); }
    const m = Math.round(Math.max(x1 - x0, y1 - y0) * .04), tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(id, 0, 0);
    out.width = x1 - x0 + 1 + 2 * m; out.height = y1 - y0 + 1 + 2 * m; out.getContext('2d').drawImage(tmp, x0, y0, x1 - x0 + 1, y1 - y0 + 1, m, m, x1 - x0 + 1, y1 - y0 + 1);
    return out.toDataURL('image/png');
  }
  HC.removeWhite = removeWhite;
})();
