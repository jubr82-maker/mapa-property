import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchOffmarketById, fetchOffmarketList } from "@/lib/data";
import { routing } from "@/i18n/routing";
import { BackButton } from "@/components/ui/BackButton";
import { NDAForm } from "@/components/forms/NDAForm";
import { FavoriteHeart } from "@/components/property/FavoriteHeart";
import { ContactReveal } from "@/components/contact-reveal";
import { OffmarketPlaceholder } from "@/components/property/OffmarketPlaceholder";
import { PropertyPrice } from "@/components/property/PropertyPrice";
import { PropertyVideo } from "@/components/property/PropertyVideo";
import { FicheHeader } from "@/components/property/fiche/FicheHeader";
import { FicheSpecs } from "@/components/property/fiche/FicheSpecs";
import { FicheAccordion } from "@/components/property/fiche/FicheAccordion";
import { FicheConditions } from "@/components/property/fiche/FicheConditions";
import { FicheAdvisorColumn } from "@/components/property/fiche/FicheAdvisorColumn";
import { PropertyMagazineDescription } from "@/components/property/PropertyMagazineDescription";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { highlightTitles } from "@/lib/formatting/highlightTitles";

// POL2-9 : le prix off-market est désormais pilotable depuis le BO via
// le drapeau `price_on_demand`. Par DÉFAUT (false ou colonne absente) le
// prix réel formaté (price_display) est affiché — inversion DÉLIBÉRÉE du
// comportement BUG 1 qui forçait "Prix sur demande" partout en dur. Si
// l'admin coche la case, le prix est masqué ("Prix sur demande" localisé).
//
// POL2-7 : structure de fiche UNIFIÉE avec /biens (même header, mêmes
// 4 onglets, même colonne droite épurée, même bloc avis + formulaire).
// Spécificités off-market : cover OffmarketPlaceholder (jamais le visuel
// réel — BUG 2), onglet "Conditions de vente" → "Processus d'accès au
// dossier", formulaire bas = NDA "Accéder au dossier complet".

// Sprint OPTIM-1B : ISR sur les fiches off-market (vs Dynamic rendering
// avant -> chaque visite = write ISR). Pre-build via generateStaticParams
// ci-dessous. Les biens off-market changent rarement (titre/description/
// prix edites depuis admin invalident deja /[locale]/off-market/[id] via
// revalidatePath cross-locale dans app/admin/offmarket/actions.ts).
//
// OPTIM-1B C5 : 86400s (24h) au lieu de 1800s (30 min) pour reduire la
// pression crawlers (cf. justification dans biens/[slug]/page.tsx).
export const revalidate = 86400;

/**
 * Sprint OPTIM-1B : pre-build des fiches off-market publiees pour les 3
 * locales. fetchOffmarketList filtre deja is_published=true via la VIEW
 * properties_offmarket_public. En cas d'erreur fetch au build (Supabase
 * down), retourne [] -> Next bascule en dynamic rendering par defaut, le
 * site reste up. Reseau dynamicParams (default true) permet aussi aux
 * nouveaux ids non-buildes de devenir ISR a la 1ere visite.
 */
