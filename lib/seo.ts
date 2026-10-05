import { CHILD_TO_PARENT, PROPERTY_TYPE_FAMILIES } from "./taxonomy/property-types";
import { siteLogo, siteShareImage } from "./og";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

// Contact public dans le JSON-LD (règle projet : jamais Frédéric Mannis,
// jamais IBAN/BIC/matricule). Oct. 2026 (décision de Julien) : AUCUNE
// adresse e-mail ni téléphone dans le JSON-LD, trivialement moissonnable en
// masse ; l'adresse admin@ était celle d'un compte administrateur. Le
// contact machine-readable est la page Contact ; téléphone et e-mail
// restent révélés au clic côté UI (<ContactReveal />).
const PUBLIC_CONTACT_PATH = "/contact";

// Etablissement reel unique (oct. 2026). Champs tires des mentions legales
// du site (lib/legal/mentions.ts) : nom commercial MAPA Property, nom legal
// MAPA Synergy Sarl, pays Luxembourg. Retires car non verifiables ou
// contraires aux regles de Google :
//   - aggregateRating fabrique (Google n'accepte pas les avis
//     "autoproclames" d'un etablissement sur son propre site, et la note
//     n'etait adossee a aucun avis reel) ;
//   - foundingDate "2020" (absente des mentions legales, et le site indique
//     ailleurs une agence fondee en 2024) ;
//   - coordonnees geographiques et localite (l'adresse exacte du siege
//     n'est publiee, par regle du projet, que sur la page des mentions
//     legales : legalNoticeOrganization ci-dessous).
// Images : fichiers reels de public/ (lib/og.ts), verifies au build par
// pnpm test:seo.
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
  knowsLanguage: ["fr", "en", "de"],
  // Contact machine-readable : page Contact uniquement (cf. commentaire
  // PUBLIC_CONTACT_PATH), forme standard schema.org ContactPoint.
  contactPoint: {
    "@type": "ContactPoint",
    url: `${SITE_URL}/${locale}${PUBLIC_CONTACT_PATH}`,
    contactType: "customer service",
    areaServed: "LU",
    availableLanguage: ["fr", "en", "de"],
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "LU",
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
  // cf. commentaire PUBLIC_CONTACT_PATH), contact machine-readable au
  // niveau organisation via realEstateAgent().contactPoint uniquement.
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
