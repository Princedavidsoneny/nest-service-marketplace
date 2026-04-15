 import "dotenv/config";
import express from "express";
import cors from "cors";

import notificationsRoutes from "./routes/notifications.routes.js";
import providersRoutes from "./routes/providers.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import servicesRoutes from "./routes/services.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import quotesRoutes from "./routes/quotes.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import payoutsRoutes from "./routes/payouts.routes.js";
import serviceImagesRoutes from "./routes/serviceImages.routes.js";

import { uploadsDir } from "./middleware/upload.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.use("/", notificationsRoutes);
app.use("/", providersRoutes);
app.use("/", reviewsRoutes);
app.use("/", uploadsRoutes);
app.use("/", paymentsRoutes);
app.use("/", servicesRoutes);
app.use("/", authRoutes);
app.use("/", bookingsRoutes);
app.use("/", quotesRoutes);
app.use("/", messagesRoutes);
app.use("/", payoutsRoutes);
app.use("/", serviceImagesRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

export default app;