// Affichage des descriptions de biens (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-description.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment } from "react";
import { descriptionBlocks, descriptionPlainText, descriptionSummary, clipText } from "../../lib/listing/description-text";
import { highlightTitles } from "../../lib/formatting/highlightTitles";
import { splitCommonMentions } from "../../lib/listing/common-mentions";
import { generateEnding, type ListingColumns } from "../../lib/listing/generate";
import { emptyListingData } from "../../lib/listing/listing-data";
import { htmlToText } from "../../lib/listing/template-engine";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const html = (s: string) => renderToStaticMarkup(createElement(Fragment, null, highlightTitles(s)));
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

// Texte Apimo reel (fiche Dubai 85102753), raccourci.
const DUBAI =
  "MAPA Property vous propose cet appartement exceptionnel. Cet appartement de 3 chambres vous promet un cadre de vie luxueux. Détails de l'Appartement: - **Suite Parentale**: Spacieuse et élégante. - **Chambre 2**: Confortable et lumineuse. - **Terrasse**: Espace extérieur généreux sur la ville. Détails de la Résidence: - **Piscine à Débordement**: Plongez dans une piscine. - **Accès Direct à l'Opéra de Dubaï**: Vivez au rythme de la culture et des spectacles. Ne manquez pas cette opportunité unique. Contactez-nous dès aujourd'hui pour plus d'informations et pour organiser une visite: #mapaproperty #immobilier #realestate #dubai #DubaiRealEstate";

