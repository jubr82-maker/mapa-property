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
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Camera, GripVertical, ImagePlus, Trash2 } from "lucide-react";
import { isOptimizedImageSrc } from "@/lib/image-hosts";
import { compressImageFile } from "@/lib/image-compress";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/images/limits";
import { isEnhancedPath } from "@/lib/images/enhance-paths";
import { BeforeAfter } from "@/components/admin/BeforeAfter";

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
/**
 * Resultat d'un enregistrement (nov. 2026) : `photos` = ce que voit le
 * visiteur apres l'enregistrement ; l'ecran s'aligne dessus.
 */
export type SaveResult = { ok: true; photos?: { url: string; path: string }[]; hiddenCount?: number } | { ok: false; error: string };
type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Amelioration des photos (nov. 2026), optionnelle : apercu sans rien
 * enregistrer, application apres validation, retour a l'original.
 */
export interface EnhanceHandlers {
  preview: (path: string) => Promise<{ ok: true; after: string } | { ok: false; error: string }>;
  apply: (path: string, url: string) => Promise<UploadResult>;
  revert: (path: string, url: string) => Promise<UploadResult>;
}

type ReviewItem = { path: string; url: string; after: string | null; error: string | null; keep: boolean };

interface Props {
  initialPhotos: PhotoData[];
  enhance?: EnhanceHandlers;
  /** Upload un fichier vers Storage. Ne throw jamais : résultat structuré. */
  onUpload: (formData: FormData) => Promise<UploadResult>;
  /**
   * Persiste l'etat complet (ordre + cover) ; `removed` : adresses des
   * seules photos supprimees par Julien (jamais d'effacement global).
   */
  onSave: (photos: PhotoData[], removed: string[]) => Promise<SaveResult>;
  /** Supprime un fichier du Storage, apres l'enregistrement. Ne throw jamais. */
  onDelete: (path: string) => Promise<ActionResult>;
  /** Lignes en base masquees sur le site (anciennes images Apimo). */
  initialHiddenCount?: number;
}

