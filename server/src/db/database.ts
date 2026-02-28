import fs from 'fs';
import path from 'path';

let db: any = null;
let _sqlJs: any = null; // reference to sql.js runtime when used
let _rawSqlJsDb: any = null; // underlying sql.js DB instance (not wrapper)
let _dbPath: string = path.resolve(__dirname, '../../mediator.db');

// Helper to persist database when using sql.js
function persistSqlJsDb() {
  if (!_sqlJs || !_rawSqlJsDb) return;
  try {
    const data = _rawSqlJsDb.export();
    fs.writeFileSync(_dbPath, Buffer.from(data));
  } catch (err) {
    console.warn('Failed to persist sql.js DB:', err);
  }
}

// Create a wrapper that mimics better-sqlite3 minimal API used in the app
function createSqlJsWrapper(sqlDb: any) {
  return {
    exec: (sql: string) => sqlDb.exec(sql),
    prepare: (sql: string) => {
      const stmt = sqlDb.prepare(sql);

      return {
        run: (...params: any[]) => {
          if (params && params.length) stmt.bind(params);
          stmt.step();
          stmt.free();

          // Attempt to get last insert id
          const res = sqlDb.exec('SELECT last_insert_rowid() as id');
          const last = (res && res[0] && res[0].values && res[0].values[0] && res[0].values[0][0]) || null;
          persistSqlJsDb();
          return { lastInsertRowid: last };
        },

        get: (...params: any[]) => {
          if (params && params.length) stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.get();
            const cols = stmt.getColumnNames();
            const obj: any = {};
            cols.forEach((c: string, i: number) => (obj[c] = row[i]));
            stmt.free();
            return obj;
          }
          stmt.free();
          return undefined;
        },

        all: (...params: any[]) => {
          const out: any[] = [];
          if (params && params.length) stmt.bind(params);
          while (stmt.step()) {
            const row = stmt.get();
            const cols = stmt.getColumnNames();
            const obj: any = {};
            cols.forEach((c: string, i: number) => (obj[c] = row[i]));
            out.push(obj);
          }
          stmt.free();
          return out;
        }
      } as any;
    }
  } as any;
}

// Try to use better-sqlite3 first; if not available (e.g., server can't build native addons) fall back to sql.js
export async function initializeDatabase() {
  _dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.resolve(__dirname, '../../mediator.db');

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BetterDB = require('better-sqlite3');
    db = new BetterDB(_dbPath);
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
  } catch (err) {
    // Fallback to sql.js (WASM)
    try {
      // dynamic import to avoid requiring at top-level
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const initSqlJs = require('sql.js');
      _sqlJs = await initSqlJs();

      if (fs.existsSync(_dbPath)) {
        const file = fs.readFileSync(_dbPath);
        _rawSqlJsDb = new _sqlJs.Database(new Uint8Array(file));
      } else {
        _rawSqlJsDb = new _sqlJs.Database();
      }

      // wrap the sql.js instance to match better-sqlite3's minimal interface used
      db = createSqlJsWrapper(_rawSqlJsDb);

      console.info('Using sql.js (WASM) fallback for SQLite');
    } catch (werr) {
      console.error('Failed to initialize any SQLite implementation:', werr);
      throw werr;
    }
  }

  // Enable foreign keys (works for both wrappers)
  try {
    db.exec('PRAGMA foreign_keys = ON');
  } catch (e) {
    // ignore
  }

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      reset_token TEXT,
      reset_token_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      user_id INTEGER NOT NULL,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS media_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'book', 'album')),
      external_id TEXT NOT NULL,
      title TEXT NOT NULL,
      year TEXT,
      poster_url TEXT,
      additional_data TEXT,
      notes TEXT,
      added_by INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
      FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Add notes column if it doesn't exist (for existing databases)
  try {
    db.exec('ALTER TABLE media_items ADD COLUMN notes TEXT');
  } catch (e) {
    // Column already exists
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS watched_with (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_item_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(media_item_id, user_id),
      FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_item_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(media_item_id, user_id),
      FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS collaborations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      UNIQUE(list_id, user_id),
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id_1 INTEGER NOT NULL,
      user_id_2 INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id_1, user_id_2),
      FOREIGN KEY (user_id_1) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id_2) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      UNIQUE(from_user_id, to_user_id),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized successfully');
}

// Export a proxy object so imports get a usable object even before async init
const exportedDb: any = {
  prepare: (sql: string) => {
    if (!db) throw new Error('Database not initialized. Call initializeDatabase() first.');
    return db.prepare(sql);
  },
  exec: (sql: string) => {
    if (!db) throw new Error('Database not initialized. Call initializeDatabase() first.');
    return db.exec(sql);
  }
};

export default exportedDb;
