// Bouton d'export PDF partage par les fiches admin (lead, mandat,
// estimation). Lien statique vers un Route Handler (pas de fetch+blob) :
// le telechargement est gere nativement par le navigateur. Composant
// serveur (libelle par defaut via next-intl, "admin_workflow").
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

export async function PdfExportButton({
  href,
  label,
}: {
  href: string;
  label?: string;
}) {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-[#3D4F63]/30 bg-white px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3D4F63] transition-colors hover:border-[#e0af6e] hover:text-[#9E7B2A]"
    >
      {label ?? t("pdf_export")}
    </a>
  );
}
