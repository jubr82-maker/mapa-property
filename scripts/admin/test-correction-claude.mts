// Correction automatique des textes, traduction Claude et compteur de
// consommation, type de bien a l'import (nov. 2026). Sans reseau ni base :
// l'API Claude est remplacee par un faux "fetch" qui compte les appels.
// Lancement : node --import tsx scripts/admin/test-correction-claude.mts
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");

const { autoFixText, autoFixHtml, isContentCode } = await import("../../lib/listing/writing-autofix");
const { checkWriting, checkFields } = await import("../../lib/listing/writing-check");
const { contentHits, applyAllHits, applyHit } = await import("../../lib/listing/writing-suggest");
const { FORBIDDEN_PHRASES, FORBIDDEN_REPLACEMENTS } = await import("../../lib/listing/writing-rules");
const { htmlToText } = await import("../../lib/listing/template-engine");
const { claudeCostUsd, estimateTranslationUsd, remainingCreditUsd, usdToEur, CLAUDE_MODEL, CLAUDE_PRICE } = await import("../../lib/claude/pricing");
const { callClaude, translateListing, translationSystem, CLAUDE_ENDPOINT } = await import("../../lib/claude/translate-listing");
const { summarize } = await import("../../lib/claude/usage");
const { parseEcbRate } = await import("../../lib/claude/usd-rate");
const { missingRequired } = await import("../../lib/import-listing/required");

let pass = 0;
let fail = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass++;
    console.log(`PASS ${name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL ${name}\n     ${e instanceof Error ? e.message : String(e)}`);
  }
}

type Lang = "fr" | "en" | "de";
const formLeft = (text: string, lang: Lang, title = false) => checkWriting(text, lang, { title }).filter((i) => !isContentCode(i.code));

// Textes constates par Julien (enregistrement bloque avant ce chantier).
const JULIEN: Record<Lang, string> = {
  fr: "Maison familiale à Grass (commune de Steinfort) — à 16 km de Luxembourg-Ville.\nJardin sans vis-à-vis — un cadre rare et calme.\nVendu sans photo — dossier complet sur demande.\n4 chambres · 2 salles de bains · garage double\nTerrasse plein sud · jardin de 8 ares, arboré · cave",
  en: "Family house in Grass (Steinfort) — 16 km from Luxembourg City.\nGarden not overlooked — a rare and quiet setting.\nSold without photos — full file on request.\n4 bedrooms · 2 bathrooms · double garage\nSouth-facing terrace · 8-are garden, with trees · cellar",
  de: "Einfamilienhaus in Grass (Steinfort) — 16 km von Luxemburg-Stadt.\nGarten ohne Einsicht — ein seltener und ruhiger Rahmen.\nOhne Fotos verkauft — vollständige Unterlagen auf Anfrage.\n4 Schlafzimmer · 2 Badezimmer · Doppelgarage\nSüdterrasse · Garten von 8 Ar, mit Bäumen · Keller",
};

// --- 1. Correction automatique ------------------------------------------------
await check("1a. textes de Julien (FR, EN, DE) : corriges, plus rien de bloquant", () => {
  for (const lang of ["fr", "en", "de"] as const) {
    const r = autoFixText(JULIEN[lang], lang);
    assert.ok(r.changes.length >= 5, `${lang} : ${r.changes.length} corrections`);
    assert.ok(!/[–—·]/.test(r.text), `${lang} : ${r.text}`);
    assert.deepEqual(formLeft(r.text, lang), [], `${lang} : ${JSON.stringify(formLeft(r.text, lang))}`);
    // Deuxieme passage (serveur apres l'ecran) : plus rien a changer.
    assert.equal(autoFixText(r.text, lang).changes.length, 0, `${lang} : correction non stable`);
    // Ce que l'action serveur bloque encore : le fond seulement (rien ici).
    const blocking = checkFields([{ field: "description_fr", lang, text: r.text }]).flatMap((f) => f.issues).filter((i) => isContentCode(i.code));
    assert.deepEqual(blocking, []);
  }
  const fr = autoFixText(JULIEN.fr, "fr").text;
  assert.ok(fr.includes("(commune de Steinfort), à 16 km"), fr);
  assert.ok(fr.includes("sans vis-à-vis : un cadre rare"), fr);
  assert.ok(fr.includes("sans photo, dossier complet"), fr);
});

