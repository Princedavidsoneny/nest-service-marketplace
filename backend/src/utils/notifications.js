 import db from "../config/db.js";

export function createNotification(
  userId,
  title,
  body = "",
  type = "general",
  refId = null
) {
  if (!userId) return;

  const safeBody = String(body || "").trim() || "You have a new notification.";

  db.prepare(`
    INSERT INTO notifications (user_id, title, body, message, type, ref_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, title, safeBody, safeBody, type, refId);
}