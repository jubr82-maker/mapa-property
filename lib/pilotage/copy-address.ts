// Copie d'une adresse dans le presse-papiers (nov. 2026, bouton « Copier et
// ouvrir Search Console »). D'abord l'ancienne methode (zone de texte
// selectionnee + copie), executee tout de suite pendant le clic, avant que
// le nouvel onglet ne prenne le focus ; puis l'API du presse-papiers si
// elle echoue. Renvoie false si le navigateur refuse : l'adresse est alors
// affichee selectionnee pour etre copiee a la main.

export type CopyDeps = {
  clipboard?: { writeText: (text: string) => Promise<void> } | null;
  legacyCopy?: (text: string) => boolean;
};

export async function copyText(text: string, deps: CopyDeps): Promise<boolean> {
  // Partie synchrone (avant tout await) : reste dans le geste de l'utilisateur.
  let ok = false;
  try {
    ok = deps.legacyCopy ? deps.legacyCopy(text) : false;
  } catch {
    ok = false;
  }
  if (ok) return true;
  if (!deps.clipboard?.writeText) return false;
  try {
    await deps.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Ancienne methode de copie, dans le navigateur uniquement. */
export function legacyCopyInDocument(text: string): boolean {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}
