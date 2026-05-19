"use client";

// POL3-3 — Carte Leaflet (chargée dynamiquement, ssr:false depuis
// FicheLocation). Affiche UNIQUEMENT un cercle copper de 600 m centré sur
// le centroïde de la commune/ville/pays (jamais de pin précis : le bien
// n'est pas géolocalisé exactement — confidentialité). Tuiles OSM en
// clair, CARTO dark_all en sombre. Zoom & drag désactivés par défaut ;
// un bouton « Voir plus » les active. Attribution OSM visible. Aucune
// dépendance réseau bloquante : si Leaflet ou les tuiles échouent, le
// conteneur reste affiché sans crasher la page.

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
  const tileRef = useRef<import("leaflet").TileLayer | null>(null);
  const [interactive, setInteractive] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Suivi du thème via la classe .dark (next-themes).
  useEffect(() => {
    const read = () =>
      document.documentElement.classList.contains("dark");
    setIsDark(read());
    const obs = new MutationObserver(() => setIsDark(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // Init carte (une seule fois).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = (await import("leaflet")) as unknown as LeafletModule;
        if (cancelled || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;
        const map = L.map(containerRef.current, {
          center: [geo.center.lat, geo.center.lon],
          zoom: geo.zoom,
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
        // Cercle copper 600 m — JAMAIS de marqueur précis.
        L.circle([geo.center.lat, geo.center.lon], {
          radius: 600,
          color: "#B8865A",
          weight: 1,
          fillColor: "#B8865A",
          fillOpacity: 0.15,
        }).addTo(map);
        applyTiles(L, map);
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

  // (Re)pose la bonne couche de tuiles selon le thème.
  function applyTiles(L: LeafletModule, map: import("leaflet").Map) {
    if (tileRef.current) {
      map.removeLayer(tileRef.current);
      tileRef.current = null;
    }
    const dark = document.documentElement.classList.contains("dark");
    const url = dark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attribution = dark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const layer = L.tileLayer(url, { attribution, maxZoom: 19 });
    layer.addTo(map);
    tileRef.current = layer;
  }

  // Bascule de tuiles quand le thème change.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (L && map) applyTiles(L, map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

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
