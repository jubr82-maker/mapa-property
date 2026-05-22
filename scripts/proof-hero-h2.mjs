import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.join("docs", "qa", "screenshots-hero-h2");
await mkdir(OUT, { recursive: true });

const iphone = { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const mac = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

const b = await chromium.launch();
const log = [];

async function cap(name, device, url, theme) {
  const ctx = await b.newContext(device);
  const p = await ctx.newPage();
  await p.addInitScript((t) => { try { localStorage.setItem("mapa_theme", t); } catch {} }, theme);
  await p.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(OUT, `${name}.png`) });
  // Mesure computed style du h2 sous le H1 (italic + copper)
  const h2 = await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("[data-hero-text] h2"));
    if (!nodes.length) return { found: false };
    const el = nodes[0];
    const cs = getComputedStyle(el);
    return { found: true, color: cs.color, fontStyle: cs.fontStyle, maxWidth: cs.maxWidth, fontWeight: cs.fontWeight, text: el.textContent.slice(0, 50) };
  });
  log.push(`${name} → h2: ${JSON.stringify(h2)}`);
  await ctx.close();
}

await cap("fr-iphone-light", iphone, "/fr", "light");
await cap("fr-iphone-dark", iphone, "/fr", "dark");
await cap("fr-mac-light", mac, "/fr", "light");
await cap("fr-mac-dark", mac, "/fr", "dark");
await cap("en-iphone-light", iphone, "/en", "light");

await b.close();
console.log("=== HERO-H2 PROOF ===");
log.forEach((l) => console.log(l));
