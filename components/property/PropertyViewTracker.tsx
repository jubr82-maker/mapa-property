"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { track } from "@/lib/tracking/track";

interface Props {
  propertyId: string;
  type?: string;
  commune?: string;
  price?: number | null;
  offmarket?: boolean;
}

/**
 * Composant invisible qui :
 *  - ping `/api/track-view` (compteur vues bien — anti-doublon DB)
 *  - fire `property_view` dans le système d'events unifié (`/api/track`)
 */
export function PropertyViewTracker({
  propertyId,
  type,
  commune,
  price,
  offmarket,
}: Props) {
  const locale = useLocale();

  useEffect(() => {
    if (!propertyId) return;
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, locale }),
      keepalive: true,
    }).catch(() => {
      /* silent */
    });

    track("property_view", {
      property_id: propertyId,
      type: type ?? undefined,
      commune: commune ?? undefined,
      price: price ?? undefined,
      offmarket: offmarket ?? undefined,
    });
  }, [propertyId, locale, type, commune, price, offmarket]);

  return null;
}
