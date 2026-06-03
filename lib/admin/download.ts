// Sprint Export RGPD — helper client de telechargement.
//
// Factorise le pattern Blob utilise dans components/admin/ArcovaTable.tsx
// (~lignes 35-58) mais en JSON et reutilisable depuis n'importe quel
// composant admin client.
//
// Cote SSR : la fonction throw immediatement (URL.createObjectURL +
// document n'existent pas). Reserver l'import a des "use client" components.

export function downloadJson(filename: string, data: unknown): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("downloadJson must be called from a client component");
  }
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
