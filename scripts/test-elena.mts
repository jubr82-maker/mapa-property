// Elena sans aucune liberte (nov. 2026, partie E4), sans reseau.
// 30 questions reelles reformulees (FR, EN, DE). Pour chacune, la reponse
// doit etre EXACTEMENT :
//  - le texte d'une entree de lib/elena/elena-qa.json (langue du visiteur),
//  - ou le texte d'un modele de recherche ({lieu} remplace) avec des biens,
//  - ou une phrase figee d'un sujet verrouille (lib/chatbot/locked-topics.ts,
//    prioritaire et inchange, construite depuis les sources du site),
// jamais un texte invente. Mistral est remplace par un double de test : il
// ne peut que renvoyer un identifiant (valide, inconnu ou invalide), comme
// le vrai (lib/elena/recognize.ts, validRecognizedId).
// Lancement : node --import tsx scripts/test-elena.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FILE_ENTRIES, type ElenaEntry } from "../lib/elena/qa";
import { elenaRespond, type ElenaProperty } from "../lib/elena/respond";
import { validRecognizedId, recognitionList } from "../lib/elena/recognize";
import { getLockedTopicsReply } from "../lib/chatbot/locked-topics";
import { normText } from "../lib/search/parse-query";
import { ELENA_BUTTON_PATHS } from "../lib/elena/button-paths";

const root = join(import.meta.dirname, "..");
let pass = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn();
  pass++;
  console.log(`PASS ${name}`);
};

const props: ElenaProperty[] = [
  { id: "a", slug: "maison-steinfort-1", country: "Luxembourg", city: "Steinfort", transaction: "sale", property_type: "maison-individuelle", price: 850000, bedrooms: 3, surface: 140, title_fr: "Maison à Steinfort", cover_url: null },
  { id: "b", slug: "appart-strassen-2", country: "Luxembourg", city: "Strassen", transaction: "rent", property_type: "appartement", price: 2100, bedrooms: 2, surface: 80, title_fr: "Appartement à Strassen", cover_url: null },
  { id: "c", slug: "appart-belair-3", country: "Luxembourg", city: "Belair", transaction: "sale", property_type: "appartement", price: 990000, bedrooms: 2, surface: 95, title_fr: "Appartement à Belair", cover_url: null },
];

// Double de Mistral : recouvrement de mots avec les questions et autres
// formulations ; renvoie un identifiant ou null (jamais de texte).
function fakeRecognize(text: string, entries: ElenaEntry[]): Promise<string | null> {
  const common = new Set(["quelle", "quel", "quels", "vous", "votre", "vos", "avez", "pour", "comment", "what", "your", "have", "with", "does", "haben", "sie", "ihre", "eine", "einen", "wie"]);
  const words = (s: string) => new Set(normText(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !common.has(w)));
  const t = words(text);
  let best: { id: string; score: number } | null = null;
  for (const e of entries.filter((x) => !x.isTemplate)) {
    const ref = words([e.question.fr, e.question.en, e.question.de, ...e.variants].join(" "));
    let score = 0;
    for (const w of t) if (ref.has(w)) score++;
    if (score > 0 && (!best || score > best.score)) best = { id: e.id, score };
  }
  return Promise.resolve(best?.id ?? null);
}

const deps = (recognize = fakeRecognize) => ({
  entries: FILE_ENTRIES,
  properties: props,
  recognize,
  locked: getLockedTopicsReply,
  priceLabel: (p: ElenaProperty) => String(p.price ?? ""),
});

const QUESTIONS: [string, "fr" | "en" | "de"][] = [
  ["vous prenez combien pour vendre", "fr"],
  ["c'est quoi le bellegen akt", "fr"],
  ["je cherche une maison à Steinfort", "fr"],
  ["vous êtes ouverts le samedi", "fr"],
  ["quelle météo demain", "fr"],
  ["asdfgh", "fr"],
  ["je voudrais connaître la valeur de ma maison", "fr"],
  ["appartement à louer à Strassen", "fr"],
  ["proposez-vous la gestion de mon bien", "fr"],
  ["comment voir les biens confidentiels", "fr"],
  ["how much do you charge to sell", "en"],
  ["what is the bellegen akt", "en"],
  ["I am looking for a house in Steinfort", "en"],
  ["are you open on Saturday", "en"],
  ["what's the weather tomorrow", "en"],
  ["asdfgh", "en"],
  ["can you value my flat", "en"],
  ["flat to rent in Strassen", "en"],
  ["do you offer property management", "en"],
  ["flat Kirchberg 2 bedrooms", "en"],
  ["wie viel nehmen Sie für den Verkauf, Ihre Provision", "de"],
  ["was ist der Bëllegen Akt", "de"],
  ["ich suche ein Haus in Steinfort", "de"],
  ["haben Sie samstags geöffnet", "de"],
  ["wie wird das Wetter morgen", "de"],
  ["asdfgh", "de"],
  ["können Sie meine Wohnung bewerten", "de"],
  ["Wohnung mieten in Strassen", "de"],
  ["Haus mieten Bertrange", "de"],
  ["Appartement de luxe à Belair", "fr"],
];

