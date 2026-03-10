 // backend/src/server.js
 import "dotenv/config";   // 🔥 MUST BE FIRST LINE
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Database from "better-sqlite3";

import axios from "axios";
import messagesRouter from "./routes/messages.js";







const app = express();
 

// -------------------- middleware --------------------
app.use(cors({ origin: true }));
app.use(express.json());
app.use("/messages", messagesRouter);

// -------------------- DB --------------------
const db = new Database("database.sqlite");
db.exec(`PRAGMA foreign_keys = ON;`);

 try {
  const rows = db.prepare("PRAGMA table_info(bookings);").all();
  console.log("✅ bookings table columns:", rows);
} catch (e) {
  console.error("PRAGMA error:", e.message);
}

// ===== ONE-TIME MIGRATION: allow admin role in users table =====
try {
  // Check current users table SQL
  const row = db.prepare(`
    SELECT sql FROM sqlite_master
    WHERE type='table' AND name='users'
  `).get();

   

  const createSql = (row?.sql || "").toLowerCase();
  const adminAllowed = createSql.includes("'admin'");

  if (!adminAllowed) {
    console.log("🔧 Migrating users table -> allow admin role...");

    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;

      CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('customer','provider','admin')) DEFAULT 'customer',
        created_at TEXT DEFAULT (datetime('now'))
      );

      INSERT INTO users_new (id, name, email, password_hash, role, created_at)
      SELECT id, name, email, password_hash, role, created_at FROM users;

      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;

      COMMIT;
      PRAGMA foreign_keys=ON;
    `);

    console.log("✅ Done: users.role now supports admin");
  } else {
    console.log("✅ users table already supports admin");
  }
} catch (e) {
  console.log("⚠️ users admin migration skipped/failed:", e.message);
}
// ===============================================================



// -------------------- DB setup --------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','provider', 'admin')) DEFAULT 'customer',
  created_at TEXT DEFAULT (datetime('now'))
);

 
 

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  city TEXT,
  price_from INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  date TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);




CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  provider_id INTEGER NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS quote_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL,
  provider_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'offered',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Safe booking migrations (run once, won't crash if column already exists)
try { db.prepare("ALTER TABLE bookings ADD COLUMN quote_id INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE bookings ADD COLUMN amount INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE bookings ADD COLUMN source TEXT DEFAULT 'booking'").run(); } catch (e) {}


 db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

  db.exec(`
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE,
  provider_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (provider_id) REFERENCES users(id),
  FOREIGN KEY (customer_id) REFERENCES users(id)
);
`);



db.exec(`
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'NGN',
  reference TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'initialized', -- initialized | success | failed
  created_at TEXT DEFAULT (datetime('now'))
);
`);
 
db.prepare(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    ref_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

try {
  db.prepare(`ALTER TABLE notifications ADD COLUMN type TEXT`).run();
} catch {}

try {
  db.prepare(`ALTER TABLE notifications ADD COLUMN ref_id INTEGER`).run();
} catch {}


 
// ====== migration: add paid column to bookings if missing ======
try {
  const cols = db.prepare("PRAGMA table_info(bookings);").all();
  const hasPaid = cols.some(c => c.name === "paid");

  if (!hasPaid) {
    db.prepare("ALTER TABLE bookings ADD COLUMN paid INTEGER NOT NULL DEFAULT 0;").run();
    console.log("✅ Added 'paid' column to bookings");
  } else {
    console.log("✅ 'paid' column already exists in bookings");
  }
} catch (e) {
  console.log("⚠️ bookings paid migration skipped/failed:", e.message);
}




// -------------------- auth helpers --------------------
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}


function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}


function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}


function createNotification(userId, title, body = "", type = "general", refId = null) {
  if (!userId) return;

  db.prepare(`
    INSERT INTO notifications (user_id, title, body, type, ref_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, title, body, type, refId);
}


// -------------------- routes --------------------
app.get("/health", (req, res) => res.json({ ok: true }));

