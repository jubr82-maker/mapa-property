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
  seoDescription,
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

test("meta description : phrases entieres, 120 a 160 caracteres, jamais les mentions communes", () => {
  for (const l of ["fr", "en", "de"] as const) {
    const c = ctx(l);
    const { body, common } = splitCommonMentions(steinfortHtml(l), c.seo.common_start);
    expect(common).toContain("Real Estate Director");
    expect(body).not.toContain("Real Estate Director");
    const d = seoDescription(body, steinfort, l, c);
    expect(d.length, `${l} : ${d}`).toBeGreaterThanOrEqual(120);
    expect(d.length, `${l} : ${d}`).toBeLessThanOrEqual(META_MAX);
    expect(d, `${l} : finit sur une phrase complete`).toMatch(/[.?]$/);
    for (const forbidden of ["Julien Brebion", "reproduction", "Reproduction", "Vervielfältigung", "multilingue", "Multilingual", "Mehrsprachig", "Pour toute demande", "For any enquiry", "Für Anfragen"]) expect(d).not.toContain(forbidden);
  }
});

test("meta description du duplex de Steinfort (3 langues) : premiere phrase complete", () => {
  const want = {
    fr: "MAPA Property a le plaisir de vous présenter, en vente exclusive, ce superbe appartement duplex de 2 chambres situé dans le charmant village de Steinfort.",
    en: "MAPA Property is pleased to present, for sale on an exclusive basis, this superb duplex apartment with 2 bedrooms located in the charming village of Steinfort.",
    de: "MAPA Property freut sich, Ihnen im Exklusivverkauf diese schöne Maisonette-Wohnung mit 2 Schlafzimmern im charmanten Dorf Steinfort vorzustellen.",
  } as const;
  for (const l of ["fr", "en", "de"] as const) {
    const c = ctx(l);
    const { body } = splitCommonMentions(steinfortHtml(l), c.seo.common_start);
    const d = seoDescription(body, steinfort, l, c);
    // La phrase entiere, faits ajoutes seulement s'ils tiennent en entier.
    expect(d.startsWith(want[l]), `${l} : ${d}`).toBe(true);
    expect(d.length).toBeLessThanOrEqual(META_MAX);
    expect(d).toMatch(/\.$/);
  }
});

test("meta description : premiere phrase trop longue coupee sur un mot, sans participe ni preposition finale", () => {
  const long = (l: Lang, t: string) => seoDescription(`<p>${t}</p><p>Seconde phrase.</p>`, { ...steinfort, bedrooms: null, surface: null, living_surface: null, price: null }, l, ctx(l));
  const fr = long("fr", "MAPA Property a le plaisir de vous présenter, en vente exclusive, cette remarquable maison de maître entièrement restaurée avec ses dépendances et son parc arboré situé dans le quartier historique de Luxembourg.");
  expect(fr.length).toBeLessThanOrEqual(META_MAX);
  expect(fr).not.toMatch(/\s(le|la|les|de|du|des|dans|à|au|en|et|avec|son|situé|située|construit|rénové)$/i);
  const en = long("en", "MAPA Property is pleased to present, for sale on an exclusive basis, this remarkable mansion house fully restored with its outbuildings and its wooded park located in the historic district of Luxembourg.");
  expect(en).not.toMatch(/\s(the|of|in|with|and|located|built|its)$/i);
  const de = long("de", "MAPA Property freut sich, Ihnen im Exklusivverkauf dieses bemerkenswerte vollständig restaurierte Herrenhaus mit seinen Nebengebäuden und seinem Park im historischen Viertel von Luxemburg vorzustellen.");
  expect(de).not.toMatch(/\s(im|von|mit|und|der|die|das|gelegen|erbaut)$/i);
  for (const d of [fr, en, de]) expect(d.length).toBeLessThanOrEqual(META_MAX);
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
