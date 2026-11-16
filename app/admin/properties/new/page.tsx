import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { PropertyCreateForm } from "@/components/admin/PropertyCreateForm";
import { ListingImporter } from "@/components/admin/ListingImporter";
import { adminLuPlaces, foreignCitySuggestions } from "@/lib/admin/property-location";
import { cityPageOptions } from "@/lib/internal-links";

export const dynamic = "force-dynamic";
// Import d'une annonce (nov. 2026) : analyse, traduction et photos dans des
// appels distincts, chacun bien en dessous de cette limite (Vercel Hobby).
export const maxDuration = 300;

export default async function NewPropertyPage() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_properties" });
  // Calcule cote serveur (oct. 2026) : localites officielles du Luxembourg
  // (registre CACLR, liste legere nom + commune) et villes des pages pour
  // les autres pays, transmises en prop, jamais dans le JavaScript.
  const luPlaces = adminLuPlaces();
  const foreignSuggestions = foreignCitySuggestions();
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
      <ListingImporter />
      <PropertyCreateForm luPlaces={luPlaces} foreignSuggestions={foreignSuggestions} cityPages={cityPageOptions()} />
    </div>
  );
}