await check("1b. point median : virgule au fil de la ligne (point-virgule si deja des virgules), puce en debut de ligne", () => {
  const fr = autoFixText(JULIEN.fr, "fr").text;
  assert.ok(fr.includes("4 chambres, 2 salles de bains, garage double"), fr);
  assert.ok(fr.includes("Terrasse plein sud; jardin de 8 ares, arboré; cave".replace(/;/g, " ;")), fr);
  const list = autoFixText("Prestations\n· Cave\n• Garage\n▪ Ascenseur", "fr").text;
  assert.equal(list, "Prestations\n- Cave\n- Garage\n- Ascenseur");
});

await check("1c. tirets, exclamation, emoji, montants, surfaces, apostrophes, espaces, titres", () => {
  const r = autoFixText("Superbe vue ! Prix: 1250000€ pour 348m2 — l’idéal 🏡\nLa maison — rénovée en 2020 — offre 5 pièces.", "fr").text;
  assert.ok(r.includes("Superbe vue."), r);
  assert.ok(r.includes("Prix : 1 250 000 €"), r);
  assert.ok(r.includes("348 m²"), r);
  assert.ok(r.includes("l'idéal") && !/\p{Extended_Pictographic}/u.test(r), r);
  assert.ok(r.includes("La maison (rénovée en 2020) offre 5 pièces."), r);
  assert.deepEqual(formLeft(r, "fr"), []);
  const title = autoFixText("MAISON D'EXCEPTION Avec Grand Jardin À STEINFORT", "fr", { title: true, properNouns: ["Steinfort"] }).text;
  assert.equal(title, "Maison d'exception avec grand jardin à Steinfort");
  assert.deepEqual(formLeft(title, "fr", true), []);
  // Plage de chiffres et mot compose : trait d'union ; adresse web intacte.
  const k = autoFixText("Ouvert 9–18 h, Luxembourg—Ville, voir https://exemple.lu/a—b", "fr").text;
  assert.ok(k.includes("9-18 h") && k.includes("Luxembourg-Ville") && k.includes("https://exemple.lu/a—b"), k);
});

await check("1d. HTML de l'editeur : balises et entites intactes, texte corrige", () => {
  const html = "<p>Sans vis-à-vis — un cadre&nbsp;! <strong>Rare</strong> &amp; calme</p><ul><li>• Cave</li></ul><p>3 ch · 2 sdb</p>";
  const r = autoFixHtml(html, "fr");
  assert.equal(r.text, "<p>Sans vis-à-vis : un cadre. <strong>Rare</strong> &amp; calme</p><ul><li>Cave</li></ul><p>3 ch, 2 sdb</p>");
  assert.deepEqual(formLeft(htmlToText(r.text), "fr"), []);
  assert.equal(autoFixHtml(r.text, "fr").changes.length, 0, "correction HTML non stable");
  assert.ok(r.changes.every((c) => !/[\uE000-\uF8FF]/.test(c.before + c.after)), "reperes internes visibles");
  // Rien a corriger : texte rendu tel quel.
  assert.equal(autoFixHtml("<p>Rien à corriger.</p>", "fr").text, "<p>Rien à corriger.</p>");
});

await check("1d2. signe moins, puce dans <li>, entite invalide, titre traduit avec noms de lieux", async () => {
  assert.equal(autoFixText("Température −5 °C", "fr").text, "Température -5 °C");
  assert.equal(autoFixHtml("<ul><li>• Cave</li><li>Garage</li></ul>", "fr").text, "<ul><li>Cave</li><li>Garage</li></ul>");
  assert.doesNotThrow(() => autoFixHtml("<p>Texte &#99999999; — fin</p>", "fr"));
  assert.equal(autoFixHtml("<p>Texte &#99999999; &eacute;t&eacute; — fin</p>", "fr").text, "<p>Texte &#99999999; &eacute;t&eacute;, fin</p>");
  const { fixTranslation } = await import("../../lib/claude/translate-listing");
  assert.equal(fixTranslation({ title: "Apartment in Luxembourg City with Terrace", description: "", short: "" }, "en").title, "Apartment in Luxembourg City with Terrace");
});

