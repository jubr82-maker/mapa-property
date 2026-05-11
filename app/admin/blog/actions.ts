"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPostPayload(formData: FormData) {
  const titleFr = String(formData.get("title_fr") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();
  if (!slug && titleFr) slug = slugify(titleFr);

  return {
    slug,
    title_fr: titleFr || null,
    title_en: String(formData.get("title_en") ?? "").trim() || null,
    title_de: String(formData.get("title_de") ?? "").trim() || null,
    excerpt_fr: String(formData.get("excerpt_fr") ?? "").trim() || null,
    excerpt_en: String(formData.get("excerpt_en") ?? "").trim() || null,
    excerpt_de: String(formData.get("excerpt_de") ?? "").trim() || null,
    content_fr: String(formData.get("content_fr") ?? "") || null,
    content_en: String(formData.get("content_en") ?? "") || null,
    content_de: String(formData.get("content_de") ?? "") || null,
    cover_image: String(formData.get("cover_image") ?? "").trim() || null,
    primary_tag: String(formData.get("primary_tag") ?? "").trim() || null,
    author: String(formData.get("author") ?? "").trim() || null,
    is_published: formData.get("is_published") === "on",
    published_at: String(formData.get("published_at") ?? "") || null,
  };
}

export async function createBlogPost(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert(buildPostPayload(formData))
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blog");
  redirect(`/admin/blog/${data.id}/edit`);
}

export async function updateBlogPost(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("blog_posts")
    .update(buildPostPayload(formData))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blog");
  revalidatePath("/fr/blog");
}

export async function deleteBlogPost(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}
