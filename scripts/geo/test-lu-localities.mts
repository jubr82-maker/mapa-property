// Referentiel officiel des localites du Luxembourg (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/geo/test-lu-localities.mts
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { LU_COMMUNES, LU_LOCALITIES, LU_LOCALITIES_FILE_DATE, LU_PLACES, LU_QUARTIERS } from "../../lib/geo/lu-localities";
import { luCitySlug, resolveLuPlace, searchLuPlaces } from "../../lib/geo/lu-place-match";
import { checkLocation, foreignCitySuggestions } from "../../lib/admin/property-location";
import { checkLeadCity } from "../../lib/lead-location";
import { parseSaleInput } from "../../lib/admin/sales-auth";
import { resolveSaleCommune } from "../../lib/geo/lu-place-match";
import { OFFICIAL_COMMUNES } from "../../lib/geo/luxembourg-localities-official";
import { cityForProperty, cityPageOptions } from "../../lib/internal-links";
import { sanitizeListingData } from "../../lib/listing/listing-data";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};
const page = (city: string, country = "LU", city_page: string | null = null) => cityForProperty({ city, country, city_page })?.slug ?? null;

test("referentiel complet : 100 communes, 565 localites, 24 quartiers, aucun doublon dans une commune", () => {
  assert.equal(LU_LOCALITIES_FILE_DATE, "2026-10-19");
  assert.equal(LU_COMMUNES.length, 100);
  assert.equal(LU_LOCALITIES.length, 565);
  assert.equal(LU_QUARTIERS.length, 24);
  const communes = new Set(LU_COMMUNES.map((c) => c.name));
  const seen = new Set<string>();
  for (const l of LU_LOCALITIES) {
    assert.ok(communes.has(l.commune), `${l.name} : commune ${l.commune}`);
    assert.ok(!seen.has(`${l.commune}|${l.name}`), `doublon ${l.name} (${l.commune})`);
    seen.add(`${l.commune}|${l.name}`);
    for (const c of l.postalCodes) assert.match(c, /^\d{4}(-\d{4})?$/, `${l.name} code postal ${c}`);
  }
  // Chaque commune a au moins une localite ; aucun quartier n'a le nom d'une localite.
  for (const c of communes) assert.ok(LU_LOCALITIES.some((l) => l.commune === c), c);
  for (const q of LU_QUARTIERS) assert.ok(!LU_LOCALITIES.some((l) => l.name === q.name), q.name);
  assert.ok(!/[\u2013\u2014]/.test(read("lib/geo/lu-localities.json")));
});

test("recherche sans accents, majuscules, espaces ni traits d'union : mond, kleinbet, esch", () => {
  const names = (q: string) => searchLuPlaces(LU_PLACES, q, 20).map((p) => `${p.name}|${p.commune}`);
  assert.ok(names("mond").includes("Mondorf-les-Bains|Mondorf-les-Bains") && names("mond").includes("Mondercange|Mondercange"));
  assert.deepEqual(names("kleinbet"), ["Kleinbettingen|Steinfort"]);
  assert.deepEqual(names("KLEIN BET"), names("kleinbet"));
  const esch = names("esch");
  assert.ok(esch.indexOf("Esch-sur-Alzette|Esch-sur-Alzette") >= 0 && esch.indexOf("Esch-sur-Sûre|Esch-sur-Sûre") >= 0);
  // Celles qui commencent par la saisie d'abord.
  assert.ok(esch.slice(0, 3).every((n) => n.toLowerCase().startsWith("esch")));
  assert.ok(names("eschsursure").includes("Esch-sur-Sûre|Esch-sur-Sûre"));
  assert.deepEqual(names(""), []);
});

