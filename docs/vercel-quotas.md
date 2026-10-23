# Quotas Vercel (offre Hobby)

Mis en place le 23/10/2026 (tag `sauvegarde-avant-optim-vercel-2026-10-23` pour l'état précédent). But : rester durablement sous chaque limite gratuite.

## Ce qui consomme

- **Écriture ISR** : chaque régénération d'une page écrit son HTML, son RSC et ses segments. Elle a lieu quand le délai de secours expire (à la visite suivante) ou après un `revalidatePath` / `revalidateTag`.
- **Transfert depuis l'origine** : chaque page servie par une fonction ou régénérée. Le poids de la page compte directement.
- **Transformations d'images** : une par image, largeur, format et qualité, à la première demande, puis en cache 31 jours.
- **CPU actif** : rendu des pages dynamiques et des régénérations.

## Règles à respecter

1. **Pages publiques : secours de 30 jours** (`export const revalidate = 2592000`, et la même valeur dans les `unstable_cache`). Jamais de minuterie courte (1 h, 1 jour). Le contenu se rafraîchit à l'enregistrement dans l'admin.
2. **Revalidation ciblée seulement** (`lib/revalidate-property.ts`) :
   - pour un bien : sa fiche dans les 3 langues, sa ville (ancienne et nouvelle, étiquette `city-properties:<ville>`), la liste des biens, le sitemap ;
   - l'accueil seulement si le bien est mis en avant ;
   - les « biens similaires » seulement sur les fiches qui le montrent ;
   - FAQ, recherches et blog : seulement les pages concernées.
3. **Ne jamais réintroduire** :
   - `revalidatePath("/", "layout")` ni `revalidatePath("/[locale]", "layout")` ;
   - le motif de route `revalidatePath("/[locale]/villes/[ville]", "page")`, qui revalide toutes les villes à la fois ;
   - une minuterie courte ;
   - `experimental.inlineCss`, qui double le CSS dans chaque page et chaque fichier RSC.
4. **Aucune revalidation** pour les actions sans contenu public : lead, estimation, liste d'attente, suivi, Santé, connexion admin.
5. **Adresses inconnues, paramètres et filtres : aucune entrée ISR.** Les identifiants inconnus passent par la 404 dynamique (`proxy.ts`) et `mandats/[type]` est fermé (`dynamicParams = false`). `robots.txt` bloque `/admin`, `/api`, les paramètres de suivi (utm, gclid, fbclid, msclkid) et les filtres de `/biens`.
6. **Traductions** : la mise en page n'envoie au navigateur que `chatbot`, `contact`, `cookies`, `nav` et `rgpd`. Chaque page ajoute les siennes avec `withPageMessages` (`components/i18n/withPageMessages.tsx`). Le test `scripts/seo/test-client-messages.mts` vérifie qu'il n'en manque aucune.
7. **Images** :
   - format webp seul, qualité 75, cache de 31 jours ;
   - largeurs `deviceSizes` [640, 828, 1080, 1200, 1920] et `imageSizes` [64, 128, 256, 384] ;
   - un `sizes` juste sur chaque `<Image>` responsive ;
   - logos, icônes et petites images décoratives en `unoptimized`.
   - Jamais d'image non dimensionnée.
8. **Aucun appel périodique** :
   - pas de polling ni de `setInterval` réseau ;
   - deux tâches par jour au plus (`vercel.json`), PageSpeed une fois par jour au plus ;
   - le bouton « Mesurer maintenant » reste manuel.
9. **Fichiers statiques** : `Cache-Control: public, max-age=31536000, immutable`.

## Consommation estimée après correction

Mesures sur le build (318 pages publiques) :

- **Pages ISR** : 238 pages à 1 h et 6 à 1 jour avant, 244 pages à 30 jours après. 80 pages restent statiques.
- **Poids moyen d'une page** (HTML, RSC et segments) : 1 093 Ko avant, 300 Ko après (moins 73 %). Le CSS intégré à fr.html passe de 114 Ko à 0.
- **Variantes par image** : 13 largeurs en 2 formats, soit 26, avant ; 9 largeurs au plus en webp seul après.

Estimations par jour, à fréquentation égale. « Avant » correspond aux 30 derniers jours divisés par 30. Hypothèse : ISR facturé par tranche de 8 Ko.

| Ressource | Avant | Après (estimé) | Cible |
|---|---|---|---|
| Écritures ISR | 11 200 | 800 à 1 300 | moins de 1 500 |
| Transfert depuis l'origine | 326 Mo | environ 90 Mo | moins de 100 Mo |
| Transformations d'images | 123 | 45 au plus | moins de 60 |
| Lectures ISR | 18 600 | environ 5 000 | moins de 20 000 |
| CPU actif | 4,3 min | environ 1,5 min | moins de 4 min |
| Écritures du cache d'images | 930 | environ 330 | limite de 3 300 |
| Requêtes CDN | 6 600 | environ 6 600 | limite de 33 000 |
| Appels de fonctions | 4 800 | environ 4 000 | limite de 33 000 |

**Écritures ISR.** Le délai de secours régénère au plus 244 pages en 30 jours, soit environ 300 unités par jour. Chaque modification d'un bien ajoute environ 480 unités : une quinzaine de pages, et seulement celles qui sont visitées ensuite. La cible tient jusqu'à 2 modifications de bien par jour en moyenne. Un jour de saisie importante la dépasse ponctuellement, sans risque sur la moyenne du mois.

**À surveiller dans Vercel**, rubrique Usage, une semaine après la mise en ligne : les écritures ISR et le transfert depuis l'origine, qui ont le moins de marge.
