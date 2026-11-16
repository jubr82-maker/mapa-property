// Colonnes obligatoires d'un brouillon importe (nov. 2026) : type de bien,
// transaction et pays. Module pur. Si l'une manque, l'import n'enregistre
// rien et la zone d'import demande de la choisir dans la liste fermee
// (meme liste que la fiche).
import { transactionToBase } from "@/lib/taxonomy/property-types";

export type RequiredField = "property_type" | "transaction" | "country";

export function missingRequired(v: { property_type: string | null; transaction: string | null; country: string | null }): RequiredField[] {
  const out: RequiredField[] = [];
  if (!v.property_type) out.push("property_type");
  if (!v.transaction || !transactionToBase(v.transaction)) out.push("transaction");
  if (!v.country) out.push("country");
  return out;
}
