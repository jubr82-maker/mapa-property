// Journal des connexions admin (oct. 2026) : table public.admin_auth_log,
// ecriture service_role uniquement (RLS sans regle). JAMAIS de mot de passe,
// de code ou de jeton : evenement, e-mail saisi, resultat, motif, IP,
// navigateur. Best effort : n'echoue jamais, ne bloque jamais la connexion.
import { headers } from "next/headers";
import { supabaseService } from "@/lib/supabase-service";

export type AdminAuthEvent =
  | "login"
  | "mfa"
  | "password_change"
  | "password_reset"
  | "reset_request"
  | "factor_add"
  | "factor_remove"
  | "passkey_add"
  | "passkey_login"
  | "passkey_step"
  | "passkey_rename"
  | "passkey_remove"
  | "logout"
  | "idle_logout";

export async function logAdminAuthEvent(entry: {
  event: AdminAuthEvent;
  success: boolean;
  email?: string | null;
  reason?: string | null;
  /** Fournis par le proxy (pas d'acces a headers() dans ce contexte). */
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    let ip: string | null = entry.ip ?? null;
    let userAgent: string | null = entry.userAgent?.slice(0, 300) ?? null;
    if (!ip) try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
      userAgent = userAgent ?? h.get("user-agent")?.slice(0, 300) ?? null;
    } catch {
      // hors contexte de requete
    }
    const { error } = await supabaseService().from("admin_auth_log").insert({
      event: entry.event,
      success: entry.success,
      email: entry.email ? entry.email.trim().toLowerCase().slice(0, 200) : null,
      reason: entry.reason ? entry.reason.slice(0, 200) : null,
      ip,
      user_agent: userAgent,
    });
    if (error) console.warn("[admin-auth-log] insertion impossible", { code: error.code });
  } catch {
    console.warn("[admin-auth-log] journal indisponible");
  }
}

export type AdminAuthLogRow = {
  id: number;
  created_at: string;
  event: AdminAuthEvent;
  email: string | null;
  success: boolean;
  reason: string | null;
  ip: string | null;
};

export async function readAdminAuthLog(limit = 50): Promise<AdminAuthLogRow[]> {
  try {
    const { data, error } = await supabaseService()
      .from("admin_auth_log")
      .select("id,created_at,event,email,success,reason,ip")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as AdminAuthLogRow[];
  } catch {
    return [];
  }
}
