// Ajoute dans js/data.js les objets prévus (tools/objets-prevus.json) dont l'image item-<id> est installée.
// Relancer après chaque lot d'objets : node tools/add-objets.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), L = require('./objets-prevus.json');
const VOL = { sneaker: .03, watch: .02, gold: .006, gem: .015, car: .03, moto: .035 };
const lines = L.filter(o => fs.existsSync(path.join(root, 'assets/img/item-' + o.id + '.png'))).map(o => {
  const extra = o.cat === 'gold' ? ', drift: .000004, revert: 0, cap: 1.6' : '';
  return `    { id: '${o.id}', cat: '${o.cat}', name: ${JSON.stringify(o.name)}, r: '${o.r}', p0: ${o.p0}, vol: ${VOL[o.cat] || .03}${extra} },`;
});
const p = path.join(root, 'js/data.js'); let s = fs.readFileSync(p, 'utf8');
s = s.replace(/(\/\/ OBJETS-AJOUTES[^\n]*\n)[\s\S]*?(    \/\/ FIN-OBJETS-AJOUTES)/, `$1${lines.join('\n')}${lines.length ? '\n' : ''}$2`);
fs.writeFileSync(p, s); console.log(lines.length + ' objets ajoutés');
