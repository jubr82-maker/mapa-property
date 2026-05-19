import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  fetchAllPropertiesWithCover,
  fetchOffmarketById,
  fetchPropertyByIdOrSlug,
  fetchPropertyImages,
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
import { PropertyVideo } from "@/components/property/PropertyVideo";
import { PropertyViewTracker } from "@/components/property/PropertyViewTracker";
import { FicheHeader } from "@/components/property/fiche/FicheHeader";
import { FicheSpecs } from "@/components/property/fiche/FicheSpecs";
import { FicheAccordion } from "@/components/property/fiche/FicheAccordion";
import { FicheConditions } from "@/components/property/fiche/FicheConditions";
import { FicheLocation } from "@/components/property/fiche/FicheLocation";
import { FicheAdvisorColumn } from "@/components/property/fiche/FicheAdvisorColumn";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { parseApimoDescription } from "@/lib/property-description-parser";
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

  const [images, allProperties] = await Promise.all([
    fetchPropertyImages(property.id),
    fetchAllPropertiesWithCover(),
  ]);

  const t = await getTranslations({ locale, namespace: "property" });
  const tf = await getTranslations({ locale, namespace: "fiche" });
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


  const formattedPrice = formatPrice(
    property.price,
    property.transaction,
    locale,
  );
  const txMeta = t(`tx_${property.transaction}`);

  // Specs — toutes les données Supabase préservées, "—" si absent.
  const specs = [
    { label: t("living_surface"), value: property.living_surface ? `${property.living_surface} m²` : "—" },
    { label: t("surface"), value: property.surface ? `${property.surface} m²` : "—" },
    { label: t("bedrooms"), value: property.bedrooms != null ? String(property.bedrooms) : "—" },
    { label: t("bathrooms"), value: property.bathrooms != null ? String(property.bathrooms) : "—" },
    { label: t("energy"), value: property.energy ?? "—" },
    { label: t("parking"), value: property.parking != null ? String(property.parking) : "—" },
    { label: t("year"), value: property.year ? String(property.year) : "—" },
    { label: t("land_surface"), value: property.land_surface ? `${property.land_surface} m²` : "—" },
    { label: t("terrace_surface"), value: property.terrace_surface ? `${property.terrace_surface} m²` : "—" },
  ];

  const hasDescription =
    !!description &&
    (parsedDescription.intro || parsedDescription.chapters.length > 0);

  const panels = [
    {
      id: "overview",
      label: tf("tab_overview"),
      content: (
        <div className="space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
            {tf("tab_overview_title")}
          </p>
          <p className="font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
            {title}
          </p>
          <p className="text-sm leading-relaxed text-ink-mid">
            {parsedDescription.intro
              ? parsedDescription.intro.slice(0, 280)
              : tf("overview_intro")}
          </p>
        </div>
      ),
    },
    {
      id: "description",
      label: tf("tab_description"),
      content: hasDescription ? (
        <PropertyMagazineDescription
          description={description}
          parsed={parsedDescription}
        />
      ) : (
        <p className="text-sm leading-relaxed text-ink-mid">
          {tf("overview_intro")}
        </p>
      ),
    },
    {
      id: "location",
      label: tf("tab_location"),
      content: (
        <FicheLocation
          labels={{
            title: tf("location_title"),
            env: tf("location_env"),
            na: tf("location_na"),
          }}
          city={property.city}
          country={property.country}
        />
      ),
    },
    {
      id: "conditions",
      label: tf("tab_conditions"),
      content: (
        <FicheConditions
          variant="standard"
          labels={{
            financing: tf("conditions_financing"),
            fees: tf("conditions_fees"),
            feesText: tf("conditions_fees_text"),
            process: tf("conditions_process"),
            processText: tf("conditions_process_text"),
            offmarketText: tf("conditions_offmarket_text"),
          }}
          financing={
            price > 0 && property.transaction !== "rent" ? (
              <AcquisitionSimulator
                price={price}
                country={property.country ?? "LU"}
                city={property.city ?? ""}
                variant="compact"
              />
            ) : null
          }
        />
      ),
    },
  ];

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
        <FicheHeader
          back={<BackButton fallback="/biens" />}
          actions={<PropertyActions propertyId={property.id} />}
          eyebrow={{
            lead: [property.country ?? "", property.city ?? ""],
            accent: property.badge,
          }}
          title={title}
          price={formattedPrice}
          meta={txMeta}
        />

        {/* Galerie + vidéo (POL2-10, null si absente) */}
        <PropertyGallery items={galleryItems} title={title} />
        <PropertyVideo
          videoUrl={property.video_url}
          poster={galleryItems[0]?.url}
          labels={{ eyebrow: t("video") }}
        />

        {/* Grille principale : specs + 4 onglets | colonne droite épurée */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-12">
            <FicheSpecs heading={t("specs")} items={specs} />
            <FicheAccordion panels={panels} />
          </div>

          <FicheAdvisorColumn
            labels={{
              advisor: t("advisor"),
              advisorRoles: t("advisor_block_roles"),
              exclusiveEyebrow: tf("exclusive_mandate_eyebrow"),
              exclusiveTitle: tf("exclusive_mandate_title"),
              exclusiveText: tf("exclusive_mandate_text"),
              exclusiveCta: tf("exclusive_mandate_cta"),
              searchEyebrow: tf("search_mandate_eyebrow"),
              searchTitle: tf("search_mandate_title"),
              searchText: tf("search_mandate_text"),
              searchCta: tf("search_mandate_cta"),
            }}
            searchMandateHref={`/mandats/recherche?ref=${property.slug}&type=${propertyType ?? ""}&country=${property.country ?? ""}`}
            contact={<ContactReveal variant="sidebar" align="left" />}
          />
        </div>

        {/* POL3-2 : bloc avis clients retiré des fiches biens (le
            ReviewsCarousel reste sur la home). */}

        {/* Formulaire "Une question sur ce bien ?" */}
        <section
          id="contact-form"
          className="mt-20 rounded-2xl border border-line bg-bg-soft p-8 sm:p-12"
        >
          <header className="mb-8 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("form_eyebrow")}
            </p>
            <h2 className="mt-2 t-h2">{t("form_title")}</h2>
            <p className="mt-3 text-base text-ink-mid">{t("form_subtitle")}</p>
          </header>
          <ContactForm
            type="property_request"
            source={`property:${property.slug}`}
            propertyRef={property.slug}
            defaultMessage={`Bonjour, je souhaite plus d'informations sur le bien : ${title}.`}
          />
        </section>

        {/* Biens similaires */}
        {similar.length > 0 && (
          <section className="mt-20 mb-16">
            <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("similar")}
            </h2>
            <SignatureLine width="w-8" />
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
