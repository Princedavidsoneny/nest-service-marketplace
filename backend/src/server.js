 import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Database from "better-sqlite3";
import axios from "axios";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import messagesRouter from "./routes/messages.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({ origin: true }));
app.use(express.json());
app.use("/messages", messagesRouter);
app.use("/uploads", express.static(uploadsDir));

const db = new Database("database.sqlite");
db.exec(`PRAGMA foreign_keys = ON;`);

// -------------------- schema --------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','provider','admin')) DEFAULT 'customer',
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

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'NGN',
  reference TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'initialized',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  message TEXT,
  type TEXT,
  ref_id INTEGER,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// -------------------- safe migrations --------------------
try { db.prepare("ALTER TABLE bookings ADD COLUMN quote_id INTEGER").run(); } catch {}
try { db.prepare("ALTER TABLE bookings ADD COLUMN amount INTEGER").run(); } catch {}
try { db.prepare("ALTER TABLE bookings ADD COLUMN source TEXT DEFAULT 'booking'").run(); } catch {}
try { db.prepare("ALTER TABLE bookings ADD COLUMN paid INTEGER NOT NULL DEFAULT 0").run(); } catch {}

try { db.prepare("ALTER TABLE notifications ADD COLUMN message TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE notifications ADD COLUMN type TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE notifications ADD COLUMN ref_id INTEGER").run(); } catch {}

try { db.prepare("ALTER TABLE users ADD COLUMN bio TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE users ADD COLUMN profile_image TEXT").run(); } catch {}

try {
  const notificationCols = db.prepare("PRAGMA table_info(notifications);").all();
  const hasBody = notificationCols.some((c) => c.name === "body");
  const hasMessage = notificationCols.some((c) => c.name === "message");

  if (!hasBody) {
    db.prepare("ALTER TABLE notifications ADD COLUMN body TEXT NOT NULL DEFAULT ''").run();
  }

  if (!hasMessage) {
    db.prepare("ALTER TABLE notifications ADD COLUMN message TEXT").run();
  }

  db.prepare(`
    UPDATE notifications
    SET body = COALESCE(body, ''),
        message = COALESCE(message, body, '')
  `).run();
} catch {}

// -------------------- upload config --------------------
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    const safeOriginal = String(file.originalname || "image")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const uniqueName = `${Date.now()}-${safeOriginal}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: function (_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed"));
    }
    cb(null, true);
  },
});

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
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function fmtBookingDate(value) {
  if (!value) return "an unspecified date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createNotification(userId, title, body = "", type = "general", refId = null) {
  if (!userId) return;

  const safeBody = String(body || "").trim() || "You have a new notification.";

  db.prepare(`
    INSERT INTO notifications (user_id, title, body, message, type, ref_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, title, safeBody, safeBody, type, refId);
}

function normalizeServiceId(input) {
  const id = Number(input);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function normalizeProfileImage(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith("/uploads/")) return text;

  return null;
}

function publicImageUrl(req, value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^https?:\/\//i.test(text)) return text;

  if (text.startsWith("/uploads/")) {
    return `${req.protocol}://${req.get("host")}${text}`;
  }

  return "";
}

// -------------------- routes --------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

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

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio || "",
      profileImage: user.profile_image || "",
    };

    const token = signToken(safeUser);

    return res.json({ user: safeUser, token });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// ---------- UPLOAD ----------
