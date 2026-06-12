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

router.get("/admin/users", authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
      },
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
      return res.status(400).json({ message: "You cannot suspend your own admin account" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
      },
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
      },
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

export default router;