await check("1e. avant / apres rapportes pour le message vert", () => {
  const r = autoFixText("Vendu sans photo — dossier complet", "fr");
  assert.equal(r.changes.length, 1);
  assert.equal(r.changes[0].code, "dash");
  assert.ok(r.changes[0].before.includes("—") && r.changes[0].after.includes("photo, dossier"), JSON.stringify(r.changes));
});

await check("1f. formules interdites : remplacement propose, \"Tout appliquer\" les retire toutes", () => {
  for (const lang of ["fr", "en", "de"] as const) {
    for (const phrase of FORBIDDEN_PHRASES[lang]) {
      assert.ok(FORBIDDEN_REPLACEMENTS[lang][phrase], `${lang} ${phrase} sans remplacement`);
      const w = phrase.replace(/\*$/, "e");
      const text = `Une maison ${w} pres du parc. ${w.charAt(0).toUpperCase() + w.slice(1)} encore.`;
      const hits = contentHits(text, lang);
      assert.ok(hits.length >= 2, `${lang} ${phrase}`);
      const fixed = applyAllHits(text, lang);
      assert.deepEqual(checkWriting(fixed, lang).filter((i) => isContentCode(i.code)), [], `${lang} ${phrase} : ${fixed}`);
    }
  }
  const html = "<p>Un havre de paix qui n&#39;attend que vous.</p><p>Découvrez.</p>";
  const one = contentHits(html, "fr")[0];
  assert.equal(applyHit(html, one), "<p>Un lieu calme qui n&#39;attend que vous.</p><p>Découvrez.</p>");
  assert.equal(applyAllHits(html, "fr"), "<p>Un lieu calme qui est disponible.</p><p>Visite sur rendez-vous.</p>");
  assert.deepEqual(contentHits("Atemberaubende Aussicht", "de").map((h) => h.replacement), ["Bemerkenswerte"]);
});

await check("1g. enregistrement : la forme ne bloque plus, seul le fond bloque (actions et ecrans)", () => {
  const actions = read("app/admin/properties/actions.ts");
  assert.ok(/autoFixHtml\(value, f\.lang\)/.test(actions) && /isContentCode\(i\.code\)/.test(actions));
  assert.ok(!/tl\("chk_blocked"\)/.test(actions), "ancien blocage de forme encore present");
  for (const f of ["app/admin/recherches/actions.ts", "app/admin/settings/modeles/actions.ts", "components/admin/PropertyEditForm.tsx", "components/admin/SearchForm.tsx"]) {
    const src = read(f);
    assert.ok(/isContentCode/.test(src) && /autoFix(Text|Html)/.test(src), f);
    assert.ok(!/chk_blocked"\)/.test(src) && !/"chk_template_blocked"/.test(src), `${f} : ancien message de blocage`);
  }
  const form = read("components/admin/PropertyEditForm.tsx");
  assert.ok(/WritingFixPanel/.test(form) && /applyAllContent/.test(form) && /save\(next, ld\)/.test(form));
});

// --- 2. Cout et credit ------------------------------------------------------------
await check("2a. cout a partir des jetons (2 $ lus, 10 $ ecrits par million), tarif en un seul endroit", () => {
  assert.equal(CLAUDE_MODEL, "claude-sonnet-5-5");
  assert.equal(CLAUDE_PRICE.inputUsdPerMTok, 2);
  assert.equal(CLAUDE_PRICE.outputUsdPerMTok, 10);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(CLAUDE_PRICE.asOf));
  assert.equal(claudeCostUsd(1_000_000, 0), 2);
  assert.equal(claudeCostUsd(0, 1_000_000), 10);
  assert.ok(Math.abs(claudeCostUsd(1234, 5678) - 0.059248) < 1e-12);
  assert.ok(Math.abs((usdToEur(1.08, 1.08) ?? 0) - 1) < 1e-12);
  assert.equal(usdToEur(1, null), null);
  // Annonce courante (3 000 caracteres) : quelques centimes.
  const est = estimateTranslationUsd(["Maison familiale", "x".repeat(3000), "Accroche"]);
  assert.ok(est > 0.01 && est < 0.06, String(est));
  assert.equal(estimateTranslationUsd(["", "", ""]), 0);
  // Les prix ne sont ecrits nulle part ailleurs.
  const files = walk("lib").concat(walk("app"), walk("components")).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith("lib/claude/pricing.ts"));
  for (const f of files) assert.ok(!/(?:inputUsdPerMTok|outputUsdPerMTok)\s*:/.test(read(f)), f);
});

