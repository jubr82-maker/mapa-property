// Reponse d'Elena (nov. 2026) : l'IA ne redige PLUS JAMAIS de reponse.
// Ordre :
//  1. sujets verrouilles (lib/chatbot/locked-topics.ts), prioritaires et
//     inchanges : phrases figees construites depuis les sources du site ;
//  2. recherche de biens : analyseur et regles de la recherche du site
//     (lib/search/parse-query.ts, lib/search/engine.ts), texte EXACT du
//     modele correspondant (biens trouves, aucun bien sur place avec biens
//     proches, aucun bien, aucun pays indique, bien sous compromis, bien
//     vendu ou loue), {lieu} remplace par le lieu reconnu ;
//  3. reconnaissance de l'entree (Mistral, identifiant seulement) : texte
//     EXACT de l'entree, dans la langue du visiteur, avec son bouton ;
//  4. rien ne correspond : entree "Question dont la reponse n'est pas dans
//     la base", puis la proposition de prise de contact existante.
// Boutons : chemins internes de la liste fermee, prefixes par la langue.
import { parseQuery, normText, type ParsedQuery } from "@/lib/search/parse-query";
import { criteriaFromParsed, runSearch, type SearchableProperty } from "@/lib/search/engine";
import { foreignCityPlaces, placeLabel } from "@/lib/search/places";
import { paramsFromParsed } from "@/lib/search/url";
import { bannerOf, isClosed } from "@/lib/property-banner";
import { familyOf } from "@/lib/listing/families";
import { localizedButtonHref } from "./button-paths";
import { defaultEntry, offTopicEntry, templateEntry, type ElenaEntry, type ElenaLang, type TemplateKind } from "./qa";

export interface ElenaCard {
  id: string;
  title: string;
  place: string;
  price: string;
  href: string;
  cover: string | null;
  banner: string | null;
}

export interface ElenaReply {
  reply: string;
  button: { href: string; label: string } | null;
  properties: ElenaCard[] | null;
  entryId: string | null;
  engine: "locked" | "search" | "qa" | "default";
  /** Proposition de prise de contact (entree par defaut). */
  offerContact: boolean;
}

export type ElenaProperty = SearchableProperty & {
  slug?: string | null;
  title_en?: string | null;
  title_de?: string | null;
  cover_url?: string | null;
  paths?: Record<string, string>;
  status_banner?: string | null;
  banner_position?: string | null;
  banner_color?: string | null;
};

export interface ElenaDeps<P extends ElenaProperty> {
  entries: ElenaEntry[];
  properties: P[];
  recognize: (text: string, entries: ElenaEntry[]) => Promise<string | null>;
  locked: (text: string, locale: string) => string | null;
  /** Prix affiche d'un bien (Vendu, Loue, loyer par mois) : textes du site. */
  priceLabel: (p: P) => string;
}

const MAX_CARDS = 6;

// Demandes qui citent un bien ou un lieu sans etre une recherche (vendre,
// estimer, honoraires, agence, horaires...) : jamais traitees en recherche.
const NOT_A_SEARCH =
  /(estim|evalu|valeur|vaut |vaut\?|worth|\bvalue\b|valuation|bewert|wert meine|vendre (mon|ma|mes|notre)|sell (my|our)|selling (my|our)|verkaufen|mettre en location|louer (mon|ma|mes|notre)|let (my|our)|vermieten (meine|mein|unser)|mandat|mandate|auftrag|honorair|commission|frais|fees|kosten|agence|agency|agentur|vos bureaux|your office|ihr buro|horaire|ouvert|opening|open on|geoffnet|offnungszeit|adresse de l|address|telephone|phone|contact|rendez-vous|appointment|termin)/;

/** La demande est-elle une recherche de biens ? */
export function isPropertySearch(text: string, q: ParsedQuery): boolean {
  if (!q.understood || q.offmarket) return false;
  if (NOT_A_SEARCH.test(normText(text))) return false;
  const realPlace = q.places.some((p) => p.kind !== "lu-country") || q.zones.length > 0;
  const criteria = q.types.length > 0 || q.budgetMax !== null || q.budgetMin !== null || q.bedroomsMin !== null || q.surfaceMin !== null || q.amenities.length > 0;
  return realPlace || criteria;
}

function lang(locale: string): ElenaLang {
  return locale === "en" || locale === "de" ? locale : "fr";
}

function buttonOf(entry: ElenaEntry, locale: string, searchQuery?: string): ElenaReply["button"] {
  if (!entry.button) return null;
  const href = localizedButtonHref(entry.button.path, locale);
  if (!href) return null;
  // Bouton "Voir les biens" d'une recherche : la liste avec les memes filtres.
  const withQuery = entry.button.path === "/biens" && searchQuery ? `${href}?${searchQuery}` : href;
  return { href: withQuery, label: entry.button.label[lang(locale)] };
}

