// Outil d'automatisation Magnific (à coller dans la page magnific.com/app/ai-image-generator)
window.HC = {
  w: ms => new Promise(r => setTimeout(r, ms)),
  S: "2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, slightly exaggerated funny proportions, humorous cartoon vibe, clean vector-like rendering, high detail, same art style as the reference images, a bit more urban street style. ",
  results: {}, log: [],
  btn: re => [...document.querySelectorAll('button')].find(b => re.test(b.innerText.trim())),
  async prompt(t) { const ed = document.querySelector('[contenteditable=true]'); ed.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, t); await HC.w(300); },
  async ratio(r) { const cur = [...document.querySelectorAll('button')].find(b => /^\d+:\d+$|^auto$/i.test(b.innerText.trim())); if (cur.innerText.trim() === r) return; cur.click(); await HC.w(500); const o = [...document.querySelectorAll('button,[role=option],li,div')].filter(e => e.children.length < 6 && (e.innerText || '').trim().startsWith(r + '\n')).pop(); o.click(); await HC.w(400); },
  check() { const t = document.querySelector('[data-cy=smart-prompt-toggle]'); const off = !t || t.querySelector('span').className.includes('bg-surface-4'); const gen = [...document.querySelectorAll('button')].find(x => x.innerText.trim().startsWith('Generate')); const ub = document.querySelector('[data-cy=unlimited-mode-toggle-button]'); return { off, unl: !!gen && gen.innerText.includes('Unlimited') && (!ub || ub.innerText.trim() === 'ON'), q: [...document.querySelectorAll('button')].map(x => x.innerText.trim()).filter(t => /·/.test(t))[0], gen }; },
  async go() { let c; for (let i = 0; i < 25; i++) { c = HC.check(); if (c.off && c.unl && c.q === '2K · High') break; await HC.w(800); } if (!c.off || !c.unl || c.q !== '2K · High') return 'STOP ' + JSON.stringify({ off: c.off, unl: c.unl, q: c.q }); c.gen.click(); return 'generating'; },
  api: 'https://www.magnific.com/app/api/projects/folders/7fabba97-a6a0-4437-be44-e477002c2690/files?page=1&per_page=60&order_by=created_at&order_direction=desc&folder_reference=7fabba97-a6a0-4437-be44-e477002c2690&lang=en_US&user_id=98122212',
  async list() { const j = await (await fetch(HC.api, { credentials: 'include', headers: { Accept: 'application/json' } })).json(); return j.data.map(f => { const s = JSON.stringify(f.creation || {}); const m = s.match(/https:\\?\/\\?\/pikaso[^"]+render\.png\?token=[^"\\&]+/); return { t: Date.parse(f.created_at), name: f.name, url: m ? m[0].replace(/\\\//g, '/') : null }; }); },
  async find(prompt, since) { const l = await HC.list(); const hit = l.find(x => x.url && x.t >= since - 15000 && x.name === prompt); return hit ? hit.url : null; },
  async run(list) { HC.running = true; try { for (const [name, ratio, p] of list) { if (HC.results[name] || HC.stop) continue; if (!document.querySelector('[contenteditable=true]')) { HC.log.push('pas de zone de saisie'); break; } await HC.prompt(p); await HC.ratio(ratio); await HC.w(300); const since = Date.now(); const g = await HC.go(); if (g !== 'generating') { HC.log.push(name + ' ' + g); HC.stop = true; break; } let url = null; for (let i = 0; i < 180 && !url; i++) { await HC.w(5000); try { url = await HC.find(p, since); } catch (e) {} } if (url) HC.results[name] = url; else HC.log.push(name + ' timeout'); await HC.w(1000); } } catch (e) { HC.log.push('erreur ' + e.message); } HC.running = false; },
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
'HC ok';
