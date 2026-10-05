"use client";

/**
 * PhotoManager : gestion des photos d'un bien.
 *
 * Composant générique gestion photos : upload multi-fichier, grid 4 cols,
 * drag-and-drop HTML5 natif pour réordonner, sélection cover (sort=0),
 * suppression. Zéro dépendance externe.
 *
 * Branchable sur n'importe quel modèle (biens, off-market, etc.)
 * via les 3 callbacks server actions (onUpload / onSave / onDelete).
 *
 * Type `PhotoData` : { url, path, isCover, order }.
 *
 * Mission "envoi de photos robuste et erreurs visibles" : réécriture de
 * handleFiles (cf. commentaire détaillé sur la fonction) : traitement
 * strictement séquentiel, un `setPhotos` par fichier réussi (jamais un
 * seul commit global en fin de boucle), progression visible, limite de
 * taille vérifiée avant l'envoi, échecs par fichier collectés et affichés
 * sans jamais casser l'affichage de la liste ni du compteur.
 *
 * Oct. 2026 (decision de Julien : la fiche publique affiche exactement les
 * photos de l'admin) : chaque changement est ENREGISTRE AUTOMATIQUEMENT
 * (fin d'un envoi, ordre, photo principale, retrait). Auparavant, les
 * photos envoyees n'existaient que dans l'etat local de cette page tant
 * que "Enregistrer l'ordre" n'etait pas clique : la table property_images,
 * lue par la fiche publique, restait inchangee.
 */

