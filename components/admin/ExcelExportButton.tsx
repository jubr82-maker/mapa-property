// Bouton "Exporter en Excel" partage par les listes admin (leads,
// mandats, demandes off-market, liste d'attente, estimations).
//
// `params` doit reprendre EXACTEMENT les valeurs de filtre effectives
// deja calculees par la page (pas seulement les query params bruts de
// l'URL) : certaines pages appliquent un filtre par defaut meme quand
// le param est absent de l'URL (ex. /admin/mandats section="vente" par
// defaut) — l'export doit refleter ce qui est reellement affiche, pas
// uniquement ce qui est ecrit dans la barre d'adresse.
//
// Simple lien <a> vers un Route Handler (pas de fetch+blob) : le
// telechargement est gere nativement par le navigateur via l'entete
// Content-Disposition, cookies de session transmis automatiquement
// (meme origine) pour que requireAdminRoute() cote serveur fonctionne.
// Composant server-renderable (aucun hook client requis).
export function ExcelExportButton({
  exportPath,
  params,
  label = "Exporter en Excel",
}: {
  exportPath: string;
  params?: Record<string, string | undefined | null>;
  label?: string;
}) {
  const qs = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value);
    }
  }
  const query = qs.toString();
  const href = query ? `${exportPath}?${query}` : exportPath;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-[#3D4F63]/30 bg-white px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3D4F63] transition-colors hover:border-[#e0af6e] hover:text-[#9E7B2A]"
    >
      {label}
    </a>
  );
}