// ---------- AUTH ----------
app.post("/auth/register", (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "name, email, password, role required" });
    }
    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({ error: "role must be customer or provider" });
    }

    const exists = db.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (exists) return res.status(400).json({ error: "Email already exists" });

    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)")
      .run(name, email, hash, role);

    const user = { id: Number(info.lastInsertRowid), name, email, role };
    const token = signToken(user);
    return res.json({ user, token });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.post("/auth/login", (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
    if (!user) return res.status(400).json({ error: "Invalid login" });

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: "Invalid login" });

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = signToken(safeUser);
    return res.json({ user: safeUser, token });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// ---------- SERVICES ----------
app.get("/services", (req, res) => {
  try {
    const { category, city, q } = req.query;

    const where = [];
    const params = {};

    if (category) {
      where.push("category = $category");
      params.category = category;
    }
    if (city) {
      where.push("city = $city");
      params.city = city;
    }
    if (q) {
      where.push("(title LIKE $q OR description LIKE $q)");
      params.q = `%${q}%`;
    }

    const sql = `
      SELECT
        id,
        title,
        category,
        description,
        city,
        price_from AS priceFrom,
        user_id AS providerId,
        created_at AS createdAt
      FROM services
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY id DESC
    `;

    return res.json(db.prepare(sql).all(params));
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// PROVIDER: list my services
app.get("/services/mine", authRequired, requireRole("provider"), (req, res) => {
  try {
    const services = db.prepare(`
      SELECT
        id,
        title,
        category,
        description,
        city,
        price_from AS priceFrom,
        user_id AS providerId,
        created_at AS createdAt
      FROM services
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.user.id);

    res.json(services);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.post("/services", authRequired, requireRole("provider"), (req, res) => {
  try {
    const { title, category, city, priceFrom, description } = req.body || {};
    if (!title || !category || !description) {
      return res.status(400).json({ error: "title, category, description required" });
    }

    const info = db
      .prepare(
        `INSERT INTO services (user_id,title,category,city,price_from,description)
         VALUES (?,?,?,?,?,?)`
      )
      .run(req.user.id, title, category, city || null, priceFrom ?? null, description);

    const created = db
      .prepare(
        `SELECT
          id, title, category, description, city,
          price_from AS priceFrom,
          user_id AS providerId,
          created_at AS createdAt
         FROM services WHERE id=?`
      )
      .get(info.lastInsertRowid);

    return res.json(created);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// ---------- BOOKINGS ----------
app.post("/bookings", authRequired, requireRole("customer"), (req, res) => {
  try {
    const { serviceId, date, note } = req.body || {};
    if (!serviceId) return res.status(400).json({ error: "serviceId is required" });

    const service = db.prepare("SELECT id, user_id FROM services WHERE id=?").get(serviceId);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const info = db
      .prepare(
        `INSERT INTO bookings (customer_id, service_id, date, note, status)
         VALUES (?, ?, ?, ?, 'pending')`
      )
      .run(req.user.id, serviceId, date || null, note || null);

      createNotification(
  service.user_id,
  "New booking received",
  `A customer booked your service.`,
  "booking",
  Number(info.lastInsertRowid)
);

      

    return res.json({ ok: true, bookingId: Number(info.lastInsertRowid) });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});


// ================= ADMIN ROUTES =================

// View all users (admin only)
app.get("/admin/users",
  authRequired,
  requireRole("admin"),
  (req, res) => {
    const users = db.prepare(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json(users);
  }
);


  app.get("/bookings/me", authRequired, requireRole("customer"), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        b.id,
        b.service_id AS serviceId,
        b.date,
        b.note,
        b.status,
        b.created_at AS createdAt,
        s.title,
        s.category,
        s.city,
        s.price_from AS priceFrom,
        s.user_id AS providerId
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.customer_id = ?
      ORDER BY b.id DESC
    `).all(req.user.id);

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});



 // PROVIDER: list bookings for my services
app.get("/bookings/provider", authRequired, requireRole("provider"), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        b.id,
        b.service_id AS serviceId,
        b.customer_id AS customerId,
        b.date,
        b.note,
        b.status,
        b.created_at AS createdAt,
        s.title,
        s.category,
        s.city,
        s.price_from AS priceFrom
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE s.user_id = ?
      ORDER BY b.id DESC
    `).all(req.user.id);

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});


// PROVIDER: update booking status
 // PROVIDER: update booking status
 app.patch("/bookings/:id/status", authRequired, requireRole("provider"), (req, res) => {
  const bookingId = Number(req.params.id);
  const { status } = req.body || {};

  const allowed = ["pending", "accepted", "rejected", "completed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const current = db.prepare(`
      SELECT b.id, b.status
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.id = ? AND s.user_id = ?
    `).get(bookingId, req.user.id);

    if (!current) {
      return res.status(404).json({ error: "Booking not found for this provider" });
    }

    if (status === "accepted" && current.status !== "pending") {
      return res.status(400).json({ error: "Only pending bookings can be accepted" });
    }

    if (status === "rejected" && current.status !== "pending") {
      return res.status(400).json({ error: "Only pending bookings can be rejected" });
    }

    if (status === "completed" && current.status !== "accepted") {
      return res.status(400).json({ error: "Only accepted bookings can be completed" });
    }

    db.prepare(`
      UPDATE bookings
      SET status = ?
      WHERE id = ?
    `).run(status, bookingId);

    const bookingOwner = db.prepare(`
      SELECT customer_id
      FROM bookings
      WHERE id = ?
    `).get(bookingId);

    if (bookingOwner && bookingOwner.customer_id) {
      createNotification(
        bookingOwner.customer_id,
        "Booking updated",
        `Your booking is now ${status}.`,
        "booking_status",
        bookingId
      );
    }

    return res.json({ success: true, status });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});


// ---------- QUOTES ----------

// Create quote request (customer)
app.post("/quotes", authRequired, requireRole("customer"), (req, res) => {
  try {
    const { service_id, details } = req.body || {};
    if (!service_id) return res.status(400).json({ error: "service_id required" });

    const service = db.prepare("SELECT user_id, title FROM services WHERE id=?").get(service_id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const result = db
      .prepare(
        `INSERT INTO quotes (service_id, customer_id, provider_id, details, status)
         VALUES (?, ?, ?, ?, 'pending')`
      )
      .run(service_id, req.user.id, service.user_id, details || "");

    return res.json({ success: true, quoteId: Number(result.lastInsertRowid) });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// Customer: list my quotes  ✅ THIS is what MyQuotes.jsx must call
app.get("/quotes/my", authRequired, requireRole("customer"), (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          q.id,
          q.service_id AS serviceId,
          q.customer_id AS customerId,
          q.provider_id AS providerId,
          q.details,
          q.status,
          q.created_at AS createdAt,
          s.title
        FROM quotes q
        JOIN services s ON s.id = q.service_id
        WHERE q.customer_id = ?
        ORDER BY q.created_at DESC
        `
      )
      .all(req.user.id);

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// Provider: list quote requests for me
app.get("/provider/quotes", authRequired, requireRole("provider"), (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          q.id,
          q.service_id AS serviceId,
          q.customer_id AS customerId,
          q.provider_id AS providerId,
          q.details,
          q.status,
          q.created_at AS createdAt,
          s.title
        FROM quotes q
        JOIN services s ON s.id = q.service_id
        WHERE q.provider_id = ?
        ORDER BY q.created_at DESC
        `
      )
      .all(req.user.id);

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// Provider: create offer
app.post("/quotes/:id/offer", authRequired, requireRole("provider"), (req, res) => {
  try {
    const quoteId = Number(req.params.id);
    const { amount, message } = req.body || {};
    if (!amount) return res.status(400).json({ error: "Amount required" });

    const quote = db.prepare("SELECT id FROM quotes WHERE id=? AND provider_id=?").get(quoteId, req.user.id);
    if (!quote) return res.status(404).json({ error: "Quote not found" });

    db.prepare(
      `INSERT INTO quote_offers (quote_id, provider_id, amount, message, status)
       VALUES (?, ?, ?, ?, 'offered')`
    ).run(quoteId, req.user.id, Number(amount), message || "");

    db.prepare(`UPDATE quotes SET status='offered' WHERE id=?`).run(quoteId);

    const quoteRow = db.prepare(
  "SELECT customer_id FROM quotes WHERE id = ?"
).get(quoteId);

if (quoteRow?.customer_id) {
  createNotification(
    quoteRow.customer_id,
    "New quote offer",
    "A provider sent you an offer.",
    "quote_offer",
    quoteId
  );
}

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// Customer: list offers for quote
app.get("/quotes/:id/offers", authRequired, requireRole("customer"), (req, res) => {
  try {
    const quoteId = Number(req.params.id);

    const quote = db.prepare("SELECT * FROM quotes WHERE id=?").get(quoteId);
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    if (quote.customer_id !== req.user.id) return res.status(403).json({ error: "Not allowed" });

    const offers = db
      .prepare(
        `
        SELECT id, quote_id AS quoteId, provider_id AS providerId, amount, message, status, created_at AS createdAt
        FROM quote_offers
        WHERE quote_id = ?
        ORDER BY id DESC
        `
      )
      .all(quoteId);

    return res.json({ offers });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/debug/quotes", (req, res) => {
  const rows = db.prepare("SELECT * FROM quotes").all();
  res.json(rows);
});
 
  // Customer: accept quote offer -> create booking
app.post("/offers/:id/accept", authRequired, requireRole("customer"), (req, res) => {
  try {
    const offerId = Number(req.params.id);

    // get offer + quote details
    const offer = db.prepare(`
      SELECT qo.id AS offer_id, qo.quote_id, qo.amount, qo.message, qo.status AS offer_status,
             q.customer_id, q.service_id, q.provider_id, q.status AS quote_status
      FROM quote_offers qo
      JOIN quotes q ON q.id = qo.quote_id
      WHERE qo.id = ?
    `).get(offerId);

    if (!offer) return res.status(404).json({ error: "Offer not found" });

    // ensure this customer owns the quote
    if (offer.customer_id !== req.user.id) {
      return res.status(403).json({ error: "Not allowed" });
    }

    // prevent double-create
    const existing = db.prepare(`SELECT id FROM bookings WHERE quote_id = ?`).get(offer.quote_id);
    if (existing) {
      // still mark statuses correctly
      db.prepare(`UPDATE quote_offers SET status='accepted' WHERE id=?`).run(offerId);
      db.prepare(`UPDATE quote_offers SET status='rejected' WHERE quote_id=? AND id!=?`).run(offer.quote_id, offerId);
      db.prepare(`UPDATE quotes SET status='accepted' WHERE id=?`).run(offer.quote_id);
      return res.json({ success: true, bookingId: existing.id, alreadyCreated: true });
    }

    // update offer + quote status
    db.prepare(`UPDATE quote_offers SET status='accepted' WHERE id=?`).run(offerId);
    db.prepare(`UPDATE quote_offers SET status='rejected' WHERE quote_id=? AND id!=?`).run(offer.quote_id, offerId);
    db.prepare(`UPDATE quotes SET status='accepted' WHERE id=?`).run(offer.quote_id);

    // create booking (MATCH YOUR bookings table columns)
    const ins = db.prepare(`
      INSERT INTO bookings (customer_id, service_id, date, note, status, quote_id, amount, source, paid)
      VALUES (?, ?, NULL, ?, 'pending', ?, ?, 'quote', 0)
    `).run(
      offer.customer_id,
      offer.service_id,
      offer.message || "Booking created from quote offer",
      offer.quote_id,
      offer.amount
    );

    res.json({ success: true, bookingId: Number(ins.lastInsertRowid) });
  } catch (e) {
    console.error("accept offer error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

  console.log("Loaded key starts with:", process.env.PAYSTACK_SECRET_KEY?.slice(0, 8));

  

app.post("/payments/init", authRequired, (req, res) => {
  try {
    console.log("PAYMENT INIT BODY:", req.body);
    const bookingId = Number(req.body.bookingId || req.body.booking_id);
if (!bookingId) {
  return res.status(400).json({ error: "bookingId required" });
}

    // booking + price
    const booking = db.prepare(`
      SELECT b.*, s.title, s.price_from AS price_from
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.customer_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    // already paid?
    if (booking.paid === 1) return res.json({ alreadyPaid: true });

    const amountNaira = Number(booking.price_from || 0);
    if (!amountNaira || amountNaira <= 0) {
      return res.status(400).json({ error: "Booking has no price" });
    }

    const reference = `OWF_${bookingId}_${Date.now()}`;

    // save local payment row
    db.prepare(`
      INSERT OR REPLACE INTO payments (booking_id, customer_id, amount, reference, status)
      VALUES (?, ?, ?, ?, 'initialized')
    `).run(bookingId, req.user.id, amountNaira, reference);

    const secret = process.env.PAYSTACK_SECRET_KEY;
    const callbackUrl = `${process.env.APP_URL}/pay/verify?reference=${reference}`;

    // ✅ THIS IS THE "r" YOU WERE MISSING
    axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.user.email,
        amount: amountNaira * 100, // kobo
        reference,
        callback_url: callbackUrl,
        currency: "NGN",
      },
      {
        headers: { Authorization: `Bearer ${secret}` },
      }
    ).then((r) => {
      return res.json({
        reference,
        access_code: r.data?.data?.access_code,
        authorization_url: r.data?.data?.authorization_url,
      });
    }).catch((e) => {
      console.log("❌ paystack init error:", e.response?.data || e.message);
      return res.status(500).json({ error: "Paystack init failed" });
    });

  } catch (e) {
    console.log("❌ payments init error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});


 app.get("/payments/verify/:reference", authRequired, async (req, res) => {
  const reference = req.params.reference;

  const pay = db.prepare(`SELECT * FROM payments WHERE reference = ?`).get(reference);
  if (!pay) return res.status(404).json({ error: "Payment not found" });
  if (pay.customer_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  const secret = requireEnv("PAYSTACK_SECRET_KEY");

  try {
    const r = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    const status = r.data?.data?.status; // "success" etc

    if (status === "success") {
      db.prepare(`UPDATE payments SET status='success' WHERE reference=?`).run(reference);

      // mark payment success
db.prepare("UPDATE payments SET status='success' WHERE reference=?").run(reference);

// mark booking paid ✅
db.prepare("UPDATE bookings SET paid=1 WHERE id=?").run(pay.booking_id);

db.prepare("UPDATE payments SET status='failed' WHERE reference=?").run(reference);

      // OPTIONAL: mark booking as paid
      db.exec(`ALTER TABLE bookings ADD COLUMN paid INTEGER DEFAULT 0;`); // only if not exists (if errors, skip)
      db.prepare(`UPDATE bookings SET paid=1 WHERE id=?`).run(pay.booking_id);
    } else {
      db.prepare(`UPDATE payments SET status='failed' WHERE reference=?`).run(reference);
    }

    res.json({ ok: true, status, reference });
  } catch (e) {
    res.status(500).json({ error: "Verify failed" });
  }
});




app.post("/reviews", authRequired, requireRole("customer"), (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body || {};
    if (!bookingId || !rating) return res.status(400).json({ error: "bookingId and rating required" });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: "rating must be 1-5" });

    // booking must belong to customer and be completed
    const b = db.prepare(`
      SELECT b.id, b.customer_id, b.service_id, b.status, s.user_id AS providerId
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.id = ? AND b.customer_id = ?
    `).get(bookingId, req.user.id);

    if (!b) return res.status(404).json({ error: "Booking not found" });
    if (b.status !== "completed") return res.status(400).json({ error: "Only completed bookings can be reviewed" });

    // prevent duplicate review
    const existing = db.prepare(`SELECT id FROM reviews WHERE booking_id = ?`).get(bookingId);
    if (existing) return res.status(400).json({ error: "Review already submitted" });

    const info = db.prepare(`
      INSERT INTO reviews (booking_id, provider_id, customer_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(bookingId, b.providerId, req.user.id, rating, comment || null);

    return res.json({ id: info.lastInsertRowid });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});



app.get("/reviews/provider", authRequired, requireRole("provider"), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.id, r.rating, r.comment, r.created_at AS createdAt,
             r.booking_id AS bookingId
      FROM reviews r
      WHERE r.provider_id = ?
      ORDER BY r.id DESC
    `).all(req.user.id);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});



app.get("/reviews/service/:serviceId", (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);
    const rows = db
      .prepare(
        `
        SELECT r.id, r.rating, r.comment, r.created_at,
               u.name AS customer_name
        FROM reviews r
        JOIN users u ON u.id = r.customer_id
        WHERE r.service_id = ?
        ORDER BY r.id DESC
        `
      )
      .all(serviceId);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "Failed to load reviews" });
  }
});


