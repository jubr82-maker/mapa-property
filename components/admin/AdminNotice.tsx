// Avertissement admin quand une fonction n'est pas disponible (oct. 2026).
// Remplace les anciens messages techniques (noms de fichiers SQL, colonnes,
// variables d'environnement) : le detail reste dans le depot et les
// journaux serveur, jamais a l'ecran.
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

export type AdminNoticeKind =
  | "workflow_partial"
  | "workflow_list"
  | "comparable"
  | "read_error"
  | "views_unavailable"
  | "cms_unavailable"
  | "source_not_configured"
  | "data_unavailable";

export async function AdminNotice({ kind }: { kind: AdminNoticeKind }) {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" });
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-700">{t(`${kind}_title`)}</p>
      <p className="mt-1">{t(kind)}</p>
    </div>
  );
}
