import express from "express";
import prisma from "../config/prisma.js";
import { authRequired, requireRole } from "../middleware/auth.js";
 import { upload } from "../middleware/upload.js";

const router = express.Router();

// GET /services/:id/images
router.get("/services/:id/images", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);

    if (!serviceId) {
      return res.status(400).json({ error: "Invalid service id" });
    }

    const images = await prisma.serviceImage.findMany({
      where: { serviceId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        serviceId: true,
        imageUrl: true,
        sortOrder: true,
        createdAt: true,
      },
    });

    return res.json({ images });
  } catch (error) {
    console.error("GET /services/:id/images error:", error);
    return res.status(500).json({ error: "Failed to load service images" });
  }
});

// POST /services/:id/images
router.post(
  "/services/:id/images",
  authRequired,
  requireRole("provider"),
  upload.single("image"),
  async (req, res) => {
    try {
      const serviceId = Number(req.params.id);

      if (!serviceId) {
        return res.status(400).json({ error: "Invalid service id" });
      }

      const service = await prisma.service.findFirst({
        where: {
          id: serviceId,
          userId: req.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!service) {
        return res.status(404).json({ error: "Service not found or not yours" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      const imagePath = `/uploads/${req.file.filename}`;

      const lastImage = await prisma.serviceImage.findFirst({
        where: { serviceId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const created = await prisma.serviceImage.create({
        data: {
          serviceId,
          imageUrl: imagePath,
          sortOrder: (lastImage?.sortOrder || 0) + 1,
        },
        select: {
          id: true,
          serviceId: true,
          imageUrl: true,
          sortOrder: true,
          createdAt: true,
        },
      });

      return res.json({
        success: true,
        image: created,
      });
    } catch (error) {
      console.error("POST /services/:id/images error:", error);
      return res.status(500).json({ error: "Failed to upload service image" });
    }
  }
);

// DELETE /services/images/:imageId
router.delete(
  "/services/images/:imageId",
  authRequired,
  requireRole("provider"),
  async (req, res) => {
    try {
      const imageId = Number(req.params.imageId);

      if (!imageId) {
        return res.status(400).json({ error: "Invalid image id" });
      }

      const image = await prisma.serviceImage.findUnique({
        where: { id: imageId },
        include: {
          service: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      if (image.service.userId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await prisma.serviceImage.delete({
        where: { id: imageId },
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("DELETE /services/images/:imageId error:", error);
      return res.status(500).json({ error: "Failed to delete service image" });
    }
  }
);

export default router;