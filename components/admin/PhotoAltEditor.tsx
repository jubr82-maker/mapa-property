"use client";

/**
 * PhotoAltEditor : textes alternatifs des photos d'un bien (oct. 2026).
 * Pour chaque photo : piece du modele d'annonce rattachee et texte par
 * langue. Vide : le site construit le texte depuis la piece, puis le type
 * de bien et la localite (apercu affiche en grise).
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LISTING_LANGS, type ListingLang } from "@/lib/listing/listing-data";
import { photoAlt, type ListingSeoVocab } from "@/lib/listing/listing-seo";
import { savePhotoAlts, type PhotoAltInput } from "@/app/admin/properties/alt-actions";

const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none";

type Props = {
  propertyId: string;
  available: boolean;
  photos: PhotoAltInput[];
  rooms: { id: string; text: Record<ListingLang, string> }[];
  ctx: Record<ListingLang, { seo: ListingSeoVocab; typeLabel: string }>;
  city: string | null;
  title: string;
};

export function PhotoAltEditor({ propertyId, available, photos: initial, rooms, ctx, city, title }: Props) {
  const t = useTranslations("admin_listing");
  const [photos, setPhotos] = useState(initial);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (i: number, patch: Partial<PhotoAltInput>) => setPhotos((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  if (!available) return <p className="text-sm text-[#3D4F63]/70">{t("alt_unavailable")}</p>;
  if (!photos.length) return <p className="text-sm text-[#3D4F63]/70">{t("alt_no_photos")}</p>;

  return (
    <div className="space-y-4" data-photo-alts>
      <ul className="space-y-4">
        {photos.map((p, i) => {
          const room = rooms.find((r) => r.id === p.room_id);
          return (
            <li key={p.url} className="grid grid-cols-1 gap-3 rounded-lg border border-[#3D4F63]/15 bg-white p-3 md:grid-cols-[120px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-20 w-full rounded object-cover md:w-[120px]" loading="lazy" />
              <div className="space-y-2">
                <label className="block">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">{t("alt_room")}</span>
                  <select value={p.room_id ?? ""} onChange={(e) => set(i, { room_id: e.target.value || null })} className={`mt-1 ${inputCls}`}>
                    <option value="">{t("alt_room_none")}</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.text.fr || r.text.en || r.text.de}
                      </option>
                    ))}
                  </select>
                </label>
                {LISTING_LANGS.map((l) => {
                  const key = `alt_${l}` as const;
                  const generated = photoAlt({ room: room?.text[l] ?? null, index: i, typeLabel: ctx[l].typeLabel, city, title }, ctx[l].seo);
                  return (
                    <label key={l} className="block">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">{t("alt_text", { lang: l.toUpperCase() })}</span>
                      <input value={p[key]} placeholder={generated} onChange={(e) => set(i, { [key]: e.target.value })} className={`mt-1 ${inputCls}`} />
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            start(async () => {
              setMsg(null);
              const r = await savePhotoAlts(propertyId, photos);
              setMsg(r.ok ? { ok: true, text: t("alt_saved") } : { ok: false, text: r.error });
            })
          }
          className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#e0af6e] disabled:opacity-50"
        >
          {busy ? t("tpl_saving") : t("alt_save")}
        </button>
        {msg && <span role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-800" : "text-red-700"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
