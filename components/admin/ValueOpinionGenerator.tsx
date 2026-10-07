"use client";

// Avis de valeur avec annexes (oct. 2026, decision de Julien). Les photos,
// plans et documents sont choisis sur l'appareil (appareil photo compris),
// lus et prepares DANS LE NAVIGATEUR : aucun fichier n'est envoye au
// serveur ni stocke. Le serveur ne recoit que les metadonnees (legendes,
// proportions, nombres de pages, noms) et renvoie l'avis avec ses pages
// d'annexes ; pdf-lib y place ensuite les images et les plans et ajoute
// les documents PDF (lib/estimation/value-opinion-assemble).
// Images redimensionnees et compressees ici (photos 1600 px, plans
// 2400 px au plus) pour un document leger.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ANNEX_LIMITS, DOCUMENT_KINDS, type DocumentKind } from "@/lib/estimation/value-opinion-annex-layout";
import { annexMetaOf, assembleValueOpinion, inspectPdf, type AnnexInput, type PreparedImage } from "@/lib/estimation/value-opinion-assemble";

type Lang = "fr" | "en" | "de";
type Kind = "photo" | "plan" | "document";
type Item = {
  id: string;
  kind: Kind;
  name: string;
  caption: string;
  include: boolean;
  preview: string | null;
  image?: PreparedImage;
  pdf?: Uint8Array;
  pages?: number;
  docKind?: DocumentKind;
};

const PHOTO_MAX = 1600;
const PLAN_MAX = 2400;

/** Image lue et recompressee en JPEG dans le navigateur. */
async function prepareImage(file: File, maxSide: number): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", maxSide === PLAN_MAX ? 0.88 : 0.82));
  if (!blob) throw new Error("encode");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), format: "jpg", width, height };
}

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isHeic = (f: File) => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);

