"use client";

import Link from "next/link";
import { formatDateTimeShort } from "@/lib/datetime";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateWorkflowStatus } from "@/app/admin/liste-attente/actions";
import {
  WORKFLOW_STATUSES,
  WORKFLOW_LABEL_KEYS,
  WorkflowBadge,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";

type WaitlistRow = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  message: string | null;
  source: string | null;
  status: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
};

// Parse les tags [CHAMP] inseres dans `message` par /api/liste-attente
// (meme logique que app/admin/liste-attente/page.tsx et [id]/page.tsx).
function extractTag(message: string | null, tag: string): string | null {
  if (!message) return null;
  const inline = message.match(
    new RegExp(`\\[${tag}\\][ \\t]+([^\\n]+)`, "i"),
  );
  if (inline) return inline[1].trim();
  const block = message.match(
    new RegExp(`\\[${tag}\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[A-Z_]+\\]|$)`, "i"),
  );
  if (block) return block[1].trim();
  return null;
}

export function WaitlistTable({ items }: { items: WaitlistRow[] }) {
  const t = useTranslations("admin_waitlist");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-[#3D4F63]/10">
      {items.length === 0 && (
        <li className="px-4 py-6 text-center text-sm text-[#3D4F63]/60">
          {t("empty")}
        </li>
      )}
      {items.map((r) => (
        <WaitlistRow
          key={r.id}
          item={r}
          open={openId === r.id}
          onToggle={() => setOpenId(openId === r.id ? null : r.id)}
        />
      ))}
    </ul>
  );
}

function WaitlistRow({
  item,
  open,
  onToggle,
}: {
  item: WaitlistRow;
  open: boolean;
  onToggle: () => void;
}) {
  const [status, setStatus] = useState<WorkflowStatus>(
    item.workflow_status && WORKFLOW_STATUSES.includes(item.workflow_status as WorkflowStatus)
      ? (item.workflow_status as WorkflowStatus)
      : "new",
  );
  const t = useTranslations("admin_waitlist");
  const tw = useTranslations("admin_workflow");
  const [busy, startTransition] = useTransition();

  const changeStatus = (next: WorkflowStatus) => {
    setStatus(next);
    startTransition(() => updateWorkflowStatus(item.id, next));
  };

  const fullName = [item.first_name, item.last_name].filter(Boolean).join(" ");
  const budget = extractTag(item.message, "BUDGET");
  const budgetValidated = extractTag(item.message, "BUDGET_VALIDE");
  const search = extractTag(item.message, "RECHERCHE");

  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <WorkflowBadge status={status} />
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#1A1F2A]">
              {fullName || item.email}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#3D4F63]/60">
              {item.email}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
              {formatDateTimeShort(item.created_at)}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs text-[#3D4F63]/80">
            <p>
              <span className="font-mono uppercase tracking-[0.15em] text-[#3D4F63]/50">
                {t("budget")}
              </span>{" "}
              {budget ?? tw("not_provided")}
            </p>
            <p>
              <span className="font-mono uppercase tracking-[0.15em] text-[#3D4F63]/50">
                {t("budget_validated")}
              </span>{" "}
              {budgetValidated ?? tw("not_provided")}
            </p>
          </div>
          <Link
            href={`/admin/liste-attente/${item.id}`}
            className="rounded-full border border-[#3D4F63]/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
          >
            {tw("view")}
          </Link>
        </div>
      </div>

      {search && (
        <details className="mt-3">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60 hover:text-[#e0af6e]">
            {t("search")}
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[#1A1F2A]">
            {search}
          </p>
        </details>
      )}

      {open && (
        <div className="mt-4 rounded-xl border border-[#3D4F63]/10 bg-[#F5EFE1]/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            {tw("select_title")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {WORKFLOW_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy || s === status}
                onClick={() => changeStatus(s)}
                className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors disabled:opacity-50 ${
                  s === status
                    ? "bg-[#3D4F63] text-[#F5EFE1]"
                    : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e]"
                }`}
              >
                {tw(WORKFLOW_LABEL_KEYS[s])}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
