"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/tracking/track";

/**
 * Auto-track les page_view à chaque navigation.
 * Inclure une fois dans le root layout.
 */
export function TrackPageView() {
  const pathname = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    const qs = sp.toString();
    track("page_view", {
      pathname,
      search: qs ? `?${qs}` : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, sp]);

  return null;
}
