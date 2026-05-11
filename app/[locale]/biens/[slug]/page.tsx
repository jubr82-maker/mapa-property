import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  fetchAllPropertiesWithCover,
  fetchLatestInterestRates,
  fetchPropertyBySlug,
  fetchPropertyImages,
  fetchPublishedReviews,
} from "@/lib/data";
import { pickLang, type Locale } from "@/lib/types";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { PropertyActions } from "@/components/property/PropertyActions";
import { PropertyFinancing } from "@/components/property/PropertyFinancing";
import { PropertyCard } from "@/components/property/PropertyCard";
import { ContactForm } from "@/components/forms/ContactForm";
import { BackButton } from "@/components/ui/BackButton";
import { ContactButtons } from "@/components/ContactButtons";
import { MiniFinanceSimulator } from "@/components/property/MiniFinanceSimulator";
import { Link as IntlLink } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumb, propertyListing } from "@/lib/seo";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

const formatPrice = (
  price: number | null,
  transaction: string,
  locale: string,
) => {
  if (!price) return "—";
  const value = new Intl.NumberFormat(locale === "de" ? "de-LU" : "fr-LU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
  return transaction === "rent" ? `${value} / mois` : value;
};

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const property = await fetchPropertyBySlug(slug);
  if (!property) notFound();

  const [images, reviews, rates, allProperties] = await Promise.all([
    fetchPropertyImages(property.id),
    fetchPublishedReviews(3),
    fetchLatestInterestRates(),
    fetchAllPropertiesWithCover(),
  ]);

  const t = await getTranslations({ locale, namespace: "property" });
  const title = pickLang(property, "title", locale as Locale);
  const description = pickLang(property, "description", locale as Locale);

  type GalleryItem = { type: "image" | "video"; url: string; alt?: string };
  const galleryItems: GalleryItem[] = images.map((img) => ({
    type: "image",
    url: img.url,
    alt: title,
  }));
  if (property.video_url) {
    galleryItems.push({
      type: "video",
      url: property.video_url,
      alt: title,
    });
  }

  const rate =
    rates?.rates?.fixed_25 ?? rates?.rates?.fixed_20 ?? rates?.rates?.fixed_30 ?? 3.6;

  // Biens similaires — logique stricte V3 : même type + prix ±15% +
  // même pays (idéalement même ville), excluant le bien actuel.
  const price = property.price ?? 0;
  const minPrice = price ? price * 0.85 : 0;
  const maxPrice = price ? price * 1.15 : Number.POSITIVE_INFINITY;
  type AnyProperty = (typeof allProperties)[number] & { property_type?: string | null };
  const propertyType =
    (property as AnyProperty).property_type ?? property.badge ?? null;

  const similarAll = allProperties.filter((p) => {
    if (p.id === property.id) return false;
    if (p.transaction !== property.transaction) return false;
    // Pays minimum, ville en bonus de match
    if (p.country !== property.country) return false;
    // Même type si disponible
    const pt = (p as AnyProperty).property_type ?? p.badge ?? null;
    if (propertyType && pt && pt !== propertyType) return false;
    // Prix ±15% si on a un prix de référence
    if (price && p.price) {
      if (p.price < minPrice || p.price > maxPrice) return false;
    }
    return true;
  });
  // Priorise même ville en tête
  similarAll.sort((a, b) => {
    const sameCityA = a.city === property.city ? 1 : 0;
    const sameCityB = b.city === property.city ? 1 : 0;
    return sameCityB - sameCityA;
  });
  const similar = similarAll.slice(0, 4);

  const productJsonLd = propertyListing({
    name: title,
    description: description.slice(0, 300),
    url: `${SITE_URL}/${locale}/biens/${property.slug}`,
    image: galleryItems[0]?.url,
    price: property.transaction === "rent" ? null : property.price,
    city: property.city,
    country: property.country,
  });
  const breadcrumbJsonLd = breadcrumb([
    { name: "MAPA Property", url: `${SITE_URL}/${locale}` },
    { name: "Biens", url: `${SITE_URL}/${locale}/biens` },
    { name: title, url: `${SITE_URL}/${locale}/biens/${property.slug}` },
  ]);

  return (
    <article className="pt-24 lg:pt-32">
      <JsonLd data={[productJsonLd, breadcrumbJsonLd]} />
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <BackButton fallback="/biens" />
          <PropertyActions propertyId={property.id} />
        </div>

        {/* Header */}
        <header className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            {[property.country, property.city].filter(Boolean).join(" · ")}
            {property.badge && <> · <span className="text-gold-deep">{property.badge}</span></>}
          </p>
          <h1 className="mt-3 font-display text-4xl font-black leading-[0.95] tracking-tight text-ink sm:text-6xl">
            {title || "—"}
          </h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="font-display text-3xl font-black tracking-tight gold-text sm:text-4xl">
              {formatPrice(property.price, property.transaction, locale)}
            </p>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
              {t(`tx_${property.transaction}`)}
            </p>
          </div>
        </header>

        {/* Gallery */}
        <PropertyGallery items={galleryItems} title={title} />

        {/* Main grid */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-12">
            {/* Specs */}
            <section>
              <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                {t("specs")}
              </h2>
              <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                <Spec
                  label={t("surface")}
                  value={property.surface ? `${property.surface} m²` : "—"}
                />
                <Spec
                  label={t("living_surface")}
                  value={
                    property.living_surface ? `${property.living_surface} m²` : "—"
                  }
                />
                <Spec
                  label={t("bedrooms")}
                  value={
                    property.bedrooms !== null && property.bedrooms !== undefined
                      ? String(property.bedrooms)
                      : "—"
                  }
                />
                <Spec
                  label={t("bathrooms")}
                  value={
                    property.bathrooms !== null && property.bathrooms !== undefined
                      ? String(property.bathrooms)
                      : "—"
                  }
                />
                <Spec label={t("energy")} value={property.energy ?? "—"} />
                <Spec
                  label={t("parking")}
                  value={
                    property.parking !== null && property.parking !== undefined
                      ? String(property.parking)
                      : "—"
                  }
                />
                <Spec
                  label={t("year")}
                  value={property.year ? String(property.year) : "—"}
                />
                <Spec
                  label={t("land_surface")}
                  value={
                    property.land_surface ? `${property.land_surface} m²` : "—"
                  }
                />
                <Spec
                  label={t("terrace_surface")}
                  value={
                    property.terrace_surface
                      ? `${property.terrace_surface} m²`
                      : "—"
                  }
                />
              </dl>
            </section>

            {/* Description */}
            {description && (
              <section>
                <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                  {t("description")}
                </h2>
                <div className="space-y-4 text-base leading-relaxed text-ink-mid">
                  {description.split(/\n\s*\n/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section className="border-t border-line pt-10">
                <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                  {t("reviews")}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {reviews.slice(0, 2).map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-line bg-bg-soft p-5"
                    >
                      <div className="flex items-center gap-1 text-gold-bright">
                        {Array.from({ length: r.rating ?? 5 }).map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                      </div>
                      <blockquote className="mt-3 text-sm leading-relaxed text-ink-mid">
                        “{r.comment ?? ""}”
                      </blockquote>
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                        {r.name ?? "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {property.price && property.transaction !== "rent" && (
              <PropertyFinancing price={property.price} rate={Number(rate)} />
            )}

            <div className="rounded-xl border border-line bg-bg-soft p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                {t("advisor")}
              </p>
              <p className="mt-2 font-display text-xl font-bold text-ink">
                Julien
              </p>
              <p className="text-sm text-ink-mid">Real Estate Director</p>
              <div className="mt-4">
                <ContactButtons variant="compact" className="!flex-col !items-stretch" />
              </div>
            </div>

            {/* CTA Mandat de recherche */}
            <div className="rounded-xl border border-gold/40 bg-bg p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                Mandat de recherche
              </p>
              <p className="mt-2 font-display text-base font-bold leading-snug text-ink">
                Vous cherchez un bien similaire ?
              </p>
              <p className="mt-2 text-sm text-ink-mid">
                Confiez-nous votre recherche. Nous mobilisons nos canaux —
                marché ouvert, off-market et réseau privé.
              </p>
              <IntlLink
                href={`/mandats/recherche?ref=${property.slug}&type=${propertyType ?? ""}&country=${property.country ?? ""}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-deep px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg transition-colors hover:bg-gold"
              >
                Demander un mandat de recherche →
              </IntlLink>
            </div>

            {/* Mini-simulateur financement */}
            {price > 0 && property.transaction !== "rent" && (
              <MiniFinanceSimulator
                price={price}
                country={(property.country as "LU" | "FR" | "BE" | "DE" | "PT" | "AE") || "LU"}
                variant="compact"
              />
            )}
          </aside>
        </div>

        {/* Contact form */}
        <section
          id="contact-form"
          className="mt-20 rounded-2xl border border-line bg-bg-soft p-8 sm:p-12"
        >
          <header className="mb-8 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("form_eyebrow")}
            </p>
            <h2 className="mt-2 font-display text-3xl font-black leading-tight text-ink sm:text-4xl">
              {t("form_title")}
            </h2>
            <p className="mt-3 text-base text-ink-mid">{t("form_subtitle")}</p>
          </header>
          <ContactForm
            type="property_request"
            source={`property:${property.slug}`}
            propertyRef={property.slug}
            defaultMessage={`Bonjour, je souhaite plus d'informations sur le bien : ${title}.`}
          />
        </section>

        {/* Similar */}
        {similar.length > 0 && (
          <section className="mt-20 mb-16">
            <h2 className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("similar")}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((p) => (
                <PropertyCard key={p.id} property={p} locale={locale as Locale} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-bold text-ink">{value}</dd>
    </div>
  );
}
