/* Hustle City · back office : les NOTIFICATIONS sur le téléphone des joueurs (jeu fermé, application iPhone / Android).
   - Envoyer une notification maintenant ou à une date, à tous ou à un groupe.
   - Les rappels automatiques (récolte, cadeau du jour, prono, absence) : on / off et textes. Enregistrés dans la config « live » : notifs. */
(function () {
  'use strict';
  const HC = window.HC, { $, $$, esc, img } = HC;
  const DEF = {
    harvest: { on: true, title: 'Ta récolte est prête ⛏️', body: 'Ta machine a fini de miner : viens voir ce qu\'il y a dedans.' },
    gift: { on: true, hour: 10, title: 'Ton cadeau du jour t\'attend 🎁', body: 'Reviens le récupérer : il grossit chaque jour de la série.' },
    prono: { on: true, title: '🏉 Pense à ton prono', body: '{match} commence dans 1 h. C\'est gratuit !' },
    away: { on: true, days: 3, title: 'Le quartier bouge sans toi 👀', body: 'De nouvelles affaires t\'attendent au Comptoir et au Royal.' } };
  const AUTO = [
    ['harvest', 'Récolte prête', 'icon-bolt', 'Quand sa machine à miner a fini.'],
    ['gift', 'Cadeau du jour', 'gift-big', 'Chaque jour, à l\'heure choisie.'],
    ['prono', 'Prono du tournoi', 'bld-six', '1 h avant un match du tournoi où il n\'a pas encore parié. {match} = le nom du match.'],
    ['away', 'Retour après une absence', 'nav-city', 'S\'il n\'a pas ouvert le jeu depuis quelques jours.']];
  const IDEAS = [
    ['Nouveauté', '🔥 Du nouveau en ville', 'De nouveaux objets viennent d\'arriver à la Bijouterie. Premiers arrivés, premiers servis !'],
    ['Promo', '💸 Promo flash', '-40 % sur les boosters pendant 24 h seulement.'],
    ['Tournoi', '🏆 Le tournoi commence', 'Fais tes pronos maintenant : les premiers matchs démarrent ce soir.'],
    ['Cadeau', '🎁 Un cadeau t\'attend', 'Ouvre le jeu pour récupérer ton cadeau, il est dans ta boîte aux lettres.']];
  const GROUPS = [['all', 'Tout le monde', {}], ['away3', 'Absents depuis 3 jours', { away: 3 }], ['away7', 'Absents depuis 7 jours', { away: 7 }], ['active', 'Actifs cette semaine', { active7: true }]];
  const pad = n => String(n).padStart(2, '0');
  const toLocal = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const when = t => new Date(t).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const fdesc = f => { f = typeof f === 'string' ? JSON.parse(f || '{}') : f || {}; const L = [];
    if (+f.away) L.push(`absents depuis ${f.away} jours`); if (f.active7) L.push('actifs cette semaine'); if (+f.minLvl) L.push(`niveau ${f.minLvl} et plus`); return L.length ? L.join(', ') : 'tout le monde'; };

  HC.PAGES.notifs = async () => {
    const [st, cfg] = await Promise.all([HC.api('/admin/api/push'), HC.api('/admin/api/config')]);
    const N = {}; Object.keys(DEF).forEach(k => N[k] = { ...DEF[k], ...((cfg.notifs || {})[k] || {}) });
    const m = { title: '', body: '', group: 'all', minLvl: 0, at: 0 };
    const filter = () => ({ ...GROUPS.find(g => g[0] === m.group)[2], ...(+m.minLvl ? { minLvl: +m.minLvl } : {}) });
    const tonight = () => { const d = new Date(); d.setHours(19, 0, 0, 0); if (d < Date.now()) d.setDate(d.getDate() + 1); return +d; };
    const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return +d; };

    HC.main(`<div class="page-head"><div><h1>Notifications</h1><div class="sub">Les messages qui s'affichent sur le téléphone des joueurs, même quand le jeu est fermé.</div></div></div>
      ${st.on ? `<div class="card nf-state ok">${img('icon-check')}<div><b>Branché</b><p class="help">${st.phones} téléphone${st.phones > 1 ? 's' : ''} peu${st.phones > 1 ? 'vent' : 't'} recevoir tes notifications.</p></div></div>`
        : `<div class="card nf-state">${img('ev-boost')}<div><b>Pas encore branché, mais tu peux tout préparer</b><p class="help">Les notifications partiront dès que l'application sera sur l'App Store et Google Play (il faudra ajouter les clés Apple et Google sur le serveur, on le fera ensemble à la sortie). Les rappels automatiques, eux, sont déjà prêts dans l'application.</p></div></div>`}

      <div class="pm-ed"><div class="pm-steps">
        <h2 class="nf-h">Envoyer une notification</h2>
        <section class="card pm-step"><div class="pm-sn">1</div><div class="pm-sb"><h3>Le message</h3><p class="help">Court et donne envie d'ouvrir le jeu. Les émojis marchent bien.</p>
          <div class="chips nf-ideas">${IDEAS.map((x, i) => `<button class="chip" data-idea="${i}">${esc(x[0])}</button>`).join('')}</div>
          <div class="fld" style="margin-top:10px"><label for="nf-t">Titre <small id="nf-tc"></small></label><input id="nf-t" maxlength="60" placeholder="🔥 Du nouveau en ville"></div>
          <div class="fld"><label for="nf-b">Texte <small id="nf-bc"></small></label><textarea id="nf-b" maxlength="180" rows="3" placeholder="De nouveaux objets viennent d'arriver…"></textarea></div></div></section>
        <section class="card pm-step"><div class="pm-sn">2</div><div class="pm-sb"><h3>Qui la reçoit</h3>
          <div class="chips">${GROUPS.map(g => `<button class="chip ${g[0] === 'all' ? 'on' : ''}" data-grp="${g[0]}">${g[1]}</button>`).join('')}</div>
          <div class="fld nf-lvl" style="margin-top:10px"><label for="nf-l">Seulement à partir du niveau</label><input type="number" id="nf-l" min="0" max="99" value="0"></div>
          <p class="help" id="nf-n"></p></div></section>
        <section class="card pm-step"><div class="pm-sn">3</div><div class="pm-sb"><h3>Quand</h3>
          <div class="chips"><button class="chip on" data-when="now">Maintenant</button><button class="chip" data-when="tonight">Ce soir à 19 h</button><button class="chip" data-when="tomorrow">Demain à 10 h</button><button class="chip" data-when="pick">Choisir…</button></div>
          <div class="fld" id="nf-pick" style="margin-top:10px;display:none"><label for="nf-at">Date et heure</label><input type="datetime-local" id="nf-at"></div>
          <p class="help" id="nf-w"></p></div></section>
        <div class="pm-save"><button class="btn lg green" id="nf-go">${img('icon-check')}<span>Envoyer</span></button></div>

        <div id="nf-plan"></div>

        <h2 class="nf-h">Rappels automatiques</h2>
        <p class="help" style="margin:-6px 0 4px">L'application les programme toute seule sur le téléphone de chaque joueur. Le joueur peut aussi les couper dans ses réglages.</p>
        ${AUTO.map(([k, name, ic, help]) => `<section class="card nf-auto ${N[k].on ? '' : 'off'}" data-auto="${k}">
          <div class="nf-ah">${img(ic)}<div><b>${name}</b><small>${esc(help)}</small></div><label class="nf-sw"><input type="checkbox" data-on="${k}" ${N[k].on ? 'checked' : ''}><i></i><span>${N[k].on ? 'Activé' : 'Coupé'}</span></label></div>
          <div class="nf-ab"><div class="fld"><label>Titre</label><input data-f="${k}.title" maxlength="60" value="${esc(N[k].title)}"></div>
            <div class="fld"><label>Texte</label><input data-f="${k}.body" maxlength="180" value="${esc(N[k].body)}"></div>
            ${k === 'gift' ? `<div class="fld nf-num"><label>Heure d'envoi</label><select data-f="gift.hour">${Array.from({ length: 15 }, (_, i) => i + 8).map(h => `<option value="${h}" ${+N.gift.hour === h ? 'selected' : ''}>${h} h</option>`).join('')}</select></div>` : ''}
            ${k === 'away' ? `<div class="fld nf-num"><label>Après combien de jours sans jouer</label><select data-f="away.days">${[1, 2, 3, 4, 5, 7, 10, 14].map(d => `<option value="${d}" ${+N.away.days === d ? 'selected' : ''}>${d} jour${d > 1 ? 's' : ''}</option>`).join('')}</select></div>` : ''}</div>
        </section>`).join('')}
        <div class="pm-save"><button class="btn ghost" id="nf-reset">Remettre les textes d'origine</button><button class="btn lg green" id="nf-save">${img('icon-check')}Enregistrer les rappels</button></div>
      </div>
      <aside class="pm-prev" id="nf-prev"></aside></div>`);

    // aperçu : l'écran verrouillé d'un téléphone
    const prev = () => {
      const t = m.title || $('#nf-t').placeholder, b = m.body || $('#nf-b').placeholder;
      $('#nf-prev').innerHTML = `<div class="prev-lbl">Ce que voit le joueur</div>
        <div class="nf-phone"><div class="nf-clock"><small>${new Date(m.at || Date.now()).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</small><b>${new Date(m.at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</b></div>
          <div class="nf-notif"><div class="nf-app">${img('logo')}<span>HUSTLE CITY</span><small>maintenant</small></div><b>${esc(t)}</b><p>${esc(b)}</p></div></div>
        <small class="help">Un appui sur la notification ouvre le jeu.</small>`;
      $('#nf-tc').textContent = `${m.title.length}/60`; $('#nf-bc').textContent = `${m.body.length}/180`;
      $('#nf-go span').textContent = m.at ? 'Programmer' : 'Envoyer maintenant';
      $('#nf-w').innerHTML = m.at ? `Partira <b>${esc(when(m.at))}</b>.` : 'Part dès que tu cliques.';
    };
    let cnt = 0; const count = async () => { const my = ++cnt, r = await HC.api('/admin/api/push', { dry: true, filter: filter() }); if (my !== cnt) return;
      $('#nf-n').innerHTML = `<b>${r.n.toLocaleString('fr-FR')} joueur${r.n > 1 ? 's' : ''}</b> dans ce groupe${r.on ? `, dont ${r.phones} avec l'application et les notifications acceptées` : ''}.`; };
    const plan = async () => {
      const s = await HC.api('/admin/api/push');
      $('#nf-plan').innerHTML = (s.plan.length ? `<h3 class="nf-h3">Programmées</h3>${s.plan.map(p => `<div class="card nf-row"><div><b>${esc(p.title)}</b><p>${esc(p.body)}</p><small>${esc(when(p.at))} · ${esc(fdesc(p.filter))}</small></div><button class="btn sm red" data-cancel="${p.id}">Annuler</button></div>`).join('')}` : '')
        + (s.sent.length ? `<details class="nf-sent"><summary>Déjà envoyées (${s.sent.length})</summary>${s.sent.map(p => `<div class="card nf-row done"><div><b>${esc(p.title)}</b><p>${esc(p.body)}</p><small>${esc(when(p.at))} · ${esc(fdesc(p.filter))} · ${s.on ? `reçue sur ${p.n} téléphone${p.n > 1 ? 's' : ''}` : 'pas envoyée (pas encore branché)'}</small></div></div>`).join('')}</details>` : '');
      $$('[data-cancel]').forEach(b => b.onclick = async () => { if (!(await HC.confirm('Annuler cette notification ?', 'Elle ne partira pas.', 'Annuler la notification', 'red'))) return; await HC.api('/admin/api/push-cancel', { id: +b.dataset.cancel }); HC.toast('Notification annulée', 'icon-check'); plan(); });
    };

    $$('[data-idea]').forEach(b => b.onclick = () => { const x = IDEAS[+b.dataset.idea]; m.title = x[1]; m.body = x[2]; $('#nf-t').value = m.title; $('#nf-b').value = m.body; prev(); });
    $('#nf-t').oninput = e => { m.title = e.target.value; prev(); };
    $('#nf-b').oninput = e => { m.body = e.target.value; prev(); };
    $$('[data-grp]').forEach(b => b.onclick = () => { m.group = b.dataset.grp; $$('[data-grp]').forEach(x => x.classList.toggle('on', x === b)); count(); });
    $('#nf-l').oninput = e => { m.minLvl = +e.target.value || 0; count(); };
    $$('[data-when]').forEach(b => b.onclick = () => { const w = b.dataset.when; $$('[data-when]').forEach(x => x.classList.toggle('on', x === b)); $('#nf-pick').style.display = w === 'pick' ? '' : 'none';
      m.at = w === 'now' ? 0 : w === 'tonight' ? tonight() : w === 'tomorrow' ? tomorrow() : (m.at || tomorrow()); if (w === 'pick') $('#nf-at').value = toLocal(m.at); prev(); });
    $('#nf-at').oninput = e => { m.at = e.target.value ? +new Date(e.target.value) : 0; prev(); };
    $('#nf-go').onclick = async () => {
      if (!m.title.trim() || !m.body.trim()) return HC.toast('Écris un titre et un texte', 'ev-boost');
      if (m.at && m.at < Date.now()) return HC.toast('Cette date est déjà passée', 'ev-boost');
      if (!m.at && !(await HC.confirm('Envoyer maintenant ?', `« ${m.title} » part tout de suite chez ${fdesc(filter())}.`, 'Envoyer', 'green'))) return;
      await HC.api('/admin/api/push', { title: m.title.trim(), body: m.body.trim(), filter: filter(), at: m.at || 0 });
      HC.toast(m.at ? 'Notification programmée' : st.on ? 'Notification envoyée' : 'Enregistrée : elle n\'a pas pu partir, ce n\'est pas encore branché', 'icon-check');
      m.title = m.body = ''; $('#nf-t').value = $('#nf-b').value = ''; prev(); plan();
    };

    // rappels automatiques
    $$('[data-on]').forEach(c => c.onchange = () => { const k = c.dataset.on; N[k].on = c.checked; c.closest('.nf-auto').classList.toggle('off', !c.checked); c.nextElementSibling.nextElementSibling.textContent = c.checked ? 'Activé' : 'Coupé'; });
    $$('[data-f]').forEach(i => i.oninput = i.onchange = () => { const [k, f] = i.dataset.f.split('.'); N[k][f] = i.tagName === 'SELECT' ? +i.value : i.value; });
    $('#nf-save').onclick = async () => {
      if (Object.keys(N).some(k => !N[k].title.trim() || !N[k].body.trim())) return HC.toast('Un rappel n\'a pas de titre ou de texte', 'ev-boost');
      const c = await HC.api('/admin/api/config'); await HC.api('/admin/api/config', { ...c, notifs: N }); HC.toast('Rappels enregistrés : l\'application les prend au prochain lancement', 'icon-check'); };
    $('#nf-reset').onclick = async () => { if (!(await HC.confirm('Remettre les textes d\'origine ?', 'Tes textes des rappels seront remplacés.', 'Remettre', 'red'))) return;
      const c = await HC.api('/admin/api/config'); const { notifs, ...rest } = c; await HC.api('/admin/api/config', rest); HC.toast('Textes d\'origine remis', 'icon-check'); HC.go('notifs'); };

    prev(); count(); plan();
  };
})();
