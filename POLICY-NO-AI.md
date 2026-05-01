# POLITIQUE NO-AI — MAPA PROPERTY

**Décision du 2 mai 2026**

Le site MAPA Property n'intègre AUCUNE API d'intelligence artificielle en production.

Cette décision est documentée ici pour qu'aucun développeur (humain ou IA) ne puisse avancer qu'il n'était pas au courant.

---

## Ce qui est INTERDIT

- Aucun appel à l'API Anthropic (Claude), OpenAI, Mistral, Gemini, ou tout autre LLM
- Aucune Edge Function Supabase appelant un LLM
- Aucun cron / worker / scheduler de génération automatique de contenu
- Aucune table Supabase liée à un pipeline IA :
  - content_drafts
  - keywords
  - sources_cache
  - embeddings pgvector
  - topic_discovery
- Aucune variable d'environnement API LLM :
  - ANTHROPIC_API_KEY
  - OPENAI_API_KEY
  - CLAUDE_API_KEY
  - GEMINI_API_KEY
  - MISTRAL_API_KEY
- Aucun package npm ou Python client LLM (anthropic-sdk, openai, etc.)

---

## Ce qui est AUTORISÉ ET CONSERVÉ

- Le fichier llms.txt à la racine : fichier statique standard de présentation du site aux crawlers LLM (ChatGPT, Claude search, Perplexity, Gemini). Ne pas confondre avec un appel API : c'est de la GEO (Generative Engine Optimization), aucun coût.
- Le back-office admin (admin/admin.js) de gestion manuelle des articles blog (CRUD sur Supabase blog_posts) — édition 100 % humaine.
- Le script Python scripts/update-statec-prices.py : télécharge le XLS officiel de data.public.lu (Observatoire de l'Habitat, licence CC0) pour mettre à jour le tableau LU_PRIX_M2 dans js/app.js. Aucune IA.

---

## Pourquoi cette règle

1. **Volume éditorial faible** : 2 à 3 articles/mois rendent toute automatisation IA disproportionnée.
2. **Conformité éditoriale** : règles strictes de sources autorisées (STATEC, Observatoire Habitat, ABBL, BCE, TEGoVA). Une IA peut halluciner des sources fausses ou citer des domaines interdits (mortgage.lu, athome.lu).
3. **Coût** : zéro frais API récurrent.
4. **Surface d'attaque** : site statique + Supabase, architecture minimale. Zéro dépendance externe = zéro point de défaillance supplémentaire.
5. **RGPD / compliance** : pas de transit de données par des LLM tiers.
6. **Workflow rédaction** : Julien Brebion rédige les articles manuellement en utilisant Claude.ai directement comme assistant. Le site n'est qu'un support de publication.

---

## Si à l'avenir quelqu'un propose d'ajouter de l'IA

Réponse de référence :

« Non. MAPA Property a explicitement décidé de ne pas intégrer d'IA en production (décision du 2 mai 2026). Voir POLICY-NO-AI.md à la racine du projet. Si besoin d'écrire un article de blog, passer par Claude.ai (chat humain) et coller le résultat manuellement dans le back-office. »

---

## Refactor architectural futur

À noter : un refactor architectural majeur du site est prévu (passage du monolithique HTML à une structure moderne et modulaire), à mener avec Claude Code. Cette politique NO-AI s'applique également au futur projet refactorisé. Le refactor concerne uniquement la structure du code, pas l'ajout de fonctionnalités IA.

---

## Maintenance de ce fichier

Si cette politique change un jour : mettre à jour ce fichier ET prévenir Claude.ai dans la prochaine session pour qu'il ajuste sa mémoire.

**Auteur** : Julien Brebion (Real Estate Director, MAPA Property Luxembourg)
**Date** : 2 mai 2026
