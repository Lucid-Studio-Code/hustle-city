/* Biff City · back office : SAV (messagerie), Événements et nouveautés (réglages en direct + aperçus), Message à tous, Journal. */
(function () {
  'use strict';
  const HC = window.HC, D = HC.D, { $, $$, esc, img, has, src, fmt, cash, eur, ago, dt, day, hm, flag } = HC;

  // ================================================================== SAV
  const QUICK = [
    ['Bonjour', 'Salut ! Merci pour ton message, on regarde ça tout de suite.'],
    ['C\'est réglé', 'C\'est réglé de notre côté : relance le jeu et dis-nous si tout est bon !'],
    ['Code de récup.', 'Pour retrouver ta partie sur ton nouveau téléphone : Réglages → Récupérer ma partie, puis colle ce code : {code}'],
    ['Pas débité', 'Les achats ne sont pas encore ouverts : rien n\'a été débité, promis. Ils arriveront avec la version App Store.'],
    ['Désolé, un geste', 'Désolé pour ce bug ! On t\'a envoyé un petit geste pour te faire pardonner.'],
    ['Ça se débloque', 'Ça se débloque en montant de niveau : continue tes missions avec Momo, tu y es presque !'],
    ['Bonne idée', 'Super idée, on la note pour une prochaine mise à jour !'],
    ['Merci !', 'Merci, ça fait super plaisir ! Bon jeu dans Biff City.']
  ];
  const GESTES = [['+10', { lingots: 10 }, 'lgt'], ['+25', { lingots: 25 }, 'lgt'], ['+2', { boosters: 2 }, 'bst'], ['+1 000', { cash: 1000 }, 'cur']];
  const ST = { status: 'ouvert', q: '' };
  const stTag = s => `<span class="tag ${s === 'ouvert' ? 'ko' : s === 'fermé' ? 'ok' : 'warn'}">${s === 'ouvert' ? 'à traiter' : esc(s)}</span>`;
  const giftOf = txt => { const m = /\s*\[cadeau : ([^\]]+)\]$/.exec(txt || ''); return m ? [txt.slice(0, m.index), m[1]] : [txt, null]; };
  const giftHtml = g => g.split(',').map(x => { const [n, k] = x.trim().split(' '); if (k === 'cobaye') return '<b class="gift-cob">Cobaye n°1</b>'; return `${fmt(+n)}${k === 'lingots' ? '<i class="lgt"></i>' : k === 'cash' ? '<i class="cur"></i>' : k === 'boosters' ? '<i class="bst"></i>' : ' ' + esc(k)}`; }).join(' ');

  HC.PAGES.support = async (P) => {
    let sel = +P.get('id') || 0, list = [], cur = null;
    if (sel) ST.status = 'tous';
    HC.main(`<div class="page-head"><div><h1>SAV</h1><div class="sub" id="sv-sub">Les messages envoyés depuis le jeu (Réglages → Contacter le support). Ta réponse arrive dans le téléphone du joueur.</div></div></div>
      <div class="inbox ${sel ? 'has-sel' : ''}" id="ib">
        <div class="ib-list"><div class="ib-tools"><input id="sv-q" placeholder="Chercher un joueur ou un sujet" value="${esc(ST.q)}"><div class="chips" id="sv-st"></div></div><div class="ib-items" id="sv-items"></div></div>
        <div class="ib-thread" id="sv-th"><div class="ib-empty"><div>${img('app-msg')}Choisis une conversation à gauche.</div></div></div>
        <div class="ib-side" id="sv-side"></div>
      </div>`);
    async function loadList() {
      const r = await HC.api(`/admin/api/tickets?status=${encodeURIComponent(ST.status)}&q=${encodeURIComponent(ST.q)}`); list = r.list;
      $('#sv-st').innerHTML = [['ouvert', 'À traiter', r.counts['ouvert']], ['en attente', 'En attente', r.counts['en attente']], ['fermé', 'Fermés', r.counts['fermé']], ['tous', 'Tous', null]].map(([k, l, n]) => `<button class="chip ${ST.status === k ? 'on' : ''}" data-st="${k}">${l}${n != null ? `<b>${n}</b>` : ''}</button>`).join('');
      $$('#sv-st [data-st]').forEach(b => b.onclick = () => { ST.status = b.dataset.st; loadList(); });
      $('#sv-items').innerHTML = list.map(t => { const l = t.last || {}; return `<div class="conv ${t.id === sel ? 'on' : ''} ${t.status === 'ouvert' && l && !l.from_admin ? 'unread' : ''}" data-tk="${esc(t.id)}">${HC.avatar(t, 44)}<div class="cv-b"><div class="cv-top"><b>${esc(t.name || '?')}</b><time>${ago(l.t || t.t)}</time></div><div class="cv-s">${esc(t.subject)}</div><div class="cv-l">${l.from_admin ? 'Toi : ' : ''}${esc(giftOf(l.text || '')[0])}</div></div></div>`; }).join('') || HC.empty(ST.status === 'ouvert' ? 'Rien à traiter, bravo !' : 'Aucune conversation.', 'icon-check');
      $$('#sv-items [data-tk]').forEach(c => c.onclick = () => open(+c.dataset.tk));
    }
    async function open(id) {
      sel = id; $$('#sv-items .conv').forEach(c => c.classList.toggle('on', +c.dataset.tk === id)); $('#ib').classList.add('has-sel');
      history.replaceState(null, '', '#page=support&id=' + id);
      const t = cur = await HC.api('/admin/api/ticket?id=' + id), p = t.player || {};
      let lastDay = '';
      $('#sv-th').innerHTML = `<div class="ib-head"><button class="btn sm ghost" id="sv-back" style="display:none">←</button>${HC.who(p, 44, `${esc(t.subject)}`)}<div class="status-sel">${['ouvert', 'en attente', 'fermé'].map(s => `<button data-s="${s}" class="${t.status === s ? 'on' : ''}">${s === 'ouvert' ? 'À traiter' : s === 'en attente' ? 'En attente' : 'Fermé'}</button>`).join('')}</div></div>
        <div class="ib-msgs" id="sv-msgs">${t.msgs.map(m => { const d = day(m.t), sep = d !== lastDay ? `<span class="day-sep">${d}</span>` : ''; lastDay = d; const [txt, g] = giftOf(m.text);
          return `${sep}<div class="bub ${m.from_admin ? 'me' : ''}">${esc(txt)}${g ? `<br><span class="gift-tag">${img('icon-gift', 'ico')} ${giftHtml(g)}</span>` : ''}<small>${m.from_admin ? 'Toi' : esc(p.name || 'Joueur')} · ${hm(m.t)}</small></div>`; }).join('')}</div>
        <div class="ib-compose"><div class="qr">${QUICK.map((q, i) => `<button class="chip" data-q="${i}">${esc(q[0])}</button>`).join('')}</div>
          <textarea id="sv-txt" placeholder="Ta réponse à ${esc(p.name || 'ce joueur')}…"></textarea>
          <div class="row"><span class="help">Geste en un clic :</span>${GESTES.map((g, i) => `<button class="chip" data-g="${i}">${g[0]}<i class="${g[2]}"></i></button>`).join('')}
            <button class="chip sv-useful" id="sv-useful" title="15 lingots + 2 boosters + la carte légendaire « Le Cobaye n°1 » (collection Bêta)">${img('icon-star', 'ico')} Retour utile</button><span style="flex:1"></span><button class="btn sm ghost" id="sv-close">Répondre et fermer</button><button class="btn green" id="sv-send">Répondre</button></div></div>`;
      const box = $('#sv-msgs'); box.scrollTop = box.scrollHeight;
      if (window.matchMedia('(max-width: 820px)').matches) { $('#sv-back').style.display = ''; $('#sv-back').onclick = () => { $('#ib').classList.remove('has-sel'); sel = 0; }; }
      $$('#sv-th [data-s]').forEach(b => b.onclick = async () => { await HC.api('/admin/api/reply', { ticket: id, status: b.dataset.s }); HC.toast('Statut : ' + b.dataset.s, 'icon-check'); loadList(); open(id); });
      $$('#sv-th [data-q]').forEach(b => b.onclick = async () => { let txt = QUICK[+b.dataset.q][1]; if (txt.includes('{code}')) { const pl = await HC.api('/admin/api/player?pid=' + encodeURIComponent(t.pid)); txt = txt.replace('{code}', pl.recovery); } const ta = $('#sv-txt'); ta.value = (ta.value ? ta.value.trim() + '\n' : '') + txt; ta.focus(); });
      // retour utile (bug trouvé, idée retenue…) : la récompense promise sur biffcity.fr, avec la légendaire de la collection Bêta
      $('#sv-useful').onclick = async () => {
        const g = { lingots: 15, boosters: 2, cobaye: 1 }, msg = $('#sv-txt').value.trim() || 'Merci pour ton retour, il nous aide vraiment à améliorer Biff City ! En cadeau : 15 lingots, 2 boosters et la carte légendaire « Le Cobaye n°1 » de la collection Bêta (si tu l\'as déjà, 20 lingots de plus à la place).';
        if (!(await HC.confirm('Récompenser ce retour utile ?', `<b>${HC.giftTxt(g)}</b> pour ${esc(p.name || 'ce joueur')}, avec le message :<br>« ${esc(msg)} »`, 'Envoyer la récompense'))) return;
        await HC.api('/admin/api/reply', { ticket: id, text: msg, gift: g, status: 'fermé' }); HC.toast('Retour récompensé', 'icon-star'); loadList(); open(id);
      };
      $$('#sv-th [data-g]').forEach(b => b.onclick = async () => { const g = GESTES[+b.dataset.g][1]; const msg = $('#sv-txt').value.trim() || 'Désolé pour le souci ! Voilà un petit geste de notre part.';
        if (!(await HC.confirm('Envoyer ce geste ?', `<b>${HC.giftTxt(g)}</b> pour ${esc(p.name || 'ce joueur')}, avec le message :<br>« ${esc(msg)} »`, 'Envoyer le geste'))) return;
        await HC.api('/admin/api/reply', { ticket: id, text: msg, gift: g, status: 'en attente' }); HC.toast('Geste envoyé', 'icon-gift'); loadList(); open(id); });
      const send = async st => { const txt = $('#sv-txt').value.trim(); if (!txt && st !== 'fermé') return HC.toast('Écris d\'abord ta réponse', null, true); await HC.api('/admin/api/reply', { ticket: id, text: txt, status: st }); HC.toast(st === 'fermé' ? 'Répondu et fermé' : 'Réponse envoyée', 'app-msg'); loadList(); open(id); };
      $('#sv-send').onclick = () => send('en attente'); $('#sv-close').onclick = () => send('fermé');
      $('#sv-txt').onkeydown = e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send('en attente'); };
      $('#sv-side').innerHTML = `${HC.avatar(p, 90)}<h3>${esc(p.name || '?')} <small class="mut">#${esc(p.tag || '')}</small></h3>
        <div style="text-align:center">${p.online ? '<span class="tag ok">en ligne</span>' : `<span class="tag">vu ${ago(p.last_seen)}</span>`} ${p.banned ? '<span class="tag ko">suspendu</span>' : ''}</div>
        <div class="kv"><span>Niveau</span><b>${esc(p.lvl || 1)}</b><span>Cash</span><b>${cash(p.cash)}</b><span>Lingots</span><b>${fmt(p.lingots)}<i class="lgt"></i></b><span>Patrimoine</span><b>${cash(p.worth)}</b><span>Ville</span><b>${p.city ? flag(p.cc) + ' ' + esc(p.city) : '–'}</b><span>Appareil</span><b>${esc(HC.platform(p.platform))}</b><span>Inscrit</span><b>${dt(p.created, { day: 'numeric', month: 'short' })}</b></div>
        <button class="btn sm" data-pid="${esc(p.pid)}">Voir sa fiche complète</button>
        ${p.notes ? `<div class="note">${esc(p.notes)}</div>` : ''}
        ${t.others.length ? `<div><div class="card-h" style="font-size:14px">Autres demandes</div>${t.others.map(o => `<div class="hist-row" style="cursor:pointer" data-tk2="${esc(o.id)}"><span>${esc(o.subject)}<br><small>${ago(o.t)}</small></span>${stTag(o.status)}</div>`).join('')}</div>` : ''}`;
      $$('#sv-side [data-tk2]').forEach(b => b.onclick = () => open(+b.dataset.tk2));
    }
    let tmr; $('#sv-q').oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => { ST.q = $('#sv-q').value.trim(); loadList(); }, 250); };
    await loadList(); if (sel) await open(sel);
    HC.timers.push(setInterval(() => { if (document.activeElement && document.activeElement.id === 'sv-txt') return; loadList().catch(() => {}); }, 20000));
  };

  // ================================================================== ÉVÉNEMENTS ET NOUVEAUTÉS
  const DOW = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'], DOWL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const toLocal = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const fromLocal = v => v ? new Date(v).toISOString() : null;
  const bfDate = y => { const d = new Date(y, 10, 1); const th = (4 - d.getDay() + 7) % 7 + 1 + 21; return new Date(y, 10, th + 1); };
  const seasonDate = (v, y) => { if (!v) return null; if (v.startsWith('bf')) { const b = bfDate(y); b.setDate(b.getDate() + (+v.slice(3) || 0)); return b; } const [m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };
  const longDate = d => d ? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const iap = id => (D.IAP || []).find(x => x.id === id) || {};
  const euro = s => +String(s || '0').replace(/[^\d,]/g, '').replace(',', '.') || 0;
  const offerOpts = v => (D.IAP || []).map(x => `<option value="${x.id}" ${x.id === v ? 'selected' : ''}>${esc(x.name)} (${esc(x.price)})</option>`).join('');
  const promoImgs = cur => { const L = [...new Set([...(window.ASSETS || []).filter(n => /^ic-promo/.test(n)), ...(D.SEASONS || []).map(s => s.img).filter(Boolean), cur].filter(Boolean))]; return L.map(n => `<option value="${esc(n)}" ${n === cur ? 'selected' : ''}>${esc(n)}${has(n) ? '' : ' (image à venir)'}</option>`).join(''); };
  const fld = (label, help, input) => `<div class="fld"><label>${label}</label>${input}${help ? `<div class="help">${help}</div>` : ''}</div>`;
  function offerCard(deal, color, rib) {
    const o = iap(deal.id), base = euro(o.price), off = +deal.off || 0, bonus = +deal.bonus || 0;
    const price = off ? `<s>${esc(o.price || '')}</s>${eur(Math.max(.49, base * (1 - off / 100)))}` : esc(o.price || '');
    return `<div class="offer-card" style="--pc:${esc(color || 'var(--pink)')}"><span class="oc-rib">${esc(rib || 'PROMO')}</span><h4>${esc(deal.title || o.name || 'Offre')}</h4><p>${esc(deal.desc || o.desc || '')}${bonus && o.n ? `<br><b>${fmt(Math.round(o.n * (1 + bonus / 100)))} lingots au lieu de ${fmt(o.n)}</b>` : ''}</p><div class="price">${price}</div><span class="oc-btn">Voir l'offre</span></div>`;
  }
  const promoBtn = (imgName, color, tag, name) => `<div class="promo-btn" style="--pc:${esc(color || 'var(--pink)')}"><span class="pb-bg"></span>${img(has(imgName) ? imgName : 'ic-promo')}${tag ? `<span class="pb-tag">${esc(tag)}</span>` : ''}${name ? `<span class="pb-name">${esc(name)}</span>` : ''}</div>`;
  const dealTag = d => (d || {}).off ? '−' + d.off + ' %' : (d || {}).bonus ? '+' + d.bonus + ' %' : '';

  HC.PAGES.live = async () => {
    const [c, logs] = await Promise.all([HC.api('/admin/api/config'), HC.api('/admin/api/log')]);
    let lastPubT = (logs.find(l => l.action === 'config') || {}).t;
    const S = {
      news: (c.news || []).map(n => ({ ...n })), nextEvent: c.nextEvent || (D.NEXT_EVENT || {}).at || null, sixStart: c.sixStart ?? ((D.SIX || {}).sim || ''),
      maintenance: { on: false, text: '', ...(c.maintenance || {}) }, seasons: JSON.parse(JSON.stringify(c.seasons || D.SEASONS || [])), promos: JSON.parse(JSON.stringify(c.promos || D.PROMOS || [])),
      promoDays: [...(c.promoDays || D.PROMO_DAYS || [])], ads: { ...(D.ADS || {}), ...(c.ads || {}) }, values: { ...(c.values || {}) }
    };
    let dirty = false, fSeason = 0, fPromo = 0;
    const SECS = [['ev-news', 'Annonces', 'ic-rumor'], ['ev-maint', 'Maintenance', 'hdr-settings'], ['ev-next', 'Prochain événement', 'bld-six-off'], ['ev-six', 'Tournoi', 'bld-six'], ['ev-ads', 'Pubs', 'bonus-lingots'], ['ev-adv', 'Avancé', 'btn-setup']];
    HC.main(`<div class="page-head"><div><h1>Événements et nouveautés</h1><div class="sub">Tout ce qui est ici change le jeu chez tous les joueurs, sans republier le jeu : dans la minute pour ceux qui jouent, à la connexion pour les autres.</div></div></div>
      <div class="subnav">${SECS.map(([id, l, i]) => `<button class="chip" data-scroll="${id}">${img(i)}${l}</button>`).join('')}</div>
      <div class="card pm-note" style="margin-bottom:16px">${img('ic-promo')}<div><b>Les promos ont leur propre page</b><p class="help">Halloween, Black Friday, Noël, offres flash : tout se fait dans « Promos », une promo à la fois.</p></div><button class="btn" data-go="promos">Ouvrir les promos</button></div>
      <div id="ev-body"></div>
      <div class="publish-bar" id="pub-bar"><span class="pb-txt" id="pub-txt"></span><button class="btn ghost" id="pub-reset">Annuler mes changements</button><button class="btn lg green" id="pub-go">${img('icon-check')}Publier pour tous les joueurs</button></div>`);
    const setDirty = v => { dirty = v; $('#pub-bar').classList.toggle('dirty', v); $('#pub-txt').innerHTML = v ? '<b>Changements pas encore publiés.</b> Les joueurs ne les voient pas tant que tu n\'as pas cliqué sur « Publier ».' : `Tout est publié${lastPubT ? ` (dernière publication ${ago(lastPubT)})` : ''}.`; };

    // ---------------- aperçus (redessinés à chaque frappe, sans toucher au formulaire)
    const PV = {
      news() { const now = new Date(), L = S.news.filter(n => n.title || n.text).slice(0, 3);
        return `<div class="prev-lbl">Ce que voit le joueur</div><div class="phone"><div class="scr"><div class="clock"><small>${esc(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</small>${hm(now)}</div>
          ${L.map((n, i) => `<div class="notif" style="${i ? 'opacity:.85' : ''}">${img('app-missions')}<div><div class="nh"><span>Biff City</span><span>${i ? 'il y a ' + (i * 5) + ' min' : 'maintenant'}</span></div><b>${esc(n.title || 'Biff City')}</b><p>${esc(n.text || '')}</p></div></div>`).join('') || `<div class="notif">${img('app-missions')}<div><b>Ton annonce ici</b><p>Écris un titre et un message à gauche.</p></div></div>`}</div></div>`; },
      maint() { const m = S.maintenance; return `<div class="prev-lbl">Ce que voit le joueur</div><div class="gamescr">${m.on ? `<div class="maint"><div><b>Maintenance</b><p>${esc(m.text || 'Le jeu est en maintenance, reviens dans un petit moment.')}</p></div></div>` : '<div class="off">Le jeu tourne normalement</div>'}</div>`; },
      next() { const ne = S.nextEvent ? new Date(S.nextEvent) : null, left = ne ? ne - Date.now() : 0, cd = left > 0 ? [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60] : null;
        return `<div class="prev-lbl">Le Panneau de la place</div><div class="board">${img('bld-six-off')}<b>Prochain événement</b>${cd ? `<div class="cd"><span>${cd[0]}<small>jours</small></span><span>${cd[1]}<small>heures</small></span><span>${cd[2]}<small>min</small></span></div><p>Reviens le ${esc(longDate(ne))} à ${hm(ne)}</p>` : ne ? '<p style="margin-top:10px">Cette date est déjà passée.</p>' : '<p style="margin-top:10px">Bientôt…</p>'}</div>`; },
      six() { const now = new Date(), s0 = S.sixStart ? new Date(S.sixStart + 'T12:00') : null;
        return `<div class="prev-lbl">Le calendrier vu par les joueurs</div><div class="board">${img('bld-six')}<b>${esc((D.SIX || {}).name || 'Tournoi')}</b><div class="six-days">${s0 ? Array.from({ length: 5 }, (_, i) => { const d = new Date(s0); d.setDate(d.getDate() + i); const td = d.toDateString() === now.toDateString(); return `<div class="${td ? 'today' : ''}"><b>Journée ${i + 1}</b><span>${esc(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }))}${td ? ' · aujourd\'hui' : ''}</span></div>`; }).join('') : '<div><b>Journée 1</b><span>ven. 5 févr. 2027</span></div><div><b>Journée 5</b><span>sam. 13 mars 2027</span></div>'}</div></div>`; },
      seasons() { const fs = S.seasons[fSeason], y = new Date().getFullYear(); if (!fs) return '<div class="prev-lbl">Le bouton Promo</div>' + HC.empty('Ajoute une saison.');
        return `<div class="prev-lbl">Le bouton Promo et son offre</div>${promoBtn(fs.img, fs.color, dealTag(fs.deal), fs.name)}${offerCard(fs.deal || {}, fs.color, (fs.name || '').toUpperCase())}<p class="help" style="text-align:center;margin-top:10px">Du ${esc(longDate(seasonDate(fs.from, y)))} au ${esc(longDate(seasonDate(fs.to, y)))}${(fs.from || '').startsWith('bf') ? ' (Black Friday ' + y + ')' : ''}</p>`; },
      promos() { const fp = S.promos[fPromo], n = Math.max(1, S.promos.length);
        const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() + i * 864e5); return { d, on: S.promoDays.includes(d.getDay()), p: S.promos[Math.floor((Date.now() + i * 864e5) / 864e5) % n] }; });
        return `<div class="prev-lbl">Les 7 prochains jours</div><div class="card" style="padding:8px 12px;margin-bottom:16px">${week.map(w => `<div class="hist-row"><span><b>${DOWL[w.d.getDay()]}</b> <small>${w.d.getDate()}/${w.d.getMonth() + 1}</small></span>${w.on && w.p ? `<span class="tag pink">${esc(w.p.title || HC.offerName(w.p.id))}</span>` : '<span class="tag">boutique</span>'}</div>`).join('')}</div>
          ${fp ? promoBtn('ic-promo', null, dealTag(fp), 'PROMO') + offerCard(fp, null, 'PROMO DU JOUR') : ''}`; },
      ads() { const a = S.ads; return `<div class="prev-lbl">La fenêtre de pub</div><div class="ad-prev"><div class="tv"><span>Pub · ${fmt(a.watchS)} s</span></div><b>+${fmt(a.reward)}<i class="lgt"></i></b><p>Regarde une pub de ${fmt(a.watchS)} secondes pour gagner ${fmt(a.reward)} lingots.</p><p>${fmt(a.perDay)} par jour, une toutes les ${fmt(a.cooldownMin)} min : jusqu'à <b>${fmt(a.reward * a.perDay)} lingots</b> par jour.</p></div>`; }
    };
    const upd = k => { const el = document.getElementById('pv-' + k); if (el) el.innerHTML = PV[k](); setDirty(true); };
    const ed = (id, k, title, icon, sub, body) => `<div class="ed" id="${id}" style="margin-top:18px"><div class="card"><div class="card-h">${img(icon)}${title}<small>${sub}</small></div>${body}</div><div class="prev" id="pv-${k}">${PV[k]()}</div></div>`;
    function dateField(label, help, k, v, isEnd) {
      const bf = (v || '').startsWith('bf'), y = new Date().getFullYear();
      return fld(label, help, `<div style="display:flex;gap:6px;flex-wrap:wrap"><select data-dm="${k}" style="flex:1;min-width:120px"><option value="date" ${bf ? '' : 'selected'}>Date fixe</option><option value="bf" ${bf ? 'selected' : ''}>Black Friday${isEnd ? ' + jours' : ''}</option></select>
        ${bf ? (isEnd ? `<input type="number" min="0" max="20" data-bfn="${k}" value="${esc(+(v || '').slice(3) || 0)}" style="width:80px">` : '') : `<input type="date" data-dv="${k}" value="${esc(v ? `${y}-${v}` : '')}" style="flex:1;min-width:140px">`}</div>`);
    }
    function render() {
      const now = new Date(), y = now.getFullYear(), todayIdx = Math.floor(Date.now() / 864e5) % Math.max(1, S.promos.length);
      $('#ev-body').innerHTML =
        ed('ev-news', 'news', 'Annonces', 'ic-rumor', 'chaque joueur reçoit chaque annonce une seule fois', `
          ${S.news.map((n, i) => `<div class="lst-item" data-news="${i}"><button class="btn sm ghost del" data-del-news="${i}">Supprimer</button><div class="lh">${img('app-missions')}<b>Annonce ${i + 1}</b>${n.until && Date.parse(n.until) < Date.now() ? '<span class="tag">expirée</span>' : '<span class="tag ok">active</span>'}</div>
            ${fld('Titre', 'Le titre de la notification, en gras dans le téléphone du joueur.', `<input data-k="title" value="${esc(n.title || '')}" placeholder="Ex. : Le tournoi commence !" maxlength="80">`)}
            ${fld('Message', 'Le texte complet de l\'annonce. Court et clair : 1 ou 2 phrases.', `<textarea data-k="text" maxlength="400" placeholder="Ex. : Fais tes pronos gratuits au Panneau de la place.">${esc(n.text || '')}</textarea>`)}
            ${fld('Visible jusqu\'au', 'Après cette date, les joueurs qui se connectent ne la reçoivent plus. Vide = pas de limite.', `<input type="datetime-local" data-k="until" value="${esc(toLocal(n.until))}">`)}</div>`).join('') || '<p class="help">Aucune annonce pour l\'instant.</p>'}
          <button class="btn sm blue" id="add-news">+ Nouvelle annonce</button>`).replace('style="margin-top:18px"', '')
        + ed('ev-maint', 'maint', 'Maintenance', 'hdr-settings', 'à utiliser pendant une grosse mise à jour', `
          <div class="fld"><label><span class="switch"><input type="checkbox" id="mt-on" ${S.maintenance.on ? 'checked' : ''}><i></i></span><span id="mt-lb">${S.maintenance.on ? '<span style="color:var(--red)">Le jeu est en maintenance</span>' : 'Mettre le jeu en maintenance'}</span></label><div class="help">Quand c'est activé, plus personne ne peut jouer : un écran sombre avec ton message recouvre le jeu. Pense à le désactiver après !</div></div>
          ${fld('Message affiché', 'Ce que lisent les joueurs pendant la maintenance. Dis quand ça revient.', `<input id="mt-txt" value="${esc(S.maintenance.text || '')}" placeholder="Le jeu est en maintenance, reviens dans un petit moment.">`)}`)
        + ed('ev-next', 'next', 'Prochain événement', 'bld-six-off', 'quand aucun événement n\'est en cours', `
          ${fld('Date et heure du prochain événement', 'Le Panneau de la place affiche un compte à rebours jusqu\'à cette date. Vide = « Bientôt ».', `<input type="datetime-local" id="ne-at" value="${esc(toLocal(S.nextEvent))}">`)}
          <div class="chips">${[7, 14, 30].map(d => `<button class="chip" data-ne="${d}">Dans ${d} jours</button>`).join('')}<button class="chip" data-ne="0">Effacer</button></div>`)
        + ed('ev-six', 'six', 'Tournoi des 6 Quartiers', 'bld-six', 'le tournoi de rugby du Panneau', `
          ${fld('Jour 1 du tournoi', 'Les 5 journées s\'enchaînent un jour après l\'autre, aux heures du vrai tournoi. Vide = vrai calendrier 2027 (5 févr. → 13 mars).', `<input type="date" id="six-d" value="${esc(S.sixStart || '')}">`)}
          <div class="chips"><button class="chip" data-six="today">Commencer aujourd'hui</button><button class="chip" data-six="tomorrow">Demain</button><button class="chip" data-six="">Vrai calendrier 2027</button></div>`)
        + ed('ev-seasons', 'seasons', 'Saisons commerciales', 'ic-promo', 'Halloween, Black Friday, Noël…', `
          <p class="help" style="margin:-4px 0 12px">Pendant une saison, le bouton Promo (à gauche dans la ville) prend ses couleurs et propose son offre, à la place de l'offre du jour. Clique sur une saison pour voir son aperçu.</p>
          ${S.seasons.map((s, i) => { const a = seasonDate(s.from, y), b = seasonDate(s.to, y), on = a && b && now >= a && now < new Date(b.getTime() + 864e5);
            return `<div class="lst-item ${i === fSeason ? 'sel' : ''}" data-season="${i}"><button class="btn sm ghost del" data-del-season="${i}">Supprimer</button><div class="lh">${img(has(s.img) ? s.img : 'ic-promo')}<b>${esc(s.name || 'Nouvelle saison')}</b>${on ? '<span class="tag ok">en cours</span>' : a && a > now ? `<span class="tag">dans ${Math.ceil((a - now) / 864e5)} j</span>` : '<span class="tag">passée cette année</span>'}</div>
              <div class="row2">${fld('Nom', 'Écrit sur le bouton Promo pendant la saison.', `<input data-k="name" value="${esc(s.name || '')}" placeholder="Ex. : Halloween">`)}${fld('Couleur', 'La couleur du bouton Promo.', `<input type="color" data-k="color" value="${esc(s.color || '#ff3cac')}">`)}</div>
              <div class="row2">${dateField('Début', 'Premier jour de la saison (chaque année).', 'from', s.from, false)}${dateField('Fin', 'Dernier jour inclus.', 'to', s.to, true)}</div>
              ${fld('Image du bouton', 'L\'image du bouton Promo pendant la saison.', `<select data-k="img">${promoImgs(s.img)}</select>`)}
              <div class="row3">${fld('Offre mise en avant', 'Le pack proposé pendant la saison.', `<select data-k="deal.id">${offerOpts((s.deal || {}).id)}</select>`)}${fld('Réduction (%)', 'Baisse du prix. Vide = pas de réduction.', `<input type="number" min="0" max="90" data-k="deal.off" value="${esc((s.deal || {}).off ?? '')}">`)}${fld('Bonus lingots (%)', 'Lingots en plus (packs de lingots).', `<input type="number" min="0" max="200" data-k="deal.bonus" value="${esc((s.deal || {}).bonus ?? '')}">`)}</div>
              ${fld('Titre de l\'offre', 'Le gros titre de la fenêtre de l\'offre.', `<input data-k="deal.title" value="${esc((s.deal || {}).title || '')}">`)}
              ${fld('Description', 'Ce que contient l\'offre, en une phrase.', `<input data-k="deal.desc" value="${esc((s.deal || {}).desc || '')}">`)}</div>`; }).join('')}
          <button class="btn sm blue" id="add-season">+ Nouvelle saison</button>`)
        + ed('ev-promos', 'promos', 'Offres du jour', 'ev-sale', 'hors saison commerciale', `
          <div class="fld"><div class="lb">Les jours où il y a une promo</div><div class="days-pick">${[1, 2, 3, 4, 5, 6, 0].map(i => `<label><input type="checkbox" data-day="${i}" ${S.promoDays.includes(i) ? 'checked' : ''}><span>${DOW[i]}</span></label>`).join('')}</div><div class="help">Les autres jours, le bouton Promo redevient une simple boutique. Les offres ci-dessous tournent : une différente chaque jour, changement à minuit.</div></div>
          ${S.promos.map((p, i) => `<div class="lst-item ${i === fPromo ? 'sel' : ''}" data-promo="${i}"><button class="btn sm ghost del" data-del-promo="${i}">Supprimer</button><div class="lh">${img(HC.offerIcon ? HC.offerIcon(p.id) : 'ic-promo')}<b>${esc(p.title || 'Offre ' + (i + 1))}</b>${i === todayIdx && S.promoDays.includes(now.getDay()) ? '<span class="tag ok">aujourd\'hui</span>' : ''}</div>
            <div class="row3">${fld('Pack', 'L\'achat intégré concerné.', `<select data-k="id">${offerOpts(p.id)}</select>`)}${fld('Réduction (%)', 'Baisse du prix affiché.', `<input type="number" min="0" max="90" data-k="off" value="${esc(p.off ?? '')}">`)}${fld('Bonus lingots (%)', 'Lingots en plus.', `<input type="number" min="0" max="200" data-k="bonus" value="${esc(p.bonus ?? '')}">`)}</div>
            ${fld('Titre', 'Le titre de l\'offre dans la fenêtre Promo.', `<input data-k="title" value="${esc(p.title || '')}">`)}${fld('Description', 'Ce que contient l\'offre.', `<input data-k="desc" value="${esc(p.desc || '')}">`)}</div>`).join('')}
          <button class="btn sm blue" id="add-promo">+ Nouvelle offre</button>`)
        + ed('ev-ads', 'ads', 'Pubs récompensées', 'bonus-lingots', 'regarder une pub pour gagner des lingots', `
          <div class="row2">${fld('Lingots par pub', 'Ce que gagne le joueur à chaque pub regardée jusqu\'au bout.', `<input type="number" min="0" id="ad-r" value="${esc(S.ads.reward)}">`)}${fld('Pubs par jour', 'Le maximum de pubs récompensées par joueur et par jour.', `<input type="number" min="0" id="ad-n" value="${esc(S.ads.perDay)}">`)}</div>
          <div class="row2">${fld('Minutes entre deux pubs', 'Le temps d\'attente avant de pouvoir en regarder une autre.', `<input type="number" min="0" id="ad-c" value="${esc(S.ads.cooldownMin)}">`)}${fld('Durée d\'une pub (secondes)', 'La durée de la pub à regarder avant la récompense.', `<input type="number" min="1" id="ad-s" value="${esc(S.ads.watchS)}">`)}</div>`)
        + `<div class="card" id="ev-adv" style="margin-top:18px"><details class="adv" ${Object.keys(S.values).length ? 'open' : ''}><summary>${img('btn-setup', 'ico')} Réglages avancés : n'importe quelle valeur du jeu</summary>
          <p class="help">Pour les réglages qui n'ont pas de formulaire. Ex. <code>BOOSTER.cost</code> = 10, <code>LINGOT.kiosk</code> = 2, <code>ADS.reward</code> = 4. Le chemin suit les noms de <code>js/data.js</code>.</p>
          <div id="vals">${Object.entries(S.values).map(([k, v]) => valRow(k, JSON.stringify(v))).join('')}</div><button class="btn sm blue" id="add-val">+ Réglage</button></details>
          <details class="adv" style="margin-top:12px"><summary>${img('hdr-missions', 'ico')} Tout le réglage en texte (JSON), pour les experts</summary><p class="help">C'est exactement ce qui est envoyé aux joueurs. Modifie avec prudence, puis « Appliquer ».</p><textarea class="json" id="raw"></textarea><button class="btn sm" id="raw-go" style="margin-top:8px">Appliquer ce texte au formulaire</button></details></div>`;
      wire();
    }
    const valRow = (k = '', v = '') => `<div class="val-row" data-val><input data-k="path" value="${esc(k)}" placeholder="Réglage (ex. BOOSTER.cost)"><input data-k="val" value="${esc(v)}" placeholder="Valeur"><button class="btn sm ghost" data-del-val>Supprimer</button></div>`;
    function out() {
      const num = v => v === '' || v == null || isNaN(+v) ? undefined : +v;
      return {
        news: S.news.filter(n => n.title || n.text).map(n => ({ id: n.id || 'n' + Date.now(), title: n.title || '', text: n.text || '', until: n.until || null })),
        nextEvent: S.nextEvent || null, sixStart: S.sixStart || null, maintenance: { on: !!S.maintenance.on, text: S.maintenance.text || '' },
        seasons: S.seasons.filter(s => s.name).map(s => ({ ...s, id: s.id || s.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, ''), deal: { ...(s.deal || {}), off: num((s.deal || {}).off), bonus: num((s.deal || {}).bonus) } })),
        promos: S.promos.map(p => ({ ...p, off: num(p.off), bonus: num(p.bonus) })), promoDays: [...S.promoDays].sort(),
        campaigns: c.campaigns, ads: { reward: +S.ads.reward || 0, perDay: +S.ads.perDay || 0, cooldownMin: +S.ads.cooldownMin || 0, watchS: +S.ads.watchS || 0 }, values: S.values
      };
    }
    const setPath = (o, k, v) => { const ks = k.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]] = x[ks[i]] || {}; x[ks[ks.length - 1]] = v; };
    const evName = el => el.tagName === 'SELECT' || ['checkbox', 'color', 'date', 'datetime-local'].includes(el.type) ? 'change' : 'input';
    const on = (el, fn) => el && el.addEventListener(evName(el), () => fn(el.value, el));
    const reAll = () => { const y = window.scrollY; render(); window.scrollTo(0, y); setDirty(true); };
    function wire() {
      $$('[data-news]').forEach(box => { const i = +box.dataset.news; $$('[data-k]', box).forEach(el => on(el, v => { S.news[i][el.dataset.k] = el.dataset.k === 'until' ? fromLocal(v) : v; upd('news'); })); });
      $$('[data-del-news]').forEach(b => b.onclick = () => { S.news.splice(+b.dataset.delNews, 1); reAll(); });
      $('#add-news').onclick = () => { S.news.unshift({ id: 'n' + Date.now(), title: '', text: '', until: null }); reAll(); setTimeout(() => $('[data-news="0"] [data-k="title"]').focus(), 30); };
      on($('#mt-on'), (v, el) => { S.maintenance.on = el.checked; $('#mt-lb').innerHTML = el.checked ? '<span style="color:var(--red)">Le jeu est en maintenance</span>' : 'Mettre le jeu en maintenance'; upd('maint'); });
      on($('#mt-txt'), v => { S.maintenance.text = v; upd('maint'); });
      on($('#ne-at'), v => { S.nextEvent = fromLocal(v); upd('next'); });
      $$('[data-ne]').forEach(b => b.onclick = () => { const d = +b.dataset.ne; if (!d) S.nextEvent = null; else { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(18, 0, 0, 0); S.nextEvent = x.toISOString(); } $('#ne-at').value = toLocal(S.nextEvent); upd('next'); });
      on($('#six-d'), v => { S.sixStart = v || ''; upd('six'); });
      $$('[data-six]').forEach(b => b.onclick = () => { const v = b.dataset.six; if (!v) S.sixStart = ''; else { const d = new Date(); if (v === 'tomorrow') d.setDate(d.getDate() + 1); S.sixStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; } $('#six-d').value = S.sixStart; upd('six'); });
      $$('[data-season]').forEach(box => { const i = +box.dataset.season, s = S.seasons[i];
        const focus = () => { if (fSeason !== i) { fSeason = i; $$('[data-season]').forEach(b => b.classList.toggle('sel', b === box)); upd('seasons'); setDirty(dirty); } };
        box.addEventListener('focusin', focus); box.addEventListener('click', e => { if (!e.target.closest('button')) focus(); });
        $$('[data-k]', box).forEach(el => on(el, v => { setPath(s, el.dataset.k, v); fSeason = i; if (el.dataset.k === 'name') $('.lh b', box).textContent = v || 'Nouvelle saison'; if (el.dataset.k === 'img') $('.lh img', box).src = src(has(v) ? v : 'ic-promo'); upd('seasons'); }));
        $$('[data-dm]', box).forEach(el => on(el, v => { const k = el.dataset.dm; s[k] = v === 'bf' ? (k === 'to' ? 'bf+3' : 'bf') : (k === 'to' ? '12-31' : '12-01'); fSeason = i; reAll(); }));
        $$('[data-dv]', box).forEach(el => on(el, v => { if (v) { s[el.dataset.dv] = v.slice(5); upd('seasons'); } }));
        $$('[data-bfn]', box).forEach(el => on(el, v => { s[el.dataset.bfn] = 'bf+' + (+v || 0); upd('seasons'); })); });
      $$('[data-del-season]').forEach(b => b.onclick = async () => { const s = S.seasons[+b.dataset.delSeason]; if (!(await HC.confirm('Supprimer la saison « ' + (s.name || '') + ' » ?', 'Elle ne reviendra plus chaque année (après publication).', 'Supprimer', 'red'))) return; S.seasons.splice(+b.dataset.delSeason, 1); fSeason = 0; reAll(); });
      $('#add-season').onclick = () => { S.seasons.push({ name: 'Nouvelle saison', from: '12-01', to: '12-07', color: '#ff3cac', img: 'ic-promo', deal: { id: 'l-600', off: 30, title: '', desc: '' } }); fSeason = S.seasons.length - 1; reAll(); };
      $$('[data-day]').forEach(el => on(el, () => { S.promoDays = $$('[data-day]').filter(x => x.checked).map(x => +x.dataset.day); upd('promos'); }));
      $$('[data-promo]').forEach(box => { const i = +box.dataset.promo;
        const focus = () => { if (fPromo !== i) { fPromo = i; $$('[data-promo]').forEach(b => b.classList.toggle('sel', b === box)); upd('promos'); setDirty(dirty); } };
        box.addEventListener('focusin', focus); box.addEventListener('click', e => { if (!e.target.closest('button')) focus(); });
        $$('[data-k]', box).forEach(el => on(el, v => { S.promos[i][el.dataset.k] = v; fPromo = i; if (el.dataset.k === 'title') $('.lh b', box).textContent = v || 'Offre ' + (i + 1); upd('promos'); })); });
      $$('[data-del-promo]').forEach(b => b.onclick = () => { S.promos.splice(+b.dataset.delPromo, 1); fPromo = 0; reAll(); });
      $('#add-promo').onclick = () => { S.promos.push({ id: 'l-280', off: 30, title: 'Nouvelle offre', desc: '' }); fPromo = S.promos.length - 1; reAll(); };
      [['#ad-r', 'reward'], ['#ad-n', 'perDay'], ['#ad-c', 'cooldownMin'], ['#ad-s', 'watchS']].forEach(([id, k]) => on($(id), v => { S.ads[k] = +v; upd('ads'); }));
      const readVals = () => { const o = {}; $$('[data-val]').forEach(r => { const pth = $('[data-k="path"]', r).value.trim(); let v = $('[data-k="val"]', r).value; if (!pth) return; try { v = JSON.parse(v); } catch (e) {} o[pth] = v; }); S.values = o; setDirty(true); };
      const wireVal = r => { $$('input', r).forEach(el => el.addEventListener('change', readVals)); $('[data-del-val]', r).onclick = () => { r.remove(); readVals(); }; };
      $$('[data-val]').forEach(wireVal);
      $('#add-val').onclick = () => { $('#vals').insertAdjacentHTML('beforeend', valRow()); const r = $('#vals').lastElementChild; wireVal(r); $('input', r).focus(); };
      $('#ev-adv details:last-child').addEventListener('toggle', e => { if (e.target.open) $('#raw').value = JSON.stringify(out(), null, 2); });
      $('#raw-go').onclick = () => { try { const j = JSON.parse($('#raw').value); Object.assign(S, { news: j.news || [], nextEvent: j.nextEvent || null, sixStart: j.sixStart || '', maintenance: { on: false, text: '', ...(j.maintenance || {}) }, seasons: j.seasons || [], promos: j.promos || [], promoDays: j.promoDays || [], ads: { ...S.ads, ...(j.ads || {}) }, values: j.values || {} }); fSeason = fPromo = 0; reAll(); HC.toast('Texte appliqué : vérifie puis publie', 'icon-check'); } catch (e) { HC.toast('Ce texte n\'est pas valide', null, true); } };
      $$('[data-scroll]').forEach(b => b.onclick = () => { const el = document.getElementById(b.dataset.scroll); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' }); });
    }
    $('#pub-go').onclick = async () => {
      const o = out(); if (o.maintenance.on && !(await HC.confirm('Mettre le jeu en maintenance ?', 'Plus personne ne pourra jouer tant que tu ne l\'auras pas désactivée.', 'Oui, publier', 'red'))) return;
      const r = await HC.api('/admin/api/config', o); if (r.ok) { lastPubT = Date.now(); setDirty(false); HC.toast('Publié ! Les joueurs le reçoivent dans la minute', 'icon-check'); }
    };
    $('#pub-reset').onclick = async () => { if (!dirty || await HC.confirm('Annuler tes changements ?', 'Le formulaire revient à ce qui est publié.', 'Annuler les changements', 'red')) { dirty = false; HC.route(); } };
    window.onbeforeunload = () => dirty ? true : undefined; HC.cleanup = () => { window.onbeforeunload = null; };
    render(); setDirty(false);
  };

  // ================================================================== MESSAGE À TOUS
  HC.PAGES.broadcast = async () => {
    const [hist, pl] = await Promise.all([HC.api('/admin/api/broadcasts'), HC.api('/admin/api/players?limit=1')]);
    const T = { filter: {} };
    HC.main(`<div class="page-head"><div><h1>Message à tous</h1><div class="sub">Un message (et un cadeau si tu veux) dans le téléphone de tous les joueurs, à leur prochaine connexion.</div></div></div>
      <div class="bc-grid"><div class="card">
        ${fldB('Titre', 'Le titre de la notification, en gras.', '<input id="bc-t" maxlength="80" placeholder="Ex. : Merci pour vos 10 000 parties !">')}
        ${fldB('Message', 'Le texte complet. Court, sympa, en tutoyant.', '<textarea id="bc-x" maxlength="400" placeholder="Ex. : Pour fêter ça, voilà un petit cadeau. Bon jeu !"></textarea>')}
        <div class="fld"><div class="lb">Cadeau (facultatif)</div><div class="quick-gifts">${[['+5', { l: 5 }], ['+10', { l: 10 }], ['+25', { l: 25 }], ['+1 000', { c: 1000 }], ['+1', { b: 1 }]].map(([t, g]) => `<button class="chip" data-qg='${JSON.stringify(g)}'>${t}${g.l ? '<i class="lgt"></i>' : g.c ? '<i class="cur"></i>' : '<i class="bst"></i>'}</button>`).join('')}<button class="chip" id="bc-zero">Pas de cadeau</button></div>
          <div class="gift-row"><label><span>${img('icon-lingot')}Lingots</span><input id="bc-l" type="number" min="0" value="0"></label><label><span>${img('icon-cash')}Cash</span><input id="bc-c" type="number" min="0" value="0"></label><label><span>${img('booster-pack')}Boosters</span><input id="bc-b" type="number" min="0" value="0"></label></div>
          <div class="help">Chaque joueur le reçoit une seule fois. Attention : un gros cadeau à tout le monde change l'économie du jeu.</div></div>
        <div class="fld"><div class="lb">À qui ?</div><div class="chips" id="bc-who"><button class="chip on" data-w="all">Tous les joueurs</button><button class="chip" data-w="active7">Ceux qui ont joué cette semaine</button></div>
          <div class="row2" style="margin-top:8px"><select id="bc-cc"><option value="">Tous les pays</option>${pl.countries.map(x => { const [cc, n] = x.k.split('|'); return `<option value="${esc(cc)}">${flag(cc)} ${esc(n)}</option>`; }).join('')}</select><select id="bc-lv"><option value="">Tous les niveaux</option>${[2, 5, 10, 14, 20].map(l => `<option value="${l}">Niveau ${l} et plus</option>`).join('')}</select></div>
          <div class="help">Les comptes suspendus ne le reçoivent pas.</div></div>
        <label class="bc-push"><input type="checkbox" id="bc-push" checked> Aussi en notification sur leur téléphone <small id="bc-ph"></small></label>
        <div class="bc-count">${img('nav-city', 'ico')}<b id="bc-n">…</b><span>joueurs vont le recevoir</span><span style="flex:1"></span><button class="btn green" id="bc-go">${img('icon-gift')}Envoyer</button></div>
      </div>
      <div class="prev"><div class="prev-lbl">Ce que voit le joueur</div><div class="phone"><div class="scr"><div class="clock"><small>${esc(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</small>${hm(Date.now())}</div><div id="bc-prev"></div></div></div></div></div>
      ${HC.secTitle('hdr-missions', 'Déjà envoyés')}
      <div class="card">${hist.map(h => { let d = {}; try { d = JSON.parse(h.data); } catch (e) {} const g = HC.giftTxt(d.gift || {}); return `<div class="log-row"><span class="li">${img(g ? 'icon-gift' : 'app-msg')}</span><span class="lt"><b>${esc(d.title || 'Biff City')}</b> · ${esc(d.text || '')}<br>${g ? `<span class="tag ok">${esc(g)}</span> ` : ''}<span class="tag">${fmt(d.n)} joueurs</span></span><time>${dt(h.t)}</time></div>`; }).join('') || HC.empty('Aucun message envoyé pour l\'instant.', 'icon-gift')}</div>`);
    const gift = () => ({ lingots: +$('#bc-l').value || 0, cash: +$('#bc-c').value || 0, boosters: +$('#bc-b').value || 0 });
    const prev = () => { const g = HC.giftTxt(gift()); $('#bc-prev').innerHTML = `<div class="notif">${img('app-missions')}<div><div class="nh"><span>Biff City</span><span>maintenant</span></div><b>${esc($('#bc-t').value || 'Ton titre')}</b><p>${esc($('#bc-x').value || 'Ton message apparaîtra ici.')}${g ? ' ' + esc(g) + ' !' : ''}</p>${g ? `<span class="gl">${img('icon-gift', 'ico')} ${esc(g)}</span>` : ''}</div></div>`; };
    let ct; const count = () => { clearTimeout(ct); ct = setTimeout(async () => { T.filter = { active7: $('#bc-who .on').dataset.w === 'active7', cc: $('#bc-cc').value || undefined, minLvl: +$('#bc-lv').value || undefined }; const r = await HC.api('/admin/api/gift', { pid: '*', dry: true, filter: T.filter }); $('#bc-n').textContent = fmt(r.n); $('#bc-ph').textContent = r.pushOn ? `(${fmt(r.phones)} avec l'application)` : '(pas encore actif : il faut l\'application et la clé Firebase)'; }, 150); };
    ['#bc-t', '#bc-x', '#bc-l', '#bc-c', '#bc-b'].forEach(s => $(s).oninput = prev);
    $$('[data-qg]').forEach(b => b.onclick = () => { const g = JSON.parse(b.dataset.qg); if (g.l) $('#bc-l').value = +$('#bc-l').value + g.l; if (g.c) $('#bc-c').value = +$('#bc-c').value + g.c; if (g.b) $('#bc-b').value = +$('#bc-b').value + g.b; prev(); });
    $('#bc-zero').onclick = () => { ['#bc-l', '#bc-c', '#bc-b'].forEach(s => $(s).value = 0); prev(); };
    $$('#bc-who [data-w]').forEach(b => b.onclick = () => { $$('#bc-who .chip').forEach(x => x.classList.toggle('on', x === b)); count(); });
    $('#bc-cc').onchange = count; $('#bc-lv').onchange = count;
    $('#bc-go').onclick = async () => {
      const title = $('#bc-t').value.trim(), text = $('#bc-x').value.trim(), g = gift(); if (!title && !text) return HC.toast('Écris au moins un titre ou un message', null, true);
      if (!(await HC.confirm(`Envoyer à ${$('#bc-n').textContent} joueurs ?`, `<b>${esc(title || 'Biff City')}</b><br>${esc(text)}${HC.giftTxt(g) ? '<br>Cadeau : <b>' + HC.giftTxt(g) + '</b>' : ''}<br><br>On ne peut pas l'annuler une fois envoyé.`, 'Envoyer à tous'))) return;
      const r = await HC.api('/admin/api/gift', { pid: '*', title: title || 'Biff City', text, gift: g, filter: T.filter, push: $('#bc-push').checked }); HC.toast(`Envoyé à ${fmt(r.n)} joueurs`, 'icon-gift'); HC.route();
    };
    prev(); count();
  };
  const fldB = (l, h, i) => `<div class="fld"><label>${l}</label>${i}<div class="help">${h}</div></div>`;

  // ================================================================== JOURNAL
  const LOGT = {
    config: ['bld-six', () => 'Tu as publié les <b>événements et nouveautés</b>'], broadcast: ['gift-big', d => `Message à tous : <b>${esc(d.title || '')}</b> (${fmt(d.n)} joueurs)${HC.giftTxt(d.gift || {}) ? ' · ' + esc(HC.giftTxt(d.gift)) : ''}`],
    gift: ['icon-gift', d => d.pid === '*' ? `Message à tous : <b>${esc(d.title || '')}</b>` : `Cadeau ou message à un joueur : <b>${esc(d.title || '')}</b>${HC.giftTxt(d.gift || {}) ? ' · ' + esc(HC.giftTxt(d.gift)) : ''}`],
    ban: ['icon-lock', d => `Compte suspendu : ${esc(d.reason || 'sans motif')}`], unban: ['icon-check', () => 'Compte réactivé'], restore: ['hdr-settings', () => 'Partie restaurée'],
    reply: ['app-msg', d => `Réponse au SAV (ticket #${esc(d.ticket)}) · ${esc(d.status || '')}${d.gift ? ' · cadeau ' + esc(HC.giftTxt(d.gift)) : ''}`], notes: ['hdr-missions', () => 'Note interne modifiée'],
    content: ['app-objets', d => `Tu as publié les <b>objets du jeu</b> (${fmt(d.n)} ajoutés ou modifiés)`], upload: ['icon-gift', () => 'Image envoyée pour un objet']
  };
  const TYPES = [['', 'Tout'], ['install', 'Installations'], ['levelup', 'Niveaux'], ['achievement', 'Succès'], ['iap_buy', 'Achats'], ['iap_click', 'Offres regardées'], ['ad', 'Pubs'], ['gift_received', 'Cadeaux reçus'], ['bet', 'Paris'], ['session', 'Connexions']];
  HC.PAGES.logs = async (P) => {
    const type = P.get('type') || '';
    const [E, A] = await Promise.all([HC.api('/admin/api/events' + (type ? '?type=' + type : '')), HC.api('/admin/api/log')]);
    let last = '';
    const evRows = list => list.map(e => { const x = HC.evDesc(e), d = day(e.t), sep = d !== last ? `<div class="tl-day" style="background:none;position:static">${d}</div>` : ''; last = d; return `${sep}<div class="log-row click" data-pid="${esc(e.pid)}"><span class="li">${img(x.i)}</span>${HC.avatar(e, 34)}<span class="lt">${x.t}</span><time>${hm(e.t)}</time></div>`; }).join('');
    HC.main(`<div class="page-head"><div><h1>Journal</h1><div class="sub">Tout ce qui se passe, dans l'ordre : ce que font les joueurs, et ce que tu as fait ici.</div></div></div>
      <div class="chips" style="margin-bottom:14px">${TYPES.map(([k, l]) => `<button class="chip ${type === k ? 'on' : ''}" data-go="logs${k ? ':type:' + k : ''}">${l}</button>`).join('')}</div>
      <div class="log-cols"><div class="card"><div class="card-h">${img('nav-city')}Ce que font les joueurs<small>les 200 derniers</small></div><div class="log-scroll" id="lg-ev">${evRows(E) || HC.empty('Rien pour l\'instant.')}</div>${E.length >= 200 ? '<div style="text-align:center;margin-top:10px"><button class="btn sm ghost" id="lg-more">Voir plus ancien</button></div>' : ''}</div>
        <div class="card"><div class="card-h">${img('hdr-missions')}Ce que tu as fait ici</div><div class="log-scroll">${A.map(a => { let d = {}; try { d = JSON.parse(a.data); } catch (e) {} const L2 = LOGT[a.action] || ['icon-star', () => esc(a.action)]; return `<div class="log-row ${d.pid && d.pid !== '*' ? 'click' : ''}" ${d.pid && d.pid !== '*' ? `data-pid="${esc(d.pid)}"` : ''}><span class="li">${img(L2[0])}</span><span class="lt">${L2[1](d)}</span><time>${dt(a.t)}</time></div>`; }).join('') || HC.empty('Rien pour l\'instant.')}</div></div></div>`);
    let oldest = E.length ? E[E.length - 1].t : 0;
    const more = $('#lg-more'); if (more) more.onclick = async () => { const L2 = await HC.api(`/admin/api/events?before=${oldest}${type ? '&type=' + type : ''}`); $('#lg-ev').insertAdjacentHTML('beforeend', evRows(L2)); if (L2.length) oldest = L2[L2.length - 1].t; if (L2.length < 200) more.remove(); };
  };
})();
