/* Hustle City · back office : liste des joueurs et fiche joueur (photo, inventaire, activité, actions). */
(function () {
  'use strict';
  const HC = window.HC, D = HC.D, { $, $$, esc, img, has, src, first, fmt, short, cash, lingots, eur, ago, dt, day, hm, dur, flag } = HC;
  const ST = HC.pstate = HC.pstate || { q: '', filter: '', sort: 'recent', cc: '', lv: '', page: 0 };
  const PER = 50;
  const LVR = { '': ['Tous niveaux'], '1-4': ['Niveau 1 à 4', 1, 4], '5-9': ['Niveau 5 à 9', 5, 9], '10-19': ['Niveau 10 à 19', 10, 19], '20-29': ['Niveau 20 à 29', 20, 29], '30-40': ['Niveau 30 et +', 30, 40] };
  const xpNeed = l => (D.XP_TABLE || [])[l] || 0;
  const xpPct = p => { const n = xpNeed(p.lvl || 1); return n ? Math.min(100, (p.xp || 0) / n * 100) : 100; };
  const searchIco = '<svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="6" stroke="currentColor" stroke-width="2.5"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';

  // ================================================================== LISTE
  HC.PAGES.players = async () => {
    HC.main(`<div class="page-head"><div><h1>Joueurs</h1><div class="sub" id="pl-sub">&nbsp;</div></div></div>
      <div class="filters"><div class="search">${searchIco}<input id="pl-q" placeholder="Pseudo, #tag, ville ou identifiant" value="${esc(ST.q)}"></div>
        <select id="pl-cc"><option value="">Tous les pays</option></select>
        <select id="pl-lv">${Object.entries(LVR).map(([k, v]) => `<option value="${k}" ${ST.lv === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
        <select id="pl-sort">${[['recent', 'Vus récemment'], ['new', 'Nouveaux d\'abord'], ['lvl', 'Niveau'], ['worth', 'Patrimoine'], ['lingots', 'Lingots'], ['play', 'Temps de jeu'], ['name', 'Pseudo (A → Z)']].map(([v, l]) => `<option value="${v}" ${ST.sort === v ? 'selected' : ''}>Trier : ${l}</option>`).join('')}</select></div>
      <div class="chips" id="pl-f" style="margin-bottom:14px"></div>
      <div id="pl-list">${HC.loading()}</div>`);
    let tmr;
    $('#pl-q').oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => { ST.q = $('#pl-q').value.trim(); ST.page = 0; load(); }, 250); };
    $('#pl-cc').onchange = () => { ST.cc = $('#pl-cc').value; ST.page = 0; load(); };
    $('#pl-lv').onchange = () => { ST.lv = $('#pl-lv').value; ST.page = 0; load(); };
    $('#pl-sort').onchange = () => { ST.sort = $('#pl-sort').value; ST.page = 0; load(); };
    async function load() {
      const lv = LVR[ST.lv] || [];
      const qs = new URLSearchParams({ q: ST.q, sort: ST.sort, filter: ST.filter, cc: ST.cc, limit: PER, offset: ST.page * PER, ...(lv[1] ? { lmin: lv[1], lmax: lv[2] } : {}) });
      const r = await HC.api('/admin/api/players?' + qs);
      const c = r.counts;
      $('#pl-sub').innerHTML = `${fmt(c.all)} joueurs · <span style="color:var(--green)">${fmt(c.online)} en ligne</span> · ${fmt(c.payers)} payeurs`;
      $('#pl-f').innerHTML = [['', 'Tous', c.all, null], ['online', 'En ligne', c.online, 'icon-bolt'], ['new', 'Nouveaux (7 j)', c.new, 'ev-boost'], ['payers', 'Payeurs', c.payers, 'icon-treasure'], ['gone', 'Partis (7 j sans jouer)', c.gone, 'icon-lock'], ['banned', 'Suspendus', c.banned, 'icon-lock']]
        .map(([k, l, n, i]) => `<button class="chip ${ST.filter === k ? 'on' : ''}" data-f="${k}">${i ? img(i) : ''}${l}<b>${fmt(n)}</b></button>`).join('');
      $$('#pl-f [data-f]').forEach(b => b.onclick = () => { ST.filter = b.dataset.f; ST.page = 0; load(); });
      const sel = $('#pl-cc'); if (sel.options.length === 1) r.countries.forEach(x => { const [cc, name] = x.k.split('|'); sel.insertAdjacentHTML('beforeend', `<option value="${esc(cc)}" ${ST.cc === cc ? 'selected' : ''}>${flag(cc)} ${esc(name)} (${x.n})</option>`); });
      const head = [['Joueur', 'name'], ['Niveau', 'lvl'], ['Patrimoine', 'worth', 'r'], ['Lingots', 'lingots', 'r'], ['Temps de jeu', 'play', 'r'], ['Parties', '', 'r'], ['Dépensé', '', 'r'], ['Vu', 'recent', 'r'], ['Inscrit', 'new', 'r']];
      const pages = Math.ceil(r.total / PER);
      $('#pl-list').innerHTML = r.rows.length ? `<table class="ptable"><tr>${head.map(([l, s, c]) => `<th class="${c || ''} ${ST.sort === s ? 'on' : ''}" ${s ? `data-s="${s}"` : ''}>${l}</th>`).join('')}</tr>
        ${r.rows.map(p => `<tr class="click ${p.banned ? 'banned' : ''}" data-pid="${esc(p.pid)}"><td>${HC.who(p, 42)}</td><td><span class="lvl">${p.lvl || 1}</span><span class="xpbar"><i style="width:${xpPct(p)}%"></i></span></td>
          <td class="r num">${cash(p.worth)}</td><td class="r num">${lingots(p.lingots)}</td><td class="r">${dur(p.play_ms)}</td><td class="r">${fmt(p.sessions)}</td><td class="r">${p.spent ? `<span class="tag ok">${eur(p.spent)}</span>` : '<span class="mut">–</span>'}</td>
          <td class="r">${p.online ? '<span class="tag ok"><span class="dot" style="width:7px;height:7px"></span>en ligne</span>' : ago(p.last_seen)}</td><td class="r mut">${dt(p.created, { day: 'numeric', month: 'short' })}</td></tr>`).join('')}</table>
        <div class="pcards">${r.rows.map(p => `<div class="pcard" data-pid="${esc(p.pid)}">${HC.who(p, 46, `Niv. ${p.lvl || 1} · ${p.online ? '<span style="color:var(--green)">en ligne</span>' : ago(p.last_seen)}${p.spent ? ' · ' + eur(p.spent) : ''}`)}<div class="pc-r"><b>${cash(p.worth)}</b>${lingots(p.lingots)}</div></div>`).join('')}</div>
        <div class="pager">${ST.page > 0 ? '<button class="btn sm ghost" id="pg-p">← Précédents</button>' : ''}<span>Page ${ST.page + 1} sur ${Math.max(1, pages)} · ${fmt(r.total)} joueurs</span>${ST.page + 1 < pages ? '<button class="btn sm ghost" id="pg-n">Suivants →</button>' : ''}</div>`
        : HC.empty('Aucun joueur ne correspond.');
      $$('#pl-list th[data-s]').forEach(th => th.onclick = () => { ST.sort = th.dataset.s; $('#pl-sort').value = ST.sort; load(); });
      if ($('#pg-p')) $('#pg-p').onclick = () => { ST.page--; load(); window.scrollTo(0, 0); };
      if ($('#pg-n')) $('#pg-n').onclick = () => { ST.page++; load(); window.scrollTo(0, 0); };
    }
    await load();
    HC.timers.push(setInterval(() => { if (document.activeElement !== $('#pl-q')) load().catch(() => {}); }, 30000));
  };

  // ================================================================== FICHE JOUEUR
  const CAT_ICON = { card: 'cat-card', sneaker: 'cat-sneaker', watch: 'cat-watch', gold: 'cat-gold', gem: 'item-g-diam', car: 'bld-garage', moto: 'bld-garage', trophy: 'cat-trophy' };
  const CAT_ORDER = ['card', 'sneaker', 'watch', 'gold', 'gem', 'car', 'moto', 'trophy'];
  const itemImg = it => { const n = first(it.art, it.img, 'item-' + it.id); return n ? `<img src="${src(n)}" alt="" loading="lazy">` : (it.team && it.team[0] === 'rugby' ? HC.crest(it.team[1]) : img(CAT_ICON[it.cat])); };
  function parseSave(s) { try { return JSON.parse(s || 'null') || null; } catch (e) { return null; } }

  HC.PAGES.player = async (P) => {
    const pid = P.get('pid'), p = await HC.api('/admin/api/player?pid=' + encodeURIComponent(pid)), S = parseSave(p.save) || {};
    const need = xpNeed(p.lvl || 1), xp = p.xp != null ? p.xp : (S.xp || 0);
    const skin = (D.SKINS || []).find(s => s.id === p.skin);
    const owned = S.owned || {}, items = Object.keys(owned).map(id => (D.ITEMS || []).find(x => x.id === id)).filter(Boolean);
    const price = it => (S.market && S.market.prices && S.market.prices[it.id]) || it.p0 || 0;
    const byCat = {}; items.forEach(it => (byCat[it.cat] = byCat[it.cat] || []).push(it));
    const invValue = items.reduce((t, it) => t + price(it), 0);
    const ach = S.ach || {}, achAll = D.ACHIEVEMENTS || [];
    const ev = S.evItems || {}, shop = (D.SIX && D.SIX.shop) || [];
    const props = Object.keys(S.props || {}).map(id => (D.PROPS || []).find(x => x.id === id)).filter(Boolean);
    const coins = (D.COINS || []).filter(c => S.crypto && S.crypto.hold && S.crypto.hold[c.id] > 0);
    const openTk = p.tickets.filter(t => t.status !== 'fermé');
    const statsS = S.stats || {};
    HC.main(`<button class="back" data-go="players">← Tous les joueurs</button>
      <div class="card hero">
        ${HC.avatar(p, 132)}
        <div style="min-width:0"><h1>${esc(p.name || '(sans nom)')}<small>#${esc(p.tag || '')}</small></h1>
          <div class="meta">${p.online ? '<span class="tag ok"><span class="dot" style="width:7px;height:7px"></span>en ligne maintenant</span>' : `<span class="tag">vu ${ago(p.last_seen)}</span>`}
            ${p.banned ? `<span class="tag ko">${img('icon-lock')}suspendu</span>` : ''}${p.spent ? `<span class="tag ok">${img('icon-treasure')}a dépensé ${eur(p.spent)}</span>` : ''}
            ${p.city ? `<span class="tag blue">${flag(p.cc)} ${esc(p.city)}${p.region && p.region !== p.city ? ', ' + esc(p.region) : ''}</span>` : ''}
            <span class="tag">${esc(HC.platform(p.platform))}${p.screen ? ' · ' + esc(p.screen) : ''}</span><span class="tag pink">${esc(skin ? skin.name : HC.skinName(p.skin))}</span><span class="tag">inscrit le ${dt(p.created, { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          <div class="lvlbar"><span class="lv">${p.lvl || 1}</span><span class="bar"><i style="width:${need ? Math.min(100, xp / need * 100) : 100}%"></i><span>${need ? `${fmt(xp)} / ${fmt(need)} XP` : 'niveau max'}</span></span></div></div>
        <div class="hero-actions"><button class="btn green" data-scroll="pa-gift">${img('icon-gift')}Offrir un cadeau</button><button class="btn blue" data-scroll="pa-gift">${img('app-msg')}Envoyer un message</button>
          <button class="btn purple" data-scroll="pa-save">${img('hdr-settings')}Restaurer la partie</button>
          ${p.banned ? `<button class="btn" id="pa-unban">${img('icon-check')}Réactiver le compte</button>` : `<button class="btn red" id="pa-ban">${img('icon-lock')}Suspendre</button>`}</div>
      </div>
      ${p.banned ? `<p class="note" style="margin-top:12px;border-color:rgba(255,77,94,.5);background:rgba(255,77,94,.08);color:#ffc1c8">Compte suspendu : ${esc(p.ban_reason || 'sans motif')}</p>` : ''}
      <div class="card" style="margin-top:16px"><div class="wallet">
        ${wl('icon-cash', cash(p.cash), 'en cash')}${wl('icon-lingot', fmt(p.lingots), 'lingots')}${wl('booster-pack', fmt(p.boosters ?? S.boosters ?? 0), 'boosters à ouvrir')}${wl('icon-treasure', cash(p.worth), 'patrimoine total')}
        ${wl('ev-xp', dur(p.play_ms), 'temps de jeu')}${wl('icon-bolt', fmt(p.sessions), 'parties jouées')}${wl('bonus-lingots', fmt(p.ads), 'pubs regardées')}${wl('gift-big', p.spent ? eur(p.spent) : '0 €', 'dépensé (simulé)')}</div></div>

      <div class="grid g3" style="margin-top:16px">
        <div class="card span2"><div class="card-h">${img('app-binder')}Ce qu'il possède<small>${items.length} objets · valeur ≈ ${cash(invValue)}</small></div>
          ${CAT_ORDER.filter(c => byCat[c]).map(c => { const L2 = byCat[c].sort((a, b) => price(b) - price(a)), cat = (D.ITEM_CATS || {})[c] || {};
            return `<div class="inv-cat"><h4>${img(CAT_ICON[c])}${esc(c === 'car' ? 'Véhicules' : cat.name || c)}<small>${L2.length} · ${cash(L2.reduce((t, it) => t + price(it), 0))}</small></h4><div class="inv">${L2.map(it => `<div class="it r${it.r}" title="${esc(it.name)}"><span class="rar">${it.r}</span><div class="ii">${itemImg(it)}</div><small>${esc(it.name.replace(/^Carte /, ''))}</small><em>${short(price(it))}</em></div>`).join('')}</div></div>`; }).join('') || HC.empty('Pas encore d\'objets (ou pas encore de sauvegarde reçue).', 'ic-shelf')}
          ${props.length ? `<div class="inv-cat"><h4>${img('app-immo')}Immobilier<small>${props.length}</small></h4><div class="inv">${props.map(x => `<div class="it"><div class="ii">${img('app-immo')}</div><small>${esc(x.name)}</small><em>${short(x.price)}</em></div>`).join('')}</div></div>` : ''}
          ${coins.length ? `<div class="inv-cat"><h4>${img('app-crypto')}Crypto<small>${coins.length}</small></h4><div class="inv">${coins.map(c => `<div class="it"><div class="ii">${img('coin-' + c.id) || `<span class="emo">${esc(c.sym)}</span>`}</div><small>${esc(c.name)}</small><em>${S.crypto.hold[c.id] >= 1000 ? short(S.crypto.hold[c.id]) : fmt(S.crypto.hold[c.id], 2)}</em></div>`).join('')}</div></div>` : ''}
        </div>
        <div class="stack">
          <div class="card"><div class="card-h">${img('frame-gold')}Photo de profil<small>pin's et cadres achetés</small></div>
            ${(() => { const mine = shop.filter(x => ev[x.id]); return mine.length ? `<div class="inv">${mine.map(x => `<div class="it ${(x.kind === 'avatar' && p.avatar === x.id) || (x.kind === 'frame' && p.frame === x.id) ? 'rL' : ''}"><div class="ii">${x.kind === 'avatar' ? HC.crest(x.team) : x.kind === 'frame' ? (HC.frameImg(x) ? img(HC.frameImg(x)) : '') : img('deco-' + x.id)}</div><small>${esc(x.name.replace(/^Photo : /, ''))}</small><em>${(x.kind === 'avatar' && p.avatar === x.id) || (x.kind === 'frame' && p.frame === x.id) ? 'porté' : x.kind === 'deco' ? 'en ville' : ''}</em></div>`).join('')}</div>` : HC.empty('Aucun pin\'s ni cadre.', 'frame-six'); })()}</div>
          <div class="card"><div class="card-h">${img('icon-trophy')}Succès<small>${Object.keys(ach).length} / ${achAll.length}</small></div>
            <div class="inv" style="grid-template-columns:repeat(auto-fill,minmax(64px,1fr))">${achAll.filter(a => ach[a.id]).slice(0, 12).map(a => `<div class="it rE ach" title="${esc(a.txt)}"><div class="ii">${img(first('ach-' + a.id, 'icon-trophy'))}</div><small>${esc(a.name)}</small></div>`).join('') || HC.empty('Aucun pour l\'instant.', 'icon-trophy')}</div></div>
          <div class="card"><div class="card-h">${img('bld-appart')}Sa partie</div><div class="kv">
            <span>Paris placés</span><b>${fmt(statsS.bets || 0)}${statsS.bets ? ` <small class="mut">(${fmt(statsS.betsWon || 0)} gagnés)</small>` : ''}</b><span>Tours de machine</span><b>${fmt(statsS.spins || 0)}</b><span>Roulette</span><b>${fmt(statsS.roulette || 0)}</b>
            <span>Soirées au Club</span><b>${fmt(statsS.clubNights || 0)}</b><span>Machine à miner</span><b>niveau ${((S.rig || {}).lvl || 0) + 1}</b><span>Appart</span><b>${esc(((D.ROOMS || [])[S.room || 0] || {}).name || 'chambre ' + ((S.room || 0) + 1))}</b>
            <span>Coffre</span><b>${esc(((D.SAFES || [])[S.safeLvl || 0] || {}).name || '–')}</b><span>Garage</span><b>${esc(((D.GARAGES || [])[S.garageLvl || 0] || {}).name || '–')}</b><span>Série de connexions</span><b>${fmt((S.daily || {}).streak || 0)} j</b></div></div>
        </div>
      </div>

      <div class="grid g3" style="margin-top:16px">
        <div class="card span2"><div class="card-h">${img('app-crypto')}Quand il joue<small>minutes de jeu par jour, 30 derniers jours</small></div><div class="chart"><canvas id="pp-act"></canvas></div>
          <div class="card-h" style="margin-top:18px">${img('hdr-missions')}Son histoire<small>${p.events.length} derniers événements</small></div><div class="timeline" id="pp-tl"></div></div>
        <div class="stack">
          <div class="card"><div class="card-h">${img('icon-gift')}Cadeaux et messages reçus</div>
            ${p.inbox.slice(0, 8).map(m => { let g = null; try { g = JSON.parse(m.gift || 'null'); } catch (e) {} return `<div class="hist-row"><span><b>${esc(m.title)}</b><br><small>${esc((m.text || '').slice(0, 70))}${g && !g.restore ? ' · ' + giftTxt(g) : g && g.restore ? ' · restauration' : ''}</small></span><span class="tag ${m.claimed ? 'ok' : 'warn'}">${m.claimed ? 'reçu' : 'en attente'}</span></div>`; }).join('') || HC.empty('Rien envoyé.', 'icon-gift')}</div>
          ${p.buys.length ? `<div class="card"><div class="card-h">${img('icon-treasure')}Achats<small>${eur(p.spent)}</small></div>${p.buys.map(b => `<div class="hist-row">${img(HC.offerIcon ? HC.offerIcon(b.id) : 'icon-treasure', 'ico')}<span>${esc(HC.offerName(b.id))}<br><small>${dt(b.t)}</small></span><b>${eur(b.eur)}</b></div>`).join('')}</div>` : ''}
        </div>
      </div>

      <div class="act-grid" style="margin-top:16px">
        <div class="card" id="pa-gift"><div class="card-h">${img('icon-gift')}Offrir un cadeau ou envoyer un message<small>il le reçoit dans son téléphone à sa prochaine connexion</small></div>
          <div class="fld"><input id="g-t" placeholder="Titre (ex. : Désolé pour le bug !)"></div><div class="fld"><textarea id="g-x" placeholder="Ton message"></textarea></div>
          <div class="quick-gifts">${[['+10', { l: 10 }], ['+25', { l: 25 }], ['+50', { l: 50 }], ['+1 000', { c: 1000 }], ['+2', { b: 2 }]].map(([t, g]) => `<button class="chip" data-qg='${JSON.stringify(g)}'>${t}${g.l ? '<i class="lgt"></i>' : g.c ? '<i class="cur"></i>' : '<i class="bst"></i>'}</button>`).join('')}</div>
          <div class="gift-row"><label><span>${img('icon-lingot')}Lingots</span><input id="g-l" type="number" min="0" value="0"></label><label><span>${img('icon-cash')}Cash</span><input id="g-c" type="number" min="0" value="0"></label><label><span>${img('booster-pack')}Boosters</span><input id="g-b" type="number" min="0" value="0"></label>
            <button class="btn green" id="g-go">Envoyer</button></div></div>
        <div class="card"><div class="card-h">${img('hdr-missions')}Notes internes<small>visibles seulement ici</small></div><textarea id="pn" style="min-height:120px" placeholder="Ex. : joueur fidèle, a signalé le bug du casino…">${esc(p.notes || '')}</textarea><div style="margin-top:8px;display:flex;gap:8px;align-items:center"><button class="btn sm" id="pn-s">Enregistrer la note</button><small id="pn-st"></small></div></div>
        <div class="card" id="pa-save"><div class="card-h">${img('hdr-settings')}Sauvegardes<small>dernière copie ${ago(p.save_at)}</small></div>
          <p class="help" style="margin:-4px 0 10px">Restaurer remplace sa partie par la copie choisie, à sa prochaine connexion. Une copie est gardée par heure de jeu (les 12 dernières).</p>
          ${p.history.map(h => `<div class="hist-row">${img('app-bank', 'ico')}<span>${dt(h.t, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}<br><small>niveau ${h.lvl} · ${cash(h.worth)} · ${fmt(h.size / 1024)} Ko</small></span><button class="btn sm purple" data-hist="${h.id}">Restaurer</button></div>`).join('') || HC.empty('Pas encore d\'ancienne copie.', 'app-bank')}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm ghost" id="sv-dl">Télécharger la partie actuelle</button><label class="btn sm ghost" style="cursor:pointer">Restaurer depuis un fichier…<input type="file" id="sv-f" accept=".json,application/json" hidden></label></div></div>
        <div class="card"><div class="card-h">${img('icon-lock')}Compte</div><div class="kv" style="margin-bottom:12px">
          <span>Identifiant</span><b>${esc(p.pid)}</b><span>Version du jeu</span><b>${esc(p.ver || '–')}</b><span>Langue · fuseau</span><b>${esc(p.lang || '–')} · ${esc(p.tz || '–')}</b><span>Localisé par</span><b>${p.geo_src === 'ip' ? 'adresse IP' : p.geo_src === 'fuseau' ? 'fuseau horaire (approx.)' : '–'}</b></div>
          <div class="fld"><div class="lb">Code de récupération</div><div class="code">${esc(p.recovery)}</div><div class="help">À donner au joueur s'il change de téléphone (Réglages → Récupérer ma partie).</div></div>
          <div class="fld"><div class="lb">${p.banned ? 'Réactiver le compte' : 'Suspendre le compte'}</div>${p.banned ? `<button class="btn green" id="pa-unban2">Réactiver le compte</button>` : `<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="b-r" placeholder="Motif (affiché au joueur)" style="flex:1;min-width:180px"><button class="btn red" id="pa-ban2">Suspendre</button></div><div class="help">Le joueur voit un écran « Compte suspendu » avec ce motif.</div>`}</div></div>
      </div>`);

    // activité : minutes par jour sur 30 jours
    const days30 = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 29 + i); return d; });
    const mins = days30.map(d => p.sessionsList.filter(s => s.start >= d.getTime() && s.start < d.getTime() + 864e5).reduce((t, s) => t + (s.ms || 0), 0) / 60000);
    HC.bars('pp-act', days30.map(d => `${d.getDate()}/${d.getMonth() + 1}`), [{ label: 'Minutes', data: mins.map(m => Math.round(m)), color: HC.COL.yellow }], { border: false });
    // frise
    let last = '';
    $('#pp-tl').innerHTML = p.events.map(e => { const dd = day(e.t), x = HC.evDesc(e, false), sep = dd !== last ? `<div class="tl-day">${dd}</div>` : ''; last = dd; return `${sep}<div class="tl-row"><time>${hm(e.t)}</time><span class="ti">${img(x.i)}</span><span class="tt">${x.t.replace(/^./, c => c.toUpperCase())}</span></div>`; }).join('') || HC.empty('Rien pour l\'instant.');
    // actions
    $$('[data-scroll]').forEach(b => b.onclick = () => document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: 'smooth', block: 'center' }));
    $$('[data-qg]').forEach(b => b.onclick = () => { const g = JSON.parse(b.dataset.qg); if (g.l) $('#g-l').value = +$('#g-l').value + g.l; if (g.c) $('#g-c').value = +$('#g-c').value + g.c; if (g.b) $('#g-b').value = +$('#g-b').value + g.b; });
    $('#g-go').onclick = async () => {
      const gift = { lingots: +$('#g-l').value || 0, cash: +$('#g-c').value || 0, boosters: +$('#g-b').value || 0 }, title = $('#g-t').value.trim(), text = $('#g-x').value.trim();
      if (!text && !title && !gift.lingots && !gift.cash && !gift.boosters) return HC.toast('Écris un message ou choisis un cadeau', null, true);
      if (!(await HC.confirm('Envoyer à ' + (p.name || 'ce joueur') + ' ?', `${esc(title || 'Hustle City')}${text ? '<br>« ' + esc(text) + ' »' : ''}${giftTxt(gift) ? '<br>Cadeau : <b>' + giftTxt(gift) + '</b>' : ''}`, 'Envoyer'))) return;
      await HC.api('/admin/api/gift', { pid, title: title || 'Hustle City', text, gift }); HC.toast('Envoyé ! Il le reçoit à sa prochaine connexion', 'icon-gift'); HC.route();
    };
    $('#pn-s').onclick = async () => { await HC.api('/admin/api/notes', { pid, notes: $('#pn').value }); $('#pn-st').textContent = 'Enregistré ✓'; HC.toast('Note enregistrée', 'icon-check'); };
    const ban = async () => { const why = $('#b-r') && $('#b-r').value.trim() || await HC.prompt('Suspendre ' + (p.name || 'ce joueur'), 'Le motif s\'affiche au joueur sur son écran.', 'Ex. : triche, insultes…'); if (why === null) return; await HC.api('/admin/api/ban', { pid, ban: true, reason: why }); HC.toast('Compte suspendu', 'icon-lock'); HC.route(); };
    const unban = async () => { if (!(await HC.confirm('Réactiver le compte ?', 'Le joueur pourra rejouer normalement.', 'Réactiver'))) return; await HC.api('/admin/api/ban', { pid, ban: false }); HC.toast('Compte réactivé', 'icon-check'); HC.route(); };
    ['#pa-ban', '#pa-ban2'].forEach(s => { if ($(s)) $(s).onclick = ban; }); ['#pa-unban', '#pa-unban2'].forEach(s => { if ($(s)) $(s).onclick = unban; });
    $$('[data-hist]').forEach(b => b.onclick = async () => { if (!(await HC.confirm('Restaurer cette copie ?', 'Sa partie actuelle sera remplacée par celle-ci à sa prochaine connexion.', 'Restaurer', 'purple'))) return; await HC.api('/admin/api/save', { pid, hist: +b.dataset.hist }); HC.toast('Restauration envoyée', 'hdr-settings'); });
    $('#sv-dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([p.save || '{}'], { type: 'application/json' })); a.download = `sauvegarde-${(p.name || pid).replace(/[^\w-]+/g, '_')}.json`; a.click(); };
    $('#sv-f').onchange = async () => { const f = $('#sv-f').files[0]; if (!f) return; if (!(await HC.confirm('Restaurer ce fichier ?', esc(f.name) + ' remplacera sa partie à sa prochaine connexion.', 'Restaurer', 'purple'))) return; const r = await HC.api('/admin/api/save', { pid, save: await f.text() }); if (r.ok) HC.toast('Restauration envoyée', 'hdr-settings'); };
  };
  const wl = (i, v, l) => `<div class="wl">${img(i)}<div style="min-width:0"><b>${v}</b><small>${l}</small></div></div>`;
  function giftTxt(g) { return [g.lingots && `${fmt(g.lingots)} lingots`, g.cash && `${fmt(g.cash)} de cash`, g.boosters && `${fmt(g.boosters)} booster${g.boosters > 1 ? 's' : ''}`].filter(Boolean).join(' + '); }
  HC.giftTxt = giftTxt;
})();
