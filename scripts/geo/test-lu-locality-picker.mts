// Champ ville du Luxembourg (nov. 2026) : bouton, panneau avec liste
// complete au clic, aucun nom de champ que Safari prendrait pour une
// adresse. Sans reseau ni navigateur.
// Lancement : node --import tsx scripts/geo/test-lu-locality-picker.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LU_PLACES } from "../../lib/geo/lu-localities";
import { filterLuPlaces, placeKey, sameLuPlace, type LuPlace } from "../../lib/geo/lu-place-match";
import { initialPicker, pickerReducer } from "../../lib/geo/lu-locality-picker";
import { LU_PICKER_SEARCH_NAME, LuLocalityPanel, LuLocalityPicker } from "../../components/forms/LuLocalityPicker";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

const FORBIDDEN = /city|ville|locality|localite|address|adresse/i;
const label = (p: LuPlace) => (p.quartier ? `${p.name}, quartier de Luxembourg` : `${p.name}, commune de ${p.commune}`);
const texts = { choose: "Choisir une localité", search: "Filtrer la liste", list: "Localités du Luxembourg", noMatch: "Aucune localité officielle ne correspond." };
const noop = () => {};
const attrs = (html: string, name: string) => [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, "g"))].map((m) => m[1]);

test("liste complete sans rien taper : 589 choix (localites et quartiers), ordre alphabetique", () => {
  const all = filterLuPlaces(LU_PLACES, "");
  assert.equal(all.length, LU_PLACES.length);
  assert.equal(all.length, 589);
  for (let i = 1; i < all.length; i++) {
    const c = all[i - 1].name.localeCompare(all[i].name, "fr") || all[i - 1].commune.localeCompare(all[i].commune, "fr");
    assert.ok(c <= 0, `ordre : ${all[i - 1].name} puis ${all[i].name}`);
  }
  assert.ok(all.some((p) => p.name === "Kleinbettingen" && p.commune === "Steinfort"));
  assert.ok(all.some((p) => p.name === "Belair" && p.quartier));
  // Une commune seule (vente deja saisie) n'est jamais proposee.
  assert.equal(filterLuPlaces([...LU_PLACES, { name: "Steinfort", commune: "Steinfort", communeOnly: true }], "").length, 589);
});

test("filtre a la frappe : sans accents ni majuscules, toutes les correspondances, debut du nom d'abord", () => {
  assert.deepEqual(filterLuPlaces(LU_PLACES, "ESCH SUR ALZETTE"), filterLuPlaces(LU_PLACES, "esch-sur-alzette"));
  assert.equal(filterLuPlaces(LU_PLACES, "kleinbet")[0].name, "Kleinbettingen");
  const e = filterLuPlaces(LU_PLACES, "ange");
  assert.ok(e.length > 8, "plus de 8 resultats : aucune limite");
  assert.ok(e.every((p) => placeKey(p.name).includes("ange")));
  const firstOther = e.findIndex((p) => !placeKey(p.name).startsWith("ange"));
  assert.ok(e.slice(firstOther).every((p) => !placeKey(p.name).startsWith("ange")));
  assert.equal(filterLuPlaces(LU_PLACES, "Villebidon").length, 0);
});

test("clic sur le bouton : panneau ouvert, case vide, toute la liste ; clavier et fermeture", () => {
  assert.equal(initialPicker.open, false);
  const opened = pickerReducer(initialPicker, { type: "open" });
  assert.deepEqual(opened, { open: true, query: "", active: 0 });
  assert.equal(filterLuPlaces(LU_PLACES, opened.query).length, 589);
  // Localite deja choisie : elle devient l'option active a l'ouverture.
  const all = filterLuPlaces(LU_PLACES, "");
  const kb = all.findIndex((p) => p.name === "Kleinbettingen");
  assert.equal(pickerReducer(initialPicker, { type: "open", active: kb }).active, kb);
  assert.equal(pickerReducer(initialPicker, { type: "open", active: -1 }).active, 0);
  // Fleches : bornees a la liste.
  let s = pickerReducer(opened, { type: "move", delta: -1, count: 589 });
  assert.equal(s.active, 0);
  s = pickerReducer({ ...opened, active: 588 }, { type: "move", delta: 1, count: 589 });
  assert.equal(s.active, 588);
  // Frappe : retour a la premiere option ; Echap ou choix : ferme et vide.
  s = pickerReducer({ ...opened, active: 12 }, { type: "query", query: "kl" });
  assert.deepEqual(s, { open: true, query: "kl", active: 0 });
  assert.deepEqual(pickerReducer(s, { type: "close" }), initialPicker);
});

test("rendu ferme : un bouton (combobox), aucun champ texte", () => {
  const html = renderToStaticMarkup(
    createElement(LuLocalityPicker, { places: LU_PLACES, value: null, onChange: noop, optionLabel: label, texts, tone: "site", triggerClassName: "x" }),
  );
  assert.ok(html.startsWith('<div class="relative"><button type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false"'));
  assert.ok(html.includes(">Choisir une localité</span>"));
  assert.ok(!html.includes("<input"));
  const chosen = renderToStaticMarkup(
    createElement(LuLocalityPicker, { places: LU_PLACES, value: { name: "Kleinbettingen", commune: "Steinfort" }, onChange: noop, optionLabel: label, texts, tone: "admin", triggerClassName: "x" }),
  );
  assert.ok(chosen.includes(">Kleinbettingen, commune de Steinfort</span>"));
  for (const h of [html, chosen]) for (const v of [...attrs(h, "name"), ...attrs(h, "id")]) assert.ok(!FORBIDDEN.test(v), v);
});

