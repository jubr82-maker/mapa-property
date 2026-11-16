// Champs "a completer" d'un brouillon importe (nov. 2026). Module pur :
// calcule par la fiche a partir du brouillon ENREGISTRE (donc a jour apres
// chaque enregistrement), seulement pour les champs utiles au type de bien.
import { familyOf, fieldVisible } from "@/lib/listing/families";

export type DraftRow = {
  title_fr: string | null;
  transaction?: string | null;
  property_type: string | null;
  country: string | null;
  city: string | null;
  price: number | null;
  price_on_demand: boolean | null;
  living_surface: number | null;
  bedrooms: number | null;
  energy: string | null;
  description_fr: string | null;
};

export const DRAFT_TODO_KEYS = ["title_fr", "property_type", "country", "city", "price", "living_surface", "bedrooms", "energy", "description_fr"] as const;

export function draftTodo(row: DraftRow, titleFallback: string): string[] {
  const family = familyOf(row.property_type);
  const empty = (v: unknown) => v == null || (typeof v === "string" && !v.replace(/<[^>]+>/g, "").trim());
  const out: string[] = [];
  if (empty(row.title_fr) || row.title_fr === titleFallback) out.push("title_fr");
  if (row.transaction !== undefined && empty(row.transaction)) out.push("transaction");
  if (empty(row.property_type)) out.push("property_type");
  if (empty(row.country)) out.push("country");
  if (empty(row.city)) out.push("city");
  if (empty(row.price) && !row.price_on_demand) out.push("price");
  for (const f of ["living_surface", "bedrooms", "energy"] as const) if (fieldVisible(f, family) && empty(row[f])) out.push(f);
  if (empty(row.description_fr)) out.push("description_fr");
  return out;
}
