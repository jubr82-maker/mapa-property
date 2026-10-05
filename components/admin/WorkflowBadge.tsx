// Badge du statut de suivi d'une fiche (lead, mandat, liste d'attente,
// ARCOVA, demande Off-Market). Sans directive : rendu aussi bien par les
// pages serveur que par les composants clients de l'admin. Libelles via
// next-intl (namespace "admin_workflow").
import { useTranslations } from "next-intl";

const STATUS_CLASSES = {
  new: "bg-gray-100 text-gray-700 ring-gray-300",
  in_progress: "bg-orange-50 text-orange-700 ring-orange-300",
  on_hold: "bg-yellow-50 text-yellow-700 ring-yellow-300",
  validated: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  rejected: "bg-red-50 text-red-700 ring-red-300",
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-400",
} as const;

export type WorkflowStatus = keyof typeof STATUS_CLASSES;

export const WORKFLOW_STATUSES = Object.keys(STATUS_CLASSES) as WorkflowStatus[];

/** Cle de traduction (namespace "admin_workflow") de chaque statut. */
export const WORKFLOW_LABEL_KEYS: Record<WorkflowStatus, string> = {
  new: "status_new",
  in_progress: "status_in_progress",
  on_hold: "status_on_hold",
  validated: "status_validated",
  rejected: "status_rejected",
  completed: "status_completed",
};

/** Cle de traduction d'une valeur brute de statut ("status_unknown" sinon). */
export function workflowLabelKey(value: string | null | undefined): string {
  return value && value in WORKFLOW_LABEL_KEYS
    ? WORKFLOW_LABEL_KEYS[value as WorkflowStatus]
    : "status_unknown";
}

/**
 * Libelles francais figes, conserves uniquement pour
 * lib/admin/exports/labels.ts (module hors de cette rubrique, encore
 * branche dessus). Les ecrans passent par WORKFLOW_LABEL_KEYS.
 * @deprecated utiliser WORKFLOW_LABEL_KEYS avec next-intl.
 */
export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  on_hold: "En suspens",
  validated: "Validé",
  rejected: "Exclu",
  completed: "Traité",
};

/** Traducteur minimal accepte par les aides ci-dessous. */
export type AdminTranslator = {
  (key: string, values?: Record<string, string | number>): string;
  has: (key: string) => boolean;
};

/**
 * Libelle lisible de l'origine d'une demande (colonne source), via les
 * cles "source_*" du namespace "admin_workflow". Valeur inconnue : renvoyee
 * telle quelle (donnee saisie, pas un identifiant technique connu).
 */
export function sourceLabel(t: AdminTranslator, value: string | null | undefined): string {
  if (!value) return "";
  const key = `source_${value.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
  if (t.has(key)) return t(key);
  const prefixes: [string, string][] = [
    ["nda_request:offmarket:", "source_prefix_nda_offmarket"],
    ["offmarket:", "source_prefix_offmarket"],
    ["property:", "source_prefix_property"],
    ["mandate:", "source_prefix_mandate"],
  ];
  for (const [prefix, k] of prefixes) {
    if (value.startsWith(prefix)) return t(k, { ref: value.slice(prefix.length) });
  }
  return value;
}

export function WorkflowBadge({
  status,
  size = "xs",
}: {
  status: WorkflowStatus | string | null | undefined;
  size?: "xs" | "md";
}) {
  const t = useTranslations("admin_workflow");
  const key = (status && status in STATUS_CLASSES ? status : "new") as WorkflowStatus;
  const sizeClass = size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-mono uppercase tracking-[0.1em] ${sizeClass} ${STATUS_CLASSES[key]}`}
    >
      {t(WORKFLOW_LABEL_KEYS[key])}
    </span>
  );
}
