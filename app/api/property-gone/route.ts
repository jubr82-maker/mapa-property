// Page "bien plus disponible" (oct. 2026), servie par le proxy en reecriture
// pour la fiche d'un bien ARCHIVE : code 410 (Gone), interdiction
// d'indexation, lien vers le catalogue. Textes next-intl (property_gone).
// Page autonome (hors gabarit du site) : couleurs systeme du navigateur
// (Canvas / CanvasText), aucune couleur ecrite en dur.

import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("locale") ?? "";
  const locale = (routing.locales as readonly string[]).includes(requested)
    ? requested
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "property_gone" });
  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(t("meta_title"))}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: Canvas; color: CanvasText; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 36rem; padding: 2rem 1.5rem; text-align: center; }
  h1 { font-size: 1.75rem; margin: 0 0 1rem; }
  p { line-height: 1.6; margin: 0 0 1.75rem; }
  a { display: inline-block; padding: .75rem 1.5rem; border: 1px solid CanvasText; border-radius: 999px;
      color: CanvasText; text-decoration: none; font-weight: 600; }
  a:hover, a:focus-visible { background: CanvasText; color: Canvas; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(t("title"))}</h1>
  <p>${escapeHtml(t("body"))}</p>
  <a href="/${locale}/biens">${escapeHtml(t("cta"))}</a>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 410,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "public, max-age=300",
    },
  });
}
