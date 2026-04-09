import express from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post("/upload/profile-image", authRequired, requireRole("provider"), (req, res) => {
  upload.single("image")(req, res, (err) => {
    try {
      if (err) {
        return res.status(400).json({ error: err.message || "Upload failed" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const storedPath = `/uploads/${req.file.filename}`;

      return res.json({
        success: true,
        imagePath: storedPath,
        imageUrl: `${req.protocol}://${req.get("host")}${storedPath}`,
      });
    } catch {
      return res.status(500).json({ error: "Upload failed" });
    }
  });
});

export default router;