 import express from "express";
import axios from "axios";
import prisma from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";
import { requireEnv } from "../utils/env.js";

const router = express.Router();

function calculateFees(amount, percent = 10) {
  const safeAmount = Number(amount || 0);
  const safePercent = Number(percent || 10);

  const platformFee = Math.round((safeAmount * safePercent) / 100);
  const providerShare = safeAmount - platformFee;

  return { platformFee, providerShare };
}

router.post("/payments/init", authRequired, async (req, res) => {
  try {
    const bookingId = Number(req.body?.bookingId || req.body?.booking_id);

    if (!bookingId) {
      return res.status(400).json({ error: "bookingId required" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            paystackSubaccountCode: true,
            platformSplitPercent: true,
          },
        },
        service: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                email: true,
                paystackSubaccountCode: true,
                platformSplitPercent: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.customerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (booking.paid === true) {
      return res.json({
        alreadyPaid: true,
        escrowStatus: booking.escrowStatus || "held",
      });
    }

    const provider = booking.provider || booking.service?.provider;

    if (!provider) {
      return res.status(400).json({
        error: "Provider not found for this booking",
      });
    }

    const amountNaira = Number(booking.amount || booking.service?.priceFrom || 0);

    if (!amountNaira || amountNaira <= 0) {
      return res.status(400).json({ error: "Booking has no price" });
    }

    if (!req.user.email || !String(req.user.email).includes("@")) {
      return res.status(400).json({ error: "Customer email is invalid" });
    }

    const secret = requireEnv("PAYSTACK_SECRET_KEY");
    const appUrl = requireEnv("APP_URL");

    const reference = `NEST_${bookingId}_${Date.now()}`;

    const platformPercent = Number(
      provider.platformSplitPercent || process.env.PAYSTACK_PLATFORM_PERCENT || 10
    );

    const { platformFee, providerShare } = calculateFees(
      amountNaira,
      platformPercent
    );

    await prisma.payment.upsert({
      where: { bookingId },
      update: {
        customerId: req.user.id,
        providerId: provider.id,
        amount: amountNaira,
        reference,
        status: "initialized",
        platformFee,
        providerShare,
        subaccountCode: provider.paystackSubaccountCode || null,
      },
      create: {
        bookingId,
        customerId: req.user.id,
        providerId: provider.id,
        amount: amountNaira,
        reference,
        status: "initialized",
        platformFee,
        providerShare,
        subaccountCode: provider.paystackSubaccountCode || null,
      },
    });

    const callbackUrl = `${appUrl}/pay/verify?reference=${reference}`;

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
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({
      reference,
      access_code: response.data?.data?.access_code,
      authorization_url: response.data?.data?.authorization_url,
      platformFee,
      providerShare,
      escrowStatus: "unpaid",
    });
  } catch (error) {
    console.error("POST /payments/init error:", error.response?.data || error.message);

    return res.status(500).json({
      error: error.response?.data?.message || error.message || "Paystack init failed",
    });
  }
});

router.get("/payments/verify/:reference", authRequired, async (req, res) => {
  try {
    const reference = req.params.reference;

    if (!reference) {
      return res.status(400).json({ error: "Payment reference required" });
    }

    const payment = await prisma.payment.findUnique({
      where: { reference },
      select: {
        id: true,
        bookingId: true,
        customerId: true,
        providerId: true,
        reference: true,
        platformFee: true,
        providerShare: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.customerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const secret = requireEnv("PAYSTACK_SECRET_KEY");

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      }
    );

    const status = response.data?.data?.status;

    if (status === "success") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { reference },
          data: { status: "success" },
        }),

        prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paid: true,
            escrowStatus: "held",
            platformFee: payment.platformFee,
            providerEarning: payment.providerShare,
          },
        }),

        prisma.notification.create({
          data: {
            userId: payment.providerId,
            type: "payment_held",
            title: "Payment secured",
            message: "Customer payment has been received and is being held by Nest.",
            refId: payment.bookingId,
          },
        }),
      ]);
    } else {
      await prisma.payment.update({
        where: { reference },
        data: { status: "failed" },
      });
    }

    return res.json({
      ok: true,
      status,
      reference,
      escrowStatus: status === "success" ? "held" : "unpaid",
    });
  } catch (error) {
    console.error(
      "GET /payments/verify/:reference error:",
      error.response?.data || error.message
    );

    return res.status(500).json({ error: "Verify failed" });
  }
});

export default router;