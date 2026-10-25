// Localite d'un formulaire de mandat (oct. 2026), controlee cote serveur
// par /api/lead : au Luxembourg, uniquement une localite ou un quartier du
// registre officiel (lib/geo/lu-localities.ts) ; ailleurs, texte libre
// inchange. Regle de Julien : jamais de texte libre la ou un referentiel
// existe.
import { LU_PLACES } from "@/lib/geo/lu-localities";
import { findLuPlace, isLuCountry } from "@/lib/geo/lu-place-match";

/** Formulaires qui affichent le champ "Localite du bien" (components/forms/ContactForm.tsx). */
export function isMandateLeadType(type: unknown): boolean {
  return typeof type === "string" && (type.startsWith("mandate_") || type === "search_mandate");
}

/**
 * Ville a enregistrer, ou refus. Luxembourg : nom officiel exact, et la
 * commune entre parentheses pour un nom porte par deux localites
 * ("Hostert (Rambrouch)").
 */
export function checkLeadCity(input: { type: unknown; country: unknown; city: unknown; city_commune?: unknown }): { ok: true; city?: string } | { ok: false } {
  const city = typeof input.city === "string" ? input.city.trim() : "";
  if (!city) return { ok: true };
  if (!isMandateLeadType(input.type) || !isLuCountry(typeof input.country === "string" ? input.country : null)) return { ok: true, city };
  const commune = typeof input.city_commune === "string" && input.city_commune.trim() ? input.city_commune.trim() : null;
  const place = findLuPlace(LU_PLACES, city, commune);
  if (!place) return { ok: false };
  const homonym = LU_PLACES.filter((p) => p.name === place.name).length > 1;
  return { ok: true, city: homonym ? `${place.name} (${place.commune})` : place.name };
}
