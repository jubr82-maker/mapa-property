// Dernier recours de la recherche (nov. 2026) : SEULEMENT si l'analyseur
// n'a rien reconnu d'utile. Mistral (meme modele, meme cle que le chatbot,
// temperature 0, JSON strict) propose des valeurs ; CHACUNE est revérifiée
// contre le referentiel par l'analyseur lui-meme (lieux, types) ou bornee
// (nombres) : jamais inventee. Sans reponse de Mistral : on continue sans lui.
import { mistralJson } from "@/lib/mistral";
import { KNOWN_TYPES, parseQuery, type ParsedQuery } from "./parse-query";
import type { Place } from "./places";

const SYSTEM = `Tu extrais les criteres d'une recherche immobiliere (francais, anglais ou allemand).
Reponds UNIQUEMENT par un objet JSON avec ces cles, null si absent, sans rien inventer :
{"place": string|null, "type": string|null, "transaction": "sale"|"rent"|null, "budget_max": number|null, "bedrooms_min": number|null, "surface_min": number|null}
"place" = un nom de ville, de quartier ou de pays tel qu'ecrit par l'utilisateur. "luxe" n'est jamais un lieu.
"type" = un seul mot parmi : appartement, maison, villa, terrain, bureau, commerce, studio, penthouse, duplex, immeuble.`;

const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null);

export async function mistralFallback(text: string, extraPlaces?: Map<string, Place[]>): Promise<ParsedQuery | null> {
  const r = await mistralJson([
    { role: "system", content: SYSTEM },
    { role: "user", content: text.slice(0, 300) },
  ]);
  if (!r) return null;
  // Lieu et type : relus par l'analyseur (referentiel), jamais pris tels quels.
  const place = typeof r.place === "string" ? parseQuery(r.place, extraPlaces).places : [];
  const typeWord = typeof r.type === "string" ? parseQuery(r.type).types.filter((t) => KNOWN_TYPES.has(t)) : [];
  // Nombres : seulement si le texte en contient (jamais un budget invente).
  const hasNumber = /\d|million|mille|thousand|tausend|hundert|cent/i.test(text);
  const out: ParsedQuery = {
    places: place,
    near: false,
    zones: [],
    types: typeWord,
    transaction: r.transaction === "sale" || r.transaction === "rent" ? r.transaction : null,
    offmarket: false,
    budgetMin: null,
    budgetMax: hasNumber ? num(r.budget_max, 100, 100_000_000) : null,
    bedroomsMin: hasNumber ? num(r.bedrooms_min, 1, 20) : null,
    surfaceMin: hasNumber ? num(r.surface_min, 5, 100_000) : null,
    amenities: [],
    luxury: false,
    understood: false,
  };
  out.understood = out.places.length > 0 || out.types.length > 0 || out.transaction !== null || out.budgetMax !== null || out.bedroomsMin !== null || out.surfaceMin !== null;
  return out.understood ? out : null;
}
