import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { toSignedUrl } from "@/lib/storage-signed-url";
import { DocumentsManager } from "@/components/admin/DocumentsManager";
import { ADMIN_LOCALE } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_documents" });
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("documents")
    .select("id,title,category,file_url,is_public,created_at")
    .order("created_at", { ascending: false });

  // Le lien affiche est derive a chaque rendu a partir du chemin du
  // fichier (URL signee, 60 min), jamais l'URL permanente stockee en
  // colonne file_url. Cf. lib/storage-signed-url.ts.
  const documents = await Promise.all(
    (data ?? []).map(async (doc) => ({
      ...doc,
      signed_url: await toSignedUrl("documents", doc.file_url),
    })),
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-[#3D4F63]/70">
          {t("count", { count: documents.length })}
        </p>
      </header>
      <DocumentsManager documents={documents} />
    </div>
  );
}
