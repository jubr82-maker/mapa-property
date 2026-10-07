import type { Metadata } from "next";
import { brandedTitle, htmlToPlainText, metaDescription } from "@/lib/meta-text";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  fetchAllPropertiesWithCover,
  fetchOffmarketById,
  fetchPropertyByIdOrSlug,
  fetchPropertyImages,
  fetchPublishedProperties,
} from "@/lib/data";
import { routing } from "@/i18n/routing";
import { pickLang, type Locale } from "@/lib/types";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { PropertyActions } from "@/components/property/PropertyActions";
import { PropertyCard } from "@/components/property/PropertyCard";
import { ContactForm } from "@/components/forms/ContactForm";
import { BackButton } from "@/components/ui/BackButton";
import { ContactReveal } from "@/components/contact-reveal";
import { AcquisitionSimulator } from "@/components/property/AcquisitionSimulator";
import { PropertyMagazineDescription } from "@/components/property/PropertyMagazineDescription";
import { formatPrice as formatPriceShared, formatSurface } from "@/lib/format/numbers";
import { PropertyVideo } from "@/components/property/PropertyVideo";
import { PropertyViewTracker } from "@/components/property/PropertyViewTracker";
import { FicheHeader } from "@/components/property/fiche/FicheHeader";
import { FicheSpecs } from "@/components/property/fiche/FicheSpecs";
import { FicheAccordion } from "@/components/property/fiche/FicheAccordion";
import { FicheConditions } from "@/components/property/fiche/FicheConditions";
import { FicheLocation } from "@/components/property/fiche/FicheLocation";
import { FicheAdvisorColumn } from "@/components/property/fiche/FicheAdvisorColumn";
import { PrintAdvisorContact } from "@/components/property/fiche/PrintAdvisorContact";
import { SignatureLine } from "@/components/ui/SignatureLine";
import {
  parseApimoDescription,
  ALL_SECTION_TITLE_KEYS,
} from "@/lib/property-description-parser";
import { JsonLd } from "@/components/seo/JsonLd";
import { realEstateListing, pageAlternates } from "@/lib/seo";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { ExploreLinks } from "@/components/seo/ExploreLinks";
import { cityForPlace, featuredCities } from "@/lib/internal-links";
import { siteShareImage } from "@/lib/og";
import { transactionDetailLabel } from "@/lib/taxonomy/property-types";
import { effectiveBadge } from "@/lib/listing/families";

// Sprint OPTIM-1A : ISR 30 min (vs 60s avant). Les fiches biens changent
// rarement (titre/description/prix edites depuis admin invalident deja
// /fr/biens via revalidatePath dans admin/properties/actions.ts).
// generateStaticParams ci-dessous pre-build les pages au deploy ->
// premiere visite = HIT cache au lieu d'une regeneration ISR.
//
// Sprint OPTIM-1B C5 : passage 1800s -> 86400s (24h). Cause de ~870
// writes ISR/jour observes en prod : crawlers Google/Bing visitent les
// ~45 fiches pre-buildees (15 biens x 3 locales) ; chaque visite apres
// la fenetre 1800s declenchait 1 write. A 86400s, plafond ~45 writes/jour
// (95% reduction). Fraicheur preservee : revalidatePath admin invalide
// immediatement sur save (admin/properties/actions.ts) et le re-import
// Apimo invalide aussi. Defaut accepte : un bien edite hors flux admin
// (ex. SQL direct) attendra 24h pour propager publiquement.
export const revalidate = 86400;

/**
 * Sprint OPTIM-1A : pre-build des fiches biens publiees pour les 3 locales.
 * Permet a Next.js de generer ces routes au build au lieu de les construire
 * a la demande au premier visiteur. Combine avec revalidate: 1800s, ca
 * passe les writes ISR fiches biens de ~tous les 60s a tous les 30 min
 * (et seulement si quelqu'un les visite).
 *
 * Source : fetchPublishedProperties() (table properties, is_published=true).
 * On exclut les rows sans slug (resolveur fetchPropertyByIdOrSlug accepte
 * aussi UUID/reference mais le slug est l'URL canonique). En cas d'erreur
 * fetch (Supabase down au build), retourne [] -> Next bascule en dynamic
 * rendering, le site reste up.
 */
