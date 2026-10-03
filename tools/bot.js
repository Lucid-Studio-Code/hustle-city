// Joueur robot pour l'équilibrage : une session active « normale » minute par minute avec le vrai moteur.
// Usage : node tools/bot.js [heures actives] [heures hors-ligne entre deux sessions] [sessions]
const { G, D, tick } = require('./sim.js');
const H = +process.argv[2] || 1, OFF = +process.argv[3] || 0, N = +process.argv[4] || 10;
const st = G.st, log = [];
let minutes = 0;
function minute(m) {
  tick(60000); G.simulate(false); minutes++;
  // minage : relance dès que c'est fini (la crypto la plus courte), on refroidit si ça chauffe
  const i = G.rigInfo();
  if (i.idle) G.mineStart('btk'); else if (i.ready) { G.mineHarvest(); G.mineStart('btk'); } else if (i.heat > 70) G.mineCool();
  // on revend la crypto minée de temps en temps
  if (m % 30 === 0) D.COINS.forEach(c => { if (st.crypto.hold[c.id] * st.crypto.prices[c.id] > 5) G.sellCrypto(c.id, 1); });
  // un pari toutes les 4 min, mise = 10 % du cash (plafonnée), sur le favori
  if (m % 4 === 0) { const mt = st.matches.find(x => x.state === 'soon' && !G.betOn(x.id) && st.lvl >= D.SPORTS[x.sport].lvl);
    if (mt) { const fav = mt.odds.indexOf(Math.min(...mt.odds)); const stake = Math.min(G.betMax(), Math.floor(st.cash * .1)); if (stake >= 1) G.placeBet([{ m: mt.id, pick: fav }], stake); } }
  // 10 tours de machine à sous par heure (si le casino est ouvert)
  if (m % 6 === 0 && st.lvl >= D.SLOT.lvl) { const b = D.SLOT.bets.filter(x => x <= st.cash * .05).pop(); if (b) G.spin(b); }
  // missions, cadeau du jour, améliorations
  D.QUESTS.forEach(q => { if (G.questState(q).done) G.claimQuest(q.id); });
  if (G.dailyReady && G.dailyReady()) G.claimDaily();
  if (G.rigNext() && st.cash >= G.rigNext().price * 1.2) G.rigUpgrade();
}
for (let s = 0; s < N; s++) {
  for (let m = 0; m < H * 60; m++) minute(m);
  log.push(`session ${String(s + 1).padStart(2)} : niveau ${st.lvl} (${st.xp}/${G.xpNeed()} XP), cash ${Math.round(st.cash)}, machine ${st.rig.lvl + 1}, patrimoine ${Math.round(G.worth())}`);
  // avant de partir : on récolte et on lance le minage le plus long possible
  if (OFF) { for (let k = 0; k < 30 && G.st.mine && !G.rigInfo().ready; k++) { tick(60000); G.simulate(false); }
    const i = G.rigInfo(); if (i.ready) G.mineHarvest(); if (!G.st.mine) { const o = D.MINE.filter(x => x.need <= st.rig.lvl).sort((a, b) => b.min - a.min)[0]; G.mineStart(o.id); }
    tick(OFF * 3600000); G.simulate(true); const j = G.rigInfo(); if (j.ready) G.mineHarvest(); }
}
console.log(log.join('\n'));
