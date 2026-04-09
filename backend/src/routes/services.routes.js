 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET /services
router.get("/services", async (req, res) => {
  try {
    const { category, city, q } = req.query;

    const where = {};

    if (category) {
      where.category = String(category).trim();
    }

    if (city) {
      where.city = String(city).trim();
    }

    if (q) {
      const query = String(q).trim();
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    const providerIds = [...new Set(services.map((s) => s.userId))];

    const reviewStats = providerIds.length
      ? await prisma.review.groupBy({
          by: ["providerId"],
          where: {
            providerId: { in: providerIds },
          },
          _avg: {
            rating: true,
          },
          _count: {
            rating: true,
          },
        })
      : [];

    const statsMap = new Map(
      reviewStats.map((item) => [
        item.providerId,
        {
          avgRating: item._avg.rating ? Number(item._avg.rating.toFixed(1)) : 0,
          reviewCount: item._count.rating || 0,
        },
      ])
    );

    const rows = services.map((service) => {
      const stats = statsMap.get(service.userId) || {
        avgRating: 0,
        reviewCount: 0,
      };

      return {
        id: service.id,
        title: service.title,
        category: service.category,
        description: service.description,
        city: service.city,
        priceFrom: service.priceFrom,
        providerId: service.userId,
        providerName: service.provider?.name || "",
        providerProfileImage: service.provider?.profileImage || "",
        createdAt: service.createdAt,
        avgRating: stats.avgRating,
        reviewCount: stats.reviewCount,
      };
    });

    return res.json(rows);
  } catch (error) {
    console.error("GET /services error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// GET /services/mine
router.get("/services/mine", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { userId: req.user.id },
      orderBy: { id: "desc" },
    });

    const rows = services.map((service) => ({
      id: service.id,
      title: service.title,
      category: service.category,
      description: service.description,
      city: service.city,
      priceFrom: service.priceFrom,
      providerId: service.userId,
      createdAt: service.createdAt,
    }));

    return res.json(rows);
  } catch (error) {
    console.error("GET /services/mine error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// POST /services
router.post("/services", authRequired, requireRole("provider"), async (req, res) => {
  try {
    const { title, category, city, priceFrom, description } = req.body || {};

    if (!title || !category || !description) {
      return res.status(400).json({
        error: "title, category, description required",
      });
    }

    const created = await prisma.service.create({
      data: {
        userId: req.user.id,
        title: String(title).trim(),
        category: String(category).trim(),
        city: city ? String(city).trim() : null,
        priceFrom:
          priceFrom !== undefined && priceFrom !== null && priceFrom !== ""
            ? Number(priceFrom)
            : null,
        description: String(description).trim(),
      },
    });

    return res.json({
      id: created.id,
      title: created.title,
      category: created.category,
      description: created.description,
      city: created.city,
      priceFrom: created.priceFrom,
      providerId: created.userId,
      createdAt: created.createdAt,
    });
  } catch (error) {
    console.error("POST /services error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

export default router;