/* Biff City : les objets ajoutés ou modifiés depuis le back office (page « Objets du jeu »).
   Le serveur les envoie avec les réglages en direct (clé « content ») ; on les garde aussi sur l'appareil,
   pour que tout marche hors ligne dès le lancement suivant.
   - un objet existant peut changer de nom, de prix de départ, de rareté, d'image, être caché ou n'être en vente qu'entre deux dates ;
   - un nouvel objet est ajouté à D.ITEMS (custom: true), son image vient du serveur (window.REMOTE_IMG, lu par has()/src() dans ui.js) ;
   - un objet retiré du back office n'est jamais supprimé de l'appareil : il devient caché, et ceux qui l'ont le gardent.
   Chargé juste après data.js, avant game.js. */
(function () {
  'use strict';
  const D = window.DATA; if (!D) return;
  const KEY = 'hustleCity.content';
  const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  // l'adresse du serveur, comme online.js : application (HC_API), jeu servi par le serveur (port 5300), ou réglage « hc.api »
  const API = window.HC_API || (location.port === '5300' ? location.origin : (ls('hc.api') || ''));
  const REMOTE = window.REMOTE_IMG = window.REMOTE_IMG || {};
  const FIELDS = ['name', 'p0', 'r', 'cat', 'hidden', 'from', 'until', 'series'];
  const ORIG = {};   // valeurs d'origine des objets existants modifiés (pour revenir en arrière si la modification est retirée)
  D.ITEMS.forEach(i => { i.p0orig = i.p0; });
  const volOf = cat => { const it = D.ITEMS.find(i => i.cat === cat && !i.custom); return it ? it.vol : .03; };
  const abs = (u, base) => !u ? null : /^(https?:|data:)/.test(u) ? u : (base || '') + u;

  function apply(content, base) {
    const items = (content && content.items) || {};
    // 1. tout remettre comme au départ
    Object.entries(ORIG).forEach(([id, o]) => { const it = D.ITEMS.find(i => i.id === id); if (it) { FIELDS.forEach(k => { delete it[k]; }); Object.assign(it, o.v); } if (o.img) delete REMOTE[o.img]; });
    D.ITEMS.forEach(i => { if (i.custom) i.hidden = true; });   // un objet ajouté puis retiré : caché, mais gardé
    // 2. appliquer le contenu publié
    Object.entries(items).forEach(([id, e]) => {
      if (!e || typeof e !== 'object' || !/^[a-z0-9-]{2,48}$/.test(id)) return;
      let it = D.ITEMS.find(i => i.id === id);
      if (e.new) {
        if (it && !it.custom) return;   // jamais écraser un objet du jeu
        if (!D.ITEM_CATS[e.cat] || e.cat === 'trophy') return;
        if (!it) { it = { id, custom: true }; D.ITEMS.push(it); }
        Object.assign(it, { cat: e.cat, name: String(e.name || id), r: e.r || 'C', p0: +e.p0 || 100, p0orig: +e.p0first || +e.p0 || 100, vol: volOf(e.cat), hidden: !!e.hidden, from: e.from || null, until: e.until || null });
        if (e.cat === 'gold') Object.assign(it, { drift: .000004, revert: 0, cap: 1.6 });
        if (e.cat === 'card') { Object.assign(it, { series: e.series || 'classics', art: 'art-' + id }); if (/^crea-/.test(it.series)) it.kind = 'creature'; else delete it.kind; }
        else { delete it.series; delete it.art; delete it.kind; }
        const u = abs(e.img, base); if (u) { REMOTE['item-' + id] = u; if (e.cat === 'card') REMOTE['art-' + id] = u; }
        return;
      }
      if (!it || it.custom) return;
      const o = ORIG[id] = ORIG[id] || { v: Object.fromEntries(FIELDS.filter(k => k in it).map(k => [k, it[k]])) };
      ['name', 'r', 'hidden', 'from', 'until'].forEach(k => { if (e[k] != null) it[k] = e[k]; });
      if (+e.p0 > 0) it.p0 = +e.p0;
      if (e.cat && D.ITEM_CATS[e.cat] && it.cat !== 'card' && it.cat !== 'trophy' && !['card', 'trophy'].includes(e.cat)) it.cat = e.cat;
      const u = abs(e.img, base); if (u && it.cat !== 'card') { REMOTE['item-' + id] = u; o.img = 'item-' + id; }
    });
  }

  // un objet est en vente / visible : pas caché, et dans ses dates s'il en a
  function avail(i, t) { t = t || Date.now(); return !!i && !i.hidden && (!i.from || t >= Date.parse(i.from)) && (!i.until || t < Date.parse(i.until)); }

  // la partie du joueur suit les changements : nouveaux objets avec une cote, prix de départ changé = cote ajustée d'autant
  function sync(st) {
    if (!st || !st.market) return;
    const mk = st.market, seen = st.p0seen = st.p0seen || {}, keep = st.customItems = st.customItems || {};
    // les objets ajoutés au back office que le joueur possède : leur fiche est gardée DANS sa partie,
    // pour qu'ils existent toujours (appareil changé, partie restaurée, objet retiré entre-temps)
    Object.keys(st.owned || {}).forEach(id => {
      const it = D.ITEMS.find(i => i.id === id);
      if (it && it.custom) keep[id] = { cat: it.cat, name: it.name, r: it.r, p0: it.p0, p0orig: it.p0orig, vol: it.vol, series: it.series, kind: it.kind, art: it.art, img: REMOTE['item-' + id] || null };
      else if (!it && /^n-/.test(id)) {
        const k = keep[id] || { cat: 'gem', name: 'Objet de collection', r: 'C', p0: 100, vol: .02 };
        if (!D.ITEM_CATS[k.cat]) k.cat = 'gem';
        const { img, ...rest } = k;
        D.ITEMS.push({ id, custom: true, hidden: true, ...rest, p0orig: k.p0orig || k.p0 });
        if (img) { REMOTE['item-' + id] = img; if (k.art) REMOTE[k.art] = img; }
      }
    });
    Object.keys(keep).forEach(id => { if (!st.owned[id]) delete keep[id]; });
    D.ITEMS.forEach(i => {
      if (mk.prices[i.id] == null) { mk.prices[i.id] = i.p0; mk.fair[i.id] = i.p0; mk.hist[i.id] = [i.p0]; if (i.p0 !== i.p0orig) seen[i.id] = i.p0; return; }
      const ref = seen[i.id] != null ? seen[i.id] : i.p0orig;
      if (ref > 0 && ref !== i.p0) {
        const k = i.p0 / ref;
        mk.prices[i.id] *= k; mk.fair[i.id] = (mk.fair[i.id] || i.p0) * k; mk.hist[i.id] = (mk.hist[i.id] || []).map(v => +(v * k).toPrecision(4));
      }
      if (i.p0 !== i.p0orig) seen[i.id] = i.p0; else delete seen[i.id];
    });
  }
  // nouvelle partie : les prix partent déjà du bon prix de départ
  function mark(st) { const seen = st.p0seen = {}; D.ITEMS.forEach(i => { if (i.p0 !== i.p0orig) seen[i.id] = i.p0; }); }

  // contenu reçu du serveur : on l'applique et on le garde pour les prochains lancements (même sans réseau)
  // Un objet ajouté puis retiré du back office reste connu de l'appareil (caché) : un joueur qui l'a ne doit jamais le perdre.
  let ghosts = {};
  const withGhosts = (content, gh) => ({ items: { ...gh, ...((content && content.items) || {}) } });
  function receive(content, base) {
    base = base != null ? base : API; content = content || {};
    const items = content.items || {};
    try { const prev = JSON.parse(ls(KEY) || 'null'); if (prev) Object.entries({ ...(prev.ghosts || {}), ...((prev.content || {}).items || {}) }).forEach(([id, e]) => { if (e && e.new && !items[id]) ghosts[id] = { ...e, hidden: true }; }); } catch (e) {}
    Object.keys(items).forEach(id => { delete ghosts[id]; });
    apply(withGhosts(content, ghosts), base);
    try { localStorage.setItem(KEY, JSON.stringify({ base, content, ghosts })); } catch (e) {}
  }

  // au lancement : le dernier contenu connu
  try { const c = JSON.parse(ls(KEY) || 'null'); if (c && c.content) { ghosts = c.ghosts || {}; apply(withGhosts(c.content, ghosts), c.base); } } catch (e) { console.warn('contenu illisible', e); }

  window.CONTENT = { api: API, apply, receive, avail, sync, mark };
})();
