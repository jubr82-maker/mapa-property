import { PropertyCard } from "./PropertyCard";
import type { PropertyWithCover } from "@/lib/data";
import type { Locale } from "@/lib/types";

export function PropertyGrid({
  properties,
  locale,
}: {
  properties: PropertyWithCover[];
  locale: Locale;
}) {
  if (properties.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-bg-soft px-6 py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
          Aucun bien ne correspond à votre recherche.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((p, i) => (
        <PropertyCard key={p.id} property={p} locale={locale} priority={i < 3} />
      ))}
    </div>
  );
}
