// Test de bout en bout du « jouer entre amis » (sans son) : serveur de test sur une base à part, 5 joueurs dans des navigateurs séparés.
//   DB=server/amis-test.db PORT=5330 node server/server.js   puis   node tools/test-amis.js
// Captures (390x844 et 375x667) dans exports-amis-captures/, avec la mesure des espacements de chaque écran (tools/audit-espaces.js).
const path = require('path');
const PW = process.env.PW || '/Users/lucillegarnot/.npm/_npx/787f53666b8d4740/node_modules/playwright';
const { webkit } = require(PW);
const URL0 = process.env.URL || 'http://localhost:5330/game.html', OUT = path.join(__dirname, '..', 'exports-amis-captures');
const MUTE = () => { try { localStorage.setItem('hustleCity.age18', '1'); window.AudioContext = undefined; window.webkitAudioContext = undefined; HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; } catch (e) {} };
const UA = n => `Mozilla/5.0 (iPhone; CPU iPhone OS 17_${n} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.${n} Mobile/15E148 Safari/604.1`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, ko = 0; const check = (c, t) => { console.log((c ? 'OK  ' : 'ÉCHEC ') + t); c ? ok++ : ko++; };
const shots = [], AUDIT = require('./audit-espaces.js').toString(), defects = {};
async function shot(p, name) {
  await p.evaluate(() => { const b = document.getElementById('ph-banner'); if (b && !window.__keepBanner) b.classList.remove('show'); const t = document.getElementById('toast'); if (t) t.classList.remove('on'); });
  for (const [w, h] of [[390, 844], [375, 667]]) { await p.setViewportSize({ width: w, height: h }); await sleep(500);
    await p.evaluate(() => { const b = document.getElementById('ph-banner'); if (b && !window.__keepBanner) b.classList.remove('show'); });   // une notif arrivée pendant le changement de taille
    const f = `${name}-${w}x${h}.png`; await p.screenshot({ path: path.join(OUT, f) }); shots.push(f);
    const d = await p.evaluate(`(${AUDIT})()`); if (d.length) defects[f] = d; }
  await p.setViewportSize({ width: 390, height: 844 }); await sleep(300);
}
async function player(b, name, skin, n, url) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA(n) }); await c.addInitScript(MUTE);
  const p = await c.newPage(); p.on('pageerror', e => console.log(`[${name}] erreur`, e.message));
  await p.goto(url || URL0); await p.waitForSelector('#st-name', { timeout: 20000 });
  await p.click(`.skin[data-skin="${skin}"]`).catch(() => {}); await p.fill('#st-name', name); await p.click('#st-go');
  await sleep(1500);
  // le tuto est passé (sauf pour le filleul, qui le finit plus tard), musique et sons coupés
  await p.evaluate(() => { const s = GAME.st; s.music = false; s.sound = false; s.noTuto = true; s.tutoDone = true; if (window.TUTO && TUTO.active) TUTO.skipAll(); GAME.save(); });
  await p.waitForFunction(() => window.ONLINE && ONLINE.on, null, { timeout: 30000 });
  return p;
}
const closeAll = p => p.evaluate(() => { document.querySelectorAll('#modal .sheet-close').forEach(b => b.click()); });
const openPotes = async (p, tab) => { await p.evaluate(t => { document.querySelector('#phone-layer')?.classList.remove('on'); document.querySelectorAll('#modal .sheet-close').forEach(b => b.click()); UI.openProfile('potes', t); }, tab || 'amis'); await sleep(1500); };   // la vue Potes du Profil
const sync = p => p.evaluate(() => ONLINE.flush());
(async () => {
  const b = await webkit.launch();
  const A = await player(b, 'Lucky Max', 'survet', 1), B = await player(b, 'Ninaa', 'sportive', 2);
  const tagA = await A.evaluate(() => GAME.st.tag), tagB = await B.evaluate(() => GAME.st.tag);
  check(tagA !== tagB && /^\d{4}$/.test(tagA) && /^\d{4}$/.test(tagB), 'Tags à 4 chiffres, différents');
  console.log('A = Lucky Max#' + tagA, ' B = Ninaa#' + tagB);
  // le téléphone n'a plus d'appli Potes (et la dernière appli n'est pas coupée) ; le Profil a son onglet Potes
  await closeAll(A); await A.evaluate(() => UI.openPhone()); await sleep(800); await shot(A, '01-telephone-sans-appli-potes');
  check(await A.evaluate(() => !document.querySelector('.ph-app[data-id=potes]')), 'Téléphone : plus d\'appli Potes');
  for (const [w, h] of [[390, 844], [375, 667]]) { await A.setViewportSize({ width: w, height: h }); await sleep(300);
    check(await A.evaluate(() => { const ph = document.querySelector('#phone-layer .ph-home').getBoundingClientRect(), L = [...document.querySelectorAll('.ph-app')]; return L.length && L.every(a => { const r = a.getBoundingClientRect(); return r.bottom <= ph.bottom + 1 && r.right <= ph.right + 1 && r.left >= ph.left - 1; }); }), `Téléphone ${w}x${h} : toutes les applis entières`); }
  await A.setViewportSize({ width: 390, height: 844 });
  await A.evaluate(() => document.querySelector('#phone-layer')?.classList.remove('on')); await A.click('#hud .avatar'); await sleep(1000);
  check(await A.evaluate(() => !!document.querySelector('#modal .tab[data-tab=potes]')), 'Profil : onglet Potes'); await shot(A, '00-profil-onglet-potes');
  // A ajoute B (majuscules et espace en trop : tolérés)
  await openPotes(A); await A.fill('#am-code', `#${tagB}`); await A.click('[data-act=amisAdd]'); await sleep(1500);
  check(await A.evaluate(() => AMIS.data.reqOut.length === 1), 'A : demande envoyée et visible dans « Demandes envoyées »');
  await shot(A, '02-demande-envoyee');
  // doublon et soi-même
  await A.fill('#am-code', ` ninaa # ${tagB}`); await A.click('[data-act=amisAdd]'); await sleep(800);
  check(/déjà envoyée/.test(await A.textContent('.am-msg')), 'A : demande en double refusée (pseudo#tag, majuscules et espaces tolérés)');
  await A.fill('#am-code', `${tagB}`); await A.click('[data-act=amisAdd]'); await sleep(800);
  check(/déjà envoyée/.test(await A.textContent('.am-msg')), 'A : les chiffres seuls trouvent aussi B');
  await A.fill('#am-code', `Bidule#${tagB}`); await A.click('[data-act=amisAdd]'); await sleep(800);
  check(/Personne/.test(await A.textContent('.am-msg')), 'A : un pseudo tapé qui ne correspond pas au # est refusé');
  await A.fill('#am-code', `#${tagA}`); await A.click('[data-act=amisAdd]'); await sleep(800);
  check(/toi/.test(await A.textContent('.am-msg')), 'A : se demander soi-même refusé');
  // B : la pop-up arrive toute seule (sondage toutes les 20 s)
  await closeAll(B); await B.waitForSelector('#modal .am-ask', { timeout: 30000 }); await sleep(600);
  check(true, 'B : pop-up de demande reçue'); await shot(B, '03-popup-demande-recue');
  // « Plus tard » : la pastille reste sur l'avatar (en haut à droite), puis B accepte depuis la vue Potes du Profil
  await B.click('#modal .am-ask .wp-later'); await sleep(800);
  check(await B.evaluate(() => { const b = document.getElementById('badge-potes'); return !b.classList.contains('hidden') && b.textContent === '1'; }), 'B : pastille 1 sur l\'avatar');
  check(await B.evaluate(() => { const a = document.querySelector('#hud .avatar').getBoundingClientRect(), b = document.getElementById('badge-potes').getBoundingClientRect(), l = document.getElementById('lvl').getBoundingClientRect(), p = document.querySelector('#hud .avatar .av-pin');
    const hit = (x, y) => x && Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1;
    return b.left > a.left + a.width / 2 && b.top < a.top + a.height / 2 && !hit(b, l) && !(p && hit(b, p.getBoundingClientRect())); }), 'Pastille en haut à droite, sans toucher le niveau ni le pin\'s');
  await shot(B, '03b-pastille-avatar'); await B.screenshot({ path: path.join(OUT, '03c-pastille-avatar-zoom.png'), clip: { x: 0, y: 0, width: 200, height: 90 } });
  await B.click('#hud .avatar'); await sleep(800); await B.click('#modal .tab[data-tab=potes]'); await sleep(1500); await shot(B, '03d-profil-demande-a-accepter');
  await B.click('.am-acts [data-ok="1"]'); await sleep(1500);
  check(await B.evaluate(() => document.getElementById('badge-potes').classList.contains('hidden')), 'B : pastille partie une fois la demande acceptée');
  // A est prévenu (notification Potes)
  await closeAll(A); await A.evaluate(() => UI.phoneOpen() && document.querySelector('#phone-layer')?.classList.remove('on'));
  await A.waitForFunction(() => (GAME.st.notifs || []).some(n => n.app === 'potes' && /accepté/.test(n.txt)), null, { timeout: 30000 });
  check(true, 'A : notifié que B a accepté'); await sleep(300); await A.evaluate(() => { window.__keepBanner = 1; }); await shot(A, '04-notif-acceptee'); await A.evaluate(() => { window.__keepBanner = 0; });
  // les deux se voient
  await openPotes(A); check(await A.evaluate(() => AMIS.data.friends.some(f => f.name === 'Ninaa')), 'A voit B dans ses potes');
  await openPotes(B); check(await B.evaluate(() => AMIS.data.friends.some(f => f.name === 'Lucky Max')), 'B voit A dans ses potes');
  await shot(B, '05-liste-des-potes');
  // gros gain de A : pari gagné + du cash → le fil de B, et A passe devant B au patrimoine
  await sleep(16000);   // une synchro toutes les 15 s au plus
  await A.evaluate(() => { GAME.addCash(48000); ONLINE.ev('bet', { state: 'won', stake: 2000, gain: 12500 }); }); await sync(A); await sleep(1500);
  await closeAll(B); await B.evaluate(() => { document.querySelector('#phone-layer')?.classList.remove('on'); AMIS.poll(); }); await sleep(2500);
  check(await B.evaluate(() => (GAME.st.notifs || []).some(n => n.app === 'potes' && /gros pari/.test(n.txt))), 'B : notif du gros gain de A');
  await B.evaluate(() => { window.__keepBanner = 1; }); await shot(B, '06-notif-gros-gain'); await B.evaluate(() => { window.__keepBanner = 0; });
  check(await B.evaluate(() => !document.getElementById('badge-potes').classList.contains('hidden')), 'B : pastille sur l\'avatar pour la nouveauté du fil');
  // toucher la notif dans le téléphone ouvre la vue Potes du Profil, sur le fil
  await B.evaluate(() => UI.openPhone()); await sleep(600); await B.click('.ph-notif[data-act=phoneNotif]'); await sleep(1800);
  check(await B.evaluate(() => !!document.querySelector('#modal .tab[data-tab=potes].on') && !!document.querySelector('.am-tabs button.on[data-id=fil]')), 'Notif d\'un pote : ouvre Profil > Potes > Fil');
  check(await B.evaluate(() => AMIS.data.feed.some(f => f.kind === 'bet')), 'B : le gros gain est dans l\'onglet Fil'); await shot(B, '07-fil');
  check(await B.evaluate(() => document.getElementById('badge-potes').classList.contains('hidden')), 'B : pastille partie une fois le fil vu');
  await openPotes(B, 'top'); await sleep(500);
  const top = await B.evaluate(() => [...document.querySelectorAll('.am-top b')].filter(x => !x.classList.contains('am-val')).map(x => x.textContent));
  check(/Lucky Max/.test(top[0]) && /toi/.test(top[1]), 'Classement entre potes juste (A devant B) : ' + top.join(' / ')); await shot(B, '08-classement-patrimoine');
  await B.click('[data-act=amisTop][data-id=week]'); await sleep(400);
  check(/\+11 k/.test(await B.textContent('.am-top .am-val')), 'Classement des paris de la semaine (+10 500 arrondi à +11 k pour A)'); await shot(B, '09-classement-semaine');
  await B.click('.am-top[data-act=amisFiche]'); await sleep(1500); check(await B.evaluate(() => !!document.querySelector('.am-fiche')), 'B : fiche de A'); await shot(B, '10-fiche-pote');
  // ce que le serveur donne d'un pote : rien de la sauvegarde, pas de pid
  const leak = await B.evaluate(async () => JSON.stringify(await ONLINE.call('/api/amis', {})));
  const pidA = await A.evaluate(() => ONLINE.id.pid);
  check(!leak.includes(pidA) && !/secret|"save"|market/.test(leak), 'Données des potes résumées (ni pid, ni secret, ni sauvegarde)');
  check(/"worth":48000/.test(leak) || /"worth":5\d000/.test(leak), 'Patrimoine de A arrondi (2 chiffres)');
  // parrainage : 3 filleuls arrivent par le lien de A
  const link = await A.evaluate(() => AMIS.inviteUrl()); console.log('lien :', link); check(link.endsWith('?ami=' + tagA), 'Lien de parrainage en ?ami=' + tagA);
  const lingA0 = await A.evaluate(() => GAME.st.lingots);
  const fil = [];
  for (const [i, [n, sk]] of [['Kenzo', 'hoodie'], ['Sofia', 'sportive'], ['Momo B', 'doudoune']].entries()) {
    const c = await b.newContext({ viewport: { width: 375, height: 667 }, userAgent: UA(5 + i) }); await c.addInitScript(MUTE);
    const p = await c.newPage(); p.on('pageerror', e => console.log(`[${n}] erreur`, e.message));
    await p.goto(link); await p.waitForSelector('#st-name', { timeout: 20000 });
    await p.click(`.skin[data-skin="${sk}"]`).catch(() => {}); await p.fill('#st-name', n); await p.click('#st-go'); await sleep(1200);
    await p.evaluate(() => { const s = GAME.st; s.music = false; s.sound = false; s.noTuto = true; s.tutoDone = false; if (window.TUTO && TUTO.active) TUTO.skipAll(); s.tutoDone = false; GAME.save(); });
    await p.waitForFunction(() => window.ONLINE && ONLINE.on, null, { timeout: 30000 });
    await p.waitForFunction(() => !localStorage.getItem('hustleCity.ami'), null, { timeout: 30000 });
    fil.push(p);
  }
  const C = fil[0];
  check(await C.evaluate(async () => (await ONLINE.call('/api/amis', {})).friends.some(f => f.name === 'Lucky Max')), 'Filleul : devenu pote de A directement');
  const l0 = await C.evaluate(() => GAME.st.lingots), b0 = await C.evaluate(() => GAME.st.boosters);
  await C.evaluate(() => { GAME.st.tutoDone = true; GAME.save(); }); await sleep(16000); await sync(C); await sleep(1000); await sync(C); await sleep(17000); await sync(C); await sleep(1500);
  const l1 = await C.evaluate(() => GAME.st.lingots), b1 = await C.evaluate(() => GAME.st.boosters);
  check(l1 - l0 === 10 && b1 - b0 === 1, `Filleul : +10 lingots et +1 booster à la fin du tuto (${l1 - l0} / ${b1 - b0})`);
  // les 3 filleuls passent niveau 5 (forcé pour le test)
  await sleep(16000);
  for (const p of fil) { await p.evaluate(() => { GAME.st.tutoDone = true; GAME.st.lvl = 5; GAME.st.xp = 0; GAME.save(); }); await sync(p); }
  await sleep(17000); await sync(A); await sleep(2000);
  const st = await A.evaluate(() => ({ l: GAME.st.lingots, ev: GAME.st.evItems || {}, n: Object.keys(GAME.st.owned).length }));
  check(st.l - lingA0 >= 75, `Parrain : +25 lingots par filleul au niveau 5 (${st.l - lingA0} reçus pour 3)`);
  check(!!st.ev['pn-parrain'] && !!st.ev['fr-parrain'], 'Parrain : pin\'s et cadre Parrain au 3e filleul');
  // un filleul ne compte qu'une fois : le même lien rouvert par Kenzo ne change rien
  const again = await C.evaluate(async l => (await ONLINE.call('/api/amis/parrain', { code: l.split('ami=')[1], dev: 'x' })), link);
  check(again && !again.referral, 'Filleul : ne compte qu\'une fois');
  // pop-up « Invite tes potes » (B, pas encore parrain) : déclenchée par une montée de niveau quand les conditions sont remplies
  await closeAll(B); await B.evaluate(() => { const s = GAME.st; s.amisPlay = 11 * 60000; s.invitePop = { last: 0, later: 0 }; s.lvl = Math.max(s.lvl, 3); s.adForcedAt = 0; s.noAds = true; document.querySelector('#phone-layer')?.classList.remove('on'); });
  await B.evaluate(() => { const s = GAME.st; s.xp = GAME.xpNeed() - 1; GAME.addXp(5); });
  await sleep(1500); await closeAll(B);
  await B.waitForSelector('#modal .am-pop', { timeout: 15000 }).then(() => check(true, 'Pop-up « Invite tes potes » après une montée de niveau')).catch(() => check(false, 'Pop-up « Invite tes potes » après une montée de niveau'));
  await sleep(700); await shot(B, '11-popup-invite-tes-potes');
  await B.click('#modal .wp-later'); await sleep(400);
  check(await B.evaluate(() => GAME.st.invitePop.later === 1), 'Plus tard : l\'écart passe à 3 jours');
  await B.evaluate(() => { const s = GAME.st; s.xp = GAME.xpNeed() - 1; GAME.addXp(5); }); await sleep(1500); await closeAll(B); await sleep(3500);
  check(!(await B.evaluate(() => !!document.querySelector('#modal .am-pop'))), 'Pas de 2e pop-up le même jour');
  await closeAll(B);
  check(await A.evaluate(() => { const s = GAME.st; s.invitePop = { last: 0, later: 0 }; AMIS.invitePop(); return !document.querySelector('#modal .am-pop'); }), 'Plus de pop-up une fois Parrain (3 filleuls)');
  await closeAll(A);
  // le profil de A avec le pin's et le cadre Parrain
  await A.evaluate(() => document.querySelector('#phone-layer')?.classList.remove('on')); await A.evaluate(() => { GAME.st.avatar = 'pn-parrain'; GAME.st.frame = 'fr-parrain'; GAME.save(); }); await A.evaluate(() => document.querySelector('#hud .avatar, #hud [data-act=profile], [data-act=profile]')?.click()); await sleep(1200); await shot(A, '13-profil-pins-parrain'); await closeAll(A);
  // la carte « Invite tes potes » et le compteur dans l'appli, puis le profil avec le pin's et le cadre
  await openPotes(A); await shot(A, '12-profil-potes-parrain');
  // retrait d'un ami
  await openPotes(B); await B.click('.am-row[data-act=amisFiche]'); await sleep(1200); await B.click('[data-act=amisRmAsk]'); await sleep(300); await B.click('[data-act=amisRm]'); await sleep(1500);
  check(await B.evaluate(() => !AMIS.data.friends.some(f => f.name === 'Lucky Max')), 'Retrait d\'un pote');
  // demande croisée : B → A et A → B = potes directement
  await B.evaluate(async t => ONLINE.call('/api/amis/add', { code: t }), tagA);
  const cross = await A.evaluate(async t => ONLINE.call('/api/amis/add', { code: '#' + t }), tagB);
  check(cross && cross.friends, 'Demande croisée = potes directement');
  // classement à 6 : un 6e joueur devient pote de A ; médailles or, argent, bronze, medal-4, medal-5, puis medal-rank avec le numéro écrit par le code
  const F = await player(b, 'Yasmine', 'sportive', 9); const tagF = await F.evaluate(() => GAME.st.tag);
  await F.evaluate(async t => ONLINE.call('/api/amis/add', { code: t }), tagA); await A.evaluate(async t => ONLINE.call('/api/amis/add', { code: t }), tagF);
  await F.evaluate(() => { GAME.addCash(3000); }); await sync(F); await sleep(500);
  await openPotes(A, 'top'); await sleep(800);
  const med = await A.evaluate(() => [...document.querySelectorAll('.am-top .am-medal')].map(m => (m.querySelector('img') ? m.querySelector('img').src.split('/').pop().split('.')[0] : 'emoji') + (m.querySelector('b') ? '#' + m.querySelector('b').textContent : '')));
  check(med.length >= 6 && /medal-gold/.test(med[0]) && /medal-silver/.test(med[1]) && /medal-bronze/.test(med[2]) && /medal-rank#4/.test(med[3]) && /medal-rank#5/.test(med[4]) && /medal-rank#6/.test(med[5]), 'Classement : médailles 1 à 6 (' + med.join(', ') + ')'); await shot(A, '14-classement-medailles');
  // la pop-up « Invite tes potes » avec la scène (ouverte depuis l'encart de la vue Potes), puis retour à la vue Potes
  await openPotes(B); await B.click('.am-par'); await sleep(900);
  check(await B.evaluate(() => !!document.querySelector('#modal .am-pop .wp-art.am-scn img.am-scene')), 'Pop-up « Invite tes potes » : la scène plein cadre'); await shot(B, '15-popup-invite-scene');
  await B.click('#modal .wp-later'); await sleep(900);
  check(await B.evaluate(() => !!document.querySelector('#modal .tab[data-tab=potes].on')), 'En refermant la pop-up : retour à la vue Potes');
  // anti-spam : 5 demandes par minute
  let spam = 0; for (let i = 0; i < 7; i++) { const r = await A.evaluate(async () => ONLINE.call('/api/amis/add', { code: 'Personne#1' })); if (r === null || (r && /Trop/.test(r.err || ''))) spam++; }
  check(spam > 0, 'Anti-spam : trop de demandes d\'un coup refusées');
  require('fs').writeFileSync(path.join(OUT, 'audit-espaces.json'), JSON.stringify(defects, null, 1));
  const nd = Object.values(defects).reduce((a, d) => a + d.length, 0); console.log(`\nEspacements : ${nd} défaut(s) sur ${shots.length} captures (détail : exports-amis-captures/audit-espaces.json)`);
  console.log(`${ok} OK, ${ko} échec(s)`);
  await b.close();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
