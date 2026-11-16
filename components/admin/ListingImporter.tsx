"use client";

/**
 * ListingImporter : « Importer une annonce » en haut de « Nouveau bien »
 * (nov. 2026). Trois gestes : coller le contenu de l'annonce Apimo ou
 * immotop, deposer un dossier de photos (ou plusieurs photos, ou un .zip),
 * cliquer « Remplir l'annonce ».
 *
 * Deroulement :
 *   1. importListing (serveur) : champs reconnus et controles, traduction,
 *      brouillon enregistre (jamais publie) ;
 *   2. photos de l'annonce puis photos deposees, chacune dans son
 *      propre appel court (importPastedPhoto ou uploadPropertyPhoto,
 *      la meme chaine qu'une photo ajoutee a la main) ; une photo en echec
 *      n'arrete rien, elle est listee et peut etre reprise ;
 *   3. ordre des photos enregistre, puis ouverture du brouillon avec le
 *      resume de l'import (sessionStorage, cf. ImportSummaryBanner).
 * Le contenu colle n'est jamais affiche en HTML : seul son texte apparait.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FolderOpen, ImagePlus } from "lucide-react";
import { importListing, type ImportSummary } from "@/app/admin/properties/import-actions";
import { importPastedPhoto, savePropertyPhotos, uploadPropertyPhoto } from "@/app/admin/properties/[id]/photos/actions";
import { compressImageFile } from "@/lib/image-compress";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/images/limits";
import { extractPasted, lightenHtml, MAX_IMPORT_PHOTOS } from "@/lib/import-listing/extract";
import { isImageName, readZipImages, sortByName, ZipError } from "@/lib/import-listing/zip";
import { importSummaryKey, mimeOfName, type StoredImportSummary } from "@/lib/import-listing/summary";

type LocalPhoto = { name: string; file: File };
type Task = { label: string; remote?: { url: string; token: string }; file?: File };
type Done = { url: string; path: string };

const CONCURRENCY = 3;

/** Fichiers d'un glisser-deposer, dossiers compris (parcours recursif). */
async function filesFromDrop(items: DataTransferItemList): Promise<{ name: string; file: File }[]> {
  const out: { name: string; file: File }[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push({ name: prefix + file.name, file });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const e of batch) await walk(e, `${prefix}${entry.name}/`);
      }
    }
  };
  const entries = Array.from(items)
    .map((i) => (i.kind === "file" ? i.webkitGetAsEntry?.() : null))
    .filter((e): e is FileSystemEntry => Boolean(e));
  if (entries.length) for (const e of entries) await walk(e, "");
  else for (const i of Array.from(items)) {
    const f = i.getAsFile();
    if (f) out.push({ name: f.name, file: f });
  }
  return out;
}

async function runLimited(count: number, worker: (i: number) => Promise<void>, limit = CONCURRENCY) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, count) }, async () => {
      while (next < count) await worker(next++);
    }),
  );
}

