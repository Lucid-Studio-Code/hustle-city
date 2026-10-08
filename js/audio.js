/* Hustle City : sons et musique, fabriqués en direct (Web Audio). Quelques bruits réels (caisse, sifflet, foule, cadeau) sont de vrais
   enregistrements libres de droits (assets/sons, licences dans assets/sons/LICENCES.md), chargés après le premier geste ; tant qu'ils
   ne sont pas là (ou s'ils échouent), la version synthétisée prend le relais.
   Chaque effet est en couches (attaque + corps + traîne), avec un peu de réverb (réponse impulsionnelle générée),
   du panoramique et un compresseur doux sur la sortie. Petites variations au hasard pour ne pas lasser.
   Musique : instru rap de rue (90 BPM, 808 qui glisse, mélodie mineure, sections A/B, breaks), qui change d'humeur selon le lieu. */
(function () {
  'use strict';
  let C = null, N = null, T0 = 0;   // contexte audio, nœuds fixes (sorties, réverb, chaîne de la musique), heure de création
  const st = () => (window.GAME && window.GAME.st) || {};
  const lite = () => !!st().calm || document.documentElement.classList.contains('lowfx');   // animations réduites / téléphone modeste : moins de couches
  const R = (a = .1) => 1 + (Math.random() * 2 - 1) * a, rnd = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- la console de mixage
  function impulse(c, sec, k) {   // réverb « petite salle » : du bruit qui s'éteint, un peu différent à gauche et à droite
    const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, k); }
    return b;
  }
  function graph(c) {
    const g = { c }, gain = v => { const x = c.createGain(); x.gain.value = v; return x; }, filt = (type, f, q = .7) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
    const cp = g.comp = c.createDynamicsCompressor(); cp.threshold.value = -14; cp.knee.value = 12; cp.ratio.value = 3.5; cp.attack.value = .004; cp.release.value = .2;
    g.master = gain(.9); cp.connect(g.master); g.master.connect(c.destination);
    g.fx = gain(1.6); g.fx.connect(cp);
    const ir = impulse(c, lite() ? .9 : 1.6, 3.2);
    g.revIn = gain(1); const rv = c.createConvolver(); rv.buffer = ir; const rlp = filt('lowpass', 5200), rOut = gain(.55); g.revIn.connect(rv); rv.connect(rlp); rlp.connect(rOut); rOut.connect(cp);
    // musique : (sec + réverb + basse saturée + écho de la mélodie) → filtre d'humeur → baisse quand un gros son passe → volume
    g.mFilt = filt('lowpass', 9000, .5); g.duck = gain(1); g.mVol = gain(0); g.mFilt.connect(g.duck); g.duck.connect(g.mVol); g.mVol.connect(cp);
    g.mRev = c.createConvolver(); g.mRev.buffer = ir; const mro = gain(.5); g.mRev.connect(mro); mro.connect(g.mFilt);
    g.sh = c.createWaveShaper(); const cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); } g.sh.curve = cv;   // 808 un peu saturée : on l'entend même sur un haut-parleur de téléphone
    const blp = filt('lowpass', 900); g.sh.connect(blp); blp.connect(g.mFilt);
    g.dly = c.createDelay(1); g.dly.delayTime.value = .5; const fb = gain(.32), dlp = filt('lowpass', 2600), dOut = gain(.35); g.dly.connect(dlp); dlp.connect(fb); fb.connect(g.dly); dlp.connect(dOut); dOut.connect(g.mFilt);
    const n = c.sampleRate * 2, nb = c.createBuffer(1, n, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; g.noise = nb;   // un seul bruit blanc, relu partout
    return g;
  }
  function ac() {
    if (!C) { C = new (window.AudioContext || window.webkitAudioContext)(); N = graph(C); N.mFilt.frequency.value = MOOD[mood]; T0 = C.currentTime; setTimeout(loadSamples, 0); }
    if (C.state === 'suspended') C.resume();
    return C;
  }

  // ---------------------------------------------------------------- vrais enregistrements (assets/sons/*.mp3)
  // SND_V : à augmenter quand on remplace un fichier (les .mp3 versionnés sont gardés un an par le navigateur)
  const SND_V = '5', SAMPLES = ['cardflip', 'cash', 'coin', 'whistle', 'whistle-long', 'goal', 'groan', 'gift', 'payout', 'scratch', 'scratch-win', 'notif', 'tear', 'level'], SMP = {};
  let smpAsked = false, useSmp = true;
  function loadSamples() {
    if (smpAsked || !C || !window.fetch || !C.decodeAudioData) return; smpAsked = true;
    const ctx = C;
    SAMPLES.forEach(n => fetch('assets/sons/' + n + '.mp3?v=' + SND_V)
      .then(r => { if (!r.ok) throw new Error(n); return r.arrayBuffer(); })
      .then(b => new Promise((ok, ko) => { const p = ctx.decodeAudioData(b, ok, ko); if (p && p.catch) p.catch(ko); }))   // forme à rappels : vieux Safari
      .then(buf => { SMP[n] = buf; })
      .catch(() => {}));   // pas grave : le son synthétisé reste
  }
  // joue un enregistrement s'il est prêt (sinon renvoie false et l'appelant joue la version synthé)
  // off / dur : ne jouer qu'un morceau du fichier (grattage : 4 coups de pièce rangés toutes les 0,4 s dans scratch.mp3)
  function smp(name, t, { vol = 1, rev = .08, pan = 0, off = 0, dur } = {}) {
    const b = useSmp && SMP[name]; if (!b) return false;
    const s = C.createBufferSource(); s.buffer = b; s.playbackRate.value = R(.03);   // ±3 % : jamais deux fois tout à fait pareil
    const g = out({ pan, rev: lite() ? 0 : rev }); g.gain.value = vol; s.connect(g); dur ? s.start(t, off, dur) : s.start(t, off);
    return true;
  }
  let lastGrain = -1;
  const grain = () => { let k; do k = Math.floor(Math.random() * 4); while (k === lastGrain); lastGrain = k; return k * .4; };   // jamais deux fois le même coup d'affilée

  // ---------------------------------------------------------------- briques de base
  const FXB = () => ({ dry: N.fx, rev: N.revIn });
  // sortie d'une voix : volume → panoramique → bus (+ envoi vers la réverb)
  function out({ pan = 0, rev = .12, bus } = {}) {
    const b = bus || FXB(), g = C.createGain(); let n = g;
    if (pan && C.createStereoPanner) { const p = C.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); n = p; }
    n.connect(b.dry); if (rev && b.rev) { const s = C.createGain(); s.gain.value = rev; n.connect(s); s.connect(b.rev); }
    return g;
  }
  function env(p, t, vol, a, hold, dur) { p.value = 0; p.setValueAtTime(0, t);   // valeur de départ à 0 : sinon le gain vaut 1 pendant le tout premier échantillon (gros « clic »)
    p.linearRampToValueAtTime(vol, t + a); if (hold) p.setValueAtTime(vol, t + a + hold); p.exponentialRampToValueAtTime(.0001, t + dur); }
  // une note : forme d'onde, glissé, vibrato, filtre (fixe ou qui s'ouvre : lp = [départ, sommet, temps])
  function tone(f, t, dur, { type = 'sine', vol = .1, a = .004, hold = 0, slide = 0, slideT, detune = 0, lp = 0, q = 1, vib = 0, vibF = 6, pan, rev, bus } = {}) {
    const o = C.createOscillator(), e = C.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + (slideT || dur));
    let n = o; if (lp) { const fl = C.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = q; if (Array.isArray(lp)) { fl.frequency.setValueAtTime(lp[0], t); fl.frequency.exponentialRampToValueAtTime(lp[1], t + lp[2]); fl.frequency.exponentialRampToValueAtTime(lp[0] * 1.5, t + dur); } else fl.frequency.value = lp; o.connect(fl); n = fl; }
    if (vib) { const l = C.createOscillator(), lg = C.createGain(); l.frequency.value = vibF; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
    env(e.gain, t, vol, a, hold, dur); n.connect(e); e.connect(out({ pan, rev, bus })); o.start(t); o.stop(t + dur + .05);
  }
  // cloche FM : le modulateur s'éteint plus vite que la note, comme un métal qu'on frappe
  function bell(f, t, dur, { vol = .08, ratio = 3.5, idx = 2, pan, rev = .25, bus } = {}) {
    const o = C.createOscillator(), m = C.createOscillator(), mg = C.createGain(), e = C.createGain();
    o.frequency.value = f; m.frequency.value = f * ratio; mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(f * .02 + 1, t + dur * .6);
    m.connect(mg); mg.connect(o.frequency); env(e.gain, t, vol, .002, 0, dur); o.connect(e); e.connect(out({ pan, rev, bus }));
    o.start(t); m.start(t); o.stop(t + dur + .05); m.stop(t + dur + .05);
  }
  // bruit filtré (souffle, frottement, foule, caisse claire…)
  function nz(t, dur, { vol = .1, f = 2000, q = .8, type = 'bandpass', sweep = 0, a = .002, hold = 0, pan, rev = .1, bus, rate = 1 } = {}) {
    const s = C.createBufferSource(), fl = C.createBiquadFilter(), e = C.createGain();
    s.buffer = N.noise; s.loop = true; s.playbackRate.value = rate; fl.type = type; fl.frequency.setValueAtTime(f, t); if (sweep) fl.frequency.exponentialRampToValueAtTime(f * sweep, t + dur); fl.Q.value = q;
    env(e.gain, t, vol, a, hold, dur); s.connect(fl); fl.connect(e); e.connect(out({ pan, rev, bus })); s.start(t, Math.random() * 1.8); s.stop(t + dur + .02);
  }
  // la musique se pousse un instant quand un gros son passe
  function duck(depth = .5, len = 1) { if (!N || !N.duck) return; const d = N.duck.gain, t = C.currentTime; d.cancelScheduledValues(t); d.setValueAtTime(d.value, t); d.linearRampToValueAtTime(depth, t + .05); d.setTargetAtTime(1, t + len, .4); }

  // ---------------------------------------------------------------- objets sonores réutilisés
  function clink(t, { vol = .07, f = 2500, pan = 0, rev = .15 } = {}) {   // une pièce qui tinte (partiels inharmoniques du métal)
    f *= R(.12); [[1, 1, .22], [2.32, .55, .14], [4.25, .3, .07]].forEach(([k, v, d]) => tone(f * k, t, d * R(.2), { vol: vol * v, a: .001, pan, rev }));
    nz(t, .012, { vol: vol * .6, f: 7000, type: 'highpass', pan, rev: 0 });
  }
  function coins(t, n, spread, vol = .06) { if (lite()) n = Math.ceil(n / 2); for (let i = 0; i < n; i++) clink(t + spread * Math.pow(i / n, 1.3) + rnd(0, .03), { vol: vol * (1 - i / n * .5), pan: rnd(-.6, .6) }); }
  function thump(t, f = 110, vol = .25, dur = .14) { tone(f, t, dur, { vol, slide: .45, slideT: dur * .7, rev: .05 }); nz(t, .06, { vol: vol * .5, f: 600, type: 'lowpass', rev: 0 }); }
  function click(t, vol = .06, f = 3000, pan = 0) { nz(t, .015, { vol, f, q: 2, pan, rev: .05 }); }
  function paper(t, n = 5, vol = .05) { for (let i = 0; i < n; i++) nz(t + i * rnd(.025, .05), rnd(.03, .07), { vol: vol * R(.3), f: rnd(2200, 5200), q: .6, pan: rnd(-.3, .3), rev: .08 }); }
  function brass(fs, t, dur, vol = .05, lpPeak = 3200) {   // cuivres synthé : scies désaccordées dont le filtre s'ouvre
    fs.forEach((f, i) => [-8, 8].forEach(d => tone(f, t + i * .006, dur, { type: 'sawtooth', vol, a: .03, hold: dur * .25, detune: d, lp: [380, lpPeak, .09], q: 1.5, pan: (i - (fs.length - 1) / 2) * .25, rev: .25 })));
  }
  function whistle(t, len = .45, vol = .1) {   // sifflet d'arbitre : note aiguë avec la bille qui roule dedans (trille rapide) + souffle
    const f = 2950 * R(.03); tone(f, t, len, { vol, a: .015, hold: len * .7, vib: 160, vibF: 27, pan: .15, rev: .3 });
    nz(t, len, { vol: vol * .8, f, q: 6, a: .015, hold: len * .7, pan: .15, rev: .3 });
  }
  function crowd(t, dur, { vol = .09, ohh = false } = {}) {   // foule : bruit sur des « voyelles » (formants) + des voix qui montent (ouais !) ou retombent (ohhh…)
    (ohh ? [[480, 1], [820, .6]] : [[750, 1], [1250, .7], [2600, .35]]).forEach(([f, w]) => nz(t, dur, { vol: vol * w, f, q: 3.5, a: dur * .25, hold: dur * .15, sweep: ohh ? .8 : 1.1, rev: .4, pan: rnd(-.3, .3) }));
    const n = lite() ? 3 : 7;
    for (let i = 0; i < n; i++) { const f = ohh ? rnd(190, 300) : rnd(240, 480); tone(f, t + rnd(0, .15), dur * R(.15), { type: 'sawtooth', vol: vol * .14, a: dur * .3, hold: dur * .1, slide: ohh ? .72 : 1.18, lp: ohh ? 750 : 1500, vib: f * .02, vibF: rnd(4, 7), pan: rnd(-.7, .7), rev: .4 }); }
  }
  // cloche de caisse enregistreuse : frappée deux fois très vite (le battant), partiels du métal légèrement désaccordés qui « battent » et sonnent longtemps
  function regBell(t, vol = .09) {
    [0, .055].forEach((d, h) => [[1, 1, 1.6], [1.006, .7, 1.5], [2.01, .45, 1.1], [2.76, .35, .8], [5.4, .14, .4]].forEach(([k, v, dur]) =>
      tone(2480 * k, t + d, dur, { vol: vol * v * (h ? .75 : 1), a: .0015, rev: .35, pan: .12 })));
  }
  // le « ka » : la touche enfoncée et le cliquet du mécanisme (petits clics serrés qui descendent)
  function regKa(t, vol = .1) { nz(t, .03, { vol, f: 3200, q: 1.4, rev: .05, pan: -.15 }); for (let i = 0; i < 6; i++) click(t + .012 + i * .013, vol * (.9 - i * .1), 4200 - i * 320, -.15); thump(t + .09, 160, vol * .9, .07); }
  // le tiroir qui jaillit : glissement métallique puis butée
  function regDrawer(t, vol = .09) { nz(t, .24, { vol: vol * .8, f: 1400, q: .7, sweep: .45, a: .015, rev: .06 }); thump(t + .24, 85, vol * 2, .14); click(t + .24, vol, 1600); }

  // ---------------------------------------------------------------- la palette (t = moment de départ ; arg = détail optionnel)
  const S = {
    tap: t => { tone(1500 * R(.06), t, .035, { vol: .035, a: .001, slide: .7, rev: 0 }); nz(t, .01, { vol: .012, f: 6500, type: 'highpass', rev: 0 }); },
    tab: t => { tone(880 * R(.03), t, .05, { type: 'triangle', vol: .045, rev: .05 }); tone(1320, t + .035, .06, { type: 'triangle', vol: .03, rev: .1 }); },
    open: t => { nz(t, .24, { vol: .04, f: 450, sweep: 4.5, q: .8, a: .1, rev: .2 }); tone(330, t + .02, .16, { vol: .015, slide: 1.6, rev: .2 }); },
    close: t => { nz(t, .18, { vol: .03, f: 2200, sweep: .25, q: .8, a: .03, rev: .15 }); },
    swipe: t => nz(t, .14, { vol: .035, f: 1500, sweep: .4, q: .9, a: .02, pan: .3 }),
    // argent
    coin: t => { if (smp('coin', t, { vol: SV.coin })) return; regKa(t, .07); regBell(t + .09, .07); coins(t + .2, 3, .25, .04); },   // petit gain : « ka-ching » court, quelques pièces
    cash: t => {   // gros gain : « ka-ching » de caisse enregistreuse complet, tiroir qui sort, pluie de pièces
      duck(.45, 1.4); if (smp('cash', t, { vol: SV.cash })) return; regKa(t, .11); regBell(t + .1, .12); regDrawer(t + .32, .1); coins(t + .55, 12, .8, .06);
    },
    buy: t => {   // on paie : tiroir qui claque, billets froissés, petit « ding »
      click(t, .08, 2200); thump(t + .02, 120, .14, .1); paper(t + .06, 4, .05); bell(1760 * R(.02), t + .16, .5, { vol: .045, ratio: 2.76, idx: 1, rev: .25 }); clink(t + .22, { vol: .035 });
    },
    err: t => { tone(150, t, .22, { vol: .08, slide: .6, lp: 600 }); tone(95, t + .07, .24, { vol: .06, slide: .8, lp: 400 }); nz(t, .07, { vol: .06, f: 300, type: 'lowpass', rev: 0 }); },
    miss: t => { tone(392, t, .2, { type: 'triangle', vol: .045, lp: 1500 }); tone(311, t + .13, .34, { type: 'triangle', vol: .045, lp: 1200, slide: .97 }); },
    win: t => {   // récompense : arpège brillant + scintillement
      duck(.6, .8); [1047, 1319, 1568, 2093].forEach((f, i) => bell(f, t + i * .07, .7, { vol: .08, ratio: 2, idx: 1.2, pan: (i - 1.5) * .25, rev: .3 }));
      [523, 659, 784].forEach(f => tone(f, t + .2, .6, { type: 'triangle', vol: .025, a: .05, rev: .3 }));
    },
    // paris
    bet: t => {   // ticket imprimé (aiguilles), détaché, puis coup de tampon
      for (let i = 0; i < 12; i++) nz(t + i * .028, .016, { vol: .045 * R(.3), f: 3800, type: 'highpass', rev: 0, pan: .2 });
      tone(60, t, .34, { type: 'square', vol: .012, lp: 200, hold: .25 });
      nz(t + .36, .12, { vol: .06, f: 2400, sweep: 1.8, q: .7, pan: .2 });
      thump(t + .52, 105, .14, .14); click(t + .52, .08, 1500); nz(t + .52, .25, { vol: .015, f: 400, type: 'lowpass', rev: .4 });
    },
    whistle: (t, long) => { if (smp(long ? 'whistle-long' : 'whistle', t, { vol: SV.whistle, rev: .15, pan: .1 })) return; if (long) { whistle(t, .2); whistle(t + .3, .2); whistle(t + .6, .9); } else { whistle(t, .14); whistle(t + .22, .5); } },
    goal: t => { duck(.4, 2.6); if (smp('goal', t, { vol: SV.goal, rev: .05 })) return; whistle(t, .25, .08); crowd(t + .1, 1.9, { vol: .14 }); tone(233, t + .3, .7, { type: 'sawtooth', vol: .025, a: .02, hold: .4, lp: 1400, rev: .3 }); tone(294, t + .3, .7, { type: 'sawtooth', vol: .02, a: .02, hold: .4, lp: 1400, rev: .3 }); },
    betWin: t => {   // coup de sifflet, les supporters explosent, et la caisse
      duck(.35, 2.8);
      if (SMP.goal && useSmp) { if (!lite()) S.whistle(t); smp('goal', t + (lite() ? 0 : .45), { vol: SV.goal * .85, rev: .05 }); S.cash(t + (lite() ? .4 : .9)); return; }
      whistle(t, .2, .08); whistle(t + .28, .6, .08); crowd(t + .5, 1.8, { vol: .12 }); S.cash(t + .7);
    },
    betLose: t => {   // coup de sifflet, puis le « ohhh » déçu des tribunes
      if (SMP.groan && useSmp) { if (!lite()) S.whistle(t); smp('groan', t + (lite() ? 0 : .45), { vol: SV.groan, rev: .05 }); return; }
      whistle(t, .2, .07); whistle(t + .28, .6, .07); crowd(t + .55, 1.5, { vol: .1, ohh: true });
    },
    // casino
    spin: (t, stops) => {   // levier, moteur, tic-tic des rouleaux qui ralentissent, « clonk » à l'arrêt de chaque rouleau
      stops = Array.isArray(stops) && stops.length ? stops : [.68, .94, 1.2]; const end = Math.max(...stops);
      thump(t, 90, .18, .16); nz(t, .12, { vol: .05, f: 900, type: 'lowpass' }); tone(55, t + .05, end, { type: 'sawtooth', vol: .018, lp: 260, a: .1, hold: end * .7 });
      let x = t + .08; while (x < t + end - .03) { const p = (x - t) / end, run = stops.filter(s => t + s > x).length; nz(x, .012, { vol: .02 + .012 * run, f: 1900 * R(.1), q: 3, pan: rnd(-.3, .3), rev: 0 }); x += .035 + .05 * p * p; }
      stops.forEach((s, i) => { thump(t + s, 150 - i * 15, .2, .12); click(t + s, .07, 2600, (i - 1) * .45); });
    },
    jackpot: t => {   // cloches qui sonnent à toute volée + pluie de pièces + montée
      duck(.3, 3); thump(t, 60, .3, .5);
      for (let i = 0; i < 12; i++) bell(i % 2 ? 1976 : 1568, t + i * .12, .4, { vol: .05, ratio: 2.76, idx: 1.5, pan: i % 2 ? .4 : -.4, rev: .3 });
      [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + .1 + i * .08, .25, { type: 'square', vol: .02, lp: 2500, rev: .3 }));
      brass([523, 659, 784, 1047], t + .7, 1.2, .022); if (!smp('payout', t + .2, { vol: SV.payout, rev: .1 })) coins(t + .2, 24, 1.8, .05);
    },
    roll: t => {   // roulette : lancer, bille qui tourne (cliquetis qui ralentit), rebonds, et chute dans la case (~4,2 s)
      click(t, .07, 3200); tone(1600, t, .05, { vol: .02, slide: .6 });
      const s = C.createBufferSource(), fl = C.createBiquadFilter(), am = C.createGain(), e = C.createGain(), l = C.createOscillator(), lg = C.createGain();
      s.buffer = N.noise; s.loop = true; fl.type = 'bandpass'; fl.frequency.setValueAtTime(3000, t); fl.frequency.exponentialRampToValueAtTime(1700, t + 3.3); fl.Q.value = 2.5;
      l.frequency.setValueAtTime(16, t); l.frequency.exponentialRampToValueAtTime(3.5, t + 3.3); lg.gain.value = .5; am.gain.value = .5; l.connect(lg); lg.connect(am.gain);
      e.gain.value = 0; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.09, t + .2); e.gain.setValueAtTime(.09, t + 2.2); e.gain.exponentialRampToValueAtTime(.002, t + 3.4);
      s.connect(fl); fl.connect(am); am.connect(e); e.connect(out({ rev: .15, pan: .1 })); s.start(t); l.start(t); s.stop(t + 3.5); l.stop(t + 3.5);
      nz(t, 3.4, { vol: .03, f: 250, type: 'lowpass', a: .3, hold: 2, rev: 0 });   // la roue qui tourne
      [3.3, 3.55, 3.75, 3.9, 4].forEach((b, i) => { const v = .09 - i * .012; tone(2300 * R(.1), t + b, .04, { vol: v * .5, slide: .7, pan: rnd(-.3, .3) }); click(t + b, v, 3500); });
      thump(t + 4.15, 320, .12, .1); click(t + 4.15, .08, 2200);
    },
    chip: t => { const p = rnd(-.3, .3); nz(t, .03, { vol: .18, f: 2800 * R(.1), q: 2, pan: p, rev: .05 }); tone(2100 * R(.06), t, .03, { vol: .025, pan: p }); nz(t + .045, .025, { vol: .1, f: 2300, q: 2, pan: p, rev: .05 }); },
    // grattage
    scratch: t => { if (smp('scratch', t, { vol: SV.scratch, rev: 0, pan: rnd(-.25, .25), off: grain(), dur: .32 })) return; nz(t, .06 * R(.3), { vol: .06 * R(.3), f: rnd(3500, 6000), q: 1.2, sweep: R(.3), pan: rnd(-.3, .3), rev: 0 }); nz(t + .02, .03, { vol: .015, f: 7000, type: 'highpass', rev: 0 }); },
    paper: t => { paper(t, 5, .055); nz(t + .1, .1, { vol: .05, f: 2000, sweep: 2, q: .7 }); },
    scratchWin: t => { duck(.5, 1.6); if (smp('scratch-win', t, { vol: SV.scratchWin, rev: .06 })) return; nz(t, .3, { vol: .04, f: 600, sweep: 6, a: .15, rev: .3 }); [1319, 1568, 1976].forEach((f, i) => bell(f, t + .15 + i * .08, .8, { vol: .07, ratio: 2, idx: 1, pan: (i - 1.5) * .3, rev: .35 })); coins(t + .3, 6, .5, .045); },
    // boosters et cartes
    rustle: t => { for (let i = 0; i < (lite() ? 6 : 12); i++) nz(t + rnd(0, .5), .015, { vol: rnd(.02, .05), f: rnd(5000, 9000), type: 'highpass', pan: rnd(-.5, .5), rev: .05 }); },
    tear: t => { if (smp('tear', t, { vol: SV.tear, rev: .04, pan: rnd(-.15, .15) })) return; S.rustle(t); nz(t + .1, .34, { vol: .13, f: 900, sweep: 4.5, q: .9, a: .02, rev: .2 }); nz(t + .12, .4, { vol: .025, f: 9000, type: 'highpass', a: .05, rev: .4 }); thump(t + .1, 180, .06, .08); },
    cardflip: t => { if (smp('cardflip', t, { vol: SV.cardflip, rev: .03 })) return; S.flip(t); },   // vraie carte retournée puis posée (enregistrement libre)
    flip: t => { nz(t, .07, { vol: .07, f: 1800, sweep: 2.5, q: .9, pan: rnd(-.2, .2) }); tone(220, t + .03, .05, { vol: .04, slide: .6 }); },
    common: t => { tone(600, t, .08, { vol: .06, slide: 1.6 }); bell(1200, t + .02, .3, { vol: .05, ratio: 2, idx: .6, rev: .2 }); },
    rare: t => { duck(.6, .8); nz(t, .3, { vol: .03, f: 800, sweep: 5, a: .1, rev: .3 }); [1319, 1661, 1976].forEach((f, i) => bell(f, t + .1 + i * .08, .8, { vol: .07, ratio: 2, idx: 1, pan: (i - 1) * .4, rev: .4 })); },
    epic: t => {
      duck(.4, 1.6); nz(t, .55, { vol: .05, f: 300, sweep: 12, a: .4, rev: .3 }); thump(t + .5, 70, .22, .4);
      brass([311, 392, 466, 587], t + .5, 1, .04, 2600); [1245, 1568, 1865].forEach((f, i) => bell(f, t + .5 + i * .07, .9, { vol: .045, ratio: 2, idx: 1.2, pan: (i - 2) * .3, rev: .45 }));
    },
    legend: t => {
      duck(.25, 3); nz(t, .7, { vol: .06, f: 250, sweep: 16, a: .6, rev: .3 }); tone(55, t + .65, 1.4, { vol: .3, slide: .5, rev: .1 }); nz(t + .65, .5, { vol: .1, f: 500, type: 'lowpass', rev: .4 });
      brass([262, 330, 392, 523, 587], t + .65, 1.6, .045, 3600); [523, 659, 784].forEach(f => tone(f, t + .7, 2, { type: 'triangle', vol: .02, a: .3, rev: .5 }));
      [1047, 1319, 1568, 2093].forEach((f, i) => bell(f, t + .7 + i * .09, 1, { vol: .045, ratio: 2, idx: 1.3, pan: Math.sin(i) * .7, rev: .5 }));
    },
    // crypto et minage
    alert: t => { tone(1760, t, .09, { type: 'square', vol: .02, lp: 3500, rev: .15 }); bell(1760, t, .35, { vol: .05, ratio: 1, idx: .4 }); bell(2637, t + .1, .5, { vol: .05, ratio: 1, idx: .4, rev: .3 }); },
    blipUp: t => { tone(660, t, .07, { type: 'square', vol: .045, lp: 2500, slide: 1.5, slideT: .05 }); tone(990, t + .06, .1, { type: 'square', vol: .04, lp: 2800, slide: 1.33, slideT: .06, rev: .15 }); },
    sell: t => { tone(990, t, .07, { type: 'square', vol: .025, lp: 2500, slide: .67, slideT: .05 }); tone(660, t + .06, .1, { type: 'square', vol: .02, lp: 2200, rev: .1 }); clink(t + .12, { vol: .05 }); clink(t + .2, { vol: .035, f: 2900 }); },
    harvest: t => { duck(.5, 1.2); [784, 880, 1047, 1175, 1397, 1568].forEach((f, i) => { tone(f, t + i * .055, .08, { type: 'square', vol: .018, lp: 3000, pan: (i - 2.5) * .2 }); tone(f, t + i * .055, .28, { type: 'triangle', vol: .035, rev: .2, pan: (i - 2.5) * .2 }); }); },
    alarm: t => { for (let i = 0; i < 3; i++) { tone(i % 2 ? 196 : 247, t + i * .34, .24, { type: 'sawtooth', vol: .04, a: .02, hold: .15, lp: 900, vib: 6, vibF: 9, rev: .15 }); tone(62, t + i * .34, .22, { vol: .06, a: .02, hold: .1 }); } },
    burnt: t => { S.alarm(t); nz(t + .9, .9, { vol: .06, f: 6000, type: 'highpass', sweep: .3, a: .05, rev: .3 }); thump(t + .9, 80, .2, .3); },
    // progression
    level: t => {   // vraie fanfare de victoire (enregistrement libre) ; à défaut : deux notes d'appel, accord de cuivres, grosse caisse, cymbale
      duck(.3, 3.4); if (smp('level', t, { vol: SV.level, rev: .08 })) return; brass([392], t, .12, .03, 2400); brass([523], t + .13, .12, .03, 2600);
      thump(t + .27, 70, .3, .35); brass([523, 659, 784, 1047], t + .27, 1.1, .022, 3800); nz(t + .27, 1.3, { vol: .045, f: 6500, type: 'highpass', rev: .4 });
    },
    trophy: t => { duck(.35, 2); [784, 988, 1175, 1568, 1976].forEach((f, i) => bell(f, t + i * .09, 1.1, { vol: .055, ratio: 2, idx: 1.1, pan: (i - 2) * .3, rev: .45 })); [392, 494, 587].forEach(f => tone(f, t + .3, 1.3, { type: 'triangle', vol: .025, a: .15, rev: .45 })); thump(t + .36, 80, .18, .3); },
    notif: t => {   // petit « ding » de téléphone (plus de bourdonnement de vibration : il sonnait comme un « tun tun » sans raison)
      if (smp('notif', t, { vol: SV.notif, rev: .05 })) return;
      bell(1568, t, .5, { vol: .05, ratio: 2, idx: .5, rev: .25 }); bell(2093, t + .08, .6, { vol: .045, ratio: 2, idx: .5, rev: .3 });
    },
    gift: t => { duck(.4, 2.4); if (smp('gift', t, { vol: SV.gift, rev: .06 })) return; tone(300, t, .09, { vol: .06, slide: 2.2 }); nz(t, .08, { vol: .06, f: 1500, q: .7 }); [1047, 1175, 1319, 1568, 1760, 2093].forEach((f, i) => bell(f, t + .08 + i * .045, .5, { vol: .06, ratio: 2, idx: .8, pan: (i - 3.5) * .2, rev: .4 })); coins(t + .45, 8, .6, .06); },
    deco: t => { tone(500, t, .08, { vol: .1, slide: 2.4 }); nz(t, .05, { vol: .04, f: 3000 }); thump(t + .06, 140, .08, .1); },
    // Coupe des Morts
    spooky: t => {   // orgue mineur qui tremble, cloche grave, tonnerre au loin
      duck(.35, 2.4); nz(t, 1.6, { vol: .1, f: 380, type: 'lowpass', sweep: .5, a: .08, rev: .4 });
      [147, 175, 208, 294].forEach((f, i) => tone(f, t + .15 + i * .02, 1.6, { type: 'square', vol: .016, a: .15, hold: .7, lp: 1100, vib: 2.5, vibF: 5.5, pan: (i - 1.5) * .3, rev: .5 }));
      bell(110, t + .2, 2.4, { vol: .14, ratio: 1.4, idx: 3, rev: .5 });
    },
    candy: t => { bell(1245 * R(.02), t, .4, { vol: .07, ratio: 2, idx: .5, pan: -.2, rev: .2 }); bell(1568 * R(.02), t + .09, .45, { vol: .065, ratio: 2, idx: .45, pan: .2, rev: .2 }); }
  };
  // volume de chaque enregistrement dans la console (réglé pour tenir le même niveau que les sons synthétisés)
  const SV = { cardflip: .5, level: .5, coin: .34, cash: .55, whistle: .6, goal: .26, groan: .26, gift: .26, payout: .2, scratch: .15, scratchWin: .22, notif: .25, tear: .3 };
  const GAP = { scratch: 40, chip: 40, coin: 50 }, last = {};

  const on = () => st().sound !== false;
  const SFX = {};
  Object.keys(S).forEach(k => { SFX[k] = arg => { if (!on() || document.hidden) return; const now = performance.now(); if (now - (last[k] || 0) < (GAP[k] || 70)) return; last[k] = now; try { const c = ac(); S[k](Math.max(c.currentTime + .01, T0 + .15), arg); } catch (e) {} }; });   // compresseur tout neuf : pic dans ses premiers instants, on attend un peu
  // gain d'argent : petite somme = pièces, grosse = tiroir-caisse (relatif au cash qu'on a déjà)
  SFX.gain = n => (n >= Math.max(150, (st().cash || 0) * .08) ? SFX.cash : SFX.coin)();

  // ---------------------------------------------------------------- musique : instru rap de rue (90 BPM, fa mineur)
  const BPM = 90, BEAT = 60 / BPM, S16 = BEAT / 4, BAR = BEAT * 4, SWING = .08, MVOL = .12;
  const H = { F4: 349.23, G4: 392, Ab4: 415.3, Bb4: 466.16, C5: 523.25, Db5: 554.37, Eb5: 622.25, E4: 329.63, E5: 659.26, F5: 698.46, G5: 783.99 };
  // Fa mineur · Ré bémol · Si bémol mineur · Do (le Do majeur donne la tension « rue »)
  const CH = [{ r: 87.31, n: [H.F4, H.Ab4, H.C5] }, { r: 69.3, n: [H.F4, H.Ab4, H.Db5] }, { r: 58.27, n: [H.F4, H.Bb4, H.Db5] }, { r: 65.41, n: [H.E4, H.G4, H.C5] }];
  // mélodie pincée (pas de double-croche, note) : rythme 3-3-2 typique
  const MEL = [[[0, H.C5], [3, H.Ab4], [6, H.F4], [8, H.C5], [10, H.Db5], [12, H.C5], [14, H.Ab4]],
    [[0, H.F5], [3, H.Db5], [6, H.Ab4], [8, H.F5], [10, H.Eb5], [12, H.Db5]],
    [[0, H.Db5], [3, H.Bb4], [6, H.F4], [8, H.Db5], [10, H.C5], [12, H.Bb4], [14, H.Db5]],
    [[0, H.C5], [3, H.G4], [6, H.E4], [8, H.G4], [10, H.C5], [12, H.E5], [14, H.G5]]];
  const SEC = ['A', 'B', 'A2', 'B2'], KA = [0, 7, 10], KB = [0, 3, 10, 13];
  // humeurs : filtre de la musique (Hz) et volume de la batterie. Appart feutré, rue normale, casino / club plus brillant et plus chargé
  const MOOD = { calm: 1200, street: 6500, hype: 18000 }, DRUMS = { calm: .55, street: 1, hype: 1.3 }, HATS = { calm: .5, street: 1, hype: 3 };
  let musicOn = false, nextBar = 0, bar = 0, sched = null, M = null, mood = 'street', secLog = [];

  function mBus() { const g = () => C.createGain(), m = { dry: g(), rev: g(), bass: g(), mel: g() }; m.dry.connect(N.mFilt); m.rev.connect(N.mRev); m.bass.connect(N.sh); m.mel.connect(m.dry); m.mel.connect(N.dly); return m; }
  function kick(t, M, v = 1) { tone(150, t, .42, { vol: .6 * v, a: .002, slide: .3, slideT: .1, rev: 0, bus: M }); nz(t, .012, { vol: .05 * v, f: 3500, q: 1, rev: 0, bus: M }); }
  function snare(t, M, v = 1) { for (let k = 0; k < 3; k++) nz(t + k * .011, .02, { vol: .14 * v, f: 1300, q: 1.2, rev: .2, bus: M }); nz(t + .03, .2, { vol: .13 * v, f: 1900, q: .8, rev: .5, bus: M }); tone(200, t, .1, { vol: .08 * v, slide: .7, rev: .1, bus: M }); }
  function hat(t, M, v = 1, open) { nz(t, open ? .2 : .035, { vol: .055 * v, f: 7800, type: 'highpass', rev: .04, pan: .25, bus: M }); }
  function b808(t, f, len, M, to) {
    const o = C.createOscillator(), e = C.createGain(); e.gain.value = 0; o.frequency.setValueAtTime(f, t);
    if (to && to !== f) { o.frequency.setValueAtTime(f, t + len * .6); o.frequency.exponentialRampToValueAtTime(to, t + len * .95); }
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.5, t + .006); e.gain.setTargetAtTime(.32, t + .05, .3); e.gain.setTargetAtTime(0, t + len - .03, .02);
    o.connect(e); e.connect(M.bass); o.start(t); o.stop(t + len + .15);
  }
  const pluck = (t, f, M, v = 1) => bell(f, t, .6, { vol: .07 * v, ratio: 2, idx: 1.1, rev: .2, bus: { dry: M.mel, rev: M.rev } });
  function keys(t, f, dur, M, v = 1) { tone(f, t, dur, { vol: .035 * v, a: .01, rev: .35, bus: M }); tone(f, t, dur * .8, { type: 'triangle', vol: .018 * v, detune: 8, lp: 1600, rev: .35, bus: M }); }
  const secOf = i => i < 2 ? 'Intro' : SEC[Math.floor(i / 8) % 4];

  function playBar(t, i, M) {
    const k = i % 4, ch = CH[k], nx = CH[(i + 1) % 4], sec = secOf(i), B = sec[0] === 'B', s8 = i % 8, calm = mood === 'calm', hype = mood === 'hype', dv = DRUMS[mood] || 1, hv = HATS[mood] || 1;   // l'humeur s'applique à la mesure suivante
    const at = s => t + (s + (s % 2 ? SWING * 2 : 0)) * S16;   // un peu de swing sur les contretemps
    secLog.push([t, sec, i]); if (secLog.length > 16) secLog.shift();
    // accords de piano électrique (B, intro), petites relances en A2
    if (B || sec === 'Intro') ch.n.forEach((f, n) => keys(t + n * .012, f, BAR * .95, M, B ? 1 : .8));
    else if (sec === 'A2') [6, 14].forEach(s => ch.n.forEach(f => keys(at(s), f * 2, S16 * 2.5, M, .55)));
    // mélodie : complète en A, réponse plus haute et plus aérée en B
    (B ? MEL[k].filter(x => x[0] < 8 || x[0] === 12).map(([s, f]) => [s, f * 2]) : MEL[k]).forEach(([s, f]) => pluck(at(s), f, M, B ? .6 : 1));
    if (sec === 'Intro') return;
    const drop = sec === 'B2' && s8 < 2, fill = s8 === 7 && !B;   // B2 commence sans batterie (la 808 tient, ça respire) ; fin de phrase en A : la batterie se coupe
    // 808 : suit la fondamentale, glisse vers l'accord suivant en fin de mesure (et saute à l'octave en B)
    const BL = drop ? [[0, 16]] : B ? [[0, 6], [7, 2], [10, 3], [13, 3]] : fill ? [[0, 8], [10, 6]] : [[0, 7], [10, 6]];
    BL.forEach(([s, l], j) => { const lastN = j === BL.length - 1, oct = B && j === 2; b808(at(s), oct ? ch.r * 2 : ch.r, l * S16, M, lastN ? nx.r : oct ? ch.r : 0); });
    if (drop) { if (s8 === 1) [12, 13, 14, 15].forEach((s, n) => snare(at(s), M, .35 + n * .2)); return; }
    // batterie
    (B ? KB : KA).forEach(s => { if (!(fill && s > 8)) kick(at(s), M, dv); });
    snare(at(4), M, dv); if (fill) [12, 13, 14, 15].forEach((s, n) => snare(at(s), M, (.4 + n * .2) * dv)); else snare(at(12), M, dv);
    const busy = !calm && (B || hype), roll = !calm && !fill && (k === 3 || (hype && k === 1)), r0 = B ? 12 : 14;
    for (let s = 0; s < 16; s += busy ? 1 : 2) { if ((fill && s >= 8) || (roll && s >= r0)) break; hat(at(s), M, (s % 4 === 0 ? 1 : s % 2 ? .45 : .7) * hv); }
    if (roll) for (let r = 0; r < (B ? 6 : 4); r++) hat(t + r0 * S16 + r * (B ? BEAT / 6 : S16 / 2), M, (.4 + r * .1) * hv);   // roulements de charleston « trap » (triolets en B)
    if ((B || hype) && !calm) { hat(at(6), M, .5 * hv, true); hat(at(14), M, .4 * hv, true); }
    if (hype && !fill) {   // casino / club : charleston ouvert en plus sur les contretemps, shaker en doubles croches, accords plaqués
      [2, 10].forEach(s => hat(at(s), M, .8, true));
      if (!lite()) for (let s = 0; s < 16; s++) nz(at(s) + .004, .045, { vol: (s % 2 ? .13 : .07), f: 6000, q: 1.4, type: 'bandpass', rev: .02, pan: -.3, bus: M });
      [3, 10].forEach(s => ch.n.forEach((f, n) => tone(f * 2, at(s), S16 * 1.6, { type: 'sawtooth', vol: .05, a: .005, lp: 3200, q: 1.2, detune: (n - 1) * 7, pan: (n - 1) * .35, rev: .25, bus: M })));
    }
  }
  function tick() {
    if (st().music === false && musicOn) return music(false);
    if (!musicOn || !C || !M) return;
    // onglet resté en arrière-plan (minuteur ralenti par le navigateur) : on saute les mesures en retard au lieu de toutes les jouer d'un coup
    if (nextBar < C.currentTime) nextBar = C.currentTime + .05;
    while (nextBar < C.currentTime + 1.2) { playBar(nextBar, bar++, M); nextBar += BAR; }
  }
  function music(want) {
    musicOn = !!want && st().music !== false;
    if (!musicOn) {   // fondu de sortie puis on débranche (les notes déjà programmées tombent dans le vide)
      clearInterval(sched); sched = null;
      if (M && C) { const old = M; N.mVol.gain.cancelScheduledValues(C.currentTime); N.mVol.gain.setTargetAtTime(0, C.currentTime, .12); setTimeout(() => { Object.values(old).forEach(n => { try { n.disconnect(); } catch (e) {} }); }, 700); M = null; }
      return;
    }
    try { ac(); } catch (e) { return; }
    if (!M) { M = mBus(); bar = 0; secLog = []; nextBar = C.currentTime + .15; N.mVol.gain.cancelScheduledValues(C.currentTime); N.mVol.gain.setValueAtTime(0, C.currentTime); }
    N.mVol.gain.setTargetAtTime(MVOL, C.currentTime, .8);   // fondu d'entrée
    nextBar = Math.max(nextBar, C.currentTime + .1);
    if (!sched) { sched = setInterval(tick, 250); tick(); }
  }
  // humeur selon le lieu : appart = feutré, rue = normal, casino / club = charleston plus chargé
  function setMood(m) { m = MOOD[m] ? m : 'street'; if (m === mood) return; mood = m; if (N) { const f = N.mFilt.frequency; f.cancelScheduledValues(C.currentTime); f.setValueAtTime(f.value, C.currentTime); f.setTargetAtTime(MOOD[m], C.currentTime, .3); } }   // le filtre glisse en ~1 s, le rythme change à la mesure suivante
  function section() { if (!C || !musicOn) return null; const t = C.currentTime; let s = null; secLog.forEach(x => { if (x[0] <= t) s = x; }); return s && { name: s[1], bar: s[2] }; }

  // rendu hors ligne (tests) : un son, ou quelques mesures de musique (arg = humeur), dans un tampon
  function render(name, sec = 3, arg) {
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, oc = new OC(2, Math.ceil(44100 * sec), 44100), keep = [C, N, mood, secLog];
    C = oc; N = graph(oc);
    try { if (name === 'music') { if (arg) mood = arg; N.mVol.gain.value = MVOL; N.mFilt.frequency.value = MOOD[mood]; const m = mBus(); for (let i = 0, t = .2; t < sec; i++, t += BAR) playBar(t, i, m); } else S[name](.2, arg); }
    finally { [C, N, mood, secLog] = keep; }
    return oc.startRendering();
  }

  // les navigateurs n'autorisent le son qu'après un premier geste : on démarre la musique au premier appui (dans le jeu seulement)
  const unlock = () => { document.removeEventListener('pointerdown', unlock, true); if (on()) try { ac(); } catch (e) {} if (window.GAME && st().music !== false) music(true); };   // ac() lance aussi le chargement des enregistrements
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('visibilitychange', () => { if (!C) return; document.hidden ? C.suspend() : C.resume(); });

  window.AUDIO = { sfx: SFX, music, mood: setMood, duck, render, list: Object.keys(S),
    samples: { files: SAMPLES, get ready() { return Object.keys(SMP); }, get on() { return useSmp; }, set on(v) { useSmp = !!v; }, load() { try { ac(); } catch (e) {} } }, get musicOn() { return musicOn; }, get section() { return section(); }, get moodNow() { return mood; } };
})();
