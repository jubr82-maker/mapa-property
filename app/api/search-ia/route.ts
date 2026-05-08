import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `Tu es un assistant qui transforme une demande immobilière en filtres structurés.
Renvoie uniquement un JSON :
{
  "country": "LU|FR|...",
  "city": "...",
  "type": "appartement|maison|villa|immeuble|...",
  "transaction": "sale|rent|offmarket",
  "budget_max": number|null,
  "min_bedrooms": number|null,
  "min_surface": number|null,
  "must_have": ["terrasse", "parking", "..."]
}`;

export async function POST(req: Request) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  // TODO: brancher Mistral (MISTRAL_API_KEY) puis fallback Groq (GROQ_API_KEY)
  // Pour l'instant on renvoie un parse heuristique léger basé sur mots-clés.
  const lower = query.toLowerCase();

  const filters: Record<string, string | number | string[]> = {};

  if (/lux|luxembourg/.test(lower)) filters.country = "LU";
  else if (/france|paris|cannes|nice/.test(lower)) filters.country = "FR";

  const cityMatch = lower.match(
    /\b(belair|kirchberg|limpertsberg|merl|cessange|paris|cannes|nice|monaco|marbella|ibiza|dubaï|dubai|miami|new york)\b/i,
  );
  if (cityMatch) filters.city = cityMatch[1];

  if (/apparte/.test(lower)) filters.type = "appartement";
  else if (/maison/.test(lower)) filters.type = "maison";
  else if (/villa/.test(lower)) filters.type = "villa";
  else if (/penthouse/.test(lower)) filters.type = "penthouse";
  else if (/duplex/.test(lower)) filters.type = "duplex";
  else if (/terrain/.test(lower)) filters.type = "terrain";
  else if (/immeuble/.test(lower)) filters.type = "immeuble";

  if (/louer|loue|location|rent/.test(lower)) filters.transaction = "rent";
  else if (/off.?market/.test(lower)) filters.transaction = "offmarket";
  else filters.transaction = "sale";

  const budgetMatch = lower.match(
    /(\d+(?:[\.,]\d+)?)\s*(m€|millions?|m|k€|k)/,
  );
  if (budgetMatch) {
    const num = Number(budgetMatch[1].replace(",", "."));
    const unit = budgetMatch[2];
    const multiplier = unit.startsWith("m") ? 1_000_000 : 1_000;
    filters.budget_max = Math.round(num * multiplier);
  }

  const bedroomsMatch = lower.match(/(\d+)\s*(chambres?|bedroom|zimmer)/);
  if (bedroomsMatch) filters.min_bedrooms = Number(bedroomsMatch[1]);

  const surfaceMatch = lower.match(/(\d+)\s*m[²2]/);
  if (surfaceMatch) filters.min_surface = Number(surfaceMatch[1]);

  return NextResponse.json(filters);
}

export const dynamic = "force-dynamic";

// Suppress unused warning for SYSTEM_PROMPT (reserved for Mistral integration)
void SYSTEM_PROMPT;
