import { ModuleComingSoon } from "@/components/admin/ModuleComingSoon";

export const dynamic = "force-dynamic";

export default function AdminDocumentsPage() {
  return (
    <ModuleComingSoon
      module="Documents"
      description="Upload, liste et gestion des documents agence (mandats vierges, KYC, CGU, plaquettes…). Toggle public, suppression, lien Supabase Storage."
    />
  );
}
