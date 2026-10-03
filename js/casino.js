/* Hustle City : Lucky Palace (machine à sous + roulette européenne) */
(function () {
  'use strict';
  const D = window.DATA, G = window.GAME, U = window.UI;
  const st = () => G.st;
  let showPays = false, tab = 'slot', bet = 1, spinning = false, lastSpin = null;
  let chip = 5, board = [], wheelTurn = 0, lastRoll = null, rolling = false;

  // ------------------------------------------------------------ machine à sous
  const symHtml = s => U.has('slot-' + s.id) ? `<img src="${U.src('slot-' + s.id)}" alt="">` : s.icon;
  function slotBody() {
    const s = st(), S = D.SLOT.symbols;
    const shown = lastSpin ? lastSpin.reels : [S[0], S[2], S[4]];
    const msg = lastSpin ? (lastSpin.win ? `+${U.eur(lastSpin.win)} (×${lastSpin.mult})` : 'Perdu') : 'Aligne 3 symboles';
    const reels = shown.map((sym, i) => `<div class="reel ${lastSpin && lastSpin.mult ? 'win' : ''}" id="reel-${i}"><div class="strip"><div class="sym">${symHtml(sym)}</div></div></div>`).join('');
    const pays = `<div class="card sm-pay" style="margin-top:10px"><b>Gains (× la mise)</b><div class="paytable">${S.map(x => `<span>${symHtml(x)}${symHtml(x)}${symHtml(x)}</span><b>×${x.pay3}</b>`).join('')}</div>
        <p class="muted" style="margin-top:6px">Taux de retour : ${(G.slotRtp() * 100).toFixed(1).replace('.', ',')} %. Sur 100<i class="cur"></i> joués, la machine en garde environ ${Math.round(100 - G.slotRtp() * 100)}.</p></div>`;
    // la vraie machine : image casino-machine, et les zones (écran, panneau, bouton, levier) en % de l'image (D.SLOT.ui, réglable)
    if (D.SLOT.machineImage && U.has('casino-machine')) {
      const L = D.SLOT.ui, z = r => `left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%`;
      return `<div class="real-slot"><img class="rs-img" src="${U.src('casino-machine')}" alt="">
          <button class="rs-top rs-close" data-act="closeModal" aria-label="Fermer">×</button>
          <button class="rs-top rs-tab" data-act="csTab" data-t="roulette">🎡 Roulette</button>
          <button class="rs-top rs-info" data-act="slPays">${showPays ? '✕ Fermer' : 'ℹ️ Gains'}</button>
          ${showPays ? `<div class="rs-pays">${pays}</div>` : ''}
          <div class="rs-screen reels" data-zone="screen" style="${z(L.screen)}">${reels}</div>
          <div class="rs-led stroke" id="slot-msg" data-zone="led" style="${z(L.led)}">${msg}</div>
          <div class="rs-bets" data-zone="bets" style="${z(L.bets)}">${D.SLOT.bets.map(b => `<button class="rs-bet ${b === bet ? 'on' : ''}" data-act="slBet" data-v="${b}">${b}</button>`).join('')}</div>
          <button class="rs-spin" data-act="slSpin" data-zone="spin" style="${z(L.spin)}" ${spinning || s.cash < bet ? 'disabled' : ''}><span>LANCER</span><small>${U.eur(bet)}</small></button>
          <button class="rs-lever ${spinning ? 'pulled' : ''}" data-act="slSpin" data-zone="lever" style="${z(L.lever)}" aria-label="Tirer le levier" ${spinning || s.cash < bet ? 'disabled' : ''}></button>
        </div>`;
    }
    return `<div class="slot-machine"><div class="sm-sign"><span>LUCKY</span><b>777</b><span>PALACE</span></div>
        <div class="reels">${shown.map((sym, i) => `<div class="reel ${lastSpin && lastSpin.mult ? 'win' : ''}" id="reel-${i}"><div class="strip"><div class="sym">${symHtml(sym)}</div></div></div>`).join('')}</div>
        <div class="center stroke" style="margin:10px 0 6px;font-size:20px;min-height:26px" id="slot-msg">${lastSpin ? (lastSpin.win ? `+${U.eur(lastSpin.win)} (×${lastSpin.mult})` : 'Perdu') : 'Aligne 3 symboles'}</div>
        <div class="seg">${D.SLOT.bets.map(b => `<button class="btn xs ${b === bet ? 'green' : 'blue'}" data-act="slBet" data-v="${b}">${b}<i class="cur"></i></button>`).join('')}</div>
        <button class="btn wide" style="margin-top:10px;min-height:60px;font-size:24px" data-act="slSpin" ${spinning || s.cash < bet ? 'disabled' : ''}>Lancer · ${U.eur(bet)}</button>
      </div>
      <div class="card" style="margin-top:10px"><b>Gains (× la mise)</b><div class="paytable">${S.map(x => `<span>${symHtml(x)}${symHtml(x)}${symHtml(x)}</span><b>×${x.pay3}</b>`).join('')}<span>${symHtml(S[0])}${symHtml(S[0])} + autre</span><b>×${S[0].pay2}</b></div>
        <p class="muted" style="margin-top:6px">Taux de retour : ${(G.slotRtp() * 100).toFixed(1).replace('.', ',')} %. Sur 100<i class="cur"></i> joués, la machine en garde environ ${Math.round(100 - G.slotRtp() * 100)}.</p></div>`;
  }
  // la vraie machine change de taille avec l'écran : chaque case de rouleau prend la hauteur réelle de la fenêtre
  function fitMachine() { const m = document.getElementById('modal'), r = m && m.querySelector('.real-slot'); if (!r || !m.classList.contains('slot-full')) return; r.style.width = Math.min(m.clientWidth - 8, (m.clientHeight - 16) * .524) + 'px'; }
  function sizeReels() { fitMachine(); document.querySelectorAll('#modal .rs-screen .reel').forEach(r => { const h = r.clientHeight; r.querySelectorAll('.sym').forEach(x => { x.style.height = h + 'px'; }); }); }
  function spinAnim(res) {
    const S = D.SLOT.symbols;
    res.reels.forEach((sym, i) => {
      const reel = document.getElementById('reel-' + i); if (!reel) return;
      reel.classList.remove('win');
      const n = 14 + i * 5, strip = reel.querySelector('.strip'), rh = reel.clientHeight || 96;
      const syms = []; for (let k = 0; k < n; k++) syms.push(S[Math.floor(Math.random() * S.length)]); syms.push(sym);
      strip.innerHTML = syms.map(x => `<div class="sym" style="height:${rh}px">${symHtml(x)}</div>`).join('');
      strip.style.transition = 'none'; strip.style.transform = 'translateY(0)';
      void strip.offsetHeight;
      strip.style.transition = `transform ${0.9 + i * .35}s cubic-bezier(.2,.8,.25,1)`;
      strip.style.transform = `translateY(-${n * rh}px)`;
    });
    setTimeout(() => {
      spinning = false; lastSpin = res;
      if (res.mult >= 20) U.rain('bill', 36); else if (res.win) U.rain('confetti', 12);
      if (res.win) U.floatTxt(`+${U.eur(res.win)}`);
      if (tab === 'slot') { U.setBody(slotBody()); sizeReels(); }
      U.refresh();
    }, 900 + 2 * 350 + 150);
  }

  // ------------------------------------------------------------ roulette
  function wheelGradient() {
    const o = D.ROULETTE.order, n = o.length, R = D.ROULETTE.reds;
    return `conic-gradient(${o.map((v, i) => `${v === 0 ? '#1f9d55' : R.includes(v) ? '#d33a2c' : '#222'} ${(i / n * 360).toFixed(2)}deg ${((i + 1) / n * 360).toFixed(2)}deg`).join(',')})`;
  }
  const betKey = b => b.type + (b.v != null ? b.v : '');
  function chipOn(type, v) { const b = board.find(x => x.type === type && (v == null || x.v === v)); return b ? `<span class="chip-on">${b.amt}</span>` : ''; }
  function rouletteBody() {
    const s = st(), R = D.ROULETTE.reds, total = board.reduce((a, b) => a + b.amt, 0);
    const nums = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) nums.push(c * 3 + (3 - r));
    return `<div class="wheel-wrap"><div class="wheel-ptr"></div><div class="wheel" id="wheel" style="background:${wheelGradient()};transform:rotate(${wheelTurn}deg)">${D.ROULETTE.order.map((v, i) => `<i class="wn" style="transform:rotate(${((i + .5) * 360 / D.ROULETTE.order.length).toFixed(2)}deg)"><b>${v}</b></i>`).join('')}</div>
        ${U.has('roulette-hub') ? `<img class="wheel-hub" src="${U.src('roulette-hub')}" alt="">` : ''}<div class="wheel-res" style="${lastRoll ? `background:${lastRoll.n === 0 ? '#1f9d55' : R.includes(lastRoll.n) ? '#d33a2c' : '#222'}` : ''}">${lastRoll && !rolling ? lastRoll.n : '?'}</div></div>
      <div class="center stroke" style="font-size:18px;min-height:24px">${rolling ? 'Les jeux sont faits…' : lastRoll ? (lastRoll.win ? `Gagné : +${U.eur(lastRoll.win)}` : `Perdu (${U.eur(lastRoll.total)})`) : 'Pose tes jetons'}</div>
      <div class="chips">${D.ROULETTE.chips.map((c, i) => `<button class="${c === chip ? 'sel' : ''}" style="--cc:${['#8d99ae', '#e63946', '#457b9d', '#2a9d8f', '#222', '#9b5de5'][i]}" data-act="rlChip" data-v="${c}">${U.has('chip-' + c) ? `<img src="${U.src('chip-' + c)}" alt="">` : ''}<span>${c}</span></button>`).join('')}</div>
      <div class="felt" ${U.has('roulette-felt') ? `style="background-image:url(${U.src('roulette-felt')})"` : ''}><div class="rl-board"><button class="zr" data-act="rlBet" data-t="num" data-v="0">0${chipOn('num', 0)}</button>
        ${nums.map(n => `<button class="${R.includes(n) ? 'rd' : 'bk'}" data-act="rlBet" data-t="num" data-v="${n}">${n}${chipOn('num', n)}</button>`).join('')}</div>
      <div class="rl-outside">
        ${[['doz', 1, '1-12'], ['doz', 2, '13-24'], ['doz', 3, '25-36'], ['low', null, '1-18'], ['even', null, 'Pair'], ['red', null, 'Rouge'], ['black', null, 'Noir'], ['odd', null, 'Impair'], ['high', null, '19-36']]
          .map(([t, v, l]) => `<button data-act="rlBet" data-t="${t}" ${v != null ? `data-v="${v}"` : ''} style="${t === 'red' ? 'background:#d33a2c' : t === 'black' ? 'background:#222' : ''}">${l}${chipOn(t, v)}</button>`).join('')}
      </div>
      </div><div class="grid2" style="margin-top:10px"><button class="btn red" data-act="rlClear" ${board.length && !rolling ? '' : 'disabled'}>Effacer</button>
        <button class="btn green" data-act="rlSpin" ${total && !rolling && s.cash >= total ? '' : 'disabled'}>Lancer · ${U.eur(total)}</button></div>
      <p class="muted center" style="margin-top:6px">Numéro plein ×36, douzaine ×3, rouge/noir, pair/impair, manque/passe ×2. Le zéro fait perdre toutes les chances simples : c'est l'avantage du casino (2,7 %).</p>`;
  }
  function rollAnim(res) {
    const o = D.ROULETTE.order, idx = o.indexOf(res.n), seg = 360 / o.length;
    const target = 360 - (idx + .5) * seg;
    const cur = ((wheelTurn % 360) + 360) % 360;
    wheelTurn += 360 * 5 + ((target - cur + 360) % 360);
    const w = document.getElementById('wheel'); if (w) w.style.transform = `rotate(${wheelTurn}deg)`;
    setTimeout(() => {
      rolling = false; lastRoll = res;
      if (res.win) { U.floatTxt(`+${U.eur(res.win)}`); U.rain(res.win >= res.total * 10 ? 'bill' : 'confetti', res.win >= res.total * 10 ? 30 : 12); }
      if (tab === 'roulette') U.setBody(rouletteBody());
      U.refresh();
    }, 4300);
  }

  // ------------------------------------------------------------ fenêtre
  function body() { return tab === 'slot' ? slotBody() : rouletteBody(); }
  // machine à sous avec son image : la fenêtre entière EST la machine (pas de cadre, pas de ruban, pas d'onglets)
  // cadre « machine à sous » (images ui-casino-frame et ui-casino-header) dès qu'elles existent
  function skin() { const sh = document.querySelector('#modal .sheet.th-casino'); if (!sh) return;
    if (U.has('ui-casino-frame')) { sh.classList.add('has-frame'); sh.style.setProperty('--csframe', `url(${U.src('ui-casino-frame')})`); }
    if (U.has('ui-casino-header')) { sh.classList.add('has-header'); sh.style.setProperty('--cshead', `url(${U.src('ui-casino-header')})`); } }
  function frame() { const m = document.getElementById('modal'); if (m) m.classList.toggle('slot-full', tab === 'slot' && !!D.SLOT.machineImage && U.has('casino-machine')); }
  function open(t) {
    if (t) tab = t;
    if (tab === 'roulette' && st().lvl < D.ROULETTE.lvl) tab = 'slot';
    U.openModal({ title: 'Lucky Palace', icon: 'dice', full: true, theme: 'casino',
      tabs: [{ id: 'slot', label: 'Machine à sous' }, { id: 'roulette', label: st().lvl < D.ROULETTE.lvl ? `Roulette · niv. ${D.ROULETTE.lvl}` : 'Roulette', locked: st().lvl < D.ROULETTE.lvl }], tab,
      body: body(), onTab: id => { tab = id; U.setBody(body()); frame(); sizeReels(); } });
    frame(); skin(); setTimeout(sizeReels, 30);
  }

  U.register({
    slPays() { showPays = !showPays; U.setBody(slotBody()); sizeReels(); },
    csTab(el) { const t = el.dataset.t; if (t === 'roulette' && st().lvl < D.ROULETTE.lvl) return U.toast(`La roulette ouvre au niveau ${D.ROULETTE.lvl}.`); tab = t; document.querySelectorAll('#modal .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); U.setBody(body()); frame(); sizeReels(); },
    slBet(el) { bet = +el.dataset.v; U.setBody(slotBody()); sizeReels(); },
    slSpin() {
      if (spinning) return;
      const r = G.spin(bet); if (r.err) return U.toast(r.err, true);
      spinning = true; U.setBody(slotBody()); const m = document.getElementById('slot-msg'); if (m) m.textContent = '…';
      spinAnim(r); U.refresh();
    },
    rlChip(el) { chip = +el.dataset.v; U.setBody(rouletteBody()); },
    rlBet(el) {
      if (rolling) return;
      const b = { type: el.dataset.t, v: el.dataset.v != null ? +el.dataset.v : null };
      const ex = board.find(x => betKey(x) === betKey(b));
      const total = board.reduce((a, x) => a + x.amt, 0) + chip;
      if (total > st().cash) return U.toast('Pas assez de cash pour ce jeton.', true);
      if (ex) ex.amt += chip; else board.push({ ...b, amt: chip });
      U.setBody(rouletteBody());
    },
    rlClear() { board = []; U.setBody(rouletteBody()); },
    rlSpin() {
      if (rolling) return;
      const r = G.roulette(board); if (r.err) return U.toast(r.err, true);
      rolling = true; U.setBody(rouletteBody()); rollAnim(r); U.refresh();
      // on garde la même mise pour le tour suivant si le cash le permet
    }
  });

  window.CASINO = { open };
})();
