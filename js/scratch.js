/* Hustle City : tickets à gratter façon tabac (parodies des vrais tickets).
   Le gain est tiré à l'achat ; on fabrique ensuite une grille qui le montre, avec des cases qu'on gratte une à une. */
(function () {
  'use strict';
  const D = window.DATA, G = window.GAME, U = window.UI;
  const st = () => G.st;
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const money = n => `${n.toLocaleString('fr-FR')}<i class="cur"></i>`;
  // montant « leurre » affiché sur une case perdante (plutôt des petits, parfois un gros pour faire rêver)
  // symboles du morpion : leur image scr-<nom> (l'emoji en attendant)
  const SCR_IMG = { '🎲': 'scr-dice', '🍺': 'scr-beer', '🛴': 'scr-scooter', '🍔': 'scr-burger', '🎧': 'scr-headphones', '🧢': 'scr-cap' };
  const decoy = t => { const v = t.prizes.map(p => p[0]); return Math.random() < .8 ? v[rnd(Math.min(3, v.length))] : pick(v); };

  // ------------------------------------------------------------ fabrication des grilles
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const ZODIAC = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const ZIMG = ['belier', 'taureau', 'gemeaux', 'cancer', 'lion', 'vierge', 'balance', 'scorpion', 'sagittaire', 'capricorne', 'verseau', 'poissons'].map(n => 'zod-' + n);
  const zod = i => U.has(ZIMG[i]) ? `<span class="zod zod-img">${U.pic(ZIMG[i], ZODIAC[i])}</span>` : `<span class="zod">${ZODIAC[i]}</span>`;   // l'image du signe (l'emoji en attendant)
  const ZNAME = ['Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge', 'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'];
  function build(t, prize) {
    const g = { game: t.game, cases: [], win: [] };   // cases : { html, zone } ; win : index des cases gagnantes
    if (t.game === 'numbers') {
      const pool = shuffle(Array.from({ length: t.max }, (_, i) => i + 1));
      const W = pool.slice(0, t.win), others = pool.slice(t.win);
      W.forEach(n => g.cases.push({ zone: 'w', html: `<b>${n}</b>` }));
      const k = prize ? rnd(t.mine) : -1;
      for (let i = 0; i < t.mine; i++) {
        const n = i === k ? pick(W) : others[i % others.length], v = i === k ? prize : decoy(t);
        if (i === k) g.win.push(g.cases.length);
        g.cases.push({ zone: 'm', html: `<b>${n}</b><small>${money(v)}</small>` });
      }
      if (prize) W.forEach((n, i) => { if (g.cases.some((c, j) => j >= t.win && g.win.includes(j) && c.html.startsWith(`<b>${n}<`))) g.win.push(i); });
    } else if (t.game === 'match3') {
      const vals = t.prizes.map(p => p[0]), cells = [];
      if (prize) cells.push(prize, prize, prize);
      const count = v => cells.filter(x => x === v).length;
      while (cells.length < 9) { const v = pick(vals); if (count(v) < 2 && v !== prize) cells.push(v); }
      shuffle(cells).forEach((v, i) => { if (v === prize) g.win.push(i); g.cases.push({ zone: 'g', html: `<b>${money(v)}</b>` }); });
    } else if (t.game === 'morpion') {
      const sym = ['🎲', '🍺', '🛴', '🍔', '🎧', '🧢'], grid = Array.from({ length: 9 }, () => pick(sym));
      const lines = () => LINES.filter(l => l.every(i => grid[i] === '💵')).length;
      if (prize) { const l = pick(LINES); l.forEach(i => { grid[i] = '💵'; g.win.push(i); }); }
      // quelques billets en plus pour faire monter la pression, sans jamais créer une ligne de trop
      for (let k = 0, tries = 0; k < (prize ? 1 : 3) && tries < 40; tries++) {
        const i = rnd(9); if (grid[i] === '💵') continue;
        const old = grid[i]; grid[i] = '💵';
        if (lines() > (prize ? 1 : 0)) grid[i] = old; else k++;
      }
      grid.forEach(s => g.cases.push({ zone: 'g', html: s === '💵' ? `<span class="sym cash" data-c="💵">${U.pic('icon-cash', '💵')}</span>` : U.has(SCR_IMG[s]) ? `<span class="sym sym-img">${U.pic(SCR_IMG[s], s)}</span>` : `<span class="sym">${s}</span>` }));
      g.cases.push({ zone: 'gain', html: `<small>GAIN</small><b>${money(prize || decoy(t))}</b>` });
      if (prize) g.win.push(9);
    } else if (t.game === 'blackjack') {
      const k = prize ? rnd(3) : -1;
      for (let h = 0; h < 3; h++) {
        let me, bank;
        if (h === k) { me = 17 + rnd(5); bank = Math.random() < .3 ? 22 + rnd(4) : 12 + rnd(me - 12); }
        else if (Math.random() < .25) { me = 22 + rnd(5); bank = 15 + rnd(6); }
        else { bank = 17 + rnd(5); me = 12 + rnd(bank - 11); }
        const base = g.cases.length;
        g.cases.push({ zone: 'me', html: `<small>TOI</small><b>${me}</b>` }, { zone: 'bank', html: `<small>BANQUE</small><b>${bank > 21 ? 'Brûlée' : bank}</b>` }, { zone: 'gain', html: `<small>GAIN</small><b>${money(h === k ? prize : decoy(t))}</b>` });
        if (h === k) g.win.push(base, base + 1, base + 2);
      }
    } else {
      const day = rnd(12), k = prize ? rnd(4) : -1;
      g.cases.push({ zone: 'day', html: `${zod(day)}<small>${ZNAME[day]}</small>` });
      const others = shuffle(Array.from({ length: 12 }, (_, i) => i).filter(i => i !== day));
      for (let i = 0; i < 4; i++) {
        const z = i === k ? day : others[i];
        if (i === k) g.win.push(0, g.cases.length);
        g.cases.push({ zone: 'm', html: `${zod(z)}<small>${ZNAME[z]}</small><b>${money(i === k ? prize : decoy(t))}</b>` });
      }
    }
    return g;
  }

  // ------------------------------------------------------------ affichage
  let ticket = null; // { t, prize, no, g, open: Set, done }
  const caseHtml = (c, i) => `<div class="sc z-${c.zone} ${ticket && ticket.done && ticket.g.win.includes(i) ? 'win' : ''}" data-i="${i}"><div class="sc-in">${c.html}</div>${ticket && ticket.open.has(i) ? '' : '<canvas></canvas>'}</div>`;
  function gameHtml() {
    const { t, g } = ticket, C = g.cases.map(caseHtml);
    if (t.game === 'numbers') return `<div class="tk-zone"><div class="tk-lbl">NUMÉROS GAGNANTS</div><div class="sc-row w">${C.slice(0, t.win).join('')}</div></div>
      <div class="tk-zone"><div class="tk-lbl">TES NUMÉROS</div><div class="sc-grid c${t.win === 2 ? 3 : 5}">${C.slice(t.win).join('')}</div></div>`;
    if (t.game === 'match3') return `<div class="tk-zone"><div class="tk-lbl">GRATTE LES 9 CASES</div><div class="sc-grid c3">${C.join('')}</div></div>`;
    if (t.game === 'morpion') return `<div class="tk-zone morp"><div class="sc-grid c3 grid9">${C.slice(0, 9).join('')}</div><div class="gain-col">${C[9]}</div></div>`;
    if (t.game === 'blackjack') return `<div class="tk-zone"><div class="bj-head"><span>TA MAIN</span><span>BANQUE</span><span>GAIN</span></div>${[0, 1, 2].map(h => `<div class="sc-row bj">${C.slice(h * 3, h * 3 + 3).join('')}</div>`).join('')}</div>`;
    return `<div class="tk-zone"><div class="tk-lbl">SIGNE DU JOUR</div><div class="sc-row day">${C[0]}</div><div class="tk-lbl">TES SIGNES</div><div class="sc-grid c2">${C.slice(1).join('')}</div></div>`;
  }
  function ticketHtml() {
    const { t } = ticket, top = t.prizes[t.prizes.length - 1][0];
    return `<div class="tk tk-${t.id} ${U.has('tkbg-' + t.id) ? 'has-bg' : ''}" style="--c1:${t.c1};--c2:${t.c2};--ink:${t.ink}${U.has('tkbg-' + t.id) ? `;--tkbg:url(${new URL(U.src('tkbg-' + t.id), location.href).href})` : ''}">
      <div class="tk-top">${U.pic(t.emblem, '🎟️', 'tk-emb')}<div class="tk-title"><b class="tk-name">${t.name}</b><span class="tk-max">Jusqu'à ${money(top)}</span></div><span class="tk-price"><small>Prix</small><b>${money(t.price)}</b></span></div>
      <div class="tk-game g-${t.game}">${gameHtml()}</div>
      <p class="tk-rule">${t.rule}</p>
      <div class="tk-foot"><i class="barcode"></i><small>N° ${ticket.no} · Jeu fictif Hustle City · aucun gain réel · interdit aux mineurs</small></div>
      ${ticket.done ? `<div class="tk-result ${ticket.prize ? 'won' : 'lost'}"><b class="stroke">${ticket.prize ? `GAGNÉ ${money(ticket.prize)}` : 'PERDU'}</b><small>${ticket.prize ? 'Le buraliste te paie en billets.' : 'Pas cette fois. Comme 3 tickets sur 4.'}</small></div>` : ''}
    </div>`;
  }
  function statsHtml() {
    const ss = st().scratchStats; if (!ss || !ss.n) return '';
    const r = ss.spent ? Math.round(ss.won / ss.spent * 100) : 0;
    return `<div class="sc-stats"><div><small>Tickets</small><b>${ss.n}</b></div><div><small>Dépensé</small><b>${money(ss.spent)}</b></div><div><small>Gagné</small><b>${money(ss.won)}</b></div><div><small>Tu récupères</small><b class="${r >= 100 ? 'up' : 'down'}">${r} %</b></div></div>
      <p class="hint-line center">En moyenne, les tickets reversent environ 65 % de ce qu'on mise. Sur la durée, c'est le tabac qui gagne.</p>`;
  }
  function body() {
    const s = st();
    if (ticket) return `${ticketHtml()}
      <div class="sc-acts">${ticket.done ? `<button class="btn green" data-act="scrAgain" ${ticket.t.id === 'flash' && s.freeTickets || s.cash >= ticket.t.price ? '' : 'disabled'}>Un autre · ${ticket.t.id === 'flash' && s.freeTickets ? 'offert' : money(ticket.t.price)}</button><button class="btn" data-act="scrBack">Changer de ticket</button>`
        : '<button class="btn blue wide" data-act="scrReveal">Tout gratter d\'un coup</button>'}</div>`;
    return `<p class="hint-line">Le présentoir du Royal. Choisis ton ticket, gratte case par case avec le doigt.${s.freeTickets ? ` Tu as <b>${s.freeTickets} Cash Flash offert${s.freeTickets > 1 ? 's' : ''}</b> !` : ''}</p>
      <div class="rack">${D.SCRATCH.map(t => {
        const lock = s.lvl < t.lvl, top = t.prizes[t.prizes.length - 1][0], free = t.id === 'flash' && s.freeTickets, poor = !lock && !free && s.cash < t.price;
        const odds = Math.round(1 / t.prizes.reduce((a, [, p]) => a + p, 0));
        return `<button class="tk-mini ${lock || poor ? 'locked' : ''} ${U.has('tkbg-' + t.id) ? 'has-bg' : ''}" data-act="${lock ? 'scrLocked' : 'scrBuy'}" ${poor ? 'disabled' : ''} data-id="${t.id}" style="--c1:${t.c1};--c2:${t.c2};--ink:${t.ink}${U.has('tkbg-' + t.id) ? `;--tkbg:url(${new URL(U.src('tkbg-' + t.id), location.href).href})` : ''}">
          ${U.pic(t.emblem, '🎟️', 'tk-emb')}<b class="tk-name">${t.name}</b><span class="tk-max">Jusqu'à ${money(top)}</span><small>1 ticket gagnant sur ${odds}</small>
          <span class="tk-buy">${lock ? `${U.ico('icon-lock', '🔒')} Niveau ${t.lvl}` : free ? 'Offert' : poor ? `À sec · ${money(t.price)}` : money(t.price)}</span></button>`;
      }).join('')}</div>${statsHtml()}`;
  }

  // ------------------------------------------------------------ grattage
  function coverCanvas(cv) {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const g = x.createLinearGradient(0, 0, r.width, r.height); g.addColorStop(0, '#b9bec6'); g.addColorStop(.45, '#eef0f3'); g.addColorStop(.55, '#d9dde2'); g.addColorStop(1, '#a3a9b2');
    x.fillStyle = g; x.fillRect(0, 0, r.width, r.height);
    // motif d'étoiles en quinconce, centré dans la case (une ligne sur deux décalée d'une demi-étoile)
    x.fillStyle = 'rgba(120,128,140,.45)'; x.font = '900 11px Nunito'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const SX = 18, SY = 14, rows = Math.max(1, Math.floor((r.height - 4) / SY)), cols = Math.max(1, Math.floor((r.width - 4) / SX));
    const y0 = (r.height - (rows - 1) * SY) / 2, x0 = (r.width - (cols - 1) * SX) / 2;
    for (let j = 0; j < rows; j++) { const odd = j % 2, n = odd ? cols - 1 : cols; for (let i = 0; i < n; i++) x.fillText('★', x0 + i * SX + (odd ? SX / 2 : 0), y0 + j * SY); }
    x.globalCompositeOperation = 'destination-out'; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = Math.max(18, Math.min(r.width, r.height) * .45);
    cv._x = x; cv._n = 0;
  }
  function openCase(i, anim = true) {
    if (!ticket || ticket.open.has(i)) return;
    ticket.open.add(i);
    const cv = document.querySelector(`#modal .sc[data-i="${i}"] canvas`);
    if (cv) { if (anim) { cv.classList.add('gone'); setTimeout(() => cv.remove(), 300); } else cv.remove(); }
    if (ticket.open.size >= ticket.g.cases.length) finish();
  }
  function finish() {
    if (ticket.done) return;
    ticket.done = true; G.scratchPay(ticket.prize);
    if (ticket.prize) { U.sfx.win(); U.rain(ticket.prize >= 50 ? 'bill' : 'confetti', ticket.prize >= 50 ? 36 : 16); U.floatTxt(`+${U.eur(ticket.prize)}`); }
    setTimeout(() => { U.setBody(body()); init(); U.refresh(); }, 350);
  }
  function init() {
    const zone = document.querySelector('#modal .tk-game'); if (!zone || !ticket) return;
    zone.querySelectorAll('canvas').forEach(coverCanvas);
    let down = false, last = null;
    const scratchAt = e => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el.tagName !== 'CANVAS' || !el._x) { last = null; return; }
      const b = el.getBoundingClientRect(), p = [e.clientX - b.left, e.clientY - b.top];
      el._x.beginPath(); if (last && last.cv === el) el._x.moveTo(...last.p); else el._x.moveTo(p[0] - .1, p[1]); el._x.lineTo(...p); el._x.stroke();
      last = { cv: el, p };
      if (++el._n % 6 === 0) {
        const d = el._x.getImageData(0, 0, el.width, el.height).data; let c = 0, n = 0;
        for (let i = 3; i < d.length; i += 40) { n++; if (!d[i]) c++; }
        if (c / n > .5) openCase(+el.parentElement.dataset.i);
      }
    };
    zone.onpointerdown = e => { down = true; zone.setPointerCapture(e.pointerId); scratchAt(e); };
    let lastSnd = 0;
    zone.onpointermove = e => { if (down) { scratchAt(e); if (Date.now() - lastSnd > 90) { lastSnd = Date.now(); U.sfx.scratch(); } } };
    zone.onpointerup = zone.onpointercancel = () => { down = false; last = null; };
  }
  function buy(id) {
    const r = G.scratchDraw(id); if (r.err) return U.toast(r.err, true);
    ticket = { t: r.t, prize: r.prize, no: r.no, g: build(r.t, r.prize), open: new Set(), done: false };
    U.sfx.tap(); U.setBody(body()); requestAnimationFrame(init); U.refresh();
    const b = document.querySelector('#modal .sheet-body'); if (b) b.scrollTop = 0;
  }

  U.register({
    scrBuy: el => buy(el.dataset.id),
    scrAgain: () => buy(ticket.t.id),
    scrReveal() { if (!ticket) return; ticket.g.cases.forEach((_, i) => { if (!ticket.open.has(i)) { ticket.open.add(i); } }); document.querySelectorAll('#modal .tk-game canvas').forEach(c => c.classList.add('gone')); finish(); },
    scrBack() { ticket = null; U.setBody(body()); },
    scrLocked() {}
  });
  // quitter le Royal avec un ticket entamé : il est gratté automatiquement (on ne perd pas son gain)
  function close() { if (ticket && !ticket.done) { ticket.open = new Set(ticket.g.cases.map((_, i) => i)); finish(); } ticket = null; }
  window.SCRATCH_UI = { body, init, close, get busy() { return !!ticket && !ticket.done; } };
})();
