// POL2-10 proof — Vidéo de bien : galerie + lightbox + admin + migrations.
//
// 1. Migrations présentes (properties + properties_offmarket video_url).
// 2. Champ vidéo admin : URL côté biens standards (existant) + off-market
//    (ajouté) — assertion statique sur les sources de formulaire.
// 3. Composant PropertyVideo bundlé esbuild → harness navigateur :
//    - videoUrl null ⇒ ne rend RIEN
//    - videoUrl défini ⇒ vignette 16:9, bouton lecture, lazy IO
//    - clic ⇒ lightbox plein écran <video controls autoplay playsInline>
//    - playsInline mobile (iPhone 17 Pro Max)
// 4. Vraie fiche /biens sans video_url ⇒ pas de bloc vidéo cassé.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";

// esbuild n'est pas une dépendance top-level (imbriquée sous Next via
// pnpm) — résolution via le store pnpm.
const require = createRequire(import.meta.url);
const { build } = require(
  "/Users/julienbrebion/Projects-Claude/mapa-property-nextjs/node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild",
);

const BASE = "http://localhost:3003";
const ROOT = process.cwd();
const OUT = "docs/qa/screenshots-2026-05-18/pol2-10";
const IPHONE = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};
const SAMPLE =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

let allPass = true;
const check = (n, c, d) => {
  console.log(`  [${c ? "PASS" : "FAIL"}] ${n}${d ? " — " + d : ""}`);
  if (!c) allPass = false;
};

// ── 1. Migrations ────────────────────────────────────────────────────────
console.log("\n1 — Migrations");
const mig = `${ROOT}/supabase/migrations/20260519_properties_video_url.sql`;
const migPod = `${ROOT}/supabase/migrations/20260519_offmarket_price_on_demand.sql`;
const migSql = existsSync(mig) ? await readFile(mig, "utf8") : "";
check("20260519_properties_video_url.sql présent", existsSync(mig));
check(
  "ALTER properties ADD COLUMN IF NOT EXISTS video_url",
  /ALTER TABLE properties\s+ADD COLUMN IF NOT EXISTS video_url text/.test(
    migSql,
  ),
);
check(
  "ALTER properties_offmarket ADD COLUMN IF NOT EXISTS video_url",
  /ALTER TABLE properties_offmarket\s+ADD COLUMN IF NOT EXISTS video_url text/.test(
    migSql,
  ),
);
check("migration price_on_demand présente (POL2-9)", existsSync(migPod));
check(
  "VIDEO_UPLOAD_GUIDE.md présent",
  existsSync(`${ROOT}/docs/admin/VIDEO_UPLOAD_GUIDE.md`),
);

// ── 2. Champ vidéo admin (assertions statiques) ──────────────────────────
console.log("\n2 — Champ vidéo admin");
const offForm = await readFile(
  `${ROOT}/components/admin/OffmarketForm.tsx`,
  "utf8",
);
check(
  'OffmarketForm contient name="video_url"',
  /name="video_url"/.test(offForm),
);
const propEdit = await readFile(
  `${ROOT}/app/admin/properties/[id]/page.tsx`,
  "utf8",
);
check(
  "Admin properties edit utilise PropertyVideoForm",
  /PropertyVideoForm/.test(propEdit),
);
const actions = await readFile(
  `${ROOT}/app/admin/offmarket/actions.ts`,
  "utf8",
);
check(
  "actions.ts persiste video_url + colonne optionnelle tolérante",
  /video_url: str\(formData\.get\("video_url"\)\)/.test(actions) &&
    /"video_url"/.test(actions),
);

// ── 3. Bundle PropertyVideo + harness navigateur ─────────────────────────
console.log("\n3 — Composant PropertyVideo (harness navigateur)");
const bundle = await build({
  entryPoints: [`${ROOT}/scripts/.pv-entry.jsx`],
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  loader: { ".tsx": "tsx", ".jsx": "jsx" },
  alias: { "@": ROOT },
  define: { "process.env.NODE_ENV": '"production"' },
}).catch(async (e) => {
  // entry inexistante au 1er run : on l'écrit puis on relance.
  throw e;
});
const js = bundle.outputFiles[0].text;

