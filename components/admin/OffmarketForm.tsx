"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  OFFMARKET_STATUSES,
  OFFMARKET_STATUS_LABELS,
  PROPERTY_TYPES,
  type OffmarketRow,
  generateOffmarketReference,
} from "@/lib/admin/offmarket";
import {
  createOffmarket,
  updateOffmarket,
  uploadOffmarketPhotos,
  reorderOffmarketPhotos,
  deleteOffmarket,
} from "@/app/admin/offmarket/actions";

type Tab = "identity" | "location" | "specs" | "content";

const TABS: { id: Tab; label: string }[] = [
  { id: "identity", label: "Identification & Statut" },
  { id: "location", label: "Localisation" },
  { id: "specs", label: "Caractéristiques" },
  { id: "content", label: "Contenu & Visuel" },
];

export function OffmarketForm({
  row,
  mode,
}: {
  row: OffmarketRow | null;
  mode: "create" | "edit";
}) {
  const [tab, setTab] = useState<Tab>("identity");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "create") {
          await createOffmarket(formData);
        } else if (row) {
          await updateOffmarket(row.id, formData);
        }
      } catch (e) {
        // Ne pas masquer les exceptions internes Next (redirect / notFound) —
        // elles doivent remonter pour que Next gère la navigation.
        if (isNextInternalError(e)) throw e;
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  };

  const ref = row?.reference ?? generateOffmarketReference();
  const photos =
    (row?.photo_urls as string[] | null) ??
    (row?.gallery_urls as string[] | null) ??
    [];

  return (
    <form action={submit} className="space-y-8">
      <nav className="flex flex-wrap gap-2 border-b border-[#3D4F63]/15 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${
              tab === t.id
                ? "bg-[#3D4F63] text-[#F5EFE1]"
                : "text-[#3D4F63] hover:bg-[#3D4F63]/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "identity" && (
        <Section title="Identification & Statut">
          <Field label="Référence" hint="Auto-générée. Modifiable.">
            <input
              name="reference"
              defaultValue={ref}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Statut">
            <select
              name="status"
              defaultValue={row?.status ?? "draft"}
              className={inputCls}
            >
              {OFFMARKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {OFFMARKET_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date de fin d'exclusivité">
            <input
              type="date"
              name="exclusive_until"
              defaultValue={row?.exclusive_until ?? ""}
              className={inputCls}
            />
          </Field>
          <Field
            label="URL du mandat signé"
            hint="Lien Supabase Storage (PDF) — upload manuel pour l'instant."
          >
            <input
              name="signed_mandate_url"
              defaultValue={row?.signed_mandate_url ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>
        </Section>
      )}

      {tab === "location" && (
        <Section title="Localisation">
          <Field label="Pays">
            <select name="country" defaultValue={row?.country ?? "LU"} className={inputCls}>
              <option value="LU">Luxembourg</option>
              <option value="BE">Belgique</option>
              <option value="FR">France</option>
              <option value="DE">Allemagne</option>
              <option value="CH">Suisse</option>
              <option value="MC">Monaco</option>
              <option value="PT">Portugal</option>
              <option value="ES">Espagne</option>
            </select>
          </Field>
          <Field label="Région" hint="Texte libre (canton, département…)">
            <input
              name="region"
              defaultValue={row?.region ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Ville réelle" hint="Visible uniquement après NDA signé.">
            <input
              name="city_real"
              defaultValue={row?.city_real ?? ""}
              className={inputCls}
            />
          </Field>
          <Field
            label="Ville anonymisée"
            hint="Affichée publiquement, ex : « Confidentiel · Luxembourg »."
          >
            <input
              name="city_anonymized"
              defaultValue={row?.city_anonymized ?? row?.city_label ?? "Confidentiel · Luxembourg"}
              className={inputCls}
            />
          </Field>
        </Section>
      )}

      {tab === "specs" && (
        <Section title="Caractéristiques">
          <Field label="Type">
            <select
              name="property_type"
              defaultValue={row?.property_type ?? "maison"}
              className={inputCls + " capitalize"}
              required
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Surface habitable (m²)">
            <input
              name="surface_habitable"
              type="number"
              min="0"
              defaultValue={
                row?.surface_habitable ?? row?.surface_hab ?? ""
              }
              className={inputCls}
            />
          </Field>
          <Field label="Surface terrain (m²)">
            <input
              name="surface_terrain"
              type="number"
              min="0"
              defaultValue={row?.surface_terrain ?? ""}
              className={inputCls}
            />
            {row?.surface_terrain ? (
              <p className="mt-1 text-xs text-[#3D4F63]/60">
                = {(row.surface_terrain / 100).toFixed(2)} ares
              </p>
            ) : null}
          </Field>
          <Field label="Chambres">
            <input
              name="chambres"
              type="number"
              min="0"
              defaultValue={row?.chambres ?? row?.bedrooms ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Salles de bain">
            <input
              name="salles_de_bain"
              type="number"
              min="0"
              defaultValue={row?.salles_de_bain ?? row?.bathrooms ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Classe énergétique">
            <select
              name="classe_energetique"
              defaultValue={row?.classe_energetique ?? row?.energy_class ?? ""}
              className={inputCls}
            >
              <option value="">—</option>
              {["A+", "A", "B", "C", "D", "E", "F", "G", "H", "I"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Prestations"
            hint="Séparées par des virgules ou retours à la ligne."
          >
            <textarea
              name="prestations"
              rows={3}
              defaultValue={(row?.prestations ?? row?.highlights ?? []).join(", ")}
              className={inputCls + " font-sans"}
              placeholder="Piscine, Garage, Ascenseur, Cave, Terrasse…"
            />
          </Field>
        </Section>
      )}

      {tab === "content" && (
        <Section title="Contenu & Visuel">
          <Field label="Titre">
            <input
              name="title"
              defaultValue={row?.title ?? ""}
              required
              className={inputCls}
            />
          </Field>
          <Field
            label="Description courte"
            hint="Aperçu public — 200 caractères max."
          >
            <textarea
              name="short_description"
              rows={3}
              maxLength={200}
              defaultValue={row?.short_description ?? row?.short_pitch ?? ""}
              className={inputCls + " font-sans"}
            />
          </Field>
          <Field
            label="Description complète"
            hint="Accessible après NDA signé."
          >
            <textarea
              name="full_description"
              rows={6}
              defaultValue={row?.full_description ?? row?.description ?? ""}
              className={inputCls + " font-sans"}
            />
          </Field>
          <Field
            label="Prix estimé (€)"
            hint="Privé — visible uniquement après NDA."
          >
            <input
              name="price_estimate"
              type="number"
              min="0"
              step="1000"
              defaultValue={row?.price_estimate ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Label prix public">
            <input
              name="price_label"
              defaultValue={row?.price_label ?? row?.price_display ?? "Prix sur demande"}
              className={inputCls}
            />
          </Field>
          <Field label="Verrouiller les photos">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="photos_locked"
                defaultChecked={row?.photos_locked ?? true}
                className="size-4 rounded border-[#3D4F63]/30"
              />
              <span>Afficher cadenas même après NDA</span>
            </label>
          </Field>

          {mode === "edit" && row && (
            <div className="md:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
                Photos
              </p>
              <PhotosManager id={row.id} photos={photos} />
            </div>
          )}
        </Section>
      )}

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#3D4F63]/15 pt-6">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#B8865A] disabled:opacity-50"
          >
            {busy ? "Enregistrement…" : mode === "create" ? "Créer le bien" : "Enregistrer"}
          </button>
          {mode === "edit" && row && (
            <Link
              href={`/fr/off-market/${row.id}`}
              target="_blank"
              className="rounded-full border border-[#3D4F63]/20 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
            >
              Aperçu public ↗
            </Link>
          )}
        </div>
        {mode === "edit" && row && (
          <DeleteButton id={row.id} />
        )}
      </footer>
    </form>
  );
}

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm text-[#1A1F2A] focus:border-[#B8865A] focus:outline-none";

function isNextInternalError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const digest = (e as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <h2 className="mb-5 font-display text-xl font-bold text-[#3D4F63]">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-[#3D4F63]/60">{hint}</span>}
    </label>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [busy, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!confirm("Supprimer ce bien off-market ? Cette action est irréversible.")) return;
        startTransition(async () => {
          try {
            await deleteOffmarket(id);
          } catch (e) {
            if (isNextInternalError(e)) throw e;
            console.error(e);
          }
        });
      }}
      className="rounded-full border border-red-200 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "…" : "Supprimer"}
    </button>
  );
}

function PhotosManager({ id, photos }: { id: string; photos: string[] }) {
  const [list, setList] = useState(photos);
  const [busy, startTransition] = useTransition();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("photos", f));
    startTransition(async () => {
      await uploadOffmarketPhotos(id, fd);
    });
    e.target.value = "";
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...list];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    startTransition(async () => {
      await reorderOffmarketPhotos(id, next);
    });
  };

  const remove = (url: string) => {
    const next = list.filter((u) => u !== url);
    setList(next);
    startTransition(async () => {
      await reorderOffmarketPhotos(id, next);
    });
  };

  return (
    <div className="mt-3 space-y-4">
      <label className="block rounded-xl border-2 border-dashed border-[#3D4F63]/20 bg-[#F5EFE1] p-6 text-center hover:border-[#B8865A]">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={onUpload}
          className="hidden"
        />
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63]">
          {busy ? "Upload en cours…" : "Cliquer pour ajouter des photos"}
        </p>
        <p className="mt-1 text-xs text-[#3D4F63]/60">JPG/PNG/WebP — la première sert de cover.</p>
      </label>

      {list.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((url, i) => (
            <li key={url} className="group relative overflow-hidden rounded-xl border border-[#3D4F63]/15 bg-white">
              <div className="relative aspect-[4/3]">
                <Image src={url} alt={`Photo ${i + 1}`} fill sizes="220px" className="object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#B8865A] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-2 text-[10px] uppercase tracking-[0.15em]">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busy}
                    className="rounded border border-[#3D4F63]/20 px-2 py-1 hover:border-[#B8865A] disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === list.length - 1 || busy}
                    className="rounded border border-[#3D4F63]/20 px-2 py-1 hover:border-[#B8865A] disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(url)}
                  className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
