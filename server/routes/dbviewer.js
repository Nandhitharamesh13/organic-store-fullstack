import { Router } from "express";
import crypto from "crypto";
import db from "../db.js";
import adminDb from "../adminDb.js";

const router = Router();

// ── One-time viewer token generated on server start ───────
export const DB_VIEWER_TOKEN = process.env.DB_VIEWER_TOKEN || crypto.randomBytes(16).toString("hex");

function verifyViewerToken(req, res, next) {
  const token = req.query.token || req.headers["x-db-token"];
  if (token !== DB_VIEWER_TOKEN) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html><head><title>DB Viewer — Unauthorised</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f1117;color:#fff;flex-direction:column;gap:16px}
      h1{color:#ef4444}p{color:#9ca3af;text-align:center}code{background:#1f2937;padding:4px 10px;border-radius:6px;color:#34d399}</style></head>
      <body><h1>🔒 Unauthorised</h1>
      <p>Access to the DB Viewer requires a valid token.<br>Check the server console for the token URL.</p></body></html>
    `);
  }
  next();
}

function getTableData(database, tableName) {
  try {
    const rows = database.prepare(`SELECT * FROM "${tableName}" ORDER BY rowid DESC LIMIT 200`).all();
    const cols = rows.length > 0 ? Object.keys(rows[0]) : database.prepare(`PRAGMA table_info("${tableName}")`).all().map(c => c.name);
    const count = database.prepare(`SELECT COUNT(*) as c FROM "${tableName}"`).get().c;
    return { rows, cols, count };
  } catch (e) {
    return { rows: [], cols: [], count: 0, error: e.message };
  }
}

function getTables(database) {
  return database.prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
}

// GET /db-admin — visual DB viewer
router.get("/", verifyViewerToken, (req, res) => {
  const mainTables = getTables(db);
  const adminTables = getTables(adminDb);

  const activeDb = req.query.db === "admin" ? "admin" : "main";
  const activeTables = activeDb === "admin" ? adminTables : mainTables;
  const activeDatabase = activeDb === "admin" ? adminDb : db;
  const activeTable = req.query.table || (activeTables[0]?.name || "");

  let tableData = { rows: [], cols: [], count: 0 };
  if (activeTable) {
    tableData = getTableData(activeDatabase, activeTable);
  }

  const safeVal = (val) => {
    if (val === null || val === undefined) return '<span style="color:#6b7280;font-style:italic">null</span>';
    const str = String(val);
    if (str.length > 100) return `<span title="${str.replace(/"/g, "&quot;")}">${str.slice(0, 100)}<span style="color:#6b7280">…</span></span>`;
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  const mainStats = mainTables.map(t => {
    const c = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
    return { name: t.name, count: c };
  });
  const adminStats = adminTables.map(t => {
    const c = adminDb.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
    return { name: t.name, count: c };
  });

  const tokenParam = `token=${DB_VIEWER_TOKEN}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fresh Market — DB Viewer</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 14px; }
    body { font-family: 'Inter', sans-serif; background: #0f1117; color: #e5e7eb; min-height: 100vh; display: flex; flex-direction: column; }
    a { color: inherit; text-decoration: none; }

    /* ── Top bar ── */
    .topbar { background: #1a1f2e; border-bottom: 1px solid #2d3348; padding: 0 24px; height: 58px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 16px; }
    .topbar-brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 16px; color: #10b981; }
    .topbar-brand svg { flex-shrink: 0; }
    .topbar-meta { font-size: 12px; color: #6b7280; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .badge-pill { padding: 3px 10px; border-radius: 50px; font-size: 11px; font-weight: 600; letter-spacing: .3px; }
    .badge-green { background: #064e3b; color: #34d399; }
    .badge-blue { background: #1e3a5f; color: #60a5fa; }
    .badge-red { background: #450a0a; color: #f87171; }

    /* ── Layout ── */
    .layout { display: flex; flex: 1; overflow: hidden; }

    /* ── Sidebar ── */
    .sidebar { width: 240px; background: #141722; border-right: 1px solid #2d3348; overflow-y: auto; flex-shrink: 0; }
    .sidebar-section { padding: 14px 16px 8px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #1f2937; }
    .db-tab { display: flex; gap: 0; padding: 0 16px 12px; padding-top: 12px; }
    .db-tab-btn { flex: 1; padding: 6px; text-align: center; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid #2d3348; background: transparent; color: #9ca3af; transition: all .2s; }
    .db-tab-btn:first-child { border-radius: 6px 0 0 6px; }
    .db-tab-btn:last-child { border-radius: 0 6px 6px 0; border-left: none; }
    .db-tab-btn.active { background: #10b981; color: #fff; border-color: #10b981; }
    .table-item { display: flex; align-items: center; justify-content: space-between; padding: 9px 16px; cursor: pointer; font-size: 13px; color: #9ca3af; transition: all .15s; border-left: 3px solid transparent; }
    .table-item:hover { background: #1f2937; color: #e5e7eb; }
    .table-item.active { background: #1e3a5f22; color: #60a5fa; border-color: #3b82f6; }
    .table-count { font-size: 11px; background: #1f2937; color: #6b7280; padding: 1px 7px; border-radius: 50px; font-family: 'JetBrains Mono', monospace; }

    /* ── Main content ── */
    .main { flex: 1; overflow: auto; display: flex; flex-direction: column; }
    .content-header { padding: 18px 24px; border-bottom: 1px solid #2d3348; background: #141722; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; flex-shrink: 0; }
    .content-title { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
    .content-title .table-icon { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #10b981; background: #064e3b22; padding: 4px 10px; border-radius: 6px; border: 1px solid #064e3b; }
    .content-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }

    /* ── Stats grid ── */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; padding: 20px 24px; border-bottom: 1px solid #2d3348; flex-shrink: 0; }
    .stat-card { background: #141722; border: 1px solid #2d3348; border-radius: 10px; padding: 14px 16px; }
    .stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #6b7280; margin-bottom: 6px; }
    .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; color: #10b981; }
    .stat-name { font-size: 12px; color: #4b5563; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }

    /* ── Table ── */
    .table-wrap { flex: 1; overflow: auto; padding: 0 24px 24px; padding-top: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    table thead { position: sticky; top: 0; background: #1a1f2e; z-index: 1; }
    table thead th { padding: 10px 12px; text-align: left; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid #2d3348; white-space: nowrap; }
    table tbody tr { border-bottom: 1px solid #1f2937; transition: background .1s; }
    table tbody tr:hover { background: #1f2937; }
    table tbody td { padding: 9px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #d1d5db; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
    table tbody td:first-child { color: #9ca3af; }
    .empty-state { text-align: center; padding: 80px 20px; color: #4b5563; }
    .empty-state svg { margin: 0 auto 16px; display: block; }

    /* ── Audit security note ── */
    .security-banner { margin: 0 24px 16px; padding: 12px 16px; background: #064e3b22; border: 1px solid #064e3b; border-radius: 8px; font-size: 12px; color: #6ee7b7; display: flex; align-items: center; gap: 10px; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .sidebar { display: none; }
      .topbar-meta { display: none; }
      .stats-grid { grid-template-columns: 1fr 1fr; padding: 14px; }
      .content-header { padding: 14px; }
      .table-wrap { padding: 0 14px 14px; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-brand">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>
      Fresh Market — DB Viewer
    </div>
    <div class="topbar-meta">
      <span>🔒 Secured access</span>
      <span class="badge-pill badge-green">Main DB: ${mainTables.length} tables</span>
      <span class="badge-pill badge-blue">Admin DB: ${adminTables.length} tables</span>
      <span style="font-family:'JetBrains Mono',monospace;color:#374151">localhost:4000</span>
    </div>
  </div>
  <div class="layout">
    <div class="sidebar">
      <div class="db-tab">
        <a href="?${tokenParam}&db=main" class="db-tab-btn ${activeDb === "main" ? "active" : ""}">Main DB</a>
        <a href="?${tokenParam}&db=admin" class="db-tab-btn ${activeDb === "admin" ? "active" : ""}">Admin DB</a>
      </div>
      ${activeTables.map(t => {
        const stat = (activeDb === "admin" ? adminStats : mainStats).find(s => s.name === t.name);
        return `<a href="?${tokenParam}&db=${activeDb}&table=${t.name}" class="table-item ${t.name === activeTable ? "active" : ""}">
          <span>${t.name}</span>
          <span class="table-count">${stat?.count ?? 0}</span>
        </a>`;
      }).join("")}
    </div>
    <div class="main">
      <div class="content-header">
        <div class="content-title">
          <span class="table-icon">${activeDb === "admin" ? "🔐" : "🗄️"} ${activeDb}_db</span>
          ${activeTable ? `<span>${activeTable}</span>` : "<span style='color:#4b5563'>Select a table</span>"}
        </div>
        <div class="content-meta">
          ${activeTable ? `<span class="badge-pill badge-green">${tableData.count} rows</span>` : ""}
          ${activeTable ? `<span class="badge-pill badge-blue">${tableData.cols.length} columns</span>` : ""}
          <span style="font-size:11px;color:#4b5563">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
        </div>
      </div>

      ${!activeTable ? `
      <div class="stats-grid">
        ${(activeDb === "admin" ? adminStats : mainStats).map(s => `
          <div class="stat-card">
            <div class="stat-label">Table</div>
            <div class="stat-val">${s.count}</div>
            <div class="stat-name">${s.name}</div>
          </div>`).join("")}
      </div>
      ` : ""}

      ${activeTable && activeDb === "admin" ? `
      <div class="security-banner">
        🔐 <strong>Admin DB</strong> — This database is physically separate from the main app DB. Passwords are bcrypt-hashed (cost 14) and never stored in plaintext. Audit log records every login attempt.
      </div>` : ""}

      ${activeTable ? `
      <div class="table-wrap">
        ${tableData.rows.length === 0 ? `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5"><path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"/></svg>
            <p>Table is empty</p>
          </div>
        ` : `
          <table>
            <thead><tr>${tableData.cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>
            <tbody>
              ${tableData.rows.map(row =>
                `<tr>${tableData.cols.map(col => {
                  const v = row[col];
                  // Mask password hashes completely
                  if (col === "password_hash") return `<td><span style="color:#374151;font-style:italic">••••••• [hashed]</span></td>`;
                  if (col === "token_hash") return `<td><span style="color:#374151;font-style:italic">••••• [hashed]</span></td>`;
                  return `<td>${safeVal(v)}</td>`;
                }).join("")}</tr>`
              ).join("")}
            </tbody>
          </table>
          ${tableData.count > 200 ? `<p style="text-align:center;padding:16px;color:#4b5563;font-size:12px">Showing latest 200 of ${tableData.count} rows</p>` : ""}
        `}
      </div>` : `
      <div style="padding:40px;text-align:center;color:#4b5563">
        <p>Select a table from the sidebar to view its data</p>
      </div>`}
    </div>
  </div>
</body>
</html>`;

  res.send(html);
});

export default router;
