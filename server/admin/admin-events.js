/* Hustle City · back office : ÉVÉNEMENTS ET NOUVEAUTÉS, en simple.
   Un bloc = une chose (maintenance, annonces, prochain tournoi, pubs). Chaque bloc s'enregistre tout seul et arrive dans le jeu dans la minute.
   Remplace l'ancienne page (admin-ops.js) : même config « live » côté serveur. */
(function () {
  'use strict';
  const HC = window.HC, D = HC.D, { $, $$, esc, img } = HC;
  const DAY = 864e5, pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const longDay = d => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDt = t => new Date(t).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const SIX = D.SIX || { matches: [], name: 'Tournoi' };
  const CDM = D.CDM || { teams: [], start: '', end: '' };
  // date pour un champ « date et heure » (heure de Paris, celle de son ordinateur)
  const dtl = v => { const d = new Date(v); return isNaN(d) ? '' : `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  // les 5 journées du tournoi à partir du jour 1 (une journée par jour, aux heures du vrai calendrier)
  const sixDays = start => { const d0 = new Date(start + 'T12:00'); return [1, 2, 3, 4, 5].map(j => { const d = new Date(d0); d.setDate(d0.getDate() + j - 1); return d; }); };

  HC.PAGES.live = async () => {
    let c = await HC.api('/admin/api/config'), cdmLive = await HC.api('/admin/api/cdm').catch(() => ({}));
    async function patch(p, msg) {
      c = await HC.api('/admin/api/config');   // toujours repartir de la dernière version (pour ne rien écraser)
      c = { ...c, ...p }; await HC.api('/admin/api/config', c);
      HC.toast(msg || 'Enregistré : les joueurs le voient dans la minute', 'icon-check'); cdmLive = await HC.api('/admin/api/cdm').catch(() => cdmLive); render();
    }
    let newsForm = false;

    function render() {
      const m = c.maintenance || {}, news = (c.news || []).filter(n => !n.until || Date.parse(n.until) > Date.now()), old = (c.news || []).length - news.length;
      const six = c.sixStart || SIX.sim || '', days = six ? sixDays(six) : [], end = days[4], now = new Date();
      const sixState = !six ? 'none' : now < days[0] ? 'soon' : now <= new Date(end).setHours(23, 59) ? 'live' : 'done';
      const cdm = { on: CDM.on !== false, start: CDM.start, end: CDM.end, prio: CDM.prio || 'cdm', ...(c.cdm || {}) }, cdmPrio = cdm.prio;
      const cdmState = !cdm.on ? 'off' : Date.now() < Date.parse(cdm.start) ? 'soon' : Date.now() < Date.parse(cdm.end) ? 'live' : 'done';
      const promo = (c.campaigns || []).find(x => x.on !== false && Date.parse(x.start) <= Date.now() && Date.now() < Date.parse(x.end));
      const ads = { reward: 3, perDay: 5, ...(D.ADS || {}), ...(c.ads || {}) };
      HC.main(`<div class="page-head"><div><h1>Événements et nouveautés</h1><div class="sub">Une chose à la fois. Chaque bloc s'enregistre tout seul et arrive dans le jeu dans la minute.</div></div></div>

        <div class="ev-now">
          <div class="ev-chip ${m.on ? 'ko' : 'ok'}">${img('hdr-settings')}<span><small>Le jeu</small><b>${m.on ? 'En maintenance' : 'Ouvert'}</b></span></div>
          <div class="ev-chip">${img('app-missions')}<span><small>Annonces</small><b>${news.length ? news.length + ' en cours' : 'Aucune'}</b></span></div>
          <div class="ev-chip ${sixState === 'live' ? 'ok' : ''}">${img('bld-six')}<span><small>Tournoi</small><b>${sixState === 'live' ? 'En cours' : sixState === 'soon' ? 'Le ' + days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : sixState === 'done' ? 'Terminé' : 'Pas prévu'}</b></span></div>
          <div class="ev-chip ${cdmState === 'live' ? 'ok' : ''}">${img(HC.has('ic-ev-cdm') ? 'ic-ev-cdm' : 'ic-promo-halloween')}<span><small>Coupe des Morts</small><b>${cdmState === 'live' ? 'En cours' : cdmState === 'soon' ? 'Le ' + new Date(cdm.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : cdmState === 'done' ? 'Terminée' : 'Éteinte'}</b></span></div>
          <div class="ev-chip ${promo ? 'ok' : ''}" data-go="promos">${img('ic-promo')}<span><small>Promo</small><b>${promo ? esc(promo.name || 'En cours') : 'Aucune'}</b></span></div>
        </div>

        <section class="card ev-blk ${m.on ? 'alert' : ''}"><div class="ev-bh">${img('hdr-settings')}<div><h2>Maintenance</h2><p class="help">Couvre le jeu d'un message, par exemple pendant une mise à jour.</p></div></div>
          ${m.on ? `<div class="ev-maint on"><b>Le jeu est en maintenance.</b><p>« ${esc(m.text || 'Le jeu est en maintenance, reviens dans un petit moment.')} »</p><button class="btn lg green" id="mt-off">Rouvrir le jeu</button></div>`
            : `<div class="ev-maint"><b>Le jeu tourne normalement.</b><div class="fld"><label for="mt-txt">Message affiché aux joueurs</label><input id="mt-txt" value="${esc(m.text || 'Petite mise à jour en cours, on revient dans 10 minutes !')}"></div><button class="btn red" id="mt-on">Mettre le jeu en maintenance</button></div>`}
        </section>

        <section class="card ev-blk"><div class="ev-bh">${img('app-missions')}<div><h2>Annonces</h2><p class="help">Une notification dans le téléphone du jeu. Chaque joueur la reçoit une seule fois.</p></div>${newsForm ? '' : '<button class="btn green" id="nw-new">+ Nouvelle annonce</button>'}</div>
          ${newsForm ? `<div class="ev-form"><div class="ev-fl">
              <div class="fld"><label for="nw-t">Titre</label><input id="nw-t" maxlength="60" placeholder="Ex. : Le tournoi commence samedi !"></div>
              <div class="fld"><label for="nw-x">Message</label><textarea id="nw-x" rows="3" maxlength="240" placeholder="1 ou 2 phrases, court et clair."></textarea></div>
              <div class="fld"><div class="lb">Visible pendant</div><div class="chips" id="nw-d">${[['1 jour', 1], ['3 jours', 3], ['1 semaine', 7], ['1 mois', 30]].map(([l, d], i) => `<button class="chip ${i === 2 ? 'on' : ''}" data-d="${d}">${l}</button>`).join('')}</div><p class="help">Un joueur qui se connecte après ne la reçoit plus.</p></div>
              <div class="ev-act"><button class="btn ghost" id="nw-cancel">Annuler</button><button class="btn lg green" id="nw-go">Envoyer l'annonce</button></div></div>
            <div class="ev-phone"><div class="ev-scr"><div class="ev-clock">${pad(now.getHours())}:${pad(now.getMinutes())}</div><div class="ev-notif">${img('app-missions')}<div><small>Missions · maintenant</small><b id="pv-t">Ton titre</b><p id="pv-x">Ton message</p></div></div></div></div></div>` : ''}
          ${news.length ? `<div class="ev-list">${news.map(n => `<div class="ev-row">${img('app-missions')}<div class="ev-rm"><b>${esc(n.title || '(sans titre)')}</b><p>${esc(n.text || '')}</p><small>${n.until ? 'Jusqu\'au ' + shortDt(n.until) : 'Sans fin'}</small></div><button class="btn sm ghost" data-del-news="${esc(n.id)}">Retirer</button></div>`).join('')}</div>`
            : newsForm ? '' : '<p class="help ev-empty">Aucune annonce en cours.</p>'}
          ${old ? `<p class="help">${old} ancienne${old > 1 ? 's' : ''} annonce${old > 1 ? 's' : ''} terminée${old > 1 ? 's' : ''} (plus envoyée${old > 1 ? 's' : ''}).</p>` : ''}
        </section>

        <section class="card ev-blk ${cdmState === 'live' ? 'live' : ''}"><div class="ev-bh">${img(HC.has('ic-ev-cdm') ? 'ic-ev-cdm' : 'ic-promo-halloween')}<div><h2>La Coupe des Morts</h2><p class="help">L'événement d'Halloween : 4 équipes (Zombies, Vampires, Démons, Fantômes). Chaque joueur choisit son camp et gagne des points en jouant. Pendant ses dates, le Panneau de la place montre la Coupe.</p></div>
            <button class="btn ${cdm.on ? 'green' : 'ghost'}" id="cd-on">${cdm.on ? 'Allumée' : 'Éteinte'}</button></div>
          <div class="ev-six">
            <div class="ev-fl">
              <div class="fld"><label for="cd-s">Elle commence le</label><input type="datetime-local" id="cd-s" value="${esc(dtl(cdm.start))}"></div>
              <div class="fld"><label for="cd-e">Elle finit le</label><input type="datetime-local" id="cd-e" value="${esc(dtl(cdm.end))}"></div>
              <div class="chips">${[['Halloween', 'hw'], ['Dès maintenant', 'now'], ['Durée 3 jours', 'd3'], ['Durée 1 semaine', 'd7'], ['Durée 10 jours', 'd10']].map(([l, k]) => `<button class="chip" data-cd="${k}">${l}</button>`).join('')}</div>
              <div class="fld"><div class="lb">Si le tournoi de rugby tombe en même temps, le Panneau montre</div><div class="chips" id="cd-p">${[['La Coupe des Morts', 'cdm'], ['Le tournoi', 'six']].map(([l, k]) => `<button class="chip ${cdmPrio === k ? 'on' : ''}" data-prio="${k}">${l}</button>`).join('')}</div></div>
              <p class="help" id="cd-info"></p>
              <div class="ev-act"><button class="btn ghost" id="cd-reset">Repartir de zéro</button><button class="btn lg green" id="cd-go">Enregistrer</button></div>
            </div>
            <div class="cd-live"><div class="lb">En direct <small>· édition ${esc(cdmLive.ed || '')}</small></div>
              <div class="cd-kpis"><span><b>${(cdmLive.players || 0).toLocaleString('fr-FR')}</b><small>joueurs dans une équipe</small></span><span><b>${Object.values(cdmLive.totals || {}).reduce((a, b) => a + b, 0).toLocaleString('fr-FR')}</b><small>points en tout</small></span></div>
              ${HC.hbars(CDM.teams.map(t => ({ label: `${esc(t.name)} <small>(${(cdmLive.count || {})[t.id] || 0})</small>`, plain: t.name, icon: HC.cdmCrest(t.id), n: (cdmLive.totals || {})[t.id] || 0, v: ((cdmLive.totals || {})[t.id] || 0).toLocaleString('fr-FR'), color: t.color })).sort((a, b) => b.n - a.n))}
              <div class="lb" style="margin-top:12px">Les meilleurs joueurs</div>
              ${(cdmLive.best || []).length ? `<div class="ev-list">${cdmLive.best.map((p, i) => { const t = CDM.teams.find(x => x.id === p.team) || {}; return `<div class="ev-row cd-best"><b class="cd-rk">${i + 1}</b>${HC.who(p, 34, `<span style="color:${t.color}">${esc(t.name || '')}</span>`)}<b class="cd-pts">${(p.pts || 0).toLocaleString('fr-FR')} pts</b></div>`; }).join('')}</div>` : '<p class="help ev-empty">Personne n\'a encore rejoint d\'équipe.</p>'}
            </div>
          </div>
        </section>

        <section class="card ev-blk"><div class="ev-bh">${img('bld-six')}<div><h2>Le prochain tournoi</h2><p class="help">${esc(SIX.name || 'Le tournoi')} : 5 journées de pronos, une par jour. Le Panneau de la place l'annonce avec la date.</p></div></div>
          <div class="ev-six">
            <div class="ev-fl">
              <div class="fld"><label for="sx-d">Il commence le</label><input type="date" id="sx-d" value="${esc(six)}"></div>
              <div class="chips">${[['Demain', 1], ['Dans 1 semaine', 7], ['Dans 2 semaines', 14], ['Dans 1 mois', 30]].map(([l, d]) => `<button class="chip" data-in="${d}">${l}</button>`).join('')}</div>
              <p class="help" id="sx-info"></p>
              <div class="ev-act"><button class="btn lg green" id="sx-go">Enregistrer la date</button></div>
            </div>
            <div class="ev-days" id="sx-days"></div>
          </div>
        </section>

        <section class="card ev-blk"><div class="ev-bh">${img('bonus-lingots')}<div><h2>Pubs récompensées</h2><p class="help">Ce que gagne un joueur en regardant une pub jusqu'au bout, dans la boutique.</p></div></div>
          <div class="ev-ads">
            <div class="ev-step"><span>Lingots par pub</span><div><button class="btn sm ghost" data-st="reward:-1">−</button><b id="ad-r">${ads.reward}</b><button class="btn sm ghost" data-st="reward:1">+</button></div></div>
            <div class="ev-step"><span>Pubs par jour</span><div><button class="btn sm ghost" data-st="perDay:-1">−</button><b id="ad-n">${ads.perDay}</b><button class="btn sm ghost" data-st="perDay:1">+</button></div></div>
            <p class="help" id="ad-sum"></p>
            <div class="ev-act"><button class="btn green" id="ad-go">Enregistrer</button></div>
          </div>
        </section>

        <details class="card ev-exp"><summary>${img('btn-setup')} Réglages experts (n'importe quelle valeur du jeu)</summary>
          <p class="help">À utiliser seulement si je te le conseille. Ex. <code>BOOSTER.cost</code> = 10.</p>
          <div id="vals">${Object.entries(c.values || {}).map(([k, v]) => `<div class="val-row"><input data-k value="${esc(k)}"><input data-v value="${esc(JSON.stringify(v))}"></div>`).join('')}</div>
          <div class="ev-act"><button class="btn sm ghost" id="val-add">+ Réglage</button><button class="btn sm" id="val-go">Enregistrer</button></div>
        </details>`);
      wire(ads, cdm);
    }

    function wire(ads, cdm) {
      // Coupe des Morts : allumer / éteindre, dates, priorité sur le Panneau, nouvelle édition
      let cd = { ...cdm };
      const cdInfo = () => { const s = Date.parse($('#cd-s').value), e = Date.parse($('#cd-e').value);
        $('#cd-info').innerHTML = !(s < e) ? '<b>La fin doit être après le début.</b>' : !cd.on ? 'La Coupe est <b>éteinte</b> : le Panneau ne la montre pas.'
          : Date.now() < s ? `Elle commence <b>${longDay(new Date(s))}</b> et dure <b>${Math.round((e - s) / DAY)} jours</b>. En attendant, le Panneau annonce la date.`
          : Date.now() < e ? `<b>En cours</b> jusqu'au ${longDay(new Date(e))}.` : 'Ces dates sont passées : la Coupe est finie.'; };
      $('#cd-s').oninput = $('#cd-e').oninput = cdInfo; cdInfo();
      $('#cd-on').onclick = async () => { cd.on = !cd.on; await patch({ cdm: { ...(c.cdm || {}), on: cd.on } }, cd.on ? 'Coupe des Morts allumée' : 'Coupe des Morts éteinte'); };
      $$('[data-prio]').forEach(b => b.onclick = () => { cd.prio = b.dataset.prio; $$('[data-prio]').forEach(x => x.classList.toggle('on', x === b)); });
      $$('[data-cd]').forEach(b => b.onclick = () => { const k = b.dataset.cd, s0 = Date.parse($('#cd-s').value) || Date.now();
        if (k === 'hw') { $('#cd-s').value = dtl(CDM.start); $('#cd-e').value = dtl(CDM.end); }
        else if (k === 'now') { const d = new Date(); d.setSeconds(0, 0); $('#cd-s').value = dtl(d); if (!(Date.parse($('#cd-e').value) > d)) $('#cd-e').value = dtl(new Date(+d + 7 * DAY)); }
        else { const e = new Date(s0 + +k.slice(1) * DAY); e.setHours(23, 59, 0, 0); $('#cd-e').value = dtl(e); }
        cdInfo(); });
      $('#cd-go').onclick = async () => { const s = new Date($('#cd-s').value), e = new Date($('#cd-e').value); if (!(s < e)) return HC.toast('La fin doit être après le début', null, true);
        await patch({ cdm: { ...(c.cdm || {}), on: cd.on, start: s.toISOString(), end: e.toISOString(), prio: cd.prio } }, 'Coupe des Morts enregistrée'); };
      $('#cd-reset').onclick = async () => { if (!(await HC.confirm('Repartir de zéro ?', 'Une nouvelle Coupe commence : équipes, points, paliers et bonbons repartent de zéro pour tous les joueurs. Les objets déjà gagnés restent à eux.', 'Repartir de zéro', 'red'))) return;
        await patch({ cdm: { ...(c.cdm || {}), ed: new Date(Date.parse($('#cd-s').value) || Date.now()).getFullYear() + '-' + Date.now().toString(36) } }, 'Nouvelle Coupe : tout repart de zéro'); };
      // maintenance
      if ($('#mt-on')) $('#mt-on').onclick = async () => { const text = $('#mt-txt').value.trim(); if (!(await HC.confirm('Mettre le jeu en maintenance ?', 'Les joueurs voient ton message à la place du jeu, dans la minute, jusqu\'à ce que tu le rouvres.', 'Mettre en maintenance', 'red'))) return; await patch({ maintenance: { on: true, text } }, 'Le jeu est en maintenance'); };
      if ($('#mt-off')) $('#mt-off').onclick = () => patch({ maintenance: { ...(c.maintenance || {}), on: false } }, 'Le jeu est rouvert');
      // annonces
      if ($('#nw-new')) $('#nw-new').onclick = () => { newsForm = true; render(); $('#nw-t').focus(); };
      if ($('#nw-cancel')) {
        let days = 7;
        const pv = () => { $('#pv-t').textContent = $('#nw-t').value || 'Ton titre'; $('#pv-x').textContent = $('#nw-x').value || 'Ton message'; };
        $('#nw-t').oninput = pv; $('#nw-x').oninput = pv;
        $$('#nw-d .chip').forEach(b => b.onclick = () => { days = +b.dataset.d; $$('#nw-d .chip').forEach(x => x.classList.toggle('on', x === b)); });
        $('#nw-cancel').onclick = () => { newsForm = false; render(); };
        $('#nw-go').onclick = async () => { const title = $('#nw-t').value.trim(), text = $('#nw-x').value.trim(); if (!title) return HC.toast('Donne un titre à ton annonce', null, true);
          newsForm = false; await patch({ news: [{ id: 'n' + Date.now().toString(36), title, text, until: new Date(Date.now() + days * DAY).toISOString() }, ...(c.news || [])] }, 'Annonce envoyée'); };
      }
      $$('[data-del-news]').forEach(b => b.onclick = async () => { if (!(await HC.confirm('Retirer cette annonce ?', 'Les joueurs qui ne l\'ont pas encore reçue ne la recevront pas.', 'Retirer', 'red'))) return; await patch({ news: (c.news || []).filter(n => n.id !== b.dataset.delNews) }, 'Annonce retirée'); });
      // tournoi
      const sxUpd = () => { const v = $('#sx-d').value; if (!v) { $('#sx-info').textContent = 'Choisis une date.'; $('#sx-days').innerHTML = ''; return; }
        const ds = sixDays(v), left = Math.ceil((ds[0] - Date.now()) / DAY);
        $('#sx-info').innerHTML = left > 0 ? `En attendant, le Panneau affiche : <b>« Reviens dans ${left} jour${left > 1 ? 's' : ''} : le prochain commence le ${longDay(ds[0])}. »</b>` : left > -5 ? '<b>Le tournoi est en cours</b> à cette date.' : 'Cette date est passée : le tournoi est déjà fini.';
        $('#sx-days').innerHTML = ds.map((d, i) => `<div class="ev-day"><small>Journée ${i + 1}</small><b>${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</b><span>${(SIX.matches || []).filter(m => m[0] === i + 1).length || 3} matchs</span></div>`).join(''); };
      $('#sx-d').oninput = sxUpd; sxUpd();
      $$('[data-in]').forEach(b => b.onclick = () => { const d = new Date(Date.now() + +b.dataset.in * DAY); $('#sx-d').value = ymd(d); sxUpd(); });
      $('#sx-go').onclick = async () => { const v = $('#sx-d').value; if (!v) return HC.toast('Choisis une date', null, true);
        if (!(await HC.confirm('Programmer le tournoi le ' + longDay(sixDays(v)[0]) + ' ?', 'Les pronos, le classement et le récap repartent de zéro pour tous les joueurs.', 'Programmer'))) return;
        await patch({ sixStart: v, nextEvent: new Date(v + 'T00:00').toISOString() }, 'Tournoi programmé'); };
      // pubs
      const adSum = () => $('#ad-sum').innerHTML = `Au maximum <b>${ads.reward * ads.perDay} lingots par jour</b> avec les pubs (un booster coûte ${(D.BOOSTER || {}).cost || 12} lingots).`;
      adSum();
      $$('[data-st]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.st.split(':'); ads[k] = Math.max(0, Math.min(k === 'reward' ? 50 : 20, ads[k] + +d)); $('#ad-r').textContent = ads.reward; $('#ad-n').textContent = ads.perDay; adSum(); });
      $('#ad-go').onclick = () => patch({ ads: { ...(c.ads || {}), reward: ads.reward, perDay: ads.perDay } }, 'Pubs mises à jour');
      // experts
      $('#val-add').onclick = () => $('#vals').insertAdjacentHTML('beforeend', '<div class="val-row"><input data-k placeholder="Réglage (ex. BOOSTER.cost)"><input data-v placeholder="Valeur"></div>');
      $('#val-go').onclick = () => { const values = {}; for (const r of $$('#vals .val-row')) { const k = $('[data-k]', r).value.trim(), v = $('[data-v]', r).value.trim(); if (!k) continue; try { values[k] = JSON.parse(v); } catch (e) { values[k] = v; } } patch({ values }, 'Réglages experts enregistrés'); };
    }
    render();
  };
})();
