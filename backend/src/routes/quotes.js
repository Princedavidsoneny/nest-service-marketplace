const express = require("express");
const router = express.Router();
const db = require("../db");

// IMPORTANT: change this import to match YOUR auth middleware file/name
const { authRequired } = require("../middleware/auth");

// CUSTOMER: create quote request
router.post("/", authRequired, (req, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "Forbidden" });

  const { serviceId, providerId, details, proposedPrice } = req.body;
  if (!serviceId || !providerId || !details) {
    return res.status(400).json({ error: "serviceId, providerId, details are required" });
  }

  const stmt = db.prepare(`
    INSERT INTO quotes (serviceId, customerId, providerId, details, proposedPrice, status)
    VALUES (?, ?, ?, ?, ?, 'requested')
  `);

  const info = stmt.run(serviceId, req.user.id, providerId, details, proposedPrice ?? null);

  const created = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(info.lastInsertRowid);
  res.json(created);
});

// CUSTOMER: list my quotes
router.get("/me", authRequired, (req, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "Forbidden" });

  const rows = db.prepare(`
    SELECT q.*, s.title AS serviceTitle
    FROM quotes q
    LEFT JOIN services s ON s.id = q.serviceId
    WHERE q.customerId = ?
    ORDER BY q.createdAt DESC
  `).all(req.user.id);

  res.json(rows);
});

// PROVIDER: list quotes sent to me
 // CUSTOMER: list my quotes with offers
router.get("/my", authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT q.*
    FROM quotes q
    WHERE q.customerId = ?
    ORDER BY q.createdAt DESC
  `).all(req.user.id);

  for (const q of rows) {
    const offers = db.prepare(`
      SELECT *
      FROM offers
      WHERE quoteId = ?
    `).all(q.id);

    q.offers = offers;
  }

  res.json(rows);
});

// PROVIDER: respond (accept/reject)
router.patch("/:id/respond", authRequired, (req, res) => {
  if (req.user.role !== "provider") return res.status(403).json({ error: "Forbidden" });

  const id = Number(req.params.id);
  const { status, providerMessage, proposedPrice } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be accepted or rejected" });
  }

  const quote = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
  if (!quote) return res.status(404).json({ error: "Quote not found" });
  if (quote.providerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  db.prepare(`
    UPDATE quotes
    SET status = ?,
        providerMessage = COALESCE(?, providerMessage),
        proposedPrice = COALESCE(?, proposedPrice)
    WHERE id = ?
  `).run(status, providerMessage ?? null, proposedPrice ?? null, id);

  const updated = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
  res.json(updated);
});

module.exports = router;