export function PhotoManager({
  initialPhotos,
  onUpload,
  onSave,
  onDelete,
  enhance,
  initialHiddenCount = 0,
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
    version.current++;
    setPhotos(list);
  }

  // Enregistrements en file, jamais en parallele : chaque passage
  // enregistre la liste la plus recente (nov. 2026 : mise a jour sans
  // effacement prealable, cote serveur). Indicateur « Enregistrement... »
  // puis « Enregistre », ou le motif de l'echec.
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [hiddenCount, setHiddenCount] = useState(initialHiddenCount);
  // Photos retirees par Julien, pas encore enregistrees (adresse -> fichier).
  const pendingRemoved = useRef(new Map<string, string>());
  // Numero du dernier changement : la reponse d'un enregistrement ne
  // remplace l'ecran que si rien n'a change depuis.
  const version = useRef(0);

  async function saveLatest(): Promise<void> {
    const sentVersion = version.current;
    const removed = [...pendingRemoved.current.entries()];
    try {
      const result = await onSave(photosRef.current, removed.map(([url]) => url));
      if (!result.ok) {
        setError(result.error);
        setSaveState("error");
        return;
      }
      for (const [url, path] of removed) {
        pendingRemoved.current.delete(url);
        // Fichier retire du stockage seulement apres l'enregistrement : la
        // fiche ne pointe jamais vers un fichier absent.
        if (path && !photosRef.current.some((p) => p.path === path)) void onDelete(path).catch(() => undefined);
      }
      if (typeof result.hiddenCount === "number" && version.current === sentVersion) setHiddenCount(result.hiddenCount);
      if (result.photos && version.current === sentVersion) {
        const server = result.photos;
        const same = server.length === photosRef.current.length && server.every((p, i) => p.url === photosRef.current[i].url);
        if (!same) commit(renormalize(server.map((p, i) => ({ url: p.url, path: p.path, isCover: i === 0, order: i }))));
      }
      setError(null);
      setFeedback(null);
      // Un changement plus recent attend son tour : toujours « Enregistrement... ».
      if (version.current === sentVersion) setSaveState("saved");
    } catch {
      setError(t("err_photo_save"));
      setSaveState("error");
    }
  }

  // Amelioration et retour a l'original changent l'adresse de la photo en
  // base : ils passent dans la meme file que les enregistrements, pour
  // qu'un enregistrement parti avec l'ancienne adresse ne la remette pas.
  function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = saveChain.current.then(fn);
    saveChain.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function persist(list: PhotoData[]) {
    if (photosRef.current !== list) commit(list);
    setSaveState("saving");
    const run = saveChain.current.then(saveLatest);
    saveChain.current = run;
    startTransition(() => run);
  }
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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
    if (cameraInputRef.current) cameraInputRef.current.value = "";
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

  // Reordonnancement au doigt (oct. 2026) : le glisser-deposer HTML5
  // ci-dessous ne fonctionne pas au toucher sur iPhone. La poignee de chaque
  // photo suit le doigt (evenements pointer) : la photo prend la place de
  // celle survolee, et l'ordre est enregistre au lacher.
  const touchDrag = useRef<{ from: number; pointerId: number } | null>(null);
  const [touchDragging, setTouchDragging] = useState<number | null>(null);

  function onHandlePointerDown(idx: number) {
    return (e: React.PointerEvent<HTMLButtonElement>) => {
      if (busy || uploadProgress) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      touchDrag.current = { from: idx, pointerId: e.pointerId };
      setTouchDragging(idx);
    };
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = touchDrag.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const over = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-photo-index]");
    const target = over ? Number(over.dataset.photoIndex) : NaN;
    if (!Number.isInteger(target) || target === drag.from) return;
    const next = [...photosRef.current];
    const [moved] = next.splice(drag.from, 1);
    next.splice(target, 0, moved);
    commit(renormalize(next));
    drag.from = target;
    setTouchDragging(target);
  }

  function onHandlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = touchDrag.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    touchDrag.current = null;
    setTouchDragging(null);
    persist(photosRef.current);
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

  // Suppression (nov. 2026) : la photo quitte la liste, l'enregistrement
  // retire SA ligne seulement, puis son fichier est retire du stockage.
  function removeAt(idx: number) {
    const p = photosRef.current[idx];
    if (!p || !confirm(t("confirm_delete_photo"))) return;
    setError(null);
    setFeedback(null);
    pendingRemoved.current.set(p.url, p.path);
    const list = renormalize(photosRef.current.filter((x) => x.url !== p.url));
    commit(list);
    // Enregistre aussi une liste vide : la fiche publique ne doit plus
    // pointer vers une photo retiree.
    persist(list);
  }

  // Clavier (nov. 2026) : fleches pour deplacer la photo qui a le focus.
  function move(from: number, to: number) {
    const cur = photosRef.current;
    if (to < 0 || to >= cur.length || from === to) return;
    const next = [...cur];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const list = renormalize(next);
    commit(list);
    persist(list);
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-photo-url="${CSS.escape(moved.url)}"]`)?.focus();
    });
  }

  function onItemKeyDown(idx: number) {
    return (e: React.KeyboardEvent<HTMLLIElement>) => {
      if (e.target !== e.currentTarget) return;
      const step = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 0;
      if (!step) return;
      e.preventDefault();
      move(idx, idx + step);
    };
  }

  function save() {
    setError(null);
    setFeedback(null);
    persist(photosRef.current);
  }

  // Miniatures chargees directement si l'optimiseur d'images echoue.
  const [direct, setDirect] = useState<Set<string>>(() => new Set());

  // --- Amelioration (nov. 2026) ------------------------------------------
  // Rien n'est remplace avant validation de l'apercu ; l'original reste
  // dans le stockage et « Revenir a l'original » le remet a sa place.
  const [review, setReview] = useState<ReviewItem[] | null>(null);
  const [preparing, setPreparing] = useState<{ done: number; total: number } | null>(null);
  const [applying, setApplying] = useState(false);
  // Annulation pendant la preparation des apercus : la boucle s'arrete.
  const reviewRun = useRef(0);
  const canEnhance = (p: PhotoData) => Boolean(enhance && p.path && !isEnhancedPath(p.path));
  const external = enhance ? photos.filter((p) => !p.path).length : 0;

  async function openReview(list: PhotoData[]) {
    if (!enhance || !list.length) return;
    setError(null);
    setFeedback(null);
    const run = ++reviewRun.current;
    let items: ReviewItem[] = list.map((p) => ({ path: p.path, url: p.url, after: null, error: null, keep: true }));
    setReview(items);
    setPreparing({ done: 0, total: items.length });
    for (let i = 0; i < list.length; i++) {
      let patch: Partial<ReviewItem>;
      try {
        const r = await enhance.preview(list[i].path);
        patch = r.ok ? { after: r.after } : { error: r.error, keep: false };
      } catch {
        patch = { error: t("enhance_err_failed"), keep: false };
      }
      if (reviewRun.current !== run) return;
      items = items.map((x, j) => (j === i ? { ...x, ...patch } : x));
      const snapshot = items;
      // Les cases deja decochees par Julien pendant la preparation restent decochees.
      setReview((prev) => snapshot.map((x, j) => ({ ...x, keep: x.keep && (prev?.[j]?.after ? prev[j].keep : true) })));
      setPreparing({ done: i + 1, total: list.length });
    }
    setPreparing(null);
  }

  function replacePhoto(fromPath: string, fromUrl: string, to: { url: string; path: string }) {
    const list = photosRef.current.map((p) => (p.path === fromPath && p.url === fromUrl ? { ...p, url: to.url, path: to.path } : p));
    commit(renormalize(list));
  }

  async function applyReview() {
    if (!enhance || !review) return;
    setApplying(true);
    const failures: string[] = [];
    let done = 0;
    for (const item of review.filter((x) => x.keep && x.after)) {
      try {
        const r = await exclusive(async () => {
          const res = await enhance.apply(item.path, item.url);
          if (res.ok) replacePhoto(item.path, item.url, res);
          return res;
        });
        if (r.ok) done++;
        else failures.push(r.error);
      } catch {
        failures.push(t("enhance_err_failed"));
      }
    }
    setApplying(false);
    setReview(null);
    setUploadErrors(failures);
    if (done) {
      persist(photosRef.current);
      setFeedback(t("enhance_done", { count: done }));
    }
  }

  function revert(idx: number) {
    const p = photosRef.current[idx];
    if (!enhance || !p) return;
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        const r = await exclusive(async () => {
          const res = await enhance.revert(p.path, p.url);
          if (res.ok) replacePhoto(p.path, p.url, res);
          return res;
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        persist(photosRef.current);
        setFeedback(t("enhance_reverted"));
      } catch {
        setError(t("enhance_err_failed"));
      }
    });
  }


  return (
    <div className="space-y-4">
      {/* Telephone : appareil photo ou galerie, deux gros boutons. */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <label className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-ink px-3 py-3 text-center text-base font-semibold text-bg">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFiles(e.target.files)}
            className="sr-only"
          />
          <Camera className="size-6" aria-hidden />
          {t("photo_take")}
        </label>
        <label className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-ink/30 bg-bg px-3 py-3 text-center text-base font-semibold text-ink">
          <input
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            onChange={(e) => handleFiles(e.target.files)}
            className="sr-only"
          />
          <ImagePlus className="size-6" aria-hidden />
          {t("photo_gallery")}
        </label>
      </div>
      {uploadProgress && (
        <p className="text-base font-semibold text-ink md:hidden" role="status">
          {t("upload_progress", { done: uploadProgress.done, total: uploadProgress.total })}
        </p>
      )}
      <label className="hidden rounded-xl border-2 border-dashed border-[#3D4F63]/20 bg-[#F5EFE1] p-6 text-center hover:border-[#e0af6e] md:block">
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
              key={p.url}
              data-photo-index={idx}
              data-photo-url={p.url}
              tabIndex={0}
              aria-label={t("photo_move_hint", { n: idx + 1, total: photos.length })}
              onKeyDown={onItemKeyDown(idx)}
              draggable
              onDragStart={onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={onDrop(idx)}
              className={`group relative overflow-hidden rounded-xl border bg-white ${
                touchDragging === idx ? "border-ink ring-2 ring-ink" : "border-[#3D4F63]/15"
              }`}
            >
              <div className="relative aspect-square">
                {/* Miniature legere (nov. 2026) : version reduite servie par
                    l'optimiseur d'images au lieu du fichier complet (jusqu'a
                    2 400 px). Repli direct si l'optimiseur echoue. */}
                <Image
                  src={p.url}
                  alt={t("photo_alt", { n: idx + 1 })}
                  fill
                  sizes="(min-width: 64rem) 200px, (min-width: 40rem) 30vw, 45vw"
                  unoptimized={!isOptimizedImageSrc(p.url) || direct.has(p.url)}
                  onError={() => setDirect((d) => (d.has(p.url) ? d : new Set(d).add(p.url)))}
                  className="object-cover"
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
                {enhance && isEnhancedPath(p.path) && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-ink/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-bg">
                    {t("enhance_badge")}
                  </span>
                )}
                {/* Poignee de deplacement au doigt (telephone et tablette). */}
                <button
                  type="button"
                  aria-label={t("photo_drag", { n: idx + 1 })}
                  onPointerDown={onHandlePointerDown(idx)}
                  onPointerMove={onHandlePointerMove}
                  onPointerUp={onHandlePointerUp}
                  onPointerCancel={onHandlePointerUp}
                  className="absolute bottom-2 right-2 inline-flex size-11 touch-none items-center justify-center rounded-full bg-black/60 text-white md:hidden"
                >
                  <GripVertical className="size-5" aria-hidden />
                </button>
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
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              {enhance && p.path && (
                <div className="px-2 pb-2">
                  {isEnhancedPath(p.path) ? (
                    <button
                      type="button"
                      onClick={() => revert(idx)}
                      disabled={busy || applying || preparing != null}
                      className="min-h-11 w-full rounded border border-ink/20 px-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink hover:border-gold disabled:opacity-40"
                    >
                      {t("enhance_revert")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openReview([p])}
                      disabled={busy || applying || preparing != null}
                      className="min-h-11 w-full rounded border border-ink/20 px-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink hover:border-gold disabled:opacity-40"
                    >
                      {t("enhance_one")}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <p role="status" aria-live="polite" data-photo-save-state={saveState} className={`text-sm ${saveState === "error" ? "text-red-700" : saveState === "saved" ? "text-emerald-700" : "text-ink-mid"}`}>
          {saveState === "saving" ? t("saving") : saveState === "saved" ? t("photos_saved") : null}
        </p>
        {saveState === "error" && (
          <button
            type="button"
            onClick={save}
            disabled={busy || uploadProgress != null}
            className="min-h-11 rounded-full bg-[#3D4F63] px-6 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
          >
            {t("photos_retry")}
          </button>
        )}
        {enhance && photos.some(canEnhance) && (
          <button
            type="button"
            onClick={() => openReview(photos.filter(canEnhance))}
            disabled={busy || uploadProgress != null || applying || preparing != null}
            className="min-h-11 rounded-full border border-ink/30 px-6 font-mono text-xs uppercase tracking-[0.2em] text-ink transition-colors hover:border-gold disabled:opacity-50"
          >
            {t("enhance_all")}
          </button>
        )}
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
      {external > 0 && <p className="text-xs text-ink-soft">{t("enhance_unavailable", { count: external })}</p>}
      {hiddenCount > 0 && <p className="text-xs text-ink-soft" data-photos-hidden>{t("photos_hidden_apimo", { count: hiddenCount })}</p>}

      {review && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={t("enhance_title")}>
          <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-bg px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:px-8">
            <h3 className="font-display text-xl font-bold text-ink">{t("enhance_title")}</h3>
            <p className="mt-1 text-sm text-ink-mid">{t("enhance_hint")}</p>
            {preparing && (
              <p className="mt-3 text-sm font-semibold text-ink" role="status">
                {t("enhance_preparing", { done: preparing.done, total: preparing.total })}
              </p>
            )}
            <ul className="mt-5 space-y-8">
              {review.map((item, i) => (
                <li key={item.path} className="space-y-3">
                  {item.after ? (
                    <BeforeAfter before={item.url} after={item.after} />
                  ) : item.error ? (
                    <p className="text-sm text-red-700">{item.error}</p>
                  ) : (
                    <div className="aspect-[3/2] w-full animate-pulse rounded-lg bg-bg-soft" aria-hidden />
                  )}
                  {review.length > 1 && item.after && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={item.keep}
                        onChange={(e) => setReview((r) => (r ? r.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)) : r))}
                        className="size-5 accent-gold"
                      />
                      {t("enhance_keep", { n: i + 1 })}
                    </label>
                  )}
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 mt-6 flex flex-wrap justify-end gap-3 bg-bg pt-3">
              <button
                type="button"
                onClick={() => {
                  reviewRun.current++;
                  setReview(null);
                  setPreparing(null);
                }}
                disabled={applying}
                className="min-h-11 rounded-full border border-ink/30 px-6 font-mono text-xs uppercase tracking-[0.2em] text-ink hover:border-gold disabled:opacity-50"
              >
                {t("enhance_cancel")}
              </button>
              <button
                type="button"
                onClick={applyReview}
                disabled={applying || preparing != null || !review.some((x) => x.keep && x.after)}
                className="min-h-11 rounded-full bg-ink px-6 font-mono text-xs uppercase tracking-[0.2em] text-bg hover:bg-gold-deep disabled:opacity-50"
              >
                {applying ? t("enhance_applying") : review.length > 1 ? t("enhance_apply_all", { count: review.filter((x) => x.keep && x.after).length }) : t("enhance_apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
