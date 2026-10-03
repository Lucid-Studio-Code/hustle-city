// Banc d'essai d'équilibrage : fait tourner le vrai moteur du jeu (data.js + game.js) sans navigateur, en accéléré.
// Usage : node tools/sim.js [jours]
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
let clock = Date.parse('2026-10-01T08:00:00Z');
const store = {};
const ctx = { console, Math, JSON, Object, Array, Number, String, Set, Map, Promise, parseFloat, parseInt, isFinite, isNaN,
  Date: class extends Date { constructor(...a) { super(...(a.length ? a : [clock])); } static now() { return clock; } },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  sessionStorage: { getItem: () => null, setItem() {} }, location: { hash: '', hostname: 'sim' }, setTimeout() {}, setInterval() {} };
ctx.window = ctx; ctx.window.addEventListener = () => {};
vm.createContext(ctx);
for (const f of ['js/layout.js', 'js/data.js', 'js/game.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const G = ctx.GAME, D = ctx.DATA;
G.load();
module.exports = { G, D, ctx, tick: ms => { clock += ms; }, now: () => clock };
if (require.main === module) {
  const days = +process.argv[2] || 7, st = G.st;
  const itemMax = {}, coinMin = {}, coinMax = {};
  for (let m = 0; m < days * 1440; m++) {
    clock += 60000; G.simulate(false);
    D.ITEMS.forEach(i => { const r = st.market.prices[i.id] / i.p0; itemMax[i.id] = Math.max(itemMax[i.id] || 0, r); });
    D.COINS.forEach(c => { const r = st.crypto.prices[c.id] / c.p0; coinMin[c.id] = Math.min(coinMin[c.id] ?? 9, r); coinMax[c.id] = Math.max(coinMax[c.id] || 0, r); });
  }
  const end = D.ITEMS.map(i => [i.id, st.market.prices[i.id] / i.p0, itemMax[i.id]]).sort((a, b) => b[1] - a[1]);
  console.log(`Après ${days} j — objets (prix/prix de départ, fin et max) :`);
  end.forEach(([id, e, mx]) => console.log(`  ${id.padEnd(14)} fin ×${e.toFixed(2)}  max ×${mx.toFixed(2)}`));
  console.log('Cryptos (min / max / fin) :');
  D.COINS.forEach(c => console.log(`  ${c.name.padEnd(11)} ×${coinMin[c.id].toFixed(2)} / ×${coinMax[c.id].toFixed(2)} / ×${(st.crypto.prices[c.id] / c.p0).toFixed(2)}`));
}
