import type { Metadata } from "next";
import { seoPageMetadata } from "@/lib/seo-page-meta";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchOffmarketList } from "@/lib/data";
import { OffMarketTeaser } from "@/components/offmarket/OffMarketTeaser";

import { FaqSection } from "@/components/faq/FaqSection";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
// Sprint OPTIM-1B : ISR sur la page liste off-market — fetch
// fetchOffmarketList(locale) via VIEW Supabase. Sans revalidate explicite,
// Next.js 16 considere la page Dynamic (Supabase fetch non-cache) ->
// rendering a chaque visite -> writes ISR Vercel.
//
// OPTIM-1B C5 : 86400s (24h) au lieu de 1800s (cf. justification dans
// biens/[slug]/page.tsx). Invalidation immediate apres save admin via
// revalidatePath cross-locale dans app/admin/offmarket/actions.ts.
// Quotas Vercel (oct. 2026, docs/vercel-quotas.md) : revalidation a la
// demande quand le contenu change ; minuterie de secours de 30 jours seulement.
export const revalidate = 2592000;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return seoPageMetadata(locale, "offmarket", "/off-market");
}

export default async function OffMarketListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const list = await fetchOffmarketList(locale);
  const t = await getTranslations({ locale, namespace: "offmarket" });

  return (
    <>
      <PageBreadcrumb locale={locale} path="/off-market" />
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
            className="absolute right-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-text-contrast/30 bg-text-contrast/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-text-contrast/90 backdrop-blur transition-colors hover:border-gold hover:text-gold lg:right-10 lg:top-10"
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
            <p className="font-serif text-xl italic leading-relaxed text-text-contrast/85 sm:text-2xl">
              {t("hero_subtitle")}
            </p>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-text-contrast/70 sm:text-lg">
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

        {/* CTA ARCOVA — sous-section texte ARCOVA (mission lisibilite).
            Sprint I18N : strings migrees vers next-intl (namespace
            'offmarket', keys arcova_cta_*). Fleche '→' reste en dur
            (caractere universel). */}
        <section className="mb-14 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-gold/30 bg-bg p-6 lg:p-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
              {t("arcova_cta_eyebrow")}
            </p>
            <p className="mt-2 font-display text-xl font-bold text-ink sm:text-2xl">
              {t("arcova_cta_title")}
            </p>
            <div className="mt-2 max-w-xl space-y-2 text-sm text-ink-mid">
              <p>{t("arcova_cta_p1")}</p>
              <p>{t("arcova_cta_p2")}</p>
              <p>{t("arcova_cta_p3")}</p>
            </div>
          </div>
          <Link
            href="/off-market/arcova"
            className="inline-flex items-center gap-2 rounded-full border border-gold px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-text transition-colors hover:bg-gold/10"
          >
            {t("arcova_cta_label")} →
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
              <OffMarketTeaser key={p.id} property={p} t={t} locale={locale} />
            ))}
          </div>
        )}
        <FaqSection pageKey="off-market" locale={locale} />
      </div>
    </div>
    </>
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
