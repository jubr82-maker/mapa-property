"use client";

// Editeur visuel du texte des articles (seconde passe, oct. 2026), sur la
// bibliotheque deja installee (tiptap 3, @tiptap/react et starter-kit) :
// titres, gras, italique, listes, citations, liens, images. Remplace la
// saisie de HTML brut, qui reste disponible (bouton "HTML").
//
// Aucune perte : tiptap retire ce que son schema ne connait pas (tableaux,
// blocs <div> ou <span>, attributs class). Un texte qui en contient
// s'ouvre donc en mode HTML, avec une explication, et l'editeur visuel
// n'est propose qu'apres confirmation.
// Le texte est nettoye cote serveur a l'enregistrement
// (app/admin/blog/actions.ts, sanitizeArticleHtml) et a l'affichage.
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, Node, mergeAttributes, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { uploadBlogImage } from "@/app/admin/blog/actions";
import { compressImageFile } from "@/lib/image-compress";

/** Image du texte : <img src alt title>, rien d'autre. */
const ArticleImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: null }, title: { default: null } };
  },
  parseHTML() {
    return [{ tag: "img[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },
});

const SUPPORTED = new Set([
  "p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s",
  "a", "ul", "ol", "li", "blockquote", "img", "hr", "code", "pre",
]);

/**
 * Elements ou attributs que l'editeur visuel ne conserverait pas. Analyse
 * par expression reguliere, identique sur le serveur et dans le
 * navigateur (pas d'ecart a l'hydratation).
 */
export function unsupportedForVisual(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g)) {
    const tag = m[1].toLowerCase();
    if (!SUPPORTED.has(tag)) found.add(tag);
    if (/\s(class|style)\s*=/i.test(m[2])) found.add("class");
  }
  return [...found];
}

export function BlogBodyEditor({
  value,
  onChange,
  slug,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Adresse de la page, pour nommer les images envoyees. */
  slug: string;
}) {
  const t = useTranslations("admin_blog");
  const [mode, setMode] = useState<"visual" | "html">(() => (unsupportedForVisual(value).length ? "html" : "visual"));
  const unsupported = mode === "html" ? unsupportedForVisual(value) : [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["https", "mailto"] },
      }),
      ArticleImage,
    ],
    content: mode === "visual" ? value : "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose-mapa min-h-[240px] cursor-text px-3 py-2 font-sans text-base text-ink focus:outline-none [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded",
      },
    },
  });

  // Valeur exterieure (changement de langue) -> editeur.
  useEffect(() => {
    if (!editor || mode !== "visual") return;
    if (editor.getHTML() !== value) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor, mode]);

  const switchTo = (next: "visual" | "html") => {
    if (next === mode) return;
    if (next === "visual" && unsupportedForVisual(value).length && !window.confirm(t("editor_confirm_visual"))) return;
    setMode(next);
  };

  const onImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", await compressImageFile(file).catch(() => file));
    fd.set("slug", slug);
    const r = await uploadBlogImage(fd);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    editor.chain().focus().insertContent({ type: "image", attrs: { src: r.url, alt: "" } }).run();
  };

  const setLink = () => {
    if (!editor) return;
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt(t("link_prompt"), previous || "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") return void editor.chain().focus().unsetLink().run();
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="rounded-md border border-[#3D4F63]/20 bg-white focus-within:border-[#e0af6e]" data-admin-blog-editor>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3D4F63]/15 px-2 py-1.5">
        {mode === "visual" ? (
          <Toolbar editor={editor} onLink={setLink} onImage={() => fileRef.current?.click()} busy={busy} />
        ) : (
          <span />
        )}
        <div className="flex gap-1" role="group" aria-label={t("editor_mode")}>
          {(["visual", "html"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchTo(m)}
              aria-pressed={mode === m}
              className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
                mode === m ? "bg-[#3D4F63] text-[#F5EFE1]" : "text-[#3D4F63] hover:bg-[#3D4F63]/10"
              }`}
            >
              {t(m === "visual" ? "editor_visual" : "editor_html")}
            </button>
          ))}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />
      {error && <p className="px-3 pt-2 text-sm text-red-700">{error}</p>}
      {mode === "visual" ? (
        <EditorContent editor={editor} />
      ) : (
        <>
          {unsupported.length > 0 && (
            <p className="px-3 pt-2 text-sm text-ink-mid">{t("editor_unsupported", { items: unsupported.join(", ") })}</p>
          )}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={16}
            aria-label={t("editor_html")}
            className="block w-full rounded-b-md border-0 px-3 py-2 font-mono text-sm focus:outline-none"
          />
        </>
      )}
    </div>
  );
}

function Toolbar({
  editor,
  onLink,
  onImage,
  busy,
}: {
  editor: Editor | null;
  onLink: () => void;
  onImage: () => void;
  busy: boolean;
}) {
  const t = useTranslations("admin_blog");
  const items: { key: string; label: string; active?: boolean; run: () => void }[] = editor
    ? [
        { key: "h2", label: "H2", active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { key: "h3", label: "H3", active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
        { key: "bold", label: "B", active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
        { key: "italic", label: "I", active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
        { key: "bullet", label: "•", active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
        { key: "ordered", label: "1.", active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
        { key: "quote", label: "«", active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
        { key: "link", label: "↗", active: editor.isActive("link"), run: onLink },
        { key: "image", label: "▣", run: onImage },
        { key: "undo", label: "↶", run: () => editor.chain().focus().undo().run() },
        { key: "redo", label: "↷", run: () => editor.chain().focus().redo().run() },
      ]
    : [];
  return (
    <div className="flex flex-wrap gap-1" role="toolbar" aria-label={t("editor_toolbar")}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={it.run}
          disabled={busy && it.key === "image"}
          aria-label={t(`tb_${it.key}`)}
          title={t(`tb_${it.key}`)}
          aria-pressed={it.active ?? undefined}
          className={`flex size-8 items-center justify-center rounded text-sm transition-colors disabled:opacity-40 ${
            it.active ? "bg-[#e0af6e] text-white" : "text-[#3D4F63] hover:bg-[#3D4F63]/10"
          } ${it.key === "bold" ? "font-bold" : ""} ${it.key === "italic" ? "italic" : ""}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
