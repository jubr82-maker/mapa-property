import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { ContenuTabs } from "@/components/admin/cms/ContenuTabs";
import type { ContentRow } from "@/components/admin/cms/ContentTab";
import type { TokenRow } from "@/components/admin/cms/FontsTab";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { ADMIN_LOCALE } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_cms" });
  return { title: t("meta_title") };
}

async function loadData(): Promise<{
  content: ContentRow[];
  tokens: TokenRow[];
  warning?: boolean;
}> {
  const supabase = await createSupabaseServerClient();

  const [contentRes, tokensRes] = await Promise.all([
    supabase
      .from("site_content")
      .select("id,key,locale,content,section,updated_at")
      .order("section", { ascending: true })
      .order("key", { ascending: true })
      .order("locale", { ascending: true }),
    supabase
      .from("site_design_tokens")
      .select("id,category,token_key,token_value,description,updated_at")
      .order("category", { ascending: true })
      .order("token_key", { ascending: true }),
  ]);

  // Si la table n'existe pas (migration non appliquée), Supabase renvoie
  // une erreur sur le code "42P01". On dégrade gracieusement.
  if (contentRes.error || tokensRes.error) {
    console.error(
      "[admin/contenu] erreur lecture",
      contentRes.error?.message,
      tokensRes.error?.message,
    );
    return {
      content: [],
      tokens: [],
      warning: true,
    };
  }

  return {
    content: (contentRes.data ?? []) as ContentRow[],
    tokens: (tokensRes.data ?? []) as TokenRow[],
  };
}

export default async function AdminContenuPage() {
  // Le layout /admin gère déjà l'auth, mais on double-check
  // (cohérent avec les autres pages admin).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { content, tokens, warning } = await loadData();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_cms" });

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#3D4F63]/60">
          {t("eyebrow")}
        </p>
        <h1 className="font-display text-3xl font-bold text-[#3D4F63]">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/80">
          {t("intro")}
        </p>
      </header>

      {warning && <AdminNotice kind="cms_unavailable" />}

      <ContenuTabs initialContent={content} initialTokens={tokens} />
    </div>
  );
}
