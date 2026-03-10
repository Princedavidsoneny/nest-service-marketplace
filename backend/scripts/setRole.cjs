 // backend/scripts/setRole.js
const path = require("path");
const Database = require("better-sqlite3");

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
  console.log("Usage: node scripts/setRole.js <email> <role>");
  console.log("Example: node scripts/setRole.js customer@test.com customer");
  process.exit(1);
}

const dbPath = path.join(__dirname, "..", "database.sqlite");
const db = new Database(dbPath);

const result = db.prepare("UPDATE users SET role = ? WHERE email = ?").run(role, email);

const user = db.prepare("SELECT id, name, email, role FROM users WHERE email = ?").get(email);

db.close();

console.log("✅ Updated rows:", result.changes);
console.log("✅ User now:", user);