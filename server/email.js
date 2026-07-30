import nodemailer from "nodemailer";

// ── Check if email is configured ─────────────────────────────
const EMAIL_CONFIGURED =
  process.env.EMAIL_HOST &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS;

// ── Create transporter (real SMTP or dev console) ─────────────
let transporter = null;
if (EMAIL_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  // Verify connection on startup
  transporter.verify((err) => {
    if (err) {
      console.warn("⚠  Email transporter error:", err.message);
    } else {
      console.log("✅ Email transporter ready");
    }
  });
} else {
  console.log("ℹ  EMAIL not configured — reset links will be logged to console.");
}

// ── Send helper ───────────────────────────────────────────────
export async function sendMail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || "Fresh Market <noreply@freshmarket.com>";
  if (!EMAIL_CONFIGURED || !transporter) {
    // Dev-mode: log to console so developer can test without SMTP
    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║           📧  DEV EMAIL (not sent)                  ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(`║  To     : ${to.padEnd(43)}║`);
    console.log(`║  Subject: ${subject.slice(0, 43).padEnd(43)}║`);
    // Extract reset link from HTML
    const linkMatch = html.match(/href="([^"]+)"/);
    if (linkMatch) {
      console.log("║  Link   :                                            ║");
      console.log(`║  ${linkMatch[1].slice(0, 51).padEnd(51)}║`);
    }
    console.log("╚══════════════════════════════════════════════════════╝\n");
    return { messageId: "dev-console", devMode: true };
  }
  return transporter.sendMail({ from, to, subject, html });
}

// ── Email templates ───────────────────────────────────────────
export function resetPasswordEmail({ name, resetUrl, role = "user" }) {
  const isAdmin = role === "admin";
  const accentColor = isAdmin ? "#0f172a" : "#2A5E3F";
  const roleLabel = isAdmin ? "Admin" : "";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reset your password — Fresh Market</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f6f8">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:${accentColor};padding:32px 36px;text-align:center">
      <p style="color:rgba(255,255,255,.7);font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Fresh Market ${roleLabel}</p>
      <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0">Password Reset Request</h1>
    </div>
    <div style="padding:36px">
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px">Hi ${name || "there"},</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 28px">
        We received a request to reset the password for your Fresh Market ${roleLabel} account.
        Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <div style="text-align:center;margin:0 0 28px">
        <a href="${resetUrl}" 
          style="display:inline-block;background:${accentColor};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:50px">
          Reset My Password
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.7;margin:0 0 8px">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
      <p style="color:#6b7280;font-size:13px;line-height:1.7;margin:0">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color:${accentColor};word-break:break-all">${resetUrl}</a>
      </p>
    </div>
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 36px;text-align:center">
      <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 Fresh Market · This is an automated email, please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
}
