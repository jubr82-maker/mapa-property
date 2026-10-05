"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { logoutAction } from "@/app/admin/auth-actions";

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const t = useTranslations("admin_security");

  const logout = async () => {
    setBusy(true);
    // Cote serveur : deconnexion + journal des connexions.
    await logoutAction();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full border border-bg/30 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
    >
      {busy ? "…" : t("logout")}
    </button>
  );
}
