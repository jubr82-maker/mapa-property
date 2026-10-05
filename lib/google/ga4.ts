// Google Analytics 4 (oct. 2026) : API Data, lecture seule, par REST.
// Variable : GA4_PROPERTY_ID (chiffres). Cle : lib/google/service-account.
import { googleAccessToken, readServiceAccount, SCOPE_ANALYTICS } from "@/lib/google/service-account";

export type CountItem = { key: string; value: number };

export type Ga4Overview =
  | { status: "not_configured" }
  | { status: "error"; code: string }
  | {
      status: "ok";
      sessions7d: number;
      sessions30d: number;
      users30d: number;
      daily: { date: string; value: number }[];
      topPages: CountItem[];
      channels: CountItem[];
      countries: CountItem[];
      devices: CountItem[];
    };

type Report = { rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[] };

export function ga4Configured(): boolean {
  return Boolean(process.env.GA4_PROPERTY_ID?.trim() && readServiceAccount());
}

async function runReport(token: string, body: Record<string, unknown>): Promise<Report> {
  const id = process.env.GA4_PROPERTY_ID!.trim();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(id)}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ga4_http_${res.status}`);
  return (await res.json()) as Report;
}

const list = (r: Report): CountItem[] =>
  (r.rows ?? []).map((row) => ({
    key: row.dimensionValues?.[0]?.value ?? "",
    value: Number(row.metricValues?.[0]?.value ?? 0),
  }));
const total = (r: Report, i = 0) => Number(r.rows?.[0]?.metricValues?.[i]?.value ?? 0);

export async function loadGa4Overview(): Promise<Ga4Overview> {
  if (!ga4Configured()) return { status: "not_configured" };
  try {
    const token = await googleAccessToken(SCOPE_ANALYTICS);
    if (!token) return { status: "not_configured" };
    const last30 = [{ startDate: "30daysAgo", endDate: "yesterday" }];
    const [s7, s30, daily, pages, channels, countries, devices] = await Promise.all([
      runReport(token, { dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }], metrics: [{ name: "sessions" }] }),
      runReport(token, { dateRanges: last30, metrics: [{ name: "sessions" }, { name: "totalUsers" }] }),
      runReport(token, { dateRanges: last30, dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }], orderBys: [{ dimension: { dimensionName: "date" } }] }),
      runReport(token, { dateRanges: last30, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 10 }),
      runReport(token, { dateRanges: last30, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 10 }),
      runReport(token, { dateRanges: last30, dimensions: [{ name: "country" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 10 }),
      runReport(token, { dateRanges: last30, dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "sessions" }] }),
    ]);
    return {
      status: "ok",
      sessions7d: total(s7),
      sessions30d: total(s30),
      users30d: total(s30, 1),
      daily: list(daily).map((d) => ({
        date: `${d.key.slice(0, 4)}-${d.key.slice(4, 6)}-${d.key.slice(6, 8)}`,
        value: d.value,
      })),
      topPages: list(pages),
      channels: list(channels),
      countries: list(countries),
      devices: list(devices),
    };
  } catch (e) {
    return { status: "error", code: e instanceof Error ? e.message.slice(0, 60) : "unknown_error" };
  }
}
