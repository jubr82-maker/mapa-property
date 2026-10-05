import { CHILD_TO_PARENT, PROPERTY_TYPE_FAMILIES } from "./taxonomy/property-types";
import { siteLogo, siteShareImage } from "./og";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

// Etablissement unique des donnees structurees (oct. 2026, regle de
// Julien). MAPA Property a deux bureaux reels : celui de Luxembourg-Ville
// n'est JAMAIS publie ; seul celui de Dudelange est public (fiche Google
// Business Profile verifiee). Sur toutes les pages et dans les trois
// langues : nom "MAPA Property" (regle de marque), nom legal "MAPA Synergy
// Sarl", categorie agence immobiliere (RealEstateAgent), adresse de
// Dudelange identique a la fiche Google, creation en 2024 (lancement de la
// marque, indique sur la page Qui sommes-nous), profils publics officiels.
// JAMAIS : telephone, e-mail, coordonnees geographiques, adresse de
// Luxembourg-Ville, note ou avis ; RCS, TVA et autorisation
// d'etablissement restent sur les mentions legales (page dediee).
export const ORGANIZATION_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "26 Rue du Commerce",
  postalCode: "L-3450",
  addressLocality: "Dudelange",
  addressCountry: "LU",
} as const;

/** Pays servis : Luxembourg (agence), puis international (broker). */
export const AREA_SERVED = [
  { "@type": "Country", name: "Luxembourg" },
  { "@type": "Country", name: "France" },
  { "@type": "Country", name: "Belgium" },
  { "@type": "Country", name: "Switzerland" },
  { "@type": "Country", name: "Germany" },
  { "@type": "Country", name: "Italy" },
  { "@type": "Country", name: "Spain" },
  { "@type": "Country", name: "Portugal" },
  { "@type": "Country", name: "Monaco" },
  { "@type": "Country", name: "United Arab Emirates" },
];

export const realEstateAgent = (locale: string) => ({
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": `${SITE_URL}#organization`,
  name: "MAPA Property",
  legalName: "MAPA Synergy Sàrl",
  url: SITE_URL,
  logo: siteLogo(),
  image: siteShareImage(),
  description:
    locale === "en"
      ? "Luxembourg real estate agency and international broker."
      : locale === "de"
        ? "Luxemburger Immobilienagentur und internationaler Broker."
        : "Agence immobilière luxembourgeoise et broker international.",
  foundingDate: "2024",
  address: ORGANIZATION_ADDRESS,
  knowsLanguage: ["fr", "en", "de"],
  areaServed: AREA_SERVED,
  sameAs: [
    "https://www.linkedin.com/showcase/mapa-property/",
    "https://www.instagram.com/mapa_property",
    "https://www.facebook.com/people/MAPA-Property/61559121213209/",
  ],
  founder: {
    "@type": "Person",
    name: "Julien Brebion",
    jobTitle: "Co-fondateur · Directeur Immobilier · Exclusive Sourcing Specialist",
  },
});

export const homepageGraph = (locale: string) => ({
  "@context": "https://schema.org",
  "@graph": [
    realEstateAgent(locale),
    personJulien(),
    website(locale),
  ],
});

export const personJulien = () => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${SITE_URL}#julien`,
  name: "Julien Brebion",
  jobTitle: "Co-fondateur · Directeur Immobilier · Exclusive Sourcing Specialist",
  worksFor: { "@id": `${SITE_URL}#organization` },
  // Portable personnel volontairement exclu du JSON-LD (anti-scraping,
  // aucun telephone ni e-mail dans les donnees structurees (cf.
  // commentaire ORGANIZATION_ADDRESS).
  sameAs: [
    "https://www.linkedin.com/in/julien-brebion/",
  ],
});

