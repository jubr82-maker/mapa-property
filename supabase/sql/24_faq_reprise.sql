-- =====================================================================
-- 24 QUESTIONS FREQUENTES : REPRISE DE L'EXISTANT
-- MAPA Property, prepare le 2026-10-16. A executer APRES 23_faq.sql.
--
-- 1. Questions ecrites en dur dans le site (fichiers de traduction,
--    intent_pages), reprises MOT POUR MOT en FR, EN et DE, publiees :
--    agence (5), vendre (4), acheter (4), louer (4), mandat-recherche (4).
--    Le site affiche desormais ces pages depuis la table faqs : sans ce
--    fichier, leurs questions ne s'afficheraient plus.
-- 2. Article Steinfort : les 4 questions de sa section "Questions
--    frequentes" sont extraites du HTML de l'article (FR, EN, DE), inserees
--    pour page_key 'blog:immobilier-steinfort', puis la section est retiree
--    du HTML des trois langues (pas de doublon). Questions et reponses en
--    texte simple (balises retirees, mots inchanges).
--    Garde-fous : un seul article, exactement 4 questions dans chaque
--    langue, la fin d'article (citation, signature, "Sources") jamais
--    prise dans une reponse. Sinon : ARRET avec la cause, RIEN n'est
--    modifie (transaction annulee).
--
-- Rejouable : une question deja presente n'est pas inseree deux fois ;
-- l'article Steinfort n'est traite que si sa page n'a encore aucune
-- question.
-- Retour arriere des insertions : DELETE FROM public.faqs WHERE page_key IN
--   ('agence','vendre','acheter','louer','mandat-recherche','blog:immobilier-steinfort');
-- (le HTML de l'article se restaure depuis la sauvegarde faite avant).
--
-- APERCU FACULTATIF, a lancer SEUL avant ce fichier (lecture seule) :
--   SELECT slug,
--          substring(content_fr from '(?i)(<h[23][^>]*>[^<]*(questions fr[eé]quentes|faq)[\s\S]*)') AS fr
--   FROM public.blog_posts WHERE lower(slug) = 'immobilier-steinfort';
--
-- Necessite PostgreSQL 15 ou plus (regexp_instr), cas de Supabase.
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

-- agence : 5 questions (messages/*.json, intent_pages.agency.faq_q1..5), mot pour mot.
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'agence', 'Où intervient MAPA Property au Luxembourg ?',
  'Sur l''ensemble du territoire du Grand-Duché, avec une présence forte sur le centre, le sud et l''ouest. Les pages par ville présentent les marchés suivis par l''agence.',
  'Where does MAPA Property operate in Luxembourg?',
  'Across the whole Grand Duchy, with a strong presence in the centre, south and west. The city pages describe the markets the agency follows.',
  'Wo ist MAPA Property in Luxemburg tätig?',
  'Im gesamten Großherzogtum, mit starker Präsenz im Zentrum, im Süden und im Westen. Die Städteseiten stellen die von der Agentur beobachteten Märkte vor.',
  1, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'agence' AND question_fr = 'Où intervient MAPA Property au Luxembourg ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'agence', 'Quels sont les honoraires de l''agence ?',
  'Ils sont publics et exprimés hors TVA (17 %). Pour une vente : 3 % du prix net vendeur en mandat exclusif, 4 % en semi-exclusif, 5 % en mandat simple et 1 % en mandat autonome. Le barème complet, location et recherche comprises, figure sur la page Honoraires.',
  'What are the agency''s fees?',
  'They are public and quoted excluding VAT (17%). For a sale: 3% of the net seller price with an exclusive mandate, 4% semi-exclusive, 5% simple and 1% autonomous. The full scale, including lettings and search, is on the Fees page.',
  'Wie hoch sind die Honorare der Agentur?',
  'Sie sind öffentlich und verstehen sich zuzüglich MwSt. (17 %). Für einen Verkauf: 3 % des Nettoverkaufspreises beim Alleinauftrag, 4 % beim halbexklusiven, 5 % beim einfachen und 1 % beim autonomen Mandat. Die vollständige Übersicht, einschließlich Vermietung und Suche, steht auf der Seite Honorare.',
  2, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'agence' AND question_fr = 'Quels sont les honoraires de l''agence ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'agence', 'L''agence peut-elle intervenir sans mandat ?',
  'Non. MAPA Property n''agit que sous mandat signé et ne défend qu''un seul intérêt à la fois : celui du vendeur ou celui de l''acquéreur qui l''a mandatée.',
  'Can the agency act without a mandate?',
  'No. MAPA Property only acts under a signed mandate and defends a single interest at a time: that of the seller or of the buyer who appointed it.',
  'Kann die Agentur ohne Mandat tätig werden?',
  'Nein. MAPA Property handelt nur mit unterzeichnetem Mandat und vertritt jeweils nur ein Interesse: das des Verkäufers oder das des Käufers, der sie beauftragt hat.',
  3, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'agence' AND question_fr = 'L''agence peut-elle intervenir sans mandat ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'agence', 'Peut-on faire estimer son bien ?',
  'Oui. L''estimation indicative en ligne est gratuite. L''estimation avec visite et rapport écrit est gratuite dans le cadre d''un mandat de vente potentiel, et sur devis en dehors.',
  'Can I have my property valued?',
  'Yes. The indicative online valuation is free. A valuation with a visit and a written report is free as part of a potential sale mandate, and quoted otherwise.',
  'Kann ich meine Immobilie bewerten lassen?',
  'Ja. Die unverbindliche Online-Bewertung ist kostenlos. Eine Bewertung mit Besichtigung und schriftlichem Bericht ist im Rahmen eines möglichen Verkaufsmandats kostenlos, sonst nach Angebot.',
  4, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'agence' AND question_fr = 'Peut-on faire estimer son bien ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'agence', 'Dans quelles langues le site est-il disponible ?',
  'En français, en anglais et en allemand.',
  'In which languages is the website available?',
  'In French, English and German.',
  'In welchen Sprachen ist die Website verfügbar?',
  'Auf Französisch, Englisch und Deutsch.',
  5, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'agence' AND question_fr = 'Dans quelles langues le site est-il disponible ?');

-- vendre : 4 questions (messages/*.json, intent_pages.sell.faq_q1..4), mot pour mot.
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'vendre', 'Quel mandat de vente choisir ?',
  'Le mandat exclusif confie la vente à MAPA Property seule, au taux le plus bas des trois mandats complets. Le semi-exclusif vous laisse présenter vous-même des acquéreurs de votre cercle. Le mandat simple permet de confier la vente à plusieurs agences. Le mandat autonome vous laisse gérer visites et négociation, avec un appui juridique et notarial.',
  'Which sale mandate should I choose?',
  'The exclusive mandate entrusts the sale to MAPA Property alone, at the lowest rate of the three full mandates. The semi-exclusive mandate lets you introduce buyers from your own circle. The simple mandate lets you list with several agencies. The autonomous mandate lets you handle viewings and negotiation yourself, with legal and notarial support.',
  'Welches Verkaufsmandat soll ich wählen?',
  'Beim Alleinauftrag verkauft nur MAPA Property, zum niedrigsten Satz der drei vollständigen Mandate. Beim halbexklusiven Mandat können Sie selbst Käufer aus Ihrem Umfeld vorstellen. Beim einfachen Mandat können Sie mehrere Agenturen beauftragen. Beim autonomen Mandat führen Sie Besichtigungen und Verhandlung selbst, mit rechtlicher und notarieller Unterstützung.',
  1, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'vendre' AND question_fr = 'Quel mandat de vente choisir ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'vendre', 'Combien de temps dure un mandat ?',
  'À partir de deux mois, durée recommandée par MAPA Property. Il est reconductible tacitement et résiliable avec un préavis de 15 jours.',
  'How long does a mandate last?',
  'From two months, the duration recommended by MAPA Property. It renews tacitly and can be terminated with 15 days'' notice.',
  'Wie lange läuft ein Mandat?',
  'Ab zwei Monaten, der von MAPA Property empfohlenen Dauer. Es verlängert sich stillschweigend und kann mit einer Frist von 15 Tagen gekündigt werden.',
  2, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'vendre' AND question_fr = 'Combien de temps dure un mandat ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'vendre', 'Quand les honoraires sont-ils dus ?',
  'À la signature de l''acte authentique, sauf disposition contraire écrite. Les taux s''entendent hors TVA (17 %), sur le prix net vendeur.',
  'When are the fees due?',
  'On signature of the notarial deed, unless otherwise agreed in writing. Rates are excluding VAT (17%), on the net seller price.',
  'Wann sind die Honorare fällig?',
  'Bei Unterzeichnung der notariellen Urkunde, sofern nicht schriftlich anders vereinbart. Die Sätze verstehen sich zuzüglich MwSt. (17 %) auf den Nettoverkaufspreis.',
  3, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'vendre' AND question_fr = 'Quand les honoraires sont-ils dus ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'vendre', 'L''estimation est-elle payante ?',
  'L''estimation indicative en ligne est gratuite. L''estimation avec visite et rapport écrit est gratuite dans le cadre d''un mandat de vente potentiel, et sur devis en dehors.',
  'Is the valuation charged?',
  'The indicative online valuation is free. A valuation with a visit and a written report is free as part of a potential sale mandate, and quoted otherwise.',
  'Ist die Bewertung kostenpflichtig?',
  'Die unverbindliche Online-Bewertung ist kostenlos. Eine Bewertung mit Besichtigung und schriftlichem Bericht ist im Rahmen eines möglichen Verkaufsmandats kostenlos, sonst nach Angebot.',
  4, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'vendre' AND question_fr = 'L''estimation est-elle payante ?');

-- acheter : 4 questions (messages/*.json, intent_pages.buy.faq_q1..4), mot pour mot.
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'acheter', 'Quels frais prévoir en plus du prix d''achat ?',
  'Au Luxembourg, comptez environ 6 % de droits d''enregistrement, 1 % de droit de transcription et environ 1 % d''honoraires de notaire, soit un total indicatif proche de 8 % du prix.',
  'What costs should I plan on top of the price?',
  'In Luxembourg, allow about 6% registration duties, 1% transcription duty and about 1% notary fees, an indicative total close to 8% of the price.',
  'Welche Kosten kommen zum Kaufpreis hinzu?',
  'In Luxemburg rund 6 % Registrierungsgebühren, 1 % Umschreibungsgebühr und rund 1 % Notarhonorar, insgesamt also etwa 8 % des Preises (Richtwert).',
  1, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'acheter' AND question_fr = 'Quels frais prévoir en plus du prix d''achat ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'acheter', 'Qu''est-ce que le Bëllegen Akt ?',
  'Un crédit d''impôt sur les droits d''enregistrement, jusqu''à 40 000 euros par acquéreur, pour l''achat d''une résidence principale, sans condition d''âge ni de première acquisition (loi du 3 juillet 2025).',
  'What is the Bëllegen Akt?',
  'A tax credit on registration duties of up to 40,000 euros per buyer for the purchase of a main residence, with no age or first-time buyer condition (law of 3 July 2025).',
  'Was ist der Bëllegen Akt?',
  'Eine Steuergutschrift auf die Registrierungsgebühren von bis zu 40 000 Euro pro Käufer beim Kauf eines Hauptwohnsitzes, ohne Alters- oder Ersterwerbsbedingung (Gesetz vom 3. Juli 2025).',
  2, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'acheter' AND question_fr = 'Qu''est-ce que le Bëllegen Akt ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'acheter', 'Comment accéder aux biens qui ne sont pas publiés ?',
  'La sélection Off-Market est accessible sur demande motivée, après signature d''un accord de confidentialité. Le mandat de recherche active aussi le réseau confidentiel de l''agence.',
  'How can I access properties that are not listed?',
  'The Off-Market selection is available on a reasoned request, after signing a non-disclosure agreement. A search mandate also activates the agency''s confidential network.',
  'Wie erhalte ich Zugang zu nicht veröffentlichten Immobilien?',
  'Die Off-Market-Auswahl ist auf begründete Anfrage nach Unterzeichnung einer Vertraulichkeitsvereinbarung zugänglich. Ein Suchauftrag aktiviert zudem das vertrauliche Netzwerk der Agentur.',
  3, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'acheter' AND question_fr = 'Comment accéder aux biens qui ne sont pas publiés ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'acheter', 'Combien puis-je emprunter ?',
  'Le simulateur de capacité d''emprunt et le simulateur de financement donnent une première indication, avec les taux du marché luxembourgeois. L''accord final reste celui de la banque.',
  'How much can I borrow?',
  'The borrowing capacity and financing simulators give a first indication using Luxembourg market rates. The final decision rests with the bank.',
  'Wie viel kann ich leihen?',
  'Der Rechner für die Kreditkapazität und der Finanzierungsrechner geben eine erste Orientierung mit den Zinssätzen des Luxemburger Marktes. Die endgültige Entscheidung trifft die Bank.',
  4, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'acheter' AND question_fr = 'Combien puis-je emprunter ?');

-- louer : 4 questions (messages/*.json, intent_pages.rent.faq_q1..4), mot pour mot.
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'louer', 'Quels sont les honoraires de mise en location ?',
  'Un mois de loyer hors TVA, partagé selon l''usage (50 % bailleur, 50 % locataire) ou entièrement à la charge du bailleur selon le mandat.',
  'What are the letting fees?',
  'One month''s rent excluding VAT, shared according to custom (50% landlord, 50% tenant) or paid entirely by the landlord, depending on the mandate.',
  'Wie hoch ist das Honorar für die Vermietung?',
  'Eine Monatsmiete zzgl. MwSt., je nach Gepflogenheit geteilt (50 % Vermieter, 50 % Mieter) oder je nach Mandat vollständig vom Vermieter getragen.',
  1, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'louer' AND question_fr = 'Quels sont les honoraires de mise en location ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'louer', 'Combien coûte la gestion locative ?',
  'De 6 % à 8 % hors TVA des loyers encaissés, selon les services inclus : encaissement, charges, sinistres et fin de bail.',
  'How much does property management cost?',
  'From 6% to 8% excluding VAT of the rents collected, depending on the services included: collection, service charges, claims and end of lease.',
  'Was kostet die Mietverwaltung?',
  '6 % bis 8 % zzgl. MwSt. der eingenommenen Mieten, je nach enthaltenen Leistungen: Inkasso, Nebenkosten, Schadensfälle und Mietende.',
  2, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'louer' AND question_fr = 'Combien coûte la gestion locative ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'louer', 'Quel est le loyer maximum autorisé au Luxembourg ?',
  'Le loyer annuel ne peut pas dépasser 5 % du capital investi dans le logement (loi du 21 septembre 2006 sur le bail à usage d''habitation).',
  'What is the maximum rent allowed in Luxembourg?',
  'The annual rent may not exceed 5% of the capital invested in the dwelling (law of 21 September 2006 on residential leases).',
  'Wie hoch darf die Miete in Luxemburg höchstens sein?',
  'Die Jahresmiete darf 5 % des in die Wohnung investierten Kapitals nicht übersteigen (Gesetz vom 21. September 2006 über den Wohnungsmietvertrag).',
  3, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'louer' AND question_fr = 'Quel est le loyer maximum autorisé au Luxembourg ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'louer', 'Comment sont choisis les locataires ?',
  'Par une sélection rigoureuse sur dossier complet, avec les vérifications d''identité et de lutte contre le blanchiment (KYC), avant la signature d''un contrat de bail conforme.',
  'How are tenants selected?',
  'Through a careful review of a complete file, with identity and anti-money laundering checks (KYC), before a compliant lease is signed.',
  'Wie werden die Mieter ausgewählt?',
  'Durch eine sorgfältige Prüfung eines vollständigen Dossiers, mit Identitäts- und Geldwäscheprüfung (KYC), vor Unterzeichnung eines rechtskonformen Mietvertrags.',
  4, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'louer' AND question_fr = 'Comment sont choisis les locataires ?');

-- mandat-recherche : 4 questions (messages/*.json, intent_pages.search.faq_q1..4), mot pour mot.
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'mandat-recherche', 'Combien coûte un mandat de recherche ?',
  'Au Luxembourg, 3 % à 5 % hors TVA du prix d''acquisition. En Europe, France comprise, 3 % à 8 % hors TVA selon la complexité et le pays. Ailleurs, sur devis défini au mandat.',
  'How much does a search mandate cost?',
  'In Luxembourg, 3% to 5% excluding VAT of the purchase price. In Europe, including France, 3% to 8% excluding VAT depending on complexity and country. Elsewhere, quoted in the mandate.',
  'Was kostet ein Suchauftrag?',
  'In Luxemburg 3 % bis 5 % zzgl. MwSt. des Kaufpreises. In Europa, einschließlich Frankreich, 3 % bis 8 % zzgl. MwSt. je nach Komplexität und Land. Andernorts nach Angebot im Mandat.',
  1, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'mandat-recherche' AND question_fr = 'Combien coûte un mandat de recherche ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'mandat-recherche', 'À quoi sert l''avance sur frais ?',
  'Elle formalise l''engagement réciproque : l''agence travaille exclusivement sur votre projet. Elle est de 250 euros hors TVA au Luxembourg, à partir de 500 euros hors TVA dans les régions limitrophes jusqu''à 100 km, sur devis ailleurs, et entièrement déduite des honoraires si la transaction se conclut avec MAPA Property.',
  'What is the fee advance for?',
  'It formalises the mutual commitment: the agency works exclusively on your project. It is 250 euros excluding VAT in Luxembourg, from 500 euros excluding VAT in neighbouring regions up to 100 km, quoted elsewhere, and fully deducted from the fees if the transaction completes with MAPA Property.',
  'Wozu dient der Kostenvorschuss?',
  'Er formalisiert die gegenseitige Verpflichtung: Die Agentur arbeitet ausschließlich an Ihrem Projekt. Er beträgt 250 Euro zzgl. MwSt. in Luxemburg, ab 500 Euro zzgl. MwSt. in den angrenzenden Regionen bis 100 km, andernorts nach Angebot, und wird bei Abschluss mit MAPA Property vollständig vom Honorar abgezogen.',
  2, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'mandat-recherche' AND question_fr = 'À quoi sert l''avance sur frais ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'mandat-recherche', 'La recherche inclut-elle les biens hors marché ?',
  'Oui. Le mandat active le réseau confidentiel de l''agence : agences partenaires, propriétaires directs et sources off-market.',
  'Does the search include off-market properties?',
  'Yes. The mandate activates the agency''s confidential network: partner agencies, direct owners and off-market sources.',
  'Umfasst die Suche auch Off-Market-Immobilien?',
  'Ja. Der Auftrag aktiviert das vertrauliche Netzwerk der Agentur: Partneragenturen, direkte Eigentümer und Off-Market-Quellen.',
  3, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'mandat-recherche' AND question_fr = 'La recherche inclut-elle les biens hors marché ?');
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
SELECT 'mandat-recherche', 'Peut-on chercher hors du Luxembourg ?',
  'Oui. MAPA Property intervient directement sur des biens situés en France, en Allemagne et en Italie grâce à la carte professionnelle européenne. Ailleurs, elle agit comme broker avec une agence locale habilitée et reste votre interlocuteur unique.',
  'Can I search outside Luxembourg?',
  'Yes. MAPA Property operates directly on properties in France, Germany and Italy under the European Professional Card. Elsewhere, it acts as a broker with a licensed local agency and remains your single point of contact.',
  'Kann ich auch außerhalb Luxemburgs suchen?',
  'Ja. Mit dem Europäischen Berufsausweis ist MAPA Property bei Immobilien in Frankreich, Deutschland und Italien direkt tätig. Andernorts handelt sie als Broker mit einer zugelassenen lokalen Agentur und bleibt Ihr einziger Ansprechpartner.',
  4, true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'mandat-recherche' AND question_fr = 'Peut-on chercher hors du Luxembourg ?');

-- ---------------------------------------------------------------------
-- Article Steinfort : extraction, insertion, retrait de la section.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.faq_texte(h text) RETURNS text
LANGUAGE sql IMMUTABLE AS $f$
  SELECT btrim(regexp_replace(
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
      regexp_replace(regexp_replace(h, '<br\s*/?>', ' ', 'gi'), '<[^>]+>', '', 'g'),
      '&nbsp;', ' '), '&#160;', ' '), '&amp;', '&'), '&#39;', ''''), '&apos;', ''''), '&rsquo;', '’'),
      '&quot;', '"'), '&laquo;', '«'), '&raquo;', '»'), '&lt;', '<'), '&gt;', '>'),
    '[ \t\r\n]+', ' ', 'g'))
