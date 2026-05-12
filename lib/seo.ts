const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

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
  // RGPD : email + téléphone retirés du JSON-LD public.
  // Coordonnées disponibles via la page "Mentions légales" (obligation légale)
  // et via le composant <ContactButtons /> côté UI.
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
    name: "Julien",
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
  name: "Julien",
  jobTitle: "Co-fondateur · Directeur Immobilier · Exclusive Sourcing Specialist",
  worksFor: { "@id": `${SITE_URL}#organization` },
  // RGPD : email + téléphone retirés du JSON-LD public.
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

interface PropertyJsonLdInput {
  name: string;
  description: string;
  url: string;
  image?: string;
  price?: number | null;
  city?: string | null;
  country?: string | null;
}

export const propertyListing = (p: PropertyJsonLdInput) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: p.name,
  description: p.description,
  url: p.url,
  image: p.image,
  brand: { "@type": "Brand", name: "MAPA Property" },
  offers: p.price
    ? {
        "@type": "Offer",
        price: p.price,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: p.url,
      }
    : undefined,
  ...(p.city || p.country
    ? {
        category: [p.city, p.country].filter(Boolean).join(", "),
      }
    : {}),
});

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
