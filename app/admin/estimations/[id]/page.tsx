import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { EstimationDetailClient } from "./EstimationDetailClient";

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

const METHOD_LABEL: Record<string, string> = {
  sales_comparison: "Comparaison directe",
  hedonic: "Hédoniste enrichi",
  income_capitalization: "Capitalisation locative",
  depreciated_replacement: "Coût de remplacement",
  statec_reference: "STATEC référentiel",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  avis_sent: "Avis envoyé",
  mandate_signed: "Mandat signé",
  closed: "Clos",
};

function fmtPrice(n?: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EstimationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/admin/login?from=/admin/estimations/${id}`);

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

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/estimations"
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#3D4F63]/60 hover:text-[#9E7B2A]"
          >
            ← Estimations EVS
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#1A1F2A]">
            Estimation #{r.id.slice(0, 8)}
          </h1>
          <p className="mt-1 font-mono text-xs text-[#1A1F2A]/60">
            {fmtDate(r.created_at)} · moteur{" "}
            <span className="font-semibold">
              {r.engine === "evs_5_methods" ? "EVS 5 méthodes" : "Hédoniste legacy"}
            </span>
            {r.locale && <> · locale {r.locale}</>}
          </p>
        </div>
        <div className="rounded-md border border-[#3D4F63]/15 bg-white px-4 py-3 text-right">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
            Prix retenu (client)
          </p>
          <p className="font-display text-2xl font-black text-[#9E7B2A]">
            {fmtPrice(r.client_output.price_mid)}
          </p>
          <p className="font-mono text-[10px] text-[#1A1F2A]/60">
            {fmtPrice(r.client_output.price_low)} – {fmtPrice(r.client_output.price_high)}
          </p>
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
        statusLabels={STATUS_LABEL}
        methodLabels={METHOD_LABEL}
      />

      {/* Inputs snapshot */}
      <section className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-[#1A1F2A]">
          Paramètres saisis
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
          {Object.entries(inputs).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-[#1A1F2A]/50">
                {k}
              </dt>
              <dd className="text-right text-[#1A1F2A]">
                {v === null || v === undefined
                  ? "—"
                  : typeof v === "boolean"
                    ? v
                      ? "oui"
                      : "non"
                    : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Indicateurs croisés */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
            Confidence
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
            {r.client_output.confidence}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[#1A1F2A]/60">
            Score {r.internal_output.confidence_score}/100
          </p>
        </div>
        <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
            Écart méthodes (σ)
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1A1F2A]">
            {r.internal_output.std_deviation_pct}%
          </p>
          <p className="mt-1 font-mono text-[10px] text-[#1A1F2A]/60">
            &lt; 8% HIGH, &lt; 15% MEDIUM, sinon LOW
          </p>
        </div>
        <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
            Prix pondéré
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1A1F2A]">
            {fmtPrice(r.internal_output.weighted_price)}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[#1A1F2A]/60">
            avant arrondi affichage
          </p>
        </div>
      </section>

      {/* Warnings globaux */}
      {r.internal_output.warnings?.length > 0 && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-2 font-display text-sm font-bold text-amber-900">
            ⚠ Warnings ({r.internal_output.warnings.length})
          </h3>
          <ul className="space-y-1 text-xs text-amber-900">
            {r.internal_output.warnings.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        </section>
      )}

      {/* PDF placeholder */}
      <section className="rounded-lg border border-dashed border-[#3D4F63]/30 bg-white p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
          Avis de Valeur PDF (TEGoVA EVS 9 pages)
        </p>
        <p className="mt-2 text-sm text-[#1A1F2A]/70">
          Génération PDF + upload Supabase Storage + email auto Resend — à venir
          en session dédiée (Phase 5).
        </p>
        <button
          type="button"
          disabled
          className="mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-[#3D4F63]/20 bg-[#3D4F63]/5 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-[#3D4F63]/40"
        >
          Générer Avis de Valeur (Phase 5)
        </button>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
