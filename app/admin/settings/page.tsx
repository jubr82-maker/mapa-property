import { ModuleComingSoon } from "@/components/admin/ModuleComingSoon";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <ModuleComingSoon
      module="Paramètres"
      description="Changement mot de passe admin (via Supabase Auth), adresse contact agence (lecture seule), toggle Cloudflare Analytics, liste des sous-traitants RGPD."
    />
  );
}
