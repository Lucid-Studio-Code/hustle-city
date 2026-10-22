// Test de bout en bout du « jouer entre amis » (sans son) : serveur de test sur une base à part, 5 joueurs dans des navigateurs séparés.
//   DB=server/amis-test.db PORT=5330 node server/server.js   puis   node tools/test-amis.js
// Captures (390x844 et 375x667) dans exports-amis-captures/.
const path = require('path');
const PW = process.env.PW || '/Users/lucillegarnot/.npm/_npx/787f53666b8d4740/node_modules/playwright';
const { webkit } = require(PW);
const URL0 = process.env.URL || 'http://localhost:5330/game.html', OUT = path.join(__dirname, '..', 'exports-amis-captures');
const MUTE = () => { try { localStorage.setItem('hustleCity.age18', '1'); window.AudioContext = undefined; window.webkitAudioContext = undefined; HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; } catch (e) {} };
const UA = n => `Mozilla/5.0 (iPhone; CPU iPhone OS 17_${n} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.${n} Mobile/15E148 Safari/604.1`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, ko = 0; const check = (c, t) => { console.log((c ? 'OK  ' : 'ÉCHEC ') + t); c ? ok++ : ko++; };
const shots = [];
async function shot(p, name) {
  await p.evaluate(() => { const b = document.getElementById('ph-banner'); if (b && !window.__keepBanner) b.classList.remove('show'); const t = document.getElementById('toast'); if (t) t.classList.remove('on'); });
  for (const [w, h] of [[390, 844], [375, 667]]) { await p.setViewportSize({ width: w, height: h }); await sleep(500); const f = `${name}-${w}x${h}.png`; await p.screenshot({ path: path.join(OUT, f) }); shots.push(f); }
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
const openPotes = async (p, tab) => { await p.evaluate(t => { UI.openPhone('potes'); AMIS.opened(t); }, tab || 'amis'); await sleep(1500); };
const sync = p => p.evaluate(() => ONLINE.flush());
(async () => {
  const b = await webkit.launch();
  const A = await player(b, 'Lucky Max', 'survet', 1), B = await player(b, 'Ninaa', 'sportive', 2);
  const tagA = await A.evaluate(() => GAME.st.tag), tagB = await B.evaluate(() => GAME.st.tag);
  console.log('A = Lucky Max#' + tagA, ' B = Ninaa#' + tagB);
  // l'écran d'accueil du téléphone avec l'appli Potes
  await closeAll(A); await A.evaluate(() => UI.openPhone()); await sleep(800); await shot(A, '01-telephone-appli-potes');
  // A ajoute B (majuscules et espace en trop : tolérés)
  await openPotes(A); await A.fill('#am-code', ` ninaa # ${tagB}`); await A.click('[data-act=amisAdd]'); await sleep(1500);
  check(await A.evaluate(() => AMIS.data.reqOut.length === 1), 'A : demande envoyée et visible dans « Demandes envoyées »');
  await shot(A, '02-demande-envoyee');
  // doublon et soi-même
  await A.fill('#am-code', `Ninaa#${tagB}`); await A.click('[data-act=amisAdd]'); await sleep(800);
  check(/déjà envoyée/.test(await A.textContent('.am-msg')), 'A : demande en double refusée');
  await A.fill('#am-code', `Lucky Max#${tagA}`); await A.click('[data-act=amisAdd]'); await sleep(800);
  check(/toi/.test(await A.textContent('.am-msg')), 'A : se demander soi-même refusé');
  // B : la pop-up arrive toute seule (sondage toutes les 20 s)
  await closeAll(B); await B.waitForSelector('#modal .am-ask', { timeout: 30000 }); await sleep(600);
  check(true, 'B : pop-up de demande reçue'); await shot(B, '03-popup-demande-recue');
  await B.click('#modal .am-ask [data-ok="1"]'); await sleep(1500);
  // A est prévenu (notification Potes)
  await A.evaluate(() => UI.phoneOpen() && document.querySelector('#phone-layer').classList.remove('on'));
  await A.waitForFunction(() => (GAME.st.notifs || []).some(n => n.app === 'potes' && /accepté/.test(n.txt)), null, { timeout: 30000 });
  check(true, 'A : notifié que B a accepté'); await sleep(300); await A.evaluate(() => { window.__keepBanner = 1; }); await shot(A, '04-notif-acceptee'); await A.evaluate(() => { window.__keepBanner = 0; });
  // les deux se voient
  await openPotes(A); check(await A.evaluate(() => AMIS.data.friends.some(f => f.name === 'Ninaa')), 'A voit B dans ses potes');
  await openPotes(B); check(await B.evaluate(() => AMIS.data.friends.some(f => f.name === 'Lucky Max')), 'B voit A dans ses potes');
  await shot(B, '05-liste-des-potes');
  // gros gain de A : pari gagné + du cash → le fil de B, et A passe devant B au patrimoine
  await sleep(16000);   // une synchro toutes les 15 s au plus
  await A.evaluate(() => { GAME.addCash(48000); ONLINE.ev('bet', { state: 'won', stake: 2000, gain: 12500 }); }); await sync(A); await sleep(1500);
  await B.evaluate(() => { document.querySelector('#phone-layer').classList.remove('on'); AMIS.poll(); }); await sleep(2500);
  check(await B.evaluate(() => (GAME.st.notifs || []).some(n => n.app === 'potes' && /gros pari/.test(n.txt))), 'B : notif du gros gain de A');
  await B.evaluate(() => { window.__keepBanner = 1; }); await shot(B, '06-notif-gros-gain'); await B.evaluate(() => { window.__keepBanner = 0; });
  await openPotes(B, 'fil'); check(await B.evaluate(() => AMIS.data.feed.some(f => f.kind === 'bet')), 'B : le gros gain est dans l\'onglet Fil'); await shot(B, '07-fil');
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
  const link = await A.evaluate(() => AMIS.inviteUrl()); console.log('lien :', link);
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
  const again = await C.evaluate(async l => (await ONLINE.call('/api/amis/parrain', { code: decodeURIComponent(l.split('ami=')[1]), dev: 'x' })), link);
  check(again && !again.referral, 'Filleul : ne compte qu\'une fois');
  // pop-up « Invite tes potes » (B, pas encore parrain) : déclenchée par une montée de niveau quand les conditions sont remplies
  await closeAll(B); await B.evaluate(() => { const s = GAME.st; s.amisPlay = 11 * 60000; s.invitePop = { last: 0, later: 0 }; s.lvl = Math.max(s.lvl, 3); s.adForcedAt = 0; s.noAds = true; document.querySelector('#phone-layer').classList.remove('on'); });
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
  await A.evaluate(() => document.querySelector('#phone-layer').classList.remove('on')); await A.evaluate(() => { GAME.st.avatar = 'pn-parrain'; GAME.st.frame = 'fr-parrain'; GAME.save(); }); await A.evaluate(() => document.querySelector('#hud .avatar, #hud [data-act=profile], [data-act=profile]')?.click()); await sleep(1200); await shot(A, '13-profil-pins-parrain'); await closeAll(A);
  // la carte « Invite tes potes » et le compteur dans l'appli, puis le profil avec le pin's et le cadre
  await openPotes(A); await shot(A, '12-appli-potes-parrain');
  // retrait d'un ami
  await openPotes(B); await B.click('.am-row[data-act=amisFiche]'); await sleep(1200); await B.click('[data-act=amisRmAsk]'); await sleep(300); await B.click('[data-act=amisRm]'); await sleep(1500);
  check(await B.evaluate(() => !AMIS.data.friends.some(f => f.name === 'Lucky Max')), 'Retrait d\'un pote');
  // demande croisée : B → A et A → B = potes directement
  await B.evaluate(async t => ONLINE.call('/api/amis/add', { code: 'Lucky Max#' + t }), tagA);
  const cross = await A.evaluate(async t => ONLINE.call('/api/amis/add', { code: 'ninaa#' + t }), tagB);
  check(cross && cross.friends, 'Demande croisée = potes directement');
  // anti-spam : 5 demandes par minute
  let spam = 0; for (let i = 0; i < 7; i++) { const r = await A.evaluate(async () => ONLINE.call('/api/amis/add', { code: 'Personne#1' })); if (r === null || (r && /Trop/.test(r.err || ''))) spam++; }
  check(spam > 0, 'Anti-spam : trop de demandes d\'un coup refusées');
  console.log(`\n${ok} OK, ${ko} échec(s)`); console.log(shots.join('\n'));
  await b.close();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
