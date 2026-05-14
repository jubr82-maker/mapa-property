import { redirect } from "next/navigation";

/**
 * Alias /services/capacite-emprunt → /services/simulateurs/financement.
 * Le simulateur de financement existant (FinancingSimulator) couvre déjà
 * les inputs revenus / charges / apport / durée / taux + outputs mensualité,
 * frais d'acquisition, taux d'endettement et aides applicables 6 pays.
 *
 * URL canonique conservée pour ne pas casser les liens existants (sitemap,
 * Header dropdown, page services/simulateurs). Cette route est l'alias public
 * "Capacité d'emprunt" demandé par le brief mission de mai 2026.
 */
export default async function CapaciteEmpruntAlias({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/services/simulateurs/financement`);
}
