 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { normalizeServiceId, fmtBookingDate } from "../utils/booking.js";

const router = express.Router();

function money(amount) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

async function releaseProviderWallet({ bookingId, providerId, amount }) {
  if (!providerId || !amount || amount <= 0) return;

  await prisma.user.update({
    where: { id: providerId },
    data: {
      walletBalance: {
        increment: amount,
      },
    },
  });

  await prisma.walletTransaction.create({
    data: {
      userId: providerId,
      amount,
      type: "credit",
      description: `Payment released for booking #${bookingId}`,
    },
  });
}

router.post("/bookings", authRequired, requireRole("customer"), async (req, res) => {
  try {
    const { serviceId, date, note } = req.body || {};
    const normalizedServiceId = normalizeServiceId(serviceId);

    if (!normalizedServiceId) {
      return res.status(400).json({ error: "serviceId is required" });
    }

    const service = await prisma.service.findUnique({
      where: { id: normalizedServiceId },
      select: { id: true, userId: true, title: true },
    });

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: req.user.id,
        providerId: service.userId,
        serviceId: normalizedServiceId,
        date: date ? new Date(date) : null,
        note: note || null,
        status: "pending",
        source: "booking",
        escrowStatus: "unpaid",
      },
    });

    await prisma.notification.create({
      data: {
        userId: service.userId,
        title: "New booking received",
        message: `You received a booking for ${service.title} on ${fmtBookingDate(date)}.`,
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
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            providerTag: true,
            serviceCategory: true,
            city: true,
            profileImage: true,
          },
        },
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
        demandRequest: {
          select: {
            id: true,
            category: true,
            city: true,
            address: true,
            description: true,
            budget: true,
          },
        },
        review: { select: { id: true } },
      },
    });

    const rows = bookings.map((booking) => ({
      id: booking.id,
      providerId: booking.providerId ?? booking.provider?.id ?? booking.service?.userId ?? null,
      providerName: booking.provider?.name || "",
      providerEmail: booking.provider?.email || "",
      providerPhone: booking.provider?.phone || "",
      providerTag: booking.provider?.providerTag || "",
      providerCategory: booking.provider?.serviceCategory || "",
      serviceId: booking.serviceId,
      demandRequestId: booking.demandRequestId,
      date: booking.date,
      note: booking.note,
      status: booking.status,
      amount: booking.amount ?? booking.demandRequest?.budget ?? null,
      source: booking.source,
      paid: booking.paid,
      escrowStatus: booking.escrowStatus || "unpaid",
      platformFee: booking.platformFee,
      providerEarning: booking.providerEarning,
      createdAt: booking.createdAt,
      title: booking.service?.title || booking.demandRequest?.category || "Service Booking",
      category: booking.service?.category || booking.demandRequest?.category || "N/A",
      city: booking.service?.city || booking.demandRequest?.city || booking.provider?.city || "N/A",
      address: booking.demandRequest?.address || "",
      description: booking.demandRequest?.description || booking.note || "",
      priceFrom: booking.service?.priceFrom ?? null,
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
        OR: [{ providerId: req.user.id }, { service: { userId: req.user.id } }],
      },
      orderBy: { id: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            category: true,
            city: true,
            priceFrom: true,
          },
        },
        demandRequest: {
          select: {
            id: true,
            category: true,
            city: true,
            address: true,
            description: true,
            budget: true,
          },
        },
      },
    });

    const rows = bookings.map((booking) => ({
      id: booking.id,
      providerId: booking.providerId,
      serviceId: booking.serviceId,
      demandRequestId: booking.demandRequestId,
      customerId: booking.customerId,
      customerName: booking.customer?.name || "Customer",
      customerEmail: booking.customer?.email || "",
      customerPhone: booking.customer?.phone || "",
      date: booking.date,
      note: booking.note,
      status: booking.status,
      amount: booking.amount ?? booking.demandRequest?.budget ?? null,
      source: booking.source,
      paid: booking.paid,
      escrowStatus: booking.escrowStatus || "unpaid",
      platformFee: booking.platformFee,
      providerEarning: booking.providerEarning,
      createdAt: booking.createdAt,
      title: booking.service?.title || booking.demandRequest?.category || "Service Booking",
      category: booking.service?.category || booking.demandRequest?.category || "N/A",
      city: booking.service?.city || booking.demandRequest?.city || booking.customer?.city || "N/A",
      address: booking.demandRequest?.address || "",
      description: booking.demandRequest?.description || booking.note || "",
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

    if (!bookingId) return res.status(400).json({ error: "Invalid booking id" });
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

    const current = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ providerId: req.user.id }, { service: { userId: req.user.id } }],
      },
      select: {
        id: true,
        status: true,
        customerId: true,
        paid: true,
        escrowStatus: true,
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

    const updateData = { status };

    if (status === "completed") {
      if (!current.paid || current.escrowStatus !== "held") {
        return res.status(400).json({
          error: "Customer payment must be held before marking job as completed",
        });
      }

      updateData.escrowStatus = "waiting_customer_confirmation";
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    await prisma.notification.create({
      data: {
        userId: current.customerId,
        title: status === "completed" ? "Confirm work completed" : "Booking updated",
        message:
          status === "completed"
            ? "Provider marked the job as completed. Please confirm if the work is done."
            : `Your booking is now ${status}.`,
        type: status === "completed" ? "confirm_work" : "booking_status",
        refId: bookingId,
      },
    });

    return res.json({
      success: true,
      status,
      escrowStatus: updateData.escrowStatus || current.escrowStatus || "unpaid",
    });
  } catch (error) {
    console.error("PATCH /bookings/:id/status error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

router.post(
  "/bookings/:id/confirm-completion",
  authRequired,
  requireRole("customer"),
  async (req, res) => {
    try {
      const bookingId = Number(req.params.id);

      if (!bookingId) {
        return res.status(400).json({ error: "Invalid booking id" });
      }

      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          customerId: req.user.id,
        },
        select: {
          id: true,
          customerId: true,
          providerId: true,
          status: true,
          paid: true,
          escrowStatus: true,
          providerEarning: true,
        },
      });

      if (!booking) return res.status(404).json({ error: "Booking not found" });

      if (booking.status !== "completed") {
        return res.status(400).json({ error: "Booking is not completed yet" });
      }

      if (!booking.paid) {
        return res.status(400).json({ error: "Booking has not been paid" });
      }

      if (booking.escrowStatus !== "waiting_customer_confirmation") {
        return res.status(400).json({
          error: "Booking is not waiting for customer confirmation",
        });
      }

      const earning = Number(booking.providerEarning || 0);

      const updated = await prisma.$transaction(async (tx) => {
        const released = await tx.booking.update({
          where: { id: bookingId },
          data: { escrowStatus: "released" },
        });

        if (booking.providerId && earning > 0) {
          await tx.user.update({
            where: { id: booking.providerId },
            data: {
              walletBalance: {
                increment: earning,
              },
            },
          });

          await tx.walletTransaction.create({
            data: {
              userId: booking.providerId,
              amount: earning,
              type: "credit",
              description: `Payment released for booking #${bookingId}`,
            },
          });

          await tx.notification.create({
            data: {
              userId: booking.providerId,
              title: "Payment released",
              message: `Customer confirmed the job. Your earning of ${money(
                earning
              )} has been added to your wallet.`,
              type: "payment_released",
              refId: bookingId,
            },
          });
        }

        return released;
      });

      return res.json({
        success: true,
        booking: updated,
        message: "Work confirmed and payment released.",
      });
    } catch (error) {
      console.error("POST /bookings/:id/confirm-completion error:", error);
      return res.status(500).json({ error: error.message || "Server error" });
    }
  }
);

