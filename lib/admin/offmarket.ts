export type OffmarketStatus = "draft" | "published" | "sold" | "withdrawn";

export const OFFMARKET_STATUSES: OffmarketStatus[] = [
  "draft",
  "published",
  "sold",
  "withdrawn",
];

export const OFFMARKET_STATUS_LABELS: Record<OffmarketStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  sold: "Vendu",
  withdrawn: "Retiré",
};

export const OFFMARKET_STATUS_TONES: Record<OffmarketStatus, string> = {
  draft: "bg-[#3D4F63]/10 text-[#3D4F63]",
  published: "bg-emerald-100 text-emerald-800",
  sold: "bg-[#B8865A]/15 text-[#7B5C36]",
  withdrawn: "bg-red-100 text-red-700",
};

export const PROPERTY_TYPES = [
  "maison",
  "villa",
  "appartement",
  "penthouse",
  "duplex",
  "terrain",
  "immeuble",
  "bureau",
  "commerce",
  "hotel_particulier",
  "mixte",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  maison: "Maison",
  villa: "Villa",
  appartement: "Appartement",
  penthouse: "Penthouse",
  duplex: "Duplex",
  terrain: "Terrain",
  immeuble: "Immeuble",
  bureau: "Bureau",
  commerce: "Local commercial",
  hotel_particulier: "Hôtel particulier",
  mixte: "Mixte",
};

export const IMMEUBLE_SUB_TYPES = [
  "rapport",
  "mixte",
  "bureaux",
  "commercial",
  "habitation",
] as const;

export type ImmeubleSubType = (typeof IMMEUBLE_SUB_TYPES)[number];

export const IMMEUBLE_SUB_TYPE_LABELS: Record<ImmeubleSubType, string> = {
  rapport: "Immeuble de rapport",
  mixte: "Immeuble mixte",
  bureaux: "Immeuble de bureaux",
  commercial: "Immeuble commercial",
  habitation: "Immeuble d'habitation",
};

export const RESIDENTIAL_TYPES: PropertyType[] = [
  "maison",
  "villa",
  "appartement",
  "penthouse",
  "duplex",
  "hotel_particulier",
];

export const PROFESSIONAL_TYPES: PropertyType[] = [
  "immeuble",
  "bureau",
  "commerce",
  "mixte",
];

export const TYPES_WITH_LAND: PropertyType[] = [
  "maison",
  "villa",
  "terrain",
  "immeuble",
  "hotel_particulier",
];

export const REQUEST_STATUSES = [
  "pending",
  "qualified",
  "nda_sent",
  "nda_signed",
  "dossier_sent",
  "visit_scheduled",
  "rejected",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "En attente",
  qualified: "Qualifié",
  nda_sent: "NDA envoyé",
  nda_signed: "NDA signé",
  dossier_sent: "Dossier envoyé",
  visit_scheduled: "Visite planifiée",
  rejected: "Refusé",
};

export const REQUEST_STATUS_TONES: Record<RequestStatus, string> = {
  pending: "bg-[#3D4F63]/10 text-[#3D4F63]",
  qualified: "bg-blue-100 text-blue-700",
  nda_sent: "bg-amber-100 text-amber-800",
  nda_signed: "bg-emerald-100 text-emerald-800",
  dossier_sent: "bg-violet-100 text-violet-800",
  visit_scheduled: "bg-teal-100 text-teal-800",
  rejected: "bg-red-100 text-red-700",
};

export interface OffmarketRow {
  id: string;
  reference: string;
  status: OffmarketStatus;
  title: string | null;
  property_type: string | null;
  country: string | null;
  region: string | null;
  city_anonymized: string | null;
  city_real: string | null;
  city_label: string | null;
  surface_habitable: number | null;
  surface_terrain: number | null;
  surface_hab: number | null;
  chambres: number | null;
  salles_de_bain: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  classe_energetique: string | null;
  energy_class: string | null;
  price_estimate: number | null;
  price_label: string | null;
  price_display: string | null;
  short_description: string | null;
  short_pitch: string | null;
  full_description: string | null;
  description: string | null;
  prestations: string[] | null;
  highlights: string[] | null;
  cover_image_url: string | null;
  photo_urls: string[] | null;
  gallery_urls: string[] | null;
  photos_locked: boolean | null;
  is_published: boolean | null;
  exclusive_until: string | null;
  signed_mandate_url: string | null;
  views_count: number | null;
  requests_count: number | null;
  last_request_at: string | null;
  created_at: string | null;
  updated_at: string | null;

  // Enrichissement 2026-05-11
  sub_type: string | null;
  surface_utile: number | null;
  surface_ponderee: number | null;
  bureaux: number | null;
  wc: number | null;
  douches: number | null;
  cuisine: boolean | null;
  cuisine_m2: number | null;
  locaux_stockage: number | null;
  buanderie: boolean | null;
  dressing: boolean | null;
  terrasse_m2: number | null;
  balcon_m2: number | null;
  jardin_m2: number | null;
  has_piscine: boolean | null;
  parking_exterieur: number | null;
  parking_interieur: number | null;
  box: number | null;
  garage: number | null;

  // CHANTIER 3 BIS
  display_order: number | null;
  is_coup_de_coeur: boolean | null;
  price_mode: string | null;
  price_min: number | null;
  price_max: number | null;
  price_custom_text: string | null;
  composition_commerces: unknown;
  composition_bureaux: unknown;
  composition_logements: unknown;
}

export function generateOffmarketReference() {
  const hex = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  )
    .join("")
    .toUpperCase();
  return `OM-${hex}`;
}

