import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { pickLang, type Locale } from "@/lib/types";
import type { PropertyWithCover } from "@/lib/data";
import { resolveBadgeStyles } from "@/lib/badge-style";
import { formatPrice as formatPriceShared, formatSurface } from "@/lib/format/numbers";
import { useTranslations } from "next-intl";
import { bannerOf } from "@/lib/property-banner";
import { StatusBanner } from "@/components/property/StatusBanner";

interface PropertyCardProps {
  property: PropertyWithCover;
  locale: Locale;
  priority?: boolean;
  /** Chargement immediat sans preload (cartes visibles a l'ouverture). */
  eager?: boolean;
  /**
   * Mini-fiche pour les carrousels (ex. SiblingCarousel) : padding et
   * texte réduits, specs limitées à l'essentiel (chambres). N'affecte pas
   * l'usage par défaut (grilles de résultats), qui reste inchangé.
   */
  compact?: boolean;
  /**
   * Callback optionnel déclenché au clic, en plus de la navigation
   * normale vers la fiche (jamais bloquée). Utilisé par SiblingCarousel
   * pour le tracking — sans effet si non fourni.
   */
  onClick?: () => void;
}

// Bug corrige (mission "surfaces decimales, formats de nombres...") :
// cette fonction locale forcait la locale "fr-LU" (separateur de milliers
// par point, ex. "500.000 €") quelle que soit la langue affichee, et
// dupliquait components/property/PropertyPrice.tsx. Remplacee par la
// fonction partagee, sensible a la locale reelle de la carte.
const formatPrice = (price: number | null, transaction: string, locale: string) => {
  if (!price) return "";
  const value = formatPriceShared(price, locale);
  return transaction === "rent" ? `${value} / mois` : value;
};

export function PropertyCard({
  property,
  locale,
  priority = false,
  eager = false,
  compact = false,
  onClick,
}: PropertyCardProps) {
  const tBanner = useTranslations("status_banner");
  const title = pickLang(property, "title", locale) || "";
  // Bandeau (SQL 35) : Vendu et Loue remplacent le prix ; Sous compromis le garde.
  const banner = bannerOf(property);
  const closed = banner?.kind === "sold" || banner?.kind === "rented";
  const price =
    closed
      ? tBanner(banner?.kind === "rented" ? "rented_price" : "sold_price")
      : formatPrice(property.price, property.transaction, locale);
  // La table properties n'a pas de cover_image_url ; on s'appuie uniquement
  // sur cover_url (calculé depuis property_images via les fetchers data.ts).
  const cover = property.cover_url;

  // Fallback sur id si slug manquant : la route /biens/[slug] sait résoudre
  // un UUID via fetchPropertyByIdOrSlug, donc on évite un lien cassé.
  const target = property.slug || property.id;
  // Adresse lisible (oct. 2026) quand elle est connue ; sinon le slug, que
  // la fiche redirige vers l'adresse lisible.
  const href = property.paths?.[locale] ?? `/biens/${target}`;

  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-deep">
        {cover ? (
          <Image
            src={cover}
            // Type et localite du bien (oct. 2026), sinon le titre.
            alt={property.alts?.[locale] || title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
            priority={priority}
            loading={priority ? undefined : eager ? "eager" : undefined}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center font-mono text-xs uppercase tracking-widest text-ink-soft">
            no image
          </div>
        )}
        {banner && <StatusBanner banner={banner} variant="card" />}
        {/* Etiquette commerciale du coin (Exclusivite comprise) : jamais avec un bandeau. */}
        {!banner && (() => {
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
          {[property.country, property.city].filter(Boolean).join(" · ")}
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
          data-card-price
          className={
            compact
              ? "font-display text-base font-black tracking-tight text-ink"
              : closed
                ? "font-display text-xl font-bold tracking-tight text-ink"
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
                <span className="text-ink-soft">Surf.</span> {formatSurface(property.surface, locale)}
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
