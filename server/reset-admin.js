// Quick script to reset admin password to a placeholder value
import bcrypt from "bcryptjs";
import adminDb from "./adminDb.js";

const newPassword = "admin_placeholder_password";
const hash = bcrypt.hashSync(newPassword, 14);

// Reset password and clear any lockout
const result = adminDb.prepare(`
  UPDATE admin_users 
  SET password_hash = ?, failed_attempts = 0, locked_until = NULL 
  WHERE email = ?
`).run(hash, "admin@example.com");

console.log("Updated rows:", result.changes);

if (result.changes > 0) {
  const admin = adminDb.prepare("SELECT email, failed_attempts, locked_until FROM admin_users WHERE email = ?").get("admin@example.com");
  console.log("✅ Admin password reset to placeholder password.");
  console.log("   Admin account:", admin);
} else {
  console.log("❌ No admin user found with email admin@example.com");
  const all = adminDb.prepare("SELECT email FROM admin_users").all();
  console.log("   Existing admins:", all);
}
