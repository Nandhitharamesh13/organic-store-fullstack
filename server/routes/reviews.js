import { Router } from "express";
import { randomUUID } from "crypto";
import db from "../db.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = Router();
const GUEST_USER_ID = "guest-user";

// ── GET /api/reviews — public (latest reviews for homepage) ──
router.get("/", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, p.name as product_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    JOIN products p ON r.product_id = p.id
    ORDER BY r.created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(reviews);
});

// ── GET /api/reviews/all — admin (all reviews) ────────────────
router.get("/all", authenticateAdmin, (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, p.name as product_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    JOIN products p ON r.product_id = p.id
    ORDER BY r.created_at DESC
  `).all();
  res.json(reviews);
});

// ── GET /api/reviews/:productId — public ──────────────────
router.get("/:productId", (req, res) => {
  if (req.params.productId === "all") return; // handled above
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.productId);
  res.json(reviews);
});

// ── POST /api/reviews — guest or optional authenticated reviews ───
router.post("/", (req, res) => {
  const { product_id, rating, comment } = req.body;
  if (!product_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "product_id and rating (1-5) required" });
  }

  const id = randomUUID();

  db.prepare(`
    INSERT INTO reviews (id, product_id, user_id, order_id, rating, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, product_id, GUEST_USER_ID, null, rating, comment || "");

  const review = db.prepare(`
    SELECT r.*, u.name as user_name
    FROM reviews r JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(id);

  res.status(201).json(review);
});

// ── DELETE /api/reviews/:id — admin only ──────────────────
router.delete("/:id", authenticateAdmin, (req, res) => {
  db.prepare("DELETE FROM reviews WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;

// ── Settings routes (mounted separately at /api/settings) ─
export const settingsRouter = Router();

// GET /api/settings/rating-mode — public
settingsRouter.get("/rating-mode", (req, res) => {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get("rating_mode");
  res.json({ mode: row?.value || "curated" });
});

// PUT /api/settings/rating-mode — admin only
settingsRouter.put("/rating-mode", authenticateAdmin, (req, res) => {
  const { mode } = req.body;
  if (!["curated", "real"].includes(mode)) {
    return res.status(400).json({ error: "mode must be 'curated' or 'real'" });
  }
  db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run("rating_mode", mode);
  res.json({ mode });
});