await check("2b. credit restant estime et totaux (jour, mois, nombre de traductions)", () => {
  assert.equal(remainingCreditUsd(10, 2.5), 7.5);
  assert.equal(remainingCreditUsd(null, 1), null);
  const now = new Date("2026-11-16T15:00:00Z");
  const rows = [
    { created_at: "2026-11-16T14:00:00Z", cost_usd: 0.01, request_id: "a" },
    { created_at: "2026-11-16T14:00:01Z", cost_usd: 0.012, request_id: "a" },
    { created_at: "2026-11-10T09:00:00Z", cost_usd: 0.02, request_id: "b" },
    { created_at: "2026-11-01T08:00:00Z", cost_usd: 0.03, request_id: "c" },
    { created_at: "2026-10-31T23:30:00Z", cost_usd: 0.5, request_id: "d" }, // 1er novembre 00:30 a Luxembourg (UTC+1)
    { created_at: "2026-10-20T10:00:00Z", cost_usd: 1, request_id: "e" },
  ];
  const s = summarize(rows, { amountUsd: 20, loadedOn: "2026-11-01" }, now, 1.1);
  assert.ok(Math.abs(s.todayUsd - 0.022) < 1e-9, String(s.todayUsd));
  assert.ok(Math.abs(s.monthUsd - 0.572) < 1e-9, String(s.monthUsd));
  assert.equal(s.monthCount, 4);
  assert.ok(s.last && Math.abs(s.last.usd - 0.022) < 1e-9);
  assert.ok(Math.abs((s.remainingUsd ?? 0) - (20 - 0.572)) < 1e-9, String(s.remainingUsd));
});

// --- 3. Appel a l'API Claude --------------------------------------------------------
type Call = { url: string; init: RequestInit };
function fakeFetch(reply: (body: Record<string, unknown>) => { status: number; json: unknown }) {
  const calls: Call[] = [];
  const fetcher = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = reply(JSON.parse(String(init.body)));
    return new Response(JSON.stringify(r.json), { status: r.status, headers: { "content-type": "application/json" } });
  };
  return { calls, fetcher };
}
const SOURCE = { title: "Maison à Grass", description: "<p>Jardin sans vis-à-vis.</p><p>- Cave<br>- Garage</p>", short: "Belle maison." };

await check("3a. cle absente : aucun appel, code no_key ; l'action propose Mistral", async () => {
  const { calls, fetcher } = fakeFetch(() => ({ status: 200, json: {} }));
  const r = await callClaude({ system: "s", user: "u", maxTokens: 10 }, { apiKey: "", fetcher });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.code, "no_key");
  const out = await translateListing(SOURCE, { apiKey: null, fetcher });
  assert.ok(out.every((o) => !o.call.ok && o.call.code === "no_key"));
  assert.equal(calls.length, 0);
  const action = read("app/admin/properties/claude-actions.ts");
  assert.ok(/if \(!apiKey\.trim\(\)\) return \{ ok: false, error: t\("err_no_key"\), code: "no_key", offerMistral: true \}/.test(action));
});

await check("3b. credit epuise : code credit, message clair, Mistral propose", async () => {
  const { fetcher } = fakeFetch(() => ({ status: 400, json: { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } } }));
  const r = await callClaude({ system: "s", user: "u", maxTokens: 10 }, { apiKey: "k", fetcher });
  assert.equal(!r.ok && r.code, "credit");
  const fr = JSON.parse(read("messages/fr.json")).admin_claude;
  assert.ok(/épuisé/.test(fr.err_credit) && fr.use_mistral === "Traduire avec Mistral (gratuit)");
  const btn = read("components/admin/ClaudeTranslateButton.tsx");
  assert.ok(/msg\.mistral &&/.test(btn) && /onClick=\{onMistral\}/.test(btn));
});

