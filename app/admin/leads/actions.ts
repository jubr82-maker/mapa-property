"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leads");
}

export async function updateLeadNotes(id: string, notes: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("leads")
    .update({ notes_admin: notes })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leads");
}
