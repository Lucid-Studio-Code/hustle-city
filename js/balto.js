/* Hustle City : Le Royal (paris sportifs + tickets à gratter), version visuelle :
   écussons des équipes, chances de chaque issue, terrain animé pendant le direct, « BUT ! », ticket papier. */
(function () {
  'use strict';
  const D = window.DATA, G = window.GAME, U = window.UI;
  const st = () => G.st;
  let tab = 'bets', sport = 'all', slip = [], stake = 10, useFree = false;
  const fmtOdd = o => o.toFixed(2).replace('.', ',');

  // ------------------------------------------------------------ score en direct
  function liveScore(m) {
    if (m.state === 'soon') return null;
    const f = Math.min(1, (Date.now() - m.kickoff) / (D.MATCH.liveS * 1000));
    if (m.sport === 'foot') {
      const min = Math.round(f * 90); let a = 0, b = 0;
      m.goals.forEach(([t, side]) => { if (t <= min) side ? b++ : a++; });
      return { a, b, clock: m.state === 'done' ? 'Terminé' : `${min}'`, f };
    }
    if (m.state === 'done') return { a: m.sh, b: m.sa, clock: 'Terminé', f: 1 };
    if (m.sport === 'basket') return { a: Math.round(m.sh * f), b: Math.round(m.sa * f), clock: `Q${Math.min(4, 1 + Math.floor(f * 4))}`, f };
    // tennis : les sets tombent au fil du match
    const sets = Math.floor(f * (m.sh + m.sa)), order = [];
    for (let i = 0; i < m.sh + m.sa; i++) order.push(i < Math.min(m.sh, m.sa) * 2 ? i % 2 : (m.sh > m.sa ? 0 : 1));
    let a = 0, b = 0; order.slice(0, sets).forEach(x => x ? b++ : a++);
    return { a, b, clock: `Set ${Math.min(3, sets + 1)}`, f };
  }
  // nom court pour les boutons de cote : « Racing Kebab » → « Kebab », « K. Moreau » → « Moreau »
  const shortName = n => n.replace(/^(FC|AS|US|Les|Le|La|Stade|Racing|Sporting|Real|Inter|Dynamo|Atlético|Olympique|Street|Cité|Downtown|Asphalt|[A-Z]\.)\s+/, '');
  const labels = m => m.sport === 'foot' ? ['1', 'N', '2'] : ['1', '2'];
  const crest = (m, side, cls) => U.teamCrest(m.sport, U.teamIdx(m.sport, side ? m.away : m.home), cls);
  const pickName = (m, p) => labels(m)[p] === 'N' ? 'Match nul' : labels(m)[p] === '1' ? m.home : m.away;

  // « BUT ! » : on retient le dernier score vu de chaque match
  const seen = {}, flash = {}, flashSide = {}, ended = {}, wasLive = new Set();
  const justEnded = m => ended[m.id] && Date.now() - ended[m.id] < 8000;   // le coup de sifflet final reste affiché 8 s, à sa place
  function checkGoals() {
    st().matches.forEach(m => { if (m.state === 'live') wasLive.add(m.id); else if (m.state === 'done' && wasLive.has(m.id)) { wasLive.delete(m.id); ended[m.id] = Date.now(); } });
    const mine = new Set(st().bets.filter(b => b.state === 'open').flatMap(b => b.legs.map(l => l.m)));
    st().matches.filter(m => m.state === 'live').forEach(m => {
      const sc = liveScore(m), prev = seen[m.id];
      seen[m.id] = { a: sc.a, b: sc.b };
      if (!prev || sc.a + sc.b <= prev.a + prev.b) return;
      // tout point marqué (foot, basket, tennis) envoie le ballon dans le bon camp
      // si les deux équipes ont marqué depuis le dernier coup d'œil (fréquent au basket), le ballon va chez celle qui a marqué le plus, sinon on alterne
      const da = sc.a - prev.a, db = sc.b - prev.b;
      flash[m.id] = Date.now(); flashSide[m.id] = da > db ? 'r' : db > da ? 'l' : (flashSide[m.id] === 'r' ? 'l' : 'r');
      if (m.sport !== 'foot') return;
      const who = sc.a > prev.a ? m.home : m.away;
      if (mine.has(m.id)) { U.sfx.goal(); U.toast(`⚽ BUT pour ${who} ! ${m.home} ${sc.a} - ${sc.b} ${m.away}`, false, 'mybets'); }
    });
  }
  setInterval(checkGoals, 1000);

  // tuyau du Kiosque sur un match : affiché là où on parie, pour ne pas avoir à le retenir
  const sportTip = () => { const k = st().kiosk, t = k && k.tips && k.tips.sport; return t && t.m && G.match(t.m) ? t : null; };

  // ------------------------------------------------------------ cartes de match
  function pitch(m, sc) {
    // pendant un « BUT ! », le ballon part du centre et finit dans le but (l'équipe de gauche marque à droite)
    const g = flash[m.id] && Date.now() - flash[m.id] < 2500, t = g ? Math.min(1100, Date.now() - flash[m.id]) : Date.now() % 7000;
    return `<div class="pitch ${m.sport}"><i class="pl-line"></i><i class="pl-circle"></i><i class="pl-goal l ${g && t >= 1000 && flashSide[m.id] === 'l' ? 'hit' : ''}"></i><i class="pl-goal r ${g && t >= 1000 && flashSide[m.id] === 'r' ? 'hit' : ''}"></i>
      <i class="pl-ball ${g ? 'goal-' + flashSide[m.id] : ''}" style="animation-delay:-${t}ms"></i><span class="pl-clock">${sc.clock}</span>
      <i class="pl-prog" style="width:${Math.round(sc.f * 100)}%"></i></div>`;
  }
  function chances(m) {
    const cols = ['#3ddc84', '#ffd23f', '#4fb3f0'], p = m.p.length === 3 ? m.p : [m.p[0], 0, m.p[1]];
    return `<div class="chances"><div class="ch-bar">${p.map((x, i) => x ? `<i style="width:${x * 100}%;background:${cols[i]}"></i>` : '').join('')}</div>
      <div class="ch-lbl"><span>${Math.round(p[0] * 100)} %</span>${m.p.length === 3 ? `<span>Nul ${Math.round(p[1] * 100)} %</span>` : ''}<span>${Math.round(p[2] * 100)} %</span></div></div>`;
  }
  function matchCard(m) {
    const sp = D.SPORTS[m.sport], sc = liveScore(m), soon = m.state === 'soon', live = m.state === 'live', done = m.state === 'done';
    const sel = slip.find(l => l.m === m.id), boost = G.evOn('boost');
    const goal = m.sport === 'foot' && flash[m.id] && Date.now() - flash[m.id] < 2500;   // le « BUT ! » n'existe qu'au foot
    const win = done ? m.res : null;
    const mine = soon && G.betOn(m.id), myLeg = mine && st().bets.find(b => b.state === 'open' && b.legs.some(l => l.m === m.id)).legs.find(l => l.m === m.id);
    const oddBtns = mine ? `<div class="bet-placed">${U.ic('check')} Tu as parié : <b>${pickName(m, myLeg.pick)}</b></div>` : soon ? `<div class="odds n${m.odds.length}">${m.odds.map((o, i) => `<button class="odd-btn ${sel && sel.pick === i ? 'sel' : ''}" data-act="bPick" data-m="${m.id}" data-p="${i}">
        ${labels(m)[i] === 'N' ? '<i class="ob-nul">=</i>' : crest(m, labels(m)[i] === '2', 'mini')}
        <span class="ob-txt"><small>${labels(m)[i] === 'N' ? 'Match nul' : shortName(labels(m)[i] === '1' ? m.home : m.away)}</small><b>${boost ? `<s>${fmtOdd(o)}</s>` : ''}${fmtOdd(G.legOdd(m, i))}</b></span></button>`).join('')}</div>` : '';
    return `<div class="mcard ${m.state} sp-${m.sport} ${goal ? 'goal' : ''} ${done && justEnded(m) ? 'ended' : ''} ${sel ? 'picked' : ''}">
      <div class="mc-top"><span class="mc-league">${sp.icon} ${sp.league}</span>
        <span class="mc-time ${live ? 'live' : ''}">${soon ? `Coup d'envoi ${U.mmss(m.kickoff - Date.now())}` : live ? `<i class="dot"></i>EN DIRECT` : 'Terminé'}</span></div>
      <div class="mc-mid">
        <div class="mc-team ${win === 0 ? 'won' : ''}">${crest(m, 0)}<b>${m.home}</b></div>
        <div class="mc-vs">${sc ? `<span class="mc-score">${sc.a}<i>-</i>${sc.b}</span>` : '<span class="mc-vsb">VS</span>'}</div>
        <div class="mc-team ${win === (m.sport === 'foot' ? 2 : 1) ? 'won' : ''}">${crest(m, 1)}<b>${m.away}</b></div>
      </div>
      ${live ? pitch(m, sc) : ''}
      ${soon ? chances(m) + oddBtns : ''}
      ${done ? `<p class="mc-res">${m.res === 1 && m.sport === 'foot' ? 'Match nul' : `Victoire ${U.de(m.res === 0 ? m.home : m.away)}`}</p>` : ''}
      ${sportTip() && sportTip().m === m.id ? `<div class="mc-tip">📰 <b>Ton tuyau du Kiosque :</b> « ${U.esc(sportTip().txt)} »</div>` : ''}
      ${goal ? '<div class="goal-flash stroke">BUT !</div>' : ''}
      ${done && justEnded(m) ? `<div class="end-flash" style="--ago:-${Date.now() - ended[m.id]}ms"><span class="ef-t stroke">TERMINÉ</span><span class="ef-sc stroke">${sc ? `${sc.a} - ${sc.b}` : ''}</span><span class="ef-w">${m.res === 1 && m.sport === 'foot' ? 'Match nul' : `Victoire ${U.de(m.res === 0 ? m.home : m.away)}`}</span></div>` : ''}
    </div>`;
  }

  // ------------------------------------------------------------ le ticket (collé en bas de la fenêtre)
  // toujours le BÉNÉFICE en gros ; avec ses propres billets, on précise ce qu'on récupère au total (mise comprise).
  // Un pari offert : la mise n'est pas rendue (comme en vrai), donc bénéfice = mise × (cote − 1).
  function gainTxt(amt, odds, free) {
    const profit = amt * (odds - 1);
    return `<em class="tk-amt">+${U.eur(profit)}</em><small class="tk-tot">${free ? 'pari offert : la mise n\'est pas rendue' : `tu récupères ${U.eur(amt * odds)} (ta mise + le gain)`}</small>`;
  }
  function slipHtml() {
    if (!slip.length) return '';
    // on ne peut pas miser plus que la mise max, ni plus que ce qu'on a en poche
    const s = st(), max = Math.min(G.betMax(), Math.floor(s.cash)), free = useFree && s.freebets.length, broke = !free && max < 1;
    const odds = slip.reduce((o, l) => o * G.legOdd(G.match(l.m), l.pick), 1);
    const amt = free ? s.freebets[0] : Math.max(0, Math.min(stake, max));
    const gain = free ? amt * (odds - 1) : amt * odds;
    const legs = slip.map(l => { const m = G.match(l.m); return `<div class="tk-leg">${labels(m)[l.pick] === 'N' ? '<i class="ob-nul">=</i>' : crest(m, labels(m)[l.pick] === '2', 'mini')}<span><b>${pickName(m, l.pick)}</b><small>${m.home} – ${m.away}</small></span><em>${fmtOdd(G.legOdd(m, l.pick))}</em><button class="tk-x" data-act="bPick" data-m="${m.id}" data-p="${l.pick}" aria-label="Retirer">×</button></div>`; }).join('');
    return `<div class="ticket-slip">
      <div class="tk-head"><b>LE ROYAL</b><span>${slip.length > 1 ? `Combiné ×${slip.length}` : 'Pari simple'}</span><button class="tk-clear" data-act="bClear">Vider</button></div>
      <div class="tk-legs">${legs}</div>
      <div class="tk-row"><span>Cote totale</span><b>${fmtOdd(odds)}</b></div>
      ${s.freebets.length ? `<label class="tk-free"><input type="checkbox" id="b-free" ${free ? 'checked' : ''}> Utiliser mon pari gratuit de ${s.freebets[0]}<i class="cur"></i></label>` : ''}
      ${free ? '' : broke ? `<p class="tk-broke">💸 Tu es à sec : plus un billet en poche pour miser.</p>` : `<div class="tk-stake"><input class="amt" id="b-stake" type="number" inputmode="numeric" min="1" max="${max}" value="${amt || 1}">
        <div class="seg">${[5, 10, 20, 50].filter(v => v < max).map(v => `<button class="btn xs ${stake === v ? 'yellow' : 'blue'}" data-act="bStake" data-v="${v}">${v}</button>`).join('')}<button class="btn xs ${stake >= max ? 'yellow' : 'blue'}" data-act="bStake" data-v="${max}">Max</button></div></div>`}
      <div class="tk-gain"><span>Si tu gagnes</span><b id="b-gain">${gainTxt(broke ? 0 : amt, odds, free)}</b></div>
      <button class="btn green wide" data-act="bPlace" ${broke ? 'disabled' : ''}>${broke ? 'À sec' : 'Valider le ticket'}</button>
      ${slip.length > 1 ? '<p class="tk-note">Un seul prono raté et tout le combiné est perdu.</p>' : ''}
    </div>`;
  }
  function sportsBar() {
    const s = st();
    return `<div class="sport-bar">${[['all', '🏟️', 'Tout']].concat(Object.entries(D.SPORTS).map(([k, x]) => [k, x.icon, x.name])).map(([k, i, n]) => {
      const lock = k !== 'all' && s.lvl < D.SPORTS[k].lvl;
      return `<button class="sp-chip ${sport === k ? 'on' : ''} ${lock ? 'locked' : ''}" data-act="${lock ? 'bLocked' : 'bSport'}" data-id="${k}"><span>${i}</span>${lock ? `Niv. ${D.SPORTS[k].lvl}` : n}</button>`;
    }).join('')}</div>`;
  }
  function betsBody() {
    slip = slip.filter(l => { const m = G.match(l.m); return m && m.state === 'soon'; });
    const s = st(), ok = m => sport === 'all' || m.sport === sport;
    const tip = sportTip(), tm = tip && G.match(tip.m);
    const up = s.matches.filter(m => (m.state !== 'done' || justEnded(m)) && (ok(m) || (tm && m.id === tm.id))).sort((a, b) => (tm && b.id === tm.id) - (tm && a.id === tm.id) || a.kickoff - b.kickoff);
    const done = s.matches.filter(m => m.state === 'done' && !justEnded(m) && ok(m)).slice(-3).reverse();
    return `${sportsBar()}
      ${tm && tm.state !== 'done' ? `<div class="tip-banner">📰 <span><b>Tuyau : ${tm.home} – ${tm.away}</b>${tm.state === 'soon' ? `coup d'envoi dans ${U.mmss(tm.kickoff - Date.now())}` : 'en direct'} · le match est en haut de la liste</span></div>` : ''}
      <p class="hint-line">Les cotes viennent des vraies chances de chaque équipe, moins la marge du Royal (7 %). Mise max : <b>${G.betMax()}<i class="cur"></i></b>${G.habitOn('drink') ? ' (+30 % de culot 🍺)' : ''}.${s.lvl < D.COMBI_LVL ? ` Combinés au niveau ${D.COMBI_LVL}.` : ' Coche plusieurs matchs pour un combiné.'}</p>
      ${up.map(matchCard).join('') || '<p class="hint-line center">Pas de match pour ce sport en ce moment.</p>'}
      ${done.length ? `<h3 class="sec">Derniers résultats</h3>${done.map(matchCard).join('')}` : ''}
      ${slipHtml()}`;
  }

  // ------------------------------------------------------------ grattage : voir js/scratch.js (présentoir, tickets, grattage case par case)
  const scratchBody = () => window.SCRATCH_UI.body();
  const initScratch = () => requestAnimationFrame(() => window.SCRATCH_UI.init());

  // ------------------------------------------------------------ mes paris : les tickets, tamponnés
  function myBetsBody() {
    const s = st();
    if (!s.bets.length) return '<p class="hint-line center">Aucun pari pour l\'instant. Direction le Royal !</p>';
    const closed = s.bets.filter(b => b.state !== 'open');
    const won = closed.filter(b => b.state === 'won').reduce((a, b) => a + b.gain, 0), staked = closed.filter(b => !b.free).reduce((a, b) => a + b.stake, 0);
    return (closed.length ? `<div class="card center bilan"><div class="muted">Bilan de tes ${closed.length} derniers tickets</div><div class="big ${won - staked >= 0 ? 'up' : 'down'}">${won - staked >= 0 ? '+' : ''}${U.eur(won - staked)}</div><p>Misé ${U.eur(staked)} · gagné ${U.eur(won)}</p></div>` : '') +
      s.bets.map(b => {
        const legs = b.legs.map(l => {
          // match encore au programme, sinon la copie gardée dans le ticket (nom des équipes, score final)
          const m = G.match(l.m) || (l.home ? { sport: l.sport, home: l.home, away: l.away, state: l.res != null ? 'done' : 'gone', sh: l.sh, sa: l.sa, res: l.res } : null);
          if (!m) return `<div class="tk-leg"><span><b>Prono ${['1', 'N', '2'][l.pick] || ''}</b><small>Ancien ticket, détail du match perdu</small></span><em>${fmtOdd(l.odd)}</em></div>`;
          const sc = m.state === 'done' ? { a: m.sh, b: m.sa } : m.state === 'gone' ? null : liveScore(m), ok = m.state === 'done' ? m.res === l.pick : null;
          const result = m.state === 'done' ? (m.sport === 'foot' && m.res === 1 ? 'Match nul' : `${m.res === 0 ? m.home : m.away} gagne`) : '';
          return `<div class="tk-leg ${ok === true ? 'ok' : ok === false ? 'ko' : ''}">${labels(m)[l.pick] === 'N' ? '<i class="ob-nul">=</i>' : crest(m, labels(m)[l.pick] === '2', 'mini')}
            <span><b>Ton prono : ${pickName(m, l.pick)}</b><small>${m.home} <strong>${sc ? `${sc.a} - ${sc.b}` : 'vs'}</strong> ${m.away}${m.state === 'live' ? ' · en direct' : m.state === 'soon' ? ' · pas commencé' : ''}</small>${result ? `<small class="tk-res">${ok ? '✓' : '✗'} Résultat : ${result}</small>` : ''}</span><em>${fmtOdd(l.odd)}</em></div>`;
        }).join('');
        return `<div class="ticket-slip mine ${b.state}"><div class="tk-head"><b>LE ROYAL</b><span>${b.legs.length > 1 ? `Combiné ×${b.legs.length}` : 'Simple'}${b.free ? ' · gratuit' : ''}${b.boosted ? ' · boosté' : ''}</span></div>
          <div class="tk-legs">${legs}</div>
          <div class="tk-row"><span>Mise ${U.eur(b.stake)} · cote ${fmtOdd(b.odds)}</span><b>${b.state === 'won' ? `+${U.eur(b.gain)}` : b.state === 'lost' ? `−${U.eur(b.free ? 0 : b.stake)}` : `${U.eur(b.stake * (b.free ? b.odds - 1 : b.odds))} possible`}</b></div>
          ${b.state !== 'open' ? `<span class="stamp">${b.state === 'won' ? 'GAGNÉ' : 'PERDU'}</span>` : '<span class="stamp live">EN COURS</span>'}</div>`;
      }).join('');
  }

  // ------------------------------------------------------------ fenêtre
  // le bar-tabac : c'est ici qu'on prend (ou qu'on arrête) ses habitudes de fumer et de boire
  function barBody() { return `<div class="bar-hero">${U.pic('bld-balto', '🍺')}<p>Au comptoir, Jojo le patron sert les cafés, les demis et les paquets de clopes. Les habitués ont leurs petites manies…</p></div>` + U.habitsBody('balto'); }
  function body() { return tab === 'bets' ? betsBody() : tab === 'scratch' ? scratchBody() : tab === 'bar' ? barBody() : myBetsBody(); }
  function open(t) {
    if (t) tab = t;
    U.openModal({
      title: 'Le Royal', icon: 'bld-balto', full: true,
      tabs: [{ id: 'bets', label: 'Paris' }, { id: 'scratch', label: 'Grattage' }, { id: 'mine', label: 'Mes paris' }, { id: 'bar', label: 'Le bar' }], tab,
      body: body(), onTab: id => { tab = id; U.setBody(body()); if (tab === 'scratch') initScratch(); },
      refresh: () => { if (tab !== 'scratch') U.setBody(body()); },
      onClose: () => window.SCRATCH_UI.close()
    });
    if (tab === 'scratch') initScratch();
  }

  U.register({
    bPick(el) {
      const m = +el.dataset.m, p = +el.dataset.p, i = slip.findIndex(l => l.m === m);
      if (i >= 0 && slip[i].pick === p) slip.splice(i, 1);
      else if (i >= 0) slip[i].pick = p;
      else { if (slip.length && st().lvl < D.COMBI_LVL) slip = []; if (slip.length >= 6) return U.toast('6 matchs maximum dans un combiné.', true); slip.push({ m, pick: p }); }
      U.sfx.tap(); U.setBody(body());
      if (slip.length) { const t = document.querySelector('.ticket-slip'); if (t) t.classList.add('bump'); }
    },
    bClear() { slip = []; U.setBody(body()); },
    bStake(el) { stake = +el.dataset.v; U.setBody(body()); },
    bSport(el) { sport = el.dataset.id; U.setBody(body()); },
    bLocked() {},
    bPlace(el) {
      const free = useFree && st().freebets.length;
      if (!free) stake = parseInt(document.getElementById('b-stake').value, 10) || 0;
      const r = G.placeBet(slip, stake, free); if (r.err) return U.toast(r.err, true);
      U.sfx.coin();
      if (!free) U.floatTxt(`−${U.eur(stake)}`, null, null, true);
      slip = []; useFree = false; U.setBody(body()); U.refresh();
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'b-stake') { const v = parseInt(e.target.value, 10) || 0; stake = v; const odds = slip.reduce((o, l) => o * G.legOdd(G.match(l.m), l.pick), 1); const g = document.getElementById('b-gain'); if (g) g.innerHTML = gainTxt(Math.min(v, G.betMax(), Math.floor(st().cash)), odds, false); }
  });
  document.addEventListener('change', e => { if (e.target.id === 'b-free') { useFree = e.target.checked; U.setBody(body()); } });

  // ouvrir le Royal avec un pronostic déjà coché (tuyau d'un pote)
  function openWithPick(mid, p) { const m = G.match(mid); if (m && m.state === 'soon') slip = [{ m: mid, pick: p }]; tab = 'bets'; open('bets'); if (!m || m.state !== 'soon') U.toast('Trop tard : le match a déjà commencé.', true); }
  window.BALTO = { open, openWithPick, openMyBets: () => { U.openModal({ title: 'Mes paris', icon: 'ticket', full: true, body: myBetsBody(), refresh: () => U.setBody(myBetsBody()) }); } };
})();
