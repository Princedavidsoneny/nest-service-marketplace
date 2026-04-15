 import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET /services
router.get("/services", async (req, res) => {
  try {
    const category = req.query.category ? String(req.query.category).trim() : "";
    const city = req.query.city ? String(req.query.city).trim() : "";
    const q = req.query.q ? String(req.query.q).trim() : "";

    const where = {};

    if (category) {
      where.category = category;
    }

    if (city) {
      where.city = city;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ];
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            imageUrl: true,
            sortOrder: true,
          },
        },
      },
    });

    const providerIds = [...new Set(services.map((service) => service.userId))];

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
        serviceImages: service.images || [],
        primaryImage: service.images?.[0]?.imageUrl || "",
      };
    });

    return res.json(rows);
  } catch (error) {
    console.error("GET /services error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// GET /services/mine
router.get(
  "/services/mine",
  authRequired,
  requireRole("provider"),
  async (req, res) => {
    try {
      const services = await prisma.service.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              imageUrl: true,
              sortOrder: true,
            },
          },
        },
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
        serviceImages: service.images || [],
        primaryImage: service.images?.[0]?.imageUrl || "",
      }));

      return res.json(rows);
    } catch (error) {
      console.error("GET /services/mine error:", error);
      return res.status(500).json({ error: error.message || "Server error" });
    }
  }
);

// POST /services
router.post(
  "/services",
  authRequired,
  requireRole("provider"),
  async (req, res) => {
    try {
      const rawTitle = req.body?.title ?? "";
      const rawCategory = req.body?.category ?? "";
      const rawCity = req.body?.city ?? "";
      const rawDescription = req.body?.description ?? "";
      const rawPriceFrom = req.body?.priceFrom;

      const title = String(rawTitle).trim();
      const category = String(rawCategory).trim();
      const city = String(rawCity).trim();
      const description = String(rawDescription).trim();

      if (!title || !category || !description) {
        return res.status(400).json({
          error: "title, category, description required",
        });
      }

      let priceFrom = null;

      if (
        rawPriceFrom !== undefined &&
        rawPriceFrom !== null &&
        rawPriceFrom !== ""
      ) {
        const parsedPrice = Number(rawPriceFrom);

        if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({
            error: "priceFrom must be a valid non-negative whole number",
          });
        }

        priceFrom = parsedPrice;
      }

      const created = await prisma.service.create({
        data: {
          userId: req.user.id,
          title,
          category,
          city: city || null,
          priceFrom,
          description,
        },
      });

      return res.status(201).json({
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
  }
);

export default router;