// Correctifs du premier controle Google (13/11/2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-correctifs-controle.mts
//   1. liens entrants : calcules a partir des composants (liens fixes lus
//      dans le menu, le pied de page et les pages ; blocs calcules avec les
//      memes fonctions que les pages) sur un jeu de biens, d'off-market et
//      de recherches ; au moins 3 pour chaque page citee par le controle,
//      jamais un lien vers une ville non indexable ;
//   2. titres : tous les titres fixes des trois langues et un titre de
//      recherche long passent la regle de longueur de controle-site.ts ;
//   3. donnees structurees des mentions legales : un @type.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const msgs = (l: string) => JSON.parse(read(`messages/${l}.json`));
const LOCALES = ["fr", "en", "de"] as const;

const { CONTROLE_TITLE_LENGTH, CONTROLE_MIN_INBOUND_LINKS } = await import("../../lib/pilotage/config");
const { parsePage } = await import("../../lib/pilotage/controle-core");
const { pickSimilar } = await import("../../lib/similar-properties");
const { pickOtherProperties, OTHER_PROPERTIES_COUNT } = await import("../../lib/other-properties");
const { cityForProperty, cityForPlace } = await import("../../lib/internal-links");
const { citiesWithProperties, indexableCities, isCityIndexable, publishedCountByCity } = await import("../../lib/city-indexing");
const { getCityBySlug } = await import("../../lib/cities");
const { otherOffmarket } = await import("../../lib/offmarket-links");
const { otherSearches } = await import("../../lib/searches/related");
const { searchTitle, searchTitles, typeInTitle, cutAtWord } = await import("../../lib/searches/title");
const { legalNoticeOrganization } = await import("../../lib/legal/notice-jsonld");

let pass = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn();
  pass++;
  console.log(`  PASS ${name}`);
};

// --- Jeu de donnees : biens cites par le controle, villes etrangeres, autres biens.
type P = { id: string; slug: string; transaction: string; country: string; city: string; property_type: string; badge: null; price: number };
const prop = (id: string, slug: string, city: string, type: string, price: number, country = "LU", transaction = "sale"): P => ({ id, slug, transaction, country, city, property_type: type, badge: null, price });
const PROPS: P[] = [
  prop("a1", "appartement-2-chambres-hesperange-86339857", "Hesperange", "appartement", 640000),
  prop("a2", "local-commercial-bettembourg-85566897", "Bettembourg", "local-commercial", 450000, "LU", "rent"),
  prop("a3", "fonds-de-commerce-fentange-86747780", "Fentange", "fonds-de-commerce", 180000),
  prop("a4", "villa-algarve-1", "Lagos", "villa", 1900000, "PT"),
  prop("a5", "maison-metz-1", "Metz", "maison", 420000, "FR"),
  prop("a6", "maison-strassen-1", "Strassen", "maison", 1250000),
  prop("a7", "appartement-luxembourg-1", "Luxembourg", "appartement", 890000),
  prop("a8", "appartement-luxembourg-2", "Luxembourg", "appartement", 910000),
  prop("a9", "maison-dudelange-1", "Dudelange", "maison", 780000),
  prop("b1", "bureau-luxembourg-1", "Luxembourg", "bureau", 3500, "LU", "rent"),
];
const OFF = [{ id: "om-1" }, { id: "om-2" }, { id: "om-3" }];
const SEARCHES = [
  { id: "s1", reference: "R-2026-001", status: "published", communes: ["Strassen", "Bertrange"], property_type: "maison" },
  { id: "s2", reference: "R-2026-002", status: "published", communes: ["Hesperange"], property_type: "appartement" },
  { id: "s3", reference: "R-2026-003", status: "published", communes: ["Dudelange"], property_type: "maison" },
  { id: "s4", reference: "R-2025-009", status: "found", communes: ["Mamer"], property_type: "maison" },
];