export async function generateStaticParams() {
  try {
    const properties = await fetchPublishedProperties();
    const slugs = properties
      .map((p) => p.slug)
      .filter((s): s is string => typeof s === "string" && s.length > 0);
    return routing.locales.flatMap((locale) =>
      slugs.map((slug) => ({ locale, slug })),
    );
  } catch (e) {
    console.warn("[biens/[slug]] generateStaticParams failed:", e);
    return [];
  }
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

// Bug corrige (mission "surfaces decimales, formats de nombres...") :
// l'ancienne version formatait toujours en "fr-LU" pour fr ET en, ce qui
// affichait "500.000 €" (convention allemande) sur les fiches anglaises
// au lieu de "€500,000". Remplacee par la fonction partagee.
const formatPrice = (
  price: number | null,
  transaction: string,
  locale: string,
) => {
  if (!price) return "—";
  const value = formatPriceShared(price, locale);
  return transaction === "rent" ? `${value} / mois` : value;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const property = await fetchPropertyByIdOrSlug(slug);
  if (!property) return {};

  const title = pickLang(property, "title", locale as Locale);
  // SEO oct. 2026 : la description est du HTML (editeur TipTap) ; la meta
  // et og:description recoivent un texte sans balise ni entite, coupe
  // proprement a 155 caracteres.
  const description = metaDescription(
    pickLang(property, "description", locale as Locale),
  );
  const images = await fetchPropertyImages(property.id);
  // Carte de partage : photo principale de l'admin, sinon image du site.
  const shareImage = images[0]?.url ?? siteShareImage();
  const path = `/biens/${property.slug}`;
  const shareTitle = htmlToPlainText(title);

  // Open Graph et carte X identiques (meme titre, description et image) :
  // sans champ twitter, la fiche heritait de la carte generique du layout.
  return {
    title: brandedTitle(title),
    description: description || undefined,
    alternates: pageAlternates(locale, path),
    openGraph: {
      title: shareTitle,
      description: description || undefined,
      url: `/${locale}${path}`,
      siteName: "MAPA Property",
      type: "website",
      images: [{ url: shareImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: description || undefined,
      images: [shareImage],
    },
  };
}

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
      if (off) permanentRedirect(`/${locale}/off-market/${off.id}`);
    }
    notFound();
  }

  const [images, allProperties] = await Promise.all([
    fetchPropertyImages(property.id),
    fetchAllPropertiesWithCover(),
  ]);

  const t = await getTranslations({ locale, namespace: "property" });
  const tf = await getTranslations({ locale, namespace: "fiche" });
  const tEx = await getTranslations({ locale, namespace: "explore" });
  const title = pickLang(property, "title", locale as Locale);
  const description = pickLang(property, "description", locale as Locale);
  // Sprint UI-I18N : on construit le dict { titleKey -> label localise }
  // depuis le namespace fiche.section_* et on le passe au parser pour
  // que les titres H3/H4 detectes (FR/EN/DE) soient rendus dans la
  // locale courante au lieu d'etre hardcodes en FR.
  const sectionTitles = Object.fromEntries(
    ALL_SECTION_TITLE_KEYS.map((k) => [k, tf(`section_${k}`)]),
  );
  const parsedDescription = parseApimoDescription(description, {
    titles: sectionTitles,
  });

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

  const propertyJsonLd = realEstateListing({
    name: title,
    description: htmlToPlainText(description).slice(0, 500),
    url: `${SITE_URL}/${locale}/biens/${property.slug}`,
    images: galleryItems.map((g) => g.url).slice(0, 12),
    datePosted: (property as { created_at?: string | null }).created_at ?? null,
    dateModified: (property as { updated_at?: string | null }).updated_at ?? null,
    identifier: property.slug ?? property.id,
    locale,
    price: property.price,
    city: property.city,
    country: property.country,
    surface: property.surface,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    propertyType,
  });


  const formattedPrice = formatPrice(
    property.price,
    property.transaction,
    locale,
  );
  // Libellé riche (ex. "Vente en viager") si transaction_detail est renseigné
  // (saisie manuelle post sept. 2026) ; sinon Vente/Location comme avant
  // (les 16 biens Apimo existants, sans transaction_detail).
  const txMeta =
    transactionDetailLabel(property.transaction_detail) ??
    t(`tx_${property.transaction}`);

  // Specs — toutes les données Supabase préservées, "—" si absent.
  const specs = [
    { label: t("living_surface"), value: property.living_surface ? formatSurface(property.living_surface, locale) : "—" },
    { label: t("surface"), value: property.surface ? formatSurface(property.surface, locale) : "—" },
    { label: t("bedrooms"), value: property.bedrooms != null ? String(property.bedrooms) : "—" },
    { label: t("bathrooms"), value: property.bathrooms != null ? String(property.bathrooms) : "—" },
    { label: t("energy"), value: property.energy ?? "—" },
    { label: t("parking"), value: property.parking != null ? String(property.parking) : "—" },
    { label: t("year"), value: property.year ? String(property.year) : "—" },
    { label: t("land_surface"), value: property.land_surface ? formatSurface(property.land_surface, locale) : "—" },
    { label: t("terrace_surface"), value: property.terrace_surface ? formatSurface(property.terrace_surface, locale) : "—" },
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
            mapMore: tf("location_map_more"),
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

  // URL print-only : domaine final hardcode (SITE_URL peut resoudre
  // beta.mapaproperty.lu ou *.vercel.app en staging — inadapte pour un
  // document imprime distribue aux clients).
  const canonicalUrl = `https://mapaproperty.lu/${locale}/biens/${property.slug}`;

  return (
    <article className="pt-24 lg:pt-32">
      <PropertyViewTracker
        propertyId={property.id}
        commune={property.city ?? undefined}
        price={property.price}
        offmarket={false}
      />
      <JsonLd data={propertyJsonLd} />
      <PageBreadcrumb locale={locale} path={`/biens/${property.slug}`} current={htmlToPlainText(title)} />
      {/* Print-only : entete avec le logo officiel sur fond clair (SVG) + URL
          canonique. Invisible a l'ecran. */}
      <div data-fiche-print-header className="hidden print:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/mapa-logo-fond-clair.svg" alt="MAPA Property" />
      </div>
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <FicheHeader
          back={<BackButton fallback="/biens" />}
          actions={<PropertyActions propertyId={property.id} />}
          eyebrow={{
            lead: [property.country ?? "", property.city ?? ""],
            accent: effectiveBadge(property.badge, property.mandate_type),
          }}
          title={title}
          price={formattedPrice}
          meta={txMeta}
        />

        {/* Galerie + vidéo (POL2-10, null si absente) */}
        <PropertyGallery items={galleryItems} title={title} />
        <div className="print:hidden">
          <PropertyVideo
            videoUrl={property.video_url}
            poster={galleryItems[0]?.url}
            labels={{ eyebrow: t("video") }}
          />
        </div>

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
              advisorPhotoAlt: t("advisor_photo_alt"),
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
            contact={
              <ContactReveal
                variant="sidebar"
                align="left"
                propertyId={property.slug}
                propertyTitle={title}
              />
            }
          />
        </div>

        {/* Print-only : carte conseiller. Nom et fonction en clair ;
            telephone et e-mail seulement s'ils ont ete reveles d'un clic
            (decision de Julien, oct. 2026 : rien dans le HTML servi). */}
        <section
          data-fiche-print-advisor
          className="hidden print:block"
        >
          <h3 className="font-display text-base font-bold">
            {t("print_advisor_title")}
          </h3>
          <p className="mt-2 font-display text-sm">Julien Brebion</p>
          <p className="whitespace-pre-line font-mono text-[10px] uppercase tracking-[0.25em]">
            {t("advisor_block_roles")}
          </p>
          <PrintAdvisorContact
            labels={{
              hint: t("print_contact_hint"),
              phone: t.raw("print_phone") as string,
              email: t.raw("print_email") as string,
            }}
          />
          <p className="mt-3 text-xs">
            {t("print_listing")}{" "}
            <a href={canonicalUrl}>{canonicalUrl}</a>
          </p>
        </section>

        {/* POL3-2 : bloc avis clients retiré des fiches biens (le
            ReviewsCarousel reste sur la home). */}

        {/* Formulaire "Une question sur ce bien ?" */}
        <section
          id="contact-form"
          className="mt-20 rounded-2xl border border-line bg-bg-soft p-8 sm:p-12 print:hidden"
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
            propertyTitle={title}
            defaultMessage={`Bonjour, je souhaite plus d'informations sur le bien : ${title}.`}
          />
        </section>

        {/* Maillage (oct. 2026) : page de la ville du bien, si elle existe,
            et simulateurs. */}
        <section className="mt-16 border-t border-line pt-10 print:hidden">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">{tEx("fiche_title")}</h2>
          <div className="mt-6">
            <ExploreLinks
              cities={(() => {
                const c = cityForPlace(property.city);
                return c ? [c] : featuredCities().slice(0, 4);
              })()}
            />
          </div>
        </section>

        {/* Biens similaires */}
        {similar.length > 0 && (
          <section className="mt-20 mb-16 print:hidden">
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

        {/* Print-only : pied de page sobre. Pas d'IBAN/BIC. */}
        <footer
          data-fiche-print-footer
          className="hidden print:block"
        >
          {/* Numeros RCS, TVA et AE : uniquement dans les mentions legales
              (regle du projet). */}
          <p>{t("print_footer_brand")}</p>
          <p>www.mapaproperty.lu</p>
        </footer>
      </div>
    </article>
  );
}
