import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { IntentAnswer, IntentSections, intentMetadata } from "@/components/seo/IntentSections";
import { BROKER_POSITION } from "@/lib/legal/broker-position";

// Page d'intention "broker immobilier international" (oct. 2026,
// lib/intent-pages.ts). Positionnement : texte unique valide par Julien
// (lib/legal/broker-position.ts, aussi utilise par Qui sommes-nous et le
// chatbot).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return intentMetadata(locale, "broker");
}

export default async function BrokerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "intent_pages" });
  const position = BROKER_POSITION[locale as keyof typeof BROKER_POSITION] ?? BROKER_POSITION.fr;

  return (
    <>
      <PageBreadcrumb locale={locale} path="/services/broker-international" />
      <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
        <div className="mx-auto max-w-[1400px]">
          <header className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">{t("broker.eyebrow")}</p>
            <h1 className="mt-2 t-h1">{t("broker.title")}</h1>
            <IntentAnswer locale={locale} intent="broker" />
          </header>
          <section className="mt-14 max-w-3xl rounded-2xl border border-line bg-bg-soft p-6 sm:p-8">
            <h2 className="t-h3">{position.title}</h2>
            <div className="mt-4 space-y-3 text-base leading-relaxed text-ink-mid">
              {position.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
          <IntentSections locale={locale} intent="broker" />
        </div>
      </div>
    </>
  );
}
