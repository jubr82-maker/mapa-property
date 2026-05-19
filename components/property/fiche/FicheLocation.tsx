// POL2-7 / POL3-3 — Contenu de l'onglet "Localisation". Carte Leaflet
// (cercle copper 600 m centré sur le centroïde commune/ville/pays — JAMAIS
// de pin précis : confidentialité) si la localisation est résoluble, sinon
// mention texte "communiquée sur demande" (off-market : ville anonymisée).
// Texte d'environnement optionnel. Server Component : la résolution geo
// (resolveGeo, pure) est faite côté serveur ; le rendu Leaflet est délégué
// à un loader client (dynamic ssr:false). Jamais de crash si la
// localisation est absente ou non résoluble.

import { SignatureLine } from "@/components/ui/SignatureLine";
import { resolveGeo } from "@/lib/communes-lu-centroids";
import FicheLocationMapLoader from "./FicheLocationMapLoader";

export function FicheLocation({
  labels,
  city,
  country,
  environment,
}: {
  labels: { title: string; env: string; na: string; mapMore?: string };
  city?: string | null;
  country?: string | null;
  environment?: string | null;
}) {
  const geo = resolveGeo(city, country);

  return (
    <div
      data-fiche-location
      className="space-y-6 [--fiche-map-h:220px] sm:[--fiche-map-h:320px]"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {labels.title}
        </p>
        <SignatureLine width="w-8" />
        {geo ? (
          <FicheLocationMapLoader
            geo={geo}
            expandLabel={labels.mapMore ?? "Voir plus"}
          />
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
