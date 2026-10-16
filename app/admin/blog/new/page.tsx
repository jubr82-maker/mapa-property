import { getTranslations } from "next-intl/server";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { BlogFaqBlock } from "@/components/admin/faq/BlogFaqBlock";

export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_blog" });
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {t("title")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          {t("new_title")}
        </h1>
      </header>
      <BlogPostForm post={null} mode="create" />
      <BlogFaqBlock pageKey={null} items={[]} />
    </div>
  );
}
