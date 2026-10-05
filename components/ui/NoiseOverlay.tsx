/**
 * Grain SVG statique global (light + dark). pointer-events-none, fixe,
 * mix-blend-overlay très léger. POL3-7 — décor, aucune interaction.
 */
export function NoiseOverlay() {
  return (
    <div
      aria-hidden="true"
      // Perf mobile (oct. 2026) : grain (opacite 2,5 %) masque sous 768 px.
      // Calque plein ecran fixe en mode de fusion : repeint a chaque
      // defilement, cout eleve sur telephone pour un effet a peine visible.
      className="pointer-events-none fixed inset-0 z-[1] hidden opacity-[0.025] mix-blend-overlay md:block"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 200px",
      }}
    />
  );
}
