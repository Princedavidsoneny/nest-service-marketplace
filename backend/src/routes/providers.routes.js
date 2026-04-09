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
        createdAt: true,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    return res.json({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      role: provider.role,
      bio: provider.bio || "",
      profileImage: publicImageUrl(req, provider.profileImage),
      createdAt: provider.createdAt,
    });
  } catch (error) {
    console.error("GET /providers/me error:", error);
    return res.status(500).json({ error: error.message || "Failed to load provider profile" });
  }
});

router.patch("/providers/me", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const { name, bio, profileImage } = req.body || {};

    const safeName = String(name || "").trim();
    const safeBio = String(bio || "").trim();
    const safeProfileImage = normalizeProfileImage(profileImage);

    if (!safeName) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (profileImage && !safeProfileImage) {
      return res.status(400).json({
        error: "Profile image must be a valid http/https URL or uploaded image path",
      });
    }

    const updated = await prisma.user.updateMany({
      where: {
        id: req.user.id,
        role: "provider",
      },
      data: {
        name: safeName,
        bio: safeBio || null,
        profileImage: safeProfileImage || null,
      },
    });

    if (!updated.count) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const provider = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        createdAt: true,
      },
    });

    return res.json({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      role: provider.role,
      bio: provider.bio || "",
      profileImage: publicImageUrl(req, provider.profileImage),
      createdAt: provider.createdAt,
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
        createdAt: true,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const stats = await prisma.review.aggregate({
      where: {
        providerId,
      },
      _count: {
        id: true,
      },
      _avg: {
        rating: true,
      },
    });

    return res.json({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      role: provider.role,
      bio: provider.bio || "",
      profileImage: publicImageUrl(req, provider.profileImage),
      createdAt: provider.createdAt,
      reviewCount: Number(stats?._count?.id || 0),
      avgRating: Number(Number(stats?._avg?.rating || 0).toFixed(1)),
    });
  } catch (error) {
    console.error("GET /providers/:id error:", error);
    return res.status(500).json({ error: error.message || "Failed to load provider" });
  }
});

export default router;