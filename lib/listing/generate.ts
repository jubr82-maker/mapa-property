// Generation d'une annonce depuis son modele (oct. 2026). Module pur,
// utilise en direct dans la fiche admin, dans l'apercu de la page
// Parametres > Modeles d'annonces et dans les essais.
//
// Entrees : les colonnes du bien, ses donnees de modele (listing_data), le
// modele de la langue (titre, tronc commun, bloc de la famille) et le
// vocabulaire de la langue. Aucune valeur n'est inventee : un champ vide
// donne une valeur vide, et le segment [[...]] qui la contient disparait.
import { familyOf, fieldVisible, templateBlockOf, type ListingFamily, type TemplateBlock } from "@/lib/listing/families";
import type { LevelKind, ListingData, ListingLang, ListingLevel } from "@/lib/listing/listing-data";
import {
  agree,
  deAdjective,
  formatArea,
  formatDate,
  formatMoney,
  formatNumber,
  frDemonstrative,
  frQualifier,
  ordinal,
  parseTypeNoun,
  plural,
  type Gender,
  type TypeNoun,
} from "@/lib/listing/language";
import { renderTemplate, textToHtml, type TemplateFlags, type TemplateValues } from "@/lib/listing/template-engine";

/** Vocabulaire d'une langue (messages listing_model.vocab, lus en brut). */
export type ListingVocab = {
  types: Record<string, string>;
  det: { m: string; m_vowel: string; f: string; n: string };
  det_nom: { m: string; m_vowel: string; f: string; n: string };
  pronoun: { m: string; f: string; n: string };
  agree: Record<string, string>;
  formula: { sale_exclusive: string; sale: string; rent_exclusive: string; rent: string };
  diffusion: { sale: string; rent: string };
  title_tx: { sale: string; rent: string };
  count: Record<string, string>;
  level: Record<string, string>;
  floor: { ground: string; n: string };
  word: Record<string, string>;
  construction: Record<string, string>;
  orientation: Record<string, string>;
  heritage: Record<string, string>;
  servicing: Record<string, string>;
};

/** Modele d'une langue : titre, tronc commun et blocs par famille. */
export type ListingTemplates = { title: string; tronc: string; blocks: Partial<Record<TemplateBlock, string>> };

/** Colonnes du bien utilisees par le modele. */
export type ListingColumns = {
  property_type: string | null;
  transaction: string | null;
  mandate_type: string | null;
  city: string | null;
  year_built: number | null;
  surface: number | null;
  living_surface: number | null;
  usable_surface: number | null;
  land_surface: number | null;
  terrace_surface: number | null;
  balcony_surface: number | null;
  garden_surface: number | null;
  bedrooms: number | null;
  parking: number | null;
  has_pool: boolean;
  floor: string | null;
  price: number | null;
  price_on_demand: boolean;
  current_use: string | null;
};

export type GeneratedListing = { title: string; text: string; html: string };

const pos = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/** Etage d'un appartement depuis la colonne libre floor : 0, rdc ou un nombre. */
export function parseFloor(floor: string | null | undefined): number | null {
  const s = String(floor ?? "").trim().toLowerCase();
  if (!s) return null;
  if (/^(0|rdc|rez|rez-de-chauss[ée]e|eg|erdgeschoss|ground)/.test(s)) return 0;
  const m = /^(\d{1,3})/.exec(s);
  return m ? Number(m[1]) : null;
}

function levelHeading(level: ListingLevel, floorIndex: number, floorCount: number, vocab: ListingVocab, lang: ListingLang): string {
  if (level.kind === "floor") {
    return floorCount <= 1 ? vocab.level.floor_single : (vocab.level.floor_n ?? "").replace("{ordinal}", ordinal(floorIndex, lang));
  }
  return vocab.level[level.kind] ?? "";
}

/** Pieces : liste simple (un niveau) ou une section par niveau. */
export function roomsBlock(levels: ListingLevel[], lang: ListingLang, vocab: ListingVocab): string {
  const used = levels
    .map((lv) => ({ lv, rooms: lv.rooms.map((r) => r.text[lang].trim().replace(/^[-•*]\s*/, "")).filter(Boolean) }))
    .filter((x) => x.rooms.length > 0);
  if (!used.length) return "";
  const list = (rooms: string[]) => rooms.map((r) => `- ${r}`).join("\n");
  if (used.length === 1) return list(used[0].rooms);
  const floorCount = used.filter((x) => x.lv.kind === "floor").length;
  let floorIndex = 0;
  return used
    .map((x) => {
      if (x.lv.kind === "floor") floorIndex++;
      return `${levelHeading(x.lv, floorIndex, floorCount, vocab, lang)}\n${list(x.rooms)}`;
    })
    .join("\n\n");
}

