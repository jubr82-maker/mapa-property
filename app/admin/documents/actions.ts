"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { detectFileType } from "@/lib/security/file-type";

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { assertAdminAction } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/pilotage/audit";

export async function uploadDocument(formData: FormData) {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  const { user } = await assertAdminAction();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_documents" });
  const supabase = await createSupabaseServerClient();
  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "autre").trim();
  const isPublic = formData.get("is_public") === "on";

  if (!file || file.size === 0) throw new Error(t("err_file_required"));
  if (!title) throw new Error(t("err_title_required"));
  // Audit de securite (oct. 2026), OWASP ASVS 12.1.1 et 12.2.1 : taille
  // bornee, type determine par la signature du contenu (PDF, images,
  // Word / Excel / PowerPoint), extension et type MIME DERIVES du contenu,
  // jamais repris du nom ou de la declaration du navigateur.
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error(t("err_file_too_large"));
  if (title.length > 200 || category.length > 50) throw new Error(t("err_field_too_long"));
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detected = detectFileType(head, file.name);
  if (!detected || detected.kind === "mp4" || detected.kind === "webm") {
    throw new Error(t("err_file_type"));
  }

  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${detected.ext}`;
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: detected.mime, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: publicUrl } = supabase.storage.from("documents").getPublicUrl(path);

  const { error } = await supabase.from("documents").insert({
    title,
    category,
    file_url: publicUrl.publicUrl,
    is_public: isPublic,
  });
  if (error) throw new Error(error.message);
  await logAdminAction({
    actorEmail: user.email,
    action: "document_added",
    targetTable: "documents",
    targetId: path,
    diff: { title, category, is_public: isPublic },
  });

  revalidatePath("/admin/documents");
}

export async function toggleDocumentPublic(id: string, isPublic: boolean) {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documents");
}

export async function deleteDocument(id: string) {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  const { user } = await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const { data: doc } = await supabase.from("documents").select("title").eq("id", id).maybeSingle();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAdminAction({
    actorEmail: user.email,
    action: "document_deleted",
    targetTable: "documents",
    targetId: id,
    diff: { title: (doc as { title?: string } | null)?.title ?? null },
  });
  revalidatePath("/admin/documents");
}
