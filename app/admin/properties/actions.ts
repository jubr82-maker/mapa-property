"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export async function setPropertyPublished(id: string, isPublished: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("properties")
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/properties");
  revalidatePath("/fr/biens");
}

export async function setPropertyFeatured(id: string, isFeatured: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("properties")
    .update({ is_featured: isFeatured })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/properties");
  revalidatePath("/fr");
}
