const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "database.sqlite");
const db = new Database(dbPath);

 db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','provider')),
  phone TEXT,
  city TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  providerId INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  priceFrom INTEGER NOT NULL,
  city TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (providerId) REFERENCES users(id)
);



CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serviceId INTEGER NOT NULL,
  customerId INTEGER NOT NULL,
  customerName TEXT NOT NULL,
  customerPhone TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (serviceId) REFERENCES services(id),
  FOREIGN KEY (customerId) REFERENCES users(id)
);





`
);

db.prepare(`
  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serviceId INTEGER NOT NULL,
    customerId INTEGER NOT NULL,
    providerId INTEGER NOT NULL,

    details TEXT NOT NULL,
    proposedPrice INTEGER,
    providerMessage TEXT,

    status TEXT NOT NULL DEFAULT 'requested',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (serviceId) REFERENCES services(id),
    FOREIGN KEY (customerId) REFERENCES users(id),
    FOREIGN KEY (providerId) REFERENCES users(id)
  );
`).run();

module.exports = db;
