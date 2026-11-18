# Tri du formulaire d'annonce (fiche d'un bien dans l'admin)

Ce document fait l'inventaire de tout ce que l'on peut remplir sur la page « Modifier un bien » de l'admin (`app/admin/properties/[id]/page.tsx`), dans l'ordre où cela s'affiche, et propose un tri. Rien n'a été changé dans le code ni dans la base : c'est seulement un état des lieux. Julien valide (ou corrige) chaque proposition avant toute modification. Important : « RETIRER » veut dire « ne plus afficher le champ dans le formulaire » ; la colonne et les valeurs déjà saisies restent en base, rien n'est effacé.

Méthode : pour chaque champ, le nom de la colonne en base a été recherché dans tout le code du site (pages publiques, cartes, recherche, données Google, adresses des pages, exports). Quand un champ n'est lu nulle part ailleurs que dans l'admin, c'est écrit « Nulle part sur le site ».

## Résumé chiffré

Aujourd'hui (cas le plus chargé : aucun type choisi, bien en location, « Saisie libre » choisie, donc tout s'affiche) :

| | Nombre |
|---|---|
| Blocs à l'écran | **15** (11 parties repliables dans le grand formulaire, puis Vidéo, Photos, Textes alternatifs, Aperçu public) |
| Boutons « Enregistrer » différents | **4** (formulaire, vidéo, textes alternatifs, et enregistrement automatique des photos) |
| Champs à remplir | **98** (92 dans le grand formulaire, 1 vidéo, 1 galerie de photos, 4 par photo pour les textes alternatifs) |
| Exemple réel : appartement à vendre | **70** champs affichés (le formulaire masque déjà ce qui ne sert pas au type) |

Après le tri proposé :

