// Affichage des descriptions de biens (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-description.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment } from "react";
import { descriptionBlocks, descriptionPlainText, descriptionSummary, clipText } from "../../lib/listing/description-text";
import { highlightTitles } from "../../lib/formatting/highlightTitles";

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
  assert.equal(descriptionPlainText("— Source: MAPA Property, © 2026."), "Source : MAPA Property, © 2026.");
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
  assert.ok(fiche.includes("descriptionPlainText(pickLang(property, \"description\"") && fiche.includes("clipText(descriptionPlainText(description), 500)") && fiche.includes("descriptionSummary(description)"));
  assert.ok(!read("lib/formatting/highlightTitles.tsx").includes("dangerouslySetInnerHTML"));
  assert.ok(read("app/[locale]/off-market/page.tsx").includes("descriptionPlainText(property.short_pitch)"));
});

console.log(`${pass} PASS, 0 FAIL`);
