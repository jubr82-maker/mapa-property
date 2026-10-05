// Suivi des erreurs non configure (oct. 2026) : message generique, sans nom
// de variable ni procedure technique a l'ecran.
import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

export async function SentryNotConfiguredCard() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" });
  return (
    <div className="rounded-lg border border-dashed border-[#3D4F63]/25 bg-[#F5EFE1] p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#3D4F63]/10 text-[#3D4F63]">
          <ShieldAlert className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">{t("source_not_configured_title")}</p>
          <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">{t("error_monitoring_title")}</h3>
          <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/70">{t("source_not_configured")}</p>
        </div>
      </div>
    </div>
  );
}
