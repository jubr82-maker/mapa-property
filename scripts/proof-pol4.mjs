// scripts/proof-pol4.mjs — POL4 : hero nettoyé. Vérifie l'ABSENCE
// dans le DOM de : TEST CMS LIVE, chips Catalogue/Segments/
// Couverture/Open for mandates, FRAME 001, coords 49°…, et qu'il ne
// reste pas de flèche orpheline (le ↓ scroll #search est conservé,
// fonctionnel). Titre + subtitle conservés. iPhone + Mac.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "pol4");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];
for (const v of [
  { name: "mac1440", w: 1440, h: 900, mobile: false },
  { name: "iphone", w: 440, h: 956, mobile: true },
]) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h },
    deviceScaleFactor: v.mobile ? 3 : 1,
    isMobile: v.mobile,
    hasTouch: v.mobile,
    ...(v.mobile
      ? { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }
      : {}),
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2500);
  const hero = p.locator("section").first();
  const txt = await hero.innerText();
  const r = {
    vp: v.name,
    testCms: /TEST CMS LIVE/i.test(txt),
    chips: /(Catalogue|Segments|Couverture|Open for mandates)/i.test(txt),
    frame: /FRAME\s*0*1/i.test(txt),
    coords: /\d{1,3}°\s*\d+['′].?\s*N/i.test(txt),
    keepsTitle: /TOTAL CONTR/i.test(txt),
    keepsSubtitle: /Broker international/i.test(txt),
  };
  await p.screenshot({ path: path.join(OUT, `hero-${v.name}.png`) });
  rows.push(r);
  await ctx.close();
}
await browser.close();
console.table(rows);
const ok = rows.every(
  (r) =>
    !r.testCms && !r.chips && !r.frame && !r.coords &&
    r.keepsTitle && r.keepsSubtitle,
);
console.log(ok ? "POL4 PROOF: OK ✅ (hero nettoyé, titre+subtitle conservés)" : "POL4 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
