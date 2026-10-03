/* Hustle City : l'agence « PrivéFans » (app du téléphone + ring light dans l'appart)
   Tu recrutes des créatrices, tu organises leurs activités, tu touches ta part de leurs abonnements.
   Tout se calcule au temps réel (ça continue quand on n'est pas là). Réglages : AGENCE dans data.js. */
(function () {
  'use strict';
  const D = window.DATA, G = window.GAME, U = window.UI, A = D.AGENCE;
  const st = () => G.st, now = () => Date.now(), rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  // personnage féminin : pas d'agence, c'est TA page (id « me »), la plateforme garde 20 %
  const solo = () => ((D.SKINS.find(k => k.id === st().skin) || D.SKINS[0]).g === 'f');
  const NICHES = [...new Set(A.crew.map(c => c.niche))];
  const prof = id => id === 'me' ? { id: 'me', name: st().name || 'Toi', niche: (st().agence || {}).meNiche || 'Lifestyle', cha: 3, reg: 3, drama: 2, me: true } : A.crew.find(c => c.id === id);
  const fmtSubs = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + ' k' : String(Math.round(n));
  const actIc = o => U.has('act-' + o.id) ? `<img class="act-ic" src="${U.src('act-' + o.id)}" alt="">` : o.icon;
  const face = (c, cls = '') => c.me ? `<span class="cr-face ${cls}">${U.pic(st().skin ? `skin-${st().skin}-bust` : 'guide', '🙂')}</span>` : U.has('cr-' + c.id) ? `<span class="pic cr-face ${cls}"><img src="${U.src('cr-' + c.id)}" alt=""></span>` : `<span class="cr-face emo ${cls}">${c.name[0]}</span>`;

  function ag() {
    const s = st();
    if (!s.agence) s.agence = { slots: 0, crew: [], cand: [], candAt: 0, nextEv: now() + rnd(...A.eventEvery) * 60000, offer: null };
    return s.agence;
  }
  const unlocked = () => st().lvl >= A.lvl;
  const slotsN = () => A.slots[ag().slots].n;
  const share = m => m.pct;
  const moodK = m => .5 + m.mood / 100 * .6;   // moral 0 → ×0,5 ; 100 → ×1,1
  // objets achetés pour elle : effet ×2 s'il colle à sa niche
  const hasG = (m, g) => g.sub ? !!(m.abo && m.abo[g.id]) : !!(m.gear && m.gear[g.id]);
  const gearK = (m, key) => A.gear.reduce((t, g) => t + (hasG(m, g) && g[key] ? g[key] * (g.niche && g.niche.includes(prof(m.id).niche) ? 2 : 1) : 0), 0);
  const perHour = m => m.subs * A.subPrice * moodK(m) * (.8 + prof(m.id).reg * .05) * share(m) * (1 + gearK(m, 'rev')) * (m.priceK || 1);
  const recruitCost = c => Math.round(100 * Math.pow(c.cha, 1.5) + c.subs * .05);   // remboursée en ~1 journée de jeu

  // ------------------------------------------------------------ simulation (au temps réel)
  function sim() {
    if (!st() || !unlocked()) return;
    const a = ag(), t = now();
    a.crew.forEach(m => {
      const h = Math.min(48, (t - (m.last || t)) / 3600000); m.last = t; if (h <= 0) return;
      const p = prof(m.id);
      m.pend = Math.min((m.pend || 0) + perHour(m) * h, perHour(m) * A.payCapH);
      m.subs *= 1 + .004 * p.cha / 3 * moodK(m) * (1 + gearK(m, 'subs')) * h;
      m.mood = Math.max(0, Math.min(100, m.mood - (share(m) - .2) * 20 * h + gearK(m, 'mood') * h));
      if (m.act && t >= m.act.start + m.act.dur) finishAct(m);
      if (m.mood < 15 && !a.offer && m.id !== 'me') rivalOffer(m, true);
    });
    // spa acheté avant qu'il devienne un abonnement : on le transforme en abonnement déjà payé pour 24 h
    a.crew.forEach(m => { if (m.gear && m.gear.spa) { (m.abo = m.abo || {}).spa = m.abo.spa || t + 86400000; delete m.gear.spa; } });
    // abonnements : prélevés toutes les 24 h ; pas assez de cash = abonnement arrêté
    a.crew.forEach(m => Object.keys(m.abo || {}).forEach(id => { const g = A.gear.find(x => x.id === id); let n = 0;
      while (m.abo[id] && t >= m.abo[id] && n++ < 7) { if (G.st.cash >= g.cost) { G.addCash(-g.cost); m.abo[id] += 86400000; } else { delete m.abo[id]; U.notify('agence', `${g.icon} ${g.name} arrêté`, `Pas assez de cash pour payer l'abonnement de ${prof(m.id).name}.`); } } }));
    if (a.crew.length && t >= a.nextEv) { a.nextEv = t + rnd(...A.eventEvery) * 60000; randomEvent(); }
    if (!a.nextDil) a.nextDil = t + rnd(10, 25) * 60000;
    if (a.crew.length && t >= a.nextDil && !(a.dil && t < a.dil.until)) { a.nextDil = t + rnd(...A.dilEvery) * 60000; dilemma(); }
  }
  // ce que rapporte une activité, affiché sous son bouton (abonnés, pourboires, moral)
  function actGain(m, x) {
    const p = prof(m.id), subs = m.subs * x.subs * (p.cha / 3) * (1 + gearK(m, 'subs'));
    const tips = x.cash ? Math.round(m.subs * x.cash * A.subPrice * 10 * share(m)) : 0, L = [];
    if (subs >= 1) L.push(`<span class="g-up">+${fmtSubs(subs)} abonnés</span>`); if (x.duo) L.push('<span class="g-up">pour les deux</span>');
    if (tips) L.push(`<span class="g-up">+${U.short(tips)} pourboires</span>`);
    if (x.mood) L.push(`<span class="${x.mood > 0 ? 'g-up' : 'g-down'}">moral ${x.mood > 0 ? '+' : '−'}${Math.abs(x.mood)}</span>`);
    return `<em class="ag-gain">${L.join('')}</em>`;
  }
  function finishAct(m) {
    const x = A.acts.find(o => o.id === m.act.k), p = prof(m.id), duo = m.act.with && ag().crew.find(o => o.id === m.act.with);
    const gain = m.subs * x.subs * (p.cha / 3) * (1 + gearK(m, 'subs'));
    m.subs += gain; m.mood = Math.max(0, Math.min(100, m.mood + x.mood));
    let tips = 0; if (x.cash) { tips = Math.round(m.subs * x.cash * A.subPrice * 10 * share(m)); m.pend = (m.pend || 0) + tips; }
    if (duo) { duo.subs += duo.subs * x.subs * (prof(duo.id).cha / 3); duo.mood = Math.min(100, duo.mood + x.mood); duo.act = null; }
    m.act = null; G.stat('agActs');
    U.notify('agence', p.me ? `${x.icon} Tu as fini : ${x.name}` : `${x.icon} ${p.name} a fini : ${x.name}`, `${gain >= 1 ? `+${fmtSubs(gain)} abonnés` : 'Elle a bien récupéré'}${tips ? ` et +${U.short(tips)} de pourboires pour toi` : ''}.`);
  }
  function randomEvent() {
    const a = ag(), m = pick(a.crew), p = prof(m.id), r = Math.random(), d = p.drama / 5;
    if (r < .35) { const k = rnd(.15, .35); m.subs *= 1 + k; U.notify('agence', p.me ? '🔥 Tu fais le buzz !' : `🔥 ${p.name} fait le buzz !`, `${p.me ? 'Une de tes vidéos' : 'Une de ses vidéos'} explose : +${Math.round(k * 100)} % d'abonnés.`); }
    else if (r < .35 + .3 * d) { const k = rnd(.08, .18); m.subs *= 1 - k; m.mood = Math.max(0, m.mood - 10); U.notify('agence', p.me ? '😬 Bad buzz pour toi' : `😬 Bad buzz pour ${p.name}`, `Une polémique sur les réseaux : −${Math.round(k * 100)} % d'abonnés. Un peu de repos lui ferait du bien.`); }
    else if (r < .35 + .3 * d + .2 * d && !a.offer && m.id !== 'me') rivalOffer(m, false);
  }
  // ------------------------------------------------------------ dilemmes : une créatrice t'écrit, tu choisis, ça a des conséquences
  const clamp = v => Math.max(0, Math.min(100, v));
  const DIL = [
    { id: 'sponsor', txt: (m, c) => `Une marque de maillots me propose un partenariat : ${U.short(c)} tout de suite pour toi, mais je devrai poster leurs pubs pendant un mois… On accepte ?`, cost: m => Math.round(m.subs * .12 + 80),
      opts: [['Accepte', (m, c) => { G.addCash(c); m.mood = clamp(m.mood - 12); m.subs *= .97; return `Ok… ${U.short(c)} sur ton compte. Mes fans vont râler pour les pubs 😅`; }],
             ['Refuse', m => { m.mood = clamp(m.mood + 8); return 'Merci de me protéger, ça me touche ❤️'; }]] },
    { id: 'tired', txt: () => 'Je suis épuisée… Je peux faire une pause de 3 h ? Promis je reviens à fond.',
      opts: [['Repose-toi', m => { if (!m.act) m.act = { k: 'rest', start: Date.now(), dur: 180 * 60000 }; else m.mood = clamp(m.mood + 20); return 'Merci, t\'es le meilleur manager 🥹'; }],
             ['On a besoin de toi', m => { m.mood = clamp(m.mood - 18); m.pend = (m.pend || 0) + perHour(m) * 2; return 'Ok… je fais un live de plus. Mais je suis à bout.'; }]] },
    { id: 'ex', txt: (m, c) => `Un ex menace de balancer des vieilles photos de moi… Un avocat coûte ${U.short(c)}. Je fais quoi ?`, cost: () => 150 + G.st.lvl * 40,
      opts: [['Je paie l\'avocat', (m, c) => { if (!G.pay(c)) return 'Tu n\'as pas assez… Je vais devoir me débrouiller seule 😟'; m.mood = clamp(m.mood + 12); return 'Lettre envoyée, il s\'est calmé direct. Merci 🙏'; }],
             ['Ignore-le', m => { if (Math.random() < .5) return 'Tu avais raison, il a lâché l\'affaire.'; m.subs *= .8; m.mood = clamp(m.mood - 20); return 'Il a tout posté… J\'ai perdu plein d\'abonnés 😭'; }]] },
    { id: 'tv', txt: (m, c) => `Une émission de télé m'invite !! Le train et l'hôtel coûtent ${U.short(c)}. On y va ?`, cost: m => Math.round(200 + m.subs * .05),
      opts: [['On y va', (m, c) => { if (!G.pay(c)) return 'Pas assez de cash… tant pis pour cette fois.'; if (Math.random() < .6) { m.subs *= 1.35; m.mood = clamp(m.mood + 10); return 'J\'ai cartonné à la télé !! +35 % d\'abonnés 🔥'; } m.subs *= .9; return 'L\'animateur m\'a piégée… les réseaux se moquent de moi 😩'; }],
             ['Pas cette fois', m => { m.mood = clamp(m.mood - 6); return 'Dommage… c\'était ma chance.'; }]] },
    { id: 'price', txt: () => 'Je veux augmenter le prix de mon abonnement. Plus d\'argent par fan… mais certains vont partir. T\'en penses quoi ?',
      opts: [['Augmente', m => { m.priceK = (m.priceK || 1) * 1.15; m.subs *= .9; return 'C\'est fait : +15 % par abonné. On verra qui reste !'; }],
             ['Garde ton prix', () => 'Ok, je reste accessible. Mes fans vont apprécier.']] },
    { id: 'rival', txt: () => 'Une créatrice d\'une agence rivale me propose une collab. Ça peut m\'apporter plein de fans… On le fait ?',
      opts: [['Fonce', m => { m.subs *= 1.2; if (Math.random() < .3 && !ag().offer) setTimeout(() => rivalOffer(m, false), 4000); return 'Collab postée : +20 % d\'abonnés ! Son agence m\'a fait des compliments d\'ailleurs… 👀'; }],
             ['Non, reste chez nous', m => { m.mood = clamp(m.mood - 6); return 'Ok, je reste fidèle à l\'agence.'; }]] },
    { id: 'outfit', txt: (m, c) => `J'ai trouvé une tenue de folie pour mon prochain shooting, ${U.short(c)}. Tu me l'offres ? 🥺`, cost: () => 80 + G.st.lvl * 15,
      opts: [['Je t\'offre', (m, c) => { if (!G.pay(c)) return 'Ah, t\'es à sec ? Pas grave 😅'; m.mood = clamp(m.mood + 20); m.subs *= 1.05; return 'Merciii !! Mes fans adorent déjà 😍'; }],
             ['Pas cette fois', m => { m.mood = clamp(m.mood - 10); return 'Ok… je ferai avec mes vieilles tenues.'; }]] },
    { id: 'gift', txt: () => 'Un fan m\'a offert un sac de luxe hors de prix… Je le garde ?',
      opts: [['Garde-le', m => { m.mood = clamp(m.mood + 15); if (Math.random() < .2) { m.subs *= .92; return 'Ça a fuité sur les réseaux, ils me traitent de profiteuse 😬'; } return 'Trop beau, je l\'adore 😍'; }],
             ['Rends-le', m => { m.subs *= 1.05; return 'Je l\'ai rendu en story : les gens ont adoré mon honnêteté ✨'; }]] }
  ];
  const DIL_ME = [
    { id: 'sponsor', from: 'Une marque de maillots', txt: (m, c) => `Bonjour ! On adorerait un partenariat : ${U.short(c)} tout de suite, contre nos pubs sur ta page pendant un mois. Partante ?`, cost: m => Math.round(m.subs * .15 + 80),
      opts: [['J\'accepte', (m, c) => { G.addCash(c); m.mood = clamp(m.mood - 10); m.subs *= .97; return `Super ! ${U.short(c)} viennent d'être versés. Tes fans râlent un peu pour les pubs.`; }], ['Non merci', m => { m.mood = clamp(m.mood + 6); return 'Dommage, on garde ton contact !'; }]] },
    { id: 'haters', from: 'PrivéFans', txt: () => 'Une vague de haters sous ta dernière vidéo… Tu réponds ?',
      opts: [['Avec humour', m => { if (Math.random() < .5) { m.subs *= 1.15; return 'Ta réponse a fait le tour des réseaux : +15 % d\'abonnés 😎'; } m.subs *= .9; return 'Ça s\'est retourné contre toi… −10 % d\'abonnés.'; }], ['J\'ignore', m => { m.mood = clamp(m.mood - 6); return 'Ça finit par se calmer, mais ça t\'a pesé.'; }]] },
    { id: 'fan', from: 'Un fan', txt: (m, c) => `Salut ! Je t'offre ${U.short(c)} pour une dédicace vidéo personnalisée pour l'anniversaire de mon frère 🎂`, cost: () => 60 + G.st.lvl * 12,
      opts: [['Avec plaisir', (m, c) => { G.addCash(c); m.mood = clamp(m.mood + 4); return `Merci !! Il va être trop content. ${U.short(c)} envoyés 🙏`; }], ['Pas le temps', () => 'Ok, tant pis…']] },
    { id: 'agency', from: 'Star Talents (agence)', txt: () => 'On veut te manager ! On prend 35 % de tes gains, mais on te garantit +30 % d\'abonnés tout de suite. Deal ?',
      opts: [['Deal', m => { m.subs *= 1.3; m.pct = Math.max(.3, m.pct * .65); return 'Bienvenue chez Star Talents ! +30 % d\'abonnés, on garde 35 % de tes gains.'; }], ['Je reste libre', () => 'Ok, la porte reste ouverte.']] },
    { id: 'tv', from: 'Une émission de télé', txt: (m, c) => `On t'invite sur le plateau ! Le train et l'hôtel sont à ta charge : ${U.short(c)}. Tu viens ?`, cost: m => Math.round(200 + m.subs * .05),
      opts: [['J\'y vais', (m, c) => { if (!G.pay(c)) return 'Tu n\'as pas assez de cash pour le voyage…'; if (Math.random() < .6) { m.subs *= 1.35; return 'Tu as cartonné : +35 % d\'abonnés 🔥'; } m.subs *= .9; return 'L\'animateur t\'a piégée… les réseaux se moquent 😩'; }], ['Pas cette fois', m => { m.mood = clamp(m.mood - 5); return 'Une autre fois peut-être !'; }]] },
    { id: 'tired', from: 'Momo', txt: () => 'Hé, t\'as une sale tête… Prends 3 h de pause, sérieux.',
      opts: [['Ok, je me repose', m => { if (!m.act) m.act = { k: 'rest', start: Date.now(), dur: 180 * 60000 }; else m.mood = clamp(m.mood + 20); return 'Voilà, prends soin de toi 💪'; }], ['Je continue', m => { m.mood = clamp(m.mood - 15); m.pend = (m.pend || 0) + perHour(m) * 2; return 'T\'es une machine… mais fais gaffe.'; }]] },
    { id: 'collab', from: 'Une créatrice star', txt: () => 'Coucou ! On fait une collab ensemble ? Mes fans vont t\'adorer 💕',
      opts: [['Carrément', m => { m.subs *= 1.2; m.mood = clamp(m.mood + 8); return 'Collab postée : +20 % d\'abonnés !'; }], ['Pas maintenant', () => 'Ok, une autre fois !']] }
  ];
  function dilemma() {
    if (solo()) { const a = ag(), m = a.crew.find(x => x.id === 'me'); if (!m) return; const d = pick(DIL_ME), c = d.cost ? d.cost(m) : 0;
      a.dil = { id: Date.now(), m: 'me', d: d.id, c, until: Date.now() + 30 * 60000, me: true }; const txt = d.txt(m, c);
      U.chatPush(d.from, d.from === 'Momo' ? 'guide' : 'icon-star', { from: 'them', txt, acts: d.opts.map(([label], k) => ({ label, act: 'ag', d: a.dil.id, k })) });
      return U.notify('msg', d.from, txt, null, false, d.from); }
    const a = ag(), m = pick(a.crew), p = prof(m.id), d = pick(DIL), c = d.cost ? d.cost(m) : 0;
    a.dil = { id: Date.now(), m: m.id, d: d.id, c, until: Date.now() + 30 * 60000 };
    const txt = d.txt(m, c), img = U.has('cr-' + m.id) ? 'cr-' + m.id : 'icon-star';
    U.chatPush(p.name, img, { from: 'them', txt, acts: d.opts.map(([label], k) => ({ label, act: 'ag', d: a.dil.id, k })) });
    U.notify('msg', p.name, txt, null, false, p.name);
  }
  function choose(id, k) {
    const a = ag(), dl = a.dil; if (!dl || dl.id !== id || Date.now() > dl.until) return 'Trop tard, j\'ai dû décider sans toi…';
    const m = a.crew.find(x => x.id === dl.m); a.dil = null; if (!m) return 'Je ne suis plus dans ton agence…';
    const d = (dl.me ? DIL_ME : DIL).find(x => x.id === dl.d); G.stat('agChoices'); return d.opts[k][1](m, dl.c);
  }
  // une agence rivale veut la récupérer : on la garde (prime ou part réduite) ou on la laisse partir
  function rivalOffer(m, unhappy) {
    const a = ag(), p = prof(m.id);
    a.offer = { id: m.id, prime: Math.round(perHour(m) * 24 + 100), t: now(), unhappy };
    U.notify('agence', `📩 ${p.name} hésite à partir`, unhappy ? 'Elle n\'a plus le moral et une agence rivale lui fait les yeux doux. Ouvre PrivéFans.' : 'Une agence rivale lui propose un contrat. Ouvre PrivéFans pour décider.');
  }

  // ------------------------------------------------------------ actions
  function candidates() {
    const a = ag();
    if (!a.cand.length || now() - a.candAt > A.candEvery * 60000) {
      const free = A.crew.filter(c => !a.crew.some(m => m.id === c.id));
      a.cand = free.sort(() => Math.random() - .5).slice(0, 3).map(c => c.id); a.candAt = now();
    }
    return a.cand.map(prof).filter(c => c && !a.crew.some(m => m.id === c.id));
  }
  const gearOpen = new Set();
  const act = {
    agStart(el) { const a = ag(); if (a.crew.length) return; a.meNiche = el.dataset.n; a.crew = [{ id: 'me', subs: 250, mood: 90, pct: .8, pend: 0, last: now(), act: null, since: now() }]; G.addXp(30); U.sfx.win(); U.rain('confetti', 24); U.toast('Ta page PrivéFans est en ligne ! Lance ton premier shooting.'); refresh(); },
    agGearOpen(el) { const id = el.dataset.id; gearOpen.has(id) ? gearOpen.delete(id) : gearOpen.add(id); refresh(); },
    agAbo(el) { const m = ag().crew.find(x => x.id === el.dataset.id), g = A.gear.find(x => x.id === el.dataset.g); if (!m || !g) return;
      m.abo = m.abo || {}; if (m.abo[g.id]) { delete m.abo[g.id]; U.toast(`${g.name} résilié.`); return refresh(); }
      if (!G.pay(g.cost)) return U.toast('Pas assez de cash.', true); m.abo[g.id] = Date.now() + 86400000; m.mood = clamp(m.mood + 8); U.sfx.coin(); U.toast(`${g.icon} ${prof(m.id).name} est abonnée au spa : ${U.short(g.cost)} par jour.`); refresh(); },
    agGear(el) { const m = ag().crew.find(x => x.id === el.dataset.id), g = A.gear.find(x => x.id === el.dataset.g); if (!m || !g) return; if (m.gear && m.gear[g.id]) return; if (!G.pay(g.cost)) return U.toast('Pas assez de cash.', true); (m.gear = m.gear || {})[g.id] = Date.now(); m.mood = clamp(m.mood + 8); G.addXp(10); U.sfx.coin(); U.toast(`${g.icon} ${g.name} pour ${prof(m.id).name} : elle adore !`); refresh(); },
    agRecruit(el) {
      const a = ag(), c = prof(el.dataset.id), cost = recruitCost(c);
      if (a.crew.length >= slotsN()) return U.toast('Agence pleine : agrandis-la pour en recruter une autre.', true);
      if (!G.pay(cost)) return U.toast('Pas assez de cash.', true);
      a.crew.push({ id: c.id, subs: c.subs, mood: 80, pct: .35, pend: 0, last: now(), act: null, since: now() });
      a.cand = a.cand.filter(x => x !== c.id); G.stat('agRecruit'); G.addXp(30); U.sfx.win(); U.toast(`${c.name} rejoint ton agence !`); refresh();
    },
    agCollect() {
      const a = ag(), n = Math.floor(a.crew.reduce((x, m) => x + (m.pend || 0), 0));
      if (n < 1) return U.toast('Rien à encaisser pour l\'instant.', true);
      a.crew.forEach(m => { m.pend = 0; }); G.addCash(n); G.addXp(Math.min(40, 5 + n / 20)); U.sfx.coin(); U.floatTxt(`+${U.eur(n)}`); refresh();
    },
    agShare(el) { const m = ag().crew.find(x => x.id === el.dataset.id); m.pct = +el.dataset.v; refresh(); },
    agAct(el) {
      const a = ag(), m = a.crew.find(x => x.id === el.dataset.id), x = A.acts.find(o => o.id === el.dataset.k);
      if (m.act) return U.toast('Elle est déjà occupée.', true);
      if (x.lvl && st().lvl < x.lvl) return U.toast(`Niveau ${x.lvl} requis.`, true);
      let duo = null;
      if (x.duo && m.id !== 'me') { duo = a.crew.find(o => o.id !== m.id && !o.act); if (!duo) return U.toast('Il faut une autre créatrice libre dans ton agence.', true); }
      if (x.cost && !G.pay(x.cost)) return U.toast('Pas assez de cash.', true);
      m.act = { k: x.id, start: now(), dur: x.min * 60000, with: duo && duo.id }; if (duo) duo.act = { k: x.id, start: now(), dur: x.min * 60000, with: m.id, guest: true };
      U.sfx.tap(); U.toast(m.id === 'me' ? `${x.icon} C'est parti : ${x.name.toLowerCase()} !` : `${x.icon} ${prof(m.id).name} : ${x.name}${duo ? ` avec ${prof(duo.id).name}` : ''}.`); refresh();
    },
    agGift(el) { const m = ag().crew.find(x => x.id === el.dataset.id), c = 50 + st().lvl * 10; if (!G.pay(c)) return U.toast('Pas assez de cash.', true); m.mood = Math.min(100, m.mood + 20); U.toast(`Un petit cadeau à ${prof(m.id).name} : +20 de moral.`); refresh(); },
    agKeep(el) {
      const a = ag(), o = a.offer, m = o && a.crew.find(x => x.id === o.id); if (!m) { a.offer = null; return refresh(); }
      if (el.dataset.how === 'prime') { if (!G.pay(o.prime)) return U.toast('Pas assez de cash.', true); m.mood = Math.min(100, m.mood + 30); }
      else { m.pct = Math.max(.2, m.pct - .15); m.mood = Math.min(100, m.mood + 25); }
      a.offer = null; U.toast(`${prof(m.id).name} reste chez toi.`); refresh();
    },
    agLetGo() { const a = ag(), o = a.offer; a.crew = a.crew.filter(x => x.id !== o.id); a.crew.forEach(x => { if (x.act && x.act.with === o.id) x.act = null; }); a.offer = null; U.toast(`${prof(o.id).name} est partie chez la concurrence.`); refresh(); },
    agSlots() { const a = ag(), nx = A.slots[a.slots + 1]; if (!nx) return; if (!G.pay(nx.cost)) return U.toast('Pas assez de cash.', true); a.slots++; U.sfx.win(); U.toast(`Ton agence peut maintenant gérer ${nx.n} créatrices.`); refresh(); }
  };
  U.register(act);
  function refresh() { U.refresh(); }

  // ------------------------------------------------------------ l'écran (app du téléphone)
  function body() {
    const s = st();
    if (!unlocked()) return `<div class="ag-lock">${'📸'}<b>PrivéFans</b><p>Deviens manager de créatrices de contenu : tu les recrutes, tu organises leur semaine, et tu touches ta part de leurs abonnements.</p><div class="explain center">🔒 Débloqué au niveau ${A.lvl}</div></div>`;
    sim();
    if (solo() && !ag().crew.length) return `<div class="ag-lock">📸<b>Ta page PrivéFans</b><p>Lance ta page de créatrice : tes fans s'abonnent, tu postes du contenu, et tu gardes tout… sauf les 20 % de la plateforme.</p></div>
      <h3 class="sec">Choisis ta spécialité</h3><div class="ag-niches">${NICHES.map(n => `<button class="btn blue" data-act="agStart" data-n="${n}">${n}</button>`).join('')}</div>
      <p class="hint-line">Ta spécialité compte : certaines tenues et certains objets rapportent deux fois plus quand ils collent à ta niche.</p>`;
    const a = ag(), pend = a.crew.reduce((x, m) => x + (m.pend || 0), 0), hourly = a.crew.reduce((x, m) => x + perHour(m), 0);
    const offer = a.offer && prof(a.offer.id);
    const head = solo() ? `<div class="card ag-head"><div class="grow"><small>Tes gains en attente</small><b>${U.short(pend)}</b><small>≈ ${U.short(hourly)} par heure · la plateforme garde ${Math.round((1 - a.crew[0].pct) * 100)} %</small></div>
      <button class="btn green" data-act="agCollect" ${pend >= 1 ? '' : 'disabled'}>Encaisser</button></div>` : `<div class="card ag-head"><div class="grow"><small>Ta commission en attente</small><b>${U.short(pend)}</b><small>≈ ${U.short(hourly)} par heure · ${a.crew.length} / ${slotsN()} créatrice${slotsN() > 1 ? 's' : ''}</small></div>
      <button class="btn green" data-act="agCollect" ${pend >= 1 ? '' : 'disabled'}>Encaisser</button></div>`;
    const off = offer ? `<div class="card ag-offer"><b>📩 ${offer.name} hésite à partir</b><p>${a.offer.unhappy ? 'Elle n\'a plus le moral, et une agence rivale lui propose mieux.' : 'Une agence rivale lui propose un contrat.'} Que fais-tu ?</p>
      <div class="ag-btns"><button class="btn gold sm" data-act="agKeep" data-how="prime">Prime de ${U.short(a.offer.prime)}</button><button class="btn blue sm" data-act="agKeep" data-how="share">Baisser ta part (−15 %)</button><button class="btn red sm" data-act="agLetGo">La laisser partir</button></div></div>` : '';
    const crew = a.crew.map(m => {
      const p = prof(m.id), x = m.act && A.acts.find(o => o.id === m.act.k), left = m.act ? m.act.start + m.act.dur - now() : 0;
      return `<div class="card ag-cr"><div class="ag-top">${face(p)}<div class="grow"><b>${p.name}</b><small>${p.niche} · <strong>${fmtSubs(m.subs)}</strong> abonnés</small>
          <div class="ag-mood"><span>${p.me ? 'Énergie' : 'Moral'}</span><div class="kh-bar"><i style="width:${Math.round(m.mood)}%;background:${m.mood < 30 ? '#e63946' : m.mood < 60 ? '#f2b01e' : '#3ddc84'}"></i></div></div></div>
          <div class="ag-earn"><small>Pour toi</small><b>${U.short(perHour(m))}/h</b></div></div>
        ${(() => { const n = A.gear.filter(g => hasG(m, g)).length, open = gearOpen.has(m.id);
          return `<button class="ag-gear-btn" data-act="agGearOpen" data-id="${m.id}">${U.ic('shop')} ${p.me ? 'Tes affaires' : 'Ses affaires'} · ${n}/${A.gear.length}${gearK(m, 'rev') ? ` · revenus +${Math.round(gearK(m, 'rev') * 100)} %` : ''} <i>${open ? '▾' : '▸'}</i></button>
          ${open ? `<div class="ag-gear">${A.gear.map(g => { const own = hasG(m, g), fit = g.niche && g.niche.includes(p.niche), k = fit ? 2 : 1;
            const fx = [g.rev ? `<span class="gx rev">💰 +${Math.round(g.rev * k * 100)} % de revenus<small>≈ +${U.short(Math.max(1, Math.round(perHour(m) / (1 + gearK(m, 'rev')) * g.rev * k)))}/h pour toi</small></span>` : '',
              g.subs ? `<span class="gx subs">👥 +${Math.round(g.subs * k * 100)} % d'abonnés<small>ils montent plus vite</small></span>` : '',
              g.mood ? `<span class="gx mood">😊 +${g.mood * k} de moral<small>chaque heure, toute seule</small></span>` : ''].join('');
            return `<div class="ag-g ${own ? 'own' : ''} ${fit ? 'fit' : ''}">${fit ? `<span class="gfit">×2 pour ${p.me ? 'toi' : 'elle'}</span>` : ''}<span class="gpic">${U.has('gear-' + g.id) ? `<img src="${U.src('gear-' + g.id)}" alt="">` : g.icon}</span>
              <b>${g.name}</b><div class="gfx">${fx}</div>${g.sub ? (own ? `<span class="gown">✓ Abonnée · prochain paiement dans ${Math.max(1, Math.round((m.abo[g.id] - Date.now()) / 3600000))} h</span><button class="btn xs red" data-act="agAbo" data-id="${m.id}" data-g="${g.id}">Résilier</button>`
                : `<button class="btn xs green" data-act="agAbo" data-id="${m.id}" data-g="${g.id}" ${s.cash >= g.cost ? '' : 'disabled'}>S'abonner · ${U.short(g.cost)}/jour</button>`)
              : own ? '<span class="gown">✓ Possédé</span>' : `<button class="btn xs green" data-act="agGear" data-id="${m.id}" data-g="${g.id}" ${s.cash >= g.cost ? '' : 'disabled'}>${U.short(g.cost)}</button>`}</div>`; }).join('')}</div>` : ''}`; })()}
        ${p.me ? '' : `<div class="ag-share"><span>Ta part</span>${A.shares.map(v => `<button class="btn xs ${m.pct === v ? 'yellow' : 'blue'}" data-act="agShare" data-id="${m.id}" data-v="${v}">${Math.round(v * 100)} %</button>`).join('')}<button class="btn xs purple" data-act="agGift" data-id="${m.id}">${U.ic('gift')} ${U.short(50 + s.lvl * 10)}</button></div>`}
        ${m.act ? `<div class="ag-busy">${actIc(x)} ${x.name}${m.act.with ? ` avec ${prof(m.act.with).name}` : ''} · fini dans <b>${U.mmss(left)}</b></div>`
          : `<div class="ag-acts">${A.acts.map(o => { const noDuo = o.duo && !p.me && !ag().crew.some(c => c.id !== m.id && !c.act);
            return `<button class="ag-act ${noDuo ? 'need' : ''}" data-act="agAct" data-id="${m.id}" data-k="${o.id}" ${(o.lvl && s.lvl < o.lvl) || noDuo ? 'disabled' : ''}><span>${actIc(o)}</span><b>${o.name}</b><small>${noDuo ? '2 créatrices libres' : `${o.min < 60 ? o.min + ' min' : o.min / 60 + ' h'}${o.cost ? ` · ${U.short(o.cost)}` : ''}`}</small>${noDuo ? '' : actGain(m, o)}</button>`; }).join('')}</div>`}
      </div>`;
    }).join('');
    const cand = a.crew.length < slotsN() ? `<h3 class="sec">Elles cherchent une agence</h3><div class="ag-cands">${candidates().map(c => `<div class="card ag-cand">${face(c, 'big')}<b>${c.name}</b><small>${c.niche} · ${fmtSubs(c.subs)} abonnés</small><p>${c.desc}</p>
        <div class="ag-stats">${[['Charme', c.cha, 'abonnés qui montent vite'], ['Sérieux', c.reg, 'revenu régulier'], ['Drama', c.drama, 'buzz et bad buzz']].map(([k, v, t]) => `<div class="st-row"><em>${k}</em><span class="st-bar">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span><small>${t}</small></div>`).join('')}</div>
        <button class="btn green xs" data-act="agRecruit" data-id="${c.id}" ${s.cash >= recruitCost(c) ? '' : 'disabled'}>Recruter · ${U.short(recruitCost(c))}</button></div>`).join('')}</div>
` : '';
    const nx = A.slots[a.slots + 1];
    const grow = nx ? `<div class="card ag-grow"><div class="grow"><b>Agrandir l'agence</b><small>Gérer ${nx.n} créatrices en même temps</small></div><button class="btn sm ${s.cash >= nx.cost ? 'green' : ''}" data-act="agSlots" ${s.cash >= nx.cost ? '' : 'disabled'}>${U.short(nx.cost)}</button></div>` : '';
    const how = `<p class="hint-line">Plus <b>ta part</b> est grosse, plus tu gagnes… mais plus leur <b>moral</b> baisse. Sans moral, elles gagnent moins, et une agence rivale peut te les piquer.</p>`;
    if (solo()) return head + crew + `<p class="hint-line">Plus tu bosses, plus ton <b>énergie</b> baisse : sans énergie, tu gagnes moins. Le repos, le spa et les bonnes nouvelles la font remonter.</p>`;
    return head + off + (a.crew.length ? crew : '<div class="explain center">Ton agence est vide : recrute ta première créatrice.</div>') + cand + grow + how;
  }
  // la première fois : Momo explique en deux phrases
  function intro() {
    const s = st(); if (s.agIntro || !unlocked()) return; s.agIntro = true;
    U.dialog('Momo', solo() ? 'Ta page <b>PrivéFans</b> : choisis ta spécialité, poste du contenu (shooting, live, collab) et encaisse tes abonnés. Fais gaffe à ton <b>énergie</b> : fatiguée, tu gagnes moins.'
      : 'Ton agence <b>PrivéFans</b> : recrute des créatrices, organise leurs journées, et touche ta part. Plus tu prends, plus leur <b>moral</b> baisse… et les agences rivales rôdent.', 'Compris');
  }
  function open() { U.openModal({ title: solo() ? 'Ma page PrivéFans' : 'PrivéFans', icon: 'star', full: true, body: body(), refresh: () => U.setBody(body()) }); setTimeout(intro, 300); }

  setInterval(() => { try { sim(); } catch (e) { console.error(e); } }, 5000);
  window.AGENCE = { open, sim, choose, pending: () => st() && st().agence ? st().agence.crew.reduce((x, m) => x + (m.pend || 0), 0) : 0, offer: () => st() && st().agence && st().agence.offer, unlocked };
})();
