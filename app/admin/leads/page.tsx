import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { LeadsTable } from "@/components/admin/LeadsTable";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("leads")
    .select(
      "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,status,property_ref",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (sp.type) query = query.eq("type", sp.type);
  if (sp.status) query = query.eq("status", sp.status);

  const { data: leads } = await query;
  const filtered = (leads ?? []).filter((l) => {
    if (!sp.q) return true;
    const needle = sp.q.toLowerCase();
    const hay = `${l.email} ${l.first_name ?? ""} ${l.last_name ?? ""} ${l.phone ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
            Console MAPA
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Leads
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {filtered.length} lead{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>
      <LeadsTable leads={filtered} />
    </div>
  );
}
