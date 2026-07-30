import { Router } from "express";
import db from "../db.js";
import { authenticate, authenticateAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/products — public
router.get("/", (req, res) => {
  const products = db.prepare("SELECT * FROM products ORDER BY created_at ASC").all();

  // Check rating mode
  const modeRow = db.prepare("SELECT value FROM app_settings WHERE key = 'rating_mode'").get();
  const mode = modeRow?.value || "curated";

  const normalized = products.map(p => {
    const n = normalize(p);
    if (mode === "real") {
      // Compute rating from actual reviews
      const stats = db.prepare(
        "SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg FROM reviews WHERE product_id = ?"
      ).get(p.id);
      n.rating = stats.cnt > 0 ? Math.round(stats.avg * 10) / 10 : 0;
      n.review_count = stats.cnt;
    }
    return n;
  });

  res.json(normalized);
});

// POST /api/products — admin
router.post("/", authenticateAdmin, (req, res) => {
  const { name, category, price, stock, unit, description, image_url, popular, clearance, clearance_price, orderable, rating, review_count,
    images_json, benefits_en, benefits_ta } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: "name and price required" });

  // Serialize images array to JSON string for storage
  const imagesStr = images_json ? (typeof images_json === "string" ? images_json : JSON.stringify(images_json)) : "[]";

  // Determine orderable: use explicit value if provided, otherwise inherit from category
  let orderableVal = 1;
  if (orderable !== undefined) {
    orderableVal = orderable ? 1 : 0;
  } else {
    const cat = db.prepare("SELECT orderable FROM categories WHERE name = ?").get(category || "Sprouts");
    if (cat) orderableVal = cat.orderable;
  }

  const result = db.prepare(`
    INSERT INTO products (name, category, price, stock, unit, description, image_url, popular, clearance, clearance_price, orderable, rating, review_count,
      images_json, benefits_en, benefits_ta)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(name, category || "Sprouts", Number(price), Number(stock) || 0, unit || "250g",
    description || "", image_url || null, popular ? 1 : 0, clearance ? 1 : 0,
    Number(clearance_price) || 0, orderableVal, Number(rating) || 4.5, Number(review_count) || 0,
    imagesStr, benefits_en || "", benefits_ta || "");

  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(normalize(product));
});

// PUT /api/products/:id — admin
router.put("/:id", authenticateAdmin, (req, res) => {
  const { name, category, price, stock, unit, description, image_url, popular, clearance, clearance_price, orderable, rating, review_count,
    images_json, benefits_en, benefits_ta } = req.body;
  const existing = db.prepare("SELECT id FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  // Serialize images array to JSON string for storage
  const imagesStr = images_json ? (typeof images_json === "string" ? images_json : JSON.stringify(images_json)) : "[]";

  const orderableVal = orderable !== undefined ? (orderable ? 1 : 0) : 1;

  db.prepare(`
    UPDATE products SET name=?, category=?, price=?, stock=?, unit=?, description=?,
    image_url=?, popular=?, clearance=?, clearance_price=?, orderable=?, rating=?, review_count=?,
    images_json=?, benefits_en=?, benefits_ta=?
    WHERE id=?
  `).run(name, category, Number(price), Number(stock), unit, description || "",
    image_url || null, popular ? 1 : 0, clearance ? 1 : 0,
    Number(clearance_price) || 0, orderableVal, Number(rating) || 4.5, Number(review_count) || 0,
    imagesStr, benefits_en || "", benefits_ta || "",
    req.params.id);

  res.json(normalize(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id)));
});

// DELETE /api/products/:id — admin
router.delete("/:id", authenticateAdmin, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// PATCH /api/products/:id/toggle-clearance — admin
router.patch("/:id/toggle-clearance", authenticateAdmin, (req, res) => {
  db.prepare("UPDATE products SET clearance = NOT clearance WHERE id = ?").run(req.params.id);
  res.json(normalize(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id)));
});

// PATCH /api/products/:id/toggle-orderable — admin
router.patch("/:id/toggle-orderable", authenticateAdmin, (req, res) => {
  db.prepare("UPDATE products SET orderable = NOT orderable WHERE id = ?").run(req.params.id);
  res.json(normalize(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id)));
});

function normalize(p) {
  // Parse images_json from stored JSON string → array
  let images = [];
  try { images = JSON.parse(p.images_json || "[]"); } catch { images = []; }
  return {
    ...p,
    popular: !!p.popular,
    clearance: !!p.clearance,
    orderable: !!p.orderable,
    images,
    benefits_en: p.benefits_en || "",
    benefits_ta: p.benefits_ta || "",
  };
}

export default router;
