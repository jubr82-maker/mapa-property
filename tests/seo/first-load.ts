// Poids du premier affichage d'une page (oct. 2026) : HTML recu, JavaScript
// et CSS references par ce HTML (fichiers du build), ressources
// prechargees. Sert au controle de budget (tests/seo/budget.spec.ts) et a
// la comparaison entre deux builds (scripts/perf/measure-first-load.mts).
import fs from "node:fs";
import path from "node:path";

export type FirstLoad = {
  html: number;
  js: number;
  css: number;
  inlineJs: number;
  inlineCss: number;
  jsFiles: string[];
  cssFiles: string[];
  preloads: string[];
};

export const BUDGET_PAGES = ["/fr", "/fr/biens", "/fr/services/estimer"] as const;

function fileSize(root: string, url: string): number {
  const rel = decodeURIComponent(url.split("?")[0]).replace(/^\/_next\//, "");
  const p = path.join(root, ".next", rel);
  return fs.existsSync(p) ? fs.statSync(p).size : 0;
}

export function measureFirstLoad(html: string, root: string): FirstLoad {
  const jsFiles = [...new Set([...html.matchAll(/<script[^>]*\ssrc="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
  const cssFiles = [...new Set([...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
  const preloads = [...html.matchAll(/<link[^>]*rel="preload"[^>]*>/g)].map((m) => (m[0].match(/(?:href|imageSrcSet)="([^"]+)"/)?.[1] ?? "").split(" ")[0]);
  const inlineJs = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].reduce((n, m) => n + Buffer.byteLength(m[1]), 0);
  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].reduce((n, m) => n + Buffer.byteLength(m[1]), 0);
  return {
    html: Buffer.byteLength(html),
    js: jsFiles.reduce((n, u) => n + fileSize(root, u), 0),
    css: cssFiles.reduce((n, u) => n + fileSize(root, u), 0) + inlineCss,
    inlineJs,
    inlineCss,
    jsFiles,
    cssFiles,
    preloads,
  };
}
