import { notFound } from "next/navigation";
import { AdminDateCell } from "@/components/admin/AdminDateCell";
import Link from "next/link";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { EstimationDetailClient } from "./EstimationDetailClient";
import { PdfExportButton } from "@/components/admin/PdfExportButton";
import { ValueOpinionGenerator } from "@/components/admin/ValueOpinionGenerator";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { estimationInputEntries, formatInputNumber, type NumberFormatters } from "@/lib/estimation/display";
import { formatPrice, formatRateFraction } from "@/lib/format/numbers";

interface EstimationRow {
  id: string;
  inputs: Record<string, unknown>;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  consent: boolean;
  rgpd_consent_at?: string | null;
  refinement_sent_at?: string | null;
  client_output: {
    price_low: number;
    price_mid: number;
    price_high: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  internal_output: {
    methods: Record<
      string,
      {
        applicable: boolean;
        price: number | null;
        details: Record<string, unknown>;
        warnings: string[];
      }
    >;
    weighted_price: number;
    std_deviation_pct: number;
    confidence_score: number;
    warnings: string[];
    inputs_snapshot: Record<string, unknown>;
    weights_used: Record<string, number>;
    computed_at: string;
  };
  engine: string;
  status: "new" | "in_progress" | "avis_sent" | "mandate_signed" | "closed";
  notes: string | null;
  session_id: string | null;
  ip_hash: string | null;
  locale: string | null;
  created_at: string;
  updated_at: string;
}

const METHOD_KEYS = [
  "observatoire",
  "sales_comparison",
  "hedonic",
  "income_capitalization",
  "depreciated_replacement",
  "statec_reference",
];

const STATUS_KEYS = ["new", "in_progress", "avis_sent", "mandate_signed", "closed"];
const KNOWN_ENGINES = ["evs_5_methods", "hedonic_legacy", "manual_admin"];
const KNOWN_CONFIDENCES = ["HIGH", "MEDIUM", "LOW", "MANUAL"];
const KNOWN_LOCALES = ["fr", "en", "de"];

// Valeurs d'énumération traduites, par champ saisi (cf. namespace
// admin_estimations : propertyType, state, floorType, atypicalType, view).
const ENUM_GROUP_BY_INPUT: Record<string, string> = {
  type: "propertyType",
  state: "state",
  condition: "state",
  floorType: "floorType",
  atypicalType: "atypicalType",
  view: "view",
};

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function fmtPrice(n?: number | null) {
  if (n == null) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}


export default async function EstimationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_estimations" });
  const supabase = supabaseService();

