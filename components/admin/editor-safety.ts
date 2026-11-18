"use client";

// Regle unique des editeurs de texte de l'admin (nov. 2026) : selectionner
// du texte ne change JAMAIS sa mise en forme. Le gras et l'italique
// s'appliquent seulement au clic sur B ou I, ou avec Cmd+B et Cmd+I.
// Causes trouvees dans le code :
//   - regles de saisie et de collage automatiques de TipTap : **texte**,
//     __texte__, *texte* ou _texte_ tapes ou colles devenaient gras ou
//     italique ; liens crees automatiquement en tapant une adresse ;
//   - raccourcis en plus de Cmd+B et Cmd+I (Cmd+Maj+B, Cmd+Maj+I,
//     soulignement Cmd+U) ;
//   - boutons B et I jamais rafraichis quand la selection change (TipTap 3
//     ne redessine pas la barre a chaque deplacement) : B pouvait rester
//     allume sur du texte normal, et un clic pour « retirer » le gras le
//     mettait en realite.
import { Extension, useEditorState, type Editor } from "@tiptap/react";

/** Options de l'editeur : aucune regle de saisie ni de collage automatique. */
export const NO_AUTO_FORMAT = { enableInputRules: false, enablePasteRules: false } as const;

/**
 * Raccourcis : seuls Cmd+B (Ctrl+B) et Cmd+I (Ctrl+I) restent ; les
 * variantes avec Maj et le soulignement sont neutralises.
 */
export const OnlyBoldItalicShortcuts = Extension.create({
  name: "onlyBoldItalicShortcuts",
  priority: 1000,
  addKeyboardShortcuts() {
    const swallow = () => true;
    return { "Mod-B": swallow, "Mod-I": swallow, "Mod-u": swallow, "Mod-U": swallow };
  },
});

/** Etat reel de la selection, recalcule a chaque changement (selection comprise). */
export function useMarkState(editor: Editor | null): { bold: boolean; italic: boolean } {
  return (
    useEditorState({
      editor,
      selector: ({ editor: e }) => ({ bold: e?.isActive("bold") ?? false, italic: e?.isActive("italic") ?? false }),
    }) ?? { bold: false, italic: false }
  );
}
