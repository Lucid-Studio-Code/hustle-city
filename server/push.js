// Biff City : notifications sur le téléphone des joueurs (jeu fermé). Gratuit, aucun service payant.
//  - Android : Firebase Cloud Messaging. Clé « compte de service » Firebase dans server/fcm-key.json (ou FCM_KEY = chemin).
//  - iPhone  : directement chez Apple (APNs). Clé .p8 dans server/apns-key.p8 (ou APNS_KEY = chemin) + APNS_KEY_ID + APNS_TEAM_ID
//              (+ APNS_PROD=1 une fois l'appli sur l'App Store ; bundle : APNS_TOPIC, par défaut com.lucidstudio.hustlecity).
// Sans clé : rien n'est envoyé, le reste du serveur marche normalement.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), http2 = require('http2');
const KEY_FILE = process.env.FCM_KEY || path.join(__dirname, 'fcm-key.json');
const APNS_FILE = process.env.APNS_KEY || path.join(__dirname, 'apns-key.p8');
const APNS = { keyId: process.env.APNS_KEY_ID || '', team: process.env.APNS_TEAM_ID || '', topic: process.env.APNS_TOPIC || 'com.lucidstudio.hustlecity', host: process.env.APNS_PROD ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com' };

function makePush(db) {
  db.exec('CREATE TABLE IF NOT EXISTS push_tokens (token TEXT PRIMARY KEY, pid TEXT, platform TEXT, t INT)');
  db.exec('CREATE INDEX IF NOT EXISTS push_pid ON push_tokens(pid)');
  const key = (() => { try { return JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')); } catch (e) { return null; } })();
  const apnsKey = (() => { try { return APNS.keyId && APNS.team ? fs.readFileSync(APNS_FILE, 'utf8') : null; } catch (e) { return null; } })();
  let cached = null, apnsJwt = null;
  function apnsToken() {   // jeton Apple signé (valable 1 h, on le renouvelle toutes les 50 min)
    if (apnsJwt && apnsJwt.exp > Date.now()) return apnsJwt.token;
    const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'), u = b({ alg: 'ES256', kid: APNS.keyId }) + '.' + b({ iss: APNS.team, iat: Math.floor(Date.now() / 1000) });
    const sig = crypto.sign('sha256', Buffer.from(u), { key: apnsKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    apnsJwt = { token: u + '.' + sig, exp: Date.now() + 50 * 60000 }; return apnsJwt.token;
  }
  function sendApple(token, title, body) {
    return new Promise(ok => {
      const c = http2.connect(APNS.host); c.on('error', () => ok(false));
      const r = c.request({ ':method': 'POST', ':path': '/3/device/' + token, authorization: 'bearer ' + apnsToken(), 'apns-topic': APNS.topic, 'apns-push-type': 'alert', 'content-type': 'application/json' });
      let status = 0, data = ''; r.on('response', h => { status = h[':status']; }); r.on('data', d => data += d);
      r.on('end', () => { c.close(); if (status === 410 || /BadDeviceToken|Unregistered/.test(data)) db.prepare('DELETE FROM push_tokens WHERE token = ?').run(token); ok(status === 200); });
      r.end(JSON.stringify({ aps: { alert: { title, body }, sound: 'default' } }));
    });
  }
  const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
  async function accessToken() {
    if (cached && cached.exp > Date.now() + 60000) return cached.token;
    const iat = Math.floor(Date.now() / 1000);
    const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 });
    const jwt = unsigned + '.' + crypto.createSign('RSA-SHA256').update(unsigned).sign(key.private_key).toString('base64url');
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt });
    const j = await r.json(); if (!j.access_token) throw new Error('FCM : jeton refusé'); cached = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 }; return cached.token;
  }
  async function sendOne(token, title, body, data) {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${key.project_id}/messages:send`, { method: 'POST', headers: { Authorization: 'Bearer ' + await accessToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, notification: { title, body }, data: data || {}, apns: { payload: { aps: { sound: 'default' } } }, android: { notification: { sound: 'default' } } } }) });
    if (r.status === 404 || r.status === 400) { const j = await r.json().catch(() => ({})); if (/UNREGISTERED|INVALID_ARGUMENT|not a valid FCM/i.test(JSON.stringify(j))) db.prepare('DELETE FROM push_tokens WHERE token = ?').run(token); return false; }
    return r.ok;
  }
  return {
    on: !!(key || apnsKey),
    // pid = joueur AUTHENTIFIÉ (pid + secret vérifiés par server.js) : un téléphone déjà lié à un autre joueur lui est retiré, puis lié à celui-ci ; 5 téléphones par joueur au plus
    save(pid, token, platform) {
      token = String(token || ''); if (!pid || !/^[\w:.-]{20,400}$/.test(token)) return false;
      const pf = ['ios', 'android', 'web'].includes(platform) ? platform : '';
      db.prepare('DELETE FROM push_tokens WHERE token = ? AND pid != ?').run(token, pid);
      db.prepare('INSERT INTO push_tokens (token, pid, platform, t) VALUES (?, ?, ?, ?) ON CONFLICT(token) DO UPDATE SET platform = excluded.platform, t = excluded.t').run(token, pid, pf, Date.now());
      db.prepare('DELETE FROM push_tokens WHERE pid = ? AND token NOT IN (SELECT token FROM push_tokens WHERE pid = ? ORDER BY t DESC LIMIT 5)').run(pid, pid); return true;
    },
    count(pids) { if (!pids.length) return 0; const set = new Set(pids); return db.prepare('SELECT pid FROM push_tokens').all().filter(r => set.has(r.pid)).length; },
    // envoie à une liste de joueurs (en tâche de fond : ne bloque jamais la réponse du back office)
    async toPlayers(pids, title, body) {
      if (!(key || apnsKey) || !pids.length) return 0; const set = new Set(pids), L = db.prepare('SELECT token, pid, platform FROM push_tokens').all().filter(r => set.has(r.pid));
      let ok = 0; for (const r of L) { try { const sent = r.platform === 'ios' ? (apnsKey ? await sendApple(r.token, title, body) : false) : (key ? await sendOne(r.token, title, body) : false); if (sent) ok++; } catch (e) { console.warn('push', e.message); } } return ok;
    }
  };
}
module.exports = { makePush };
