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
  const nslug = n => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '').replace('modeluxe', 'mode');
  const prof = id => id === 'me' ? { id: 'me', name: st().name || 'Toi', niche: (st().agence || {}).meNiche || 'Lifestyle', cha: 3, reg: 3, drama: 2, me: true } : A.crew.find(c => c.id === id);
  const fmtSubs = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + ' k' : String(Math.round(n));
  // tête à afficher sur une notif ou un message : la créatrice concernée (ou ton perso), jamais Momo
  const faceImg = id => id === 'me' ? (st().skin && U.has(`skin-${st().skin}-bust`) ? `skin-${st().skin}-bust` : null) : U.has('cr-' + id) ? 'cr-' + id : null;
  const say = (id, msg, bad) => U.toast(msg, bad, null, null, faceImg(id));
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
  // plafond d'abonnés : dépend du charisme (une star plafonne plus haut) ; le matos d'abonnés le relève un peu
  const subsCap = m => A.subsCap * (prof(m.id).cha / 3) * (1 + gearK(m, 'subs') * .5);
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
      // croissance qui ralentit en approchant du plafond d'abonnés (avant : ça grossissait à l'infini, 138 000/h au bout d'un mois)
      m.subs *= 1 + .004 * p.cha / 3 * moodK(m) * (1 + gearK(m, 'subs')) * h * Math.max(0, 1 - m.subs / subsCap(m));
      m.subs = Math.min(m.subs, subsCap(m)); m.priceK = Math.min(m.priceK || 1, 1.6);
      m.mood = Math.max(0, Math.min(100, m.mood - (share(m) - .2) * 20 * h + gearK(m, 'mood') * h));
      if (m.act && t >= m.act.start + m.act.dur) finishAct(m);
      if (m.mood < 15 && !a.offer && m.id !== 'me') rivalOffer(m, true);
    });
    // spa acheté avant qu'il devienne un abonnement : on le transforme en abonnement déjà payé pour 24 h
    a.crew.forEach(m => { if (m.gear && m.gear.spa) { (m.abo = m.abo || {}).spa = m.abo.spa || t + 86400000; delete m.gear.spa; } });
    // abonnements : prélevés toutes les 24 h ; pas assez de cash = abonnement arrêté
    a.crew.forEach(m => Object.keys(m.abo || {}).forEach(id => { const g = A.gear.find(x => x.id === id); let n = 0;
      while (m.abo[id] && t >= m.abo[id] && n++ < 7) { if (G.st.cash >= g.cost) { G.addCash(-g.cost); m.abo[id] += 86400000; } else { delete m.abo[id]; U.notify('agence', `${g.icon} ${g.name} arrêté`, `Pas assez de cash pour payer l'abonnement de ${prof(m.id).name}.`, null, false, null, faceImg(m.id)); } } }));
    if (a.crew.length && t >= a.nextEv) { a.nextEv = t + rnd(...A.eventEvery) * 60000; randomEvent(); }
    if (!a.nextDil) a.nextDil = t + rnd(10, 25) * 60000;
    if (a.crew.length && t >= a.nextDil && !(a.dil && t < a.dil.until)) { a.nextDil = t + rnd(...A.dilEvery) * 60000; dilemma(); }
  }
  // ce que rapporte une activité, affiché sous son bouton (abonnés, pourboires, moral)
  // finir une activité tout de suite : 1 lingot par demi-heure restante
  const rushCost = ms => Math.max(1, Math.ceil(ms / 1800000));
  // la collab demande 2 places dans l'agence : avant l'agrandissement, elle est verrouillée (et rangée en bas)
  const lockedDuo = (m, o) => o.duo && m.id !== 'me' && slotsN() < 2;
  function actGain(m, x) {
    const mt0 = x.duo && m.id !== 'me' && m.act && m.act.k === x.id && m.act.with && ag().crew.find(o => o.id === m.act.with), p = prof(m.id), subs = (mt0 ? mt0.subs : m.subs) * x.subs * (p.cha / 3) * (1 + gearK(m, 'subs'));
    const tips = x.cash ? Math.round(m.subs * x.cash * A.subPrice * 10 * share(m)) : 0, L = [];
    // collab : chacune gagne des abonnés selon SA taille (la plus grosse gagne plus) ; on affiche les deux chiffres
    const mate = x.duo && m.id !== 'me' && m.act && m.act.k === x.id && m.act.with && ag().crew.find(o => o.id === m.act.with);
    if (mate) { const ms = m.subs * x.subs * (prof(mate.id).cha / 3); L.push(`<span class="g-up">+${fmtSubs(subs)} pour elle</span>`); if (ms >= 1) L.push(`<span class="g-up">+${fmtSubs(ms)} pour ${U.esc(prof(mate.id).name)}</span>`); }
    else if (subs >= 1) { L.push(`<span class="g-up">+${fmtSubs(subs)} abonnés</span>`); if (x.duo && m.id !== 'me') L.push('<span class="g-up">et l\'autre en gagne aussi</span>'); }
    if (tips) L.push(`<span class="g-up">+${U.short(tips)} pourboires</span>`);
    if (x.mood) L.push(`<span class="${x.mood > 0 ? 'g-up' : 'g-down'}">${m.id === 'me' ? 'énergie' : 'moral'} ${x.mood > 0 ? '+' : '−'}${Math.abs(x.mood)}</span>`);
    return `<em class="ag-gain">${L.join('')}</em>`;
  }
  // partenaires de collab pour ta page : des créatrices dont la taille tourne autour de la tienne (renouvelées chaque jour)
  function partners() {
    const me = ag().crew.find(x => x.id === 'me'), base = Math.max(100, me ? me.subs : 250), day = Math.floor(now() / 86400000);
    const K = [.6, .85, 1.05, 1.6, 2.6, 4.5], seeded = n => { const x = Math.sin(n) * 10000; return x - Math.floor(x); };
    return A.crew.map((c, i) => ({ c, r: seeded(day * 31 + i * 7) })).sort((u, v) => u.r - v.r).slice(0, 5)
      .map(({ c }, i) => ({ ...c, subs: Math.round(base * K[(i + day) % K.length] * (0.9 + seeded(day + i) * .2)) })).sort((u, v) => u.subs - v.subs);
  }
  function partnerFee(c, me) { const r = c.subs / Math.max(1, me.subs); return r <= 1.25 ? 0 : Math.round((r - 1.25) * (80 + st().lvl * 20)); }
  function pickPartner() {
    const m = ag().crew.find(x => x.id === 'me'), x = A.acts.find(o => o.id === 'collab');
    U.openModal({ title: 'Collab avec qui ?', icon: 'star', center: true, body: `<p class="hint-line center">Une créatrice de ta taille accepte <b>gratuitement</b>. Une plus grosse se fait payer, mais t'apporte plus d'abonnés.</p>
      <div class="ag-partners">${partners().map(c => { const fee = partnerFee(c, m), tot = fee + x.cost;
        return `<div class="card ag-pt">${face(c)}<div class="grow"><b>${c.name}</b><small>${c.niche} · <strong>${fmtSubs(c.subs)}</strong> abonnés</small>${fee ? `<small class="pt-fee">Elle demande ${U.short(fee)}</small>` : '<small class="pt-free">Gratuit : même taille que toi</small>'}</div>
          <button class="btn xs ${fee ? 'gold' : 'green'}" data-act="agCollab" data-id="${c.id}" ${st().cash >= tot ? '' : 'disabled'}>${U.short(tot)}</button></div>`; }).join('')}</div>
      <p class="hint-line center">Le prix inclut les ${U.short(x.cost)} de la collab.</p><button class="btn wide" data-act="agBack">Retour</button>` });
  }
  function finishAct(m) {
    const x = A.acts.find(o => o.id === m.act.k), p = prof(m.id), duo = m.act.with && ag().crew.find(o => o.id === m.act.with);
    // collab sur ta page : une partie de son public la suit chez toi (plus elle est grosse, plus tu gagnes)
    // collab entre deux créatrices : chacune récupère une part du public de L'AUTRE (la plus petite gagne donc le plus, comme dans la vraie vie)
    const m0 = m.subs, base = duo ? duo.subs : m.subs;
    const gain = base * x.subs * (p.cha / 3) * (1 + gearK(m, 'subs')) + (m.act.pSubs ? m.act.pSubs * .05 : 0);
    m.subs += gain; m.mood = Math.max(0, Math.min(100, m.mood + x.mood));
    let tips = 0; if (x.cash) { tips = Math.round(m.subs * x.cash * A.subPrice * 10 * share(m)); m.pend = (m.pend || 0) + tips; }
    if (duo) { duo.subs += m0 * x.subs * (prof(duo.id).cha / 3); duo.mood = Math.min(100, duo.mood + x.mood); duo.act = null; }
    m.act = null; G.stat('agActs');
    U.notify('agence', p.me ? `Tu as fini : ${x.name}` : `${p.name} a fini : ${x.name}`, `${gain >= 1 ? `+${fmtSubs(gain)} abonnés` : 'Elle a bien récupéré'}${tips ? ` et +${U.short(tips)} de pourboires pour toi` : ''}.`, null, false, null, faceImg(p.me ? 'me' : p.id));
  }
  function randomEvent() {
    const a = ag(), m = pick(a.crew), p = prof(m.id), r = Math.random(), d = p.drama / 5;
    if (r < .35) { const k = rnd(.15, .35); m.subs *= 1 + k; U.notify('agence', p.me ? '🔥 Tu fais le buzz !' : `🔥 ${p.name} fait le buzz !`, `${p.me ? 'Une de tes vidéos' : 'Une de ses vidéos'} explose : +${Math.round(k * 100)} % d'abonnés.`, null, false, null, faceImg(p.me ? 'me' : p.id)); }
    else if (r < .35 + .3 * d) { const k = rnd(.08, .18); m.subs *= 1 - k; m.mood = Math.max(0, m.mood - 10); U.notify('agence', p.me ? '😬 Bad buzz pour toi' : `😬 Bad buzz pour ${p.name}`, `Une polémique sur les réseaux : −${Math.round(k * 100)} % d'abonnés. Un peu de repos lui ferait du bien.`, null, false, null, faceImg(p.me ? 'me' : p.id)); }
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
    // une créatrice heureuse ne pense pas à partir : plus son moral est haut, moins une agence rivale a de chances (aucune à 70 et plus)
    if (!unhappy && (m.mood >= 70 || Math.random() < m.mood / 70)) return;
    const a = ag(), p = prof(m.id);
    a.offer = { id: m.id, prime: Math.round(perHour(m) * 24 + 100), t: now(), unhappy };
    U.notify('agence', `📩 ${p.name} hésite à partir`, unhappy ? 'Elle n\'a plus le moral et une agence rivale lui fait les yeux doux. Ouvre PrivéFans.' : 'Son moral baisse et une agence rivale lui propose un contrat. Ouvre PrivéFans pour décider.', null, false, null, faceImg(p.id));
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
    agStart(el) { const a = ag(); if (a.crew.length) return; a.meNiche = el.dataset.n; a.crew = [{ id: 'me', subs: 250, mood: 90, pct: .8, pend: 0, last: now(), act: null, since: now() }]; G.addXp(30); U.sfx.win(); U.rain('confetti', 24); say('me', 'Ta page PrivéFans est en ligne ! Lance ton premier shooting.'); refresh(); },
    agGearOpen(el) { const id = el.dataset.id; gearOpen.has(id) ? gearOpen.delete(id) : gearOpen.add(id); refresh(); },
    agAbo(el) { const m = ag().crew.find(x => x.id === el.dataset.id), g = A.gear.find(x => x.id === el.dataset.g); if (!m || !g) return;
      m.abo = m.abo || {}; if (m.abo[g.id]) { delete m.abo[g.id]; U.toast(`${g.name} résilié.`); return refresh(); }
      if (!G.pay(g.cost)) return U.toast('Pas assez de cash.', true); m.abo[g.id] = Date.now() + 86400000; m.mood = clamp(m.mood + 8); U.sfx.coin(); say(m.id, `${g.icon} ${prof(m.id).name} est abonnée au spa : ${U.short(g.cost)} par jour.`); refresh(); },
    agGear(el) { const m = ag().crew.find(x => x.id === el.dataset.id), g = A.gear.find(x => x.id === el.dataset.g); if (!m || !g) return; if (m.gear && m.gear[g.id]) return; if (!G.pay(g.cost)) return U.toast('Pas assez de cash.', true); (m.gear = m.gear || {})[g.id] = Date.now(); m.mood = clamp(m.mood + 8); G.addXp(10); U.sfx.coin(); say(m.id, `${g.icon} ${g.name} pour ${prof(m.id).name} : elle adore !`); refresh(); },
    agRecruit(el) {
      const a = ag(), c = prof(el.dataset.id), cost = recruitCost(c);
      if (a.crew.length >= slotsN()) return U.toast('Agence pleine : agrandis-la pour en recruter une autre.', true);
      if (!G.pay(cost)) return U.toast('Pas assez de cash.', true);
      a.crew.push({ id: c.id, subs: c.subs, mood: 80, pct: .35, pend: 0, last: now(), act: null, since: now() });
      a.cand = a.cand.filter(x => x !== c.id); G.stat('agRecruit'); G.addXp(30); U.sfx.win(); say(c.id, `${c.name} rejoint ton agence !`); refresh();
    },
    agCollect() {
      const a = ag(), n = Math.floor(a.crew.reduce((x, m) => x + (m.pend || 0), 0));
      if (n < 1) return U.toast('Rien à encaisser pour l\'instant.', true);
      a.crew.forEach(m => { m.pend = 0; }); G.addCash(n); G.addXp(Math.min(40, 5 + n / 20)); U.sfx.gain(n); U.floatTxt(`+${U.eur(n)}`); refresh();
    },
    agRush(el) {
      const a = ag(), m = a.crew.find(x => x.id === el.dataset.id); if (!m || !m.act) return;
      const host = m.act.guest ? a.crew.find(x => x.id === m.act.with) || m : m, n = rushCost(host.act.start + host.act.dur - now());
      if (G.st.lingots < n) return U.toast('Pas assez de lingots.', true);
      G.addLingots(-n); finishAct(host); U.sfx.coin(); refresh();
    },
    agShare(el) { const m = ag().crew.find(x => x.id === el.dataset.id), v = +el.dataset.v; if (m.shareLock > now() && v > m.pct) return U.toast(`Tu lui as promis de baisser ta part : attends encore ${U.mmss(m.shareLock - now())}.`, true); m.pct = v; refresh(); },
    agAct(el) {
      const a = ag(), m = a.crew.find(x => x.id === el.dataset.id), x = A.acts.find(o => o.id === el.dataset.k);
      if (m.act) return say(m.id, 'Elle est déjà occupée.', true);
      if (x.lvl && st().lvl < x.lvl) return U.toast(`Niveau ${x.lvl} requis.`, true);
      if (x.duo && m.id === 'me') return pickPartner();
      let duo = null;
      if (x.duo && m.id !== 'me') { duo = a.crew.find(o => o.id !== m.id && !o.act); if (!duo) return U.toast('Il faut une autre créatrice libre dans ton agence.', true); }
      if (x.cost && !G.pay(x.cost)) return U.toast('Pas assez de cash.', true);
      m.act = { k: x.id, start: now(), dur: x.min * 60000, with: duo && duo.id }; if (duo) duo.act = { k: x.id, start: now(), dur: x.min * 60000, with: m.id, guest: true };
      U.sfx.tap(); say(m.id, m.id === 'me' ? `C'est parti : ${x.name.toLowerCase()} !` : `${prof(m.id).name} : ${x.name}${duo ? ` avec ${prof(duo.id).name}` : ''}.`); refresh();
    },
    // renvoyer une créatrice : on confirme, elle part avec ses abonnés, ses gains en attente te sont versés
    agFireAsk(el) { const m = ag().crew.find(x => x.id === el.dataset.id); if (!m) return; const p = prof(m.id), pend = Math.floor(m.pend || 0);
      U.openModal({ title: 'Renvoyer ' + p.name, icon: 'star', center: true, body: `<div class="center">${face(p, 'big')}</div><p class="center">${p.name} quitte ton agence et repart avec ses <b>${fmtSubs(m.subs)} abonnés</b>. La place se libère pour recruter quelqu'un d'autre.</p>
        ${pend >= 1 ? `<div class="card center"><small>Ses gains en attente te sont versés</small><b>+${U.eur(pend)}</b></div>` : ''}
        <div class="grid2"><button class="btn" data-act="agBack">Annuler</button><button class="btn red" data-act="agFire" data-id="${m.id}">Renvoyer</button></div>` }); },
    agFire(el) { const a = ag(), m = a.crew.find(x => x.id === el.dataset.id); if (!m || m.id === 'me') return;
      const pend = Math.floor(m.pend || 0); if (pend >= 1) G.addCash(pend);
      a.crew = a.crew.filter(x => x.id !== m.id); a.crew.forEach(x => { if (x.act && x.act.with === m.id) x.act = null; }); if (a.offer && a.offer.id === m.id) a.offer = null;
      G.save(); say(m.id, `${prof(m.id).name} a quitté ton agence.${pend >= 1 ? ` +${U.short(pend)} encaissés.` : ''}`); open(); },
    agBack() { open(); },
    // collab sur ta page (joueuse) : tu choisis avec qui ; même taille que toi = gratuit, plus grosse = elle se fait payer
    agCollab(el) { const a = ag(), m = a.crew.find(x => x.id === 'me'), x = A.acts.find(o => o.id === 'collab'), c = partners().find(o => o.id === el.dataset.id); if (!m || !c || m.act) return;
      const fee = partnerFee(c, m); if (!G.pay(fee + x.cost)) return U.toast('Pas assez de cash.', true);
      m.act = { k: 'collab', start: now(), dur: x.min * 60000, with: c.id, pSubs: c.subs };
      U.sfx.tap(); say(c.id, `Collab avec ${c.name} : c'est parti !`); open(); },
    agGift(el) { const m = ag().crew.find(x => x.id === el.dataset.id), c = 50 + st().lvl * 10; if (!G.pay(c)) return U.toast('Pas assez de cash.', true); m.mood = Math.min(100, m.mood + 20); say(m.id, `Un petit cadeau à ${prof(m.id).name} : +20 de moral.`); refresh(); },
    agKeep(el) {
      const a = ag(), o = a.offer, m = o && a.crew.find(x => x.id === o.id); if (!m) { a.offer = null; return refresh(); }
      if (el.dataset.how === 'prime') { if (!G.pay(o.prime)) return U.toast('Pas assez de cash.', true); m.mood = Math.min(100, m.mood + 30); }
      else { m.pct = Math.max(.2, m.pct - .15); m.mood = Math.min(100, m.mood + 25); m.shareLock = now() + 12 * 3600000; }   // promesse tenue 12 h
      a.offer = null; say(m.id, `${prof(m.id).name} reste chez toi.`); refresh();
    },
    agLetGo() { const a = ag(), o = a.offer; a.crew = a.crew.filter(x => x.id !== o.id); a.crew.forEach(x => { if (x.act && x.act.with === o.id) x.act = null; }); a.offer = null; U.toast(`${prof(o.id).name} est partie chez la concurrence.`); refresh(); },
    agSlots() { const a = ag(), nx = A.slots[a.slots + 1]; if (!nx) return; if (!G.pay(nx.cost)) return U.toast('Pas assez de cash.', true); a.slots++; U.sfx.win(); U.toast(`Ton agence peut maintenant gérer ${nx.n} créatrices.`); refresh(); }
  };
  U.register(act);
  function refresh() { U.refresh(); }

  // ------------------------------------------------------------ l'écran (app du téléphone)
  function body() {
    const s = st();
    if (!unlocked()) return `<div class="ag-lock">${U.has('app-agence') ? `<img class="ag-lock-ic" src="${U.src('app-agence')}" alt="">` : '📸'}<b>PrivéFans</b><p>Deviens manager de créatrices de contenu : tu les recrutes, tu organises leur semaine, et tu touches ta part de leurs abonnements.</p><div class="explain center">${U.ico('icon-lock', '🔒')} Débloqué au niveau ${A.lvl}</div></div>`;
    sim();
    if (solo() && !ag().crew.length) return `<div class="ag-lock">${U.has('app-agence') ? `<img class="ag-lock-ic" src="${U.src('app-agence')}" alt="">` : '📸'}<b>Ta page PrivéFans</b><p>Lance ta page de créatrice : tes fans s'abonnent, tu postes du contenu, et tu gardes tout… sauf les 20 % de la plateforme.</p></div>
      <h3 class="sec">Choisis ta spécialité</h3><div class="ag-niches">${NICHES.map(n => `<button class="ag-niche" data-act="agStart" data-n="${n}">${U.has('niche-' + nslug(n)) ? `<img src="${U.src('niche-' + nslug(n))}" alt="">` : ''}<b>${n}</b></button>`).join('')}</div>
      <p class="hint-line">Ta spécialité compte : certaines tenues et certains objets rapportent deux fois plus quand ils collent à ta niche.</p>`;
    const a = ag(), pend = a.crew.reduce((x, m) => x + (m.pend || 0), 0), hourly = a.crew.reduce((x, m) => x + perHour(m), 0);
    const offer = a.offer && prof(a.offer.id);
    const head = solo() ? `<div class="card ag-head"><div class="grow"><small>Tes gains en attente</small><b>${U.short(pend)}</b><small>≈ ${U.short(hourly)} par heure · la plateforme garde ${Math.round((1 - a.crew[0].pct) * 100)} %</small></div>
      <button class="btn green" data-act="agCollect" ${pend >= 1 ? '' : 'disabled'}>Encaisser</button></div>` : `<div class="card ag-head"><div class="grow"><small>Ta commission en attente</small><b>${U.short(pend)}</b><small>≈ ${U.short(hourly)} par heure · ${a.crew.length} / ${slotsN()} créatrice${slotsN() > 1 ? 's' : ''}</small></div>
      <button class="btn green" data-act="agCollect" ${pend >= 1 ? '' : 'disabled'}>Encaisser</button></div>`;
    const off = offer ? `<div class="card ag-offer"><b>${U.ico('app-msg', '📩')} ${offer.name} hésite à partir</b><p>${a.offer.unhappy ? 'Elle n\'a plus le moral, et une agence rivale lui propose mieux.' : 'Son moral n\'est pas au top, et une agence rivale lui propose un contrat.'} Que fais-tu ?</p>
      <div class="ag-btns"><button class="btn gold sm" data-act="agKeep" data-how="prime">Prime de ${U.short(a.offer.prime)}</button><button class="btn blue sm" data-act="agKeep" data-how="share">Baisser ta part (−15 %)</button><button class="btn red sm" data-act="agLetGo">La laisser partir</button></div></div>` : '';
    const crew = a.crew.map(m => {
      const p = prof(m.id), x = m.act && A.acts.find(o => o.id === m.act.k), left = m.act ? m.act.start + m.act.dur - now() : 0;
      return `<div class="card ag-cr"><div class="ag-top">${face(p)}<div class="grow"><b>${p.name}</b><small>${p.niche} · <strong>${fmtSubs(m.subs)}</strong> abonnés</small>
          <div class="ag-mood"><span>${p.me ? 'Énergie' : 'Moral'}</span><div class="kh-bar"><i style="width:${Math.round(m.mood)}%;background:${m.mood < 30 ? '#e63946' : m.mood < 60 ? '#f2b01e' : '#3ddc84'}"></i></div></div>
          ${p.me ? '' : `<button class="ag-gift" data-act="agGift" data-id="${m.id}" ${s.cash >= 50 + s.lvl * 10 && m.mood < 100 ? '' : 'disabled'}>${U.ic('gift')}<span>Lui offrir un cadeau <b>+20 de moral</b></span><em>${U.short(50 + s.lvl * 10)}</em></button><button class="ag-fire" data-act="agFireAsk" data-id="${m.id}">Renvoyer</button>`}</div>
          <div class="ag-earn"><small>Pour toi</small><b>${U.short(perHour(m))}/h</b></div></div>
        ${p.me ? '' : `<div class="ag-share"><div class="sh-title">Ta part sur ses gains <small>plus tu prends, plus son moral baisse</small></div><div class="sh-opts">${A.shares.map(v => { const d = Math.round((v - .2) * 20);
          return `<button class="sh-opt ${m.pct === v ? 'on' : ''}" data-act="agShare" data-id="${m.id}" data-v="${v}"><b>${Math.round(v * 100)} %</b><span class="g-up">≈ ${U.short(perHour({ ...m, pct: v }))}/h pour toi</span><span class="${d ? 'g-down' : 'g-up'}">${d ? `moral −${d}/h` : 'moral stable'}</span></button>`; }).join('')}</div></div>`}
        ${(() => { const n = A.gear.filter(g => hasG(m, g)).length, open = gearOpen.has(m.id);
          return `<button class="ag-gear-btn" data-act="agGearOpen" data-id="${m.id}">${U.has('gear-gown') ? `<img class="ico" src="${U.src('gear-gown')}" alt="">` : ''} ${p.me ? 'Tes affaires' : 'Ses affaires'} · ${n}/${A.gear.length}${gearK(m, 'rev') ? ` · revenus +${Math.round(gearK(m, 'rev') * 100)} %` : ''} <i>${open ? '▾' : '▸'}</i></button>
          ${open ? `<div class="ag-gear">${A.gear.slice().sort((g1, g2) => (g1.sub ? 1e9 : g1.cost) - (g2.sub ? 1e9 : g2.cost)).map(g => { const own = hasG(m, g), fit = g.niche && g.niche.includes(p.niche), k = fit ? 2 : 1;
            const fx = [g.rev ? `<span class="gx rev">${U.ico('icon-cash', '💰')} +${Math.round(g.rev * k * 100)} % de revenus<small>≈ +${U.short(Math.max(1, Math.round(perHour(m) / (1 + gearK(m, 'rev')) * g.rev * k)))}/h pour toi</small></span>` : '',
              g.subs ? `<span class="gx subs">${U.ico('ic-subs', '👥')} +${Math.round(g.subs * k * 100)} % d'abonnés<small>ils montent plus vite</small></span>` : '',
              g.mood ? `<span class="gx mood">${U.ico('ic-mood', '😊')} +${g.mood * k} ${p.me ? 'd\'énergie' : 'de moral'}<small>chaque heure, toute seule</small></span>` : ''].join('');
            return `<div class="ag-g ${own ? 'own' : ''} ${fit ? 'fit' : ''}">${fit ? `<span class="gfit">${p.me ? 'Ta' : 'Sa'} spécialité : effet ×2</span>` : ''}<span class="gpic">${U.has('gear-' + g.id) ? `<img src="${U.src('gear-' + g.id)}" alt="">` : g.icon}</span>
              <b>${g.name}</b><div class="gfx">${fx}</div>${g.sub ? (own ? `<span class="gown">✓ Abonnée · prochain paiement dans ${Math.max(1, Math.round((m.abo[g.id] - Date.now()) / 3600000))} h</span><button class="btn xs red" data-act="agAbo" data-id="${m.id}" data-g="${g.id}">Résilier</button>`
                : `<button class="btn xs green" data-act="agAbo" data-id="${m.id}" data-g="${g.id}" ${s.cash >= g.cost ? '' : 'disabled'}>S'abonner · ${U.short(g.cost)}/jour</button>`)
              : own ? '<span class="gown">✓ Possédé</span>' : `<button class="btn xs green" data-act="agGear" data-id="${m.id}" data-g="${g.id}" ${s.cash >= g.cost ? '' : 'disabled'}>${U.short(g.cost)}</button>`}</div>`; }).join('')}</div>` : ''}`; })()}
        ${m.act ? `<div class="ag-busy"><span class="bz-ic">${actIc(x)}</span><div class="bz-txt"><b>${x.name}${m.act.with ? ` avec ${prof(m.act.with).name}` : ''}</b><small>fini dans <strong>${U.mmss(left)}</strong></small>${actGain(m, x).replace('ag-gain', 'ag-gain bz-gain')}</div>
            <button class="btn xs gold bz-rush" data-act="agRush" data-id="${m.id}" ${s.lingots >= rushCost(left) ? '' : 'disabled'}>Finir ${U.ic('lingot')}${rushCost(left)}</button></div>`
          : `<div class="ag-acts">${A.acts.slice().sort((a1, a2) => (lockedDuo(m, a1) ? 1 : 0) - (lockedDuo(m, a2) ? 1 : 0)).map(o => { const locked = lockedDuo(m, o), noDuo = !locked && o.duo && !p.me && !ag().crew.some(c => c.id !== m.id && !c.act), lvlLock = o.lvl && s.lvl < o.lvl;
            const dur = `${o.min < 60 ? o.min + ' min' : o.min / 60 + ' h'}${o.cost ? ` · ${U.short(o.cost)}` : ''}`;
            const btn = locked ? `<span class="act-lock">${U.ic('lock')}</span>` : `<button class="btn xs green act-go" data-act="agAct" data-id="${m.id}" data-k="${o.id}" ${lvlLock || noDuo || (o.cost && s.cash < o.cost) ? 'disabled' : ''}>Lancer</button>`;
            return `<div class="ag-act ${locked || noDuo || lvlLock ? 'need' : ''}"><span>${actIc(o)}</span><b>${o.name}</b><small>${locked ? 'Agrandis ton agence pour la débloquer' : lvlLock ? `Niveau ${o.lvl}` : noDuo ? 'Il faut 2 créatrices libres' : dur}</small>${locked || noDuo || lvlLock ? '<em class="ag-gain"></em>' : actGain(m, o)}${btn}</div>`; }).join('')}</div>`}
      </div>`;
    }).join('');
    const cand = a.crew.length < slotsN() ? `<h3 class="sec">Elles cherchent une agence</h3><div class="ag-cands">${candidates().map(c => `<div class="card ag-cand">${face(c, 'big')}<b>${c.name}</b><small>${c.niche} · ${fmtSubs(c.subs)} abonnés</small><p>${c.desc}</p>
        <div class="ag-stats">${[['Charme', c.cha, 'abonnés qui montent vite'], ['Sérieux', c.reg, 'revenu régulier'], ['Drama', c.drama, 'buzz et bad buzz']].map(([k, v, t]) => `<div class="st-row"><em>${k}</em><span class="st-bar">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span><small>${t}</small></div>`).join('')}</div>
        <button class="btn green xs" data-act="agRecruit" data-id="${c.id}" ${s.cash >= recruitCost(c) ? '' : 'disabled'}>Recruter · ${U.short(recruitCost(c))}</button></div>`).join('')}</div>
` : '';
    const nx = A.slots[a.slots + 1];
    const grow = nx ? `<div class="card ag-grow"><div class="grow"><b>Agrandir l'agence</b><small>Gérer ${nx.n} créatrices en même temps</small></div><button class="btn sm ${s.cash >= nx.cost ? 'green' : ''}" data-act="agSlots" ${s.cash >= nx.cost ? '' : 'disabled'}>${U.short(nx.cost)}</button></div>` : '';
    // ta part et son moral : la phrase d'explication mise en image, petite part contre grosse part
    const how = `<div class="price-explain ag-how"><small class="pe-title">Ta part et son moral</small>
      <div class="ag-vs"><div class="vs-col"><b>Petite part</b><span class="g-down">▼ tu gagnes moins</span><span class="g-up">▲ son moral reste haut</span><span class="g-up">▲ elle gagne bien</span><span class="g-up">✓ elle reste chez toi</span></div>
        <div class="vs-col"><b>Grosse part</b><span class="g-up">▲ tu gagnes plus</span><span class="g-down">▼ son moral baisse</span><span class="g-down">▼ elle gagne moins</span><span class="g-down">✗ un rival peut te la piquer</span></div></div>
      <small class="pe-foot">Trouve le bon équilibre, et remonte son moral avec un cadeau ou du repos.</small></div>`;
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
  // reconversion (le joueur change de look homme ↔ femme) : on encaisse ce qui est en attente, puis le PrivéFans repart de zéro dans l'autre mode
  function reconvert() {
    if (!st().agence) return 0;
    try { sim(); } catch (e) {}
    const n = Math.floor(st().agence.crew.reduce((x, m) => x + (m.pend || 0), 0));
    if (n > 0) G.addCash(n);
    st().agence = null; G.save(); return n;
  }
  window.AGENCE = { open, sim, choose, reconvert, pending: () => st() && st().agence ? st().agence.crew.reduce((x, m) => x + (m.pend || 0), 0) : 0, offer: () => st() && st().agence && st().agence.offer, unlocked };
})();
