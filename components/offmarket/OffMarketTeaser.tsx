// Carte d'une opportunite off-market (nov. 2026, extraite de la liste
// /off-market) : partagee par la liste, le bloc « Autres opportunites
// off-market » des pages off-market et la page ARCOVA. Seulement les
// donnees deja publiques de la liste (vue redactee
// properties_offmarket_public) : pays, ville, reference, titre, accroche,
// prix ; jamais le visuel reel.
import { Link } from "@/i18n/navigation";
import { descriptionPlainText } from "@/lib/listing/description-text";
import type { PropertyOffmarket } from "@/lib/types";
import { OffmarketPlaceholder } from "@/components/property/OffmarketPlaceholder";
import { PropertyPrice } from "@/components/property/PropertyPrice";

export function OffMarketTeaser({
  property,
  t,
  locale,
}: {
  property: PropertyOffmarket;
  t: (key: string) => string;
  locale: string;
}) {
  return (
    <Link
      href={`/off-market/${property.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-bg transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10"
    >
      {/* Cover confidentiel standardisé (BUG 2) — jamais le visuel réel. */}
      <div className="relative aspect-[2/1] overflow-hidden bg-bg-deep">
        <OffmarketPlaceholder
          compact
          title={t("cover_title")}
          subtitle={t("cover_subtitle")}
          invertOnDark
        />
        <span className="absolute right-3 top-3 rounded-full bg-bg-contrast/85 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-bright backdrop-blur">
          OFF-MARKET
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {[property.country, property.city_label].filter(Boolean).join(" · ")}
          {property.internal_ref && (
            <> · <span className="text-gold-deep">{property.internal_ref}</span></>
          )}
        </p>
        <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-ink group-hover:text-gold-deep">
          {property.title ?? ""}
        </h3>
        {property.short_pitch && (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink-mid">
            {descriptionPlainText(property.short_pitch)}
          </p>
        )}
        <PropertyPrice
          priceOnDemand={property.price_on_demand}
          priceMode={property.price_mode}
          priceMin={property.price_min}
          priceMax={property.price_max}
          priceEstimate={property.price_estimate}
          priceDisplay={property.price_display}
          locale={locale}
          className="mt-auto block font-display text-lg font-bold gold-text"
        />
      </div>
    </Link>
  );
}
