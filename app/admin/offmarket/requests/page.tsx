import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  type RequestStatus,
} from "@/lib/admin/offmarket";

export const dynamic = "force-dynamic";

export default async function GlobalRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; property?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("offmarket_requests")
    .select(
      "*, properties_offmarket!inner(id,reference,title,city_label,city_anonymized)",
    )
    .order("created_at", { ascending: false });

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.property) query = query.eq("property_id", sp.property);

  const { data: requests } = await query;
  const list = requests ?? [];

  const counts = REQUEST_STATUSES.reduce<Record<RequestStatus, number>>(
    (acc, s) => {
      acc[s] = list.filter((r) => r.status === s).length;
      return acc;
    },
    {} as Record<RequestStatus, number>,
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Off-Market
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          Toutes les demandes
        </h1>
        <p className="mt-1 text-sm text-[#3D4F63]/70">
          {list.length} demande{list.length > 1 ? "s" : ""}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/admin/offmarket/requests"
          className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
            !sp.status
              ? "bg-[#3D4F63] text-[#F5EFE1]"
              : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#B8865A]"
          }`}
        >
          Tous ({list.length})
        </Link>
        {REQUEST_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/offmarket/requests?status=${s}`}
            className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
              sp.status === s
                ? "bg-[#3D4F63] text-[#F5EFE1]"
                : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#B8865A]"
            }`}
          >
            {REQUEST_STATUS_LABELS[s]} ({counts[s]})
          </Link>
        ))}
      </nav>

      <div className="overflow-hidden rounded-2xl border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Demandeur</th>
              <th className="px-4 py-3">Bien</th>
              <th className="px-4 py-3 text-right">Budget</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3D4F63]/10">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                  Aucune demande.
                </td>
              </tr>
            ) : (
              list.map((r) => {
                const status = r.status as RequestStatus;
                const property = (r as { properties_offmarket?: { id: string; reference: string; title: string | null; city_label: string | null; city_anonymized: string | null } }).properties_offmarket;
                return (
                  <tr key={r.id} className="hover:bg-[#3D4F63]/5">
                    <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1A1F2A]">
                        {r.prenom} {r.nom}
                      </p>
                      <p className="text-xs text-[#3D4F63]/60">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {property ? (
                        <Link
                          href={`/admin/offmarket/${property.id}/requests`}
                          className="text-[#B8865A] hover:underline"
                        >
                          {property.reference}
                          <span className="ml-1 text-[#3D4F63]/60">
                            · {property.title ?? "—"}
                          </span>
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {r.budget_max_eur
                        ? r.budget_max_eur.toLocaleString("fr-FR") + " €"
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${REQUEST_STATUS_TONES[status]}`}
                      >
                        {REQUEST_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {property && (
                        <Link
                          href={`/admin/offmarket/${property.id}/requests`}
                          className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
                        >
                          Détails
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
