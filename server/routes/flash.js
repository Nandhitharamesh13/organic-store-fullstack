import { Router } from "express";
import db from "../db.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = Router();

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// GET /api/flash — public (active only)
router.get("/", (req, res) => {
  const deals = db.prepare("SELECT * FROM flash_deals WHERE ends_at > ? ORDER BY created_at DESC").all(Date.now());
  res.json(deals);
});

// GET /api/flash/all — admin: all including expired
router.get("/all", authenticateAdmin, (req, res) => {
  const deals = db.prepare("SELECT * FROM flash_deals ORDER BY created_at DESC").all();
  res.json(deals);
});

// POST /api/flash — admin
router.post("/", authenticateAdmin, (req, res) => {
  const { product_id, discount, hours, label } = req.body;
  if (!product_id || !discount) return res.status(400).json({ error: "product_id and discount required" });

  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(Number(product_id));
  if (!product) return res.status(404).json({ error: "Product not found" });

  const id = uid();
  const ends_at = Date.now() + Number(hours || 6) * 3600000;
  db.prepare(
    "INSERT INTO flash_deals (id, product_id, discount, ends_at, label) VALUES (?,?,?,?,?)"
  ).run(id, Number(product_id), Number(discount), ends_at, label || "Flash Deal");

  res.status(201).json(db.prepare("SELECT * FROM flash_deals WHERE id = ?").get(id));
});

// DELETE /api/flash/:id — admin
router.delete("/:id", authenticateAdmin, (req, res) => {
  db.prepare("DELETE FROM flash_deals WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
