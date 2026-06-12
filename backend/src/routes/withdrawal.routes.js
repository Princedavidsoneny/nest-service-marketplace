 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authRequired, async (req, res) => {
  try {
    const providerId = req.user.id;
    const { amount, accountName, accountNumber, bankName } = req.body || {};

    const cleanAmount = Number(amount);

    if (!cleanAmount || cleanAmount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    if (!accountName || !accountNumber || !bankName) {
      return res.status(400).json({
        error: "accountName, accountNumber and bankName are required",
      });
    }

    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        role: true,
        walletBalance: true,
      },
    });

    if (!provider || provider.role !== "provider") {
      return res.status(403).json({ error: "Only providers can withdraw" });
    }

    if (cleanAmount > Number(provider.walletBalance || 0)) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        providerId,
        amount: cleanAmount,
        accountName: String(accountName).trim(),
        accountNumber: String(accountNumber).trim(),
        bankName: String(bankName).trim(),
        status: "pending",
      },
    });

    return res.json({
      success: true,
      withdrawal,
    });
  } catch (error) {
    console.error("POST /withdrawals error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create withdrawal request",
    });
  }
});

router.get("/mine", authRequired, async (req, res) => {
  try {
    const providerId = req.user.id;

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(withdrawals);
  } catch (error) {
    console.error("GET /withdrawals/mine error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load withdrawal requests",
    });
  }
});

router.get("/admin", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            providerTag: true,
            walletBalance: true,
          },
        },
      },
    });

    return res.json(withdrawals);
  } catch (error) {
    console.error("GET /withdrawals/admin error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load admin withdrawals",
    });
  }
});

router.patch("/:id/approve", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid withdrawal id" });
    }

    const current = await prisma.withdrawalRequest.findUnique({
      where: { id },
    });

    if (!current) {
      return res.status(404).json({ error: "Withdrawal request not found" });
    }

    if (current.status !== "pending") {
      return res.status(400).json({ error: "Withdrawal already processed" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id },
        data: { status: "approved" },
      });

      await tx.user.update({
        where: { id: current.providerId },
        data: {
          walletBalance: {
            decrement: current.amount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: current.providerId,
          amount: current.amount,
          type: "debit",
          description: `Withdrawal approved to ${current.bankName}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: current.providerId,
          type: "withdrawal_approved",
          title: "Withdrawal approved",
          message: `Your withdrawal of ₦${Number(current.amount).toLocaleString()} has been approved.`,
          refId: id,
        },
      });

      return updatedWithdrawal;
    });

    return res.json({
      success: true,
      withdrawal: result,
    });
  } catch (error) {
    console.error("PATCH /withdrawals/:id/approve error:", error);
    return res.status(500).json({
      error: error.message || "Failed to approve withdrawal",
    });
  }
});

router.patch("/:id/reject", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid withdrawal id" });
    }

    const current = await prisma.withdrawalRequest.findUnique({
      where: { id },
    });

    if (!current) {
      return res.status(404).json({ error: "Withdrawal request not found" });
    }

    if (current.status !== "pending") {
      return res.status(400).json({ error: "Withdrawal already processed" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id },
        data: { status: "rejected" },
      });

      await tx.notification.create({
        data: {
          userId: current.providerId,
          type: "withdrawal_rejected",
          title: "Withdrawal rejected",
          message: `Your withdrawal request of ₦${Number(current.amount).toLocaleString()} was rejected.`,
          refId: id,
        },
      });

      return updatedWithdrawal;
    });

    return res.json({
      success: true,
      withdrawal: result,
    });
  } catch (error) {
    console.error("PATCH /withdrawals/:id/reject error:", error);
    return res.status(500).json({
      error: error.message || "Failed to reject withdrawal",
    });
  }
});

export default router;