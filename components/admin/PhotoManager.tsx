"use client";

/**
 * PhotoManager — POL4-A3 (AGENT HUGO)
 *
 * Composant générique gestion photos : upload multi-fichier, grid 4 cols,
 * drag-and-drop HTML5 natif pour réordonner, sélection cover (sort=0),
 * suppression. Zéro dépendance externe.
 *
 * Branchable sur n'importe quel modèle (properties Apimo / off-market / …)
 * via les 3 callbacks server actions (onUpload / onSave / onDelete).
 *
 * Type `PhotoData` : { url, path, isCover, order }.
 */

import { useState, useTransition, useRef } from "react";

export interface PhotoData {
  url: string;
  path: string;
  isCover: boolean;
  order: number;
}

interface Props {
  initialPhotos: PhotoData[];
  /** Upload un fichier vers Storage. Retourne url + path (clé bucket). */
  onUpload: (formData: FormData) => Promise<{ url: string; path: string }>;
  /** Persiste l'état complet (ordre + cover). */
  onSave: (photos: PhotoData[]) => Promise<{ ok: true }>;
  /** Supprime un fichier du Storage. */
  onDelete: (path: string) => Promise<{ ok: true }>;
}

export function PhotoManager({
  initialPhotos,
  onUpload,
  onSave,
  onDelete,
}: Props) {
  // On normalise toujours l'ordre à partir de l'index courant — order/isCover
  // recalculés à chaque mutation pour rester cohérents.
  const [photos, setPhotos] = useState<PhotoData[]>(() =>
    initialPhotos.map((p, i) => ({ ...p, order: i, isCover: i === 0 })),
  );
  const [busy, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragSrcIdx = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function renormalize(list: PhotoData[]): PhotoData[] {
    return list.map((p, i) => ({ ...p, order: i, isCover: i === 0 }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setFeedback(null);
    setUploading(true);
    try {
      const next = [...photos];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const { url, path } = await onUpload(fd);
        next.push({ url, path, isCover: false, order: next.length });
      }
      setPhotos(renormalize(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onDragStart(idx: number) {
    return (e: React.DragEvent<HTMLLIElement>) => {
      dragSrcIdx.current = idx;
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function onDragOver(e: React.DragEvent<HTMLLIElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(targetIdx: number) {
    return (e: React.DragEvent<HTMLLIElement>) => {
      e.preventDefault();
      const src = dragSrcIdx.current;
      dragSrcIdx.current = null;
      if (src == null || src === targetIdx) return;
      const next = [...photos];
      const [moved] = next.splice(src, 1);
      next.splice(targetIdx, 0, moved);
      setPhotos(renormalize(next));
    };
  }

  function setCover(idx: number) {
    if (idx === 0) return;
    const next = [...photos];
    const [chosen] = next.splice(idx, 1);
    next.unshift(chosen);
    setPhotos(renormalize(next));
  }

  function removeAt(idx: number) {
    const p = photos[idx];
    if (!confirm("Supprimer cette photo ?")) return;
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        await onDelete(p.path);
        const next = photos.filter((_, i) => i !== idx);
        setPhotos(renormalize(next));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur suppression.");
      }
    });
  }

  function save() {
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        await onSave(photos);
        setFeedback("Ordre et cover enregistrés.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur enregistrement.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <label className="block rounded-xl border-2 border-dashed border-[#3D4F63]/20 bg-[#F5EFE1] p-6 text-center hover:border-[#B8865A]">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63]">
          {uploading ? "Upload en cours…" : "Cliquer pour ajouter des photos"}
        </p>
        <p className="mt-1 text-xs text-[#3D4F63]/60">
          JPG / PNG / WebP — la première (sort 0) sert de cover publique.
        </p>
      </label>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, idx) => (
            <li
              key={p.path}
              draggable
              onDragStart={onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={onDrop(idx)}
              className="group relative overflow-hidden rounded-xl border border-[#3D4F63]/15 bg-white"
            >
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`Photo ${idx + 1}`}
                  className="size-full object-cover"
                  draggable={false}
                />
                {idx === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#B8865A] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white">
                    Cover
                  </span>
                )}
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white">
                  #{idx + 1}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-2 text-[10px] uppercase tracking-[0.15em]">
                <button
                  type="button"
                  onClick={() => setCover(idx)}
                  disabled={idx === 0 || busy}
                  className={`rounded border px-2 py-1 transition-colors disabled:opacity-40 ${
                    idx === 0
                      ? "border-[#B8865A] text-[#B8865A]"
                      : "border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
                  }`}
                  title="Définir comme cover"
                >
                  ★ Cover
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  disabled={busy}
                  className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-40"
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy || uploading || photos.length === 0}
          className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#B8865A] disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer l'ordre"}
        </button>
        {feedback && (
          <span className="text-sm text-emerald-700">{feedback}</span>
        )}
        {error && (
          <span className="text-sm text-red-700">Erreur : {error}</span>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
          {photos.length} photo{photos.length > 1 ? "s" : ""} — glisser pour
          réordonner
        </span>
      </div>
    </div>
  );
}