test("rattachement : commune (Kleinbettingen, Hagen, Grass vers Steinfort ; Capellen, Holzem vers Mamer), quartiers, sans page", () => {
  for (const c of ["Kleinbettingen", "Hagen", "Grass", "Steinfort"]) assert.equal(page(c), "steinfort", c);
  for (const c of ["Capellen", "Holzem", "Mamer"]) assert.equal(page(c), "mamer", c);
  assert.equal(page("Belair"), "belair");
  assert.equal(page("Kirchberg"), "kirchberg");
  assert.equal(page("Bonnevoie-Sud"), "bonnevoie");
  assert.equal(page("Neudorf / Weimershof"), "neudorf");
  assert.equal(page("Gare"), "luxembourg-ville");
  assert.equal(page("Ville Haute"), "luxembourg-ville");
  assert.equal(page("Luxembourg"), "luxembourg-ville");
  assert.equal(page("Mondorf-les-Bains"), null);
  assert.equal(page("Fentange"), null);
  // Choix fait a la main conserve (les 2 bureaux sur Belair).
  assert.equal(page("Luxembourg", "Luxembourg", "belair"), "belair");
  assert.equal(page("Kleinbettingen", "LU", "none"), null);
  // Pays enregistre en toutes lettres (biens importes) ; hors Luxembourg, pas de rattachement par commune.
  assert.equal(page("Capellen", "Luxembourg"), "mamer");
  assert.equal(page("Capellen", "BE"), null);
  assert.equal(page("Hamm", "DE"), "hamm"); // nom d'une page : regle inchangee
  // Noms presents dans deux communes : aucune des deux n'a de page, la commune n'est pas necessaire au site.
  const lu = cityPageOptions().filter((o) => o.lu);
  const dup = LU_LOCALITIES.filter((l) => LU_LOCALITIES.filter((m) => m.name === l.name).length > 1);
  for (const l of dup) assert.equal(luCitySlug(LU_PLACES, lu, l.name, l.commune), null, `${l.name} (${l.commune})`);
});

test("preremplissage : nom officiel si la correspondance est sure, sinon rien", () => {
  const r = resolveLuPlace(LU_PLACES, "Mondorf les bains");
  assert.equal(r.status === "ok" && r.place.name, "Mondorf-les-Bains");
  assert.equal(resolveLuPlace(LU_PLACES, "KLEINBETTINGEN").status, "ok");
  assert.equal(resolveLuPlace(LU_PLACES, "Hostert").status, "ambiguous");
  const h = resolveLuPlace(LU_PLACES, "Hostert", "Rambrouch");
  assert.equal(h.status === "ok" && h.place.commune, "Rambrouch");
  assert.equal(resolveLuPlace(LU_PLACES, "Villebidon").status, "none");
  assert.equal(resolveLuPlace(LU_PLACES, "Mondorf").status, "none");
  assert.equal(sanitizeListingData({ facts: { city_commune: "Rambrouch" } }).facts.city_commune, "Rambrouch");
});

test("serveur : localite inventee refusee au Luxembourg, texte libre ailleurs, pays de la liste", () => {
  assert.deepEqual(checkLocation({ country: "LU", city: "Villebidon" }), { ok: false, code: "city_not_official" });
  assert.deepEqual(checkLocation({ country: "LU", city: "Mondorf les bains" }), { ok: false, code: "city_not_official" });
  assert.deepEqual(checkLocation({ country: "LU", city: "Kleinbettingen", commune: "Steinfort" }), { ok: true, country: "LU", city: "Kleinbettingen" });
  assert.deepEqual(checkLocation({ country: "LU", city: "Hostert" }), { ok: false, code: "city_not_official" });
  assert.equal(checkLocation({ country: "LU", city: "Hostert", commune: "Niederanven" }).ok, true);
  assert.deepEqual(checkLocation({ country: "FR", city: "Metz" }), { ok: true, country: "FR", city: "Metz" });
  assert.deepEqual(checkLocation({ country: "XX", city: "Metz" }), { ok: false, code: "country_invalid" });
  // Modification : ville seule, pays deja enregistre en toutes lettres.
  assert.equal(checkLocation({ city: "Villebidon", currentCountry: "Luxembourg" }).ok, false);
  // Passage au Luxembourg sans localite officielle : refuse.
  assert.equal(checkLocation({ country: "LU", currentCountry: "FR", currentCity: "Metz" }).ok, false);
  assert.equal(checkLocation({ country: "LU", currentCountry: "FR", currentCity: "Steinfort" }).ok, true);
});

