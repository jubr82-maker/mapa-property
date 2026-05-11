import { ModuleComingSoon } from "@/components/admin/ModuleComingSoon";

export const dynamic = "force-dynamic";

export default function AdminReviewsPage() {
  return (
    <ModuleComingSoon
      module="Avis clients"
      description="CRUD complet des avis clients (étoiles, texte, langue, statut publié). Réordonnable pour le carrousel de la home."
    />
  );
}
