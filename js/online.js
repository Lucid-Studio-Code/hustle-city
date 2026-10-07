/* Hustle City : lien avec le serveur (sauvegarde en ligne, statistiques, SAV, cadeaux, réglages en direct).
   Sans serveur joignable, ce fichier ne fait rien : le jeu marche comme avant, tout en local.
   Adresse du serveur : window.HC_API, sinon le jeu servi par le serveur lui-même (port 5300 ou en ligne, ex. hustle.lucidstudio.fr), sinon localStorage « hc.api ». */
(function () {
  'use strict';
  const G = window.GAME, U = window.UI, D = window.DATA;
  const h = location.hash || '';
  const API = (window.CONTENT && window.CONTENT.api) || window.HC_API || (location.port === '5300' || (/^https?:$/.test(location.protocol) && !/^(localhost|127\.|192\.168\.|10\.|\[)/.test(location.hostname)) ? location.origin : (() => { try { return localStorage.getItem('hc.api') || ''; } catch (e) { return ''; } })());
  const off = !API || G.TEST || (window.HC_DEV && /^#(neuf|admin)/.test(h));
  const ID_KEY = 'hustleCity.online';
  let id = null; try { id = JSON.parse(localStorage.getItem(ID_KEY) || 'null'); } catch (e) {}
  if (!id) { const r = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)); id = { pid: r().slice(0, 12), secret: r() }; try { localStorage.setItem(ID_KEY, JSON.stringify(id)); } catch (e) {} }
  const queue = [], ev = (type, data) => { if (!off) { queue.push({ t: Date.now(), type, data }); if (queue.length > 400) queue.splice(0, queue.length - 400); } };
  const post = (p, b) => fetch(API + p, { method: 'POST', keepalive: JSON.stringify(b).length < 60000, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, pid: id.pid, secret: id.secret }) }).then(r => r.json());
  const ONLINE = window.ONLINE = { on: false, id, ev, banned: false, config: {} };
  // application : le téléphone donne son adresse de notification, on la garde sur le serveur
  ONLINE.pushToken = (token, platform) => { if (off) return; post('/api/push-token', { token, platform }).catch(() => {}); };

  // ---------------------------------------------------------- réglages en direct (back office → jeu)
  function setPath(obj, p, v) { const k = p.split('.'); let o = obj; for (let i = 0; i < k.length - 1; i++) { o = o[isNaN(k[i]) ? k[i] : +k[i]]; if (o == null) return; } o[k[k.length - 1]] = v; }
  function applyConfig(c) {
    if (!c) return; ONLINE.config = c;
    if (c.nextEvent) D.NEXT_EVENT.at = c.nextEvent || null;
    if (Array.isArray(c.seasons) && (c.seasons.length || Array.isArray(c.campaigns))) D.SEASONS.splice(0, D.SEASONS.length, ...c.seasons);
    if (Array.isArray(c.promoDays)) D.PROMO_DAYS.splice(0, D.PROMO_DAYS.length, ...c.promoDays);
    if (Array.isArray(c.promos) && c.promos.length) D.PROMOS.splice(0, D.PROMOS.length, ...c.promos);
    if (Array.isArray(c.campaigns)) D.CAMPAIGNS.splice(0, D.CAMPAIGNS.length, ...c.campaigns);
    if (c.ads) Object.assign(D.ADS, c.ads);
    if (c.sixStart) D.SIX.sim = c.sixStart;
    // la Coupe des Morts : allumée / éteinte, dates, édition, priorité sur le Panneau (page Événements du back office)
    if (c.cdm && D.CDM) ['on', 'start', 'end', 'ed', 'prio'].forEach(k => { if (c.cdm[k] != null && c.cdm[k] !== '') D.CDM[k] = c.cdm[k]; });
    // objets ajoutés / modifiés au back office (js/content.js) : gardés sur l'appareil, la partie suit (nouvelles cotes)
    if (window.CONTENT) { CONTENT.receive(c.content || {}, API); CONTENT.sync(G.st); if (U.refresh) U.refresh(); }
    Object.entries(c.values || {}).forEach(([p, v]) => { try { setPath(D, p, v); } catch (e) {} });
    // annonces : chacune une seule fois, dans le téléphone
    const seen = G.st.seenNews = G.st.seenNews || {};
    (c.news || []).forEach(n => { if (n && n.id && !seen[n.id] && (!n.until || Date.parse(n.until) > Date.now())) { seen[n.id] = Date.now(); U.notify('missions', n.title || 'Hustle City', n.text || ''); } });
    maintenance(c.maintenance && c.maintenance.on ? c.maintenance.text || 'Le jeu est en maintenance, reviens dans un petit moment.' : null);
  }
  function overlay(id_, html) {
    let el = document.getElementById(id_); if (!html) { if (el) el.remove(); return; }
    if (!el) { document.getElementById('app').insertAdjacentHTML('beforeend', `<div id="${id_}" class="online-block"></div>`); el = document.getElementById(id_); } el.innerHTML = html;
  }
  const maintenance = txt => overlay('ol-maint', txt && `<div><b>Maintenance</b><p>${U.esc(txt)}</p></div>`);
  const banScreen = why => overlay('ol-ban', why !== null && `<div><b>Compte suspendu</b><p>${U.esc(why || 'Ton compte a été suspendu. Contacte le support si tu penses que c\'est une erreur.')}</p></div>`);

  // ---------------------------------------------------------- boîte de réception : cadeaux, réponses du SAV, restauration
  function inbox(list) {
    // restauration par le support : on coupe toute écriture de la partie en cours AVANT de poser la copie, sinon la partie actuelle la réécrasait
    const rs = (list || []).find(m => m.gift && m.gift.restore);
    let done = ''; try { done = sessionStorage.getItem('hc-rs') || ''; } catch (e) {}
    if (rs && String(rs.id) === done) post('/api/claim', { id: rs.id }).catch(() => {});   // déjà posée (le serveur n'avait pas reçu l'accusé) : on ne boucle pas
    else if (rs) { try { sessionStorage.setItem('hc-rs', String(rs.id)); } catch (e) {} G.wipe(); try { localStorage.setItem('hustleCity.v1', rs.gift.restore); } catch (e) {} post('/api/claim', { id: rs.id }).catch(() => {}).then(() => location.reload()); return; }
    (list || []).filter(m => !(m.gift && m.gift.restore)).forEach(m => {
      const g = m.gift || {};
      if (+g.lingots) G.addLingots(+g.lingots); if (+g.cash) G.addCash(+g.cash); if (+g.boosters) G.st.boosters += +g.boosters;
      const gl = [g.lingots && `+${g.lingots} lingots`, g.cash && `+${U.short(+g.cash)} de cash`, g.boosters && `+${g.boosters} boosters`].filter(Boolean).join(', ');
      if (/support/i.test(m.title)) U.chatPush('Support Hustle City', 'guide', { from: 'them', txt: m.text + (gl ? ` (${gl} offerts)` : '') });
      U.notify(/support/i.test(m.title) ? 'msg' : 'missions', m.title || 'Hustle City', (m.text || '') + (gl ? ` ${gl} !` : ''));
      ev('gift_received', { id: m.id, g: gl });
      post('/api/claim', { id: m.id }).catch(() => {});
    });
    if ((list || []).length) { G.save(); U.refresh(); }
  }

  // ---------------------------------------------------------- synchronisation
  let playMs = 0, tick = Date.now(), cfgAt = 0;
  setInterval(() => { const t = Date.now(); if (!document.hidden) playMs += t - tick; tick = t; }, 5000);
  // l'appareil (pour la carte et les stats du back office) : fuseau horaire, langue, taille d'écran
  // modèle exact du téléphone dans l'application (ex. « iPhone15,4 »), sinon le back office le devine d'après l'écran
  let model = ''; const getModel = async () => { try { const D = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Device; if (D && !model) model = String((await D.getInfo()).model || '').slice(0, 12); } catch (e) {} };
  const device = () => { let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {} return { tz, lang: navigator.language || '', screen: `${screen.width}x${screen.height}${model ? ' ' + model : ''}` }; };
  // résumé envoyé à chaque synchro : de quoi afficher le joueur dans le back office (photo, cadre, pin's, niveau, fortune)
  function summary() { const s = G.st; return { lvl: s.lvl, xp: s.xp, worth: Math.round(G.worth()), cash: Math.round(s.cash), lingots: s.lingots, boosters: s.boosters || 0, skin: s.skin, name: s.name, tag: s.tag, avatar: s.avatar || null, frame: s.frame || null, ...device() }; }
  async function sync(withSave) {
    if (off || !ONLINE.on || !G.st.skin) return;
    const events = queue.splice(0), ms = playMs; playMs = 0;
    try {
      const r = await post('/api/sync', { summary: summary(), events, playMs: ms, save: withSave ? JSON.stringify(G.st) : undefined });
      if (r.banned) banScreen(r.banReason); else banScreen(null);
      inbox(r.inbox);
      if (r.cfgAt && +r.cfgAt !== cfgAt) { cfgAt = +r.cfgAt; fetch(API + '/api/config').then(x => x.json()).then(applyConfig).catch(() => {}); }
    } catch (e) { queue.unshift(...events); playMs += ms; }
  }
  let helloTry = 15000;
  async function hello() {
    if (off) return;
    // on ne compte un joueur qu'une fois sa partie commencée (perso et pseudo choisis) : ouvrir la page ne crée personne
    if (!G.st.skin || !G.st.name) return setTimeout(hello, 3000);
    try {
      await getModel();
      const s = G.st, r = await post('/api/hello', { name: s.name, tag: s.tag, ver: (document.querySelector('script[src*="game.js"]') || {}).src?.split('v=')[1] || '', platform: navigator.userAgent.slice(0, 120), ...device() });
      if (!r.ok) { if (r.retry) setTimeout(hello, (+r.retry + 5) * 1000); return; } ONLINE.on = true; applyConfig(r.config); inbox(r.inbox); if (r.banned) banScreen(r.banReason);
      sync(true); setInterval(() => sync(true), 60000);
      document.addEventListener('visibilitychange', () => { if (document.hidden) sync(true); });
      window.addEventListener('pagehide', () => sync(false));   // en quittant : on envoie au moins les stats (la sauvegarde complète part avec la sync régulière)
    } catch (e) { helloTry = Math.min(helloTry * 2, 300000); setTimeout(hello, helloTry); }   // serveur injoignable : on réessaie (30 s, 1 min, 2 min… jusqu'à 5 min)
  }

  // ---------------------------------------------------------- ce qu'on mesure : chaque bouton touché + les grands moments
  document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
    if (a === 'noop' || a === 'closeModal') return; ev('act', { a }); if (a === 'iapSoon') ev('iap_click', { id: b.dataset.id || '' }); if (a === 'adClaim') ev('ad', {}); }, true);
  G.on('levelup', e => ev('levelup', { lvl: G.st.lvl }));
  G.on('achievement', a => ev('achievement', { id: a.id }));
  G.on('betResult', ({ b }) => b && ev('bet', { state: b.state, stake: b.stake, gain: b.gain || 0 }));
  G.on('trophy', it => it && ev('trophy', { id: it.id }));

  // ---------------------------------------------------------- SAV et récupération de partie (paramètres)
  // « Supprimer mes données » : le serveur efface tout ce qui concerne ce joueur, puis le jeu ne lui envoie plus rien
  ONLINE.deleteMe = async () => { if (off) return true; try { const r = await post('/api/delete-me', {}); if (r && r.ok) { ONLINE.on = false; return true; } } catch (e) {} return false; };
  ONLINE.support = text => post('/api/support', { text });
  ONLINE.leaderboard = () => off || !ONLINE.on ? Promise.resolve(null) : post('/api/leaderboard', {}).catch(() => null);
  ONLINE.code = () => id.pid + '.' + id.secret;
  ONLINE.restore = async code => { const [pid, secret] = String(code).trim().split('.'); const r = await fetch(API + '/api/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, secret }) }).then(x => x.json());
    if (!r.ok || !r.save) throw new Error(r.err || 'Code inconnu.'); localStorage.setItem(ID_KEY, JSON.stringify({ pid, secret })); localStorage.setItem('hustleCity.v1', r.save); location.reload(); };

  // ---------------------------------------------------------- classements des événements (vrais joueurs) : Coupe des Morts et Tournoi
  // Coupe : toutes les 30 s pendant l'événement, on envoie les points gagnés depuis la dernière fois et on reçoit les totaux des équipes.
  let cdmBusy = false, cdmLast = 0, sixBusy = false, sixLast = 0, sixSent = '';
  async function cdmSync(force) {
    if (off || !ONLINE.on || cdmBusy || !G.cdmOut) return; const o = G.cdmOut();
    if (!o.show && !o.on) return; if (!force && Date.now() - cdmLast < 30000) return;
    cdmBusy = true; cdmLast = Date.now(); const add = o.on ? o.add : 0;
    try { const r = await post('/api/cdm', { ed: o.ed, team: o.team, add }); if (r && r.totals) { G.cdmSent(Math.min(add, +r.took || 0)); G.cdmNetSet(r); } } catch (e) {} cdmBusy = false;
  }
  // Tournoi : à chaque changement de points, et toutes les minutes pendant le tournoi (pour voir bouger le classement)
  async function sixSync(force) {
    if (off || !ONLINE.on || sixBusy || !G.sixOut) return; const ph = G.sixPhase(); if (ph === 'before' || (G.eventOff() && !force)) return;
    const o = G.sixOut(), k = JSON.stringify(o); if (!force && k === sixSent && Date.now() - sixLast < 60000) return;
    sixBusy = true; sixLast = Date.now();
    try { const r = await post('/api/six', o); if (r && r.top) { sixSent = k; G.sixNetSet(r); } } catch (e) {} sixBusy = false;
  }
  setInterval(() => { cdmSync(); sixSync(); }, 5000);
  G.on('cdmJoin', () => setTimeout(() => cdmSync(true), 300));
  G.on('sixResult', () => setTimeout(() => sixSync(true), 300));
  ONLINE.cdmSync = () => cdmSync(true); ONLINE.sixSync = () => sixSync(true);

  setTimeout(hello, 1500);
})();
