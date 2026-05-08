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

export function PropertyCard({ property, locale, priority = false }: PropertyCardProps) {
  const title = pickLang(property, "title", locale) || "—";
  const price = formatPrice(property.price, property.transaction);
  const cover = property.cover_url ?? property.cover_image_url;

  return (
    <Link
      href={`/biens/${property.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-bg transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10"
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
        {property.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-bg backdrop-blur">
            {property.badge}
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-gold-bright/95 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink">
          {property.transaction === "rent"
            ? "Location"
            : property.transaction === "offmarket"
              ? "Off-Market"
              : "Vente"}
        </span>
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
