// scripts/proof-pol1.mjs — POL1 : Turnstile stable (un seul montage,
// pas de flicker, placeholder à dimensions fixes). iPhone 17 Pro Max.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "pol1");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const p = await ctx.newPage();
// Compte les (ré)injections du script Turnstile sur la page.
let scriptInjections = 0;
p.on("request", (r) => {
  if (/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/.test(r.url()))
    scriptInjections++;
});
await p.goto(`${BASE}/fr/contact`, { waitUntil: "domcontentloaded", timeout: 60000 });

// Tag le conteneur Turnstile pour détecter un éventuel re-mount.
async function snap(label) {
  return p.evaluate((lbl) => {
    const host = [...document.querySelectorAll("div")].find(
      (d) => d.style && d.style.minHeight === "65px",
    );
    if (host && !host.dataset.pol1) host.dataset.pol1 = lbl; // 1er tag
    return {
      hostFound: Boolean(host),
      hostTag: host?.dataset.pol1 ?? null,
      hostH: host ? Math.round(host.getBoundingClientRect().height) : 0,
      iframes: document.querySelectorAll(
        'iframe[src*="challenges.cloudflare.com"]',
      ).length,
    };
  }, label);
}

await p.waitForTimeout(1200);
const t0 = await snap("t0");
await p.waitForTimeout(2000);
const t2 = await snap("t2");
await p.waitForTimeout(2000);
const t4 = await snap("t4");
await p.screenshot({ path: path.join(OUT, "turnstile.png"), fullPage: true });
await ctx.close();
await browser.close();

const rows = [t0, t2, t4];
console.log(JSON.stringify({ scriptInjections, t0, t2, t4 }, null, 2));

const ok =
  scriptInjections <= 1 && // script chargé au plus une fois
  rows.every((s) => s.hostFound) &&
  // même conteneur du début à la fin (pas de re-mount) :
  t0.hostTag === "t0" && t2.hostTag === "t0" && t4.hostTag === "t0" &&
  // placeholder réservé dès le départ (>=65px) -> pas de saut :
  rows.every((s) => s.hostH >= 65) &&
  // jamais plus d'un iframe Turnstile :
  rows.every((s) => s.iframes <= 1);
console.log(ok ? "POL1 PROOF: OK ✅ (single mount, no flicker)" : "POL1 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
