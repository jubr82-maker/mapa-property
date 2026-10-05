// Liens vers les pages villes et les simulateurs (oct. 2026), pour le
// maillage interne : pied de page, accueil, page des marches et fiches de
// biens. Composant partage (rendu serveur), libelles next-intl.
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SIMULATOR_LINKS, featuredCities } from "@/lib/internal-links";
import type { City } from "@/lib/cities";

type Loc = "fr" | "en" | "de";

export function ExploreLinks({
  cities,
  variant = "section",
  showAllCities = true,
}: {
  cities?: City[];
  variant?: "section" | "footer";
  showAllCities?: boolean;
}) {
  const t = useTranslations("explore");
  const locale = useLocale() as Loc;
  const list = cities ?? featuredCities();
  const linkCls =
    variant === "footer"
      ? "text-sm text-ink-mid transition-colors hover:text-gold-deep"
      : "inline-flex min-h-11 items-center text-base text-ink underline decoration-line underline-offset-4 transition-colors hover:text-gold-deep";
  const titleCls =
    variant === "footer"
      ? "font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft"
      : "font-mono text-xs uppercase tracking-[0.3em] text-gold-deep";

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <nav aria-label={t("title_cities")}>
        <p className={titleCls}>{t("title_cities")}</p>
        <ul className={`mt-3 ${variant === "footer" ? "flex flex-wrap gap-x-4 gap-y-2" : "grid grid-cols-2 gap-x-6"}`}>
          {list.map((c) => (
            <li key={c.slug}>
              <Link href={`/villes/${c.slug}`} className={linkCls}>
                {c.name[locale]}
              </Link>
            </li>
          ))}
          {showAllCities && (
            <li>
              <Link href="/services/marches-actifs" className={linkCls}>
                {t("all_cities")}
              </Link>
            </li>
          )}
        </ul>
      </nav>
      <nav aria-label={t("title_simulators")}>
        <p className={titleCls}>{t("title_simulators")}</p>
        <ul className={`mt-3 ${variant === "footer" ? "flex flex-wrap gap-x-4 gap-y-2" : "space-y-1"}`}>
          {SIMULATOR_LINKS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className={linkCls}>
                {t(s.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