app.post("/upload/profile-image", authRequired, requireRole("provider"), (req, res) => {
  upload.single("image")(req, res, (err) => {
    try {
      if (err) {
        return res.status(400).json({ error: err.message || "Upload failed" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const storedPath = `/uploads/${req.file.filename}`;

      return res.json({
        success: true,
        imagePath: storedPath,
        imageUrl: `${req.protocol}://${req.get("host")}${storedPath}`,
      });
    } catch {
      return res.status(500).json({ error: "Upload failed" });
    }
  });
});

// ---------- PROVIDER PROFILE SETTINGS ----------
app.get("/providers/me", authRequired, requireRole("provider"), (req, res) => {
  try {
    const provider = db.prepare(`
      SELECT
        id,
        name,
        email,
        role,
        bio,
        profile_image,
        created_at AS createdAt
      FROM users
      WHERE id = ? AND role = 'provider'
    `).get(req.user.id);

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    return res.json({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      role: provider.role,
      bio: provider.bio || "",
      profileImage: publicImageUrl(req, provider.profile_image),
      createdAt: provider.createdAt,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Failed to load provider profile" });
  }
});

app.patch("/providers/me", authRequired, requireRole("provider"), (req, res) => {
  try {
    const { name, bio, profileImage } = req.body || {};

    const safeName = String(name || "").trim();
    const safeBio = String(bio || "").trim();
    const safeProfileImage = normalizeProfileImage(profileImage);

    if (!safeName) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (profileImage && !safeProfileImage) {
      return res.status(400).json({
        error: "Profile image must be a valid http/https URL or uploaded image path",
      });
    }

    db.prepare(`
      UPDATE users
      SET name = ?, bio = ?, profile_image = ?
      WHERE id = ? AND role = 'provider'
    `).run(
      safeName,
      safeBio || null,
      safeProfileImage || null,
      req.user.id
    );

    const updated = db.prepare(`
      SELECT
        id,
        name,
        email,
        role,
        bio,
        profile_image,
        created_at AS createdAt
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    return res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      bio: updated.bio || "",
      profileImage: publicImageUrl(req, updated.profile_image),
      createdAt: updated.createdAt,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Failed to update provider profile" });
  }
});

// ---------- SERVICES ----------
app.get("/services", (req, res) => {
  try {
    const { category, city, q } = req.query;
    const where = [];
    const values = [];

    if (category) {
      where.push("s.category = ?");
      values.push(category);
    }

    if (city) {
      where.push("s.city = ?");
      values.push(city);
    }

    if (q) {
      where.push("(s.title LIKE ? OR s.description LIKE ?)");
      values.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rows = db.prepare(`
      SELECT
        s.id,
        s.title,
        s.category,
        s.description,
        s.city,
        s.price_from AS priceFrom,
        s.user_id AS providerId,
        u.name AS providerName,
        u.profile_image AS providerProfileImage,
        s.created_at AS createdAt,
        COALESCE((
          SELECT ROUND(AVG(r.rating), 1)
          FROM reviews r
          WHERE r.provider_id = s.user_id
        ), 0) AS avgRating,
        COALESCE((
          SELECT COUNT(*)
          FROM reviews r
          WHERE r.provider_id = s.user_id
        ), 0) AS reviewCount
      FROM services s
      JOIN users u ON u.id = s.user_id
      ${whereSql}
      ORDER BY s.id DESC
    `).all(...values);

    return res.json(rows);
  } catch (e) {
    console.error("GET /services error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/services/mine", authRequired, requireRole("provider"), (req, res) => {
  try {
    const rows = db.prepare(`
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

    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.post("/services", authRequired, requireRole("provider"), (req, res) => {
  try {
    const { title, category, city, priceFrom, description } = req.body || {};

    if (!title || !category || !description) {
      return res.status(400).json({ error: "title, category, description required" });
    }

    const info = db.prepare(`
      INSERT INTO services (user_id,title,category,city,price_from,description)
      VALUES (?,?,?,?,?,?)
    `).run(req.user.id, title, category, city || null, priceFrom ?? null, description);

    const created = db.prepare(`
      SELECT
        id, title, category, description, city,
        price_from AS priceFrom,
        user_id AS providerId,
        created_at AS createdAt
      FROM services
      WHERE id = ?
    `).get(info.lastInsertRowid);

    return res.json(created);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// ---------- BOOKINGS ----------
app.post("/bookings", authRequired, requireRole("customer"), (req, res) => {
  try {
    const { serviceId, date, note } = req.body || {};
    const normalizedServiceId = normalizeServiceId(serviceId);

    if (!normalizedServiceId) {
      return res.status(400).json({ error: "serviceId is required" });
    }

    const service = db.prepare(`
      SELECT id, user_id, title
      FROM services
      WHERE id = ?
    `).get(normalizedServiceId);

    if (!service) return res.status(404).json({ error: "Service not found" });

    const info = db.prepare(`
      INSERT INTO bookings (customer_id, service_id, date, note, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(req.user.id, normalizedServiceId, date || null, note || null);

    createNotification(
      service.user_id,
      "New booking received",
      `Your booking for ${service.title} on ${fmtBookingDate(date)} has been confirmed.`,
      "booking",
      Number(info.lastInsertRowid)
    );

    return res.json({ ok: true, bookingId: Number(info.lastInsertRowid) });
  } catch (e) {
    console.error("POST /bookings error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/bookings/me", authRequired, requireRole("customer"), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        b.id,
        b.service_id AS serviceId,
        b.date,
        b.note,
        b.status,
        b.amount,
        b.source,
        b.paid,
        b.created_at AS createdAt,
        s.title,
        s.category,
        s.city,
        s.price_from AS priceFrom,
        s.user_id AS providerId,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM reviews r WHERE r.booking_id = b.id
          ) THEN 1 ELSE 0
        END AS reviewSubmitted
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.customer_id = ?
      ORDER BY b.id DESC
    `).all(req.user.id);

    return res.json(rows);
  } catch (e) {
    console.error("GET /bookings/me error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

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
        b.amount,
        b.source,
        b.paid,
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
    console.error("GET /bookings/provider error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.patch("/bookings/:id/status", authRequired, requireRole("provider"), (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { status } = req.body || {};

    const allowed = ["pending", "accepted", "rejected", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

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

    db.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).run(status, bookingId);

    const bookingOwner = db.prepare(`SELECT customer_id FROM bookings WHERE id = ?`).get(bookingId);

    if (bookingOwner?.customer_id) {
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
    console.error("PATCH /bookings/:id/status error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// ---------- QUOTES ----------
app.post("/quotes", authRequired, requireRole("customer"), (req, res) => {
  try {
    const { service_id, serviceId, details } = req.body || {};
    const normalizedServiceId = normalizeServiceId(service_id || serviceId);

    if (!normalizedServiceId) {
      return res.status(400).json({ error: "service_id required" });
    }

    const service = db.prepare(`
      SELECT id, user_id, title
      FROM services
      WHERE id = ?
    `).get(normalizedServiceId);

    if (!service) return res.status(404).json({ error: "Service not found" });

    const result = db.prepare(`
      INSERT INTO quotes (service_id, customer_id, provider_id, details, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(normalizedServiceId, req.user.id, service.user_id, details || "");

    createNotification(
      service.user_id,
      "New quote request",
      `A customer requested a quote for ${service.title}.`,
      "quote_request",
      Number(result.lastInsertRowid)
    );

    return res.json({ success: true, quoteId: Number(result.lastInsertRowid) });
  } catch (e) {
    console.error("POST /quotes error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/quotes/my", authRequired, requireRole("customer"), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        q.id,
        q.service_id AS serviceId,
        q.customer_id AS customerId,
        q.provider_id AS providerId,
        q.details,
        q.status,
        q.created_at AS createdAt,
        s.title,
        s.city
      FROM quotes q
      JOIN services s ON s.id = q.service_id
      WHERE q.customer_id = ?
      ORDER BY q.created_at DESC
    `).all(req.user.id);

    return res.json(rows);
  } catch (e) {
    console.error("GET /quotes/my error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/provider/quotes", authRequired, requireRole("provider"), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        q.id,
        q.service_id AS serviceId,
        q.customer_id AS customerId,
        q.provider_id AS providerId,
        q.details,
        q.status,
        q.created_at AS createdAt,
        s.title,
        s.city
      FROM quotes q
      JOIN services s ON s.id = q.service_id
      WHERE q.provider_id = ?
      ORDER BY q.created_at DESC
    `).all(req.user.id);

    return res.json(rows);
  } catch (e) {
    console.error("GET /provider/quotes error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.post("/quotes/:id/offer", authRequired, requireRole("provider"), (req, res) => {
  try {
    const quoteId = Number(req.params.id);
    const { amount, message } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Valid amount required" });
    }

    const quote = db.prepare(`
      SELECT id, customer_id
      FROM quotes
      WHERE id = ? AND provider_id = ?
    `).get(quoteId, req.user.id);

    if (!quote) return res.status(404).json({ error: "Quote not found" });

    db.prepare(`
      INSERT INTO quote_offers (quote_id, provider_id, amount, message, status)
      VALUES (?, ?, ?, ?, 'offered')
    `).run(quoteId, req.user.id, Number(amount), message || "");

    db.prepare(`UPDATE quotes SET status='offered' WHERE id=?`).run(quoteId);

    createNotification(
      quote.customer_id,
      "New quote offer",
      "A provider sent you an offer.",
      "quote_offer",
      quoteId
    );

    return res.json({ success: true });
  } catch (e) {
    console.error("POST /quotes/:id/offer error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/quotes/:id/offers", authRequired, requireRole("customer"), (req, res) => {
  try {
    const quoteId = Number(req.params.id);

    const quote = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(quoteId);
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    if (quote.customer_id !== req.user.id) return res.status(403).json({ error: "Not allowed" });

    const offers = db.prepare(`
      SELECT
        id,
        quote_id AS quoteId,
        provider_id AS providerId,
        amount,
        message,
        status,
        created_at AS createdAt
      FROM quote_offers
      WHERE quote_id = ?
      ORDER BY id DESC
    `).all(quoteId);

    return res.json({ offers });
  } catch (e) {
    console.error("GET /quotes/:id/offers error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.post("/offers/:id/accept", authRequired, requireRole("customer"), (req, res) => {
  try {
    const offerId = Number(req.params.id);

    const offer = db.prepare(`
      SELECT
        qo.id AS offer_id,
        qo.quote_id,
        qo.amount,
        qo.message,
        q.customer_id,
        q.service_id,
        q.provider_id
      FROM quote_offers qo
      JOIN quotes q ON q.id = qo.quote_id
      WHERE qo.id = ?
    `).get(offerId);

    if (!offer) return res.status(404).json({ error: "Offer not found" });
    if (offer.customer_id !== req.user.id) return res.status(403).json({ error: "Not allowed" });

    const existing = db.prepare(`SELECT id FROM bookings WHERE quote_id = ?`).get(offer.quote_id);
    if (existing) {
      db.prepare(`UPDATE quote_offers SET status='accepted' WHERE id=?`).run(offerId);
      db.prepare(`UPDATE quote_offers SET status='rejected' WHERE quote_id=? AND id!=?`).run(offer.quote_id, offerId);
      db.prepare(`UPDATE quotes SET status='accepted' WHERE id=?`).run(offer.quote_id);

      return res.json({ success: true, bookingId: existing.id, alreadyCreated: true });
    }

    db.prepare(`UPDATE quote_offers SET status='accepted' WHERE id=?`).run(offerId);
    db.prepare(`UPDATE quote_offers SET status='rejected' WHERE quote_id=? AND id!=?`).run(offer.quote_id, offerId);
    db.prepare(`UPDATE quotes SET status='accepted' WHERE id=?`).run(offer.quote_id);

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

    createNotification(
      offer.provider_id,
      "Quote offer accepted",
      "A customer accepted your quote offer.",
      "quote_accepted",
      Number(ins.lastInsertRowid)
    );

    return res.json({ success: true, bookingId: Number(ins.lastInsertRowid) });
  } catch (e) {
    console.error("POST /offers/:id/accept error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// ---------- PAYMENTS ----------
app.post("/payments/init", authRequired, async (req, res) => {
  try {
    const bookingId = Number(req.body.bookingId || req.body.booking_id);
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });

    const booking = db.prepare(`
      SELECT
        b.*,
        s.title,
        s.price_from AS service_price
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.id = ?
    `).get(bookingId);

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.customer_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    if (booking.paid === 1) return res.json({ alreadyPaid: true });

    const amountNaira = Number(booking.amount || booking.service_price || booking.price_from || 0);
    if (!amountNaira || amountNaira <= 0) {
      return res.status(400).json({ error: "Booking has no price" });
    }

    const secret = requireEnv("PAYSTACK_SECRET_KEY");
    const appUrl = requireEnv("APP_URL");
    const reference = `OWF_${bookingId}_${Date.now()}`;

    db.prepare(`
      INSERT OR REPLACE INTO payments (booking_id, customer_id, amount, reference, status)
      VALUES (?, ?, ?, ?, 'initialized')
    `).run(bookingId, req.user.id, amountNaira, reference);

    const callbackUrl = `${appUrl}/pay/verify?reference=${reference}`;

    if (!req.user.email || !String(req.user.email).includes("@")) {
      return res.status(400).json({ error: "Customer email is invalid" });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.user.email,
        amount: amountNaira * 100,
        reference,
        callback_url: callbackUrl,
        currency: "NGN",
      },
      {
        headers: { Authorization: `Bearer ${secret}` },
      }
    );

    return res.json({
      reference,
      access_code: response.data?.data?.access_code,
      authorization_url: response.data?.data?.authorization_url,
    });
  } catch (e) {
    console.error("POST /payments/init error:", e.response?.data || e.message);
    return res.status(500).json({ error: "Paystack init failed" });
  }
});

app.get("/payments/verify/:reference", authRequired, async (req, res) => {
  try {
    const reference = req.params.reference;

    const pay = db.prepare(`SELECT * FROM payments WHERE reference = ?`).get(reference);
    if (!pay) return res.status(404).json({ error: "Payment not found" });
    if (pay.customer_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const secret = requireEnv("PAYSTACK_SECRET_KEY");
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );

    const status = response.data?.data?.status;

    if (status === "success") {
      db.prepare(`UPDATE payments SET status='success' WHERE reference=?`).run(reference);
      db.prepare(`UPDATE bookings SET paid=1 WHERE id=?`).run(pay.booking_id);
    } else {
      db.prepare(`UPDATE payments SET status='failed' WHERE reference=?`).run(reference);
    }

    return res.json({ ok: true, status, reference });
  } catch (e) {
    console.error("GET /payments/verify/:reference error:", e.response?.data || e.message);
    return res.status(500).json({ error: "Verify failed" });
  }
});

// ---------- REVIEWS ----------
app.post("/reviews", authRequired, requireRole("customer"), (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body || {};

    if (!bookingId || !rating) {
      return res.status(400).json({ error: "bookingId and rating required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be 1-5" });
    }

    const booking = db.prepare(`
      SELECT
        b.id,
        b.customer_id,
        b.service_id,
        b.status,
        s.user_id AS providerId
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.id = ? AND b.customer_id = ?
    `).get(bookingId, req.user.id);

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "completed") {
      return res.status(400).json({ error: "Only completed bookings can be reviewed" });
    }

    const existing = db.prepare(`SELECT id FROM reviews WHERE booking_id = ?`).get(bookingId);
    if (existing) return res.status(400).json({ error: "Review already submitted" });

    const info = db.prepare(`
      INSERT INTO reviews (booking_id, provider_id, customer_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(bookingId, booking.providerId, req.user.id, rating, comment || null);

    return res.json({ id: Number(info.lastInsertRowid) });
  } catch (e) {
    console.error("POST /reviews error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/reviews/provider", authRequired, requireRole("provider"), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at AS createdAt,
        r.booking_id AS bookingId,
        b.service_id AS serviceId,
        s.title AS serviceTitle,
        u.name AS customerName
      FROM reviews r
      JOIN bookings b ON b.id = r.booking_id
      JOIN services s ON s.id = b.service_id
      JOIN users u ON u.id = r.customer_id
      WHERE r.provider_id = ?
      ORDER BY r.id DESC
    `).all(req.user.id);

    return res.json(rows);
  } catch (e) {
    console.error("GET /reviews/provider error:", e.message);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/reviews/service/:serviceId", (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);

    const rows = db.prepare(`
      SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name AS customer_name
      FROM reviews r
      JOIN bookings b ON b.id = r.booking_id
      JOIN users u ON u.id = r.customer_id
      WHERE b.service_id = ?
      ORDER BY r.id DESC
    `).all(serviceId);

    return res.json(rows);
  } catch (e) {
    console.error("GET /reviews/service/:serviceId error:", e.message);
    return res.status(500).json({ error: "Failed to load reviews" });
  }
});

app.get("/reviews/service/:serviceId/summary", (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);

    const row = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(AVG(r.rating), 0) AS avg
      FROM reviews r
      JOIN bookings b ON b.id = r.booking_id
      WHERE b.service_id = ?
    `).get(serviceId);

    return res.json({
      total: Number(row?.total || 0),
      avg: Number(Number(row?.avg || 0).toFixed(2)),
    });
  } catch (e) {
    console.error("GET /reviews/service/:serviceId/summary error:", e.message);
    return res.status(500).json({ error: "Failed to load summary" });
  }
});

app.get("/bookings/:id/review", authRequired, (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const review = db.prepare(`SELECT * FROM reviews WHERE booking_id = ?`).get(bookingId);

    if (!review) return res.status(404).json({ error: "No review yet" });
    return res.json(review);
  } catch (e) {
    console.error("GET /bookings/:id/review error:", e.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---------- MESSAGES ----------
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

    return res.json(rows);
  } catch (e) {
    console.error("GET /bookings/:id/messages error:", e.message);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/bookings/:id/messages", authRequired, (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { body } = req.body || {};

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

    const receiverId = isCustomer ? booking.provider_id : booking.customer_id;

    const info = db.prepare(`
      INSERT INTO messages (booking_id, sender_id, receiver_id, body)
      VALUES (?, ?, ?, ?)
    `).run(bookingId, req.user.id, receiverId, body.trim());

    return res.json({ success: true, id: Number(info.lastInsertRowid) });
  } catch (e) {
    console.error("POST /bookings/:id/messages error:", e.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---------- PROVIDERS ----------
app.get("/providers/:id", (req, res) => {
  try {
    const providerId = Number(req.params.id);
    if (!providerId) return res.status(400).json({ error: "Invalid provider id" });

    const provider = db.prepare(`
      SELECT
        id,
        name,
        email,
        role,
        bio,
        profile_image,
        created_at AS createdAt
      FROM users
      WHERE id = ? AND role = 'provider'
    `).get(providerId);

    if (!provider) return res.status(404).json({ error: "Provider not found" });

    const stats = db.prepare(`
      SELECT
        COUNT(*) AS reviewCount,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS avgRating
      FROM reviews r
      WHERE r.provider_id = ?
    `).get(providerId);

    return res.json({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      role: provider.role,
      bio: provider.bio || "",
      profileImage: publicImageUrl(req, provider.profile_image),
      createdAt: provider.createdAt,
      reviewCount: Number(stats?.reviewCount || 0),
      avgRating: Number(stats?.avgRating || 0),
    });
  } catch (e) {
    console.error("GET /providers/:id error:", e.message);
    return res.status(500).json({ error: e.message || "Failed to load provider" });
  }
});

// ---------- NOTIFICATIONS ----------
app.get("/notifications", authRequired, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        id,
        user_id AS userId,
        title,
        COALESCE(message, body, '') AS message,
        type,
        ref_id AS refId,
        is_read AS isRead,
        created_at AS createdAt
      FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.user.id);

    return res.json(rows);
  } catch (e) {
    console.error("GET /notifications error:", e.message);
    return res.status(500).json({ error: e.message || "Failed to load notifications" });
  }
});

app.get("/notifications/unread-count", authRequired, (req, res) => {
  try {
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(req.user.id);

    return res.json({ count: Number(row?.count || 0) });
  } catch (e) {
    console.error("GET /notifications/unread-count error:", e.message);
    return res.status(500).json({ error: e.message || "Failed to load unread count" });
  }
});

app.patch("/notifications/:id/read", authRequired, (req, res) => {
  try {
    const id = Number(req.params.id);

    db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `).run(id, req.user.id);

    return res.json({ success: true });
  } catch (e) {
    console.error("PATCH /notifications/:id/read error:", e.message);
    return res.status(500).json({ error: e.message || "Failed to mark notification as read" });
  }
});

app.patch("/notifications/read-all", authRequired, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ? AND is_read = 0
    `).run(req.user.id);

    return res.json({ success: true });
  } catch (e) {
    console.error("PATCH /notifications/read-all error:", e.message);
    return res.status(500).json({ error: e.message || "Failed to mark all as read" });
  }
});

// ---------- START ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});