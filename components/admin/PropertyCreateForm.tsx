"use client";

/**
 * PropertyCreateForm — Sprint SAISIE-MANUELLE, étape A (socle création).
 *
 * Formulaire minimal de création d'un bien classique, calqué sur la
 * structure d'OffmarketForm.tsx (form action + FormData + Server Action
 * qui redirige, gestion des erreurs NEXT_REDIRECT). Champs de base
 * seulement (transaction, type, état, statut fixe brouillon, pays/ville,
 * titres, prix, référence interne) — le formulaire d'édition sera enrichi
 * séparément avec les 23 colonnes de la migration
 * 20260904_properties_saisie_manuelle.sql.
 *
 * Server Action : createProperty (cf. app/admin/properties/actions.ts).
 */

import { useState, useTransition } from "react";
import { createProperty } from "@/app/admin/properties/actions";
import {
  PROPERTY_TYPE_FAMILIES,
  PROPERTY_STATES,
  TRANSACTION_TYPES,
} from "@/lib/taxonomy/property-types";

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none";

function isNextInternalError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const digest = (e as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <h2 className="mb-5 font-display text-xl font-bold text-[#3D4F63]">
        {title}
      </h2>
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

const COUNTRIES = [
  { value: "LU", label: "Luxembourg" },
  { value: "BE", label: "Belgique" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Allemagne" },
  { value: "CH", label: "Suisse" },
  { value: "MC", label: "Monaco" },
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Espagne" },
];

export function PropertyCreateForm() {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [priceOnDemand, setPriceOnDemand] = useState(false);

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createProperty(formData);
        if (!result.ok) {
          setError(result.error);
        }
      } catch (e) {
        // Ne pas masquer redirect()/notFound() internes à Next — ils
        // doivent remonter pour que la navigation post-création s'exécute.
        if (isNextInternalError(e)) throw e;
        setError(
          e instanceof Error
            ? `Erreur réseau : ${e.message}. Vérifie ta connexion et réessaie.`
            : "Erreur réseau inconnue. Vérifie ta connexion.",
        );
      }
    });
  };

  return (
    <form action={submit} className="space-y-8">
      <Section title="Identification">
        <Field label="Statut">
          <input
            value="Brouillon"
            disabled
            className={`${inputCls} bg-[#F5EFE1] cursor-not-allowed`}
          />
          <span className="mt-1 block text-xs text-[#3D4F63]/60">
            Un bien neuf reste en brouillon — vous le publierez depuis la
            fiche d&apos;édition une fois complétée.
          </span>
        </Field>
        <Field label="Référence interne" hint="Facultatif — texte libre.">
          <input name="internal_ref" className={inputCls} />
        </Field>
        <Field label="Titre (FR)" hint="Requis.">
          <input name="title_fr" required className={inputCls} />
        </Field>
        <Field label="Titre (EN)" hint="Facultatif.">
          <input name="title_en" className={inputCls} />
        </Field>
        <Field label="Titre (DE)" hint="Facultatif.">
          <input name="title_de" className={inputCls} />
        </Field>
      </Section>

      <Section title="Type & état">
        <Field label="Transaction">
          <select name="transaction" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              — Choisir —
            </option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type de bien">
          <select name="property_type" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              — Choisir —
            </option>
            {PROPERTY_TYPE_FAMILIES.map((family) => (
              <optgroup key={family.label} label={family.label}>
                {family.types.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="État du bien" hint="Facultatif.">
          <select name="property_state" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {PROPERTY_STATES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Localisation">
        <Field label="Pays">
          <select name="country" defaultValue="LU" className={inputCls}>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ville">
          <input name="city" className={inputCls} />
        </Field>
      </Section>

      <Section title="Prix">
        <Field label="Prix (€)">
          <input
            type="number"
            name="price"
            min="0"
            step="1000"
            disabled={priceOnDemand}
            className={`${inputCls} disabled:opacity-50`}
          />
        </Field>
        <Field label="Affichage">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="price_on_demand"
              checked={priceOnDemand}
              onChange={(e) => setPriceOnDemand(e.target.checked)}
              className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
            />
            <span className="text-sm text-[#3D4F63]/80">Prix sur demande</span>
          </label>
        </Field>
      </Section>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-[#3D4F63]/15 pt-6">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
        >
          {busy ? "Création…" : "Créer le bien"}
        </button>
      </footer>
    </form>
  );
}
