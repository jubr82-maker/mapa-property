// Mesure du premier affichage des pages du budget sur un build local
// (oct. 2026), sans port ni reseau : serveur Next.js en memoire.
// Usage : node --import tsx scripts/perf/measure-first-load.mts [dossier du build]
import path from "node:path";
import { startServerProcess } from "../../tests/seo/server-client";
import { BUDGET_PAGES, measureFirstLoad } from "../../tests/seo/first-load";

const root = path.resolve(process.argv[2] ?? process.cwd());
const server = await startServerProcess(root);
const out: Record<string, unknown> = {};
for (const p of BUDGET_PAGES) {
  const r = await server.request(p);
  const m = measureFirstLoad(r.body, root);
  out[p] = { status: r.status, html: m.html, js: m.js, css: m.css, inlineJs: m.inlineJs, jsFiles: m.jsFiles.length, preloads: m.preloads };
}
console.log(JSON.stringify(out, null, 1));
await server.close();
process.exit(0);
