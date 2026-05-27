// Sprint C13-bis C4 — CTA "voir tout" affiche sous la liste de biens
// quand un rayon 10 km Luxembourg a filtre des biens hors zone du meme
// pays. Lien preserve les filtres actuels + ajoute showAll=true.
//
// Server Component : utilise getTranslations pour le plural ICU.

import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function RadiusCTA({
  count,
  locale,
  showAllHref,
}: {
  count: number;
  locale: string;
  showAllHref: string;
}) {
  const t = await getTranslations({ locale, namespace: "search" });
  return (
    <div className="mt-10 flex justify-center">
      <Link
        href={showAllHref}
        className="inline-flex items-center gap-2 rounded-full border border-[#B8865A] px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#B8865A] transition-colors hover:bg-[#B8865A]/10"
      >
        {t("radius_cta", { count })}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
