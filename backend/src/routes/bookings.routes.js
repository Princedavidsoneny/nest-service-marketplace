 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { normalizeServiceId, fmtBookingDate } from "../utils/booking.js";

const router = express.Router();

router.post("/bookings", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const { serviceId, date, note } = req.body || {};
    const normalizedServiceId = normalizeServiceId(serviceId);

    if (!normalizedServiceId) {
      return res.status(400).json({ error: "serviceId is required" });
    }

    const service = await prisma.service.findUnique({
      where: { id: normalizedServiceId },
      select: {
        id: true,
        userId: true,
        title: true,
      },
    });

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: req.user.id,
        serviceId: normalizedServiceId,
        date: date ? new Date(date) : null,
        note: note || null,
        status: "pending",
      },
    });

    await prisma.notification.create({
      data: {
        userId: service.userId,
        title: "New booking received",
        body: `Your booking for ${service.title} on ${fmtBookingDate(date)} has been confirmed.`,
        type: "booking",
        refId: booking.id,
      },
    });

    return res.json({ ok: true, bookingId: booking.id });
  } catch (error) {
    console.error("POST /bookings error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.get("/bookings/me", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { customerId: req.user.id },
      orderBy: { id: "desc" },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            category: true,
            city: true,
            priceFrom: true,
            userId: true,
          },
        },
        review: {
          select: { id: true },
        },
      },
    });

    const rows = bookings.map((booking) => ({
      id: booking.id,
      serviceId: booking.serviceId,
      date: booking.date,
      note: booking.note,
      status: booking.status,
      amount: booking.amount,
      source: booking.source,
      paid: booking.paid,
      createdAt: booking.createdAt,
      title: booking.service?.title || "",
      category: booking.service?.category || "",
      city: booking.service?.city || "",
      priceFrom: booking.service?.priceFrom ?? null,
      providerId: booking.service?.userId ?? null,
      reviewSubmitted: booking.review ? 1 : 0,
    }));

    return res.json(rows);
  } catch (error) {
    console.error("GET /bookings/me error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.get("/bookings/provider", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        service: {
          userId: req.user.id,
        },
      },
      orderBy: { id: "desc" },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            category: true,
            city: true,
            priceFrom: true,
          },
        },
      },
    });

    const rows = bookings.map((booking) => ({
      id: booking.id,
      serviceId: booking.serviceId,
      customerId: booking.customerId,
      date: booking.date,
      note: booking.note,
      status: booking.status,
      amount: booking.amount,
      source: booking.source,
      paid: booking.paid,
      createdAt: booking.createdAt,
      title: booking.service?.title || "",
      category: booking.service?.category || "",
      city: booking.service?.city || "",
      priceFrom: booking.service?.priceFrom ?? null,
    }));

    return res.json(rows);
  } catch (error) {
    console.error("GET /bookings/provider error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.patch("/bookings/:id/status", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { status } = req.body || {};

    const allowed = ["pending", "accepted", "rejected", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const current = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        service: {
          userId: req.user.id,
        },
      },
      select: {
        id: true,
        status: true,
        customerId: true,
      },
    });

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

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    if (current.customerId) {
      await prisma.notification.create({
        data: {
          userId: current.customerId,
          title: "Booking updated",
          body: `Your booking is now ${status}.`,
          type: "booking_status",
          refId: bookingId,
        },
      });
    }

    return res.json({ success: true, status });
  } catch (error) {
    console.error("PATCH /bookings/:id/status error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

export default router;