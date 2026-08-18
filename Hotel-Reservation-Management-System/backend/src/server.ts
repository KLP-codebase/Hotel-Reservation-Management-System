import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import { bookingRoutes } from "./routes/bookings";
import { roomRoutes } from "./routes/rooms";
import { guestRoutes } from "./routes/guests";
import { billingRoutes } from "./routes/billing";
import { authRoutes } from "./routes/auth";
import { reportRoutes } from "./routes/reports";
import { payhereWebhook } from "./webhooks/payhere";
import { otaSyncWebhook } from "./webhooks/ota-sync";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./config/logger";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;
const API_PREFIX = `/api/${process.env.API_VERSION ?? "v1"}`;

// ── Security Middleware ─────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

// ── Rate Limiting ───────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ── Body Parsing ────────────────────────────────────────────────────────────────
// Webhooks need raw body — mount before express.json()
app.use("/webhooks/payhere", express.raw({ type: "application/json" }), payhereWebhook);
app.use("/webhooks/ota", express.json(), otaSyncWebhook);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Health Check ────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: process.env.API_VERSION });
});

// ── API Routes ──────────────────────────────────────────────────────────────────
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/rooms`, roomRoutes);
app.use(`${API_PREFIX}/guests`, guestRoutes);
app.use(`${API_PREFIX}/billing`, billingRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);

// ── Global Error Handler ────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🏨 Hotel RMS API running on port ${PORT}`);
  logger.info(`📡 API available at http://localhost:${PORT}${API_PREFIX}`);
});

export default app;
