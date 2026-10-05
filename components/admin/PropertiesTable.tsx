"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  setPropertyPublished,
  setPropertyFeatured,
  archiveProperty,
  restoreProperty,
  deleteProperty,
  purgePropertyMedia,
} from "@/app/admin/properties/actions";
import { formatPrice, formatSurface } from "@/lib/format/numbers";

type Row = {
  id: string;
  slug: string | null;
  title: string | null;
  city: string | null;
  country: string | null;
  transaction: string | null;
  /** Libelle traduit de la transaction (cote serveur). */
  transaction_label: string;
  price: number | null;
  surface: number | null;
  bedrooms: number | null;
  energy: string | null;
  cover: string | null;
  is_published: boolean;
  is_featured: boolean;
  /** "Archive le ..." (lib/datetime.ts, Europe/Luxembourg), onglet Archives. */
  archived_label?: string | null;
};

/** Libelles next-intl (admin_properties), resolus cote serveur. */
export type PropertiesTableLabels = {
  archive: string;
  restore: string;
  delete: string;
  purgeMedia: string;
  archivedCol: string;
  archiveConfirm: string;
  deleteTitle: string;
  deleteBodyTemplate: string;
  deleteInputLabel: string;
  deleteMismatch: string;
  cancel: string;
  deletedMediaTitle: string;
  deletedNoMedia: string;
  purgeConfirm: string;
  purgeDoneTemplate: string;
  errorTemplate: string;
  emptyList: string;
};

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

