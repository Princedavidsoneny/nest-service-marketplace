 import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma.js";
import { sendVerificationEmail } from "../utils/email.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const APP_URL = process.env.APP_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

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

function createVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function verificationExpiryDate() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

function safeUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    bio: user.bio || "",
    profileImage: user.profileImage || "",
    isVerified: Boolean(user.isVerified),
  };
}

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    const trimmedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "");

    if (!trimmedName || !normalizedEmail || !safePassword || !role) {
      return res.status(400).json({
        error: "name, email, password, role required",
      });
    }

    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    if (safePassword.length < 6) {
      return res.status(400).json({
        error: "Password should be at least 6 characters.",
      });
    }

    if (!["customer", "provider"].includes(role)) {
      return res.status(400).json({
        error: "role must be customer or provider",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(safePassword, 10);
    const verificationToken = createVerificationToken();
    const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
    const backendVerificationUrl = `${BACKEND_URL}/auth/verify-email?token=${verificationToken}`;

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        passwordHash,
        role,
        isVerified: false,
        verificationToken,
        verificationExpiry: verificationExpiryDate(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        isVerified: true,
      },
    });

    console.log("\n========================================");
    console.log("NEW NEST USER CREATED");
    console.log("Email:", user.email);
    console.log("FRONTEND VERIFY LINK:");
    console.log(verificationUrl);
    console.log("DIRECT BACKEND VERIFY LINK:");
    console.log(backendVerificationUrl);
    console.log("========================================\n");

    try {
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl,
      });
    } catch (emailError) {
      console.error("Verification email failed:", emailError);
    }

    return res.json({
      user: safeUserPayload(user),
      message:
        "Account created. Please check your email to verify your account.",
      devVerificationLink: verificationUrl,
      devBackendVerificationLink: backendVerificationUrl,
    });
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

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in.",
      });
    }

    const safeUser = safeUserPayload(user);
    const token = signToken(safeUser);

    return res.json({ user: safeUser, token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/auth/verify-email", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();

    if (!token) {
      return res.status(400).json({ error: "Verification token is required." });
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid verification link." });
    }

    if (
      user.verificationExpiry &&
      new Date(user.verificationExpiry).getTime() < Date.now()
    ) {
      return res.status(400).json({
        error:
          "Verification link has expired. Please register again or request a new link.",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        isVerified: true,
      },
    });

    return res.json({
      message: "Email verified successfully.",
      user: safeUserPayload(updatedUser),
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/auth/dev/latest-verification-link", async (req, res) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
        isVerified: true,
        verificationToken: true,
        verificationExpiry: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isVerified) {
      return res.json({ message: "User is already verified." });
    }

    if (!user.verificationToken) {
      return res.status(404).json({
        error: "No verification token found for this user.",
      });
    }

    return res.json({
      frontendLink: `${APP_URL}/verify-email?token=${user.verificationToken}`,
      backendLink: `${BACKEND_URL}/auth/verify-email?token=${user.verificationToken}`,
      expiresAt: user.verificationExpiry,
    });
  } catch (error) {
    console.error("Latest verification link error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;