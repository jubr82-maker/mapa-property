// Page admin : edition d'une vente realisee. Server component : auth + fetch
// de la ligne, puis SaleForm en mode edition (PATCH /api/admin/ventes-realisees/[id]).

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { adminLuPlaces } from "@/lib/admin/property-location";
import { SaleForm } from "../../SaleForm";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { DEFAULT_VAT_RATE, storedCommission } from "@/lib/admin/sale-commission";

export const dynamic = "force-dynamic";

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/admin/login?from=/admin/ventes-realisees/${id}/edit`);
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_sales" });

  // Nov. 2026 : commission lue si ses colonnes existent (supabase/sql/32),
  // sinon lecture sans elles : la vente reste modifiable.
  const BASE =
    "id, property_type, surface_habitable, surface_terrain, chambres, classe_energie, annee_construction, etat, adresse, commune, prix_vente, date_acte, agent, notes";
  const read = (select: string) =>
    supabase.from("mapa_historical_sales").select(select).eq("id", id).maybeSingle<Record<string, unknown> & { id: string }>();
  let res = await read(`${BASE}, commission_mode, commission_taux, commission_ht, tva_taux`);
  if (res.error) res = await read(BASE);
  const { data: row, error } = res;

  if (error) {
    return (
      <div className="space-y-4">
        <p className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {t("loadErrorOne")}
        </p>
        <Link href="/admin/ventes-realisees" className="text-sm underline">
          ← {t("backToList")}
        </Link>
      </div>
    );
  }
  if (!row) notFound();

  // Seul agent : Julien. Enregistrer une ancienne vente "frederic" la
  // reattribue a Julien.
  const agent = "julien" as const;

  // Commission enregistree : mode et valeurs repris tels quels ; vente sans
  // commission : pourcentage propose, champ vide (non renseignee), TVA 17 %.
  const c = storedCommission(row);
  const decimal = (n: number) => String(n).replace(".", ",");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.05em]">
            {t("editTitle")}
          </h1>
          <p className="mt-1 text-xs text-[#3D4F63]/70">
            {s(row.commune)} · {s(row.adresse)}
          </p>
        </div>
        <Link
          href="/admin/ventes-realisees"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] underline"
        >
          ← {t("back")}
        </Link>
      </header>

      <section className="rounded-lg border border-[#3D4F63]/20 bg-white p-6">
        <SaleForm
          luPlaces={adminLuPlaces()}
          mode="edit"
          saleId={row.id}
          initial={{
            property_type: s(row.property_type),
            surface_habitable: s(row.surface_habitable),
            surface_terrain: s(row.surface_terrain),
            chambres: s(row.chambres),
            classe_energie: s(row.classe_energie),
            annee_construction: s(row.annee_construction),
            etat: s(row.etat),
            adresse: s(row.adresse),
            commune: s(row.commune),
            prix_vente: s(row.prix_vente),
            date_acte: s(row.date_acte).slice(0, 10),
            agent,
            notes: s(row.notes),
            commission_mode: c?.mode ?? "pourcentage",
            commission_taux: c?.mode === "pourcentage" && c.rate !== null ? decimal(c.rate) : "",
            commission_ht: c?.mode === "montant_fixe" ? decimal(c.ht) : "",
            tva_taux: String(c?.vat ?? DEFAULT_VAT_RATE),
          }}
        />
      </section>
    </div>
  );
}
