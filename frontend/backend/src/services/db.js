import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db;

export function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

export function initDb() {
  const dataDir = path.resolve('data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, 'app.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'User',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
}
