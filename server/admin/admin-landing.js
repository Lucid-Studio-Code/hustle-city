/* Biff City · back office : la page LANDING, un éditeur à la Shopify pour la vitrine biffcity.fr.
   À gauche les blocs (textes, images, bannières, cartes), à droite l'aperçu en direct (mobile ou ordinateur), « Publier » met en ligne.
   Les images se choisissent dans la bibliothèque du jeu (window.ASSETS, /js/assets.js) ou parmi celles envoyées (/media/…).
   Serveur : GET/POST /admin/api/landing, POST /admin/api/landing-preview (landing/render.js fait la page des deux côtés). */
(function () {
  'use strict';
  const HC = window.HC, { $, $$, esc } = HC;
  const JPG = new Set(window.ASSETS_JPG || []), WEBP = new Set(window.ASSETS_WEBP || []);
  const fileOf = n => `/assets/img/${n}.${JPG.has(n) ? 'jpg' : WEBP.has(n) ? 'webp' : 'png'}`;
  const shown = u => { const m = /\/assets\/img\/([\w-]+)\.\w+$/.exec(u || ''); const h = m && (window.ASSET_H || {})[m[1]]; return h ? `${u}?v=${h}` : u; };   // aperçu : version de l'image dans l'adresse, sinon le navigateur montre l'ancienne
  const COLORS = [['new', 'Rose', '#ff3cac'], ['live', 'Vert', '#3fae2e'], ['ev', 'Orange', '#e8743a'], ['soon', 'Violet', '#6b5bd6']];
  const POS = [['50% 15%', 'Haut'], ['50% 35%', 'Un peu haut'], ['50% 50%', 'Centre'], ['50% 70%', 'Un peu bas'], ['50% 90%', 'Bas']];
  // rayons de la bibliothèque : on range les images du jeu par famille de nom
  const SHELVES = [
    ['scenes', 'Scènes', n => /^(bg-|club-(?!p)|load-|room-|ev-cdm-bg|card-bg|tkbg-|art-|parking-bg)/.test(n)],
    ['persos', 'Personnages', n => /^(skin-|clubp-|cr-[a-z]+$|player-|guide$)/.test(n)],
    ['icones', 'Icônes et objets', n => true]
  ];
  let base = '', lpFiles = [], mode = 'landing', cur = -1, C = null, saved = '', media = [], dev = HC.lsGet('hc.lp.dev') || 'm', timer = 0, open = HC.lsGet('hc.lp.open') || 'hero';

  const dirty = () => JSON.stringify(C) !== saved;
  const at = (path, v) => { const k = path.split('.'); let o = C; while (k.length > 1) o = o[k.shift()]; if (v === undefined) return o[k[0]]; o[k[0]] = v; };

  // ------------------------------------------------------------ champs
  const txt = (path, label, o = {}) => `<label class="lp-f"><span>${label}${o.max ? `<i>${(at(path) || '').length}/${o.max}</i>` : ''}</span>${o.area
    ? `<textarea data-k="${path}" rows="${o.rows || 3}" maxlength="${o.max || 400}">${esc(at(path))}</textarea>`
    : `<input data-k="${path}" value="${esc(at(path))}" maxlength="${o.max || 120}">`}</label>`;
  const pic = (path, label, o = {}) => `<div class="lp-f"><span>${label}</span><button class="lp-pic ${o.tall ? 'tall' : ''}" data-pick="${path}" data-shelf="${o.shelf || 'scenes'}" ${o.pos ? `style="background-position:${esc(at(o.pos))}"` : ''}><img src="${esc(shown(at(path)))}" alt="" ${o.pos ? `style="object-position:${esc(at(o.pos))}"` : ''}><em>Changer</em></button></div>`;
  const sel = (path, label, opts) => `<label class="lp-f"><span>${label}</span><select data-k="${path}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${at(path) === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const color = path => `<div class="lp-f"><span>Couleur de l'étiquette</span><div class="lp-cols">${COLORS.map(([v, t, c]) => `<button class="${at(path) === v ? 'on' : ''}" data-col="${path}" data-v="${v}" style="--c:${c}" title="${t}"></button>`).join('')}</div></div>`;
  const dtl = v => { if (!v) return ''; const d = new Date(v); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const when = (path, label) => `<label class="lp-f"><span>${label}</span><input type="datetime-local" data-dt="${path}" value="${dtl(at(path))}"></label>`;

  const block = (id, title, sub, inner) => `<section class="lp-blk ${open === id ? 'open' : ''}" data-blk="${id}"><button class="lp-bh" data-tog="${id}"><b>${title}</b><small>${sub}</small><i></i></button><div class="lp-bb">${inner}</div></section>`;
  const listTools = (list, i, n) => `<div class="lp-it-tools"><button class="btn ghost sm" data-mv="${list}" data-i="${i}" data-d="-1" ${i ? '' : 'disabled'}>↑</button><button class="btn ghost sm" data-mv="${list}" data-i="${i}" data-d="1" ${i < n - 1 ? '' : 'disabled'}>↓</button><button class="btn ghost sm" data-dup="${list}" data-i="${i}">Dupliquer</button><button class="btn ghost sm lp-del" data-del="${list}" data-i="${i}">Supprimer</button></div>`;

  function articleForm() {
    const i = cur, a = C.articles[i], k = `articles.${i}`;
    return [
      block('a-txt', 'Contenu', 'Titre, chapeau et texte', txt(`${k}.h1`, 'Titre affiché', { max: 110 }) + txt(`${k}.lead`, 'Chapeau (en gras sous le titre)', { area: true, rows: 3, max: 500 }) + richText(`${k}.body`, 'Texte de l\'article')),
      block('a-img', 'Image', 'En haut de l\'article et sur sa carte', `<div class="lp-row">${pic(`${k}.img`, 'Image', { pos: `${k}.imgPos` })}<div>${sel(`${k}.imgPos`, 'Cadrage', POS)}${txt(`${k}.alt`, 'Description de l\'image (Google Images)', { max: 140 })}</div></div>`),
      block('a-seo', 'Google', 'Adresse, date, titre et description', `<div class="lp-2">${txt(`${k}.slug`, 'Adresse (biffcity.fr/actus/…)', { max: 80 })}<label class="lp-f"><span>Date de publication</span><input type="date" data-k="${k}.date" value="${esc(a.date)}"></label></div>`
        + txt(`${k}.title`, 'Titre dans Google', { max: 90 }) + txt(`${k}.desc`, 'Description dans Google', { area: true, rows: 2, max: 170 }) + `<div class="lp-serp"><b>${esc(a.title)} | Biff City</b><span>biffcity.fr › actus › ${esc(a.slug)}</span><p>${esc(a.desc)}</p></div>`)
    ].join('');
  }
  function form() {
    if (mode === 'blog') return articleForm();
    const A = C.actus.items, B = C.bientot.items;
    return [
      block('hero', 'En-tête', 'Image, slogan, bouton', pic('hero.img', 'Image principale', { tall: true }) + txt('hero.slogan', 'Slogan', { max: 60 }) + `<div class="lp-2">${txt('hero.cta', 'Texte du bouton', { max: 30 })}${txt('hero.ctaNote', 'Sous le bouton', { max: 120 })}</div>` + txt('hero.soon', 'Titre', { max: 60 }) + txt('hero.lead', 'Présentation', { area: true, max: 400 })),
      block('feats', 'Les 3 atouts', 'Les cartes sous la présentation', C.feats.map((f, i) => `<div class="lp-it"><div class="lp-it-h">Atout ${i + 1}</div><div class="lp-row">${pic(`feats.${i}.img`, 'Icône', { shelf: 'icones' })}<div>${txt(`feats.${i}.title`, 'Titre', { max: 30 })}${txt(`feats.${i}.text`, 'Texte', { max: 120 })}</div></div></div>`).join('')),
      block('jeu', 'Le jeu en images', `${C.jeu.items.length} visuels au format téléphone, la carte du milieu s'affiche en premier`, txt('jeu.title', 'Titre de la section', { max: 50 }) + txt('jeu.sub', 'Sous-titre', { max: 160 }) + C.jeu.items.map((x, i) => `<div class="lp-it"><div class="lp-it-h">Visuel ${i + 1}${listTools('jeu.items', i, C.jeu.items.length)}</div>
        <div class="lp-row">${pic(`jeu.items.${i}.img`, 'Visuel (format 9:16)', { tall: true, shelf: 'lp' })}<div>${txt(`jeu.items.${i}.title`, 'Titre (dans l\'image)', { max: 60 })}${txt(`jeu.items.${i}.text`, 'Phrase courte', { area: true, rows: 2, max: 180 })}${sel(`jeu.items.${i}.link`, 'Article lié', [['', 'Aucun (vers le jeu)'], ...C.articles.map(a => [a.slug, a.h1 || a.title])])}</div></div>
        ${txt(`jeu.items.${i}.alt`, 'Description de l\'image (Google Images)', { max: 160 })}</div>`).join('') + `<button class="btn ghost lp-add" data-add="jeu.items">+ Ajouter un visuel</button>`),
      block('actus', 'Actualités', `${A.length} bannière${A.length > 1 ? 's' : ''} qui défilent`, txt('actus.title', 'Titre de la section', { max: 40 }) + A.map((x, i) => `<div class="lp-it"><div class="lp-it-h">Bannière ${i + 1}${listTools('actus.items', i, A.length)}</div>
        <div class="lp-row">${pic(`actus.items.${i}.bg`, 'Scène de fond', { pos: `actus.items.${i}.bgPos` })}${pic(`actus.items.${i}.pop`, 'Personnage qui dépasse', { shelf: 'persos', tall: true })}</div>
        <div class="lp-2">${sel(`actus.items.${i}.bgPos`, 'Cadrage du fond', POS)}</div>
        <div class="lp-2">${txt(`actus.items.${i}.chip`, 'Étiquette', { max: 30 })}${color(`actus.items.${i}.color`)}</div>
        ${txt(`actus.items.${i}.title`, 'Titre', { max: 60 })}${txt(`actus.items.${i}.text`, 'Texte', { area: true, rows: 2, max: 220 })}<div class="lp-2">${sel(`actus.items.${i}.link`, 'Article lié', [['', 'Aucun bouton'], ...C.articles.map(a => [a.slug, a.h1 || a.title])])}${txt(`actus.items.${i}.btn`, 'Texte du bouton', { max: 30 })}</div></div>`).join('') + `<button class="btn ghost lp-add" data-add="actus.items">+ Ajouter une bannière</button>`),
      block('bientot', 'Prochainement', `${B.length} carte${B.length > 1 ? 's' : ''}`, txt('bientot.title', 'Titre de la section', { max: 40 }) + B.map((x, i) => `<div class="lp-it"><div class="lp-it-h">Carte ${i + 1}${listTools('bientot.items', i, B.length)}</div>
        <div class="lp-row">${pic(`bientot.items.${i}.img`, 'Scène', { pos: `bientot.items.${i}.imgPos` })}<div>${sel(`bientot.items.${i}.imgPos`, 'Cadrage', POS)}${txt(`bientot.items.${i}.chip`, 'Étiquette', { max: 30 })}${color(`bientot.items.${i}.color`)}</div></div>
        ${txt(`bientot.items.${i}.title`, 'Titre', { max: 60 })}${txt(`bientot.items.${i}.text`, 'Texte', { area: true, rows: 2, max: 260 })}<div class="lp-2">${sel(`bientot.items.${i}.link`, 'Article lié', [['', 'Aucun bouton'], ...C.articles.map(a => [a.slug, a.h1 || a.title])])}${txt(`bientot.items.${i}.btn`, 'Texte du bouton', { max: 30 })}</div>
        <details class="lp-cd" ${x.start ? 'open' : ''}><summary>Compte à rebours (facultatif)</summary><div class="lp-2">${when(`bientot.items.${i}.start`, 'Début')}${when(`bientot.items.${i}.end`, 'Fin')}</div><small>L'étiquette affiche alors « Dans 3 jours », puis « En cours jusqu'au… », puis « Terminé ».</small></details></div>`).join('') + `<button class="btn ghost lp-add" data-add="bientot.items">+ Ajouter une carte</button>`),
      block('age', 'Mention 18+', 'En bas de page', txt('age', 'Texte', { area: true, rows: 2, max: 200 })),
      block('seo', 'Google', 'Titre et description dans les résultats', txt('seo.title', 'Titre', { max: 120 }) + txt('seo.desc', 'Description', { area: true, max: 300 }) + `<div class="lp-serp"><b>${esc(C.seo.title)}</b><span>biffcity.fr</span><p>${esc(C.seo.desc)}</p></div>`)
    ].join('');
  }


  // ------------------------------------------------------------ éditeur de texte à la Shopify (le texte reste enregistré dans le format simple : ## , - , ** **, [texte](lien))
  const escT = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function mdToHtml(t) {
    const inl = s => escT(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, l, h) => h === 'jeu' ? `<a href="#jeu" data-jeu="1">${l}</a>` : `<a href="${h}">${l}</a>`);
    const out = []; let list = null, para = [];
    const flush = () => { if (para.length) { const p = para.join(' '); out.push(/^\[[^\]]+\]\(jeu\)$/.test(p) ? `<p class="cta">${inl(p)}</p>` : `<p>${inl(p)}</p>`); para = []; } if (list) { out.push(`<ul>${list.map(l => `<li>${inl(l)}</li>`).join('')}</ul>`); list = null; } };
    for (const raw of String(t || '').split('\n')) {
      const l = raw.trim(); let m;
      if (!l) { flush(); continue; }
      if ((m = /^(#{2,3}) (.+)$/.exec(l))) { flush(); out.push(`<h${m[1].length}>${inl(m[2])}</h${m[1].length}>`); continue; }
      if ((m = /^- (.+)$/.exec(l))) { if (para.length) { const k = list; list = null; flush(); list = k; } (list = list || []).push(m[1]); continue; }
      if (list) flush(); para.push(l);
    }
    flush(); return out.join('') || '<p><br></p>';
  }
  function htmlToMd(root) {
    const bold = n => /^(B|STRONG)$/.test(n.nodeName) || (n.style && (n.style.fontWeight === 'bold' || +n.style.fontWeight >= 600));
    const inline = el => [...el.childNodes].map(n => {
      if (n.nodeType === 3) return n.nodeValue.replace(/\s+/g, ' ');
      if (n.nodeType !== 1) return '';
      if (n.nodeName === 'BR') return ' ';
      if (n.nodeName === 'A') { const t = n.textContent.trim(); if (!t) return ''; const h = n.dataset.jeu || n.getAttribute('href') === '#jeu' ? 'jeu' : n.getAttribute('href') || ''; return /^(jeu|\/actus\/[a-z0-9-]+|\/actus|\/)$/.test(h) ? `[${t}](${h})` : t; }
      const inner = inline(n); if (bold(n)) { const m = /^(\s*)(.*?)(\s*)$/.exec(inner); return m[2] ? `${m[1]}**${m[2]}**${m[3]}` : inner; }
      return inner;
    }).join('');
    const blocks = [];
    const walk = el => [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) { const t = n.nodeValue.trim(); if (t) blocks.push(t); return; }
      if (n.nodeType !== 1) return;
      const tag = n.nodeName, txt = inline(n).trim();
      if (tag === 'H1' || tag === 'H2') { if (txt) blocks.push('## ' + txt.replace(/\*\*/g, '')); }
      else if (tag === 'H3' || tag === 'H4') { if (txt) blocks.push('### ' + txt.replace(/\*\*/g, '')); }
      else if (tag === 'UL' || tag === 'OL') { const li = [...n.children].map(x => inline(x).trim()).filter(Boolean).map(x => '- ' + x); if (li.length) blocks.push(li.join('\n')); }
      else if (/^(P|DIV)$/.test(tag) && n.querySelector('p,div,h2,h3,ul,ol')) walk(n);
      else if (txt) blocks.push(txt);
    });
    walk(root);
    return blocks.join('\n\n');
  }
  const RT_TOOLS = [['p', 'Texte', 'Paragraphe normal'], ['h2', 'Intertitre', 'Grand intertitre'], ['h3', 'Sous-titre', 'Petit intertitre'], ['|'], ['bold', '<b>G</b>', 'Gras (Cmd+B)'], ['ul', '• Liste', 'Liste à puces'], ['|'], ['link', '🔗 Lien', 'Lien vers un article ou vers le jeu'], ['unlink', 'Retirer le lien', 'Retirer le lien sélectionné'], ['cta', '▶ Bouton Jouer', 'Ajoute un gros bouton vert « Jouer à la bêta »'], ['|'], ['undo', '↶', 'Annuler'], ['redo', '↷', 'Rétablir']];
  const richText = (path, label) => `<div class="lp-f"><span>${label}</span><div class="rt"><div class="rt-bar">${RT_TOOLS.map(([k, t, tip]) => k === '|' ? '<i></i>' : `<button type="button" data-rt-cmd="${k}" title="${tip}">${t}</button>`).join('')}</div><div class="rt-ed" contenteditable="true" spellcheck="true" data-rt="${path}">${mdToHtml(at(path))}</div></div></div>`;
  HC.rt = { mdToHtml, htmlToMd };   // utile pour vérifier la conversion
  let rtRange = null;
  const rtSave = () => { const s = getSelection(); if (s.rangeCount) rtRange = s.getRangeAt(0).cloneRange(); };
  const rtRestore = ed => { ed.focus(); if (rtRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(rtRange); } };
  const rtSync = ed => { at(ed.dataset.rt, htmlToMd(ed)); state(); preview(); };
  function rtLink(ed) {
    rtSave();
    const sel = getSelection(), picked = sel.toString().trim();
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal rt-link"><h3>Ajouter un lien</h3><p>${picked ? `Sur le texte « ${esc(picked.slice(0, 60))} »` : 'Le lien sera ajouté avec le titre de sa destination.'}</p>
      <div class="rt-opts"><button data-h="jeu"><b>Le jeu</b><small>game.biffcity.fr, compte comme un clic vers la bêta</small></button>${C.articles.map(a => `<button data-h="/actus/${esc(a.slug)}" data-t="${esc(a.h1 || a.title)}"><b>${esc(a.h1 || a.title)}</b><small>biffcity.fr/actus/${esc(a.slug)}</small></button>`).join('')}<button data-h="/actus" data-t="Toutes les actus"><b>La page des actus</b><small>biffcity.fr/actus</small></button></div>
      <div class="mb"><button class="btn ghost" data-x>Annuler</button></div></div>`;
    document.body.appendChild(bg);
    bg.onclick = e => {
      if (e.target === bg || e.target.closest('[data-x]')) { bg.remove(); return; }
      const b = e.target.closest('[data-h]'); if (!b) return; bg.remove();
      rtRestore(ed);
      const h = b.dataset.h, href = h === 'jeu' ? '#jeu' : h;
      if (!picked) { const a = document.createElement('a'); a.href = href; if (h === 'jeu') a.dataset.jeu = '1'; a.textContent = h === 'jeu' ? 'Jouer à la bêta' : b.dataset.t; const r = getSelection().getRangeAt(0); r.collapse(false); r.insertNode(a); r.setStartAfter(a); }
      else { document.execCommand('createLink', false, href); if (h === 'jeu') ed.querySelectorAll('a[href="#jeu"]').forEach(a => a.dataset.jeu = '1'); }
      rtSync(ed);
    };
  }
  function rtCmd(ed, k) {
    ed.focus();
    if (k === 'link') return rtLink(ed);
    if (k === 'bold') document.execCommand('bold');
    else if (k === 'ul') document.execCommand('insertUnorderedList');
    else if (k === 'unlink') { document.execCommand('unlink'); }
    else if (k === 'undo' || k === 'redo') document.execCommand(k);
    else if (k === 'cta') {
      const s = getSelection(); let blk = s.rangeCount ? s.getRangeAt(0).startContainer : null; while (blk && blk.parentNode !== ed) blk = blk.parentNode;
      const p = document.createElement('p'); p.className = 'cta'; p.innerHTML = '<a href="#jeu" data-jeu="1">Jouer à la bêta</a>';
      if (blk) blk.after(p); else ed.appendChild(p);
    }
    else document.execCommand('formatBlock', false, k === 'p' ? 'p' : k);
    rtSync(ed);
  }

  // ------------------------------------------------------------ aperçu
  async function preview() {
    clearTimeout(timer);
    timer = setTimeout(async () => { try { const a = mode === 'blog' && C.articles[cur]; const { html } = await HC.api('/admin/api/landing-preview', { content: C, slug: a ? a.slug : '' }); const f = $('#lp-frame'); if (f) f.srcdoc = html; } catch (e) {} }, 250);
  }
  function fit() {   // l'aperçu ordinateur est une vraie page de 1280 px réduite pour tenir dans la colonne
    const w = $('#lp-view'), f = $('#lp-frame'); if (!w || !f) return;
    const W = dev === 'm' ? 390 : 1280, s = Math.min(1, (w.clientWidth - 24) / W);
    f.style.width = W + 'px'; f.style.height = Math.round((w.clientHeight - 24) / s) + 'px'; f.style.transform = `scale(${s})`;
  }
  function state() {
    const d = dirty(); if (!$('#lp-pub')) return; $('#lp-pub').disabled = !d; $('#lp-undo').classList.toggle('hidden', !d);
    if (!$('#lp-pub')) return; $('#lp-state').innerHTML = d ? '<span class="dot o"></span>Modifications pas encore en ligne' : '<span class="dot"></span>À jour sur biffcity.fr';
  }
  function redraw(keepScroll = true) { const p = $('#lp-form'), y = p.scrollTop; p.innerHTML = form(); if (keepScroll) p.scrollTop = y; state(); preview(); }

  // ------------------------------------------------------------ bibliothèque d'images
  function library(path, shelf) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal lp-lib"><div class="lp-lib-h"><h3>Bibliothèque</h3><input id="lb-q" placeholder="Chercher une image (club, skin, load…)"><label class="btn green sm">Envoyer une image<input type="file" accept="image/png,image/jpeg,image/webp" hidden id="lb-up"></label><button class="btn ghost sm" data-x>Fermer</button></div>
      <div class="lp-tabs">${[['mine', 'Mes images'], ['lp', 'Visuels de la vitrine'], ...SHELVES].map(([id, t]) => `<button data-sh="${id}" class="${id === shelf ? 'on' : ''}">${t}</button>`).join('')}</div><div class="lp-grid" id="lb-g"></div></div>`;
    document.body.appendChild(bg);
    const cur = at(path);
    const fill = () => {
      const qv = $('#lb-q', bg).value.trim().toLowerCase();
      let items;
      if (shelf === 'mine') items = media.map(u => ({ url: u, name: u.split('/').pop() }));
      else if (shelf === 'lp') items = lpFiles.map(u => ({ url: u, name: u.split('/').pop() }));
      else { const sh = SHELVES.findIndex(s => s[0] === shelf); items = (window.ASSETS || []).filter(n => SHELVES.findIndex(s => s[2](n)) === sh).map(n => ({ url: fileOf(n), name: n })); }
      if (qv) items = items.filter(i => i.name.toLowerCase().includes(qv));
      $('#lb-g', bg).innerHTML = items.length ? items.map(i => `<button class="${i.url === cur ? 'on' : ''}" data-u="${esc(i.url)}" title="${esc(i.name)}"><img src="${esc(shown(i.url))}" alt="" loading="lazy"><small>${esc(i.name)}</small></button>`).join('')
        : `<div class="empty">${shelf === 'mine' ? 'Aucune image envoyée pour l\'instant : bouton « Envoyer une image » en haut.' : 'Aucune image ne correspond.'}</div>`;
    };
    fill();
    // une image trop petite devient floue sur une bannière large : on la signale (taille réelle lue au chargement)
    bg.addEventListener('load', e => { const im = e.target; if (im.tagName !== 'IMG' || !im.closest('.lp-grid') || shelf === 'persos' || shelf === 'lp') return; if (im.naturalWidth < 1000) { const b = im.closest('button'); if (b && !b.querySelector('.lp-small')) b.insertAdjacentHTML('beforeend', '<em class="lp-small">Petite : floue en bannière</em>'); } }, true);
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

  // ------------------------------------------------------------ les pages
  async function load() { if (!C || !dirty()) { const r = await HC.api('/admin/api/landing'); C = r.content; media = r.media || []; lpFiles = r.lp || []; base = r.at || ''; saved = JSON.stringify(C); } }
  async function publish(msg) { const r = await HC.api('/admin/api/landing', { content: C, base }); C = r.content; saved = JSON.stringify(C); base = r.at || base; HC.toast(msg || 'Publié sur biffcity.fr', 'icon-lingot'); }
  const tools = () => `<div class="tools"><span class="lp-state" id="lp-state"></span><button class="btn ghost" id="lp-undo">Annuler les changements</button><button class="btn green" id="lp-pub">Publier</button></div>`;

  function mount(head, extra = '') {
    HC.main(`${head}<div class="lp-ed"><div class="lp-form" id="lp-form"></div>
        <div class="lp-side"><div class="lp-devs"><button data-dev="m" class="${dev === 'm' ? 'on' : ''}">Mobile</button><button data-dev="d" class="${dev === 'd' ? 'on' : ''}">Ordinateur</button>${extra}</div>
          <div class="lp-view ${dev}" id="lp-view"><iframe id="lp-frame" title="Aperçu"></iframe></div></div></div>`);
    redraw(false); requestAnimationFrame(fit);
    const root = $('.lp-ed');
    root.addEventListener('mousedown', e => { if (e.target.closest('[data-rt-cmd]')) e.preventDefault(); });   // garder la sélection du texte quand on clique un bouton
    root.addEventListener('paste', e => { const ed = e.target.closest('.rt-ed'); if (!ed) return; e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
    root.addEventListener('input', e => {
      const ed = e.target.closest && e.target.closest('.rt-ed'); if (ed) return rtSync(ed);
      const k = e.target.dataset.k, d = e.target.dataset.dt;
      if (k) { at(k, e.target.value); const cnt = e.target.closest('.lp-f').querySelector('i'); if (cnt) cnt.textContent = `${e.target.value.length}/${e.target.maxLength}`; }
      else if (d) at(d, e.target.value ? new Date(e.target.value).toISOString() : '');
      else return;
      if (e.target.tagName === 'SELECT') return redraw();
      state(); preview();
    });
    root.addEventListener('change', e => { if (/\.(slug|title|desc)$/.test(e.target.dataset.k || '')) redraw(); });   // l'aperçu Google se met à jour en quittant le champ
    root.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      const ds = t.dataset;
      if (ds.rtCmd) return rtCmd(t.closest('.rt').querySelector('.rt-ed'), ds.rtCmd);
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
    $('#lp-pub').onclick = async () => { $('#lp-pub').disabled = true; try { await publish(); redraw(); } catch (e) { state(); } };
    $('#lp-undo').onclick = () => { C = JSON.parse(saved); if (mode === 'blog' && !C.articles[cur]) return HC.go('blog'); redraw(); };
    window.addEventListener('resize', fit); HC.cleanup = () => window.removeEventListener('resize', fit);
    window.onbeforeunload = () => C && dirty() ? true : undefined;
  }

  HC.PAGES.landing = async () => {
    HC.main(HC.loading()); await load(); mode = 'landing'; if (/^a-/.test(open)) open = 'hero';
    mount(`<div class="page-head"><div><h1>Landing</h1><div class="sub">La page d'accueil de <a href="https://biffcity.fr/" target="_blank" rel="noopener">biffcity.fr</a>. Les articles se modifient dans <a href="#page=blog">Blog</a>.</div></div>${tools()}</div>`, '<button class="lp-reset" id="lp-reset">Revenir au contenu d\'origine</button>');
    $('#lp-reset').onclick = async () => {
      if (!await HC.confirm('Revenir au contenu d\'origine ?', 'Tous les textes et images de la landing et des articles reprennent leur version de départ, et c\'est mis en ligne tout de suite.', 'Revenir à l\'origine', 'red')) return;
      const r = await HC.api('/admin/api/landing', { reset: true }); C = r.content; saved = JSON.stringify(C); base = r.at || base; redraw(); HC.toast('Contenu d\'origine remis');
    };
  };

  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const dfr = d => { const [y, m, j] = String(d).split('-').map(Number); return y ? `${j} ${MOIS[m - 1]} ${y}` : ''; };
  const usedBy = slug => [...C.actus.items.filter(x => x.link === slug).map(x => 'bannière « ' + x.title + ' »'), ...C.bientot.items.filter(x => x.link === slug).map(x => 'carte « ' + x.title + ' »')];

  HC.PAGES.blog = async () => {
    HC.main(HC.loading()); await load(); mode = 'blog';
    const i = +HC.params().get('i');
    if (!HC.params().has('i') || !C.articles[i]) {   // la liste des articles
      cur = -1;
      const arts = C.articles.map((a, j) => ({ a, j })).sort((x, y) => y.a.date.localeCompare(x.a.date));
      HC.main(`<div class="page-head"><div><h1>Blog</h1><div class="sub">${C.articles.length} articles sur <a href="https://biffcity.fr/actus" target="_blank" rel="noopener">biffcity.fr/actus</a></div></div>
        <div class="tools">${dirty() ? '<span class="lp-state"><span class="dot o"></span>Modifications pas encore en ligne</span><button class="btn green" id="bl-pub">Publier</button>' : ''}<button class="btn" id="bl-new">+ Nouvel article</button></div></div>
        <div class="bl-grid">${arts.map(({ a, j }) => { const u = usedBy(a.slug); return `<button class="bl-card" data-go="blog:i:${j}"><img src="${esc(a.img)}" alt="" style="object-position:${esc(a.imgPos)}" loading="lazy"><div><time>${dfr(a.date)}</time><b>${esc(a.h1 || a.title)}</b><p>${esc(a.desc)}</p><small>${u.length ? 'Mis en avant sur la landing : ' + esc(u.join(', ')) : 'Pas de bouton sur la landing'}</small></div></button>`; }).join('')}</div>`);
      $('#bl-new').onclick = () => {
        const base = C.articles[0], n = { ...JSON.parse(JSON.stringify(base)), slug: 'nouvel-article-' + Date.now().toString(36).slice(-4), title: 'Nouvel article', h1: 'Nouvel article', desc: '', lead: '', alt: '', body: '## Intertitre\nTon texte ici.\n\n[Jouer à la bêta](jeu)', date: new Date().toISOString().slice(0, 10) };
        C.articles.push(n); open = 'a-txt'; HC.go('blog', { i: C.articles.length - 1 });
      };
      if ($('#bl-pub')) $('#bl-pub').onclick = async () => { await publish(); HC.PAGES.blog(); };
      return;
    }
    cur = i; if (!/^a-/.test(open)) open = 'a-txt';
    const a = C.articles[cur];
    mount(`<div class="page-head"><div><a class="bl-back" href="#page=blog">← Tous les articles</a><h1>${esc(a.h1 || a.title)}</h1><div class="sub"><a href="https://biffcity.fr/actus/${esc(a.slug)}" target="_blank" rel="noopener">biffcity.fr/actus/${esc(a.slug)}</a></div></div>${tools()}</div>`,
      '<button class="lp-reset" id="bl-dup">Dupliquer</button><button class="lp-reset lp-del" id="bl-del">Supprimer l\'article</button>');
    $('#bl-dup').onclick = () => { const n = JSON.parse(JSON.stringify(C.articles[cur])); n.slug = n.slug.slice(0, 70) + '-copie'; n.h1 = (n.h1 || n.title) + ' (copie)'; C.articles.push(n); HC.go('blog', { i: C.articles.length - 1 }); };
    $('#bl-del').onclick = async () => {
      if (C.articles.length <= 1) return HC.toast('Il faut garder au moins un article', null, true);
      const u = usedBy(C.articles[cur].slug);
      if (!await HC.confirm('Supprimer cet article ?', `Il disparaît de biffcity.fr dès que tu publies.${u.length ? ' Le bouton « En savoir plus » de la ' + esc(u.join(' et de la ')) + ' disparaîtra aussi.' : ''}`, 'Supprimer', 'red')) return;
      const slug = C.articles[cur].slug; C.articles.splice(cur, 1); [...C.actus.items, ...C.bientot.items].forEach(x => { if (x.link === slug) x.link = ''; });
      HC.go('blog');
    };
  };
})();
