// Hustle City : structure de la base (partagée par server.js et tools/demo-backoffice.js).
// Les colonnes ajoutées après coup sont posées avec ALTER TABLE : une ancienne base se met à jour toute seule.
function initDb(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS players (pid TEXT PRIMARY KEY, secret TEXT, name TEXT, tag TEXT, skin TEXT, lvl INT, worth REAL, cash REAL, lingots INT,
      created INT, last_seen INT, sessions INT DEFAULT 0, play_ms INT DEFAULT 0, platform TEXT, ver TEXT, banned INT DEFAULT 0, ban_reason TEXT, notes TEXT, save TEXT, save_at INT);
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, pid TEXT, t INT, type TEXT, data TEXT);
    CREATE INDEX IF NOT EXISTS ev_t ON events(t); CREATE INDEX IF NOT EXISTS ev_pid ON events(pid, t); CREATE INDEX IF NOT EXISTS ev_type ON events(type, t);
    CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY, pid TEXT, t INT, status TEXT DEFAULT 'ouvert', subject TEXT);
    CREATE TABLE IF NOT EXISTS ticket_msgs (id INTEGER PRIMARY KEY, ticket INT, t INT, from_admin INT, text TEXT);
    CREATE TABLE IF NOT EXISTS inbox (id INTEGER PRIMARY KEY, pid TEXT, t INT, title TEXT, text TEXT, gift TEXT, claimed INT DEFAULT 0);
    CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT);
    CREATE TABLE IF NOT EXISTS admin_log (id INTEGER PRIMARY KEY, t INT, action TEXT, data TEXT);
    CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY, pid TEXT, start INT, last INT, ms INT DEFAULT 0);
    CREATE INDEX IF NOT EXISTS se_start ON sessions(start); CREATE INDEX IF NOT EXISTS se_pid ON sessions(pid, start);
    CREATE TABLE IF NOT EXISTS save_history (id INTEGER PRIMARY KEY, pid TEXT, t INT, lvl INT, worth REAL, save TEXT);
    CREATE INDEX IF NOT EXISTS sh_pid ON save_history(pid, t);
    CREATE TABLE IF NOT EXISTS geo_cache (ip TEXT PRIMARY KEY, t INT, data TEXT);
  `);
  const cols = (tbl) => new Set(db.prepare(`PRAGMA table_info(${tbl})`).all().map(c => c.name));
  const add = (tbl, defs) => { const have = cols(tbl); Object.entries(defs).forEach(([c, type]) => { if (!have.has(c)) db.exec(`ALTER TABLE ${tbl} ADD COLUMN ${c} ${type}`); }); };
  add('players', { xp: 'INT', boosters: 'INT', avatar: 'TEXT', frame: 'TEXT', tz: 'TEXT', lang: 'TEXT', screen: 'TEXT', ip: 'TEXT',
    country: 'TEXT', cc: 'TEXT', region: 'TEXT', city: 'TEXT', home: 'TEXT', lat: 'REAL', lon: 'REAL', geo_src: 'TEXT',
    // anti-triche : suspect = nombre de synchros refusées (valeurs qui montent trop vite), sync_at = dernière synchro, ac = repères du jour (JSON)
    suspect: 'INT DEFAULT 0', sync_at: 'INT', ac: 'TEXT' });
  add('tickets', { created: 'INT' });
  db.exec(`CREATE INDEX IF NOT EXISTS pl_seen ON players(last_seen); CREATE INDEX IF NOT EXISTS tk_pid ON tickets(pid);`);
  // anciens statuts : « répondu » devient « en attente » (on attend la réponse du joueur)
  db.exec(`UPDATE tickets SET status = 'en attente' WHERE status = 'répondu'; UPDATE tickets SET created = t WHERE created IS NULL;`);
}
module.exports = { initDb };
