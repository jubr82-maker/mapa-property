import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { fetchOffmarketAdminById } from "@/lib/admin/offmarket-server";
import { RequestRow } from "@/components/admin/RequestRow";

export const dynamic = "force-dynamic";

export default async function OffmarketRequestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_offmarket" });
  // offmarket_requests : service_role (cf. app/admin/leads/page.tsx).
  // fetchOffmarketAdminById lit properties_offmarket (table publique en
  // lecture, client session inchangé).
  const [property, requestsRes] = await Promise.all([
    fetchOffmarketAdminById(id),
    supabaseService()
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
            {t("propertyRequests.title", { title: property.title ?? t("untitled") })}
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {t("propertyRequests.count", { count: requests.length })}
          </p>
        </div>
        <Link
          href={`/admin/offmarket/${property.id}/edit`}
          className="rounded-full border border-[#3D4F63]/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
        >
          ← {t("propertyRequests.back")}
        </Link>
      </header>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-[#3D4F63]/15 bg-white px-6 py-16 text-center text-sm text-[#3D4F63]/70">
          {t("propertyRequests.empty")}
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
