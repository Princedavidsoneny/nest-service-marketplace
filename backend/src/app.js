import "dotenv/config";
import express from "express";
import cors from "cors";

import notificationsRoutes from "./routes/notifications.routes.js";
import providersRoutes from "./routes/providers.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import servicesRoutes from "./routes/services.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import quotesRoutes from "./routes/quotes.routes.js";
import messagesRoutes from "./routes/messages.routes.js";

import { uploadsDir } from "./middleware/upload.js";
import db from "./config/db.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.use("/", notificationsRoutes);
app.use("/", providersRoutes);
app.use("/", reviewsRoutes);
app.use("/", uploadsRoutes);
app.use("/", paymentsRoutes);
app.use("/", servicesRoutes);
app.use("/", authRoutes);
app.use("/", bookingsRoutes);
app.use("/", quotesRoutes);
app.use("/", messagesRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

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

export default app;