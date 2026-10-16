// Questions frequentes d'une page (oct. 2026) : accordeon au style des
// sections existantes (meme rendu que l'ancienne FAQ des pages d'intention)
// et un seul bloc de donnees structurees FAQPage, dans la langue de la page.
// Rendu serveur. Aucune question publiee dans cette langue : rien n'est
// affiche (ni section, ni donnees structurees).
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPage } from "@/lib/seo";
import { fetchFaqItems } from "@/lib/faq/data";
import type { FaqLang } from "@/lib/faq/keys";

export async function FaqSection({
  pageKey,
  locale,
  className = "mt-16 max-w-3xl",
  headingLevel = "h2",
}: {
  pageKey: string;
  locale: string;
  className?: string;
  /** "none" sur la page /faq, dont le titre H1 annonce deja les questions. */
  headingLevel?: "h2" | "none";
}) {
  const lang: FaqLang = locale === "en" || locale === "de" ? locale : "fr";
  const items = await fetchFaqItems(pageKey, lang);
  if (items.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "faq" });
  const headingId = `faq-${pageKey.replace(/[^a-z0-9-]/g, "-")}`;

  return (
    <section className={className} aria-labelledby={headingLevel === "none" ? undefined : headingId} data-faq-section={pageKey}>
      <JsonLd data={faqPage(items.map((f) => ({ question: f.question, answer: f.answer.replace(/\s*\n+\s*/g, " ") })))} />
      {headingLevel === "h2" ? (
        <h2 id={headingId} className="t-h2">
          {t("title")}
        </h2>
      ) : null}
      <div className={`${headingLevel === "h2" ? "mt-6 " : ""}divide-y divide-line border-y border-line`}>
        {items.map((f) => (
          <details key={f.id} className="group py-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
              <h3 className="text-base font-semibold">{f.question}</h3>
              <span aria-hidden className="text-gold-deep transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            {f.answer.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="mt-2 text-base leading-relaxed text-ink-mid">
                {p}
              </p>
            ))}
          </details>
        ))}
      </div>
    </section>
  );
}
