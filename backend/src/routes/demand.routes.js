 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = express.Router();

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

router.post("/demands", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const { category, description, city, address, latitude, longitude, urgency, budget } =
      req.body || {};

    const safeCategory = normalizeText(category);
    const safeDescription = String(description || "").trim();
    const safeCity = normalizeText(city);
    const safeAddress = String(address || "").trim();
    const safeUrgency = normalizeText(urgency || "normal");

    if (!safeCategory) return res.status(400).json({ error: "Service category is required." });
    if (!safeDescription) return res.status(400).json({ error: "Description is required." });
    if (!safeCity) return res.status(400).json({ error: "City is required for matching providers." });

    const demand = await prisma.demandRequest.create({
      data: {
        customerId: req.user.id,
        category: safeCategory,
        description: safeDescription,
        city: safeCity,
        address: safeAddress || null,
        latitude: parseOptionalNumber(latitude),
        longitude: parseOptionalNumber(longitude),
        urgency: safeUrgency || "normal",
        budget: parseOptionalNumber(budget),
        status: "open",
      },
    });

    const matchingProviders = await prisma.user.findMany({
      where: {
        role: "provider",
        serviceCategory: safeCategory,
        city: safeCity,
      },
      select: {
        id: true,
        name: true,
        providerTag: true,
        serviceCategory: true,
        city: true,
      },
    });

    if (matchingProviders.length > 0) {
      await prisma.notification.createMany({
        data: matchingProviders.map((provider) => ({
          userId: provider.id,
          type: "demand_request",
          title: `New ${safeCategory} job request`,
          message: `A customer needs ${safeCategory} service in ${safeCity}.`,
          refId: demand.id,
        })),
        skipDuplicates: true,
      });
    }

    return res.status(201).json({
      demand,
      notifiedProviders: matchingProviders.length,
      message: "Demand request created successfully.",
    });
  } catch (error) {
    console.error("Create demand error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/demands/mine", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const demands = await prisma.demandRequest.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        winningProvider: {
          select: {
            id: true,
            name: true,
            providerTag: true,
            serviceCategory: true,
            phone: true,
            city: true,
          },
        },
        offers: {
          orderBy: { createdAt: "desc" },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                providerTag: true,
                serviceCategory: true,
                phone: true,
                city: true,
              },
            },
          },
        },
      },
    });

    return res.json({ demands });
  } catch (error) {
    console.error("My demands error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/demands/provider", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const provider = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        serviceCategory: true,
        city: true,
      },
    });

    const category = normalizeText(provider?.serviceCategory);
    const city = normalizeText(provider?.city);

    if (!category || !city) {
      return res.json({
        demands: [],
        message: "Please update your service category and city in provider settings.",
      });
    }

    const demands = await prisma.demandRequest.findMany({
      where: {
        status: "open",
        category,
        city,
      },
      orderBy: { createdAt: "desc" },
      include: {
        offers: {
          where: { providerId: req.user.id },
        },
      },
    });

    return res.json({ demands });
  } catch (error) {
    console.error("Provider demands error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/demands/:id/offers", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const demandId = Number(req.params.id);
    const { amount, message } = req.body || {};

    if (!Number.isInteger(demandId)) {
      return res.status(400).json({ error: "Invalid demand request id." });
    }

    const demand = await prisma.demandRequest.findUnique({
      where: { id: demandId },
    });

    if (!demand) return res.status(404).json({ error: "Demand request not found." });
    if (demand.status !== "open") {
      return res.status(400).json({ error: "This demand is no longer open." });
    }

    const provider = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        name: true,
        serviceCategory: true,
        city: true,
      },
    });

    if (normalizeText(provider?.serviceCategory) !== normalizeText(demand.category)) {
      return res.status(403).json({
        error: "You can only send offers for jobs matching your service category.",
      });
    }

    if (normalizeText(provider?.city) !== normalizeText(demand.city)) {
      return res.status(403).json({
        error: "You can only send offers for jobs in your registered city.",
      });
    }

    const parsedAmount = parseOptionalNumber(amount);
    const safeMessage = String(message || "").trim();

    const offer = await prisma.demandOffer.upsert({
      where: {
        demandRequestId_providerId: {
          demandRequestId: demandId,
          providerId: req.user.id,
        },
      },
      update: {
        amount: parsedAmount,
        message: safeMessage || null,
        status: "pending",
      },
      create: {
        demandRequestId: demandId,
        providerId: req.user.id,
        amount: parsedAmount,
        message: safeMessage || null,
        status: "pending",
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            providerTag: true,
            serviceCategory: true,
            phone: true,
            city: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: demand.customerId,
        type: "demand_offer",
        title: "New offer received",
        message: `${provider?.name || "A provider"} sent an offer for your request.`,
        refId: demand.id,
      },
    });

    return res.status(201).json({
      offer,
      message: "Offer sent successfully.",
    });
  } catch (error) {
    console.error("Create demand offer error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/demands/:id/assign", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const demandId = Number(req.params.id);
    const providerId = Number(req.body?.providerId);

    if (!Number.isInteger(demandId) || !Number.isInteger(providerId)) {
      return res.status(400).json({ error: "Invalid demand or provider id." });
    }

    const demand = await prisma.demandRequest.findFirst({
      where: {
        id: demandId,
        customerId: req.user.id,
      },
    });

    if (!demand) return res.status(404).json({ error: "Demand request not found." });
    if (demand.status !== "open") {
      return res.status(400).json({ error: "Demand request is no longer open." });
    }

    const offer = await prisma.demandOffer.findUnique({
      where: {
        demandRequestId_providerId: {
          demandRequestId: demandId,
          providerId,
        },
      },
    });

    if (!offer) {
      return res.status(404).json({
        error: "This provider has not sent an offer for this demand.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedDemand = await tx.demandRequest.update({
        where: { id: demandId },
        data: {
          status: "assigned",
          winningProviderId: providerId,
          offers: {
            updateMany: [
              {
                where: { providerId },
                data: { status: "accepted" },
              },
              {
                where: { providerId: { not: providerId } },
                data: { status: "rejected" },
              },
            ],
          },
        },
        include: {
          winningProvider: {
            select: {
              id: true,
              name: true,
              providerTag: true,
              serviceCategory: true,
              phone: true,
              city: true,
            },
          },
          offers: true,
        },
      });

      let booking = await tx.booking.findUnique({
        where: { demandRequestId: demandId },
        select: { id: true },
      });

      if (!booking) {
        booking = await tx.booking.create({
          data: {
            customerId: demand.customerId,
            providerId,
            demandRequestId: demandId,
            serviceId: null,
            quoteId: null,
            amount: offer.amount ? Math.round(Number(offer.amount)) : null,
            source: "demand",
            status: "pending",
            paid: false,
            note: demand.description || null,
          },
          select: { id: true },
        });
      }

      await tx.notification.create({
        data: {
          userId: providerId,
          type: "demand_won",
          title: "You won a job",
          message: "A customer selected you for a service request.",
          refId: booking.id,
        },
      });

      await tx.notification.create({
        data: {
          userId: demand.customerId,
          type: "booking_created",
          title: "Booking created",
          message: "A booking has been created from your service request.",
          refId: booking.id,
        },
      });

      const rejectedOffers = await tx.demandOffer.findMany({
        where: {
          demandRequestId: demandId,
          providerId: { not: providerId },
        },
        select: { providerId: true },
      });

      if (rejectedOffers.length > 0) {
        await tx.notification.createMany({
          data: rejectedOffers.map((rejectedOffer) => ({
            userId: rejectedOffer.providerId,
            type: "demand_offer_rejected",
            title: "Offer not selected",
            message: "The customer selected another provider for this request.",
            refId: demandId,
          })),
        });
      }

      return {
        demand: updatedDemand,
        bookingId: booking.id,
      };
    });

    return res.json({
      demand: result.demand,
      bookingId: result.bookingId,
      message: "Provider assigned and booking created successfully.",
    });
  } catch (error) {
    console.error("Assign demand error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;