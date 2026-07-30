import { useState, useEffect, useRef, useCallback } from "react";
import {
  authApi, adminAuthApi, productsApi, ordersApi, flashApi, offersApi,
  reviewsApi, settingsApi, categoriesApi,
  saveToken, clearToken, hasToken,
} from "./api.js";

/* ═══════════════════════════════════════════════════════════
   STORE FRONT — Full-Stack Edition
   ═══════════════════════════════════════════════════════════ */

// ── Google Fonts ──────────────────────────────────────────
if (!document.getElementById("store-fonts")) {
  const link = document.createElement("link");
  link.id = "store-fonts"; link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&family=Noto+Sans+Tamil:wght@400;500;600&display=swap";
  document.head.appendChild(link);
}

// ── Design tokens ─────────────────────────────────────────
const C = {
  leaf: "#2A5E3F", leafMid: "#3D7A58", leafLight: "#5BA07A",
  sprout: "#8FC69E", cream: "#FEFCF6", warm: "#F7F2E6",
  gold: "#D4A843", terracotta: "#C45C3A", text: "#1C1C1C",
  muted: "#6B7B6E", border: "#DDD8CC", white: "#FFFFFF",
  dark: "#141A14",
};
const STAGES = ["Requested", "Accepted", "Preparing", "Completed"];
const DEFAULT_CATS = ["All", "Clearance"];

