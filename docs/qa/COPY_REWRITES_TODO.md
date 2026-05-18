# Copy à réécrire — TODO (avec Julien)

## Mot fondateur (NAV7)

Le bloc « mot fondateur » de la home (composant `QuoteBand`) a été
**retiré** (Julien : « ne lui ressemble pas »).

- Texte retiré : « Travailler ensemble est important. Protéger les
  intérêts de chacun par un cadre clair l'est davantage. » —
  *Julien, Real Estate Director*
- Composant `components/home/QuoteBand.tsx` conservé dans la codebase
  (plus monté sur la home) ; clés i18n `quote_band.*` orphelines
  (non affichées) — à réécrire ou supprimer après arbitrage.
- **À faire : réécrire le mot fondateur AVEC Julien**, puis remonter
  un bloc (ou supprimer définitivement QuoteBand + clés i18n).

## « Julien » seul → mention agence / CTA (NAV7)

Règle appliquée : « Julien » **seul** remplacé par « MAPA Property »
(mention agence) ou une formulation CTA « contactez-nous » / « us ».
**Exceptions conservées** : « Julien Brebion » complet (page
Qui-sommes-nous, success NDA, aria-labels contact-reveal, signature
documents), identifiants de code (`callJulien`), commentaires.

Remplacements effectués (fr/en/de) :
- `mandate_common.form_subtitle`, `*.form_subtitle` (l.346) :
  « Julien vous recontacte… » → « MAPA Property vous recontacte… »
- `form.success_text` : « Julien vous recontactera… » →
  « MAPA Property vous recontactera… »
- `contact_cta.description`, `contact_page.intro` :
  « …traitée personnellement par Julien » → « …par MAPA Property »
- `arcova.waitlist_text` : « contactez Julien directement » →
  « contactez-nous directement »
- `ChatbotWidget` (erreurs fr/en/de) : « contact Julien » →
  « contactez-nous / contact us / kontaktieren Sie uns »
- Fiche off-market (carte contact NDA) : « Julien » →
  « Julien Brebion » (nom complet — exception autorisée, sous photo)

Reste éventuel : toute nouvelle occurrence « Julien » seul introduite
ultérieurement doit suivre la même règle.
