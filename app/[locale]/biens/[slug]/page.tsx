import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  fetchAllPropertiesWithCover,
  fetchOffmarketById,
  fetchPropertyByIdOrSlug,
  fetchPropertyImages,
  fetchPublishedReviews,
} from "@/lib/data";
import { pickLang, type Locale } from "@/lib/types";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { PropertyActions } from "@/components/property/PropertyActions";
import { PropertyCard } from "@/components/property/PropertyCard";
import { ContactForm } from "@/components/forms/ContactForm";
import { BackButton } from "@/components/ui/BackButton";
import { ContactReveal } from "@/components/contact-reveal";
import { AcquisitionSimulator } from "@/components/property/AcquisitionSimulator";
import { PropertyMagazineDescription } from "@/components/property/PropertyMagazineDescription";
import { PropertyViewTracker } from "@/components/property/PropertyViewTracker";
import { parseApimoDescription } from "@/lib/property-description-parser";
import { Link as IntlLink } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumb, propertyListing } from "@/lib/seo";

// ISR — régénération toutes les 60s (Agent 16, perf LCP).
export const revalidate = 60;

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

  // 1) Résolution Apimo : slug textuel, UUID ou apimo_ref numérique.
  const property = await fetchPropertyByIdOrSlug(slug);

  // 2) Fallback off-market : si l'identifiant est un UUID Supabase
  //    pointant vers un bien off-market, on redirige vers la bonne route
  //    (les linkers défaillants envoient parfois ici).
  if (!property) {
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (UUID_RE.test(slug)) {
      const off = await fetchOffmarketById(slug);
      if (off) redirect(`/${locale}/off-market/${off.id}`);
    }
    notFound();
  }

  const [images, reviews, allProperties] = await Promise.all([
    fetchPropertyImages(property.id),
    fetchPublishedReviews(3),
    fetchAllPropertiesWithCover(),
  ]);

  const t = await getTranslations({ locale, namespace: "property" });
  const title = pickLang(property, "title", locale as Locale);
  const description = pickLang(property, "description", locale as Locale);
  const parsedDescription = parseApimoDescription(description);

  type GalleryItem = { type: "image" | "video"; url: string; alt?: string };
  // Galerie photos uniquement — la vidéo est isolée en pleine largeur (cf. <section> ci-dessous).
  const galleryItems: GalleryItem[] = images.map((img) => ({
    type: "image",
    url: img.url,
    alt: title,
  }));

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
      <PropertyViewTracker
        propertyId={property.id}
        commune={property.city ?? undefined}
        price={property.price}
        offmarket={false}
      />
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
          <h1 className="mt-3 t-h1">
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

        {/* Vidéo de présentation (isolée, pleine largeur 16:9) */}
        {property.video_url && (
          <section className="mt-12">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("video")}
            </p>
            <video
              controls
              preload="metadata"
              className="aspect-video w-full rounded-2xl bg-bg-soft"
              poster={galleryItems[0]?.url}
            >
              <source src={property.video_url} />
            </video>
          </section>
        )}

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

            {/* Description (magazine éditorial) */}
            {description && (parsedDescription.intro || parsedDescription.chapters.length > 0) && (
              <section>
                <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                  {t("description")}
                </h2>
                <PropertyMagazineDescription
                  description={description}
                  parsed={parsedDescription}
                />
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
            <div className="rounded-xl border border-line bg-bg-soft p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                {t("advisor")}
              </p>
              {/* Bloc conseiller unique — pas de noms exposés en SSR (anti-scraping) */}
              <div className="mt-2">
                <h3 className="t-h3">
                  {t("advisor_block_title")}
                </h3>
                <p className="mt-1 text-sm text-ink-mid">
                  {t("advisor_block_roles")}
                </p>
                <div className="mt-4">
                  <ContactReveal variant="sidebar" align="left" />
                </div>
              </div>
            </div>

            {/* CTA Mandat Exclusif — vendeurs */}
            <div
              className="overflow-hidden rounded-xl p-5 text-white shadow-sm"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #B8865A 0%, #8B6635 100%)",
              }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/80">
                Mandat Exclusif
              </p>
              <p className="mt-2 font-display text-base font-bold leading-snug text-white">
                Vous vendez un bien d&apos;exception ?
              </p>
              <p className="mt-2 text-xs text-white/85">
                3% HT + 17% TVA. Marketing premium, exclusivité MAPA,
                négociation et suivi dédiés.
              </p>
              <IntlLink
                href="/mandats/exclusif"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] shadow-sm transition-transform hover:scale-[1.02]"
                style={{ color: "#8B6635" }}
              >
                Découvrir le Mandat Exclusif →
              </IntlLink>
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

            {/* Simulateur d'acquisition par pays */}
            {price > 0 && property.transaction !== "rent" && (
              <AcquisitionSimulator
                price={price}
                country={property.country ?? "LU"}
                city={property.city ?? ""}
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
            <h2 className="mt-2 t-h2">
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
