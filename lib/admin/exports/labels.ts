// lib/admin/exports/labels.ts — libellés français pour les exports.
// Règle stricte (mission 2026-09-22) : aucune valeur brute de base dans
// un export. On réutilise UNIQUEMENT des correspondances déjà présentes
// ailleurs dans le code (jamais une traduction inventée ici). Toute
// valeur sans correspondance connue passe par `capitalizeFallback` —
// première lettre en majuscule, rien d'autre — et doit être listée dans
// le rapport de mission comme "valeur sans libellé connu".
import { WORKFLOW_LABELS, type WorkflowStatus } from "@/components/admin/WorkflowBadge";
import {
  PROPERTY_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  type PropertyType,
} from "@/lib/admin/offmarket";

/** Première lettre en majuscule, rien d'autre — pas de remplacement des
 * underscores, pas de traduction : c'est la règle explicite du fallback. */
export function capitalizeFallback(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function lookup<T extends string>(
  map: Record<T, string>,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return (map as Record<string, string>)[value] ?? capitalizeFallback(value);
}

// ---------- Statut workflow (leads/mandats/offmarket_requests) ----------
// Source : components/admin/WorkflowBadge.tsx:4-29 (STATUSES), exporté
// en Record<WorkflowStatus,string> ligne 35-39. Réutilisé tel quel.
export function workflowStatusLabel(value: string | null | undefined): string {
  return lookup(WORKFLOW_LABELS as Record<string, string>, value ?? "new");
}

// ---------- Type de bien (mandats, offmarket) ----------
// Source : lib/admin/offmarket.ts:49-61 (PROPERTY_TYPE_LABELS).
export function propertyTypeLabel(value: string | null | undefined): string {
  return lookup(PROPERTY_TYPE_LABELS as Record<string, string>, value);
}

// ---------- Statut d'une demande d'accès off-market ----------
// Source : lib/admin/offmarket.ts:117-125 (REQUEST_STATUS_LABELS).
export function requestStatusLabel(value: string | null | undefined): string {
  return lookup(REQUEST_STATUS_LABELS as Record<string, string>, value);
}

// ---------- Type de mandat ----------
// Source : app/admin/mandats/page.tsx:65-70 et
// app/admin/mandats/[id]/page.tsx:84-89 (TYPE_MANDAT_LABEL, identique
// dans les deux fichiers — copié ici, pas importé, car ce sont des
// fichiers "page" non conçus pour être réutilisés).
const TYPE_MANDAT_LABEL: Record<string, string> = {
  exclusif: "Exclusif",
  "semi-exclusif": "Semi-exclusif",
  simple: "Simple",
  autonome: "Autonome",
};
export function typeMandatLabel(value: string | null | undefined): string {
  return lookup(TYPE_MANDAT_LABEL, value);
}

// ---------- Type de transaction du mandat (vente/recherche/location) ----------
// Source : app/admin/mandats/[id]/page.tsx:78-82 (TYPE_TRANSACTION_LABEL).
const TYPE_TRANSACTION_LABEL: Record<string, string> = {
  vente: "Vente",
  recherche: "Recherche",
  location: "Location",
};
export function typeTransactionLabel(value: string | null | undefined): string {
  return lookup(TYPE_TRANSACTION_LABEL, value);
}

// ---------- Statut du mandat (actif/vendu/loue/expire/resilie) ----------
// Source : app/admin/mandats/page.tsx:72-78 (STATUS_LABEL).
const MANDAT_STATUS_LABEL: Record<string, string> = {
  actif: "Actif",
  vendu: "Vendu",
  loue: "Loué",
  expire: "Expiré",
  resilie: "Résilié",
};
export function mandatStatusLabel(value: string | null | undefined): string {
  return lookup(MANDAT_STATUS_LABEL, value);
}

// ---------- Sujet pré-cadré du formulaire /contact (leads) ----------
// Source : components/admin/LeadsTable.tsx:28-35 (SUBJECT_LABELS) /
// lib/email/lead-emails.ts:59-84 (même jeu de clés, variante FR/EN/DE).
const SUBJECT_LABEL: Record<string, string> = {
  mandat_vente: "Mandat de vente",
  mandat_recherche: "Mandat de recherche",
  estimation: "Estimation",
  mise_en_location: "Mettre en location",
  informations: "Informations",
  offmarket_arcova: "Off-Market — ARCOVA",
};
export function subjectLabel(value: string | null | undefined): string {
  return lookup(SUBJECT_LABEL, value);
}

// ---------- État général du bien (estimations) ----------
// Source : messages/fr.json:817-819 (estimate_form.state_*) — traductions
// next-intl existantes du tunnel public d'estimation, réutilisées ici
// telles quelles (mêmes clés que lib/estimation/engine.ts:46-48/234-237).
const ETAT_LABEL: Record<string, string> = {
  to_renovate: "À rénover",
  good: "Bon",
  renovated: "Rénové",
  new: "Neuf",
  // Source complémentaire : messages/fr.json:914-920 (c7_condition_*),
  // échelle étendue utilisée par le moteur EVS (lib/estimation/engine.ts).
  excellent: "Excellent (rénové < 5 ans)",
  fair: "À rafraîchir",
  major_works: "Gros travaux nécessaires",
};
export function etatLabel(value: string | null | undefined): string {
  return lookup(ETAT_LABEL, value);
}

// ---------- Moteur d'estimation ----------
// Source : app/admin/estimations/page.tsx:180 et
// app/admin/estimations/[id]/page.tsx:127 (ternaire déjà en place dans
// le code — reproduit ici comme correspondance à 1 valeur connue).
export function engineLabel(value: string | null | undefined): string {
  return value === "evs_5_methods" ? "EVS 5 méthodes" : "Hédoniste legacy";
}

// ---------- Statut de l'estimation ----------
// Source : app/admin/estimations/page.tsx:16-22 et
// app/admin/estimations/[id]/page.tsx:59-65 (STATUS_LABEL, identique).
const ESTIMATION_STATUS_LABEL: Record<string, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  avis_sent: "Avis envoyé",
  mandate_signed: "Mandat signé",
  closed: "Clos",
};
export function estimationStatusLabel(value: string | null | undefined): string {
  return lookup(ESTIMATION_STATUS_LABEL, value);
}

