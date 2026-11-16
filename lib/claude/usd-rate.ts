// Taux de change euro/dollar de la BCE (nov. 2026), pour afficher en euros
// le cout des appels a l'API Claude (facturee en dollars). Meme service BCE
// que le taux des credits (lib/pilotage/bce.ts), serie EXR D.USD.EUR :
// dollars pour 1 euro. Lu au plus une fois par jour (cache Next.js). Sans
// taux (BCE injoignable ou reponse illisible) : null, l'admin affiche en
// dollars. Aucun en-tete identifiant.
const ECB_USD_URL = "https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=jsondata";

type SDWPayload = { dataSets?: Array<{ series?: Record<string, { observations?: Record<string, number[]> }> }> };

/** Lecture du taux dans la reponse BCE (pur, teste). */
export function parseEcbRate(data: unknown): number | null {
  try {
    const series = (data as SDWPayload)?.dataSets?.[0]?.series;
    const first = series ? Object.values(series)[0] : undefined;
    const obs = first?.observations ? Object.values(first.observations) : [];
    const value = obs[obs.length - 1]?.[0];
    return typeof value === "number" && value > 0.5 && value < 2.5 ? value : null;
  } catch {
    return null;
  }
}

export async function getUsdPerEur(): Promise<number | null> {
  try {
    const res = await fetch(ECB_USD_URL, { headers: { Accept: "application/json" }, next: { revalidate: 86_400 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return parseEcbRate(await res.json());
  } catch {
    return null;
  }
}
