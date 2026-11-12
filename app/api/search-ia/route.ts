import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { fetchAllPropertiesWithCover } from "@/lib/data";
import { foreignCityPlaces } from "@/lib/search/places";
import { parseQuery } from "@/lib/search/parse-query";
import { mistralFallback } from "@/lib/search/mistral-fallback";
import { paramsFromParsed } from "@/lib/search/url";

// Recherche en texte libre (nov. 2026), entierement remplacee : analyse
// COTE SERVEUR par l'analyseur unique (lib/search/parse-query.ts) sur le
// referentiel officiel des lieux (lib/search/places.ts) ; Mistral seulement
// en dernier recours, si rien d'utile n'est reconnu (lib/search/mistral-
// fallback.ts, valeurs revérifiées). Renvoie l'adresse de la liste des
// biens (sans la langue) qui applique les regles d'affichage
// (lib/search/engine.ts) ; "off-market" renvoie vers sa page.
export async function POST(req: Request) {
  // Audit oct. 2026 : limite par IP et longueur bornee (ASVS 11.1.4, 5.1.3).
  const limit = rateLimit(req, { windowMs: 60_000, max: 30, namespace: "search-ia" });
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query || typeof query !== "string" || query.length > 500) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  const extra = foreignCityPlaces(await fetchAllPropertiesWithCover());
  let parsed = parseQuery(query, extra);
  let engine: "parser" | "mistral" | "none" = parsed.understood ? "parser" : "none";
  if (!parsed.understood) {
    const fromMistral = await mistralFallback(query, extra);
    if (fromMistral) {
      parsed = fromMistral;
      engine = "mistral";
    }
  }
  if (parsed.offmarket) return NextResponse.json({ url: "/off-market", understood: true, engine });
  const sp = paramsFromParsed(parsed, query);
  return NextResponse.json({ url: `/biens?${sp.toString()}`, understood: parsed.understood, engine });
}

export const dynamic = "force-dynamic";
