import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { OffmarketForm } from "@/components/admin/OffmarketForm";

export const dynamic = "force-dynamic";

export default async function NewOffmarketPage() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_offmarket" });
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {t("list.eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          {t("list.new")}
        </h1>
      </header>
      <OffmarketForm row={null} mode="create" />
    </div>
  );
}
