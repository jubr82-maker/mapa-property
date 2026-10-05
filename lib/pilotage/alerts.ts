// Alertes de securite par e-mail (oct. 2026), via la couche d'envoi IONOS
// existante (lib/email/smtp.ts) et ses destinataires internes. Textes en
// traductions (namespace admin_alerts). Best effort : jamais bloquant.
import { getTranslations } from "next-intl/server";
import { sendMail, INTERNAL_NOTIFICATION_RECIPIENTS } from "@/lib/email/smtp";
import { supabaseService } from "@/lib/supabase-service";
import { ADMIN_LOCALE, formatDateTime } from "@/lib/datetime";
import { LOGIN_BURST_THRESHOLD, LOGIN_BURST_WINDOW_MINUTES } from "@/lib/pilotage/config";

export type AdminAlertKind = "login_burst" | "factor_added" | "passkey_added" | "property_deleted";

export async function sendAdminAlert(
  kind: AdminAlertKind,
  facts: Record<string, string | number | null | undefined>,
): Promise<void> {
  try {
    const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_alerts" });
    const lines = [
      t(`${kind}_body`),
      "",
      ...Object.entries(facts)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${t(`fact_${k}`)} : ${v}`),
      `${t("fact_date")} : ${formatDateTime(new Date())}`,
      "",
      t("footer"),
    ];
    await sendMail({
      to: INTERNAL_NOTIFICATION_RECIPIENTS,
      subject: t(`${kind}_subject`),
      text: lines.join("\n"),
      kind: "security_alert",
    });
  } catch {
    console.warn("[admin-alert] envoi impossible", { kind });
  }
}

/**
 * Rafale d'echecs de connexion : une alerte quand le nombre d'echecs
 * (mot de passe, code, Passkey) des LOGIN_BURST_WINDOW_MINUTES dernieres
 * minutes atteint exactement LOGIN_BURST_THRESHOLD (une seule alerte par
 * rafale, pas une par tentative).
 */
export async function maybeAlertLoginBurst(): Promise<void> {
  try {
    const since = new Date(Date.now() - LOGIN_BURST_WINDOW_MINUTES * 60_000).toISOString();
    const { count, error } = await supabaseService()
      .from("admin_auth_log")
      .select("id", { count: "exact", head: true })
      .eq("success", false)
      .in("event", ["login", "mfa", "passkey_login"])
      .gte("created_at", since);
    if (error || count !== LOGIN_BURST_THRESHOLD) return;
    await sendAdminAlert("login_burst", {
      failures: count,
      window: `${LOGIN_BURST_WINDOW_MINUTES} min`,
    });
  } catch {
    console.warn("[admin-alert] controle de rafale impossible");
  }
}
