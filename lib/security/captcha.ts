// Verification anti-robots (Turnstile) exigee SEULEMENT si les deux cles
// sont configurees. Sans cela, verifyTurnstile refuse tout en production
// (lib/turnstile.ts) et le parcours concerne deviendrait inutilisable.
import { verifyTurnstile } from "@/lib/turnstile";

export function captchaConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() && process.env.TURNSTILE_SECRET_KEY?.trim(),
  );
}

export async function verifyCaptchaIfConfigured(
  token: string | null | undefined,
  ip?: string,
): Promise<{ ok: boolean; reason?: "captcha" | "captcha_not_configured" }> {
  if (!captchaConfigured()) return { ok: true, reason: "captcha_not_configured" };
  const ok = await verifyTurnstile(token ?? undefined, ip);
  return ok ? { ok: true } : { ok: false, reason: "captcha" };
}
