"use client";

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Connexion par Passkey (oct. 2026) : API marquee experimentale dans
// @supabase/auth-js, desactivee par defaut. Le drapeau n'active que les
// methodes signInWithPasskey, registerPasskey et auth.passkey.
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { experimental: { passkey: true } },
  });
}
