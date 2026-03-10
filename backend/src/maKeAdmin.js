import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Resolve absolute path to database.sqlite (same folder style as your server.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "database.sqlite");
const db = new Database(dbPath);

const email = process.argv[2];

if (!email) {
  console.log("❌ Usage: node src/makeAdmin.js your@email.com");
  process.exit(1);
}

const user = db.prepare("SELECT id, email, role FROM users WHERE email = ?").get(email);

if (!user) {
  console.log("❌ No user found with email:", email);
  process.exit(1);
}

db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);

const updated = db.prepare("SELECT id, email, role FROM users WHERE email = ?").get(email);
console.log("✅ Updated user:", updated);

db.close();