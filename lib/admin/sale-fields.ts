// Ventes realisees (oct. 2026) : types et champs du formulaire. Module pur,
// partage par le formulaire (app/admin/ventes-realisees/SaleForm.tsx) et la
// validation serveur (lib/admin/sales-auth.ts).
//
// Types : la liste fermee des fiches de biens (lib/listing/families.ts,
// LISTING_TYPES), memes libelles (admin_properties.ptype_*). Anciennes
// valeurs des ventes deja enregistrees (maison, immeuble) gardees telles
// quelles a l'edition, jamais proposees pour une nouvelle vente.
import { LISTING_TYPES, familyOf, type ListingFamily } from "@/lib/listing/families";

export const LEGACY_SALE_TYPES = ["maison", "immeuble"] as const;

const LEGACY_FAMILY: Record<string, ListingFamily> = { maison: "maison", immeuble: "commercial" };

export function isSaleType(v: unknown): v is string {
  return typeof v === "string" && (LISTING_TYPES.some((t) => t.slug === v) || (LEGACY_SALE_TYPES as readonly string[]).includes(v));
}

export function saleFamily(type: string | null | undefined): ListingFamily | null {
  return familyOf(type) ?? (type ? LEGACY_FAMILY[type] ?? null : null);
}

export type SaleField = "surface_habitable" | "surface_terrain" | "chambres" | "classe_energie" | "annee_construction" | "etat";
export type FieldRule = "required" | "optional" | "hidden";

const RESIDENTIAL: Record<SaleField, FieldRule> = {
  surface_habitable: "required",
  surface_terrain: "optional",
  chambres: "optional",
  classe_energie: "optional",
  annee_construction: "optional",
  etat: "optional",
};

const RULES: Record<ListingFamily, Record<SaleField, FieldRule>> = {
  appartement: { ...RESIDENTIAL, surface_terrain: "hidden" },
  maison: RESIDENTIAL,
  villa: RESIDENTIAL,
  prestige: RESIDENTIAL,
  // Surface utile facultative ; pas de chambres.
  commercial: { ...RESIDENTIAL, surface_habitable: "optional", chambres: "hidden" },
  terrain: {
    surface_habitable: "hidden",
    surface_terrain: "required",
    chambres: "hidden",
    classe_energie: "hidden",
    annee_construction: "hidden",
    etat: "hidden",
  },
  parking: {
    surface_habitable: "optional",
    surface_terrain: "hidden",
    chambres: "hidden",
    classe_energie: "hidden",
    annee_construction: "optional",
    etat: "optional",
  },
};

/** Regle de chaque champ selon le type ; type inconnu : regles d'un logement. */
export function saleFieldRules(type: string | null | undefined): Record<SaleField, FieldRule> {
  const f = saleFamily(type);
  return f ? RULES[f] : RESIDENTIAL;
}

/** Libelle de la surface principale : habitable (logement) ou utile (autres). */
export function surfaceLabelKey(type: string | null | undefined): "form.livingSurface" | "form.usableSurface" {
  const f = saleFamily(type);
  return f === "commercial" || f === "parking" ? "form.usableSurface" : "form.livingSurface";
}
