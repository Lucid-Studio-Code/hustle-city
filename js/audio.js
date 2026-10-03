/* Hustle City : sons et musique, fabriqués en direct (Web Audio), sans fichier à charger.
   Des sons doux (sinus, cloches, bruit filtré) à volume bas, et une musique lo-fi en boucle qu'on peut couper. */
(function () {
  'use strict';
  let ctx = null, master, fxBus, musicBus, musicOn = false, nextBar = 0, bar = 0, sched = null;
  const st = () => (window.GAME && window.GAME.st) || {};
  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
      fxBus = ctx.createGain(); fxBus.gain.value = .55; fxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = .16;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; musicBus.connect(lp); lp.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // une note : enveloppe douce (attaque courte, chute naturelle), timbre au choix
  function note(f, t, dur, { type = 'sine', vol = .2, bus, attack = .006, harm = 0, slide = 0 } = {}) {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(bus || fxBus); o.start(t); o.stop(t + dur + .02);
    if (harm) note(f * 2.01, t, dur * .6, { type: 'sine', vol: vol * harm, bus, attack });   // petite harmonique : effet cloche
  }
  function noise(t, dur, { vol = .15, freq = 2000, q = .8, type = 'bandpass', bus, sweep = 0 } = {}) {
    const c = ac(), n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = type; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || fxBus); s.start(t); s.stop(t + dur);
  }
  const on = () => st().sound !== false;
  const play = fn => { if (!on()) return; try { fn(ac().currentTime + .01); } catch (e) {} };
  const SFX = {
    tap: () => play(t => note(1200, t, .05, { vol: .05, attack: .002 })),                                     // petit clic discret
    coin: () => play(t => { note(1568, t, .25, { vol: .09, harm: .4 }); note(2093, t + .07, .3, { vol: .08, harm: .4 }); }),   // pièces
    buy: () => play(t => { noise(t, .06, { vol: .08, freq: 4000 }); note(1760, t + .04, .35, { vol: .09, harm: .5 }); note(2637, t + .1, .4, { vol: .06, harm: .3 }); }),   // tiroir-caisse
    win: () => play(t => [523, 659, 784, 1047].forEach((f, i) => note(f, t + i * .09, .45, { type: 'triangle', vol: .09, harm: .3 }))),
    level: () => play(t => { [523, 659, 784, 1047].forEach((f, i) => note(f, t + i * .1, .5, { type: 'triangle', vol: .09, harm: .3 })); [523, 659, 784].forEach(f => note(f * 2, t + .45, 1.1, { vol: .05 })); }),
    err: () => play(t => note(220, t, .18, { vol: .07, slide: .7 })),                                          // petit « bof » grave, pas une alarme
    goal: () => play(t => { noise(t, .9, { vol: .1, freq: 900, q: .4, sweep: 1.4 }); note(988, t, .15, { vol: .06 }); note(1319, t + .12, .35, { vol: .07 }); }),   // foule + sifflet
    notif: () => play(t => { note(1047, t, .18, { type: 'triangle', vol: .06 }); note(1568, t + .1, .3, { type: 'triangle', vol: .06 }); }),   // marimba
    spin: () => play(t => { for (let i = 0; i < 9; i++) noise(t + i * .07, .03, { vol: .05, freq: 2500 + i * 120 }); }),   // rouleaux qui tournent
    roll: () => play(t => noise(t, 1.6, { vol: .05, freq: 1200, q: 2, sweep: .4 })),                           // bille qui roule
    flip: () => play(t => noise(t, .09, { vol: .08, freq: 3000, sweep: .5 })),                                 // carte qu'on retourne
    tear: () => play(t => noise(t, .35, { vol: .1, freq: 1800, q: .6, sweep: 2.5 })),                         // booster qu'on déchire
    scratch: () => play(t => noise(t, .07, { vol: .035, freq: 5000, q: 1.5 })),                               // grattage
    harvest: () => play(t => { [784, 988, 1175].forEach((f, i) => note(f, t + i * .06, .3, { vol: .07, harm: .4 })); })
  };

  // ---------------------------------------------------------------- musique lo-fi (82 bpm, 4 accords en boucle)
  const BPM = 82, BEAT = 60 / BPM;
  const CHORDS = [[220, 261.6, 329.6, 392], [146.8, 174.6, 220, 261.6], [196, 246.9, 293.7, 349.2], [130.8, 164.8, 196, 246.9]];   // Am7 Dm7 G7 Cmaj7
  const MEL = [[659, 0], [587, 1.5], [523, 2], [0, 0], [698, 0], [659, 1], [587, 2.5], [0, 0], [587, 0], [523, 1], [494, 2], [0, 0], [523, .5], [494, 1.5], [440, 2], [0, 0]];
  function playBar(t, i) {
    const ch = CHORDS[i % 4];
    ch.forEach(f => note(f, t, BEAT * 3.8, { type: 'triangle', vol: .055, attack: .08, bus: musicBus }));     // nappe de piano doux
    note(ch[0] / 2, t, BEAT * 1.6, { vol: .16, attack: .01, bus: musicBus }); note(ch[0] / 2, t + BEAT * 2.5, BEAT * 1.2, { vol: .12, bus: musicBus });   // basse
    for (let b = 0; b < 4; b++) {
      if (b % 2 === 0) note(110, t + b * BEAT, .25, { vol: .22, slide: .4, bus: musicBus });                  // grosse caisse feutrée
      else noise(t + b * BEAT, .18, { vol: .05, freq: 1800, q: .7, bus: musicBus });                         // caisse claire légère
      noise(t + b * BEAT + BEAT / 2, .05, { vol: .025, freq: 7000, q: 1, type: 'highpass', bus: musicBus });   // charley
    }
    MEL.slice((i % 4) * 4, (i % 4) * 4 + 4).forEach(([f, at]) => f && note(f, t + at * BEAT, BEAT * 1.2, { type: 'sine', vol: .045, attack: .02, bus: musicBus }));
  }
  function tick() {
    if (!musicOn || !ctx) return;
    while (nextBar < ctx.currentTime + 1.2) { playBar(nextBar, bar++); nextBar += BEAT * 4; }
  }
  function music(want) {
    musicOn = !!want && st().music !== false;
    if (!musicOn) { clearInterval(sched); sched = null; if (musicBus) musicBus.gain.setTargetAtTime(0, ctx.currentTime, .3); return; }
    try { ac(); } catch (e) { return; }
    musicBus.gain.setTargetAtTime(.16, ctx.currentTime, .5);
    nextBar = Math.max(nextBar, ctx.currentTime + .1);
    if (!sched) sched = setInterval(tick, 300);
  }
  // les navigateurs n'autorisent le son qu'après un premier geste : on démarre la musique au premier appui
  const kick = () => { document.removeEventListener('pointerdown', kick, true); if (st().music !== false) music(true); };
  document.addEventListener('pointerdown', kick, true);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : (musicOn && ctx.resume()); });

  window.AUDIO = { sfx: SFX, music, get musicOn() { return musicOn; } };
})();
