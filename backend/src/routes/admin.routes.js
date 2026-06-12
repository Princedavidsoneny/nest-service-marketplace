 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

function requireAdmin(req, res) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Admin only" });
    return false;
  }
  return true;
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isSuspended: true,
  isProviderVerified: true,
  createdAt: true,
};

router.get("/admin/users", authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });

    return res.json({ users });
  } catch (err) {
    console.error("Admin users error:", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.patch("/admin/users/:id/role", authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!["customer", "provider", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: userSelect,
    });

    return res.json({
      message: "User role updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update user role error:", err);
    return res.status(500).json({ message: "Failed to update user role" });
  }
});

router.patch("/admin/users/:id/suspend", authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (req.user.id === userId) {
      return res
        .status(400)
        .json({ message: "You cannot suspend your own admin account" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: true },
      select: userSelect,
    });

    return res.json({
      message: "User suspended successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Suspend user error:", err);
    return res.status(500).json({ message: "Failed to suspend user" });
  }
});

router.patch("/admin/users/:id/unsuspend", authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: false },
      select: userSelect,
    });

    return res.json({
      message: "User unsuspended successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Unsuspend user error:", err);
    return res.status(500).json({ message: "Failed to unsuspend user" });
  }
});

router.patch("/admin/users/:id/verify-provider", authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (existingUser.role !== "provider") {
      return res.status(400).json({ message: "Only providers can be verified" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isProviderVerified: true },
      select: userSelect,
    });

    return res.json({
      message: "Provider verified successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Verify provider error:", err);
    return res.status(500).json({ message: "Failed to verify provider" });
  }
});

router.patch("/admin/users/:id/unverify-provider", authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isProviderVerified: false },
      select: userSelect,
    });

    return res.json({
      message: "Provider verification removed successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Unverify provider error:", err);
    return res.status(500).json({ message: "Failed to remove provider verification" });
  }
});
 router.get("/admin/stats", authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const totalUsers = await prisma.user.count();

    const totalProviders = await prisma.user.count({
      where: { role: "provider" },
    });

    const totalBookings = await prisma.booking.count();

    const totalRevenueResult = await prisma.payment.aggregate({
      where: { status: "success" },
      _sum: { amount: true },
    });

    const totalWithdrawalsResult = await prisma.withdrawalRequest.aggregate({
      _sum: { amount: true },
    });

    return res.json({
      totalUsers,
      totalProviders,
      totalBookings,
      totalRevenue: totalRevenueResult._sum.amount || 0,
      totalWithdrawals: totalWithdrawalsResult._sum.amount || 0,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ message: "Failed to load admin stats" });
  }
});


export default router;