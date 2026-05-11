"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

function buildReviewPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim() || null,
    rating: Number(formData.get("rating")) || 5,
    comment: String(formData.get("comment") ?? "").trim() || null,
    review_date: String(formData.get("review_date") ?? "") || null,
    lang: String(formData.get("lang") ?? "fr") || "fr",
    is_published: formData.get("is_published") === "on",
  };
}

export async function createReview(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .insert(buildReviewPayload(formData))
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reviews");
  revalidatePath("/fr");
  redirect(`/admin/reviews/${data.id}/edit`);
}

export async function updateReview(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reviews")
    .update(buildReviewPayload(formData))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reviews");
  revalidatePath("/fr");
}

export async function deleteReview(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reviews");
  redirect("/admin/reviews");
}
