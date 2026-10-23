import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { PropertyCreateForm } from "@/components/admin/PropertyCreateForm";
import { getLuxembourgLocalityNames } from "@/lib/geo/luxembourg-communes";
import { cityPageOptions } from "@/lib/internal-links";

export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_properties" });
  // Calcule cote serveur : la liste complete (avec noms alternatifs
  // multilingues) ne doit jamais atteindre le bundle client, seule cette
  // liste de noms deja allegee est transmise en prop.
  const citySuggestions = getLuxembourgLocalityNames();
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {t("list_title")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          {t("new_title")}
        </h1>
        <p className="mt-1 text-sm text-[#3D4F63]/70">
          {t("new_intro")}
        </p>
      </header>
      <PropertyCreateForm citySuggestions={citySuggestions} cityPages={cityPageOptions()} />
    </div>
  );
}
