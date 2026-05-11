import { ModuleComingSoon } from "@/components/admin/ModuleComingSoon";

export const dynamic = "force-dynamic";

export default function AdminPropertiesPage() {
  return (
    <ModuleComingSoon
      module="Properties (Apimo)"
      description="Liste lecture seule des biens classiques synchronisés depuis Apimo. Édition restreinte à 2 toggles par bien : is_published (visibilité site) et is_featured (coups de cœur home). Aucun bouton modifier / supprimer — Apimo reste source de vérité."
    />
  );
}
