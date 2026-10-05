import type { MetadataRoute } from "next";
import { robotsConfig } from "@/lib/robots-rules";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

// Regles : lib/robots-rules.ts (fonction pure, verifiee par
// tests/seo/robots.spec.ts).
export default function robots(): MetadataRoute.Robots {
  return robotsConfig(SITE_URL);
}
