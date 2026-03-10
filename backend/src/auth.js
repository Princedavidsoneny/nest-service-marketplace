// backend/src/auth.js
 import jwt from "jsonwebtoken";

/**
 * Reads Bearer token, verifies it, and attaches payload to req.user
 * Payload should contain at least: { id, email, role, fullName? }
 */
function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing or invalid auth token" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Server misconfig: JWT_SECRET is missing" });
    }

    const payload = jwt.verify(token, secret);
    req.user = payload; // { id, email, role, fullName, ... }
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Ensures user has the expected role ("customer" or "provider")
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

/**
 * Allow either role (useful for "my bookings" endpoints)
 * Example: allowRoles("customer","provider")
 */
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

 export { authRequired, requireRole, allowRoles };
