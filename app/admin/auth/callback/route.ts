// Retour des liens e-mail Supabase (oct. 2026), notamment la
// reinitialisation du mot de passe. Cause de l'ancienne erreur "Auth
// session missing" : le lien revenait sur /admin/reset-password avec un
// ?code=... que personne n'echangeait contre une session ; cette route
// n'existait pas alors que le proxy la prevoyait.
//
// Deux formats acceptes :
//  - ?code=...                 flux PKCE (lien ouvert dans le MEME navigateur
//                              que la demande : verificateur en cookie) ;
//  - ?token_hash=...&type=...  modele d'e-mail Supabase recommande, valable
//                              sur n'importe quel appareil (cf. liste des
//                              reglages manuels du rapport).
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { safeAdminRedirect } from "@/lib/admin/security-config";
import { resetAdminActivity } from "@/lib/admin/activity";

const OTP_TYPES: ReadonlySet<string> = new Set(["recovery", "email", "magiclink", "signup", "invite", "email_change"]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeAdminRedirect(url.searchParams.get("next"), "/admin/reset-password");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const supabase = await createSupabaseServerClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    ok = !error;
  }

  // Session ouverte par le lien : activite remise a zero (lib/admin/activity.ts).
  if (ok) await resetAdminActivity(supabase);
  const target = new URL(ok ? next : "/admin/reset-password", request.url);
  if (!ok) target.searchParams.set("error", "invalid_link");
  const res = NextResponse.redirect(target);
  res.headers.set("cache-control", "private, no-store");
  return res;
}
