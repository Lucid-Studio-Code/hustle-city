// Régénère landing/index.html (version de secours et tests en local) depuis landing/template.html + landing/content.json : node tools/landing.js
const fs = require('fs'), path = require('path'), { render } = require('../landing/render.js');
fs.writeFileSync(path.join(__dirname, '../landing/index.html'), render());
console.log('landing/index.html régénéré');
