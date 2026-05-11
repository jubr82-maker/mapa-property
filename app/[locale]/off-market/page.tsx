import Image from "next/image";
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
      <section className="relative isolate overflow-hidden">
        <div className="relative h-[70vh] min-h-[480px] w-full">
          <Image
            src="/offmarket_hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-ink/50" />

          <Link
            href="/"
            className="absolute right-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-white/90 backdrop-blur transition-colors hover:border-gold hover:text-gold lg:right-10 lg:top-10"
          >
            <span aria-hidden>←</span>
            {t("back")}
          </Link>

          <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col items-start justify-center gap-5 px-6 pt-24 lg:px-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-gold-bright/90">
              {t("hero_eyebrow")}
            </p>
            <h1 className="font-display font-bold leading-[1] tracking-tight text-white text-[clamp(3rem,7vw,5rem)]">
              {t("hero_title")}
            </h1>
            <p className="font-serif text-xl italic leading-relaxed text-white/85 sm:text-2xl">
              {t("hero_subtitle")}
            </p>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
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
          <h2 className="mt-2 font-display text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {t("title")}
          </h2>
        </header>

        {/* Conditions d'accès */}
        <section className="mb-14 rounded-2xl border border-gold/40 bg-gradient-to-br from-bg-soft via-bg to-bg-soft p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
            {t("access_eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink">
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
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-deep">
        {property.cover_image_url ? (
          <Image
            src={property.cover_image_url}
            alt={property.title ?? "Off-market"}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <OffmarketPlaceholder />
        )}
        <span className="absolute right-3 top-3 rounded-full bg-ink/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-bright backdrop-blur">
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
