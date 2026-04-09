 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { normalizeServiceId } from "../utils/booking.js";

const router = express.Router();

router.post("/quotes", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const { service_id, serviceId, details } = req.body || {};
    const normalizedServiceId = normalizeServiceId(service_id || serviceId);

    if (!normalizedServiceId) {
      return res.status(400).json({ error: "service_id required" });
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

    const quote = await prisma.quote.create({
      data: {
        serviceId: normalizedServiceId,
        customerId: req.user.id,
        providerId: service.userId,
        details: details || "",
        status: "pending",
      },
    });

    await prisma.notification.create({
      data: {
        userId: service.userId,
        title: "New quote request",
        body: `A customer requested a quote for ${service.title}.`,
        type: "quote_request",
        refId: quote.id,
      },
    });

    return res.json({ success: true, quoteId: quote.id });
  } catch (error) {
    console.error("POST /quotes error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.get("/quotes/my", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        service: {
          select: {
            title: true,
            city: true,
          },
        },
        offers: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            quoteId: true,
            providerId: true,
            amount: true,
            message: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const rows = quotes.map((quote) => ({
      id: quote.id,
      serviceId: quote.serviceId,
      customerId: quote.customerId,
      providerId: quote.providerId,
      details: quote.details,
      status: quote.status,
      createdAt: quote.createdAt,
      title: quote.service?.title || "",
      city: quote.service?.city || "",
      offers: quote.offers.map((offer) => ({
        id: offer.id,
        quoteId: offer.quoteId,
        providerId: offer.providerId,
        amount: offer.amount,
        message: offer.message,
        status: offer.status,
        createdAt: offer.createdAt,
      })),
    }));

    return res.json(rows);
  } catch (error) {
    console.error("GET /quotes/my error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.get("/provider/quotes", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      where: { providerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        service: {
          select: {
            title: true,
            city: true,
          },
        },
        offers: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            quoteId: true,
            providerId: true,
            amount: true,
            message: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const rows = quotes.map((quote) => ({
      id: quote.id,
      serviceId: quote.serviceId,
      customerId: quote.customerId,
      providerId: quote.providerId,
      details: quote.details,
      status: quote.status,
      createdAt: quote.createdAt,
      title: quote.service?.title || "",
      city: quote.service?.city || "",
      offers: quote.offers.map((offer) => ({
        id: offer.id,
        quoteId: offer.quoteId,
        providerId: offer.providerId,
        amount: offer.amount,
        message: offer.message,
        status: offer.status,
        createdAt: offer.createdAt,
      })),
    }));

    return res.json(rows);
  } catch (error) {
    console.error("GET /provider/quotes error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.post("/quotes/:id/offer", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const quoteId = Number(req.params.id);
    const { amount, message } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Valid amount required" });
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id: quoteId,
        providerId: req.user.id,
      },
      select: {
        id: true,
        customerId: true,
      },
    });

    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    await prisma.quoteOffer.create({
      data: {
        quoteId,
        providerId: req.user.id,
        amount: Number(amount),
        message: message || "",
        status: "offered",
      },
    });

    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: "offered" },
    });

    await prisma.notification.create({
      data: {
        userId: quote.customerId,
        title: "New quote offer",
        body: "A provider sent you an offer.",
        type: "quote_offer",
        refId: quoteId,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("POST /quotes/:id/offer error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.get("/quotes/:id/offers", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const quoteId = Number(req.params.id);

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        customerId: true,
      },
    });

    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    if (quote.customerId !== req.user.id) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const offers = await prisma.quoteOffer.findMany({
      where: { quoteId },
      orderBy: { id: "desc" },
      select: {
        id: true,
        quoteId: true,
        providerId: true,
        amount: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    return res.json({ offers });
  } catch (error) {
    console.error("GET /quotes/:id/offers error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.post("/offers/:id/accept", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const offerId = Number(req.params.id);

    const offer = await prisma.quoteOffer.findUnique({
      where: { id: offerId },
      include: {
        quote: {
          select: {
            id: true,
            customerId: true,
            serviceId: true,
            providerId: true,
          },
        },
      },
    });

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    if (!offer.quote || offer.quote.customerId !== req.user.id) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const existing = await prisma.booking.findFirst({
      where: { quoteId: offer.quoteId },
      select: { id: true },
    });

    if (existing) {
      await prisma.quoteOffer.update({
        where: { id: offerId },
        data: { status: "accepted" },
      });

      await prisma.quoteOffer.updateMany({
        where: {
          quoteId: offer.quoteId,
          id: { not: offerId },
        },
        data: { status: "rejected" },
      });

      await prisma.quote.update({
        where: { id: offer.quoteId },
        data: { status: "accepted" },
      });

      return res.json({
        success: true,
        bookingId: existing.id,
        alreadyCreated: true,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.quoteOffer.update({
        where: { id: offerId },
        data: { status: "accepted" },
      });

      await tx.quoteOffer.updateMany({
        where: {
          quoteId: offer.quoteId,
          id: { not: offerId },
        },
        data: { status: "rejected" },
      });

      await tx.quote.update({
        where: { id: offer.quoteId },
        data: { status: "accepted" },
      });

      const booking = await tx.booking.create({
        data: {
          customerId: offer.quote.customerId,
          serviceId: offer.quote.serviceId,
          date: null,
          note: offer.message || "Booking created from quote offer",
          status: "pending",
          quoteId: offer.quoteId,
          amount: offer.amount,
          source: "quote",
          paid: false,
        },
      });

      await tx.notification.create({
        data: {
          userId: offer.quote.providerId,
          title: "Quote offer accepted",
          body: "A customer accepted your quote offer.",
          type: "quote_accepted",
          refId: booking.id,
        },
      });

      return booking;
    });

    return res.json({ success: true, bookingId: result.id });
  } catch (error) {
    console.error("POST /offers/:id/accept error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

export default router;