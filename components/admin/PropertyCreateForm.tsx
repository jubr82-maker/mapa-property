"use client";

/**
 * PropertyCreateForm : creation d'un bien saisi a la main (socle).
 *
 * Formulaire minimal de création d'un bien classique, calqué sur la
 * structure d'OffmarketForm.tsx (form action + FormData + Server Action
 * qui redirige, gestion des erreurs NEXT_REDIRECT). Champs de base
 * seulement (transaction, type, état, statut fixe brouillon, pays/ville,
 * titres, prix, référence interne). Le reste de la fiche se complete
 * ensuite dans PropertyEditForm.
 *
 * Server Action : createProperty (cf. app/admin/properties/actions.ts).
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createProperty } from "@/app/admin/properties/actions";
import {
  PROPERTY_TYPE_FAMILIES,
  PROPERTY_STATES,
  TRANSACTION_TYPES,
} from "@/lib/taxonomy/property-types";
import { CitySuggestInput } from "@/components/admin/CitySuggestInput";

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

// Codes pays enregistres ; libelles : admin_properties.country_XX.
const COUNTRIES = ["LU", "BE", "FR", "DE", "CH", "MC", "PT", "ES"] as const;

export function PropertyCreateForm({
  citySuggestions,
}: {
  /** Communes/localites luxembourgeoises proposees (cf. page parente). */
  citySuggestions: string[];
}) {
  const t = useTranslations("admin_properties");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [priceOnDemand, setPriceOnDemand] = useState(false);

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createProperty(formData);
        if (!result.ok) {
          // Codes d'erreur (ex. save_failed) traduits a l'affichage.
          setError(
            t.has(`err_code_${result.error}`) ? t(`err_code_${result.error}`) : result.error,
          );
        }
      } catch (e) {
        // Ne pas masquer redirect()/notFound() internes à Next : ils
        // doivent remonter pour que la navigation post-création s'exécute.
        if (isNextInternalError(e)) throw e;
        setError(
          e instanceof Error
            ? t("err_network", { message: e.message })
            : t("err_network_unknown"),
        );
      }
    });
  };

  return (
    <form action={submit} className="space-y-8">
      <Section title={t("section_identification")}>
        <Field label={t("field_status")}>
          <input
            value={t("status_draft_short")}
            disabled
            className={`${inputCls} bg-[#F5EFE1] cursor-not-allowed`}
          />
          <span className="mt-1 block text-xs text-[#3D4F63]/60">
            {t("create_status_hint")}
          </span>
        </Field>
        <Field label={t("field_internal_ref")} hint={t("hint_optional_free")}>
          <input name="internal_ref" className={inputCls} />
        </Field>
        <Field label={t("f_title_fr")} hint={t("hint_required")}>
          <input name="title_fr" required className={inputCls} />
        </Field>
        <Field label={t("f_title_en")} hint={t("hint_optional")}>
          <input name="title_en" className={inputCls} />
        </Field>
        <Field label={t("f_title_de")} hint={t("hint_optional")}>
          <input name="title_de" className={inputCls} />
        </Field>
      </Section>

      <Section title={t("section_type_state")}>
        <Field label={t("field_transaction")}>
          <select name="transaction" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              {t("choose")}
            </option>
            {TRANSACTION_TYPES.map((tx) => (
              <option key={tx.slug} value={tx.slug}>
                {tx.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("field_property_type")}>
          <select name="property_type" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              {t("choose")}
            </option>
            {PROPERTY_TYPE_FAMILIES.map((family) => (
              <optgroup key={family.label} label={family.label}>
                {family.types.map((pt) => (
                  <option key={pt.slug} value={pt.slug}>
                    {pt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label={t("field_property_state")} hint={t("hint_optional")}>
          <select name="property_state" defaultValue="" className={inputCls}>
            <option value="">{t("not_specified")}</option>
            {PROPERTY_STATES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title={t("section_location")}>
        <Field label={t("field_country")}>
          <select name="country" defaultValue="LU" className={inputCls}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {t(`country_${c}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("field_city")}>
          <CitySuggestInput
            name="city"
            suggestions={citySuggestions}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title={t("section_price")}>
        <Field label={t("field_price")}>
          <input
            type="number"
            name="price"
            min="0"
            step="1000"
            disabled={priceOnDemand}
            className={`${inputCls} disabled:opacity-50`}
          />
        </Field>
        <Field label={t("field_display")}>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="price_on_demand"
              checked={priceOnDemand}
              onChange={(e) => setPriceOnDemand(e.target.checked)}
              className="size-4 rounded border-[#3D4F63]/30 accent-[#e0af6e]"
            />
            <span className="text-sm text-[#3D4F63]/80">{t("price_on_demand")}</span>
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
          {busy ? t("creating") : t("create_submit")}
        </button>
      </footer>
    </form>
  );
}
