 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.get("/bookings/:id/messages", authRequired, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);

    if (!bookingId) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isCustomer = booking.customerId === req.user.id;
    const isProvider = booking.service?.userId === req.user.id;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const messages = await prisma.message.findMany({
      where: {
        bookingId,
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        bookingId: true,
        senderId: true,
        receiverId: true,
        body: true,
        createdAt: true,
      },
    });

    const rows = messages.map((message) => ({
      id: message.id,
      booking_id: message.bookingId,
      sender_id: message.senderId,
      receiver_id: message.receiverId,
      body: message.body,
      created_at: message.createdAt,
    }));

    return res.json(rows);
  } catch (error) {
    console.error("GET /bookings/:id/messages error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/bookings/:id/messages", authRequired, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { body } = req.body || {};

    if (!bookingId) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: "Message body required" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isCustomer = booking.customerId === req.user.id;
    const isProvider = booking.service?.userId === req.user.id;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const receiverId = isCustomer ? booking.service.userId : booking.customerId;

    const created = await prisma.message.create({
      data: {
        bookingId,
        senderId: req.user.id,
        receiverId,
        body: String(body).trim(),
      },
      select: {
        id: true,
      },
    });

    return res.json({ success: true, id: created.id });
  } catch (error) {
    console.error("POST /bookings/:id/messages error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;