// --- Liens fixes lus dans les composants.
const hrefsIn = (src: string) => [...src.matchAll(/href(?:=|:\s*)["{`]?"?([^"`}]+)["`}]/g)].map((m) => m[1]).filter((h) => h.startsWith("/"));
const NAV = read("lib/navigation.ts");
const HEADER = read("components/layout/Header.tsx");
const FOOTER = read("components/layout/Footer.tsx");
const LAYOUT_LINKS = new Set([...hrefsIn(NAV), ...hrefsIn(HEADER), ...hrefsIn(FOOTER)].map((h) => h.replace(/\/$/, "") || "/"));

// --- Graphe des liens, page par page et langue par langue (memes calculs que les pages).
const fiche = (p: P) => `/biens/${p.slug}`;
const ville = (slug: string) => `/villes/${slug}`;
function siteLinks(): Map<string, Set<string>> {
  const pages = new Map<string, Set<string>>();
  const add = (from: string, tos: Iterable<string>) => {
    const set = pages.get(from) ?? new Set<string>();
    for (const to of tos) if (to !== from) set.add(to);
    pages.set(from, set);
  };
  const counts = publishedCountByCity(PROPS);
  const cityLink = (slug: string | undefined) => {
    if (!slug) return [];
    const c = getCityBySlug(slug)!;
    assert.ok(isCityIndexable(c, counts.get(slug) ?? 0), `lien vers une ville non indexable : ${slug}`);
    return [ville(slug)];
  };
  const keyPages = ["/", "/biens", "/biens?transaction=sale", "/biens?transaction=rent", "/services", "/services/marches-actifs", "/off-market", "/off-market/arcova", "/recherches", "/mandats/recherche", "/contact", "/blog"];
  for (const p of keyPages) add(p, LAYOUT_LINKS);
  // Liste des biens et pages vente / location : biens affiches et « Nos biens par ville ».
  add("/biens", [...PROPS.map(fiche), ...citiesWithProperties(PROPS).flatMap((c) => cityLink(c.slug))]);
  for (const tx of ["sale", "rent"]) {
    const list = PROPS.filter((p) => p.transaction === tx);
    add(`/biens?transaction=${tx}`, [...list.map(fiche), ...citiesWithProperties(list).flatMap((c) => cityLink(c.slug))]);
  }
  // Fiches : biens similaires, Autres biens, page de la ville (indexable).
  for (const p of PROPS) {
    const similar = pickSimilar(p, PROPS);
    const others = pickOtherProperties(p, PROPS, { exclude: similar.map((x) => x.id) });
    const c = cityForProperty(p);
    add(fiche(p), [...LAYOUT_LINKS, ...similar.map(fiche), ...others.map(fiche), ...(c && isCityIndexable(c, 1) ? cityLink(c.slug) : [])]);
  }
  // Pages de villes : leurs biens.
  for (const c of citiesWithProperties(PROPS)) add(ville(c.slug), [...LAYOUT_LINKS, ...PROPS.filter((p) => cityForProperty(p)?.slug === c.slug).map(fiche)]);
  // Marches actifs : villes indexables seulement.
  add("/services/marches-actifs", indexableCities(PROPS).flatMap((c) => cityLink(c.slug)));
  // Off-market : liste (cartes + ARCOVA), pages des biens et ARCOVA (bloc « Autres opportunites »).
  add("/off-market", [...OFF.map((o) => `/off-market/${o.id}`), "/off-market/arcova"]);
  for (const o of OFF) add(`/off-market/${o.id}`, [...LAYOUT_LINKS, ...otherOffmarket(OFF, o.id).map((x) => `/off-market/${x.id}`), "/off-market", "/off-market/arcova"]);
  add("/off-market/arcova", otherOffmarket(OFF, null).map((x) => `/off-market/${x.id}`));
  // Recherches : liste, pages (bloc « Autres recherches en cours », communes), mandat de recherche.
  add("/recherches", SEARCHES.map((s) => `/recherches/${s.reference}`));
  for (const s of SEARCHES) {
    add(`/recherches/${s.reference}`, [...LAYOUT_LINKS, "/recherches", ...otherSearches(SEARCHES, s.reference).map((x) => `/recherches/${x.reference}`), ...s.communes.flatMap((c) => cityLink(cityForPlace(c)?.slug))]);
  }
  add("/mandats/recherche", ["/recherches"]);
  return pages;
}
function inbound(pages: Map<string, Set<string>>): Map<string, number> {
  const n = new Map<string, number>();
  for (const tos of pages.values()) for (const to of tos) n.set(to, (n.get(to) ?? 0) + 1);
  return n;
}

await test("1. les pages citees par le controle recoivent au moins 3 liens internes (meme regle que controle-site.ts)", () => {
  // Les composants utilisent bien les blocs comptes ici.
  assert.ok(LAYOUT_LINKS.has("/services"), "menu ou pied de page : lien vers /services");
  assert.match(NAV, /\{ href: "\/services", key: "all_services" \}/);
  assert.match(HEADER, /href: "\/services",/);
  assert.match(FOOTER, /\{ href: "\/services", key: "all_services" \}/);
  const ficheSrc = read("app/[locale]/biens/[slug]/page.tsx");
  assert.ok(ficheSrc.includes("fetchOthersFor(") && ficheSrc.includes("data-fiche-others") && ficheSrc.includes('t("others_title")'));
  assert.ok(ficheSrc.includes("isCityIndexable(propertyCity, 1)"));
  assert.ok(read("lib/data.ts").includes("pickOtherProperties(target, all, { exclude: pickSimilar(target, all).map((p) => p.id) })"));
  assert.ok(read("lib/data.ts").includes('"others-of-v2", target.id') && read("lib/data.ts").includes("cityForProperty(target)?.slug"), "cle de cache : ville resolue");
  assert.ok(ficheSrc.includes("availableFirst(others)"), "biens disponibles d'abord, comme les biens similaires");
  assert.ok(read("lib/revalidate-property.ts").includes("pickOtherProperties(f, fresh"), "revalidation des fiches qui montrent le bien");
  const biens = read("app/[locale]/biens/page.tsx");
  assert.ok(biens.includes("citiesWithProperties(listingTx ? allProperties.filter((p) => p.transaction === listingTx) : allProperties)") && biens.includes("data-listing-cities"));
  assert.ok(read("app/[locale]/services/marches-actifs/page.tsx").includes("indexableCities(await fetchAllPropertiesWithCover())"));
  assert.ok(!/cities=\{cities\}/.test(read("app/[locale]/services/marches-actifs/page.tsx")), "plus la liste de toutes les villes");
  const omDetail = read("app/[locale]/off-market/[id]/page.tsx");
  assert.ok(omDetail.includes("<OtherOffmarket list={offmarketList} currentId={property.id} locale={locale} />"));
  assert.ok(read("app/[locale]/off-market/arcova/page.tsx").includes("<OtherOffmarket list={list} currentId={null}"));
  assert.ok(read("app/[locale]/off-market/page.tsx").includes('href="/off-market/arcova"'), "liste off-market : lien ARCOVA");
  const omBlock = read("components/offmarket/OtherOffmarket.tsx");
  assert.ok(omBlock.includes('href="/off-market/arcova"') && omBlock.includes('href="/off-market"') && omBlock.includes("otherOffmarket(list, currentId)"));
  const teaser = read("components/offmarket/OffMarketTeaser.tsx");
  for (const field of ["property.country", "property.city_label", "property.internal_ref", "property.title", "property.short_pitch"]) assert.ok(teaser.includes(field));
  // Champs lus : ceux de la carte de la liste publique, rien d'autre.
  const fields = new Set([...teaser.matchAll(/property\.(\w+)/g)].map((m) => m[1]));
  const allowed = new Set(["id", "country", "city_label", "internal_ref", "title", "short_pitch", "price_on_demand", "price_mode", "price_min", "price_max", "price_estimate", "price_display"]);
  for (const f of fields) assert.ok(allowed.has(f), `champ non public dans la carte : ${f}`);
  const searchPage = read("app/[locale]/recherches/[reference]/page.tsx");
  assert.ok(searchPage.includes("otherSearches(await fetchPublicSearches(), s.reference)") && searchPage.includes("data-search-others"));
  const mandate = read("app/[locale]/mandats/[type]/page.tsx");
  assert.ok(mandate.includes('config.slug === "recherche" && (') && mandate.includes('<Link href="/recherches"'), "mandat de recherche : lien vers /recherches");
  assert.ok(read("app/[locale]/services/mandat-recherche/page.tsx").includes("permanentRedirect(`/${locale}/mandats/recherche`)"), "/services/mandat-recherche redirige vers /mandats/recherche");

  const links = inbound(siteLinks());
  const cited = [
    "/services",
    ...PROPS.slice(0, 5).map(fiche),
    ...OFF.map((o) => `/off-market/${o.id}`),
    "/off-market/arcova",
    ...SEARCHES.filter((s) => s.status === "published").map((s) => `/recherches/${s.reference}`),
    ville("algarve"),
    ville("metz"),
  ];
  for (const path of cited) {
    const n = links.get(path) ?? 0;
    assert.ok(n >= CONTROLE_MIN_INBOUND_LINKS, `${path} : ${n} lien(s) entrant(s), minimum ${CONTROLE_MIN_INBOUND_LINKS}`);
  }
});

await test("1b. Autres biens : 4 biens, jamais le bien lui-meme, meme ville puis voisines puis meme type", () => {
  for (const p of PROPS) {
    const o = pickOtherProperties(p, PROPS);
    assert.equal(o.length, OTHER_PROPERTIES_COUNT);
    assert.ok(!o.some((x) => x.id === p.id), p.slug);
  }
  const lux = PROPS.find((p) => p.id === "a7")!;
  const o = pickOtherProperties(lux, PROPS);
  assert.deepEqual(o.slice(0, 2).map((x) => x.id).sort(), ["a8", "b1"], "meme ville d'abord");
  // Localites sans page de ville (Hesperange, Fentange) : voisins par la
  // distance (15 km au plus) avant le meme type ailleurs.
  const fentange = pickOtherProperties(PROPS[2], PROPS);
  assert.equal(fentange[0].id, "a1", "Fentange : Hesperange, la plus proche, d'abord");
  assert.ok(!fentange.slice(0, 3).some((x) => x.country !== "LU"), "voisins du Luxembourg avant l'etranger");
  const hesp = pickOtherProperties(PROPS[0], PROPS);
  assert.ok(["a3", "a7", "a8", "b1"].includes(hesp[0].id), `Hesperange : un voisin d'abord (${hesp[0].id})`);
  const metzOthers = pickOtherProperties(PROPS[4], PROPS, { exclude: ["a9"] });
  assert.ok(!metzOthers.some((x) => x.id === "a9"), "exclusion (biens similaires deja montres)");
});

await test("1e. villes : jamais de lien vers une ville non indexable", () => {
  const dubai = getCityBySlug("dubai")!;
  assert.equal(isCityIndexable(dubai, 0), false, "Dubai sans bien : non indexable");
  assert.ok(!indexableCities(PROPS).some((c) => c.slug === "dubai"), "marches actifs : pas de Dubai");
  assert.ok(indexableCities(PROPS).some((c) => c.slug === "algarve") && indexableCities(PROPS).some((c) => c.slug === "metz"));
  assert.deepEqual(citiesWithProperties(PROPS.filter((p) => p.country !== "LU")).map((c) => c.slug).sort(), ["algarve", "metz"]);
});

await test("2. titres : tous les titres fixes des trois langues dans la regle de longueur", () => {
  const { min, max } = CONTROLE_TITLE_LENGTH;
  const B = ", MAPA Property";
  for (const l of LOCALES) {
    const m = msgs(l);
    const titles: [string, string][] = [];
    for (const [k, v] of Object.entries(m.seo_pages as Record<string, Record<string, string>>)) if (v && typeof v.title === "string" && !v.title.includes("{")) titles.push([`seo_pages.${k}`, v.title]);
    for (const [k, v] of Object.entries(m.intent_pages as Record<string, Record<string, string>>)) if (v && typeof v.meta_title === "string") titles.push([`intent_pages.${k}`, v.meta_title + B]);
    titles.push(["property_list", m.property_list.title + B], ["seo_sale", m.property_list.seo_sale_title], ["seo_rent", m.property_list.seo_rent_title]);
    titles.push(["faq", m.faq.meta_title + B], ["about", m.about_page.meta_title], ["mentions_acquisition", m.mentions_acquisition.meta_title]);
    titles.push(["waitlist", m.waitlist_page.title + B], ["borrowing", m.borrowing_capacity.meta_title], ["accueil", m.meta.default_title]);
    for (const t of ["exclusif", "semi_exclusif", "simple", "autonome", "recherche"]) if (m[`mandate_${t}`]) titles.push([`mandate_${t}`, m[`mandate_${t}`].title + B]);
    assert.ok(titles.length > 30, `${l} : ${titles.length} titres`);
    for (const [k, v] of titles) assert.ok(v.length >= min && v.length <= max, `${l} ${k} : ${v.length} caracteres (${v})`);
  }
  // Pages signalees, mot-cle principal garde.
  assert.equal(`${msgs("fr").intent_pages.broker.meta_title}${B}`, "Broker immobilier international au Luxembourg, MAPA Property");
  assert.equal(`${msgs("en").intent_pages.broker.meta_title}${B}`, "International real estate broker in Luxembourg, MAPA Property");
  assert.equal(`${msgs("de").intent_pages.broker.meta_title}${B}`, "Internationaler Immobilienbroker in Luxemburg, MAPA Property");
  assert.equal(msgs("en").property_list.seo_sale_title, "Properties for sale in Luxembourg and abroad, MAPA Property");
});

await test("2. titre d'une recherche : court, lieu en communes entieres, marque s'il reste de la place, coupe sur un mot", () => {
  const { min, max } = CONTROLE_TITLE_LENGTH;
  for (const l of LOCALES) {
    const sp = msgs(l).searches_page;
    const tpl = { type: sp.meta_title_type, place: sp.meta_title_place };
    const long = { reference: "R-2026-002", communes: ["Luxembourg-Ville", "Strassen", "Bertrange", "Mamer", "Kopstal", "Walferdange", "Hesperange", "Sandweiler"] };
    const tLong = searchTitle(long, typeInTitle(sp.type["maison-de-maitre"], l), tpl);
    assert.ok(tLong.length >= min && tLong.length <= max, `${l} ${tLong.length} ${tLong}`);
    assert.ok(tLong.includes("Luxembourg-Ville"), "premiere commune gardee");
    assert.ok(!/[,\s]$/.test(tLong) && !/[–—]/.test(tLong));
    for (const part of tLong.replace(", MAPA Property", "").split(/,\s*/).slice(1)) assert.ok(long.communes.includes(part.trim()), `commune entiere : ${part}`);
    const short = searchTitle({ reference: "R-1", communes: ["Mamer"] }, typeInTitle(sp.type.maison, l), tpl);
    assert.ok(short.endsWith(", MAPA Property") && short.length <= max, short);
    const none = searchTitle({ reference: "R-1", communes: [] }, typeInTitle(sp.type.studio, l), tpl);
    assert.ok(none.length >= min && none.length <= max, none);
    // Commune tres longue : coupe sur un mot entier.
    const huge = searchTitle({ reference: "R-1", communes: ["Commune imaginaire au nom vraiment beaucoup trop long pour un titre"] }, typeInTitle(sp.type.appartement, l), tpl);
    assert.ok(huge.length <= max && huge.length >= min, huge);
    const words = new Set(`${tpl.place} ${sp.type.appartement} ${typeInTitle(sp.type.appartement, l)} Commune imaginaire au nom vraiment beaucoup trop long pour un titre MAPA Property`.split(/[\s,:]+/));
    for (const w of huge.split(/[\s,:]+/).filter(Boolean)) assert.ok(words.has(w), `mot coupe : ${w} dans ${huge}`);
  }
  assert.equal(searchTitle({ reference: "R-1", communes: ["Strassen", "Bertrange"] }, "maison", { type: "Recherche : {type}", place: "Recherche : {type} à {place}" }), "Recherche : maison à Strassen, Bertrange, MAPA Property");
  assert.equal(cutAtWord("Recherche : maison à Strassen, Bertrange", 33), "Recherche : maison à Strassen");
  // Deux recherches au meme titre : la reference les distingue.
  const fr = msgs("fr").searches_page;
  const titles = searchTitles(SEARCHES, (t) => typeInTitle(fr.type[t], "fr"), { type: fr.meta_title_type, place: fr.meta_title_place });
  const dup = searchTitles([{ reference: "R-A", communes: ["Mamer"], property_type: "maison" }, { reference: "R-B", communes: ["Mamer"], property_type: "maison" }], (t) => typeInTitle(fr.type[t], "fr"), { type: fr.meta_title_type, place: fr.meta_title_place });
  assert.notEqual(dup.get("R-A"), dup.get("R-B"));
  assert.ok(dup.get("R-A")!.includes("R-A") && dup.get("R-A")!.length <= CONTROLE_TITLE_LENGTH.max);
  assert.equal(new Set(titles.values()).size, SEARCHES.length);
  assert.ok(read("app/[locale]/recherches/[reference]/page.tsx").includes("buildPageMetadata(locale, `/recherches/${s.reference}`, pageTitle, description)"));
});

await test("3. mentions legales : donnees structurees avec un @type (meme etablissement)", () => {
  const data = legalNoticeOrganization("https://mapaproperty.lu");
  const html = `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  const facts = parsePage(html);
  assert.deepEqual(facts.jsonld, { valid: 1, invalid: 0, noType: 0 });
  assert.equal(data["@type"], "RealEstateAgent");
  assert.equal(data["@id"], "https://mapaproperty.lu#organization");
  const page = read("app/[locale]/legal/mentions-legales/page.tsx");
  assert.ok(page.includes("<JsonLd data={legalNoticeOrganization()} />"));
  // Avant : bloc sans @type -> signale par le controle.
  const before = parsePage(`<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@id": "x#organization", vatID: "LU0" })}</script>`);
  assert.equal(before.jsonld.noType, 1);
});

await test("textes ajoutes : trois langues, sans tiret long ni moyen", () => {
  const keys: [string, string][] = [["nav", "all_services"], ["property", "others_title"], ["property_list", "cities_title"], ["offmarket", "others_title"], ["offmarket", "others_all"], ["searches_page", "others_title"], ["searches_page", "meta_title_type"], ["searches_page", "meta_title_place"], ["mandate_common", "searches_link"]];
  for (const l of LOCALES) {
    const m = msgs(l);
    for (const [ns, k] of keys) {
      const v = m[ns]?.[k];
      assert.ok(typeof v === "string" && v.length > 0, `${l} ${ns}.${k}`);
      assert.ok(!/[–—]/.test(v), `${l} ${ns}.${k}`);
    }
  }
});

console.log(`\n${pass} PASS, 0 FAIL`);
