import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";
const SLUG = "vendre-luxembourg-2026-prix-estimation";
const OUT = "docs/qa/screenshots-2026-05-18/pol2-1";

const browser = await chromium.launch();

// Mac 1440
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(`${BASE}/fr/blog/${SLUG}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// BookletReader paginates by H2. Step through pages until <table> visible.
let tablesFound = 0;
let shotIdx = 0;
const results = [];

for (let step = 0; step < 12; step++) {
  const tables = page.locator(".prose-mapa table");
  const visibleCount = await tables.count();
  // Only consider tables in the currently-translated (visible) page slice.
  for (let i = 0; i < visibleCount; i++) {
    const t = tables.nth(i);
    const box = await t.boundingBox().catch(() => null);
    if (!box || box.width < 10) continue;
    // Is it within viewport horizontally (current slide)?
    if (box.x < -50 || box.x > 1440) continue;
    tablesFound++;
    shotIdx++;
    await t.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(200);
    await t.screenshot({ path: `${OUT}/table-${shotIdx}.png` }).catch(() => {});

    // getComputedStyle on first td of this table
    const styles = await t.evaluate((el) => {
      const td = el.querySelector("td");
      const th = el.querySelector("th");
      const tr = el.querySelector("tbody tr") || el.querySelector("tr");
      const cs = (n) => (n ? getComputedStyle(n) : null);
      const tdc = cs(td);
      const thc = cs(th);
      const trc = cs(tr);
      const tblc = cs(el);
      return {
        tdPaddingLeft: tdc ? parseFloat(tdc.paddingLeft) : null,
        tdPaddingRight: tdc ? parseFloat(tdc.paddingRight) : null,
        tdPaddingTop: tdc ? parseFloat(tdc.paddingTop) : null,
        tdPaddingBottom: tdc ? parseFloat(tdc.paddingBottom) : null,
        tdVerticalAlign: tdc ? tdc.verticalAlign : null,
        thColor: thc ? thc.color : null,
        thTransform: thc ? thc.textTransform : null,
        thWeight: thc ? thc.fontWeight : null,
        thLetterSpacing: thc ? thc.letterSpacing : null,
        trBorderBottom: trc ? trc.borderBottomWidth + " " + trc.borderBottomStyle + " " + trc.borderBottomColor : null,
        tableLayout: tblc ? tblc.tableLayout : null,
        tableWidthPx: el.getBoundingClientRect().width,
        borderCollapse: tblc ? tblc.borderCollapse : null,
        borderSpacing: tblc ? tblc.borderSpacing : null,
      };
    });
    results.push({ table: tablesFound, styles });
  }
  if (tablesFound >= 2) break;
  // advance booklet page (ArrowRight)
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
}

await page.screenshot({ path: `${OUT}/article-page-with-tables.png`, fullPage: false });

console.log("=== POL2-1 PROOF — Mac 1440 ===");
console.log("tables sampled:", tablesFound);
let pass = tablesFound >= 1;
for (const r of results) {
  const s = r.styles;
  const padOK =
    s.tdPaddingLeft >= 12 &&
    s.tdPaddingRight >= 12 &&
    s.tdPaddingTop >= 12 &&
    s.tdPaddingBottom >= 12;
  console.log(`\n-- table #${r.table} --`);
  console.log("  td padding L/R/T/B:", s.tdPaddingLeft, s.tdPaddingRight, s.tdPaddingTop, s.tdPaddingBottom, padOK ? "OK(>=12)" : "FAIL");
  console.log("  td vertical-align :", s.tdVerticalAlign);
  console.log("  th color          :", s.thColor, "weight", s.thWeight, "transform", s.thTransform, "ls", s.thLetterSpacing);
  console.log("  tr border-bottom  :", s.trBorderBottom);
  console.log("  table-layout      :", s.tableLayout, "| width px:", Math.round(s.tableWidthPx), "| collapse:", s.borderCollapse, "| spacing:", s.borderSpacing);
  if (!padOK) pass = false;
  if (s.tableLayout !== "auto" && s.tableLayout !== "fixed") { /* either acceptable but expect auto */ }
  if (s.tdVerticalAlign !== "top") pass = false;
  if (s.borderCollapse !== "separate") pass = false;
}
console.log("\nRESULT:", pass ? "PASS" : "FAIL");

await browser.close();
process.exit(pass ? 0 : 1);
