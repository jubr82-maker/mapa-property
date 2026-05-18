# Phase B — backlog admin (BUG 8, 2026-05-18)

## Constat (audit lecture seule)

Deux pages de détail admin affichaient un encart pointillé
« **Action Phase B** » **purement décoratif** (aucun bouton, aucune
action câblée) — il donnait l'impression d'une fonctionnalité cassée :

| Page | Texte | Fichier |
|---|---|---|
| Détail mandat de recherche | « Convertir ce mandat en propriété cherchée active — Disponible en Phase B » | `app/admin/mandats-recherche/[id]/page.tsx` (~l.220) |
| Détail ARCOVA | « Inviter sur ARCOVA — Disponible en Phase B » | `app/admin/arcova/[id]/page.tsx` (~l.194) |

## Décision : MASQUÉ (pas fini) — pourquoi

Finir « convertir un mandat en propriété cherchée active » implique
une **écriture dans la table `properties`**. Or `CLAUDE.md` est
formel : *« Écriture autorisée uniquement sur `leads` »* — `properties`
est intouchée (lecture seule). Implémenter Phase B en autonomie
violerait donc une règle inviolable.

→ Les deux encarts inertes sont **retirés** (commit BUG 8). Le reste
des pages (workflow, notes admin, suivi) reste fonctionnel et n'est pas
touché. Aucune perte de fonctionnalité (rien n'était branché).

## À faire en Phase B (supervisé, hors session autonome)

1. **Mandat de recherche → propriété cherchée active**
   - Modèle de données cible (nouvelle table `searched_properties` ou
     flag sur une table existante — à arbitrer avec Julien ; **ne pas**
     écrire dans `properties`).
   - Migration `.sql` versionnée, appliquée manuellement par Julien.
   - Action serveur + bouton dans `mandats-recherche/[id]`.
2. **Invitation ARCOVA depuis le détail**
   - Action serveur créant l'entrée ARCOVA + email (Resend) au
     candidat ; statut de suivi.
3. Tests E2E admin dédiés (auth admin requise).

## Garde-fous

- Aucune écriture DB hors `leads` sans migration versionnée validée.
- `app/admin/offmarket/*` & `lib/admin/offmarket.ts` : non concernés,
  non touchés (chantier Julien en parallèle).
