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
  "appartement",
  "immeuble",
  "terrain",
  "bureau",
  "commerce",
  "mixte",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

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
}

export function generateOffmarketReference() {
  const hex = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  )
    .join("")
    .toUpperCase();
  return `OM-${hex}`;
}

