import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { ReviewForm } from "@/components/admin/ReviewForm";
import { ADMIN_LOCALE } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("id,name,rating,review_date,comment,comment_en,comment_de,source_lang,is_published")
    .eq("id", id)
    .maybeSingle();
  if (!review) notFound();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_reviews" });

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {t("title")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          {t("edit_title")}
        </h1>
      </header>
      <ReviewForm review={review} mode="edit" />
    </div>
  );
}