export function ListingImporter() {
  const t = useTranslations("admin_properties");
  const router = useRouter();
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  // Texte tel que colle : s'il est retouche, c'est le texte retouche qui est lu.
  const [pastedText, setPastedText] = useState("");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [fileNotes, setFileNotes] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [enhance, setEnhance] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Etat d'un import en cours (reprise des photos en echec).
  const [job, setJob] = useState<{ summary: ImportSummary; tasks: Task[]; done: (Done | null)[]; failures: { index: number; label: string; message: string }[] } | null>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);
  const filesInput = useRef<HTMLInputElement | null>(null);

  const preview = useMemo(() => extractPasted({ html, text }), [html, text]);

  // Collage : le HTML (images de l'annonce) est garde a part, la zone
  // n'affiche que le texte.
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const h = e.clipboardData.getData("text/html");
    const p = e.clipboardData.getData("text/plain");
    if (!h && !p) return;
    e.preventDefault();
    setHtml(h ? lightenHtml(h) : "");
    const shown = p || extractPasted({ html: h }).text;
    setText(shown);
    setPastedText(shown);
    setError(null);
  }

  async function addFiles(list: { name: string; file: File }[]) {
    setReading(true);
    const notes: string[] = [];
    const found: LocalPhoto[] = [];
    for (const { name, file } of list) {
      if (/\.zip$/i.test(name) || file.type === "application/zip") {
        try {
          const imgs = await readZipImages(await file.arrayBuffer());
          for (const z of imgs) {
            const base = z.name.split("/").pop() ?? z.name;
            found.push({ name: `${name}/${z.name}`, file: new File([z.data as BlobPart], base, { type: mimeOfName(base) }) });
          }
        } catch (e) {
          notes.push(t("import_zip_error", { name, reason: e instanceof ZipError ? t(`import_zip_${e.message}`) : t("import_zip_corrupt") }));
        }
      } else if (isImageName(name) || file.type.startsWith("image/")) {
        found.push({ name, file });
      }
    }
    setPhotos((prev) => {
      const seen = new Set(prev.map((p) => `${p.name}:${p.file.size}`));
      return sortByName([...prev, ...found.filter((p) => !seen.has(`${p.name}:${p.file.size}`))], (p) => p.name);
    });
    setFileNotes(notes);
    setReading(false);
  }

  function onPick(files: FileList | null) {
    if (!files?.length) return;
    void addFiles(Array.from(files).map((f) => ({ name: f.webkitRelativePath || f.name, file: f })));
    if (folderInput.current) folderInput.current.value = "";
    if (filesInput.current) filesInput.current.value = "";
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    void addFiles(await filesFromDrop(e.dataTransfer.items));
  }

  /**
   * Photos des taches indiquees ; renvoie les echecs. Les actions serveur
   * appelees depuis le navigateur sont traitees l'une apres l'autre par
   * Next.js : chaque photo reste un appel court (bien sous 300 secondes).
   */
  async function runPhotos(summary: ImportSummary, tasks: Task[], done: (Done | null)[], indices: number[]) {
    const failures: { index: number; label: string; message: string }[] = [];
    let count = 0;
    setStep(t("import_step_photos", { done: 0, total: indices.length }));
    await runLimited(indices.length, async (k) => {
      const i = indices[k];
      const task = tasks[i];
      try {
        let r: { ok: true; url: string; path: string } | { ok: false; error: string };
        if (task.remote) {
          r = await importPastedPhoto(summary.id, task.remote.url, task.remote.token, enhance);
        } else if (task.file && task.file.size > MAX_PHOTO_BYTES) {
          r = { ok: false, error: t("err_file_too_large", { max: MAX_PHOTO_MB }) };
        } else {
          const fd = new FormData();
          fd.append("file", await compressImageFile(task.file as File));
          if (enhance) fd.append("enhance", "1");
          r = await uploadPropertyPhoto(summary.id, fd);
        }
        if (r.ok) done[i] = { url: r.url, path: r.path };
        else failures.push({ index: i, label: task.label, message: r.error });
      } catch {
        failures.push({ index: i, label: task.label, message: t("import_photo_network") });
      }
      count++;
      setStep(t("import_step_photos", { done: count, total: indices.length }));
    });
    // Ordre de l'annonce, puis du dossier ; premiere photo = photo principale.
    const ordered = done.filter((d): d is Done => Boolean(d)).map((d, order) => ({ ...d, isCover: order === 0, order }));
    if (ordered.length) {
      setStep(t("import_step_saving"));
      const saved = await savePropertyPhotos(summary.id, ordered).catch(() => ({ ok: false as const, error: t("err_photo_save") }));
      if (!saved.ok) failures.push({ index: -1, label: t("import_order_label"), message: saved.error });
    }
    return failures.sort((a, b) => a.index - b.index);
  }

  function finish(summary: ImportSummary, tasks: Task[], done: (Done | null)[], failures: { label: string; message: string }[]) {
    const stored: StoredImportSummary = {
      ...summary,
      images: [],
      photosImported: done.filter(Boolean).length,
      photosTotal: tasks.length,
      photoFailures: failures.map((f) => `${f.label} : ${f.message}`),
      enhanced: enhance,
    };
    try {
      sessionStorage.setItem(importSummaryKey(summary.id), JSON.stringify(stored));
    } catch {
      // Navigation privee : le resume se limite aux champs a completer.
    }
    router.push(`/admin/properties/${summary.id}?import=1`);
  }

  async function submit() {
    setError(null);
    if (!text.trim() && !html.trim()) {
      setError(t("import_need_content"));
      return;
    }
    setBusy(true);
    setStep(t("import_step_reading"));
    try {
      const res = await importListing({ html, text, textEdited: Boolean(html) && text !== pastedText });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const summary = res.summary;
      const tasks: Task[] = [
        ...summary.images.map((img, i) => ({ label: t("import_photo_label", { n: i + 1 }), remote: img })),
        ...photos.map((p) => ({ label: p.name, file: p.file })),
      ];
      const kept = tasks.slice(0, MAX_IMPORT_PHOTOS);
      const over = tasks.slice(MAX_IMPORT_PHOTOS).map((x, k) => ({ index: MAX_IMPORT_PHOTOS + k, label: x.label, message: t("import_photo_limit", { max: MAX_IMPORT_PHOTOS }) }));
      const done: (Done | null)[] = kept.map(() => null);
      const failures = [...(await runPhotos(summary, kept, done, kept.map((_, i) => i))), ...over];
      if (failures.length) {
        setJob({ summary, tasks: kept, done, failures });
        setStep(null);
        return;
      }
      finish(summary, kept, done, []);
    } catch (e) {
      setError(t("err_network", { message: e instanceof Error ? e.message : "" }));
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!job) return;
    setBusy(true);
    try {
      const indices = job.failures.filter((f) => f.index >= 0 && f.index < job.tasks.length).map((f) => f.index);
      const over = job.failures.filter((f) => f.index >= job.tasks.length);
      const failures = [...(await runPhotos(job.summary, job.tasks, job.done, indices)), ...over];
      if (failures.some((f) => f.index < job.tasks.length)) setJob({ ...job, failures });
      else finish(job.summary, job.tasks, job.done, failures);
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  const labelCls = "block font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft";
  const btnGhost =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/25 px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50";

  return (
    <section className="rounded-2xl bg-bg-soft px-5 py-7 sm:px-8 sm:py-9" data-listing-importer>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold-deep">{t("import_kicker")}</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">{t("import_title")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-mid">{t("import_intro")}</p>

      <label className="mt-7 block">
        <span className={labelCls}>{t("import_paste_label")}</span>
        <textarea
          value={text}
          onPaste={onPaste}
          onChange={(e) => {
            setText(e.target.value);
            if (!e.target.value.trim()) setHtml("");
          }}
          rows={7}
          placeholder={t("import_paste_placeholder")}
          disabled={busy}
          className="mt-2 block min-h-44 w-full resize-y rounded-xl border border-line bg-bg px-4 py-3 text-base text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      </label>
      {(text.trim() || html) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-mid" role="status">
          <span>{t("import_pasted_stats", { chars: preview.text.length, images: preview.images.length })}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setText("");
              setHtml("");
            }}
            className="min-h-11 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft underline underline-offset-4 hover:text-gold-deep"
          >
            {t("import_clear")}
          </button>
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-6 rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors ${dragOver ? "border-gold bg-bg" : "border-ink/15"}`}
      >
        <p className="text-base text-ink">{t("import_drop_title")}</p>
        <p className="mx-auto mt-1 max-w-xl text-xs text-ink-soft">{t("import_drop_hint", { max: MAX_IMPORT_PHOTOS })}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" disabled={busy} onClick={() => folderInput.current?.click()} className={`${btnGhost} max-md:hidden`}>
            <FolderOpen className="size-4" aria-hidden />
            {t("import_pick_folder")}
          </button>
          <button type="button" disabled={busy} onClick={() => filesInput.current?.click()} className={btnGhost}>
            <ImagePlus className="size-4" aria-hidden />
            {t("import_pick_files")}
          </button>
        </div>
        <input
          ref={folderInput}
          type="file"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => onPick(e.target.files)}
          {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        />
        <input ref={filesInput} type="file" multiple accept="image/*,.heic,.heif,.zip,application/zip" className="sr-only" tabIndex={-1} onChange={(e) => onPick(e.target.files)} />
        {reading && <p className="mt-4 text-sm text-ink-mid" role="status">{t("import_zip_reading")}</p>}
        {photos.length > 0 && (
          <div className="mt-4 text-sm text-ink-mid">
            <p>
              {t("import_files_count", { count: photos.length })}
              {" · "}
              <span className="font-mono text-xs">{photos.slice(0, 3).map((p) => p.name.split("/").pop()).join(", ")}{photos.length > 3 ? ", ..." : ""}</span>
            </p>
            <button type="button" disabled={busy} onClick={() => setPhotos([])} className="mt-1 min-h-11 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft underline underline-offset-4 hover:text-gold-deep">
              {t("import_files_clear")}
            </button>
          </div>
        )}
        {fileNotes.map((n) => (
          <p key={n} className="mt-2 text-sm text-red-700">
            {n}
          </p>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} disabled={busy} className="mt-1 size-5 accent-gold" />
          <span>
            <span className="block text-base text-ink">{t("import_enhance")}</span>
            <span className="block text-xs text-ink-soft">{t("import_enhance_hint")}</span>
          </span>
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={busy || reading || job != null}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-ink px-8 font-mono text-xs uppercase tracking-[0.2em] text-bg transition-colors hover:bg-gold-deep disabled:opacity-50"
        >
          {busy ? t("import_working") : t("import_submit")}
        </button>
      </div>

      {step && (
        <p className="mt-4 text-sm font-semibold text-ink" role="status" aria-live="polite">
          {step}
        </p>
      )}
      {error && (
        <p className="mt-4 whitespace-pre-line text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {job && (
        <div className="mt-6 border-t border-line pt-5" role="alert">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-red-700">{t("import_failed_title", { count: job.failures.length })}</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-mid">
            {job.failures.map((f) => (
              <li key={`${f.index}-${f.label}`}>
                {f.label} : {f.message}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={retry} disabled={busy} className={btnGhost}>
              {t("import_retry")}
            </button>
            <button type="button" onClick={() => finish(job.summary, job.tasks, job.done, job.failures)} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 font-mono text-[11px] uppercase tracking-[0.18em] text-bg hover:bg-gold-deep disabled:opacity-50">
              {t("import_open_draft")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
