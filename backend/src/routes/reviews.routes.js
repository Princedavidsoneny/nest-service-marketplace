 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.post("/reviews", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body || {};

    if (!bookingId || !rating) {
      return res.status(400).json({ error: "bookingId and rating required" });
    }

    const numericRating = Number(rating);

    if (numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: "rating must be 1-5" });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: Number(bookingId),
        customerId: req.user.id,
      },
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

    if (booking.status !== "completed") {
      return res.status(400).json({ error: "Only completed bookings can be reviewed" });
    }

    const existing = await prisma.review.findUnique({
      where: { bookingId: Number(bookingId) },
      select: { id: true },
    });

    if (existing) {
      return res.status(400).json({ error: "Review already submitted" });
    }

    const created = await prisma.review.create({
      data: {
        bookingId: Number(bookingId),
        providerId: booking.service.userId,
        customerId: req.user.id,
        rating: numericRating,
        comment: comment || null,
      },
      select: {
        id: true,
      },
    });

    return res.json({ id: created.id });
  } catch (error) {
    console.error("POST /reviews error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.get("/reviews/provider", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { providerId: req.user.id },
      orderBy: { id: "desc" },
      include: {
        booking: {
          select: {
            id: true,
            serviceId: true,
            service: {
              select: {
                title: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    const rows = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      bookingId: review.bookingId,
      serviceId: review.booking?.serviceId ?? null,
      serviceTitle: review.booking?.service?.title || "",
      customerName: review.customer?.name || "",
    }));

    return res.json(rows);
  } catch (error) {
    console.error("GET /reviews/provider error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.get("/reviews/service/:serviceId", async (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);

    const reviews = await prisma.review.findMany({
      where: {
        booking: {
          serviceId,
        },
      },
      orderBy: { id: "desc" },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    const rows = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
      customer_name: review.customer?.name || "",
    }));

    return res.json(rows);
  } catch (error) {
    console.error("GET /reviews/service/:serviceId error:", error);
    return res.status(500).json({ error: "Failed to load reviews" });
  }
});

router.get("/reviews/service/:serviceId/summary", async (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);

    const aggregate = await prisma.review.aggregate({
      where: {
        booking: {
          serviceId,
        },
      },
      _count: {
        id: true,
      },
      _avg: {
        rating: true,
      },
    });

    return res.json({
      total: Number(aggregate?._count?.id || 0),
      avg: Number(Number(aggregate?._avg?.rating || 0).toFixed(2)),
    });
  } catch (error) {
    console.error("GET /reviews/service/:serviceId/summary error:", error);
    return res.status(500).json({ error: "Failed to load summary" });
  }
});

router.get("/bookings/:id/review", authRequired, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);

    const review = await prisma.review.findUnique({
      where: { bookingId },
    });

    if (!review) {
      return res.status(404).json({ error: "No review yet" });
    }

    return res.json(review);
  } catch (error) {
    console.error("GET /bookings/:id/review error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;