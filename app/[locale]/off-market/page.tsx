import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchOffmarketList } from "@/lib/data";
import type { PropertyOffmarket } from "@/lib/types";
import { OffmarketPlaceholder } from "@/components/property/OffmarketPlaceholder";

export default async function OffMarketListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const list = await fetchOffmarketList();
  const t = await getTranslations({ locale, namespace: "offmarket" });

  return (
    <>
      <section className="relative isolate overflow-hidden bg-bg-contrast">
        {/* Bordure interne or subtile (effet plaque) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-sm ring-1 ring-gold/40 sm:inset-6 lg:inset-10"
        />
        <div className="relative h-[70vh] min-h-[480px] w-full">
          <Link
            href="/"
            className="absolute right-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-bg/30 bg-bg/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-bg/90 backdrop-blur transition-colors hover:border-gold hover:text-gold lg:right-10 lg:top-10"
          >
            <span aria-hidden>←</span>
            {t("back")}
          </Link>

          <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col items-start justify-center gap-5 px-6 pt-24 lg:px-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-gold">
              {t("hero_eyebrow")}
            </p>
            <h1 className="t-h1-contrast">
              {t("hero_title")}
            </h1>
            <p className="font-serif text-xl italic leading-relaxed text-bg/85 sm:text-2xl">
              {t("hero_subtitle")}
            </p>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-bg/70 sm:text-lg">
              {t("description")}
            </p>
          </div>
        </div>
      </section>

    <div className="px-6 pt-16 pb-20 lg:px-10 lg:pt-20 lg:pb-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("access_eyebrow")}
          </p>
          <h2 className="mt-2 t-h2">
            {t("title")}
          </h2>
        </header>

        {/* Conditions d'accès */}
        <section className="mb-14 rounded-2xl border border-gold/40 bg-bg-soft p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
            {t("access_eyebrow")}
          </p>
          <h2 className="mt-2 t-h2">
            {t("access_title")}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            <Step
              num="01"
              title={t("step_1_title")}
              text={t("step_1_text")}
            />
            <Step
              num="02"
              title={t("step_2_title")}
              text={t("step_2_text")}
            />
            <Step
              num="03"
              title={t("step_3_title")}
              text={t("step_3_text")}
            />
          </ul>
        </section>

        {/* CTA ARCOVA — sous-section "Acquéreurs qualifiés" */}
        <section className="mb-14 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-bg p-6 lg:p-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
              ARCOVA · Acquéreurs qualifiés
            </p>
            <p className="mt-2 font-display text-xl font-bold text-ink sm:text-2xl">
              Vous êtes un acquéreur sous mandat de recherche ?
            </p>
            <p className="mt-1 max-w-xl text-sm text-ink-mid">
              ARCOVA est la liste confidentielle des acquéreurs qualifiés admis
              à recevoir les biens off-market en avant-première.
            </p>
          </div>
          <Link
            href="/off-market/arcova"
            className="inline-flex items-center gap-2 rounded-full border border-gold px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-deep transition-colors hover:bg-gold/10"
          >
            Accéder à ARCOVA →
          </Link>
        </section>

        {list.length === 0 ? (
          <div className="rounded-xl border border-line bg-bg-soft px-6 py-16 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("empty")}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <OffMarketTeaser key={p.id} property={p} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function Step({ num, title, text }: { num: string; title: string; text: string }) {
  return (
    <li className="border-l border-gold/40 pl-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
        {num}
      </p>
      <p className="mt-2 font-display text-base font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-mid">{text}</p>
    </li>
  );
}

function OffMarketTeaser({
  property,
  t,
}: {
  property: PropertyOffmarket;
  t: (key: string) => string;
}) {
  return (
    <Link
      href={`/off-market/${property.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-bg transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10"
    >
      {/* Cover confidentiel standardisé (BUG 2) — jamais le visuel réel. */}
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-deep">
        <OffmarketPlaceholder
          compact
          title={t("cover_title")}
          subtitle={t("cover_subtitle")}
        />
        <span className="absolute right-3 top-3 rounded-full bg-bg-contrast/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-bright backdrop-blur">
          OFF-MARKET
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {[property.country, property.city_label].filter(Boolean).join(" · ") || "—"}
          {property.internal_ref && (
            <> · <span className="text-gold-deep">{property.internal_ref}</span></>
          )}
        </p>
        <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-ink group-hover:text-gold-deep">
          {property.title ?? "—"}
        </h3>
        {property.short_pitch && (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink-mid">
            {property.short_pitch}
          </p>
        )}
        <p className="mt-auto font-display text-lg font-bold gold-text">
          {property.price_display ?? t("price_on_request")}
        </p>
      </div>
    </Link>
  );
}
