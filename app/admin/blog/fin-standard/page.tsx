import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { StandardEndingForm } from "@/components/admin/StandardEndingForm";
import type { StandardEnding } from "@/lib/blog/standard-ending";

export const dynamic = "force-dynamic";

// Blog > Fin d'article standard (oct. 2026) : un seul endroit pour la
// rubrique "La position de Mapa Property" et la signature des articles.
export default async function StandardEndingPage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_blog" });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("blog_standard_ending").select("*").eq("id", 1).maybeSingle();
  return (
    <div className="space-y-6">
      <Link href="/admin/blog" className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63]/80 hover:text-[#3D4F63]">
        {t("back")}
      </Link>
      <header>
        <h1 className="font-display text-3xl font-bold text-[#3D4F63]">{t("ending_title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/80">{t("ending_intro")}</p>
      </header>
      {error ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">{t("ending_unavailable")}</p>
      ) : (
        <StandardEndingForm initial={(data as StandardEnding | null) ?? null} />
      )}
    </div>
  );
}
