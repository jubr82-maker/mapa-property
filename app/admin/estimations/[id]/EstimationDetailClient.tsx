"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDateTime } from "@/lib/datetime";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { sendRefinement } from "@/app/admin/estimations/actions";
import { MethodDetails } from "@/components/admin/MethodDetails";

type MethodKey =
  | "observatoire"
  | "sales_comparison"
  | "hedonic"
  | "income_capitalization"
  | "depreciated_replacement"
  | "statec_reference";

type Status = "new" | "in_progress" | "avis_sent" | "mandate_signed" | "closed";

interface MethodResult {
  applicable: boolean;
  price: number | null;
  details: Record<string, unknown>;
  warnings: string[];
}

interface Props {
  id: string;
  status: Status;
  notes: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactName: string | null;
  consent: boolean;
  rgpdConsentAt?: string | null;
  refinementSentAt: string | null;
  methods: Record<string, MethodResult>;
  weightsInitial: Record<string, number>;
  statusLabels: Record<string, string>;
  methodLabels: Record<string, string>;
}

type RefinementFeedback =
  | { kind: "sent"; sentAt: string }
  | { kind: "error"; message: string }
  | null;

const METHOD_ORDER: MethodKey[] = [
  "observatoire",
  "hedonic",
  "statec_reference",
  "sales_comparison",
  "depreciated_replacement",
  "income_capitalization",
];

const STATUS_FLOW: Status[] = [
  "new",
  "in_progress",
  "avis_sent",
  "mandate_signed",
  "closed",
];

