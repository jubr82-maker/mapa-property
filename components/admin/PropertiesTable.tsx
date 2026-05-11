"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  setPropertyPublished,
  setPropertyFeatured,
} from "@/app/admin/properties/actions";

type Row = {
  id: string;
  slug: string | null;
  title: string | null;
  city: string | null;
  country: string | null;
  transaction: string | null;
  price: number | null;
  surface: number | null;
  bedrooms: number | null;
  energy: string | null;
  cover: string | null;
  is_published: boolean;
  is_featured: boolean;
};

export function PropertiesTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#3D4F63]/15 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
          <tr>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Cover</th>
            <th className="px-4 py-3">Titre · Localisation</th>
            <th className="px-4 py-3">Transaction</th>
            <th className="px-4 py-3 text-right">Prix</th>
            <th className="px-4 py-3 text-right">Surface · CH</th>
            <th className="px-4 py-3 text-center">Publié</th>
            <th className="px-4 py-3 text-center">Coup de cœur</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#3D4F63]/10">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                Aucun bien.
              </td>
            </tr>
          ) : (
            rows.map((r) => <PropertyRow key={r.id} row={r} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function PropertyRow({ row }: { row: Row }) {
  const [pub, setPub] = useState(row.is_published);
  const [feat, setFeat] = useState(row.is_featured);
  const [busy, startTransition] = useTransition();

  const onPub = (next: boolean) => {
    setPub(next);
    startTransition(() => setPropertyPublished(row.id, next));
  };
  const onFeat = (next: boolean) => {
    setFeat(next);
    startTransition(() => setPropertyFeatured(row.id, next));
  };

  return (
    <tr className="hover:bg-[#3D4F63]/5">
      <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#B8865A]">
        {row.slug}
      </td>
      <td className="px-4 py-3">
        {row.cover ? (
          <div className="relative h-12 w-16 overflow-hidden rounded-md bg-[#3D4F63]/10">
            <Image src={row.cover} alt="" fill sizes="64px" className="object-cover" />
          </div>
        ) : (
          <div className="h-12 w-16 rounded-md bg-[#3D4F63]/10" />
        )}
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-[#1A1F2A]">{row.title ?? "—"}</p>
        <p className="text-xs text-[#3D4F63]/60">
          {[row.country, row.city].filter(Boolean).join(" · ")}
        </p>
      </td>
      <td className="px-4 py-3 text-xs uppercase tracking-wide text-[#3D4F63]/80">
        {row.transaction ?? "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs">
        {row.price ? row.price.toLocaleString("fr-FR") + " €" : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs">
        {row.surface ? `${row.surface} m²` : "—"} · {row.bedrooms ?? "—"} ch
      </td>
      <td className="px-4 py-3 text-center">
        <Switch checked={pub} onChange={onPub} busy={busy} />
      </td>
      <td className="px-4 py-3 text-center">
        <Switch checked={feat} onChange={onFeat} busy={busy} />
      </td>
    </tr>
  );
}

function Switch({
  checked,
  onChange,
  busy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={busy}
      aria-pressed={checked}
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-[#B8865A]" : "bg-[#3D4F63]/20"
      }`}
    >
      <span
        className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
