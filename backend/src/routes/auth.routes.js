 import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "proton.me",
  "protonmail.com",
];

function validateEmail(email) {
  const safeEmail = String(email || "").trim().toLowerCase();

  if (!safeEmail) return "Email is required.";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (!emailPattern.test(safeEmail)) {
    return "Please enter a valid email address.";
  }

  const domain = safeEmail.split("@")[1];

  const typoFixes = {
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmail.co": "gmail.com",
    "gmail.con": "gmail.com",
    "yaho.com": "yahoo.com",
    "yahoo.co": "yahoo.com",
    "outlok.com": "outlook.com",
    "hotmial.com": "hotmail.com",
    "iclod.com": "icloud.com",
  };

  if (typoFixes[domain]) {
    return `Email domain looks wrong. Did you mean ${typoFixes[domain]}?`;
  }

  const allowed =
    COMMON_EMAIL_DOMAINS.includes(domain) ||
    domain.endsWith(".com") ||
    domain.endsWith(".co.uk") ||
    domain.endsWith(".org") ||
    domain.endsWith(".net") ||
    domain.endsWith(".edu") ||
    domain.endsWith(".gov");

  if (!allowed) {
    return "Please use a valid, recognised email address.";
  }

  return "";
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    const trimmedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "");

    if (!trimmedName || !normalizedEmail || !safePassword || !role) {
      return res
        .status(400)
        .json({ error: "name, email, password, role required" });
    }

    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    if (safePassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password should be at least 6 characters." });
    }

    if (!["customer", "provider"].includes(role)) {
      return res
        .status(400)
        .json({ error: "role must be customer or provider" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(safePassword, 10);

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
      },
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio || "",
      profileImage: user.profileImage || "",
    };

    const token = signToken(safeUser);

    return res.json({ user: safeUser, token });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "");

    if (!normalizedEmail || !safePassword) {
      return res.status(400).json({ error: "email and password required" });
    }

    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid login" });
    }

    const ok = await bcrypt.compare(safePassword, user.passwordHash);

    if (!ok) {
      return res.status(400).json({ error: "Invalid login" });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio || "",
      profileImage: user.profileImage || "",
    };

    const token = signToken(safeUser);

    return res.json({ user: safeUser, token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;