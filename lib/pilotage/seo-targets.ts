// Requetes cibles du referencement (oct. 2026) : "agence immobiliere" ou
// "immobilier" avec "Luxembourg" ou le nom d'une localite luxembourgeoise
// du registre officiel (lib/geo/luxembourg-communes). Comparaison sans
// accents ni majuscules. Module serveur (la liste des localites est lourde).
import { LOCALITIES } from "@/lib/geo/luxembourg-communes";

export function normalizeQuery(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[-_'’./]/g, " ").replace(/\s+/g, " ").trim();
}

let places: string[] | null = null;
function placeNames(): string[] {
  if (!places) {
    const set = new Set<string>(["luxembourg"]);
    for (const l of LOCALITIES) {
      const n = normalizeQuery(l.name);
      if (n.length >= 4) set.add(n);
    }
    places = Array.from(set);
  }
  return places;
}

const TOPIC = /\b(agence immobiliere|agences immobilieres|immobilier|immobiliere)\b/;

export function isTargetQuery(query: string): boolean {
  const q = normalizeQuery(query);
  if (!TOPIC.test(q)) return false;
  const padded = ` ${q} `;
  return placeNames().some((p) => padded.includes(` ${p} `));
}
