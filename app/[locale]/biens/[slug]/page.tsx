import type { Metadata } from "next";
import { withPageMessages } from "@/components/i18n/withPageMessages";
import { brandedTitle, htmlToPlainText, metaDescription } from "@/lib/meta-text";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  fetchSimilarFor,
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
import { clipText, descriptionBlocks, descriptionPlainText, descriptionSummary } from "@/lib/listing/description-text";
import { JsonLd } from "@/components/seo/JsonLd";
import { realEstateListing } from "@/lib/seo";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { ExploreLinks } from "@/components/seo/ExploreLinks";
import { cityForProperty, featuredCities } from "@/lib/internal-links";
import { siteShareImage } from "@/lib/og";
import { transactionDetailLabel } from "@/lib/taxonomy/property-types";
import { effectiveBadge } from "@/lib/listing/families";
import { photoAlt, seoMetaDescription, seoTitle, splitCommonMentions, typeName, type SeoProperty } from "@/lib/listing/listing-seo";
import { generateEnding, type ListingColumns } from "@/lib/listing/generate";
import { publicListingTemplates } from "@/lib/listing/public-templates";
import { propertyPathFor, propertyPaths, seoContext } from "@/lib/listing/property-paths";
import { sanitizeListingData, type ListingLang } from "@/lib/listing/listing-data";
import { fetchSearchesForCity } from "@/lib/searches/data";
import { SearchCard } from "@/components/searches/SearchCard";
import { withSocial } from "@/lib/seo-page-meta";
import type { Property } from "@/lib/types";
import { availableFirst, bannerOf, isClosed } from "@/lib/property-banner";

const langOf = (locale: string): ListingLang => (locale === "en" || locale === "de" ? locale : "fr");

function seoProperty(p: Property): SeoProperty {
  return {
    slug: p.slug,
    property_type: (p as { property_type?: string | null }).property_type ?? null,
    transaction: p.transaction,
    bedrooms: p.bedrooms ?? null,
    surface: p.surface ?? null,
    living_surface: p.living_surface ?? null,
    city: p.city ?? null,
    price: p.price ?? null,
    price_on_demand: (p as { price_on_demand?: boolean }).price_on_demand ?? false,
  };
}

/** Description sans montant (bien Vendu ou Loue) : phrases citant un prix retirees. */
function withoutPrices(text: string): string {
  const PRICE = /\d[\d\s.,\u00a0\u202f']*\s?(€|eur\b|euros?\b)|€\s?\d/i;
  if (!PRICE.test(text)) return text;
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((p) => !PRICE.test(p))
    .join(" ")
    .trim();
}

/** Reperes de la fin ecrite a la main, des trois langues (texte non traduit compris). */
const ALL_COMMON_MARKERS = (["fr", "en", "de"] as const).flatMap((l) => seoContext(l).seo.common_start);

/** Colonnes du bien lues par le modele (meta description). */
function listingColumnsOf(p: Property): ListingColumns {
  const x = p as Property & Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    property_type: (x.property_type as string | null) ?? null,
    transaction: p.transaction,
    mandate_type: p.mandate_type ?? null,
    city: p.city ?? null,
    year_built: num(x.year) ?? num(x.year_built),
    surface: p.surface ?? null,
    living_surface: p.living_surface ?? null,
    usable_surface: num(x.usable_surface),
    land_surface: p.land_surface ?? null,
    terrace_surface: p.terrace_surface ?? null,
    balcony_surface: num(x.balcony_surface),
    garden_surface: num(x.garden_surface),
    bedrooms: p.bedrooms ?? null,
    parking: p.parking ?? null,
    has_pool: x.has_pool === true,
    floor: (x.floor as string | null) ?? null,
    price: p.price ?? null,
    price_on_demand: x.price_on_demand === true,
    current_use: (x.current_use as string | null) ?? null,
  };
}

