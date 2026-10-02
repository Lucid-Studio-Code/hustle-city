/* Hustle City : tutoriel guidé (projecteur + flèche + bulle du cousin Momo). Chaque étape avance quand le joueur fait le geste. */
(function () {
  'use strict';
  const D = window.DATA, G = window.GAME, U = window.UI;
  const st = () => G.st;
  const $ = s => document.querySelector(s);
  const modalOpen = () => !$('#modal').classList.contains('hidden');
  const S = k => st().stats[k] || 0;

  // target : sélecteur de l'élément à montrer ; done : condition pour passer à la suite ; before : action à l'arrivée sur l'étape
  const MAIN = [
    { say: n => `Wesh ${n} ! Moi c'est Momo, ton cousin. T'as 200<i class="cur"></i> en poche et un vieux PC. Je vais te montrer comment ça tourne ici.`, btn: 'Vas-y' },
    { say: () => 'Ça, c\'est <b>ton appart</b>. Entre, on commence par là.', target: '.bld[data-id=appart]', before: () => U.focusBld('appart'), done: () => U.scene === 'appart' },
    { say: () => 'Ta <b>machine à crypto</b> : tu choisis quoi miner, elle bosse pendant que t\'es pas là. Elle a déjà fini un minage. Touche-la.', target: '[data-act=rig]', done: () => !!$('[data-act=mineHarvest]') || S('rigCollect') > 0 },
    { say: () => '<b>Récolte</b> ! À chaque récolte, tu peux tomber sur une trouvaille : lingots, carte, bloc doré… ou un virus.', target: '[data-act=mineHarvest]', done: () => S('rigCollect') > 0 },
    { say: () => 'Joli ! Maintenant relance-la : touche « Relancer un minage ».', target: '#modal [data-act=rig]', done: () => !!$('[data-act=mineStart]') || !!st().mine },
    { say: () => 'Choisis l\'<b>Axion</b> : rapide et sans risque. Plus tard, tu mineras des cryptos plus longues et plus folles. Pense à la <b>refroidir</b> quand elle chauffe.', target: '[data-act=mineStart][data-id=btk]', done: () => !!st().mine },
    { say: () => 'Ferme cette fenêtre.', target: '#modal .sheet-close', done: () => !modalOpen() },
    { say: () => 'Et là, <b>ton PC</b> : tu y achètes des cryptos, des monnaies dont le prix bouge tout le temps.', target: '[data-act=pc]', done: () => !!$('#cr-amt') },
    { say: () => 'Mets <b>50<i class="cur"></i></b> sur l\'Axion. Si son prix monte, tu revends plus cher et tu gagnes la différence. S\'il baisse… tu perds.', target: '[data-act=crBuy]', before: () => { const i = $('#cr-amt'); if (i && st().cash >= 50) i.value = 50; }, done: () => S('cryptoBuy') > 0 },
    { say: () => 'Bien joué, t\'es investisseur. Ferme, on sort.', target: '#modal .sheet-close', done: () => !modalOpen() },
    { say: () => 'Retourne <b>en ville</b>.', target: '#btn-scene', done: () => U.scene === 'city' },
    { say: () => 'En face, <b>le Royal</b> : les paris sportifs et les tickets à gratter. Entre.', target: '.bld[data-id=balto]', before: () => U.focusBld('balto'), done: () => !!$('[data-act=bPick]') },
    { say: () => 'Choisis qui va gagner. <b>1</b> = l\'équipe de gauche, <b>N</b> = match nul, <b>2</b> = celle de droite. Plus la cote est haute, moins c\'est probable, mais plus ça rapporte.', target: '[data-act=bPick]', done: () => !!$('[data-act=bPlace]') },
    { say: () => 'Mets ta mise (10<i class="cur"></i>, c\'est bien pour commencer) et <b>valide ton pari</b>. Le match commence dans quelques minutes.', target: '[data-act=bPlace]', done: () => S('bets') > 0 },
    { say: () => 'Pari posé ! Tu verras le résultat dans <b>Mes paris</b>. Ferme.', target: '#modal .sheet-close', done: () => !modalOpen() },
    { say: () => 'Ici, le <b>trophée</b> : tes missions, tes 3 défis du jour et ce que t\'apporte chaque niveau. Ouvre-le.', target: '#trophy', done: () => !!$('[data-act=claimQuest]') },
    { say: () => 'T\'en as déjà réussi. <b>Réclame ta récompense</b> !', target: '[data-act=claimQuest]', done: () => Object.keys(st().quests).length > 0 },
    { say: () => 'Ferme.', target: '#modal .sheet-close', done: () => !modalOpen() },
    { say: () => 'Cadeau : <b>un booster de cartes gratuit chaque jour</b>. Touche « Booster ».', target: '#btn-booster', done: () => !!$('[data-act=boosterOpen]:not([disabled])') || S('boosters') > 0 },
    { say: () => '<b>Ouvre-le</b> !', target: '[data-act=boosterOpen]:not([disabled])', done: () => !!$('#pack.on') || S('boosters') > 0 },
    { say: () => 'Touche les cartes pour les retourner. La dernière est une <b>carte de collection</b> : elle a une vraie cote, comme une vraie carte.', target: '#pack .pk-stack:not(.hidden), #pack .pk-done:not(.hidden)', done: () => S('boosters') > 0 && !$('#pack.on') },
    { say: () => 'Voilà, t\'as les bases. Le but : faire grimper ton <b>patrimoine</b> (en haut à droite). Reviens chaque jour pour ton <b>cadeau</b> et ton booster. Au <b>niveau 2</b>, le casino et le Comptoir ouvrent. Et si un jour tu sais plus quoi faire, touche <b>ma tête</b> à droite de l\'écran : je te dirai quoi faire pour avancer. À toi de jouer !', btn: 'C\'est parti', before: () => U.closeModal() }
  ];

  // Mini-tuto de chaque lieu : au début du jeu (lieux du niveau 1) ou dès qu'il se débloque. Appart et Royal sont vus dans le grand tuto.
  const title = () => ([...document.querySelectorAll('#modal .sheet-head > span')].pop() || {}).textContent || '';
  const enter = (id, name, intro, inside, target) => [
    { say: () => intro, target: `.bld[data-id=${id}]`, before: () => U.focusBld(id), done: () => modalOpen() && title() === name },
    { say: () => inside, target, btn: 'Compris' }
  ];
  const BLD = {
    kiosque: enter('kiosque', 'Le Kiosque', 'Là, c\'est <b>le Kiosque</b>, le journal du quartier. Entre.',
      'Toutes les 30 min, un nouveau journal sort avec des <b>tuyaux</b> : qui va gagner un match, si la crypto va monter… Ça coûte un peu, mais ça aide à mieux miser. L\'onglet <b>Boosters</b> vend des paquets de cartes.', '#modal .tabs'),
    bus: enter('bus', 'Arrêt de bus', 'Et ça, c\'est <b>l\'arrêt de bus</b>. Jette un œil.',
      'Le bus mène aux autres quartiers : bijouterie, garage, la Tour… Ils sont encore fermés : ils ouvriront quand tu monteras en niveau.', '#modal .sheet-body'),
    casino: enter('casino', 'Lucky Palace', 'Nouveau : le <b>Lucky Palace</b> est ouvert ! Machine à sous et roulette. Entre.',
      'Choisis ta mise et lance la machine. Sur la durée, elle garde environ 6<i class="cur"></i> sur chaque 100<i class="cur"></i> misés : <b>le casino gagne toujours à la fin</b>. Joue petit, pour le fun.', '[data-act=slSpin]'),
    shop: enter('shop', 'Le Comptoir', 'Nouveau : <b>le Comptoir</b> ! On y achète des cartes, des baskets et des montres de collection. Entre.',
      'Leur prix bouge tout le temps. Tu achètes quand c\'est pas cher, tu revends quand ça monte. Le Comptoir garde une petite part, donc il faut que ça monte assez. L\'onglet <b>Actus</b> te dit ce qui va bouger.', '#modal .tab[data-tab=news]'),
    six: enter('six', 'Tournoi des 6 Quartiers', 'Nouveau sur la place : <b>le Panneau</b> de la ville ! Il annonce les grands événements. Touche-le.',
      'En ce moment : le <b>Tournoi des 6 Quartiers</b>, du rugby. Tes pronos sont <b>gratuits</b> : choisis le gagnant de chaque match avant le coup d\'envoi. Chaque bon prono te fait monter au <b>classement</b> contre les autres joueurs, et des <b>cartes en édition limitée</b> sortent des boosters.', '#modal .tabs'),
    club: enter('club', 'Le Club', 'Nouveau : <b>le Club</b> est ouvert ! Va voir le videur.',
      'Paie l\'entrée au videur, puis touche les <b>coins de la salle</b> : la piste pour l\'XP, le DJ pour doubler l\'ambiance, le bar, les canapés pour rencontrer des gens qui ont des plans, et le carré VIP. Chaque coin une fois par soirée.', '[data-act=clubGo]')
  };
  const BLD_ORDER = ['kiosque', 'bus', 'six', 'shop', 'casino', 'club'];
  const seen = () => (st().bldTuto = st().bldTuto || {});

  let idx = 0, timer = null, el = {}, STEPS = MAIN, bld = null;
  function ensureDom() {
    if (el.spot) return;
    const app = $('#app');
    el.spot = document.createElement('div'); el.spot.id = 'tuto-spot';
    el.arrow = document.createElement('div'); el.arrow.id = 'tuto-arrow';
    el.arrow.innerHTML = U.has('ui-tuto-arrow') ? `<img src="${U.src('ui-tuto-arrow')}" alt="">` : '👇';
    el.say = document.createElement('div'); el.say.id = 'tuto-say';
    app.append(el.spot, el.arrow, el.say);
  }
  // l'encadré suit le dessin réel : on ignore les parties transparentes des images, et on reste dans l'écran
  const alphaBox = {};
  function imgBox(img) {
    const k = img.currentSrc || img.src; if (alphaBox[k] !== undefined) return alphaBox[k];
    if (!img.complete || !img.naturalWidth) return null;
    try {
      const w = 96, h = Math.max(1, Math.round(96 * img.naturalHeight / img.naturalWidth)), c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
      return alphaBox[k] = x1 < 0 ? null : { l: x0 / w, t: y0 / h, r: (x1 + 1) / w, b: (y1 + 1) / h };
    } catch (e) { return alphaBox[k] = null; }
  }
  function tightRect(t, app) {
    const imgs = [...t.querySelectorAll('.pic img')], parts = [];
    const zone = t.querySelector('.spot-zone');   // arrêt de bus : la zone à toucher couvre tout l'abri
    if (zone) parts.push(zone.getBoundingClientRect()); else if (!imgs.length) parts.push(t.getBoundingClientRect());
    imgs.forEach(img => {
      const r = img.getBoundingClientRect(), b = imgBox(img); if (!r.width) return;
      // image en « contain » : on retrouve la zone réellement dessinée
      const ir = img.naturalWidth / img.naturalHeight || 1, rr = r.width / r.height;
      let w = r.width, h = r.height, x = r.left, y = r.top;
      if (ir > rr) { h = w / ir; y += (r.height - h) * (getComputedStyle(img).objectPosition.includes('100%') ? 1 : .5); } else { w = h * ir; x += (r.width - w) / 2; }
      parts.push(b ? { left: x + b.l * w, top: y + b.t * h, right: x + b.r * w, bottom: y + b.b * h } : { left: x, top: y, right: x + w, bottom: y + h });
    });
    // le nom du lieu (plaque) fait partie de l'encadré
    t.querySelectorAll('.plaque').forEach(e => parts.push(e.getBoundingClientRect()));
    const L = Math.max(app.left + 4, Math.min(...parts.map(p => p.left))), T = Math.max(app.top + 4, Math.min(...parts.map(p => p.top)));
    const R = Math.min(app.right - 4, Math.max(...parts.map(p => p.right))), B = Math.min(app.bottom - 4, Math.max(...parts.map(p => p.bottom)));
    return { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T };
  }
  function place() {
    const step = STEPS[idx]; if (!step) return;
    const app = $('#app').getBoundingClientRect();
    const t = step.target && [...document.querySelectorAll(step.target)].find(e => e.offsetParent !== null);
    if (!t) { el.spot.style.display = 'none'; el.arrow.style.display = 'none'; el.say.classList.remove('low'); return; }
    const r = tightRect(t, app), pad = 6;
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
  function next() { idx++; if (!bld) st().tutoStep = idx; G.save(); show(); }
  function tick() {
    const step = STEPS[idx]; if (!step) return;
    if (step.done && step.done()) return next();
    place();
  }
  function finish() {
    clearInterval(timer); timer = null;
    ['spot', 'arrow', 'say'].forEach(k => el[k] && el[k].remove()); el = {};
    if (bld) seen()[bld] = true; else { st().tutoDone = true; seen().appart = seen().balto = true; }
    bld = null; STEPS = MAIN; G.save();
  }
  function start(from) {
    STEPS = MAIN; bld = null;
    idx = from != null ? from : Math.min(st().tutoStep || 0, STEPS.length - 1);
    // reprise en cours de route : on repart d'une étape qui a du sens
    if (idx > 0 && idx < 9) idx = S('cryptoBuy') ? 8 : 1;
    else if (idx >= 9 && idx < 13) idx = S('bets') ? 13 : 9;
    show(); clearInterval(timer); timer = setInterval(tick, 300);
  }
  function skip() { finish(); }
  function startBld(id) {
    bld = id; STEPS = BLD[id]; idx = 0;
    show(); clearInterval(timer); timer = setInterval(tick, 300);
  }
  // on attend un moment calme (en ville, aucune fenêtre ouverte) pour présenter le lieu suivant
  let calm = 0;
  setInterval(() => {
    const s = st(); if (!s || !s.tutoDone || timer || !s.skin) { calm = 0; return; }
    const busy = modalOpen() || U.scene !== 'city' || $('#phone-layer.on') || $('#pack.on') || $('.dlg');
    calm = busy ? 0 : calm + 1;
    if (calm < 3) return;
    const id = BLD_ORDER.find(k => !seen()[k] && s.lvl >= D.BUILDINGS.find(b => b.id === k).lvl);
    if (id) { calm = 0; startBld(id); }
  }, 1000);

  window.TUTO = { start, skip, startBld, get active() { return !!timer; } };
})();
