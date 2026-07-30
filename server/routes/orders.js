import { Router } from "express";
import db from "../db.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = Router();
const GUEST_USER_ID = "guest-user";

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// GET /api/orders — guest-friendly order history
router.get("/", (req, res) => {
  const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY timestamp DESC").all(GUEST_USER_ID);
  res.json(orders.map(normalizeOrder));
});

// GET /api/orders/all — admin: all orders
router.get("/all", authenticateAdmin, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY timestamp DESC").all();
  res.json(orders.map(normalizeOrder));
});

// POST /api/orders — place order
router.post("/", (req, res) => {
  const { items, total, delivery, discount, pay_method, address } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: "No items in order" });

  const id = uid();
  db.prepare(`
    INSERT INTO orders (id, user_id, status, total, delivery, discount, pay_method, address_json, items_json, timestamp)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(id, GUEST_USER_ID, "Requested", Number(total), Number(delivery) || 0,
    Number(discount) || 0, pay_method || "upi",
    JSON.stringify(address || {}), JSON.stringify(items), Date.now());

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  res.status(201).json(normalizeOrder(order));
});

// PUT /api/orders/:id/status — admin: advance order status
router.put("/:id/status", authenticateAdmin, (req, res) => {
  const { status } = req.body;
  const VALID = ["Requested", "Accepted", "Preparing", "Completed"];
  if (!VALID.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const existing = db.prepare("SELECT id FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found" });

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json(normalizeOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id)));
});

// POST /api/orders/report — quality report
router.post("/report", (req, res) => {
  const { order_id, issues, description } = req.body;
  const id = Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  db.prepare(
    "INSERT INTO quality_reports (id, order_id, issues_json, description, timestamp) VALUES (?,?,?,?,?)"
  ).run(id, order_id, JSON.stringify(issues || []), description || "", Date.now());
  res.json({ success: true });
});

function normalizeOrder(o) {
  return {
    ...o,
    address: JSON.parse(o.address_json || "{}"),
    items: JSON.parse(o.items_json || "[]"),
  };
}

export default router;
