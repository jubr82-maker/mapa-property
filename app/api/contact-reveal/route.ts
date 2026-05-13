import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";

// User-Agents suspects: outils CLI / bibliothèques de scraping.
// Refuser d'emblée évite que les bots récoltent les coordonnées de contact.
const SUSPECT_UA =
  /curl|wget|python-requests|Go-http-client|HTTPie|Apache-HttpClient|libwww|scrapy|httpclient|axios\/|node-fetch|Java\//i;

type RevealType = "phone" | "email";
type RevealTarget = "julien" | "frederic";

interface RevealBody {
  type?: RevealType;
  target?: RevealTarget;
  token?: string;
}

// Fallback placeholders. Les vraies coordonnées DOIVENT venir des env vars
// Vercel `MAPA_PHONE` et `MAPA_EMAIL` (RGPD : pas de PII dans le repo public).
// Si l'env var n'est pas configurée, on retourne un message renvoyant
// l'utilisateur vers les mentions légales — source unique légalement obligatoire.
const FALLBACK_PHONE = "Voir mentions légales";
const FALLBACK_EMAIL = "Voir mentions légales";

export async function POST(req: Request) {
  const ip = clientIp(req) ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "";

  if (!ua || SUSPECT_UA.test(ua)) {
    console.log(`[contact-reveal] blocked suspect UA from ${ip} (UA: ${ua.slice(0, 80)})`);
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const limit = rateLimit(req, {
    windowMs: 15 * 60_000,
    max: 5,
    namespace: "contact-reveal",
  });
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  let body: RevealBody = {};
  try {
    body = (await req.json()) as RevealBody;
  } catch {
    /* empty body tolerated, validated below */
  }

  if (body.type !== "phone" && body.type !== "email") {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  // Turnstile optionnel: si le client a fourni un token ET que la clé serveur
  // est configurée, on vérifie. Sinon, on laisse passer (UA + rate limit suffisent).
  if (body.token && process.env.TURNSTILE_SECRET_KEY) {
    const ok = await verifyTurnstile(body.token, ip);
    if (!ok) {
      return NextResponse.json({ error: "captcha_failed" }, { status: 403 });
    }
  }

  const target: RevealTarget = body.target === "frederic" ? "frederic" : "julien";
  const phone =
    target === "frederic"
      ? (process.env.MAPA_PHONE_FREDERIC ?? FALLBACK_PHONE)
      : (process.env.MAPA_PHONE ?? FALLBACK_PHONE);
  const email = process.env.MAPA_EMAIL ?? FALLBACK_EMAIL;

  console.log(
    `[contact-reveal] ${body.type}/${target} revealed to ${ip} (UA: ${ua.slice(0, 80)})`,
  );

  if (body.type === "phone") {
    return NextResponse.json({ phone });
  }
  return NextResponse.json({ email });
}

export const dynamic = "force-dynamic";
