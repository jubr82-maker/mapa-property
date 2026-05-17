import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "page_rent" });
  return { title: `${t("title")} — MAPA Property`, description: t("intro") };
}

export default async function RentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "page_rent" });

  const cards = [
    { key: "find", href: "/biens?transaction=rent" },
    { key: "list", href: "/contact?subject=mise-en-location" },
    { key: "manage", href: "/contact?subject=gestion-locative" },
  ] as const;

  return (
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-14 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 t-h1">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-mid sm:text-lg">
            {t("intro")}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className="group flex flex-col gap-4 rounded-xl border border-line bg-bg p-6 transition-colors hover:border-gold"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                {t(`${c.key}_label`)}
              </span>
              <h3 className="font-display text-2xl font-bold leading-tight text-ink group-hover:text-gold-deep">
                {t(`${c.key}_title`)}
              </h3>
              <p className="text-sm leading-relaxed text-ink-mid">
                {t(`${c.key}_text`)}
              </p>
              <span className="mt-auto font-mono text-[11px] uppercase tracking-[0.2em] text-gold-deep group-hover:text-gold">
                {t("learn_more")} →
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-12 max-w-3xl rounded-xl border border-line bg-bg-soft p-6 text-sm leading-relaxed text-ink-mid">
          {t("legal_notice")}
        </p>
      </div>
    </div>
  );
}
