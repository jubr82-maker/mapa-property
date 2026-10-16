// Sections communes des pages de recherche immobiliere (oct. 2026) : FAQ,
// liens vers les biens, villes et simulateurs, donnees structurees (Service
// + FAQPage). Rendu serveur. Le paragraphe de reponse est rendu par chaque
// page, juste sous son H1 (IntentAnswer).
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ExploreLinks } from "@/components/seo/ExploreLinks";
import { INTENT_PAGES, type IntentKey } from "@/lib/intent-pages";
import { buildPageMetadata } from "@/lib/seo-page-meta";
import { faqPage, intentService } from "@/lib/seo";
import { FaqSection } from "@/components/faq/FaqSection";

export async function intentMetadata(locale: string, intent: IntentKey): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "intent_pages" });
  return buildPageMetadata(
    locale,
    INTENT_PAGES[intent].path,
    `${t(`${intent}.meta_title`)}, MAPA Property`,
    t(`${intent}.meta_description`),
  );
}

export async function intentFaq(locale: string, intent: IntentKey) {
  const t = await getTranslations({ locale, namespace: "intent_pages" });
  return Array.from({ length: INTENT_PAGES[intent].faqCount }, (_, i) => ({
    question: t(`${intent}.faq_q${i + 1}`),
    answer: t(`${intent}.faq_a${i + 1}`),
  }));
}

/** Premier paragraphe : la reponse directe a la question de la page. */
export async function IntentAnswer({
  locale,
  intent,
  className = "mt-5 max-w-3xl text-base leading-relaxed text-ink sm:text-lg",
}: {
  locale: string;
  intent: IntentKey;
  className?: string;
}) {
  const t = await getTranslations({ locale, namespace: "intent_pages" });
  return (
    <p className={className} data-intent-answer={intent}>
      {t(`${intent}.answer`)}
    </p>
  );
}

/**
 * faqKey : questions lues dans la table faqs (admin, Questions frequentes)
 * au lieu des questions ecrites dans les traductions (oct. 2026). Les
 * questions d'origine ont ete reprises mot pour mot (SQL 24). Sans faqKey
 * (broker international), la FAQ des traductions reste affichee.
 */
export async function IntentSections({ locale, intent, faqKey }: { locale: string; intent: IntentKey; faqKey?: string }) {
  const t = await getTranslations({ locale, namespace: "intent_pages" });
  const config = INTENT_PAGES[intent];
  const faq = faqKey ? [] : await intentFaq(locale, intent);

  return (
    <>
      <JsonLd
        data={[
          intentService({
            locale,
            path: config.path,
            name: t(`${intent}.service_name`),
            description: t(`${intent}.answer`),
            area: config.area,
          }),
          ...(faq.length ? [faqPage(faq)] : []),
        ]}
      />

      {faqKey ? <FaqSection pageKey={faqKey} locale={locale} /> : null}
      {faq.length ? (
      <section className="mt-16 max-w-3xl" aria-labelledby={`faq-${intent}`}>
        <h2 id={`faq-${intent}`} className="t-h2">
          {t("faq_title")}
        </h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {faq.map((f) => (
            <details key={f.question} className="group py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
                <h3 className="text-base font-semibold">{f.question}</h3>
                <span aria-hidden className="text-gold-deep transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-base leading-relaxed text-ink-mid">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
      ) : null}

      <section className="mt-16" aria-labelledby={`links-${intent}`}>
        <h2 id={`links-${intent}`} className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
          {t("links_title")}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {config.links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm text-ink transition-colors hover:border-gold hover:text-gold-deep"
              >
                {t(l.key)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <ExploreLinks />
        </div>
      </section>
    </>
  );
}
