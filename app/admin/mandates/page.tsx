import { ModuleComingSoon } from "@/components/admin/ModuleComingSoon";

export const dynamic = "force-dynamic";

export default function AdminMandatesPage() {
  return (
    <ModuleComingSoon
      module="Mandats de recherche"
      description="Suivi des mandats de recherche soumis via le site. Workflow : pending → mandate_signed → actively_searching → properties_proposed → converted / cancelled. Upload du PDF du mandat signé."
    />
  );
}
