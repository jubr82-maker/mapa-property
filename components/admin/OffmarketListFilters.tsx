"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  OFFMARKET_STATUSES,
  OFFMARKET_STATUS_LABELS,
  PROPERTY_TYPES,
} from "@/lib/admin/offmarket";

export function OffmarketListFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.replace(`/admin/offmarket?${next.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#3D4F63]/15 bg-white p-4">
      <input
        type="search"
        placeholder="Rechercher référence ou titre…"
        defaultValue={sp.get("q") ?? ""}
        onChange={(e) => setParam("q", e.target.value)}
        className="min-w-[260px] flex-1 rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#B8865A] focus:outline-none"
      />
      <select
        value={sp.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
      >
        <option value="">Tous statuts</option>
        {OFFMARKET_STATUSES.map((s) => (
          <option key={s} value={s}>
            {OFFMARKET_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <select
        value={sp.get("type") ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
        className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm capitalize"
      >
        <option value="">Tous types</option>
        {PROPERTY_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
