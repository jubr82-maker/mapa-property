"use client";

// Ordre des questions d'une page (oct. 2026) : monter ou descendre.
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { moveFaq } from "@/app/admin/faq/actions";

export function FaqMoveButtons({ id, first, last }: { id: string; first: boolean; last: boolean }) {
  const t = useTranslations("admin_faq");
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const move = (direction: "up" | "down") =>
    start(async () => {
      setError(null);
      const r = await moveFaq(id, direction).catch(() => ({ ok: false as const, error: t("err_network") }));
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  const cls = "rounded-md border border-[#3D4F63]/30 px-2 py-1 font-mono text-xs text-[#3D4F63] hover:bg-[#3D4F63]/5 disabled:opacity-40";
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={() => move("up")} disabled={busy || first} aria-label={t("move_up")} title={t("move_up")} className={cls}>
        ↑
      </button>
      <button type="button" onClick={() => move("down")} disabled={busy || last} aria-label={t("move_down")} title={t("move_down")} className={cls}>
        ↓
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </span>
  );
}
