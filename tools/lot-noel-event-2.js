// Lot « Event Noël, visuels 2 » (20/10/26)
// Lot d'images Hustle City : à coller dans la console de Chrome, sur magnific.com/app/ai-image-generator
// Avant : mode Unlimited sur ON, qualité « 2K · High », Smart prompt sur OFF. Le script s'arrête tout seul sinon (jamais de crédits).
// Outil d'automatisation Magnific (à coller dans la page magnific.com/app/ai-image-generator)
window.HC = {
  w: ms => new Promise(r => setTimeout(r, ms)),
  S: "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, slightly exaggerated funny proportions, humorous cartoon vibe, clean vector-like rendering, high detail, same art style as the reference images, a bit more urban street style. ",
  results: {}, log: [],
  btn: re => [...document.querySelectorAll('button')].find(b => re.test(b.innerText.trim())),
  async prompt(t) { const ed = document.querySelector('[contenteditable=true]'); ed.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, t); await HC.w(300); },
  vis: e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; },
  // le format et la qualité sont parfois rangés derrière la roue ⚙️ à côté du modèle : on l'ouvre si besoin
  async openSettings() { const m = [...document.querySelectorAll('button')].find(b => /Nano Banana/.test(b.innerText)); const row = m && m.parentElement; const g = row && [...row.querySelectorAll('button')].find(b => b !== m && !b.innerText.trim()); if (g) { g.click(); await HC.w(700); return true; } return false; },
  // on cherche seulement dans le panneau de gauche et les menus ouverts (pas dans l'historique des images)
  panel() { const m = [...document.querySelectorAll('button')].find(b => /Nano Banana/.test(b.innerText)); let p = m; while (p && p.parentElement && !p.querySelector('[contenteditable=true]')) p = p.parentElement; return p || document.body; },
  findText(re) { const roots = [HC.panel(), ...document.querySelectorAll('[role=dialog],[role=listbox],[role=menu],[data-radix-popper-content-wrapper]')]; return roots.flatMap(r => [...r.querySelectorAll('button,[role=option],[role=radio],[role=menuitem],li,label,div,span')]).filter(e => HC.vis(e) && e.children.length < 6 && re.test((e.innerText || '').trim())).sort((a, b) => a.innerText.length - b.innerText.length)[0]; },
  async ratio(r) { const re = new RegExp('^' + r.replace(':', '\\s*:\\s*') + '(\\n|$)'); let o = HC.findText(re); if (!o) { await HC.openSettings(); o = HC.findText(re); } if (!o) { const cur = [...document.querySelectorAll('button')].find(b => HC.vis(b) && /^\d+:\d+$|^auto$/i.test(b.innerText.trim())); if (cur) { cur.click(); await HC.w(600); o = HC.findText(re); } } if (!o) for (const alt of ({ '3:1': ['21:9', '16:9'], '1:3': ['9:21', '9:16'], '2:1': ['16:9', '21:9'], '1:2': ['9:16'] }[r] || [])) { o = HC.findText(new RegExp('^' + alt.replace(':', '\\s*:\\s*') + '(\\n|$)')); if (o) { HC.log.push('format ' + r + ' remplacé par ' + alt); break; } }
    if (o) { o.click(); await HC.w(500); } else HC.log.push('format ' + r + ' introuvable (gardé tel quel)'); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await HC.w(300); },
  check() { const t = document.querySelector('[data-cy=smart-prompt-toggle]'); const off = !t || t.querySelector('span').className.includes('bg-surface-4'); const gen = [...document.querySelectorAll('button')].find(x => x.innerText.trim().startsWith('Generate')); const ub = document.querySelector('[data-cy=unlimited-mode-toggle-button]'); const unl = !!gen && (gen.innerText.includes('Unlimited') || /Unlimited generations/.test((gen.parentElement || {}).innerText || '')) && (!ub || ub.innerText.trim() === 'ON'); const qe = [...document.querySelectorAll('button,span')].find(x => HC.vis(x) && /^(1K|2K|4K)\b/.test(x.innerText.trim())); return { off, unl, q: qe ? qe.innerText.trim() : null, gen }; },
  // jamais de crédits : on ne lance QUE si « Unlimited » est affiché. La qualité, si on la voit, doit être 2K.
  async go() { let c; for (let i = 0; i < 25; i++) { c = HC.check(); if (c.unl && (!c.q || /2K/.test(c.q))) break; await HC.w(800); } if (!c.unl) return 'STOP : mode Unlimited pas actif'; if (c.q && !/2K/.test(c.q)) return 'STOP : qualité ' + c.q + ' (mets 2K)'; c.gen.click(); return 'generating'; },
  api: 'https://www.magnific.com/app/api/projects/folders/7fabba97-a6a0-4437-be44-e477002c2690/files?page=1&per_page=60&order_by=created_at&order_direction=desc&folder_reference=7fabba97-a6a0-4437-be44-e477002c2690&lang=en_US&user_id=98122212',
  async list() { const j = await (await fetch(HC.api, { credentials: 'include', headers: { Accept: 'application/json' } })).json(); return j.data.map(f => { const s = JSON.stringify(f.creation || {}); const m = s.match(/https:\\?\/\\?\/pikaso[^"]+render\.(?:png|jpg)\?token=[^"\\&]+/); return { t: Date.parse(f.created_at), name: f.name, url: m ? m[0].replace(/\\\//g, '/') : null }; }); },
  async find(prompt, since) { const l = await HC.list(); const hit = l.find(x => x.url && x.t >= since - 15000 && x.name && (x.name === prompt || (x.name.length >= 300 && prompt.startsWith(x.name.replace(/…$/, ''))))); return hit ? hit.url : null; },
  async run(list) { HC.running = true; try { for (const [name, ratio, p, ref] of list) { if (HC.results[name] || HC.stop) continue; try { if (ref) { const n = await HC.swapToUrl(HC.results[ref] || ref); if (!n) HC.log.push(name + ' : modèle pas ajouté'); } else await HC.clearRefs(); } catch (e) { HC.log.push(name + ' : modèle ' + e.message); } if (!document.querySelector('[contenteditable=true]')) { HC.log.push('pas de zone de saisie'); break; } await HC.prompt(p); await HC.ratio(ratio); await HC.w(300); const since = Date.now(); const g = await HC.go(); if (g !== 'generating') { HC.log.push(name + ' ' + g); HC.stop = true; break; } let url = null; for (let i = 0; i < 180 && !url; i++) { await HC.w(5000); try { url = await HC.find(p, since); } catch (e) {} } if (url) HC.results[name] = url; else HC.log.push(name + ' timeout'); await HC.w(1000); } } catch (e) { HC.log.push('erreur ' + e.message); } HC.running = false; },
  async clearRefs() {
    if (HC.btn(/^Clear all$/)) { HC.btn(/^Clear all$/).click(); await HC.w(800); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await HC.w(500); }
    for (const b of [...document.querySelectorAll('[aria-label^="Remove"]')]) { b.click(); await HC.w(500); }
  },
  async swapToUrl(url) {
    if (HC.btn(/^Clear all$/)) { HC.btn(/^Clear all$/).click(); await HC.w(800); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await HC.w(800); }
    for (const b of [...document.querySelectorAll('[aria-label^="Remove"]')]) { b.click(); await HC.w(600); }
    const blob = await (await fetch(url)).blob();
    const add = [...document.querySelectorAll('div,button')].find(e => /^Add$/.test((e.innerText || '').trim()) && e.children.length <= 2); add.click(); await HC.w(2000);
    if (HC.btn(/^Clear all$/)) { HC.btn(/^Clear all$/).click(); await HC.w(800); }
    const inp = [...document.querySelectorAll('input[type=file]')].find(i => i.accept.includes('image/'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'reference.png', { type: 'image/png' }));
    inp.files = dt.files; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
    await HC.w(6000);
    const b = HC.btn(/^Add( \d+)?$/); if (b) b.click(); await HC.w(3000);
    return document.body.innerText.match(/\d+\/14/)?.[0];
  }
};

// petit ZIP sans compression, pour tout télécharger en un seul fichier
HC.zip = async (entries) => {
  const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = crcT[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const parts = [], cent = []; let off = 0;
  for (const [name, data] of entries) {
    const nm = new TextEncoder().encode(name), c = crc(data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, c, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    const e = new DataView(new ArrayBuffer(46)); e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint32(16, c, true); e.setUint32(20, data.length, true); e.setUint32(24, data.length, true); e.setUint16(28, nm.length, true); e.setUint32(42, off, true);
    cent.push(new Uint8Array(e.buffer), nm); off += 30 + nm.length + data.length;
  }
  const cs = cent.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cs, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...cent, new Uint8Array(end.buffer)], { type: 'application/zip' });
};
// télécharge toutes les images dans UN seul fichier « hustle-city-images.zip »
HC.downloadAll = async (results) => {
  const entries = [];
  for (const [name, url] of Object.entries(results)) { const b = new Uint8Array(await (await fetch(url)).arrayBuffer()); entries.push([name + '.png', b]); }
  const a = document.createElement('a'); a.href = URL.createObjectURL(await HC.zip(entries)); a.download = 'hustle-city-images.zip'; a.click();
};
HC.LOT = [["deco-xm-traineau", "1:1", "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style, funny Christmas vibe. Santa's red sleigh tuned like a street racing car: chrome rims, neon purple underglow, a big spoiler, wrapped gifts in the back, parked on a bit of snowy street with a little parking ticket on the seat, wide and low, same footprint as a parked sports car. City decoration object for an isometric city-builder mobile game, same isometric 3/4 view, standing on a tiny patch of snowy ground. Single isolated game item, centered, on a plain pure white background, nothing else. No text, no letters, no numbers, no words, no logos, no brands."], ["deco-xm-sapin-or", "1:1", "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style, funny Christmas vibe. A tall Christmas tree made of stacked shiny gold bars, decorated with diamond baubles and a glowing gold star on top, on a small snowy roundabout island, very luxurious. City decoration object for an isometric city-builder mobile game, same isometric 3/4 view, standing on a tiny patch of snowy ground. Single isolated game item, centered, on a plain pure white background, nothing else. No text, no letters, no numbers, no words, no logos, no brands."], ["booster-noel", "2:3", "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style, funny Christmas vibe. A sealed foil booster pack of collectible cards seen perfectly from the FRONT, flat and straight, slightly crinkled shiny red and gold holographic foil, crimped top and bottom edges, decorated with snowflakes and holly; on the front a cheeky raccoon thief in a black beanie running with a sack of gifts over snowy rooftops at night. Single isolated game item, centered, on a plain pure white background, nothing else. No text, no letters, no numbers, no words, no logos, no brands."], ["frame-noel", "1:1", "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style, funny Christmas vibe. A round profile avatar frame, empty transparent-looking center (the center is plain white), the ring made of a Christmas wreath of pine branches, red baubles, small gold bells, string lights and a red velvet bow at the bottom, a little snow on top, festive and premium, front view. Single isolated game item, centered, on a plain pure white background, nothing else. No text, no letters, no numbers, no words, no logos, no brands."], ["pin-bonnet", "1:1", "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style, funny Christmas vibe. A red Santa hat with white fur trim and a pompom, red and white enamel. Small enamel pin badge, glossy metal outline, front view, slight 3D thickness. Single isolated game item, centered, on a plain pure white background, nothing else. No text, no letters, no numbers, no words, no logos, no brands."], ["ic-ev-noel", "1:1", "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style, funny Christmas vibe. Game event icon: a red Christmas gift box with a gold bow and a raccoon tail sticking out of it, snowflakes, round glossy badge shape, front view. Single isolated game item, centered, on a plain pure white background, nothing else. No text, no letters, no numbers, no words, no logos, no brands."], ["xm-petard", "1:1", "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style, funny Christmas vibe. A big cartoon red and gold Christmas firecracker with a lit sparkling fuse, ready to explode, front view. Single isolated game item, centered, on a plain pure white background, nothing else. No text, no letters, no numbers, no words, no logos, no brands."], ["ev-noel-bg", "9:16", "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style, funny Christmas vibe. Christmas night in a snowy French suburb seen from a rooftop: tower blocks with lit windows and string lights, snow falling, a giant golden Christmas tree in the middle of a roundabout below, warm red and gold glow, magical atmosphere, empty sky in the upper third. No text, no letters, no numbers, no words, no logos, no brands, no watermark."]];
(async () => {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;z-index:99999;right:16px;bottom:16px;width:280px;padding:14px;border-radius:14px;background:#2a1a10;color:#fff;font:600 14px sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4)';
  document.body.appendChild(box);
  const show = () => { const n = Object.keys(HC.results).length; box.innerHTML = `<b>Hustle City</b><br>${n} / ${HC.LOT.length} images faites${HC.log.length ? '<br><span style="color:#ff8a7a">' + HC.log.join('<br>') + '</span>' : ''}`; };
  const t = setInterval(show, 2000); show();
  await HC.run(HC.LOT); clearInterval(t); show();
  const b = document.createElement('button'); b.textContent = 'Copier les résultats'; b.style.cssText = 'display:block;width:100%;margin-top:10px;padding:10px;border:0;border-radius:10px;background:#5fc73a;color:#fff;font:700 14px sans-serif;cursor:pointer';
  b.onclick = () => { const txt = Object.entries(HC.results).map(([k, v]) => k + ' ' + v).join('\n'); navigator.clipboard.writeText(txt); b.textContent = 'Copié ! Colle-le à Claude'; };
  box.appendChild(b);
  const d = document.createElement('button'); d.textContent = 'Télécharger tout (1 fichier)'; d.style.cssText = b.style.cssText.replace('#5fc73a', '#45a8ec');
  d.onclick = async () => { d.textContent = 'Préparation…'; await HC.downloadAll(HC.results); d.textContent = 'Glisse le fichier dans Claude'; };
  box.appendChild(d);
})();
'Lot lancé';
