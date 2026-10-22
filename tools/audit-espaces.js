// Mesure des espacements d'un écran (appelé par tools/test-amis.js dans la page) : aucun texte collé au bord de sa carte / de son bouton,
// rien qui déborde, pas deux textes qui se chevauchent. Renvoie la liste des défauts (vide = propre).
module.exports = function audit(opt) {
  const H = (opt && opt.h) || 8, V = (opt && opt.v) || 4, out = [];
  const roots = [...document.querySelectorAll('#phone-layer.on .phone, #modal:not(.hidden) .sheet:not(.modal-under .sheet), #ph-banner.show')].filter(r => !r.closest('.modal-under'));
  const BOX = '.chat-row, .am-me, .am-par, .am-tile, .am-card, .btn, .am-pop-pin, .gc, .am-msg, .am-tabs button, .am-seg button, .ph-notif, #ph-banner, .am-add input, .pf-tile, .pf-chip, .lb-row, .ph-all, .am-medal.num, .sheet-head, .wp-later, .badge, .pf-worth, .pf-photo-row, .pf-home, .pf-tr';
  const name = el => (el.id ? '#' + el.id : '') + '.' + [...el.classList].join('.');
  const vis = el => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
  const texts = [];
  roots.forEach(root => {
    const rr = root.getBoundingClientRect();
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.textContent.trim() || !n.parentElement || !vis(n.parentElement)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n); const rs = [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1); if (!rs.length) continue;
      // texte visible seulement (dans la zone qui défile)
      const sc = n.parentElement.closest('.ph-scroll, .sheet-body'); const sr = sc ? sc.getBoundingClientRect() : rr;
      const R = rs.filter(r => r.bottom > sr.top + 2 && r.top < sr.bottom - 2); if (!R.length) continue;
      // sa boîte : une carte, un bouton, une pastille… sinon le premier parent qui a un fond ou une bordure (dans l'écran mesuré)
      const deco = e => { const c = getComputedStyle(e); return (c.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor)) || c.backgroundImage !== 'none' || parseFloat(c.borderTopWidth) > 0 || parseFloat(c.borderLeftWidth) > 0; };
      let box = n.parentElement.closest(BOX); if (!box || !root.contains(box)) { box = null; for (let e = n.parentElement; e && e !== root && root.contains(e); e = e.parentElement) if (deco(e) && !/^(B|I|EM|SMALL|SPAN|STRONG|SUP)$/.test(e.tagName)) { box = e; break; } }
      const txt = n.textContent.trim().slice(0, 30);
      // texte coupé par une ellipse voulue : on ne compte pas son bord droit
      const ell = el => { for (let e = el; e && e !== box; e = e.parentElement) if (getComputedStyle(e).textOverflow === 'ellipsis') return true; return false; };
      R.forEach(r => texts.push({ r, el: n.parentElement, txt }));
      if (box && root.contains(box)) {
        const b = box.getBoundingClientRect(), cs = getComputedStyle(box), bl = parseFloat(cs.borderLeftWidth), br = parseFloat(cs.borderRightWidth), bt = parseFloat(cs.borderTopWidth), bb = parseFloat(cs.borderBottomWidth);
        const L = Math.min(...R.map(r => r.left)) - (b.left + bl), Rt = (b.right - br) - Math.max(...R.map(r => r.right)), T = Math.min(...R.map(r => r.top)) - (b.top + bt), B = (b.bottom - bb) - Math.max(...R.map(r => r.bottom));
        const round = box.matches('.gc, .badge, .am-medal.num, .wp-later, .sheet-head');   // pastilles et liens : 4 px suffisent
        // un symbole seul (‹ › ✓ ✕, un emoji) : sa boîte de ligne dépasse son dessin, on ne vérifie que les côtés, à 4 px
        const glyph = [...txt].length <= 2 && !/[a-z0-9]/i.test(txt);
        const h = round || glyph ? 4 : H, v = glyph ? -4 : box.matches('.badge, .am-medal.num, .wp-later, .sheet-head') ? 0 : V;
        if (L < h || (Rt < h && !ell(n.parentElement)) || T < v || B < v) out.push({ t: 'bord', box: name(box), txt, g: [L, Rt, T, B].map(x => Math.round(x)) });
      }
      // texte qui sort de son écran
      if (R.some(r => r.left < rr.left - 1 || r.right > rr.right + 1)) out.push({ t: 'sort', txt });
    }
    // éléments qui débordent de leur boîte sans le vouloir
    root.querySelectorAll('*').forEach(el => { if (!vis(el) || !el.textContent.trim() || el.closest('.ph-scroll, .sheet-body') === el) return; const cs = getComputedStyle(el);
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis' && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') out.push({ t: 'déborde', el: name(el), d: el.scrollWidth - el.clientWidth }); });
  });
  // deux textes différents qui se chevauchent
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j]; if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (x > 2 && y > 2) out.push({ t: 'chevauche', a: a.txt, b: b.txt });
  }
  const seen = new Set(); return out.filter(o => { const k = JSON.stringify(o); if (seen.has(k)) return false; seen.add(k); return true; });
};
