"use client";

/**
 * RichTextEditor — POL4-A1 (AGENT ELISE)
 *
 * Éditeur formaté minimaliste TipTap pour l'admin.
 * AUTORISE : paragraphes, gras (B), italique (I), sauts de ligne (Maj+Entrée).
 * INTERDIT : titres (h1-h6), listes, citations, code, code-block, strike,
 *            séparateurs, images.
 *
 * Sortie HTML : `<p>`, `<strong>`, `<em>`, `<br>` — sanitizable strictement
 * côté rendu public (cf. AGENT MARC).
 *
 * Composant CONTRÔLÉ : `value` (HTML) + `onChange(html)`. À utiliser
 * conjointement avec un `<input type="hidden" name="..." value={...} />`
 * sœur pour soumettre la valeur via un `<form action={...}>` server action.
 */

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      // StarterKit fournit document/paragraph/text/bold/italic/hardBreak/history.
      // Tout le reste explicitement DÉSACTIVÉ par Julien (POL4-A1) :
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
        strike: false,
        code: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
    ],
    content: value,
    // SSR Next 16 : éviter hydration mismatch (ProseMirror DOM ≠ server render).
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] cursor-text px-3 py-2 font-sans text-sm text-[#1A1F2A] focus:outline-none [&_p]:mb-2 [&_p:last-child]:mb-0",
      },
    },
  });

  // Sync valeur externe → éditeur quand le parent change `value` (reset form,
  // reset après save, etc.). Ne pas dispatcher si la valeur courante est déjà
  // à jour pour éviter une boucle.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className="rounded-md border border-[#3D4F63]/20 bg-white focus-within:border-[#e0af6e]">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  return (
    <div className="flex gap-1 border-b border-[#3D4F63]/15 px-2 py-1.5">
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBold().run()}
        active={editor?.isActive("bold") ?? false}
        disabled={!editor}
        ariaLabel="Gras"
        title="Gras (Cmd/Ctrl + B)"
      >
        <span className="font-display font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        active={editor?.isActive("italic") ?? false}
        disabled={!editor}
        ariaLabel="Italique"
        title="Italique (Cmd/Ctrl + I)"
      >
        <span className="font-display italic">I</span>
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  ariaLabel,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title}
      className={`flex size-7 items-center justify-center rounded text-xs transition-colors disabled:opacity-40 ${
        active
          ? "bg-[#e0af6e] text-white"
          : "text-[#3D4F63] hover:bg-[#3D4F63]/10"
      }`}
    >
      {children}
    </button>
  );
}
