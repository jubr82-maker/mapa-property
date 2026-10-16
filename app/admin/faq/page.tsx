import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { faqPageLabel, faqPageOptions } from "@/lib/faq/admin-options";
import { FAQ_LANGS, isFaqPageKey } from "@/lib/faq/keys";
import { FaqMoveButtons } from "@/components/admin/faq/FaqMoveButtons";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  page_key: string;
  question_fr: string | null;
  question_en: string | null;
  question_de: string | null;
  position: number;
  published: boolean;
};

// Gestion > Questions frequentes (oct. 2026) : liste filtrable par page,
// ordre, visibilite.
export default async function FaqAdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage();
  const { page } = await searchParams;
  const filter = isFaqPageKey(page) ? page : "";
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_faq" });
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("faqs").select("id, page_key, question_fr, question_en, question_de, position, published").order("page_key").order("position").order("created_at");
  if (filter) query = query.eq("page_key", filter);
  const [{ data, error }, options] = await Promise.all([query.limit(1000), faqPageOptions(supabase)]);
  const rows = (data as Row[] | null) ?? [];
  const used = new Set(rows.map((r) => r.page_key));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#3D4F63]/80">{t("eyebrow")}</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/80">{t("intro")}</p>
        </div>
        <Link href={filter ? `/admin/faq/new?page=${encodeURIComponent(filter)}` : "/admin/faq/new"} className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:opacity-90">
          {t("new_button")}
        </Link>
      </header>

      {error ? <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">{t("unavailable")}</p> : null}

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/80">{t("filter_label")}</span>
          <select name="page" defaultValue={filter} className="mt-1 block rounded-md border border-[#3D4F63]/30 bg-white px-3 py-2 text-sm text-[#1A1F2A]">
            <option value="">{t("filter_all")}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {used.has(o.value) && !filter ? " *" : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-full border border-[#3D4F63]/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]">
          {t("filter_submit")}
        </button>
      </form>

      <section className="overflow-x-auto rounded-2xl border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/80">
            <tr>
              <th className="px-4 py-3">{t("col_page")}</th>
              <th className="px-4 py-3">{t("col_order")}</th>
              <th className="px-4 py-3">{t("col_question")}</th>
              <th className="px-4 py-3">{t("col_langs")}</th>
              <th className="px-4 py-3">{t("col_visible")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-[#3D4F63]/80">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const siblings = rows.filter((x) => x.page_key === r.page_key);
                const idx = siblings.indexOf(r);
                return (
                  <tr key={r.id} className={`border-t border-[#3D4F63]/10 ${i % 2 ? "bg-[#3D4F63]/[0.02]" : ""}`}>
                    <td className="px-4 py-3 text-[#3D4F63]">{faqPageLabel(options, r.page_key)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <FaqMoveButtons id={r.id} first={idx === 0} last={idx === siblings.length - 1} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/faq/${r.id}`} className="text-[#1A1F2A] underline-offset-4 hover:underline">
                        {r.question_fr ?? ""}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#3D4F63]">
                      {FAQ_LANGS.filter((l) => r[`question_${l}`]).map((l) => l.toUpperCase()).join(" ")}
                    </td>
                    <td className="px-4 py-3">{r.published ? t("visible_yes") : t("visible_no")}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
