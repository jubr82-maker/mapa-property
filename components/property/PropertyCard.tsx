import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { pickLang, type Locale } from "@/lib/types";
import type { PropertyWithCover } from "@/lib/data";

interface PropertyCardProps {
  property: PropertyWithCover;
  locale: Locale;
  priority?: boolean;
}

const formatPrice = (price: number | null, transaction: string) => {
  if (!price) return "—";
  const value = new Intl.NumberFormat("fr-LU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
  return transaction === "rent" ? `${value} / mois` : value;
};

// Sprint badges commerciaux : mapping libellé -> styles inline (bg + texte
// + bordure). Couleurs FIXES par libellé, dérivées côté code, jamais
// stockées en DB. Texte BLANC sauf Opportunité (cuivre -> sapin) et À
// découvrir (sapin -> cuivre + filet cuivre 1px).
type BadgeStyle = {
  backgroundColor: string;
  color: string;
  border?: string;
};
const BADGE_STYLE_MAP: Record<string, BadgeStyle> = {
  Exclusivité: { backgroundColor: "var(--badge-exclu)", color: "#FFFFFF" },
  Nouveau: { backgroundColor: "var(--badge-nouveau)", color: "#FFFFFF" },
  "Nouveau prix": {
    backgroundColor: "var(--badge-nouveau-prix)",
    color: "#FFFFFF",
  },
  Opportunité: {
    backgroundColor: "var(--badge-opportunite)",
    color: "#1F221A",
  },
  Investissement: {
    backgroundColor: "var(--badge-investment)",
    color: "#FFFFFF",
  },
  "À découvrir": {
    backgroundColor: "var(--badge-discover)",
    color: "#e0af6e",
    border: "1px solid #e0af6e",
  },
};

const BADGE_SIZE_CLASS: Record<string, string> = {
  S: "px-2 py-0.5 text-[9px] tracking-[0.15em]",
  M: "px-3 py-1 text-[10px] tracking-[0.2em]",
  L: "px-4 py-1.5 text-[12px] tracking-[0.22em]",
};

const BADGE_POSITION_CLASS: Record<string, string> = {
  "top-left": "left-3 top-3",
  "top-right": "right-3 top-3",
  "bottom-left": "left-3 bottom-3",
  "bottom-right": "right-3 bottom-3",
};

export function PropertyCard({ property, locale, priority = false }: PropertyCardProps) {
  const title = pickLang(property, "title", locale) || "—";
  const price = formatPrice(property.price, property.transaction);
  // La table properties n'a pas de cover_image_url ; on s'appuie uniquement
  // sur cover_url (calculé depuis property_images via les fetchers data.ts).
  const cover = property.cover_url;

  // Fallback sur id si slug manquant : la route /biens/[slug] sait résoudre
  // un UUID via fetchPropertyByIdOrSlug, donc on évite un lien cassé.
  const target = property.slug || property.id;

  return (
    <Link
      href={`/biens/${target}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-deep">
        {cover ? (
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center font-mono text-xs uppercase tracking-widest text-ink-soft">
            no image
          </div>
        )}
        {property.badge && BADGE_STYLE_MAP[property.badge] && (
          <span
            className={`absolute rounded-full font-mono uppercase backdrop-blur ${
              BADGE_SIZE_CLASS[property.badge_size ?? "M"] ?? BADGE_SIZE_CLASS.M
            } ${
              BADGE_POSITION_CLASS[property.badge_position ?? "top-left"] ??
              BADGE_POSITION_CLASS["top-left"]
            }`}
            style={BADGE_STYLE_MAP[property.badge]}
          >
            {property.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {[property.country, property.city].filter(Boolean).join(" · ") || "—"}
        </p>
        <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-ink group-hover:text-gold-deep">
          {title}
        </h3>
        <p className="font-display text-2xl font-black tracking-tight text-ink">
          {price}
        </p>
        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 font-mono text-[11px] text-ink-mid">
          {property.surface && (
            <li>
              <span className="text-ink-soft">Surf.</span> {property.surface} m²
            </li>
          )}
          {property.bedrooms !== null && property.bedrooms !== undefined && (
            <li>
              <span className="text-ink-soft">Ch.</span> {property.bedrooms}
            </li>
          )}
          {property.bathrooms !== null && property.bathrooms !== undefined && (
            <li>
              <span className="text-ink-soft">SdB.</span> {property.bathrooms}
            </li>
          )}
          {property.energy && (
            <li>
              <span className="text-ink-soft">DPE</span> {property.energy}
            </li>
          )}
        </ul>
      </div>
    </Link>
  );
}
