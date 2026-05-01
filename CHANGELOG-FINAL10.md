# MAPA Property — V28 FINAL10

**Date :** 22 avril 2026
**Baseline :** V28 FINAL9
**Cache-buster :** `?v=final10`

## Corrections suite aux retours utilisateur

### 1. Vidéo hero mise à jour
- Source changée de `assets/hero_video.mp4` (local) vers `https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/Videos/mapa_showcase_new.mp4` (Supabase)
- Appliqué sur `<link rel="preload">` ET `<source>` du `<video>`
- Format identique (mp4 autoplay muted loop)

### 2. Carte Luxembourg refaite
- Ancien tracé "patate" remplacé par une silhouette géographique plus précise du Grand-Duché
- Orientation nord-sud réaliste (largeur ~82km, hauteur ~82km)
- Luxembourg-Ville positionnée correctement au centre-sud, avec label navy emphatique et mention des 6 quartiers (Belair, Kirchberg, Limpertsberg, Cloche d'Or, Gasperich, Merl)
- 24 pins répartis géographiquement : Nord (Diekirch, Mersch), Nord-ouest (Hobscheid, Saeul, Kaerjeng, Koerich, Steinfort), Ceinture ouest (Capellen, Mamer, Bertrange, Strassen, Bridel, Steinsel), Sud (Hesperange, Bettembourg, Dudelange, Mondorf)
- `preserveAspectRatio="xMidYMid meet"` pour responsive propre

### 3. Carte International (vérif)
- Aucune carte monde dans la sous-page Intl (déjà épuré, juste intro + grid 28 villes)

### 4. Fix chevauchement footer
- `.mk-cta-wrap` reçoit `margin-bottom:clamp(48px,6vw,80px)` pour aérer avec le footer navy
- Séparateur visuel fin copper (`::after` 60px × 1px) placé -24px sous le CTA pour marquer la transition

### 5. Cards communes/villes cliquables (event delegation)
- Les 52 cards `[data-city]` des sous-pages Lux/Intl → cliquables (clic = filtre recherche)
- Les 32 spans `.szo-grid` dans m-marches (Marchés actifs) → aussi cliquables, avec extraction intelligente du nom de ville depuis des formats type "France — Côte d'Azur (Cannes, Nice, Saint-Tropez)"
- Cursor `pointer` ajouté sur `.szo-grid span` pour signaler la clicabilité
- Pas d'`onclick` inline (1 event listener global, plus performant et maintenable)

## Test local + mobile

### Sur ton Mac
```bash
cd ~/Downloads
unzip -o mapa-v28-FINAL10.zip
cd mapa-v28-FINAL10
python3 -m http.server 8080
```
→ http://localhost:8080 (Cmd+Shift+R pour forcer le cache)

### Sur ton téléphone (même WiFi que ton Mac)
```bash
# Dans le terminal du Mac, à la place de la commande précédente :
python3 -m http.server 8080 --bind 0.0.0.0
```
Puis trouve l'IP de ton Mac :
- Menu Pomme  → Préférences Système → Wi-Fi → "Détails..."
- Note l'adresse IP (ex. `192.168.1.42`)

Sur ton iPhone (même réseau WiFi), dans Safari, tape :
```
http://192.168.1.42:8080
```
(remplace par TON IP réelle)

Tu verras le site comme s'il était déployé.
Pour arrêter le serveur : Ctrl+C dans le Terminal du Mac.
