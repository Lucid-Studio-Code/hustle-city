// Biff City : envoi d'un e-mail en SMTP, sans dépendance (codes de connexion du back office, e-mail de test).
// TLS direct (port 465), AUTH LOGIN, texte brut en UTF-8. Réglages (page Sécurité du back office) : { host, port, user, pass, from }.
// SMTP_CA_FILE : certificat d'autorité en plus (seulement pour les tests avec un faux serveur SMTP local).
const tls = require('tls'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const b64 = s => Buffer.from(String(s), 'utf8').toString('base64');
const oneLine = s => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();   // jamais de retour à la ligne dans un en-tête (pas d'injection)
const word = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;   // sujet / nom accentués
function addrOf(v) { const m = /<([^<>\s]+@[^<>\s]+)>/.exec(v) || /([^<>\s]+@[^<>\s]+)/.exec(v); return m ? m[1] : ''; }
function fromHeader(v) { const a = addrOf(v), name = oneLine(String(v).replace(/<[^>]*>/, '').replace(/"/g, '')); return name && name !== a ? `${word(name)} <${a}>` : `<${a}>`; }
const ready = c => !!(c && c.host && c.user && c.pass && addrOf(c.from || c.user));

function sendMail(c, to, subject, text) {
  return new Promise((ok, ko) => {
    const from = addrOf(c.from || c.user), rcpt = addrOf(to);
    if (!ready(c) || !rcpt) return ko(new Error('SMTP pas configuré.'));
    const host = oneLine(c.host), domain = from.split('@')[1] || 'localhost';
    const body = b64(String(text).replace(/\r?\n/g, '\r\n')).replace(/.{1,76}/g, '$&\r\n');
    const msg = [`From: ${fromHeader(oneLine(c.from || c.user))}`, `To: <${rcpt}>`, `Subject: ${word(oneLine(subject))}`, `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
      `Message-ID: <${crypto.randomBytes(12).toString('hex')}@${domain}>`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body].join('\r\n');
    // le dialogue : [commande, code attendu] ; null = on attend juste l'accueil du serveur
    const steps = [[null, 220], [`EHLO ${os.hostname().replace(/[^\w.-]/g, '') || 'localhost'}`, 250], ['AUTH LOGIN', 334], [b64(c.user), 334], [b64(c.pass), 235],
      [`MAIL FROM:<${from}>`, 250], [`RCPT TO:<${rcpt}>`, 250], ['DATA', 354], [msg.replace(/^\./gm, '..') + '\r\n.', 250], ['QUIT', 221]];
    let ca; try { if (process.env.SMTP_CA_FILE) ca = fs.readFileSync(process.env.SMTP_CA_FILE); } catch (e) {}
    const s = tls.connect({ host, port: +c.port || 465, servername: host, ...(ca ? { ca } : {}) });
    let buf = '', i = 0, done = false;
    const end = (e) => { if (done) return; done = true; clearTimeout(timer); s.destroy(); e ? ko(e) : ok(true); };
    const timer = setTimeout(() => end(new Error('Le serveur SMTP ne répond pas.')), 20000);
    s.setEncoding('utf8');
    s.on('error', e => end(new Error('Connexion SMTP impossible : ' + e.message)));
    s.on('close', () => end(i >= steps.length - 1 ? null : new Error('Le serveur SMTP a coupé la connexion.')));   // coupé après l'envoi (avant « 221 ») : l'e-mail est parti
    s.on('data', d => {
      buf += d; let m;
      while ((m = /^(\d{3})([ -])(.*)\r?\n/m.exec(buf))) {   // une réponse (éventuellement sur plusieurs lignes « 250-… ») se termine par « 250 … »
        buf = buf.slice(m.index + m[0].length); if (m[2] === '-') continue;
        const want = steps[i][1];
        if (+m[1] !== want) return end(new Error(`Le serveur SMTP a refusé (${i === 4 ? 'identifiant ou mot de passe d\'application' : 'étape ' + i}) : ${m[1]} ${oneLine(m[3]).slice(0, 120)}`));
        if (++i >= steps.length) return end();
        s.write(steps[i][0] + '\r\n');
      }
    });
  });
}
module.exports = { sendMail, ready, addrOf };
