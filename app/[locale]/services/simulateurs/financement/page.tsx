import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FinancingSimulator } from "@/components/simulators/FinancingSimulator";

import { seoPageMetadata } from "@/lib/seo-page-meta";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return seoPageMetadata(locale, "financing", "/services/simulateurs/financement");
}

export default async function FinancingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ price?: string; country?: string; down?: string; duration?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const initial = {
    price: Number(sp.price) || 500000,
    // Luxembourg seul (donnees etrangeres retirees, cf. lib/legal-fees.ts).
    country: "LU" as const,
    down: Number(sp.down) || 100000,
    duration: Number(sp.duration) || 25,
  };

  return (
    <>
      <PageBreadcrumb locale={locale} path="/services/simulateurs/financement" />
    <article className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            Simulateur de financement
          </p>
          <h1 className="mt-2 t-h1">
            Votre acquisition, chiffrée.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-mid">
            Simulation complète mensualité, frais d&apos;acquisition, capacité
            empruntable et aides applicables selon le pays. Taux indicatifs
            actualisés mensuellement (BCL / Banque de France / BNB / Bundesbank).
          </p>
        </header>

        <FinancingSimulator initial={initial} />
      </div>
    </article>
    </>
  );
}
