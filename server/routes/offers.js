import { Router } from "express";
import db from "../db.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = Router();

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// GET /api/offers — public
router.get("/", (req, res) => {
  const offers = db.prepare("SELECT * FROM offers ORDER BY created_at DESC").all();
  res.json(offers.map(o => ({ ...o, active: !!o.active })));
});

// POST /api/offers — admin
router.post("/", authenticateAdmin, (req, res) => {
  const { title, description, active } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });
  const id = uid();
  db.prepare("INSERT INTO offers (id, title, description, active) VALUES (?,?,?,?)").run(id, title, description || "", active !== false ? 1 : 0);
  const o = db.prepare("SELECT * FROM offers WHERE id = ?").get(id);
  res.status(201).json({ ...o, active: !!o.active });
});

// PUT /api/offers/:id — admin (toggle active or update)
router.put("/:id", authenticateAdmin, (req, res) => {
  const { title, description, active } = req.body;
  const existing = db.prepare("SELECT * FROM offers WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Offer not found" });

  db.prepare("UPDATE offers SET title=?, description=?, active=? WHERE id=?").run(
    title || existing.title, description ?? existing.description, active ? 1 : 0, req.params.id
  );
  const o = db.prepare("SELECT * FROM offers WHERE id = ?").get(req.params.id);
  res.json({ ...o, active: !!o.active });
});

// DELETE /api/offers/:id — admin
router.delete("/:id", authenticateAdmin, (req, res) => {
  db.prepare("DELETE FROM offers WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
