// ── Generic storefront API client ─────────────────────────
const BASE = "/api";

// ── Token storage (separate keys for user vs admin) ───────
const KEYS = { user: "store_user_token", admin: "store_admin_token" };

export function saveToken(token, type = "user") { localStorage.setItem(KEYS[type], token); }
export function clearToken(type = "user") { localStorage.removeItem(KEYS[type]); }
export function clearAllTokens() { Object.values(KEYS).forEach(k => localStorage.removeItem(k)); }
export function hasToken(type = "user") { return !!localStorage.getItem(KEYS[type]); }
export function getToken(type = "user") { return localStorage.getItem(KEYS[type]); }

// ── Core request helper ───────────────────────────────────
async function request(method, path, body, tokenType = "user") {
  const headers = { "Content-Type": "application/json" };
  const token = getToken(tokenType);
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ── Helpers ───────────────────────────────────────────────
export const api = {
  get: (path, type) => request("GET", path, undefined, type),
  post: (path, body, type) => request("POST", path, body, type),
  put: (path, body, type) => request("PUT", path, body, type),
  patch: (path, body, type) => request("PATCH", path, body, type),
  delete: (path, type) => request("DELETE", path, undefined, type),
};

// ── Auth (user) ────────────────────────────────────────────
export const authApi = {
  signup: (data) => api.post("/auth/signup", data, "user"),
  login: (data) => api.post("/auth/login", data, "user"),
  me: () => api.get("/auth/me", "user"),
  update: (data) => api.put("/auth/me", data, "user"),
  changePassword: (data) => api.put("/auth/change-password", data, "user"),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }, "user"),
  resetPassword: (token, password) => api.post("/auth/reset-password", { token, password }, "user"),
};

// ── Auth (admin) — uses ADMIN token ───────────────────────
export const adminAuthApi = {
  login: (data) => api.post("/auth/admin/login", data, "admin"),
  me: () => api.get("/auth/admin/me", "admin"),
  forgotPassword: (email) => api.post("/auth/admin/forgot-password", { email }, "admin"),
  resetPassword: (token, password) => api.post("/auth/admin/reset-password", { token, password }, "admin"),
};

// ── Categories ────────────────────────────────────────────
export const categoriesApi = {
  getAll: () => api.get("/categories"),
  create: (data) => api.post("/categories", data, "admin"),
  update: (id, data) => api.put(`/categories/${id}`, data, "admin"),
  delete: (id) => api.delete(`/categories/${id}`, "admin"),
};

// ── Products ──────────────────────────────────────────────
export const productsApi = {
  getAll: () => api.get("/products", "user"),
  create: (data) => api.post("/products", data, "admin"),
  update: (id, data) => api.put(`/products/${id}`, data, "admin"),
  delete: (id) => api.delete(`/products/${id}`, "admin"),
  toggleClearance: (id) => api.patch(`/products/${id}/toggle-clearance`, {}, "admin"),
  toggleOrderable: (id) => api.patch(`/products/${id}/toggle-orderable`, {}, "admin"),
};

// ── Orders ────────────────────────────────────────────────
export const ordersApi = {
  getMyOrders: () => api.get("/orders", "user"),
  getAllOrders: () => api.get("/orders/all", "admin"),
  place: (data) => api.post("/orders", data, "user"),
  advanceStatus: (id, status) => api.put(`/orders/${id}/status`, { status }, "admin"),
  report: (data) => api.post("/orders/report", data, "user"),
};

// ── Flash Deals ───────────────────────────────────────────
export const flashApi = {
  getActive: () => api.get("/flash", "user"),
  getAll: () => api.get("/flash/all", "admin"),
  create: (data) => api.post("/flash", data, "admin"),
  delete: (id) => api.delete(`/flash/${id}`, "admin"),
};

// ── Offers ────────────────────────────────────────────────
export const offersApi = {
  getAll: () => api.get("/offers", "user"),
  create: (data) => api.post("/offers", data, "admin"),
  update: (id, data) => api.put(`/offers/${id}`, data, "admin"),
  delete: (id) => api.delete(`/offers/${id}`, "admin"),
};

// ── Reviews ───────────────────────────────────────────────
export const reviewsApi = {
  getAll: (limit) => api.get(`/reviews${limit ? `?limit=${limit}` : ""}`),
  getAllAdmin: () => api.get("/reviews/all", "admin"),
  getForProduct: (productId) => api.get(`/reviews/${productId}`),
  submit: (data) => api.post("/reviews", data, "user"),
  delete: (id) => api.delete(`/reviews/${id}`, "admin"),
};

// ── Settings ──────────────────────────────────────────────
export const settingsApi = {
  getRatingMode: () => api.get("/settings/rating-mode"),
  setRatingMode: (mode) => api.put("/settings/rating-mode", { mode }, "admin"),
};
