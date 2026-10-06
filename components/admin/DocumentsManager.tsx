"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { formatDateTimeShort } from "@/lib/datetime";
import {
  uploadDocument,
  toggleDocumentPublic,
  deleteDocument,
} from "@/app/admin/documents/actions";
import { AdminListCard } from "@/components/admin/AdminListCard";
import { AdminSwitch } from "@/components/admin/AdminSwitch";

type Doc = {
  id: string;
  title: string;
  category: string | null;
  file_url: string;
  // URL signee (60 min), derivee du chemin du fichier a chaque rendu
  // serveur, jamais l'URL permanente file_url. Cf. lib/storage-signed-url.ts.
  signed_url: string | null;
  is_public: boolean | null;
  created_at: string;
};

const CATEGORIES = ["mandat", "kyc", "cgu", "plaquette", "autre"];

// Libelle traduit d'une categorie ; valeur brute si elle est inconnue.
function categoryLabel(t: ReturnType<typeof useTranslations>, c: string | null): string {
  if (!c) return "";
  return t.has(`cat_${c}`) ? t(`cat_${c}`) : c;
}

export function DocumentsManager({ documents }: { documents: Doc[] }) {
  const t = useTranslations("admin_documents");
  const tn = useTranslations("admin_notices");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onUpload = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await uploadDocument(formData);
        if (!r.ok) setError(r.error);
      } catch {
        setError(tn("err_network"));
      }
    });
  };

  return (
    <div className="space-y-6">
      <form action={onUpload} className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="mb-5 font-display text-xl font-bold text-[#3D4F63]">
          {t("add_title")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("field_title")}>
            <input
              name="title"
              required
              className="block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
            />
          </Field>
          <Field label={t("field_category")}>
            <select
              name="category"
              defaultValue="autre"
              className="block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(t, c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("field_file")}>
            <input
              type="file"
              name="file"
              required
              accept="application/pdf,image/*"
              className="block w-full font-sans text-sm"
            />
          </Field>
          <Field label={t("field_visibility")}>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_public"
                className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
              />
              <span>{t("visibility_hint")}</span>
            </label>
          </Field>
        </div>
        {error && (
          <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 rounded-full bg-[#3D4F63] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#e0af6e] disabled:opacity-50"
        >
          {busy ? t("busy") : t("submit")}
        </button>
      </form>

      <ul className="space-y-3 md:hidden" data-admin-list-cards>
        {documents.length === 0 ? (
          <li className="rounded-2xl border border-ink/15 bg-bg-soft p-5 text-center text-base text-ink-mid">{t("empty")}</li>
        ) : (
          documents.map((d) => <DocRow key={d.id} doc={d} variant="card" />)
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-[#3D4F63]/15 bg-white md:block">
        <table data-no-cards className="w-full text-sm">
          <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">{t("col_title")}</th>
              <th className="px-4 py-3">{t("col_category")}</th>
              <th className="px-4 py-3">{t("col_date")}</th>
              <th className="px-4 py-3">{t("col_visibility")}</th>
              <th className="px-4 py-3">{t("col_link")}</th>
              <th className="px-4 py-3">
                <span className="sr-only">{t("col_actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3D4F63]/10">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              documents.map((d) => <DocRow key={d.id} doc={d} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocRow({ doc, variant = "row" }: { doc: Doc; variant?: "row" | "card" }) {
  const t = useTranslations("admin_documents");
  const [pub, setPub] = useState(!!doc.is_public);
  const [busy, startTransition] = useTransition();
  // Motif reel d'un echec (action { ok, error }).
  const [rowError, setRowError] = useState<string | null>(null);
  const tn = useTranslations("admin_notices");
  const run = (action: () => Promise<{ ok: boolean; error?: string }>, undo?: () => void) => {
    setRowError(null);
    startTransition(async () => {
      try {
        const r = await action();
        if (!r.ok) {
          undo?.();
          setRowError(r.error ?? "");
        }
      } catch {
        undo?.();
        setRowError(tn("err_network"));
      }
    });
  };
  const setPublic = (next: boolean) => {
    setPub(next);
    run(() => toggleDocumentPublic(doc.id, next), () => setPub(!next));
  };
  const remove = () => {
    if (!confirm(t("delete_confirm"))) return;
    run(() => deleteDocument(doc.id));
  };

  // Telephone (seconde passe, oct. 2026) : carte compacte.
  if (variant === "card") {
    return (
      <AdminListCard
        title={doc.title}
        meta={[categoryLabel(t, doc.category), formatDateTimeShort(doc.created_at)].filter(Boolean).join(" · ")}
        controls={<AdminSwitch checked={pub} onChange={setPublic} disabled={busy} label={pub ? t("public") : t("private")} showLabel />}
        sub={rowError ?? undefined}
        actions={
          <div className="flex gap-2">
            {doc.signed_url ? (
              <a href={doc.signed_url} target="_blank" rel="noopener noreferrer" className="rounded border border-ink/20 text-[14px] text-ink">
                {t("open")}
              </a>
            ) : (
              <span className="rounded border border-ink/10 text-[14px] text-ink-mid">{t("unavailable")}</span>
            )}
            <button type="button" disabled={busy} onClick={remove} className="rounded border border-red-200 text-[14px] text-red-700">
              {t("delete")}
            </button>
          </div>
        }
      />
    );
  }

  return (
    <tr className="hover:bg-[#3D4F63]/5">
      <td className="px-4 py-3 font-medium text-[#1A1F2A]">{doc.title}</td>
      <td className="px-4 py-3 text-xs uppercase tracking-wide text-[#3D4F63]/80">
        {categoryLabel(t, doc.category)}
      </td>
      <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
        {formatDateTimeShort(doc.created_at)}
      </td>
      <td className="px-4 py-3">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={pub}
            disabled={busy}
            onChange={(e) => setPublic(e.target.checked)}
            className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
          />
          {pub ? t("public") : t("private")}
        </label>
      </td>
      <td className="px-4 py-3">
        {doc.signed_url ? (
          <a
            href={doc.signed_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e0af6e] hover:underline"
          >
            {t("open")}
          </a>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/40">
            {t("unavailable")}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          aria-label={t("delete")}
          title={t("delete")}
          className="rounded border border-red-200 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50"
        >
          ✕
        </button>
        {rowError && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {rowError}
          </p>
        )}
      </td>
    </tr>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
