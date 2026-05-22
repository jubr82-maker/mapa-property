import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

interface EstimationRow {
  id: string;
  inputs: Record<string, unknown>;
  client_output: { price_low?: number; price_mid?: number; price_high?: number; confidence?: string } | null;
  contact_email: string | null;
  contact_phone: string | null;
  engine: string;
  status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  avis_sent: "Avis envoyé",
  mandate_signed: "Mandat signé",
  closed: "Clos",
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-[#e0af6e]/15 text-[#9E7B2A]",
  in_progress: "bg-blue-500/15 text-blue-700",
  avis_sent: "bg-purple-500/15 text-purple-700",
  mandate_signed: "bg-emerald-500/15 text-emerald-700",
  closed: "bg-gray-500/15 text-gray-700",
};

function fmtPrice(n?: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
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

export default async function AdminEstimationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?from=/admin/estimations");

  const { data: rows, error } = await supabase
    .from("estimation_requests")
    .select(
      "id, inputs, client_output, contact_email, contact_phone, engine, status, created_at",
    )
    .neq("status", "deleted") // BUG 6 : masque les estimations soft-deleted
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#3D4F63]/60">
            Estimations EVS
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#1A1F2A]">
            Demandes d&apos;estimation
          </h1>
          <p className="mt-2 text-sm text-[#1A1F2A]/70">
            Les 100 dernières demandes reçues via /fr/services/estimer (moteur EVS 5 méthodes
            pour LU résidentiel, fallback hédoniste pour autres pays/types).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/estimations/new"
            className="rounded-full bg-[#9E7B2A] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#e0af6e]"
          >
            + Nouvelle estimation
          </Link>
          <div className="rounded-md border border-[#3D4F63]/15 bg-white px-4 py-2 text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
              Total affiché
            </p>
            <p className="font-display text-2xl font-bold text-[#3D4F63]">
              {rows?.length ?? 0}
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Erreur chargement : {error.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#F5EFE1] text-left font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Bien</th>
              <th className="px-4 py-3 text-right">Fourchette</th>
              <th className="px-4 py-3 text-center">Confidence</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Moteur</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {(rows as EstimationRow[] | null)?.map((r) => {
              const inputs = r.inputs as {
                type?: string;
                commune?: string;
                country?: string;
                livingSurface?: number | string;
                state?: string;
                energy?: string;
              };
              return (
                <tr
                  key={r.id}
                  className="cursor-pointer border-t border-[#3D4F63]/10 transition-colors hover:bg-[#F5EFE1]/40"
                  onClick={undefined}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-[#1A1F2A]/70 whitespace-nowrap">
                    <Link
                      href={`/admin/estimations/${r.id}`}
                      className="hover:text-[#9E7B2A] hover:underline"
                    >
                      {fmtDate(r.created_at)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/estimations/${r.id}`} className="block hover:text-[#9E7B2A]">
                      <div className="font-medium text-[#1A1F2A]">
                        {inputs.type ?? "—"} · {inputs.commune ?? inputs.country ?? "—"}
                      </div>
                      <div className="text-xs text-[#1A1F2A]/60">
                        {inputs.livingSurface ?? "—"} m² · {inputs.state ?? "—"} · CPE {inputs.energy ?? "—"}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="font-display text-base font-bold text-[#9E7B2A]">
                      {fmtPrice(r.client_output?.price_mid)}
                    </div>
                    <div className="font-mono text-[10px] text-[#1A1F2A]/60">
                      {fmtPrice(r.client_output?.price_low)} – {fmtPrice(r.client_output?.price_high)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                        r.client_output?.confidence === "HIGH"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : r.client_output?.confidence === "MEDIUM"
                            ? "bg-[#e0af6e]/15 text-[#9E7B2A]"
                            : "bg-red-500/15 text-red-700"
                      }`}
                    >
                      {r.client_output?.confidence ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.contact_email && (
                      <div className="text-[#1A1F2A] truncate max-w-[180px]">{r.contact_email}</div>
                    )}
                    {r.contact_phone && (
                      <div className="text-[#1A1F2A]/60 font-mono text-[11px]">{r.contact_phone}</div>
                    )}
                    {!r.contact_email && !r.contact_phone && (
                      <span className="text-[#1A1F2A]/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] text-[#1A1F2A]/60">
                      {r.engine === "evs_5_methods" ? "EVS" : "Hédoniste"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                        STATUS_COLOR[r.status] ?? STATUS_COLOR.new
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#1A1F2A]/50">
                  Aucune estimation reçue pour le moment.
                  <br />
                  <Link
                    href="/fr/services/estimer"
                    target="_blank"
                    className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-[#9E7B2A] hover:underline"
                  >
                    Tester le tunnel public →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest text-[#1A1F2A]/40">
        Cliquez sur une ligne pour ouvrir la vue détail (5 méthodes, ajustement pondération, workflow).
        Génération PDF Avis de Valeur → Phase 5 (session dédiée).
      </p>
    </div>
  );
}

export const dynamic = "force-dynamic";
