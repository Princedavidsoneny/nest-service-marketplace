 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { normalizeProfileImage, publicImageUrl } from "../utils/providerProfile.js";

const router = express.Router();

router.get("/providers/me", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const provider = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        role: "provider",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        providerTag: true,
        serviceCategory: true,
        phone: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        payoutBusinessName: true,
        payoutVerified: true,
        paystackSubaccountCode: true,
        platformSplitPercent: true,
        createdAt: true,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    return res.json({
      ...provider,
      bio: provider.bio || "",
      profileImage: publicImageUrl(req, provider.profileImage),
      payoutCompleted: Boolean(provider.payoutVerified && provider.paystackSubaccountCode),
    });
  } catch (error) {
    console.error("GET /providers/me error:", error);
    return res.status(500).json({ error: error.message || "Failed to load provider profile" });
  }
});

router.patch("/providers/me", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const {
      name,
      bio,
      profileImage,
      serviceCategory,
      phone,
      address,
      city,
      latitude,
      longitude,
    } = req.body || {};

    const safeName = String(name || "").trim();

    if (!safeName) {
      return res.status(400).json({ error: "Name is required" });
    }

    const safeProfileImage = normalizeProfileImage(profileImage);

    if (profileImage && !safeProfileImage) {
      return res.status(400).json({
        error: "Profile image must be a valid http/https URL or uploaded image path",
      });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: safeName,
        bio: bio ? String(bio).trim() : null,
        profileImage: safeProfileImage || null,
        serviceCategory: serviceCategory ? String(serviceCategory).trim().toLowerCase() : null,
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        city: city ? String(city).trim().toLowerCase() : null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
    });

    return res.json({
      success: true,
      provider: updated,
    });
  } catch (error) {
    console.error("PATCH /providers/me error:", error);
    return res.status(500).json({ error: error.message || "Failed to update provider profile" });
  }
});

router.get("/providers/:id", async (req, res) => {
  try {
    const providerId = Number(req.params.id);

    if (!providerId) {
      return res.status(400).json({ error: "Invalid provider id" });
    }

    const provider = await prisma.user.findFirst({
      where: {
        id: providerId,
        role: "provider",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        providerTag: true,
        serviceCategory: true,
        phone: true,
        address: true,
        city: true,
        createdAt: true,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    return res.json({
      ...provider,
      bio: provider.bio || "",
      profileImage: publicImageUrl(req, provider.profileImage),
    });
  } catch (error) {
    console.error("GET /providers/:id error:", error);
    return res.status(500).json({ error: error.message || "Failed to load provider" });
  }
});

export default router;