// ----------------------------------------------------------------------
// alternates (canonical + hreflang) — format UNIQUE pour tout le site.
// ----------------------------------------------------------------------
// Bug corrigé (audit PageSpeed "canonical mène vers un hreflang") : Next.js
// fusionne les metadata par segment de route en SHALLOW MERGE (confirmé
// dans node_modules/next/dist/docs/.../generate-metadata.md — un champ
// imbriqué comme `alternates`, s'il n'est pas redéfini par une page, est
// hérité TEL QUEL du layout parent). Le layout racine déclare
// `alternates.canonical: "/${locale}"` (la home) — sans son propre
// `alternates`, N'IMPORTE QUELLE page hérite ce canonical vers la home,
// et les hreflang statiques du layout, au lieu des siens.
//
// pageAlternates() doit être appelé par CHAQUE page (ou une valeur
// équivalente construite à la main) pour que son canonical pointe vers
// SA PROPRE URL et que ses hreflang listent les 3 langues de LA MÊME page.
const LOCALES = ["fr", "en", "de"] as const;
// Codes de langue SANS region (oct. 2026) : le site sert une version par
// langue, pas par pays. x-default -> version francaise.
const HREFLANG_BY_LOCALE: Record<(typeof LOCALES)[number], string> = {
  fr: "fr",
  en: "en",
  de: "de",
};

/**
 * @param locale locale de la page courante (fr/en/de)
 * @param path chemin SANS préfixe de locale, commençant par "/" (ex.
 *   "/biens/86388715") — ou "" pour la home.
 */
export function pageAlternates(locale: string, path: string) {
  const cleanPath = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[HREFLANG_BY_LOCALE[l]] = `/${l}${cleanPath}`;
  }
  languages["x-default"] = `/fr${cleanPath}`;
  return {
    canonical: `/${locale}${cleanPath}`,
    languages,
  };
}

