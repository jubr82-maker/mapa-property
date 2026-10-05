// Libelles de date et d'heure de l'admin (next-intl, namespace
// "admin_datetime"), dans la langue de l'admin. Cote serveur uniquement :
// les composants client recoivent des chaines deja formatees.
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

export function getAdminDateTimeT() {
  return getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_datetime" });
}
