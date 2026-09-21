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
// Source : app/api/estimate/route.ts:593,623,671,678 ("evs_5_methods") et
// :706,735,739 ("hedonic_legacy") — les 2 SEULES valeurs réellement
// écrites dans estimation_requests.engine (recherche exhaustive).
const ENGINE_LABEL: Record<string, string> = {
  evs_5_methods: "EVS 5 méthodes",
  hedonic_legacy: "Hédoniste (legacy)",
};
export function engineLabel(value: string | null | undefined): string {
  return lookup(ENGINE_LABEL, value);
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

// ---------- Type de demande (leads.type) ----------
// Liste établie par lecture exhaustive de TOUT le code qui écrit
// leads.type (routes publiques + lib partagée) — aucune valeur devinée :
//   general_contact   -> app/[locale]/contact/page.tsx:46
//   property_request  -> app/[locale]/biens/[slug]/page.tsx:462
//   mandate_exclusive -> lib/mandates.ts:22
//   mandate_semi      -> lib/mandates.ts:35
//   mandate_simple    -> lib/mandates.ts:48
//   mandate_autonomous-> lib/mandates.ts:61
//   search_mandate    -> lib/mandates.ts:74
//   offmarket_request -> app/api/nda-request/route.ts:130,
//                        app/api/offmarket-request/route.ts:51
//   waitlist          -> app/api/liste-attente/route.ts:108,137
//   chatbot           -> app/api/chatbot/route.ts:175 (auto-lead Éléna)
// `components/admin/LeadsTable.tsx:51-63` liste aussi "contact", "buy",
// "sell", "rent", "estimate", "mandate_search" dans son filtre déroulant
// admin — AUCUNE trace trouvée d'un code qui écrit ces valeurs
// exactes dans leads.type (recherche exhaustive) : probablement des
// options de filtre obsolètes/historiques. Non traduites ici par
// prudence (ne pas deviner) ; signalé dans le rapport de mission.
const LEAD_TYPE_LABEL: Record<string, string> = {
  general_contact: "Contact général",
  property_request: "Demande sur un bien",
  mandate_exclusive: "Mandat exclusif",
  mandate_semi: "Mandat semi-exclusif",
  mandate_simple: "Mandat simple",
  mandate_autonomous: "Mandat autonome",
  search_mandate: "Mandat de recherche",
  offmarket_request: "Demande off-market",
  waitlist: "Liste d'attente",
  chatbot: "Chatbot (Éléna)",
};
export function rawTypeLabel(value: string | null | undefined): string {
  return lookup(LEAD_TYPE_LABEL, value);
}

// ---------- Source (leads.source / leads via flux off-market) ----------
// Valeurs fixes confirmées par lecture du code :
//   website       -> components/forms/ContactForm.tsx:39 (défaut)
//   contact       -> app/[locale]/contact/page.tsx:46,
//                    app/api/contact/route.ts:49
//   waitlist-home -> app/api/liste-attente/route.ts:109,138
// Valeurs gabarits (préfixe fixe + identifiant variable, jamais une
// liste finie) :
//   property:<slug>              -> app/[locale]/biens/[slug]/page.tsx:463
//   mandate:<slug-mandat>        -> app/[locale]/mandats/[type]/page.tsx:218
//     (5 slugs possibles : exclusif/semi-exclusif/simple/autonome/recherche,
//      lib/mandates.ts:18,31,44,57,70)
//   offmarket:<property_id>      -> app/api/offmarket-request/route.ts:52
//   nda_request:offmarket:<ref>  -> app/api/nda-request/route.ts:132
// `offmarket_requests` n'a PAS de colonne source (vérifié : absente du
// SELECT admin app/admin/offmarket/requests/page.tsx) — seules les
// LEADS générées par le flux off-market (nda-request/offmarket-request)
// portent un `source`, ci-dessus.
const SOURCE_LABEL: Record<string, string> = {
  website: "Site web",
  contact: "Formulaire de contact",
  "waitlist-home": "Page liste d'attente",
};
const SOURCE_PREFIX_LABEL: [prefix: string, label: string][] = [
  ["nda_request:offmarket:", "Demande NDA off-market — bien "],
  ["offmarket:", "Demande off-market — bien "],
  ["property:", "Fiche bien — "],
  ["mandate:", "Page mandat — "],
];
export function sourceLabel(value: string | null | undefined): string {
  if (!value) return "—";
  if (SOURCE_LABEL[value]) return SOURCE_LABEL[value];
  for (const [prefix, label] of SOURCE_PREFIX_LABEL) {
    if (value.startsWith(prefix)) return `${label}${value.slice(prefix.length)}`;
  }
  return capitalizeFallback(value);
}

// ---------- Niveau de confiance de l'estimation ----------
// Aucune correspondance FR trouvée ailleurs dans le code (recherche
// exhaustive) — traduction fournie explicitement par Julien (mission
// 2026-09-22, étape 2) : HIGH/MEDIUM/LOW -> Élevée/Moyenne/Faible.
const CONFIDENCE_LABEL: Record<string, string> = {
  HIGH: "Élevée",
  MEDIUM: "Moyenne",
  LOW: "Faible",
};
export function confidenceLabel(value: string | null | undefined): string {
  return lookup(CONFIDENCE_LABEL, value);
}

export type { WorkflowStatus, PropertyType };
