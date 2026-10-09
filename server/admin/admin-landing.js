/* Biff City · back office : la page LANDING, un éditeur à la Shopify pour la vitrine biffcity.fr.
   À gauche les blocs (textes, images, bannières, cartes), à droite l'aperçu en direct (mobile ou ordinateur), « Publier » met en ligne.
   Les images se choisissent dans la bibliothèque du jeu (window.ASSETS, /js/assets.js) ou parmi celles envoyées (/media/…).
   Serveur : GET/POST /admin/api/landing, POST /admin/api/landing-preview (landing/render.js fait la page des deux côtés). */
(function () {
  'use strict';
  const HC = window.HC, { $, $$, esc } = HC;
  const JPG = new Set(window.ASSETS_JPG || []), WEBP = new Set(window.ASSETS_WEBP || []);
  const fileOf = n => `/assets/img/${n}.${JPG.has(n) ? 'jpg' : WEBP.has(n) ? 'webp' : 'png'}`;
  const COLORS = [['new', 'Rose', '#ff3cac'], ['live', 'Vert', '#3fae2e'], ['ev', 'Orange', '#e8743a'], ['soon', 'Violet', '#6b5bd6']];
  const POS = [['50% 15%', 'Haut'], ['50% 35%', 'Un peu haut'], ['50% 50%', 'Centre'], ['50% 70%', 'Un peu bas'], ['50% 90%', 'Bas']];
  // rayons de la bibliothèque : on range les images du jeu par famille de nom
  const SHELVES = [
    ['scenes', 'Scènes', n => /^(bg-|club-(?!p)|load-|room-|ev-cdm-bg|card-bg|tkbg-|art-|parking-bg)/.test(n)],
    ['persos', 'Personnages', n => /^(skin-|clubp-)/.test(n)],
    ['icones', 'Icônes et objets', n => true]
  ];
  let C = null, saved = '', media = [], dev = HC.lsGet('hc.lp.dev') || 'm', timer = 0, open = HC.lsGet('hc.lp.open') || 'hero';

  const dirty = () => JSON.stringify(C) !== saved;
  const at = (path, v) => { const k = path.split('.'); let o = C; while (k.length > 1) o = o[k.shift()]; if (v === undefined) return o[k[0]]; o[k[0]] = v; };

  // ------------------------------------------------------------ champs
  const txt = (path, label, o = {}) => `<label class="lp-f"><span>${label}${o.max ? `<i>${(at(path) || '').length}/${o.max}</i>` : ''}</span>${o.area
    ? `<textarea data-k="${path}" rows="${o.rows || 3}" maxlength="${o.max || 400}">${esc(at(path))}</textarea>`
    : `<input data-k="${path}" value="${esc(at(path))}" maxlength="${o.max || 120}">`}</label>`;
  const pic = (path, label, o = {}) => `<div class="lp-f"><span>${label}</span><button class="lp-pic ${o.tall ? 'tall' : ''}" data-pick="${path}" data-shelf="${o.shelf || 'scenes'}" ${o.pos ? `style="background-position:${esc(at(o.pos))}"` : ''}><img src="${esc(at(path))}" alt="" ${o.pos ? `style="object-position:${esc(at(o.pos))}"` : ''}><em>Changer</em></button></div>`;
  const sel = (path, label, opts) => `<label class="lp-f"><span>${label}</span><select data-k="${path}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${at(path) === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const color = path => `<div class="lp-f"><span>Couleur de l'étiquette</span><div class="lp-cols">${COLORS.map(([v, t, c]) => `<button class="${at(path) === v ? 'on' : ''}" data-col="${path}" data-v="${v}" style="--c:${c}" title="${t}"></button>`).join('')}</div></div>`;
  const dtl = v => { if (!v) return ''; const d = new Date(v); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const when = (path, label) => `<label class="lp-f"><span>${label}</span><input type="datetime-local" data-dt="${path}" value="${dtl(at(path))}"></label>`;

  const block = (id, title, sub, inner) => `<section class="lp-blk ${open === id ? 'open' : ''}" data-blk="${id}"><button class="lp-bh" data-tog="${id}"><b>${title}</b><small>${sub}</small><i></i></button><div class="lp-bb">${inner}</div></section>`;
  const listTools = (list, i, n) => `<div class="lp-it-tools"><button class="btn ghost sm" data-mv="${list}" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'}>↑</button><button class="btn ghost sm" data-mv="${list}" data-i="${i}" data-d="1" ${i < n - 1 ? '' : 'disabled'}>↓</button><button class="btn ghost sm" data-dup="${list}" data-i="${i}">Dupliquer</button><button class="btn ghost sm lp-del" data-del="${list}" data-i="${i}">Supprimer</button></div>`;

  function form() {
    const A = C.actus.items, B = C.bientot.items;
    return [
      block('hero', 'En-tête', 'Image, slogan, bouton', pic('hero.img', 'Image principale', { tall: true }) + txt('hero.slogan', 'Slogan', { max: 60 }) + `<div class="lp-2">${txt('hero.cta', 'Texte du bouton', { max: 30 })}${txt('hero.ctaNote', 'Sous le bouton', { max: 120 })}</div>` + txt('hero.soon', 'Titre', { max: 60 }) + txt('hero.lead', 'Présentation', { area: true, max: 400 })),
      block('feats', 'Les 3 atouts', 'Les cartes sous la présentation', C.feats.map((f, i) => `<div class="lp-it"><div class="lp-it-h">Atout ${i + 1}</div><div class="lp-row">${pic(`feats.${i}.img`, 'Icône', { shelf: 'icones' })}<div>${txt(`feats.${i}.title`, 'Titre', { max: 30 })}${txt(`feats.${i}.text`, 'Texte', { max: 120 })}</div></div></div>`).join('')),
      block('actus', 'Actualités', `${A.length} bannière${A.length > 1 ? 's' : ''} qui défilent`, txt('actus.title', 'Titre de la section', { max: 40 }) + A.map((x, i) => `<div class="lp-it"><div class="lp-it-h">Bannière ${i + 1}${listTools('actus.items', i, A.length)}</div>
        <div class="lp-row">${pic(`actus.items.${i}.bg`, 'Scène de fond', { pos: `actus.items.${i}.bgPos` })}${pic(`actus.items.${i}.pop`, 'Personnage qui dépasse', { shelf: 'persos', tall: true })}</div>
        <div class="lp-2">${sel(`actus.items.${i}.bgPos`, 'Cadrage du fond', POS)}${sel(`actus.items.${i}.frame`, 'Le personnage est', [['buste', 'en buste (Club)'], ['pied', 'en pied (skin du jeu)']])}</div>
        <div class="lp-2">${txt(`actus.items.${i}.chip`, 'Étiquette', { max: 30 })}${color(`actus.items.${i}.color`)}</div>
        ${txt(`actus.items.${i}.title`, 'Titre', { max: 60 })}${txt(`actus.items.${i}.text`, 'Texte', { area: true, rows: 2, max: 220 })}</div>`).join('') + `<button class="btn ghost lp-add" data-add="actus.items">+ Ajouter une bannière</button>`),
      block('bientot', 'Prochainement', `${B.length} carte${B.length > 1 ? 's' : ''}`, txt('bientot.title', 'Titre de la section', { max: 40 }) + B.map((x, i) => `<div class="lp-it"><div class="lp-it-h">Carte ${i + 1}${listTools('bientot.items', i, B.length)}</div>
        <div class="lp-row">${pic(`bientot.items.${i}.img`, 'Scène', { pos: `bientot.items.${i}.imgPos` })}<div>${sel(`bientot.items.${i}.imgPos`, 'Cadrage', POS)}${txt(`bientot.items.${i}.chip`, 'Étiquette', { max: 30 })}${color(`bientot.items.${i}.color`)}</div></div>
        ${txt(`bientot.items.${i}.title`, 'Titre', { max: 60 })}${txt(`bientot.items.${i}.text`, 'Texte', { area: true, rows: 2, max: 260 })}
        <details class="lp-cd" ${x.start ? 'open' : ''}><summary>Compte à rebours (facultatif)</summary><div class="lp-2">${when(`bientot.items.${i}.start`, 'Début')}${when(`bientot.items.${i}.end`, 'Fin')}</div><small>L'étiquette affiche alors « Dans 3 jours », puis « En cours jusqu'au… », puis « Terminé ».</small></details></div>`).join('') + `<button class="btn ghost lp-add" data-add="bientot.items">+ Ajouter une carte</button>`),
      block('age', 'Mention 18+', 'En bas de page', txt('age', 'Texte', { area: true, rows: 2, max: 200 })),
      block('seo', 'Google', 'Titre et description dans les résultats', txt('seo.title', 'Titre', { max: 120 }) + txt('seo.desc', 'Description', { area: true, max: 300 }) + `<div class="lp-serp"><b>${esc(C.seo.title)}</b><span>biffcity.fr</span><p>${esc(C.seo.desc)}</p></div>`)
    ].join('');
  }

  // ------------------------------------------------------------ aperçu
  async function preview() {
    clearTimeout(timer);
    timer = setTimeout(async () => { try { const { html } = await HC.api('/admin/api/landing-preview', { content: C }); const f = $('#lp-frame'); if (f) f.srcdoc = html; } catch (e) {} }, 250);
  }
  function fit() {   // l'aperçu ordinateur est une vraie page de 1280 px réduite pour tenir dans la colonne
    const w = $('#lp-view'), f = $('#lp-frame'); if (!w || !f) return;
    const W = dev === 'm' ? 390 : 1280, s = Math.min(1, (w.clientWidth - 24) / W);
    f.style.width = W + 'px'; f.style.height = Math.round((w.clientHeight - 24) / s) + 'px'; f.style.transform = `scale(${s})`;
  }
  function state() {
    const d = dirty(); $('#lp-pub').disabled = !d; $('#lp-undo').classList.toggle('hidden', !d);
    $('#lp-state').innerHTML = d ? '<span class="dot o"></span>Modifications pas encore en ligne' : '<span class="dot"></span>À jour sur biffcity.fr';
  }
  function redraw(keepScroll = true) { const p = $('#lp-form'), y = p.scrollTop; p.innerHTML = form(); if (keepScroll) p.scrollTop = y; state(); preview(); }

  // ------------------------------------------------------------ bibliothèque d'images
  function library(path, shelf) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal lp-lib"><div class="lp-lib-h"><h3>Bibliothèque</h3><input id="lb-q" placeholder="Chercher une image (club, skin, load…)"><label class="btn green sm">Envoyer une image<input type="file" accept="image/png,image/jpeg,image/webp" hidden id="lb-up"></label><button class="btn ghost sm" data-x>Fermer</button></div>
      <div class="lp-tabs">${[['mine', 'Mes images'], ...SHELVES].map(([id, t]) => `<button data-sh="${id}" class="${id === shelf ? 'on' : ''}">${t}</button>`).join('')}</div><div class="lp-grid" id="lb-g"></div></div>`;
    document.body.appendChild(bg);
    const cur = at(path);
    const fill = () => {
      const qv = $('#lb-q', bg).value.trim().toLowerCase();
      let items;
      if (shelf === 'mine') items = media.map(u => ({ url: u, name: u.split('/').pop() }));
      else { const sh = SHELVES.findIndex(s => s[0] === shelf); items = (window.ASSETS || []).filter(n => SHELVES.findIndex(s => s[2](n)) === sh).map(n => ({ url: fileOf(n), name: n })); }
      if (qv) items = items.filter(i => i.name.toLowerCase().includes(qv));
      $('#lb-g', bg).innerHTML = items.length ? items.map(i => `<button class="${i.url === cur ? 'on' : ''}" data-u="${esc(i.url)}" title="${esc(i.name)}"><img src="${esc(i.url)}" alt="" loading="lazy"><small>${esc(i.name)}</small></button>`).join('')
        : `<div class="empty">${shelf === 'mine' ? 'Aucune image envoyée pour l\'instant : bouton « Envoyer une image » en haut.' : 'Aucune image ne correspond.'}</div>`;
    };
    fill();
    $('#lb-q', bg).oninput = fill;
    $('#lb-up', bg).onchange = async e => {
      const f = e.target.files[0]; if (!f) return; if (f.size > 4 * 1048576) return HC.toast('Image trop lourde (4 Mo au plus)', null, true);
      const data = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); });
      try { const r = await HC.api('/admin/api/upload', { data, name: f.name.replace(/\.\w+$/, '') }); media.unshift(r.url); choose(r.url); } catch (err) {}
    };
    const choose = u => {
      at(path, u);
      if (/\.pop$/.test(path)) at(path.replace(/pop$/, 'frame'), /\/skin-/.test(u) ? 'pied' : 'buste');   // un skin du jeu est en pied, un perso du Club en buste
      bg.remove(); redraw();
    };
    bg.onclick = e => {
      if (e.target === bg || e.target.closest('[data-x]')) return bg.remove();
      const t = e.target.closest('[data-sh]'); if (t) { shelf = t.dataset.sh; $$('[data-sh]', bg).forEach(b => b.classList.toggle('on', b === t)); return fill(); }
      const b = e.target.closest('[data-u]'); if (b) choose(b.dataset.u);
    };
  }

  // ------------------------------------------------------------ la page
  HC.PAGES.landing = async () => {
    HC.main(HC.loading());
    const r = await HC.api('/admin/api/landing'); C = r.content; media = r.media || []; saved = JSON.stringify(C);
    HC.main(`<div class="page-head"><div><h1>Landing</h1><div class="sub">La vitrine <a href="https://biffcity.fr/" target="_blank" rel="noopener">biffcity.fr</a></div></div>
      <div class="tools"><span class="lp-state" id="lp-state"></span><button class="btn ghost" id="lp-undo">Annuler les changements</button><button class="btn green" id="lp-pub">Publier</button></div></div>
      <div class="lp-ed"><div class="lp-form" id="lp-form"></div>
        <div class="lp-side"><div class="lp-devs"><button data-dev="m" class="${dev === 'm' ? 'on' : ''}">Mobile</button><button data-dev="d" class="${dev === 'd' ? 'on' : ''}">Ordinateur</button><button class="lp-reset" id="lp-reset">Revenir au contenu d'origine</button></div>
          <div class="lp-view ${dev}" id="lp-view"><iframe id="lp-frame" title="Aperçu de la landing"></iframe></div></div></div>`);
    redraw(false); requestAnimationFrame(fit);
    const root = $('.lp-ed');
    root.addEventListener('input', e => {
      const k = e.target.dataset.k, d = e.target.dataset.dt;
      if (k) { at(k, e.target.value); const cnt = e.target.closest('.lp-f').querySelector('i'); if (cnt) cnt.textContent = `${e.target.value.length}/${e.target.maxLength}`; }
      else if (d) at(d, e.target.value ? new Date(e.target.value).toISOString() : '');
      else return;
      if (e.target.tagName === 'SELECT') return redraw();
      state(); preview();
    });
    root.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      const ds = t.dataset;
      if (ds.tog) { open = open === ds.tog ? '' : ds.tog; HC.lsSet('hc.lp.open', open); $$('.lp-blk').forEach(b => b.classList.toggle('open', b.dataset.blk === open)); return; }
      if (ds.pick) return library(ds.pick, ds.shelf);
      if (ds.col) { at(ds.col, ds.v); return redraw(); }
      if (ds.dev) { dev = ds.dev; HC.lsSet('hc.lp.dev', dev); $$('[data-dev]').forEach(b => b.classList.toggle('on', b === t)); $('#lp-view').className = 'lp-view ' + dev; return fit(); }
      const list = ds.mv || ds.dup || ds.del || ds.add; if (!list) return;
      const arr = at(list), i = +ds.i;
      if (ds.mv) { const j = i + +ds.d; [arr[i], arr[j]] = [arr[j], arr[i]]; }
      if (ds.dup) arr.splice(i + 1, 0, JSON.parse(JSON.stringify(arr[i])));
      if (ds.del) { if (arr.length <= 1) return HC.toast('Il faut garder au moins un élément', null, true); arr.splice(i, 1); }
      if (ds.add) arr.push(JSON.parse(JSON.stringify(arr[arr.length - 1])));
      redraw();
    });
    $('#lp-pub').onclick = async () => {
      const b = $('#lp-pub'); b.disabled = true;
      try { const r = await HC.api('/admin/api/landing', { content: C }); C = r.content; saved = JSON.stringify(C); HC.toast('Publié sur biffcity.fr', 'icon-lingot'); redraw(); } catch (e) { state(); }
    };
    $('#lp-undo').onclick = () => { C = JSON.parse(saved); redraw(); };
    $('#lp-reset').onclick = async () => {
      if (!await HC.confirm('Revenir au contenu d\'origine ?', 'Tous les textes et images de la landing reprennent leur version de départ, et c\'est mis en ligne tout de suite.', 'Revenir à l\'origine', 'red')) return;
      const r = await HC.api('/admin/api/landing', { reset: true }); C = r.content; saved = JSON.stringify(C); redraw(); HC.toast('Contenu d\'origine remis');
    };
    window.addEventListener('resize', fit);
    window.onbeforeunload = () => C && dirty() && location.hash.includes('landing') ? true : undefined;
  };
})();
