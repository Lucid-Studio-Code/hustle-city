// Prépare le dossier www/ de l'application (iPhone / Android) : le jeu tel qu'il est, tout en local, sans les outils de dev.
// Lancer : npm run app:build   (puis npx cap sync, ou directement npm run app:ios / app:android)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const copy = (from, to) => fs.cpSync(path.join(root, from), path.join(out, to || from), { recursive: true });
['js', 'css', 'assets'].forEach(d => copy(d));
// la page d'accueil de l'application = game.html, avec l'adresse du serveur
let html = fs.readFileSync(path.join(root, 'game.html'), 'utf8');
html = html.replace('<head>', `<head>\n  <script>window.HC_APP = true; window.HC_API = ${JSON.stringify(cfg.apiUrl || '')};</script>`);
fs.writeFileSync(path.join(out, 'index.html'), html);
// rien du back office ni des réglages de placement dans l'application
fs.rmSync(path.join(out, 'js', 'push.js.map'), { force: true });
const size = d => fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`www/ prêt (${Math.round(size(out) / 1048576)} Mo), serveur : ${cfg.apiUrl || 'aucun (jeu hors ligne)'}`);
