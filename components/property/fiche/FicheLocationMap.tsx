"use client";

// POL3-P2 — Carte Leaflet (chargée dynamiquement, ssr:false depuis
// FicheLocation). Affiche UNIQUEMENT un cercle CARMIN #B91C1C centré
// sur le centroïde de la commune/ville/pays (jamais de pin précis : le
// bien n'est pas géolocalisé exactement — confidentialité). Tuiles
// OpenStreetMap CLAIRES en light ET dark (décision Julien — la carte
// garde ses couleurs OSM naturelles dans les deux modes : vert parcs,
// gris routes, rose autoroutes). Zoom serré commune (≥ 14). Zoom &
// drag désactivés par défaut ; un bouton « Voir plus » les active.
// Attribution OSM visible. Aucune dépendance réseau bloquante : si
// Leaflet ou les tuiles échouent, le conteneur reste affiché sans
// crasher la page.

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { GeoResolution } from "@/lib/communes-lu-centroids";

type LeafletModule = typeof import("leaflet");

export default function FicheLocationMap({
  geo,
  expandLabel,
}: {
  geo: GeoResolution;
  expandLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const [interactive, setInteractive] = useState(false);

  // Init carte (une seule fois).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = (await import("leaflet")) as unknown as LeafletModule;
        if (cancelled || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;
        // POL3-P2 : zoom serré commune — plancher 14 (Julien : « entre
        // 14 et 15 selon taille commune »). On respecte geo.zoom si déjà ≥ 14.
        const initialZoom = Math.max(14, geo.zoom);
        const map = L.map(containerRef.current, {
          center: [geo.center.lat, geo.center.lon],
          zoom: initialZoom,
          scrollWheelZoom: false,
          dragging: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: false,
          zoomControl: false,
          attributionControl: true,
        });
        mapRef.current = map;
        // POL3-P2 : cercle CARMIN #B91C1C, weight 3, fillOpacity 0.18
        // — plus prononcé visuellement (validé Julien). Rayon inchangé
        // (logique POL3-3 commune/ville préservée).
        L.circle([geo.center.lat, geo.center.lon], {
          radius: 600,
          color: "#B91C1C",
          weight: 3,
          fillColor: "#B91C1C",
          fillOpacity: 0.18,
        }).addTo(map);
        // POL3-P2 : tuiles OSM CLAIRES en light ET dark — décision
        // Julien (la carte ne s'adapte plus au thème, garde toujours
        // ses couleurs OSM naturelles).
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        // Invalidate après layout (conteneur en accordéon animé).
        setTimeout(() => map.invalidateSize(), 250);
      } catch {
        // Leaflet KO → conteneur vide non bloquant (fallback texte géré
        // par le parent si geo absent ; ici on ne crashe pas).
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active/désactive l'interaction (bouton « Voir plus »).
  const zoomCtrlRef = useRef<import("leaflet").Control.Zoom | null>(null);
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const fns = [
      map.scrollWheelZoom,
      map.dragging,
      map.doubleClickZoom,
      map.touchZoom,
    ];
    for (const h of fns) {
      if (interactive) h.enable();
      else h.disable();
    }
    if (interactive && !zoomCtrlRef.current) {
      const zc = L.control.zoom({ position: "bottomleft" });
      zc.addTo(map);
      zoomCtrlRef.current = zc;
    }
  }, [interactive]);

  return (
    <div className="space-y-2">
      <div
        className="relative overflow-hidden rounded-xl border border-line"
        style={{ height: "var(--fiche-map-h, 320px)" }}
      >
        <div
          ref={containerRef}
          data-fiche-map
          data-level={geo.level}
          aria-label={`Carte — ${geo.label}`}
          role="img"
          className="size-full"
        />
        {!interactive && (
          <button
            type="button"
            onClick={() => setInteractive(true)}
            className="absolute bottom-3 right-3 z-[500] rounded-full border border-[#B8865A]/50 bg-bg/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#B8865A] backdrop-blur transition-colors hover:bg-[#B8865A]/10"
          >
            {expandLabel}
          </button>
        )}
      </div>
    </div>
  );
}