function fmtPrice(n: number | null) {
  if (n == null) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function roundDisplay(n: number) {
  return Math.round(n / 10000) * 10000;
}

export function EstimationDetailClient({
  id,
  status: initialStatus,
  notes: initialNotes,
  contactEmail,
  contactPhone,
  contactName,
  consent,
  rgpdConsentAt,
  refinementSentAt: initialRefinementSentAt,
  methods,
  weightsInitial,
  statusLabels,
  methodLabels,
}: Props) {
  const t = useTranslations("admin_estimations");
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [refinementSentAt, setRefinementSentAt] = useState<string | null>(
    initialRefinementSentAt,
  );
  const [refinementFeedback, setRefinementFeedback] =
    useState<RefinementFeedback>(null);
  const [isSendingRefinement, startRefinementTransition] = useTransition();
  const [weights, setWeights] = useState<Record<MethodKey, number>>({
    observatoire: weightsInitial.observatoire ?? 1.0,
    sales_comparison: weightsInitial.sales_comparison ?? 0,
    hedonic: weightsInitial.hedonic ?? 0,
    income_capitalization: weightsInitial.income_capitalization ?? 0,
    depreciated_replacement: weightsInitial.depreciated_replacement ?? 0,
    statec_reference: weightsInitial.statec_reference ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const recomputed = useMemo(() => {
    const applicable = METHOD_ORDER.filter(
      (k) => methods[k]?.applicable && methods[k]?.price != null,
    );
    const totalW = applicable.reduce((s, k) => s + weights[k], 0);
    if (totalW === 0) return { weighted: 0, low: 0, mid: 0, high: 0 };
    let weighted = 0;
    for (const k of applicable) {
      const w = weights[k] / totalW;
      weighted += (methods[k].price as number) * w;
    }
    weighted = Math.round(weighted);
    // Fourchette indicative ±10% (confiance moyenne par défaut sur ajustement manuel)
    return {
      weighted,
      low: roundDisplay(weighted * 0.9),
      mid: roundDisplay(weighted),
      high: roundDisplay(weighted * 1.1),
    };
  }, [methods, weights]);

  // Message lisible à partir du code d'erreur renvoyé par l'API.
  async function errorMessage(res: Response): Promise<string> {
    const code = await res
      .json()
      .then((j: { error?: string }) => j?.error ?? "")
      .catch(() => "");
    if (code === "not_found") return t("errors.notFound");
    if (code === "invalid_status") return t("errors.invalidStatus");
    if (code === "feature_unavailable") return t("errors.deleteUnavailable");
    if (res.status === 401 || res.status === 403) return t("errors.sessionExpired");
    return t("errors.saveFailed");
  }

  async function patchEstimation(payload: Record<string, unknown>) {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/admin/estimations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setSavedMsg(await errorMessage(res));
        return;
      }
      setSavedMsg(t("detail.saved"));
      router.refresh();
    } catch (e) {
      setSavedMsg(t("errors.network", { message: (e as Error).message }));
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 4000);
    }
  }

  async function deleteEstimation() {
    if (
      !window.confirm(t("detail.deleteConfirm"))
    )
      return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/admin/estimations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setSavedMsg(await errorMessage(res));
        return;
      }
      router.push("/admin/estimations");
      router.refresh();
    } catch (e) {
      setSavedMsg(t("errors.network", { message: (e as Error).message }));
    } finally {
      setSaving(false);
    }
  }

  function setSliderValue(k: MethodKey, v: number) {
    setWeights((prev) => ({ ...prev, [k]: v }));
  }

  function resetDefaultWeights() {
    setWeights({
      observatoire: 1.0,
      sales_comparison: 0,
      hedonic: 0,
      income_capitalization: 0,
      depreciated_replacement: 0,
      statec_reference: 0,
    });
  }

  return (
    <>
      {/* Bloc contact + suivi */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-5">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
            {t("detail.contactTitle")}
          </h2>
          <dl className="space-y-2 text-sm">
            {contactName && (
              <div className="flex justify-between gap-3">
                <dt className="text-[#1A1F2A]/60">{t("detail.name")}</dt>
                <dd className="font-medium text-[#1A1F2A]">{contactName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-[#1A1F2A]/60">{t("detail.email")}</dt>
              <dd className="font-medium text-[#1A1F2A]">
                {contactEmail ? (
                  <a className="underline hover:text-[#9E7B2A]" href={`mailto:${contactEmail}`}>
                    {contactEmail}
                  </a>
                ) : (
                  t("notProvided")
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#1A1F2A]/60">{t("detail.phone")}</dt>
              <dd className="font-mono text-[#1A1F2A]">
                {contactPhone ? (
                  <a className="underline hover:text-[#9E7B2A]" href={`tel:${contactPhone}`}>
                    {contactPhone}
                  </a>
                ) : (
                  t("notProvided")
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#1A1F2A]/60">{t("detail.consent")}</dt>
              <dd
                className={
                  rgpdConsentAt || consent
                    ? "text-emerald-700"
                    : "text-red-700"
                }
              >
                {rgpdConsentAt
                  ? t("detail.consentGivenOn", { date: formatDateTime(rgpdConsentAt) })
                  : consent
                    ? t("detail.consentGiven")
                    : t("detail.consentMissing")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-5">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
            {t("detail.followUpTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s) => {
              const isActive = s === status;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={saving || isActive}
                  onClick={() => {
                    setStatus(s);
                    patchEstimation({ status: s });
                  }}
                  className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    isActive
                      ? "border-[#9E7B2A] bg-[#9E7B2A] text-white"
                      : "border-[#3D4F63]/30 bg-white text-[#3D4F63] hover:border-[#9E7B2A] hover:text-[#9E7B2A]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {statusLabels[s]}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <label className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
              {t("detail.notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (initialNotes ?? "")) {
                  patchEstimation({ notes });
                }
              }}
              rows={3}
              placeholder={t("detail.notesPlaceholder")}
              className="mt-1 w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 text-sm text-[#1A1F2A] focus:border-[#9E7B2A] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Bloc "Proposer un affinage au client".
          Bouton desactive si consent absent OU mail deja envoye.
          Server action sendRefinement (auth check + garde-fous DB). */}
      <section className="rounded-lg border border-[#3D4F63]/15 bg-white p-5">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
          {t("refinement.title")}
        </h2>
        {(() => {
          const noEmail = !contactEmail;
          const noConsent = consent !== true;
          const alreadySent = refinementSentAt != null;
          const disabled =
            noEmail || noConsent || alreadySent || isSendingRefinement;
          let helper: string | null = null;
          if (noEmail) {
            helper = t("refinement.noEmail");
          } else if (noConsent) {
            helper = t("refinement.noConsent");
          } else if (alreadySent) {
            helper = t("refinement.sentOn", { date: formatDateTime(refinementSentAt as string) });
          }
          return (
            <>
              <p className="text-sm text-[#1A1F2A]/70">
                {t("refinement.intro")}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setRefinementFeedback(null);
                    startRefinementTransition(async () => {
                      const res = await sendRefinement(id);
                      if (res.ok) {
                        setRefinementSentAt(res.sentAt);
                        setRefinementFeedback({
                          kind: "sent",
                          sentAt: res.sentAt,
                        });
                        router.refresh();
                        return;
                      }
                      const msg =
                        res.reason === "no_email"
                          ? t("refinement.noEmail")
                          : res.reason === "no_consent"
                            ? t("refinement.noConsent")
                            : res.reason === "already_sent"
                              ? t("refinement.alreadySentOn", { date: formatDateTime(res.sentAt) })
                              : res.reason === "unauthorized"
                                ? t("errors.sessionExpired")
                                : res.reason === "not_found"
                                  ? t("errors.notFound")
                                  : t("errors.saveFailed");
                      setRefinementFeedback({ kind: "error", message: msg });
                    });
                  }}
                  className="rounded-full bg-[#9E7B2A] px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#e0af6e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingRefinement
                    ? t("refinement.sending")
                    : alreadySent
                      ? t("refinement.alreadySent")
                      : t("refinement.send")}
                </button>
                {helper && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#1A1F2A]/60">
                    {helper}
                  </p>
                )}
              </div>
              {refinementFeedback?.kind === "sent" && (
                <p className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  {t("refinement.sent", { date: formatDateTime(refinementFeedback.sentAt) })}
                </p>
              )}
              {refinementFeedback?.kind === "error" && (
                <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
                  {refinementFeedback.message}
                </p>
              )}
            </>
          );
        })()}
      </section>

      {/* Les 6 methodes - chacune avec son detail tabulaire repliable */}
      <section>
        <h2 className="mb-4 font-display text-lg font-bold text-[#1A1F2A]">
          {t("methods.title")}
        </h2>
        <p className="mb-4 text-xs text-[#1A1F2A]/60">
          {t("methods.intro")}
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {METHOD_ORDER.map((k) => {
            const m = methods[k];
            if (!m) return null;
            const isObservatoire = k === "observatoire";
            const cardClass = isObservatoire
              ? "rounded-lg border-2 border-gold bg-white p-5 shadow-sm md:col-span-2"
              : m.applicable
                ? "rounded-lg border border-ink/15 bg-white p-4"
                : "rounded-lg border border-ink/10 bg-bg/40 p-4";
            const priceClass = isObservatoire
              ? "mt-1 font-display text-3xl font-bold text-gold"
              : m.applicable
                ? "mt-1 font-display text-xl font-bold text-gold"
                : "mt-1 font-display text-base text-ink/30";
            return (
              <article key={k} className={cardClass}>
                <header className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gold">
                    {methodLabels[k] ?? k}
                    {isObservatoire && (
                      <span className="ml-2 rounded bg-gold/10 px-1.5 py-0.5 text-[9px] text-gold">
                        {t("methods.source")}
                      </span>
                    )}
                  </p>
                </header>
                <p className={priceClass}>
                  {m.applicable ? fmtPrice(m.price) : t("methods.notApplicable")}
                </p>
                {!m.applicable && (
                  <p className="mt-2 text-xs italic text-ink/60">
                    {(m.details as { reason?: string })?.reason ?? t("methods.noReason")}
                  </p>
                )}
                {m.applicable && m.details && (
                  <details className="mt-3" open={isObservatoire}>
                    <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-ink/60 hover:text-gold">
                      {t("methods.details")}
                    </summary>
                    <MethodDetails
                      methodKey={k}
                      details={m.details as Record<string, unknown>}
                    />
                  </details>
                )}
                {m.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[10px] text-amber-700">
                    {m.warnings.map((w, i) => (
                      <li key={i}>{t("methods.warning", { text: w })}</li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Curseurs de pondération */}
      <section className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#1A1F2A]">
              {t("weights.title")}
            </h2>
            <p className="mt-1 text-xs text-[#1A1F2A]/60">
              {t("weights.intro")}
            </p>
          </div>
          <button
            type="button"
            onClick={resetDefaultWeights}
            className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60 hover:text-[#9E7B2A]"
          >
            {t("weights.reset")}
          </button>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {METHOD_ORDER.map((k) => {
            const applicable = methods[k]?.applicable;
            return (
              <div key={k}>
                <div className="flex items-center justify-between text-sm">
                  <label
                    className={`font-mono text-[11px] uppercase tracking-widest ${
                      applicable ? "text-[#3D4F63]" : "text-[#1A1F2A]/30"
                    }`}
                  >
                    {methodLabels[k]}
                    {!applicable && ` ${t("weights.notApplicable")}`}
                  </label>
                  <span className="font-mono text-xs text-[#9E7B2A]">
                    {(weights[k] * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={weights[k]}
                  disabled={!applicable}
                  onChange={(e) => setSliderValue(k, Number(e.target.value))}
                  className="mt-1 w-full accent-[#9E7B2A] disabled:opacity-30"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#3D4F63]/10 pt-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
              {t("weights.newRange")}
            </p>
            <p className="mt-1 font-display text-xl font-bold text-[#9E7B2A]">
              {fmtPrice(recomputed.mid)}
            </p>
            <p className="font-mono text-[10px] text-[#1A1F2A]/60">
              {t("range", { low: fmtPrice(recomputed.low), high: fmtPrice(recomputed.high) })}
              {" · "}
              {t("weights.rawWeighted", { price: fmtPrice(recomputed.weighted) })}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              patchEstimation({
                weights_used: weights,
                client_output_override: {
                  price_low: recomputed.low,
                  price_mid: recomputed.mid,
                  price_high: recomputed.high,
                },
              })
            }
            className="rounded-md bg-[#9E7B2A] px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:bg-[#9E7B2A]/90 disabled:opacity-50"
          >
            {saving ? t("saving") : t("weights.save")}
          </button>
        </div>
        {savedMsg && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-emerald-700">
            {savedMsg}
          </p>
        )}
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-red-200 pt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-red-700/70">
            {t("detail.dangerZone")}
          </p>
          <button
            type="button"
            onClick={deleteEstimation}
            disabled={saving}
            className="rounded-full border border-red-300 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {t("detail.delete")}
          </button>
        </div>
      </section>
    </>
  );
}