| | Nombre |
|---|---|
| Champs visibles dans le formulaire principal | **50** |
| Champs rangés dans « Options avancées » (bloc fermé par défaut) | **25** |
| Champs fusionnés avec un autre (ils disparaissent, l'autre reste) | **8** |
| Champs retirés (lus nulle part sur le site, prouvé par recherche) | **15** |
| Blocs | **6** grandes parties, un seul bouton « Enregistrer » souhaitable |

Total de contrôle : 50 + 25 + 8 + 15 = 98.

## Légende des fichiers cités

Pour garder les tableaux lisibles, les usages sont notés avec ces repères :

| Repère | Fichier | Ce que c'est |
|---|---|---|
| Fiche | `app/[locale]/biens/[slug]/page.tsx` | Page publique du bien (tableau des caractéristiques, titre, galerie, vidéo) |
| Carte | `components/property/PropertyCard.tsx`, `components/home/FeaturedCarousel.tsx`, `lib/data.ts` (liste des colonnes des cartes) | Cartes des biens (liste, accueil, biens similaires) |
| Texte du modèle | `lib/listing/generate.ts` | Texte de l'annonce écrit automatiquement par le modèle (titre et description), et fin commune de la fiche |
| Google (titre, description) | `lib/listing/listing-seo.ts` | Titre et description affichés dans les résultats Google, adresse de la page |
| Google (données structurées) | `lib/seo.ts` | Données lues par Google (surface, chambres, salles de bain, prix) |
| Adresse de la page | `lib/published-property-keys.ts`, `lib/listing/listing-seo.ts` | Construction de l'adresse du bien (type, chambres, ville) et plan du site |
| Recherche | `lib/search/engine.ts`, `components/property/FilterBar.tsx` | Recherche et filtres des biens |
| Biens similaires | `lib/similar-properties.ts`, `lib/other-properties.ts` | « Biens similaires » et « Autres biens » en bas de fiche |
| Import | `lib/import-listing/fields.ts`, `app/admin/properties/import-actions.ts` | « Importer une annonce » (remplit le champ, ne l'affiche pas) |
| Apimo | `lib/apimo/mapper.ts` | Ancienne synchronisation Apimo (importation seulement, désactivée depuis le 3 sept. 2026, cf. `app/api/cron/apimo-sync/route.ts`) |

Ce qui n'existe pas : aucun PDF propre aux biens et aucun export vers des portails. Les exports de `app/api/admin/exports` ne concernent que les estimations, les leads, la liste d'attente, les mandats et les demandes off-market. Le PDF « avis de valeur » (`lib/estimation/value-opinion-pdf.ts`) concerne les estimations, pas les biens. La fiche publique a seulement une mise en page pour l'impression (`app/globals.css`, partie `@media print`).

## Avant le formulaire : la création d'un bien

La page « Nouveau bien » (`app/admin/properties/new/page.tsx`) n'utilise pas le même formulaire. Elle montre deux choses :

1. « Importer une annonce » (`components/admin/ListingImporter.tsx`) : coller l'annonce, déposer les photos, cliquer « Remplir l'annonce ». Un brouillon est créé, puis on arrive sur la page de modification (avec le bandeau du résumé de l'import et les champs à compléter surlignés).
2. Un petit formulaire de création (`components/admin/PropertyCreateForm.tsx`) qui, après « Créer le bien », ouvre lui aussi la page de modification (`app/admin/properties/actions.ts`).

Donc les deux chemins finissent sur le même grand formulaire, décrit plus bas.

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Contenu de l'annonce | Coller l'annonce Apimo ou immotop à importer | Import | Non | GARDER |
| Déposez ici un dossier de photos... (« Choisir un dossier », « Choisir des photos ou un .zip ») | Ajouter les photos de l'annonce importée | Galerie de la fiche, via `app/admin/properties/[id]/photos/actions.ts` | Non | GARDER |
| Améliorer automatiquement les photos | Retouche automatique à l'import | Photos | Non | GARDER |
| Type de bien, Transaction, Pays (si l'import ne les trouve pas) | Compléter ce que l'import n'a pas reconnu | Import | Non (ne s'affichent qu'en cas de besoin) | GARDER |
| Statut (« Brouillon », non modifiable) | Rappel : un nouveau bien naît en brouillon | Aucun choix possible | Doublon du « Statut » de la page de modification | RETIRER le champ grisé, garder la phrase d'explication |
| Référence interne | Référence libre de l'agence | Nulle part sur le site ni dans la liste admin (seul l'off-market a sa propre référence) ; non modifiable ensuite | Non | RETIRER (ou la rendre utile, cf. points à vérifier) |
| Titre (FR) | Titre du bien | Comme sur la page de modification | Doublon du « Titre (FR) » de la page de modification | GARDER (il faut un titre pour créer) |
| Titre (EN), Titre (DE) | Titres traduits | Comme sur la page de modification | Doublon : se remplissent mieux ensuite avec le bouton de traduction | RETIRER de la création |
| Transaction | Vente ou location | Fiche, Carte, Recherche, Texte du modèle, adresse de la page | Non | GARDER (seul endroit où on la choisit, cf. points à vérifier) |
| Type de bien | Type précis | Comme sur la page de modification | Doublon du « Type » de la page de modification | GARDER |
| État du bien | Neuf, ancien, etc. | Nulle part sur le site (colonne `property_state` lue par aucun fichier) ; non modifiable ensuite | Non | RETIRER |
| Pays, Ville, Page de ville | Situer le bien | Comme sur la page de modification | Doublons de la page de modification | GARDER Pays et Ville ; « Page de ville » en option avancée |
| Prix (€), Prix sur demande | Prix | Comme sur la page de modification | Doublons de la page de modification | GARDER |

Ce tableau de création n'est pas compté dans les 98 champs du résumé.

## Bloc 1 : « Type de bien et mandat »

Le choix du type fait apparaître ou disparaître les autres champs (liste dans `lib/listing/families.ts`).

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Famille | Choisir la grande famille avant le type | Nulle part : elle n'est pas enregistrée, elle sert seulement à filtrer la liste « Type » | Doublon de « Type » (la famille se déduit du type) | FUSIONNER avec « Type » (une seule liste groupée par famille, comme à la création) |
| Type | Type précis du bien (appartement, villa...) | Fiche, Carte, adresse de la page, Google (titre, description, données structurées), Texte du modèle, Biens similaires, Recherche | Non | GARDER |
| Type de mandat | Exclusif, semi-exclusif, simple, autonome | Badge « Exclusivité » sur la Fiche et la Carte (`lib/listing/families.ts`, `lib/data.ts`), formule du Texte du modèle, description Google | Doublon partiel de l'« Étiquette commerciale » « Exclusivité » (Bloc 11) | GARDER |
| Pays | Pays du bien | Fiche, Carte, Biens similaires, page de ville (`lib/internal-links.ts`) | Non | GARDER |
| Ville | Localité (liste officielle au Luxembourg) | Fiche, Carte, adresse de la page, Google, Texte du modèle, Biens similaires, textes alternatifs des photos | Non | GARDER |
| Page de ville | Choisir à la main la page de ville liée au bien | Lien vers la page de ville et « Autres biens » (`lib/internal-links.ts`, `lib/city-match.ts`, `lib/other-properties.ts`) ; vide = choix automatique depuis la ville | Doublon partiel de « Ville » (choix automatique par défaut) | MASQUER |

## Bloc 2 : « Annonce » (modèle d'annonce)

Ces champs sont enregistrés dans `listing_data`. Ils servent à écrire automatiquement le titre et la description (Texte du modèle) tant qu'on ne les a pas modifiés à la main. Les champs rédigés se remplissent langue par langue avec les onglets FR / EN / DE (comptés une fois chacun).

### Champs rédigés

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Qualificatif | Adjectif du bien (« bel appartement ») | Texte du modèle (titre et description) | Non | GARDER |
| Formule de situation | « à », « au cœur de », etc. devant la commune | Texte du modèle, description Google | Non | MASQUER (« à » par défaut suffit souvent) |
| Formule libre (FR / EN / DE) | Formule personnalisée, seulement si « Saisie libre » | Texte du modèle | Non | MASQUER |
| Phrase d'ambiance | Phrase d'accroche de la description | Texte du modèle, compteur de mots de l'aperçu Google | Non | GARDER |
| Atouts | Un atout par ligne, mis en liste | Texte du modèle, compteur de mots | Doublon de « Prestations » (Bloc 9) | GARDER (et y fusionner « Prestations ») |
| Histoire du lieu | Biens de prestige seulement | Texte du modèle | Non | GARDER |
| Vue | Penthouse seulement | Texte du modèle | Non | GARDER |
| Affectation | Biens commerciaux seulement | Texte du modèle | Doublon de « Usage actuel » (Bloc 9) : le modèle prend « Affectation », sinon « Usage actuel » | GARDER (et y fusionner « Usage actuel ») |

### Niveaux et pièces

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Niveau (un par niveau ajouté) | Rez-de-chaussée, étage, etc. | Texte du modèle (liste des pièces) | Non | GARDER |
| Pièce (« Par exemple : Séjour avec cheminée ») | Une ligne par pièce | Texte du modèle, choix « Pièce montrée » des photos et leur texte alternatif sur la Fiche, compteur de mots | Non | GARDER |

### Données du modèle

Chaque donnée ne s'affiche que pour les familles concernées (`components/admin/ListingModelEditor.tsx`). Toutes ne servent qu'au Texte du modèle (et, pour certaines, à la description Google) : aucune n'apparaît dans le tableau des caractéristiques de la Fiche ni sur la Carte.

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Année de rénovation | Année des travaux | Texte du modèle | Non (proche de « Année de construction ») | GARDER (à placer à côté de l'année de construction) |
| Cave privative | Case à cocher | Texte du modèle | Non | GARDER |
| Emplacements intérieurs | Nombre de places intérieures | Texte du modèle (prioritaire sur « Emplacements de stationnement ») | Doublon de « Emplacements de stationnement » (Bloc 6) et de « Places de garage » | GARDER |
| Emplacements extérieurs | Nombre de places extérieures | Texte du modèle | Doublon de « Emplacements de stationnement » (Bloc 6) | GARDER |
| Charges mensuelles (€) | Charges de copropriété | Texte du modèle | Doublon de « Charges locatives » en location | GARDER |
| Ascenseur | Case à cocher | Texte du modèle | Non | GARDER |
| Niveaux de l'immeuble | Nombre d'étages de l'immeuble | Texte du modèle | Non | MASQUER |
| Dernier étage | Penthouse seulement | Texte du modèle | Doublon partiel de « Étage » (Bloc 5) | MASQUER |
| Ascenseur privatif | Penthouse seulement | Texte du modèle | Non | MASQUER |
| Type de construction | Maison, villa | Texte du modèle | Non | MASQUER |
| Orientation | Maison, villa, prestige, terrain | Texte du modèle | Non | MASQUER |
| Places de garage | Maison, villa, prestige, parking | Texte du modèle | Doublon de « Emplacements intérieurs » et « Emplacements de stationnement » | FUSIONNER avec « Emplacements intérieurs » |
| Jardin paysager | Villa | Texte du modèle | Proche de « Jardin » (surface, Bloc 4) | MASQUER |
| Domotique | Villa | Texte du modèle | Non | MASQUER |
| Dépendances | Prestige | Texte du modèle | Non | MASQUER |
| Classement aux monuments | Prestige | Texte du modèle | Non | MASQUER |
| Zone du PAG | Terrain | Texte du modèle | Non | GARDER |
| Viabilisation | Terrain | Texte du modèle | Non | GARDER |
| Vitrine | Commercial | Texte du modèle | Non | MASQUER |
| Longueur de vitrine (m) | Commercial | Texte du modèle | Non | MASQUER |
| Loyers en cours (€ par mois) | Commercial (investissement) | Texte du modèle | Non | GARDER |
| Rendement (%) | Commercial (investissement) | Texte du modèle | Non | GARDER |

### Location (seulement pour un bien en location)

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Charges locatives (€ par mois) | Charges payées par le locataire | Texte du modèle | Doublon de « Charges mensuelles (€) » (les deux s'affichent pour un appartement en location) | FUSIONNER avec « Charges mensuelles (€) » |
| Garantie locative (mois de loyer) | Dépôt de garantie | Texte du modèle | Non | GARDER |
| Disponible immédiatement | Case à cocher | Texte du modèle | Doublon de « Disponible à partir du » | FUSIONNER avec « Disponible à partir du » (date vide = immédiatement) |
| Disponible à partir du | Date de disponibilité | Texte du modèle | Voir ligne précédente | GARDER |

## Bloc 3 : « Descriptions »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Bouton « Traduire depuis le français » (Mistral) | Remplir EN et DE depuis le FR | Bouton, pas un champ | Doublon du bouton Claude ; le bouton Claude propose déjà Mistral en secours (« Traduire avec Mistral (gratuit) », `components/admin/ClaudeTranslateButton.tsx`) | FUSIONNER avec « Traduire maintenant avec Claude API » (un seul bouton) |
| Bouton « Traduire maintenant avec Claude API » | Même chose avec Claude, avec compteur de coût | Bouton, pas un champ | Voir ligne précédente | GARDER |
| Contrôle de rédaction | Signale les fautes et les formules interdites | Affichage, pas un champ | Non | GARDER (près du bouton « Enregistrer ») |
| Aperçu du résultat Google | Montre titre, adresse et description Google | Affichage, pas un champ | Non | MASQUER |
| Boutons « Régénérer depuis le modèle (FR / EN / DE) » | Remettre le texte du modèle | Boutons, pas des champs | Trois boutons pour la même action | MASQUER (un seul bouton suffit) |
| Titre (FR) | Titre affiché | Titre de la Fiche, Carte, Google (données structurées, nom du bien), texte alternatif des photos par défaut, partage | Doublon partiel du titre écrit par le modèle (le titre suit le modèle tant qu'il n'est pas modifié) | GARDER |
| Titre (EN) | Titre anglais | Fiche et Carte en anglais | Non | GARDER (dans une partie « Traductions ») |
| Titre (DE) | Titre allemand | Fiche et Carte en allemand | Non | GARDER (dans une partie « Traductions ») |
| Description complète (FR) | Texte principal | Fiche (onglet description), Google (données structurées, et description Google en dernier secours) | Doublon partiel du texte écrit par le modèle (même principe que le titre) | GARDER |
| Description complète (EN) | Texte anglais | Fiche en anglais | Non | GARDER (dans « Traductions ») |
| Description complète (DE) | Texte allemand | Fiche en allemand | Non | GARDER (dans « Traductions ») |
| Accroche courte (FR) | L'aide dit « affiché en aperçu sur les cartes » | Nulle part sur le site : aucun fichier public ne lit `short_description_fr` (ni Carte, ni Fiche, ni Google). Seuls l'admin et les traductions Claude et Mistral l'utilisent (ce qui coûte aussi des crédits) | Doublon de la description | RETIRER |
| Accroche courte (EN) | Idem | Nulle part sur le site | Idem | RETIRER |
| Accroche courte (DE) | Idem | Nulle part sur le site | Idem | RETIRER |
| Description Google (FR), facultative | Remplacer la description Google écrite automatiquement | Description Google de la Fiche (`lib/listing/listing-seo.ts`, ignorée si le bien est vendu ou loué) | Non (vide = description automatique) | MASQUER |
| Description Google (EN), facultative | Idem en anglais | Idem | Non | MASQUER |
| Description Google (DE), facultative | Idem en allemand | Idem | Non | MASQUER |

## Bloc 4 : « Surfaces »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Surface (référence) | Surface « générale » du bien | Fiche (affichée sous le nom « Surface totale »), Carte (« Surf. »), Google (données structurées : surface ; titre si pas de surface habitable), Recherche (surface minimum), description Google | Doublon de « Surface habitable » (résidentiel), « Surface utile » (commercial), « Surface du terrain » (terrain) et du nom de « Surface totale (immeuble) » | FUSIONNER avec la surface principale du type (habitable, utile ou terrain), cf. points à vérifier |
| Surface habitable | Surface habitable | Fiche (« Surface habitable »), Google (titre prioritaire), Recherche, Texte du modèle, description Google | Voir ligne précédente | GARDER |
| Surface utile | Biens construits, surtout commerciaux | Texte du modèle (surface commerciale) | Voir « Surface (référence) » | GARDER |
| Surface du terrain | Maison, villa, prestige, terrain | Fiche (« Terrain »), Texte du modèle | Non | GARDER |
| Terrasse | Surface de terrasse | Fiche (« Terrasse »), Recherche (« terrasse »), Texte du modèle | Non | GARDER |
| Balcon | Appartement | Texte du modèle | Non | GARDER |
| Jardin | Surface de jardin | Recherche (« jardin »), Texte du modèle | Proche de « Jardin paysager » | GARDER |
| Cuisine | Surface de la cuisine | Nulle part sur le site (`kitchen_surface` lu par aucun fichier hors admin) | Non | RETIRER |
| Surface totale (immeuble) | Surface d'un immeuble entier | Nulle part sur le site ; seulement rempli par l'ancien import Apimo (désactivé) | Doublon de nom : la Fiche appelle déjà « Surface totale » le champ « Surface (référence) » | RETIRER |

## Bloc 5 : « Pièces »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Chambres | Nombre de chambres | Fiche, Carte, adresse de la page, Google (titre, données structurées), Recherche (filtre chambres), Texte du modèle | Non | GARDER |
| Salles de bain | Nombre de salles de bain | Fiche, Carte (« SdB. »), Google (données structurées) | Non | GARDER |
| Douches | Nombre de douches | Nulle part sur le site | Proche de « Salles de bain » | RETIRER |
| WC | Nombre de WC | Nulle part sur le site | Non | RETIRER |
| Bureaux | Nombre de bureaux (commercial) | Nulle part sur le site (le mot « bureaux » n'apparaît que dans d'autres sens) | Non | RETIRER |
| Locaux de stockage | Nombre de locaux de stockage | Nulle part sur le site | Proche de « Cave privative » | RETIRER |
| Étage | Texte libre (« 3e étage ») | Texte du modèle (étage dans la description) | Proche de « Dernier étage » et « Niveaux de l'immeuble » | GARDER |

## Bloc 6 : « Équipements »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Buanderie | Case « Présente » | Nulle part sur le site ; seulement rempli par l'Import | Non | RETIRER |
| Dressing | Case « Présent » | Nulle part sur le site ; seulement rempli par l'Import | Non | RETIRER |
| Piscine | Case « Présente » | Recherche (« piscine »), Texte du modèle | Non | GARDER |
| Emplacements de stationnement | Nombre total de places | Fiche (« Parkings »), Recherche (« garage »), Texte du modèle (seulement si intérieurs et extérieurs sont vides) | Doublon de « Emplacements intérieurs », « Emplacements extérieurs », « Places de garage » | FUSIONNER avec « Emplacements intérieurs » + « Emplacements extérieurs » (total calculé) |

## Bloc 7 : « Passeport énergétique »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Classe d'efficacité énergétique | Classe A+ à I | Fiche (« Classe énergie »), Carte (« DPE »), liste admin | Non | GARDER |
| Classe d'isolation thermique | Classe A+ à I | Nulle part sur le site ; seulement rempli par l'Import et Apimo | Non (deuxième classe du passeport) | MASQUER (cf. points à vérifier) |
| Classe GES (émissions) | Texte libre | Nulle part sur le site ; seulement rempli par Apimo | Non | RETIRER (cf. points à vérifier) |
| Année de construction | Année | Fiche (« Année »), Texte du modèle | Doublon de la colonne cachée `year_built` (sans champ à l'écran, ancienne donnée Apimo, utilisée seulement si l'année est vide) | GARDER |

## Bloc 8 : « Prix »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Prix (€) | Prix de vente ou loyer | Fiche, Carte, Google (données structurées, description), Recherche (budget), Biens similaires, Texte du modèle | Non | GARDER |
| Affichage : Prix sur demande | Cacher le prix | Fiche, Carte (`components/property/PropertyPrice.tsx`), Google, Texte du modèle | Non | GARDER |
| Prix minimum (fourchette) | Annoncer une fourchette | Nulle part pour les biens : seuls les biens off-market ont une fourchette, avec leurs propres colonnes (`lib/data.ts`, partie off-market) | Non | RETIRER |
| Prix maximum (fourchette) | Idem | Nulle part pour les biens | Non | RETIRER |

## Bloc 9 : « Prestations et usage »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Prestations | Texte libre | Pas affiché sur la Fiche ; lu seulement par la Recherche (mots jardin, terrasse, garage, ascenseur, piscine) | Doublon de « Atouts » (Bloc 2), qui lui est bien affiché | FUSIONNER avec « Atouts » (la recherche devra alors lire les Atouts) |
| Usage actuel | Commercial, terrain | Texte du modèle, en français seulement, si « Affectation » est vide | Doublon de « Affectation » (Bloc 2) | FUSIONNER avec « Affectation » |
| Usage potentiel | Commercial, terrain, prestige | Nulle part sur le site | Non | RETIRER |

## Bloc 10 : « Statut »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Statut | Brouillon, Publié, Vendu, Retiré | Seul « Publié » montre le bien sur le site (`app/admin/properties/actions.ts` : publié ou non). Les trois autres le cachent | Doublon : le statut « Vendu » cache le bien alors que le « Bandeau » « Vendu » (Bloc 11) le garde visible avec un ruban ; et la liste des biens a aussi un interrupteur de publication (`components/admin/PropertiesTable.tsx`) | GARDER (cf. points à vérifier) |

## Bloc 11 : « Mise en avant »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Étiquette commerciale | Exclusivité, Nouveau, Nouveau prix... | Carte (coin de la photo), Fiche (au-dessus du titre), Biens similaires (en secours du type) ; cachée quand un bandeau est posé | Doublon : « Exclusivité » est déjà mis d'office par le « Type de mandat » exclusif | GARDER |
| Taille | S, M, L de l'étiquette | Carte (`lib/badge-style.ts`) | Non | MASQUER |
| Position | Coin de l'étiquette | Carte | Non | MASQUER |
| Bandeau | Sous compromis, Vendu, Loué | Carte et galerie de la Fiche (`components/property/StatusBanner.tsx`), prix remplacé par « Vendu » ou « Loué », description Google sans prix, chatbot (`lib/elena/respond.ts`) | Doublon du « Statut » « Vendu » (Bloc 10) | GARDER |
| Position du bandeau | Droit ou en diagonale | Carte et Fiche (`lib/property-banner.ts`) | Non | MASQUER |
| Couleur du bandeau | Sapin, cuivre, crème, blanc | Carte et Fiche (`lib/property-banner.ts`) | Non | MASQUER |

## Bloc 12 : « Vidéo de présentation »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Adresse de la vidéo | Lien MP4, WebM ou Vimeo | Fiche (`components/property/PropertyVideo.tsx`) | Non (mais a son propre bouton « Enregistrer ») | GARDER |

## Bloc 13 : « Photos »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Galerie (« Ajouter des photos », « Prendre une photo », « ★ Principale », « Améliorer », « Tout améliorer », suppression, ordre) | Gérer les photos, enregistrées automatiquement | Galerie de la Fiche, photo de la Carte et de l'accueil, Google (données structurées, 12 photos), image de partage | Non | GARDER |
| Lien « Voir la fiche en ligne » | Ouvrir la fiche publique | Lien, pas un champ | Doublon de « Voir la fiche ↗ » (Bloc 15) | RETIRER un des deux liens (non compté) |

## Bloc 14 : « Textes alternatifs des photos »

Pour chaque photo (`components/admin/PhotoAltEditor.tsx`), avec son propre bouton « Enregistrer les textes alternatifs ».

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| Pièce montrée | Relier la photo à une pièce du Bloc 2 | Texte alternatif des photos de la Fiche (`lib/listing/listing-seo.ts`, fonction des textes de photos) | Non | GARDER (à placer sous chaque photo de la galerie) |
| Texte alternatif (FR) | Texte lu par Google et les lecteurs d'écran | Fiche (galerie) ; vide = texte construit automatiquement | Non | MASQUER |
| Texte alternatif (EN) | Idem | Fiche en anglais | Non | MASQUER |
| Texte alternatif (DE) | Idem | Fiche en allemand | Non | MASQUER |

## Bloc 15 : « Aperçu public »

| Champ à l'écran | À quoi il sert | Où il est utilisé | Doublon | Proposition |
|---|---|---|---|---|
| « Voir la fiche ↗ » | Ouvrir la fiche publique | Lien, pas un champ | Doublon de « Voir la fiche en ligne » | GARDER (en haut de page) |
| « Mettre à jour la fiche publique » | Forcer l'affichage immédiat des changements | Bouton, pas un champ | Non | GARDER (en haut de page) |

## Nouvel ordre proposé

Le formulaire regroupé en six parties, avec un seul bouton « Enregistrer » en bas (les photos peuvent garder l'enregistrement automatique). Le principe actuel reste : seuls les champs utiles au type choisi s'affichent.

**1. L'essentiel**
Type (une seule liste, groupée par famille), Type de mandat, Pays, Ville, Prix (€), Prix sur demande, Statut, Bandeau.

**2. Le bien en chiffres**
Surface habitable (ou Surface utile, ou Surface du terrain selon le type), Terrasse, Balcon, Jardin, Chambres, Salles de bain, Étage, Emplacements intérieurs, Emplacements extérieurs, Piscine, Cave privative, Ascenseur, Classe d'efficacité énergétique, Année de construction, Année de rénovation, Charges mensuelles (€), Zone du PAG, Viabilisation, Loyers en cours (€ par mois), Rendement (%), et pour la location : Garantie locative (mois de loyer), Disponible à partir du.

**3. Textes et traductions**
Qualificatif, Phrase d'ambiance, Atouts, Histoire du lieu, Vue, Affectation, Niveaux et pièces (Niveau, Pièce), Titre (FR), Description complète (FR), Contrôle de rédaction.
Puis une sous-partie « Traductions » avec un seul bouton de traduction : Titre (EN), Titre (DE), Description complète (EN), Description complète (DE).

**4. Photos et vidéo**
Galerie de photos (avec « Pièce montrée » sous chaque photo), Adresse de la vidéo.

**5. Mise en avant**
Étiquette commerciale, avec l'aperçu de la carte du bien.

**6. Options avancées** (fermé par défaut)
Page de ville, Formule de situation, Formule libre, Description Google (FR, EN, DE) avec l'aperçu du résultat Google, Classe d'isolation thermique, Taille et Position de l'étiquette, Position et Couleur du bandeau, Textes alternatifs (FR, EN, DE), Niveaux de l'immeuble, Dernier étage, Ascenseur privatif, Type de construction, Orientation, Jardin paysager, Domotique, Dépendances, Classement aux monuments, Vitrine, Longueur de vitrine (m), bouton « Régénérer depuis le modèle ».

Champs fusionnés (8) : Famille dans Type ; Surface (référence) dans la surface principale ; Emplacements de stationnement dans intérieurs + extérieurs ; Places de garage dans Emplacements intérieurs ; Charges locatives dans Charges mensuelles ; Disponible immédiatement dans Disponible à partir du ; Prestations dans Atouts ; Usage actuel dans Affectation.

Champs retirés (15) : Accroche courte (FR, EN, DE), Cuisine, Surface totale (immeuble), Douches, WC, Bureaux, Locaux de stockage, Buanderie, Dressing, Classe GES (émissions), Prix minimum (fourchette), Prix maximum (fourchette), Usage potentiel.

## Points à vérifier par Julien

1. **Accroche courte** : l'aide de l'admin dit qu'elle s'affiche sur les cartes, mais aucun fichier du site ne la lit (recherche sur `short_description` : seulement l'admin et l'off-market). Julien l'utilise-t-il ailleurs (réseaux sociaux, copier-coller) ? Sinon, la retirer économise aussi des crédits de traduction.
2. **Surface (référence) et Surface habitable** : la Carte et les données Google lisent seulement « Surface (référence) », la Fiche l'appelle « Surface totale », et le titre Google préfère « Surface habitable ». Si seule la surface habitable est remplie, la Carte n'affiche pas de surface. La fusion demande de choisir quelle surface montrer par type ; à valider avant tout changement.
3. **Classe d'isolation thermique et Classe GES** : aucune n'est affichée sur le site aujourd'hui. Une éventuelle obligation légale d'afficher ces classes dans une annonce au Luxembourg n'a pas pu être vérifiée (pas d'accès internet pour ce travail). Si l'isolation doit être affichée, il faudra plutôt l'ajouter à la Fiche que la masquer.
4. **Statut « Vendu » et Bandeau « Vendu »** : deux façons différentes de dire « vendu » (l'une cache le bien, l'autre le garde visible avec un ruban), plus l'interrupteur de publication de la liste des biens. Julien doit dire laquelle il utilise vraiment ; on pourrait ensuite réduire le statut à « Brouillon » et « Publié ».
5. **Mandat exclusif et étiquette « Exclusivité »** : le mandat exclusif met déjà l'étiquette. Faut-il garder « Exclusivité » dans la liste des étiquettes ?
6. **Emplacements et garage** : le texte du modèle écrit différemment « places de garage » et « emplacements intérieurs ». Fusionner change un peu la phrase produite ; à confirmer.
7. **Charges mensuelles et Charges locatives** : pour un appartement en location, les deux champs s'affichent. Est-ce vraiment deux montants différents pour Julien ?
8. **Transaction** : elle ne se choisit qu'à la création et ne peut plus être changée ensuite sur la page de modification. À garder en tête si on la veut dans « L'essentiel ».
9. **Référence interne et État du bien** (page de création) : enregistrés mais lus nulle part et non modifiables ensuite. À retirer, ou à rendre utiles (par exemple afficher la référence dans la liste des biens).
10. **Données du modèle** : elles servent toutes au texte automatique, mais chaque phrase n'apparaît que si le modèle de la langue (Paramètres, Modèles d'annonces, stockés dans la table `listing_templates`) contient la bonne case. Le contenu actuel de ces modèles en base n'a pas été vérifié.
11. **Champs retirés remplis par l'import** (Buanderie, Dressing, et Classe d'isolation thermique masquée) : l'« Importer une annonce » les remplit encore. Il faudra décider s'il continue de le faire.
