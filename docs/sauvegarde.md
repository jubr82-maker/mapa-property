# Sauvegarde quotidienne de la base

Projet Supabase en formule gratuite : aucune sauvegarde automatique chez
Supabase. Le site exporte donc lui-même la base chaque nuit et en garde une
copie chiffrée hors de Supabase, dans Cloudflare R2.

## Ce qui est sauvegardé

- Toutes les tables du schéma `public` : structure (colonnes, types, valeurs
  par défaut, clés primaires, contraintes, index, règles d'accès, séquences)
  et toutes les lignes, lues avec la clé de service.
- Format : JSON compressé (gzip) puis chiffré en AES-256-GCM avec la clé
  `BACKUP_ENCRYPTION_KEY`. Un fichier modifié ou une mauvaise clé fait
  échouer le déchiffrement.
- Destination : bucket R2 privé des sauvegardes (`R2_BACKUP_BUCKET`, jamais
  public), sous le préfixe `backups/nightly/`. Chaque sauvegarde a deux
  fichiers : `<date>.json.gz.enc` (la sauvegarde) et `<date>.counts.json`
  (nombres de lignes par table, sans aucun contenu).
- Conservation : les 30 sauvegardes les plus récentes ; la tâche supprime
  elle-même les plus anciennes.

## Ce qui n'est PAS sauvegardé

- Les photos et documents des stockages Supabase (photos des biens,
  couvertures du blog, documents, photos off-market) et de R2 (vidéos,
  médias).
- Les comptes de connexion (schéma `auth`), les fonctions SQL, les
  déclencheurs et les vues : ils se recréent depuis les fichiers SQL du
  dossier `supabase/` du dépôt.
- Solution la plus simple pour les fichiers : une fois par mois, depuis le
  Mac, copier les buckets avec rclone (`rclone sync`) vers un disque externe
  ou un second bucket R2. Les buckets R2 sont déjà hors de Supabase.

## Déroulement

1. Chaque nuit à 01:00 UTC (03:00 à Luxembourg en heure d'été, 02:00 en
   heure d'hiver), Vercel appelle `/api/cron/backup` (secret `CRON_SECRET`).
2. L'export s'arrête de lui-même après 240 secondes (limite des fonctions de
   la formule Hobby : 300 secondes), avec une cause en clair.
3. Le résultat est écrit dans `cron_runs` (tâche `backup`) et visible dans
   l'admin, Santé du site.
4. Chaque matin, la tâche quotidienne (05:00 UTC) envoie un compte rendu à
   site@mapagroup.org : date, réussite ou échec, taille, lignes par table,
   évolution depuis la veille, nombre de sauvegardes conservées. Aucune
   donnée personnelle, aucune pièce jointe. En cas d'échec, l'objet commence
   par « Échec de la sauvegarde » et la cause est donnée.

## Mise en place (une seule fois)

1. Exécuter dans Supabase le fichier
   `supabase/manual/execution/22_sauvegarde_catalogue.sql` (fonction en
   lecture seule qui décrit la structure du schéma `public`).
2. Générer la clé dans Terminal.app :

   ```
   openssl rand -base64 32
   ```

3. Copier la clé obtenue dans le gestionnaire de mots de passe (entrée
   « MAPA, clé des sauvegardes »). Sans elle, aucune sauvegarde ne peut être
   relue.
4. Dans Vercel, projet mapa-property-nextjs, Settings, Environment
   Variables : ajouter `BACKUP_ENCRYPTION_KEY` avec cette valeur, pour
   Production. Vérifier que `R2_ACCOUNT_ID`, `R2_BACKUP_ACCESS_KEY_ID`,
   `R2_BACKUP_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET` et `CRON_SECRET` y sont.
5. Pour restaurer depuis le Mac, ajouter aussi `BACKUP_ENCRYPTION_KEY` dans
   `.env.local` (jamais dans git), puis la retirer après usage si souhaité.

Ne jamais écrire la clé dans un fichier du dépôt, un e-mail ou un message.

## Restaurer une sauvegarde

La restauration se fait dans une base VIDE (par exemple un nouveau projet
Supabase gratuit), jamais dans la base de production sans confirmation
tapée.

1. Installer psql une fois : `brew install libpq`.
2. Vérifier `.env.local` : `BACKUP_ENCRYPTION_KEY` et les variables
   `R2_BACKUP_*`.
3. Créer la base cible et noter son adresse de connexion
   (`postgresql://...`). Y exécuter d'abord, si besoin, les fichiers SQL des
   fonctions utilisées par les règles d'accès (par exemple
   `is_mapa_admin`).
4. Produire le SQL sans rien toucher, pour vérifier :

   ```
   node --import tsx scripts/restore-backup.mjs --latest --sql-out restauration.sql
   ```

5. Restaurer dans la base cible :

   ```
   node --import tsx scripts/restore-backup.mjs --latest --target "postgresql://..."
   ```

   Autres choix : `--key backups/nightly/<date>.json.gz.enc` ou
   `--file <fichier local>`.
6. Si la cible n'est pas vide, le script demande de taper
   `RESTAURER DANS UNE BASE NON VIDE`. Si la cible est la base de
   production, il demande de taper `RESTAURER EN PRODUCTION
   dutfkblygfvhhwpzxmfz`. Toute autre réponse annule.
7. Supprimer `restauration.sql` après usage : il contient les données en
   clair.

## Sauvegarde manuelle (existante)

`pnpm backup` (scripts/backup-supabase-to-r2.mjs) reste disponible depuis le
Mac : `pg_dump` complet en SQL, compressé, non chiffré, déposé sous
`backups/` et gardé 30 jours.