test("liste collee, gras, intertitres, hashtags", () => {
  const b = descriptionBlocks(DUBAI);
  assert.deepEqual(b.map((x) => x.kind), ["p", "heading", "ul", "heading", "ul", "p"]);
  assert.equal((b[1] as { text: string }).text, "Détails de l'Appartement");
  assert.equal((b[2] as { items: unknown[] }).items.length, 3);
  assert.equal((b[4] as { items: unknown[] }).items.length, 2);
  const out = html(DUBAI);
  assert.ok(out.includes('<li><span><strong class="font-semibold">Suite Parentale</strong></span><span>: Spacieuse et élégante.</span></li>'));
  assert.ok(out.includes('<h3 class="mb-2 font-semibold">Détails de la Résidence</h3>'));
  assert.ok(!/\*\*|(?<!&)#\w|<li>[^<]*-/.test(out), out);
  assert.ok(out.endsWith("organiser une visite.</span></p>"), out.slice(-120));
});

test("texte court sans **, # ni tiret de liste", () => {
  const plain = descriptionPlainText(DUBAI);
  assert.ok(!/\*\*|#|(^|\s)[-–—•]\s/.test(plain), plain);
  assert.ok(plain.includes("Suite Parentale: Spacieuse et élégante; Chambre 2: Confortable et lumineuse; Terrasse"));
  assert.equal(descriptionSummary(DUBAI), "MAPA Property vous propose cet appartement exceptionnel. Cet appartement de 3 chambres vous promet un cadre de vie luxueux.");
  assert.ok(clipText(plain, 155).length <= 155);
});

test("aucun HTML injectable", () => {
  const evil = '<p>Bel appartement<script>alert(1)</script></p><p><img src=x onerror="alert(1)"><a href="javascript:x">lien</a> &lt;b&gt;texte&lt;/b&gt;</p>';
  const out = html(evil);
  assert.ok(!/<script|<img|<a |onerror|javascript:/i.test(out), out);
  assert.ok(out.includes("&lt;b&gt;texte&lt;/b&gt;"), out);
});

test("HTML de l'admin : paragraphes, listes, gras, italique", () => {
  const out = html("<p><strong>Atouts :</strong></p><ul><li>Jardin</li><li>Garage</li></ul><p>Calme et <em>lumineux</em>.</p>");
  assert.equal(out, '<h3 class="mb-2 font-semibold">Atouts</h3><ul class="mb-4 list-disc space-y-1 pl-5"><li><span>Jardin</span></li><li><span>Garage</span></li></ul><p class="mb-4"><span>Calme et </span><span><em>lumineux</em></span><span>.</span></p>');
});

test("texte brut a retours a la ligne et puces variees", () => {
  const b = descriptionBlocks("Maison familiale.\n\nPrestations :\n• Cuisine équipée\n– Chauffage au sol\n— Double vitrage\n\nSurface habitable : 180 m²");
  assert.deepEqual(b.map((x) => x.kind), ["p", "heading", "ul", "p"]);
  assert.equal((b[2] as { items: unknown[] }).items.length, 3);
  // "Label : suite" garde son label en gras (ancien rendu).
  assert.ok(html("Surface habitable : 180 m²").startsWith('<p class="mb-4"><span><strong class="font-semibold">Surface habitable :</strong></span>'));
});

test("phrase d'introduction, tiret colle, element isole, separateur", () => {
  const b = descriptionBlocks("Il se compose aujourd’hui de :\n– Trois chambres,\n– Une salle de bain.\n⸻\nCinq niveaux :\n-sous-sol\n- rez-de-chaussée\n\n— Source: MAPA Property, © 2026.");
  assert.deepEqual(b.map((x) => x.kind), ["p", "ul", "heading", "ul", "p"]);
  assert.equal(descriptionPlainText("— Source: MAPA Property, © 2026."), "Source: MAPA Property, © 2026.");
  assert.equal((descriptionBlocks("Détails de l'Appartement :\n- A\n- B")[0] as { kind: string }).kind, "heading");
  // Liste aeree (ligne vide entre chaque element) : une seule liste.
  assert.deepEqual(descriptionBlocks("- A\n\n- B\n\n- C").map((x) => x.kind), ["ul"]);
  assert.equal((descriptionBlocks("Les diagnostics confirment :\n- A\n- B")[0] as { kind: string }).kind, "p");
});

test("tiret isole dans une phrase : pas de liste", () => {
  const b = descriptionBlocks("Situé entre Luxembourg - Kirchberg et la gare, ce bien est rare.");
  assert.deepEqual(b.map((x) => x.kind), ["p"]);
});

test("long bloc d'un seul tenant decoupe en paragraphes", () => {
  const long = Array.from({ length: 12 }, (_, i) => `Phrase numéro ${i + 1} qui décrit le bien avec assez de mots pour compter.`).join(" ");
  const b = descriptionBlocks(long);
  assert.ok(b.length >= 2 && b.every((x) => x.kind === "p"));
});

test("pages branchees sur le rendu commun", () => {
  const fiche = read("app/[locale]/biens/[slug]/page.tsx");
  assert.ok(fiche.includes("descriptionPlainText(splitCommonMentions(pickLang(property, \"description\"") && fiche.includes("clipText(descriptionPlainText(description), 500)") && fiche.includes("descriptionSummary(description)"));
  assert.ok(!read("lib/formatting/highlightTitles.tsx").includes("dangerouslySetInnerHTML"));
  // Nov. 2026 : carte off-market partagee (liste, pages off-market, ARCOVA).
  assert.ok(read("app/[locale]/off-market/page.tsx").includes("<OffMarketTeaser "));
  assert.ok(read("components/offmarket/OffMarketTeaser.tsx").includes("descriptionPlainText(property.short_pitch)"));
});

// --- Fin standard des annonces (oct. 2026) ---------------------------------
const msgs = (l: "fr" | "en" | "de") => JSON.parse(read(`messages/${l}.json`)).listing_model;
const ALL = (["fr", "en", "de"] as const).flatMap((l) => msgs(l).seo.common_start as string[]);
const cols = (transaction: string, mandate: string | null) =>
  ({ property_type: "maison", transaction, mandate_type: mandate, city: "Steinfort", year_built: null, surface: null, living_surface: null, usable_surface: null, land_surface: null, terrace_surface: null, balcony_surface: null, garden_surface: null, bedrooms: null, parking: null, has_pool: false, floor: null, price: null, price_on_demand: false, current_use: null }) as ListingColumns;
const endingText = (l: "fr" | "en" | "de", transaction: string, mandate: string | null) => {
  const m = msgs(l);
  return htmlToText(generateEnding(cols(transaction, mandate), emptyListingData(), l, { title: m.title, tronc: m.tronc, blocks: m.blocks }, m.vocab, m.seo.common_start)).replace(/\n{3,}/g, "\n\n").trim();
};

test("fin du modele : vente exclusive, location, non exclusif", () => {
  const fr = endingText("fr", "sale", "exclusive");
  assert.ok(fr.startsWith("Une exclusivité MAPA Property.\n\nPour toute demande, contactez-nous depuis le bouton ci-dessous."), fr);
  assert.ok(fr.includes("Annonce diffusée en vente exclusive par MAPA Property.") && fr.endsWith("Toute reproduction ou diffusion, totale ou partielle, sans autorisation est interdite."), fr);
  assert.ok(endingText("fr", "rent", "exclusive").includes("Annonce diffusée en location exclusive par MAPA Property."));
  const simple = endingText("fr", "sale", null);
  assert.ok(simple.startsWith("Pour toute demande") && !simple.includes("exclusiv") && !simple.includes("Annonce diffusée"), simple);
  assert.ok(endingText("en", "sale", "exclusive").includes("Listing published as an exclusive sale by MAPA Property."));
  assert.ok(endingText("de", "sale", "exclusive").includes("Anzeige im Exklusivverkauf von MAPA Property veröffentlicht."));
  for (const l of ["fr", "en", "de"] as const) for (const tx of ["sale", "rent"]) for (const md of ["exclusive", "simple", null]) {
    const e = endingText(l, tx, md);
    assert.ok(e && !/[–—]/.test(e) && !/\{\{|\[\[/.test(e), `${l} ${tx} ${md}: ${e}`);
  }
  // Ponctuation du modele par defaut : espace avant "?", virgules entre les langues.
  assert.ok(endingText("fr", "sale", null).includes("votre bien ? Profitez") && endingText("fr", "sale", null).includes("luxembourgeois, français, anglais, allemand et italien."));
});

test("ancienne fin ecrite a la main : reperee, jamais affichee en double", () => {
  // Fin dans un seul paragraphe, separee par des <br> (cas Apimo).
  const body = "<p>" + "Belle maison familiale avec jardin. ".repeat(12) + "<br><br><strong>Une exclusivité MAPA Property.</strong><br><br>Pour toute demande, contactez-nous.<br>Toute reproduction interdite.</p>";
  const s = splitCommonMentions(body, ALL);
  assert.equal(s.body + s.common, body);
  assert.ok(s.body.endsWith("jardin. <br><br>") && s.common.startsWith("<strong>Une exclusivité"), s.common.slice(0, 40));
  // Fin collee dans une phrase (cas Dubai) et repere d'une autre langue.
  const dubai = "Appartement de prestige avec vue. ".repeat(10) + "Ne manquez pas cette opportunité. Pour une estimation immobilière gratuite, contactez-nous: #mapaproperty";
  assert.ok(splitCommonMentions(dubai, ALL).body.trim().endsWith("Ne manquez pas cette opportunité."));
  // Repere en debut d'annonce (30 % premiers) : pas une fin.
  const early = "<p>Pour toute demande de visite, appelez-nous.</p><p>" + "Maison lumineuse. ".repeat(20) + "</p>";
  assert.equal(splitCommonMentions(early, ALL).common, "");
  assert.equal(splitCommonMentions("<p>Texte Apimo sans mentions.</p>", ALL).common, "");
});

test("fiche : fin du modele affichee, corps sans ancienne fin, meta et donnees structurees sans mentions", () => {
  const fiche = read("app/[locale]/biens/[slug]/page.tsx");
  assert.ok(fiche.includes("generateEnding(listingColumnsOf(property)") && fiche.includes("await publicListingTemplates(lang)"));
  assert.ok(fiche.includes("<PropertyMagazineDescription description={ending} />") && fiche.includes("const description = split.body;"));
  assert.ok(fiche.includes("clipText(descriptionPlainText(description), 500)"));
  const actions = read("app/admin/settings/modeles/actions.ts");
  assert.equal((actions.match(/revalidatePublicEnding\(target\.part\)/g) ?? []).length, 2);
  assert.ok(read("supabase/sql/29_tronc_annonces_lecture_publique.sql").includes("USING (part = 'tronc')"));
});

console.log(`${pass} PASS, 0 FAIL`);
