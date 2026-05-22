"use client";

import { useState, useTransition } from "react";
import {
  uploadDocument,
  toggleDocumentPublic,
  deleteDocument,
} from "@/app/admin/documents/actions";

type Doc = {
  id: string;
  title: string;
  category: string | null;
  file_url: string;
  is_public: boolean | null;
  created_at: string;
};

const CATEGORIES = ["mandat", "kyc", "cgu", "plaquette", "autre"];

export function DocumentsManager({ documents }: { documents: Doc[] }) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onUpload = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await uploadDocument(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <div className="space-y-6">
      <form action={onUpload} className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="mb-5 font-display text-xl font-bold text-[#3D4F63]">
          Nouvel upload
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Titre">
            <input
              name="title"
              required
              className="block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
            />
          </Field>
          <Field label="Catégorie">
            <select
              name="category"
              defaultValue="autre"
              className="block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fichier (PDF / image)">
            <input
              type="file"
              name="file"
              required
              accept="application/pdf,image/*"
              className="block w-full font-sans text-sm"
            />
          </Field>
          <Field label="Visibilité publique">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_public"
                className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
              />
              <span>Accessible aux visiteurs du site</span>
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
          {busy ? "Upload…" : "Uploader"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Public</th>
              <th className="px-4 py-3">Lien</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3D4F63]/10">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                  Aucun document.
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

function DocRow({ doc }: { doc: Doc }) {
  const [pub, setPub] = useState(!!doc.is_public);
  const [busy, startTransition] = useTransition();

  return (
    <tr className="hover:bg-[#3D4F63]/5">
      <td className="px-4 py-3 font-medium text-[#1A1F2A]">{doc.title}</td>
      <td className="px-4 py-3 text-xs uppercase tracking-wide text-[#3D4F63]/80">
        {doc.category ?? "—"}
      </td>
      <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
        {new Date(doc.created_at).toLocaleDateString("fr-FR")}
      </td>
      <td className="px-4 py-3">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={pub}
            disabled={busy}
            onChange={(e) => {
              const next = e.target.checked;
              setPub(next);
              startTransition(() => toggleDocumentPublic(doc.id, next));
            }}
            className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
          />
          {pub ? "Public" : "Privé"}
        </label>
      </td>
      <td className="px-4 py-3">
        <a
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e0af6e] hover:underline"
        >
          Ouvrir ↗
        </a>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!confirm("Supprimer ce document ?")) return;
            startTransition(() => deleteDocument(doc.id));
          }}
          className="rounded border border-red-200 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 hover:bg-red-50"
        >
          ✕
        </button>
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
