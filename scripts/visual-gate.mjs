// scripts/visual-gate.mjs — GATE VISUEL Playwright (2026-05-17)
//
// CIBLE : serveur LOCAL (Vercel preview = SSO 403, inutilisable headless).
//   pnpm dev --port 3001    ou    pnpm build && pnpm start
//
// USAGE :
//   BASE_URL=http://localhost:3001 AGENT=etape0-baseline SLUG_BIEN=<slug> \
//     node scripts/visual-gate.mjs --smoke --locales=fr --vp=iphone14pro
//
// Flags :
//   --smoke            : 5 routes critiques (sinon matrice 22 routes)
//   --locales=fr,en,de : langues (défaut fr,en,de)
//   --vp=iphone14pro   : restreint le viewport (défaut : iphone + desktop)
//
// Sortie : docs/qa/screenshots-2026-05-17/<AGENT>/<lang_route>/<vp>-<mode>.png
// Échec d'une combinaison = HTTP >=400 OU error-boundary Next visible
// (PAS basé sur networkidle : le Hero a une vidéo bg => networkidle ne
//  retombe jamais. On attend domcontentloaded + settle, puis on juge sur
//  le status HTTP et le texte d'erreur).
// Exit 0 si tout rend, exit 1 si >=1 combinaison KO (GATE FAIL).

import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const AGENT = process.env.AGENT ?? "adhoc";
const SMOKE = process.argv.includes("--smoke");
const arg = (p) => process.argv.find((a) => a.startsWith(p))?.split("=")[1];
const LOCALES = (arg("--locales=") ?? "fr,en,de").split(",");
const VP_FILTER = arg("--vp="); // undefined => tous

const SLUG_BIEN = process.env.SLUG_BIEN ?? "";
const SLUG_BLOG = process.env.SLUG_BLOG ?? "";

const ALL_ROUTES = [
  "/", "/biens", SLUG_BIEN && `/biens/${SLUG_BIEN}`,
  "/off-market", "/off-market/arcova", "/arcova",
  "/mandats/recherche", "/services/estimer", "/services/louer",
  "/services/vendre", "/services/rendement-locatif",
  "/services/marches-actifs", "/services/simulateurs",
  "/villes/luxembourg", "/blog", SLUG_BLOG && `/blog/${SLUG_BLOG}`,
  "/journal", SLUG_BLOG && `/journal/${SLUG_BLOG}`,
  "/contact", "/qui-sommes-nous", "/mentions-acquisition",
  "/legal/mentions-legales",
].filter(Boolean);

// Smoke = jeu validé par Julien pour la baseline ÉTAPE 0
const SMOKE_ROUTES = [
  "/", "/biens", SLUG_BIEN && `/biens/${SLUG_BIEN}`, "/contact", "/journal",
].filter(Boolean);

const ROUTES = SMOKE ? SMOKE_ROUTES : ALL_ROUTES;

let VIEWPORTS = [
  { name: "iphone14pro", ...devices["iPhone 14 Pro"] },
  { name: "desktop1440", viewport: { width: 1440, height: 900 } },
];
if (VP_FILTER) VIEWPORTS = VIEWPORTS.filter((v) => v.name === VP_FILTER);

const MODES = ["light", "dark"];
const OUT_ROOT = path.join("docs", "qa", "screenshots-2026-05-17", AGENT);
const slug = (s) => s.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "") || "home";

const results = [];
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      ...(vp.viewport ? { viewport: vp.viewport } : {}),
      ...(vp.userAgent ? { userAgent: vp.userAgent } : {}),
      ...(vp.deviceScaleFactor ? { deviceScaleFactor: vp.deviceScaleFactor } : {}),
      ...(vp.isMobile ? { isMobile: vp.isMobile, hasTouch: true } : {}),
    });
    for (const mode of MODES) {
      await context.emulateMedia({ colorScheme: mode });
      for (const locale of LOCALES) {
        for (const route of ROUTES) {
          const url = `${BASE_URL}/${locale}${route === "/" ? "" : route}`;
          const page = await context.newPage();
          let status = 0;
          let verdict = "OK";
          let detail = "";
          try {
            const resp = await page.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: 45000,
            });
            status = resp ? resp.status() : 0;
            await page.waitForTimeout(2500); // hydratation/paint
            const errText = await page
              .locator(
                "text=/this page could.?n.?t load|Application error|Internal Server Error|404|500/i",
              )
              .count();
            if (status >= 400) { verdict = "CRASH"; detail = `HTTP ${status}`; }
            else if (errText > 0) { verdict = "CRASH"; detail = "error-boundary"; }
          } catch (e) {
            verdict = "CRASH";
            detail = String(e.message ?? e).split("\n")[0];
          }
          const dir = path.join(OUT_ROOT, slug(`${locale}${route}`));
          await mkdir(dir, { recursive: true });
          try {
            await page.screenshot({
              path: path.join(dir, `${vp.name}-${mode}.png`),
              fullPage: true,
            });
          } catch { /* page peut être inutilisable si crash dur */ }
          results.push({ url, vp: vp.name, mode, status, verdict, detail });
          await page.close();
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const ko = results.filter((r) => r.verdict !== "OK");
console.log(`\n=== GATE ${AGENT} — ${results.length} combinaisons ===`);
for (const r of results) {
  console.log(
    `${r.verdict === "OK" ? "✅" : "❌"} ${r.vp}/${r.mode}  ${r.url}` +
      (r.detail ? `  (${r.detail})` : ""),
  );
}
console.log(`\n${results.length - ko.length}/${results.length} OK, ${ko.length} CRASH`);
process.exit(ko.length ? 1 : 0);
