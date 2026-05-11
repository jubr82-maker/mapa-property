"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export async function uploadDocument(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "autre").trim();
  const isPublic = formData.get("is_public") === "on";

  if (!file || file.size === 0) throw new Error("Fichier requis.");
  if (!title) throw new Error("Titre requis.");

  const ext = file.name.split(".").pop() || "pdf";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: publicUrl } = supabase.storage.from("documents").getPublicUrl(path);

  const { error } = await supabase.from("documents").insert({
    title,
    category,
    file_url: publicUrl.publicUrl,
    is_public: isPublic,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/documents");
}

export async function toggleDocumentPublic(id: string, isPublic: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documents");
}

export async function deleteDocument(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documents");
}
