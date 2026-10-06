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
    const L = [], at = ms => ({ at: new Date(Date.now() + ms), allowWhileIdle: true });
    const ri = G.rigInfo(); if (!ri.idle && !ri.ready && ri.left > 60000) L.push({ id: 1, title: 'Ta récolte est prête ⛏️', body: 'Ta machine a fini de miner : viens voir ce qu\'il y a dedans.', schedule: at(ri.left) });
    const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(10, 0, 0, 0); L.push({ id: 2, title: 'Ton cadeau du jour t\'attend 🎁', body: 'Reviens le récupérer : il grossit chaque jour de la série.', schedule: { at: t, allowWhileIdle: true } });
    const m = G.sixMatches && G.sixPhase && G.sixPhase() !== 'over' && G.sixMatches().filter(x => x.state === 'soon' && x.pick == null).sort((a, b) => a.kickoff - b.kickoff)[0];
    if (m && m.kickoff - 3600000 > Date.now()) L.push({ id: 3, title: '🏉 Pense à ton prono', body: `${m.home} – ${m.away} commence dans 1 h. C'est gratuit !`, schedule: { at: new Date(m.kickoff - 3600000), allowWhileIdle: true } });
    L.push({ id: 4, title: 'Le quartier bouge sans toi 👀', body: 'De nouvelles affaires t\'attendent au Comptoir et au Royal.', schedule: at(3 * 86400000) });
    try { await LN.schedule({ notifications: L }); } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) plan(); else ask(); });
  window.addEventListener('pagehide', plan);
  setTimeout(ask, 60000); setInterval(ask, 300000);
})();
