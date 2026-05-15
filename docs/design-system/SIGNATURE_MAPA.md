# Signature MAPA — le filet copper

Le filet copper (`#B8865A`) est l'élément graphique transversal de l'identité
MAPA Property. Il reprend la signature des documents Word officiels MAPA et
crée une cohérence visuelle entre le logo, les titres et les CTA.

## Token

Couleur unique, exposée via le token sémantique `--copper` (utilitaire
Tailwind `bg-copper` / `text-copper` / `border-copper`).

- **FIXE sur les deux modes** (jour ET nuit) — jamais inversée.
- Définie dans `app/globals.css` (`:root` et `.dark`, valeur identique).
- Aucun hex copper en dur dans les composants : toujours le token.

## Les 3 contextes d'usage

### 1. Logo Header — filet intégré au wordmark

`components/Logo.tsx` — le filet copper sépare `MAPA` de `PROPERTY` dans le
wordmark stacké (largeur = largeur du wordmark). Le wordmark est en
`currentColor` (hérite du token texte : ink en clair, blanc en nuit) ; le
filet reste copper sur les deux modes. Asset portable :
`public/logos/mapa-property-bicolore-2026-05.svg`.

### 2. Titres majeurs — composant `SignatureLine`

`components/ui/SignatureLine.tsx` — filet sous les **H1/H2 majeurs uniquement**.

| Prop      | Défaut      | Valeurs                | Rôle                              |
|-----------|-------------|------------------------|-----------------------------------|
| `align`   | `left`      | `left` \| `center`     | Alignement horizontal             |
| `variant` | `default`   | `default` (2px) \| `thin` (1px) | Épaisseur du filet      |
| `width`   | `w-12`      | utilitaire Tailwind    | Largeur (48px par défaut)         |

Marges intégrées : `mt-4` (16px) / `mb-6` (24px). Purement décoratif
(`aria-hidden`).

**Appliqué sur (8) :**

- Hero H1 (home) — `align="left"` pour coller à la mise en page réelle du
  Hero (`items-start`, et non centrée comme évoqué initialement).
- H2 « Nos biens à la une » (`FeaturedCarousel`)
- H2 « Quatre familles d'actifs » (`CoverageGrid`)
- H2 « Nos marchés actifs » (`MarketsSection`)
- H2 « Six métiers, une méthode » (`ServicesTable`)
- H2 « Insights MAPA » (`BlogTeaser`)
- H2 « Avis clients » (`ReviewsCarousel`)
- H2 « Parlons de votre projet » (`ContactCTA`)

**Ne PAS appliquer sur :** les H3/H4 (redondant), ni les eyebrows (déjà
copper). Un seul filet par bloc de titre.

### 3. Soulignement des CTA secondaires

Liens/CTA secondaires : soulignement copper fin au survol/actif
(`border-copper` ou `text-copper`). À généraliser dans les passes design
ultérieures (hors P0). Documenté ici pour cohérence du système.

## Règle d'or

Le copper est un **accent**, pas une couleur de corps de texte. Filets,
soulignements, icône du logo, CTA — jamais de paragraphes entiers en copper.
