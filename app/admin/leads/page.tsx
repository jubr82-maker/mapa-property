import { ModuleComingSoon } from "@/components/admin/ModuleComingSoon";

export const dynamic = "force-dynamic";

export default function AdminLeadsPage() {
  return (
    <ModuleComingSoon
      module="Leads"
      description="Tableau de bord complet des leads issus de tous les formulaires du site (contact, mandat, achat, vente, location, estimation). Filtres par type/statut/période, vue détail, notes admin, push manuel vers Apimo selon règles métier."
    />
  );
}
