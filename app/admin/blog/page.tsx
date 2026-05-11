import { ModuleComingSoon } from "@/components/admin/ModuleComingSoon";

export const dynamic = "force-dynamic";

export default function AdminBlogPage() {
  return (
    <ModuleComingSoon
      module="Blog"
      description="CRUD complet des articles blog (titre, catégorie, résumé, contenu, image cover, auteur, langue, statut, date). Éditeur riche markdown ou TipTap avec preview."
    />
  );
}