test("admin : liste fermee au Luxembourg a la creation et en modification, controle serveur, style inchange", () => {
  const create = read("components/admin/PropertyCreateForm.tsx");
  assert.ok(create.includes("<LuLocalityCombobox") && create.includes('name="city"') && create.includes('communeName="city_commune"') && create.includes("COUNTRIES.map"));
  const edit = read("components/admin/PropertyEditForm.tsx");
  assert.ok(edit.includes("<LuLocalityCombobox") && edit.includes("resolveLuPlace(") && edit.includes("country: countryOut") && edit.includes("city: cityOut"));
  const actions = read("app/admin/properties/actions.ts");
  assert.equal((actions.match(/checkLocation\(/g) ?? []).length, 2);
  const combo = read("components/admin/LuLocalityCombobox.tsx");
  assert.ok(!/rounded-2xl|border-2|ring-/.test(combo));
  for (const l of ["fr", "en", "de"]) {
    const a = JSON.parse(read(`messages/${l}.json`)).admin_properties;
    for (const k of ["city_lu_option", "city_quartier_option", "city_prefill_none", "city_prefill_ambiguous", "err_city_not_official", "err_code_city_not_official"]) assert.ok(a[k], `${l} ${k}`);
  }
  assert.equal(JSON.parse(read("messages/fr.json")).admin_properties.city_lu_option, "{name}, commune de {commune}");
});

test("commune d'une localite homonyme : relue en base par le serveur, transmise au rattachement du site", () => {
  const actions = read("app/admin/properties/actions.ts");
  assert.ok(actions.includes("city_commune:listing_data->facts->>city_commune") && actions.includes(": current.city_commune ?? null"));
  assert.ok(read("lib/internal-links.ts").includes("luCitySlug(LU_PLACES, LU_ENTRIES, place, p.city_commune)"));
  for (const f of ["lib/data.ts", "lib/revalidate-property.ts"]) assert.ok(read(f).includes("city_commune:listing_data->facts->>city_commune"), f);
  assert.ok(read("app/[locale]/biens/[slug]/page.tsx").includes("city_commune: propertyFacts.city_commune"));
});

test("site public : le referentiel n'entre dans aucun composant client", () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(join(root, d))) {
      const p = join(d, f);
      if (statSync(join(root, p)).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f)) files.push(p);
    }
  };
  for (const d of ["app", "components", "lib"]) walk(d);
  for (const f of files) {
    const src = read(f);
    if (!/^\s*["']use client["']/m.test(src)) continue;
    const imports = src.split("\n").filter((l) => /^\s*import\b|from\s+["']/.test(l)).join("\n");
    assert.ok(!/lu-localities|property-location|lib\/internal-links/.test(imports), `${f} importe le referentiel`);
  }
});

test("mandat (site public) : localite du registre au Luxembourg, refus d'une localite inventee, texte libre ailleurs", () => {
  const m = { type: "search_mandate", country: "LU" };
  assert.deepEqual(checkLeadCity({ ...m, city: "Kleinbettingen", city_commune: "Steinfort" }), { ok: true, city: "Kleinbettingen" });
  assert.deepEqual(checkLeadCity({ ...m, city: "Belair", city_commune: "Luxembourg" }), { ok: true, city: "Belair" });
  assert.deepEqual(checkLeadCity({ ...m, city: "Villebidon" }), { ok: false });
  assert.deepEqual(checkLeadCity({ ...m, city: "mondorf les bains" }), { ok: false });
  assert.deepEqual(checkLeadCity({ ...m, city: "Hostert", city_commune: "Rambrouch" }), { ok: true, city: "Hostert (Rambrouch)" });
  assert.deepEqual(checkLeadCity({ type: "mandate_exclusif", country: "LU", city: "Villebidon" }), { ok: false });
  // Autre pays : texte libre inchange ; autres formulaires : non concernes.
  assert.deepEqual(checkLeadCity({ ...m, country: "FR", city: "Saint-Tropez, Var" }), { ok: true, city: "Saint-Tropez, Var" });
  assert.deepEqual(checkLeadCity({ type: "general_contact", country: "LU", city: "Villebidon" }), { ok: true, city: "Villebidon" });
  const form = read("components/forms/ContactForm.tsx");
  assert.ok(form.includes('dynamic(() => import("./LuLocalityField")') && form.includes("isMandateForm && Boolean(luPlaces) && isLuCountry(country)"));
  // Meme apparence : classes du champ identiques au texte libre.
  const cls = 'className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"';
  const block = form.slice(form.indexOf("{luCity && luPlaces ?"), form.indexOf("{showSubject"));
  assert.equal(block.split(cls).length - 1, 2);
  assert.ok(read("app/[locale]/mandats/[type]/page.tsx").includes("luPlaces={LU_PLACES}"));
  assert.ok(read("app/api/lead/route.ts").includes('{ error: "invalid_city" }, { status: 400 }'));
});

test("ventes realisees : commune officielle enregistree, relecture, ventes existantes preremplies seulement si sur", () => {
  const base = { property_type: "appartement", surface_habitable: 80, adresse: "1 rue X", date_acte: "2026-09-01", agent: "julien", prix_vente: 500000 };
  // Saisie : localite choisie -> sa commune enregistree ; relecture : la meme commune.
  const kb = searchLuPlaces(LU_PLACES, "kleinbet")[0];
  const saved = parseSaleInput({ ...base, commune: kb.commune }).insert!;
  assert.equal(saved.commune, "Steinfort");
  const back = resolveSaleCommune(LU_PLACES, saved.commune)!;
  assert.deepEqual(back, { name: "Steinfort", commune: "Steinfort", communeOnly: true });
  assert.equal(parseSaleInput({ ...base, commune: "Villebidon" }).error, "commune_not_official");
  assert.equal(parseSaleInput({ ...base, commune: "Kleinbettingen" }).error, "commune_not_official");
  // Valeurs deja saisies (jamais modifiees en base avant enregistrement).
  assert.equal(resolveSaleCommune(LU_PLACES, "mondorf les bains")?.commune, "Mondorf-les-Bains");
  assert.equal(resolveSaleCommune(LU_PLACES, "KLEINBETTINGEN")?.commune, "Steinfort");
  assert.equal(resolveSaleCommune(LU_PLACES, "Hostert"), null);
  assert.equal(resolveSaleCommune(LU_PLACES, "Villebidon"), null);
  // Moteur d'estimation : meme champ "commune", memes noms officiels que sa table (comparaison par commune).
  assert.deepEqual([...LU_COMMUNES.map((c) => c.name)].sort(), [...OFFICIAL_COMMUNES].sort());
  const form = read("app/admin/ventes-realisees/SaleForm.tsx");
  assert.ok(form.includes("<LuLocalityCombobox") && form.includes("commune: place.commune") && form.includes("resolveSaleCommune(luPlaces, initial?.commune)"));
  assert.ok(read("app/api/estimate/route.ts").includes('.select("prix_vente, surface_habitable, commune, property_type, date_acte, comparable_override")'));
});

test("admin des biens : suggestions des autres pays filtrees par pays", () => {
  const s = foreignCitySuggestions();
  assert.ok(s.FR.includes("Metz") && s.FR.includes("Paris") && !s.FR.includes("Algarve") && !s.FR.includes("Monaco"));
  assert.ok(s.PT.includes("Algarve") && s.PT.includes("Portimão") && !s.PT.includes("Metz"));
  assert.ok(s.AE.includes("Dubai") && !s.AE.includes("Metz"));
  assert.deepEqual(s.MC, ["Monaco", "Monte Carlo", "Monte-Carlo"]);
  assert.equal(s.LU, undefined);
  assert.equal(s.SE, undefined);
  assert.ok(read("components/admin/PropertyCreateForm.tsx").includes("suggestions={foreignSuggestions[country] ?? []}"));
  assert.ok(read("components/admin/PropertyEditForm.tsx").includes("suggestions={location.foreignSuggestions[country] ?? []}"));
});

console.log(`${pass} PASS, 0 FAIL`);
