import { CHILD_TO_PARENT, PROPERTY_TYPE_FAMILIES } from "./taxonomy/property-types";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

// Contact public dans le JSON-LD (règle projet : jamais Frédéric Mannis,
// jamais IBAN/BIC/matricule). Décision : email générique conservé comme
// contact machine-readable (moteurs de recherche / IA) ; le portable
// personnel de Julien est volontairement EXCLU du JSON-LD (anti-scraping —
// contrairement au texte visible d'une page, le JSON-LD est trivialement
// moissonnable en masse). Le portable reste disponible côté UI via
// <ContactReveal /> (révélé au clic, protection anti-scraping) et, à
// terme, sur la fiche Google Business.
const PUBLIC_CONTACT_EMAIL = "admin@mapagroup.org";

export const realEstateAgent = (locale: string) => ({
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": `${SITE_URL}#organization`,
  name: "MAPA Property",
  alternateName: "MAPA Synergy Sàrl",
  url: SITE_URL,
  logo: `${SITE_URL}/og/logo.png`,
  image: `${SITE_URL}/og/og-${locale}.png`,
  description:
    locale === "en"
      ? "Luxembourg real estate agency and international broker."
      : locale === "de"
        ? "Luxemburger Immobilienagentur und internationaler Broker."
        : "Agence immobilière luxembourgeoise et broker international.",
  knowsLanguage: ["fr", "en", "de"],
  // Contact machine-readable via l'email générique uniquement (cf.
  // commentaire PUBLIC_CONTACT_EMAIL) — forme standard schema.org
  // ContactPoint plutôt qu'un champ email/telephone nu sur l'Organization.
  contactPoint: {
    "@type": "ContactPoint",
    email: PUBLIC_CONTACT_EMAIL,
    contactType: "customer service",
    areaServed: "LU",
    availableLanguage: ["fr", "en", "de"],
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Luxembourg",
    addressCountry: "LU",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 49.4811,
    longitude: 6.0878,
  },
  areaServed: [
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
  ],
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
  foundingDate: "2020",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5",
    reviewCount: "8",
    bestRating: "5",
    worstRating: "1",
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
  // cf. commentaire PUBLIC_CONTACT_EMAIL) — contact machine-readable au
  // niveau organisation via realEstateAgent().contactPoint uniquement.
  sameAs: [
    "https://www.linkedin.com/in/julien-brebion/",
  ],
});

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
  image?: string;
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
    ...(p.image ? { image: p.image } : {}),
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
