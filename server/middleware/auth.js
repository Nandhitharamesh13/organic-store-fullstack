import jwt from "jsonwebtoken";

const USER_SECRET  = process.env.JWT_SECRET       || "store_user_secret_CHANGE_IN_PROD";
const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET  || "store_admin_secret_CHANGE_IN_PROD";

// ── Sign tokens ───────────────────────────────────────────
export function signToken(payload) {
  return jwt.sign(payload, USER_SECRET, { expiresIn: "30d" });
}

export function signAdminToken(payload) {
  // Admin tokens expire in 8 hours (not 30 days)
  return jwt.sign(payload, ADMIN_SECRET, { expiresIn: "8h" });
}

// ── Verify user token ─────────────────────────────────────
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorised — no token" });

  try {
    req.user = jwt.verify(header.slice(7), USER_SECRET);
    // Ensure admin tokens cannot be used on user routes
    if (req.user.role === "admin")
      return res.status(403).json({ error: "Admin token not valid for user routes" });
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Verify admin token ────────────────────────────────────
export function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorised — no admin token" });

  try {
    const decoded = jwt.verify(header.slice(7), ADMIN_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ error: "Admin access required" });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
}

// ── Alias for backward compat ─────────────────────────────
export function requireAdmin(req, res, next) {
  return authenticateAdmin(req, res, next);
}
