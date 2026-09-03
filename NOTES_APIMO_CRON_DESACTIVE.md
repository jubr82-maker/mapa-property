# Cron apimo-sync désactivé (2026-09-03)

Le cron `/api/cron/apimo-sync` a été retiré de `vercel.json` le 2026-09-03.

**Raison** : pas d'accès à l'API Apimo prévu. Le risque était qu'une exécution
future du cron (si les clés `APIMO_PROVIDER_ID`/`APIMO_TOKEN`/`APIMO_AGENCY_ID`
étaient un jour renseignées par erreur) réécrase des modifications faites
manuellement dans le back-office (prix, infos biens) avec d'anciennes données
Apimo.

**Ce qui est conservé** : tout le code reste en place, en sommeil —
`app/api/cron/apimo-sync/route.ts`, `lib/apimo/client.ts`, `lib/apimo/mapper.ts`,
`lib/apimo/push-lead.ts`. Rien n'a été supprimé.

**Pour réactiver un jour** :
1. Ajouter les clés `APIMO_PROVIDER_ID`, `APIMO_TOKEN`, `APIMO_AGENCY_ID` (et
   `APIMO_API_BASE` si besoin) dans les variables d'environnement Vercel.
2. Remettre l'entrée cron dans `vercel.json` :
   ```json
   { "path": "/api/cron/apimo-sync", "schedule": "0 6 * * *" }
   ```
3. Déployer.

Tant que ces deux conditions ne sont pas réunies, la route reste également
protégée par ses propres garde-fous internes (`isApimoConfigured()` et
`SUPABASE_SERVICE_ROLE_KEY` absent → no-op sans contact avec la base), mais
l'absence de l'entrée cron est la protection principale : plus personne ne
déclenche cette route automatiquement.
