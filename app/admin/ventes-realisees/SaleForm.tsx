"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LISTING_FAMILIES, LISTING_TYPES } from "@/lib/listing/families";
import { LEGACY_SALE_TYPES, saleFieldRules, surfaceLabelKey } from "@/lib/admin/sale-fields";
import { LuLocalityCombobox } from "@/components/admin/LuLocalityCombobox";
import { resolveSaleCommune, type LuPlace } from "@/lib/geo/lu-place-match";
import {
  COMMISSION_MODES,
  DEFAULT_VAT_RATE,
  VAT_RATES,
  commissionAmounts,
  commissionFromRate,
  parseDecimalInput,
  type CommissionMode,
} from "@/lib/admin/sale-commission";
import { isUpcomingSale, luxembourgToday } from "@/lib/admin/sales-summary";

// Formulaire vente realisee : modes "create" (POST /api/admin/ventes-realisees)
// et "edit" (PATCH /api/admin/ventes-realisees/[id]). En edition, les champs
// sont pre-remplis via `initial` et on redirige vers la liste apres succes.
// Oct. 2026 : types de la liste fermee des fiches de biens, champs sans
// objet masques et surfaces facultatives selon le type
// (lib/admin/sale-fields.ts, memes regles que le serveur).
// Oct. 2026 : commune choisie dans la liste fermee des localites du
// Luxembourg (registre CACLR) ; la COMMUNE de la localite est enregistree,
// champ lu tel quel par le moteur d'estimation (comparaison par commune).
// Vente deja saisie : preremplie seulement si la correspondance est sure
// (lib/geo/lu-place-match.ts, resolveSaleCommune), rien n'est modifie en
// base avant l'enregistrement.
// Nov. 2026 : commission facultative (pourcentage du prix ou montant fixe
// HT) et TVA, calcul affiche en direct (lib/admin/sale-commission.ts, memes
// regles que le serveur). Champ vide : commission non renseignee.

// Julien Brebion est le seul agent (oct. 2026).
type Agent = "julien";

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
  commission_mode: CommissionMode;
  /** Saisie brute ("3" ou "3,5"), selon le mode. */
  commission_taux: string;
  commission_ht: string;
  tva_taux: string;
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
  commission_mode: "pourcentage",
  commission_taux: "",
  commission_ht: "",
  tva_taux: String(DEFAULT_VAT_RATE),
};

const MODE_LABEL: Record<CommissionMode, string> = { pourcentage: "form.commissionModePercent", montant_fixe: "form.commissionModeFixed" };

