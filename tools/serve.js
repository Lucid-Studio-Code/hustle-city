// Petit serveur statique pour tester le jeu en local : node tools/serve.js
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.ROOT || path.join(__dirname, '..'), port = +process.env.PORT || 5190;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.md': 'text/markdown' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(b); });
}).listen(port, () => console.log('Hustle City sur http://localhost:' + port));
