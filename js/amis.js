/* Biff City : jouer entre amis. La vue « Potes » du Profil (onglet Potes : identifiant, ajout, demandes, potes, classement entre potes, fil d'actu),
   la pop-up de demande de pote, le lien d'invitation (parrainage) et la pop-up « Invite tes potes ».
   Tout passe par le serveur (server/amis.js) : hors ligne, l'appli le dit simplement. Réglages : AMIS dans data.js. */
(function () {
  'use strict';
  const D = window.DATA, G = window.GAME, U = window.UI, A = D.AMIS, O = window.ONLINE;
  if (!A || !O) return;
  const st = () => G.st, esc = U.esc, now = () => Date.now();
  let DATA = null, loadedAt = 0, busy = false, tab = 'amis', topMode = 'worth', fiche = null, ficheFid = null, code = '', msg = null, rmAsk = null, nIn = 0;
  const on = () => !!(O.on && O.call);
  const fem = sk => ((D.SKINS.find(k => k.id === sk) || {}).g === 'f');
  const e_ = sk => fem(sk) ? 'e' : '';
  const myCode = () => `#${st().tag || ''}`;   // le tag seul suffit pour ajouter un pote (il est unique sur le serveur)
  // lien d'invitation : sur un serveur de test (port 5300, 5330-5339), le jeu de ce serveur ; sinon la vitrine (qui renvoie au jeu)
  const inviteUrl = () => (/^5(300|33\d)$/.test(location.port) ? location.origin + '/game.html?ami=' : A.invite) + encodeURIComponent(st().tag || '');
  const agoTxt = m => m === 0 ? '<i class="am-dot"></i>en ligne' : m < 60 ? `il y a ${m} min` : m < 2880 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`;
  const signed = v => (v > 0 ? '+' : '') + U.short(v);
  const who = p => `<b>${esc(p.name)}</b>`;
  const idTxt = p => `${esc(p.name)}<em class="am-tag">#${esc(p.tag || '')}</em>`;
  const bust = sk => sk && U.has(`skin-${sk}-bust`) ? `skin-${sk}-bust` : null;

  // ---------------------------------------------------------------- serveur
  async function load(force) {
    if (!on() || busy || (!force && now() - loadedAt < 15000)) return; busy = true;
    try { const r = await O.call('/api/amis', {}); if (r && r.ok) { DATA = r; loadedAt = now(); nIn = r.reqIn.length; st().amisFil = r.filleuls; redraw(); } } finally { busy = false; }
  }
  // redessine la vue Potes du Profil si elle est ouverte (jamais pendant qu'on tape un identifiant) ; la pastille de l'avatar suit
  const shown = () => !!U.pfOpen;
  function redraw(force) {
    if (!shown()) { U.refresh && U.refresh(); return; }
    if (!force && document.activeElement && document.activeElement.id === 'am-code') return;
    U.refresh && U.refresh();
  }
  // nouveautés du fil pas encore vues (pastille de l'avatar et de l'onglet Potes) : remises à zéro en ouvrant le fil
  const unseenFeed = () => st().amisNew || 0;
  // toutes les 20 s : demandes reçues (pop-up), nouvelles du fil (notifs), lien d'invitation en attente
  async function poll() {
    if (!on() || document.hidden || !st().skin) return;
    invited();
    const r = await O.call('/api/amis/poll', {}); if (!r || !r.ok || r.later) return;
    if (r.n !== nIn) { nIn = r.n; U.refresh && U.refresh(); }
    (r.req || []).forEach(askPop);
    (r.feed || []).forEach(f => { const t = feedTxt(f, true); if (t) U.notify('potes', f.who.name, t, null, false, null, bust(f.who.skin)); });
    if ((r.feed || []).length) { st().amisNew = unseenFeed() + r.feed.length; G.save && G.save(); U.refresh && U.refresh(); }
    if ((r.req || []).length || (r.feed || []).length) { loadedAt = 0; if (shown()) load(true); }
  }
  setInterval(poll, (A.pollS || 20) * 1000); setTimeout(poll, 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(poll, 800); });
  setInterval(() => { if (shown()) load(); }, 60000);

  // arrivé par le lien d'un pote : on l'envoie une fois la partie créée et connectée
  let invBusy = false;
  async function invited() {
    let c = null; try { c = localStorage.getItem('hustleCity.ami'); } catch (e) {} if (!c || invBusy) return; invBusy = true;
    let dev = ''; try { dev = localStorage.getItem('hustleCity.dev') || ''; } catch (e) {}
    const r = await O.call('/api/amis/parrain', { code: c, dev }); invBusy = false; if (!r) return;
    if (r.ok || r.gone) { try { localStorage.removeItem('hustleCity.ami'); } catch (e) {} }
    if (r.ok && r.who) { const P = A.parrain;
      U.toast(r.referral ? `Tu es arrivé${e_(st().skin)} grâce à <b>${esc(r.who.name)}</b> : vous êtes potes ! Finis le tuto pour recevoir ${P.filleulLingots} lingots${P.filleulBoosters ? ' et un booster' : ''}.` : r.friends ? `<b>${esc(r.who.name)}</b> est maintenant ton pote.` : `Demande de pote envoyée à <b>${esc(r.who.name)}</b>.`);
      loadedAt = 0; }
  }

  // ---------------------------------------------------------------- pop-up : un joueur veut être ton pote
  function askPop(p) {
    U.queue(() => U.openModal({ title: 'Demande de pote', icon: 'star', center: true, body: `<div class="am-ask">
      <div class="am-ask-av">${U.lbAv(p)}</div>
      <h3>${idTxt(p)}</h3><p>Niveau ${p.lvl}${p.worth ? `<br>Patrimoine ≈ ${U.short(p.worth)}` : ''}</p>
      <p class="am-ask-q">veut être ton pote : vous verrez vos exploits et vous pourrez vous comparer.</p>
      <div class="grid2"><button class="btn red" data-act="amisAnswer" data-fid="${esc(p.fid)}" data-ok="0">Refuser</button><button class="btn green" data-act="amisAnswer" data-fid="${esc(p.fid)}" data-ok="1">Accepter</button></div>
      <button class="wp-later" data-act="closeModal">Plus tard</button></div>` }));
  }

  // ---------------------------------------------------------------- fil d'actu
  function feedTxt(f, plain) {
    const p = f.who, d = f.data || {}, n = plain ? '' : who(p) + ' ', x = e_(p.skin), it = d.id && G.item(d.id);
    const more = d.more ? ` (et ${d.more} autre${d.more > 1 ? 's' : ''} exploit${d.more > 1 ? 's' : ''} dans l'heure)` : '';
    const T = { bet: `${n}a gagné un gros pari : <b class="up">+${U.short(d.gain || 0)}</b>`, legend: `${n}a sorti une carte légendaire${it ? ` : « ${esc(it.name)} »` : ' !'}`, lvl: `${n}est passé${x} niveau ${d.lvl}`,
      pass: `${n}t'a dépassé${e_(st().skin)} au patrimoine !`, ok: `${n}a accepté ta demande : vous êtes potes !`, join: `${n}a rejoint Biff City grâce à toi. Quand ${fem(p.skin) ? 'elle' : 'il'} atteint le niveau ${A.parrain.lvl}, ta récompense tombe.` }[f.kind];
    return T ? T + more : '';
  }

  // médaille d'une place : or, argent, bronze, puis à partir de la 4e la même médaille à centre crème avec le numéro (une seule forme, un seul ruban)
  function medal(r) {
    const n = ['', 'medal-gold', 'medal-silver', 'medal-bronze'][r] || 'medal-rank';
    if (!U.has(n)) return `<span class="am-medal num"><b>${r}</b></span>`;
    return `<span class="am-medal ${r > 3 ? 'rank' : ''}"><img src="${U.src(n)}" alt="">${r > 3 ? `<b>${r}</b>` : ''}</span>`;
  }
  // l'image de l'invitation (scène « invite-scene » quand elle existe, sinon deux persos et le coffre)
  const inviteArt = () => U.has('invite-scene') ? `<img class="am-scene" src="${U.src('invite-scene')}" alt="">`
    : `<span class="am-pop-art">${['sportive', 'survet'].map((k, i) => U.has(`skin-${k}-bust`) ? `<img class="am-pa-${i ? 'r' : 'l'}" src="${U.src(`skin-${k}-bust`)}" alt="">` : '').join('')}${U.has('icon-treasure') ? `<img class="am-pa-c" src="${U.src('icon-treasure')}" alt="">` : ''}</span>`;

  // ---------------------------------------------------------------- la vue Potes, dans la fenêtre Profil (onglet Potes)
  const tabs = () => `<div class="am-tabs">${[['amis', 'Mes potes'], ['top', 'Classement'], ['fil', 'Fil']].map(([k, l]) => { const n = k === 'amis' ? nIn : k === 'fil' && tab !== 'fil' ? unseenFeed() : 0;
    return `<button class="btn${tab === k ? ' on' : ''}" data-act="amisTab" data-id="${k}">${l}${n ? `<em class="badge">${n > 9 ? '9+' : n}</em>` : ''}</button>`; }).join('')}</div>`;
  const row = (p, right, act) => `<${act ? `button data-act="${act}" data-fid="${esc(p.fid)}"` : 'div'} class="chat-row am-row">${U.lbAv(p)}<span><b>${idTxt(p)}</b><small>Niveau ${p.lvl} <i class="am-sep"></i> ${U.short(p.worth || 0)}</small></span>${right || ''}</${act ? 'button' : 'div'}>`;
  function parCard() {
    const P = A.parrain, n = Math.min(P.pinAt, st().amisFil || 0);
    return `<button class="am-par ${U.has('invite-scene') ? 'am-scn' : ''}" data-act="amisInvite"><span class="am-par-art">${U.has('invite-scene') ? `<img src="${U.src('invite-scene')}" alt="">` : U.has('icon-treasure') ? `<img src="${U.src('icon-treasure')}" alt="">` : '🎁'}</span>
      <span class="am-par-t"><b>Invite tes potes</b><small>${n} / ${P.pinAt} potes invités au niveau ${P.lvl}</small><i class="am-bar"><i style="width:${Math.round(n / P.pinAt * 100)}%"></i></i></span><em>›</em></button>`;
  }
  function listTab() {
    const d = DATA, P = A.parrain;
    const me = `<div class="am-me"><small>Ton # de pote</small><div class="am-me-id"><b class="am-me-tag">#${esc(st().tag || '')}</b><span class="am-me-nm">${esc(st().name || 'Joueur')}</span></div>
      <div class="am-me-b"><button class="btn xs blue" data-act="amisCopy">Copier</button><button class="btn xs green" data-act="amisShare">Partager</button></div></div>`;
    const add = `<div class="am-add"><input id="am-code" placeholder="#4821" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="30" value="${esc(code)}"><button class="btn xs green" data-act="amisAdd">Ajouter</button></div>
      ${msg ? `<p class="am-msg ${msg.ok ? 'ok' : 'ko'}">${msg.t}</p>` : '<p class="ph-hint">Tape le # de ton pote, ex. #4821.</p>'}`;
    const reqIn = d.reqIn.length ? `<h4 class="am-h">Demandes reçues <small>${d.reqIn.length}</small></h4>${d.reqIn.map(p => row(p, `<span class="am-acts"><button class="btn xs red" data-act="amisAnswer" data-fid="${esc(p.fid)}" data-ok="0" aria-label="Refuser">✕</button><button class="btn xs green" data-act="amisAnswer" data-fid="${esc(p.fid)}" data-ok="1" aria-label="Accepter">✓</button></span>`)).join('')}` : '';
    const reqOut = d.reqOut.length ? `<h4 class="am-h">Demandes envoyées <small>${d.reqOut.length}</small></h4>${d.reqOut.map(p => row(p, `<span class="am-acts"><small class="am-wait">En attente</small><button class="btn xs" data-act="amisCancel" data-fid="${esc(p.fid)}">Annuler</button></span>`)).join('')}` : '';
    const L = d.friends.length ? d.friends.map(p => row(p, `<em class="am-seen ${p.ago === 0 ? 'on' : ''}">${agoTxt(p.ago)}</em>`, 'amisFiche')).join('')
      : `<p class="ph-hint center">Pas encore de pote ici. Envoie ton identifiant ou ton lien à tes amis : ${P.filleulLingots} lingots${P.filleulBoosters ? ' et un booster' : ''} pour eux, et une belle récompense pour toi.</p>`;
    return `${me}${add}${parCard()}${reqIn}${reqOut}<h4 class="am-h">Mes potes <small>${d.friends.length} / ${d.max || A.max}</small></h4>${L}`;
  }
  function topTab() {
    const d = DATA, k = topMode, L = [d.me, ...d.friends].sort((a, b) => (b[k] || 0) - (a[k] || 0));
    const rk = medal;
    return `<div class="am-seg">${[['worth', 'Patrimoine'], ['week', 'Paris de la semaine']].map(([m, l]) => `<button class="btn${k === m ? ' on' : ''}" data-act="amisTop" data-id="${m}">${l}</button>`).join('')}</div>
      ${d.friends.length ? '' : '<p class="ph-hint center">Ajoute des potes pour te mesurer à eux.</p>'}
      ${L.map((p, i) => `<${p.me ? 'div' : `button data-act="amisFiche" data-fid="${esc(p.fid)}"`} class="chat-row am-row am-top ${p.me ? 'me' : ''}"><span class="am-rk">${rk(i + 1)}</span>${U.lbAv(p)}<span><b>${p.me ? `${esc(p.name)} (toi)` : esc(p.name)}</b><small>Niveau ${p.lvl}</small></span><b class="am-val ${k === 'week' ? (p.week > 0 ? 'up' : p.week < 0 ? 'down' : '') : ''}">${k === 'week' ? signed(p.week || 0) : U.short(p.worth || 0)}</b></${p.me ? 'div' : 'button'}>`).join('')}
      <p class="ph-hint center">${k === 'week' ? 'Ce que les paris ont rapporté depuis lundi (gagné moins misé).' : 'Patrimoine arrondi : cash, crypto, objets, immobilier.'}</p>`;
  }
  // l'icône de chaque info du fil, sous l'heure : gros gain, carte légendaire, dépassement, niveau, filleul, nouveau pote
  const FEED_IC = { bet: 'icon-cash', legend: 'card-back', pass: 'ic-up', lvl: 'icon-star', join: 'icon-gift', ok: 'icon-potes' };
  const feedIc = f => FEED_IC[f.kind] && U.has(FEED_IC[f.kind]) ? `<img class="am-fic k-${f.kind}" src="${U.src(FEED_IC[f.kind])}" alt="">` : '';
  function filTab() {
    const L = DATA.feed;
    return L.length ? L.map(f => `<button class="chat-row am-row am-feed" data-act="amisFiche" data-fid="${esc(f.who.fid)}">${U.lbAv(f.who)}<span><small class="am-ft">${feedTxt(f)}</small></span><span class="am-fr"><em>${agoTxt(Math.max(1, Math.round((now() - f.t) / 60000)))}</em>${feedIc(f)}</span></button>`).join('')
      : '<p class="ph-hint center">Rien pour l\'instant. Les gros gains, les cartes légendaires et les niveaux de tes potes s\'afficheront ici.</p>';
  }
  function ficheView() {
    const f = fiche, bar = `<div class="am-bar-top am-bar-back"><button class="btn xs am-back-btn" data-act="amisBack">‹ Retour</button></div>`;   // le pseudo est déjà sous l'avatar
    if (!f) return bar + '<div class="ph-scroll"><p class="ph-hint center">Chargement…</p></div>';
    const it = f.card && G.item(f.card.id), T = f.team && G.cdmTeam(f.team), R = { L: 'Légendaire', E: 'Épique', R: 'Rare', C: 'Commune' };
    const tile = (ic, v, l) => `<div class="am-tile"><span>${ic}</span><b>${v}</b><small>${l}</small></div>`;
    return bar + `<div class="ph-scroll"><div class="am-fiche"><div class="am-big">${U.lbAv(f)}</div><h3>${idTxt(f)}</h3>
      <p class="am-sub">Niveau ${f.lvl} <i class="am-sep"></i> <span class="am-seen ${f.ago === 0 ? 'on' : ''}">${agoTxt(f.ago)}</span></p></div>
      <div class="am-tiles">${tile(U.ic('cash'), U.short(f.worth || 0, true), 'patrimoine')}${tile(U.pic('cat-trophy', '🏆'), f.trophies, 'trophées')}${tile(U.pic('item-c-holo', '🃏'), f.cards, 'cartes')}${tile(U.pic('nav-bets', '🎟️'), f.bestWin ? '+' + U.short(f.bestWin) : '0', 'meilleur gain (7 j)')}</div>
      ${it ? `<h4 class="am-h">Sa plus belle carte</h4><div class="am-card r${f.card.r}"><span class="am-card-art">${U.itemPic(it)}</span><span><b>${esc(it.name)}</b><small>${R[f.card.r] || ''}<br>Cote ≈ ${U.short(f.card.v)}</small></span></div>` : ''}
      ${T ? `<h4 class="am-h">Coupe des Morts</h4><div class="am-card"><span class="am-card-art">${U.cdmCrest(T.id)}</span><span><b>${esc(T.name)}</b><small>Son camp cette année</small></span></div>` : ''}
      ${f.since ? `<p class="ph-hint center">Potes depuis le ${new Date(f.since).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>` : ''}
      <div class="center am-rm">${rmAsk === f.fid ? `<p class="ph-hint">Sûr ? Vous ne verrez plus vos exploits.</p><div class="grid2"><button class="btn xs" data-act="amisRmNo">Non</button><button class="btn xs red" data-act="amisRm" data-fid="${esc(f.fid)}">Oui, retirer</button></div>` : `<button class="btn xs red" data-act="amisRmAsk" data-fid="${esc(f.fid)}">Retirer ce pote</button>`}</div></div>`;
  }
  function view() {
    const wrap = h => `<div class="am-pf">${h}</div>`;
    if (!on()) return wrap('<div class="ph-scroll"><p class="ph-hint center">Les potes, ça marche quand tu es connecté à internet. Reviens quand tu as du réseau.</p></div>');
    if (ficheFid) return wrap(ficheView());
    if (!DATA) { load(); return wrap('<div class="ph-scroll"><p class="ph-hint center">Chargement de tes potes…</p></div>'); }
    if (tab === 'fil' && unseenFeed()) { st().amisNew = 0; G.save && G.save(); setTimeout(() => U.refresh && U.refresh(), 0); }
    return wrap(tabs() + `<div class="ph-scroll am-scroll">${tab === 'top' ? topTab() : tab === 'fil' ? filTab() : listTab()}</div>`);
  }
  function opened(t) { if (t) tab = t; ficheFid = null; fiche = null; rmAsk = null; msg = null; load(true); }

  // ---------------------------------------------------------------- copier, partager
  function copy(t) {
    const done = () => U.toast('Copié ! Colle-le à ton pote.');
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(done).catch(() => fallback(t, done));
    fallback(t, done);
  }
  function fallback(t, done) { const x = document.createElement('textarea'); x.value = t; x.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { U.toast(t); } x.remove(); }
  function share() {
    const P = A.parrain, url = inviteUrl(), text = `Viens jouer à Biff City avec moi ! Mon # de pote : ${myCode()} (${st().name || 'Joueur'}). Avec ce lien, tu reçois ${P.filleulLingots} lingots${P.filleulBoosters ? ' et un booster' : ''} à la fin du tuto.`;
    O.ev && O.ev('amis_share', {});
    if (navigator.share) return navigator.share({ title: 'Biff City', text, url }).catch(() => {});
    copy(`${text} ${url}`);
  }

  // ---------------------------------------------------------------- pop-up « Invite tes potes » (même fenêtre que l'offre du jour)
  // à un bon moment, dès le niveau 3, jamais dans les 10 premières minutes de jeu ni juste après une pub ;
  // écart entre deux pop-up : 1 j, puis 3 j, puis 7 j si on la ferme d'affilée ; plus du tout une fois Parrain
  setInterval(() => { if (!document.hidden && st().skin) st().amisPlay = (st().amisPlay || 0) + 5000; }, 5000);
  function invitePop(force, back) {
    const s = st(), C = A.pop || {}, P = A.parrain, ip = s.invitePop = s.invitePop || { last: 0, later: 0 };
    if (!force) {
      if (!on() || G.TEST || !s.tutoDone || s.lvl < (C.lvl || 3) || (s.amisPlay || 0) < (C.minPlayMin || 10) * 60000 || (s.amisFil || 0) >= P.pinAt) return;
      if (window.TUTO && TUTO.active) return;
      const ad = document.getElementById('ad-layer'); if ((ad && ad.className === 'on') || now() - (s.adForcedAt || 0) < 120000) return;   // jamais juste après une pub
      const gaps = C.gapsDays || [1, 3, 7], gap = gaps[Math.min(ip.later || 0, gaps.length - 1)] * 86400000;
      if (now() - (ip.last || 0) < gap) return;
    }
    ip.last = now(); G.save && G.save();
    const n = Math.min(P.pinAt, s.amisFil || 0), pin = D.EV_SHOP.find(x => x.id === P.pin), fr = D.EV_SHOP.find(x => x.id === P.frame);
    const chip = (art, t) => `<span class="gc">${art}<b>${t}</b></span>`;
    const chips = [P.parrainLingots && chip(U.ic('lingot'), P.parrainLingots), P.parrainBoosters && chip(U.has('booster-pack') ? `<img src="${U.src('booster-pack')}" alt="">` : '🃏', '×' + P.parrainBoosters), P.parrainRare && chip(U.has('card-back') ? `<img src="${U.src('card-back')}" alt="">` : '🃏', 'Carte rare')].filter(Boolean).join('');
    const art = inviteArt();
    const go = () => U.openModal({ title: 'Invite tes potes', icon: 'gift', center: true, onClose: () => { if (!ip.went) { ip.later = (ip.later || 0) + 1; G.save && G.save(); } ip.went = false; if (back) setTimeout(back, 0); }, body: `<div class="welcome-pop wp-pack am-pop">
      <div class="wp-art ${U.has('invite-scene') ? 'am-scn' : ''}">${art}</div>
      <h3>Ramène ta team, ramasse le butin</h3><p>Pour chaque pote qui arrive au <b>niveau ${P.lvl}</b> grâce à toi&nbsp;:</p>
      <div class="give-chips">${chips}</div>
      <div class="am-pop-pin">${pin ? `<span class="am-pop-pins">${U.lbAv({ skin: s.skin, avatar: pin.id, frame: fr ? fr.id : null })}</span>` : ''}<span><b>Au ${P.pinAt}<sup>e</sup> pote : le pin's${fr ? ' et le cadre' : ''} Parrain</b><small>Introuvables ailleurs, sur ta photo pour toujours.</small></span></div>
      <div class="am-pop-n"><b>${n} / ${P.pinAt}</b> potes invités<i class="am-bar"><i style="width:${Math.round(n / P.pinAt * 100)}%"></i></i></div>
      <p class="am-pop-f">Ton pote reçoit ${P.filleulLingots} lingots${P.filleulBoosters ? ' et un booster' : ''} à la fin du tuto.</p>
      <button class="btn green big" data-act="amisInviteGo">Inviter mes potes</button><button class="wp-later" data-act="closeModal">Plus tard</button></div>` });
    if (force) go(); else U.queue(go);
    O.ev && O.ev('amis_pop', { force: !!force });
  }
  // les bons moments
  const soon = () => setTimeout(() => invitePop(), ((A.pop || {}).delayS || 2.5) * 1000);
  G.on('levelup', soon);
  G.on('legend', soon); G.on('rarePull', soon);
  G.on('betResult', ({ b }) => { if (b && b.state === 'won' && (b.gain || 0) >= ((A.pop || {}).bigWin || 1500)) soon(); });
  setTimeout(() => invitePop(), 25000);   // au retour dans le jeu

  // ---------------------------------------------------------------- gestes
  document.addEventListener('input', e => { if (e.target && e.target.id === 'am-code') code = e.target.value; });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'am-code') { e.preventDefault(); ACT.amisAdd(); } });
  const toTop = () => { const b = document.querySelector('#modal .sheet-body'); if (b) b.scrollTop = 0; };
  const after = r => { loadedAt = 0; return load(true).then(() => r); };
  const ACT = {
    amisTab(el) { tab = el.dataset.id; msg = null; redraw(true); toTop(); if (tab !== 'amis') load(); },
    amisTop(el) { topMode = el.dataset.id; redraw(true); },
    async amisAdd() {
      const c = code.trim(); if (!c) { msg = { t: 'Tape d\'abord le # de ton pote, ex. #4821.' }; return redraw(true); }
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
      const r = await O.call('/api/amis/add', { code: c });
      if (!r) msg = { t: 'Pas de réseau, réessaie.' };
      else if (r.err) msg = { t: esc(r.err) };
      else { code = ''; msg = { ok: true, t: r.friends ? `${esc(r.who.name)} t'avait déjà demandé : vous êtes potes !` : `Demande envoyée à ${esc(r.who.name)}. Dès qu'${fem(r.who.skin) ? 'elle' : 'il'} accepte, tu es prévenu${e_(st().skin)}.` }; }
      await after(); redraw(true);
    },
    async amisAnswer(el) {
      const ok = el.dataset.ok === '1', fid = el.dataset.fid, p = DATA && DATA.reqIn.find(x => x.fid === fid);
      if (document.querySelector('#modal .am-ask')) U.closeModal();
      const r = await O.call('/api/amis/answer', { fid, ok });
      if (r && r.err) U.toast(esc(r.err), true); else if (r && ok) { U.toast(p ? `<b>${esc(p.name)}</b> est ton pote !` : 'Vous êtes potes !'); U.sfx && U.sfx.win && U.sfx.win(); }
      nIn = Math.max(0, nIn - 1); await after(); U.refresh && U.refresh(); redraw(true);
    },
    async amisCancel(el) { await O.call('/api/amis/cancel', { fid: el.dataset.fid }); await after(); redraw(true); },
    async amisFiche(el) {
      const fid = el.dataset.fid; if (!fid) return; ficheFid = fid; fiche = null; rmAsk = null; redraw(true); toTop();
      const r = await O.call('/api/amis/fiche', { fid }); if (ficheFid !== fid) return;
      if (!r || r.err) { ficheFid = null; U.toast(esc((r && r.err) || 'Pas de réseau.'), true); } else fiche = r.fiche; redraw(true);
    },
    amisBack() { ficheFid = null; fiche = null; rmAsk = null; redraw(true); toTop(); },
    amisRmAsk(el) { rmAsk = el.dataset.fid; redraw(true); },
    amisRmNo() { rmAsk = null; redraw(true); },
    async amisRm(el) { const n = fiche && fiche.name; await O.call('/api/amis/remove', { fid: el.dataset.fid }); ficheFid = null; fiche = null; rmAsk = null; U.toast(n ? `${esc(n)} n'est plus dans tes potes.` : 'Pote retiré.'); await after(); redraw(true); },
    amisCopy() { copy(myCode()); },
    amisShare() { share(); },
    amisInvite() { invitePop(true, () => U.openProfile('potes')); },   // en refermant, on revient à la vue Potes
    amisInviteGo() { const ip = st().invitePop || (st().invitePop = {}); ip.went = true; ip.later = 0; G.save && G.save(); U.closeModal(); share(); }
  };
  U.register(ACT);
  window.AMIS = { view, opened, badge: () => nIn + unseenFeed(), load, poll, invitePop, inviteUrl, get data() { return DATA; } };
})();
