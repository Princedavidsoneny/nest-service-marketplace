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

function generateProviderTag(role, serviceCategory) {
  if (role !== "provider") return null;

  const prefixMap = {
    plumber: "PLM",
    driver: "DRV",
    electrician: "ELE",
    cleaner: "CLN",
    painter: "PNT",
    carpenter: "CAR",
    generator: "GEN",
    appliance: "APP",
    moving: "MOV",
  };

  const normalizedCategory = String(serviceCategory || "")
    .trim()
    .toLowerCase();

  const prefix = prefixMap[normalizedCategory] || "PRO";
  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${randomNumber}`;
}

async function createUniqueProviderTag(role, serviceCategory) {
  if (role !== "provider") return null;

  let providerTag = generateProviderTag(role, serviceCategory);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const existing = await prisma.user.findUnique({
      where: { providerTag },
      select: { id: true },
    });

    if (!existing) return providerTag;

    providerTag = generateProviderTag(role, serviceCategory);
  }

  return `PRO-${Date.now()}`;
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      providerTag: user.providerTag || null,
      serviceCategory: user.serviceCategory || null,
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
    providerTag: user.providerTag || null,
    serviceCategory: user.serviceCategory || null,
    phone: user.phone || "",
    address: user.address || "",
    city: user.city || "",
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
  };
}

async function sendVerificationSafely({ user, verificationUrl, label }) {
  try {
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl,
    });
  } catch (emailError) {
    console.error(`${label} email failed:`, emailError);
  }
}

router.post("/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      serviceCategory,
      phone,
      address,
      city,
      latitude,
      longitude,
    } = req.body || {};

    const trimmedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "");
    const safeRole = String(role || "").trim().toLowerCase();

    const safeServiceCategory = String(serviceCategory || "")
      .trim()
      .toLowerCase();

    const safePhone = String(phone || "").trim();
    const safeAddress = String(address || "").trim();
    const safeCity = String(city || "").trim();

    const parsedLatitude =
      latitude === undefined || latitude === null || latitude === ""
        ? null
        : Number(latitude);

    const parsedLongitude =
      longitude === undefined || longitude === null || longitude === ""
        ? null
        : Number(longitude);

    if (!trimmedName || !normalizedEmail || !safePassword || !safeRole) {
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

    if (!["customer", "provider"].includes(safeRole)) {
      return res.status(400).json({
        error: "role must be customer or provider",
      });
    }
 

    if (
      parsedLatitude !== null &&
      (Number.isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90)
    ) {
      return res.status(400).json({ error: "Invalid latitude." });
    }

    if (
      parsedLongitude !== null &&
      (Number.isNaN(parsedLongitude) ||
        parsedLongitude < -180 ||
        parsedLongitude > 180)
    ) {
      return res.status(400).json({ error: "Invalid longitude." });
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

    const providerTag = await createUniqueProviderTag(
      safeRole,
      safeServiceCategory
    );

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        passwordHash,
        role: safeRole,
        isVerified: false,
        verificationToken,
        verificationExpiry: verificationExpiryDate(),

        providerTag,
        serviceCategory:
  safeRole === "provider" ? safeServiceCategory || "general" : null,
        phone: safePhone || null,
        address: safeAddress || null,
        city: safeCity || null,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        isVerified: true,
        providerTag: true,
        serviceCategory: true,
        phone: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
      },
    });

    console.log("\n========================================");
    console.log("NEW NEST USER CREATED");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("Provider Tag:", user.providerTag || "N/A");
    console.log("Service Category:", user.serviceCategory || "N/A");
    console.log("FRONTEND VERIFY LINK:");
    console.log(verificationUrl);
    console.log("DIRECT BACKEND VERIFY LINK:");
    console.log(backendVerificationUrl);
    console.log("========================================\n");

    await sendVerificationSafely({
      user,
      verificationUrl,
      label: "Verification",
    });

    return res.json({
      user: safeUserPayload(user),
      message: "Account created. Please check your email to verify your account.",
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
          "Verification link has expired. Please request a new verification email.",
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
        providerTag: true,
        serviceCategory: true,
        phone: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
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

router.post("/auth/resend-verification", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email already verified." });
    }

    const verificationToken = createVerificationToken();
    const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
    const backendVerificationUrl = `${BACKEND_URL}/auth/verify-email?token=${verificationToken}`;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
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
        providerTag: true,
        serviceCategory: true,
        phone: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
      },
    });

    console.log("\n========================================");
    console.log("VERIFICATION EMAIL RESENT");
    console.log("Email:", updatedUser.email);
    console.log("FRONTEND VERIFY LINK:");
    console.log(verificationUrl);
    console.log("DIRECT BACKEND VERIFY LINK:");
    console.log(backendVerificationUrl);
    console.log("========================================\n");

    await sendVerificationSafely({
      user: updatedUser,
      verificationUrl,
      label: "Resend verification",
    });

    return res.json({
      message: "Verification email sent successfully.",
      devVerificationLink: verificationUrl,
      devBackendVerificationLink: backendVerificationUrl,
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({
      error: "Failed to resend verification email.",
    });
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