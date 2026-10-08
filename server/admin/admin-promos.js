/* Hustle City · back office : les PROMOS, une par une.
   Une promo = un look de bouton + ce qui est en promo + une remise + des dates. Pendant ses dates, le jeu l'affiche tout seul
   (bouton Promo à gauche de la ville, offre mise en avant dans la boutique). Enregistré dans la config « live » : campaigns.
   Ce qui est en promo (target) : une offre en euros (iap, offer = id de D.IAP), un objet du jeu (item, ref = id, y compris ceux créés
   dans « Objets du jeu »), un booster (booster, ref = lingots | kiosk | all), une déco ou un look de la ville (deco / look, ref = id).
   Le jeu applique la remise au moment de l'achat (js/game.js promoOf) ; le serveur vérifie tout (cleanCampaigns dans server.js). */
(function () {
  'use strict';
  const HC = window.HC, D = HC.D, { $, $$, esc, img, has, src } = HC;
  const LOOKS = [
    { id: 'promo', name: 'Promo', img: 'ic-promo', color: '#ff3cac', label: 'Promo classique' },
    { id: 'halloween', name: 'Halloween', img: 'ic-promo-halloween', color: '#ff7a1a', label: 'Halloween' },
    { id: 'bf', name: 'Black Friday', img: 'ic-promo-bf', color: '#1d1d1f', label: 'Black Friday' },
    { id: 'noel', name: 'Noël', img: 'ic-promo-noel', color: '#d33a2c', label: 'Noël' }
  ];
  const lookOf = id => LOOKS.find(l => l.id === id) || LOOKS[0];
  const lookImg = l => has(l.img) ? l.img : 'ic-promo';
  const IAP = D.IAP || [], X = id => IAP.find(x => x.id === id) || IAP[0];
  const { cash, lingots, short } = HC;
  const PACK_IMG = { 'x-start': 'pack-start', 'x-noads': 'pack-noads', 'x-pass': 'pack-pass', 'x-collec': 'pack-collec', 'x-gold': 'skin-gold', 'x-magnat': 'pack-magnat' };
  const offerImg = x => x.kind === 'lingots' ? (has('shop-lingot-' + (IAP.filter(i => i.kind === 'lingots').indexOf(x) + 1)) ? 'shop-lingot-' + (IAP.filter(i => i.kind === 'lingots').indexOf(x) + 1) : 'icon-lingot')
    : HC.first(PACK_IMG[x.id], x.give && x.give.boosters ? 'booster-pack' : null, 'bonus-lingots', 'gift-big');
  const priceN = x => parseFloat(String(x.price).replace(',', '.')) || 0;
  const eur = v => (Math.floor(v * 100 + 1e-6) / 100).toFixed(2).replace('.', ',') + ' €';
  const pad = n => String(n).padStart(2, '0');
  const toLocal = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fromLocal = v => v ? new Date(v).toISOString() : null;
  const when = iso => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const state = c => { const t = Date.now(), a = Date.parse(c.start), b = Date.parse(c.end); return !c.on ? 'off' : t < a ? 'soon' : t < b ? 'live' : 'done'; };
  const STATE = { live: ['En cours', 'ok'], soon: ['À venir', 'blue'], done: ['Terminée', ''], off: ['En pause', 'warn'] };
  const remise = c => c.kind === 'bonus' ? `+${c.value} % de lingots` : `−${c.value} %`;

  // ---- tout ce qui s'achète dans le jeu (objets des boutiques, y compris ceux ajoutés par elle, boosters, décos, looks)
  const CATS = D.ITEM_CATS || {}, SHOPN = { comptoir: 'Le Comptoir', bijou: 'Bijouterie Diamant', garage: 'Garage Prestige' };
  const KB = (D.KIOSK || {}).booster || { base: 150, perLvl: 30, lvl: 2 };
  const BOOST = [{ id: 'lingots', name: 'Booster en lingots', sub: 'acheté dans les Boosters' }, { id: 'kiosk', name: 'Booster du Kiosque', sub: 'en billets, selon le niveau' }, { id: 'all', name: 'Tous les boosters', sub: 'lingots et Kiosque' }];
  const LOOKS_C = (D.CITY_LOOKS || []).filter(L => L.id !== 'base'), DECOS = D.CITY_SHOP || [];
  let CONTENT = {}, ITEMS = [];   // objets ajoutés / modifiés au back office (config live content.items), et la liste de tous les objets en vente
  const loadItems = content => { CONTENT = (content && content.items) || {};
    ITEMS = [...Object.entries(CONTENT).filter(([, e]) => e && e.new && e.cat !== 'trophy').map(([id, e]) => ({ id, ...e, custom: true })),
      ...(D.ITEMS || []).filter(i => i.cat !== 'trophy' && (!i.needArt || has(i.needArt))).map(i => ({ ...i, ...(CONTENT[i.id] && !CONTENT[i.id].new ? CONTENT[i.id] : {}) }))]; };
  const itemOf = id => ITEMS.find(i => i.id === id);
  const itemPic = it => { const u = it.img && /^\/media\//.test(it.img) ? it.img : (n => n ? src(n) : null)([it.cat === 'card' && it.art && 'full-' + it.art.replace(/^art-/, ''), it.art, it.img, 'item-' + it.id].find(x => x && has(x)));
    return u ? `<img src="${esc(u)}" alt="" loading="lazy">` : `<span class="pm-emo">${(CATS[it.cat] || {}).icon || '❔'}</span>`; };
  const shopOf = it => it.cat === 'card' ? 'Le Comptoir (cartes)' : SHOPN[(CATS[it.cat] || {}).shop] || 'Le Comptoir';
  const cut = (n, v) => Math.max(1, Math.ceil(n * (1 - v / 100)));
  const avail = it => { const t = Date.now(); return !it.hidden && (!it.from || t >= Date.parse(it.from)) && (!it.until || t < Date.parse(it.until)); };
  // ce qui est en promo, pour l'affichage : nom, image, prix avant (html), prix après (html), où ça s'achète
  function T(c) {
    const t = c.target || 'iap', v = +c.value || 0;
    if (t === 'iap') { const x = X(c.offer); return { name: x.name, pic: img(offerImg(x)), old: esc(x.price), now: eur(priceN(x) * (1 - v / 100)), where: 'Boutique · Lingots & exclus', x }; }
    if (t === 'item') { const it = itemOf(c.ref); if (!it) return { name: 'Objet introuvable', pic: '<span class="pm-emo">❔</span>', old: '–', now: '–', where: '', missing: true };
      const p = Math.ceil((+it.p0 || 0) * 1.05); return { name: it.name, pic: itemPic(it), old: '≈ ' + cash(p), now: '≈ ' + cash(cut(p, v)), where: shopOf(it), approx: true, it }; }
    if (t === 'booster') { const b = BOOST.find(x => x.id === c.ref) || BOOST[0], k10 = KB.base + KB.perLvl * 10, cost = (D.BOOSTER || {}).cost || 12;
      const old = b.id === 'kiosk' ? cash(k10) + ' <small>(niv. 10)</small>' : lingots(cost) + (b.id === 'all' ? ' / ' + cash(k10) : ''), now = b.id === 'kiosk' ? cash(cut(k10, v)) : lingots(cut(cost, v)) + (b.id === 'all' ? ' / ' + cash(cut(k10, v)) : '');
      return { name: b.name, pic: img('booster-pack') || '<span class="pm-emo">🃏</span>', old, now, where: b.id === 'kiosk' ? 'Le Kiosque' : b.id === 'all' ? 'Boosters et Kiosque' : 'Boosters' }; }
    const L = (t === 'look' ? LOOKS_C : DECOS).find(x => x.id === c.ref); if (!L) return { name: 'Introuvable', pic: '<span class="pm-emo">❔</span>', old: '–', now: '–', where: '', missing: true };
    const pr = n => L.lingots ? lingots(n) : cash(n), base = L.lingots || L.cash || 0;
    return { name: L.name, pic: t === 'look' ? (img('bg-city-' + L.id) || img('bg-city')) : (img('deco-' + L.id) || `<span class="pm-emo">${L.emo || '🏙️'}</span>`), old: pr(base), now: pr(cut(base, v)), where: t === 'look' ? 'Boutique · Ma ville (look du quartier)' : 'Boutique · Ma ville (déco)' };
  }
  const autoTitle = c => { if ((c.target || 'iap') !== 'iap') return `${T(c).name} à −${c.value}\u00a0%`; const x = X(c.offer); return c.kind === 'bonus' ? `${x.name} +${c.value}\u00a0%` : `${x.name} à −${c.value}\u00a0%`; };
  const autoDesc = c => { if ((c.target || 'iap') !== 'iap') return `En vente : ${T(c).where}, pendant la promo seulement`; const x = X(c.offer); return c.kind === 'bonus' ? `${Math.round(x.n * (1 + c.value / 100)).toLocaleString('fr-FR')} lingots au lieu de ${x.n.toLocaleString('fr-FR')}` : (x.desc || `${x.n} lingots`); };

  // les 3 saisons de l'année, préparées la première fois (à vérifier, puis elles tournent seules)
  function seed() {
    const y = new Date().getFullYear(), at = (m, d, h = 0) => new Date(y, m - 1, d, h).toISOString();
    const bf = (() => { const d = new Date(y, 10, 1); return new Date(y, 10, (4 - d.getDay() + 7) % 7 + 1 + 21 + 1); })();
    const bfEnd = new Date(bf); bfEnd.setDate(bfEnd.getDate() + 4);
    return [
      { id: 'c-halloween-' + y, look: 'halloween', name: 'Halloween', offer: 'x-collec', kind: 'off', value: 40, start: at(10, 24), end: at(11, 1), on: true, title: 'Boosters de l\'horreur : −40 %', desc: '20 boosters de cartes et 150 lingots, juste avant Halloween' },
      { id: 'c-bf-' + y, look: 'bf', name: 'Black Friday', offer: 'x-pass', kind: 'off', value: 60, start: bf.toISOString(), end: bfEnd.toISOString(), on: true, title: 'Black Friday : Pass Hustle −60 %', desc: '150 lingots, puis 15 lingots et 1 booster par jour pendant 30 jours' },
      { id: 'c-noel-' + y, look: 'noel', name: 'Noël', offer: 'l-1300', kind: 'bonus', value: 50, start: at(12, 15), end: at(12, 27), on: true, title: 'Coffre de Noël : +50 % de lingots', desc: '1 950 lingots au lieu de 1 300' }
    ];
  }

  HC.PAGES.promos = async (P) => {
    const cfg = await HC.api('/admin/api/config');
    loadItems(cfg.content);
    const seeded = !Array.isArray(cfg.campaigns);
    let list = seeded ? seed() : cfg.campaigns.map(c => ({ ...c }));
    let edit = null;   // la promo en cours de modification (copie)

    async function save(msg) {
      const c = await HC.api('/admin/api/config');   // on repart de la config la plus récente (pour ne rien écraser d'autre)
      // une seule façon de faire des promos : les anciennes « saisons » et « offres du jour » sont coupées
      await HC.api('/admin/api/config', { ...c, campaigns: list, seasons: [], promoDays: [] });
      HC.toast(msg || 'Publié : les joueurs le voient dans la minute', 'icon-check');
    }

    function row(c) {
      const l = lookOf(c.look), d = T(c), s = state(c), [sl, sc] = STATE[s];
      return `<div class="pm-row ${s}" style="--pm:${l.color}"><div class="pm-look">${img(lookImg(l))}</div>
        <div class="pm-main"><div class="pm-top"><b>${esc(c.name || l.name)}</b><span class="tag ${sc}">${sl}</span></div>
          <div class="pm-offer">${d.pic}<span><b>${esc(remise(c))}</b> sur ${esc(d.name)} <small>(${d.old})</small>${(c.target || 'iap') !== 'iap' ? ' <span class="tag">dans le jeu</span>' : ''}</span></div>
          <div class="pm-dates">${esc(when(c.start))} → ${esc(when(c.end))}</div></div>
        <div class="pm-acts"><button class="btn sm" data-edit="${esc(c.id)}">Modifier</button>
          ${s === 'live' ? `<button class="btn sm red" data-stop="${esc(c.id)}">Arrêter</button>` : s === 'off' ? `<button class="btn sm green" data-resume="${esc(c.id)}">Réactiver</button>` : ''}
          <button class="btn sm ghost" data-dup="${esc(c.id)}">Dupliquer</button><button class="btn sm ghost" data-del="${esc(c.id)}">Supprimer</button></div></div>`;
    }

    function listView() {
      const by = k => list.filter(c => state(c) === k).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
      const live = by('live'), soon = by('soon').concat(by('off')), done = by('done').reverse();
      const cur = live[0];
      HC.main(`<div class="page-head"><div><h1>Promos</h1><div class="sub">Une promo = un look de bouton, ce qui est en promo (offre en euros, objet, booster, déco…), une remise et des dates. Pendant ses dates, elle s'affiche toute seule dans le jeu. Rien d'autre à faire.</div></div>
          <button class="btn lg green" id="pm-new">+ Nouvelle promo</button></div>
        ${seeded ? `<div class="card pm-note">${img('ic-promo')}<div><b>Je t'ai préparé les 3 promos de l'année</b><p class="help">Halloween, Black Friday et Noël, avec les mêmes offres qu'avant. Vérifie-les, modifie si besoin, puis clique sur « Publier » pour les activer.</p></div><button class="btn green" id="pm-seed">Publier ces 3 promos</button></div>` : ''}
        <div class="card pm-now" style="--pm:${cur ? lookOf(cur.look).color : '#3a2d66'}"><div class="card-h">${img('ic-promo')}En ce moment dans le jeu</div>
          ${cur ? `<div class="pm-now-in"><div class="pm-btn-prev" style="--pm:${lookOf(cur.look).color}"><span>${esc((cur.name || lookOf(cur.look).name).toUpperCase())}</span>${img(lookImg(lookOf(cur.look)))}</div>
            <div><b>${esc(cur.title || autoTitle(cur))}</b><p class="help">Jusqu'au ${esc(when(cur.end))}. Les joueurs voient le bouton ${esc(cur.name || '')} et l'offre en haut de la boutique.</p></div><button class="btn red" data-stop="${esc(cur.id)}">Arrêter</button></div>`
            : '<p class="help">Aucune promo en cours : le bouton de la ville montre la boutique normale (lingots et Ma ville).</p>'}</div>
        <h2 class="pm-h">À venir</h2>${soon.length ? soon.map(row).join('') : '<p class="help">Aucune promo prévue. Clique sur « + Nouvelle promo ».</p>'}
        ${live.length > 1 ? `<h2 class="pm-h">Aussi en cours</h2>${live.slice(1).map(row).join('')}<p class="help">Toutes les remises en cours s'appliquent. Le bouton de la ville et le haut de la boutique montrent celle qui a commencé en premier, les autres sont listées juste en dessous (« En promo dans le jeu »).</p>` : ''}
        ${done.length ? `<details class="pm-done"><summary>Terminées (${done.length})</summary>${done.map(row).join('')}</details>` : ''}`);
      $('#pm-new').onclick = () => { const s = new Date(); s.setMinutes(0, 0, 0); const e = new Date(s.getTime() + 3 * 864e5);
        editor({ id: 'c' + Date.now().toString(36), look: 'promo', name: 'Promo', offer: 'l-600', kind: 'off', value: 30, start: s.toISOString(), end: e.toISOString(), on: true, title: '', desc: '' }, true); };
      if ($('#pm-seed')) $('#pm-seed').onclick = async () => { await save('Les 3 promos de l\'année sont publiées'); HC.route(); };
      const find = id => list.find(c => c.id === id);
      $$('[data-edit]').forEach(b => b.onclick = () => editor({ ...find(b.dataset.edit) }, false));
      $$('[data-dup]').forEach(b => b.onclick = () => { const c = find(b.dataset.dup); editor({ ...c, id: 'c' + Date.now().toString(36), name: (c.name || '') + ' (copie)' }, true); });
      $$('[data-stop]').forEach(b => b.onclick = async () => { const c = find(b.dataset.stop); if (!(await HC.confirm('Arrêter « ' + (c.name || 'la promo') + ' » ?', 'Elle disparaît du jeu dans la minute. Tu pourras la réactiver.', 'Arrêter', 'red'))) return; c.on = false; await save('Promo arrêtée'); listView(); });
      $$('[data-resume]').forEach(b => b.onclick = async () => { find(b.dataset.resume).on = true; await save('Promo réactivée'); listView(); });
      $$('[data-del]').forEach(b => b.onclick = async () => { const c = find(b.dataset.del); if (!(await HC.confirm('Supprimer « ' + (c.name || 'la promo') + ' » ?', 'Elle est retirée pour de bon.', 'Supprimer', 'red'))) return; list = list.filter(x => x !== c); await save('Promo supprimée'); listView(); });
    }

    function editor(c, isNew) {
      edit = c; c.target = c.target || 'iap';
      let tab = c.target === 'look' ? 'deco' : c.target, q = '';
      const TABS = [['iap', 'Offres en euros'], ['item', 'Objets spéciaux'], ['deco', 'Décos & looks exclusifs']];   // jamais les objets normaux du jeu ni les boosters : les promos, c'est pour les offres et les exclusivités
      HC.main(`<div class="page-head"><div><h1>${isNew ? 'Nouvelle promo' : 'Modifier la promo'}</h1><div class="sub">4 étapes, l'aperçu du jeu se met à jour à droite.</div></div><button class="btn ghost" id="pm-back">← Retour aux promos</button></div>
        <div class="pm-ed"><div class="pm-steps">
          <section class="card pm-step"><div class="pm-sn">1</div><div class="pm-sb"><h3>Le look du bouton</h3><p class="help">L'image et la couleur du bouton Promo, dans la ville.</p>
            <div class="pm-looks">${LOOKS.map(l => `<button class="pm-pick look ${c.look === l.id ? 'on' : ''}" data-look="${l.id}" style="--pm:${l.color}">${img(lookImg(l))}<b>${l.label}</b>${has(l.img) ? '' : '<small>image à venir</small>'}</button>`).join('')}</div>
            <div class="fld" style="margin-top:12px"><label for="pm-name">Nom écrit sur le bouton</label><input id="pm-name" value="${esc(c.name || '')}" maxlength="14"></div></div></section>
          <section class="card pm-step"><div class="pm-sn">2</div><div class="pm-sb"><div class="pm-h3"><h3>Ce qui est en promo</h3><button class="btn sm" id="pm-create">${img('icon-gift')}Créer un objet spécial</button></div>
            <p class="help">Une offre en euros, ou n'importe quoi qui s'achète dans le jeu : la remise s'applique pour de vrai à l'achat.</p>
            <div class="chips pm-tabs">${TABS.map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
            <div id="pm-area" style="margin-top:12px"></div><p class="help" id="pm-sel"></p></div></section>
          <section class="card pm-step"><div class="pm-sn">3</div><div class="pm-sb"><h3>La remise</h3>
            <div class="pm-kind"><button class="chip ${c.kind === 'off' ? 'on' : ''}" data-kind="off">Prix réduit</button><button class="chip ${c.kind === 'bonus' ? 'on' : ''}" data-kind="bonus" ${bonusOk() ? '' : 'disabled title="Seulement pour les lingots en euros"'}>Lingots en plus</button></div>
            <div class="pm-vals" id="pm-vals"></div><p class="pm-calc" id="pm-calc"></p></div></section>
          <section class="card pm-step"><div class="pm-sn">4</div><div class="pm-sb"><h3>Les dates</h3>
            <div class="chips"><button class="chip" data-quick="24h">Maintenant, 24 h</button><button class="chip" data-quick="3d">Maintenant, 3 jours</button><button class="chip" data-quick="7d">Maintenant, 1 semaine</button><button class="chip" data-quick="we">Ce week-end</button></div>
            <div class="row2" style="margin-top:12px"><div class="fld"><label for="pm-s">Début</label><input type="datetime-local" id="pm-s" value="${toLocal(c.start)}"></div><div class="fld"><label for="pm-e">Fin</label><input type="datetime-local" id="pm-e" value="${toLocal(c.end)}"></div></div>
            <p class="help" id="pm-dur"></p></div></section>
          <details class="card pm-txt"><summary>Texte de l'offre (facultatif, écrit tout seul sinon)</summary>
            <div class="fld" style="margin-top:12px"><label for="pm-t">Titre</label><input id="pm-t" value="${esc(c.title || '')}" placeholder="${esc(autoTitle(c))}"></div>
            <div class="fld"><label for="pm-d">Description</label><input id="pm-d" value="${esc(c.desc || '')}" placeholder="${esc(autoDesc(c))}"></div></details>
          <div class="pm-save"><button class="btn ghost" id="pm-cancel">Annuler</button><button class="btn lg green" id="pm-go">${img('icon-check')}${isNew ? 'Programmer la promo' : 'Enregistrer'}</button></div>
        </div>
        <aside class="pm-prev" id="pm-prev"></aside></div>`);
      // ---- étape 2 : le choix (onglets)
      function bonusOk() { return c.target === 'iap' && X(c.offer).kind === 'lingots'; }
      const pickBtn = (key, on, pic, name, sub, extra = '') => `<button class="pm-pick ${on ? 'on' : ''}" data-pick="${esc(key)}">${pic}<b>${esc(name)}</b><small>${sub}</small>${extra}</button>`;
      function area() {
        const el = $('#pm-area'); let h = '';
        if (tab === 'iap') h = `<div class="pm-offers">${IAP.map(x => pickBtn('iap:' + x.id, c.target === 'iap' && c.offer === x.id, img(offerImg(x)), x.name, esc(x.price))).join('')}</div>`;
        else if (tab === 'item') {
          const qq = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const L = ITEMS.filter(it => it.custom && (!qq || norm(it.name).includes(qq))), sel = c.target === 'item' ? itemOf(c.ref) : null, shown = (sel && !L.slice(0, 48).includes(sel) ? [sel] : []).concat(L.slice(0, 48));
          h = `<input type="search" id="pm-q" placeholder="Chercher un objet spécial…" value="${esc(q)}" style="width:100%;margin-bottom:10px">
            <div class="pm-offers pm-items">${shown.map(it => pickBtn('item:' + it.id, sel === it, itemPic(it), it.name, `≈ ${cash(Math.ceil((+it.p0 || 0) * 1.05))} · ${esc(shopOf(it))}`, (it.custom ? '<span class="tag pink">Ajouté</span>' : '') + (avail(it) ? '' : '<span class="tag">pas en vente</span>'))).join('') || '<p class="help">Aucun objet spécial pour l\'instant : crée-le avec « Créer un objet spécial ».</p>'}</div>
            ${L.length > 48 ? `<p class="help">${L.length - 48} autres objets : tape une partie du nom pour les trouver.</p>` : ''}`;
        } else if (tab === 'booster') h = `<div class="pm-offers">${BOOST.map(b => pickBtn('booster:' + b.id, c.target === 'booster' && c.ref === b.id, img('booster-pack') || '🃏', b.name, esc(b.sub))).join('')}</div>`;
        else h = `<div class="ob-sl">Looks du quartier</div><div class="pm-offers">${LOOKS_C.map(L => pickBtn('look:' + L.id, c.target === 'look' && c.ref === L.id, img('bg-city-' + L.id) || img('bg-city'), L.name, L.lingots ? lingots(L.lingots) : cash(L.cash))).join('')}</div>
          <div class="ob-sl" style="margin-top:12px">Décos de la ville</div><div class="pm-offers">${DECOS.map(x => pickBtn('deco:' + x.id, c.target === 'deco' && c.ref === x.id, img('deco-' + x.id) || `<span class="pm-emo">${x.emo || '🏙️'}</span>`, x.name, x.lingots ? lingots(x.lingots) : cash(x.cash))).join('')}</div>`;
        el.innerHTML = h;
        if ($('#pm-q')) $('#pm-q').oninput = e => { q = e.target.value; const y = e.target.selectionStart; area(); const i = $('#pm-q'); i.focus(); i.setSelectionRange(y, y); };
        $$('[data-pick]', el).forEach(b => b.onclick = () => pick(b.dataset.pick));
        const d = T(c); $('#pm-sel').innerHTML = d.missing ? '<span style="color:var(--red)">Choisis ce qui est en promo.</span>' : `En promo : <b>${esc(d.name)}</b> · ${esc(d.where)}`;
      }
      function pick(key) {
        const [t, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)], was = (c.target || 'iap') + ':' + (c.target === 'iap' ? c.offer : c.ref);
        if (was !== key) resetTxt();
        c.target = t; if (t === 'iap') { c.offer = id; delete c.ref; } else c.ref = id;
        if (!bonusOk() && c.kind === 'bonus') { c.kind = 'off'; c.value = 30; }
        const kb = $('[data-kind="bonus"]'); kb.disabled = !bonusOk(); $$('[data-kind]').forEach(x => x.classList.toggle('on', x.dataset.kind === c.kind));
        $('#pm-t').placeholder = autoTitle(c); $('#pm-d').placeholder = autoDesc(c); area(); vals(); prev();
      }
      const vals = () => { const L = c.kind === 'bonus' ? [10, 20, 30, 50, 75, 100] : [10, 20, 30, 40, 50, 60, 70];
        $('#pm-vals').innerHTML = L.map(v => `<button class="chip ${+c.value === v ? 'on' : ''}" data-val="${v}">${c.kind === 'bonus' ? '+' : '−'}${v} %</button>`).join('') + `<input type="number" id="pm-v" min="5" max="${c.kind === 'bonus' ? 300 : 90}" value="${esc(c.value)}" aria-label="Autre valeur">`;
        $$('[data-val]').forEach(b => b.onclick = () => { c.value = +b.dataset.val; fixVal(); vals(); prev(); });
        $('#pm-v').oninput = e => { c.value = Math.min(c.kind === 'bonus' ? 300 : 90, Math.max(5, +e.target.value || 0)); fixVal(); $$('[data-val]').forEach(b => b.classList.toggle('on', +b.dataset.val === c.value)); prev(); }; };
      const prev = () => {
        const l = lookOf(c.look), d = T(c), x = d.x, a = Date.parse(c.start), b = Date.parse(c.end), days = (b - a) / 864e5;
        $('#pm-calc').innerHTML = c.kind === 'bonus' && x ? `${x.n.toLocaleString('fr-FR')} lingots → <b>${Math.round(x.n * (1 + c.value / 100)).toLocaleString('fr-FR')} lingots</b> pour ${esc(x.price)}`
          : `${d.old} → <b>${d.now}</b>${d.approx ? '<br><small>Le prix de l\'objet suit sa cote du jour : la remise s\'applique sur le prix du moment.</small>' : ''}`;
        $('#pm-dur').innerHTML = b > a ? `Dure <b>${days >= 1 ? Math.round(days * 10) / 10 + ' jour' + (days >= 2 ? 's' : '') : Math.round(days * 24) + ' h'}</b>. ${Date.now() > b ? '<span style="color:var(--red)">Déjà finie : change la fin.</span>' : Date.now() >= a ? 'Elle démarre dès que tu enregistres.' : 'Elle démarre toute seule le ' + esc(when(c.start)) + '.'}` : '<span style="color:var(--red)">La fin doit être après le début.</span>';
        const title = c.title || autoTitle(c), desc = c.desc || autoDesc(c), price = c.kind === 'off' ? `<s>${d.old}</s> ${d.now}` : d.old;
        $('#pm-prev').innerHTML = `<div class="prev-lbl">Ce que voit le joueur</div>
          <div class="pm-city">${img('bg-city')}<div class="pm-btn-prev big" style="--pm:${l.color}"><span>${esc((c.name || l.name).toUpperCase())}</span>${img(lookImg(l))}<i>${b - Date.now() > 1728e5 ? Math.floor((b - Date.now()) / 864e5) + ' j' : '1 j'}</i></div><small>Le bouton, en haut à gauche de la ville</small></div>
          <div class="pm-hero" style="--pm:${l.color}"><span class="pm-for">★ Spécial ${esc(c.name || l.name)}</span>
            <div class="pm-hr"><div class="pm-ha">${d.pic}<i>${esc(remise(c).replace(' de lingots', ''))}</i></div><div><b>${esc(title)}</b><small>${esc(desc)}</small></div></div>
            <div class="pm-hb">${price}</div><small class="pm-hl">⏱ Finit dans ${days >= 2 ? Math.round(days) + ' jours' : Math.round(days * 24) + ' h'}</small></div>
          <small class="help">${x ? 'L\'offre s\'affiche en haut de la boutique, à la couleur de la promo.' : `L'offre s'affiche en haut de la boutique, et dans ${esc(d.where)} : prix barré, nouveau prix et badge « Promo ».`}</small>`;
      };
      area(); vals(); prev();
      $$('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; $$('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); area(); });
      // un nouvel objet à vendre pendant la promo : on le crée dans « Objets du jeu », puis on revient ici avec lui déjà choisi
      $('#pm-create').onclick = () => { try { sessionStorage.setItem('hc.pm.draft', JSON.stringify({ c, isNew })); } catch (e) {} HC.go('items', { new: 1, back: 'promos' }); };
      $$('[data-look]').forEach(b => b.onclick = () => { const was = lookOf(c.look); c.look = b.dataset.look; if (!c.name || c.name === was.name) { c.name = lookOf(c.look).name; $('#pm-name').value = c.name; } $$('[data-look]').forEach(x => x.classList.toggle('on', x === b)); prev(); });
      $('#pm-name').oninput = e => { c.name = e.target.value; prev(); };
      $$('[data-kind]').forEach(b => b.onclick = () => { if (b.disabled) return; if (c.kind !== b.dataset.kind) resetTxt(); c.kind = b.dataset.kind; c.value = c.kind === 'bonus' ? 30 : 30; $$('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); $('#pm-t').placeholder = autoTitle(c); $('#pm-d').placeholder = autoDesc(c); vals(); prev(); });
      const setDates = (a, b) => { c.start = a.toISOString(); c.end = b.toISOString(); $('#pm-s').value = toLocal(c.start); $('#pm-e').value = toLocal(c.end); prev(); };
      $$('[data-quick]').forEach(b => b.onclick = () => { const n = new Date(), q = b.dataset.quick;
        if (q === 'we') { const f = new Date(n); f.setDate(n.getDate() + ((5 - n.getDay() + 7) % 7)); f.setHours(18, 0, 0, 0); const s = new Date(f); s.setDate(f.getDate() + 2); s.setHours(23, 59, 0, 0); return setDates(f < n ? n : f, s); }
        setDates(n, new Date(n.getTime() + { '24h': 864e5, '3d': 3 * 864e5, '7d': 7 * 864e5 }[q])); });
      $('#pm-s').onchange = e => { c.start = fromLocal(e.target.value); prev(); };
      $('#pm-e').onchange = e => { c.end = fromLocal(e.target.value); prev(); };
      // texte écrit pour une autre offre : il repart en automatique (titre et description suivent la nouvelle offre)
      function resetTxt() { c.title = ''; c.desc = ''; $('#pm-t').value = ''; $('#pm-d').value = ''; }
      // la remise change : on corrige le chiffre dans un titre écrit à la main (ex. « −40 % » → « −30 % »)
      const fixVal = () => { if (c.title) { c.title = c.title.replace(/[−-]\s?\d+\s?%/, `−${c.value} %`).replace(/\+\s?\d+\s?%/, `+${c.value} %`); $('#pm-t').value = c.title; } };
      $('#pm-t').oninput = e => { c.title = e.target.value; prev(); };
      $('#pm-d').oninput = e => { c.desc = e.target.value; prev(); };
      $('#pm-back').onclick = $('#pm-cancel').onclick = () => listView();
      $('#pm-go').onclick = async () => {
        if (!(Date.parse(c.end) > Date.parse(c.start))) return HC.toast('La fin doit être après le début', null, true);
        if (Date.parse(c.end) < Date.now()) return HC.toast('Cette promo est déjà finie : change la date de fin', null, true);
        if (T(c).missing) return HC.toast('Étape 2 : choisis ce qui est en promo', null, true);
        if (c.target !== 'iap') c.kind = 'off';
        const out = { ...c, title: c.title || autoTitle(c), desc: c.desc || autoDesc(c), value: Math.min(c.kind === 'bonus' ? 300 : 90, Math.max(5, Math.round(+c.value) || 5)) };
        const i = list.findIndex(x => x.id === c.id); if (i >= 0) list[i] = out; else list.push(out);
        await save(Date.now() >= Date.parse(c.start) ? 'Promo en ligne : les joueurs la voient dans la minute' : 'Promo programmée : elle démarrera toute seule');
        if (P.get('pick') || P.get('resume')) return HC.go('promos');
        listView();
      };
    }
    // retour de « Créer un objet spécial » : on reprend la promo en cours, avec le nouvel objet déjà choisi
    let draft = null; try { draft = JSON.parse(sessionStorage.getItem('hc.pm.draft') || 'null'); sessionStorage.removeItem('hc.pm.draft'); } catch (e) {}
    if (draft && draft.c && (P.get('pick') || P.get('resume'))) { const c = draft.c; if (P.get('pick') && itemOf(P.get('pick'))) { c.target = 'item'; c.ref = P.get('pick'); delete c.offer; c.kind = 'off'; c.title = ''; c.desc = ''; } editor(c, draft.isNew); }
    else listView();
  };
})();
