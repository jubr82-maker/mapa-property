import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { pickLang, type Locale } from "@/lib/types";
import type { PropertyWithCover } from "@/lib/data";
import { resolveBadgeStyles } from "@/lib/badge-style";

interface PropertyCardProps {
  property: PropertyWithCover;
  locale: Locale;
  priority?: boolean;
  /**
   * Mini-fiche pour les carrousels (ex. SiblingCarousel) : padding et
   * texte réduits, specs limitées à l'essentiel (chambres). N'affecte pas
   * l'usage par défaut (grilles de résultats), qui reste inchangé.
   */
  compact?: boolean;
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

export function PropertyCard({
  property,
  locale,
  priority = false,
  compact = false,
}: PropertyCardProps) {
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
        {(() => {
          const b = resolveBadgeStyles(
            property.badge,
            property.badge_size,
            property.badge_position,
          );
          if (!b) return null;
          return (
            <span
              className={`absolute rounded-full font-mono uppercase backdrop-blur ${b.sizeClass} ${b.positionClass}`}
              style={b.inlineStyle}
            >
              {property.badge}
            </span>
          );
        })()}
      </div>

      <div
        className={
          compact
            ? "flex flex-1 flex-col gap-1.5 p-3"
            : "flex flex-1 flex-col gap-3 p-5"
        }
      >
        <p
          className={
            compact
              ? "font-mono text-[9px] uppercase tracking-[0.2em] text-ink-soft"
              : "font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft"
          }
        >
          {[property.country, property.city].filter(Boolean).join(" · ") || "—"}
        </p>
        <h3
          className={
            compact
              ? "line-clamp-2 font-display text-sm font-bold leading-tight text-ink group-hover:text-gold-deep"
              : "line-clamp-2 font-display text-xl font-bold leading-tight text-ink group-hover:text-gold-deep"
          }
        >
          {title}
        </h3>
        <p
          className={
            compact
              ? "font-display text-base font-black tracking-tight text-ink"
              : "font-display text-2xl font-black tracking-tight text-ink"
          }
        >
          {price}
        </p>
        {compact ? (
          property.bedrooms !== null && property.bedrooms !== undefined && (
            <p className="mt-auto pt-2 font-mono text-[10px] text-ink-mid">
              <span className="text-ink-soft">Ch.</span> {property.bedrooms}
            </p>
          )
        ) : (
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
        )}
      </div>
    </Link>
  );
}