$f$;

DO $steinfort$
DECLARE
  v_id uuid;
  v_n integer;
  l text;
  html text;
  head_re constant text := '<h([23])[^>]*>[[:space:]]*(questions[[:space:]]+fr(e|é|&eacute;)quentes|frequently[[:space:]]+asked[[:space:]]+questions|h(ä|a|&auml;)ufig[[:space:]]+gestellte[[:space:]]+fragen|h(ä|a|&auml;)ufige[[:space:]]+fragen|faq)[[:space:]]*:?[[:space:]]*</h\1>';
  h_start integer;
  h_end integer;
  pos integer;
  qs integer;
  qe integer;
  qtxt text;
  ans text;
  para text;
  pe integer;
  rest text;
  removed_end integer;
  qa jsonb;
  all_qa jsonb := '{}'::jsonb;
  i integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.blog_posts WHERE lower(slug) = 'immobilier-steinfort';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Steinfort : % article(s) trouve(s) pour l''adresse immobilier-steinfort (attendu 1). Rien n''a ete modifie.', v_n;
  END IF;
  IF EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort') THEN
    RAISE NOTICE 'Steinfort : questions deja presentes, article non retraite.';
    RETURN;
  END IF;
  SELECT id INTO v_id FROM public.blog_posts WHERE lower(slug) = 'immobilier-steinfort';

  FOREACH l IN ARRAY ARRAY['fr', 'en', 'de'] LOOP
    EXECUTE format('SELECT %I FROM public.blog_posts WHERE id = $1', 'content_' || l) INTO html USING v_id;
    IF html IS NULL THEN
      RAISE EXCEPTION 'Steinfort %, texte vide. Rien n''a ete modifie.', l;
    END IF;
    h_start := regexp_instr(html, head_re, 1, 1, 0, 'i');
    IF h_start = 0 THEN
      RAISE EXCEPTION 'Steinfort %, titre de la section "Questions frequentes" introuvable. Rien n''a ete modifie.', l;
    END IF;
    h_end := regexp_instr(html, head_re, 1, 1, 1, 'i');
    pos := h_end;
    removed_end := h_end;
    qa := '[]'::jsonb;
    LOOP
      rest := substr(html, pos);
      -- Question suivante : un <h3> avant tout autre titre <h1>/<h2>.
      qs := regexp_instr(rest, '<h3[[:space:]>]', 1, 1, 0, 'i');
      EXIT WHEN qs = 0;
      IF regexp_instr(substr(rest, 1, qs - 1), '<h[12][[:space:]>]', 1, 1, 0, 'i') > 0 THEN EXIT; END IF;
      -- Rien d'autre que des blancs entre deux questions.
      IF btrim(substr(rest, 1, qs - 1), E' \t\r\n') <> '' THEN EXIT; END IF;
      qe := strpos(lower(rest), '</h3>');
      EXIT WHEN qe = 0 OR qe < qs;
      qtxt := pg_temp.faq_texte(substr(rest, qs, qe - qs));
      pos := pos + qe - 1 + length('</h3>');
      ans := '';
      -- Reponse : paragraphes <p> qui suivent, hors fin d'article.
      LOOP
        rest := substr(html, pos);
        EXIT WHEN rest !~* '^[[:space:]]*<p[[:space:]>]';
        pe := strpos(lower(rest), '</p>');
        EXIT WHEN pe = 0;
        para := pg_temp.faq_texte(substr(rest, 1, pe - 1));
        EXIT WHEN para ~* '^(sources?|quellen)[[:space:]]*:' OR para ~* 'real estate director';
        IF para <> '' THEN
          ans := CASE WHEN ans = '' THEN para ELSE ans || E'\n\n' || para END;
        END IF;
        pos := pos + pe - 1 + length('</p>');
      END LOOP;
      IF qtxt = '' OR ans = '' THEN
        RAISE EXCEPTION 'Steinfort %, question % sans texte ou sans reponse. Rien n''a ete modifie.', l, jsonb_array_length(qa) + 1;
      END IF;
      qa := qa || jsonb_build_array(jsonb_build_object('q', qtxt, 'a', ans));
      removed_end := pos;
    END LOOP;
    IF jsonb_array_length(qa) <> 4 THEN
      RAISE EXCEPTION 'Steinfort %, % question(s) trouvee(s) (attendu 4). Rien n''a ete modifie.', l, jsonb_array_length(qa);
    END IF;
    all_qa := all_qa || jsonb_build_object(l, qa);
    -- Retrait de la section : du titre a la fin de la derniere reponse.
    EXECUTE format('UPDATE public.blog_posts SET %I = $1 WHERE id = $2', 'content_' || l)
      USING substr(html, 1, h_start - 1) || substr(html, removed_end), v_id;
  END LOOP;

  FOR i IN 0..3 LOOP
    INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published)
    VALUES ('blog:immobilier-steinfort',
            all_qa->'fr'->i->>'q', all_qa->'fr'->i->>'a',
            all_qa->'en'->i->>'q', all_qa->'en'->i->>'a',
            all_qa->'de'->i->>'q', all_qa->'de'->i->>'a',
            i + 1, true);
  END LOOP;
END
$steinfort$;

COMMIT;

-- Controle : nombre de questions par page, puis les questions de Steinfort.
SELECT page_key AS controle, count(*)::text AS etat FROM public.faqs
WHERE page_key IN ('agence', 'vendre', 'acheter', 'louer', 'mandat-recherche', 'blog:immobilier-steinfort')
GROUP BY page_key
UNION ALL
SELECT 'steinfort ' || position || ' FR', left(question_fr, 120) FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort'
UNION ALL
SELECT 'steinfort ' || position || ' EN', left(question_en, 120) FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort'
UNION ALL
SELECT 'steinfort ' || position || ' DE', left(question_de, 120) FROM public.faqs WHERE page_key = 'blog:immobilier-steinfort'
UNION ALL
SELECT 'section FAQ restante dans l''article (attendu 0)',
       (SELECT count(*)::text FROM public.blog_posts
        WHERE lower(slug) = 'immobilier-steinfort'
          AND (content_fr ~* 'questions[[:space:]]+fr(e|é)quentes</h' OR content_en ~* 'frequently[[:space:]]+asked[[:space:]]+questions</h' OR content_de ~* 'h(ä|a)ufig(e|[[:space:]]+gestellte)[[:space:]]+fragen</h'));