import { useState, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import { compressImageFile } from "@/lib/image-compress";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/images/limits";

// Valeur large (HEIC/HEIF sans type MIME reconnu sur certains OS/
// navigateurs) : le controle reel du format se fait server-side, par le
// contenu, pas ici (cf. lib/images/process-upload.ts).
const ACCEPT_ATTRIBUTE = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.tif,.tiff";

export interface PhotoData {
  url: string;
  path: string;
  isCover: boolean;
  order: number;
}

type UploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

interface Props {
  initialPhotos: PhotoData[];
  /** Upload un fichier vers Storage. Ne throw jamais : résultat structuré. */
  onUpload: (formData: FormData) => Promise<UploadResult>;
  /** Persiste l'état complet (ordre + cover). Ne throw jamais. */
  onSave: (photos: PhotoData[]) => Promise<ActionResult>;
  /** Supprime un fichier du Storage. Ne throw jamais. */
  onDelete: (path: string) => Promise<ActionResult>;
}

export function PhotoManager({
  initialPhotos,
  onUpload,
  onSave,
  onDelete,
}: Props) {
  const t = useTranslations("admin_properties");
  // On normalise toujours l'ordre à partir de l'index courant : order/isCover
  // recalculés à chaque mutation pour rester cohérents.
  const [photos, setPhotos] = useState<PhotoData[]>(() =>
    initialPhotos.map((p, i) => ({ ...p, order: i, isCover: i === 0 })),
  );
  const [busy, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragSrcIdx = useRef<number | null>(null);
  // Copie synchrone de la liste courante, pour enregistrer l'etat exact
  // juste apres une mutation (setPhotos est asynchrone).
  const photosRef = useRef<PhotoData[]>(photos);

  function commit(list: PhotoData[]) {
    photosRef.current = list;
    setPhotos(list);
  }

  // Enregistrements en file, jamais en parallele : savePropertyPhotos
  // remplace toutes les lignes du bien (suppression puis ajout), deux
  // appels simultanes pourraient dupliquer des lignes. Chaque passage
  // enregistre la liste la plus recente.
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  async function saveLatest(): Promise<void> {
    try {
      const result = await onSave(photosRef.current);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFeedback(t("photos_autosaved"));
    } catch {
      setError(t("err_photo_save"));
    }
  }

  function persist(list: PhotoData[]) {
    photosRef.current = list;
    const run = saveChain.current.then(saveLatest);
    saveChain.current = run;
    startTransition(() => run);
  }
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function renormalize(list: PhotoData[]): PhotoData[] {
    return list.map((p, i) => ({ ...p, order: i, isCover: i === 0 }));
  }

  // Traite les fichiers un par un, jamais en une seule fois (mission point
  // 2) : chaque fichier réussi est commité immédiatement à l'état
  // (setPhotos) au lieu d'accumuler dans une variable locale envoyée en
  // un seul bloc en fin de boucle. Ainsi, si un fichier échoue (taille,
  // conversion, réseau), les photos déjà envoyées avant lui restent
  // visibles et le compteur reste exact, jamais de "0 photo" après un
  // échec partiel. La progression ("2/8…") est visible pendant l'envoi et
  // les échecs sont listés individuellement, jamais un message générique
  // opaque.
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setFeedback(null);
    const list = Array.from(files);
    const failures: string[] = [];
    let added = 0;
    setUploadErrors([]);
    setUploadProgress({ done: 0, total: list.length });

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const label = file.name || t("file_fallback", { n: i + 1 });

      if (file.size > MAX_PHOTO_BYTES) {
        failures.push(t("photo_too_large", { name: label, max: MAX_PHOTO_MB }));
        setUploadProgress({ done: i + 1, total: list.length });
        continue;
      }

      try {
        // compressImageFile retombe sur le fichier original en cas
        // d'échec (ex. HEIC non décodable par le navigateur) : la
        // conversion faite ensuite côté serveur reste autoritaire.
        const compressed = await compressImageFile(file);
        const fd = new FormData();
        fd.append("file", compressed);
        const result = await onUpload(fd);
        if (!result.ok) {
          failures.push(t("photo_failure", { name: label, message: result.error }));
        } else {
          // Commit immédiat, un par un, jamais de batch en fin de boucle.
          const prev = photosRef.current;
          commit(renormalize([...prev, { url: result.url, path: result.path, isCover: false, order: prev.length }]));
          added++;
        }
      } catch {
        // Filet ultime (ex. coupure réseau pendant l'appel) : jamais
        // laisser une exception non gérée remonter hors de cette boucle.
        failures.push(t("photo_network_failure", { name: label }));
      }
      setUploadProgress({ done: i + 1, total: list.length });
    }

    setUploadProgress(null);
    setUploadErrors(failures);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (added > 0) persist(photosRef.current);
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
      const next = [...photosRef.current];
      const [moved] = next.splice(src, 1);
      next.splice(targetIdx, 0, moved);
      const list = renormalize(next);
      commit(list);
      persist(list);
    };
  }

  function setCover(idx: number) {
    if (idx === 0) return;
    const next = [...photosRef.current];
    const [chosen] = next.splice(idx, 1);
    next.unshift(chosen);
    const list = renormalize(next);
    commit(list);
    persist(list);
  }

  function removeAt(idx: number) {
    const p = photos[idx];
    if (!confirm(t("confirm_delete_photo"))) return;
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await onDelete(p.path);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const list = renormalize(photosRef.current.filter((x) => x.path !== p.path || x.url !== p.url));
        commit(list);
        // Enregistre aussi une liste vide : la fiche publique ne doit plus
        // pointer vers un fichier retire.
        persist(list);
      } catch {
        setError(t("err_photo_delete"));
      }
    });
  }

  function save() {
    setError(null);
    setFeedback(null);
    persist(photosRef.current);
  }


  return (
    <div className="space-y-4">
      <label className="block rounded-xl border-2 border-dashed border-[#3D4F63]/20 bg-[#F5EFE1] p-6 text-center hover:border-[#e0af6e]">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63]">
          {uploadProgress
            ? t("upload_progress", { done: uploadProgress.done, total: uploadProgress.total })
            : t("upload_cta")}
        </p>
        <p className="mt-1 text-xs text-[#3D4F63]/60">
          {t("upload_hint", { max: MAX_PHOTO_MB })}
        </p>
      </label>

      {uploadErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-700/80">
            {t("upload_failed_count", { count: uploadErrors.length })}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {uploadErrors.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {photos.length === 0 && !uploadProgress && (
        <p className="text-sm text-[#3D4F63]/60">{t("photos_empty")}</p>
      )}

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
                  alt={t("photo_alt", { n: idx + 1 })}
                  className="size-full object-cover"
                  draggable={false}
                />
                {idx === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#e0af6e] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white">
                    {t("main_photo")}
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
                      ? "border-[#e0af6e] text-[#e0af6e]"
                      : "border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
                  }`}
                  title={t("set_main_title")}
                >
                  {t("set_main")}
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  disabled={busy}
                  className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-40"
                  title={t("delete_photo_title")}
                  aria-label={t("delete_photo_title")}
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
          disabled={busy || uploadProgress != null || photos.length === 0}
          className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
        >
          {busy ? t("saving") : t("save_order")}
        </button>
        {feedback && (
          <span className="text-sm text-emerald-700">{feedback}</span>
        )}
        {error && (
          <span className="text-sm text-red-700">{t("error_prefix", { message: error })}</span>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
          {t("photo_count", { count: photos.length })}
        </span>
      </div>
    </div>
  );
}
