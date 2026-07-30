import { Router } from "express";
import db from "../db.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/categories — public
router.get("/", (req, res) => {
  const categories = db.prepare("SELECT * FROM categories ORDER BY sort_order ASC, name ASC").all();
  res.json(categories.map(c => ({ ...c, orderable: !!c.orderable })));
});

// POST /api/categories — admin
router.post("/", authenticateAdmin, (req, res) => {
  const { name, description, orderable, sort_order } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Category name is required" });

  try {
    const result = db.prepare(
      "INSERT INTO categories (name, description, orderable, sort_order) VALUES (?,?,?,?)"
    ).run(name.trim(), description || "", orderable ? 1 : 0, Number(sort_order) || 0);

    const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ ...cat, orderable: !!cat.orderable });
  } catch (e) {
    if (e.message?.includes("UNIQUE")) return res.status(409).json({ error: "Category name already exists" });
    throw e;
  }
});

// PUT /api/categories/:id — admin
router.put("/:id", authenticateAdmin, (req, res) => {
  const { name, description, orderable, sort_order } = req.body;
  const existing = db.prepare("SELECT id FROM categories WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Category not found" });

  db.prepare(
    "UPDATE categories SET name=?, description=?, orderable=?, sort_order=? WHERE id=?"
  ).run(name, description || "", orderable ? 1 : 0, Number(sort_order) || 0, req.params.id);

  // Update orderable flag on all products in this category if category orderable changed
  const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  db.prepare("UPDATE products SET orderable = ? WHERE category = ?").run(cat.orderable, cat.name);

  res.json({ ...cat, orderable: !!cat.orderable });
});

// DELETE /api/categories/:id — admin (cascades to products)
router.delete("/:id", authenticateAdmin, (req, res) => {
  const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!cat) return res.status(404).json({ error: "Category not found" });

  // Delete all products in this category
  db.prepare("DELETE FROM products WHERE category = ?").run(cat.name);
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);

  res.json({ success: true, deletedCategory: cat.name });
});

export default router;