  const { data: row, error } = await supabase
    .from("estimation_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) notFound();
  const r = row as EstimationRow;

  const inputs = (r.internal_output?.inputs_snapshot ?? r.inputs) as Record<
    string,
    unknown
  >;
  const methods = r.internal_output?.methods ?? {};
  const weights = r.internal_output?.weights_used ?? {};
  const empty = t("notProvided");
  const methodLabels: Record<string, string> = Object.fromEntries(
    METHOD_KEYS.map((k) => [k, t(`method.${k}`)]),
  );
  const statusLabels: Record<string, string> = Object.fromEntries(
    STATUS_KEYS.map((k) => [k, t(`status.${k}`)]),
  );
  const confidence = r.client_output.confidence as string;
  const confidenceText = KNOWN_CONFIDENCES.includes(confidence)
    ? t(`confidence.${confidence}`)
    : empty;

  const inputLabel = (k: string) =>
    t.has(`inputs.${k}`) ? t(`inputs.${k}`) : humanizeKey(k);
  // Nombres formates selon leur nature (surface, prix au m², rendement...),
  // jamais bruts (lib/estimation/display.ts).
  const numFmt: NumberFormatters = {
    price: (n) => formatPrice(n, ADMIN_LOCALE),
    decimal: (n, d) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n),
    percent: (f) => formatRateFraction(f, ADMIN_LOCALE),
    money: (n) => `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} €`,
    units: { sqm: t("units.sqm"), perSqm: t("units.perSqm"), perSqmMonth: t("units.perSqmMonth") },
  };
  const inputValue = (k: string, v: unknown): string => {
    if (v === null || v === undefined || v === "") return empty;
    if (typeof v === "boolean") return v ? t("yes") : t("no");
    if (typeof v === "number" && Number.isFinite(v)) return formatInputNumber(k, v, numFmt);
    const group = ENUM_GROUP_BY_INPUT[k];
    if (group && typeof v === "string" && t.has(`${group}.${v}`)) {
      return t(`${group}.${v}`);
    }
    if (Array.isArray(v)) {
      if (v.length === 0) return empty;
      if (v.every((x) => typeof x === "number")) {
        return (v as number[]).map((x) => formatInputNumber(k, x, numFmt)).join(", ");
      }
      if (v.every((x) => typeof x === "string" || typeof x === "number")) {
        return v.join(", ");
      }
      return t("inputs.itemsCount", { count: v.length });
    }
    if (typeof v === "object") {
      return Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x !== null && x !== undefined && x !== "")
        .map(([sk, x]) => `${inputLabel(sk)} : ${typeof x === "number" ? formatInputNumber(sk, x, numFmt) : String(x)}`)
        .join(" · ") || empty;
    }
    return String(v);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/estimations"
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#3D4F63]/60 hover:text-[#9E7B2A]"
          >
            ← {t("detail.back")}
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#1A1F2A]">
            {t("detail.title", { id: r.id.slice(0, 8) })}
          </h1>
          <div className="mt-1 font-mono text-xs text-[#1A1F2A]/60">
            <AdminDateCell
              createdAt={r.created_at}
              updatedAt={(row as { updated_at?: string | null }).updated_at}
              variant="long"
            />
          </div>
          <p className="mt-1 font-mono text-xs text-[#1A1F2A]/60">
            {t("detail.engineLabel")}{" "}
            <span className="font-semibold">
              {KNOWN_ENGINES.includes(r.engine) ? t(`engine.${r.engine}`) : r.engine}
            </span>
            {r.locale && (
              <>
                {" · "}
                {t("detail.language", {
                  language: KNOWN_LOCALES.includes(r.locale)
                    ? t(`language.${r.locale}`)
                    : r.locale,
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-[#3D4F63]/15 bg-white px-4 py-3 text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
              {t("detail.clientPrice")}
            </p>
            <p className="font-display text-2xl font-black text-[#9E7B2A]">
              {fmtPrice(r.client_output.price_mid)}
            </p>
            <p className="font-mono text-[10px] text-[#1A1F2A]/60">
              {t("range", {
                low: fmtPrice(r.client_output.price_low),
                high: fmtPrice(r.client_output.price_high),
              })}
            </p>
          </div>
          <PdfExportButton href={`/api/admin/exports/estimations/${r.id}`} />
        </div>
      </header>

      {/* Bloc Contact + Workflow status */}
      <EstimationDetailClient
        id={r.id}
        status={r.status}
        notes={r.notes}
        contactEmail={r.contact_email}
        contactPhone={r.contact_phone}
        contactName={r.contact_name}
        consent={r.consent}
        rgpdConsentAt={
          r.rgpd_consent_at ??
          ((r.inputs as { rgpdConsent?: boolean })?.rgpdConsent === true
            ? r.created_at
            : null)
        }
        refinementSentAt={r.refinement_sent_at ?? null}
        methods={methods}
        weightsInitial={weights}
        statusLabels={statusLabels}
        methodLabels={methodLabels}
      />

      {/* Inputs snapshot */}
      <section className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-[#1A1F2A]">
          {t("detail.inputsTitle")}
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
          {estimationInputEntries(inputs).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-[#1A1F2A]/50">
                {inputLabel(k)}
              </dt>
              <dd className="text-right text-[#1A1F2A]">
                {inputValue(k, v)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Indicateurs croisés */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
            {t("detail.confidence")}
          </p>
          <p
            className={`mt-1 font-display text-2xl font-bold ${
              r.client_output.confidence === "HIGH"
                ? "text-emerald-700"
                : r.client_output.confidence === "MEDIUM"
                  ? "text-[#9E7B2A]"
                  : "text-red-700"
            }`}
          >
            {confidenceText}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[#1A1F2A]/60">
            {t("detail.score", { score: r.internal_output.confidence_score ?? 0 })}
          </p>
        </div>
        <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
            {t("detail.spread")}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1A1F2A]">
            {r.internal_output.std_deviation_pct}%
          </p>
          <p className="mt-1 font-mono text-[10px] text-[#1A1F2A]/60">
            {t("detail.spreadHint")}
          </p>
        </div>
        <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
            {t("detail.weightedPrice")}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1A1F2A]">
            {fmtPrice(r.internal_output.weighted_price)}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[#1A1F2A]/60">
            {t("detail.beforeRounding")}
          </p>
        </div>
      </section>

      {/* Points d'attention globaux */}
      {r.internal_output.warnings?.length > 0 && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-2 font-display text-sm font-bold text-amber-900">
            {t("detail.warnings", { count: r.internal_output.warnings.length })}
          </h3>
          <ul className="space-y-1 text-xs text-amber-900">
            {r.internal_output.warnings.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Avis de valeur MAPA Property (PDF, 9 pages) : langue choisie a la
          generation, telechargement direct (aucun stockage), journal. */}
      <section className="rounded-lg border border-[#3D4F63]/15 bg-white p-6" data-admin-value-opinion>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
          {t("detail.avisTitle")}
        </p>
        <p className="mt-2 text-sm text-[#1A1F2A]/70">{t("detail.avisText")}</p>
        <ValueOpinionGenerator
          estimationId={r.id}
          defaultLang={(r.locale && KNOWN_LOCALES.includes(r.locale) ? r.locale : "fr") as "fr" | "en" | "de"}
        />
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
