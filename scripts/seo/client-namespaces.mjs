// Namespaces next-intl lus par des composants client, par point d'entree
// public (oct. 2026, quotas Vercel). Utilise par scripts/seo/test-client-messages.mts
// pour verifier que chaque page recoit exactement ce que ses composants lisent.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, normalize } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const files = new Map();
function walk(d) {
  for (const f of readdirSync(join(root, d))) {
    const p = join(d, f);
    if (statSync(join(root, p)).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f)) files.set(p, readFileSync(join(root, p), "utf8"));
  }
}
for (const d of ["app", "components", "lib"]) walk(d);

const stripLead = (s) => s.replace(/^\s*(\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*/, "");
const isClient = (s) => /^["']use client["']/.test(stripLead(s));
function resolve(imp, from) {
  let base;
  if (imp.startsWith("@/")) base = imp.slice(2);
  else if (imp.startsWith(".")) base = normalize(join(dirname(from), imp));
  else return null;
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) if (files.has(base + ext)) return base + ext;
  return null;
}
const importsOf = (p) => {
  const s = files.get(p) ?? "";
  const specs = [...s.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
  return specs.map((i) => resolve(i, p)).filter(Boolean);
};
const nsOf = (s) => [...s.matchAll(/useTranslations\(\s*["'`]([^"'`.]+)[.'"`]/g)].map((m) => m[1]);

/** Namespaces des composants client atteignables depuis un fichier (sans traverser un autre point d'entree). */
export function clientNamespaces(entry) {
  const out = new Set();
  const seen = new Set();
  const visit = (p, inClient) => {
    const key = p + (inClient ? "#c" : "");
    if (seen.has(key)) return;
    seen.add(key);
    const s = files.get(p) ?? "";
    const client = inClient || isClient(s);
    if (client) for (const ns of nsOf(s)) out.add(ns);
    for (const i of importsOf(p)) visit(i, client);
  };
  visit(entry, false);
  return [...out].sort();
}

/** Points d'entree publics : layout, page 404 et chaque page de app/[locale]. */
export function publicEntries() {
  return [...files.keys()].filter((p) => p.startsWith("app/[locale]") && /(^|\/)(page|layout|not-found)\.tsx$/.test(p)).sort();
}

if (process.argv[1] && process.argv[1].endsWith("client-namespaces.mjs")) {
  for (const e of publicEntries()) {
    const ns = clientNamespaces(e);
    if (ns.length) console.log(`${e}: ${ns.join(", ")}`);
  }
}
