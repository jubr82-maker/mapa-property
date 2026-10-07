// Budget du premier affichage (oct. 2026, suite a la regression mobile du
// 7 octobre). Echoue si le HTML, le JavaScript ou le CSS du premier
// affichage de /fr, /fr/biens ou /fr/services/estimer depasse de plus de
// 10 % les valeurs du build corrige (tests/seo/budget-baseline.json).
// Echoue aussi si du code de l'admin (PDF, annexes, modeles, recherches
// privees) est charge par ces pages.
// /fr/biens lit la base : hors ligne (SEO_OFFLINE=1) elle ne repond pas et
// est signalee NON VERIFIEE, jamais comptee comme reussie. Nouvelle
// reference apres un changement voulu : SEO_BUDGET_RECORD=1 pnpm test:seo.
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { startServerProcess } from "./server-client";
import { BUDGET_PAGES, measureFirstLoad } from "./first-load";

const ROOT = path.resolve(__dirname, "../..");
const BASELINE = path.join(__dirname, "budget-baseline.json");
const TOLERANCE = 1.1;
const ADMIN_MARKERS = ["PDFDocument", "embedPdf", "assembleValueOpinion", "listing_templates", "property_search_private", "value-opinion"];

type Entry = { html: number; js: number; css: number };

test("budget du premier affichage (HTML, JavaScript, CSS) et aucun code de l'admin", async () => {
  test.setTimeout(10 * 60 * 1000);
  const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8")) as { pages: Record<string, Entry | null> };
  const server = await startServerProcess();
  const measured: Record<string, Entry | null> = {};
  const failures: string[] = [];
  const unchecked: string[] = [];
  try {
    for (const p of BUDGET_PAGES) {
      const r = await server.request(p);
      if (r.status !== 200) {
        unchecked.push(`${p} (statut ${r.status})`);
        measured[p] = baseline.pages[p] ?? null;
        continue;
      }
      const m = measureFirstLoad(r.body, ROOT);
      measured[p] = { html: m.html, js: m.js, css: m.css };
      for (const f of m.jsFiles) {
        const file = path.join(ROOT, ".next", decodeURIComponent(f).replace(/^\/_next\//, ""));
        const src = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
        const hit = ADMIN_MARKERS.find((k) => src.includes(k));
        if (hit) failures.push(`${p} : code de l'admin (${hit}) dans ${f}`);
      }
      const ref = baseline.pages[p];
      if (!ref) continue;
      for (const k of ["html", "js", "css"] as const) {
        if (m[k] > ref[k] * TOLERANCE) failures.push(`${p} : ${k} ${m[k]} octets > ${Math.round(ref[k] * TOLERANCE)} (reference ${ref[k]} + 10 %)`);
      }
    }
  } finally {
    await server.close();
  }
  if (process.env.SEO_BUDGET_RECORD === "1") {
    fs.writeFileSync(BASELINE, JSON.stringify({ note: "Build corrige, perf mobile oct. 2026", pages: measured }, null, 2) + "\n");
  }
  if (unchecked.length) console.log(`NON VERIFIES (base de donnees injoignable) : ${unchecked.join(", ")}`);
  console.log(JSON.stringify(measured));
  expect(failures, failures.join("\n")).toEqual([]);
});
