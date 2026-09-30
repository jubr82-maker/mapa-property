import { PropertyCreateForm } from "@/components/admin/PropertyCreateForm";
import { getLuxembourgLocalityNames } from "@/lib/geo/luxembourg-communes";

export const dynamic = "force-dynamic";

export default function NewPropertyPage() {
  // Calcule cote serveur : la liste complete (avec noms alternatifs
  // multilingues) ne doit jamais atteindre le bundle client, seule cette
  // liste de noms deja allegee est transmise en prop.
  const citySuggestions = getLuxembourgLocalityNames();
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          Properties
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          Nouveau bien
        </h1>
        <p className="mt-1 text-sm text-[#3D4F63]/70">
          Champs de base — la fiche complète (surfaces, pièces, prestations,
          photos…) se complète après création, depuis la page d&apos;édition.
        </p>
      </header>
      <PropertyCreateForm citySuggestions={citySuggestions} />
    </div>
  );
}
