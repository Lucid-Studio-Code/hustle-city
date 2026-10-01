/* Hustle City : logique pure (état, sauvegarde, simulation). Aucun DOM ici. */
(function () {
  'use strict';
  const D = window.DATA;
  const SAVE_KEY = 'hustleCity.v1';
  const MAX_OFFLINE = 12 * 3600;

  const now = () => Date.now();
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function weighted(list, key = 'w') { let t = list.reduce((s, x) => s + x[key], 0), r = Math.random() * t; for (const x of list) { r -= x[key]; if (r <= 0) return x; } return list[list.length - 1]; }

  // ------------------------------------------------------------ événements
  const handlers = {};
  function on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); }
  function emit(ev, data) { (handlers[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

  // ------------------------------------------------------------ état
  function fresh() {
    const t = now();
    const st = {
      v: 1, created: t, last: t,
      name: '', skin: null,
      cash: D.START.cash, lingots: D.START.lingots,
      lvl: 1, xp: 0,
      stats: {}, quests: {},
      crypto: { mood: 'calm', moodUntil: t + D.MOOD_MIN * 60000, lastTick: t, prices: {}, hist: {}, hold: {}, cost: {}, since: {} },
      rig: { lvl: 0, start: t, pending: 0 },
      matches: [], bets: [], nextMatchId: 1, matchClock: t,
      market: { lastTick: t, prices: {}, fair: {}, hist: {}, nextRumor: t + rnd(...D.RUMOR_MIN) * 60000, news: [] },
      owned: {},            // id -> [{ paid, t }]
      room: 0,
      daily: { day: -1, streak: 0, claimedDay: -1 },
      boosters: 0, boosterDay: -1, chal: null, colClaimed: {},
      event: null, nextEventAt: t + D.EVENTS.first * 1000, deal: null, nextDealAt: t + D.DEALS.first * 1000,
      freebets: [], freeTickets: 0, rigBoostT: t,
      bailoutAt: 0,
      habits: {}, habitCharge: t, tiltUntil: 0,
      tutoDone: false, seenIntro: {},
      sound: true
    };
    D.COINS.forEach(c => { st.crypto.prices[c.id] = c.p0; st.crypto.hist[c.id] = [c.p0]; st.crypto.hold[c.id] = 0; st.crypto.cost[c.id] = 0; });
    D.ITEMS.forEach(i => { st.market.prices[i.id] = i.p0; st.market.fair[i.id] = i.p0; st.market.hist[i.id] = [i.p0]; });
    return st;
  }
  let st = fresh();

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const base = fresh();
        st = Object.assign(base, saved);
        ['crypto', 'market', 'rig', 'daily'].forEach(k => { st[k] = Object.assign(fresh()[k], saved[k] || {}); });
        // nouveaux objets / cryptos ajoutés après la sauvegarde
        D.COINS.forEach(c => { if (st.crypto.prices[c.id] == null) { st.crypto.prices[c.id] = c.p0; st.crypto.hist[c.id] = [c.p0]; st.crypto.hold[c.id] = 0; st.crypto.cost[c.id] = 0; } });
        D.ITEMS.forEach(i => { if (st.market.prices[i.id] == null) { st.market.prices[i.id] = i.p0; st.market.fair[i.id] = i.p0; st.market.hist[i.id] = [i.p0]; } });
      }
    } catch (e) { console.warn('save illisible', e); st = fresh(); }
    const away = Math.min(MAX_OFFLINE, (now() - st.last) / 1000);
    const report = catchUp(away);
    return report;
  }
  function save() { st.last = now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) {} }
  function reset() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} st = fresh(); emit('change'); }

  // ------------------------------------------------------------ monnaie, XP, stats
  function addCash(n) { st.cash = Math.round((st.cash + n) * 100) / 100; emit('money'); }
  function canPay(n) { return st.cash >= n - 1e-9; }
  function pay(n) { if (!canPay(n)) return false; addCash(-n); return true; }
  function addLingots(n) { st.lingots += n; emit('money'); }
  function xpNeed() { return D.XP_TABLE[st.lvl] || Infinity; }
  function addXp(n) {
    if (n <= 0) return;
    if (habitOn('club')) n *= 1 + D.HABITS.find(h => h.id === 'club').xpBoost;
    if (evOn('xp')) n *= 2;
    st.xp += Math.round(n);
    while (st.lvl < D.MAX_LVL && st.xp >= xpNeed()) {
      st.xp -= xpNeed(); st.lvl++;
      const r = D.LEVEL_REWARD(st.lvl);
      st.cash = Math.round((st.cash + r.cash) * 100) / 100; st.lingots += r.lingots; st.boosters = (st.boosters || 0) + r.boosters;
      emit('levelup', Object.assign({ lvl: st.lvl }, r));
    }
    emit('xp');
  }
  function stat(k, n = 1, max = false) {
    st.stats[k] = max ? Math.max(st.stats[k] || 0, n) : (st.stats[k] || 0) + n;
    emit('stat', k);
  }

  // ------------------------------------------------------------ crypto
  const coin = id => D.COINS.find(c => c.id === id);
  const mood = () => D.MOODS.find(m => m.id === st.crypto.mood) || D.MOODS[0];
  function coinUnlocked(c) { return st.lvl >= c.lvl; }
  function cryptoTick(stepMin) {
    const m = mood();
    D.COINS.forEach(c => {
      let p = st.crypto.prices[c.id];
      const vol = c.vol * m.volx * Math.sqrt(stepMin);
      const drift = (c.drift + m.drift * (c.vol / .01)) * stepMin;
      p *= Math.exp(drift - vol * vol / 2 + vol * gauss());
      // rug pull : rare effondrement brutal des memecoins
      if (c.rug && Math.random() < c.rug * stepMin) { p *= rnd(.08, .25); emit('news', { txt: `${c.name} s'effondre : les créateurs ont vidé la caisse. −80 % !`, bad: true }); }
      // plancher et plafond de sécurité pour que le jeu reste jouable
      p = clamp(p, c.p0 * .02, c.p0 * 60);
      st.crypto.prices[c.id] = p;
      const h = st.crypto.hist[c.id]; h.push(p); if (h.length > D.HISTORY) h.splice(0, h.length - D.HISTORY);
    });
  }
  function simCrypto(dt, offline) {
    const cr = st.crypto;
    // humeur du marché
    if (now() >= cr.moodUntil) {
      const prev = cr.mood;
      cr.mood = cr.nextMood || weighted(D.MOODS).id; cr.nextMood = null;
      cr.moodUntil = now() + D.MOOD_MIN * 60000;
      if (!offline && cr.mood !== prev) emit('mood', mood());
    }
    const stepMs = D.TICK_S * 1000;
    let n = Math.floor((now() - cr.lastTick) / stepMs);
    if (n <= 0) return;
    if (n > 60) { // hors ligne : pas de 1 min, max 720 points
      const mins = Math.min(720, Math.floor((now() - cr.lastTick) / 60000));
      for (let i = 0; i < mins; i++) cryptoTick(1);
    } else for (let i = 0; i < n; i++) cryptoTick(D.TICK_S / 60);
    cr.lastTick = now();
    // mission « garder 30 min »
    D.COINS.forEach(c => { if (cr.hold[c.id] > 0 && cr.since[c.id] && now() - cr.since[c.id] >= 30 * 60000) stat('hodl30', 1, true); });
    emit('prices');
  }
  function holdValue(id) { return (st.crypto.hold[id] || 0) * st.crypto.prices[id]; }
  function cryptoValue() { return D.COINS.reduce((s, c) => s + holdValue(c.id), 0); }
  function buyCrypto(id, eur) {
    const c = coin(id); eur = Math.round(eur * 100) / 100;
    if (!c || !coinUnlocked(c) || eur < 1) return { err: 'Montant trop petit.' };
    if (!canPay(eur)) return { err: 'Pas assez de cash.' };
    pay(eur);
    const qty = eur * (1 - fee()) / st.crypto.prices[id];
    if (!st.crypto.hold[id]) st.crypto.since[id] = now();
    st.crypto.hold[id] += qty; st.crypto.cost[id] += eur;
    stat('cryptoBuy'); addXp(3 + Math.min(40, eur / 25));
    emit('change'); return { qty };
  }
  function sellCrypto(id, frac) {
    const cr = st.crypto, q = cr.hold[id] * frac;
    if (!(q > 0)) return { err: 'Rien à vendre.' };
    const gross = q * cr.prices[id], net = Math.floor(gross * (1 - fee()) * 100) / 100;
    const costPart = cr.cost[id] * frac, profit = net - costPart;
    cr.hold[id] -= q; cr.cost[id] -= costPart;
    if (frac >= .999 || cr.hold[id] * cr.prices[id] < .01) { cr.hold[id] = 0; cr.cost[id] = 0; cr.since[id] = 0; }
    addCash(net);
    if (profit > 0) stat('cryptoProfit');
    addXp(3 + Math.min(40, net / 25));
    emit('change'); return { net, profit };
  }

  // ------------------------------------------------------------ rig de minage
  function rigInfo() {
    const r = D.RIG[st.rig.lvl], heatMs = r.heatMin * 60000 * (habitMalus('club') ? .75 : 1);
    const run = Math.min(now() - st.rig.start, heatMs);
    const mined = st.rig.pending + r.btkH * run / 3600000, px = st.crypto.prices.btk;
    // tout est aussi donné en billets, au cours du moment : c'est ce qui parle à tout le monde
    return { r, mined, value: mined * px, perHour: r.btkH * px, hot: now() - st.rig.start >= heatMs, left: Math.max(0, heatMs - (now() - st.rig.start)), pct: run / heatMs, heatMs };
  }
  // mode 'sell' : on vend tout de suite l'Axion récupéré (frais de 0,5 %) ; 'keep' : on le garde dans le PC, sa valeur suivra le cours
  function rigCollect(mode = 'keep') {
    const i = rigInfo();
    if (i.mined <= 0) return { err: 'Rien à récupérer.' };
    const eur = i.value, wasHot = i.hot;
    let cash = 0;
    if (mode === 'sell') { cash = Math.floor(eur * (1 - fee()) * 100) / 100; addCash(cash); }
    else { if (!st.crypto.hold.btk) st.crypto.since.btk = now(); st.crypto.hold.btk += i.mined; st.crypto.cost.btk += eur; }
    st.rig.pending = 0; st.rig.start = now();
    stat('rigCollect'); if (wasHot) stat('rigRestart');
    addXp(4 + Math.min(30, eur / 10));
    emit('change'); return { btk: i.mined, eur, cash, mode, restarted: wasHot };
  }
  // amélioration : combien elle rapporte de plus, et en combien d'heures de minage elle est remboursée
  function rigNext() {
    const nx = D.RIG[st.rig.lvl + 1]; if (!nx) return null;
    const px = st.crypto.prices.btk, cur = D.RIG[st.rig.lvl], price = cost(nx.cost);
    const gainH = (nx.btkH - cur.btkH) * px;
    return { nx, price, mult: nx.btkH / cur.btkH, perHour: nx.btkH * px, payback: gainH > 0 ? price / gainH : Infinity };
  }
  // risque d'une crypto, en mots simples (selon la volatilité et le risque d'effondrement)
  function coinRisk(c) {
    const v = c.vol + (c.rug ? .02 : 0);
    return v <= .006 ? { n: 1, label: 'Tranquille', desc: 'Bouge peu. Pour débuter.' } : v <= .012 ? { n: 2, label: 'Ça bouge', desc: 'Monte et descend plus vite.' }
      : v <= .02 ? { n: 3, label: 'Montagnes russes', desc: 'Peut faire +30 % ou −30 % en peu de temps.' } : { n: 4, label: 'Casino', desc: 'Peut s\'effondrer d\'un coup. Ne mise que ce que tu peux perdre.' };
  }
  // une amélioration de l'appart (machine ou déménagement) que le joueur peut se payer maintenant
  const pcLvl = () => Math.min(st.pc || 0, D.PCS.length - 1);
  function fee() { return D.PCS[pcLvl()].fee; }
  function pcNext() { const nx = D.PCS[pcLvl() + 1]; return nx ? { nx, price: cost(nx.cost) } : null; }
  function pcUpgrade(mix) {
    const n = pcNext(); if (!n) return { err: 'Déjà au max.' };
    if (!(mix ? payMix(n.price) : pay(n.price))) return { err: mix ? 'Pas assez de lingots.' : 'Pas assez de cash.' };
    st.pc = pcLvl() + 1; st.lastUp = 'pc'; addXp(30 + n.nx.cost / 100); emit('change'); return { ok: true };
  }
  function upgradeReady() {
    const p = pcNext(); if (p && st.cash >= p.price) return 'pc'; const nx = rigNext(), nr = D.ROOMS[st.room + 1]; return (nx && st.cash >= nx.price) ? 'rig' : (nr && st.cash >= cost(nr.cost)) ? 'room' : null; }
  function rigUpgrade(mix) {
    const nx = D.RIG[st.rig.lvl + 1]; if (!nx) return { err: 'Déjà au max.' };
    if (!(mix ? payMix(cost(nx.cost)) : pay(cost(nx.cost)))) return { err: mix ? 'Pas assez de lingots.' : 'Pas assez de cash.' };
    const i = rigInfo(); st.rig.pending = i.hot ? i.mined : i.mined; st.rig.lvl++; st.rig.start = now(); st.lastUp = 'rig';
    // on garde ce qui était déjà miné
    addXp(40 + nx.cost / 100); emit('change'); return { ok: true };
  }

  // ------------------------------------------------------------ paris sportifs
  // Foot : modèle de Poisson (buts attendus selon la force), cotes calculées à partir du même modèle.
  function poisson(k, l) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
  function footProbs(la, lb) {
    let h = 0, d = 0, a = 0;
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) { const p = poisson(i, la) * poisson(j, lb); if (i > j) h += p; else if (i === j) d += p; else a += p; }
    const t = h + d + a; return [h / t, d / t, a / t];
  }
  function samplePoisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
  function odd(p) { return Math.max(1.01, Math.floor(100 / (p * (1 + D.BOOK_MARGIN))) / 100); }
  function newMatch(kickoff) {
    const sports = Object.keys(D.SPORTS).filter(s => st.lvl >= D.SPORTS[s].lvl);
    const sport = pick(sports), busy = new Set(st.matches.filter(m => m.state !== 'done').flatMap(m => [m.home, m.away]));
    let teams = D.TEAMS[sport].filter(t => !busy.has(t[0])); if (teams.length < 2) teams = D.TEAMS[sport];
    let a = pick(teams), b = pick(teams); while (b === a) b = pick(teams);
    const m = { id: st.nextMatchId++, sport, home: a[0], away: b[0], kickoff, state: 'soon' };
    if (sport === 'foot') {
      const diff = (a[1] - b[1]) / 30;
      m.la = clamp(1.45 + diff * .8 + .15, .3, 3.5); m.lb = clamp(1.2 - diff * .8, .25, 3.2);
      m.p = footProbs(m.la, m.lb);
    } else {
      const k = sport === 'tennis' ? 22 : 16;   // tennis : un favori à ~85-90 %, pas 97 %
      const ph = 1 / (1 + Math.pow(10, -(a[1] - b[1] + (sport === 'basket' ? 3 : 0)) / k));
      m.p = [ph, 1 - ph];
    }
    m.odds = m.p.map(odd);
    return m;
  }
  function playMatch(m) {
    if (m.res != null) return;
    if (m.sport === 'foot') {
      m.sh = samplePoisson(m.la); m.sa = samplePoisson(m.lb);
      m.res = m.sh > m.sa ? 0 : m.sh === m.sa ? 1 : 2;
      // minutes des buts pour le direct
      m.goals = []; for (let i = 0; i < m.sh; i++) m.goals.push([Math.ceil(rnd(1, 90)), 0]); for (let i = 0; i < m.sa; i++) m.goals.push([Math.ceil(rnd(1, 90)), 1]);
      m.goals.sort((x, y) => x[0] - y[0]);
    } else if (m.sport === 'basket') {
      const winH = Math.random() < m.p[0], base = Math.round(rnd(88, 112)), gap = Math.max(1, Math.round(Math.abs(gauss()) * 9));
      m.sh = winH ? base + gap : base; m.sa = winH ? base : base + gap; m.res = winH ? 0 : 1;
    } else {
      const winH = Math.random() < m.p[0], loserSets = Math.random() < .45 ? 1 : 0;
      m.sh = winH ? 2 : loserSets; m.sa = winH ? loserSets : 2; m.res = winH ? 0 : 1;
    }
  }
  function simMatches(offline) {
    const t = now();
    // programme : toujours D.MATCH.upcoming matchs à venir
    let last = st.matches.reduce((mx, m) => Math.max(mx, m.kickoff), t);
    while (st.matches.filter(m => m.state === 'soon').length < D.MATCH.upcoming) {
      last = Math.max(last, t) + rnd(D.MATCH.gapMin, D.MATCH.gapMax) * 60000;
      st.matches.push(newMatch(last));
    }
    st.matches.forEach(m => {
      if (m.state === 'soon' && t >= m.kickoff) { m.state = 'live'; playMatch(m); }
      if (m.state === 'live' && t >= m.kickoff + D.MATCH.liveS * 1000) { m.state = 'done'; settle(m, offline); }
    });
    // on garde les 8 derniers terminés
    const done = st.matches.filter(m => m.state === 'done');
    if (done.length > 8) { const drop = new Set(done.slice(0, done.length - 8).map(m => m.id)); st.matches = st.matches.filter(m => !drop.has(m.id) || st.bets.some(b => b.state === 'open' && b.legs.some(l => l.m === m.id))); }
  }
  function match(id) { return st.matches.find(m => m.id === id); }
  // cote d'un pronostic au moment du pari (événement « Cotes boostées » : +15 %)
  function legOdd(m, pick) { return Math.round(m.odds[pick] * (evOn('boost') ? 1.15 : 1) * 100) / 100; }
  // free = utiliser un pari gratuit (gagné dans un booster) : la mise est offerte, on ne touche que le bénéfice
  function placeBet(legs, stake, free) {
    stake = Math.floor(stake);
    if (!legs.length) return { err: 'Choisis au moins un pronostic.' };
    if (legs.length > 1 && st.lvl < D.COMBI_LVL) return { err: `Combinés au niveau ${D.COMBI_LVL}.` };
    if (free) { if (!st.freebets.length) return { err: 'Plus de pari gratuit.' }; stake = st.freebets[0]; }
    if (stake < 1) return { err: 'Mise minimum : 1<i class="cur"></i>.' };
    if (!free && stake > betMax()) return { err: `Mise max : ${betMax()}<i class="cur"></i>.` };
    const ids = new Set();
    for (const l of legs) { const m = match(l.m); if (!m || m.state !== 'soon') return { err: 'Ce match a déjà commencé.' }; if (ids.has(l.m)) return { err: 'Un seul prono par match.' }; ids.add(l.m); }
    if (free) st.freebets.shift(); else if (!pay(stake)) return { err: 'Pas assez de cash.' };
    const odds = Math.round(legs.reduce((o, l) => o * legOdd(match(l.m), l.pick), 1) * 100) / 100;
    st.bets.unshift({ id: now(), legs: legs.map(l => { const m = match(l.m); return { m: l.m, pick: l.pick, odd: legOdd(m, l.pick), sport: m.sport, home: m.home, away: m.away }; }), stake, odds, state: 'open', free: !!free, boosted: evOn('boost') });
    if (st.bets.length > 30) st.bets.length = 30;
    stat('bets'); addXp(4 + Math.min(40, stake / 4));
    emit('change'); return { ok: true, odds };
  }
  function settle(m, offline) {
    // on garde le score final dans le ticket : il reste lisible quand le match est archivé
    st.bets.forEach(b => b.legs.forEach(l => { if (l.m === m.id) Object.assign(l, { sport: m.sport, home: m.home, away: m.away, sh: m.sh, sa: m.sa, res: m.res }); }));
    st.bets.forEach(b => {
      if (b.state !== 'open' || !b.legs.some(l => l.m === m.id)) return;
      const ms = b.legs.map(l => match(l.m));
      if (ms.some(x => !x || x.state !== 'done')) {
        // un pronostic déjà perdu fait tomber le combiné tout de suite
        if (ms.some((x, i) => x && x.state === 'done' && x.res !== b.legs[i].pick)) { b.state = 'lost'; emit('betResult', { b, offline }); }
        return;
      }
      const won = ms.every((x, i) => x.res === b.legs[i].pick);
      b.state = won ? 'won' : 'lost';
      if (won) {
        b.gain = Math.round(b.stake * (b.free ? b.odds - 1 : b.odds) * 100) / 100; addCash(b.gain); stat('betsWon');
        if (b.legs.length > 1) stat('combiWon');
        addXp(10 + Math.min(80, b.gain / 10));
      }
      emit('betResult', { b, offline });
    });
  }

  // ------------------------------------------------------------ grattage
  function scratchDraw(id) {
    const t = D.SCRATCH.find(x => x.id === id);
    if (!t || st.lvl < t.lvl) return { err: 'Ticket verrouillé.' };
    // tickets offerts (boosters) : valables sur le Cash Flash
    let free = false;
    if (t.id === 'flash' && st.freeTickets > 0) { st.freeTickets--; free = true; }
    else if (!pay(t.price)) return { err: 'Pas assez de cash.' };
    const ss = st.scratchStats = st.scratchStats || { n: 0, spent: 0, won: 0, best: 0 };
    ss.n++; if (!free) ss.spent += t.price;
    let r = Math.random(), prize = 0;
    for (const [amt, p] of t.prizes.slice().reverse()) { if (r < p) { prize = amt; break; } r -= p; }
    stat('scratch'); addXp(1 + t.price);
    return { t, prize, free, no: 100000 + Math.floor(Math.random() * 899999) };
  }
  function scratchPay(prize) {
    if (prize > 0) { addCash(prize); if (prize >= 100) addXp(20); const ss = st.scratchStats; if (ss) { ss.won += prize; ss.best = Math.max(ss.best, prize); } }
    emit('change');
  }
  function scratchRtp(t) { return t.prizes.reduce((s, [a, p]) => s + a * p, 0) / t.price; }

  // ------------------------------------------------------------ machine à sous
  function spin(bet) {
    if (st.lvl < D.SLOT.lvl) return { err: `Casino au niveau ${D.SLOT.lvl}.` };
    if (!pay(bet)) return { err: 'Pas assez de cash.' };
    const reels = [0, 1, 2].map(() => weighted(D.SLOT.symbols));
    let mult = 0;
    if (reels[0] === reels[1] && reels[1] === reels[2]) mult = reels[0].pay3;
    else if (reels[0].id === 'cherry' && reels[1].id === 'cherry') mult = reels[0].pay2;
    const win = Math.round(bet * mult * 100) / 100;
    if (win) addCash(win);
    stat('spins'); addXp(1 + Math.min(20, bet / 5));
    if (mult >= 100) stat('bigWin');
    tiltCheck(bet - win);
    emit('change'); return { reels, mult, win };
  }
  function slotRtp() {
    const S = D.SLOT.symbols, W = S.reduce((s, x) => s + x.w, 0);
    let r = S.reduce((s, x) => s + Math.pow(x.w / W, 3) * x.pay3, 0);
    const ch = S.find(x => x.id === 'cherry'); r += Math.pow(ch.w / W, 2) * (1 - ch.w / W) * ch.pay2;
    return r;
  }

  // ------------------------------------------------------------ roulette européenne
  function rouletteWins(bet, n) {
    const R = D.ROULETTE.reds, red = R.includes(n);
    switch (bet.type) {
      case 'num':   return n === bet.v ? 36 : 0;
      case 'red':   return n && red ? 2 : 0;
      case 'black': return n && !red ? 2 : 0;
      case 'even':  return n && n % 2 === 0 ? 2 : 0;
      case 'odd':   return n % 2 === 1 ? 2 : 0;
      case 'low':   return n >= 1 && n <= 18 ? 2 : 0;
      case 'high':  return n >= 19 ? 2 : 0;
      case 'doz':   return n && Math.ceil(n / 12) === bet.v ? 3 : 0;
    }
    return 0;
  }
  function roulette(bets) {
    if (st.lvl < D.ROULETTE.lvl) return { err: `Roulette au niveau ${D.ROULETTE.lvl}.` };
    const total = bets.reduce((s, b) => s + b.amt, 0);
    if (!total) return { err: 'Pose au moins un jeton.' };
    if (!pay(total)) return { err: 'Pas assez de cash.' };
    const n = Math.floor(Math.random() * 37);
    const win = bets.reduce((s, b) => s + b.amt * rouletteWins(b, n), 0);
    if (win) addCash(win);
    stat('roulette'); addXp(2 + Math.min(30, total / 5));
    tiltCheck(total - win);
    emit('change'); return { n, win, total };
  }

  // ------------------------------------------------------------ objets de collection
  const item = id => D.ITEMS.find(i => i.id === id);
  // nom d'un objet dans une phrase, pour qu'on sache toujours de quoi on parle : « la carte « Real Banlieue » »
  function what(it, cap) {
    const up = t => t.replace(/^./, ch => ch.toUpperCase()), q = t => t.includes('«') ? t : `« ${t} »`;
    let t;
    if (it.cat === 'card') t = (it.series === 'tennis' ? 'la carte du joueur ' : it.series === 'foot' || it.series === 'basket' ? 'la carte de l\'équipe ' : 'la carte ') + q(up(it.name.replace(/^Carte /, '')));
    else if (it.cat === 'sneaker') t = 'la paire de baskets ' + q(it.name.replace(/^Baskets /, ''));
    else t = q(it.name);
    return cap ? up(t) : t;
  }
  function catUnlocked(cat) { return st.lvl >= D.ITEM_CATS[cat].lvl; }
  function marketTick(stepMin) {
    const mk = st.market;
    D.ITEMS.forEach(i => {
      // la « vraie valeur » dérive lentement, le prix tourne autour (retour à la moyenne)
      const hv = i.vol / Math.sqrt(60) * Math.sqrt(stepMin);
      mk.fair[i.id] = clamp(mk.fair[i.id] * Math.exp(hv * .5 * gauss() + .00002 * stepMin), i.p0 * .25, i.p0 * 8);
      let p = mk.prices[i.id];
      p *= Math.exp(hv * gauss() + .08 * stepMin / 60 * Math.log(mk.fair[i.id] / p) * 6);
      mk.prices[i.id] = clamp(p, i.p0 * .15, i.p0 * 12);
    });
  }
  function simMarket(offline) {
    const mk = st.market;
    let mins = Math.floor((now() - mk.lastTick) / 60000);
    if (mins <= 0) return;
    mins = Math.min(mins, 720);
    for (let i = 0; i < mins; i++) marketTick(1);
    mk.lastTick = now();
    D.ITEMS.forEach(i => { const h = mk.hist[i.id]; h.push(mk.prices[i.id]); if (h.length > 120) h.splice(0, h.length - 120); });
    const pool = D.ITEMS.filter(i => i.cat !== 'trophy' && catUnlocked(i.cat));
    if (!mk.next && pool.length) mk.next = { item: pick(pool).id, ru: Math.floor(Math.random() * D.RUMORS.length), k: 0, told: false };
    if (mk.next && !mk.next.told && habitOn('smoke') && mk.nextRumor - now() <= 5 * 60000 && mk.nextRumor > now()) {
      mk.next.told = true; const it = item(mk.next.item), ru = D.RUMORS[mk.next.ru];
      const txt = `Pause clope : un pote te glisse que ${what(it)} va ${ru.up ? 'grimper' : 'chuter'} d'ici quelques minutes.`;
      mk.news.unshift({ t: now(), txt, up: ru.up, item: it.id, tip: true }); if (mk.news.length > 6) mk.news.length = 6;
      if (!offline) emit('news', { txt: '🚬 ' + txt, bad: false, item: it.id, up: ru.up, smoke: true });
    }
    if (now() >= mk.nextRumor) {
      mk.nextRumor = now() + rnd(...D.RUMOR_MIN) * 60000;
      const nx = mk.next; mk.next = null;
      if (pool.length) {
        const it = nx && item(nx.item) && catUnlocked(item(nx.item).cat) ? item(nx.item) : pick(pool), ru = nx ? D.RUMORS[nx.ru] : pick(D.RUMORS), k = rnd(...ru.k);
        mk.prices[it.id] = clamp(mk.prices[it.id] * k, it.p0 * .15, it.p0 * 12);
        const news = { t: now(), txt: ru.txt.replace('{n}', what(it)), up: ru.up, item: it.id };
        mk.news.unshift(news); if (mk.news.length > 6) mk.news.length = 6;
        if (!offline) emit('news', { txt: news.txt, bad: !ru.up, item: it.id });
      }
    }
    emit('prices');
  }
  function buyPrice(id) { return Math.ceil(st.market.prices[id] * (1 + D.BUY_MARKUP) * priceMult() * (evOn('sale') ? .85 : 1)); }
  function sellPrice(id) { return Math.floor(st.market.prices[id] * (1 - D.SELL_FEE)); }
  // les cartes vont dans le classeur : elles ne prennent pas de place sur les étagères
  const onShelf = id => item(id).cat !== 'card' || !item(id).noBuy;
  function ownedCount() { return Object.entries(st.owned).reduce((s, [id, a]) => s + (onShelf(id) ? a.length : 0), 0); }
  function roomSlots() { return D.ROOMS[st.room].slots; }
  function buyItem(id) {
    // les cartes des boosters s'achètent aussi d'occasion au Comptoir ; elles vont dans le classeur, pas sur les étagères
    const it = item(id); if (!it || it.cat === 'trophy' || !catUnlocked(it.cat)) return { err: 'Indisponible.' };
    if (st.owned[id] && st.owned[id].length) return { err: 'Tu l\'as déjà : un seul exemplaire par objet.' };
    if (onShelf(id) && ownedCount() >= roomSlots()) return { err: 'Plus de place chez toi : déménage via ton téléphone.' };
    const p = buyPrice(id); if (!pay(p)) return { err: 'Pas assez de cash.' };
    (st.owned[id] = st.owned[id] || []).push({ paid: p, t: now() });
    if (it.series) st.lastUp = 'card';
    stat('itemBuy'); stat('itemsOwned', ownedCount(), true); addXp(5 + Math.min(60, p / 40));
    emit('change'); return { p };
  }
  function sellItem(id) {
    const a = st.owned[id]; if (!a || !a.length) return { err: 'Tu n\'en as pas.' };
    const e = a.shift(); if (!a.length) delete st.owned[id];
    const p = sellPrice(id); addCash(p);
    const profit = p - e.paid; if (profit > 0 && e.paid > 0) stat('itemProfit');
    addXp(3 + Math.min(50, p / 50));
    emit('change'); return { p, profit, paid: e.paid };
  }
  function giveTrophy(id) {
    if (st.owned[id] && st.owned[id].length) return false;
    (st.owned[id] = st.owned[id] || []).push({ paid: 0, t: now() });
    emit('trophy', item(id)); emit('change'); return true;
  }
  function itemsValue() { return Object.entries(st.owned).reduce((s, [id, a]) => s + a.length * sellPrice(id), 0); }
  function roomUpgrade(mix) {
    const nx = D.ROOMS[st.room + 1]; if (!nx) return { err: 'Déjà le plus bel appart.' };
    if (!(mix ? payMix(cost(nx.cost)) : pay(cost(nx.cost)))) return { err: mix ? 'Pas assez de lingots.' : 'Pas assez de cash.' };
    st.room++; st.lastUp = 'room'; addXp(100 + nx.cost / 100); emit('change'); return { ok: true };
  }

  // ------------------------------------------------------------ habitudes
  const habit = id => D.HABITS.find(h => h.id === id);
  function habitState(id) { const h = st.habits[id]; if (!h) return 'off'; if (h.quitUntil) return now() < h.quitUntil ? 'quitting' : 'off'; return 'on'; }
  function habitOn(id) { return habitState(id) === 'on'; }
  function habitMalus(id) { const s = habitState(id); return s === 'on' || s === 'quitting'; }
  // plus de jauge de santé (trop compliqué) : les habitudes coûtent de l'argent chaque jour et ont chacune leur malus
  function health() { return 100; }
  function priceMult() { return 1; }
  function cost(n) { return Math.ceil(n * priceMult()); }
  function betMax() { const d = habit('drink'); return Math.round(D.BET_MAX(st.lvl) * (habitOn('drink') ? 1 + d.betBoost : 1)); }
  function startHabit(id) {
    const h = habit(id); if (!h || st.lvl < h.lvl) return { err: 'Pas encore.' };
    if (habitState(id) === 'quitting') return { err: 'Tu es en plein sevrage. Tiens bon !' };
    if (habitOn(id)) return { err: 'C\'est déjà ton habitude.' };
    st.habits[id] = { since: now() }; stat('habits'); emit('change'); return { ok: true };
  }
  function quitHabit(id) {
    if (!habitOn(id)) return { err: 'Tu n\'as pas cette habitude.' };
    st.habits[id].quitUntil = now() + D.QUIT_H * 3600000; emit('change'); return { ok: true };
  }
  function simHabits() {
    // les frais quotidiens tombent au fil de l'eau
    const dtDay = (now() - st.habitCharge) / 86400000; if (dtDay < 1 / 1440) return;
    st.habitCharge = now();
    const perDay = D.HABITS.reduce((a, h) => a + (habitMalus(h.id) ? h.perDay : 0), 0);
    if (perDay) st.cash = Math.max(0, Math.round((st.cash - perDay * dtDay) * 100) / 100);
    D.HABITS.forEach(h => { const x = st.habits[h.id]; if (x && x.quitUntil && now() >= x.quitUntil) { delete st.habits[h.id]; emit('quit', h); } });
  }
  function tiltCheck(lost) {
    if (!habitOn('drink') || lost <= 0) return;
    const before = st.cash + lost;
    if ((lost >= D.TILT.loss || lost >= before * D.TILT.share) && Math.random() < D.TILT.chance) { st.tiltUntil = now() + D.TILT.min * 60000; emit('tilt'); }
  }
  function tilted() { return now() < st.tiltUntil; }

  // ------------------------------------------------------------ le Club
  const clubEntry = () => cost(D.CLUB.entry(st.lvl));
  const clubWait = () => Math.max(0, (st.clubNext || 0) - now());
  function clubNight(vipPass) {
    if (st.lvl < D.CLUB.lvl) return { err: `Le Club ouvre au niveau ${D.CLUB.lvl}.` };
    // le videur se laisse convaincre avec quelques lingots
    if (clubWait() && vipPass) { if (st.lingots < D.LINGOT.club) return { err: 'Pas assez de lingots.' }; if (st.cash < clubEntry()) return { err: 'Pas assez de cash pour l\'entrée.' }; addLingots(-D.LINGOT.club); st.clubNext = 0; }
    if (clubWait()) return { err: 'Le videur t\'a vu tout à l\'heure. Reviens plus tard.' };
    const e = clubEntry(); if (!pay(e)) return { err: 'Pas assez de cash pour l\'entrée.' };
    st.clubNext = now() + D.CLUB.cooldownMin * 60000;
    const xp = D.CLUB.xp(st.lvl); addXp(xp); stat('clubNights');
    let meet = false, vip = 0;
    if (Math.random() < D.CLUB.meet && !st.deal) { st.nextDealAt = 0; simDeal(false); meet = !!st.deal; }
    if (Math.random() < D.CLUB.vip) { vip = 3; addLingots(vip); }
    emit('change'); return { e, xp, meet, vip };
  }

  // ------------------------------------------------------------ kiosque
  // le journal sort toutes les 30 min ; kShift avance l'horloge du joueur quand il paie un journal tout de suite
  const ED_MS = () => D.KIOSK.editionMin * 60000;
  function edition() { return Math.floor((now() + (st.kShift || 0)) / ED_MS()); }
  function editionLeft() { return (edition() + 1) * ED_MS() - (now() + (st.kShift || 0)); }
  function kioskRefresh() {
    if (st.lingots < D.LINGOT.kiosk) return { err: 'Pas assez de lingots.' };
    addLingots(-D.LINGOT.kiosk); st.kShift = (st.kShift || 0) + editionLeft() + 1000; emit('change'); return { ok: true };
  }
  const tipLingots = t => Math.max(1, Math.ceil(tipPrice(t) / D.LINGOT.rate));
  // compléter un achat avec des lingots : combien il en faut pour ce qui manque
  const lingotsFor = price => Math.max(0, Math.ceil((price - st.cash) / D.LINGOT.rate));
  function payMix(price) {
    const n = lingotsFor(price); if (n > st.lingots) return false;
    if (n) { addLingots(-n); st.cash = 0; emit('money'); return true; }
    return pay(price);
  }
  function tipPrice(t) { return cost(Math.round(t.base * (1 + st.lvl * .6))); }
  function tipBought(id) { const k = st.kiosk || {}; return k.ed === edition() && k.tips && k.tips[id]; }
  function buyTip(id, withLingots) {
    const t = D.KIOSK.tips.find(x => x.id === id); if (!t || st.lvl < (t.lvl || 1)) return { err: 'Pas encore.' };
    if (tipBought(id)) return { err: 'Déjà lu dans cette édition.' };
    let txt = null;
    let ref = null;
    if (id === 'sport') {
      // un match qui commence dans au moins 2 min (le temps d'aller au Balto), sinon le plus lointain
      const soon = st.matches.filter(x => x.state === 'soon').sort((a, b) => a.kickoff - b.kickoff);
      const m = soon.find(x => x.kickoff - now() > 120000) || soon[soon.length - 1];
      if (!m) return { err: 'Aucun match à venir.' };
      playMatch(m);   // le résultat est tiré maintenant : le tuyau parle du vrai résultat
      ref = m.id;
      const honest = Math.random() < D.KIOSK.sportReliability;
      const winner = m.res === 0 ? m.home : m.res === 2 ? m.away : (m.sport === 'foot' ? null : m.res === 1 ? m.away : m.home);
      const loser = m.res === 0 ? m.away : m.res === 2 ? m.home : (m.res === 1 ? m.home : m.away);
      const team = honest ? (winner || pick([m.home, m.away])) : loser;
      txt = winner || !honest ? `Selon nos infos, ${team} ne perdra pas contre ${team === m.home ? m.away : m.home}.` : `Selon nos infos, ${m.home} – ${m.away} sera très serré. Les deux équipes ne se font pas de cadeau.`;
    } else if (id === 'crypto') {
      const cr = st.crypto; if (!cr.nextMood) cr.nextMood = weighted(D.MOODS).id;
      const nm = D.MOODS.find(x => x.id === cr.nextMood);
      txt = `Dans environ ${Math.max(1, Math.round((cr.moodUntil - now()) / 60000))} min, la météo du marché passe à « ${nm.name} » : ${nm.desc}`;
    } else {
      const mk = st.market, pool = D.ITEMS.filter(i => i.cat !== 'trophy' && catUnlocked(i.cat));
      if (!mk.next && pool.length) mk.next = { item: pick(pool).id, ru: Math.floor(Math.random() * D.RUMORS.length), k: 0, told: false };
      if (!mk.next) return { err: 'Rien à raconter.' };
      const it = item(mk.next.item), ru = D.RUMORS[mk.next.ru];
      txt = `Ça va bouger sur ${what(it)} : sa cote devrait ${ru.up ? 'grimper' : 'chuter'} d'ici ${Math.max(1, Math.round((mk.nextRumor - now()) / 60000))} min.`;
    }
    if (withLingots) { if (st.lingots < tipLingots(t)) return { err: 'Pas assez de lingots.' }; addLingots(-tipLingots(t)); }
    else if (!pay(tipPrice(t))) return { err: 'Pas assez de cash.' };
    if (!st.kiosk || st.kiosk.ed !== edition()) st.kiosk = { ed: edition(), tips: {} };
    st.kiosk.tips[id] = { txt, t: now(), m: ref };
    stat('tips'); addXp(4 + st.lvl); emit('change'); return { txt };
  }
  // ------------------------------------------------------------ boosters de cartes (comme Mama Kana)
  const dayNum = t => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 86400000);
  const today = () => dayNum(now());
  const boosterFree = () => st.boosterDay !== today();
  const boosterCount = () => (st.boosters || 0) + (boosterFree() ? 1 : 0);
  function buyBooster() {
    if (st.lingots < D.BOOSTER.cost) return { err: 'Pas assez de lingots.' };
    addLingots(-D.BOOSTER.cost); st.boosters++; emit('change'); return { ok: true };
  }
  function boosterPrice() { const B = D.KIOSK.booster; return cost(B.base + B.perLvl * st.lvl); }
  function buyBoosterCash() {
    const B = D.KIOSK.booster; if (st.lvl < B.lvl) return { err: `Boosters au Kiosque au niveau ${B.lvl}.` };
    if (!pay(boosterPrice())) return { err: 'Pas assez de cash.' };
    st.boosters++; emit('change'); return { ok: true };
  }
  const pickW = (obj) => { const k = Object.keys(obj); let r = Math.random() * k.reduce((a, x) => a + obj[x], 0); for (const x of k) { r -= obj[x]; if (r <= 0) return x; } return k[0]; };
  function airdrop(value) { const q = value / st.crypto.prices.btk; if (!st.crypto.hold.btk) st.crypto.since.btk = now(); st.crypto.hold.btk += q; return q; }
  // carte récompense : appliquée tout de suite
  function rewardCard() {
    const rar = pickW(D.BOOSTER.weights), L = st.lvl, R = n => Math.round(n);
    const opts = {
      C: [
        () => { const n = R((20 + L * 8) * (1 + Math.random())); addCash(n); return { kind: 'cash', n, name: 'Billets' }; },
        () => { st.freeTickets += 2; return { kind: 'ticket', n: 2, name: 'Tickets offerts' }; },
        () => { const n = 20 + L * 8; addXp(n); return { kind: 'xp', n, name: 'Expérience' }; }
      ],
      R: [
        () => { addLingots(3); return { kind: 'lingots', n: 3, name: 'Lingots' }; },
        () => { const n = R(10 + L * 3); st.freebets.push(n); return { kind: 'freebet', n, name: 'Pari gratuit' }; },
        () => { const n = 40 + L * 20; addXp(n); return { kind: 'xp', n, name: 'Expérience' }; }
      ],
      E: [
        () => { addLingots(8); return { kind: 'lingots', n: 8, name: 'Lingots' }; },
        () => { const n = R(80 + L * 40); airdrop(n); return { kind: 'airdrop', n, name: 'Airdrop d\'Axion' }; },
        () => { const n = R(50 + L * 10); st.freebets.push(n); return { kind: 'freebet', n, name: 'Pari gratuit' }; }
      ],
      L: [
        () => { addLingots(20); return { kind: 'lingots', n: 20, name: 'Lingots' }; },
        () => { const n = R(400 + L * 120); airdrop(n); return { kind: 'airdrop', n, name: 'Airdrop d\'Axion' }; }
      ]
    };
    return Object.assign({ rarity: rar }, pick(opts[rar])());
  }
  // carte de collection : une vraie carte avec une cote, rangée dans le classeur
  function collectionCard() {
    const rar = pickW(D.BOOSTER.colWeights), all = D.ITEMS.filter(i => i.series && i.p0 <= D.BOOSTER.maxCard);
    const pool = all.filter(c => c.r === rar), c = pick(pool.length ? pool : all);
    // un seul exemplaire par objet : un doublon est revendu tout de suite au prix du Comptoir
    const dup = !!(st.owned[c.id] && st.owned[c.id].length);
    if (dup) { const n = sellPrice(c.id); addCash(n); return { kind: 'col', rarity: c.r, id: c.id, name: c.name, dup, sold: n }; }
    st.owned[c.id] = [{ paid: 0, t: now(), booster: true }];
    return { kind: 'col', rarity: c.r, id: c.id, name: c.name, dup };
  }
  function openBooster() {
    if (boosterFree()) st.boosterDay = today();
    else if (st.boosters > 0) st.boosters--;
    else return { err: 'Plus de booster : reviens demain ou achètes-en un.' };
    const cards = [rewardCard(), rewardCard(), rewardCard(), collectionCard()];
    stat('boosters'); addXp(8 + st.lvl * 2); emit('change'); return { cards };
  }
  const seriesCards = id => D.ITEMS.filter(i => i.series === id);
  const seriesHave = id => seriesCards(id).filter(c => st.owned[c.id] && st.owned[c.id].length).length;
  const seriesDone = id => seriesHave(id) === seriesCards(id).length;
  function claimSeries(id) {
    const se = D.SERIES.find(x => x.id === id);
    if (!se || !seriesDone(id) || st.colClaimed[id]) return { err: 'Série incomplète.' };
    st.colClaimed[id] = now(); addCash(se.reward.cash); addLingots(se.reward.lingots); stat('series'); addXp(100);
    emit('change'); return { se };
  }

  // ------------------------------------------------------------ défis du jour
  function chal() {
    if (st.chal && st.chal.day === today()) return st.chal;
    const pool = D.CHALLENGES.filter(c => !c.lvl || st.lvl >= c.lvl), list = [];
    while (list.length < 3 && pool.length) list.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const f = Math.min(1, (st.lvl - 1) / 14);
    st.chal = { day: today(), bonus: false, list: list.map(c => ({ k: c.k, t: c.t, goal: Math.round(c.g[0] + (c.g[1] - c.g[0]) * f), base: st.stats[c.k] || 0, got: false })) };
    return st.chal;
  }
  const chalValue = c => Math.max(0, (st.stats[c.k] || 0) - c.base);
  const chalReady = () => chal().list.filter(c => !c.got && chalValue(c) >= c.goal).length;
  const chalCash = () => D.CHAL_CASH(st.lvl);
  function claimChal(i) {
    const ch = chal(), c = ch.list[i];
    if (!c || c.got || chalValue(c) < c.goal) return { err: 'Pas encore.' };
    c.got = true; addCash(chalCash()); addXp(15);
    let bonus = false;
    if (!ch.bonus && ch.list.every(x => x.got)) { ch.bonus = true; bonus = true; st.boosters++; addLingots(3); }
    emit('change'); return { cash: chalCash(), bonus };
  }

  // ------------------------------------------------------------ mini-événements
  function evOn(id) { return !!(st.event && st.event.id === id && now() < st.event.end); }
  const eventNow = () => (st.event && now() < st.event.end ? D.EVENTS.list.find(e => e.id === st.event.id) : null);
  const eventLeft = () => (st.event ? Math.max(0, st.event.end - now()) : 0);
  function simEvent(offline) {
    const E = D.EVENTS;
    if (st.event && now() >= st.event.end) { st.event = null; emit('eventEnd'); }
    if (st.event || st.lvl < E.lvl || !st.tutoDone || offline) return;
    if (now() < st.nextEventAt) return;
    const ev = pick(E.list);
    st.event = { id: ev.id, end: now() + E.time * 1000 };
    st.nextEventAt = now() + rnd(...E.every) * 1000;
    emit('event', ev);
  }
  function simRigBoost() {
    const t = now(), dt = t - (st.rigBoostT || t); st.rigBoostT = t;
    if (!evOn('rig') || dt <= 0 || dt > 60000) return;
    const i = rigInfo(); if (!i.hot) st.rig.pending += i.r.btkH * dt / 3600000;
  }

  // ------------------------------------------------------------ bons plans
  // un pote t'envoie un tuyau sur un match (fiable environ 6 fois sur 10, comme les vrais « pronos de potes »)
  function simFriendTip(offline) {
    if (offline || !st.tutoDone) return;
    if (!st.nextTipAt) st.nextTipAt = now() + rnd(4, 8) * 60000;
    if (now() < st.nextTipAt) return;
    st.nextTipAt = now() + rnd(8, 15) * 60000;
    const m = st.matches.filter(x => x.state === 'soon' && x.kickoff - now() > 120000).sort((a, b) => a.kickoff - b.kickoff)[0];
    if (!m) return;
    playMatch(m);
    const honest = Math.random() < .6, n = m.odds.length;
    const real = m.res, pickIdx = honest ? real : pick([...Array(n).keys()].filter(i => i !== real));
    const ct = pick(D.DEALS.contacts.filter(c => !c.img.includes(st.skin + '-')));
    emit('friendTip', { name: ct.name, img: ct.img, m: m.id, pick: pickIdx });
  }
  function simDeal(offline) {
    const S = D.DEALS;
    if (st.deal && now() > st.deal.end) { st.deal = null; st.nextDealAt = now() + rnd(...S.every) * 500; emit('dealGone'); }
    if (st.deal || st.lvl < S.lvl || !st.tutoDone || offline || now() < st.nextDealAt) return;
    const contacts = S.contacts.filter(c => !c.img.includes(st.skin + '-'));
    const ct = pick(contacts);
    const mine = Object.keys(st.owned).filter(id => st.owned[id].length && item(id).cat !== 'trophy');
    const buyable = D.ITEMS.filter(i => !i.noBuy && i.cat !== 'trophy' && catUnlocked(i.cat) && !(st.owned[i.id] && st.owned[i.id].length) && st.market.prices[i.id] <= Math.max(150, worth() * .6));
    let deal = null;
    if (mine.length && (Math.random() < .5 || !buyable.length)) {
      const id = pick(mine), k = rnd(1.15, 1.35);
      deal = { type: 'buy', id, price: Math.round(st.market.prices[id] * k), k };
    } else if (buyable.length) {
      const it = pick(buyable), k = rnd(.68, .82);
      deal = { type: 'sell', id: it.id, price: Math.round(st.market.prices[it.id] * k), k };
    }
    st.nextDealAt = now() + rnd(...S.every) * 1000;
    if (!deal) return;
    Object.assign(deal, { name: ct.name, img: ct.img, line: pick(ct.lines[deal.type]), end: now() + S.time * 1000 });
    st.deal = deal; emit('deal', deal);
  }
  function acceptDeal() {
    const d = st.deal; if (!d || now() > d.end) return { err: 'L\'offre a expiré.' };
    if (d.type === 'sell') {
      if (st.owned[d.id] && st.owned[d.id].length) return { err: 'Tu l\'as déjà : un seul exemplaire par objet.' };
      if (ownedCount() >= roomSlots()) return { err: 'Plus de place chez toi : revends ou déménage.' };
      if (!pay(d.price)) return { err: 'Pas assez de cash.' };
      (st.owned[d.id] = st.owned[d.id] || []).push({ paid: d.price, t: now() });
      stat('itemsOwned', ownedCount(), true);
    } else {
      const a = st.owned[d.id]; if (!a || !a.length) return { err: 'Tu ne l\'as plus.' };
      const e = a.shift(); if (!a.length) delete st.owned[d.id];
      addCash(d.price); if (d.price > e.paid) stat('itemProfit');
    }
    st.deal = null; stat('deals'); addXp(25 + st.lvl * 3); emit('change'); return { d };
  }
  function refuseDeal() { st.deal = null; st.nextDealAt = now() + rnd(...D.DEALS.every) * 500; emit('change'); }

  // ------------------------------------------------------------ patrimoine, missions, cadeau, filet
  function worth() { return st.cash + cryptoValue() + itemsValue(); }
  function score() { return Math.round(worth() + st.lvl * 500); }
  function questState(q) { const v = st.stats[q.stat] || 0; return { v: Math.min(v, q.n), done: v >= q.n, claimed: !!st.quests[q.id], open: st.lvl >= (q.lvl || 1) }; }
  function claimQuest(id) {
    const q = D.QUESTS.find(x => x.id === id), s = questState(q);
    if (!s.open || !s.done || s.claimed) return { err: 'Pas encore.' };
    st.quests[id] = now();
    if (q.cash) addCash(q.cash); if (q.lingots) addLingots(q.lingots); addXp(q.xp);
    let trophy = null; if (q.trophy && giveTrophy(q.trophy)) trophy = item(q.trophy);
    emit('change'); return { q, trophy };
  }
  function questsReady() { return D.QUESTS.filter(q => { const s = questState(q); return s.open && s.done && !s.claimed; }).length; }
  // mission mise en avant : la première à réclamer, sinon la première pas encore faite
  function questFocus() {
    const open = D.QUESTS.filter(q => { const s = questState(q); return s.open && !s.claimed; });
    return open.find(q => questState(q).done) || open[0] || null;
  }
  const questsClaimed = () => D.QUESTS.filter(q => st.quests[q.id]).length;
  // cadeau du jour : série de 7 jours, on repart au jour 1 si on saute un jour
  function dailyReady() { return st.daily.claimedDay !== today(); }
  function dailyDay() {
    const dl = st.daily, N = D.DAILY.days.length;
    if (!dailyReady()) return ((dl.streak - 1) % N) + 1;
    return dl.claimedDay === today() - 1 ? (dl.streak % N) + 1 : 1;
  }
  function dailyReward(day) { const r = D.DAILY.days[day - 1]; return { cash: Math.round(D.DAILY.base(st.lvl) * r.c), lingots: r.l, boosters: r.b || 0, big: !!r.big }; }
  function claimDaily() {
    if (!dailyReady()) return { err: 'Reviens demain.' };
    const day = dailyDay(), r = dailyReward(day);
    st.daily.claimedDay = today(); st.daily.streak = day;
    addCash(r.cash); addLingots(r.lingots); st.boosters += r.boosters;
    emit('change'); return { r, day };
  }
  function dailyState() { return { can: dailyReady(), idx: dailyDay() - 1 }; }
  function checkBailout() {
    if (worth() >= D.BAILOUT.under || now() - st.bailoutAt < D.BAILOUT.cooldownMin * 60000) return;
    if (st.bets.some(b => b.state === 'open')) return;
    st.bailoutAt = now(); addCash(D.BAILOUT.amount); emit('bailout', pick(D.BAILOUT.lines));
  }

  // ------------------------------------------------------------ boucle
  function simulate(offline) {
    simCrypto(0, offline);
    simMatches(offline);
    simMarket(offline);
    simHabits();
    simRigBoost();
    simEvent(offline);
    simDeal(offline);
    simFriendTip(offline);
    stat('worth', Math.floor(worth()), true);
    if (!offline) checkBailout();
  }
  function catchUp(away) {
    const before = { cash: st.cash, worth: worth() };
    const wonBefore = st.bets.filter(b => b.state === 'won').length;
    simulate(true);
    const bets = st.bets.filter(b => b.state === 'won').length - wonBefore;
    return away > 120 ? { away, cashDiff: st.cash - before.cash, worthDiff: worth() - before.worth, bets } : null;
  }

  window.GAME = {
    get st() { return st; }, on, emit, load, save, reset, simulate,
    addCash, addLingots, addXp, pay, canPay, xpNeed, stat,
    coin, mood, coinUnlocked, buyCrypto, sellCrypto, holdValue, cryptoValue,
    rigInfo, rigCollect, rigUpgrade, rigNext, coinRisk,
    match, placeBet, odd,
    scratchDraw, scratchPay, scratchRtp, spin, slotRtp, roulette, rouletteWins,
    item, what, upgradeReady, fee, pcLvl, pcNext, pcUpgrade, catUnlocked, buyPrice, sellPrice, buyItem, sellItem, ownedCount, roomSlots, itemsValue, roomUpgrade,
    habit, habitState, habitOn, habitMalus, health, priceMult, cost, betMax, startHabit, quitHabit, tilted,
    edition, editionLeft, kioskRefresh, tipLingots, lingotsFor, tipPrice, tipBought, buyTip, openBooster, clubEntry, clubWait, clubNight,
    boosterFree, boosterCount, buyBooster, buyBoosterCash, boosterPrice, seriesCards, seriesHave, seriesDone, claimSeries,
    chal, chalValue, chalReady, chalCash, claimChal, evOn, eventNow, eventLeft, acceptDeal, refuseDeal, legOdd,
    worth, score, questState, claimQuest, questsReady, questFocus, questsClaimed, dailyState, dailyReady, dailyDay, dailyReward, claimDaily,
    util: { rnd, pick, clamp, now }
  };
})();
