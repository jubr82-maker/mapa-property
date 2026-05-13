import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const CONFIG_URL = "https://dash.cloudflare.com/profile/api-tokens";
const INSTRUCTIONS =
  "Cloudflare → Profile → API Tokens → Create Token (template 'Read analytics'). Récupérer l'Account ID et le Zone ID dans le dashboard du domaine. Définir CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_ZONE_ID dans Vercel env vars.";

async function requireAdmin() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

const GRAPHQL_QUERY = `
  query ($zoneTag: String!, $since: Time!, $until: Time!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1dGroups(
          limit: 30,
          filter: { date_geq: $since, date_leq: $until }
          orderBy: [date_ASC]
        ) {
          sum {
            requests
            bytes
            cachedRequests
            threats
          }
          dimensions { date }
        }
      }
    }
  }
`;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!token || !accountId || !zoneId) {
    return NextResponse.json({
      ok: false,
      reason: "missing_token",
      configUrl: CONFIG_URL,
      instructions: INSTRUCTIONS,
    });
  }

  const until = new Date();
  const since = new Date(until.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: {
          zoneTag: zoneId,
          since: fmt(since),
          until: fmt(until),
        },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({
        ok: false,
        reason: "api_error",
        message: `Cloudflare ${res.status}: ${text.slice(0, 200)}`,
      });
    }

    const json = (await res.json()) as {
      data?: {
        viewer?: {
          zones?: {
            httpRequests1dGroups?: {
              sum?: {
                requests?: number;
                bytes?: number;
                cachedRequests?: number;
                threats?: number;
              };
              dimensions?: { date?: string };
            }[];
          }[];
        };
      };
      errors?: { message?: string }[];
    };

    if (json.errors && json.errors.length > 0) {
      return NextResponse.json({
        ok: false,
        reason: "api_error",
        message: json.errors.map((e) => e.message).join(" · "),
      });
    }

    const groups = json.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];

    let requests = 0;
    let bytes = 0;
    let cached = 0;
    let threats = 0;
    const daily: { date: string; requests: number; threats: number }[] = [];
    for (const g of groups) {
      const s = g.sum ?? {};
      requests += Number(s.requests ?? 0);
      bytes += Number(s.bytes ?? 0);
      cached += Number(s.cachedRequests ?? 0);
      threats += Number(s.threats ?? 0);
      daily.push({
        date: g.dimensions?.date ?? "",
        requests: Number(s.requests ?? 0),
        threats: Number(s.threats ?? 0),
      });
    }

    const cacheHit = requests > 0 ? Math.round((cached / requests) * 1000) / 10 : 0;

    return NextResponse.json({
      ok: true,
      requests,
      bandwidth: bytes,
      cacheHit,
      threats,
      daily,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, reason: "api_error", message });
  }
}
