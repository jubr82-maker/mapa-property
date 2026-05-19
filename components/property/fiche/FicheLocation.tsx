// POL2-7 — Contenu de l'onglet "Localisation". Carte Google Maps
// (embed sans clé API) si une ville est disponible, sinon mention
// "communiquée sur demande" (off-market : ville anonymisée). Texte
// d'environnement optionnel. Server Component. Jamais de crash si la
// localisation est absente.

import { SignatureLine } from "@/components/ui/SignatureLine";

export function FicheLocation({
  labels,
  city,
  country,
  environment,
}: {
  labels: { title: string; env: string; na: string };
  city?: string | null;
  country?: string | null;
  environment?: string | null;
}) {
  const place = [city, country].filter(Boolean).join(", ");
  const hasMap = !!city && city.trim().length > 1;

  return (
    <div data-fiche-location className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {labels.title}
        </p>
        <SignatureLine width="w-8" />
        {hasMap ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <iframe
              title={`Carte — ${place}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                place,
              )}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-[16/9] w-full"
            />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-ink-mid">{labels.na}</p>
        )}
      </div>

      {environment && environment.trim() && (
        <div data-fiche-env>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
            {labels.env}
          </p>
          <SignatureLine width="w-8" />
          <div className="space-y-3 text-sm leading-relaxed text-ink-mid">
            {environment
              .split(/\n\s*\n/)
              .filter((p) => p.trim())
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