function cardsOf<P extends ElenaProperty>(list: P[], locale: string, deps: ElenaDeps<P>): ElenaCard[] {
  const l = lang(locale);
  return list.slice(0, MAX_CARDS).map((p) => ({
    id: p.id,
    title: (l === "en" ? p.title_en : l === "de" ? p.title_de : p.title_fr) || p.title_fr || "",
    place: [p.city, p.country].filter(Boolean).join(", "),
    price: deps.priceLabel(p),
    href: `/${l}${p.paths?.[l] ?? `/biens/${p.slug ?? p.id}`}`,
    cover: p.cover_url ?? null,
    banner: bannerOf(p)?.kind ?? null,
  }));
}

function templateReply<P extends ElenaProperty>(kind: TemplateKind, deps: ElenaDeps<P>, locale: string, opts: { lieu?: string; cards: P[]; query: string }): ElenaReply {
  const entry = templateEntry(deps.entries, kind);
  const text = entry.answer[lang(locale)].replace(/\{lieu\}/g, opts.lieu ?? "");
  return { reply: text, button: buttonOf(entry, locale, opts.query), properties: opts.cards.length ? cardsOf(opts.cards, locale, deps) : null, entryId: entry.id, engine: "search", offerContact: false };
}

function searchReply<P extends ElenaProperty>(text: string, q: ParsedQuery, locale: string, deps: ElenaDeps<P>): ElenaReply {
  const outcome = runSearch(deps.properties, criteriaFromParsed(q, { text }));
  const query = paramsFromParsed(q, text).toString();
  const found = [...outcome.main, ...outcome.nearby];
  if (!found.length || outcome.relaxed.includes("all")) return templateReply("none", deps, locale, { cards: [], query });
  if (outcome.emptyPlace && outcome.nearby.length && !outcome.main.length) {
    return templateReply("nearby", deps, locale, { lieu: placeLabel(outcome.emptyPlace, locale), cards: outcome.nearby, query });
  }
  if (outcome.main.length === 1) {
    const only = outcome.main[0];
    const b = bannerOf(only);
    if (b?.kind === "under_compromise") return templateReply("underCompromise", deps, locale, { cards: [only], query });
    if (b && isClosed(only)) {
      const fam = familyOf(only.property_type);
      const similar = deps.properties.filter((p) => p.id !== only.id && !isClosed(p) && p.transaction === only.transaction && p.country === only.country && (!fam || familyOf(p.property_type) === fam));
      return templateReply("closed", deps, locale, { cards: [only, ...similar], query });
    }
  }
  if (outcome.askCountry) return templateReply("noCountry", deps, locale, { cards: outcome.main, query });
  return templateReply("found", deps, locale, { cards: found, query });
}

// Mots de l'immobilier : une question qui en contient n'est jamais hors sujet.
const REAL_ESTATE = /(bien|maison|appart|immo|vend|achat|achet|lou|loyer|location|mandat|estim|agence|notaire|credit|pret|terrain|bureau|property|house|flat|apartment|rent|sell|buy|mortgage|agency|immobil|haus|wohnung|miete|kauf|verkauf|makler|grundst)/;

/** Question sans rapport avec l'immobilier : une formulation de l'entree, en mot entier. */
export function isOffTopic(text: string, entry: ElenaEntry): boolean {
  const t = ` ${normText(text).replace(/[^a-z0-9]+/g, " ")} `;
  if (REAL_ESTATE.test(t)) return false;
  return entry.variants.some((v) => {
    const k = normText(v).replace(/[^a-z0-9]+/g, " ").trim();
    return k.length >= 4 && t.includes(` ${k} `);
  });
}

export async function elenaRespond<P extends ElenaProperty>(text: string, locale: string, deps: ElenaDeps<P>): Promise<ElenaReply> {
  const l = lang(locale);
  const locked = deps.locked(text, l);
  if (locked) return { reply: locked, button: null, properties: null, entryId: null, engine: "locked", offerContact: false };

  const q = parseQuery(text, foreignCityPlaces(deps.properties));
  if (isPropertySearch(text, q)) return searchReply(text, q, l, deps);

  // Hors sujet (nov. 2026) : une question sans rapport avec l'immobilier
  // (meteo, sport, recette...) recoit l'entree prevue, reconnue par ses
  // formulations, sans attendre Mistral.
  const off = offTopicEntry(deps.entries);
  if (isOffTopic(text, off)) return { reply: off.answer[l], button: buttonOf(off, l), properties: null, entryId: off.id, engine: "qa", offerContact: false };

  let id: string | null = null;
  try {
    id = await deps.recognize(text, deps.entries);
  } catch {
    id = null;
  }
  const entry = id ? deps.entries.find((e) => e.id === id && !e.isTemplate) : undefined;
  if (entry) return { reply: entry.answer[l], button: buttonOf(entry, l), properties: null, entryId: entry.id, engine: "qa", offerContact: false };

  const fallback = defaultEntry(deps.entries);
  return { reply: fallback.answer[l], button: buttonOf(fallback, l), properties: null, entryId: fallback.id, engine: "default", offerContact: true };
}
