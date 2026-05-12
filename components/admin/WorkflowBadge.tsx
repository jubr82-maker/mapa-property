// Composant pur (Server-renderable) — pas de hook, pas de state.
// Utilisé partout dans l'UI admin pour afficher le statut workflow d'un lead.

const STATUSES = {
  new: {
    label: "Nouveau",
    classes: "bg-gray-100 text-gray-700 ring-gray-300",
  },
  in_progress: {
    label: "En cours",
    classes: "bg-orange-50 text-orange-700 ring-orange-300",
  },
  on_hold: {
    label: "En suspens",
    classes: "bg-yellow-50 text-yellow-700 ring-yellow-300",
  },
  validated: {
    label: "Validé",
    classes: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  },
  rejected: {
    label: "Exclu",
    classes: "bg-red-50 text-red-700 ring-red-300",
  },
  completed: {
    label: "Traité",
    classes: "bg-emerald-100 text-emerald-800 ring-emerald-400",
  },
} as const;

export type WorkflowStatus = keyof typeof STATUSES;

export const WORKFLOW_STATUSES = Object.keys(STATUSES) as WorkflowStatus[];

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = Object.fromEntries(
  (Object.entries(STATUSES) as [WorkflowStatus, { label: string }][]).map(
    ([k, v]) => [k, v.label],
  ),
) as Record<WorkflowStatus, string>;

export function WorkflowBadge({
  status,
  size = "xs",
}: {
  status: WorkflowStatus | string | null | undefined;
  size?: "xs" | "md";
}) {
  const key = (status && status in STATUSES ? status : "new") as WorkflowStatus;
  const s = STATUSES[key];
  const sizeClass = size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-mono uppercase tracking-[0.1em] ${sizeClass} ${s.classes}`}
    >
      {s.label}
    </span>
  );
}