export const website = (locale: string) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: `${SITE_URL}/${locale}`,
  name: "MAPA Property",
  publisher: { "@id": `${SITE_URL}#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/${locale}/biens?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

interface BreadcrumbItem {
  name: string;
  url: string;
}

export const breadcrumb = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: item.name,
    item: item.url,
  })),
});

// Type schema.org le plus proche du type de bien (vérifié sur schema.org :
// Accommodation existe, sous-types confirmés Apartment/House/Room/Suite/
// CampingPitch — "SingleFamilyResidence" n'est pas un sous-type confirmé,
// on ne l'utilise pas). Fallback générique "Accommodation" si le type
// précis ne se range ni sous la famille appartement ni maison (terrain,
// local professionnel, immeuble, etc. — pas de sous-type Accommodation
// pertinent pour ceux-là).
function accommodationTypeFor(
  propertyType: string | null | undefined,
): "House" | "Apartment" | "Accommodation" {
  if (!propertyType) return "Accommodation";
  const parent = CHILD_TO_PARENT[propertyType] ?? propertyType;
  if (parent === "appartement") return "Apartment";
  if (parent === "maison") return "House";
  return "Accommodation";
}

/** Libellé humain du type précis (ex. "penthouse" -> "Penthouse"), depuis
 * la taxonomie MAPA — pour l'AEO/LLMO (les schema.org House/Apartment sont
 * trop grossiers pour distinguer un penthouse d'un studio). */
function propertyTypeLabel(propertyType: string | null | undefined): string | undefined {
  if (!propertyType) return undefined;
  for (const family of PROPERTY_TYPE_FAMILIES) {
    const match = family.types.find((t) => t.slug === propertyType);
    if (match) return match.label;
  }
  return undefined;
}

interface RealEstateListingInput {
  name: string;
  description: string;
  url: string;
  /** Photos publiques du bien (ordre de l'admin), adresses absolues. */
  images?: string[];
  /** Dates reelles de la fiche (colonnes created_at, updated_at). */
  datePosted?: string | null;
  dateModified?: string | null;
  /** Reference publique (slug) du bien. */
  identifier?: string | null;
  /** Locale de la page courante (fr/en/de) -> inLanguage. */
  locale: string;
  /** null/absent = prix sur demande, omis du JSON-LD (jamais inventé). */
  price?: number | null;
  /** Ville uniquement — jamais d'adresse exacte (règle off-market). */
  city?: string | null;
  country?: string | null;
  surface?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  /** Slug taxonomie MAPA (lib/taxonomy/property-types.ts). */
  propertyType?: string | null;
}

/**
 * JSON-LD RealEstateListing (schema.org, sous-type WebPage — vérifié via
 * schema.org, pas devinée) pour une fiche bien publique. L'offre imbriquée
 * référence un type Accommodation/House/Apartment portant les specs
 * (floorSize, numberOfBedrooms, numberOfBathroomsTotal) — ces propriétés
 * n'existent pas directement sur RealEstateListing ni Product. Chaque
 * champ absent des données réelles est omis, jamais inventé.
 */
export const realEstateListing = (p: RealEstateListingInput) => {
  const accommodationType = accommodationTypeFor(p.propertyType);
  const typeLabel = propertyTypeLabel(p.propertyType);
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.name,
    description: p.description,
    url: p.url,
    inLanguage: p.locale,
    ...(p.images && p.images.length ? { image: p.images } : {}),
    ...(p.datePosted ? { datePosted: p.datePosted } : {}),
    ...(p.dateModified ? { dateModified: p.dateModified } : {}),
    ...(p.identifier ? { identifier: p.identifier } : {}),
    provider: { "@id": `${SITE_URL}#organization` },
    offers: {
      "@type": "Offer",
      ...(p.price ? { price: p.price, priceCurrency: "EUR" } : {}),
      availability: "https://schema.org/InStock",
      url: p.url,
      itemOffered: {
        "@type": accommodationType,
        name: p.name,
        ...(typeLabel
          ? {
              additionalProperty: [
                { "@type": "PropertyValue", name: "propertyType", value: typeLabel },
              ],
            }
          : {}),
        ...(p.surface
          ? { floorSize: { "@type": "QuantitativeValue", value: p.surface, unitCode: "MTK" } }
          : {}),
        ...(p.bedrooms != null ? { numberOfBedrooms: p.bedrooms } : {}),
        ...(p.bathrooms != null ? { numberOfBathroomsTotal: p.bathrooms } : {}),
        ...(p.city || p.country
          ? {
              address: {
                "@type": "PostalAddress",
                ...(p.city ? { addressLocality: p.city } : {}),
                ...(p.country ? { addressCountry: p.country } : {}),
              },
            }
          : {}),
      },
    },
  };
};

interface BlogJsonLdInput {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishedAt?: string | null;
  author?: string | null;
}

export const blogPosting = (p: BlogJsonLdInput) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: p.title,
  description: p.description,
  url: p.url,
  image: p.image,
  datePublished: p.publishedAt,
  dateModified: p.publishedAt,
  author: { "@type": "Person", name: p.author ?? "Julien" },
  publisher: { "@id": `${SITE_URL}#organization` },
  mainEntityOfPage: p.url,
});

export const faqPage = (faq: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.answer,
    },
  })),
});

/**
 * Service d'une page de recherche immobiliere (lib/intent-pages.ts),
 * rattache a l'etablissement unique (#organization) : meme nom, meme
 * adresse, meme categorie partout.
 */
export const intentService = (p: {
  locale: string;
  path: string;
  name: string;
  description: string;
  area: "luxembourg" | "international";
}) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${SITE_URL}/${p.locale}${p.path}#service`,
  name: p.name,
  serviceType: p.name,
  description: p.description,
  url: `${SITE_URL}/${p.locale}${p.path}`,
  inLanguage: p.locale,
  provider: { "@id": `${SITE_URL}#organization` },
  areaServed: p.area === "luxembourg" ? AREA_SERVED[0] : AREA_SERVED,
});
