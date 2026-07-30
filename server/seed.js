import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "./db.js";
import adminDb from "./adminDb.js";

function uid() {
  return crypto.randomBytes(8).toString("hex");
}

// ══════════════════════════════════════════════════════════
//  ADMIN DB SEED — runs only if no admin user exists
// ══════════════════════════════════════════════════════════
const adminExists = adminDb.prepare("SELECT id FROM admin_users LIMIT 1").get();
if (!adminExists) {
  const hash = bcrypt.hashSync("admin_placeholder_password", 14); // high cost for admin
  adminDb.prepare(`
    INSERT INTO admin_users (id, username, email, password_hash)
    VALUES (?,?,?,?)
  `).run(uid(), "store_admin", "admin@example.com", hash);

  console.log("✅ Admin DB: admin account seeded. Configure credentials separately.");
} else {
  console.log("✅ Admin DB: admin user already exists");
}

// ══════════════════════════════════════════════════════════
//  CATEGORIES SEED
// ══════════════════════════════════════════════════════════
const catCount = db.prepare("SELECT COUNT(*) as c FROM categories").get().c;
if (catCount === 0) {
  const insertCat = db.prepare(
    "INSERT INTO categories (name, description, orderable, sort_order) VALUES (?,?,?,?)"
  );
  insertCat.run("Soups", "Delicious homemade soups made with fresh organic ingredients. Available for order and delivery.", 1, 1);
  insertCat.run("Sprouts", "Freshly harvested organic sprouts. Browse our selection — display only.", 0, 2);
  console.log("✅ Main DB: 2 categories seeded (Soups=orderable, Sprouts=display)");
} else {
  console.log("✅ Main DB: categories already exist, skipping seed");
}

// ══════════════════════════════════════════════════════════
//  MAIN DB SEED — products, offers, flash deals
// ══════════════════════════════════════════════════════════
const productCount = db.prepare("SELECT COUNT(*) as c FROM products").get().c;

const guestExists = db.prepare("SELECT id FROM users WHERE email = ?").get("guest@example.com");
if (!guestExists) {
  const guestHash = bcrypt.hashSync("guest_placeholder_password", 10);
  db.prepare(
    "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?,?,?,?,?,?)"
  ).run("guest-user", "Guest Customer", "guest@example.com", "", guestHash, "guest");
  console.log("✅ Main DB: guest user seeded for public checkout/reviews");
}

if (productCount === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (name, category, price, stock, unit, description, image_url, popular, clearance, orderable, rating, review_count)
    VALUES (@name, @category, @price, @stock, @unit, @description, @image_url, @popular, @clearance, @orderable, @rating, @review_count)
  `);

  const products = [
    // ── SOUPS (orderable = 1) ──
    { name: "Seasonal Soup",           category: "Soups", price: 120, stock: 40, unit: "350ml", description: "Comforting broth prepared with fresh ingredients and balanced spices.", image_url: null, popular: 1, clearance: 0, orderable: 1, rating: 4.8, review_count: 134 },
    { name: "Creamy Broth",            category: "Soups", price: 150, stock: 30, unit: "350ml", description: "Rich soup made with a smooth, creamy base and gently caramelized vegetables.", image_url: null, popular: 1, clearance: 0, orderable: 1, rating: 4.9, review_count: 98 },
    { name: "Sweet Corn Broth",        category: "Soups", price: 110, stock: 50, unit: "350ml", description: "Warm and hearty broth with a silky-smooth texture and natural sweetness.", image_url: null, popular: 0, clearance: 0, orderable: 1, rating: 4.5, review_count: 76 },
    { name: "Green Lentil Soup",       category: "Soups", price: 130, stock: 25, unit: "350ml", description: "Nutritious lentil soup seasoned with aromatic spices for a wholesome meal.", image_url: null, popular: 1, clearance: 0, orderable: 1, rating: 4.7, review_count: 62 },
    { name: "Spiced Sour Broth",       category: "Soups", price: 125, stock: 35, unit: "350ml", description: "Tangy and spicy broth loaded with vegetables and warming spices.", image_url: null, popular: 0, clearance: 0, orderable: 1, rating: 4.4, review_count: 89 },
    { name: "Pumpkin Ginger Broth",    category: "Soups", price: 140, stock: 20, unit: "350ml", description: "Smooth pumpkin broth with ginger and a subtle hint of coconut.", image_url: null, popular: 0, clearance: 0, orderable: 1, rating: 4.6, review_count: 45 },

    // ── SPROUTS (orderable = 0, display only) ──
    { name: "Sprout Mix",              category: "Sprouts", price: 45,  stock: 50, unit: "250g", description: "Fresh sprout mix harvested every morning. Rich in plant protein and essential vitamins.", image_url: null, popular: 1, clearance: 0, orderable: 0, rating: 4.8, review_count: 124 },
    { name: "Bean Sprouts",             category: "Sprouts", price: 55,  stock: 30, unit: "250g", description: "Tender sprouts with high fiber content and natural antioxidants.", image_url: null, popular: 1, clearance: 0, orderable: 0, rating: 4.6, review_count: 87 },
    { name: "Nutritious Sprouts",       category: "Sprouts", price: 40,  stock: 25, unit: "100g", description: "Earthy sprouts grown fresh and ready for salads or cooking.", image_url: null, popular: 0, clearance: 0, orderable: 0, rating: 4.3, review_count: 56 },
    { name: "Mixed Sprout Pack",        category: "Sprouts", price: 60,  stock: 40, unit: "250g", description: "A healthy blend of fresh sprouts, ideal for salads and snacks.", image_url: null, popular: 0, clearance: 0, orderable: 0, rating: 4.5, review_count: 71 },
    { name: "Traditional Sprouts",      category: "Sprouts", price: 50,  stock: 20, unit: "200g", description: "Classic South Indian sprouts with a mild earthy flavor.", image_url: null, popular: 0, clearance: 0, orderable: 0, rating: 4.4, review_count: 38 },
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) insertProduct.run(item);
  });
  insertMany(products);
  console.log(`✅ Main DB: ${products.length} products seeded (6 soups + 5 sprouts)`);

  const insertOffer = db.prepare("INSERT INTO offers (id, title, description, active) VALUES (?,?,?,?)");
  insertOffer.run(uid(), "Buy Any 3, Get 10% Off", "Add 3 or more items to cart and get an automatic 10% discount.", 1);
  insertOffer.run(uid(), "Free Delivery on Orders Above ₹200", "No delivery charges for orders over ₹200.", 1);
  console.log("✅ Main DB: Default offers seeded");

  const now = Date.now();
  db.prepare("INSERT INTO flash_deals (id, product_id, discount, ends_at, label) VALUES (?,?,?,?,?)").run(uid(), 1, 25, now + 6 * 3600000, "Daily Special");
  db.prepare("INSERT INTO flash_deals (id, product_id, discount, ends_at, label) VALUES (?,?,?,?,?)").run(uid(), 2, 20, now + 3 * 3600000, "Seasonal Deal");
  console.log("✅ Main DB: Flash deals seeded");
} else {
  console.log("✅ Main DB: products already exist, skipping seed");
}