// ── CSS (responsive + injected) ───────────────────────────
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:'Outfit',sans-serif;background:${C.cream};color:${C.text};min-height:100vh;overflow-x:hidden}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.warm}}::-webkit-scrollbar-thumb{background:${C.leafMid};border-radius:3px}
img{max-width:100%;display:block}
.serif{font-family:'Playfair Display',Georgia,serif}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:500;font-size:14px;transition:all .2s ease;white-space:nowrap}
.btn-p{background:${C.leaf};color:#fff;padding:10px 22px;border-radius:50px}
.btn-p:hover{background:${C.leafMid};transform:translateY(-1px)}
.btn-p:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-s{background:transparent;color:${C.leaf};border:1.5px solid ${C.leaf};padding:9px 20px;border-radius:50px}
.btn-s:hover{background:${C.leaf}18}
.btn-sm{padding:7px 16px;font-size:13px}
.btn-danger{background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5}
.btn-danger:hover{background:#fecaca}
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:50px;font-size:11px;font-weight:600;letter-spacing:.3px}
.bg-green{background:#dcf5e7;color:#1a5c36}
.bg-gold{background:#fef3c7;color:#92600a}
.bg-red{background:#fee2e2;color:#b91c1c}
.bg-blue{background:#dbeafe;color:#1e40af}
.bg-orange{background:#ffedd5;color:#c2410c}
.bg-gray{background:#f3f4f6;color:#374151}
.card{background:#fff;border-radius:18px;border:1px solid ${C.border};overflow:hidden;transition:all .25s ease}
.card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(42,94,63,.13)}
.inp{width:100%;padding:11px 14px;border:1.5px solid ${C.border};border-radius:10px;font-family:'Outfit',sans-serif;font-size:14px;color:${C.text};background:#fff;outline:none;transition:border-color .2s}
.inp:focus{border-color:${C.leaf}}
.inp::placeholder{color:#a0adb5}
select.inp{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7B6E' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}
label.lbl{font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;display:block}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeOverlay .2s ease;overflow-y:auto}
@keyframes fadeOverlay{from{opacity:0}to{opacity:1}}
.modal{background:#fff;border-radius:24px;padding:28px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;animation:popIn .3s cubic-bezier(.34,1.56,.64,1);margin:auto}
@keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,100vw);background:#fff;z-index:300;display:flex;flex-direction:column;box-shadow:-12px 0 48px rgba(0,0,0,.15);animation:slideDrawer .3s ease}
@keyframes slideDrawer{from{transform:translateX(100%)}to{transform:none}}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${C.dark};color:#fff;padding:12px 24px;border-radius:50px;font-size:14px;font-weight:500;z-index:999;animation:toastUp .3s ease;white-space:nowrap;max-width:92vw;text-align:center}
@keyframes toastUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.fade-in{animation:fadeIn .4s ease forwards}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
/* ── Nav ── */
.nav-sticky{position:sticky;top:0;z-index:100;background:rgba(254,252,246,.95);backdrop-filter:blur(14px);border-bottom:1px solid ${C.border}}
.nav-item{position:relative;overflow:hidden}
.nav-item::after{content:'';position:absolute;bottom:0;left:0;width:0;height:2px;background:${C.leaf};transition:width .3s ease}
.nav-item:hover::after,.nav-item.active::after{width:100%}
/* ── Layout ── */
.sec{padding:56px 24px;max-width:1120px;margin:0 auto}
.container{max-width:1120px;margin:0 auto;padding:0 24px}
/* ── Grid ── */
.grid-products{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:22px}
/* ── Misc ── */
.star{color:#D4A843;font-size:13px}
.divider{height:1px;background:${C.border};margin:0}
/* ── Carousel ── */
.carousel-track{display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:8px}
.carousel-track::-webkit-scrollbar{display:none}
.carousel-card{flex:0 0 300px;scroll-snap-align:start;background:#fff;border:1px solid ${C.border};border-radius:18px;padding:22px}
/* ── Countdown ── */
.countdown-block{display:flex;gap:4px;align-items:center}
.cd-seg{background:${C.leaf};color:#fff;border-radius:8px;padding:6px 10px;font-weight:700;font-family:'Playfair Display',serif;font-size:20px;min-width:42px;text-align:center}
.cd-sep{font-weight:700;color:${C.leaf};font-size:18px}
/* ── Payment options ── */
.pay-opt{display:flex;align-items:center;gap:12px;padding:13px 16px;border:1.5px solid ${C.border};border-radius:12px;cursor:pointer;transition:all .2s}
.pay-opt.selected{border-color:${C.leaf};background:${C.leaf}0d}
/* ── Step tracker ── */
.step-bar{display:flex;align-items:center}
.step-node{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;transition:all .3s}
.step-line{flex:1;height:2px;transition:all .3s}
/* ── Social ── */
.social-btn{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(255,255,255,.3);color:rgba(255,255,255,.8);cursor:pointer;transition:all .25s;background:transparent}
.social-btn:hover{background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.6);transform:translateY(-2px)}
/* ── Upload ── */
.logo-upload{border:2px dashed ${C.border};border-radius:16px;padding:24px;text-align:center;cursor:pointer;transition:all .2s}
.logo-upload:hover{border-color:${C.leaf};background:${C.leaf}08}
.img-upload{border:2px dashed ${C.border};border-radius:12px;height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;overflow:hidden;position:relative;background:#fafaf8}
.img-upload:hover{border-color:${C.leaf};background:${C.leaf}08}
/* ── Product image carousel ── */
.prod-carousel{position:relative;overflow:hidden;border-radius:0;background:#f0fdf4}
.prod-carousel-track{display:flex;transition:transform .38s cubic-bezier(.4,0,.2,1);will-change:transform;height:100%}
.prod-carousel-slide{flex:0 0 100%;height:100%;position:relative}
.prod-carousel-dot{width:7px;height:7px;border-radius:50%;border:none;cursor:pointer;transition:all .25s;padding:0}
.prod-carousel-arrow{position:absolute;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.88);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.14);z-index:4;transition:all .2s;backdrop-filter:blur(4px)}
.prod-carousel-arrow:hover{background:#fff;transform:translateY(-50%) scale(1.1)}
/* ── Tamil text ── */
.tamil{font-family:'Noto Sans Tamil',sans-serif;line-height:1.8}
/* ── Benefits section — amber/gold theme ── */
.benefits-tab{padding:7px 16px;border-radius:50px;border:1.5px solid ${C.border};background:#fff;cursor:pointer;font-size:13px;font-weight:500;transition:all .2s}
.benefits-tab.active{background:#f59e0b;color:#fff;border-color:#f59e0b}
.benefits-tab:hover:not(.active){background:#fef3c7;border-color:#f59e0b;color:#92600a}
.benefits-box{background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:14px;padding:18px;margin-top:12px}
@keyframes sparkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.2)}}
@keyframes amberPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.3)}50%{box-shadow:0 0 12px 4px rgba(245,158,11,.15)}}
.benefits-badge{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:4px 14px;border-radius:50px;font-size:13px;font-weight:700;animation:amberPulse 2.5s ease infinite}
.benefits-sparkle{display:inline-block;animation:sparkle 1.8s ease infinite}
/* ── Lang badge ── */
.lang-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:50px;font-size:11px;font-weight:600;background:#fef3c7;color:#92600a}
/* ── Multi-image upload grid ── */
.img-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:8px}
.img-slot{aspect-ratio:1;border:2px dashed ${C.border};border-radius:12px;position:relative;overflow:hidden;cursor:pointer;transition:all .2s;background:#fafaf8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.img-slot:hover{border-color:${C.leaf};background:${C.leaf}08}
.img-slot.filled{border-style:solid;border-color:${C.leaf}}
.img-slot-remove{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.58);color:#fff;border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;z-index:5;line-height:1}
.img-slot-label{font-size:10px;color:${C.muted};font-weight:500;text-align:center;padding:0 4px}
/* ── Benefits bilingual editor ── */
.benefits-editor-tabs{display:flex;gap:0;border-bottom:1.5px solid ${C.border};margin-bottom:0}
.benefits-editor-tab{padding:7px 18px;border-radius:10px 10px 0 0;border:1.5px solid transparent;background:#f8f9fa;cursor:pointer;font-size:13px;font-weight:500;transition:all .2s;margin-bottom:-1.5px}
.benefits-editor-tab:hover{background:#f0fdf4;color:${C.leaf}}
.benefits-editor-tab.active{background:#fff;border-color:${C.border};border-bottom-color:#fff;color:${C.leaf};font-weight:600}
.benefits-textarea-en{font-family:'Outfit',sans-serif;line-height:1.7}
.benefits-textarea-ta{font-family:'Noto Sans Tamil',sans-serif;line-height:2;font-size:15px}
/* ── Card image carousel ── */
.prod-img-carousel{position:relative;overflow:hidden;background:linear-gradient(135deg,#f0fdf4,#e8f8ef)}
.prod-img-track{display:flex;will-change:transform;height:100%}
.prod-img-slide{flex:0 0 100%;height:100%;position:relative}
.prod-img-dot{width:6px;height:6px;border-radius:50%;border:none;cursor:pointer;transition:all .25s;padding:0;flex-shrink:0}
.prod-img-arrow{position:absolute;top:50%;transform:translateY(-50%);width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.18);z-index:4;transition:all .2s;backdrop-filter:blur(4px);font-size:12px;color:${C.text}}
.prod-img-arrow:hover{background:#fff;transform:translateY(-50%) scale(1.08)}
/* ── Auto-scroll progress bar ── */
.carousel-progress{position:absolute;bottom:0;left:0;height:2px;background:rgba(255,255,255,.7);z-index:5;transition:width linear}
/* ── Star selector ── */
.star-select{cursor:pointer;font-size:28px;transition:transform .15s,color .15s;display:inline-block}
.star-select:hover{transform:scale(1.2)}
/* ── Rating toggle switch ── */
.rating-toggle{position:relative;width:52px;height:28px;border-radius:14px;cursor:pointer;border:none;transition:background .3s;padding:0}
.rating-toggle::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .3s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.rating-toggle.on{background:#f59e0b}
.rating-toggle.on::after{transform:translateX(24px)}
.rating-toggle.off{background:#d1d5db}
/* ── Admin ── */
.admin-sidebar{width:240px;background:${C.dark};color:#fff;min-height:100vh;display:flex;flex-direction:column;flex-shrink:0;transition:transform .3s}
.admin-nav-item{display:flex;align-items:center;gap:10px;padding:12px 20px;cursor:pointer;font-size:14px;font-weight:500;color:rgba(255,255,255,.65);border-left:3px solid transparent;transition:all .2s}
.admin-nav-item:hover{color:#fff;background:rgba(255,255,255,.05)}
.admin-nav-item.active{color:#fff;background:rgba(255,255,255,.1);border-color:${C.sprout}}
/* ── Quality ── */
.quality-tag{padding:8px 14px;border:1.5px solid ${C.border};border-radius:50px;font-size:13px;cursor:pointer;transition:all .2s;background:#fff}
.quality-tag.sel{background:${C.leaf};color:#fff;border-color:${C.leaf}}
/* ── Flash card ── */
.flash-card{background:linear-gradient(135deg,${C.dark} 0%,${C.leaf} 100%);color:#fff;border-radius:20px;padding:22px;position:relative;overflow:hidden}
.flash-card::before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.06)}
/* ── Mobile hamburger ── */
.ham{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:6px;background:none;border:none}
.ham-line{width:22px;height:2px;background:${C.text};border-radius:2px;transition:all .3s}
/* ── Footer quick links ── */
.footer-link{color:rgba(255,255,255,.6);font-size:14px;margin-bottom:10px;cursor:pointer;transition:color .2s;background:none;border:none;padding:0;font-family:'Outfit',sans-serif;text-align:left;display:block}
.footer-link:hover{color:#fff}
/* ── Loading spinner ── */
.spinner{width:36px;height:36px;border:3px solid ${C.border};border-top-color:${C.leaf};border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
/* ── Mobile-first responsive ── */
@media(max-width:1024px){
  .grid-products{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
}
@media(max-width:768px){
  .sec{padding:40px 16px}
  .grid-products{grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
  .carousel-card{flex:0 0 260px}
  .admin-sidebar{position:fixed;left:0;top:0;bottom:0;z-index:200;transform:translateX(-100%)}
  .admin-sidebar.open{transform:translateX(0)}
  .modal{padding:20px;border-radius:16px}
}
@media(max-width:640px){
  .drawer{width:100vw}
  .sec{padding:32px 14px}
  .grid-products{grid-template-columns:repeat(2,1fr);gap:12px}
  .carousel-card{flex:0 0 240px}
  .ham{display:flex}
  .desktop-nav{display:none!important}
  .modal{max-width:100%;border-radius:16px 16px 0 0;position:fixed;bottom:0;left:0;right:0;max-height:95vh}
  .overlay{align-items:flex-end;padding:0}
  .admin-sidebar{width:280px}
}
@media(max-width:380px){
  .grid-products{grid-template-columns:1fr}
}
`;

if (!document.getElementById("store-css")) {
  const s = document.createElement("style");
  s.id = "store-css"; s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Helpers ───────────────────────────────────────────────
function fmtPrice(p) { return `₹${Number(p).toLocaleString("en-IN")}`; }
function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function fmtCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000).toString().padStart(2, "0");
  const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, "0");
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}
function useCountdown(target) {
  const [left, setLeft] = useState(Math.max(0, target - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setLeft(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(iv);
  }, [target]);
  return left;
}

/* ─── SUB-COMPONENTS ──────────────────────────────────────── */

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{msg}</div>;
}

function Stars({ n, size = 14 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ color: i <= Math.round(n) ? C.gold : "#d1d5db" }}>★</span>)}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ padding: "60px 0", textAlign: "center" }}>
      <div className="spinner" />
      <p style={{ marginTop: 14, fontSize: 13, color: C.muted }}>Loading…</p>
    </div>
  );
}

function StageTracker({ stage }) {
  return (
    <div className="step-bar" style={{ margin: "12px 0 6px" }}>
      {STAGES.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div className="step-node" style={{ background: i <= stage ? C.leaf : "#e5e7eb", color: i <= stage ? "#fff" : "#9ca3af" }}>
              {i < stage ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 9, color: i <= stage ? C.leaf : "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".3px", whiteSpace: "nowrap" }}>{s}</span>
          </div>
          {i < 3 && <div className="step-line" style={{ background: i < stage ? C.leaf : "#e5e7eb", marginBottom: 20 }} />}
        </div>
      ))}
    </div>
  );
}

// ── Placeholder shown when no image is available ────────────
function NoImagePlaceholder({ size = 40 }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#f0fdf4,#d8f3e7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span style={{ fontSize: 11, color: C.muted }}>No image</span>
    </div>
  );
}

// ── Single image with error fallback ────────────────────────
function ProductImage({ src, name }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img src={src} alt={name} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  return <NoImagePlaceholder />;
}

// ── Multi-image swipeable carousel with auto-scroll ─────────
function ProductImageCarousel({ images = [], image_url, name, height = 188 }) {
  const slides = images.length > 0 ? images : (image_url ? [image_url] : []);
  const [idx, setIdx] = useState(0);
  const touchStart = useRef(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);
  const AUTO_MS = 3500;

  useEffect(() => { setIdx(0); setProgress(0); }, [images, image_url]);

  const resetAuto = () => { setProgress(0); };
  const prev = (e) => { e?.stopPropagation(); setIdx(i => Math.max(0, i - 1)); resetAuto(); };
  const next = (e) => { e?.stopPropagation(); setIdx(i => Math.min(slides.length - 1, i + 1)); resetAuto(); };
  const goTo = (e, n) => { e.stopPropagation(); setIdx(n); resetAuto(); };

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; setPaused(true); };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const dx = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) { dx > 0 ? next() : prev(); }
    touchStart.current = null;
    setPaused(false);
    resetAuto();
  };

  // Auto-scroll timer
  const multi = slides.length > 1;
  useEffect(() => {
    if (!multi || paused) { setProgress(0); return; }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / AUTO_MS) * 100);
      setProgress(pct);
      if (elapsed >= AUTO_MS) {
        setIdx(i => (i + 1) % slides.length);
        setProgress(0);
        return;
      }
      progressRef.current = requestAnimationFrame(tick);
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => { if (progressRef.current) cancelAnimationFrame(progressRef.current); };
  }, [idx, paused, multi, slides.length]);

  if (slides.length === 0) return <div style={{ height }}><NoImagePlaceholder size={36} /></div>;

  return (
    <div
      className="prod-img-carousel"
      style={{ height }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); resetAuto(); }}
    >
      <div
        className="prod-img-track"
        style={{ transform: `translateX(-${idx * 100}%)`, transition: "transform .35s cubic-bezier(.4,0,.2,1)" }}
      >
        {slides.map((src, i) => (
          <div key={i} className="prod-img-slide">
            <ImageSlide src={src} name={name} />
          </div>
        ))}
      </div>

      {multi && idx > 0 && (
        <button className="prod-img-arrow" style={{ left: 7 }} onClick={prev} aria-label="Previous image">
          ‹
        </button>
      )}
      {multi && idx < slides.length - 1 && (
        <button className="prod-img-arrow" style={{ right: 7 }} onClick={next} aria-label="Next image">
          ›
        </button>
      )}

      {multi && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, zIndex: 3 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              className="prod-img-dot"
              onClick={(e) => goTo(e, i)}
              style={{ background: i === idx ? "#fff" : "rgba(255,255,255,.5)", transform: i === idx ? "scale(1.3)" : "scale(1)" }}
              aria-label={`Image ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Auto-scroll progress bar */}
      {multi && !paused && (
        <div className="carousel-progress" style={{ width: `${progress}%`, transitionDuration: "50ms" }} />
      )}

      {multi && (
        <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.45)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 50, zIndex: 3, backdropFilter: "blur(4px)" }}>
          {idx + 1}/{slides.length}
        </span>
      )}
    </div>
  );
}

// ── Single slide image with error fallback ──────────────────
function ImageSlide({ src, name }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img src={src} alt={name} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
  }
  return <NoImagePlaceholder size={32} />;
}

// ── Benefits display with EN/Tamil tabs — amber/gold theme ──
function ProductBenefitsDisplay({ benefitsEn, benefitsTa }) {
  const [lang, setLang] = useState(benefitsEn ? "en" : "ta");
  if (!benefitsEn && !benefitsTa) return null;

  const renderBenefitLines = (text, isTamil) => {
    const lines = text.split("\n").filter(l => l.trim());
    return lines.map((line, i) => (
      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < lines.length - 1 ? 6 : 0 }}>
        <span style={{ color: "#d97706", fontSize: 14, flexShrink: 0, marginTop: 2 }}>✦</span>
        <span className={isTamil ? "tamil" : ""} style={{ fontSize: isTamil ? 15 : 14, color: "#78350f", lineHeight: isTamil ? 1.8 : 1.75 }}>{line}</span>
      </div>
    ));
  };

  const getText = () => {
    if (lang === "en" && benefitsEn) return { text: benefitsEn, tamil: false };
    if (lang === "ta" && benefitsTa) return { text: benefitsTa, tamil: true };
    if (lang === "en" && !benefitsEn && benefitsTa) return { text: benefitsTa, tamil: true };
    if (lang === "ta" && !benefitsTa && benefitsEn) return { text: benefitsEn, tamil: false };
    return null;
  };

  const content = getText();

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span className="benefits-badge">
          <span className="benefits-sparkle">✨</span>
          Benefits of this
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {benefitsEn && (
          <button className={`benefits-tab ${lang === "en" ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setLang("en"); }}>
            🇬🇧 English
          </button>
        )}
        {benefitsTa && (
          <button className={`benefits-tab ${lang === "ta" ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setLang("ta"); }}>
            🇮🇳 தமிழ்
          </button>
        )}
      </div>
      <div className="benefits-box" key={lang} style={{ animation: "fadeIn .3s ease" }}>
        {content && renderBenefitLines(content.text, content.tamil)}
      </div>
    </div>
  );
}

function CountdownTimer({ endsAt }) {
  const left = useCountdown(endsAt);
  const segs = fmtCountdown(left).split(":");
  return (
    <div className="countdown-block">
      {segs.map((s, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="cd-seg">{s}</span>
          {i < 2 && <span className="cd-sep">:</span>}
        </span>
      ))}
    </div>
  );
}

function ReviewCarousel({ reviews, user, products, orders, onReviewSubmit }) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [reviewProduct, setReviewProduct] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const SEED_REVIEWS = [
    { id: "seed-1", user_name: "Priya S.", rating: 5, comment: "The product arrived crisp and vibrant. Will definitely order every week!", product_name: "Fresh Product", created_at: Date.now() - 172800000 },
    { id: "seed-2", user_name: "Rajan K.", rating: 5, comment: "The item was beautifully packed and arrived fresh. This is now my go-to.", product_name: "Fresh Product", created_at: Date.now() - 432000000 },
    { id: "seed-3", user_name: "Meera T.", rating: 4, comment: "The product is genuinely fresh and made from good ingredients.", product_name: "Fresh Product", created_at: Date.now() - 604800000 },
    { id: "seed-4", user_name: "Arun V.", rating: 5, comment: "The item is extraordinary and now part of my regular order.", product_name: "Fresh Product", created_at: Date.now() - 604800000 },
    { id: "seed-5", user_name: "Deepa N.", rating: 4, comment: "The fresh mix is great for salads. Packaging keeps it fresh. Highly recommend.", product_name: "Fresh Product", created_at: Date.now() - 1209600000 },
  ];

  // Deduplicate by id, use real reviews if available, fallback to seed
  const all = reviews.length > 0 ? reviews : SEED_REVIEWS;

  const scroll = (dir) => {
    const next = Math.max(0, Math.min(all.length - 1, idx + dir));
    setIdx(next);
    ref.current?.children[next]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  // Products user has bought and completed (for review dropdown)
  const reviewableProducts = user && orders && products
    ? products.filter(p => orders.some(o => o.status === "Completed" && o.items?.some(i => i.id === p.id)))
    : [];

  const handleSubmitReview = async () => {
    if (!reviewProduct || reviewRating === 0) return;
    setSubmitting(true);
    try {
      await reviewsApi.submit({ product_id: Number(reviewProduct), rating: reviewRating, comment: reviewComment });
      setSubmitSuccess(true);
      setReviewRating(0); setReviewComment(""); setReviewProduct("");
      setTimeout(() => { setSubmitSuccess(false); setShowWriteReview(false); }, 2000);
      if (onReviewSubmit) onReviewSubmit();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div>
      {/* Review Cards Carousel */}
      <div className="carousel-track" ref={ref}>
        {all.map(r => (
          <div key={r.id} className="carousel-card fade-in">
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${C.leaf},${C.leafLight})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{getInitials(r.user_name)}</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{r.user_name}</p>
                <p style={{ fontSize: 11, color: C.muted }}>{r.product_name || "Store Product"}</p>
              </div>
            </div>
            <Stars n={r.rating} />
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, marginTop: 8 }}>"{r.comment}"</p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>{timeAgo(r.created_at)}</p>
          </div>
        ))}
      </div>

      {/* Carousel Navigation */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => scroll(-1)} disabled={idx === 0} className="btn btn-s btn-sm" style={{ opacity: idx === 0 ? .4 : 1 }}>← Prev</button>
        <span style={{ fontSize: 13, color: C.muted }}>{idx + 1} / {all.length}</span>
        <button onClick={() => scroll(1)} disabled={idx === all.length - 1} className="btn btn-s btn-sm" style={{ opacity: idx === all.length - 1 ? .4 : 1 }}>Next →</button>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {all.map((_, i) => <div key={i} onClick={() => scroll(i - idx)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === idx ? C.leaf : C.border, cursor: "pointer", transition: "all .2s" }} />)}
        </div>
      </div>

      {/* Write a Review Section */}
      {user ? (
        <div style={{ marginTop: 28 }}>
          {!showWriteReview ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button className="btn" onClick={() => setShowWriteReview(true)}
                style={{ background: `linear-gradient(135deg,${C.leaf},${C.leafMid})`, color: "#fff", padding: "12px 28px", borderRadius: 50, fontSize: 14, fontWeight: 600, gap: 8, boxShadow: "0 4px 16px rgba(42,94,63,.25)", transition: "all .3s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Write a Review
              </button>
            </div>
          ) : (
            <div className="fade-in" style={{ background: "linear-gradient(135deg,#f0fdf4,#e8f8ef)", border: `1.5px solid ${C.sprout}`, borderRadius: 20, padding: "clamp(18px,3vw,26px)", position: "relative" }}>
              <button onClick={() => { setShowWriteReview(false); setSubmitSuccess(false); }} className="btn" style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,.06)", width: 30, height: 30, borderRadius: "50%", fontSize: 16, color: C.muted }}>×</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg,${C.leaf},${C.leafLight})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{getInitials(user.name)}</div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>Share Your Experience</p>
                  <p style={{ fontSize: 12, color: C.muted }}>Posting as {user.name}</p>
                </div>
              </div>

              {submitSuccess ? (
                <div className="fade-in" style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.leaf, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 26 }}>✓</div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: C.leaf }}>Thank You!</p>
                  <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Your review has been submitted successfully.</p>
                </div>
              ) : (
                <>
                  {/* Product Select */}
                  <div style={{ marginBottom: 14 }}>
                    <label className="lbl">Which product are you reviewing?</label>
                    {reviewableProducts.length > 0 ? (
                      <select className="inp" value={reviewProduct} onChange={e => setReviewProduct(e.target.value)}>
                        <option value="">Select a product…</option>
                        {reviewableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    ) : (
                      <p style={{ fontSize: 13, color: C.muted, fontStyle: "italic", padding: "8px 0" }}>You can only review products from completed orders. Place an order first!</p>
                    )}
                  </div>

                  {/* Star Rating */}
                  <div style={{ marginBottom: 14 }}>
                    <label className="lbl">Your Rating</label>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <span key={i} className="star-select"
                          style={{ color: i <= (reviewHover || reviewRating) ? "#f59e0b" : "#d1d5db", fontSize: 30 }}
                          onMouseEnter={() => setReviewHover(i)}
                          onMouseLeave={() => setReviewHover(0)}
                          onClick={() => setReviewRating(i)}>★</span>
                      ))}
                      {reviewRating > 0 && <span style={{ fontSize: 14, color: C.leaf, fontWeight: 600, marginLeft: 8 }}>{reviewRating}/5</span>}
                    </div>
                  </div>

                  {/* Comment */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="lbl">Your Review (optional)</label>
                    <textarea className="inp" rows={3} value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                      placeholder="Tell us about your experience with this product…"
                      style={{ fontSize: 14, lineHeight: 1.6, resize: "vertical" }} />
                  </div>

                  {/* Submit */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button className="btn"
                      disabled={!reviewProduct || reviewRating === 0 || submitting || reviewableProducts.length === 0}
                      onClick={handleSubmitReview}
                      style={{ background: `linear-gradient(135deg,${C.leaf},${C.leafMid})`, color: "#fff", padding: "11px 26px", borderRadius: 50, fontSize: 14, fontWeight: 600, opacity: (!reviewProduct || reviewRating === 0) ? .5 : 1 }}>
                      {submitting ? "Submitting…" : "Submit Review"}
                    </button>
                    <button className="btn btn-s btn-sm" onClick={() => setShowWriteReview(false)}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.muted }}>Sign in to share your review with us</p>
        </div>
      )}
    </div>
  );
}

/* ─── FLASH DEAL CARD ─────────────────────────────────────── */
function FlashDealCard({ deal, product, onAdd }) {
  if (!product || !product.orderable) return null;
  const discounted = Math.round(product.price * (1 - deal.discount / 100));
  return (
    <div className="flash-card" style={{ flex: "0 0 280px", scrollSnapAlign: "start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.7)", display: "block", marginBottom: 4 }}>Flash Deal</span>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#fff", marginBottom: 2 }}>{product.name}</p>
          <span style={{ fontSize: 11, background: "rgba(255,255,255,.2)", color: "#fff", padding: "2px 8px", borderRadius: 50, fontWeight: 600 }}>{deal.discount}% OFF</span>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,.1)" }}>
          <ProductImage src={product.image_url} name={product.name} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <CountdownTimer endsAt={deal.ends_at} />
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 4 }}>Ends in</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "Playfair Display,serif", color: "#fff" }}>{fmtPrice(discounted)}</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginLeft: 6, textDecoration: "line-through" }}>{fmtPrice(product.price)}</span>
        </div>
        <button className="btn" style={{ background: "#fff", color: C.leaf, borderRadius: 50, padding: "8px 16px", fontWeight: 600, fontSize: 13 }}
          onClick={() => onAdd(product, discounted)}>Add</button>
      </div>
    </div>
  );
}

/* ─── PRODUCT CARD ────────────────────────────────────────── */
function ProductCard({ product, onAdd, onView, flashDeal }) {
  const oos = product.stock === 0;
  const isOrderable = product.orderable !== false;
  const discountedPrice = flashDeal ? Math.round(product.price * (1 - flashDeal.discount / 100)) : null;
  return (
    <div className="card fade-in" style={{ cursor: "pointer", opacity: oos ? .8 : 1 }} onClick={() => onView(product)}>
      <div style={{ height: 180, position: "relative", overflow: "hidden" }}>
        <ProductImageCarousel images={product.images} image_url={product.image_url} name={product.name} height={180} />
        {product.popular && <span className="badge bg-gold" style={{ position: "absolute", top: 10, left: 10 }}>Popular</span>}
        {product.clearance && <span className="badge bg-orange" style={{ position: "absolute", top: 10, left: product.popular ? 80 : 10 }}>Clearance</span>}
        {!isOrderable && <span className="badge" style={{ position: "absolute", top: 10, right: 10, background: "rgba(107,123,110,.85)", color: "#fff", backdropFilter: "blur(4px)" }}>Display Only</span>}
        {oos && isOrderable && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.75)", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="badge bg-red" style={{ fontSize: 13, padding: "6px 16px" }}>Out of Stock</span></div>}
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <span className="badge bg-green" style={{ marginBottom: 6 }}>{product.category}</span>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 5, lineHeight: 1.35 }}>{product.name}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Stars n={product.rating} />
          <span style={{ fontSize: 12, color: C.muted }}>({product.review_count})</span>
        </div>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 12 }}>{(product.description || "").slice(0, 75)}…</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            {discountedPrice
              ? <><span style={{ fontSize: 18, fontWeight: 700, color: C.leaf, fontFamily: "Playfair Display,serif" }}>{fmtPrice(discountedPrice)}</span>
                <span style={{ fontSize: 12, color: C.muted, marginLeft: 4, textDecoration: "line-through" }}>{fmtPrice(product.price)}</span></>
              : <span style={{ fontSize: 18, fontWeight: 700, color: C.leaf, fontFamily: "Playfair Display,serif" }}>{fmtPrice(product.price)}</span>
            }
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>/{product.unit}</span>
          </div>
          {isOrderable && !oos && <button className="btn btn-p btn-sm" onClick={e => { e.stopPropagation(); onAdd(product, discountedPrice); }}>+ Add</button>}
          {!isOrderable && <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, fontStyle: "italic" }}>View Only</span>}
        </div>
        {isOrderable && !oos && product.stock < 15 && <p style={{ fontSize: 11, color: C.terracotta, fontWeight: 600, marginTop: 6 }}>Only {product.stock} left</p>}
      </div>
    </div>
  );
}

