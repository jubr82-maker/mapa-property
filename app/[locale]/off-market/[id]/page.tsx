import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchOffmarketById } from "@/lib/data";
import { BackButton } from "@/components/ui/BackButton";
import { NDAForm } from "@/components/forms/NDAForm";
import { FavoriteHeart } from "@/components/property/FavoriteHeart";
import { sbUrl } from "@/lib/supabase-url";
import { OffmarketPlaceholder } from "@/components/property/OffmarketPlaceholder";

function formatOffmarketPrice(p: {
  price_mode: string | null;
  price_estimate: number | null;
  price_min: number | null;
  price_max: number | null;
  price_custom_text: string | null;
}): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  switch (p.price_mode) {
    case "exact":
      return p.price_estimate ? fmt(p.price_estimate) : "Prix sur demande";
    case "range":
      if (p.price_min && p.price_max) return `${fmt(p.price_min)} – ${fmt(p.price_max)}`;
      if (p.price_min) return `À partir de ${fmt(p.price_min)}`;
      if (p.price_max) return `Jusqu'à ${fmt(p.price_max)}`;
      return "Prix sur demande";
    case "custom":
      return p.price_custom_text || "Prix sur demande";
    case "on_request":
    default:
      return "Prix sur demande";
  }
}

export default async function OffMarketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const property = await fetchOffmarketById(id);
  if (!property) notFound();

  const t = await getTranslations({ locale, namespace: "offmarket" });
  const tProperty = await getTranslations({ locale, namespace: "property" });

  const allImages = [
    ...(property.cover_image_url ? [property.cover_image_url] : []),
    ...(property.gallery_urls ?? []),
  ];

  return (
    <article className="pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <BackButton fallback="/off-market" />
          <FavoriteHeart propertyId={`offmarket:${property.id}`} />
        </div>

        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            <span>OFF-MARKET</span>
            {property.internal_ref && (
              <>
                <span aria-hidden>·</span>
                <span className="text-ink-soft">REF {property.internal_ref}</span>
              </>
            )}
          </div>
          <h1 className="mt-3 t-h1">
            {property.title ?? "—"}
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            {[property.country, property.city_label].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-4 font-display text-3xl font-black tracking-tight gold-text sm:text-4xl">
            {formatOffmarketPrice(property)}
          </p>
        </header>

        {/* Cover */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-bg-deep">
          {property.cover_image_url ? (
            <>
              <Image
                src={property.cover_image_url}
                alt={property.title ?? "Off-market"}
                fill
                priority
                sizes="100vw"
                className="object-cover blur-[2px]"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-bg-contrast/40 backdrop-blur-sm">
                <div className="text-center text-text-contrast">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-bright">
                    {t("locked_eyebrow")}
                  </p>
                  <p className="mt-2 max-w-md font-display text-xl font-bold">
                    {t("locked_text")}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <OffmarketPlaceholder />
          )}
        </div>

        {/* Layout */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_420px]">
          <div className="space-y-12">
            {/* Specs */}
            <section>
              <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                {tProperty("specs")}
              </h2>
              <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                <Spec
                  label={tProperty("living_surface")}
                  value={
                    property.surface_hab ? `${property.surface_hab} m²` : "—"
                  }
                />
                <Spec
                  label={tProperty("land_surface")}
                  value={
                    property.surface_terrain
                      ? `${property.surface_terrain} m²`
                      : "—"
                  }
                />
                <Spec
                  label={tProperty("bedrooms")}
                  value={
                    property.bedrooms !== null && property.bedrooms !== undefined
                      ? String(property.bedrooms)
                      : "—"
                  }
                />
                <Spec
                  label={tProperty("bathrooms")}
                  value={
                    property.bathrooms !== null && property.bathrooms !== undefined
                      ? String(property.bathrooms)
                      : "—"
                  }
                />
                <Spec label={tProperty("energy")} value={property.energy_class ?? "—"} />
              </dl>
            </section>

            {/* Pitch + description */}
            {(property.short_pitch || property.description) && (
              <section>
                <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                  {t("brief")}
                </h2>
                {property.short_pitch && (
                  <p className="font-display text-2xl font-bold leading-snug text-ink">
                    {property.short_pitch}
                  </p>
                )}
                {property.description && (
                  <div className="mt-5 space-y-4 text-base leading-relaxed text-ink-mid">
                    {property.description.split(/\n\s*\n/).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Highlights */}
            {property.highlights && property.highlights.length > 0 && (
              <section>
                <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                  {t("highlights")}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {property.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-md border border-line bg-bg-soft p-4 text-sm leading-relaxed text-ink-mid"
                    >
                      <span className="text-gold-deep">›</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Galerie verrouillée */}
            {allImages.length > 1 && (
              <section>
                <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                  {t("gallery")}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {allImages.slice(1, 7).map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-[4/3] overflow-hidden rounded-md bg-bg-deep"
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="(min-width:1024px) 25vw, 50vw"
                        className="object-cover blur-md scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-contrast/30 font-mono text-[10px] uppercase tracking-[0.3em] text-text-contrast/80">
                        🔒 NDA
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* NDA Form sidebar */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div
              id="contact-form"
              className="rounded-2xl border border-gold/40 bg-bg-soft p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                {t("form_eyebrow")}
              </p>
              <h2 className="mt-2 t-h2">
                {t("form_title")}
              </h2>
              <p className="mt-2 mb-6 text-sm text-ink-mid">{t("form_subtitle")}</p>
              <NDAForm
                propertyRef={property.id}
                propertyTitle={property.title ?? "—"}
              />
              <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-gold/40">
                  <Image
                    src={sbUrl("photos", "IMG_2461.jpg")}
                    alt="Julien — Real Estate Director MAPA Property"
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="leading-tight">
                  <p className="font-display text-sm font-bold text-ink">
                    Julien
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                    Real Estate Director
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-bold text-ink">{value}</dd>
    </div>
  );
}
