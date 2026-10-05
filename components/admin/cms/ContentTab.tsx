"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { formatDateTimeShort } from "@/lib/datetime";

export type ContentRow = {
  id: string;
  key: string;
  locale: string;
  content: string;
  section: string | null;
  updated_at: string;
};

type Editable = ContentRow & { _draft: string; _saving: boolean; _error?: string };

const helper = createColumnHelper<Editable>();

export function ContentTab({ initial }: { initial: ContentRow[] }) {
  const notices = useTranslations("admin_notices");
  const t = useTranslations("admin_cms");
  // Libelles lisibles : langue, section et emplacement (groupe de la cle,
  // ex. "home.hero.title" donne "place_home_hero"). Valeur brute si inconnue.
  const langLabel = (l: string) => (t.has(`lang_${l}`) ? t(`lang_${l}`) : l);
  const sectionLabel = (s: string | null) =>
    !s ? "" : t.has(`section_${s}`) ? t(`section_${s}`) : s;
  const placeLabel = (key: string) => {
    const group = key.split(".").slice(0, 2).join("_");
    return t.has(`place_${group}`) ? t(`place_${group}`) : "";
  };
  const [rows, setRows] = useState<Editable[]>(() =>
    initial.map((r) => ({ ...r, _draft: r.content, _saving: false })),
  );
  const [filters, setFilters] = useState<ColumnFiltersState>([]);

  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const r of initial) if (r.section) set.add(r.section);
    return Array.from(set).sort();
  }, [initial]);

  async function save(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, _saving: true, _error: undefined } : r)),
    );
    try {
      const r = await fetch("/api/admin/cms/content", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: row.key,
          locale: row.locale,
          content: row._draft,
          section: row.section,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          r.status === 401 || r.status === 403
            ? t("err_session")
            : typeof json.error === "string"
              ? json.error
              : t("save_error"),
        );
      }
      setRows((rs) =>
        rs.map((r) =>
          r.id === id
            ? { ...r, content: row._draft, _saving: false, updated_at: new Date().toISOString() }
            : r,
        ),
      );
    } catch (e) {
      setRows((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, _saving: false, _error: (e as Error).message } : r,
        ),
      );
    }
  }

  const columns = useMemo(
    () => [
      helper.accessor("key", {
        header: t("col_place"),
        cell: (info) => {
          const label = placeLabel(info.getValue());
          return (
            <span className="block">
              {label && <span className="block text-xs text-[#1A1F2A]">{label}</span>}
              <code className="font-mono text-[10px] text-[#3D4F63]/60">{info.getValue()}</code>
            </span>
          );
        },
      }),
      helper.accessor("locale", {
        header: t("col_language"),
        filterFn: "equals",
        cell: (info) => (
          <span className="rounded bg-[#3D4F63]/10 px-2 py-0.5 font-mono text-[10px] uppercase text-[#3D4F63]">
            {langLabel(info.getValue())}
          </span>
        ),
      }),
      helper.accessor("section", {
        header: t("col_section"),
        filterFn: "equals",
        cell: (info) => (
          <span className="font-mono text-[10px] uppercase text-[#3D4F63]/70">
            {sectionLabel(info.getValue())}
          </span>
        ),
      }),
      helper.display({
        id: "content",
        header: t("col_text"),
        cell: ({ row }) => (
          <textarea
            value={row.original._draft}
            onChange={(e) => {
              const v = e.target.value;
              setRows((rs) =>
                rs.map((r) => (r.id === row.original.id ? { ...r, _draft: v } : r)),
              );
            }}
            rows={3}
            className="w-full rounded border border-[#3D4F63]/20 bg-white px-2 py-1 font-sans text-sm text-[#1A1F2A] focus:border-[#3D4F63] focus:outline-none"
          />
        ),
      }),
      helper.accessor("updated_at", {
        header: t("col_updated"),
        cell: (info) => (
          <span className="font-mono text-[10px] text-[#3D4F63]/60">
            {formatDateTimeShort(info.getValue())}
          </span>
        ),
      }),
      helper.display({
        id: "action",
        header: "",
        cell: ({ row }) => {
          const r = row.original;
          const dirty = r._draft !== r.content;
          return (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => save(r.id)}
                disabled={!dirty || r._saving}
                className="rounded bg-[#3D4F63] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F5EFE1] transition-colors hover:bg-[#2D3F53] disabled:opacity-40"
              >
                {r._saving ? t("busy") : t("save")}
              </button>
              {r._error && (
                <span className="font-mono text-[10px] text-red-600">{r._error}</span>
              )}
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnFilters: filters },
    onColumnFiltersChange: setFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const localeFilter = (filters.find((f) => f.id === "locale")?.value as string) ?? "";
  const sectionFilter = (filters.find((f) => f.id === "section")?.value as string) ?? "";

  function setFilter(id: string, value: string) {
    setFilters((prev) => {
      const out = prev.filter((f) => f.id !== id);
      if (value) out.push({ id, value });
      return out;
    });
  }

  if (initial.length === 0) {
    // Avertissement sans commande technique (audit oct. 2026).
    return (
      <div className="rounded-lg border border-dashed border-[#3D4F63]/30 bg-white p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63]/70">
          {notices("cms_empty_title")}
        </p>
        <p className="mt-2 text-sm text-[#3D4F63]">{notices("cms_empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#3D4F63]/15 bg-white p-3">
        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          {t("filter_language")}
          <select
            value={localeFilter}
            onChange={(e) => setFilter("locale", e.target.value)}
            className="rounded border border-[#3D4F63]/20 bg-white px-2 py-1 font-sans text-xs"
          >
            <option value="">{t("filter_all")}</option>
            <option value="fr">{t("lang_fr")}</option>
            <option value="en">{t("lang_en")}</option>
            <option value="de">{t("lang_de")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
          {t("filter_section")}
          <select
            value={sectionFilter}
            onChange={(e) => setFilter("section", e.target.value)}
            className="rounded border border-[#3D4F63]/20 bg-white px-2 py-1 font-sans text-xs"
          >
            <option value="">{t("filter_all")}</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {sectionLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
          {t("rows_count", { shown: table.getRowModel().rows.length, total: initial.length })}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-[#3D4F63]/15 bg-[#F5EFE1]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-[#3D4F63]/10 last:border-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