const templates = FILE_ENTRIES.filter((e) => e.isTemplate);
function allowed(reply: string, text: string, l: "fr" | "en" | "de", engine: string): boolean {
  if (engine === "locked") return reply === getLockedTopicsReply(text, l);
  if (FILE_ENTRIES.some((e) => !e.isTemplate && e.answer[l] === reply)) return engine !== "search";
  return templates.some((e) => new RegExp(`^${e.answer[l].replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("\\{lieu\\}", ".+")}$`).test(reply)) && engine === "search";
}

await test("fichier valide : 106 entrees, trois langues, aucun tiret long", () => {
  assert.equal(FILE_ENTRIES.length, 106);
  for (const e of FILE_ENTRIES) for (const l of ["fr", "en", "de"] as const) assert.ok(e.answer[l] && !/[–—]/.test(e.answer[l]), `${e.id} ${l}`);
});

for (const [q, l] of QUESTIONS) {
  await test(`[${l}] ${q}`, async () => {
    const r = await elenaRespond(q, l, deps());
    assert.ok(allowed(r.reply, q, l, r.engine), `${r.engine} : ${r.reply}`);
    if (r.button) assert.ok(r.button.href.startsWith(`/${l}/`) || r.button.href === `/${l}`, r.button.href);
    for (const c of r.properties ?? []) assert.ok(c.href.startsWith(`/${l}/`) && !/^\/\//.test(c.href));
  });
}

await test("cas attendus : verrou, recherche, entree, defaut", async () => {
  assert.equal((await elenaRespond("c'est quoi le bellegen akt", "fr", deps())).engine, "locked");
  const s = await elenaRespond("je cherche une maison à Steinfort", "fr", deps());
  assert.equal(s.engine, "search");
  assert.deepEqual(s.properties?.map((p) => p.id), ["a"]);
  assert.equal(s.reply, FILE_ENTRIES.find((e) => e.id === "E098")?.answer.fr);
  assert.equal((await elenaRespond("quelle météo demain", "fr", deps())).entryId, "E094");
  const d = await elenaRespond("asdfgh", "fr", deps());
  assert.equal(d.entryId, "E095");
  assert.equal(d.offerContact, true);
  const near = await elenaRespond("maison à Kleinbettingen", "fr", deps());
  assert.equal(near.reply, "Aucun bien disponible à Kleinbettingen pour le moment. Voici les biens les plus proches. Vous pouvez aussi nous confier votre recherche.");
  const country = await elenaRespond("appartement", "fr", deps());
  assert.equal(country.entryId, "E101");
});

await test("Mistral : identifiant inconnu, modele ou reponse invalide = entree par defaut", async () => {
  for (const bad of ["E999", "E098", "E1", "", "<script>"]) {
    const r = await elenaRespond("une question imprevue", "fr", deps(() => Promise.resolve(validRecognizedId({ id: bad }, FILE_ENTRIES))));
    assert.equal(r.entryId, "E095", bad);
  }
  const down = await elenaRespond("une question imprevue", "en", deps(() => Promise.reject(new Error("indisponible"))));
  assert.equal(down.reply, FILE_ENTRIES.find((e) => e.id === "E095")?.answer.en);
  assert.equal(validRecognizedId("E013", FILE_ENTRIES), null, "pas un objet JSON");
  assert.equal(validRecognizedId({ id: "E013" }, FILE_ENTRIES), "E013");
  assert.ok(!recognitionList(FILE_ENTRIES).includes("E098"), "modeles jamais proposes au modele");
});

await test("hors sujet : entree prevue meme sans Mistral, un seul Nous contacter", async () => {
  const none = deps(() => Promise.resolve(null));
  for (const [q, l] of [["quelle météo demain", "fr"], ["what's the weather tomorrow", "en"], ["wie wird das Wetter morgen", "de"], ["une recette de cuisine ?", "fr"], ["quelle météo vendredi ?", "fr"], ["combien de buts au match de foot ?", "fr"], ["une recette de cuisine pour mes parents", "fr"]] as const) {
    const r = await elenaRespond(q, l, none);
    assert.equal(r.entryId, "E094", q);
    assert.equal(r.reply, FILE_ENTRIES.find((e) => e.id === "E094")?.answer[l]);
  }
  assert.equal((await elenaRespond("météo du marché immobilier", "fr", none)).entryId, "E095", "question immobiliere jamais hors sujet");
  const panel = readFileSync(join(root, "components/chatbot/ChatbotPanel.tsx"), "utf8");
  assert.ok(panel.includes("m.offerContact && !m.button"), "proposition de contact seulement sans bouton de l'entree");
});

// Conditions du vrai serveur (13/11/2026) : entrees lues dans la table faqs,
// ou la ligne E094 a ete inseree par l'ancienne version du SQL 37 (5
// formulations, SQL 38 pas encore execute), et Mistral ne reconnait rien.
await test("hors sujet avec la base aux anciennes formulations : E094, aucun bouton de contact en double", async () => {
  const OLD_E094_VARIANTS = ["météo", "recette", "sport", "politique", "blague"];
  const tableEntries: ElenaEntry[] = FILE_ENTRIES.map((e) => (e.id === "E094" ? { ...e, id: "row-94", variants: OLD_E094_VARIANTS } : { ...e, id: `row-${e.id}` }));
  const tableDeps = { ...deps(() => Promise.resolve(null)), entries: tableEntries };
  const e094 = FILE_ENTRIES.find((e) => e.id === "E094");
  for (const q of ["quelle météo vendredi ?", "qui a gagné le match de foot ?", "raconte une blague"]) {
    const r = await elenaRespond(q, "fr", tableDeps);
    assert.equal(r.reply, e094?.answer.fr, q);
    assert.equal(r.offerContact, false, q);
    assert.equal(r.button, null, q);
  }
  // Question imprevue : un seul bouton de contact au plus (bouton de l'entree,
  // la proposition de contact n'est affichee que sans bouton).
  const d = await elenaRespond("une question imprevue", "fr", tableDeps);
  const shown = (d.button ? 1 : 0) + (d.offerContact && !d.button ? 1 : 0);
  assert.ok(shown <= 1, `${shown} boutons de contact`);
  // La reponse et le bouton restent ceux de la base (modifiables dans l'admin).
  const edited = tableEntries.map((e) => (e.id === "row-94" ? { ...e, answer: { ...e.answer, fr: "Texte modifie dans l'admin." } } : e));
  assert.equal((await elenaRespond("qui a gagné le match de foot ?", "fr", { ...tableDeps, entries: edited })).reply, "Texte modifie dans l'admin.");
});

await test("boutons : uniquement des chemins internes de la liste fermee", () => {
  for (const e of FILE_ENTRIES) if (e.button) assert.ok((ELENA_BUTTON_PATHS as readonly string[]).includes(e.button.path), `${e.id} ${e.button.path}`);
});

await test("route : aucune redaction par le modele, temperature 0, JSON strict", () => {
  const route = readFileSync(join(root, "app/api/chatbot/route.ts"), "utf8");
  const mistral = readFileSync(join(root, "lib/mistral.ts"), "utf8");
  assert.ok(!/buildSystemPrompt|callMistral|parseAssistantReply|fallbackReply/.test(route));
  assert.ok(/elenaRespond/.test(route) && /recognizeEntry/.test(route));
  assert.ok(/temperature: 0/.test(mistral) && /json_object/.test(mistral) && /MISTRAL_MODEL = "ministral-3b-2512"/.test(mistral));
});

await test("SQL 37 : colonnes, 106 entrees sans doublon, controle final", () => {
  const sql = readFileSync(join(root, "supabase/sql/37_elena_reponses.sql"), "utf8");
  for (const c of ["variants_fr text[]", "button_path text", "button_label_fr text", "button_label_en text", "button_label_de text", "source text", "is_template boolean NOT NULL DEFAULT false"]) assert.ok(sql.includes(c), c);
  assert.equal((sql.match(/^INSERT INTO public\.faqs/gm) ?? []).length, 106);
  assert.equal((sql.match(/WHERE NOT EXISTS \(SELECT 1 FROM public\.faqs WHERE page_key = 'elena' AND question_fr = /g) ?? []).length, 106);
  assert.ok(/count\(\*\) AS lignes_elena/.test(sql));
  assert.ok(!/\b(GRANT|REVOKE|POLICY|ROW LEVEL)\b/.test(sql.replace(/^--.*$/gm, "")));
  // Chaque reponse du fichier, mot pour mot, dans le SQL.
  for (const e of FILE_ENTRIES) for (const l of ["fr", "en", "de"] as const) assert.ok(sql.includes(`'${e.answer[l].replace(/'/g, "''")}'`), `${e.id} ${l}`);
});

console.log(`${pass} PASS, 0 FAIL`);
