/* Hustle City · back office : l'onglet Statistiques (audience, rétention, sessions, progression, économie, argent, usage, répartition, SAV). */
(function () {
  'use strict';
  const HC = window.HC, { esc, img, fmt, cash, lingots, eur, pct, minTxt, flag, dlabel, delta } = HC;
  const OFFER_ICON = { 'l-50': 'icon-lingot', 'l-280': 'icon-lingot', 'l-600': 'icon-lingot', 'l-1300': 'icon-treasure', 'l-3500': 'icon-treasure', 'l-7500': 'icon-treasure',
    'x-start': 'gift-big', 'x-noads': 'ic-promo', 'x-pass': 'hdr-daily', 'x-collec': 'booster-pack', 'x-gold': 'skin-flambeur-bust', 'x-magnat': 'gift-open' };
  const bare = v => String(v).replace(/<i class="(cur|lgt|bst)"><\/i>/g, '');   // la grande icône de la carte dit déjà la monnaie
  HC.offerIcon = id => OFFER_ICON[id] || 'icon-treasure';
  const retColor = v => v == null ? '' : `background:hsl(${Math.round(260 - Math.min(1, v / 60) * 115)}, ${55 + Math.min(30, v / 2)}%, ${22 + Math.min(1, v / 60) * 20}%)`;
  const SECTIONS = [['audience', 'Audience', 'nav-city'], ['retention', 'Rétention', 'hdr-levelup'], ['sessions', 'Sessions et horaires', 'ev-xp'], ['progression', 'Progression', 'icon-star'],
    ['economie', 'Économie', 'icon-cash'], ['argent', 'Argent', 'icon-treasure'], ['usage', 'Ce qu\'ils font', 'icon-bolt'], ['repartition', 'Qui sont-ils', 'skin-doudoune-bust']];

  HC.PAGES.stats = async (P) => {
    const o = await HC.api('/admin/api/overview?days=' + HC.period); { const top = Math.min(o.levels.length, Math.max(5, ...o.levels.filter(l => l.n).map(l => l.lvl)) + 1); o.levels = o.levels.slice(0, top); o.churn = o.churn.slice(0, top); }
    const k = o.kpi, s = o.series, pv = o.prev, m = o.money, e = o.economy, lab = s.map(x => dlabel(x.d));
    const sumS = key => s.reduce((t, x) => t + x[key], 0);
    const stick = k.mau ? Math.round(k.avgDau / k.mau * 100) : 0;
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], hmax = Math.max(1, ...o.sessions.heat.flat());
    const busiest = (() => { let b = [0, 0, 0]; o.sessions.heat.forEach((r, d) => r.forEach((v, h) => { if (v > b[2]) b = [d, h, v]; })); return b; })();
    const lvAt = o.levels.filter(x => x.n), maxGone = Math.max(...o.churn.map(c => c.n));
    const worstLvl = o.churn.filter(c => c.n >= 3).sort((a, b) => b.rate - a.rate)[0];
    HC.main(`<div class="page-head"><div><h1>Statistiques</h1><div class="sub">Tout sur tes joueurs, sur les ${o.days} derniers jours (comparé aux ${o.days} jours d'avant).</div></div><div class="tools">${HC.periodChips()}</div></div>
      <div class="subnav">${SECTIONS.map(([id, l, i]) => `<button class="chip" data-scroll="${id}">${img(i)}${l}</button>`).join('')}</div>

      ${HC.secTitle('nav-city', 'Audience', 'combien de joueurs, et combien reviennent', 'audience')}
      <div class="kpis k6">
        ${HC.kpi('icon-bolt', fmt(k.avgDau, 1), 'joueurs par jour en moyenne', { delta: delta(k.avgDau, pv.avgDau), title: 'DAU : joueurs différents qui ouvrent le jeu dans la journée' })}
        ${HC.kpi('nav-city', fmt(k.wau), 'joueurs sur les 7 derniers jours', { color: 'var(--blue)', title: 'WAU' })}
        ${HC.kpi('app-missions', fmt(k.mau), 'joueurs sur les 30 derniers jours', { color: 'var(--purple)', title: 'MAU' })}
        ${HC.kpi('hdr-daily', stick + ' %', 'fidélité (jour / mois)', { color: 'var(--green)', title: 'DAU ÷ MAU : au-dessus de 20 %, c\'est un jeu qu\'on ouvre souvent' })}
        ${HC.kpi('ev-boost', fmt(k.installs), 'nouveaux joueurs', { color: 'var(--pink)', delta: delta(k.installs, pv.installs) })}
        ${HC.kpi('icon-star', fmt(k.players), 'joueurs en tout depuis le début', { color: 'var(--cyan)' })}
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-h">${img('app-crypto')}Joueurs actifs<small>par jour, sur 7 jours, sur 30 jours</small></div><div class="chart lg"><canvas id="s-dau"></canvas></div></div>
        <div class="card"><div class="card-h">${img('ev-boost')}Nouveaux joueurs par jour<small>${fmt(k.installs)} sur la période</small></div><div class="chart lg"><canvas id="s-new"></canvas></div></div>
      </div>

      ${HC.secTitle('hdr-levelup', 'Rétention', 'parmi ceux qui installent, combien reviennent après 1, 3, 7… jours', 'retention')}
      <div class="kpis k5">${[1, 3, 7, 14, 30].map((n, i) => HC.kpi(null, pct(o.retention[n]), `reviennent au jour ${n}`, { color: ['var(--green)', 'var(--cyan)', 'var(--blue)', 'var(--purple)', 'var(--pink)'][i], html: `<span style="font:400 20px var(--title);color:#fff">J${n}</span>` })).join('')}</div>
      <div class="card" style="margin-top:16px"><div class="card-h">${img('hdr-missions')}Les nouveaux joueurs reviennent-ils ?<small>chaque ligne = les joueurs arrivés la même semaine</small></div>
        <p class="help" style="margin:0 0 12px">On regarde s'ils rejouent <b>le lendemain</b>, <b>une semaine après</b> et <b>un mois après</b>. Vert = bien pour un jeu mobile, orange = moyen, rouge = faible.</p>
        <div class="coh2">${o.cohorts.map(c => { const g = (v, ok, bon) => v == null ? '' : v >= bon ? 'good' : v >= ok ? 'mid' : 'low';
          const cell = (lbl, v, ok, bon) => `<div class="coh2-c ${v == null ? 'na' : g(v, ok, bon)}"><small>${lbl}</small>${v == null ? '<b>trop tôt</b>' : `<b>${v} %</b><i style="width:${Math.min(100, v)}%"></i>`}</div>`;
          return `<div class="coh2-r"><div class="coh2-h"><b>Semaine du ${new Date(c.d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</b><small>${fmt(c.n)} nouveaux joueurs</small></div>${cell('le lendemain', c.r[1], 25, 35)}${cell('1 semaine après', c.r[7], 8, 15)}${cell('1 mois après', c.r[30], 4, 8)}</div>`; }).join('') || HC.empty('Pas encore de joueurs sur la période.')}</div></div>

      ${HC.secTitle('ev-xp', 'Sessions et horaires', 'combien de temps et quand ils jouent', 'sessions')}
      <div class="kpis k5">
        ${HC.kpi('ev-xp', minTxt(k.avgSessMin), 'durée moyenne d\'une partie', { color: 'var(--orange)', delta: delta(k.avgSessMin, pv.avgSessMin) })}
        ${HC.kpi('icon-check', minTxt(k.medSessMin), 'durée « typique » (médiane)', { color: 'var(--green)', title: 'La moitié des parties dure moins que ça' })}
        ${HC.kpi('icon-bolt', fmt(k.sessPerDau, 1), 'parties par joueur et par jour', { color: 'var(--yellow)' })}
        ${HC.kpi('app-missions', fmt(k.sessions), 'parties jouées', { color: 'var(--blue)', delta: delta(k.sessions, pv.sessions) })}
        ${HC.kpi('hdr-daily', minTxt(k.avgPlayMin), 'temps de jeu total moyen par joueur', { color: 'var(--purple)' })}
      </div>
      <div class="grid g3" style="margin-top:16px">
        <div class="card"><div class="card-h">${img('ev-xp')}Durée des parties</div><div class="chart"><canvas id="s-len"></canvas></div></div>
        <div class="card"><div class="card-h">${img('icon-bolt')}Parties par joueur<small>sur la période</small></div><div class="chart"><canvas id="s-spp"></canvas></div></div>
        <div class="card"><div class="card-h">${img('app-crypto')}Durée moyenne par jour</div><div class="chart"><canvas id="s-avg"></canvas></div></div>
        <div class="card span3"><div class="card-h">${img('hdr-daily')}Quand ils jouent<small>le plus de monde : ${days[busiest[0]].toLowerCase()} vers ${busiest[1]} h</small></div>
          <div class="heat"><span></span>${Array.from({ length: 24 }, (_, h) => `<span class="hh ${h % 2 ? 'odd' : ''}">${h}h</span>`).join('')}
          ${o.sessions.heat.map((r, d) => `<span class="hd">${days[d]}</span>` + r.map((v, h) => `<i data-t="${days[d]} ${h}h : ${v} parties" style="background:${v ? `rgba(255,${Math.round(60 + 150 * (v / hmax))},${Math.round(172 - 110 * (v / hmax))},${.15 + .85 * v / hmax})` : ''}"></i>`).join('')).join('')}</div></div>
      </div>

      ${HC.secTitle('icon-star', 'Progression', 'jusqu\'où ils montent, et où ils décrochent', 'progression')}
      <div class="grid g2">
        <div class="card"><div class="card-h">${img('hdr-levelup')}Combien atteignent chaque palier<small>tous les joueurs depuis le début</small></div>${HC.funnelHtml(o.funnel)}</div>
        <div class="card"><div class="card-h">${img('icon-star')}Niveau actuel des joueurs<small>niveau moyen : ${fmt(k.avgLvl, 1)}</small></div><div class="chart lg"><canvas id="s-lvl"></canvas></div></div>
        <div class="card span2"><div class="card-h">${img('icon-lock')}Où ils décrochent<small>${fmt(o.goneCount)} joueurs ne sont pas revenus depuis 7 jours : à quel niveau se sont-ils arrêtés ?</small></div>
          <div class="chart"><canvas id="s-churn"></canvas></div>
          ${worstLvl ? `<p class="note" style="margin-top:12px">Point chaud : <b>${worstLvl.rate} %</b> des joueurs arrivés au <b>niveau ${worstLvl.lvl}</b> ont arrêté. Regarde ce qui se débloque (ou pas) à ce moment-là.</p>` : ''}</div>
      </div>

      ${HC.secTitle('icon-cash', 'Économie', 'l\'argent du jeu (pas du vrai)', 'economie')}
      <div class="kpis k6">
        ${HC.kpi('icon-cash', bare(cash(e.cash)), 'cash en circulation', { color: 'var(--green)' })}
        ${HC.kpi('icon-lingot', bare(lingots(e.lingots)), 'lingots en circulation', { color: 'var(--yellow)' })}
        ${HC.kpi('booster-pack', fmt(e.boosters), 'boosters pas encore ouverts', { color: 'var(--pink)' })}
        ${HC.kpi('icon-treasure', bare(cash(e.avgWorth)), 'patrimoine moyen', { color: 'var(--orange)' })}
        ${HC.kpi('app-bank', bare(cash(e.medWorth)), 'patrimoine « typique » (médiane)', { color: 'var(--blue)', title: 'La moitié des joueurs a moins que ça' })}
        ${HC.kpi('icon-lingot', fmt(e.avgLingots), 'lingots en poche en moyenne', { color: 'var(--yellow)' })}
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-h">${img('app-bank')}Répartition des fortunes</div><div class="chart"><canvas id="s-worth"></canvas></div></div>
        <div class="card"><div class="card-h">${img('icon-trophy')}Top 10 des fortunes</div>${e.top.map((p, i) => `<div class="feed-row" data-pid="${esc(p.pid)}"><span class="lvl" style="background:${['#ffd23f', '#c9c9d6', '#e0915a'][i] || 'var(--purple)'};color:${i < 3 ? '#2a1a10' : '#fff'}">${i + 1}</span>${HC.who(p, 34, `Niveau ${esc(p.lvl)}`)}<span class="num" style="margin-left:auto">${cash(p.worth)}</span></div>`).join('')}</div>
      </div>

      ${HC.secTitle('icon-treasure', 'Argent', 'achats intégrés (simulés tant que le jeu n\'est pas sur les stores) et pubs', 'argent')}
      <div class="kpis k4">
        ${HC.kpi('icon-treasure', eur(m.total), 'revenu total estimé', { delta: delta(m.revenue, pv.revenue) })}
        ${HC.kpi('icon-cash', eur(m.revenue), 'achats intégrés', { color: 'var(--green)' })}
        ${HC.kpi('bonus-lingots', eur(m.adRevenue), `pubs (${fmt(m.ads)} vues)`, { color: 'var(--blue)', delta: delta(m.ads, pv.ads), title: `Estimation : ${HC.eur(m.adEur, 3)} par pub vue` })}
        ${HC.kpi('icon-star', eur(m.arpdau, 3), 'gagné par joueur et par jour', { color: 'var(--purple)', title: 'ARPDAU : revenu ÷ joueurs actifs de chaque jour' })}
        ${HC.kpi('gift-big', fmt(m.payers), `payeurs sur la période (${fmt(m.payersAll)} en tout)`, { color: 'var(--pink)' })}
        ${HC.kpi('hdr-levelup', pct(m.conv, 1), 'des joueurs ont déjà payé', { color: 'var(--orange)' })}
        ${HC.kpi('icon-lingot', eur(m.arppu), 'dépense moyenne d\'un payeur', { color: 'var(--yellow)', title: 'ARPPU sur la période' })}
        ${HC.kpi('bonus-lingots', fmt(m.adsPerDau, 2), 'pubs vues par joueur et par jour', { color: 'var(--cyan)' })}
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-h">${img('icon-treasure')}Revenu estimé par jour</div><div class="chart lg"><canvas id="s-rev"></canvas></div></div>
        <div class="card"><div class="card-h">${img('ic-promo')}Les offres<small>clics → achats → revenu</small></div>
          <div style="overflow-x:auto"><table class="ptable" style="display:table"><tr><th>Offre</th><th class="r">Clics</th><th class="r">Achats</th><th class="r">Taux</th><th class="r">Revenu</th></tr>
          ${m.offers.map(x => `<tr><td><span class="who">${img(HC.offerIcon(x.id), 'ico')}<div><b>${esc(x.name)}</b><small>${esc(x.price)}</small></div></span></td><td class="r num">${fmt(x.clicks)}</td><td class="r num">${fmt(x.buys)}</td><td class="r">${x.clicks ? pct(x.buys / x.clicks * 100) : '–'}</td><td class="r num" style="color:var(--green)">${eur(x.revenue)}</td></tr>`).join('') || `<tr><td colspan="5">${HC.empty('Aucun clic sur une offre.')}</td></tr>`}</table></div></div>
        <div class="card span2"><div class="card-h">${img('gift-big')}Ceux qui ont le plus dépensé<small>depuis le début</small></div><div class="grid g4" style="gap:10px">${m.topPayers.map(p => `<div class="feed-row" data-pid="${esc(p.pid)}" style="background:rgba(0,0,0,.15)">${HC.who(p, 38, `${fmt(p.n)} achat${p.n > 1 ? 's' : ''} · niv. ${esc(p.lvl || 1)}`)}<span class="num" style="margin-left:auto;color:var(--green)">${eur(p.eur)}</span></div>`).join('') || HC.empty('Aucun payeur pour l\'instant.')}</div></div>
      </div>

      ${HC.secTitle('icon-bolt', 'Ce qu\'ils font', 'les boutons les plus touchés dans le jeu', 'usage')}
      <div class="grid g2">
        <div class="card"><div class="card-h">${img('icon-bolt')}Les plus utilisés<small>nombre de fois · joueurs différents</small></div>${HC.hbars(o.acts.slice(0, 12).map(a => ({ label: esc(HC.actLabel(a.a)), icon: img(HC.actIcon(a.a)), n: a.n, sub: `${fmt(a.u)} j.` })))}</div>
        <div class="card"><div class="card-h">${img('icon-lock')}Moins utilisés<small>à rendre plus visibles ?</small></div>${HC.hbars(o.acts.slice(12).map(a => ({ label: esc(HC.actLabel(a.a)), icon: img(HC.actIcon(a.a)), n: a.n, sub: `${fmt(a.u)} j.`, color: 'var(--purple)' })))}</div>
      </div>

      ${HC.secTitle('skin-doudoune-bust', 'Qui sont-ils', 'looks, appareils, pays, langues', 'repartition')}
      <div class="grid g3">
        <div class="card"><div class="card-h">${img('skin-flambeur-bust')}Looks choisis</div>${HC.hbars(o.skins.map(x => ({ label: esc(HC.skinName(x.k)), icon: `<span class="av" style="--s:28px"><span class="av-in"><img src="${HC.src(HC.skinImg(x.k))}" alt=""></span></span>`, n: x.n, sub: pct(x.n / k.players * 100) })), { color: 'var(--pink)' })}</div>
        <div class="card"><div class="card-h">${img('nav-trading')}Appareils</div><div class="chart"><canvas id="s-plat"></canvas></div></div>
        <div class="card"><div class="card-h">${img('nav-city')}Pays</div>${HC.hbars(o.countries.map(x => ({ label: esc(x.k), icon: `<span class="flag">${flag(ccOf(x.k))}</span>`, n: x.n, sub: pct(x.n / k.players * 100) })), { color: 'var(--blue)' })}</div>
        <div class="card"><div class="card-h">${img('bld-tour')}Villes</div>${HC.hbars(o.cities.map(x => { const [c, cc] = x.k.split('|'); return { label: esc(c), icon: `<span class="flag">${flag(cc)}</span>`, n: x.n }; }), { color: 'var(--cyan)' })}</div>
        <div class="card"><div class="card-h">${img('app-msg')}Langue du téléphone</div>${HC.hbars(o.langs.map(x => ({ label: esc(LANGS[x.k] || x.k), n: x.n, sub: pct(x.n / k.players * 100) })), { color: 'var(--purple)' })}</div>
        <div class="card"><div class="card-h">${img('icon-lock')}Comptes</div><div class="kv"><span>Joueurs en tout</span><b>${fmt(k.players)}</b><span>Suspendus</span><b>${fmt(k.banned)}</b><span>Payeurs</span><b>${fmt(m.payersAll)}</b><span>Inactifs depuis 7 j</span><b>${fmt(o.goneCount)}</b></div></div>
      </div>`);


    // ---- graphiques
    HC.line('s-dau', lab, [{ label: 'Par jour', data: s.map(x => x.dau), color: HC.COL.yellow }, { label: 'Sur 7 jours', data: s.map(x => x.wau), color: HC.COL.blue, fill: false, borderDash: [6, 4], borderWidth: 2 }, { label: 'Sur 30 jours', data: s.map(x => x.mau), color: HC.COL.purple, fill: false, borderWidth: 2 }]);
    HC.bars('s-new', lab, [{ label: 'Nouveaux joueurs', data: s.map(x => x.installs), color: HC.COL.pink }]);
    HC.bars('s-len', o.sessions.buckets.map(b => b.k), [{ label: 'Parties', data: o.sessions.buckets.map(b => b.n), color: HC.COL.orange }]);
    HC.bars('s-spp', o.sessions.perPlayer.map(b => b.k), [{ label: 'Joueurs', data: o.sessions.perPlayer.map(b => b.n), color: HC.COL.blue }]);
    HC.line('s-avg', lab, [{ label: 'Minutes par partie', data: s.map(x => x.avgSessMin), color: HC.COL.orange }], { yfmt: v => v + ' min' });
    HC.bars('s-lvl', o.levels.map(l => l.lvl), [{ label: 'Joueurs', data: o.levels.map(l => l.n), color: HC.COL.purple }], { border: false });
    HC.chart('s-churn', { type: 'bar', data: { labels: o.churn.map(c => 'niv. ' + c.lvl), datasets: [
      { type: 'bar', label: 'Joueurs partis', data: o.churn.map(c => c.n), backgroundColor: o.churn.map(c => c.n === maxGone ? HC.COL.red : '#ff4d5e88'), borderRadius: 5, yAxisID: 'y' },
      { type: 'line', label: '% des joueurs de ce niveau', data: o.churn.map(c => c.n ? c.rate : null), borderColor: HC.COL.yellow, borderWidth: 2, pointRadius: 3, pointBackgroundColor: HC.COL.yellow, tension: .3, yAxisID: 'y2', spanGaps: true }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', align: 'end' } },
        scales: { x: { grid: { display: false }, ticks: { autoSkip: true, maxRotation: 0 } }, y: { beginAtZero: true, ticks: { precision: 0 } }, y2: { position: 'right', min: 0, max: 100, grid: { display: false }, ticks: { callback: v => v + ' %' } } } } });
    HC.bars('s-worth', e.buckets.map(b => b.k), [{ label: 'Joueurs', data: e.buckets.map(b => b.n), color: HC.COL.green }]);
    HC.bars('s-rev', lab, [{ label: 'Achats', data: s.map(x => x.revenue), color: HC.COL.green }, { label: 'Pubs', data: s.map(x => x.adRevenue), color: HC.COL.blue }], { stacked: true, yfmt: v => v + ' €' });
    HC.donut('s-plat', o.platforms.map(p => p.k), o.platforms.map(p => p.n));
    void lvAt; void sumS;
    HC.$$('[data-scroll]').forEach(b => b.onclick = () => { const el = document.getElementById(b.dataset.scroll); if (el) el.scrollIntoView({ behavior: 'smooth' }); });
    const sec = P.get('s'); if (sec) setTimeout(() => { const el = document.getElementById(sec); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 120);
  };
  const LANGS = { fr: 'Français', en: 'Anglais', es: 'Espagnol', ar: 'Arabe', de: 'Allemand', it: 'Italien', pt: 'Portugais', nl: 'Néerlandais' };
  const CC = { France: 'FR', Belgique: 'BE', Suisse: 'CH', Canada: 'CA', Maroc: 'MA', Luxembourg: 'LU', 'La Réunion': 'RE', Sénégal: 'SN', Algérie: 'DZ', Tunisie: 'TN', "Côte d'Ivoire": 'CI', Monaco: 'MC', 'Royaume-Uni': 'GB', Espagne: 'ES', Allemagne: 'DE', Italie: 'IT', 'États-Unis': 'US', Guadeloupe: 'GP', Martinique: 'MQ' };
  const ccOf = n => CC[n] || '';
})();