await check("3c. requete : en-tetes fixes seulement, modele unique, pas de temperature, prompt sans nom", async () => {
  const translated = { title: "House in Grass — rare", description: "<p>Garden not overlooked!</p><p>- Cellar<br>- Garage</p>", short: "Fine house." };
  const { calls, fetcher } = fakeFetch(() => ({ status: 200, json: { content: [{ type: "text", text: JSON.stringify(translated) }], stop_reason: "end_turn", usage: { input_tokens: 1200, output_tokens: 300 } } }));
  const out = await translateListing(SOURCE, { apiKey: "sk-test", fetcher });
  assert.equal(calls.length, 2);
  for (const c of calls) {
    assert.equal(c.url, CLAUDE_ENDPOINT);
    assert.equal(c.url, "https://api.anthropic.com/v1/messages");
    const h = c.init.headers as Record<string, string>;
    assert.deepEqual(Object.keys(h).sort(), ["anthropic-version", "content-type", "x-api-key"]);
    assert.equal(h["x-api-key"], "sk-test");
    const body = JSON.parse(String(c.init.body));
    assert.equal(body.model, "claude-sonnet-5-5");
    assert.ok(!("temperature" in body) && !("thinking" in body));
    const all = `${body.system} ${JSON.stringify(body.messages)}`;
    assert.ok(!/MAPA|Julien|Brebion|@|mapaproperty/i.test(all), "nom ou adresse dans le prompt");
  }
  // Resultat corrige par l'etape 1 (tiret long, exclamation).
  for (const o of out) {
    assert.ok(o.call.ok && o.translation);
    assert.equal(o.translation?.title, "House in Grass, rare");
    assert.equal(o.translation?.description, "<p>Garden not overlooked.</p><p>- Cellar<br>- Garage</p>");
    assert.deepEqual(o.call.usage, { inputTokens: 1200, outputTokens: 300 });
  }
});

await check("3d. consigne : regles de redaction, termes du Luxembourg, memes lignes et listes", () => {
  const en = translationSystem("en");
  const de = translationSystem("de");
  assert.ok(en.includes('"weighted area"') && de.includes('"gewichtete Fläche"'));
  assert.ok(en.includes("No em dash") && en.includes("same line breaks") && en.includes("Keep every number"));
  assert.ok(/calque/.test(en));
  assert.ok(!/[–—]/.test(en + de));
});