/* ─── CART DRAWER ─────────────────────────────────────────── */
function CartDrawer({ cart, products, onClose, onUpdate, onCheckout }) {
  const PAYMENT_METHODS = [
    { id: "upi", label: "UPI / GPay / PhonePe", icon: "📱" },
    { id: "card", label: "Credit / Debit Card", icon: "💳" },
    { id: "netbanking", label: "Net Banking", icon: "🏦" },
    { id: "cod", label: "Cash on Delivery", icon: "💵" },
  ];
  const [payMethod, setPayMethod] = useState("upi");
  const items = cart.map(c => ({ ...c, product: products.find(p => p.id === c.id) })).filter(c => c.product);
  const subtotal = items.reduce((s, c) => s + c.effectivePrice * c.qty, 0);
  const discount = subtotal >= 600 ? Math.round(subtotal * 0.1) : 0;
  const delivery = subtotal >= 200 ? 0 : 30;
  const total = subtotal - discount + delivery;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 299 }} onClick={onClose} />
      <div className="drawer">
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="serif" style={{ fontSize: 22, fontWeight: 600 }}>Your Cart</h2>
          <button onClick={onClose} className="btn" style={{ background: C.warm, width: 34, height: 34, borderRadius: "50%", fontSize: 18, color: C.muted }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {items.length === 0
            ? <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" style={{ margin: "0 auto 16px", display: "block", color: C.border }}>
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p style={{ fontWeight: 600, fontSize: 16 }}>Cart is empty</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Add some fresh items to get started</p>
            </div>
            : items.map(item => (
              <div key={item.id} style={{ display: "flex", gap: 12, marginBottom: 14, padding: 12, background: C.warm, borderRadius: 14 }}>
                <div style={{ width: 58, height: 58, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                  <ProductImage src={item.product.image_url} name={item.product.name} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.product.name}</p>
                  <p style={{ fontSize: 12, color: C.muted }}>{fmtPrice(item.effectivePrice)}/{item.product.unit}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    {[["−", item.qty - 1], ["+", item.qty + 1]].map(([sym, nq]) => (
                      <button key={sym} onClick={() => onUpdate(item.id, nq)} className="btn" style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${C.border}`, background: "#fff", fontSize: 16, flexShrink: 0 }}>{sym}</button>
                    ))}
                    <span style={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: C.leaf, fontFamily: "Playfair Display,serif", fontSize: 15, flexShrink: 0 }}>{fmtPrice(item.effectivePrice * item.qty)}</div>
              </div>
            ))
          }
        </div>
        {items.length > 0 && (
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Payment Method</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PAYMENT_METHODS.map(pm => (
                  <div key={pm.id} className={`pay-opt ${payMethod === pm.id ? "selected" : ""}`} onClick={() => setPayMethod(pm.id)} style={{ fontSize: 12, gap: 6, padding: "10px 12px" }}>
                    <span style={{ fontSize: 16 }}>{pm.icon}</span>
                    <span style={{ fontWeight: 500 }}>{pm.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: C.warm, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ color: C.muted }}>Subtotal</span><span>{fmtPrice(subtotal)}</span></div>
              {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ color: "#16a34a", fontWeight: 500 }}>Discount (10%)</span><span style={{ color: "#16a34a" }}>−{fmtPrice(discount)}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}><span style={{ color: C.muted }}>Delivery</span><span style={{ color: delivery === 0 ? "#16a34a" : C.text, fontWeight: 500 }}>{delivery === 0 ? "Free" : fmtPrice(delivery)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span>Total</span>
                <span style={{ fontFamily: "Playfair Display,serif", fontSize: 20, color: C.leaf }}>{fmtPrice(total)}</span>
              </div>
            </div>
            <button className="btn btn-p" style={{ width: "100%", padding: 14, fontSize: 15 }} onClick={() => onCheckout(payMethod, { subtotal, discount, delivery, total })}>Proceed to Checkout</button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── CHECKOUT MODAL ──────────────────────────────────────── */
function CheckoutModal({ cart, products, user, payMethod, cartTotals, onClose, onPlace, loading }) {
  const [form, setForm] = useState({
    houseNo: user?.address?.houseNo || "",
    street: user?.address?.street || "",
    area: user?.address?.area || "",
    city: "Thanjavur",
    state: "Tamil Nadu",
    pincode: user?.address?.pincode || "",
    landmark: "",
    instructions: "",
  });
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const items = cart.map(c => ({ ...c, product: products.find(p => p.id === c.id) })).filter(c => c.product);
  const { subtotal, discount, delivery, total } = cartTotals;
  const valid = form.houseNo && form.street && form.area && form.pincode;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
          <h2 className="serif" style={{ fontSize: 24, fontWeight: 600 }}>Checkout</h2>
          <button onClick={onClose} className="btn" style={{ background: C.warm, width: 34, height: 34, borderRadius: "50%", fontSize: 18, color: C.muted }}>×</button>
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.leaf, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Delivery Address</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: "1/-1" }}><label className="lbl">House / Flat No. *</label><input className="inp" value={form.houseNo} onChange={upd("houseNo")} placeholder="12A, Flat 3B" /></div>
          <div style={{ gridColumn: "1/-1" }}><label className="lbl">Street *</label><input className="inp" value={form.street} onChange={upd("street")} placeholder="Gandhi Road" /></div>
          <div><label className="lbl">Area *</label><input className="inp" value={form.area} onChange={upd("area")} placeholder="Nallur" /></div>
          <div><label className="lbl">Pincode *</label><input className="inp" value={form.pincode} onChange={upd("pincode")} placeholder="613001" maxLength={6} /></div>
          <div><label className="lbl">City</label><input className="inp" value={form.city} onChange={upd("city")} /></div>
          <div><label className="lbl">State</label><input className="inp" value={form.state} onChange={upd("state")} /></div>
          <div style={{ gridColumn: "1/-1" }}><label className="lbl">Landmark</label><input className="inp" value={form.landmark} onChange={upd("landmark")} placeholder="Near Siva Temple" /></div>
          <div style={{ gridColumn: "1/-1" }}><label className="lbl">Delivery Instructions</label><textarea className="inp" value={form.instructions} onChange={upd("instructions")} rows={2} placeholder="Call before delivery…" /></div>
        </div>
        <div style={{ background: C.warm, borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
          {items.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 4 }}>
            <span>{i.product.name} × {i.qty}</span>
            <span style={{ fontWeight: 500, color: C.text }}>{fmtPrice(i.effectivePrice * i.qty)}</span>
          </div>)}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 10 }}>
            {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#16a34a", marginBottom: 4 }}><span>Discount</span><span>−{fmtPrice(discount)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span style={{ color: C.muted }}>Delivery</span><span style={{ color: delivery === 0 ? "#16a34a" : C.text }}>{delivery === 0 ? "Free" : fmtPrice(delivery)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Total</span><span style={{ color: C.leaf, fontFamily: "Playfair Display,serif", fontSize: 18 }}>{fmtPrice(total)}</span></div>
          </div>
        </div>
        <button className="btn btn-p" style={{ width: "100%", padding: 14, fontSize: 15, opacity: valid ? 1 : .5 }} disabled={!valid || loading}
          onClick={() => valid && onPlace({ address: form, payMethod, items: items.map(i => ({ id: i.id, name: i.product.name, qty: i.qty, price: i.effectivePrice })) })}>
          {loading ? "Placing…" : "Place Order"}
        </button>
        {!valid && <p style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 8 }}>Please fill all required (*) fields</p>}
      </div>
    </div>
  );
}

/* ─── PRODUCT DETAIL MODAL ────────────────────────────────── */
function ProductModal({ product, onClose, onAdd, flashDeal, ratingMode, user, orders, onReviewSubmit }) {
  const discountedPrice = flashDeal ? Math.round(product.price * (1 - flashDeal.discount / 100)) : null;
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Check if user can review (has completed order with this product)
  const canReview = user && orders?.some(o =>
    o.status === "Completed" && o.items?.some(i => i.id === product.id)
  );

  useEffect(() => {
    if (ratingMode === "real") {
      setLoadingReviews(true);
      reviewsApi.getForProduct(product.id)
        .then(setReviews)
        .catch(() => setReviews([]))
        .finally(() => setLoadingReviews(false));
    }
  }, [product.id, ratingMode]);

  const handleReviewSubmit = async (data) => {
    try {
      const review = await reviewsApi.submit({ product_id: product.id, ...data });
      setReviews(r => [review, ...r]);
      setShowReviewForm(false);
      if (onReviewSubmit) onReviewSubmit();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 260, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
          <ProductImageCarousel images={product.images} image_url={product.image_url} name={product.name} height={260} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <h2 className="serif" style={{ fontSize: 24, fontWeight: 600, flex: 1, paddingRight: 12 }}>{product.name}</h2>
          <button onClick={onClose} className="btn" style={{ background: C.warm, width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <span className="badge bg-green">{product.category}</span>
          {product.clearance && <span className="badge bg-orange">Clearance</span>}
          {flashDeal && <span className="badge bg-red">{flashDeal.discount}% Flash Deal</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Stars n={product.rating} size={15} />
          <span style={{ fontSize: 13, color: C.muted }}>{product.rating} ({product.review_count} reviews)</span>
        </div>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{product.description}</p>
        <ProductBenefitsDisplay benefitsEn={product.benefits_en} benefitsTa={product.benefits_ta} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Price</p>
            {discountedPrice
              ? <><p style={{ fontFamily: "Playfair Display,serif", fontSize: 22, fontWeight: 700, color: C.leaf }}>{fmtPrice(discountedPrice)}</p>
                <p style={{ fontSize: 12, color: C.muted, textDecoration: "line-through" }}>{fmtPrice(product.price)}</p></>
              : <p style={{ fontFamily: "Playfair Display,serif", fontSize: 22, fontWeight: 700, color: C.leaf }}>{fmtPrice(product.price)}</p>
            }
          </div>
          <div style={{ background: product.stock === 0 ? "#fef2f2" : "#f0fdf4", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Stock</p>
            <p style={{ fontFamily: "Playfair Display,serif", fontSize: 22, fontWeight: 700, color: product.stock === 0 ? "#b91c1c" : C.leaf }}>{product.stock}</p>
            <p style={{ fontSize: 11, color: C.muted }}>units / {product.unit}</p>
          </div>
        </div>

        {/* Real reviews section */}
        {ratingMode === "real" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Customer Reviews</span>
              {canReview && !showReviewForm && (
                <button className="btn btn-sm" style={{ background: "#fef3c7", color: "#92600a", border: "1px solid #f59e0b", borderRadius: 50, fontSize: 12 }}
                  onClick={() => setShowReviewForm(true)}>★ Write a Review</button>
              )}
            </div>
            {showReviewForm && (
              <ReviewSubmitForm onSubmit={handleReviewSubmit} onCancel={() => setShowReviewForm(false)} />
            )}
            {loadingReviews ? <p style={{ fontSize: 12, color: C.muted }}>Loading reviews…</p>
              : reviews.length === 0 ? <p style={{ fontSize: 13, color: C.muted, fontStyle: "italic" }}>No reviews yet. Be the first!</p>
              : reviews.slice(0, 5).map(r => (
                <div key={r.id} style={{ padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{r.user_name}</span>
                    <Stars n={r.rating} size={12} />
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{r.comment}</p>}
                  <p style={{ fontSize: 11, color: C.border, marginTop: 4 }}>{timeAgo(r.created_at)}</p>
                </div>
              ))
            }
          </div>
        )}

        {product.stock > 0 && product.orderable !== false
          ? <button className="btn btn-p" style={{ width: "100%", padding: 14 }} onClick={() => { onAdd(product, discountedPrice); onClose(); }}>Add to Cart</button>
          : product.orderable === false
            ? <div style={{ textAlign: "center", padding: 14, background: "#f0fdf4", borderRadius: 12, color: C.leaf, fontWeight: 600 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ verticalAlign: "middle", marginRight: 6 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Display Only — Not Available for Order
              </div>
            : <div style={{ textAlign: "center", padding: 14, background: "#fef2f2", borderRadius: 12, color: "#b91c1c", fontWeight: 600 }}>Currently Out of Stock</div>
        }
      </div>
    </div>
  );
}

/* ─── REVIEW SUBMIT FORM (inline in modal) ────────────────── */
function ReviewSubmitForm({ onSubmit, onCancel }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    await onSubmit({ rating, comment });
    setSubmitting(false);
  };

  return (
    <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#78350f", marginBottom: 10 }}>Rate this product</p>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className="star-select"
            style={{ color: i <= (hover || rating) ? "#f59e0b" : "#d1d5db" }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}>★</span>
        ))}
        {rating > 0 && <span style={{ fontSize: 13, color: "#78350f", marginLeft: 8, alignSelf: "center" }}>{rating}/5</span>}
      </div>
      <textarea className="inp" rows={2} value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Share your experience… (optional)" style={{ marginBottom: 10, fontSize: 13 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-sm" disabled={rating === 0 || submitting}
          style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 50, padding: "7px 18px", opacity: rating === 0 ? .5 : 1 }}
          onClick={submit}>{submitting ? "Submitting…" : "Submit Review"}</button>
        <button className="btn btn-sm btn-s" onClick={onCancel} style={{ fontSize: 12 }}>Cancel</button>
      </div>
    </div>
  );
}

/* ─── AUTH MODAL ──────────────────────────────────────────── */
function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr("");
    if (!form.email.includes("@")) return setErr("Enter a valid email address");
    if (form.password.length < 6) return setErr("Password must be at least 6 characters");
    if (mode === "signup" && !form.name.trim()) return setErr("Full name is required");
    setLoading(true);
    try {
      const fn = mode === "login" ? authApi.login : authApi.signup;
      const { token, user } = await fn({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      saveToken(token);
      onAuth(user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400, position: "relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="btn" style={{ position: "absolute", top: 16, right: 16, background: C.warm, width: 34, height: 34, borderRadius: "50%" }}>×</button>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg,${C.dark},${C.leaf})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M7 10c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z" /><path d="M4.5 20.5C6 17.5 9 15.5 12 15.5s6 2 7.5 5" /></svg>
          </div>
          <h2 className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Fresh Market</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>{mode === "login" ? "Welcome back" : "Create your account"}</p>
        </div>
        {err && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 16, fontWeight: 500 }}>{err}</div>}
        {mode === "signup" && <>
          <div style={{ marginBottom: 14 }}><label className="lbl">Full Name</label><input className="inp" value={form.name} onChange={upd("name")} placeholder="Your full name" /></div>
          <div style={{ marginBottom: 14 }}><label className="lbl">Phone Number</label><input className="inp" type="tel" value={form.phone} onChange={upd("phone")} placeholder="Optional" /></div>
        </>}
        <div style={{ marginBottom: 14 }}><label className="lbl">Email Address</label><input className="inp" type="email" value={form.email} onChange={upd("email")} placeholder="you@email.com" onKeyDown={e => e.key === "Enter" && submit()} /></div>
        <div style={{ marginBottom: 20 }}><label className="lbl">Password</label><input className="inp" type="password" value={form.password} onChange={upd("password")} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} /></div>
        <button className="btn btn-p" style={{ width: "100%", padding: 14, fontSize: 15 }} onClick={submit} disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: C.muted }}>
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button className="btn" style={{ color: C.leaf, fontWeight: 600, padding: 0, textDecoration: "underline", textUnderlineOffset: 3 }}
            onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setErr(""); }}>
            {mode === "login" ? "Create Account" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}

/* ─── ADMIN AUTH MODAL ────────────────────────────────────── */
function AdminAuthModal({ onClose, onAuth }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const { token, user } = await adminAuthApi.login({ email: form.email, password: form.password });
      saveToken(token, "admin");
      onAuth(user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380, position: "relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="btn" style={{ position: "absolute", top: 16, right: 16, background: C.warm, width: 34, height: 34, borderRadius: "50%" }}>×</button>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg,${C.dark},#0f4c2a)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <h2 className="serif" style={{ fontSize: 22, fontWeight: 700 }}>Admin Access</h2>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Restricted to authorised personnel only</p>
        </div>
        {err && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 16, fontWeight: 500 }}>{err}</div>}
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.leaf }}>
          <strong>Admin access:</strong><br />Configured in the backend for site management.
        </div>
        <div style={{ marginBottom: 14 }}><label className="lbl">Admin Email</label><input className="inp" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" /></div>
        <div style={{ marginBottom: 20 }}><label className="lbl">Password</label><input className="inp" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} /></div>
        <button className="btn btn-p" style={{ width: "100%", padding: 14, background: C.dark }} onClick={submit} disabled={loading}>
          {loading ? "Authenticating…" : "Enter Dashboard"}
        </button>
      </div>
    </div>
  );
}

/* ─── QUALITY REPORT MODAL ────────────────────────────────── */
function QualityReportModal({ order, onClose, onSubmit }) {
  const ISSUES = ["Wrong item delivered", "Item was stale / not fresh", "Quantity was less", "Packaging was damaged", "Late delivery", "Missing items", "Other"];
  const [selected, setSelected] = useState([]);
  const [desc, setDesc] = useState("");
  const toggle = t => setSelected(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="serif" style={{ fontSize: 22, fontWeight: 600 }}>Report an Issue</h2>
          <button onClick={onClose} className="btn" style={{ background: C.warm, width: 34, height: 34, borderRadius: "50%" }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Order #{order.id.slice(0, 8).toUpperCase()} — Help us improve by reporting issues.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {ISSUES.map(t => <button key={t} className={`quality-tag ${selected.includes(t) ? "sel" : ""}`} onClick={() => toggle(t)}>{t}</button>)}
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="lbl">Additional Details</label>
          <textarea className="inp" rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the issue in detail…" />
        </div>
        <button className="btn btn-p" style={{ width: "100%", padding: 12 }} disabled={selected.length === 0}
          onClick={() => { onSubmit({ order_id: order.id, issues: selected, description: desc }); onClose(); }}>
          Submit Report
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════ */
function HomePage({ products, onAdd, onView, flashDeals, offers, companyLogo, navigate, categories, user, orders, homeReviews, onReviewSubmit }) {
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");

  // Build dynamic category list: All + category names + Clearance
  const CATS = ["All", ...categories.map(c => c.name), "Clearance"];

  const displayProducts = products.filter(p => {
    if (cat === "Clearance") return p.clearance;
    return (cat === "All" || p.category === cat) && (!search || p.name.toLowerCase().includes(search.toLowerCase()));
  });
  const popular = products.filter(p => p.popular && p.stock > 0).slice(0, 4);

  const activeFlash = flashDeals.filter(d => d.ends_at > Date.now());
  const activeOffers = offers.filter(o => o.active);

  return (
    <div>
      {/* HERO */}
      <section id="hero" style={{ background: `linear-gradient(135deg,${C.dark} 0%,${C.leaf} 60%,${C.leafLight} 100%)`, padding: "clamp(48px,10vw,96px) 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -60, width: 250, height: 250, borderRadius: "50%", background: "rgba(255,255,255,.03)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          {companyLogo
            ? <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, justifyContent: "center" }}>
                <img src={companyLogo} alt="Fresh Market" style={{ height: 56, width: 56, objectFit: "contain", borderRadius: "50%", border: "2px solid rgba(255,255,255,.2)" }} />
                <span className="serif" style={{ color: "#fff", fontSize: 28, fontWeight: 700, letterSpacing: ".5px" }}>Fresh Market</span>
              </div>
            : <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, justifyContent: "center" }}>
                <img src="/logo.jpeg" alt="Fresh Market" style={{ height: 56, width: 56, objectFit: "contain", borderRadius: "50%", border: "2px solid rgba(255,255,255,.2)" }} />
                <span className="serif" style={{ color: "#fff", fontSize: 28, fontWeight: 700, letterSpacing: ".5px" }}>Fresh Market</span>
              </div>
          }
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: 14, fontWeight: 500, textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Farm-fresh · Harvested Daily</p>
          <h1 className="serif" style={{ color: "#fff", fontSize: "clamp(32px,7vw,62px)", fontWeight: 700, lineHeight: 1.12, marginBottom: 18, fontStyle: "italic" }}>
            Nourish from the<br /><span style={{ color: "#8FC69E" }}>ground up.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,.7)", fontSize: "clamp(14px,2vw,16px)", lineHeight: 1.75, maxWidth: 480, margin: "0 auto 28px" }}>
            Freshly harvested sprouts, mushrooms and organic produce
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", maxWidth: 420, margin: "0 auto 28px" }}>
            <input
              style={{ flex: 1, padding: "12px 20px", borderRadius: 50, border: "none", outline: "none", fontFamily: "Outfit,sans-serif", fontSize: 14, color: C.text, minWidth: 0 }}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search Soups, Sprouts…"
              onKeyDown={e => e.key === "Enter" && document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
            />
            <button className="btn" style={{ background: C.gold, color: C.dark, borderRadius: 50, padding: "12px 22px", fontWeight: 600, flexShrink: 0 }}
              onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
              Search
            </button>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {["Same-day Delivery", "100% Organic", "Hygienically Packed"].map(text => (
              <div key={text} style={{ color: "rgba(255,255,255,.75)", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, background: C.sprout, borderRadius: "50%", flexShrink: 0 }} />{text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFFERS BANNER */}
      {activeOffers.length > 0 && (
        <div style={{ background: "#fef3c7", borderBottom: "1px solid #fde68a", padding: "10px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {activeOffers.map((o, i) => (
              <span key={o.id} style={{ fontSize: 13, color: "#92600a", fontWeight: 500 }}>
                {i > 0 && <span style={{ margin: "0 6px", color: "#d97706" }}>|</span>}
                <strong>{o.title}</strong>{o.description ? `: ${o.description}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* FLASH DEALS */}
      {activeFlash.length > 0 && (
        <section id="flash" className="sec" style={{ paddingBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
            <h2 className="serif" style={{ fontSize: "clamp(20px,4vw,26px)", fontWeight: 700 }}>
              <span style={{ color: C.terracotta }}>Flash Deals</span>
              <span style={{ fontSize: 14, fontWeight: 400, color: C.muted, marginLeft: 12 }}>Limited time only</span>
            </h2>
          </div>
          <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory" }}>
            {activeFlash.map(d => (
              <FlashDealCard key={d.id} deal={d} product={products.find(p => p.id === d.product_id)} onAdd={(p, price) => onAdd(p, price)} />
            ))}
          </div>
        </section>
      )}

      {/* POPULAR */}
      {popular.length > 0 && !search && cat === "All" && (
        <section id="popular" className="sec" style={{ paddingBottom: 0 }}>
          <h2 className="serif" style={{ fontSize: "clamp(20px,4vw,26px)", fontWeight: 700, marginBottom: 20 }}>Most Popular</h2>
          <div className="grid-products">
            {popular.map(p => <ProductCard key={p.id} product={p} onAdd={onAdd} onView={onView} flashDeal={flashDeals.find(d => d.product_id === p.id && d.ends_at > Date.now())} />)}
          </div>
        </section>
      )}

      {/* ALL PRODUCTS */}
      <section id="products" className="sec">
        <h2 className="serif" style={{ fontSize: "clamp(20px,4vw,26px)", fontWeight: 700, marginBottom: 16 }}>
          {search ? `Results for "${search}"` : "All Products"}
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {CATS.map(c => (
            <button key={c} className="btn btn-sm" onClick={() => setCat(c)}
              style={{ borderRadius: 50, border: `1.5px solid ${cat === c ? C.leaf : C.border}`, background: cat === c ? C.leaf : "#fff", color: cat === c ? "#fff" : C.text, fontWeight: cat === c ? 600 : 400 }}>
              {c}
            </button>
          ))}
        </div>
        {displayProducts.length === 0
          ? <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}><p style={{ fontWeight: 600, fontSize: 16 }}>No products found</p></div>
          : <div className="grid-products">
            {displayProducts.map(p => <ProductCard key={p.id} product={p} onAdd={onAdd} onView={onView} flashDeal={flashDeals.find(d => d.product_id === p.id && d.ends_at > Date.now())} />)}
          </div>
        }
      </section>

      {/* REVIEWS */}
      <section id="reviews" style={{ background: C.warm, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="sec">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <h2 className="serif" style={{ fontSize: "clamp(20px,4vw,26px)", fontWeight: 700 }}>What Our Customers Say</h2>
            {homeReviews.length > 0 && <span className="badge bg-green" style={{ fontSize: 12 }}>{homeReviews.length} Review{homeReviews.length !== 1 ? "s" : ""}</span>}
          </div>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>Real reviews from real customers</p>
          <ReviewCarousel reviews={homeReviews} user={user} products={products} orders={orders} onReviewSubmit={onReviewSubmit} />
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={{ background: C.dark, color: "#fff", padding: "clamp(36px,6vw,56px) 24px 32px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 40, marginBottom: 40 }}>
            {/* Brand column */}
            <div>
              {companyLogo
                ? <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <img src={companyLogo} alt="Fresh Market" style={{ height: 44, width: 44, objectFit: "contain", borderRadius: "50%", filter: "brightness(0) invert(1)" }} />
                    <span className="serif" style={{ fontSize: 22, fontWeight: 700, color: C.sprout }}>Fresh Market</span>
                  </div>
                : <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <img src="/logo.jpeg" alt="Fresh Market" style={{ height: 44, width: 44, objectFit: "contain", borderRadius: "50%", filter: "brightness(0) invert(1)" }} />
                    <span className="serif" style={{ fontSize: 22, fontWeight: 700, color: C.sprout }}>Fresh Market</span>
                  </div>
              }
              <p style={{ color: "rgba(255,255,255,.55)", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                Freshly harvested sprouts, mushrooms &amp; organic produce. Cultivated naturally, delivered daily.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                  { label: "WhatsApp", path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.849L0 24l6.335-1.661A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.028-1.385l-.36-.214-3.742.981 1.001-3.65-.234-.374A9.778 9.778 0 0 1 2.182 12c0-5.419 4.4-9.818 9.818-9.818 5.419 0 9.818 4.399 9.818 9.818S17.419 21.818 12 21.818z" },
                ].map(({ label, path }) => (
                  <div key={label} className="social-btn" title={label}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={path} /></svg>
                  </div>
                ))}
              </div>
            </div>
            {/* Contact column */}
            <div>
              <p style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 18 }}>Contact Us</p>
              {[
                ["📍", "Address", "123 Local Market Road, Your City"],
                ["✉️", "Email", "contact@example.com"],
                ["🕐", "Hours", "Mon–Sat: 8 AM – 8 PM"],
              ].map(([icon, label, value]) => (
                <div key={label} style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, width: 20, textAlign: "center", paddingTop: 1 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 2 }}>{label}</p>
                    <p style={{ color: "rgba(255,255,255,.75)", fontSize: 13, lineHeight: 1.6 }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Quick links column */}
            <div>
              <p style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 16 }}>Quick Links</p>
              {[
                { label: "Home", action: () => { navigate("home"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
                { label: "Products", action: () => { navigate("home"); setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }), 100); } },
                { label: "Flash Deals", action: () => { navigate("home"); setTimeout(() => document.getElementById("flash")?.scrollIntoView({ behavior: "smooth" }), 100); } },
                { label: "My Orders", action: () => navigate("orders") },
                { label: "About Us", action: () => { navigate("home"); setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 100); } },
              ].map(({ label, action }) => (
                <button key={label} className="footer-link" onClick={action}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>© 2026 Fresh Market. Built by the Store Team.</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Grown and made with care · Delivered with love · Coimbatore, TN</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ORDERS PAGE
   ═══════════════════════════════════════════════════════════ */
function OrdersPage({ orders, loading, onReorder, onReport }) {
  const [filter, setFilter] = useState("All");
  const [reportOrder, setReportOrder] = useState(null);
  const filtered = filter === "All" ? orders : orders.filter(o => o.status === filter);
  return (
    <div className="sec">
      <h2 className="serif" style={{ fontSize: "clamp(22px,5vw,28px)", fontWeight: 700, marginBottom: 4 }}>My Orders</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 22 }}>Track your deliveries and reorder your favourites</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {["All", ...STAGES].map(s => (
          <button key={s} className="btn btn-sm" onClick={() => setFilter(s)}
            style={{ borderRadius: 50, border: `1.5px solid ${filter === s ? C.leaf : C.border}`, background: filter === s ? C.leaf : "#fff", color: filter === s ? "#fff" : C.text, fontWeight: filter === s ? 600 : 400 }}>
            {s}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : filtered.length === 0
        ? <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.3" strokeLinecap="round" style={{ margin: "0 auto 16px", display: "block" }}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <p style={{ fontWeight: 600 }}>No orders here yet</p>
        </div>
        : filtered.map(order => (
          <div key={order.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: "clamp(14px,3vw,20px)", marginBottom: 14 }} className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>Order #{order.id.slice(0, 8).toUpperCase()}</p>
                <p style={{ fontSize: 12, color: C.muted }}>{timeAgo(order.timestamp)} · {order.items.length} items · {order.pay_method?.toUpperCase()}</p>
              </div>
              <span className={`badge ${order.status === "Completed" ? "bg-green" : order.status === "Preparing" ? "bg-orange" : order.status === "Accepted" ? "bg-gold" : "bg-blue"}`}>{order.status}</span>
            </div>
            <StageTracker stage={STAGES.indexOf(order.status)} />
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f5f5f5" }}>
              {order.items.slice(0, 3).map(i => <div key={i.id} style={{ fontSize: 13, color: C.muted, marginBottom: 3 }}>• {i.name} × {i.qty} — {fmtPrice(i.price * i.qty)}</div>)}
              {order.items.length > 3 && <div style={{ fontSize: 13, color: C.muted }}>+ {order.items.length - 3} more</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid #f5f5f5", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontFamily: "Playfair Display,serif", fontWeight: 700, fontSize: 17, color: C.leaf }}>{fmtPrice(order.total)}</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {order.status === "Completed" && (
                  <>
                    <button className="btn btn-s btn-sm" onClick={() => onReorder(order)}>Reorder</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setReportOrder(order)}>Report Issue</button>
                  </>
                )}
              </div>
            </div>
            {order.address && (
              <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                Delivering to: {order.address.houseNo}, {order.address.street}, {order.address.area}, {order.address.city} — {order.address.pincode}
              </p>
            )}
          </div>
        ))
      }
      {reportOrder && <QualityReportModal order={reportOrder} onClose={() => setReportOrder(null)} onSubmit={onReport} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROFILE PAGE
   ═══════════════════════════════════════════════════════════ */
function ProfilePage({ user, onLogout, onUpdate }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || "", houseNo: user.address?.houseNo || "", street: user.address?.street || "", area: user.address?.area || "", city: user.address?.city || "Thanjavur", state: user.address?.state || "Tamil Nadu", pincode: user.address?.pincode || "" });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setLoading(true);
    try {
      const updated = await authApi.update({ name: form.name, phone: form.phone, address: { houseNo: form.houseNo, street: form.street, area: form.area, city: form.city, state: form.state, pincode: form.pincode } });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="sec" style={{ maxWidth: 560 }}>
      <h2 className="serif" style={{ fontSize: "clamp(22px,5vw,28px)", fontWeight: 700, marginBottom: 24 }}>My Profile</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, padding: 20, background: "#fff", borderRadius: 16, border: `1px solid ${C.border}` }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${C.leaf},${C.leafLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 20, fontFamily: "Playfair Display,serif", flexShrink: 0 }}>
          {user.name[0].toUpperCase()}
        </div>
        <div><p style={{ fontWeight: 600, fontSize: 16 }}>{user.name}</p><p style={{ fontSize: 13, color: C.muted }}>{user.email}</p></div>
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: C.leaf, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Personal Details</p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14, marginBottom: 20 }}>
        <div><label className="lbl">Full Name</label><input className="inp" value={form.name} onChange={upd("name")} /></div>
        <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={upd("phone")} /></div>
        <div style={{ gridColumn: "1/-1" }}><label className="lbl">Email</label><input className="inp" type="email" value={form.email} readOnly style={{ opacity: .7 }} /></div>
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: C.leaf, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Default Address</p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14, marginBottom: 20 }}>
        <div><label className="lbl">House / Flat No.</label><input className="inp" value={form.houseNo} onChange={upd("houseNo")} /></div>
        <div><label className="lbl">Street</label><input className="inp" value={form.street} onChange={upd("street")} /></div>
        <div><label className="lbl">Area</label><input className="inp" value={form.area} onChange={upd("area")} /></div>
        <div><label className="lbl">Pincode</label><input className="inp" value={form.pincode} onChange={upd("pincode")} /></div>
        <div><label className="lbl">City</label><input className="inp" value={form.city} onChange={upd("city")} /></div>
        <div><label className="lbl">State</label><input className="inp" value={form.state} onChange={upd("state")} /></div>
      </div>
      {saved && <div style={{ background: "#dcf5e7", color: "#1a5c36", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Profile updated successfully.</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-p" onClick={save} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</button>
        <button className="btn btn-s" style={{ color: C.terracotta, borderColor: C.terracotta }} onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function AdminDashboard({ products, orders, offers, flashDeals, companyLogo, ratingMode, categories,
  onUpdateProducts, onUpdateOrders, onUpdateOffers, onUpdateFlashDeals, onUpdateLogo, onRatingModeChange, onUpdateCategories, onExit, onRefresh }) {
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const NAV_ITEMS = [
    ["overview", "Overview", "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"],
    ["orders", "Orders", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"],
    ["products", "Products", "M4 6h16M4 12h16M4 18h7"],
    ["categories", "Categories", "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"],
    ["flash", "Flash Deals", "M13 10V3L4 14h7v7l9-11h-7z"],
    ["offers", "Offers", "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"],
    ["ratings", "Ratings", "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"],
    ["branding", "Branding", "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"],
  ];
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 199 }} onClick={() => setSidebarOpen(false)} />}
      <div className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: C.sprout }}>Store Admin</div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>Management Dashboard</p>
        </div>
        <nav style={{ flex: 1, padding: "12px 0" }}>
          {NAV_ITEMS.map(([id, label, path]) => (
            <div key={id} className={`admin-nav-item ${tab === id ? "active" : ""}`} onClick={() => { setTab(id); setSidebarOpen(false); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
              {label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <button className="btn" style={{ width: "100%", background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.7)", borderRadius: 8, padding: "10px 0", fontSize: 13, border: "none" }} onClick={onExit}>
            ← Exit to Store
          </button>
        </div>
      </div>
      <div style={{ flex: 1, background: "#f8f9fa", overflowY: "auto", minWidth: 0 }}>
        <div style={{ padding: "16px clamp(16px,4vw,32px)", borderBottom: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="ham" onClick={() => setSidebarOpen(s => !s)} style={{ display: "flex" }}>
              <span className="ham-line" /><span className="ham-line" /><span className="ham-line" />
            </button>
            <div>
              <h1 style={{ fontFamily: "Playfair Display,serif", fontSize: "clamp(16px,3vw,22px)", fontWeight: 700 }}>
                {NAV_ITEMS.find(n => n[0] === tab)?.[1]}
              </h1>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Store Management System</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="badge bg-green">Admin</span>
            <button className="btn btn-sm" style={{ background: C.warm, border: "none", borderRadius: 8, color: C.muted }} onClick={onRefresh}>↻ Refresh</button>
          </div>
        </div>
        <div style={{ padding: "clamp(16px,3vw,28px) clamp(16px,4vw,32px)" }}>
          {tab === "overview" && <AdminOverview products={products} orders={orders} totalRevenue={totalRevenue} />}
          {tab === "orders" && <AdminOrders orders={orders} onUpdateOrders={onUpdateOrders} />}
          {tab === "products" && <AdminProducts products={products} categories={categories} onUpdateProducts={onUpdateProducts} ratingMode={ratingMode} />}
          {tab === "categories" && <AdminCategories categories={categories} onUpdateCategories={onUpdateCategories} onRefresh={onRefresh} />}
          {tab === "flash" && <AdminFlash products={products} flashDeals={flashDeals} onUpdateFlashDeals={onUpdateFlashDeals} />}
          {tab === "offers" && <AdminOffers offers={offers} onUpdateOffers={onUpdateOffers} />}
          {tab === "ratings" && <AdminRatings products={products} ratingMode={ratingMode} onModeChange={onRatingModeChange} onUpdateProducts={onUpdateProducts} />}
          {tab === "branding" && <AdminBranding companyLogo={companyLogo} onUpdateLogo={onUpdateLogo} />}
        </div>
      </div>
    </div>
  );
}

function AdminOverview({ products, orders, totalRevenue }) {
  const stats = [
    ["Total Revenue", `₹${totalRevenue.toLocaleString("en-IN")}`, C.leaf, "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"],
    ["Total Orders", orders.length, "#1d4ed8", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"],
    ["Products Listed", products.length, C.leafMid, "M4 6h16M4 12h16M4 18h7"],
    ["Out of Stock", products.filter(p => p.stock === 0).length, "#c2410c", "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"],
    ["Pending Orders", orders.filter(o => o.status !== "Completed").length, "#92600a", "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"],
  ];
  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16, marginBottom: 28 }}>
        {stats.map(([label, val, color, path]) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "20px 18px", borderTop: `3px solid ${color}` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" style={{ marginBottom: 10 }}><path d={path} /></svg>
            <div style={{ fontFamily: "Playfair Display,serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: .5, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
      <h3 style={{ fontFamily: "Playfair Display,serif", fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Recent Orders</h3>
      {orders.slice(0, 6).map(o => (
        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>#{o.id.slice(0, 8).toUpperCase()}</p>
            <p style={{ fontSize: 12, color: C.muted }}>{o.items.length} items · {timeAgo(o.timestamp)}</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: C.leaf }}>{fmtPrice(o.total)}</span>
            <span className={`badge ${o.status === "Completed" ? "bg-green" : o.status === "Preparing" ? "bg-orange" : o.status === "Accepted" ? "bg-gold" : "bg-blue"}`}>{o.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminOrders({ orders, onUpdateOrders }) {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? orders : orders.filter(o => o.status === filter);
  const advance = async (id, currentStatus) => {
    const idx = STAGES.indexOf(currentStatus);
    const next = STAGES[Math.min(idx + 1, 3)];
    try {
      const updated = await ordersApi.advanceStatus(id, next);
      onUpdateOrders(orders.map(o => o.id === id ? updated : o));
    } catch (e) {
      alert(e.message);
    }
  };
  return (
    <div className="fade-in">
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["All", ...STAGES].map(s => (
          <button key={s} className="btn btn-sm" onClick={() => setFilter(s)}
            style={{ borderRadius: 50, border: `1.5px solid ${filter === s ? C.leaf : C.border}`, background: filter === s ? C.leaf : "#fff", color: filter === s ? "#fff" : C.text }}>
            {s} {s !== "All" && `(${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>
      {filtered.map(order => (
        <div key={order.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "clamp(14px,3vw,20px)", marginBottom: 14 }} className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>#{order.id.slice(0, 8).toUpperCase()}</p>
              <p style={{ fontSize: 12, color: C.muted }}>{timeAgo(order.timestamp)} · {order.items.length} items · {order.pay_method}</p>
              {order.address && <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {order.address.houseNo}, {order.address.street}, {order.address.area}, {order.address.city} — {order.address.pincode}
              </p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <span className={`badge ${order.status === "Completed" ? "bg-green" : order.status === "Preparing" ? "bg-orange" : order.status === "Accepted" ? "bg-gold" : "bg-blue"}`}>{order.status}</span>
              <p style={{ fontWeight: 700, color: C.leaf, marginTop: 6 }}>{fmtPrice(order.total)}</p>
            </div>
          </div>
          <div style={{ background: "#fafafa", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
            {order.items.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span>{i.name} × {i.qty}</span><span style={{ color: C.leaf, fontWeight: 500 }}>{fmtPrice(i.price * i.qty)}</span>
            </div>)}
          </div>
          {order.status !== "Completed" && (
            <button className="btn btn-p btn-sm" onClick={() => advance(order.id, order.status)}>
              Move to {STAGES[STAGES.indexOf(order.status) + 1]} →
            </button>
          )}
        </div>
      ))}
      {filtered.length === 0 && <p style={{ color: C.muted, textAlign: "center", padding: "60px 0" }}>No orders in this category</p>}
    </div>
  );
}

function AdminProducts({ products, categories, onUpdateProducts, ratingMode }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const blank = { name: "", category: categories[0]?.name || "Soups", price: "", stock: "", unit: "250g", description: "", image_url: null, images: [], popular: false, clearance: false, clearance_price: "", orderable: true, rating: 4.5, review_count: 0, benefits_en: "", benefits_ta: "" };
  const [form, setForm] = useState(blank);
  const upd = k => e => setForm(f => ({ ...f, [k]: typeof e === "object" && e.target ? e.target.value : e }));
  const fileRef = useRef();
  const imgSlotRef = useRef(null);
  const [benefitsLang, setBenefitsLang] = useState("en");

  const handleImage = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      const slot = imgSlotRef.current;
      if (slot !== null && slot !== undefined) {
        setForm(f => {
          const imgs = [...(f.images || [])];
          if (slot < imgs.length) imgs[slot] = dataUrl;
          else imgs.push(dataUrl);
          return { ...f, images: imgs, image_url: imgs[0] || null };
        });
        imgSlotRef.current = null;
      } else {
        setForm(f => ({ ...f, image_url: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setForm(f => {
      const imgs = [...(f.images || [])].filter((_, i) => i !== idx);
      return { ...f, images: imgs, image_url: imgs[0] || null };
    });
  };

  const uploadToSlot = (slot) => {
    imgSlotRef.current = slot;
    fileRef.current?.click();
  };

  const save = async () => {
    if (!form.name || !form.price) return alert("Name and price are required.");
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), clearance_price: Number(form.clearance_price) || 0, popular: !!form.popular, clearance: !!form.clearance, orderable: !!form.orderable, images_json: form.images || [], benefits_en: form.benefits_en || "", benefits_ta: form.benefits_ta || "" };
      if (editing) {
        const updated = await productsApi.update(editing, payload);
        onUpdateProducts(products.map(x => x.id === editing ? updated : x));
      } else {
        const created = await productsApi.create(payload);
        onUpdateProducts([...products, created]);
      }
      setShowForm(false); setEditing(null); setForm(blank);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = p => { setForm({ ...p, price: String(p.price), stock: String(p.stock), clearance_price: String(p.clearance_price || ""), orderable: p.orderable !== false, images: p.images || [], benefits_en: p.benefits_en || "", benefits_ta: p.benefits_ta || "" }); setEditing(p.id); setShowForm(true); setBenefitsLang("en"); };
  const del = async id => {
    if (!confirm("Delete this product?")) return;
    await productsApi.delete(id);
    onUpdateProducts(products.filter(p => p.id !== id));
  };
  const toggleClearance = async id => {
    const updated = await productsApi.toggleClearance(id);
    onUpdateProducts(products.map(p => p.id === id ? updated : p));
  };
  const toggleOrderable = async id => {
    const updated = await productsApi.toggleOrderable(id);
    onUpdateProducts(products.map(p => p.id === id ? updated : p));
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "Playfair Display,serif", fontSize: 22, fontWeight: 700 }}>Products</h2>
        <button className="btn btn-p" onClick={() => { setForm({ ...blank, category: categories[0]?.name || "Soups" }); setEditing(null); setShowForm(true); }}>+ Add Product</button>
      </div>
      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "clamp(16px,3vw,24px)", marginBottom: 22 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 18, fontSize: 16 }}>{editing ? "Edit Product" : "New Product"}</h3>
          <div style={{ marginBottom: 18 }}>
            <label className="lbl">Product Images (2–4 recommended)</label>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Upload multiple angles. First image is the main cover photo.</p>
            <div className="img-grid">
              {[0, 1, 2, 3].map(slot => {
                const src = (form.images || [])[slot];
                return (
                  <div key={slot} className={`img-slot ${src ? "filled" : ""}`} onClick={() => !src && uploadToSlot(slot)}>
                    {src ? (
                      <>
                        <img src={src} alt={`Image ${slot + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                        <button className="img-slot-remove" onClick={e => { e.stopPropagation(); removeImage(slot); }}>×</button>
                        {slot === 0 && <span style={{ position: "absolute", bottom: 4, left: 4, background: C.leaf, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 50, zIndex: 5 }}>MAIN</span>}
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        <span className="img-slot-label">{slot === 0 ? "Main" : `Angle ${slot + 1}`}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: "none" }} onChange={handleImage} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14, marginBottom: 14 }}>
            <div><label className="lbl">Name *</label><input className="inp" value={form.name} onChange={upd("name")} placeholder="Product name" /></div>
            <div><label className="lbl">Category</label>
              <select className="inp" value={form.category} onChange={upd("category")}>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="lbl">Price (₹) *</label><input className="inp" type="number" value={form.price} onChange={upd("price")} /></div>
            <div><label className="lbl">Stock Quantity</label><input className="inp" type="number" value={form.stock} onChange={upd("stock")} /></div>
            <div><label className="lbl">Unit</label><input className="inp" value={form.unit} onChange={upd("unit")} placeholder="250g" /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" id="pop" checked={form.popular} onChange={e => setForm(f => ({ ...f, popular: e.target.checked }))} /><label style={{ fontSize: 13, margin: 0 }} htmlFor="pop">Mark as Popular</label></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" id="clr" checked={form.clearance} onChange={e => setForm(f => ({ ...f, clearance: e.target.checked }))} /><label style={{ fontSize: 13, margin: 0 }} htmlFor="clr">Clearance Sale</label></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" id="ord" checked={form.orderable} onChange={e => setForm(f => ({ ...f, orderable: e.target.checked }))} /><label style={{ fontSize: 13, margin: 0, color: form.orderable ? C.leaf : C.muted, fontWeight: 600 }} htmlFor="ord">{form.orderable ? "🛒 For Sale (Add to Cart)" : "👁 Display Only"}</label></div>
            </div>
          </div>
          {form.clearance && (
            <div style={{ marginBottom: 14 }}><label className="lbl">Clearance Price (₹)</label><input className="inp" type="number" value={form.clearance_price} onChange={upd("clearance_price")} placeholder="Discounted price" style={{ borderColor: C.gold }} /></div>
          )}
          <div style={{ marginBottom: 16 }}><label className="lbl">Description</label><textarea className="inp" rows={2} value={form.description} onChange={upd("description")} placeholder="Short product description…" /></div>
          {/* ── Benefits Bilingual Editor ── */}
          <div style={{ marginBottom: 18 }}>
            <label className="lbl" style={{ marginBottom: 8 }}>Benefits of this (Bilingual)</label>
            <div className="benefits-editor-tabs">
              <button className={`benefits-editor-tab ${benefitsLang === "en" ? "active" : ""}`} onClick={() => setBenefitsLang("en")}>
                🇬🇧 English
              </button>
              <button className={`benefits-editor-tab ${benefitsLang === "ta" ? "active" : ""}`} onClick={() => setBenefitsLang("ta")}>
                🇮🇳 தமிழ் (Tamil)
              </button>
            </div>
            <div style={{ border: `1.5px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 14, background: "#fff" }}>
              {benefitsLang === "en" ? (
                <>
                  <textarea className="inp benefits-textarea-en" rows={4} value={form.benefits_en} onChange={upd("benefits_en")} placeholder="e.g. Rich in Vitamin C, boosts immunity, aids digestion…" style={{ border: "none", padding: 0, resize: "vertical" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span className="lang-pill">🇬🇧 English</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{(form.benefits_en || "").length} chars</span>
                  </div>
                </>
              ) : (
                <>
                  <textarea className="inp benefits-textarea-ta" rows={4} value={form.benefits_ta} onChange={upd("benefits_ta")} placeholder="எ.கா: வைட்டமின் சி நிறைந்தது, நோய் எதிர்ப்பு சக்தியை அதிகரிக்கும்…" style={{ border: "none", padding: 0, resize: "vertical" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span className="lang-pill">🇮🇳 தமிழ்</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{(form.benefits_ta || "").length} chars</span>
                  </div>
                </>
              )}
            </div>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>💡 Write benefits in both languages so all customers can understand. Tamil text uses Noto Sans Tamil font for clean rendering.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-p" onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update Product" : "Save Product"}</button>
            <button className="btn btn-s" onClick={() => { setShowForm(false); setForm(blank); }}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,280px),1fr))", gap: 16 }}>
        {products.map(p => (
          <div key={p.id} style={{ background: "#fff", border: `1px solid ${p.orderable ? "#e5e7eb" : "#fde68a"}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ height: 140, position: "relative" }}>
              <ProductImageCarousel images={p.images} image_url={p.image_url} name={p.name} height={140} />
              {p.clearance && <span className="badge bg-orange" style={{ position: "absolute", top: 8, left: 8 }}>Clearance</span>}
              {p.stock === 0 && <span className="badge bg-red" style={{ position: "absolute", top: 8, right: 8 }}>Out of Stock</span>}
              {!p.orderable && <span className="badge" style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,.55)", color: "#fff", backdropFilter: "blur(4px)" }}>Display Only</span>}
            </div>
            <div style={{ padding: "14px 16px" }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</p>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span className="badge bg-green" style={{ fontSize: 10 }}>{p.category}</span>
                <span style={{ fontSize: 12, color: C.leaf, fontWeight: 700 }}>{fmtPrice(p.price)}</span>
                <span style={{ fontSize: 12, color: C.muted }}>Stock: {p.stock}</span>
                <span className="badge" style={{ fontSize: 9, padding: "2px 8px", background: p.orderable ? "#dcf5e7" : "#fef3c7", color: p.orderable ? "#1a5c36" : "#92600a" }}>
                  {p.orderable ? "🛒 For Sale" : "👁 View Only"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="btn btn-s btn-sm" style={{ flex: 1, fontSize: 12 }} onClick={() => openEdit(p)}>Edit</button>
                <button className="btn btn-sm" style={{ flex: 1, fontSize: 12, background: p.orderable ? "#dcf5e7" : "#fef3c7", color: p.orderable ? "#1a5c36" : "#92600a", border: "none", borderRadius: 8 }} onClick={() => toggleOrderable(p.id)}>
                  {p.orderable ? "Set Display Only" : "Enable Sale"}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => del(p.id)} style={{ fontSize: 12 }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ADMIN CATEGORIES ────────────────────────────────────── */
function AdminCategories({ categories, onUpdateCategories, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const blank = { name: "", description: "", orderable: true, sort_order: 0 };
  const [form, setForm] = useState(blank);

  const save = async () => {
    if (!form.name?.trim()) return alert("Category name is required.");
    setSaving(true);
    try {
      if (editing) {
        const updated = await categoriesApi.update(editing, form);
        onUpdateCategories(categories.map(c => c.id === editing ? updated : c));
      } else {
        const created = await categoriesApi.create(form);
        onUpdateCategories([...categories, created]);
      }
      setShowForm(false); setEditing(null); setForm(blank);
      // Refresh products since orderable may have cascaded
      onRefresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = c => {
    setForm({ name: c.name, description: c.description || "", orderable: c.orderable, sort_order: c.sort_order || 0 });
    setEditing(c.id);
    setShowForm(true);
  };

  const del = async (id) => {
    if (!confirm("Delete this category? This will also delete ALL products in this category.")) return;
    try {
      await categoriesApi.delete(id);
      onUpdateCategories(categories.filter(c => c.id !== id));
      onRefresh();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "Playfair Display,serif", fontSize: 22, fontWeight: 700 }}>Categories</h2>
        <button className="btn btn-p" onClick={() => { setForm(blank); setEditing(null); setShowForm(true); }}>+ Add Category</button>
      </div>

      {/* Info banner */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: "#1a5c36", lineHeight: 1.6 }}>
          <strong>💡 Orderable vs Display Only:</strong> Categories marked as "For Sale" allow customers to add products to their cart. "Display Only" categories showcase products without ordering.
          Changing a category's orderable status updates all its products automatically.
        </p>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "clamp(16px,3vw,24px)", marginBottom: 22 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 18, fontSize: 16 }}>{editing ? "Edit Category" : "New Category"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label className="lbl">Category Name *</label><input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Soups, Sprouts, Juices…" /></div>
            <div><label className="lbl">Sort Order</label><input className="inp" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} placeholder="0" /></div>
            <div style={{ gridColumn: "1/-1" }}><label className="lbl">Description</label><textarea className="inp" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What this category is about…" /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, padding: "14px 18px", background: form.orderable ? "#dcf5e7" : "#fef3c7", borderRadius: 12, border: `1.5px solid ${form.orderable ? "#bbf7d0" : "#fde68a"}` }}>
            <input type="checkbox" id="cat-ord" checked={form.orderable} onChange={e => setForm(f => ({ ...f, orderable: e.target.checked }))} style={{ width: 18, height: 18, accentColor: C.leaf }} />
            <div>
              <label htmlFor="cat-ord" style={{ fontSize: 14, fontWeight: 700, color: form.orderable ? "#1a5c36" : "#92600a", cursor: "pointer", display: "block" }}>
                {form.orderable ? "🛒 For Sale — Add to Cart enabled" : "👁 Display Only — No ordering"}
              </label>
              <p style={{ fontSize: 12, color: form.orderable ? "#15803d" : "#a16207", marginTop: 2 }}>
                {form.orderable ? "Customers can order products from this category" : "Products will be visible but customers cannot order them"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-p" onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update Category" : "Save Category"}</button>
            <button className="btn btn-s" onClick={() => { setShowForm(false); setForm(blank); setEditing(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))", gap: 16 }}>
        {categories.map(cat => (
          <div key={cat.id} style={{ background: "#fff", border: `1.5px solid ${cat.orderable ? "#bbf7d0" : "#fde68a"}`, borderRadius: 16, padding: 20, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "Playfair Display,serif", marginBottom: 4 }}>{cat.name}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{cat.description || "No description"}</p>
              </div>
              <span className="badge" style={{ fontSize: 11, padding: "4px 12px", background: cat.orderable ? "#dcf5e7" : "#fef3c7", color: cat.orderable ? "#1a5c36" : "#92600a", flexShrink: 0 }}>
                {cat.orderable ? "🛒 For Sale" : "👁 Display Only"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Sort: {cat.sort_order || 0}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-s btn-sm" style={{ flex: 1 }} onClick={() => openEdit(cat)}>Edit</button>
              <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => del(cat.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {categories.length === 0 && <p style={{ color: C.muted, textAlign: "center", padding: "60px 0" }}>No categories yet. Create your first category to get started.</p>}
    </div>
  );
}



function AdminFlash({ products, flashDeals, onUpdateFlashDeals }) {
  const [form, setForm] = useState({ productId: products[0]?.id || "", discount: 20, hours: 6 });
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const addDeal = async () => {
    if (!form.productId) return;
    try {
      const deal = await flashApi.create({ product_id: form.productId, discount: form.discount, hours: form.hours });
      onUpdateFlashDeals([...flashDeals, deal]);
    } catch (e) {
      alert(e.message);
    }
  };
  const del = async id => {
    await flashApi.delete(id);
    onUpdateFlashDeals(flashDeals.filter(d => d.id !== id));
  };
  return (
    <div className="fade-in">
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "clamp(16px,3vw,24px)", marginBottom: 22 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>Create Flash Deal</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 14, marginBottom: 14 }}>
          <div><label className="lbl">Product</label>
            <select className="inp" value={form.productId} onChange={upd("productId")}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="lbl">Discount %</label><input className="inp" type="number" value={form.discount} onChange={upd("discount")} min="5" max="70" /></div>
          <div><label className="lbl">Duration (hours)</label><input className="inp" type="number" value={form.hours} onChange={upd("hours")} min="1" max="24" /></div>
        </div>
        <button className="btn btn-p" onClick={addDeal}>Launch Flash Deal</button>
      </div>
      {flashDeals.map(d => {
        const p = products.find(x => x.id === d.product_id);
        if (!p) return null;
        const left = Math.max(0, d.ends_at - Date.now());
        return (
          <div key={d.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 18, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 50, height: 50, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}><ProductImage src={p.image_url} name={p.name} /></div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span className="badge bg-red">{d.discount}% OFF</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{left > 0 ? `Ends in ${fmtCountdown(left)}` : "Expired"}</span>
                </div>
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => del(d.id)}>Remove</button>
          </div>
        );
      })}
    </div>
  );
}

function AdminOffers({ offers, onUpdateOffers }) {
  const [form, setForm] = useState({ title: "", description: "", active: true });
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = async () => {
    if (!form.title) return;
    const o = await offersApi.create(form);
    onUpdateOffers([...offers, o]);
    setForm({ title: "", description: "", active: true });
  };
  const toggle = async o => {
    const updated = await offersApi.update(o.id, { ...o, active: !o.active });
    onUpdateOffers(offers.map(x => x.id === o.id ? updated : x));
  };
  const del = async id => {
    await offersApi.delete(id);
    onUpdateOffers(offers.filter(x => x.id !== id));
  };
  return (
    <div className="fade-in">
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "clamp(16px,3vw,24px)", marginBottom: 22 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>New Offer</h3>
        <div style={{ marginBottom: 12 }}><label className="lbl">Title</label><input className="inp" value={form.title} onChange={upd("title")} placeholder="e.g. Free delivery on ₹200+" /></div>
        <div style={{ marginBottom: 14 }}><label className="lbl">Description</label><input className="inp" value={form.description} onChange={upd("description")} placeholder="Describe the offer…" /></div>
        <button className="btn btn-p" onClick={add}>Save Offer</button>
      </div>
      {offers.map(o => (
        <div key={o.id} style={{ background: "#fff", border: `1px solid ${o.active ? "#bbf7d0" : "#e5e7eb"}`, borderRadius: 14, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ fontWeight: 600 }}>{o.title}</p>
            <p style={{ fontSize: 13, color: C.muted }}>{o.description}</p>
            <span className={`badge ${o.active ? "bg-green" : "bg-gray"}`} style={{ marginTop: 6 }}>{o.active ? "Active" : "Inactive"}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={() => toggle(o)}>{o.active ? "Deactivate" : "Activate"}</button>
            <button className="btn btn-danger btn-sm" onClick={() => del(o.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminRatings({ products, ratingMode, onModeChange, onUpdateProducts }) {
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [editingRating, setEditingRating] = useState({});

  // Load all reviews when in real mode
  useEffect(() => {
    if (ratingMode === "real") {
      setLoadingReviews(true);
      reviewsApi.getAllAdmin()
        .then(setReviews)
        .catch(() => setReviews([]))
        .finally(() => setLoadingReviews(false));
    }
  }, [ratingMode]);

  const toggleMode = async () => {
    const newMode = ratingMode === "curated" ? "real" : "curated";
    try {
      await settingsApi.setRatingMode(newMode);
      onModeChange(newMode);
    } catch (e) { alert(e.message); }
  };

  const saveRating = async (product) => {
    const r = editingRating[product.id] || {};
    const rating = r.rating !== undefined ? r.rating : product.rating;
    const review_count = r.review_count !== undefined ? r.review_count : product.review_count;
    try {
      const updated = await productsApi.update(product.id, { ...product, rating, review_count });
      onUpdateProducts(prev => prev.map(p => p.id === product.id ? updated : p));
      setEditingRating(e => { const n = { ...e }; delete n[product.id]; return n; });
    } catch (e) { alert(e.message); }
  };

  const deleteReview = async (id) => {
    if (!confirm("Delete this review?")) return;
    try {
      await reviewsApi.delete(id);
      setReviews(r => r.filter(x => x.id !== id));
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="fade-in">
      {/* Mode toggle */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "clamp(16px,3vw,24px)", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Rating Mode</h3>
            <p style={{ fontSize: 13, color: C.muted }}>
              {ratingMode === "curated" ? "You manually set ratings per product" : "Ratings are auto-calculated from customer reviews"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: ratingMode === "curated" ? "#f59e0b" : C.muted }}>Curated</span>
            <button className={`rating-toggle ${ratingMode === "real" ? "on" : "off"}`} onClick={toggleMode} />
            <span style={{ fontSize: 13, fontWeight: 600, color: ratingMode === "real" ? "#f59e0b" : C.muted }}>Real Reviews</span>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: ratingMode === "curated" ? "#fef3c7" : "#dbeafe", borderRadius: 10, fontSize: 12, fontWeight: 500 }}>
          <span style={{ color: ratingMode === "curated" ? "#92600a" : "#1e40af" }}>
            {ratingMode === "curated" ? "📝 Curated mode: Edit ratings manually below" : "⭐ Real mode: Ratings come from customer reviews"}
          </span>
        </div>
      </div>

      {/* Curated mode: inline editable table */}
      {ratingMode === "curated" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "clamp(16px,3vw,24px)" }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Product Ratings</h3>
          {products.map(p => {
            const ed = editingRating[p.id] || {};
            const rVal = ed.rating !== undefined ? ed.rating : p.rating;
            const rcVal = ed.review_count !== undefined ? ed.review_count : p.review_count;
            const dirty = ed.rating !== undefined || ed.review_count !== undefined;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</p>
                  <Stars n={rVal} size={13} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: C.muted, display: "block" }}>Rating</label>
                    <input type="number" className="inp" value={rVal} min="0" max="5" step="0.1"
                      style={{ width: 70, padding: "6px 8px", fontSize: 13 }}
                      onChange={e => setEditingRating(prev => ({ ...prev, [p.id]: { ...prev[p.id], rating: Number(e.target.value) } }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: C.muted, display: "block" }}>Reviews</label>
                    <input type="number" className="inp" value={rcVal} min="0"
                      style={{ width: 70, padding: "6px 8px", fontSize: 13 }}
                      onChange={e => setEditingRating(prev => ({ ...prev, [p.id]: { ...prev[p.id], review_count: Number(e.target.value) } }))} />
                  </div>
                  {dirty && <button className="btn btn-sm" style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", marginTop: 12 }}
                    onClick={() => saveRating(p)}>Save</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Real mode: review moderation */}
      {ratingMode === "real" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "clamp(16px,3vw,24px)" }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Customer Reviews ({reviews.length})</h3>
          {loadingReviews ? <Spinner /> : reviews.length === 0
            ? <p style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>No reviews submitted yet</p>
            : reviews.map(r => {
              const prod = products.find(p => p.id === r.product_id);
              return (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${C.border}`, gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{r.user_name}</span>
                      <Stars n={r.rating} size={12} />
                    </div>
                    <p style={{ fontSize: 12, color: "#f59e0b", fontWeight: 500 }}>{prod?.name || "Unknown product"}</p>
                    {r.comment && <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{r.comment}</p>}
                    <p style={{ fontSize: 11, color: C.border, marginTop: 4 }}>{timeAgo(r.created_at)}</p>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteReview(r.id)} style={{ fontSize: 11 }}>Delete</button>
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );
}

function AdminBranding({ companyLogo, onUpdateLogo }) {
  const fileRef = useRef();
  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onUpdateLogo(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="fade-in" style={{ maxWidth: 480 }}>
      <h2 style={{ fontFamily: "Playfair Display,serif", fontSize: 22, fontWeight: 700, marginBottom: 22 }}>Company Branding</h2>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Company Logo</p>
        {companyLogo && (
          <div style={{ marginBottom: 18, padding: 16, background: C.warm, borderRadius: 12, textAlign: "center" }}>
            <img src={companyLogo} alt="Logo preview" style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain", margin: "0 auto" }} />
            <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Current logo</p>
          </div>
        )}
        <div className="logo-upload" onClick={() => fileRef.current?.click()}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 10px", display: "block" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p style={{ fontWeight: 500, fontSize: 14, color: C.leaf }}>Upload Company Logo</p>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>PNG or SVG · transparent background preferred</p>
        </div>
        <input type="file" ref={fileRef} accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        {companyLogo && <button className="btn btn-danger btn-sm" style={{ marginTop: 12 }} onClick={() => onUpdateLogo(null)}>Remove Logo</button>}
        <div style={{ marginTop: 20, padding: "14px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
          <p style={{ fontSize: 13, color: "#1a5c36", lineHeight: 1.6 }}>Your logo appears in the navigation bar, hero section, and footer. Use a high-resolution image (min. 200×80px) with a transparent background.</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT APP
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [page, setPage] = useState("home");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [offers, setOffers] = useState([]);
  const [flashDeals, setFlashDeals] = useState([]);
  const [cart, setCart] = useState([]);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [checkoutPayMethod, setCheckoutPayMethod] = useState("upi");
  const [cartTotals, setCartTotals] = useState({ subtotal: 0, discount: 0, delivery: 30, total: 30 });
  const [toast, setToast] = useState(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [ratingMode, setRatingMode] = useState("curated");
  const [categories, setCategories] = useState([]);
  const [homeReviews, setHomeReviews] = useState([]);

  const showToast = useCallback(msg => { setToast(null); setTimeout(() => setToast(msg), 50); }, []);

  // ── Triple-tap logo → admin access ─────────────────────
  const logoTapRef = useRef({ count: 0, timer: null });

  // ── Scroll shadow ──────────────────────────────────────
  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ── Bootstrap: restore session + load data ─────────────
  useEffect(() => {
    const boot = async () => {
      const [prods, flash, offs, rmode, cats, revs] = await Promise.all([
        productsApi.getAll().catch(() => []),
        flashApi.getActive().catch(() => []),
        offersApi.getAll().catch(() => []),
        settingsApi.getRatingMode().catch(() => ({ mode: "curated" })),
        categoriesApi.getAll().catch(() => []),
        reviewsApi.getAll(20).catch(() => []),
      ]);
      setProducts(prods);
      setFlashDeals(flash);
      setOffers(offs);
      setRatingMode(rmode.mode || "curated");
      setCategories(cats);
      setHomeReviews(revs);
      setAppReady(true);
    };
    boot();
  }, []);

  // ── Load orders when user logs in ─────────────────────
  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    ordersApi.getMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [user]);

  // ── Load all orders for admin ──────────────────────────
  const loadAdminOrders = useCallback(() => {
    ordersApi.getAllOrders().then(setOrders).catch(() => { });
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAdminOrders();
      productsApi.getAll().then(setProducts).catch(() => { });
      flashApi.getAll().then(setFlashDeals).catch(() => { });
      offersApi.getAll().then(setOffers).catch(() => { });
      categoriesApi.getAll().then(setCategories).catch(() => { });
    }
  }, [isAdmin, loadAdminOrders]);

  // ── Navigate helper ────────────────────────────────────
  const navigate = useCallback((target) => {
    setPage(target);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Cart actions ───────────────────────────────────────
  const addToCart = useCallback((product, effectivePrice) => {
    const ep = effectivePrice || product.price;
    setCart(c => {
      const ex = c.find(i => i.id === product.id);
      if (ex) return c.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { id: product.id, qty: 1, effectivePrice: ep }];
    });
    showToast(`Added — ${product.name}`);
  }, [showToast]);

  const updateCart = useCallback((id, qty) => {
    if (qty <= 0) setCart(c => c.filter(i => i.id !== id));
    else setCart(c => c.map(i => i.id === id ? { ...i, qty } : i));
  }, []);

  const handleCheckout = useCallback((payMethod, totals) => {
    setCheckoutPayMethod(payMethod);
    setCartTotals(totals);
    setShowCart(false);
    setShowCheckout(true);
  }, []);

  const placeOrder = useCallback(async ({ address, payMethod, items }) => {
    setCheckoutLoading(true);
    try {
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const discount = subtotal >= 600 ? Math.round(subtotal * 0.1) : 0;
      const delivery = subtotal >= 200 ? 0 : 30;
      const total = subtotal - discount + delivery;
      const order = await ordersApi.place({ items, total, delivery, discount, pay_method: payMethod, address });
      setOrders(o => [order, ...o]);
      setCart([]);
      setShowCheckout(false);
      navigate("home");
      showToast("Order placed successfully!");
    } catch (e) {
      showToast(`Error: ${e.message}`);
    } finally {
      setCheckoutLoading(false);
    }
  }, [navigate, showToast]);

  const reorder = useCallback((order) => {
    order.items.forEach(i => {
      const p = products.find(x => x.id === i.id);
      if (p && p.stock > 0) addToCart(p, i.price);
    });
    setShowCart(true);
    showToast("Items added to cart for reorder");
  }, [products, addToCart, showToast]);

  const handleReport = useCallback(async (report) => {
    try {
      await ordersApi.report(report);
      showToast("Thank you — your report has been submitted");
    } catch {
      showToast("Failed to submit report");
    }
  }, [showToast]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // ── Nav links ──────────────────────────────────────────
  const NAV_LINKS = [
    { label: "Home", action: () => { navigate("home"); } },
    { label: "Shop", action: () => { navigate("home"); setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }), 150); } },
    { label: "Flash Deals", action: () => { navigate("home"); setTimeout(() => document.getElementById("flash")?.scrollIntoView({ behavior: "smooth" }), 150); } },
    { label: "About Us", action: () => { navigate("home"); setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 150); } },
  ];

  // ── Loading screen ─────────────────────────────────────
  if (!appReady) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, flexDirection: "column", gap: 16 }}>
        <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
        <p className="serif" style={{ fontSize: 22, color: C.leaf, fontWeight: 700 }}>Fresh Market</p>
        <p style={{ fontSize: 13, color: C.muted }}>Loading fresh goodness…</p>
      </div>
    );
  }

  // ── Admin view ─────────────────────────────────────────
  if (isAdmin) {
    return (
      <AdminDashboard
        products={products} orders={orders} offers={offers} flashDeals={flashDeals} companyLogo={companyLogo}
        ratingMode={ratingMode} categories={categories}
        onUpdateProducts={setProducts} onUpdateOrders={setOrders} onUpdateOffers={setOffers}
        onUpdateFlashDeals={setFlashDeals} onUpdateLogo={setCompanyLogo}
        onRatingModeChange={setRatingMode} onUpdateCategories={setCategories}
        onExit={() => { setIsAdmin(false); clearToken(); setPage("home"); }}
        onRefresh={() => { loadAdminOrders(); productsApi.getAll().then(setProducts); categoriesApi.getAll().then(setCategories).catch(() => {}); settingsApi.getRatingMode().then(r => setRatingMode(r.mode)).catch(() => {}); }}
      />
    );
  }

  return (
    <div>
      {/* ── NAVIGATION ── */}
      <nav className="nav-sticky" style={{ transition: "box-shadow .3s", boxShadow: navScrolled ? "0 4px 20px rgba(0,0,0,.08)" : "none" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(12px,3vw,24px)", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button onClick={() => navigate("home")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
            <img src={companyLogo || "/logo.jpeg"} alt="Fresh Market" style={{ height: 38, width: 38, objectFit: "contain", borderRadius: "50%" }} />
            <span className="serif" style={{ fontSize: 18, fontWeight: 700, color: C.leaf, whiteSpace: "nowrap" }}>Fresh Market</span>
          </button>
          {/* Desktop Nav */}
          <div className="desktop-nav" style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {NAV_LINKS.filter(l => !l.auth || user).map(link => (
              <button key={link.label} className={`btn nav-item`}
                style={{ background: "none", border: "none", color: C.text, fontWeight: 400, padding: "8px 12px", borderRadius: 8, fontSize: 14 }}
                onClick={link.action}>
                {link.label}
              </button>
            ))}
          </div>
          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="btn" style={{ position: "relative", background: "none", border: `1px solid ${C.border}`, width: 38, height: 38, borderRadius: "50%", color: C.text, fontWeight: 600, fontSize: 14, flexShrink: 0 }}
              onClick={() => setShowCart(true)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
              {cartCount > 0 && <span style={{ position: "absolute", top: -3, right: -3, width: 18, height: 18, background: C.terracotta, color: "#fff", borderRadius: "50%", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
            </button>
            {/* Hamburger */}
            <button className="ham" onClick={() => setMobileMenuOpen(m => !m)}>
              <span className="ham-line" style={{ transform: mobileMenuOpen ? "rotate(45deg) translateY(6px)" : "none" }} />
              <span className="ham-line" style={{ opacity: mobileMenuOpen ? 0 : 1 }} />
              <span className="ham-line" style={{ transform: mobileMenuOpen ? "rotate(-45deg) translateY(-6px)" : "none" }} />
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{ background: "#fff", borderTop: `1px solid ${C.border}`, padding: "12px 16px 20px" }}>
            {NAV_LINKS.filter(l => !l.auth || user).map(link => (
              <button key={link.label} className="btn" style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "12px 8px", fontSize: 16, color: C.text, borderBottom: `1px solid ${C.border}`, borderRadius: 0 }}
                onClick={link.action}>
                {link.label}
              </button>
            ))}
          </div>
        )}
        {/* Category strip */}
        {page === "home" && (
          <div style={{ borderTop: `1px solid ${C.border}`, overflowX: "auto", scrollbarWidth: "none" }}>
            <div style={{ display: "flex", gap: 0, maxWidth: 1120, margin: "0 auto", padding: "0 clamp(12px,3vw,24px)" }}>
              {["All", ...categories.map(c => c.name), "Clearance"].map(c => (
                <button key={c} className="btn" style={{ padding: "8px clamp(10px,2vw,18px)", fontSize: 13, color: C.muted, fontWeight: 400, borderBottom: "2px solid transparent", borderRadius: 0, background: "none", border: "none", transition: "all .2s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.leaf; e.currentTarget.style.borderBottom = `2px solid ${C.leaf}`; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderBottom = "2px solid transparent"; }}
                  onClick={() => {
                    navigate("home");
                    setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }), 100);
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── PAGES ── */}
      {page === "home" && (
        <HomePage
          products={products} onAdd={addToCart} onView={setViewProduct}
          flashDeals={flashDeals} offers={offers} companyLogo={companyLogo}
          navigate={navigate} categories={categories} user={user} orders={orders}
          homeReviews={homeReviews}
          onReviewSubmit={() => { reviewsApi.getAll(20).then(setHomeReviews).catch(() => {}); productsApi.getAll().then(setProducts).catch(() => {}); }}
        />
      )}

      {/* ── MODALS ── */}
      {showCart && <CartDrawer cart={cart} products={products} onClose={() => setShowCart(false)} onUpdate={updateCart} onCheckout={handleCheckout} />}
      {showCheckout && <CheckoutModal cart={cart} products={products} user={user} payMethod={checkoutPayMethod} cartTotals={cartTotals} onClose={() => setShowCheckout(false)} onPlace={placeOrder} loading={checkoutLoading} />}
      {viewProduct && <ProductModal product={viewProduct} onClose={() => setViewProduct(null)} onAdd={addToCart} flashDeal={flashDeals.find(d => d.product_id === viewProduct.id && d.ends_at > Date.now())} ratingMode={ratingMode} user={user} orders={orders} onReviewSubmit={() => { productsApi.getAll().then(setProducts).catch(() => {}); reviewsApi.getAll(20).then(setHomeReviews).catch(() => {}); }} />}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}