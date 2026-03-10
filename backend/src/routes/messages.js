 import express from "express";
import Database from "better-sqlite3";
import { authRequired } from "../auth.js";

const router = express.Router();
const db = new Database("database.sqlite");

// GET /messages/:bookingId
router.get("/:bookingId", (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);

    const rows = db
      .prepare(
        "SELECT * FROM messages WHERE booking_id = ? ORDER BY id ASC"
      )
      .all(bookingId);

    return res.json(rows);
  } catch (e) {
    console.error("LOAD MESSAGES ERROR:", e);
    return res.status(500).json({ error: "Failed to load messages" });
  }
});

 router.post("/:bookingId", authRequired, (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const senderId = Number(req.user.id);
    const body = String(req.body.body || req.body.text || "").trim();

    if (!bookingId) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    if (!body) {
      return res.status(400).json({ error: "Message body required" });
    }

    const booking = db
      .prepare(`
        SELECT
          b.*,
           s.user_id as service_provider_id
        FROM bookings b
        LEFT JOIN services s ON s.id = b.service_id
        WHERE b.id = ?
      `)
      .get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const customerId = Number(booking.customer_id || 0);
    const providerId = Number(booking.provider_id || booking.service_provider_id || 0);

    if (!customerId || !providerId) {
      return res.status(400).json({
        error: "Booking is missing customer/provider relationship",
      });
    }

    const receiverId = senderId === customerId ? providerId : customerId;

    const info = db
      .prepare(`
        INSERT INTO messages (booking_id, sender_id, receiver_id, body)
        VALUES (?, ?, ?, ?)
      `)
      .run(bookingId, senderId, receiverId, body);

    const newMessage = db
      .prepare("SELECT * FROM messages WHERE id = ?")
      .get(info.lastInsertRowid);

    return res.json(newMessage);
  } catch (e) {
    console.error("SEND MESSAGE ERROR:", e);
    return res.status(500).json({
      error: e.message || "Failed to send message",
    });
  }
});

export default router;