# Blog — coquilles "faire + verbe" (audit POL2-2)

Date : 2026-05-19 — Agent A — REPORT ONLY (aucune modification de contenu hors migration ciblée).

## 1. Coquille cible POL2-2 — "qui tentait de lui faire racheter son propre bien"

Statut : **déjà corrigée dans la base Supabase live**.

- Article concerné : "Off Market au Luxembourg : vers la fin du modèle informel"
  (slug `off-market-luxembourg-fin-modele-informel`).
- Contenu live actuel (vérifié le 2026-05-19 via l'API REST Supabase, table
  `public.blog_posts`, colonne `content`) :

  > « … l'intermédiaire **qui tentait de lui racheter son propre bien**, une
  > chaîne d'acteurs s'était positionnée… »

  La forme fautive « **lui faire racheter** » n'est plus présente.
- La coquille n'apparaît dans aucun des 3 articles publiés
  (`vendre-luxembourg-2026-prix-estimation`,
  `vivre-au-luxembourg-choix-rationnel-europe`,
  `off-market-luxembourg-fin-modele-informel`), ni dans `content`,
  `excerpt`, `meta_description`.
- Migration `supabase/migrations/20260519_blog_typo_faire_racheter.sql`
  créée malgré tout (idempotente, ciblée, NON appliquée) : no-op sur les
  données actuelles, mais sécurise un éventuel re-seed depuis une source
  antérieure contenant encore la coquille. À appliquer par Julien.

## 2. Scan "faire + infinitif" (causatif bancal) sur tous les articles

Méthode : strip HTML/entités, regex `\b(faire|fait|font|faisait|ferait|feront)\s+(infinitif)\b`
(infinitif heuristique : terminaison -er/-ir/-re + verbes irréguliers courants).

| Article | Occurrences "faire + inf" |
| --- | --- |
| `vendre-luxembourg-2026-prix-estimation` | 0 |
| `vivre-au-luxembourg-choix-rationnel-europe` | 0 |
| `off-market-luxembourg-fin-modele-informel` | 0 |

**Aucune tournure "faire + verbe" bancale détectée** dans le contenu blog
publié. Rien d'autre à corriger ; aucune modification effectuée hors la
migration ciblée ci-dessus.
