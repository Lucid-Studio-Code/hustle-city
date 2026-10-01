/* Hustle City : tutoriel guidé (projecteur + flèche + bulle du cousin Momo). Chaque étape avance quand le joueur fait le geste. */
(function () {
  'use strict';
  const D = window.DATA, G = window.GAME, U = window.UI;
  const st = () => G.st;
  const $ = s => document.querySelector(s);
  const modalOpen = () => !$('#modal').classList.contains('hidden');
  const S = k => st().stats[k] || 0;

  // target : sélecteur de l'élément à montrer ; done : condition pour passer à la suite ; before : action à l'arrivée sur l'étape
  const STEPS = [
    { say: n => `Wesh ${n} ! Moi c'est Momo, ton cousin. T'as 200<i class="cur"></i> en poche et un vieux PC. Je vais te montrer comment ça tourne ici.`, btn: 'Vas-y' },
    { say: () => 'Ça, c\'est <b>ton appart</b>. Entre, on commence par là.', target: '.bld[data-id=appart]', before: () => U.focusBld('appart'), done: () => U.scene === 'appart' },
    { say: () => 'Ta <b>machine à crypto</b> fabrique de l\'argent toute seule, même quand t\'es pas là. Touche-la.', target: '[data-act=rig]', done: () => !!$('[data-act=rigCollect]') },
    { say: () => '<b>Encaisse</b> ce qu\'elle a fabriqué. Elle chauffe et s\'arrête au bout de 20 min : reviens la vider, ça la relance. Plus tard, touche juste sa bulle.', target: '[data-act=rigCollect]', done: () => S('rigCollect') > 0 },
    { say: () => 'Ferme cette fenêtre.', target: '#modal .sheet-close', done: () => !modalOpen() },
    { say: () => 'Et là, <b>ton PC</b> : tu y achètes des cryptos, des monnaies dont le prix bouge tout le temps.', target: '[data-act=pc]', done: () => !!$('#cr-amt') },
    { say: () => 'Mets <b>50<i class="cur"></i></b> sur l\'Axion. Si son prix monte, tu revends plus cher et tu gagnes la différence. S\'il baisse… tu perds.', target: '[data-act=crBuy]', before: () => { const i = $('#cr-amt'); if (i && st().cash >= 50) i.value = 50; }, done: () => S('cryptoBuy') > 0 },
    { say: () => 'Bien joué, t\'es investisseur. Ferme, on sort.', target: '#modal .sheet-close', done: () => !modalOpen() },
    { say: () => 'Retourne <b>en ville</b>.', target: '#btn-scene', done: () => U.scene === 'city' },
    { say: () => 'En face, <b>le Balto</b> : les paris sportifs et les tickets à gratter. Entre.', target: '.bld[data-id=balto]', before: () => U.focusBld('balto'), done: () => !!$('[data-act=bPick]') },
    { say: () => 'Choisis qui va gagner. <b>1</b> = l\'équipe de gauche, <b>N</b> = match nul, <b>2</b> = celle de droite. Plus la cote est haute, moins c\'est probable, mais plus ça rapporte.', target: '[data-act=bPick]', done: () => !!$('[data-act=bPlace]') },
    { say: () => 'Mets ta mise (10<i class="cur"></i>, c\'est bien pour commencer) et <b>valide ton pari</b>. Le match commence dans quelques minutes.', target: '[data-act=bPlace]', done: () => S('bets') > 0 },
    { say: () => 'Pari posé ! Tu verras le résultat dans <b>Mes paris</b>. Ferme.', target: '#modal .sheet-close', done: () => !modalOpen() },
    { say: () => 'Ici, le <b>trophée</b> : tes missions, tes 3 défis du jour et ce que t\'apporte chaque niveau. Ouvre-le.', target: '#trophy', done: () => !!$('[data-act=claimQuest]') },
    { say: () => 'T\'en as déjà réussi. <b>Réclame ta récompense</b> !', target: '[data-act=claimQuest]', done: () => Object.keys(st().quests).length > 0 },
    { say: () => 'Ferme.', target: '#modal .sheet-close', done: () => !modalOpen() },
    { say: () => 'Cadeau : <b>un booster de cartes gratuit chaque jour</b>. Touche « Booster ».', target: '#btn-booster', done: () => !!$('[data-act=boosterOpen]:not([disabled])') || S('boosters') > 0 },
    { say: () => '<b>Ouvre-le</b> !', target: '[data-act=boosterOpen]:not([disabled])', done: () => !!$('#pack.on') || S('boosters') > 0 },
    { say: () => 'Touche les cartes pour les retourner. La dernière est une <b>carte de collection</b> : elle a une vraie cote, comme une vraie carte.', target: '#pack .pk-stack:not(.hidden), #pack .pk-done:not(.hidden)', done: () => S('boosters') > 0 && !$('#pack.on') },
    { say: () => 'Voilà, t\'as les bases. Le but : faire grimper ton <b>patrimoine</b> (en haut à droite). Reviens chaque jour pour ton <b>cadeau</b> et ton booster. Au <b>niveau 2</b>, le casino et le Comptoir ouvrent. Et retiens : le casino gagne toujours à la fin. À toi de jouer !', btn: 'C\'est parti', before: () => U.closeModal() }
  ];

  let idx = 0, timer = null, el = {};
  function ensureDom() {
    if (el.spot) return;
    const app = $('#app');
    el.spot = document.createElement('div'); el.spot.id = 'tuto-spot';
    el.arrow = document.createElement('div'); el.arrow.id = 'tuto-arrow';
    el.arrow.innerHTML = U.has('ui-tuto-arrow') ? `<img src="${U.src('ui-tuto-arrow')}" alt="">` : '👇';
    el.say = document.createElement('div'); el.say.id = 'tuto-say';
    app.append(el.spot, el.arrow, el.say);
  }
  function place() {
    const step = STEPS[idx]; if (!step) return;
    const app = $('#app').getBoundingClientRect();
    const t = step.target && [...document.querySelectorAll(step.target)].find(e => e.offsetParent !== null);
    if (!t) { el.spot.style.display = 'none'; el.arrow.style.display = 'none'; el.say.classList.remove('low'); return; }
    const r = t.getBoundingClientRect(), pad = 6;
    Object.assign(el.spot.style, { display: 'block', left: (r.left - app.left - pad) + 'px', top: (r.top - app.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
    const above = r.top - app.top > 90;
    Object.assign(el.arrow.style, { display: 'block', left: (r.left - app.left + r.width / 2 - 24) + 'px', top: (above ? r.top - app.top - 62 : r.bottom - app.top + 6) + 'px' });
    el.arrow.classList.toggle('up', !above);
    // la bulle se met du côté opposé à la cible
    el.say.classList.toggle('low', r.top - app.top < app.height * .5);
  }
  function show() {
    const step = STEPS[idx];
    if (!step) return finish();
    ensureDom();
    if (step.before) step.before();
    el.say.innerHTML = `<div class="who">${U.pic('guide', '🧢')}</div><div class="bubble"><button class="tuto-skip" id="tuto-skip">Passer</button><span class="nm">Momo</span>${step.say(U.esc(st().name))}${step.btn ? `<div style="text-align:right;margin-top:8px"><button class="btn green sm" id="tuto-next">${step.btn}</button></div>` : ''}</div>`;
    const nb = $('#tuto-next'); if (nb) nb.onclick = () => next();
    $('#tuto-skip').onclick = () => skip();
    el.spot.classList.toggle('dim', !!step.target);
    setTimeout(place, 60);
  }
  function next() { idx++; st().tutoStep = idx; G.save(); show(); }
  function tick() {
    const step = STEPS[idx]; if (!step) return;
    if (step.done && step.done()) return next();
    place();
  }
  function finish() {
    clearInterval(timer); timer = null;
    ['spot', 'arrow', 'say'].forEach(k => el[k] && el[k].remove()); el = {};
    st().tutoDone = true; G.save();
  }
  function start(from) {
    idx = from != null ? from : Math.min(st().tutoStep || 0, STEPS.length - 1);
    // reprise en cours de route : on repart d'une étape qui a du sens
    if (idx > 0 && idx < 9) idx = S('cryptoBuy') ? 8 : 1;
    else if (idx >= 9 && idx < 13) idx = S('bets') ? 13 : 9;
    show(); clearInterval(timer); timer = setInterval(tick, 300);
  }
  function skip() { finish(); }

  window.TUTO = { start, skip, get active() { return !!timer; } };
})();
