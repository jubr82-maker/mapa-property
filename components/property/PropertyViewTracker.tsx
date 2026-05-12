"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/**
 * Composant invisible qui ping `/api/track-view` au montage.
 * Anti-doublon assuré côté DB (unique index sur (property_id, visitor_hash, day)).
 */
export function PropertyViewTracker({ propertyId }: { propertyId: string }) {
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
  }, [propertyId, locale]);

  return null;
}
