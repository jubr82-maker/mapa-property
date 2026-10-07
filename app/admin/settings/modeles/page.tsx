import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { loadListingModels } from "@/lib/listing/model-server";
import { ListingTemplatesEditor } from "@/components/admin/ListingTemplatesEditor";

export const dynamic = "force-dynamic";

// Parametres > Modeles d'annonces (oct. 2026) : modeles par defaut des
// messages et modifications enregistrees (table listing_templates).
export default async function ListingTemplatesPage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_listing" });
  const models = await loadListingModels();
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          <Link href="/admin/settings" className="hover:underline">
            {t("tpl_eyebrow")}
          </Link>
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">{t("tpl_title")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#3D4F63]/70">{t("tpl_intro")}</p>
      </header>
      <ListingTemplatesEditor models={models} />
    </div>
  );
}
