// Sprint Apimo Lot C — Cron de synchronisation Apimo -> Supabase.
//
// Pattern aligne sur app/api/cron/bce-rates/route.ts :
//   - GET + auth Bearer CRON_SECRET (Vercel cron envoie ce header)
//   - Mode no-op si APIMO_* absents OU SUPABASE_SERVICE_ROLE_KEY absent
//   - Service role inline pour bypasser RLS sur properties + property_images
//
// Logique :
//   1. Lit max(updated_at) des properties avec apimo_id IS NOT NULL ->
//      timestamp UNIX pour sync incrementale Apimo (?timestamp=...).
//   2. Pagine GET /agencies/{id}/properties (limit 1000, offset += 1000),
//      max 10 pages de securite.
//   3. Pour chaque bien : UPSERT (ON CONFLICT apimo_id) puis DELETE+INSERT
//      property_images. Try/catch par bien -> un echec ne bloque pas le run.
//   4. Retourne compteurs detailles + erreurs par bien.

import { NextResponse } from "next/server";
import { isApimoConfigured, apimoFetch, getApimoAgencyId } from "@/lib/apimo/client";
import type { ApimoProperty } from "@/lib/apimo/client";
import {
  mapApimoToProperty,
  extractApimoImages,
} from "@/lib/apimo/mapper";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 1000;
const MAX_PAGES = 10; // securite : max 10_000 biens par run

/**
 * Reponse Apimo souple : selon configuration / version API, les biens sont
 * dans `response` (array direct) ou imbrique sous `data` / `products` / `items`.
 * On essaye les variantes connues.
 */
interface ApimoListResponse {
  status?: string;
  total_items?: number;
  processing_offset?: number;
  processing_limit?: number;
  response?: ApimoProperty[];
  data?: ApimoProperty[];
  products?: ApimoProperty[];
  items?: ApimoProperty[];
}

function extractBiens(payload: ApimoListResponse | null): ApimoProperty[] {
  if (!payload) return [];
  if (Array.isArray(payload.response)) return payload.response;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export async function GET(req: Request) {
  // --- AUTH cron ---
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- GARDE NO-OP 1 : config Apimo absente ---
  if (!isApimoConfigured()) {
    return NextResponse.json({
      ok: true,
      stubbed: true,
      reason: "apimo_not_configured",
    });
  }

  // --- GARDE NO-OP 2 : service role absent (pas d'ecriture DB possible) ---
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: true,
      stubbed: true,
      reason: "service_role_missing",
    });
  }

  // --- SUPABASE service_role ---
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // --- TIMESTAMP sync incrementale ---
  let sinceUnix: number | undefined;
  try {
    const { data: lastRow } = await sb
      .from("properties")
      .select("updated_at")
      .not("apimo_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastIso = (lastRow as { updated_at?: string } | null)?.updated_at;
    if (lastIso) {
      const ms = new Date(lastIso).getTime();
      if (Number.isFinite(ms)) sinceUnix = Math.floor(ms / 1000);
    }
  } catch (e) {
    console.warn("[cron/apimo-sync] lookup last updated_at failed:", (e as Error).message);
  }

  const agencyId = getApimoAgencyId();
  const path = `/agencies/${agencyId}/properties`;

  // --- PAGINATION ---
  let totalSynced = 0;
  let created = 0;
  let updated = 0;
  let images = 0;
  const errors: Array<{ apimo_id?: number; reason: string }> = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_LIMIT;
    const res = await apimoFetch<ApimoListResponse>(path, {
      query: {
        limit: PAGE_LIMIT,
        offset,
        timestamp: sinceUnix,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "apimo_fetch_failed",
          status: res.status,
          detail: res.error,
          synced: totalSynced,
        },
        { status: 502 },
      );
    }

    const biens = extractBiens(res.data);
    if (biens.length === 0) break;

    for (const bien of biens) {
      try {
        const row = mapApimoToProperty(bien);
        const { data: upserted, error: upsertErr } = await sb
          .from("properties")
          .upsert(row, { onConflict: "apimo_id" })
          .select("id, created_at, updated_at")
          .single();

        if (upsertErr || !upserted) {
          errors.push({
            apimo_id: bien.id,
            reason: upsertErr?.message ?? "upsert_returned_null",
          });
          continue;
        }

        // Heuristique created vs updated : created_at == updated_at = INSERT,
        // sinon UPDATE. Approximation safe (les 2 sont default now() en DB).
        const rowMeta = upserted as { id: string; created_at: string; updated_at: string };
        if (rowMeta.created_at === rowMeta.updated_at) {
          created++;
        } else {
          updated++;
        }

        // --- Images : strategie REPLACE (DELETE + INSERT) ---
        const imgRows = extractApimoImages(bien);
        const { error: delErr } = await sb
          .from("property_images")
          .delete()
          .eq("property_id", rowMeta.id);
        if (delErr) {
          errors.push({
            apimo_id: bien.id,
            reason: `delete_images: ${delErr.message}`,
          });
        }
        if (imgRows.length > 0) {
          const insertPayload = imgRows.map((img) => ({
            property_id: rowMeta.id,
            url: img.url,
            sort: img.sort,
          }));
          const { error: insErr } = await sb
            .from("property_images")
            .insert(insertPayload);
          if (insErr) {
            errors.push({
              apimo_id: bien.id,
              reason: `insert_images: ${insErr.message}`,
            });
          } else {
            images += imgRows.length;
          }
        }

        totalSynced++;
      } catch (e) {
        errors.push({
          apimo_id: bien.id,
          reason: `exception: ${(e as Error).message}`,
        });
      }
    }

    // Fin de pagination : moins de biens que la limite -> dernier paquet.
    if (biens.length < PAGE_LIMIT) break;
  }

  return NextResponse.json({
    ok: true,
    synced: totalSynced,
    created,
    updated,
    images,
    errors,
    since_unix: sinceUnix ?? null,
  });
}
