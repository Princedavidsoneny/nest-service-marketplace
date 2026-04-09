 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.get("/notifications", authRequired, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        id: "desc",
      },
    });

    const rows = notifications.map((notification) => ({
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message || notification.body || "",
      type: notification.type,
      refId: notification.refId,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    }));

    return res.json(rows);
  } catch (error) {
    console.error("GET /notifications error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load notifications",
    });
  }
});

router.get("/notifications/unread-count", authRequired, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    return res.json({ count });
  } catch (error) {
    console.error("GET /notifications/unread-count error:", error);
    return res.status(500).json({
      error: error.message || "Failed to load unread count",
    });
  }
});

router.patch("/notifications/:id/read", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const updated = await prisma.notification.updateMany({
      where: {
        id,
        userId: req.user.id,
      },
      data: {
        isRead: true,
      },
    });

    if (!updated.count) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("PATCH /notifications/:id/read error:", error);
    return res.status(500).json({
      error: error.message || "Failed to mark notification as read",
    });
  }
});

router.patch("/notifications/read-all", authRequired, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("PATCH /notifications/read-all error:", error);
    return res.status(500).json({
      error: error.message || "Failed to mark all as read",
    });
  }
});

export default router;