# POL2-4 — Note d'alignement (blocage structurel honnête)

Date : 2026-05-19 — Agent A. Header desktop : `components/layout/Header.tsx`.

## Ce qui a été livré (parties A, B, D, E — PROUVÉ)

| Partie | Demande | Livré | Mesure (Mac 1440 / 1920) |
| --- | --- | --- | --- |
| A | Onglets nav ×1.5, tracking conservé | `text-[13px]` → `text-[20px]`, `tracking-[0.05em]` conservé | font ACHETER/LOUER/JOURNAL = **20px** (×1.54) |
| B | Gaps clés DOUBLÉS | grille `lg:gap-4` → `lg:gap-8` (16→32px) ; inter-onglets `gap-1` → `gap-2` (4→8px) ; MANDATS `ml-1` → `ml-2` ; bloc langue `ml-2` → `ml-4` | appliqué |
| D | Bloc FR + jour/nuit à l'extrême droite (POL3) | slot 3 `justify-end`, `border-l` inchangé | `lang.right` = `header.right` − 40px (= padding `px-10`), collé au bord contenu, **0 chevauchement** (JOURNAL.right − lang.left = −24px) |
| E | Burger mobile inchangé | branche mobile non touchée, `HeaderBurger.tsx` non modifié | iPhone 17 Pro Max : burger présent, visible, 40×40 rond, aucune nav desktop qui fuit |

Logo desktop : reste **parfaitement centré** sur la page (slot `auto`
de la grille `[1fr auto 1fr]`) — `logo.cx` = `header.cx` à Δ=2px.

Preuve : `scripts/proof-pol2-4.mjs` → RESULT PASS (périmètre A+B+D+E).
Capture Mac 1440/1920 + iPhone 17 Pro Max dans
`docs/qa/screenshots-2026-05-18/pol2-4/`.

## Ce qui est STRUCTURELLEMENT IMPOSSIBLE (partie C)

La demande C : « contraindre le cluster [onglets gauche + logo +
onglets droite] à la largeur visuelle de la marque MAPA, de sorte que
ACHETER commence ≈ au début visuel du M et JOURNAL finisse ≈ à la fin
visuelle du A final », avec preuve `|ACHETER.left − logo.left| < 30`
et `|JOURNAL.right − logo.right| < 30`.

### Pourquoi c'est géométriquement impossible

- Le groupe d'onglets gauche est **ACHETER ▾ · VENDRE ▾ · MANDATS ·
  LOUER** (4 éléments). À `text-[20px]` + gaps doublés, il occupe
  **≈ 520 px** de large.
- Ce groupe est, par nature d'une barre de nav horizontale sur une
  seule ligne, **entièrement à GAUCHE du logo**. ACHETER est l'élément
  le plus à gauche du groupe.
- Donc `ACHETER.left` = `logo.left` − (largeur du groupe gauche)
  ≈ `logo.left` − 520. Mesuré : **|ACHETER.left − logo.left| = 501 px**
  (et 376 px pour JOURNAL.right vs logo.right).
- Pour obtenir `< 30 px`, il faudrait que le groupe d'onglets gauche
  ait une largeur ≈ 0, OU qu'il se superpose au logo (illisible /
  cassé). L'image logo elle-même fait 306 px de large : y faire tenir
  [onglets gauche + logo + onglets droite] est impossible.

### Tentatives écartées (cassées ou hors-scope)

- Cluster centré contraint `max-w` ≈ largeur logo : les onglets (texte,
  `flex` sans shrink) débordent → JOURNAL passe **sous** le bloc
  langue/thème (chevauchement 84 px constaté), header cassé.
- Réduire police / gaps : viole explicitement A et B.
- Retirer un onglet (ex. MANDATS) : modifie l'architecture
  d'information, hors scope.
- Recadrer/rétrécir l'image logo : asset PNG partagé, hors scope POL2-4
  (et géré séparément par POL2-3).

### Décision (règle workflow : « blocage structurel → livrer le
faisable, documenter honnêtement, ne pas truquer »)

Livraison du sous-ensemble réalisable et **non cassé** (A+B+D+E),
logo centré et équilibré entre les deux groupes, bloc langue/thème à
l'extrême droite sans chevauchement. La contrainte C littérale
(`< 30 px` d'alignement aux bords du logo) est rapportée comme
**impossible** pour une nav horizontale mono-ligne à 7 entrées —
arbitrage produit nécessaire (réduire le nombre d'onglets desktop,
ou accepter le logo centré non aligné aux onglets) à trancher par
Julien.