// ---------- Méthode d'estimation (détail interne EVS) ----------
// Source : app/admin/estimations/[id]/page.tsx:50-57 (METHOD_LABEL).
const METHOD_LABEL: Record<string, string> = {
  observatoire: "Référentiel MAPA (calibré)",
  sales_comparison: "Comparaison directe",
  hedonic: "Hédoniste enrichi",
  income_capitalization: "Capitalisation locative",
  depreciated_replacement: "Coût de remplacement",
  statec_reference: "STATEC référentiel",
};
export function methodLabel(value: string | null | undefined): string {
  return lookup(METHOD_LABEL, value);
}

// ---------- CHAMPS SANS CORRESPONDANCE CONNUE DANS LE CODE ----------
// Aucune traduction n'existe nulle part dans le dépôt pour ces champs —
// PROUVÉ par recherche exhaustive (cf. rapport de mission) : fallback
// `capitalizeFallback` uniquement, listés explicitement pour que le
// rapport les signale.
//   - leads.type            (ex. "property_request", "general_contact",
//                             "search_mandate", "mandate_exclusive"...)
//   - leads.source / offmarket_requests source
//   - estimation_requests.client_output.confidence ("HIGH"/"MEDIUM"/"LOW")
export function rawTypeLabel(value: string | null | undefined): string {
  return capitalizeFallback(value);
}
export function sourceLabel(value: string | null | undefined): string {
  return capitalizeFallback(value);
}
export function confidenceLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return capitalizeFallback(value.toLowerCase());
}

export type { WorkflowStatus, PropertyType };
