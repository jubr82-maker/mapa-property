"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-ssr";

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full border border-[#F5EFE1]/30 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:border-[#e0af6e] hover:text-[#e0af6e] disabled:opacity-50"
    >
      {busy ? "…" : "Déconnexion"}
    </button>
  );
}
