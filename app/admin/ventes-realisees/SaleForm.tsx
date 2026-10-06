"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Formulaire vente realisee : modes "create" (POST /api/admin/ventes-realisees)
// et "edit" (PATCH /api/admin/ventes-realisees/[id]). En edition, les champs
// sont pre-remplis via `initial` et on redirige vers la liste apres succes.

type Agent = "julien" | "frederic";

interface State {
  property_type: string;
  surface_habitable: string;
  surface_terrain: string;
  chambres: string;
  classe_energie: string;
  annee_construction: string;
  etat: string;
  adresse: string;
  commune: string;
  prix_vente: string;
  date_acte: string;
  agent: Agent;
  notes: string;
}

const emptyState: State = {
  property_type: "appartement",
  surface_habitable: "",
  surface_terrain: "",
  chambres: "",
  classe_energie: "",
  annee_construction: "",
  etat: "",
  adresse: "",
  commune: "",
  prix_vente: "",
  date_acte: new Date().toISOString().slice(0, 10),
  agent: "julien",
  notes: "",
};

const PROPERTY_TYPES = [
  "appartement",
  "maison",
  "penthouse",
  "duplex",
  "villa",
  "immeuble",
  "terrain",
];

const ENERGIES = ["A+", "A", "B", "C", "D", "E", "F", "G", "H", "I"];

const ETATS = ["neuf", "renove", "bon", "a_renover"];

export function SaleForm({
  mode = "create",
  saleId,
  initial,
}: {
  mode?: "create" | "edit";
  saleId?: string;
  initial?: Partial<State>;
}) {
  const t = useTranslations("admin_sales");
  const router = useRouter();
  const [data, setData] = useState<State>({ ...emptyState, ...initial });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof State>(key: K, value: State[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);
    try {
      const url =
        mode === "edit" && saleId
          ? `/api/admin/ventes-realisees/${saleId}`
          : "/api/admin/ventes-realisees";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          surface_habitable: Number(data.surface_habitable) || 0,
          surface_terrain: data.surface_terrain
            ? Number(data.surface_terrain)
            : null,
          chambres: data.chambres ? Number(data.chambres) : null,
          annee_construction: data.annee_construction
            ? Number(data.annee_construction)
            : null,
          prix_vente: Number(data.prix_vente) || 0,
        }),
      });
      if (!res.ok) {
        const code = await res
          .json()
          .then((j: { error?: string }) => j?.error ?? "")
          .catch(() => "");
        const reason =
          res.status === 401 || res.status === 403
            ? t("errors.session")
            : code === "missing_or_invalid_fields" || code === "invalid"
              ? t("errors.invalidFields")
              : t("errors.server");
        throw new Error(t("form.saveFailed", { reason }));
      }
      setSuccess(true);
      if (mode === "edit") {
        router.push("/admin/ventes-realisees");
        router.refresh();
      } else {
        setData(emptyState);
        router.refresh();
      }
    } catch (e) {
      setError(
        e instanceof TypeError
          ? t("form.saveFailed", { reason: t("errors.network") })
          : (e as Error).message,
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("form.type")}>
          <select
            value={data.property_type}
            onChange={(e) => set("property_type", e.target.value)}
            className={inputCls}
          >
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {t(`propertyType.${pt}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("form.livingSurface")}>
          <input
            type="number"
            min="1"
            required
            value={data.surface_habitable}
            onChange={(e) => set("surface_habitable", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("form.landSurface")}>
          <input
            type="number"
            min="0"
            value={data.surface_terrain}
            onChange={(e) => set("surface_terrain", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("form.bedrooms")}>
          <input
            type="number"
            min="0"
            value={data.chambres}
            onChange={(e) => set("chambres", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("form.energy")}>
          <select
            value={data.classe_energie}
            onChange={(e) => set("classe_energie", e.target.value)}
            className={inputCls}
          >
            <option value="">{t("form.notProvided")}</option>
            {ENERGIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("form.yearBuilt")}>
          <input
            type="number"
            min="1700"
            max="2100"
            value={data.annee_construction}
            onChange={(e) => set("annee_construction", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("form.state")}>
          <select
            value={data.etat}
            onChange={(e) => set("etat", e.target.value)}
            className={inputCls}
          >
            <option value="">{t("form.notProvided")}</option>
            {ETATS.map((e) => (
              <option key={e} value={e}>
                {t(`state.${e}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("form.commune")}>
          <input
            type="text"
            required
            value={data.commune}
            onChange={(e) => set("commune", e.target.value)}
            placeholder={t("form.communePlaceholder")}
            className={inputCls}
          />
        </Field>
        <Field label={t("form.address")}>
          <input
            type="text"
            required
            value={data.adresse}
            onChange={(e) => set("adresse", e.target.value)}
            placeholder={t("form.addressPlaceholder")}
            className={inputCls}
          />
        </Field>
        <Field label={t("form.price")}>
          <input
            type="number"
            min="1"
            required
            value={data.prix_vente}
            onChange={(e) => set("prix_vente", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("form.deedDate")}>
          <input
            type="date"
            required
            value={data.date_acte}
            onChange={(e) => set("date_acte", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={t("form.agent")}>
          <select
            value={data.agent}
            onChange={(e) => set("agent", e.target.value as Agent)}
            className={inputCls}
          >
            <option value="julien">{t("agent.julien")}</option>
            <option value="frederic">{t("agent.frederic")}</option>
          </select>
        </Field>
      </div>
      <Field label={t("form.notes")}>
        <textarea
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          placeholder={t("form.notesPlaceholder")}
          className={`${inputCls} resize-y`}
        />
      </Field>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          {mode === "edit" ? t("form.updated") : t("form.created")}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {mode === "edit" && (
          <button
            type="button"
            onClick={() => router.push("/admin/ventes-realisees")}
            className="rounded border border-[#3D4F63]/30 px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63]"
          >
            {t("form.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[#9E7B2A] px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white disabled:opacity-50"
        >
          {pending
            ? t("form.saving")
            : mode === "edit"
              ? t("form.saveChanges")
              : t("form.add")}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded border border-[#3D4F63]/30 bg-white px-3 py-1.5 text-sm focus:border-[#9E7B2A] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
        {label}
      </span>
      {children}
    </label>
  );
}