export function PropertiesTable({
  rows,
  mode = "active",
  archiveEnabled = false,
  labels,
}: {
  rows: Row[];
  mode?: "active" | "archived";
  archiveEnabled?: boolean;
  labels: PropertiesTableLabels;
}) {
  const t = useTranslations("admin_properties");
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  // Biens supprimes pendant la session : fichiers restants a supprimer
  // separement (affiches ici car la ligne disparait apres rafraichissement).
  const [deleted, setDeleted] = useState<{ reference: string; media: string[] }[]>([]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`/admin/properties?${next.toString()}`));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#3D4F63]/15 bg-white p-4">
        <input
          type="search"
          placeholder={t("search_placeholder")}
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
          className="min-w-[260px] flex-1 rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
        />
        <select
          value={sp.get("transaction") ?? ""}
          onChange={(e) => setParam("transaction", e.target.value)}
          className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
        >
          <option value="">{t("filter_transaction_all")}</option>
          <option value="sale">{t("transaction_sale")}</option>
          <option value="rent">{t("transaction_rent")}</option>
        </select>
      </div>

    {deleted.map((d) => (
      <div
        key={d.reference}
        className="rounded-md border border-[#3D4F63]/20 bg-[#3D4F63]/5 p-3 text-[11px] text-[#3D4F63]"
      >
        <p className="font-semibold">
          {d.reference} : {d.media.length ? labels.deletedMediaTitle : labels.deletedNoMedia}
        </p>
        {d.media.length > 0 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 font-mono break-all">
            {d.media.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        )}
      </div>
    ))}

    <div className="overflow-x-auto rounded-2xl border border-[#3D4F63]/15 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
          <tr>
            <th className="px-4 py-3">{t("col_reference")}</th>
            <th className="px-4 py-3">{t("col_photo")}</th>
            <th className="px-4 py-3">{t("col_title")}</th>
            <th className="px-4 py-3">{t("col_transaction")}</th>
            <th className="px-4 py-3 text-right">{t("col_price")}</th>
            <th className="px-4 py-3 text-right">{t("col_surface")}</th>
            {mode === "active" ? (
              <>
                <th className="px-4 py-3 text-center">{t("col_published")}</th>
                <th className="px-4 py-3 text-center">{t("col_featured")}</th>
              </>
            ) : (
              <th className="px-4 py-3" colSpan={2}>{labels.archivedCol}</th>
            )}
            <th>
              <span className="sr-only">{t("col_actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#3D4F63]/10">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                {labels.emptyList}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <PropertyRow
                key={r.id}
                row={r}
                mode={mode}
                archiveEnabled={archiveEnabled}
                labels={labels}
                onDeleted={(d) => setDeleted((prev) => [d, ...prev])}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}

function PropertyRow({
  row,
  mode,
  archiveEnabled,
  labels,
  onDeleted,
}: {
  row: Row;
  mode: "active" | "archived";
  archiveEnabled: boolean;
  labels: PropertiesTableLabels;
  onDeleted: (d: { reference: string; media: string[] }) => void;
}) {
  const t = useTranslations("admin_properties");
  const router = useRouter();
  const [pub, setPub] = useState(row.is_published);
  const [feat, setFeat] = useState(row.is_featured);
  const [busy, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typedRef, setTypedRef] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const reference = row.slug || row.id;

  const run = (
    action: () => Promise<{ ok: true; media?: string[]; purged?: number } | { ok: false; error: string }>,
    onDone?: (r: { media?: string[]; purged?: number }) => void,
  ) => {
    setMessage(null);
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        setMessage(
          r.error === "reference_mismatch"
            ? labels.deleteMismatch
            : fill(labels.errorTemplate, {
                // Codes d'erreur des actions traduits a l'affichage.
                message: t.has(`err_code_${r.error}`) ? t(`err_code_${r.error}`) : r.error,
              }),
        );
        return;
      }
      onDone?.(r);
      router.refresh();
    });
  };

  const onArchive = () => {
    if (window.confirm(labels.archiveConfirm)) run(() => archiveProperty(row.id));
  };
  const onRestore = () => run(() => restoreProperty(row.id));
  const onPurge = () => {
    if (window.confirm(labels.purgeConfirm)) {
      run(
        () => purgePropertyMedia(row.id),
        (r) => setMessage(fill(labels.purgeDoneTemplate, { count: r.purged ?? 0 })),
      );
    }
  };
  const onDelete = () => {
    if (typedRef.trim() !== reference) {
      setMessage(labels.deleteMismatch);
      return;
    }
    run(
      () => deleteProperty(row.id, typedRef),
      (r) => {
        setConfirmDelete(false);
        onDeleted({ reference, media: r.media ?? [] });
      },
    );
  };

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
      <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#e0af6e]">
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
        <p className="font-medium text-[#1A1F2A]">{row.title || t("untitled")}</p>
        <p className="text-xs text-[#3D4F63]/60">
          {[row.country, row.city].filter(Boolean).join(" · ")}
        </p>
      </td>
      <td className="px-4 py-3 text-xs uppercase tracking-wide text-[#3D4F63]/80">
        {row.transaction_label}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs">
        {row.price ? formatPrice(row.price, "fr") : ""}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs">
        {[
          row.surface ? formatSurface(row.surface, "fr") : "",
          row.bedrooms != null ? t("bedrooms_short", { count: row.bedrooms }) : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      </td>
      {mode === "active" ? (
        <>
          <td className="px-4 py-3 text-center">
            <Switch checked={pub} onChange={onPub} busy={busy} label={t("toggle_published")} />
          </td>
          <td className="px-4 py-3 text-center">
            <Switch checked={feat} onChange={onFeat} busy={busy} label={t("toggle_featured")} />
          </td>
        </>
      ) : (
        <td className="px-4 py-3 font-mono text-[11px] text-[#3D4F63]/80" colSpan={2}>
          {row.archived_label}
        </td>
      )}
      <td className="px-4 py-3 text-right">
        <div className="flex flex-wrap justify-end gap-1.5">
          <Link
            href={`/admin/properties/${row.id}`}
            className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("edit")}
          </Link>
          {mode === "active" ? (
            <>
              <Link
                href={`/fr/biens/${row.slug || row.id}`}
                target="_blank"
                className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("view")}
              </Link>
              <button type="button" onClick={onArchive} disabled={busy || !archiveEnabled} className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e] disabled:cursor-not-allowed disabled:opacity-40">
                {labels.archive}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onRestore} disabled={busy || !archiveEnabled} className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e] disabled:cursor-not-allowed disabled:opacity-40">
                {labels.restore}
              </button>
              <button type="button" onClick={onPurge} disabled={busy || !archiveEnabled} className="rounded border border-red-300 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
                {labels.purgeMedia}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(true);
                  setTypedRef("");
                  setMessage(null);
                }}
                disabled={busy || !archiveEnabled}
                className="rounded border border-red-300 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {labels.delete}
              </button>
            </>
          )}
        </div>
        {confirmDelete && (
          <div
            role="alertdialog"
            aria-label={labels.deleteTitle}
            className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-left text-xs text-red-900"
          >
            <p className="font-semibold">{labels.deleteTitle}</p>
            <p className="mt-1">{fill(labels.deleteBodyTemplate, { ref: reference })}</p>
            <label className="mt-2 block">
              <span className="sr-only">{labels.deleteInputLabel}</span>
              <input
                type="text"
                value={typedRef}
                onChange={(e) => setTypedRef(e.target.value)}
                placeholder={labels.deleteInputLabel}
                autoComplete="off"
                className="w-full rounded border border-red-300 bg-white px-2 py-1 font-mono text-xs text-[#1A1F2A]"
              />
            </label>
            <div className="mt-2 flex justify-end gap-1.5">
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e] disabled:cursor-not-allowed disabled:opacity-40">
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy || typedRef.trim() !== reference}
                className="rounded border border-red-300 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {labels.delete}
              </button>
            </div>
          </div>
        )}
        {message && <p className="mt-2 text-left text-xs text-red-700">{message}</p>}
      </td>
    </tr>
  );
}

function Switch({
  checked,
  onChange,
  busy,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  busy: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={busy}
      aria-pressed={checked}
      aria-label={label}
      title={label}
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-[#e0af6e]" : "bg-[#3D4F63]/20"
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
