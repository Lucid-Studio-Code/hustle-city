/* Hustle City : notifications sur le téléphone (seulement dans l'application iPhone / Android, rien sur le web).
   - Rappels programmés sur le téléphone lui-même (pas besoin d'internet) : récolte prête, cadeau du jour, prono du tournoi, retour après une absence.
   - Notifications envoyées depuis le back office (message à tous) : le téléphone s'inscrit et donne son adresse au serveur.
   On ne demande l'autorisation qu'après le tutoriel, et rien n'est envoyé si le joueur coupe « Rappels hors du jeu » dans les réglages. */
(function () {
  'use strict';
  const C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const P = C.Plugins || {}, G = window.GAME, LN = P.LocalNotifications, PN = P.PushNotifications;
  const IDS = [1, 2, 3, 4];
  let asked = false;
  const DEF = window.PUSH_DEF = {
    harvest: { on: true, title: 'Ta récolte est prête ⛏️', body: 'Ta machine a fini de miner : viens voir ce qu\'il y a dedans.' },
    gift: { on: true, hour: 10, title: 'Ton cadeau du jour t\'attend 🎁', body: 'Reviens le récupérer : il grossit chaque jour de la série.' },
    prono: { on: true, title: '🏉 Pense à ton prono', body: '{match} commence dans 1 h. C\'est gratuit !' },
    away: { on: true, days: 3, title: 'Le quartier bouge sans toi 👀', body: 'De nouvelles affaires t\'attendent au Comptoir et au Royal.' } };
  async function ask() {
    if (asked || !G.st.tutoDone || G.st.lvl < 2) return; asked = true;
    try { if (LN) await LN.requestPermissions(); } catch (e) {}
    try {
      if (!PN) return; const p = await PN.requestPermissions(); if (p.receive !== 'granted') return;
      PN.addListener('registration', t => window.ONLINE && ONLINE.pushToken && ONLINE.pushToken(t.value, C.getPlatform()));
      PN.addListener('pushNotificationActionPerformed', () => {});   // un appui sur la notif ouvre simplement le jeu
      await PN.register();
    } catch (e) {}
  }
  // les rappels sont recalculés à chaque fois que le joueur quitte le jeu
  async function plan() {
    if (!LN) return; const s = G.st;
    try { await LN.cancel({ notifications: IDS.map(id => ({ id })) }); } catch (e) {}
    if (s.noPush || !s.tutoDone) return;
    // textes, heures et interrupteurs réglables depuis le back office (page Notifications) ; sinon les textes par défaut
    const N = Object.assign({}, DEF, (window.ONLINE && ONLINE.config && ONLINE.config.notifs) || {}), cf = k => Object.assign({}, DEF[k], N[k] || {});
    const L = [], at = ms => ({ at: new Date(Date.now() + ms), allowWhileIdle: true });
    const ri = G.rigInfo(), h = cf('harvest'); if (h.on && !ri.idle && !ri.ready && ri.left > 60000) L.push({ id: 1, title: h.title, body: h.body, schedule: at(ri.left) });
    const g = cf('gift'); if (g.on) { const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(+g.hour || 10, 0, 0, 0); L.push({ id: 2, title: g.title, body: g.body, schedule: { at: t, allowWhileIdle: true } }); }
    const m = G.sixMatches && G.sixPhase && G.sixPhase() !== 'over' && G.sixMatches().filter(x => x.state === 'soon' && x.pick == null).sort((a, b) => a.kickoff - b.kickoff)[0], pr = cf('prono');
    if (pr.on && m && m.kickoff - 3600000 > Date.now()) L.push({ id: 3, title: pr.title, body: pr.body.replace('{match}', `${m.home} – ${m.away}`), schedule: { at: new Date(m.kickoff - 3600000), allowWhileIdle: true } });
    const a = cf('away'); if (a.on) L.push({ id: 4, title: a.title, body: a.body, schedule: at((+a.days || 3) * 86400000) });
    try { await LN.schedule({ notifications: L }); } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) plan(); else ask(); });
  window.addEventListener('pagehide', plan);
  setTimeout(ask, 60000); setInterval(ask, 300000);
})();
