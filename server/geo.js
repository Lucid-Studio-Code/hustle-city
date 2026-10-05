// Hustle City : d'où viennent les joueurs.
// 1) l'adresse IP (service gratuit ip-api.com, sans clé, résultat gardé en base par IP) ;
// 2) si l'IP est privée/locale (ou si le service ne répond pas) : on déduit pays et ville approximatifs du fuseau horaire du téléphone.
// Ne bloque jamais la réponse au joueur : la recherche part en arrière-plan.
const TZ = {
  'Europe/Paris': ['France', 'FR', 'Île-de-France', 'Paris', 48.857, 2.352],
  'Europe/Brussels': ['Belgique', 'BE', 'Bruxelles', 'Bruxelles', 50.847, 4.357],
  'Europe/Zurich': ['Suisse', 'CH', 'Zurich', 'Zurich', 47.377, 8.54],
  'Europe/Luxembourg': ['Luxembourg', 'LU', 'Luxembourg', 'Luxembourg', 49.611, 6.13],
  'Europe/Monaco': ['Monaco', 'MC', 'Monaco', 'Monaco', 43.738, 7.424],
  'America/Montreal': ['Canada', 'CA', 'Québec', 'Montréal', 45.502, -73.567],
  'America/Toronto': ['Canada', 'CA', 'Ontario', 'Toronto', 43.653, -79.383],
  'America/Vancouver': ['Canada', 'CA', 'Colombie-Britannique', 'Vancouver', 49.283, -123.121],
  'Africa/Casablanca': ['Maroc', 'MA', 'Casablanca-Settat', 'Casablanca', 33.573, -7.59],
  'Africa/Algiers': ['Algérie', 'DZ', 'Alger', 'Alger', 36.754, 3.059],
  'Africa/Tunis': ['Tunisie', 'TN', 'Tunis', 'Tunis', 36.806, 10.181],
  'Africa/Dakar': ['Sénégal', 'SN', 'Dakar', 'Dakar', 14.716, -17.467],
  'Africa/Abidjan': ["Côte d'Ivoire", 'CI', 'Abidjan', 'Abidjan', 5.36, -4.008],
  'Indian/Reunion': ['La Réunion', 'RE', 'La Réunion', 'Saint-Denis', -20.882, 55.45],
  'America/Guadeloupe': ['Guadeloupe', 'GP', 'Guadeloupe', 'Pointe-à-Pitre', 16.241, -61.533],
  'America/Martinique': ['Martinique', 'MQ', 'Martinique', 'Fort-de-France', 14.616, -61.059],
  'America/Cayenne': ['Guyane', 'GF', 'Guyane', 'Cayenne', 4.922, -52.313],
  'Europe/London': ['Royaume-Uni', 'GB', 'Angleterre', 'Londres', 51.507, -0.128],
  'Europe/Madrid': ['Espagne', 'ES', 'Madrid', 'Madrid', 40.417, -3.704],
  'Europe/Berlin': ['Allemagne', 'DE', 'Berlin', 'Berlin', 52.52, 13.405],
  'Europe/Rome': ['Italie', 'IT', 'Latium', 'Rome', 41.903, 12.496],
  'Europe/Lisbon': ['Portugal', 'PT', 'Lisbonne', 'Lisbonne', 38.722, -9.139],
  'Europe/Amsterdam': ['Pays-Bas', 'NL', 'Hollande', 'Amsterdam', 52.368, 4.904],
  'America/New_York': ['États-Unis', 'US', 'New York', 'New York', 40.713, -74.006],
  'America/Los_Angeles': ['États-Unis', 'US', 'Californie', 'Los Angeles', 34.052, -118.244]
};
const COUNTRY_FR = { FR: 'France', BE: 'Belgique', CH: 'Suisse', LU: 'Luxembourg', MC: 'Monaco', CA: 'Canada', MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie', SN: 'Sénégal',
  CI: "Côte d'Ivoire", RE: 'La Réunion', GP: 'Guadeloupe', MQ: 'Martinique', GF: 'Guyane', GB: 'Royaume-Uni', ES: 'Espagne', DE: 'Allemagne', IT: 'Italie',
  PT: 'Portugal', NL: 'Pays-Bas', US: 'États-Unis' };

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  let ip = xf || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '';
  ip = String(ip).replace(/^::ffff:/, '');
  return ip;
}
function isPrivate(ip) {
  if (!ip || ip === '::1' || ip === 'localhost') return true;
  if (/^(10\.|127\.|192\.168\.|169\.254\.|0\.)/.test(ip)) return true;
  const m = ip.match(/^172\.(\d+)\./); if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  const c = ip.match(/^100\.(\d+)\./); if (c && +c[1] >= 64 && +c[1] <= 127) return true;
  if (/^(fc|fd|fe80)/i.test(ip)) return true;
  return false;
}
function fromTz(tz) {
  const r = TZ[tz]; if (!r) return null;
  return { country: r[0], cc: r[1], region: r[2], city: r[3], lat: r[4], lon: r[5], src: 'fuseau' };
}

// setGeo(pid, geo) est appelé dès qu'on sait ; en arrière-plan si on doit demander au service
function makeGeo(db) {
  const getC = db.prepare('SELECT data FROM geo_cache WHERE ip = ?'), putC = db.prepare('INSERT OR REPLACE INTO geo_cache (ip, t, data) VALUES (?, ?, ?)');
  const setP = db.prepare('UPDATE players SET country = ?, cc = ?, region = ?, city = ?, lat = ?, lon = ?, geo_src = ? WHERE pid = ?');
  const busy = new Set();
  const apply = (pid, g) => g && setP.run(g.country || null, g.cc || null, g.region || null, g.city || null, g.lat ?? null, g.lon ?? null, g.src || null, pid);
  return function locate(pid, ip, tz, already) {
    try {
      const tzGeo = fromTz(tz);
      if (isPrivate(ip)) { if (tzGeo && (!already || already === 'fuseau')) apply(pid, tzGeo); return; }
      const c = getC.get(ip);
      if (c) { const g = JSON.parse(c.data); apply(pid, g && g.cc ? g : tzGeo); return; }
      if (tzGeo && !already) apply(pid, tzGeo);   // en attendant la réponse du service
      if (busy.has(ip) || typeof fetch !== 'function') return; busy.add(ip);
      fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon`, { signal: AbortSignal.timeout(5000) })
        .then(r => r.json()).then(j => {
          const g = j && j.status === 'success' ? { country: COUNTRY_FR[j.countryCode] || j.country, cc: j.countryCode, region: j.regionName, city: j.city, lat: j.lat, lon: j.lon, src: 'ip' } : { fail: 1 };
          putC.run(ip, Date.now(), JSON.stringify(g)); apply(pid, g.cc ? g : tzGeo);
        }).catch(() => {}).finally(() => busy.delete(ip));
    } catch (e) { /* jamais bloquant */ }
  };
}
module.exports = { clientIp, isPrivate, fromTz, makeGeo, TZ, COUNTRY_FR };