function lines(text: string): string {
  return text
    .split(/\n+/)
    .map((l) => l.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join("\n");
}

function nounPhrase(type: TypeNoun, lang: ListingLang, qualifier: string, mode: "acc" | "nom" | "title" | "bare"): string {
  if (lang === "de") {
    // "bare" : sans article ni qualificatif ("freistehendes Haus").
    const m = mode === "acc" ? "weak_acc" : mode === "title" || mode === "bare" ? "strong_nom" : "weak_nom";
    const parts = [qualifier && mode !== "bare" ? deAdjective(qualifier, type.gender, m) : "", type.adj ? deAdjective(type.adj, type.gender, m) : "", type.noun];
    return parts.filter(Boolean).join(" ");
  }
  if (lang === "fr") {
    const q = qualifier && mode !== "bare" ? frQualifier(qualifier, type.gender, type.noun) : "";
    return [q, type.noun].filter(Boolean).join(" ");
  }
  const q = qualifier && mode !== "bare" ? qualifier.trim().toLocaleLowerCase("en") : "";
  return [q, type.noun].filter(Boolean).join(" ");
}

function demonstrative(type: TypeNoun, lang: ListingLang, phrase: string, forms: ListingVocab["det"]): string {
  if (lang === "fr") return frDemonstrative(type.gender, phrase.split(/\s+/)[0] ?? "", forms);
  return forms[type.gender];
}

/** Valeurs et drapeaux du modele pour une langue. */
export function listingValues(
  cols: ListingColumns,
  data: ListingData,
  lang: ListingLang,
  vocab: ListingVocab,
): { values: TemplateValues; flags: TemplateFlags; family: ListingFamily | null } {
  const family = familyOf(cols.property_type);
  const show = (field: string) => fieldVisible(field, family);
  const f = data.facts;
  const w = data.written[lang];
  const num = (n: number) => formatNumber(n, lang);
  const type = parseTypeNoun(vocab.types[cols.property_type ?? ""]);
  const g: Gender = type.gender;
  const rent = cols.transaction === "rent";
  const exclusive = cols.mandate_type === "exclusive";
  const qualifier = w.qualifier.trim();

  const withQualifier = nounPhrase(type, lang, qualifier, "acc");
  const bareNom = nounPhrase(type, lang, "", "nom");
  const titleNoun = nounPhrase(type, lang, qualifier, "title");

  const living = show("living_surface") ? (pos(cols.living_surface) ? cols.living_surface : null) : null;
  const bedrooms = show("bedrooms") && pos(cols.bedrooms) ? cols.bedrooms : null;
  const floorN = show("floor") ? parseFloor(cols.floor) : null;
  const land = show("land_surface") && pos(cols.land_surface) ? cols.land_surface : null;
  const indoor = pos(f.parking_indoor) ? f.parking_indoor : null;
  const outdoor = pos(f.parking_outdoor) ? f.parking_outdoor : null;
  const word = (k: string, on: boolean | undefined) => (on ? vocab.word[k] ?? "" : "");

  const values: TemplateValues = {
    // Accords et formules
    bien: type.noun ? nounPhrase(type, lang, "", "bare") : "",
    qualificatif: qualifier,
    ce_bien: type.noun ? `${demonstrative(type, lang, withQualifier, vocab.det)} ${withQualifier}` : "",
    ce_type: type.noun ? `${demonstrative(type, lang, bareNom, vocab.det_nom)} ${bareNom}` : "",
    titre_bien: type.noun ? titleNoun : "",
    il: type.noun ? vocab.pronoun[g] : "",
    situe: agree(vocab.agree.situe, g),
    construit: agree(vocab.agree.construit, g),
    renove: agree(vocab.agree.renove, g),
    formule: rent ? (exclusive ? vocab.formula.rent_exclusive : vocab.formula.rent) : exclusive ? vocab.formula.sale_exclusive : vocab.formula.sale,
    diffusion: rent ? vocab.diffusion.rent : vocab.diffusion.sale,
    a_vendre: rent ? vocab.title_tx.rent : vocab.title_tx.sale,
    commune: (cols.city ?? "").trim(),
    // Chiffres du tronc
    chambres: bedrooms ? plural(vocab.count.bedrooms, bedrooms, num) : "",
    chambres_titre: bedrooms ? plural(vocab.count.bedrooms_title, bedrooms, num) : "",
    annee_construction: show("year") && pos(cols.year_built) ? String(cols.year_built) : "",
    annee_renovation: show("year") && pos(f.renovation_year) ? String(f.renovation_year) : "",
    surface_habitable: living ? formatArea(living, lang) : "",
    // Rediges par Julien
    ambiance: w.ambiance.trim().replace(/[.\s]+$/, ""),
    histoire: family === "prestige" ? w.history.trim() : "",
    atouts: lines(w.highlights),
    pieces: roomsBlock(data.levels, lang, vocab),
    // Prestations communes
    cave: word("cellar", f.cellar),
    stationnement_interieur: indoor ? plural(vocab.count.parking_indoor, indoor, num) : "",
    stationnement_exterieur: outdoor ? plural(vocab.count.parking_outdoor, outdoor, num) : "",
    stationnement: !indoor && !outdoor && show("parking") && pos(cols.parking) ? plural(vocab.count.parking_any, cols.parking, num) : "",
    charges: pos(f.monthly_charges) ? formatMoney(f.monthly_charges, lang) : "",
    // Appartement et penthouse
    etage: floorN === null ? "" : floorN === 0 ? vocab.floor.ground : vocab.floor.n.replace("{ordinal}", ordinal(floorN, lang)),
    niveaux_immeuble: pos(f.building_levels) ? plural(vocab.count.building_levels, f.building_levels, num) : "",
    ascenseur: word("elevator", f.elevator),
    ascenseur_privatif: word("private_elevator", f.private_elevator),
    dernier_etage: word("top_floor", f.top_floor),
    surface_terrasse: show("terrace_surface") && pos(cols.terrace_surface) ? formatArea(cols.terrace_surface, lang) : "",
    surface_balcon: show("balcony_surface") && pos(cols.balcony_surface) ? formatArea(cols.balcony_surface, lang) : "",
    vue: w.view.trim(),
    // Maison, villa, prestige
    construction: f.construction ? vocab.construction[f.construction] ?? "" : "",
    terrain_ares: land ? (vocab.word.unit_ares ?? "").replace("{n}", formatNumber(land / 100, lang)) : "",
    terrain_hectares: land ? (vocab.word.unit_hectares ?? "").replace("{n}", formatNumber(land / 10000, lang)) : "",
    surface_jardin: show("garden_surface") && pos(cols.garden_surface) ? formatArea(cols.garden_surface, lang) : "",
    orientation: f.orientation ? vocab.orientation[f.orientation] ?? "" : "",
    garage: pos(f.garage_spaces) ? plural(vocab.count.garage, f.garage_spaces, num) : "",
    piscine: show("has_pool") ? word("pool", cols.has_pool) : "",
    jardin_paysager: word("landscaped", f.landscaped_garden),
    domotique: word("domotics", f.home_automation),
    dependances: pos(f.outbuildings) ? plural(vocab.count.outbuildings, f.outbuildings, num) : "",
    classement: f.heritage ? vocab.heritage[f.heritage] ?? "" : "",
    // Terrain
    surface_terrain: land ? `${(vocab.word.unit_ares ?? "").replace("{n}", formatNumber(land / 100, lang))} (${formatArea(land, lang)})` : "",
    zone_pag: (f.zone_pag ?? "").trim(),
    viabilisation: f.servicing ? vocab.servicing[f.servicing] ?? "" : "",
    // Commercial
    surface_commerciale: show("usable_surface") && pos(cols.usable_surface) ? formatArea(cols.usable_surface, lang) : "",
    affectation: w.affectation.trim() || (lang === "fr" ? (cols.current_use ?? "").trim() : ""),
    vitrine: f.shopfront ? (pos(f.shopfront_length) ? (vocab.word.shopfront_len ?? "").replace("{n}", num(f.shopfront_length)) : vocab.word.shopfront ?? "") : "",
    loyers_en_cours: pos(f.current_rent) ? formatMoney(f.current_rent, lang) : "",
    rendement: pos(f.yield_percent) ? (vocab.word.unit_percent ?? "").replace("{n}", num(f.yield_percent)) : "",
    // Location
    loyer: rent && !cols.price_on_demand && pos(cols.price) ? formatMoney(cols.price, lang) : "",
    charges_location: rent && pos(f.rent_charges) ? formatMoney(f.rent_charges, lang) : "",
    garantie: rent && pos(f.deposit_months) ? plural(vocab.count.deposit, f.deposit_months, num) : "",
    disponibilite: rent
      ? f.available_now
        ? vocab.word.available_now ?? ""
        : f.available_from
          ? (vocab.word.available_from ?? "").replace("{date}", formatDate(f.available_from, lang))
          : ""
      : "",
  };
  const flags: TemplateFlags = { exclusif: exclusive, location: rent, vente: !rent };
  return { values, flags, family };
}

/** Annonce complete d'une langue : titre, texte brut et HTML de l'editeur. */
export function generateListing(
  cols: ListingColumns,
  data: ListingData,
  lang: ListingLang,
  templates: ListingTemplates,
  vocab: ListingVocab,
): GeneratedListing {
  const { values, flags } = listingValues(cols, data, lang, vocab);
  const block = templateBlockOf(cols.property_type);
  const blockTpl = block ? templates.blocks[block] ?? "" : "";
  const prestations = blockTpl ? renderTemplate(blockTpl, values, flags) : "";
  const all = { ...values, prestations };
  const text = renderTemplate(templates.tronc, all, flags);
  const title = renderTemplate(templates.title, all, flags).replace(/\s*\n\s*/g, " ").trim();
  return { title, text, html: textToHtml(text) };
}

export const LEVEL_KIND_ORDER: LevelKind[] = ["basement", "ground", "garden", "floor", "mezzanine", "attic"];