function fmtCents(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const ENERGIES = ["A+", "A", "B", "C", "D", "E", "F", "G", "H", "I"];

const ETATS = ["neuf", "renove", "bon", "a_renover"];

export function SaleForm({
  mode = "create",
  saleId,
  initial,
  luPlaces,
}: {
  mode?: "create" | "edit";
  saleId?: string;
  initial?: Partial<State>;
  /** Localites officielles du Luxembourg (liste legere, passee par la page). */
  luPlaces: LuPlace[];
}) {
  const t = useTranslations("admin_sales");
  const tp = useTranslations("admin_properties");
  const tn = useTranslations("admin_notices");
  const router = useRouter();
  const [data, setData] = useState<State>({ ...emptyState, ...initial });
  // Commune deja enregistree : correspondance officielle sure, sinon vide.
  const [place, setPlace] = useState<LuPlace | null>(() => resolveSaleCommune(luPlaces, initial?.commune));
  const [placeKey, setPlaceKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof State>(key: K, value: State[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const rules = saleFieldRules(data.property_type);
  // Ancienne valeur d'une vente deja enregistree : gardee telle quelle.
  const legacyType = (LEGACY_SALE_TYPES as readonly string[]).includes(data.property_type) ? data.property_type : null;

  // Commission : valeur saisie selon le mode (null = non renseignee).
  const percent = data.commission_mode === "pourcentage";
  const commissionValue = parseDecimalInput(percent ? data.commission_taux : data.commission_ht);
  const vatRate = Number(data.tva_taux);
  const price = Math.round(Number(data.prix_vente));
  const commissionError =
    commissionValue !== null && (Number.isNaN(commissionValue) || (percent && commissionValue > 100))
      ? t(percent ? "errors.commissionRate" : "errors.commissionAmount")
      : null;
  const commissionHt =
    commissionValue === null || commissionError ? null : percent ? (price > 0 ? commissionFromRate(price, commissionValue) : null) : commissionValue;
  const amounts = commissionHt === null ? null : commissionAmounts(commissionHt, vatRate);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!place) {
      setError(t("form.saveFailed", { reason: t("errors.communeNotOfficial") }));
      return;
    }
    if (commissionError) {
      setError(t("form.saveFailed", { reason: commissionError }));
      return;
    }
    setPending(true);
    try {
      const url =
        mode === "edit" && saleId
          ? `/api/admin/ventes-realisees/${saleId}`
          : "/api/admin/ventes-realisees";
      const method = mode === "edit" ? "PATCH" : "POST";
      // Champ sans objet pour le type : envoye vide.
      const shown = (f: keyof typeof rules, v: string) => (rules[f] === "hidden" ? "" : v);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          commune: place.commune,
          surface_habitable: shown("surface_habitable", data.surface_habitable) ? Number(data.surface_habitable) : null,
          surface_terrain: shown("surface_terrain", data.surface_terrain) ? Number(data.surface_terrain) : null,
          chambres: shown("chambres", data.chambres) ? Number(data.chambres) : null,
          classe_energie: shown("classe_energie", data.classe_energie),
          annee_construction: shown("annee_construction", data.annee_construction) ? Number(data.annee_construction) : null,
          etat: shown("etat", data.etat),
          prix_vente: Number(data.prix_vente) || 0,
          commission_mode: commissionValue === null ? null : data.commission_mode,
          commission_taux: commissionValue !== null && percent ? commissionValue : null,
          commission_ht: commissionValue !== null && !percent ? commissionValue : null,
          tva_taux: vatRate,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        const code = body?.error ?? "";
        const reason =
          res.status === 401 || res.status === 403
            ? t("errors.session")
            : code === "missing_or_invalid_fields" || code === "invalid"
              ? t("errors.invalidFields")
              : code === "commune_not_official"
                ? t("errors.communeNotOfficial")
              : code === "commission_mode_invalid"
                ? t("errors.commissionMode")
              : code === "commission_rate_invalid"
                ? t("errors.commissionRate")
              : code === "commission_amount_invalid"
                ? t("errors.commissionAmount")
              : code === "vat_rate_invalid"
                ? t("errors.vatRate")
              : code === "commission_unavailable"
                ? t("errors.commissionUnavailable")
              : body?.message || tn("err_http", { status: res.status });
        throw new Error(t("form.saveFailed", { reason }));
      }
      setSuccess(true);
      if (mode === "edit") {
        router.push("/admin/ventes-realisees");
        router.refresh();
      } else {
        setData(emptyState);
        setPlace(null);
        setPlaceKey((k) => k + 1);
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
            required
          >
            {legacyType ? <option value={legacyType}>{t(`propertyType.${legacyType}`)}</option> : null}
            {LISTING_FAMILIES.map((f) => (
              <optgroup key={f} label={tp(`family_${f}`)}>
                {LISTING_TYPES.filter((x) => x.family === f).map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {tp(`ptype_${x.slug}`)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        {rules.surface_habitable !== "hidden" ? (
        <Field label={t(surfaceLabelKey(data.property_type))}>
          <input
            type="number"
            min="1"
            required={rules.surface_habitable === "required"}
            value={data.surface_habitable}
            onChange={(e) => set("surface_habitable", e.target.value)}
            className={inputCls}
          />
        </Field>
        ) : null}
        {rules.surface_terrain !== "hidden" ? (
        <Field label={t("form.landSurface")}>
          <input
            type="number"
            min="1"
            required={rules.surface_terrain === "required"}
            value={data.surface_terrain}
            onChange={(e) => set("surface_terrain", e.target.value)}
            className={inputCls}
          />
        </Field>
        ) : null}
        {rules.chambres !== "hidden" ? (
        <Field label={t("form.bedrooms")}>
          <input
            type="number"
            min="0"
            value={data.chambres}
            onChange={(e) => set("chambres", e.target.value)}
            className={inputCls}
          />
        </Field>
        ) : null}
        {rules.classe_energie !== "hidden" ? (
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
        ) : null}
        {rules.annee_construction !== "hidden" ? (
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
        ) : null}
        {rules.etat !== "hidden" ? (
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
        ) : null}
        <Field label={t("form.commune")}>
          <LuLocalityCombobox
            key={placeKey}
            places={luPlaces}
            value={place}
            onChange={(p) => {
              setPlace(p);
              set("commune", p?.commune ?? "");
            }}
            className={inputCls}
          />
          {!place && mode === "edit" && initial?.commune && data.commune === initial.commune ? (
            <span className="text-xs text-[#3D4F63]/60">{t("form.communePrefillNone", { value: initial.commune })}</span>
          ) : null}
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
          {/* Nov. 2026 : date future acceptee (vente a venir), signalee seulement. */}
          {isUpcomingSale(data.date_acte, luxembourgToday()) && (
            <span className="text-xs text-[#9E7B2A]" data-sale-upcoming-hint>
              {t("form.upcomingHint")}
            </span>
          )}
        </Field>
        <Field label={t("form.agent")}>
          <select
            value={data.agent}
            onChange={(e) => set("agent", e.target.value as Agent)}
            className={inputCls}
          >
            <option value="julien">{t("agent.julien")}</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("form.commission")}>
          <select
            value={data.commission_mode}
            onChange={(e) => set("commission_mode", e.target.value as CommissionMode)}
            className={inputCls}
          >
            {COMMISSION_MODES.map((m) => (
              <option key={m} value={m}>
                {t(MODE_LABEL[m])}
              </option>
            ))}
          </select>
        </Field>
        {percent ? (
          <Field label={t("form.commissionRate")}>
            <input
              key="taux"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={data.commission_taux}
              onChange={(e) => set("commission_taux", e.target.value)}
              placeholder="3"
              aria-invalid={commissionError ? true : undefined}
              className={inputCls}
            />
          </Field>
        ) : (
          <Field label={t("form.commissionAmount")}>
            <input
              key="montant"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={data.commission_ht}
              onChange={(e) => set("commission_ht", e.target.value)}
              placeholder="15000"
              aria-invalid={commissionError ? true : undefined}
              className={inputCls}
            />
          </Field>
        )}
        <Field label={t("form.vat")}>
          <select value={data.tva_taux} onChange={(e) => set("tva_taux", e.target.value)} className={inputCls}>
            {VAT_RATES.map((r) => (
              <option key={r} value={String(r)}>
                {t("form.vatOption", { rate: r })}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div aria-live="polite" className="rounded border border-[#3D4F63]/15 bg-[#F5EFE1]/40 px-3 py-2 font-mono text-xs text-[#3D4F63]" data-sale-commission>
        {commissionError ? (
          <p className="text-red-700">{commissionError}</p>
        ) : amounts ? (
          <dl className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            <div>
              <dt className="inline">{t("form.commissionHt")} : </dt>
              <dd className="inline font-bold">{fmtCents(amounts.ht)}</dd>
            </div>
            <div>
              <dt className="inline">{t("form.commissionVat", { rate: vatRate })} : </dt>
              <dd className="inline font-bold">{fmtCents(amounts.tva)}</dd>
            </div>
            <div>
              <dt className="inline">{t("form.commissionTtc")} : </dt>
              <dd className="inline font-bold">{fmtCents(amounts.ttc)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-[#3D4F63]/70">{commissionValue !== null && percent ? t("form.commissionNeedsPrice") : t("form.commissionNone")}</p>
        )}
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
