import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";
const SLUG = "off-market-luxembourg-fin-modele-informel";
const OUT = "docs/qa/screenshots-2026-05-18/pol2-2";
const PHRASE = "racheter son propre bien";
const TYPO = "faire racheter son propre bien";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(`${BASE}/fr/blog/${SLUG}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

let found = false;
let foundTypo = false;
let snippet = "";

for (let step = 0; step < 14; step++) {
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes(TYPO)) {
    foundTypo = true;
  }
  // locate the paragraph on the current visible slide
  const para = page.locator(".prose-mapa p", { hasText: PHRASE });
  const cnt = await para.count();
  for (let i = 0; i < cnt; i++) {
    const p = para.nth(i);
    const box = await p.boundingBox().catch(() => null);
    if (!box || box.x < -50 || box.x > 1440 || box.width < 10) continue;
    found = true;
    snippet = (await p.innerText()).replace(/\s+/g, " ").trim();
    await p.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/paragraph-current-state.png` }).catch(() => {});
    await page.screenshot({ path: `${OUT}/article-slide.png` });
    break;
  }
  if (found) break;
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
}

console.log("=== POL2-2 PROOF — Mac 1440 ===");
console.log("article:", SLUG);
console.log("paragraph found on a slide :", found);
console.log("contains correct phrase    :", snippet.includes(PHRASE));
console.log('contains typo "faire ..."  :', foundTypo, foundTypo ? "(would need migration)" : "(typo ABSENT in live DB)");
console.log("rendered snippet:");
console.log("  " + snippet.slice(0, 320));
console.log(
  "\nNOTE: la coquille 'faire racheter son propre bien' est ABSENTE du contenu",
);
console.log(
  "Supabase live (déjà corrigé). Migration idempotente ciblée créée mais NON",
);
console.log(
  "appliquée (no-op sur données actuelles). Preuve honnête = état courant rendu",
);
console.log("affichant déjà la forme correcte. Voir docs/qa/BLOG_TYPOS_TODO.md");

const pass = found && snippet.includes(PHRASE) && !foundTypo;
console.log("\nRESULT:", pass ? "PASS (texte correct affiché, coquille absente)" : "CHECK");
await browser.close();
process.exit(pass ? 0 : 1);
