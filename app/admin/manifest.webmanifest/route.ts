// Manifeste de l'admin (oct. 2026) : ajout a l'ecran d'accueil de
// l'iPhone avec icone et nom. Ne contient aucune donnee : nom, couleurs,
// icones, perimetre /admin. Aucun service worker n'est declare, donc rien
// n'est mis en cache hors ligne (aucune donnee client sur l'appareil).
// Adresse avec un point : hors du proxy (matcher de proxy.ts), servie sans
// session, jamais indexee.
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { iconUrl } from "@/lib/icons";

export const dynamic = "force-static";

export async function GET() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_nav" });
  const manifest = {
    id: "/admin",
    name: t("app_name_long"),
    short_name: t("app_name"),
    description: t("app_description"),
    lang: ADMIN_LOCALE,
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F0E6CC",
    theme_color: "#1F221A",
    icons: [
      { src: iconUrl("icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: iconUrl("icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: iconUrl("icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return NextResponse.json(manifest, {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "x-robots-tag": "noindex, nofollow, noarchive",
      "cache-control": "public, max-age=3600",
    },
  });
}
