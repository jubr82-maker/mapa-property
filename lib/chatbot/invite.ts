// Invitation d'Elena (nov. 2026), logique pure (composant et tests).
// Seulement sur une fiche bien ou off-market ; jamais vide : la bulle n'est
// affichee que si elle est visible ET qu'un texte existe pour la page.

export type InviteKey = "invite_property" | "invite_offmarket";

export function inviteKeyFor(pageContext: string): InviteKey | null {
  if (pageContext.startsWith("property:")) return "invite_property";
  if (pageContext.startsWith("offmarket:")) return "invite_offmarket";
  return null;
}

/** La bulle s'affiche seulement si visible, avec un texte, panneau ferme. */
export function showInvite(visible: boolean, key: InviteKey | null, open: boolean): key is InviteKey {
  return visible && key !== null && !open;
}

/** Visibilite apres un rendu : toute navigation la remet a false. */
export function visibleAfterRender(visible: boolean, lastPathname: string, pathname: string): boolean {
  return lastPathname !== pathname ? false : visible;
}
