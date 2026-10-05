// Ligne "Recu le ... (heure de Luxembourg)" des e-mails internes : date et
// heure d'envoi (= de reception de la demande), utilitaire unique
// lib/datetime.ts, fuseau Europe/Luxembourg, libelle next-intl.
import { formatDateTime } from "@/lib/datetime";
import { getAdminDateTimeT } from "@/lib/admin/datetime-labels";

export async function receivedAtLine(at: Date = new Date()): Promise<string> {
  try {
    const t = await getAdminDateTimeT();
    return t("email_received", { date: formatDateTime(at) });
  } catch {
    // Jamais bloquant pour l'envoi : date seule si les libelles manquent.
    return formatDateTime(at);
  }
}
