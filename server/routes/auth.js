import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import db from "../db.js";
import adminDb from "../adminDb.js";
import { signToken, signAdminToken, authenticate } from "../middleware/auth.js";
import { sendMail, resetPasswordEmail } from "../email.js";

const router = Router();

function uid() { return crypto.randomBytes(8).toString("hex"); }

const MAX_FAILED = 5;
const LOCK_DURATION = 15 * 60 * 1000;   // 15 min lockout
const RESET_EXPIRES = 60 * 60 * 1000;   // 1 hr reset window

// Detect frontend base URL for reset links
function getBaseUrl(req) {
  return process.env.FRONTEND_URL ||
    `${req.protocol}://${req.get("host").replace(/:4000$/, ":5173")}`;
}

/* ══════════════════════════════════════════════════════════
   USER AUTH — main DB
   ══════════════════════════════════════════════════════════ */

// POST /api/auth/signup
router.post("/signup", (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Name, email and password are required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const em = email.toLowerCase().trim();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(em))
    return res.status(409).json({ error: "Email already registered" });

  const hash = bcrypt.hashSync(password, 10);
  const id = uid();
  db.prepare(
    "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?,?,?,?,?,?)"
  ).run(id, name.trim(), em, phone || "", hash, "user");

  const user = db.prepare("SELECT id, name, email, phone, role, address_json FROM users WHERE id = ?").get(id);
  const token = signToken({ id: user.id, role: user.role });
  res.json({ token, user: { ...user, address: JSON.parse(user.address_json || "{}") } });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken({ id: user.id, role: user.role });
  const { password_hash, reset_token, reset_expires, ...safe } = user;
  res.json({ token, user: { ...safe, address: JSON.parse(safe.address_json || "{}") } });
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  const user = db.prepare(
    "SELECT id, name, email, phone, role, address_json FROM users WHERE id = ?"
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ ...user, address: JSON.parse(user.address_json || "{}") });
});

// PUT /api/auth/me
router.put("/me", authenticate, (req, res) => {
  const { name, phone, address } = req.body;
  db.prepare(
    "UPDATE users SET name = ?, phone = ?, address_json = ? WHERE id = ?"
  ).run(name || "", phone || "", JSON.stringify(address || {}), req.user.id);
  const user = db.prepare(
    "SELECT id, name, email, phone, role, address_json FROM users WHERE id = ?"
  ).get(req.user.id);
  res.json({ ...user, address: JSON.parse(user.address_json || "{}") });
});

// ── PUT /api/auth/change-password — logged-in user changes password
router.put("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "Both current and new password are required" });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "New password must be at least 6 characters" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ error: "Current password is incorrect" });

  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.user.id);
  res.json({ success: true });
});

/* ── FORGOT PASSWORD (user) ─────────────────────────────────── */
// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const user = db.prepare("SELECT id, name, email FROM users WHERE email = ?")
    .get(email.toLowerCase().trim());

  // Always return success — don't reveal whether email exists
  if (!user) {
    return res.json({ success: true, message: "If that email exists, a reset link was sent." });
  }

  // Generate secure reset token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + RESET_EXPIRES;

  db.prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?")
    .run(token, expires, user.id);

  const baseUrl = getBaseUrl(req);
  const resetUrl = `${baseUrl}/#reset?token=${token}`;

  try {
    await sendMail({
      to: user.email,
      subject: "Reset your Fresh Market password",
      html: resetPasswordEmail({ name: user.name, resetUrl, role: "user" }),
    });
  } catch (err) {
    console.error("Email send failed:", err.message);
    // Still return success (token is saved — user can get it from console in dev)
  }

  res.json({ success: true, message: "If that email exists, a reset link was sent." });
});

/* ── RESET PASSWORD (user) ──────────────────────────────────── */
// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ error: "Token and new password are required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const user = db.prepare(
    "SELECT * FROM users WHERE reset_token = ? AND reset_expires > ?"
  ).get(token, Date.now());

  if (!user)
    return res.status(400).json({ error: "Reset link is invalid or has expired" });

  const hash = await bcrypt.hash(password, 10);
  db.prepare(
    "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?"
  ).run(hash, user.id);

  res.json({ success: true, message: "Password reset successfully. You can now sign in." });
});

/* ══════════════════════════════════════════════════════════
   ADMIN AUTH — separate adminDb
   ══════════════════════════════════════════════════════════ */

