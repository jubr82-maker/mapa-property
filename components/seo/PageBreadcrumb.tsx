// Fil d'Ariane en donnees structurees (BreadcrumbList), toutes les pages
// publiques sauf l'accueil (oct. 2026). Libelles traduits (namespace
// "breadcrumb"), adresses absolues de la langue courante.
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumb } from "@/lib/seo";
import { breadcrumbTrail } from "@/lib/breadcrumbs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

export async function PageBreadcrumb({ locale, path, current }: { locale: string; path: string; current?: string }) {
  const t = await getTranslations({ locale, namespace: "breadcrumb" });
  const items = [
    { name: t("home"), url: `${SITE_URL}/${locale}` },
    ...breadcrumbTrail(path, current).map((c) => ({
      name: c.label ?? t(c.key!),
      url: `${SITE_URL}/${locale}${c.path}`,
    })),
  ];
  return <JsonLd data={breadcrumb(items)} />;
}