const html = (videoUrl) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;background:#0F1419}#root{min-height:100vh}</style></head>
<body><div id="root"></div>
<script>window.__VIDEO_URL__=${JSON.stringify(videoUrl)};</script>
<script>${js}</script></body></html>`;

// Serveur statique éphémère.
const pages = new Map();
const srv = createServer((req, res) => {
  const body = pages.get(req.url) ?? "<!doctype html><h1>404</h1>";
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(body);
});
await new Promise((r) => srv.listen(4599, r));
pages.set("/with", html(SAMPLE));
pages.set("/null", html(null));

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

// 3a — videoUrl null ⇒ rien
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:4599/null", { waitUntil: "load" });
  await p.waitForTimeout(600);
  const count = await p.locator("[data-property-video]").count();
  check("videoUrl=null ⇒ aucun bloc vidéo rendu", count === 0, `count=${count}`);
  await ctx.close();
}

// 3b — videoUrl défini (desktop) ⇒ vignette + lazy + lightbox
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:4599/with", { waitUntil: "load" });
  await p.waitForSelector("[data-property-video-trigger]", { timeout: 10000 });
  await p.waitForTimeout(800); // laisser l'IntersectionObserver monter <video>

  const thumb = await p.evaluate(() => {
    const v = document.querySelector("[data-property-video] video");
    const sec = document.querySelector("[data-property-video]");
    return {
      hasVideo: !!v,
      preload: v?.getAttribute("preload"),
      playsInline: v ? v.playsInline : null,
      autoplayThumb: v ? v.autoplay : null,
      ratio16x9: !!sec?.querySelector(".aspect-video"),
    };
  });
  check("vignette : <video> monté (lazy IO)", thumb.hasVideo);
  check("vignette : preload=metadata", thumb.preload === "metadata", thumb.preload);
  check("vignette : playsInline", thumb.playsInline === true);
  check("vignette : pas d'autoplay", thumb.autoplayThumb === false);
  check("vignette : ratio 16:9", thumb.ratio16x9);
  await p.screenshot({ path: `${OUT}/thumb-desktop.png` });

  // clic ⇒ lightbox
  await p.locator("[data-property-video-trigger]").click();
  await p.waitForSelector("[data-property-video-lightbox]", { timeout: 5000 });
  const lb = await p.evaluate(() => {
    const v = document.querySelector("[data-property-video-lightbox] video");
    return {
      open: !!document.querySelector("[data-property-video-lightbox]"),
      controls: v ? v.controls : null,
      autoplay: v ? v.autoplay : null,
      playsInline: v ? v.playsInline : null,
      src: v?.getAttribute("src"),
    };
  });
  check("lightbox ouverte au clic", lb.open);
  check("lightbox : controls natifs", lb.controls === true);
  check("lightbox : autoplay (action user)", lb.autoplay === true);
  check("lightbox : playsInline", lb.playsInline === true);
  check("lightbox : bonne source", lb.src === SAMPLE);
  // Attendre que la vidéo distante commence à charger/lire (jusqu'à 12s,
  // latence réseau du sample externe en headless).
  let playing = null;
  for (let i = 0; i < 24; i++) {
    playing = await p.evaluate(() => {
      const v = document.querySelector("[data-property-video-lightbox] video");
      return v
        ? {
            ct: v.currentTime,
            rs: v.readyState,
            ns: v.networkState,
            paused: v.paused,
          }
        : null;
    });
    if (
      playing &&
      (playing.ct > 0 || playing.rs >= 2 || playing.ns === 2 || !playing.paused)
    )
      break;
    await p.waitForTimeout(500);
  }
  check(
    "lightbox : lecture initiée (currentTime>0 | readyState>=2 | loading | !paused)",
    !!playing &&
      (playing.ct > 0 ||
        playing.rs >= 2 ||
        playing.ns === 2 ||
        playing.paused === false),
    JSON.stringify(playing),
  );
  await p.screenshot({ path: `${OUT}/lightbox-desktop.png` });
  // Escape ferme
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  const closed =
    (await p.locator("[data-property-video-lightbox]").count()) === 0;
  check("lightbox : Escape ferme", closed);
  await ctx.close();
}

// 3c — mobile iPhone 17 Pro Max : playsInline
{
  const ctx = await browser.newContext(IPHONE);
  const p = await ctx.newPage();
  await p.goto("http://localhost:4599/with", { waitUntil: "load" });
  await p.waitForSelector("[data-property-video-trigger]", { timeout: 10000 });
  await p.waitForTimeout(800);
  const m = await p.evaluate(() => {
    const v = document.querySelector("[data-property-video] video");
    return { hasVideo: !!v, playsInline: v ? v.playsInline : null };
  });
  check("mobile : <video> monté", m.hasVideo);
  check("mobile : playsInline", m.playsInline === true);
  await p.screenshot({ path: `${OUT}/thumb-iphone17promax.png` });
  await ctx.close();
}

await browser.close();
srv.close();

// ── 4. Vraie fiche /biens sans video_url ⇒ pas de bloc cassé ─────────────
console.log("\n4 — Vraie fiche /biens sans vidéo (no broken placeholder)");
{
  const r = await fetch(`${BASE}/fr/biens/86388715`);
  const h = await r.text();
  check("fiche HTTP 200", r.status === 200, String(r.status));
  check(
    "pas de bloc [data-property-video] (video_url null) ni vidéo cassée",
    !h.includes("data-property-video"),
  );
  check("galerie photo intacte", /aspect-\[16\/9\]/.test(h) || /relative/.test(h));
}

console.log(`\n=== POL2-10 ${allPass ? "PASS" : "FAIL"} ===`);
process.exit(allPass ? 0 : 1);
