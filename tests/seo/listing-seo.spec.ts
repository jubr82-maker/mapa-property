// References des fiches de biens et des recherches (oct. 2026). Controles
// sans base de donnees : modele de title, meta description, mentions
// communes, adresse lisible et stable, redirection permanente, donnees
// structurees, textes alternatifs, liens internes, hreflang et canonique.
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { generateListing } from "../../lib/listing/generate";
import { emptyListingData } from "../../lib/listing/listing-data";
import { textToHtml } from "../../lib/listing/template-engine";
import {
  META_MAX,
  META_MIN,
  SEO_TITLE_MAX,
  photoAlt,
  propertyPath,
  propertyRefToken,
  refTokenFromParam,
  seoMetaDescription,
  seoTitle,
  splitCommonMentions,
  typeName,
} from "../../lib/listing/listing-seo";
import { realEstateListing } from "../../lib/seo";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
type Lang = "fr" | "en" | "de";
const msgs = (l: Lang) => JSON.parse(read(`messages/${l}.json`));
const ctx = (l: Lang) => {
  const m = msgs(l);
  return { types: m.listing_model.vocab.types, titleTx: m.listing_model.vocab.title_tx, seo: m.listing_model.seo, subtypes: m.search.type_subtype, model: m.listing_model };
};

// Duplex de Steinfort : donnees de l'annonce de reference.
const steinfort = { slug: "86388715", property_type: "duplex", transaction: "sale", bedrooms: 2, surface: 115, living_surface: 115, city: "Steinfort", price: 720000 };
function steinfortHtml(l: Lang) {
  const c = ctx(l);
  const d = emptyListingData();
  d.written.fr = { ...d.written.fr, qualifier: "superbe", ambiance: "offre un cadre de vie spacieux, lumineux et chaleureux, alliant confort moderne et authenticité", highlights: "Localisation recherchée à Steinfort", location_custom: "" };
  d.written.en = { ...d.written.en, qualifier: "superb", ambiance: "offers a spacious, bright and warm living space" };
  d.written.de = { ...d.written.de, qualifier: "schön", ambiance: "bietet ein geräumiges, helles und warmes Wohnambiente" };
  d.facts = { renovation_year: 2020, cellar: true, parking_indoor: 2, monthly_charges: 280, location_formula: "village" };
  d.levels = [{ id: "r", kind: "ground", rooms: [{ id: "sejour", text: { fr: "Séjour cathédrale avec poutres apparentes", en: "Cathedral living room with exposed beams", de: "Wohnzimmer mit Kathedralendecke und Sichtbalken" } }] }];
  const cols = { ...steinfort, mandate_type: "exclusive", year_built: 2004, usable_surface: null, land_surface: null, terrace_surface: null, balcony_surface: null, garden_surface: null, parking: null, has_pool: false, floor: null, price_on_demand: false, current_use: null };
  return generateListing(cols as never, d, l, c.model, c.model.vocab).html;
}