export function ValueOpinionGenerator({ estimationId, defaultLang }: { estimationId: string; defaultLang: Lang }) {
  const t = useTranslations("admin_estimations");
  const tn = useTranslations("admin_notices");
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [items, setItems] = useState<Item[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | "reading" | "server" | "assembling">(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const inputs = { photoCamera: useRef<HTMLInputElement>(null), photo: useRef<HTMLInputElement>(null), plan: useRef<HTMLInputElement>(null), document: useRef<HTMLInputElement>(null) };

  // Apercus liberes a la fermeture de la page.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  const count = (k: Kind) => items.filter((i) => i.kind === k).length;
  const limitOf = (k: Kind) => (k === "photo" ? ANNEX_LIMITS.photos : k === "plan" ? ANNEX_LIMITS.plans : ANNEX_LIMITS.documents);

  async function addFiles(kind: Kind, list: FileList | null) {
    if (!list?.length) return;
    setBusy("reading");
    setResult(null);
    const added: Item[] = [];
    const warn: string[] = [];
    for (const file of Array.from(list)) {
      if (count(kind) + added.length >= limitOf(kind)) {
        warn.push(t("annex.limit", { name: file.name, max: limitOf(kind) }));
        continue;
      }
      const base: Item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind, name: file.name, caption: "", include: true, preview: null };
      try {
        if (isPdf(file)) {
          if (kind === "photo") throw new Error("format");
          const bytes = new Uint8Array(await file.arrayBuffer());
          const info = await inspectPdf(bytes);
          if (!info.ok) {
            warn.push(t(info.reason === "protected" ? "annex.skipped_protected" : "annex.skipped_unreadable", { name: file.name }));
            continue;
          }
          added.push({ ...base, pdf: bytes, pages: info.pages, docKind: kind === "document" ? "other" : undefined });
        } else {
          if (kind === "document") throw new Error("format");
          const image = await prepareImage(file, kind === "plan" ? PLAN_MAX : PHOTO_MAX);
          added.push({ ...base, image, preview: URL.createObjectURL(new Blob([image.bytes as BlobPart], { type: "image/jpeg" })) });
        }
      } catch {
        warn.push(isHeic(file) ? t("annex.skipped_heic", { name: file.name }) : t("annex.skipped_unreadable", { name: file.name }));
      }
    }
    setItems((prev) => [...prev, ...added]);
    setWarnings((prev) => [...prev, ...warn]);
    setBusy(null);
  }

  const update = (id: string, patch: Partial<Item>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const move = (id: string, dir: -1 | 1) =>
    setItems((prev) => {
      const kind = prev.find((i) => i.id === id)?.kind;
      const same = prev.filter((i) => i.kind === kind);
      const k = same.findIndex((i) => i.id === id);
      const j = k + dir;
      if (j < 0 || j >= same.length) return prev;
      [same[k], same[j]] = [same[j], same[k]];
      return [...prev.filter((i) => i.kind !== kind), ...same];
    });
  const remove = (item: Item) => {
    if (!window.confirm(t("annex.remove_confirm", { name: item.name }))) return;
    if (item.preview) URL.revokeObjectURL(item.preview);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  async function generate() {
    setResult(null);
    const chosen = items.filter((i) => i.include);
    const input: AnnexInput = {
      photos: chosen.filter((i) => i.kind === "photo" && i.image).map((i) => ({ caption: i.caption, image: i.image! })),
      plans: chosen
        .filter((i) => i.kind === "plan")
        .map((i) => (i.image ? { caption: i.caption, kind: "image" as const, image: i.image } : { caption: i.caption, kind: "pdf" as const, pdf: i.pdf!, pages: i.pages ?? 1 })),
      documents: chosen.filter((i) => i.kind === "document" && i.pdf).map((i) => ({ name: i.name, kind: i.docKind ?? "other", pdf: i.pdf!, pages: i.pages ?? 1 })),
    };
    try {
      setBusy("server");
      const res = await fetch(`/api/admin/exports/estimations/${estimationId}/avis-de-valeur`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, annexes: annexMetaOf(input) }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setResult({
          ok: false,
          text:
            res.status === 401 || res.status === 403
              ? tn("err_session")
              : body.error === "rate_limit"
                ? t("annex.err_rate")
                : body.error === "not_found"
                  ? t("errors.notFound")
                  : tn("err_http", { status: res.status }),
        });
        return;
      }
      let bytes: Uint8Array = new Uint8Array(await res.arrayBuffer());
      if (input.photos.length + input.plans.length + input.documents.length > 0) {
        setBusy("assembling");
        bytes = await assembleValueOpinion(bytes, input);
      }
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `mapa-avis-de-valeur-${estimationId.slice(0, 8)}-${lang}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setResult({ ok: true, text: t("annex.done", { size: Math.max(1, Math.round(bytes.length / 1024)) }) });
    } catch (e) {
      setResult({ ok: false, text: e instanceof TypeError ? tn("err_network") : t("annex.err_assemble", { detail: e instanceof Error ? e.message : String(e) }) });
    } finally {
      setBusy(null);
    }
  }

  const btn = "rounded-full border border-[#3D4F63]/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63] hover:border-[#e0af6e] disabled:opacity-50";
  const groups: { kind: Kind; title: string; pickers: { ref: React.RefObject<HTMLInputElement | null>; label: string }[] }[] = [
    { kind: "photo", title: t("annex.photos"), pickers: [{ ref: inputs.photoCamera, label: t("annex.take_photo") }, { ref: inputs.photo, label: t("annex.choose_photos") }] },
    { kind: "plan", title: t("annex.plans"), pickers: [{ ref: inputs.plan, label: t("annex.choose_plans") }] },
    { kind: "document", title: t("annex.documents"), pickers: [{ ref: inputs.document, label: t("annex.choose_documents") }] },
  ];

  return (
    <div className="mt-4 space-y-5" data-admin-value-opinion-generator>
      <input ref={inputs.photoCamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void addFiles("photo", e.target.files); e.target.value = ""; }} />
      <input ref={inputs.photo} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="hidden" onChange={(e) => { void addFiles("photo", e.target.files); e.target.value = ""; }} />
      <input ref={inputs.plan} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" multiple className="hidden" onChange={(e) => { void addFiles("plan", e.target.files); e.target.value = ""; }} />
      <input ref={inputs.document} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => { void addFiles("document", e.target.files); e.target.value = ""; }} />

      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">{t("annex.title")}</p>
        <p className="mt-1 text-sm text-[#1A1F2A]/70">{t("annex.intro")}</p>
      </div>

      {groups.map((g) => {
        const list = items.filter((i) => i.kind === g.kind);
        return (
          <section key={g.kind} className="rounded-md border border-[#3D4F63]/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-[#1A1F2A]">{g.title}</h3>
              <div className="flex flex-wrap gap-2">
                {g.pickers.map((p) => (
                  <button key={p.label} type="button" className={btn} disabled={!!busy} onClick={() => p.ref.current?.click()}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {list.length === 0 ? (
              <p className="mt-2 text-sm text-[#1A1F2A]/60">{t("annex.none")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {list.map((item, idx) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 rounded border border-[#3D4F63]/10 p-2">
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded bg-[#3D4F63]/5 text-center text-[10px] text-[#3D4F63]">
                      {item.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.preview} alt="" className="size-full object-cover" />
                      ) : (
                        t("annex.pdf_pages", { count: item.pages ?? 1 })
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-xs text-[#1A1F2A]/70">{item.name}</p>
                      {item.kind === "document" ? (
                        <select value={item.docKind ?? "other"} onChange={(e) => update(item.id, { docKind: e.target.value as DocumentKind })} className="rounded border border-[#3D4F63]/20 bg-white px-2 py-1 text-sm">
                          {DOCUMENT_KINDS.map((k) => (
                            <option key={k} value={k}>
                              {t(`annex.kind_${k}`)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={item.caption}
                          maxLength={ANNEX_LIMITS.caption}
                          onChange={(e) => update(item.id, { caption: e.target.value })}
                          placeholder={t("annex.caption_placeholder")}
                          className="w-full rounded border border-[#3D4F63]/20 bg-white px-2 py-1 text-sm"
                        />
                      )}
                    </div>
                    <label className="inline-flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={item.include} onChange={(e) => update(item.id, { include: e.target.checked })} />
                      {t("annex.include")}
                    </label>
                    <div className="flex gap-1">
                      <button type="button" className={btn} disabled={idx === 0} onClick={() => move(item.id, -1)} aria-label={t("annex.move_up")} title={t("annex.move_up")}>↑</button>
                      <button type="button" className={btn} disabled={idx === list.length - 1} onClick={() => move(item.id, 1)} aria-label={t("annex.move_down")} title={t("annex.move_down")}>↓</button>
                      <button type="button" className={btn} onClick={() => remove(item)}>{t("annex.remove")}</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {warnings.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">{t("detail.avisLanguage")}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="mt-1 rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 text-sm">
            {(["fr", "en", "de"] as const).map((l) => (
              <option key={l} value={l}>
                {t(`language.${l}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={!!busy}
          className="inline-flex items-center gap-2 rounded-md bg-[#9E7B2A] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:bg-[#9E7B2A]/90 disabled:opacity-50"
        >
          {busy === "reading" ? t("annex.reading") : busy === "server" ? t("annex.generating") : busy === "assembling" ? t("annex.assembling") : t("detail.avisButton")}
        </button>
      </div>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`text-sm ${result.ok ? "text-emerald-800" : "text-red-700"}`}>
          {result.text}
        </p>
      )}
    </div>
  );
}
