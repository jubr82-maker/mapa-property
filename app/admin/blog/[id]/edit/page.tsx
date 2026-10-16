import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { BlogFaqBlock } from "@/components/admin/faq/BlogFaqBlock";
import { blogFaqKey } from "@/lib/faq/keys";
import type { FaqRow } from "@/lib/faq/data";

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_blog" });
  // Questions frequentes de l'article (oct. 2026), page "blog:<adresse>".
  const faqKey = post.slug ? blogFaqKey(post.slug) : null;
  const { data: faqData } = faqKey
    ? await supabase.from("faqs").select("*").eq("page_key", faqKey).order("position").order("created_at")
    : { data: [] };
  const faqItems = ((faqData as (FaqRow & { published: boolean })[] | null) ?? []).map((r) => ({
    id: r.id,
    page_key: r.page_key,
    question: { fr: r.question_fr ?? "", en: r.question_en ?? "", de: r.question_de ?? "" },
    answer: { fr: r.answer_fr ?? "", en: r.answer_en ?? "", de: r.answer_de ?? "" },
    published: r.published,
  }));

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {t("title")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          {post.title_fr || post.slug || t("untitled")}
        </h1>
      </header>
      <BlogPostForm post={post} mode="edit" />
      <BlogFaqBlock pageKey={faqKey} items={faqItems} />
    </div>
  );
}
