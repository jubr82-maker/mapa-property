// Bouton "Exporter en PDF" partage par les fiches admin (lead, mandat,
// estimation). Lien statique vers un Route Handler (pas de fetch+blob) :
// le telechargement est gere nativement par le navigateur.
export function PdfExportButton({
  href,
  label = "Exporter en PDF",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-[#3D4F63]/30 bg-white px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3D4F63] transition-colors hover:border-[#e0af6e] hover:text-[#9E7B2A]"
    >
      {label}
    </a>
  );
}
