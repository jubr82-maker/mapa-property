import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { ADMIN_LOCALE } from "@/lib/datetime";

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
    </div>
  );
}
