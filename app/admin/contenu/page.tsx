import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { ContenuTabs } from "@/components/admin/cms/ContenuTabs";
import type { ContentRow } from "@/components/admin/cms/ContentTab";
import type { TokenRow } from "@/components/admin/cms/FontsTab";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contenu — MAPA Admin",
};

async function loadData(): Promise<{
  content: ContentRow[];
  tokens: TokenRow[];
  warning?: string;
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
      warning:
        "Tables CMS introuvables — appliquer les migrations supabase/migrations/20260513_cms_*.sql avant utilisation.",
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

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#3D4F63]/60">
          Édition CMS
        </p>
        <h1 className="font-display text-3xl font-bold text-[#3D4F63]">Contenu du site</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/80">
          Textes éditables, polices et couleurs du site public. Les changements
          sont immédiats après &laquo;&nbsp;Vider cache&nbsp;&raquo;.
        </p>
      </header>

      {warning && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {warning}
        </div>
      )}

      <ContenuTabs initialContent={content} initialTokens={tokens} />
    </div>
  );
}
