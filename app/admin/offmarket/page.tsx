import Link from "next/link";
import Image from "next/image";
import {
  OFFMARKET_STATUS_LABELS,
  OFFMARKET_STATUS_TONES,
  type OffmarketStatus,
} from "@/lib/admin/offmarket";
import { fetchOffmarketAdminList } from "@/lib/admin/offmarket-server";
import { OffmarketListFilters } from "@/components/admin/OffmarketListFilters";

export default async function AdminOffmarketListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const all = await fetchOffmarketAdminList();

  const filtered = all.filter((row) => {
    if (sp.status && row.status !== sp.status) return false;
    if (sp.type && row.property_type !== sp.type) return false;
    if (sp.q) {
      const needle = sp.q.toLowerCase();
      const hay = `${row.reference ?? ""} ${row.title ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
            Off-Market
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Biens confidentiels
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {filtered.length} bien{filtered.length > 1 ? "s" : ""} sur {all.length}
          </p>
        </div>
        <Link
          href="/admin/offmarket/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#B8865A] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-white shadow-md shadow-[#B8865A]/30 transition-colors hover:bg-[#9d6e44]"
        >
          + Nouveau bien off-market
        </Link>
      </header>

      <OffmarketListFilters />

      <div className="overflow-hidden rounded-2xl border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Cover</th>
              <th className="px-4 py-3">Titre · Localisation</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Prix estimé</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Vues</th>
              <th className="px-4 py-3 text-right">Demandes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3D4F63]/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                  Aucun bien correspondant.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const cover = row.cover_image_url;
                const city = row.city_label ?? row.city_anonymized ?? "—";
                const status = (row.status ?? "draft") as OffmarketStatus;
                return (
                  <tr key={row.id} className="hover:bg-[#3D4F63]/5">
                    <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#B8865A]">
                      {row.reference}
                    </td>
                    <td className="px-4 py-3">
                      {cover ? (
                        <div className="relative h-12 w-16 overflow-hidden rounded-md bg-[#3D4F63]/10">
                          <Image src={cover} alt="" fill sizes="64px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-16 rounded-md bg-[#3D4F63]/10" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1A1F2A]">{row.title ?? "—"}</p>
                      <p className="text-xs text-[#3D4F63]/60">
                        {[row.country, city].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wide text-[#3D4F63]/80">
                      {row.property_type ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#3D4F63]">
                      {row.price_estimate
                        ? row.price_estimate.toLocaleString("fr-FR") + " €"
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${OFFMARKET_STATUS_TONES[status]}`}
                      >
                        {OFFMARKET_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#3D4F63]/70">
                      {row.views_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/offmarket/${row.id}/requests`}
                        className="font-mono text-xs font-bold text-[#B8865A] hover:underline"
                      >
                        {row.requests_count ?? 0}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Link
                          href={`/admin/offmarket/${row.id}/edit`}
                          className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
                        >
                          Éditer
                        </Link>
                      </div>
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
