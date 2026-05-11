import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { ArcovaTable } from "@/components/admin/ArcovaTable";

export const dynamic = "force-dynamic";

export default async function AdminArcovaPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("arcova_waitlist")
    .select("id,created_at,first_name,last_name,email,company,role,message,status")
    .order("created_at", { ascending: false });

  if (sp.role) query = query.eq("role", sp.role);
  if (sp.status) query = query.eq("status", sp.status);

  const { data: items } = await query;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Console MAPA
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          ARCOVA Waitlist
        </h1>
        <p className="mt-1 text-sm text-[#3D4F63]/70">
          {items?.length ?? 0} inscription{(items?.length ?? 0) > 1 ? "s" : ""}
        </p>
      </header>
      <ArcovaTable items={items ?? []} />
    </div>
  );
}
