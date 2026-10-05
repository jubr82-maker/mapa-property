// Source de statistiques non configuree (oct. 2026) : message generique,
// sans nom de variable ni procedure technique a l'ecran.
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

export async function TokenMissingCard({ title }: { title: string }) {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" });
  return (
    <div className="rounded-lg border border-dashed border-[#3D4F63]/25 bg-[#F5EFE1] p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#e0af6e]">{t("source_not_configured_title")}</p>
      <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">{title}</h3>
      <p className="mt-2 text-sm text-[#3D4F63]/70">{t("source_not_configured")}</p>
    </div>
  );
}
