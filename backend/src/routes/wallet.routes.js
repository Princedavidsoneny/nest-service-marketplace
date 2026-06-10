import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/wallet/me", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const provider = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        walletBalance: true,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({
      balance: provider.walletBalance || 0,
      transactions,
    });
  } catch (error) {
    console.error("GET /wallet/me error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

export default router;