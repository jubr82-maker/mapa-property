"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { AdminFilterPanel } from "@/components/admin/AdminFilterPanel";
import {
  OFFMARKET_STATUSES,
  OFFMARKET_TRANSACTIONS,
  PROPERTY_TYPES,
} from "@/lib/admin/offmarket";

export function OffmarketListFilters() {
  const t = useTranslations("admin_offmarket");
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

  const active = ["q", "status", "type", "transaction"].filter((k) => sp.get(k)).length;

  return (
    <AdminFilterPanel active={active}>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#3D4F63]/15 bg-white p-4">
      <input
        type="search"
        placeholder={t("filters.search")}
        defaultValue={sp.get("q") ?? ""}
        onChange={(e) => setParam("q", e.target.value)}
        className="min-w-[260px] flex-1 rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
      />
      <select
        value={sp.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
      >
        <option value="">{t("filters.allStatuses")}</option>
        {OFFMARKET_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`status.${s}`)}
          </option>
        ))}
      </select>
      <select
        value={sp.get("type") ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
        className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
      >
        <option value="">{t("filters.allTypes")}</option>
        {PROPERTY_TYPES.map((pt) => (
          <option key={pt} value={pt}>
            {t(`propertyType.${pt}`)}
          </option>
        ))}
      </select>
      <select
        value={sp.get("transaction") ?? ""}
        onChange={(e) => setParam("transaction", e.target.value)}
        className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
      >
        <option value="">{t("filters.allTransactions")}</option>
        {OFFMARKET_TRANSACTIONS.map((tx) => (
          <option key={tx} value={tx}>
            {t(`transaction.${tx}`)}
          </option>
        ))}
      </select>
    </div>
    </AdminFilterPanel>
  );
}
