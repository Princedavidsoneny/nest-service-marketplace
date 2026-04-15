 import prisma from "../config/prisma.js";

export async function createNotification(
  userId,
  title,
  message = "",
  type = "",
  refId = null
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        refId,
      },
    });
  } catch (err) {
    console.error("createNotification error:", err);
  }
}

export async function getNotifications(userId) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUnreadCount(userId) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

export async function markAllAsRead(userId) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}