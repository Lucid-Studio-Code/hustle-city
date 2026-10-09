// La vitrine biffcity.fr : template.html + contenu (textes et images réglés dans le back office, page « Landing »).
// Utilisé par server/server.js (page servie et aperçu du back office) et par tools/landing.js (landing/index.html pour les tests en local).
'use strict';
const fs = require('fs'), path = require('path');
const FRAMES = JSON.parse(fs.readFileSync(path.join(__dirname, 'frames.json'), 'utf8'));   // crâne et menton de chaque personnage (fractions de la hauteur de l'image)
const TPL = path.join(__dirname, 'template.html'), DEF = path.join(__dirname, 'content.json');
const COLORS = ['new', 'live', 'ev', 'soon'], IMG_RE = /^\/(assets\/img|assets\/lp|media)\/[\w.-]+\.(png|jpe?g|webp)$/, POS_RE = /^\d{1,3}% \d{1,3}%$/;

// image allégée (assets/lp/o, faite par tools/lp-images.py) quand elle existe : la vitrine charge 3 à 6 fois moins lourd
const OPT = path.join(__dirname, '..', 'assets/lp/o'), optSeen = new Map();
const opt = u => { const m = /^\/assets\/img\/([\w.-]+)\.(png|jpe?g|webp)$/.exec(u || ''); if (!m) return u; if (!optSeen.has(m[1])) optSeen.set(m[1], fs.existsSync(path.join(OPT, m[1] + '.webp'))); return optSeen.get(m[1]) ? `/assets/lp/o/${m[1]}.webp` : u; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const defaults = () => JSON.parse(fs.readFileSync(DEF, 'utf8'));

// ce qui arrive du back office est nettoyé : textes bornés, images seulement du jeu ou envoyées, couleurs connues
function clean(c) {
  const d = defaults(), txt = (v, max, def) => typeof v === 'string' ? v.trim().slice(0, max) : def;
  const im = (v, def) => typeof v === 'string' && IMG_RE.test(v) ? v : def, pos = (v, def) => typeof v === 'string' && POS_RE.test(v) ? v : def;
  const slug = v => typeof v === 'string' && /^[a-z0-9-]{2,80}$/.test(v) ? v : '';
  const col = v => COLORS.includes(v) ? v : 'new', date = v => typeof v === 'string' && !isNaN(Date.parse(v)) ? v : '';
  c = c && typeof c === 'object' ? c : {};
  const h = c.hero || {}, s = c.seo || {}, a = c.actus || {}, b = c.bientot || {};
  return {
    seo: { title: txt(s.title, 120, d.seo.title), desc: txt(s.desc, 300, d.seo.desc) },
    hero: { img: im(h.img, d.hero.img), slogan: txt(h.slogan, 60, d.hero.slogan), soon: txt(h.soon, 60, d.hero.soon), lead: txt(h.lead, 400, d.hero.lead), cta: txt(h.cta, 30, d.hero.cta), ctaNote: txt(h.ctaNote, 120, d.hero.ctaNote) },
    feats: (Array.isArray(c.feats) ? c.feats : d.feats).slice(0, 3).map((f, i) => ({ img: im(f.img, d.feats[i].img), title: txt(f.title, 30, ''), text: txt(f.text, 120, '') })),
    actus: { title: txt(a.title, 40, d.actus.title), items: (Array.isArray(a.items) ? a.items : d.actus.items).slice(0, 8).map(x => ({
      bg: im(x.bg, d.actus.items[0].bg), bgPos: pos(x.bgPos, '50% 50%'), pop: im(x.pop, ''), frame: x.frame === 'pied' ? 'pied' : 'buste',
      chip: txt(x.chip, 30, ''), color: col(x.color), title: txt(x.title, 60, ''), text: txt(x.text, 220, ''), link: slug(x.link), btn: txt(x.btn, 30, 'En savoir plus') })) },
    bientot: { title: txt(b.title, 40, d.bientot.title), items: (Array.isArray(b.items) ? b.items : d.bientot.items).slice(0, 8).map(x => ({
      img: im(x.img, d.bientot.items[0].img), alt: txt(x.alt, 120, ''), imgPos: pos(x.imgPos, '50% 50%'), chip: txt(x.chip, 30, ''), color: col(x.color),
      start: date(x.start), end: date(x.end), title: txt(x.title, 60, ''), text: txt(x.text, 260, ''), link: slug(x.link), btn: txt(x.btn, 30, 'En savoir plus') })) },
    articles: (Array.isArray(c.articles) ? c.articles : d.articles || []).slice(0, 60).filter(x => slug(x.slug)).map(x => ({
      slug: slug(x.slug), date: /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : new Date().toISOString().slice(0, 10), img: im(x.img, d.hero.img), imgPos: pos(x.imgPos, '50% 50%'), alt: txt(x.alt, 140, ''),
      title: txt(x.title, 90, ''), desc: txt(x.desc, 170, ''), h1: txt(x.h1, 110, ''), lead: txt(x.lead, 500, ''), body: txt(x.body, 20000, '') })),
    jeu: { title: txt((c.jeu || {}).title, 50, d.jeu.title), sub: txt((c.jeu || {}).sub, 160, d.jeu.sub), items: (Array.isArray((c.jeu || {}).items) ? c.jeu.items : d.jeu.items).slice(0, 6).map(x => ({ img: im(x.img, d.jeu.items[0].img), alt: txt(x.alt, 160, ''), title: txt(x.title, 60, ''), text: txt(x.text, 180, ''), link: slug(x.link) })) },
    final: { title: txt((c.final || {}).title, 60, d.final.title), text: txt((c.final || {}).text, 200, d.final.text) },
    age: txt(c.age, 200, d.age)
  };
}

// une image envoyée (sans mesure) est traitée comme un perso du Club : tête vers le haut de l'image
function popImg(u) {
  let n = (u.match(/\/([\w-]+)\.\w+$/) || [])[1];
  if (/-bust$/.test(n) && FRAMES[n.replace(/-bust$/, '')]) { n = n.replace(/-bust$/, ''); u = `/assets/img/${n}.png`; }   // un buste s'arrêterait au milieu de la carte : on prend le perso entier
  const f = FRAMES[n] || [.16, .39], h = f[1] - f[0];
  return `<div class="bn-popw"><img class="bn-pop" src="${esc(opt(u))}" alt="" loading="lazy" style="--hf:${(1 / h).toFixed(4)};--cf:${(f[0] / h).toFixed(4)}"></div>`;
}
function render(content) {
  const c = clean(content || defaults());
  const val = k => k.split('.').reduce((o, p) => o == null ? '' : o[p], c), art = sl => sl && c.articles.some(a => a.slug === sl);
  const feats = c.feats.map(f => `    <div class="feat"><img src="${esc(opt(f.img))}" alt="" width="64" height="64"><b>${esc(f.title)}</b><small>${esc(f.text)}</small></div>`).join('\n');
  const actus = c.actus.items.map(x => `<article class="bn"><div class="bn-card" data-bg="${esc(opt(x.bg))}" style="background-position:${esc(x.bgPos)}"><div class="bn-txt">${x.chip ? `<span class="chip ${x.color}">${esc(x.chip)}</span>` : ''}<b>${esc(x.title)}</b><p>${esc(x.text)}</p>${art(x.link) ? `<a class="bn-link" href="/actus/${x.link}">${esc(x.btn)}</a>` : ''}</div></div>${x.pop ? popImg(x.pop) : ''}</article>`).join('');
  const cards = c.bientot.items.map(x => `      <article class="nc"><div class="ni"><img src="${esc(opt(x.img))}" loading="lazy" alt="${esc(x.alt)}" style="object-position:${esc(x.imgPos)}"></div><div class="nt">${x.chip ? `<span class="chip ${x.color}"${x.start && x.end ? ` data-cd="${esc(x.start)}" data-end="${esc(x.end)}"` : ''}>${esc(x.chip)}</span>` : ''}<b>${esc(x.title)}</b><p>${esc(x.text)}</p>${art(x.link) ? `<a class="nc-link" href="/actus/${x.link}">${esc(x.btn)}</a>` : ''}</div></article>`).join('\n');
  const shots = c.jeu.items.map(x => `      <a class="shot" href="${art(x.link) ? '/actus/' + x.link : 'https://game.biffcity.fr/'}"${art(x.link) ? '' : ' data-lp="beta-jeu"'}><figure><img src="${esc(x.img)}" alt="${esc(x.alt)}" loading="lazy" width="540" height="1169"></figure><div><b>${esc(x.title)}</b><p>${esc(x.text)}</p>${art(x.link) ? '<span class="go">En savoir plus ›</span>' : ''}</div></a>`).join('\n');
  return fs.readFileSync(TPL, 'utf8')
    .replace('<!--@feats-->', () => feats).replace('<!--@actus-->', () => actus).replace('<!--@bientot-->', () => cards).replace('<!--@jeu-->', () => shots)
    .replace(/\{\{hero\.img\}\}/g, () => esc(opt(c.hero.img))).replace('{{hero.imgFull}}', () => esc(c.hero.img))
    .replace(/<img src="(\/assets\/img\/[\w.-]+)"/g, (m, u) => `<img src="${opt(u)}"`)
    .replace(/\{\{([\w.]+)\}\}/g, (m, k) => esc(val(k)));
}


// ------------------------------------------------------------ articles : biffcity.fr/actus et biffcity.fr/actus/<slug>
const GAME = 'https://game.biffcity.fr/', SITE = 'https://biffcity.fr';
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dateFr = d => { const [y, m, j] = d.split('-').map(Number); return `${j} ${MOIS[m - 1]} ${y}`; };
const words = t => (t.match(/\S+/g) || []).length;

// texte simple → HTML : « ## » intertitre, « ### », « - » liste, **gras**, [texte](/actus/…) ou [texte](jeu). Aucun lien vers un autre site.
function md(t, slugs) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
    href = href.replace(/&amp;/g, '&');
    if (href === 'jeu') return `<a href="${GAME}" data-lp="beta-article">${label}</a>`;
    const a = /^\/actus\/([a-z0-9-]+)$/.exec(href); if (a && slugs.includes(a[1])) return `<a href="${href}">${label}</a>`;
    if (href === '/' || href === '/actus') return `<a href="${href}">${label}</a>`;
    return label;
  });
  const out = []; let list = null, para = [];
  const flush = () => { if (para.length) { const p = para.join(' '); const solo = /^\[[^\]]+\]\(jeu\)$/.test(p.trim()); out.push(solo ? `<p class="a-cta-line">${inline(p).replace('<a ', '<a class="btn-play" ')}</p>` : `<p>${inline(p)}</p>`); para = []; } if (list) { out.push(`<ul>${list.map(l => `<li>${inline(l)}</li>`).join('')}</ul>`); list = null; } };
  for (const raw of String(t).split('\n')) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    let m;
    if ((m = /^(#{2,3}) (.+)$/.exec(l))) { flush(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if ((m = /^- (.+)$/.exec(l))) { if (para.length) { const keep = list; list = null; flush(); list = keep; } (list = list || []).push(m[1]); continue; }
    if (list) flush(); para.push(l);
  }
  flush(); return out.join('\n');
}

const STYLE = `@font-face{font-family:'Lilita One';src:url(/assets/fonts/lilita-latin.woff2) format('woff2');font-display:swap}
@font-face{font-family:'Nunito';font-weight:200 1000;src:url(/assets/fonts/nunito-latin.woff2) format('woff2');font-display:swap}
:root{--ink:#2a1a10;--gold:#ffd23f;--pink:#ff3cac;--night:#1b1433}
*{box-sizing:border-box}html,body{margin:0;background:var(--night);color:#fff;font:600 17px/1.65 'Nunito',system-ui,sans-serif}
body{background:radial-gradient(circle at 50% 0,#4a2a8a,var(--night) 60%) fixed}
a{color:inherit}
.top{display:flex;align-items:center;gap:14px;max-width:1080px;margin:0 auto;padding:14px 16px}
.brand{font:400 30px/.9 'Lilita One',sans-serif;color:var(--gold);text-decoration:none;transform:rotate(-4deg);text-shadow:2px 0 0 var(--ink),-2px 0 0 var(--ink),0 2px 0 var(--ink),0 -2px 0 var(--ink),0 5px 0 var(--ink)}
.brand span{color:#fff}
.top nav{margin-left:auto;display:flex;gap:16px;align-items:center;font-weight:800;font-size:15px}.top nav a{text-decoration:none;color:#e6dcff}.top nav a:hover{color:#fff}
.btn-play{display:inline-block;padding:10px 22px 12px;background:linear-gradient(#7be35a,#3fae2e);color:#fff!important;text-decoration:none;border:3px solid var(--ink);border-radius:16px;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18),0 5px 0 var(--ink);font:400 20px 'Lilita One',sans-serif;text-shadow:0 2px 0 rgba(42,26,16,.6)}
.btn-play:active{transform:translateY(3px);box-shadow:inset 0 -4px 0 rgba(0,0,0,.18),0 2px 0 var(--ink)}
.top .btn-play{font-size:16px;padding:7px 14px 9px;border-radius:13px}
main{max-width:780px;margin:0 auto;padding:6px 16px 40px}
.crumbs{font-size:14px;color:#b9a8d9;margin:6px 0 12px}.crumbs a{color:#e6dcff}
h1{font:400 clamp(30px,6.4vw,46px)/1.08 'Lilita One',sans-serif;margin:0 0 10px;text-shadow:0 3px 0 var(--ink)}
.meta{color:#c9b8ee;font-size:14px;margin-bottom:18px}
.hero{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border:4px solid var(--ink);border-radius:24px;box-shadow:0 7px 0 var(--ink);background:#2a1a4a}
.ticket{--n:10px;--g:32px;margin-top:26px;background:var(--ink);border-radius:25px;padding:3px 3px 9px;-webkit-mask:radial-gradient(circle var(--n) at 0 50%,#0000 97%,#000) 0 0/51% var(--g) repeat-y,radial-gradient(circle var(--n) at 100% 50%,#0000 97%,#000) 100% 0/51% var(--g) repeat-y;mask:radial-gradient(circle var(--n) at 0 50%,#0000 97%,#000) 0 0/51% var(--g) repeat-y,radial-gradient(circle var(--n) at 100% 50%,#0000 97%,#000) 100% 0/51% var(--g) repeat-y}
.paper{background:#fffdf6;color:#3a2a1e;border-radius:22px;padding:26px clamp(26px,5vw,48px) 30px;-webkit-mask:radial-gradient(circle calc(var(--n) + 3px) at -3px 50%,#0000 97%,#000) 0 -3px/51% var(--g) repeat-y,radial-gradient(circle calc(var(--n) + 3px) at calc(100% + 3px) 50%,#0000 97%,#000) 100% -3px/51% var(--g) repeat-y;mask:radial-gradient(circle calc(var(--n) + 3px) at -3px 50%,#0000 97%,#000) 0 -3px/51% var(--g) repeat-y,radial-gradient(circle calc(var(--n) + 3px) at calc(100% + 3px) 50%,#0000 97%,#000) 100% -3px/51% var(--g) repeat-y}
.perf{height:0;margin:22px -60px 4px;border-top:3px dashed #d9c4a2}
.lead{font-size:19px;font-weight:800;color:var(--ink);margin-top:0}
.paper h2{font:400 clamp(24px,4.6vw,30px)/1.15 'Lilita One',sans-serif;color:var(--ink);margin:30px 0 8px}
.paper h3{font:400 21px/1.2 'Lilita One',sans-serif;color:var(--ink);margin:22px 0 6px}
.paper ul{padding-left:22px}.paper li{margin:4px 0}.paper li::marker{color:var(--pink)}
.paper a{color:#b4127a;font-weight:800;text-decoration-thickness:2px;text-underline-offset:3px}
.paper strong{color:var(--ink)}
.a-cta-line{text-align:center;margin:30px 0 4px}


.cta-bn{position:relative;margin:34px 0 30px;padding-top:70px}.cta-card{position:relative;height:230px;border:4px solid var(--ink);border-radius:24px;background:url(/assets/img/bg-city-or.jpg) 50% 45%/cover;box-shadow:0 7px 0 var(--ink);overflow:hidden}.cta-card::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(27,20,51,.92) 0%,rgba(27,20,51,.75) 45%,rgba(27,20,51,0) 75%)}.cta-txt{position:absolute;left:22px;top:0;bottom:0;width:58%;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}.cta-txt .chip{display:inline-block;padding:3px 10px 4px;border:2px solid var(--ink);border-radius:999px;background:#3fae2e;font:400 13px 'Lilita One',sans-serif;color:#fff;text-shadow:0 1px 0 var(--ink)}.cta-txt b{display:block;margin:8px 0 6px;font:400 clamp(22px,4.4vw,30px)/1.05 'Lilita One',sans-serif;color:#fff;text-shadow:0 3px 0 var(--ink)}.cta-txt p{margin:0;font:700 14px/1.4 'Nunito',sans-serif;color:#f1e8ff}.paper .cta-btn{display:inline-block;margin-top:12px;padding:6px 14px 8px;background:var(--gold);color:var(--ink);border:3px solid var(--ink);border-radius:12px;box-shadow:0 4px 0 var(--ink);font:400 16px 'Lilita One',sans-serif;text-decoration:none}.paper .cta-btn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}.cta-pop{position:absolute;right:4%;top:4px;height:480px;width:auto;clip-path:inset(0 0 39.2% 0);pointer-events:none}@media (max-width:560px){.cta-card{height:250px}.cta-txt{left:14px;width:54%}.cta-txt b{font-size:22px}.cta-txt p{font-size:12.5px}.cta-pop{right:-5%;top:36px;height:320px;clip-path:inset(0 0 12.5% 0)}}
.age{margin-top:22px;font-size:13px;color:#7a6250;border-top:2px dashed #e8d8bf;padding-top:14px}
.rel h2,.list h1{text-align:center}
.rel{max-width:1080px;margin:0 auto;padding:0 16px 30px}.rel h2{font:400 30px 'Lilita One',sans-serif;text-shadow:0 3px 0 var(--ink);margin:10px 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.card{display:flex;flex-direction:column;background:#fffdf6;color:var(--ink);border:3px solid var(--ink);border-radius:20px;box-shadow:0 5px 0 var(--ink);overflow:hidden;text-decoration:none;transition:transform .15s}
.card:hover{transform:translateY(-3px)}
.card img{width:100%;aspect-ratio:16/9;object-fit:cover;border-bottom:3px solid var(--ink)}
.card div{padding:12px 14px 16px;display:flex;flex-direction:column;flex:1}.card time{font-size:12.5px;font-weight:800;color:#8a6a50;margin-bottom:4px}.card b{display:block;font:400 20px/1.15 'Lilita One',sans-serif}.card p{margin:6px 0 0;font-size:14px;line-height:1.45;color:#5a4030}
.card small{display:block;margin-top:auto;padding-top:12px;font-weight:800;color:#b4127a}
.list{max-width:1080px}.list .intro{text-align:center;color:#e6dcff;max-width:640px;margin:0 auto 24px}
footer{text-align:center;font-size:13px;color:#b9a8d9;padding:10px 16px 30px}
@media (max-width:560px){body{font-size:16px}.top nav a.hide-m{display:none}.ticket{--n:8px;--g:26px;border-radius:21px}.paper{border-radius:18px}}`;

const HIT = slug => `<script>
(function(){var q=new URLSearchParams(location.search),d={src:q.get('utm_source')||q.get('src')||'${slug}',ref:document.referrer?new URL(document.referrer).hostname:'',m:/Mobi|Android|iPhone/i.test(navigator.userAgent)?1:0};
var hit=function(k){try{var b=JSON.stringify(Object.assign({k:k},d));if(navigator.sendBeacon)navigator.sendBeacon('/api/lp',new Blob([b],{type:'application/json'}));else fetch('/api/lp',{method:'POST',headers:{'Content-Type':'application/json'},body:b,keepalive:true})}catch(e){}};
hit('view');document.querySelectorAll('[data-lp]').forEach(function(a){a.addEventListener('click',function(){hit(a.dataset.lp)})});})();
</script>`;

function shell({ title, desc, url, img, ld, body, slug }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article"><meta property="og:site_name" content="Biff City"><meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}${esc(img)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:image" content="${SITE}${esc(img)}">
<meta name="theme-color" content="#1b1433">
<link rel="icon" href="/assets/img/icon-cash.png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>${STYLE}</style>
</head>
<body>
<header class="top"><a class="brand" href="/">BIFF <span>CITY</span></a><nav><a href="/" class="hide-m">Accueil</a><a href="/actus">Actus</a><a class="btn-play" href="${GAME}" data-lp="beta-article">Jouer</a></nav></header>
${body}
<footer>Jeu réservé aux adultes. Argent fictif : aucune mise ni aucun gain réels.<br>© Lucid Studio · <a href="mailto:contact@lucidstudio.fr">contact@lucidstudio.fr</a></footer>
${HIT(slug)}
</body>
</html>`;
}
const cardOf = a => `<a class="card" href="/actus/${a.slug}"><img src="${esc(opt(a.img))}" loading="lazy" alt="${esc(a.alt)}" style="object-position:${esc(a.imgPos)}"><div><time datetime="${a.date}">${dateFr(a.date)}</time><b>${esc(a.h1 || a.title)}</b><p>${esc(a.desc)}</p><small>En savoir plus</small></div></a>`;

function renderArticle(content, s) {
  const c = clean(content || defaults()), a = c.articles.find(x => x.slug === s); if (!a) return null;
  const slugs = c.articles.map(x => x.slug), url = `${SITE}/actus/${a.slug}`, min = Math.max(1, Math.ceil(words(a.lead + ' ' + a.body) / 220));
  // l'encart « joue maintenant » se glisse avant le 3e intertitre (ou à la fin)
  let html = md(a.body, slugs); const parts = html.split('<h2>');
  const box = `<div class="cta-bn"><div class="cta-card"><div class="cta-txt"><span class="chip">Bêta ouverte</span><b>Joue avant tout le monde</b><p>Gratuit, dans ton navigateur, sans téléchargement. Argent fictif uniquement.</p><a class="cta-btn" href="${GAME}" data-lp="beta-article">Jouer à la bêta</a></div></div><img class="cta-pop" src="/assets/img/skin-survet.png" alt=""></div>`;
  if (parts.length > 3) { parts[2] = parts[2] + box; html = parts.join('<h2>'); } else html += box;
  // à lire aussi : d'abord les articles cités dans le texte, puis les plus récents
  const cited = [...a.body.matchAll(/\(\/actus\/([a-z0-9-]+)\)/g)].map(m => m[1]);
  const rel = [...new Set([...cited, ...c.articles.map(x => x.slug)])].filter(x => x !== a.slug).map(x => c.articles.find(y => y.slug === x)).filter(Boolean).slice(0, 3);
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BlogPosting', headline: a.h1 || a.title, description: a.desc, image: SITE + a.img, datePublished: a.date, dateModified: a.date, inLanguage: 'fr', mainEntityOfPage: url,
      author: { '@type': 'Organization', name: 'Lucid Studio' }, publisher: { '@type': 'Organization', name: 'Lucid Studio', logo: { '@type': 'ImageObject', url: SITE + '/assets/img/icon-cash.png' } }, about: { '@type': 'VideoGame', name: 'Biff City', url: SITE + '/' } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Biff City', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Actus', item: SITE + '/actus' }, { '@type': 'ListItem', position: 3, name: a.h1 || a.title, item: url }] }] };
  const body = `<main>
<div class="crumbs"><a href="/">Biff City</a> › <a href="/actus">Actus</a></div>
<article>
<h1>${esc(a.h1 || a.title)}</h1>
<div class="meta">Publié le ${dateFr(a.date)} · ${min} min de lecture</div>
<img class="hero" src="${esc(opt(a.img))}" fetchpriority="high" alt="${esc(a.alt)}" style="object-position:${esc(a.imgPos)}">
<div class="ticket"><div class="paper">
<p class="lead">${esc(a.lead)}</p><div class="perf"></div>
${html}
<p class="age">Biff City est réservé aux plus de 18 ans. Tout l'argent du jeu est fictif : il ne s'achète pas pour parier et ne se retire jamais.</p>
</div></div>
</article>
</main>
<section class="rel"><h2>À lire aussi</h2><div class="grid">${rel.map(cardOf).join('')}</div></section>`;
  return shell({ title: a.title + ' | Biff City', desc: a.desc, url, img: a.img, ld, body, slug: 'actus/' + a.slug });
}

function renderIndex(content) {
  const c = clean(content || defaults()), arts = [...c.articles].sort((x, y) => y.date.localeCompare(x.date)), url = SITE + '/actus';
  const ld = { '@context': 'https://schema.org', '@type': 'Blog', name: 'Les actus de Biff City', url, inLanguage: 'fr', blogPost: arts.map(a => ({ '@type': 'BlogPosting', headline: a.h1 || a.title, url: `${SITE}/actus/${a.slug}`, datePublished: a.date })) };
  const body = `<main class="list"><div class="crumbs"><a href="/">Biff City</a> › Actus</div><h1>Les actus de Biff City</h1><p class="intro">Nouveautés, événements et guides du jeu : paris sportifs fictifs, casino gratuit, crypto, collection de cartes et vie nocturne.</p><div class="grid">${arts.map(cardOf).join('')}</div></main>`;
  return shell({ title: 'Actus et guides du jeu | Biff City', desc: 'Toutes les nouveautés et les guides de Biff City : paris sportifs fictifs, casino gratuit, crypto sans argent réel, collection de cartes et événements.', url, img: c.hero.img, ld, body, slug: 'actus' });
}

const articleSlugs = content => clean(content || defaults()).articles.map(a => ({ slug: a.slug, date: a.date }));

module.exports = { render, clean, defaults, renderArticle, renderIndex, articleSlugs };
