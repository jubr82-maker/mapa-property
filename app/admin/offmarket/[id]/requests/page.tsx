import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { fetchOffmarketAdminById } from "@/lib/admin/offmarket-server";
import { RequestRow } from "@/components/admin/RequestRow";

export const dynamic = "force-dynamic";

export default async function OffmarketRequestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [property, requestsRes] = await Promise.all([
    fetchOffmarketAdminById(id),
    supabase
      .from("offmarket_requests")
      .select("*")
      .eq("property_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!property) notFound();
  const requests = requestsRes.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {property.reference}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
            Demandes — {property.title ?? "Sans titre"}
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {requests.length} demande{requests.length > 1 ? "s" : ""} reçue
            {requests.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={`/admin/offmarket/${property.id}/edit`}
          className="rounded-full border border-[#3D4F63]/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
        >
          ← Retour au bien
        </Link>
      </header>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-[#3D4F63]/15 bg-white px-6 py-16 text-center text-sm text-[#3D4F63]/70">
          Aucune demande sur ce bien.
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
