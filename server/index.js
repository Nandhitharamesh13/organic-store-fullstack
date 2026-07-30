import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

// Auto-seed databases on first run
import "./seed.js";

import productsRouter from "./routes/products.js";
import categoriesRouter from "./routes/categories.js";
import ordersRouter from "./routes/orders.js";
import flashRouter from "./routes/flash.js";
import offersRouter from "./routes/offers.js";
import reviewsRouter, { settingsRouter } from "./routes/reviews.js";
import dbViewerRouter, { DB_VIEWER_TOKEN } from "./routes/dbviewer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// ── Security headers (Helmet) ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles in db-admin viewer
}));
app.set("trust proxy", 1); // Trust first proxy for IP detection

// ── CORS — only allow known origins ──────────────────────
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      "http://localhost:5173",
      "http://localhost:4173",
      "http://127.0.0.1:5173",
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    // Allow requests with no origin (same-origin / Postman / curl)
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error("CORS policy blocked this origin"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" })); // allow base64 product images
app.use(express.urlencoded({ extended: true }));

// ── Global rate limiter — all /api/* ─────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api", globalLimiter);

// ── Strict limiter — admin login only ────────────────────
// Authentication routes are intentionally not mounted in this production-ready version.

// ── API Routes ────────────────────────────────────────────
app.use("/api/products",   productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/orders",     ordersRouter);
app.use("/api/flash",      flashRouter);
app.use("/api/offers",     offersRouter);
app.use("/api/reviews",    reviewsRouter);
app.use("/api/settings",   settingsRouter);

// ── DB Viewer (token-protected) ───────────────────────────
app.use("/db-admin", dbViewerRouter);

// ── Health Check ──────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + "s",
    env: process.env.NODE_ENV || "development",
  });
});

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `${req.method} ${req.path} — not found` });
});

// ── Error Handler ─────────────────────────────────────────
app.use((err, req, res, _next) => {
  // Don't leak internal errors to clients
  console.error("❌ Server error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║          🌿  FRESH MARKET API  — RUNNING               ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  API      : http://localhost:${PORT}/api/health              ║`);
  console.log(`║  DB Viewer: http://localhost:${PORT}/db-admin?token=${DB_VIEWER_TOKEN.slice(0,10)}…  ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  DB Viewer full URL (copy this):                         ║");
  console.log(`║  http://localhost:${PORT}/db-admin?token=${DB_VIEWER_TOKEN}  ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");
});
