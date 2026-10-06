import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SimpleTable } from "@/components/admin/SimpleTable";
import { reviewSourceText } from "@/lib/reviews";
import { ADMIN_LOCALE, formatDateOnly } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_reviews" });
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("id,name,rating,comment,comment_en,comment_de,source_lang,review_date,is_published")
    .order("review_date", { ascending: false });

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    // Telephone : nom, note et date, statut, action sur une ligne.
    card: {
      title: r.name ?? "",
      titleHref: `/admin/reviews/${r.id}/edit`,
      meta: [
        "★".repeat(r.rating ?? 0) + "☆".repeat(Math.max(0, 5 - (r.rating ?? 0))),
        formatDateOnly(r.review_date),
      ].join(" · "),
      sub: reviewSourceText(r) || undefined,
      badge: (
        <span
          className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
            r.is_published ? "bg-emerald-100 text-emerald-800" : "bg-[#3D4F63]/10 text-[#3D4F63]"
          }`}
        >
          {r.is_published ? t("status_published") : t("status_draft")}
        </span>
      ),
      actions: (
        <div className="flex gap-2">
          <Link href={`/admin/reviews/${r.id}/edit`} className="rounded border border-ink/20 text-[14px] text-ink">
            {t("edit")}
          </Link>
        </div>
      ),
    },
    cells: [
      r.name ?? "",
      "★".repeat(r.rating ?? 0) + "☆".repeat(Math.max(0, 5 - (r.rating ?? 0))),
      formatDateOnly(r.review_date),
      <span
        key="status"
        className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
          r.is_published ? "bg-emerald-100 text-emerald-800" : "bg-[#3D4F63]/10 text-[#3D4F63]"
        }`}
      >
        {r.is_published ? t("status_published") : t("status_draft")}
      </span>,
      <Link
        key="edit"
        href={`/admin/reviews/${r.id}/edit`}
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
          href="/admin/reviews/new"
          className="rounded-full bg-[#e0af6e] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-white hover:bg-[#9d6e44]"
        >
          {t("new_button")}
        </Link>
      </header>

      <SimpleTable
        headers={[t("col_name"), t("col_rating"), t("col_date"), t("col_status"), t("col_actions")]}
        rows={rows}
        emptyText={t("empty")}
      />
    </div>
  );
}
