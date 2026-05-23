import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Page index Sprint A : grille des services MAPA Property. Replace l'ancien
// 404 sur /[locale]/services (les 10 sous-routes services/* existaient deja
// individuellement mais aucune page racine ne les indexait).

type ServiceCard = {
  href: string;
  // Cle i18n du titre (services_page.cards.{key}.title) + body
  key: string;
};

// Ordre semantique : pyramide vendeur → acheteur → outils.
const SERVICE_CARDS: readonly ServiceCard[] = [
  { href: "/services/vendre", key: "sell" },
  { href: "/services/acheter", key: "buy" },
  { href: "/services/louer", key: "rent" },
  { href: "/services/estimer", key: "estimate" },
  { href: "/services/simulateurs", key: "simulators" },
  { href: "/services/marches-actifs", key: "markets" },
  { href: "/services/mandat-recherche", key: "search_mandate" },
  { href: "/off-market", key: "offmarket" },
];

export default async function ServicesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "services_page" });

  return (
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 t-h1">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-mid sm:text-lg">
            {t("intro")}
          </p>
        </header>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CARDS.map((card) => (
            <li key={card.key}>
              <Link
                href={card.href}
                className="group block h-full rounded-2xl border border-line bg-bg-soft p-7 transition-colors hover:border-gold hover:bg-bg"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                  {t(`cards.${card.key}.eyebrow`)}
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-ink group-hover:text-gold-deep">
                  {t(`cards.${card.key}.title`)}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-mid">
                  {t(`cards.${card.key}.body`)}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft group-hover:text-gold-deep">
                  {t("cta_more")} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