await check("3e. aucun appel Claude sans clic : seule l'action du bouton appelle l'API", () => {
  const files = walk("app").concat(walk("lib"), walk("components")).filter((f) => /\.(ts|tsx)$/.test(f));
  const endpoint = files.filter((f) => read(f).includes("api.anthropic.com"));
  assert.deepEqual(endpoint, ["lib/claude/translate-listing.ts"]);
  const users = files.filter((f) => /\btranslateListing\(/.test(read(f)) && f !== "lib/claude/translate-listing.ts");
  assert.deepEqual(users, ["app/admin/properties/claude-actions.ts"]);
  const callers = files.filter((f) => /\btranslateWithClaude\(/.test(read(f)) && f !== "app/admin/properties/claude-actions.ts");
  assert.deepEqual(callers, ["components/admin/ClaudeTranslateButton.tsx"]);
  const btn = read("components/admin/ClaudeTranslateButton.tsx");
  // L'appel part de run(), lance par onClick ou par l'evenement du bouton du resume d'import.
  assert.ok(/onClick=\{\(\) => void run\(\)\}/.test(btn));
  assert.ok(!/useEffect\(\(\) => \{\s*void run\(\)/.test(btn));
  // Le bouton du resume d'import amene seulement le bouton a l'ecran (cout estime visible).
  const handler = btn.slice(btn.indexOf("const handler = () => {"), btn.indexOf("window.addEventListener(CLAUDE_TRANSLATE_EVENT"));
  assert.ok(handler.includes("focus(") && !/run\(/.test(handler), handler);
  const banner = read("components/admin/ImportSummaryBanner.tsx");
  assert.ok(/onClick=\{\(\) => window\.dispatchEvent\(new Event\(CLAUDE_TRANSLATE_EVENT\)\)\}/.test(banner));
  // Import et enregistrement : jamais Claude.
  for (const f of ["app/admin/properties/import-actions.ts", "app/admin/properties/actions.ts", "app/admin/properties/translate-actions.ts", "lib/translate.ts"]) {
    assert.ok(!/claude/i.test(read(f).replace(/\/\/.*$/gm, "")), f);
  }
  // Confirmation AVANT l'appel si des champs sont remplis.
  assert.ok(btn.indexOf("window.confirm") < btn.indexOf("await translateWithClaude"));
});

await check("3f. taux BCE euro/dollar lu dans la reponse, sinon dollars", () => {
  const data = { dataSets: [{ series: { "0:0:0:0:0": { observations: { "0": [1.0832] } } } }] };
  assert.equal(parseEcbRate(data), 1.0832);
  assert.equal(parseEcbRate({}), null);
  assert.equal(parseEcbRate({ dataSets: [{ series: { a: { observations: { "0": [42] } } } }] }), null);
});

// --- 4. Import : colonnes obligatoires -------------------------------------------------
await check("4a. type, transaction ou pays non reconnu : choix demande, aucun enregistrement tente", () => {
  assert.deepEqual(missingRequired({ property_type: null, transaction: "vente", country: "LU" }), ["property_type"]);
  assert.deepEqual(missingRequired({ property_type: "villa", transaction: null, country: null }), ["transaction", "country"]);
  assert.deepEqual(missingRequired({ property_type: "villa", transaction: "inconnu", country: "LU" }), ["transaction"]);
  assert.deepEqual(missingRequired({ property_type: "villa", transaction: "location", country: "FR" }), []);
  const src = read("app/admin/properties/import-actions.ts");
  const need = src.indexOf("if (needs.length) return");
  assert.ok(need > 0 && need < src.indexOf('.from("properties").insert') && need < src.indexOf("translateBatch(source"), "le choix doit preceder traduction et enregistrement");
  assert.ok(!/transaction: "sale" \}/.test(src) && !/country: "LU" \}/.test(src), "valeur par defaut encore enregistree");
  assert.ok(!/claude/i.test(src.replace(/\/\/.*$/gm, "")));
  const ui = read("components/admin/ListingImporter.tsx");
  assert.ok(/import_choose_type/.test(ui) && /IMPORT_TYPES/.test(ui) && /choices \}\)/.test(ui));
});

// --- 5. Textes de l'ecran -----------------------------------------------------------------
await check("5. textes fr, en, de presents, sans tiret long ni moyen", () => {
  const keys: Record<string, string[]> = {
    admin_claude: ["button", "estimate", "confirm_overwrite", "done", "use_mistral", "err_no_key", "err_credit", "not_ready", "panel_title", "stat_remaining", "credit_amount", "line_remaining", "console_link"],
    admin_listing: ["fix_count", "fix_before", "fix_after", "content_title", "content_item", "content_apply", "content_apply_all", "chk_blocked_content", "chk_blocked_content_screen", "chk_template_blocked_content", "chk_live_autofix"],
    admin_properties: ["import_choose_type", "import_choose_required", "import_choose_then", "import_need_choices"],
  };
  for (const lang of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${lang}.json`));
    for (const [ns, list] of Object.entries(keys)) {
      for (const k of list) {
        assert.ok(typeof m[ns]?.[k] === "string", `${lang}.${ns}.${k}`);
        assert.ok(!/[–—]/.test(m[ns][k]), `${lang}.${ns}.${k} : tiret`);
      }
    }
    for (const v of Object.values(m.admin_claude as Record<string, string>)) assert.ok(!/[–—]/.test(v));
  }
  assert.equal(JSON.parse(read("messages/fr.json")).admin_claude.button, "Traduire maintenant avec Claude API");
});

await check("6. SQL 40 : tables, RLS admin, rejouable, tableau de controle ; le code tolere son absence", () => {
  const sql = read("supabase/sql/40_consommation_claude.sql");
  assert.ok(/CREATE TABLE IF NOT EXISTS public\.claude_usage/.test(sql) && /CREATE TABLE IF NOT EXISTS public\.claude_credit/.test(sql));
  for (const col of ["input_tokens", "output_tokens", "cost_usd", "cost_eur", "property_id", "model", "usage", "created_at", "amount_usd", "loaded_on"]) assert.ok(sql.includes(col), col);
  assert.ok(/ENABLE ROW LEVEL SECURITY/.test(sql) && /is_mapa_admin\(\)/.test(sql) && /DROP POLICY IF EXISTS/.test(sql));
  assert.ok(/CONTROLE \(seul tableau affiche\)/.test(sql));
  const usage = read("lib/claude/usage.ts");
  assert.ok(/42P01/.test(usage) && /PGRST205/.test(usage) && /EMPTY_SUMMARY/.test(usage));
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(root, dir))) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
