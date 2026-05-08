import { NextResponse } from "next/server";
import { estimateProperty, type EstimateInput } from "@/lib/estimate";
import { fetchLatestInterestRates } from "@/lib/data";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<EstimateInput>;

  if (
    !body.country ||
    !body.type ||
    !body.state ||
    !body.livingSurface ||
    Number(body.livingSurface) <= 0
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const rates = await fetchLatestInterestRates();
  const rate =
    rates?.rates?.fixed_25 ??
    rates?.rates?.fixed_20 ??
    rates?.rates?.fixed_30 ??
    3.6;

  const result = estimateProperty(body as EstimateInput, Number(rate));

  return NextResponse.json({ result, rate });
}

export const dynamic = "force-dynamic";