test("rendu ouvert : case de recherche neutre et liste complete de 589 options", () => {
  const items = filterLuPlaces(LU_PLACES, "");
  const html = renderToStaticMarkup(
    createElement(LuLocalityPanel, {
      listId: "mapa-liste-lieux-t",
      searchId: `${LU_PICKER_SEARCH_NAME}-t`,
      items,
      value: items[3],
      active: 3,
      query: "",
      optionLabel: label,
      texts,
      tone: "site",
      onQuery: noop,
      onActive: noop,
      onChoose: noop,
      onKeyDown: noop,
    }),
  );
  assert.equal((html.match(/role="option"/g) ?? []).length, 589);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.equal((html.match(/<input/g) ?? []).length, 1);
  const input = html.match(/<input[^>]*>/)![0];
  for (const a of ['type="search"', 'name="mapa-recherche-lieu"', 'id="mapa-recherche-lieu-t"', 'autoComplete="off"', 'autoCorrect="off"', 'spellCheck="false"', 'aria-activedescendant="mapa-liste-lieux-t-3"', 'aria-controls="mapa-liste-lieux-t"']) {
    assert.ok(input.toLowerCase().includes(a.toLowerCase()), `${a} dans ${input}`);
  }
  assert.ok(html.includes('role="listbox"') && html.includes("max-h-[min(20rem,50vh)] overflow-y-auto"));
  for (const v of [...attrs(html, "name"), ...attrs(html, "id")]) assert.ok(!FORBIDDEN.test(v), v);
  assert.ok(html.includes(">Kleinbettingen, commune de Steinfort</li>"));
});

test("sources : aucun champ envoye par le composant, aucun nom ni identifiant interdit", () => {
  const picker = read("components/forms/LuLocalityPicker.tsx");
  assert.equal((picker.match(/<input/g) ?? []).length, 1);
  for (const f of ["components/admin/LuLocalityCombobox.tsx", "components/forms/LuLocalityField.tsx"]) {
    const src = read(f);
    assert.ok(src.includes("<LuLocalityPicker") && !src.includes("<input"), f);
  }
  for (const f of ["components/forms/LuLocalityPicker.tsx", "components/admin/LuLocalityCombobox.tsx", "components/forms/LuLocalityField.tsx"]) {
    for (const m of read(f).matchAll(/\b(?:name|id)=(?:"([^"]*)"|\{`([^`]*)`\})/g)) assert.ok(!FORBIDDEN.test(m[1] ?? m[2]), `${f} : ${m[0]}`);
  }
  assert.ok(!FORBIDDEN.test(LU_PICKER_SEARCH_NAME));
});

test("chaque endroit garde les memes donnees envoyees", () => {
  // Admin, creation d'un bien : memes champs caches city et city_commune.
  const create = read("components/admin/PropertyCreateForm.tsx");
  assert.ok(create.includes("<LuLocalityCombobox key=\"lu\" places={luPlaces} value={luPlace} onChange={setLuPlace} className={inputCls} />"));
  assert.ok(create.includes('<input type="hidden" name="city" value={luPlace?.name ?? ""} />') && create.includes('<input type="hidden" name="city_commune" value={luPlace?.commune ?? ""} />'));
  // Admin, modification d'un bien : localite et commune par l'etat du formulaire.
  const edit = read("components/admin/PropertyEditForm.tsx");
  assert.ok(edit.includes("<LuLocalityCombobox") && edit.includes("city_commune: p?.commune ?? null") && edit.includes("city: cityOut"));
  // Ventes realisees : la commune de la localite.
  const sale = read("app/admin/ventes-realisees/SaleForm.tsx");
  assert.ok(sale.includes("<LuLocalityCombobox") && sale.includes("commune: place.commune"));
  // 5 mandats : city et city_commune envoyes depuis l'etat, envoi bloque sans localite.
  const form = read("components/forms/ContactForm.tsx");
  assert.ok(form.includes("<LuLocalityField") && form.includes("city: luCity ? luPlace?.name") && form.includes("city_commune: luCity ? luPlace?.commune"));
  assert.ok(form.includes("(isMandateForm && (luCity ? !luPlace : !city.trim()))"));
  // Autres pays : champ texte libre inchange.
  assert.ok(form.includes('name="city"\n              type="text"'));
});

test("traductions : bouton, case et liste en fr, en, de ; aucun tiret long ou moyen", () => {
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`));
    for (const ns of ["form", "admin_properties"]) {
      for (const k of ["city_lu_choose", "city_lu_search", "city_lu_list", "city_lu_no_match"]) {
        assert.ok(m[ns][k], `${l} ${ns}.${k}`);
        assert.ok(!/[\u2013\u2014]/.test(m[ns][k]), `${l} ${ns}.${k}`);
      }
    }
  }
  assert.equal(JSON.parse(read("messages/fr.json")).form.city_lu_choose, "Choisir une localité");
  assert.ok(sameLuPlace({ name: "Hostert", commune: "Rambrouch" }, { name: "Hostert", commune: "Rambrouch" }));
  assert.ok(!sameLuPlace({ name: "Hostert", commune: "Rambrouch" }, { name: "Hostert", commune: "Niederanven" }));
});

console.log(`${pass} PASS`);
