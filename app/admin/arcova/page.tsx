import { ModuleComingSoon } from "@/components/admin/ModuleComingSoon";

export const dynamic = "force-dynamic";

export default function AdminArcovaPage() {
  return (
    <ModuleComingSoon
      module="ARCOVA Waitlist"
      description="Liste des inscriptions à la waitlist ARCOVA. Filtres par rôle, export CSV, statut invited / accepted / declined."
    />
  );
}
