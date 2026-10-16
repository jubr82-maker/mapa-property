import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo-page-meta";
import { brandedTitle } from "@/lib/meta-text";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { ContactForm } from "@/components/forms/ContactForm";
import { cityForPlace } from "@/lib/internal-links";
import { fetchPublicSearch } from "@/lib/searches/data";
import { budgetLabel, criteriaList, localizedText, searchJsonLd } from "@/lib/searches/display";
import { isSearchReference } from "@/lib/searches/search";

// Page d'une recherche en cours (oct. 2026), indexable, reliee depuis la
// liste, les pages des communes, le menu et le pied de page. Donnees
// publiques seulement ; le formulaire arrive dans Leads avec le type
// "owner_search" et la reference de la recherche.
export const revalidate = 3600;

type Params = Promise<{ locale: string; reference: string }>;

async function load(reference: string) {
  if (!isSearchReference(reference)) return null;
  return fetchPublicSearch(reference);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, reference } = await params;
  const s = await load(reference);
  if (!s) return {};
  const t = await getTranslations({ locale, namespace: "searches_page" });
  const tr = (k: string, v?: Record<string, string | number>) => t(k, v);
  const title = localizedText(s, "title", locale) || s.reference;
  // 155 caracteres au plus (oct. 2026), sans "..." : phrase de fin plus
  // courte, puis communes resumees ("et 3 autres communes").
  const communesText = (k: number) =>
    !s.communes.length
      ? ""
      : k >= s.communes.length
        ? t("meta_communes", { communes: s.communes.join(", ") })
        : t("meta_communes_more", { communes: s.communes.slice(0, k).join(", "), n: s.communes.length - k });
  const build = (key: "meta_description" | "meta_description_short", k: number) =>
    t(key, { type: t(`type.${s.property_type}`), communes: communesText(k), budget: budgetLabel(s, locale, tr), reference: s.reference })
      .replace(/\s+,/g, ",")
      .replace(/\s{2,}/g, " ");
  let description = build("meta_description_short", 1);
  search: for (const key of ["meta_description", "meta_description_short"] as const) {
    for (let k = Math.max(s.communes.length, 1); k >= 1; k--) {
      const d = build(key, k);
      if (d.length <= 155) {
        description = d;
        break search;
      }
    }
  }
  return buildPageMetadata(locale, `/recherches/${s.reference}`, brandedTitle(title), description);
}

export default async function SearchPage({ params }: { params: Params }) {
  const { locale, reference } = await params;
  setRequestLocale(locale);
  const s = await load(reference);
  if (!s) notFound();
  const t = await getTranslations({ locale, namespace: "searches_page" });
  const tr = (k: string, v?: Record<string, string | number>) => t(k, v);
  const title = localizedText(s, "title", locale) || s.reference;
  const description = localizedText(s, "description", locale);
  const criteria = criteriaList(s, locale, tr);
  const found = s.status === "found";
  const paragraphs = description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <PageBreadcrumb locale={locale} path={`/recherches/${s.reference}`} current={title} />
      <JsonLd data={searchJsonLd(s, locale, title, description)} />
      <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            <Link href="/recherches" className="hover:text-gold">
              {t("back")}
            </Link>
          </p>
          <header className="mt-4 max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
              {t(`type.${s.property_type}`)} · {t(s.transaction === "rent" ? "tx_rent" : "tx_sale")} · {s.reference}
            </p>
            <h1 className="mt-2 t-h1">{title}</h1>
            {found && (
              <p className="mt-4 inline-block rounded-full border border-line px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">{t("found_badge")}</p>
            )}
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
            <section className="space-y-4 text-base leading-relaxed text-ink-mid">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p}
                </p>
              ))}
            </section>
            <aside className="space-y-5">
              <div className="rounded-xl border border-line bg-bg p-5">
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">{t("communes_title")}</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {s.communes.map((c) => {
                        const city = cityForPlace(c);
                        return city ? (
                          <Link key={c} href={`/villes/${city.slug}`} className="rounded-full border border-line px-3 py-1 text-ink hover:border-gold hover:text-gold">
                            {c}
                          </Link>
                        ) : (
                          <span key={c} className="rounded-full border border-line px-3 py-1 text-ink">
                            {c}
                          </span>
                        );
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">{t("label_budget")}</dt>
                    <dd className="mt-1 text-ink">{budgetLabel(s, locale, tr)}</dd>
                  </div>
                  {s.delay && (
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">{t("label_delay")}</dt>
                      <dd className="mt-1 text-ink">{t(`delay_${s.delay}`)}</dd>
                    </div>
                  )}
                  {criteria.length > 0 && (
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">{t("label_criteria")}</dt>
                      <dd className="mt-1">
                        <ul className="space-y-1 text-ink">
                          {criteria.map((c) => (
                            <li key={c}>- {c}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </aside>
          </div>

          {found ? (
            <p className="mt-14 text-base text-ink-soft">{t("found_note")}</p>
          ) : (
            <section id="contact-form" className="mt-14 scroll-mt-28 rounded-2xl border border-line bg-bg-soft p-8 sm:p-10">
              <h2 className="t-h2">{t("form_title")}</h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-mid">{t("form_intro", { reference: s.reference })}</p>
              <div className="mt-6">
                <ContactForm
                  type="owner_search"
                  source={`search:${s.reference}`}
                  propertyRef={s.reference}
                  propertyTitle={title}
                  defaultMessage={t("default_message", { reference: s.reference })}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
