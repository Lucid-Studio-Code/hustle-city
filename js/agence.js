/* Hustle City : l'agence « PrivéFans » (app du téléphone + ring light dans l'appart)
   Tu recrutes des créatrices, tu organises leurs activités, tu touches ta part de leurs abonnements.
   Tout se calcule au temps réel (ça continue quand on n'est pas là). Réglages : AGENCE dans data.js. */
(function () {
  'use strict';
  const D = window.DATA, G = window.GAME, U = window.UI, A = D.AGENCE;
  const st = () => G.st, now = () => Date.now(), rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const prof = id => A.crew.find(c => c.id === id);
  const fmtSubs = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',') + ' k' : String(Math.round(n));
  const face = (c, cls = '') => U.has('cr-' + c.id) ? `<span class="pic cr-face ${cls}"><img src="${U.src('cr-' + c.id)}" alt=""></span>` : `<span class="cr-face emo ${cls}">${c.name[0]}</span>`;

  function ag() {
    const s = st();
    if (!s.agence) s.agence = { slots: 0, crew: [], cand: [], candAt: 0, nextEv: now() + rnd(...A.eventEvery) * 60000, offer: null };
    return s.agence;
  }
  const unlocked = () => st().lvl >= A.lvl;
  const slotsN = () => A.slots[ag().slots].n;
  const share = m => m.pct;
  const moodK = m => .5 + m.mood / 100 * .6;   // moral 0 → ×0,5 ; 100 → ×1,1
  const perHour = m => m.subs * A.subPrice * moodK(m) * (.8 + prof(m.id).reg * .05) * share(m);
  const recruitCost = c => Math.round(100 * Math.pow(c.cha, 1.5) + c.subs * .05);   // remboursée en ~1 journée de jeu

  // ------------------------------------------------------------ simulation (au temps réel)
  function sim() {
    if (!st() || !unlocked()) return;
    const a = ag(), t = now();
    a.crew.forEach(m => {
      const h = Math.min(48, (t - (m.last || t)) / 3600000); m.last = t; if (h <= 0) return;
      const p = prof(m.id);
      m.pend = Math.min((m.pend || 0) + perHour(m) * h, perHour(m) * A.payCapH);
      m.subs *= 1 + .004 * p.cha / 3 * moodK(m) * h;
      m.mood = Math.max(0, Math.min(100, m.mood - (share(m) - .2) * 20 * h));
      if (m.act && t >= m.act.start + m.act.dur) finishAct(m);
      if (m.mood < 15 && !a.offer) rivalOffer(m, true);
    });
    if (a.crew.length && t >= a.nextEv) { a.nextEv = t + rnd(...A.eventEvery) * 60000; randomEvent(); }
  }
  function finishAct(m) {
    const x = A.acts.find(o => o.id === m.act.k), p = prof(m.id), duo = m.act.with && ag().crew.find(o => o.id === m.act.with);
    const gain = m.subs * x.subs * (p.cha / 3);
    m.subs += gain; m.mood = Math.max(0, Math.min(100, m.mood + x.mood));
    let tips = 0; if (x.cash) { tips = Math.round(m.subs * x.cash * A.subPrice * 10 * share(m)); m.pend = (m.pend || 0) + tips; }
    if (duo) { duo.subs += duo.subs * x.subs * (prof(duo.id).cha / 3); duo.mood = Math.min(100, duo.mood + x.mood); duo.act = null; }
    m.act = null; G.stat('agActs');
    U.notify('agence', `${x.icon} ${p.name} a fini : ${x.name}`, `${gain >= 1 ? `+${fmtSubs(gain)} abonnés` : 'Elle a bien récupéré'}${tips ? ` et +${U.short(tips)} de pourboires pour toi` : ''}.`);
  }
  function randomEvent() {
    const a = ag(), m = pick(a.crew), p = prof(m.id), r = Math.random(), d = p.drama / 5;
    if (r < .35) { const k = rnd(.15, .35); m.subs *= 1 + k; U.notify('agence', `🔥 ${p.name} fait le buzz !`, `Une de ses vidéos explose : +${Math.round(k * 100)} % d'abonnés.`); }
    else if (r < .35 + .3 * d) { const k = rnd(.08, .18); m.subs *= 1 - k; m.mood = Math.max(0, m.mood - 10); U.notify('agence', `😬 Bad buzz pour ${p.name}`, `Une polémique sur les réseaux : −${Math.round(k * 100)} % d'abonnés. Un peu de repos lui ferait du bien.`); }
    else if (r < .35 + .3 * d + .2 * d && !a.offer) rivalOffer(m, false);
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
  const act = {
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
      if (x.duo) { duo = a.crew.find(o => o.id !== m.id && !o.act); if (!duo) return U.toast('Il faut une autre créatrice libre dans ton agence.', true); }
      if (x.cost && !G.pay(x.cost)) return U.toast('Pas assez de cash.', true);
      m.act = { k: x.id, start: now(), dur: x.min * 60000, with: duo && duo.id }; if (duo) duo.act = { k: x.id, start: now(), dur: x.min * 60000, with: m.id, guest: true };
      U.sfx.tap(); U.toast(`${x.icon} ${prof(m.id).name} : ${x.name}${duo ? ` avec ${prof(duo.id).name}` : ''}.`); refresh();
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
    const a = ag(), pend = a.crew.reduce((x, m) => x + (m.pend || 0), 0), hourly = a.crew.reduce((x, m) => x + perHour(m), 0);
    const offer = a.offer && prof(a.offer.id);
    const head = `<div class="card ag-head"><div class="grow"><small>Ta commission en attente</small><b>${U.short(pend)}</b><small>≈ ${U.short(hourly)} par heure · ${a.crew.length} / ${slotsN()} créatrice${slotsN() > 1 ? 's' : ''}</small></div>
      <button class="btn green" data-act="agCollect" ${pend >= 1 ? '' : 'disabled'}>Encaisser</button></div>`;
    const off = offer ? `<div class="card ag-offer"><b>📩 ${offer.name} hésite à partir</b><p>${a.offer.unhappy ? 'Elle n\'a plus le moral, et une agence rivale lui propose mieux.' : 'Une agence rivale lui propose un contrat.'} Que fais-tu ?</p>
      <div class="ag-btns"><button class="btn gold sm" data-act="agKeep" data-how="prime">Prime de ${U.short(a.offer.prime)}</button><button class="btn blue sm" data-act="agKeep" data-how="share">Baisser ta part (−15 %)</button><button class="btn red sm" data-act="agLetGo">La laisser partir</button></div></div>` : '';
    const crew = a.crew.map(m => {
      const p = prof(m.id), x = m.act && A.acts.find(o => o.id === m.act.k), left = m.act ? m.act.start + m.act.dur - now() : 0;
      return `<div class="card ag-cr"><div class="ag-top">${face(p)}<div class="grow"><b>${p.name}</b><small>${p.niche} · <strong>${fmtSubs(m.subs)}</strong> abonnés</small>
          <div class="ag-mood"><span>Moral</span><div class="kh-bar"><i style="width:${Math.round(m.mood)}%;background:${m.mood < 30 ? '#e63946' : m.mood < 60 ? '#f2b01e' : '#3ddc84'}"></i></div></div></div>
          <div class="ag-earn"><small>Pour toi</small><b>${U.short(perHour(m))}/h</b></div></div>
        <div class="ag-share"><span>Ta part</span>${A.shares.map(v => `<button class="btn xs ${m.pct === v ? 'yellow' : 'blue'}" data-act="agShare" data-id="${m.id}" data-v="${v}">${Math.round(v * 100)} %</button>`).join('')}<button class="btn xs purple" data-act="agGift" data-id="${m.id}">🎁 ${U.short(50 + s.lvl * 10)}</button></div>
        ${m.act ? `<div class="ag-busy">${x.icon} ${x.name}${m.act.with ? ` avec ${prof(m.act.with).name}` : ''} · fini dans <b>${U.mmss(left)}</b></div>`
          : `<div class="ag-acts">${A.acts.map(o => `<button class="ag-act" data-act="agAct" data-id="${m.id}" data-k="${o.id}" ${o.lvl && s.lvl < o.lvl ? 'disabled' : ''}><span>${o.icon}</span><b>${o.name}</b><small>${o.min < 60 ? o.min + ' min' : o.min / 60 + ' h'}${o.cost ? ` · ${U.short(o.cost)}` : ''}</small></button>`).join('')}</div>`}
      </div>`;
    }).join('');
    const cand = a.crew.length < slotsN() ? `<h3 class="sec">Elles cherchent une agence</h3><div class="ag-cands">${candidates().map(c => `<div class="card ag-cand">${face(c, 'big')}<b>${c.name}</b><small>${c.niche} · ${fmtSubs(c.subs)} abonnés</small><p>${c.desc}</p>
        <div class="ag-stats"><span title="Charisme">✨${'●'.repeat(c.cha)}</span><span title="Régularité">📅${'●'.repeat(c.reg)}</span><span title="Drama">🎭${'●'.repeat(c.drama)}</span></div>
        <button class="btn green xs" data-act="agRecruit" data-id="${c.id}" ${s.cash >= recruitCost(c) ? '' : 'disabled'}>Recruter · ${U.short(recruitCost(c))}</button></div>`).join('')}</div>
        <p class="hint-line">✨ Charisme : les abonnés montent plus vite. 📅 Régularité : revenu plus stable. 🎭 Drama : plus de bad buzz… et de buzz.</p>` : '';
    const nx = A.slots[a.slots + 1];
    const grow = nx ? `<div class="card ag-grow"><div class="grow"><b>Agrandir l'agence</b><small>Gérer ${nx.n} créatrices en même temps</small></div><button class="btn sm ${s.cash >= nx.cost ? 'green' : ''}" data-act="agSlots" ${s.cash >= nx.cost ? '' : 'disabled'}>${U.short(nx.cost)}</button></div>` : '';
    const how = `<p class="hint-line">Plus <b>ta part</b> est grosse, plus tu gagnes… mais plus leur <b>moral</b> baisse. Sans moral, elles gagnent moins, et une agence rivale peut te les piquer.</p>`;
    return head + off + (a.crew.length ? crew : '<div class="explain center">Ton agence est vide : recrute ta première créatrice.</div>') + cand + grow + how;
  }
  function open() { U.openModal({ title: 'PrivéFans', icon: 'star', full: true, body: body(), refresh: () => U.setBody(body()) }); }

  setInterval(() => { try { sim(); } catch (e) { console.error(e); } }, 5000);
  window.AGENCE = { open, sim, pending: () => st() && st().agence ? st().agence.crew.reduce((x, m) => x + (m.pend || 0), 0) : 0, offer: () => st() && st().agence && st().agence.offer, unlocked };
})();
