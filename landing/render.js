// La vitrine biffcity.fr : template.html + contenu (textes et images réglés dans le back office, page « Landing »).
// Utilisé par server/server.js (page servie et aperçu du back office) et par tools/landing.js (landing/index.html pour les tests en local).
'use strict';
const fs = require('fs'), path = require('path');
const TPL = path.join(__dirname, 'template.html'), DEF = path.join(__dirname, 'content.json');
const COLORS = ['new', 'live', 'ev', 'soon'], IMG_RE = /^\/(assets\/img|media)\/[\w.-]+\.(png|jpe?g|webp)$/, POS_RE = /^\d{1,3}% \d{1,3}%$/;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const defaults = () => JSON.parse(fs.readFileSync(DEF, 'utf8'));

// ce qui arrive du back office est nettoyé : textes bornés, images seulement du jeu ou envoyées, couleurs connues
function clean(c) {
  const d = defaults(), txt = (v, max, def) => typeof v === 'string' ? v.trim().slice(0, max) : def;
  const im = (v, def) => typeof v === 'string' && IMG_RE.test(v) ? v : def, pos = (v, def) => typeof v === 'string' && POS_RE.test(v) ? v : def;
  const col = v => COLORS.includes(v) ? v : 'new', date = v => typeof v === 'string' && !isNaN(Date.parse(v)) ? v : '';
  c = c && typeof c === 'object' ? c : {};
  const h = c.hero || {}, s = c.seo || {}, a = c.actus || {}, b = c.bientot || {};
  return {
    seo: { title: txt(s.title, 120, d.seo.title), desc: txt(s.desc, 300, d.seo.desc) },
    hero: { img: im(h.img, d.hero.img), slogan: txt(h.slogan, 60, d.hero.slogan), soon: txt(h.soon, 60, d.hero.soon), lead: txt(h.lead, 400, d.hero.lead), cta: txt(h.cta, 30, d.hero.cta), ctaNote: txt(h.ctaNote, 120, d.hero.ctaNote) },
    feats: (Array.isArray(c.feats) ? c.feats : d.feats).slice(0, 3).map((f, i) => ({ img: im(f.img, d.feats[i].img), title: txt(f.title, 30, ''), text: txt(f.text, 120, '') })),
    actus: { title: txt(a.title, 40, d.actus.title), items: (Array.isArray(a.items) ? a.items : d.actus.items).slice(0, 8).map(x => ({
      bg: im(x.bg, d.actus.items[0].bg), bgPos: pos(x.bgPos, '50% 50%'), pop: im(x.pop, ''), frame: x.frame === 'pied' ? 'pied' : 'buste',
      chip: txt(x.chip, 30, ''), color: col(x.color), title: txt(x.title, 60, ''), text: txt(x.text, 220, '') })) },
    bientot: { title: txt(b.title, 40, d.bientot.title), items: (Array.isArray(b.items) ? b.items : d.bientot.items).slice(0, 8).map(x => ({
      img: im(x.img, d.bientot.items[0].img), alt: txt(x.alt, 120, ''), imgPos: pos(x.imgPos, '50% 50%'), chip: txt(x.chip, 30, ''), color: col(x.color),
      start: date(x.start), end: date(x.end), title: txt(x.title, 60, ''), text: txt(x.text, 260, '') })) },
    age: txt(c.age, 200, d.age)
  };
}

function render(content) {
  const c = clean(content || defaults());
  const val = k => k.split('.').reduce((o, p) => o == null ? '' : o[p], c);
  const feats = c.feats.map(f => `    <div class="feat"><img src="${esc(f.img)}" alt=""><b>${esc(f.title)}</b><small>${esc(f.text)}</small></div>`).join('\n');
  const actus = c.actus.items.map(x => `<article class="bn"><div class="bn-card" style="background-image:url(${esc(x.bg)});background-position:${esc(x.bgPos)}"><div class="bn-txt">${x.chip ? `<span class="chip ${x.color}">${esc(x.chip)}</span>` : ''}<b>${esc(x.title)}</b><p>${esc(x.text)}</p></div></div>${x.pop ? `<img class="bn-pop ${x.frame === 'pied' ? 'skin' : 'perso'}" src="${esc(x.pop)}" alt="" loading="lazy">` : ''}</article>`).join('');
  const cards = c.bientot.items.map(x => `      <article class="nc"><div class="ni"><img src="${esc(x.img)}" alt="${esc(x.alt)}" style="object-position:${esc(x.imgPos)}"></div><div class="nt">${x.chip ? `<span class="chip ${x.color}"${x.start && x.end ? ` data-cd="${esc(x.start)}" data-end="${esc(x.end)}"` : ''}>${esc(x.chip)}</span>` : ''}<b>${esc(x.title)}</b><p>${esc(x.text)}</p></div></article>`).join('\n');
  return fs.readFileSync(TPL, 'utf8')
    .replace('<!--@feats-->', () => feats).replace('<!--@actus-->', () => actus).replace('<!--@bientot-->', () => cards)
    .replace(/\{\{([\w.]+)\}\}/g, (m, k) => esc(val(k)));
}

module.exports = { render, clean, defaults };
