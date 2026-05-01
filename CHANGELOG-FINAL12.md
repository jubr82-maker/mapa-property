# MAPA Property V28 FINAL12 — Changelog

**Date :** 22 avril 2026
**Cache-buster :** `?v=final12`

## 15 fixes demandés

### Contenu & UX
1. **YouTube retiré** des canaux de diffusion (remplacé par "Google" seul) — FR/EN/DE
2. **Pack Média → Pack Vidéo** : renommage + réécriture complète pour ne pas copier Horus mot pour mot
3. **Durée mandats : 1 mois → 2 mois** tacitement reconductibles (FR/EN/DE, 4 mandats)
4. **Orphelin "exclusif" À Propos** : phrase entièrement réécrite
   - Avant : "...du plus classique aux actifs les plus exclusifs."
   - Après : "...du plus classique au plus exclusif, avec une attention particulière aux actifs de prestige."
5. **Qui sommes-nous** : retrait de "(LBR: B241974 — Autorisation d'établissement: N°10108681)"
6. **ARCOVA encart bleu** : polices agrandies et rendu plus net
   - Eyebrow : 10px → 12.5px
   - Titre ARCOVA : 22px → 30px
   - Description : 16px → 19px
   - `text-rendering:geometricPrecision` + `-webkit-font-smoothing:auto`
7. **Mandat de recherche** — texte élargi : "Nous activons à la fois les biens publiés sur le marché (qu'il s'agit de négocier au mieux) et nos réseaux off-market"
8. **Estimation rapide** — sous-titre CSS agrandi (15px → 16.5px, max-width 680 → 780px + text-wrap pretty)
9. **Estimation certifiée** : "plusieurs jours" → "plusieurs heures"
10. **Assistant MAPA** : commissions correctes
    - "1 à 5% + TVA 17% pour les mandats classiques"
    - "jusqu'à 5% + TVA 17% pour les Trophy Assets/Off-Market (selon complexité)"
11. **Marchés actifs** : clauses Lux/Intl réécrites
    - "Notre couverture n'est pas restrictive"
    - "toute commune/ville/région/pays selon disponibilité de partenaires qualifiés et de confiance"

### UX techniques critiques
12. **Scroll-top renforcé** : chaque modale (overlay ET page) déclenche un scroll multi-niveaux (body + html + modal + .mpage + .mb + .mh) avec `requestAnimationFrame` double + `setTimeout` à 50ms et 200ms
13. **Clic extérieur ne ferme plus les modales** : les 26 occurrences de `onclick="if(event.target===this)closeM(...)"` ont été retirées. Seul le bouton ✕ ferme désormais la modale.

### Design
14. **Logo header 1.5× plus grand** : 44px → 66px (desktop), 42→63 (tablet), 38→57 (mobile)
    - Header height : 82→96px (desktop), 74→86 (tablet), 68→78 (mobile)
15. **"LUXEMBOURG" sous le logo retiré** (`.hl-txt{display:none}`)

## Ouvert pour FINAL13

- **Captcha** : Pas de captcha actuellement. Reco : Cloudflare Turnstile (gratuit, RGPD-friendly). Tu crées la clé sur https://dash.cloudflare.com/?to=/:account/turnstile, je l'intègre en 30 minutes.

## Tests

```bash
cd ~/Downloads && unzip -o mapa-v28-FINAL12.zip
cd mapa-v28-FINAL12 && python3 -m http.server 8080 --bind 0.0.0.0
```

Console F12 doit afficher : **V28 FINAL12 — fixes massifs (logo+orphelin+clic+pack vidéo+mandats 2mois+recherche+assistant+arcova)**

### Tests prioritaires
1. Logo en-tête visiblement plus grand, plus de "LUXEMBOURG" dessous
2. À Propos : "...au plus exclusif, avec une attention particulière aux actifs de prestige." (pas d'orphelin)
3. Cliquer au milieu (en dehors d'un bouton) dans une modale → ELLE NE SE FERME PLUS
4. Cliquer sur un mandat puis fermer → réouvrir : on arrive bien en haut de page
5. Mandat Autonome → bandeau commission "1% + TVA" / durée "2 mois"
6. ARCOVA encart : polices clairement lisibles
7. Assistant MAPA → demander "je veux vendre" → réponse mentionne "1 à 5% + TVA 17%"