// POST /api/auth/admin/login
router.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.connection?.remoteAddress || "unknown";

  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const admin = adminDb.prepare("SELECT * FROM admin_users WHERE email = ?")
    .get(email.toLowerCase().trim());

  // Timing attack prevention — always run bcrypt
  const dummyHash = "$2a$14$dummyhashusedtopreventtimingattacksXXXXXXXXXXXXXXXXX";

  if (admin) {
    // Check lockout
    if (admin.locked_until && Date.now() < admin.locked_until) {
      const mins = Math.ceil((admin.locked_until - Date.now()) / 60000);
      return res.status(429).json({ error: `Account locked. Try again in ${mins} minute(s).` });
    }

    const valid = bcrypt.compareSync(password, admin.password_hash);

    if (!valid) {
      const newFailed = (admin.failed_attempts || 0) + 1;
      const lockUntil = newFailed >= MAX_FAILED ? Date.now() + LOCK_DURATION : null;
      adminDb.prepare(
        "UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE id = ?"
      ).run(newFailed, lockUntil, admin.id);
      adminDb.prepare(
        "INSERT INTO admin_audit_log (id, admin_id, action, details, ip_address) VALUES (?,?,?,?,?)"
      ).run(uid(), admin.id, "LOGIN_FAILED", `Attempt ${newFailed}/${MAX_FAILED}`, ip);

      if (lockUntil)
        return res.status(429).json({ error: "Too many failed attempts. Account locked for 15 minutes." });
      return res.status(401).json({ error: `Invalid credentials. ${MAX_FAILED - newFailed} attempt(s) remaining.` });
    }

    // Success
    adminDb.prepare(
      "UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login = ?, last_login_ip = ? WHERE id = ?"
    ).run(Date.now(), ip, admin.id);
    adminDb.prepare(
      "INSERT INTO admin_audit_log (id, admin_id, action, details, ip_address) VALUES (?,?,?,?,?)"
    ).run(uid(), admin.id, "LOGIN_SUCCESS", "Successful admin login", ip);

    const token = signAdminToken({ id: admin.id, role: "admin", email: admin.email });
    res.json({
      token,
      admin: { id: admin.id, username: admin.username, email: admin.email, role: "admin", last_login: admin.last_login },
    });

  } else {
    bcrypt.compareSync(password, dummyHash); // constant time
    return res.status(401).json({ error: "Invalid credentials." });
  }
});

// GET /api/auth/admin/me
router.get("/admin/me", (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "No admin token" });
  try {
    const secret = process.env.ADMIN_JWT_SECRET || "store_admin_secret_CHANGE_IN_PROD";
    const decoded = jwt.verify(header.slice(7), secret);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Not admin" });
    const admin = adminDb.prepare(
      "SELECT id, username, email, last_login FROM admin_users WHERE id = ?"
    ).get(decoded.id);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.json({ ...admin, role: "admin" });
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
});

/* ── FORGOT PASSWORD (admin) ─────────────────────────────────── */
// POST /api/auth/admin/forgot-password
router.post("/admin/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const admin = adminDb.prepare("SELECT id, username, email FROM admin_users WHERE email = ?")
    .get(email.toLowerCase().trim());

  // Always return success
  if (!admin)
    return res.json({ success: true, message: "If that admin email exists, a reset link was sent." });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + RESET_EXPIRES;

  adminDb.prepare("UPDATE admin_users SET reset_token = ?, reset_expires = ? WHERE id = ?")
    .run(token, expires, admin.id);

  // Log this action
  adminDb.prepare(
    "INSERT INTO admin_audit_log (id, admin_id, action, details, ip_address) VALUES (?,?,?,?,?)"
  ).run(uid(), admin.id, "PASSWORD_RESET_REQUESTED", "Reset email sent", req.ip || "unknown");

  const baseUrl = getBaseUrl(req);
  const resetUrl = `${baseUrl}/#admin-reset?token=${token}`;

  try {
    await sendMail({
      to: admin.email,
      subject: "Reset your Fresh Market Admin password",
      html: resetPasswordEmail({ name: admin.username, resetUrl, role: "admin" }),
    });
  } catch (err) {
    console.error("Admin email send failed:", err.message);
  }

  res.json({ success: true, message: "If that admin email exists, a reset link was sent." });
});

/* ── RESET PASSWORD (admin) ──────────────────────────────────── */
// POST /api/auth/admin/reset-password
router.post("/admin/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ error: "Token and new password are required" });
  if (password.length < 8)
    return res.status(400).json({ error: "Admin password must be at least 8 characters" });

  const admin = adminDb.prepare(
    "SELECT * FROM admin_users WHERE reset_token = ? AND reset_expires > ?"
  ).get(token, Date.now());

  if (!admin)
    return res.status(400).json({ error: "Reset link is invalid or has expired" });

  const hash = await bcrypt.hash(password, 14); // high cost for admin
  adminDb.prepare(
    "UPDATE admin_users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, failed_attempts = 0, locked_until = NULL WHERE id = ?"
  ).run(hash, admin.id);

  adminDb.prepare(
    "INSERT INTO admin_audit_log (id, admin_id, action, details, ip_address) VALUES (?,?,?,?,?)"
  ).run(uid(), admin.id, "PASSWORD_RESET_SUCCESS", "Password changed via reset link", req.ip || "unknown");

  res.json({ success: true, message: "Admin password reset. You can now sign in." });
});

export default router;
