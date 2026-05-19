"use client";

// POL3-3 — Wrapper client : Next 16 interdit `dynamic(..., {ssr:false})`
// dans un Server Component. FicheLocation (Server Component) délègue donc
// le rendu de la carte à ce loader client, qui importe FicheLocationMap
// dynamiquement (pas de SSR : Leaflet a besoin de `window`).

import dynamic from "next/dynamic";
import type { GeoResolution } from "@/lib/communes-lu-centroids";

const FicheLocationMap = dynamic(() => import("./FicheLocationMap"), {
  ssr: false,
  loading: () => (
    <div
      className="overflow-hidden rounded-xl border border-line bg-bg-soft"
      style={{ height: "var(--fiche-map-h, 320px)" }}
    />
  ),
});

export default function FicheLocationMapLoader({
  geo,
  expandLabel,
}: {
  geo: GeoResolution;
  expandLabel: string;
}) {
  return <FicheLocationMap geo={geo} expandLabel={expandLabel} />;
}
