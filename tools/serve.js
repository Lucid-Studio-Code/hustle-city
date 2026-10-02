// Petit serveur statique pour tester le jeu en local : node tools/serve.js
// + le bouton « Publier » du back-office (game.html#admin) : POST /admin/layout écrit js/layout.js puis le pousse sur GitHub.
const http = require('http'), fs = require('fs'), path = require('path'), { execFile } = require('child_process');
const root = process.env.ROOT || path.join(__dirname, '..'), port = +process.env.PORT || 5190;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.md': 'text/markdown' };
const git = args => new Promise(ok => execFile('git', args, { cwd: root }, (e, out, err) => ok({ e, out: String(out) + String(err) })));
const isLocal = req => /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress);

function publish(req, res) {
  let body = '';
  req.on('data', c => { body += c; if (body.length > 200000) req.destroy(); });
  req.on('end', async () => {
    const send = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    let L; try { L = JSON.parse(body); } catch (e) { return send(400, { err: 'Données illisibles.' }); }
    const keep = { buildings: L.buildings || {}, decos: L.decos || {}, rooms: L.rooms || [], texts: L.texts || {}, shop: L.shop || {}, club: L.club || {} };
    fs.writeFileSync(path.join(root, 'js/layout.js'), '/* Placements réglés dans le back-office (game.html#admin, sur localhost). Généré par le bouton « Publier » : ne pas modifier à la main. */\nwindow.LAYOUT = ' + JSON.stringify(keep, null, 1) + ';\n');
    await git(['add', 'js/layout.js']);
    const c = await git(['commit', '-m', 'Back-office : nouveaux placements', '--', 'js/layout.js']);
    if (c.e && !/nothing to commit|rien à valider/.test(c.out)) return send(500, { err: 'Enregistré sur ton Mac, mais pas mis en ligne.', detail: c.out });
    const pull = await git(['pull', '--rebase', '--autostash', '-q', 'origin', 'main']);
    const push = await git(['push', '-q', 'origin', 'main']);
    if (push.e) return send(500, { err: 'Enregistré sur ton Mac, mais la mise en ligne a échoué.', detail: pull.out + push.out });
    send(200, { ok: true });
  });
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/admin/layout') { if (!isLocal(req)) { res.writeHead(403); return res.end(); } return publish(req, res); }
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(b); });
}).listen(port, () => console.log('Hustle City sur http://localhost:' + port));
