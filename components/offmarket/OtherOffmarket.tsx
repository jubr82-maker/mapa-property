// Bloc « Autres opportunites off-market » (nov. 2026), en bas des pages
// off-market et de la page ARCOVA : cartes de la liste publique (aucune
// information en plus), lien vers ARCOVA (pages des biens) et vers la liste.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PropertyOffmarket } from "@/lib/types";
import { otherOffmarket } from "@/lib/offmarket-links";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { OffMarketTeaser } from "@/components/offmarket/OffMarketTeaser";

export async function OtherOffmarket({
  list,
  currentId,
  locale,
  showArcova = true,
}: {
  list: PropertyOffmarket[];
  currentId: string | null;
  locale: string;
  showArcova?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "offmarket" });
  const others = otherOffmarket(list, currentId);
  const linkCls =
    "inline-flex min-h-11 items-center text-base text-ink underline decoration-line underline-offset-4 transition-colors hover:text-gold-deep";
  return (
    <section className="mt-20 mb-16 print:hidden" data-offmarket-others>
      <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">{t("others_title")}</h2>
      <SignatureLine width="w-8" />
      {others.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((p) => (
            <OffMarketTeaser key={p.id} property={p} t={t} locale={locale} />
          ))}
        </div>
      )}
      <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
        <li>
          <Link href="/off-market" className={linkCls}>
            {t("others_all")}
          </Link>
        </li>
        {showArcova && (
          <li>
            <Link href="/off-market/arcova" className={linkCls}>
              {t("arcova_cta_title")}
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}
