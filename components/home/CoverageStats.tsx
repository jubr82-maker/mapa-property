import { MarketsSection } from "./MarketsSection";
import { StatsBand } from "./StatsBand";

// POL6 : « Marchés actifs » + « Chiffres clés » fusionnés dans UN
// seul <section> — narratif (MarketsSection) puis bande chiffrée
// sombre (StatsBand, mt resserré) : lit comme un bloc unique
// « Notre couverture en chiffres ».
export function CoverageStats({ locale }: { locale: string }) {
  return (
    <section className="px-6 py-6 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <MarketsSection />
        {/* StatsBand est un Server Component async — rendu en enfant. */}
        <StatsBand locale={locale} />
      </div>
    </section>
  );
}