/** Canonique et hreflang : l'adresse lisible de chaque langue. */
function propertyAlternates(p: Property, locale: string) {
  const paths = propertyPaths(seoProperty(p));
  return {
    canonical: `/${locale}${paths[langOf(locale)]}`,
    languages: { fr: `/fr${paths.fr}`, en: `/en${paths.en}`, de: `/de${paths.de}`, "x-default": `/fr${paths.fr}` },
  };
}

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
// Quotas Vercel (oct. 2026, docs/vercel-quotas.md) : revalidation a la
// demande quand le contenu change ; minuterie de secours de 30 jours seulement.
export const revalidate = 2592000;

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
    // Adresse lisible de chaque langue (la fiche redirige les autres).
    return routing.locales.flatMap((locale) =>
      properties
        .filter((p) => typeof p.slug === "string" && p.slug.length > 0)
        .map((p) => ({ locale, slug: propertyPathFor(seoProperty(p), langOf(locale)).replace(/^\/biens\//, "") })),
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
  if (!price) return "";
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
  const lang = langOf(locale);
  const ctx = seoContext(lang);
  // Oct. 2026 : title construite par le modele (mots recherches d'abord,
  // sans qualificatif) ; meta construite depuis les faits du bien, ou
  // "Description Google" saisie dans l'admin. Repli : ancienne meta.
  const sp = seoProperty(property);
  // Nov. 2026 : bien Vendu ou Loue (bandeau, SQL 35) : la description
  // Google ne cite plus aucun prix (prix retire des faits, description
  // saisie ignoree, phrases avec un montant retirees du repli).
  const closedForSeo = isClosed(property);
  const listingForMeta = sanitizeListingData(property.listing_data ?? null);
  if (closedForSeo) for (const l of ["fr", "en", "de"] as const) listingForMeta.written[l].seo_description = "";
  const rawDescription =
    seoMetaDescription(closedForSeo ? { ...listingColumnsOf(property), price: null } : listingColumnsOf(property), listingForMeta, lang, { vocab: ctx.vocab, seo: ctx.seo, fallbackType: ctx.subtypes[sp.property_type ?? ""] }) ||
    metaDescription(descriptionPlainText(splitCommonMentions(pickLang(property, "description", locale as Locale) ?? "", ALL_COMMON_MARKERS).body));
  const description = closedForSeo ? withoutPrices(rawDescription) : rawDescription;
  const pageTitle = seoTitle(sp, lang, { ...ctx, fallbackType: ctx.subtypes[sp.property_type ?? ""] });
  const images = await fetchPropertyImages(property.id);
  // Carte de partage : photo principale de l'admin, sinon image du site.
  const shareImage = images[0]?.url ?? siteShareImage();
  const alternates = propertyAlternates(property, locale);

  // Partage : titre, description et adresse de la page (oct. 2026).
  return withSocial(
    locale,
    { title: { absolute: pageTitle || brandedTitle(title) }, description: description || undefined, alternates },
    { image: shareImage },
  );
}

async function PropertyPage({
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

  // Adresse lisible et stable (oct. 2026) : toute autre adresse du bien
  // (slug, identifiant, ancien titre) redirige de facon permanente (308).
  const lang = langOf(locale);
  const canonicalPath = propertyPathFor(seoProperty(property), lang);
  if (decodeURIComponent(slug) !== canonicalPath.replace(/^\/biens\//, "")) permanentRedirect(`/${locale}${canonicalPath}`);
  const seoCtx = seoContext(lang);

  type AnyProperty = typeof property & { property_type?: string | null };
  const propertyType =
    (property as AnyProperty).property_type ?? property.badge ?? null;
  const [images, similar] = await Promise.all([
    fetchPropertyImages(property.id),
    // Biens similaires (logique : lib/similar-properties.ts), cache par fiche
    // (oct. 2026, quotas Vercel).
    fetchSimilarFor({ id: property.id, transaction: property.transaction, country: property.country, property_type: propertyType, badge: property.badge, price: property.price, city: property.city }),
  ]);

  const t = await getTranslations({ locale, namespace: "property" });
  const tf = await getTranslations({ locale, namespace: "fiche" });
  const tBanner = await getTranslations({ locale, namespace: "status_banner" });
  // Bandeau (SQL 35) : Vendu et Loue remplacent le prix et ne sont plus
  // disponibles (donnees structurees) ; Sous compromis garde le prix.
  const banner = bannerOf(property);
  const closed = banner?.kind === "sold" || banner?.kind === "rented";
  const tEx = await getTranslations({ locale, namespace: "explore" });
  const title = pickLang(property, "title", locale as Locale);
  // Mentions communes (cloture, signature, service multilingue, copyright)
  // affichees dans un bloc distinct, hors du corps de la description. Le
  // texte complet reste en base pour les exports vers les portails.
  // Oct. 2026 : la fin affichee est celle du modele (Parametres > Modeles
  // d'annonces), remplie avec les donnees du bien ; la fin ecrite a la main
  // dans la description n'est pas affichee (jamais deux fins). Sans fin
  // dans le tronc, l'ancienne fin reste affichee.
  const split = splitCommonMentions(pickLang(property, "description", locale as Locale) ?? "", ALL_COMMON_MARKERS);
  const description = split.body;
  const ending =
    generateEnding(listingColumnsOf(property), sanitizeListingData(property.listing_data ?? null), lang, await publicListingTemplates(lang), seoCtx.vocab, seoCtx.seo.common_start) ||
    split.common;
  // Oct. 2026 : description structuree a l'affichage (paragraphes, listes,
  // gras, sans hashtags) ; resume et donnees structurees en texte court.
  const summary = clipText(descriptionSummary(description), 280);

  type GalleryItem = { type: "image" | "video"; url: string; alt?: string };
  // Galerie photos uniquement — la vidéo est isolée en pleine largeur (cf. <section> ci-dessous).
  // Textes alternatifs (oct. 2026) : saisi photo par photo, sinon la piece
  // associee et sa description, puis le type de bien et la localite.
  const listingRooms = new Map(
    sanitizeListingData(property.listing_data ?? null).levels.flatMap((lv) => lv.rooms.map((r) => [r.id, r.text[lang]] as const)),
  );
  const typeLabel = typeName(seoProperty(property).property_type, lang, seoCtx.types, seoCtx.subtypes[seoProperty(property).property_type ?? ""]);
  const galleryItems: GalleryItem[] = images.map((img, i) => ({
    type: "image",
    url: img.url,
    alt: photoAlt(
      { custom: img[`alt_${lang}` as const] ?? null, room: img.room_id ? listingRooms.get(img.room_id) ?? null : null, index: i, typeLabel, city: property.city, title: htmlToPlainText(title) },
      seoCtx.seo,
    ),
  }));
  // Page de ville du bien : choix de l'admin, sinon ville saisie et alias.
  const propertyFacts = sanitizeListingData(property.listing_data ?? null).facts;
  const propertyCity = cityForProperty({ city: property.city, country: property.country, city_page: propertyFacts.city_page, city_commune: propertyFacts.city_commune });
  const citySlug = propertyCity?.slug ?? null;
  const citySearches = citySlug ? await fetchSearchesForCity(citySlug) : [];

  // Biens similaires : logique stricte V3 (meme type, prix a 15 % pres, meme
  // pays, meme ville en tete), dans lib/similar-properties.ts.
  const price = property.price ?? 0;

  const propertyJsonLd = realEstateListing({
    name: title,
    description: clipText(descriptionPlainText(description), 500),
    url: `${SITE_URL}/${locale}${canonicalPath}`,
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
    transaction: property.transaction,
    available: !closed,
  });


  const formattedPrice = closed
    ? tBanner(banner?.kind === "rented" ? "rented_price" : "sold_price")
    : formatPrice(property.price, property.transaction, locale);
  // Libellé riche (ex. "Vente en viager") si transaction_detail est renseigné
  // (saisie manuelle post sept. 2026) ; sinon Vente/Location comme avant
  // (les 16 biens Apimo existants, sans transaction_detail).
  const txMeta =
    transactionDetailLabel(property.transaction_detail) ??
    t(`tx_${property.transaction}`);

  // Specs — toutes les données Supabase préservées, "—" si absent.
  const specs = [
    { label: t("living_surface"), value: property.living_surface ? formatSurface(property.living_surface, locale) : "" },
    { label: t("surface"), value: property.surface ? formatSurface(property.surface, locale) : "" },
    { label: t("bedrooms"), value: property.bedrooms != null ? String(property.bedrooms) : "" },
    { label: t("bathrooms"), value: property.bathrooms != null ? String(property.bathrooms) : "" },
    { label: t("energy"), value: property.energy ?? "" },
    { label: t("parking"), value: property.parking != null ? String(property.parking) : "" },
    { label: t("year"), value: property.year ? String(property.year) : "" },
    { label: t("land_surface"), value: property.land_surface ? formatSurface(property.land_surface, locale) : "" },
    { label: t("terrace_surface"), value: property.terrace_surface ? formatSurface(property.terrace_surface, locale) : "" },
  ];

  const hasDescription = descriptionBlocks(description).length > 0;

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
            {summary || tf("overview_intro")}
          </p>
        </div>
      ),
    },
    {
      id: "description",
      label: tf("tab_description"),
      content: (
        <>
          {hasDescription ? (
            <PropertyMagazineDescription description={description} />
          ) : (
            <p className="text-sm leading-relaxed text-ink-mid">
              {tf("overview_intro")}
            </p>
          )}
          {ending ? (
            <section data-listing-mentions className="mt-8 border-t border-line pt-6">
              <PropertyMagazineDescription description={ending} />
            </section>
          ) : null}
        </>
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
            // Bien Vendu ou Loue : plus de simulateur d'achat (nov. 2026).
            price > 0 && property.transaction !== "rent" && !closed ? (
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
  const canonicalUrl = `https://mapaproperty.lu/${locale}${canonicalPath}`;

  return (
    <article className="pt-24 lg:pt-32">
      <PropertyViewTracker
        propertyId={property.id}
        commune={property.city ?? undefined}
        price={property.price}
        offmarket={false}
      />
      <JsonLd data={propertyJsonLd} />
      <PageBreadcrumb locale={locale} path={canonicalPath} current={htmlToPlainText(title)} />
      {/* Print-only : entete avec le logo officiel sur fond clair (SVG) + URL
          canonique. Invisible a l'ecran. */}
      <div data-fiche-print-header className="hidden print:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/mapa-logo-fond-clair.svg" alt="" aria-hidden="true" />
      </div>
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <FicheHeader
          back={<BackButton fallback="/biens" />}
          actions={<PropertyActions propertyId={property.id} />}
          eyebrow={{
            lead: [property.country ?? "", property.city ?? ""],
            // Etiquette commerciale (Exclusivite comprise) : jamais avec un bandeau.
            accent: banner ? null : effectiveBadge(property.badge, property.mandate_type),
          }}
          title={title}
          price={formattedPrice}
          meta={txMeta}
        />

        {/* Galerie + vidéo (POL2-10, null si absente) */}
        <PropertyGallery items={galleryItems} title={title} banner={banner} />
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
                const c = propertyCity;
                return c ? [c] : featuredCities().slice(0, 4);
              })()}
            />
          </div>
        </section>

        {/* Recherches en cours dans la commune du bien (oct. 2026). */}
        {citySearches.length > 0 && (
          <section className="mt-16 print:hidden" data-fiche-city-searches>
            <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">{tEx("fiche_searches_title", { city: property.city ?? "" })}</h2>
            <ul className="mt-6 grid gap-5 md:grid-cols-2">
              {citySearches.slice(0, 2).map((s) => (
                <li key={s.id}>
                  <SearchCard search={s} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Biens similaires */}
        {similar.length > 0 && (
          <section className="mt-20 mb-16 print:hidden">
            <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("similar")}
            </h2>
            <SignatureLine width="w-8" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {availableFirst(similar).map((p) => (
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

// Traductions des composants client de la page seulement (oct. 2026, quotas Vercel).
export default withPageMessages(PropertyPage, ["acquisition_simulator", "ai_transparency", "common", "contact", "form", "property", "rgpd", "status_banner"]);
