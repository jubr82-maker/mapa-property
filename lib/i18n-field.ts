// lib/i18n-field.ts — helper i18n générique pour les champs « lisibles
// client » multilingues (BUG T5).
//
// Convention colonnes : `<field>` (base/FR) + optionnels `<field>_en`,
// `<field>_de`. Renvoie la variante de la locale si présente & non
// vide, sinon retombe sur `_fr` puis sur le champ nu, puis "".
//
// Couvre les deux schémas du projet :
//   - `properties` (Apimo)            : title_fr / title_en / title_de
//   - `properties_offmarket` (Julien) : title (FR) [+ title_en/_de après
//                                        migration 20260518_offmarket_i18n_titles]

type Locale = "fr" | "en" | "de";

export function getLocalizedField(
  obj: Record<string, unknown> | null | undefined,
  field: string,
  locale: string,
): string {
  if (!obj) return "";
  const loc = (["fr", "en", "de"].includes(locale) ? locale : "fr") as Locale;
  const pick = (k: string) => {
    const v = obj[k];
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  return (
    pick(`${field}_${loc}`) ??
    pick(`${field}_fr`) ??
    pick(field) ??
    ""
  );
}