test("title : modele sans qualificatif, 60 caracteres vises, surface puis marque retirees", () => {
  for (const l of ["fr", "en", "de"] as const) {
    const c = ctx(l);
    const t = seoTitle(steinfort, l, c);
    expect(t.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
    expect(t.toLowerCase()).not.toContain(l === "fr" ? "superbe" : l === "en" ? "superb" : "schön");
  }
  expect(seoTitle(steinfort, "fr", ctx("fr"))).toBe("Appartement duplex 2 chambres à vendre à Steinfort");
  const short = { ...steinfort, property_type: "villa", bedrooms: 4, city: "Mamer" };
  expect(seoTitle(short, "fr", ctx("fr"))).toBe("Villa 4 chambres 115 m² à vendre à Mamer | MAPA Property");
  const mid = { ...steinfort, property_type: "maison-individuelle", bedrooms: 4, city: "Bertrange" };
  // 66 caracteres avec la marque : surface retiree, puis marque retiree.
  expect(seoTitle(mid, "fr", ctx("fr"))).toBe("Maison individuelle 4 chambres à vendre à Bertrange");
  const rent = { ...steinfort, property_type: "appartement", transaction: "rent", bedrooms: 1, surface: 55, living_surface: 55, city: "Hesperange" };
  expect(seoTitle(rent, "fr", ctx("fr"))).toBe("Appartement 1 chambre à louer à Hesperange | MAPA Property");
  const empty = { ...steinfort, property_type: "terrain", bedrooms: null, surface: null, living_surface: null, city: null };
  expect(seoTitle(empty, "fr", ctx("fr"))).toBe("Terrain à vendre | MAPA Property");
});

// Donnees de modele du duplex (atout saisi, annees, mandat exclusif).
function steinfortData() {
  const d = emptyListingData();
  d.written.fr.highlights = "Localisation recherchée à Steinfort";
  d.written.en.highlights = "Sought-after location in Steinfort";
  d.written.de.highlights = "Gefragte Lage in Steinfort";
  d.facts = { renovation_year: 2020 };
  return d;
}
const steinfortCols = { ...steinfort, mandate_type: "exclusive", year_built: 2004, usable_surface: null, land_surface: null, terrace_surface: null, balcony_surface: null, garden_surface: null, parking: null, has_pool: false, floor: null, price_on_demand: false, current_use: null };
const meta = (l: Lang, cols: Record<string, unknown> = {}, d = steinfortData()) => {
  const c = ctx(l);
  return seoMetaDescription({ ...steinfortCols, ...cols } as never, d, l, { vocab: c.model.vocab, seo: c.seo });
};

test("meta description du duplex de Steinfort, construite depuis les faits (3 langues)", () => {
  expect(meta("fr")).toBe("Appartement duplex de 115 m² avec 2 chambres à vendre à Steinfort, construit en 2004 et rénové en 2020. Vente exclusive MAPA Property, 720 000 €.");
  expect(meta("en")).toBe("Duplex apartment of 115 m² with 2 bedrooms for sale in Steinfort, built in 2004 and renovated in 2020. Exclusive sale by MAPA Property, €720,000.");
  expect(meta("de")).toBe("Maisonette-Wohnung mit 115 m² und 2 Schlafzimmern zu verkaufen in Steinfort, erbaut 2004 und renoviert 2020. Exklusivverkauf von MAPA Property, 720.000 €.");
  for (const l of ["fr", "en", "de"] as const) {
    const d = meta(l);
    expect(d.length, `${l} : ${d}`).toBeGreaterThanOrEqual(120);
    expect(d.length).toBeLessThanOrEqual(META_MAX);
    expect(d).not.toMatch(/le plaisir|pleased to present|freut sich/);
  }
});

test("meta description : atout retire d'abord, puis l'exclusivite ; phrases completes", () => {
  const d1 = steinfortData();
  d1.written.fr.highlights = "Calme";
  expect(meta("fr", {}, d1)).toBe("Appartement duplex de 115 m² avec 2 chambres à vendre à Steinfort, construit en 2004 et rénové en 2020. Calme. Vente exclusive MAPA Property, 720 000 €.");
  const long = meta("fr", { property_type: "maison-de-maitre", city: "Esch-sur-Alzette", bedrooms: 12, living_surface: 1250, surface: 1250, price: 12500000 });
  expect(long.length).toBeLessThanOrEqual(META_MAX);
  expect(long).toMatch(/12 500 000 €\.$/);
  expect(long).not.toContain("Localisation");
  for (const l of ["fr", "en", "de"] as const) expect(meta(l)).toMatch(/[.?]$/);
});

test("meta description : accords, segments vides, location, terrain, commercial", () => {
  expect(meta("fr", { property_type: "villa", mandate_type: "simple" }, emptyListingData())).toBe("Villa de 115 m² avec 2 chambres à vendre à Steinfort, construite en 2004. 720 000 €.");
  expect(meta("fr", { property_type: "appartement", bedrooms: 1, year_built: null, mandate_type: "simple" }, emptyListingData())).toBe("Appartement de 115 m² avec 1 chambre à vendre à Steinfort. 720 000 €.");
  expect(meta("fr", { property_type: "appartement", transaction: "rent", price: 2400, mandate_type: "exclusive", year_built: null }, emptyListingData())).toBe(
    "Appartement de 115 m² avec 2 chambres à louer à Steinfort. Location exclusive MAPA Property, 2 400 € par mois.",
  );
  const land = steinfortData();
  land.facts = { zone_pag: "HAB-1", servicing: "full" };
  expect(meta("fr", { property_type: "terrain", land_surface: 850, bedrooms: null, living_surface: null, surface: null, mandate_type: "simple", price: 450000 }, land)).toBe(
    "Terrain de 8,5 ares (850 m²) à vendre à Steinfort, zone HAB-1 du PAG, terrain viabilisé. Localisation recherchée à Steinfort. 450 000 €.",
  );
  const shop = emptyListingData();
  shop.facts = { yield_percent: 5.2 };
  expect(meta("fr", { property_type: "local-commercial", usable_surface: 140, mandate_type: "simple" }, shop)).toBe("Local commercial de 140 m² à vendre à Steinfort, rendement de 5,2 %. 720 000 €.");
  expect(meta("fr", { price: null, mandate_type: "simple" }, emptyListingData())).toBe("Appartement duplex de 115 m² avec 2 chambres à vendre à Steinfort, construit en 2004.");
});

test("Description Google saisie : remplace la version construite, controlee comme l'annonce", () => {
  const d = steinfortData();
  d.written.fr.seo_description = "Duplex de 115 m² à Steinfort, deux chambres, cave et double parking intérieur, à deux pas des commerces et de la gare de Kleinbettingen.";
  expect(meta("fr", {}, d)).toBe(d.written.fr.seo_description);
  expect(meta("en", {}, d)).toBe(meta("en"));
  const form = read("components/admin/PropertyEditForm.tsx");
  expect(form).toContain("data-seo-meta-field");
  expect(form).toContain("seo_description_${l}");
  expect(read("app/admin/properties/actions.ts")).toContain("seo_description_${l}");
});

test("mentions communes : bloc distinct a l'affichage, texte complet conserve en base", () => {
  const page = read("app/[locale]/biens/[slug]/page.tsx");
  expect(page).toContain("splitCommonMentions(");
  expect(page).toMatch(/<section data-listing-mentions/);
  const html = steinfortHtml("fr");
  const { body, common } = splitCommonMentions(html, ctx("fr").seo.common_start);
  expect(body + common).toBe(html);
  expect(splitCommonMentions("<p>Texte Apimo sans mentions.</p>", ctx("fr").seo.common_start).common).toBe("");
});

test("adresse : lisible (type, chambres, localite, reference), stable si le titre change", () => {
  const c = ctx("fr");
  expect(propertyPath(steinfort, "fr", c.types, c.seo)).toBe("/biens/appartement-duplex-2-chambres-steinfort-86388715");
  expect(propertyPath(steinfort, "en", ctx("en").types, ctx("en").seo)).toBe("/biens/duplex-apartment-2-bedrooms-steinfort-86388715");
  expect(propertyPath(steinfort, "de", ctx("de").types, ctx("de").seo)).toBe("/biens/maisonette-wohnung-2-schlafzimmer-steinfort-86388715");
  const manual = { ...steinfort, slug: "superbe-appartement-a-steinfort-1a2b3c4d" };
  expect(propertyPath(manual, "fr", c.types, c.seo)).toBe("/biens/appartement-duplex-2-chambres-steinfort-1a2b3c4d");
  // Le titre ne fait pas partie de l'adresse : meme adresse apres changement.
  expect(propertyRefToken(manual.slug)).toBe("1a2b3c4d");
  // Toute adresse du bien retrouve la meme reference.
  for (const old of ["86388715", "appartement-duplex-2-chambres-steinfort-86388715", "ancien-titre-du-bien-86388715", "duplex-apartment-2-bedrooms-steinfort-86388715"]) expect(refTokenFromParam(old)).toBe("86388715");
  expect(refTokenFromParam("ancien-titre-1a2b3c4d")).toBe("1a2b3c4d");
  // Slug ancien sans reference reconnaissable : garde tel quel.
  expect(propertyPath({ ...steinfort, slug: "maison-a-bertrange" }, "fr", c.types, c.seo)).toBe("/biens/maison-a-bertrange");
});

test("redirection permanente vers l'adresse actuelle, canonique et hreflang par langue", () => {
  const page = read("app/[locale]/biens/[slug]/page.tsx");
  expect(page).toMatch(/if \(decodeURIComponent\(slug\) !== canonicalPath\.replace\(\/\^\\\/biens\\\/\/, ""\)\) permanentRedirect\(`\/\$\{locale\}\$\{canonicalPath\}`\);/);
  expect(page).toContain('languages: { fr: `/fr${paths.fr}`, en: `/en${paths.en}`, de: `/de${paths.de}`, "x-default": `/fr${paths.fr}` }');
  expect(read("lib/data.ts")).toContain("const token = refTokenFromParam(identifier);");
  // Recherches : canonique et hreflang par buildPageMetadata (3 langues).
  const search = read("app/[locale]/recherches/[reference]/page.tsx");
  expect(search).toContain("buildPageMetadata(locale, `/recherches/${s.reference}`");
  expect(read("lib/seo-page-meta.ts")).toMatch(/pageAlternates\(locale, path\)/);
});

test("donnees structurees : RealEstateListing, offre, logement type, rien d'invente, jamais Product", () => {
  const base = { name: "n", description: "d", url: "https://mapaproperty.lu/fr/biens/x", locale: "fr", city: "Steinfort", country: "LU" };
  const ld = (o: Record<string, unknown>) => realEstateListing({ ...base, ...o } as never) as unknown as { "@type": string; offers: Record<string, unknown> & { itemOffered: Record<string, unknown> } };
  const apt = ld({ propertyType: "duplex", price: 720000, surface: 115, bedrooms: 2, bathrooms: 1 });
  expect(apt["@type"]).toBe("RealEstateListing");
  expect(apt.offers.price).toBe(720000);
  expect(apt.offers.priceCurrency).toBe("EUR");
  expect(apt.offers.availability).toBe("https://schema.org/InStock");
  expect(apt.offers.itemOffered["@type"]).toBe("Apartment");
  expect(apt.offers.itemOffered.numberOfBedrooms).toBe(2);
  expect(JSON.stringify(apt.offers.itemOffered.address)).toBe('{"@type":"PostalAddress","addressLocality":"Steinfort","addressCountry":"LU"}');
  expect(ld({ propertyType: "villa" }).offers.itemOffered["@type"]).toBe("SingleFamilyResidence");
  expect(ld({ propertyType: "maison-jumelee" }).offers.itemOffered["@type"]).toBe("House");
  const land = ld({ propertyType: "terrain", surface: 850, bedrooms: 0 });
  expect(land.offers.itemOffered["@type"]).toBe("Place");
  expect(land.offers.itemOffered.floorSize).toBeUndefined();
  const rent = ld({ propertyType: "appartement", price: 2400, transaction: "rent" });
  expect(JSON.stringify(rent.offers.priceSpecification)).toContain('"unitCode":"MON"');
  const noPrice = ld({ propertyType: "appartement" });
  expect(noPrice.offers.price).toBeUndefined();
  const all = JSON.stringify([apt, land, rent]);
  expect(all).not.toMatch(/"Product"|"sku"|"gtin|"brand"|"aggregateRating"|"review"|"streetAddress"|"postalCode"/);
  // Recherches : type Demand (une annonce de recherche), pas un bien.
  expect(read("lib/searches/display.ts")).toContain('"@type": "Demand"');
});

test("textes alternatifs : piece et description, puis type et localite, 3 langues, modifiables", () => {
  for (const l of ["fr", "en", "de"] as const) {
    const c = ctx(l);
    const type = typeName("duplex", l, c.types);
    const room = { fr: "Séjour cathédrale avec poutres apparentes", en: "Cathedral living room with exposed beams", de: "Wohnzimmer mit Kathedralendecke und Sichtbalken" }[l];
    const alt = photoAlt({ room, index: 0, typeLabel: type, city: "Steinfort", title: "t" }, c.seo);
    expect(alt.startsWith(room)).toBe(true);
    expect(alt).toContain("Steinfort");
    expect(photoAlt({ room: null, index: 2, typeLabel: type, city: "Steinfort", title: "t" }, c.seo)).toContain("3");
    expect(photoAlt({ custom: "Texte saisi", room, index: 0, typeLabel: type, city: "Steinfort", title: "t" }, c.seo)).toBe("Texte saisi");
  }
  expect(photoAlt({ room: "Séjour cathédrale avec poutres apparentes", index: 0, typeLabel: typeName("duplex", "fr", ctx("fr").types), city: "Steinfort", title: "t" }, ctx("fr").seo)).toBe(
    "Séjour cathédrale avec poutres apparentes, appartement duplex à Steinfort",
  );
  expect(read("components/admin/PhotoAltEditor.tsx")).toContain("savePhotoAlts(propertyId, photos)");
  expect(read("app/admin/properties/[id]/photos/actions.ts")).toContain("alt_fr: prev.alt_fr");
});

test("liens internes : fiche vers commune et recherches, commune vers biens et recherches", () => {
  const page = read("app/[locale]/biens/[slug]/page.tsx");
  expect(page).toContain("fetchSearchesForCity(citySlug)");
  expect(page).toContain("cityForPlace(property.city)");
  const ville = read("app/[locale]/villes/[ville]/page.tsx");
  expect(ville).toContain("data-city-properties");
  expect(ville).toContain("data-city-searches");
  for (const f of ["components/property/PropertyCard.tsx", "components/home/FeaturedCarousel.tsx", "app/sitemap.ts"]) expect(read(f)).toMatch(/paths\?\.\[locale\]/);
});

test("indicateurs de l'admin : jamais bloquants (mots, textes alternatifs, apercu Google)", () => {
  const form = read("components/admin/PropertyEditForm.tsx");
  expect(form).toContain("data-seo-preview");
  expect(form).toMatch(/p\.words < 150/);
  expect(form).toContain("seo.photosWithoutAlt");
  const act = read("app/admin/properties/actions.ts");
  expect(act).not.toMatch(/ownTextWords|photosWithoutAlt/);
  expect(textToHtml("a")).toBe("<p>a</p>");
});