export async function generateStaticParams() {
  try {
    const list = await fetchOffmarketList();
    const ids = list
      .map((p) => p.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    return routing.locales.flatMap((locale) =>
      ids.map((id) => ({ locale, id })),
    );
  } catch (e) {
    console.warn("[off-market/[id]] generateStaticParams failed:", e);
    return [];
  }
}

export default async function OffMarketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const property = await fetchOffmarketById(id, locale);
  if (!property) notFound();

  const t = await getTranslations({ locale, namespace: "offmarket" });
  const tProperty = await getTranslations({ locale, namespace: "property" });
  const tf = await getTranslations({ locale, namespace: "fiche" });

  const title = property.title ?? "—";

  // Galerie verrouillée préservée (visuels floutés sous NDA).
  const lockedImages = [
    ...(property.cover_image_url ? [property.cover_image_url] : []),
    ...(property.gallery_urls ?? []),
  ];

  // Specs — toutes les données Supabase préservées, "—" si absent.
  const specs = [
    {
      label: tProperty("living_surface"),
      value: property.surface_hab ? `${property.surface_hab} m²` : "—",
    },
    {
      label: tProperty("land_surface"),
      value: property.surface_terrain
        ? `${property.surface_terrain} m²`
        : "—",
    },
    {
      label: tProperty("bedrooms"),
      value: property.bedrooms != null ? String(property.bedrooms) : "—",
    },
    {
      label: tProperty("bathrooms"),
      value: property.bathrooms != null ? String(property.bathrooms) : "—",
    },
    {
      label: tProperty("energy"),
      value: property.energy_class ?? "—",
    },
  ];

  const panels = [
    {
      id: "overview",
      label: tf("tab_overview"),
      content: (
        <div className="space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
            {t("brief")}
          </p>
          {property.short_pitch ? (
            // Sprint HTML-RENDERING C4 : short_pitch passe via
            // highlightTitles -> rendu HTML securise (sanitize whitelist
            // p/strong/em/b/i/br/ul/ol/li) ou mode B legacy si texte
            // plat. Auparavant : {property.short_pitch} en {value}
            // brut -> React echappait les '<' si HTML present.
            <div className="font-display text-xl font-bold leading-snug text-ink sm:text-2xl [&_p]:mb-3 [&_strong]:font-semibold [&_em]:italic">
              {highlightTitles(property.short_pitch)}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-ink-mid">
              {tf("overview_intro")}
            </p>
          )}
          {property.highlights && property.highlights.length > 0 && (
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
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
          )}
        </div>
      ),
    },
    {
      id: "description",
      label: tf("tab_description"),
      // POL3-P1 : rendu UNIFORME avec /biens/[slug] via le même
      // composant PropertyMagazineDescription (serif droit, pas
      // d'italique, pas de lettrine, titres internes en <strong>).
      content: property.description ? (
        <PropertyMagazineDescription description={property.description} />
      ) : (
        <p className="text-sm leading-relaxed text-ink-mid">
          {tf("overview_intro")}
        </p>
      ),
    },
    // POL3-P2 : onglet « Localisation » retiré des fiches OFF-MARKET
    // (positionnement confidentiel renforcé — décision Julien). La
    // carte reste sur /biens/[slug] classiques via FicheLocation.
    {
      id: "conditions",
      label: tf("tab_conditions_offmarket"),
      content: (
        <FicheConditions
          variant="offmarket"
          labels={{
            financing: tf("conditions_financing"),
            fees: tf("conditions_fees"),
            feesText: tf("conditions_fees_text"),
            process: tf("conditions_process"),
            processText: tf("conditions_process_text"),
            offmarketText: tf("conditions_offmarket_text"),
          }}
        />
      ),
    },
  ];

  return (
    <article className="pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <FicheHeader
          back={<BackButton fallback="/off-market" />}
          actions={<FavoriteHeart propertyId={`offmarket:${property.id}`} />}
          eyebrow={{
            lead: ["OFF-MARKET", property.country ?? "", property.city_label ?? ""],
            accent: property.internal_ref ? `REF ${property.internal_ref}` : null,
          }}
          title={title}
          price={
            <PropertyPrice
              priceOnDemand={property.price_on_demand}
              priceMode={property.price_mode}
              priceMin={property.price_min}
              priceMax={property.price_max}
              priceEstimate={property.price_estimate}
              priceDisplay={property.price_display}
              locale={locale}
            />
          }
          meta={tProperty("tx_offmarket")}
        />

        {/* Cover confidentiel standardisé (BUG 2) — jamais le visuel réel,
            même flouté, même si une image custom existe en base. */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-bg-deep">
          <OffmarketPlaceholder
            title={t("cover_title")}
            subtitle={t("cover_subtitle")}
            invertOnDark
          />
        </div>

        {/* Vidéo de présentation — galerie + lightbox (POL2-10).
            Rend null automatiquement si video_url absent. */}
        <PropertyVideo
          videoUrl={property.video_url}
          labels={{ eyebrow: tProperty("video") }}
        />

        {/* Grille principale : specs + 4 onglets | colonne droite épurée */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-12">
            <FicheSpecs heading={tProperty("specs")} items={specs} />
            <FicheAccordion panels={panels} />

            {/* Galerie verrouillée préservée (visuels sous NDA) */}
            {lockedImages.length > 1 && (
              <section data-fiche-locked-gallery>
                <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                  {t("gallery")}
                </h2>
                <SignatureLine width="w-8" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {lockedImages.slice(1, 7).map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-[4/3] overflow-hidden rounded-md bg-bg-deep"
                    >
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="(min-width:1024px) 25vw, 50vw"
                        className="scale-105 object-cover blur-md"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-contrast/30 font-mono text-[10px] uppercase tracking-[0.3em] text-text-contrast/80">
                        NDA
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <FicheAdvisorColumn
            labels={{
              advisor: tProperty("advisor"),
              advisorRoles: tProperty("advisor_block_roles"),
              exclusiveEyebrow: tf("exclusive_mandate_eyebrow"),
              exclusiveTitle: tf("exclusive_mandate_title"),
              exclusiveText: tf("exclusive_mandate_text"),
              exclusiveCta: tf("exclusive_mandate_cta"),
              searchEyebrow: tf("search_mandate_eyebrow"),
              searchTitle: tf("search_mandate_title"),
              searchText: tf("search_mandate_text"),
              searchCta: tf("search_mandate_cta"),
            }}
            searchMandateHref={`/mandats/recherche?ref=${property.id}&country=${property.country ?? ""}`}
            contact={<ContactReveal variant="sidebar" align="left" />}
          />
        </div>

        {/* POL3-2 : bloc avis clients retiré des fiches off-market (le
            ReviewsCarousel reste sur la home). */}

        {/* Formulaire bas : NDA "Accéder au dossier complet" */}
        <section
          id="contact-form"
          className="mt-20 rounded-2xl border border-gold/40 bg-bg-soft p-8 sm:p-12"
        >
          <header className="mb-8 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
              {t("form_eyebrow")}
            </p>
            <h2 className="mt-2 t-h2">{t("form_title")}</h2>
            <p className="mt-3 text-base text-ink-mid">{t("form_subtitle")}</p>
          </header>
          <NDAForm propertyRef={property.id} propertyTitle={title} />
        </section>
      </div>
    </article>
  );
}
