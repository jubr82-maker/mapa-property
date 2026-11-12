"use client";

// Bandeaux "Sous compromis", "Vendu", "Loue" (nov. 2026, SQL 35) dans la
// fiche admin, section "Mise en avant". Trois listes fermees (bandeau,
// position, couleur) et, dessous, l'apercu en direct de la carte du bien,
// mis a jour a chaque changement avant enregistrement. Le serveur refuse
// toute combinaison hors liste (app/admin/properties/actions.ts).
import { useTranslations } from "next-intl";
import { StatusBanner } from "@/components/property/StatusBanner";
import {
  BANNER_COLORS,
  BANNER_POSITIONS,
  bannersFor,
  isBannerColor,
  isBannerPosition,
  isStatusBanner,
} from "@/lib/property-banner";
import { formatPrice } from "@/lib/format/numbers";

type BannerKey = "status_banner" | "banner_position" | "banner_color";

const selectCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-mono text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none disabled:opacity-50";
const labelCls = "block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70";

export function BannerFields({
  available,
  transaction,
  value,
  onChange,
  preview,
}: {
  available: boolean;
  transaction: string | null;
  value: { kind: string; position: string; color: string };
  onChange: (key: BannerKey, v: string) => void;
  preview: { coverUrl: string | null; title: string; place: string; price: string; transaction: string | null };
}) {
  const t = useTranslations("admin_properties");
  const tb = useTranslations("status_banner");
  const allowed = bannersFor(transaction);
  const none = value.kind === "";
  const banner =
    isStatusBanner(value.kind) && allowed.includes(value.kind)
      ? {
          kind: value.kind,
          position: isBannerPosition(value.position) ? value.position : ("straight" as const),
          color: isBannerColor(value.color) ? value.color : ("sapin" as const),
        }
      : null;
  const price =
    banner?.kind === "sold"
      ? tb("sold_price")
      : banner?.kind === "rented"
        ? tb("rented_price")
        : preview.price
          ? `${formatPrice(Number(preview.price), "fr")}${preview.transaction === "rent" ? t("banner_preview_per_month") : ""}`
          : "";

  return (
    <div className="space-y-4 md:col-span-2" data-admin-banner>
      {!available && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">{t("banner_unavailable")}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="block">
          <span className={labelCls}>{t("f_banner")}</span>
          <select
            value={value.kind}
            onChange={(e) => onChange("status_banner", e.target.value)}
            disabled={!available}
            className={`mt-1 ${selectCls}`}
          >
            <option value="">{t("banner_none")}</option>
            {allowed.map((k) => (
              <option key={k} value={k}>
                {t(`banner_${k}`)}
              </option>
            ))}
            {/* Valeur enregistree devenue incoherente (transaction changee) : visible pour la retirer. */}
            {value.kind !== "" && !allowed.includes(value.kind as never) && <option value={value.kind}>{value.kind}</option>}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_banner_position")}</span>
          <select
            value={value.position}
            onChange={(e) => onChange("banner_position", e.target.value)}
            disabled={!available || none}
            className={`mt-1 ${selectCls}`}
          >
            {BANNER_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {t(`banner_position_${p}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{t("f_banner_color")}</span>
          <select
            value={value.color}
            onChange={(e) => onChange("banner_color", e.target.value)}
            disabled={!available || none}
            className={`mt-1 ${selectCls}`}
          >
            {BANNER_COLORS.map((c) => (
              <option key={c} value={c}>
                {t(`banner_color_${c}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-[#3D4F63]/60">{t("hint_banner")}</p>

      <div>
        <p className={labelCls}>{t("banner_preview")}</p>
        <div data-banner-preview className="mt-2 w-full max-w-[360px] overflow-hidden rounded-xl border border-border-subtle bg-bg">
          <div className="relative aspect-[4/3] overflow-hidden bg-bg-deep">
            {preview.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center font-mono text-xs uppercase tracking-widest text-ink-soft">{t("banner_preview_no_photo")}</div>
            )}
            {banner && <StatusBanner banner={banner} variant="card" />}
          </div>
          <div className="flex flex-col gap-2 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">{preview.place}</p>
            <p className="line-clamp-2 font-display text-lg font-bold leading-tight text-ink">{preview.title}</p>
            <p className="font-display text-xl font-black tracking-tight text-ink">{price}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
