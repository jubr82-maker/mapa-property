import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SimpleTable } from "@/components/admin/SimpleTable";
import { ADMIN_LOCALE, formatDateOnly } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_blog" });
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id,slug,title_fr,primary_tag,published_at,is_published,cover_image")
    .order("published_at", { ascending: false });

  const pill = (published: boolean | null) => (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
        published ? "bg-emerald-100 text-emerald-800" : "bg-[#3D4F63]/10 text-[#3D4F63]"
      }`}
    >
      {published ? t("status_published") : t("status_draft")}
    </span>
  );
  const rows = (data ?? []).map((p) => ({
    id: p.id,
    // Telephone : vignette de couverture, titre, categorie et date.
    card: {
      thumb: p.cover_image ?? null,
      title: p.title_fr || p.slug || t("untitled"),
      titleHref: `/admin/blog/${p.id}/edit`,
      meta: [p.primary_tag, formatDateOnly(p.published_at)].filter(Boolean).join(" · "),
      badge: pill(p.is_published),
      actions: (
        <div className="flex gap-2">
          <Link href={`/admin/blog/${p.id}/edit`} className="rounded border border-ink/20 text-[14px] text-ink">
            {t("edit")}
          </Link>
          {p.is_published && p.slug ? (
            <Link href={`/fr/blog/${p.slug}`} target="_blank" className="rounded border border-ink/20 text-[14px] text-ink">
              {t("view")}
            </Link>
          ) : null}
        </div>
      ),
    },
    cells: [
      p.title_fr || p.slug || t("untitled"),
      p.primary_tag ?? "",
      formatDateOnly(p.published_at),
      <span
        key="status"
        className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
          p.is_published ? "bg-emerald-100 text-emerald-800" : "bg-[#3D4F63]/10 text-[#3D4F63]"
        }`}
      >
        {p.is_published ? t("status_published") : t("status_draft")}
      </span>,
      <Link
        key="edit"
        href={`/admin/blog/${p.id}/edit`}
        className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
      >
        {t("edit")}
      </Link>,
    ],
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {t("count", { count: rows.length })}
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="rounded-full bg-[#e0af6e] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-white hover:bg-[#9d6e44]"
        >
          {t("new_button")}
        </Link>
      </header>

      <SimpleTable
        headers={[t("col_title"), t("col_category"), t("col_date"), t("col_status"), t("col_actions")]}
        rows={rows}
        emptyText={t("empty")}
      />
    </div>
  );
}
