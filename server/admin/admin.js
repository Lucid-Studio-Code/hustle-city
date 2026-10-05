/* Hustle City · back office : statistiques, joueurs, SAV, événements en direct, messages. Parle à server/server.js. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), D = window.DATA || {};
  let TOKEN = localStorage.getItem('hc.admin') || '';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => n == null ? '–' : Math.round(n).toLocaleString('fr-FR');
  const date = t => t ? new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
  const ago = t => { if (!t) return '–'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'à l\'instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };
  const toast = t => { const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2600); };
  async function api(p, body) {
    const r = await fetch(p, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { showLogin('Jeton refusé.'); throw new Error('401'); } return r.json();
  }
  function showLogin(err) { $('#login').classList.remove('hidden'); $('#shell').classList.add('hidden'); $('#tok-err').textContent = err || ''; }
  $('#tok-go').onclick = async () => { TOKEN = $('#tok').value.trim(); localStorage.setItem('hc.admin', TOKEN); try { await api('/admin/api/config'); $('#login').classList.add('hidden'); $('#shell').classList.remove('hidden'); go('dash'); } catch (e) {} };
  $('#logout').onclick = () => { localStorage.removeItem('hc.admin'); TOKEN = ''; showLogin(); };
  document.querySelectorAll('nav button').forEach(b => b.onclick = () => go(b.dataset.p));
  function go(p) { document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.p === p)); PAGES[p](); }
  const main = html => { $('#main').innerHTML = html; };

  // ------------------------------------------------------------ tableau de bord
  const bars = (list, key, cls) => { const max = Math.max(1, ...list.map(x => x[key])); return `<div class="bars">${list.map(x => `<div class="${cls || ''}" style="height:${x[key] / max * 100}%" data-t="${x.d.slice(5)} : ${x[key]}"></div>`).join('')}</div><div class="axis"><span>${list[0]?.d.slice(5) || ''}</span><span>${list[list.length - 1]?.d.slice(5) || ''}</span></div>`; };
  const hbars = (list, k, v) => { const max = Math.max(1, ...list.map(x => x[v])); return list.length ? list.map(x => `<div class="hb"><span title="${esc(x[k])}">${esc(x[k] ?? '?')}</span><i style="width:${x[v] / max * 60}%"></i><em>${fmt(x[v])}</em></div>`).join('') : '<p class="muted">Pas encore de données.</p>'; };
  const PAGES = {};
  PAGES.dash = async () => {
    main('<h1>Tableau de bord</h1><p class="muted">Chargement…</p>');
    const s = await api('/admin/api/stats?days=30'), r = s.retention;
    $('#nb-tk').textContent = s.openTickets || '';
    const k = (l, v, sub) => `<div class="kpi"><small>${l}</small><b>${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const sum = key => s.days.reduce((t, d) => t + d[key], 0);
    main(`<h1>Tableau de bord</h1>
      <div class="kpis">${k('Joueurs', fmt(s.players))}${k('Actifs 24 h', fmt(s.active1))}${k('Actifs 7 jours', fmt(s.active7))}${k('Rétention J1', r.d1 == null ? '–' : r.d1 + ' %')}${k('Rétention J7', r.d7 == null ? '–' : r.d7 + ' %')}${k('Rétention J30', r.d30 == null ? '–' : r.d30 + ' %')}
        ${k('Niveau moyen', s.avgLvl)}${k('Temps de jeu moyen', fmt(s.avgPlayMin) + ' min')}${k('Pubs vues (30 j)', fmt(sum('ads')))}${k('Clics achats (30 j)', fmt(sum('iap')))}${k('SAV ouverts', fmt(s.openTickets))}${k('Patrimoine moyen', fmt(s.economy?.worth))}</div>
      <div class="grid2" style="margin-top:14px">
        <div class="card"><b>Joueurs actifs par jour</b>${bars(s.days, 'dau')}</div>
        <div class="card"><b>Nouveaux joueurs par jour</b>${bars(s.days, 'installs', 'b2')}</div>
        <div class="card"><b>Niveaux des joueurs</b>${hbars(s.levels.map(x => ({ k: 'Niveau ' + x.lvl, n: x.n })), 'k', 'n')}</div>
        <div class="card"><b>Boutons les plus touchés (30 j)</b>${hbars(s.topActs, 'a', 'n')}</div>
        <div class="card"><b>Offres cliquées (30 j)</b>${hbars(s.iapTop.map(x => ({ k: (D.IAP || []).find(i => i.id === x.id)?.name || x.id || 'Offre du moment', n: x.n })), 'k', 'n')}</div>
        <div class="card"><b>Événements enregistrés (30 j)</b>${hbars(s.evTypes, 'type', 'n')}</div>
      </div>`);
  };

  // ------------------------------------------------------------ joueurs
  PAGES.players = async (qv = '', sort = 'recent') => {
    const L = await api(`/admin/api/players?q=${encodeURIComponent(qv)}&sort=${sort}`);
    main(`<h1>Joueurs</h1><div class="row" style="margin-bottom:12px"><input id="pq" placeholder="Pseudo, #tag ou identifiant" value="${esc(qv)}" style="flex:1;min-width:200px"><select id="ps">${[['recent', 'Vus récemment'], ['new', 'Nouveaux'], ['lvl', 'Niveau'], ['worth', 'Patrimoine']].map(([v, l]) => `<option value="${v}" ${v === sort ? 'selected' : ''}>${l}</option>`).join('')}</select><button id="pgo">Chercher</button></div>
      <div style="overflow:auto"><table><tr><th>Joueur</th><th>Niv.</th><th>Patrimoine</th><th>Lingots</th><th>Sessions</th><th>Temps de jeu</th><th>Vu</th><th>Inscrit</th><th></th></tr>
      ${L.map(p => `<tr class="click" data-pid="${esc(p.pid)}"><td><b>${esc(p.name || '(sans nom)')}</b> <span class="muted">#${esc(p.tag)}</span></td><td>${p.lvl ?? '–'}</td><td>${fmt(p.worth)}</td><td>${fmt(p.lingots)}</td><td>${p.sessions}</td><td>${fmt((p.play_ms || 0) / 60000)} min</td><td>${ago(p.last_seen)}</td><td>${date(p.created)}</td><td>${p.banned ? '<span class="tag ko">Suspendu</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">Aucun joueur.</td></tr>'}</table></div>`);
    $('#pgo').onclick = () => PAGES.players($('#pq').value, $('#ps').value); $('#pq').onkeydown = e => e.key === 'Enter' && $('#pgo').click();
    document.querySelectorAll('tr[data-pid]').forEach(tr => tr.onclick = () => playerDrawer(tr.dataset.pid));
  };
  async function playerDrawer(pid) {
    const p = await api('/admin/api/player?pid=' + encodeURIComponent(pid));
    document.querySelector('.drawer')?.remove();
    const d = document.createElement('div'); d.className = 'drawer'; document.body.appendChild(d);
    d.innerHTML = `<button class="x sec">Fermer</button><h1>${esc(p.name || '(sans nom)')} <span class="muted">#${esc(p.tag)}</span></h1>
      ${p.banned ? `<p><span class="tag ko">Suspendu</span> ${esc(p.ban_reason)}</p>` : ''}
      <div class="kv"><span>Niveau</span><b>${p.lvl ?? '–'}</b><span>Patrimoine</span><b>${fmt(p.worth)}</b><span>Cash</span><b>${fmt(p.cash)}</b><span>Lingots</span><b>${fmt(p.lingots)}</b><span>Look</span><b>${esc(p.skin)}</b>
        <span>Sessions</span><b>${p.sessions}</b><span>Temps de jeu</span><b>${fmt((p.play_ms || 0) / 60000)} min</b><span>Inscrit</span><b>${date(p.created)}</b><span>Vu</span><b>${ago(p.last_seen)}</b>
        <span>Version</span><b>${esc(p.ver)}</b><span>Appareil</span><b class="muted" style="white-space:normal">${esc(p.platform)}</b><span>Code récup.</span><b style="font-family:monospace;font-size:11px;word-break:break-all">${esc(p.recovery)}</b></div>
      <h2>Notes internes</h2><textarea id="dn">${esc(p.notes)}</textarea><button class="sec" id="dn-s">Enregistrer la note</button>
      <h2>Envoyer un cadeau ou un message</h2><div class="form"><input id="g-t" placeholder="Titre (ex. : Désolé pour le bug)"><textarea id="g-x" placeholder="Message (il arrive dans son téléphone)"></textarea>
        <div class="inline"><label>Lingots<input id="g-l" type="number" value="0"></label><label>Cash<input id="g-c" type="number" value="0"></label><label>Boosters<input id="g-b" type="number" value="0"></label></div><button id="g-go">Envoyer</button></div>
      <h2>Compte</h2><div class="row"><input id="b-r" placeholder="Motif de suspension" style="flex:1"><button class="${p.banned ? 'green' : 'red'}" id="b-go">${p.banned ? 'Réactiver le compte' : 'Suspendre'}</button></div>
      <h2>Sauvegarde</h2><p class="muted">Dernière copie : ${date(p.save_at)}. Restaurer remplace la partie du joueur à sa prochaine connexion.</p>
      <div class="row"><button class="sec" id="sv-dl">Télécharger</button><input type="file" id="sv-f" accept=".json"><button class="red" id="sv-up">Restaurer ce fichier</button></div>
      <h2>Tickets</h2>${p.tickets.map(t => `<div class="muted">#${t.id} · ${esc(t.subject)} · <span class="tag">${t.status}</span></div>`).join('') || '<p class="muted">Aucun.</p>'}
      <h2>Activité récente</h2><div class="tl">${p.events.map(e => `<div><b>${esc(e.type)}</b> <span class="muted">${date(e.t)}</span> ${e.data && e.data !== '{}' ? `<code>${esc(e.data)}</code>` : ''}</div>`).join('') || '<div class="muted">Rien.</div>'}</div>`;
    d.querySelector('.x').onclick = () => d.remove();
    $('#dn-s').onclick = async () => { await api('/admin/api/notes', { pid, notes: $('#dn').value }); toast('Note enregistrée'); };
    $('#g-go').onclick = async () => { await api('/admin/api/gift', { pid, title: $('#g-t').value, text: $('#g-x').value, gift: { lingots: +$('#g-l').value, cash: +$('#g-c').value, boosters: +$('#g-b').value } }); toast('Envoyé : il le reçoit à sa prochaine connexion'); };
    $('#b-go').onclick = async () => { await api('/admin/api/ban', { pid, ban: !p.banned, reason: $('#b-r').value }); toast(p.banned ? 'Compte réactivé' : 'Compte suspendu'); playerDrawer(pid); };
    $('#sv-dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([p.save || '{}'], { type: 'application/json' })); a.download = `sauvegarde-${p.name || pid}.json`; a.click(); };
    $('#sv-up').onclick = async () => { const f = $('#sv-f').files[0]; if (!f) return toast('Choisis un fichier'); const r = await api('/admin/api/save', { pid, save: await f.text() }); toast(r.ok ? 'Restauration envoyée' : r.err); };
  }

  // ------------------------------------------------------------ SAV
  PAGES.support = async (status = 'ouvert') => {
    const L = await api('/admin/api/tickets?status=' + encodeURIComponent(status));
    main(`<h1>SAV</h1><div class="row" style="margin-bottom:12px">${['ouvert', 'répondu', 'fermé', 'tous'].map(s => `<button class="${s === status ? '' : 'sec'}" data-st="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>
      ${L.map(t => `<div class="card" style="margin-bottom:12px"><div class="row"><b>#${t.id} · ${esc(t.name || '?')} <span class="muted">#${esc(t.tag)} · niv. ${t.lvl ?? '?'}</span></b><span class="tag ${t.status === 'ouvert' ? 'warn' : t.status === 'fermé' ? '' : 'ok'}">${t.status}</span><span class="muted">${date(t.t)}</span><button class="ghost" data-pid="${esc(t.pid)}">Voir le joueur</button></div>
        <div class="msgs">${t.msgs.map(m => `<p class="${m.from_admin ? 'me' : ''}">${esc(m.text)}<small>${m.from_admin ? 'Toi' : 'Joueur'} · ${date(m.t)}</small></p>`).join('')}</div>
        <div class="form"><textarea data-r="${t.id}" placeholder="Ta réponse (elle arrive dans son téléphone)"></textarea><div class="row"><label class="row" style="font-weight:600">Geste : <input type="number" data-l="${t.id}" value="0" style="width:90px"> lingots</label><button data-send="${t.id}">Répondre</button><button class="sec" data-close="${t.id}">Fermer le ticket</button></div></div></div>`).join('') || '<p class="muted">Aucun ticket.</p>'}`);
    document.querySelectorAll('[data-st]').forEach(b => b.onclick = () => PAGES.support(b.dataset.st));
    document.querySelectorAll('[data-pid]').forEach(b => b.onclick = () => playerDrawer(b.dataset.pid));
    document.querySelectorAll('[data-send]').forEach(b => b.onclick = async () => { const id = b.dataset.send, l = +document.querySelector(`[data-l="${id}"]`).value;
      await api('/admin/api/reply', { ticket: +id, text: document.querySelector(`[data-r="${id}"]`).value, gift: l ? { lingots: l } : null, status: 'répondu' }); toast('Réponse envoyée'); PAGES.support(status); });
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = async () => { await api('/admin/api/reply', { ticket: +b.dataset.close, status: 'fermé' }); PAGES.support(status); });
  };

  // ------------------------------------------------------------ événements et nouveautés (réglages en direct)
  PAGES.live = async () => {
    const c = await api('/admin/api/config');
    const seasons = c.seasons || D.SEASONS || [], promos = c.promos || D.PROMOS || [], days = c.promoDays || D.PROMO_DAYS || [], ads = { ...(D.ADS || {}), ...(c.ads || {}) };
    const offers = (D.IAP || []).map(x => `<option value="${x.id}">${esc(x.name)} (${x.price})</option>`).join('');
    const sel = (v) => `<select data-k="id">${offers.replace(`value="${v}"`, `value="${v}" selected`)}</select>`;
    const seasonRow = s => `<div><div class="inline"><label>Nom<input data-k="name" value="${esc(s.name)}"></label><label>Du (MM-JJ)<input data-k="from" value="${esc(s.from)}"></label><label>Au (MM-JJ ou bf+3)<input data-k="to" value="${esc(s.to)}"></label><label>Couleur<input data-k="color" type="color" value="${esc(s.color || '#ff3cac')}"></label><label>Image du bouton<input data-k="img" value="${esc(s.img || '')}"></label></div>
      <div class="inline"><label>Offre${sel(s.deal?.id)}</label><label>Remise %<input data-k="off" type="number" value="${s.deal?.off || ''}"></label><label>Bonus lingots %<input data-k="bonus" type="number" value="${s.deal?.bonus || ''}"></label></div>
      <label>Titre<input data-k="title" value="${esc(s.deal?.title)}"></label><label>Texte<input data-k="desc" value="${esc(s.deal?.desc)}"></label><button class="sec" data-del>Supprimer</button></div>`;
    const promoRow = p => `<div><div class="inline"><label>Offre${sel(p.id)}</label><label>Remise %<input data-k="off" type="number" value="${p.off || ''}"></label><label>Bonus lingots %<input data-k="bonus" type="number" value="${p.bonus || ''}"></label></div><label>Titre<input data-k="title" value="${esc(p.title)}"></label><label>Texte<input data-k="desc" value="${esc(p.desc)}"></label><button class="sec" data-del>Supprimer</button></div>`;
    const newsRow = n => `<div><div class="inline"><label>Titre<input data-k="title" value="${esc(n.title)}"></label><label>Visible jusqu'au<input data-k="until" type="date" value="${esc((n.until || '').slice(0, 10))}"></label></div><label>Texte<textarea data-k="text">${esc(n.text)}</textarea></label><input type="hidden" data-k="id" value="${esc(n.id || 'n' + Date.now())}"><button class="sec" data-del>Supprimer</button></div>`;
    const valRow = ([k, v]) => `<div class="inline"><label>Réglage<input data-k="path" value="${esc(k)}"></label><label>Valeur<input data-k="val" value="${esc(JSON.stringify(v))}"></label><button class="sec" data-del>×</button></div>`;
    main(`<h1>Événements et nouveautés</h1><p class="muted">Tout ce qui est ici s'applique aux joueurs sans republier le jeu (à leur prochaine connexion, ou dans la minute s'ils jouent).</p>
      <div class="grid2">
        <div class="card form"><b>Annonces</b><small class="muted">Chaque annonce arrive une fois dans le téléphone des joueurs.</small><div class="lst" id="l-news">${(c.news || []).map(newsRow).join('')}</div><button class="sec" data-add="news">+ Annonce</button></div>
        <div class="card form"><b>Prochain événement</b><label>Date affichée sur le Panneau quand rien n'est en cours<input id="c-next" type="datetime-local" value="${esc((c.nextEvent || D.NEXT_EVENT?.at || '').slice(0, 16))}"></label>
          <b>Tournoi des 6 Quartiers</b><label>Jour 1 du tournoi (les journées suivent un jour après l'autre)<input id="c-six" type="date" value="${esc(c.sixStart || D.SIX?.sim || '')}"></label>
          <b>Maintenance</b><label class="row"><input type="checkbox" id="c-mt" ${c.maintenance?.on ? 'checked' : ''}> Mettre le jeu en maintenance</label><label>Message<input id="c-mtx" value="${esc(c.maintenance?.text || '')}"></label></div>
        <div class="card form"><b>Saisons commerciales</b><small class="muted">Elles remplacent l'offre du jour et changent le bouton Promo.</small><div class="lst" id="l-seasons">${seasons.map(seasonRow).join('')}</div><button class="sec" data-add="seasons">+ Saison</button></div>
        <div class="card form"><b>Offres du jour</b><small class="muted">Elles tournent, une par jour, les jours cochés.</small><div class="row days">${['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((n, i) => `<label><input type="checkbox" data-day="${i}" ${days.includes(i) ? 'checked' : ''}>${n}</label>`).join('')}</div><div class="lst" id="l-promos">${promos.map(promoRow).join('')}</div><button class="sec" data-add="promos">+ Offre</button></div>
        <div class="card form"><b>Pubs récompensées</b><div class="inline"><label>Lingots par pub<input id="a-r" type="number" value="${ads.reward}"></label><label>Pubs par jour<input id="a-n" type="number" value="${ads.perDay}"></label><label>Minutes entre deux<input id="a-c" type="number" value="${ads.cooldownMin}"></label><label>Durée (s)<input id="a-s" type="number" value="${ads.watchS}"></label></div></div>
        <div class="card form"><b>Réglages avancés</b><small class="muted">N'importe quelle valeur du jeu (data.js), ex. <code>BOOSTER.cost</code> = 10, <code>LINGOT.kiosk</code> = 2, <code>AGENCE.subPrice</code> = 0.03.</small><div class="lst" id="l-vals">${Object.entries(c.values || {}).map(valRow).join('')}</div><button class="sec" data-add="vals">+ Réglage</button></div>
      </div><div class="row" style="margin-top:16px"><button id="c-save">Publier pour tous les joueurs</button><span class="muted">Dernière publication enregistrée côté serveur.</span></div>`);
    const tpl = { news: newsRow({}), seasons: seasonRow({ deal: {} }), promos: promoRow({}), vals: valRow(['', '']) };
    const wireDel = () => document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => (b.closest('.lst > div, .inline').remove()));
    document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { $('#l-' + b.dataset.add).insertAdjacentHTML('beforeend', tpl[b.dataset.add]); wireDel(); }); wireDel();
    const rows = id => [...document.querySelectorAll(`#${id} > div, #${id} > .inline`)].map(r => Object.fromEntries([...r.querySelectorAll('[data-k]')].map(i => [i.dataset.k, i.value])));
    $('#c-save').onclick = async () => {
      const num = v => v === '' ? undefined : +v;
      const out = {
        news: rows('l-news').filter(n => n.title || n.text).map(n => ({ id: n.id, title: n.title, text: n.text, until: n.until || null })),
        nextEvent: $('#c-next').value ? new Date($('#c-next').value).toISOString() : null, sixStart: $('#c-six').value || null,
        maintenance: { on: $('#c-mt').checked, text: $('#c-mtx').value },
        seasons: rows('l-seasons').filter(s => s.name).map(s => ({ id: s.name.toLowerCase().replace(/[^a-z0-9]+/g, ''), name: s.name, from: s.from, to: s.to, color: s.color, img: s.img, deal: { id: s.id, off: num(s.off), bonus: num(s.bonus), title: s.title, desc: s.desc } })),
        promos: rows('l-promos').map(p => ({ id: p.id, off: num(p.off), bonus: num(p.bonus), title: p.title, desc: p.desc })),
        promoDays: [...document.querySelectorAll('[data-day]')].filter(i => i.checked).map(i => +i.dataset.day),
        ads: { reward: +$('#a-r').value, perDay: +$('#a-n').value, cooldownMin: +$('#a-c').value, watchS: +$('#a-s').value },
        values: Object.fromEntries(rows('l-vals').filter(v => v.path).map(v => { let x = v.val; try { x = JSON.parse(v.val); } catch (e) {} return [v.path, x]; }))
      };
      const r = await api('/admin/api/config', out); toast(r.ok ? 'Publié : les joueurs le reçoivent tout de suite' : 'Erreur');
    };
  };

  // ------------------------------------------------------------ message à tous
  PAGES.broadcast = () => {
    main(`<h1>Message à tous les joueurs</h1><div class="card form" style="max-width:640px"><label>Titre<input id="bc-t" placeholder="Ex. : Merci pour vos 10 000 parties !"></label><label>Message<textarea id="bc-x"></textarea></label>
      <div class="inline"><label>Lingots offerts<input id="bc-l" type="number" value="0"></label><label>Cash offert<input id="bc-c" type="number" value="0"></label><label>Boosters offerts<input id="bc-b" type="number" value="0"></label></div>
      <button id="bc-go">Envoyer à tout le monde</button><small class="muted">Chaque joueur le reçoit une fois, dans son téléphone, à sa prochaine connexion.</small></div>`);
    $('#bc-go').onclick = async () => { if (!confirm('Envoyer à tous les joueurs ?')) return; const r = await api('/admin/api/gift', { pid: '*', title: $('#bc-t').value, text: $('#bc-x').value, gift: { lingots: +$('#bc-l').value, cash: +$('#bc-c').value, boosters: +$('#bc-b').value } }); toast(`Envoyé à ${r.n} joueurs`); };
  };

  // ------------------------------------------------------------ journal
  PAGES.logs = async (type = '') => {
    const [E, A] = await Promise.all([api('/admin/api/events' + (type ? '?type=' + type : '')), api('/admin/api/log')]);
    main(`<h1>Journal</h1><div class="row" style="margin-bottom:10px">${['', 'session', 'install', 'levelup', 'iap_click', 'ad', 'bet', 'achievement', 'gift_received'].map(t => `<button class="${t === type ? '' : 'sec'}" data-ty="${t}">${t || 'Tout'}</button>`).join('')}</div>
      <div class="grid2"><div><h2>Ce que font les joueurs</h2><div class="tl" style="max-height:600px">${E.map(e => `<div><b>${esc(e.type)}</b> · ${esc(e.name || '?')} <span class="muted">#${esc(e.tag)} · ${date(e.t)}</span> ${e.data && e.data !== '{}' ? `<code>${esc(e.data)}</code>` : ''}</div>`).join('') || '<div class="muted">Rien.</div>'}</div></div>
      <div><h2>Ce que tu as fait ici</h2><div class="tl" style="max-height:600px">${A.map(a => `<div><b>${esc(a.action)}</b> <span class="muted">${date(a.t)}</span> <code>${esc(a.data).slice(0, 200)}</code></div>`).join('') || '<div class="muted">Rien.</div>'}</div></div></div>`);
    document.querySelectorAll('[data-ty]').forEach(b => b.onclick = () => PAGES.logs(b.dataset.ty));
  };

  // démarrage
  if (!TOKEN) showLogin(); else api('/admin/api/config').then(() => { $('#shell').classList.remove('hidden'); go('dash'); }).catch(() => {});
})();
