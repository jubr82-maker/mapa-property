"use client";

// Formulaire d'edition unique de la fiche
// mandat. Edite 10 champs en une seule submit via la server action
// updateMandat. Etat local controle, feedback inline succes/erreur.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateMandat, type UpdateMandatFields } from "@/app/admin/mandats/actions";

export type MandatEditable = {
  type_transaction: "vente" | "recherche" | "location";
  type_mandat: string | null;
  bien_adresse: string | null;
  bien_type: string | null;
  prix_mise_en_vente: number | null;
  commission: string | null;
  date_debut: string | null;
  date_fin: string | null;
  signed_at: string | null;
  status: string | null;
  notes: string | null;
};

// Valeurs enregistrees en base et cle de traduction (namespace "admin_mandats").
const TYPE_MANDAT_OPTS = [
  { value: "", key: "option_none" },
  { value: "exclusif", key: "type_mandat_exclusif" },
  { value: "semi-exclusif", key: "type_mandat_semi_exclusif" },
  { value: "simple", key: "type_mandat_simple" },
  { value: "autonome", key: "type_mandat_autonome" },
];

const STATUS_OPTS = [
  { value: "actif", key: "status_actif" },
  { value: "vendu", key: "status_vendu" },
  { value: "loue", key: "status_loue" },
  { value: "expire", key: "status_expire" },
  { value: "resilie", key: "status_resilie" },
];

export function EditMandatForm({
  id,
  initial,
}: {
  id: string;
  initial: MandatEditable;
}) {
  const t = useTranslations("admin_mandats");
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<MandatEditable>(initial);
  const [feedback, setFeedback] = useState<
    { kind: "saved" } | { kind: "error"; message: string } | null
  >(null);

  const set = <K extends keyof MandatEditable>(k: K, v: MandatEditable[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setFeedback(null);
      const fields: UpdateMandatFields = {
        // type_mandat n'est pertinent que pour les ventes, sinon laisser null.
        type_mandat:
          data.type_transaction === "vente" ? data.type_mandat : null,
        bien_adresse: data.bien_adresse,
        bien_type: data.bien_type,
        prix_mise_en_vente: data.prix_mise_en_vente,
        commission: data.commission,
        date_debut: data.date_debut,
        date_fin: data.date_fin,
        signed_at: data.signed_at,
        status: data.status,
        notes: data.notes,
      };
      const res = await updateMandat(id, fields);
      setFeedback(
        res.ok ? { kind: "saved" } : { kind: "error", message: errorMessage(res.error) },
      );
    });
  };

  // Codes d'erreur renvoyes par updateMandat, traduits a l'ecran.
  function errorMessage(code: string | undefined): string {
    if (code === "unauthorized") return t("error_unauthorized");
    if (code === "invalid_type_mandat") return t("error_invalid_type_mandat");
    if (code === "invalid_status") return t("error_invalid_status");
    return t("error_generic");
  }

  const isVente = data.type_transaction === "vente";
  const priceLabel =
    data.type_transaction === "location"
      ? t("form_rent")
      : t("form_price");

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-[#3D4F63]/15 bg-white p-5"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
        {t("form_title")}
      </p>

      {isVente && (
        <Field label={t("form_type_mandat")}>
          <select
            value={data.type_mandat ?? ""}
            onChange={(e) => set("type_mandat", e.target.value || null)}
            className={selectCls}
          >
            {TYPE_MANDAT_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.key)}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("form_address")}>
          <input
            type="text"
            value={data.bien_adresse ?? ""}
            onChange={(e) => set("bien_adresse", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("form_property_type")}>
          <input
            type="text"
            value={data.bien_type ?? ""}
            onChange={(e) => set("bien_type", e.target.value)}
            placeholder={t("form_property_type_placeholder")}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={priceLabel}>
          <input
            type="number"
            min={0}
            step={1000}
            value={data.prix_mise_en_vente ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              set("prix_mise_en_vente", v === "" ? null : Number(v));
            }}
            className={inputCls}
          />
        </Field>
        <Field label={t("form_commission")}>
          <input
            type="text"
            value={data.commission ?? ""}
            onChange={(e) => set("commission", e.target.value)}
            placeholder={t("form_commission_placeholder")}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("form_date_start")}>
          <input
            type="date"
            value={data.date_debut ?? ""}
            onChange={(e) => set("date_debut", e.target.value || null)}
            className={inputCls}
          />
        </Field>
        <Field label={t("form_date_end")}>
          <input
            type="date"
            value={data.date_fin ?? ""}
            onChange={(e) => set("date_fin", e.target.value || null)}
            className={inputCls}
          />
        </Field>
        <Field label={t("form_signed")}>
          <input
            type="date"
            value={data.signed_at ?? ""}
            onChange={(e) => set("signed_at", e.target.value || null)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label={t("form_status")}>
        <select
          value={data.status ?? "actif"}
          onChange={(e) => set("status", e.target.value)}
          className={selectCls}
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.key)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("form_notes")}>
        <textarea
          value={data.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className={textareaCls}
        />
      </Field>

      {feedback?.kind === "saved" && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {t("form_saved")}
        </p>
      )}
      {feedback?.kind === "error" && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
          {feedback.message}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-[#9E7B2A] px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
        >
          {isPending ? t("form_saving") : t("form_save")}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none";
const selectCls = inputCls + " appearance-none";
const textareaCls = inputCls + " w-full";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {label}
      </span>
      {children}
    </label>
  );
}
