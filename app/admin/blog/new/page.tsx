import { BlogPostForm } from "@/components/admin/BlogPostForm";

export const dynamic = "force-dynamic";

export default function NewBlogPostPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Blog
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          Nouvel article
        </h1>
      </header>
      <BlogPostForm post={null} mode="create" />
    </div>
  );
}
