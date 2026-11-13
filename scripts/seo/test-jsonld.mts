// Donnees structurees (nov. 2026, audit SEO, partie E1), sans reseau.
// Aucune bibliotheque de validation schema.org n'est installee dans le
// depot (aucune installation permise) : controle de structure maison. Pour
// chaque modele de page (accueil, fiche, ville, article, recherche, mandat),
// chaque objet JSON-LD produit par lib/seo.ts et lib/searches/display.ts :
//  - porte un @type connu de la liste ci-dessous ;
//  - n'utilise QUE des proprietes que schema.org definit pour ce type
//    (ou ses types parents), liste relue sur schema.org ;
//  - ne contient aucune valeur nulle, vide ou "undefined".
// Lancement : node --import tsx scripts/seo/test-jsonld.mts
import { strict as assert } from "node:assert";
import { homepageGraph, realEstateListing, blogPosting, cityWebPage, breadcrumb, faqPage, intentService, personJulien } from "../../lib/seo";
import { searchJsonLd } from "../../lib/searches/display";

// Proprietes communes (Thing) et par type, d'apres schema.org.
const THING = ["@context", "@type", "@id", "name", "description", "url", "image", "identifier", "sameAs", "mainEntityOfPage", "additionalType", "alternateName"];
const CREATIVE_WORK = [...THING, "inLanguage", "about", "publisher", "provider", "author", "datePublished", "dateModified", "headline", "offers", "keywords"];
const ORGANIZATION = [...THING, "legalName", "logo", "foundingDate", "address", "knowsLanguage", "areaServed", "founder", "employee", "vatID", "email", "telephone"];
const PLACE = [...THING, "address", "hasMap", "geo", "additionalProperty"];
const ACCOMMODATION = [...PLACE, "floorSize", "numberOfBedrooms", "numberOfBathroomsTotal", "numberOfRooms", "amenityFeature"];
const ALLOWED: Record<string, string[]> = {
  RealEstateAgent: [...ORGANIZATION, ...PLACE],
  WebSite: [...CREATIVE_WORK, "potentialAction"],
  SearchAction: ["@type", "target", "query-input"],
  ImageObject: ["@type", "url", "width", "height"],
  PostalAddress: ["@type", "streetAddress", "postalCode", "addressLocality", "addressRegion", "addressCountry"],
  Country: ["@type", "name"],
  City: ["@type", "name"],
  Person: [...THING, "jobTitle", "worksFor"],
  RealEstateListing: [...CREATIVE_WORK, "datePosted", "leaseLength"],
  WebPage: [...CREATIVE_WORK, "breadcrumb"],
  Offer: ["@type", "price", "priceCurrency", "priceSpecification", "availability", "url", "itemOffered"],
  UnitPriceSpecification: ["@type", "price", "priceCurrency", "unitCode"],
  PriceSpecification: ["@type", "priceCurrency", "minPrice", "maxPrice", "price"],
  Accommodation: ACCOMMODATION,
  Apartment: ACCOMMODATION,
  House: ACCOMMODATION,
  SingleFamilyResidence: ACCOMMODATION,
  Place: PLACE,
  PropertyValue: ["@type", "name", "value", "propertyID"],
  QuantitativeValue: ["@type", "value", "minValue", "maxValue", "unitCode"],
  BlogPosting: CREATIVE_WORK,
  BreadcrumbList: [...THING, "itemListElement"],
  ListItem: ["@type", "position", "name", "item"],
  FAQPage: [...CREATIVE_WORK, "mainEntity"],
  Question: ["@type", "name", "acceptedAnswer"],
  Answer: ["@type", "text"],
  Service: [...THING, "serviceType", "provider", "areaServed"],
  Demand: [...THING, "sku", "businessFunction", "itemOffered", "areaServed", "priceSpecification", "validFrom"],
};

function check(node: unknown, where: string, out: string[]) {
  if (Array.isArray(node)) return node.forEach((n, i) => check(n, `${where}[${i}]`, out));
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if ("@graph" in o) return check(o["@graph"], `${where}.@graph`, out);
  const type = o["@type"] as string | undefined;
  if (!type) {
    // Reference a une entite (@id seul) : permis.
    const keys = Object.keys(o).filter((k) => k !== "@id" && k !== "@context");
    if (keys.length && !("@id" in o)) out.push(`${where} : objet sans @type ni @id (${keys.join(", ")})`);
    if ("@id" in o) for (const k of keys) out.push(`${where} : propriete ${k} sur une reference @id`);
    return;
  }
  const allowed = ALLOWED[type];
  if (!allowed) out.push(`${where} : type inconnu ${type}`);
  for (const [k, v] of Object.entries(o)) {
    if (allowed && !allowed.includes(k)) out.push(`${where} (${type}) : propriete ${k} inexistante`);
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) out.push(`${where} (${type}) : ${k} vide`);
    check(v, `${where}.${k}`, out);
  }
}

const models: [string, unknown][] = [
  ["accueil", homepageGraph("fr")],
  ["qui-sommes-nous", personJulien("fr", { image: "/images/julien-brebion-2026-portrait.webp" })],
  ["fiche (appartement, vente)", realEstateListing({ name: "x", description: "y", url: "https://mapaproperty.lu/fr/biens/x", locale: "fr", price: 500000, city: "Steinfort", country: "Luxembourg", surface: 90, bedrooms: 2, bathrooms: 1, propertyType: "appartement", transaction: "sale", images: ["https://a/b.jpg"], datePosted: "2026-01-01", identifier: "x" })],
  ["fiche (terrain, location, vendu)", realEstateListing({ name: "x", description: "y", url: "https://mapaproperty.lu/fr/biens/x", locale: "fr", price: 2000, city: "Mamer", propertyType: "terrain", transaction: "rent", available: false })],
  ["ville", cityWebPage({ url: "https://mapaproperty.lu/fr/villes/steinfort", name: "Steinfort", description: "d", locale: "fr", country: "LU" })],
  ["article (complet)", blogPosting({ title: "t", description: "d", url: "https://mapaproperty.lu/fr/blog/a", image: "https://a/b.jpg", publishedAt: "2026-01-01", updatedAt: "2026-02-01", author: "Julien Brebion" })],
  ["article (sans image, date ni auteur)", blogPosting({ title: "t", description: "d", url: "https://mapaproperty.lu/fr/blog/a" })],
  ["recherche", searchJsonLd({ reference: "R-1", property_type: "appartement", transaction: "sale", bedrooms_min: 2, surface_min: 80, budget_min: null, budget_max: 900000, communes: ["Steinfort"], published_at: "2026-01-01" } as never, "fr", "t", "d")],
  ["mandat (fil d'Ariane et FAQ)", [breadcrumb([{ name: "Accueil", url: "https://mapaproperty.lu/fr" }, { name: "Mandat exclusif", url: "https://mapaproperty.lu/fr/mandats/exclusif" }]), faqPage([{ question: "q", answer: "a" }])]],
  ["page de recherche immobiliere", intentService({ locale: "fr", path: "/services/acheter", name: "n", description: "d", area: "luxembourg" })],
];

let pass = 0;
const failures: string[] = [];
for (const [name, data] of models) {
  const out: string[] = [];
  check(JSON.parse(JSON.stringify(data)), name, out);
  if (/"(null|undefined)"/.test(JSON.stringify(data))) out.push(`${name} : valeur texte null/undefined`);
  if (out.length) failures.push(...out);
  else {
    pass++;
    console.log(`PASS ${name}`);
  }
}
if (failures.length) console.log(failures.join("\n"));
assert.deepEqual(failures, []);
console.log(`${pass} PASS, 0 FAIL`);