router.patch(
  "/bookings/:id/confirm-completed",
  authRequired,
  requireRole("customer"),
  async (req, res) => {
    try {
      const bookingId = Number(req.params.id);

      if (!bookingId) {
        return res.status(400).json({ error: "Invalid booking id" });
      }

      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          customerId: req.user.id,
        },
        select: {
          id: true,
          customerId: true,
          providerId: true,
          status: true,
          paid: true,
          escrowStatus: true,
          providerEarning: true,
          platformFee: true,
        },
      });

      if (!booking) return res.status(404).json({ error: "Booking not found" });

      if (!booking.paid) {
        return res.status(400).json({
          error: "Customer must pay before confirming completion",
        });
      }

      if (booking.escrowStatus !== "held") {
        return res.status(400).json({
          error: "Payment is not currently held in escrow",
        });
      }

      const earning = Number(booking.providerEarning || 0);

      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "completed",
            escrowStatus: "released",
          },
        });

        if (booking.providerId && earning > 0) {
          await tx.user.update({
            where: { id: booking.providerId },
            data: {
              walletBalance: {
                increment: earning,
              },
            },
          });

          await tx.walletTransaction.create({
            data: {
              userId: booking.providerId,
              amount: earning,
              type: "credit",
              description: `Payment released for booking #${bookingId}`,
            },
          });

          await tx.notification.create({
            data: {
              userId: booking.providerId,
              type: "payment_released",
              title: "Payment released",
              message: `Customer confirmed the job. Your earning of ${money(
                earning
              )} has been added to your wallet.`,
              refId: bookingId,
            },
          });
        }

        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: "job_completed",
            title: "Job completed",
            message: "You confirmed this job as completed.",
            refId: bookingId,
          },
        });
      });

      return res.json({
        success: true,
        status: "completed",
        escrowStatus: "released",
        providerEarning: earning,
        message: `Work confirmed and ${money(earning)} released to provider wallet.`,
      });
    } catch (error) {
      console.error("PATCH /bookings/:id/confirm-completed error:", error);
      return res.status(500).json({
        error: error.message || "Server error",
      });
    }
  }
);

export default router;