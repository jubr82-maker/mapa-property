// Date et heure de creation, et de derniere modification si elle existe,
// pour les listes et fiches de l'admin. Formatage : lib/datetime.ts (fuseau
// Europe/Luxembourg). Composant serveur.
import { formatDateTime, formatDateTimeShort } from "@/lib/datetime";
import { getAdminDateTimeT } from "@/lib/admin/datetime-labels";

export async function AdminDateCell({
  createdAt,
  updatedAt,
  variant = "short",
}: {
  createdAt: string | null | undefined;
  updatedAt?: string | null;
  variant?: "short" | "long";
}) {
  const t = await getAdminDateTimeT();
  const fmt = variant === "long" ? formatDateTime : formatDateTimeShort;
  const created = fmt(createdAt);
  const updated = updatedAt && updatedAt !== createdAt ? fmt(updatedAt) : "";
  if (variant === "long") {
    return (
      <span className="block">
        <span className="block">{t("created", { date: created })}</span>
        {updated && <span className="block opacity-70">{t("updated", { date: updated })}</span>}
      </span>
    );
  }
  return (
    <span className="block whitespace-nowrap">
      <span className="block">{created}</span>
      {updated && (
        <span className="block text-[10px] opacity-60">{t("updated", { date: updated })}</span>
      )}
    </span>
  );
}