app.get("/reviews/service/:serviceId/summary", (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);
    const row = db
      .prepare(
        `
        SELECT COUNT(*) AS total,
               COALESCE(AVG(rating), 0) AS avg
        FROM reviews
        WHERE service_id = ?
        `
      )
      .get(serviceId);

    res.json({
      total: row.total,
      avg: Number(row.avg.toFixed(2)),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to load summary" });
  }
});

 app.get("/bookings/:id/messages", authRequired, (req, res) => {
  try {
    const bookingId = Number(req.params.id);

    const booking = db.prepare(`
      SELECT b.*, s.user_id AS provider_id
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const isCustomer = booking.customer_id === req.user.id;
    const isProvider = booking.provider_id === req.user.id;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const rows = db.prepare(`
      SELECT id, booking_id, sender_id, receiver_id, body, created_at
      FROM messages
      WHERE booking_id = ?
      ORDER BY id ASC
    `).all(bookingId);

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// Customer: create review for a completed booking (one review per booking)
 app.post("/bookings/:id/messages", authRequired, (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Message body required" });
    }

    const booking = db.prepare(`
      SELECT b.*, s.user_id AS provider_id
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const isCustomer = booking.customer_id === req.user.id;
    const isProvider = booking.provider_id === req.user.id;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const receiverId = isCustomer
      ? booking.provider_id
      : booking.customer_id;

    const info = db.prepare(`
      INSERT INTO messages (booking_id, sender_id, receiver_id, body)
      VALUES (?, ?, ?, ?)
    `).run(bookingId, req.user.id, receiverId, body.trim());

    res.json({ success: true, id: Number(info.lastInsertRowid) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});
// Get review for a booking (so the page can show it if exists)
app.get("/bookings/:id/review", authRequired, (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const r = db.prepare(`SELECT * FROM reviews WHERE booking_id=?`).get(bookingId);
    if (!r) return res.status(404).json({ error: "No review yet" });
    res.json(r);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/debug/bookings", (req, res) => {
  const rows = db.prepare("SELECT * FROM bookings ORDER BY id DESC LIMIT 50").all();
  res.json(rows);
});



app.get("/notifications", authRequired, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.user.id);

  res.json(notifications);
});

// unread notifications count (for bell badge)
app.get("/unread-count", authRequired, (req, res) => {
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`)
    .get(req.user.id);

  res.json({ count: row.count });
});

app.post("/notifications/:id/read", authRequired, (req, res) => {
  db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);

  res.json({ success: true });
});

// Public: fetch provider basic profile by user id
app.get("/providers/:id", (req, res) => {
  try {
    const providerId = Number(req.params.id);
    if (!providerId) {
      return res.status(400).json({ error: "Invalid provider id" });
    }

    const provider = db.prepare(`
      SELECT id, full_name, email, role, created_at
      FROM users
      WHERE id = ? AND role = 'provider'
    `).get(providerId);

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    return res.json(provider);
  } catch (e) {
    console.error("GET PROVIDER ERROR:", e);
    return res.status(500).json({ error: e.message || "Failed to load provider" });
  }
});
 

// -------------------- start --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
