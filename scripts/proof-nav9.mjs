// scripts/proof-nav9.mjs — NAV9 : bandeau reco mandat exclusif présent
// sur semi-exclusif/simple/autonome/recherche, ABSENT sur exclusif.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "nav9");
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
const RE = /Le mandat exclusif reste notre recommandation/i;
const rows = [];
for (const slug of ["exclusif", "semi-exclusif", "simple", "autonome", "recherche"]) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/fr/mandats/${slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2000);
  const count = await p.getByText(RE).count();
  if (slug === "semi-exclusif" || slug === "exclusif") {
    await p.screenshot({ path: path.join(OUT, `mandat-${slug}.png`), fullPage: true });
  }
  rows.push({ slug, recoBanner: count });
  await p.close();
}
await ctx.close();
await browser.close();
console.table(rows);
const exclusif = rows.find((r) => r.slug === "exclusif");
const others = rows.filter((r) => r.slug !== "exclusif");
const ok = exclusif.recoBanner === 0 && others.every((r) => r.recoBanner >= 1);
console.log(ok ? "NAV9 PROOF: OK ✅ (banni sur exclusif, présent sur les 4 autres)" : "NAV9 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
