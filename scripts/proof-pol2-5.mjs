#!/usr/bin/env node
/**
 * Proof POL2-5 — Audit mobile compact.
 *
 * Mesure body.scrollHeight de /fr sur iPhone 17 Pro Max (440×956, DSR 3),
 * vérifie : 0 overflow horizontal, hauteur des thumbs Insights, homogénéité
 * de la font-size des <h2> de sections. Capture 4 screenshots full-page.
 *
 * Usage : node scripts/proof-pol2-5.mjs [before|after]
 *   - before : écrit /tmp/pol2-5-before.json (référence avant édits)
 *   - after  : écrit screenshots + compare au before, écrit /tmp/pol2-5-after.json
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";

const PHASE = process.argv[2] === "before" ? "before" : "after";
const BASE = "http://localhost:3002/fr";
const SHOT_DIR =
  "docs/qa/screenshots-2026-05-18/pol2-5";

const IPHONE_17_PM = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

const run = async () => {
  mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext(IPHONE_17_PM);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  // Laisse la vidéo hero + images se poser
  await page.waitForTimeout(2500);
  // Scroll complet pour déclencher le lazy-load des <Image> next/image.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 200));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);

  const metrics = await page.evaluate(() => {
    const scrollH = document.body.scrollHeight;
    const docW = document.documentElement.scrollWidth;
    const viewW = window.innerWidth;
    const overflowX = docW > viewW + 1;
    // font-size des <h2> de section (classe t-h2 / t-h2-contrast)
    const h2s = [...document.querySelectorAll("h2")].map((el) => {
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || "").trim().slice(0, 32),
        fontSize: cs.fontSize,
        cls: el.className,
      };
    });
    // Hauteur d'une vignette Insights MAPA (blog teaser) : 1er <img> dans
    // le bloc blog_teaser. On repère par le <section> contenant le titre.
    const blogImgs = [
      ...document.querySelectorAll('a[href*="/blog/"] img'),
    ].map((img) => Math.round(img.getBoundingClientRect().height));
    const featuredImgs = [
      ...document.querySelectorAll(
        'section a[href*="/biens"] img, section a[href*="/off-market/"] img',
      ),
    ].map((img) => Math.round(img.getBoundingClientRect().height));
    return {
      scrollHeight: scrollH,
      docWidth: docW,
      viewWidth: viewW,
      overflowX,
      h2s,
      blogThumbHeights: blogImgs,
      featuredImgHeights: featuredImgs,
    };
  });

  if (PHASE === "before") {
    writeFileSync(
      "/tmp/pol2-5-before.json",
      JSON.stringify(metrics, null, 2),
    );
    console.log("=== BEFORE ===");
    console.log("scrollHeight:", metrics.scrollHeight, "px");
    console.log("overflowX:", metrics.overflowX);
    console.log(
      "h2 font-sizes:",
      [...new Set(metrics.h2s.map((h) => h.fontSize))].join(", "),
    );
    console.log("blog thumb heights:", metrics.blogThumbHeights.join(", "));
    console.log(
      "featured img heights:",
      metrics.featuredImgHeights.join(", "),
    );
    await browser.close();
    return;
  }

  // AFTER : screenshots ciblés (hero / coups-de-cœur / méthode / footer)
  await page.screenshot({
    path: `${SHOT_DIR}/01-hero.png`,
    clip: { x: 0, y: 0, width: 440, height: 956 },
  });
  // Coups de cœur (FeaturedCarousel)
  const featured = page
    .locator("section")
    .filter({ has: page.locator('a[href*="/biens"], a[href*="/off-market/"]') })
    .first();
  if (await featured.count()) {
    await featured.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await featured.screenshot({ path: `${SHOT_DIR}/02-coups-de-coeur.png` });
  }
  // Méthode (ProcessTable) — section contenant "01" "02" "03"
  const method = page
    .locator("section")
    .filter({ hasText: /0\s*1.*0\s*2.*0\s*3/s })
    .first();
  if (await method.count()) {
    await method.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await method.screenshot({ path: `${SHOT_DIR}/03-methode.png` });
  } else {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOT_DIR}/03-methode.png` });
  }
  // Footer : bas de page
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(900);
  await page.screenshot({
    path: `${SHOT_DIR}/04-footer.png`,
    clip: { x: 0, y: 0, width: 440, height: 956 },
  });
  // Full page complète
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${SHOT_DIR}/00-fullpage.png`,
    fullPage: true,
  });

  writeFileSync("/tmp/pol2-5-after.json", JSON.stringify(metrics, null, 2));

  const before = existsSync("/tmp/pol2-5-before.json")
    ? JSON.parse(readFileSync("/tmp/pol2-5-before.json", "utf8"))
    : null;

  console.log("=== AFTER ===");
  console.log("scrollHeight:", metrics.scrollHeight, "px");
  console.log("overflowX:", metrics.overflowX);
  const fs = [...new Set(metrics.h2s.map((h) => h.fontSize))];
  console.log("distinct h2 font-sizes:", fs.join(", "), `(count=${fs.length})`);
  console.log("h2 detail:");
  metrics.h2s.forEach((h) =>
    console.log(`   "${h.text}" -> ${h.fontSize}`),
  );
  console.log("blog thumb heights:", metrics.blogThumbHeights.join(", "));
  console.log(
    "featured img heights:",
    metrics.featuredImgHeights.join(", "),
  );
  if (before) {
    const delta = before.scrollHeight - metrics.scrollHeight;
    const pct = ((delta / before.scrollHeight) * 100).toFixed(1);
    console.log(
      `\n>>> HEIGHT: before=${before.scrollHeight}px  after=${metrics.scrollHeight}px  ` +
        `reduction=${delta}px (${pct}%)`,
    );
  }

  await browser.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
