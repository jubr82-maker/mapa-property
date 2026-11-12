// Bandeaux "Sous compromis", "Vendu", "Loue" (nov. 2026, SQL 35).
// Source unique des valeurs permises (admin, serveur, site public). Tant que
// le fichier SQL 35 n'est pas execute, les colonnes manquent : tout bien est
// lu "sans bandeau" (bannerOf renvoie null), rien ne change sur le site.

export const STATUS_BANNERS = ["under_compromise", "sold", "rented"] as const;
export const BANNER_POSITIONS = ["straight", "diagonal"] as const;
export const BANNER_COLORS = ["sapin", "cuivre", "creme", "blanc"] as const;

export type StatusBannerKind = (typeof STATUS_BANNERS)[number];
export type BannerPosition = (typeof BANNER_POSITIONS)[number];
export type BannerColor = (typeof BANNER_COLORS)[number];

export interface PropertyBanner {
  kind: StatusBannerKind;
  position: BannerPosition;
  color: BannerColor;
}

/** Colonnes lues en plus (lecture tolerante tant que le SQL 35 manque). */
export const BANNER_COLUMNS = "status_banner,banner_position,banner_color";

/** Bandeaux permis selon la transaction : vente ou location. */
export function bannersFor(transaction: string | null | undefined): readonly StatusBannerKind[] {
  if (transaction === "rent") return ["rented"];
  if (transaction === "sale") return ["under_compromise", "sold"];
  return [];
}

export const isStatusBanner = (v: unknown): v is StatusBannerKind => typeof v === "string" && (STATUS_BANNERS as readonly string[]).includes(v);
export const isBannerPosition = (v: unknown): v is BannerPosition => typeof v === "string" && (BANNER_POSITIONS as readonly string[]).includes(v);
export const isBannerColor = (v: unknown): v is BannerColor => typeof v === "string" && (BANNER_COLORS as readonly string[]).includes(v);

/**
 * Controle serveur d'une combinaison bandeau + transaction. Renvoie null si
 * elle est permise, sinon le code de l'erreur.
 */
export function checkBanner(
  transaction: string | null | undefined,
  kind: unknown,
  position: unknown,
  color: unknown,
): null | "banner_invalid" | "banner_transaction" {
  if (kind !== null && !isStatusBanner(kind)) return "banner_invalid";
  if (!isBannerPosition(position) || !isBannerColor(color)) return "banner_invalid";
  if (kind !== null && !bannersFor(transaction).includes(kind)) return "banner_transaction";
  return null;
}

/** Bandeau d'un bien lu en base (colonnes absentes ou vides : null). */
export function bannerOf(row: unknown): PropertyBanner | null {
  if (!row || typeof row !== "object") return null;
  const r = row as { status_banner?: unknown; banner_position?: unknown; banner_color?: unknown; transaction?: unknown };
  if (!isStatusBanner(r.status_banner)) return null;
  // Combinaison incoherente (bien passe en location avec "Vendu") : ignoree.
  if (typeof r.transaction === "string" && !bannersFor(r.transaction).includes(r.status_banner)) return null;
  return {
    kind: r.status_banner,
    position: isBannerPosition(r.banner_position) ? r.banner_position : "straight",
    color: isBannerColor(r.banner_color) ? r.banner_color : "sapin",
  };
}

/** Vendu ou Loue : le bien n'est plus disponible (prix remplace, fin de liste). */
export function isClosed(row: unknown): boolean {
  const b = bannerOf(row);
  return b?.kind === "sold" || b?.kind === "rented";
}

/**
 * Les biens Vendu et Loue passent apres les biens disponibles, sans changer
 * l'ordre des autres (tri stable).
 */
export function availableFirst<T>(list: readonly T[]): T[] {
  const open: T[] = [];
  const closed: T[] = [];
  for (const p of list) (isClosed(p) ? closed : open).push(p);
  return [...open, ...closed];
}

/** Angle de la diagonale (coin bas gauche vers coin haut droit), en degres. */
export const DIAGONAL_ANGLE = { card: 36.87, gallery: 29.36 } as const;
