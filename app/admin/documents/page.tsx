import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { DocumentsManager } from "@/components/admin/DocumentsManager";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("documents")
    .select("id,title,category,file_url,is_public,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Console MAPA
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          Documents
        </h1>
        <p className="mt-1 text-sm text-[#3D4F63]/70">
          {data?.length ?? 0} document{(data?.length ?? 0) > 1 ? "s" : ""}
        </p>
      </header>
      <DocumentsManager documents={data ?? []} />
    </div>
  );
}
