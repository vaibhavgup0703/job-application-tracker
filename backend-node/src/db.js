// Database setup using Node's BUILT-IN SQLite module (node:sqlite, Node 22.13+), so there is
// nothing native to compile. The .NET side uses EF Core (an ORM); here we write plain SQL.
// Seeing both teaches you what an ORM generates for you.

const { DatabaseSync } = require('node:sqlite');

const STATUSES = ['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

function createDb(path) {
  const db = new DatabaseSync(path); // ':memory:' gives a throwaway DB (used by tests)

  // SQLite leaves foreign keys OFF by default; turn them on so ON DELETE CASCADE works.
  db.exec('PRAGMA foreign_keys = ON;');

  // CREATE TABLE IF NOT EXISTS = .NET's EnsureCreated(): build tables on first run only.
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company     TEXT    NOT NULL,
      role        TEXT    NOT NULL,
      status      TEXT    NOT NULL CHECK (status IN (${STATUSES.map((s) => `'${s}'`).join(',')})),
      location    TEXT,
      salary_lpa  REAL,
      job_url     TEXT,
      applied_on  TEXT,
      notes       TEXT,
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ix_applications_user_status ON applications (user_id, status);
  `);

  return db;
}

module.exports = { createDb, STATUSES };
