-- =====================================================================
-- 37 ELENA : REPONSES FERMEES VALIDEES
-- MAPA Property, prepare le 2026-11-12. Source unique : docs/elena/elena-qa.json
-- (106 entrees validees par Julien Brebion, 12/11/2026). AUCUN mot des reponses n'est modifie.
--
-- 1. Ajoute a public.faqs des colonnes FACULTATIVES (aucune donnee existante
--    modifiee) : variants_fr (autres formulations), button_path (chemin
--    interne du site, sans la langue), button_label_fr/en/de, source,
--    is_template (modele de reponse de la recherche de biens, defaut false).
-- 2. Autorise la page 'elena' dans la contrainte des pages (memes pages
--    qu'avant, plus 'elena'). Les entrees 'elena' ne s'affichent sur AUCUNE
--    page publique : seule Elena les lit (app/api/chatbot/route.ts).
-- 3. Insere les 106 entrees : page_key = 'elena', published = true,
--    position = numero de l'entree (E001 = 1). Sans doublon (WHERE NOT
--    EXISTS sur page_key et question_fr) : rejouable.
-- Aucune modification des droits (RLS) : memes regles que les autres
-- questions (lecture publique des lignes publiees, ecriture admin).
-- Tant que ce fichier n'est pas execute, Elena lit docs/elena/elena-qa.json,
-- sans aucune difference pour le visiteur.
-- Retour arriere : DELETE FROM public.faqs WHERE page_key = 'elena';
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- =====================================================================

BEGIN;

ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS variants_fr text[];
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS button_path text;
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS button_label_fr text;
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS button_label_en text;
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS button_label_de text;
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

ALTER TABLE public.faqs DROP CONSTRAINT IF EXISTS faqs_page_key_check;
ALTER TABLE public.faqs ADD CONSTRAINT faqs_page_key_check CHECK (
  page_key IN ('agence', 'accueil', 'vendre', 'acheter', 'louer', 'estimer', 'mandat-recherche', 'off-market', 'faq-generale', 'broker-international', 'elena')
  OR page_key ~ '^(ville|blog):[a-z0-9]+(-[a-z0-9]+)*$'
);

-- E001 (Accueil)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Bonjour', 'Bonjour, je suis Eléna, l''assistante de MAPA Property. Je peux vous aider à trouver un bien, à vendre ou louer le vôtre, ou vous présenter nos services. Que puis-je faire pour vous ?',
  'Hello', 'Hello, I am Eléna, MAPA Property''s assistant. I can help you find a property, sell or let yours, or present our services. How can I help you?',
  'Hallo', 'Guten Tag, ich bin Eléna, die Assistentin von MAPA Property. Ich helfe Ihnen gerne, eine Immobilie zu finden, Ihre eigene zu verkaufen oder zu vermieten, oder stelle Ihnen unsere Leistungen vor. Was kann ich für Sie tun?',
  1, true, ARRAY['salut', 'hello', 'bonsoir', 'hallo', 'guten Tag']::text[],
  NULL, NULL, NULL, NULL,
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Bonjour');

-- E002 (Accueil)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qui êtes-vous ?', 'Je suis Eléna, l''assistante virtuelle de MAPA Property. Je réponds uniquement à partir des informations validées par l''agence. Pour un échange personnalisé, notre équipe vous répond directement.',
  'Who are you?', 'I am Eléna, MAPA Property''s virtual assistant. I only answer with information approved by the agency. For a personal conversation, our team will reply to you directly.',
  'Wer sind Sie?', 'Ich bin Eléna, die virtuelle Assistentin von MAPA Property. Ich antworte ausschließlich mit Informationen, die von der Agentur freigegeben wurden. Für ein persönliches Gespräch antwortet Ihnen unser Team direkt.',
  2, true, ARRAY['tu es qui', 'c''est quoi Eléna']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qui êtes-vous ?');

-- E003 (Accueil)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Êtes-vous un robot ou une IA ?', 'Oui, je suis une assistante virtuelle. Je ne donne que des informations validées par l''agence. Si vous préférez parler à une personne, notre équipe vous recontacte.',
  'Are you a robot or an AI?', 'Yes, I am a virtual assistant. I only provide information approved by the agency. If you would rather speak to a person, our team will get back to you.',
  'Sind Sie ein Roboter oder eine KI?', 'Ja, ich bin eine virtuelle Assistentin. Ich gebe nur von der Agentur freigegebene Informationen weiter. Wenn Sie lieber mit einer Person sprechen möchten, meldet sich unser Team bei Ihnen.',
  3, true, ARRAY['je parle à un humain', 'chatbot', 'machine']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Êtes-vous un robot ou une IA ?');

-- E004 (Accueil)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Merci', 'Avec plaisir. N''hésitez pas si vous avez une autre question.',
  'Thank you', 'You are welcome. Do not hesitate if you have another question.',
  'Danke', 'Gern geschehen. Zögern Sie nicht, wenn Sie eine weitere Frage haben.',
  4, true, ARRAY['merci beaucoup', 'super', 'parfait', 'danke', 'thanks']::text[],
  NULL, NULL, NULL, NULL,
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Merci');

-- E005 (Accueil)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Au revoir', 'Merci de votre visite et à bientôt chez MAPA Property.',
  'Goodbye', 'Thank you for your visit, and see you soon at MAPA Property.',
  'Auf Wiedersehen', 'Vielen Dank für Ihren Besuch und bis bald bei MAPA Property.',
  5, true, ARRAY['bonne journée', 'à bientôt', 'bye', 'tschüss']::text[],
  NULL, NULL, NULL, NULL,
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Au revoir');

-- E006 (Accueil)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je veux parler à quelqu''un', 'Bien sûr. Laissez vos coordonnées dans le formulaire de contact : notre équipe vous recontacte rapidement.',
  'I want to speak to someone', 'Of course. Leave your details in the contact form and our team will get back to you shortly.',
  'Ich möchte mit jemandem sprechen', 'Selbstverständlich. Hinterlassen Sie Ihre Kontaktdaten im Kontaktformular, unser Team meldet sich umgehend bei Ihnen.',
  6, true, ARRAY['un conseiller', 'un agent', 'une vraie personne', 'être rappelé']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je veux parler à quelqu''un');

-- E007 (Accueil)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quel est votre numéro de téléphone ?', 'Pour vous mettre en relation avec la bonne personne, passez par le formulaire de contact : notre équipe vous rappelle rapidement.',
  'What is your phone number?', 'To put you in touch with the right person, please use the contact form: our team will call you back shortly.',
  'Wie lautet Ihre Telefonnummer?', 'Damit Sie mit der richtigen Person sprechen, nutzen Sie bitte das Kontaktformular: unser Team ruft Sie umgehend zurück.',
  7, true, ARRAY['téléphone', 'numéro', 'appeler l''agence', 'gsm']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quel est votre numéro de téléphone ?');

-- E008 (Accueil)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quelle est votre adresse e-mail ?', 'Le plus simple est le formulaire de contact : votre message arrive directement à l''équipe, qui vous répond rapidement.',
  'What is your email address?', 'The simplest way is the contact form: your message goes straight to the team, who will reply shortly.',
  'Wie lautet Ihre E-Mail-Adresse?', 'Am einfachsten ist das Kontaktformular: Ihre Nachricht geht direkt an das Team, das Ihnen umgehend antwortet.',
  8, true, ARRAY['mail', 'email', 'courriel', 'écrire à l''agence']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quelle est votre adresse e-mail ?');

-- E009 (Accueil)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Dans quelles langues pouvez-vous me répondre ?', 'Le site et l''assistante sont disponibles en français, en anglais et en allemand. L''équipe de MAPA Property vous accompagne en luxembourgeois, français, anglais, allemand et italien.',
  'Which languages do you speak?', 'The website and the assistant are available in French, English and German. The MAPA Property team works with you in Luxembourgish, French, English, German and Italian.',
  'Welche Sprachen sprechen Sie?', 'Website und Assistentin sind auf Französisch, Englisch und Deutsch verfügbar. Das Team von MAPA Property begleitet Sie auf Luxemburgisch, Französisch, Englisch, Deutsch und Italienisch.',
  9, true, ARRAY['vous parlez anglais', 'sprechen Sie Deutsch', 'italien']::text[],
  NULL, NULL, NULL, NULL,
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Dans quelles langues pouvez-vous me répondre ?');

-- E010 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qui est MAPA Property ?', 'MAPA Property est une agence immobilière luxembourgeoise, marque commerciale de MAPA Synergy Sàrl. Elle accompagne la vente, l''achat, la location et la recherche de biens au Luxembourg et à l''international.',
  'Who is MAPA Property?', 'MAPA Property is a Luxembourg real estate agency, a trade name of MAPA Synergy Sàrl. It supports sales, purchases, lettings and property searches in Luxembourg and internationally.',
  'Wer ist MAPA Property?', 'MAPA Property ist eine luxemburgische Immobilienagentur und Handelsmarke der MAPA Synergy Sàrl. Sie begleitet Verkauf, Kauf, Vermietung und Immobiliensuche in Luxemburg und international.',
  10, true, ARRAY['présentation', 'c''est quoi MAPA', 'votre agence']::text[],
  '/qui-sommes-nous', 'Qui sommes-nous', 'About us', 'Über uns',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qui est MAPA Property ?');

-- E011 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Où se trouve votre agence ?', 'Notre bureau public se trouve au 26 Rue du Commerce, L-3450 Dudelange. Pour un rendez-vous, utilisez le formulaire de contact.',
  'Where is your agency?', 'Our public office is at 26 Rue du Commerce, L-3450 Dudelange. To arrange a meeting, please use the contact form.',
  'Wo befindet sich Ihre Agentur?', 'Unser öffentliches Büro befindet sich in der 26 Rue du Commerce, L-3450 Dudelange. Für einen Termin nutzen Sie bitte das Kontaktformular.',
  11, true, ARRAY['adresse', 'bureau', 'où êtes-vous']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Où se trouve votre agence ?');

-- E012 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Puis-je prendre rendez-vous ?', 'Oui. Nous vous recevons à Luxembourg-Ville, sur place dans le bien, à votre domicile ou en visioconférence. Indiquez vos disponibilités dans le formulaire de contact.',
  'Can I book a meeting?', 'Yes. We can meet in Luxembourg City, at the property, at your home or by video call. Let us know your availability in the contact form.',
  'Kann ich einen Termin vereinbaren?', 'Ja. Wir treffen Sie in Luxemburg-Stadt, direkt in der Immobilie, bei Ihnen zu Hause oder per Videogespräch. Teilen Sie uns Ihre Verfügbarkeit im Kontaktformular mit.',
  12, true, ARRAY['rdv', 'rencontrer', 'visioconférence']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Puis-je prendre rendez-vous ?');

-- E013 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quels sont vos horaires ?', 'Nous vous recevons en semaine, et le week-end sur rendez-vous uniquement. Le formulaire de contact est le moyen le plus rapide de fixer un rendez-vous.',
  'What are your opening hours?', 'We see clients on weekdays, and at weekends by appointment only. The contact form is the quickest way to book a meeting.',
  'Wann sind Sie erreichbar?', 'Wir empfangen Sie unter der Woche, am Wochenende nur nach Vereinbarung. Über das Kontaktformular vereinbaren Sie am schnellsten einen Termin.',
  13, true, ARRAY['ouvert quand', 'le week-end', 'samedi', 'dimanche']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Fiche Google', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quels sont vos horaires ?');

-- E014 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qui est Julien Brebion ?', 'Julien Brebion est co-fondateur de MAPA Property, Real Estate Director et Exclusive Sourcing Specialist. Sa présentation figure sur la page Qui sommes-nous.',
  'Who is Julien Brebion?', 'Julien Brebion is co-founder of MAPA Property, Real Estate Director and Exclusive Sourcing Specialist. His profile is on the About us page.',
  'Wer ist Julien Brebion?', 'Julien Brebion ist Mitgründer von MAPA Property, Real Estate Director und Exclusive Sourcing Specialist. Seine Vorstellung finden Sie auf der Seite Über uns.',
  14, true, ARRAY['le directeur', 'le fondateur']::text[],
  '/qui-sommes-nous', 'Qui sommes-nous', 'About us', 'Über uns',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qui est Julien Brebion ?');

-- E015 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Où intervient MAPA Property au Luxembourg ?', 'Sur l''ensemble du territoire du Grand-Duché, avec une présence forte sur le centre, le sud et l''ouest. Les pages par ville présentent les marchés suivis par l''agence.',
  'Where does MAPA Property operate in Luxembourg?', 'Across the whole Grand Duchy, with a strong presence in the centre, south and west. The city pages describe the markets the agency follows.',
  'Wo ist MAPA Property in Luxemburg tätig?', 'Im gesamten Großherzogtum, mit starker Präsenz im Zentrum, im Süden und im Westen. Die Städteseiten stellen die von der Agentur beobachteten Märkte vor.',
  15, true, ARRAY['quelles communes', 'quelle région']::text[],
  NULL, NULL, NULL, NULL,
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Où intervient MAPA Property au Luxembourg ?');

-- E016 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Travaillez-vous dans ma commune ?', 'MAPA Property intervient dans toutes les communes du Luxembourg. Indiquez-moi votre commune et votre projet, ou passez par le formulaire de contact pour être recontacté.',
  'Do you work in my municipality?', 'MAPA Property works in every municipality in Luxembourg. Tell me your municipality and your project, or use the contact form to be called back.',
  'Sind Sie in meiner Gemeinde tätig?', 'MAPA Property ist in allen Gemeinden Luxemburgs tätig. Nennen Sie mir Ihre Gemeinde und Ihr Vorhaben, oder nutzen Sie das Kontaktformular für einen Rückruf.',
  16, true, ARRAY['vous êtes actifs à', 'vous connaissez la commune de']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Travaillez-vous dans ma commune ?');

-- E017 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'L''agence peut-elle intervenir sans mandat ?', 'Non. MAPA Property n''intervient jamais sans mandat écrit et signé : c''est lui qui fixe la mission, les honoraires et qui protège nos clients. L''agence ne défend qu''un seul intérêt à la fois, celui du vendeur ou celui de l''acquéreur qui l''a mandatée.',
  'Can the agency act without a mandate?', 'No. MAPA Property never acts without a written, signed mandate: it sets out the assignment and the fees, and it protects our clients. The agency represents only one interest at a time, that of the seller or that of the buyer who appointed it.',
  'Kann die Agentur ohne Auftrag tätig werden?', 'Nein. MAPA Property wird niemals ohne schriftlichen, unterzeichneten Auftrag tätig: Er legt die Aufgabe und die Honorare fest und schützt unsere Kunden. Die Agentur vertritt immer nur ein Interesse, das des Verkäufers oder das des Käufers, der sie beauftragt hat.',
  17, true, ARRAY['sans contrat', 'sans signer', 'juste m''aider']::text[],
  '/services/vendre', 'Nos mandats', 'Our mandates', 'Unsere Mandate',
  'Julien, 12/11/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'L''agence peut-elle intervenir sans mandat ?');

-- E018 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Représentez-vous à la fois le vendeur et l''acheteur ?', 'Non. MAPA Property représente un seul intérêt à la fois, celui de son mandant, acquéreur ou vendeur.',
  'Do you represent both the seller and the buyer?', 'No. MAPA Property represents a single interest at a time, that of its principal, whether buyer or seller.',
  'Vertreten Sie Verkäufer und Käufer gleichzeitig?', 'Nein. MAPA Property vertritt immer nur ein Interesse, das ihres Auftraggebers, ob Käufer oder Verkäufer.',
  18, true, ARRAY['double mandat', 'conflit d''intérêts']::text[],
  NULL, NULL, NULL, NULL,
  'Page Broker international', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Représentez-vous à la fois le vendeur et l''acheteur ?');

-- E019 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Utilisez-vous l''intelligence artificielle ?', 'L''agence utilise l''IA pour l''analyse et l''organisation, jamais en remplacement de la rencontre et du conseil humain.',
  'Do you use artificial intelligence?', 'The agency uses AI for analysis and organisation, never as a substitute for meeting you and for human advice.',
  'Nutzen Sie künstliche Intelligenz?', 'Die Agentur nutzt KI für Analyse und Organisation, niemals als Ersatz für das persönliche Gespräch und die menschliche Beratung.',
  19, true, ARRAY['IA', 'ChatGPT', 'automatisation']::text[],
  NULL, NULL, NULL, NULL,
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Utilisez-vous l''intelligence artificielle ?');

-- E020 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Êtes-vous membre d''une fédération ?', 'MAPA Property est membre de la Fédération Immobilière du Luxembourg (FIL).',
  'Are you a member of a federation?', 'MAPA Property is a member of the Fédération Immobilière du Luxembourg (FIL).',
  'Sind Sie Mitglied eines Verbands?', 'MAPA Property ist Mitglied der Fédération Immobilière du Luxembourg (FIL).',
  20, true, ARRAY['FIL', 'chambre immobilière', 'agréé']::text[],
  NULL, NULL, NULL, NULL,
  'Julien, 12/11/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Êtes-vous membre d''une fédération ?');

-- E021 (L'agence)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Sur quels portails publiez-vous vos annonces ?', 'Nos biens sont présentés sur notre site, diffusés sur immotop.lu et référencés sur FILIA, le moteur de recherche de la Fédération Immobilière du Luxembourg. Les biens off-market ne sont jamais publiés.',
  'Which portals do you publish your listings on?', 'Our properties are presented on our website, published on immotop.lu and listed on FILIA, the property search engine of the Fédération Immobilière du Luxembourg. Off-market properties are never published.',
  'Auf welchen Portalen veröffentlichen Sie Ihre Anzeigen?', 'Unsere Immobilien werden auf unserer Website präsentiert, auf immotop.lu veröffentlicht und auf FILIA, der Immobiliensuchmaschine der Fédération Immobilière du Luxembourg, gelistet. Off-Market-Objekte werden nie veröffentlicht.',
  21, true, ARRAY['immotop', 'athome', 'filia', 'où voir vos annonces']::text[],
  '/biens', 'Voir les biens', 'View properties', 'Immobilien ansehen',
  'Julien, 12/11/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Sur quels portails publiez-vous vos annonces ?');

-- E022 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je veux vendre mon bien', 'Avec plaisir. La première étape est une estimation : en ligne pour une fourchette, ou avec visite pour une valeur précise. Vous pouvez aussi découvrir notre accompagnement à la vente.',
  'I want to sell my property', 'With pleasure. The first step is a valuation: online for a range, or with a visit for a precise value. You can also discover how we support sellers.',
  'Ich möchte meine Immobilie verkaufen', 'Sehr gerne. Der erste Schritt ist eine Bewertung: online für eine Spanne oder mit Besichtigung für einen genauen Wert. Sie können auch unsere Verkaufsbegleitung entdecken.',
  22, true, ARRAY['vendre ma maison', 'mettre en vente']::text[],
  '/services/vendre', 'Vendre mon bien', 'Sell my property', 'Meine Immobilie verkaufen',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je veux vendre mon bien');

-- E023 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quels mandats de vente proposez-vous ?', 'Quatre mandats : exclusif, semi-exclusif, simple et autonome. Chacun a sa page détaillée.',
  'Which sale mandates do you offer?', 'Four mandates: exclusive, semi-exclusive, simple and autonomous. Each has its own detailed page.',
  'Welche Verkaufsaufträge bieten Sie an?', 'Vier Aufträge: exklusiv, halb-exklusiv, einfach und autonom. Jeder hat seine eigene Detailseite.',
  23, true, ARRAY['types de mandat', 'quel contrat']::text[],
  '/services/vendre', 'Nos mandats', 'Our mandates', 'Unsere Mandate',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quels mandats de vente proposez-vous ?');

-- E024 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quel mandat de vente choisir ?', 'Le mandat exclusif confie la vente à MAPA Property seule, au taux le plus bas des trois mandats complets. Le semi-exclusif vous laisse présenter vous-même des acquéreurs de votre cercle. Le mandat simple permet de confier la vente à plusieurs agences. Le mandat autonome vous laisse gérer visites et négociation, avec un appui juridique et notarial.',
  'Which sale mandate should I choose?', 'The exclusive mandate entrusts the sale to MAPA Property alone, at the lowest rate of the three full mandates. The semi-exclusive mandate lets you introduce buyers from your own circle. The simple mandate allows several agencies. The autonomous mandate lets you handle viewings and negotiation, with legal and notarial support.',
  'Welchen Verkaufsauftrag sollte ich wählen?', 'Der Alleinauftrag überträgt den Verkauf allein MAPA Property, zum niedrigsten Satz der drei vollständigen Aufträge. Der halb-exklusive Auftrag erlaubt Ihnen, selbst Käufer aus Ihrem Umfeld vorzustellen. Der einfache Auftrag erlaubt mehrere Agenturen. Beim autonomen Auftrag übernehmen Sie Besichtigungen und Verhandlung, mit juristischer und notarieller Unterstützung.',
  24, true, ARRAY['lequel est le mieux', 'différence entre les mandats']::text[],
  '/services/vendre', 'Nos mandats', 'Our mandates', 'Unsere Mandate',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quel mandat de vente choisir ?');

-- E025 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Pourquoi recommandez-vous le mandat exclusif ?', 'Le marché luxembourgeois est petit. Confier la même annonce à plusieurs agences expose votre bien sur les mêmes plateformes et donne un signal de vente pressée, souvent défavorable à la négociation.',
  'Why do you recommend the exclusive mandate?', 'The Luxembourg market is small. Giving the same listing to several agencies exposes your property on the same platforms and signals a rushed sale, which usually weakens your negotiating position.',
  'Warum empfehlen Sie den Alleinauftrag?', 'Der luxemburgische Markt ist klein. Dasselbe Inserat mehreren Agenturen anzuvertrauen, zeigt Ihre Immobilie auf denselben Plattformen und signalisiert einen eiligen Verkauf, was in der Verhandlung meist nachteilig ist.',
  25, true, ARRAY['intérêt de l''exclusivité']::text[],
  '/mandats/exclusif', 'Mandat exclusif', 'Exclusive mandate', 'Alleinauftrag',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Pourquoi recommandez-vous le mandat exclusif ?');

-- E026 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce que le mandat exclusif ?', 'MAPA Property est seule chargée de la vente, avec l''engagement le plus fort des deux côtés. Diffusion off-market d''abord, puis publique selon la stratégie. Honoraires : 3 % HT du prix net vendeur. Pack Vidéo en option.',
  'What is the exclusive mandate?', 'MAPA Property alone handles the sale, with the strongest commitment on both sides. Off-market marketing first, then public according to the strategy. Fees: 3% excluding VAT of the net seller price. Video Pack optional.',
  'Was ist der Alleinauftrag?', 'MAPA Property übernimmt den Verkauf allein, mit dem stärksten Engagement auf beiden Seiten. Zuerst Off-Market-Vermarktung, dann öffentlich je nach Strategie. Honorar: 3 % zzgl. MwSt. des Nettoverkaufspreises. Videopaket optional.',
  26, true, ARRAY['exclusivité']::text[],
  '/mandats/exclusif', 'Mandat exclusif', 'Exclusive mandate', 'Alleinauftrag',
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce que le mandat exclusif ?');

-- E027 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce que le mandat semi-exclusif ?', 'Vous gardez la possibilité de vendre à un acquéreur de votre cercle privé, MAPA Property mobilise ses canaux. Honoraires : 4 % HT du prix net vendeur, dus uniquement si MAPA présente l''acquéreur.',
  'What is the semi-exclusive mandate?', 'You keep the option of selling to a buyer from your private circle, while MAPA Property activates its channels. Fees: 4% excluding VAT of the net seller price, due only if MAPA introduces the buyer.',
  'Was ist der halb-exklusive Auftrag?', 'Sie behalten die Möglichkeit, an einen Käufer aus Ihrem privaten Umfeld zu verkaufen, MAPA Property aktiviert ihre Kanäle. Honorar: 4 % zzgl. MwSt. des Nettoverkaufspreises, nur fällig, wenn MAPA den Käufer vorstellt.',
  27, true, ARRAY['semi exclusif', 'garder mon cercle']::text[],
  '/mandats/semi-exclusif', 'Mandat semi-exclusif', 'Semi-exclusive mandate', 'Halb-exklusiver Auftrag',
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce que le mandat semi-exclusif ?');

-- E028 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce que le mandat simple ?', 'Aucune exclusivité : vous pouvez confier la vente à plusieurs agences. Honoraires : 5 % HT du prix net vendeur.',
  'What is the simple mandate?', 'No exclusivity: you can entrust the sale to several agencies. Fees: 5% excluding VAT of the net seller price.',
  'Was ist der einfache Auftrag?', 'Keine Exklusivität: Sie können mehrere Agenturen beauftragen. Honorar: 5 % zzgl. MwSt. des Nettoverkaufspreises.',
  28, true, ARRAY['plusieurs agences']::text[],
  '/mandats/simple', 'Mandat simple', 'Simple mandate', 'Einfacher Auftrag',
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce que le mandat simple ?');

-- E029 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce que le mandat autonome ?', 'Vous gérez vous-même les visites et la négociation. MAPA Property intervient en appui juridique et notarial. Honoraires : 1 % HT du prix net vendeur.',
  'What is the autonomous mandate?', 'You handle viewings and negotiation yourself. MAPA Property provides legal and notarial support. Fees: 1% excluding VAT of the net seller price.',
  'Was ist der autonome Auftrag?', 'Sie übernehmen Besichtigungen und Verhandlung selbst. MAPA Property leistet juristische und notarielle Unterstützung. Honorar: 1 % zzgl. MwSt. des Nettoverkaufspreises.',
  29, true, ARRAY['je fais les visites moi-même']::text[],
  '/mandats/autonome', 'Mandat autonome', 'Autonomous mandate', 'Autonomer Auftrag',
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce que le mandat autonome ?');

-- E030 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Combien prenez-vous pour vendre ?', 'Nos honoraires de vente sont publics, hors TVA (17 %), sur le prix net vendeur : 3 % en mandat exclusif, 4 % en semi-exclusif, 5 % en mandat simple et 1 % en mandat autonome.',
  'How much do you charge to sell?', 'Our sale fees are public, excluding VAT (17%), on the net seller price: 3% exclusive, 4% semi-exclusive, 5% simple and 1% autonomous.',
  'Was kostet ein Verkauf bei Ihnen?', 'Unsere Verkaufshonorare sind öffentlich, zzgl. MwSt. (17 %), auf den Nettoverkaufspreis: 3 % exklusiv, 4 % halb-exklusiv, 5 % einfach und 1 % autonom.',
  30, true, ARRAY['vos honoraires', 'votre commission', 'frais d''agence vente']::text[],
  '/legal/honoraires', 'Honoraires', 'Fees', 'Honorare',
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Combien prenez-vous pour vendre ?');

-- E031 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Combien de temps dure un mandat ?', 'À partir de deux mois, durée recommandée par MAPA Property. Il est reconductible tacitement et résiliable avec un préavis de 15 jours.',
  'How long does a mandate last?', 'From two months, the duration recommended by MAPA Property. It renews automatically and can be terminated with 15 days'' notice.',
  'Wie lange läuft ein Auftrag?', 'Ab zwei Monaten, die von MAPA Property empfohlene Dauer. Er verlängert sich stillschweigend und ist mit einer Frist von 15 Tagen kündbar.',
  31, true, ARRAY['durée du mandat', 'engagement', 'résilier']::text[],
  '/services/vendre', 'Nos mandats', 'Our mandates', 'Unsere Mandate',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Combien de temps dure un mandat ?');

-- E032 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quand les honoraires sont-ils dus ?', 'À la signature de l''acte authentique, sauf disposition contraire écrite. Les taux s''entendent hors TVA (17 %), sur le prix net vendeur.',
  'When are the fees due?', 'On signature of the notarial deed, unless otherwise agreed in writing. Rates are excluding VAT (17%), on the net seller price.',
  'Wann sind die Honorare fällig?', 'Bei Unterzeichnung der notariellen Urkunde, sofern nicht schriftlich anders vereinbart. Die Sätze verstehen sich zzgl. MwSt. (17 %) auf den Nettoverkaufspreis.',
  32, true, ARRAY['quand je paie', 'paiement de la commission']::text[],
  '/legal/honoraires', 'Honoraires', 'Fees', 'Honorare',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quand les honoraires sont-ils dus ?');

-- E033 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Dois-je payer quelque chose avant la vente ?', 'Pour une vente, nos honoraires sont dus à la signature de l''acte authentique, sauf disposition contraire écrite. Le Pack Vidéo, s''il est choisi, fait l''objet d''un devis.',
  'Do I pay anything before the sale?', 'For a sale, our fees are due on signature of the notarial deed, unless otherwise agreed in writing. The Video Pack, if chosen, is quoted separately.',
  'Muss ich vor dem Verkauf etwas bezahlen?', 'Bei einem Verkauf sind unsere Honorare bei Unterzeichnung der notariellen Urkunde fällig, sofern nicht schriftlich anders vereinbart. Das Videopaket wird, falls gewählt, gesondert angeboten.',
  33, true, ARRAY['frais à l''avance', 'acompte']::text[],
  '/legal/honoraires', 'Honoraires', 'Fees', 'Honorare',
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Dois-je payer quelque chose avant la vente ?');

-- E034 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce que le Pack Vidéo ?', 'Une option sur devis, quel que soit le mandat : tournage professionnel, drone si pertinent, post-production et fichiers haute définition pour les réseaux et le site.',
  'What is the Video Pack?', 'An option on quotation, whatever the mandate: professional filming, drone where relevant, post-production and high-definition files for social media and the website.',
  'Was ist das Videopaket?', 'Eine Option auf Angebot, unabhängig vom Auftrag: professioneller Dreh, Drohne falls sinnvoll, Nachbearbeitung und hochauflösende Dateien für soziale Netzwerke und Website.',
  34, true, ARRAY['vidéo du bien', 'drone', 'film']::text[],
  NULL, NULL, NULL, NULL,
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce que le Pack Vidéo ?');

-- E035 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Les honoraires sont-ils dus si je vends après la fin du mandat ?', 'Oui, si l''acquéreur a été présenté par MAPA Property et que la vente se conclut dans les 24 mois suivant la fin du mandat, comme le prévoient les conditions générales.',
  'Are fees due if I sell after the mandate ends?', 'Yes, if the buyer was introduced by MAPA Property and the sale is completed within 24 months after the mandate ends, as provided in the terms and conditions.',
  'Sind Honorare fällig, wenn ich nach Ende des Auftrags verkaufe?', 'Ja, wenn der Käufer von MAPA Property vorgestellt wurde und der Verkauf innerhalb von 24 Monaten nach Ende des Auftrags zustande kommt, wie in den AGB vorgesehen.',
  35, true, ARRAY['après le mandat', '24 mois']::text[],
  '/legal/honoraires', 'Honoraires', 'Fees', 'Honorare',
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Les honoraires sont-ils dus si je vends après la fin du mandat ?');

-- E036 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quels documents faut-il pour vendre ?', 'Pour préparer la vente, il faut notamment votre pièce d''identité, votre titre de propriété et le certificat de performance énergétique en cours de validité. Notre équipe vous remet la liste complète selon votre situation.',
  'Which documents do I need to sell?', 'To prepare the sale, we need in particular your identity document, your title deed and a valid energy performance certificate. Our team will give you the full list for your situation.',
  'Welche Unterlagen brauche ich für den Verkauf?', 'Für die Vorbereitung benötigen wir insbesondere Ihren Ausweis, Ihren Eigentumsnachweis und einen gültigen Energiepass. Unser Team gibt Ihnen die vollständige Liste für Ihre Situation.',
  36, true, ARRAY['papiers pour vendre', 'pièces à fournir vendeur']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Liste des pièces MAPA', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quels documents faut-il pour vendre ?');

-- E037 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Le certificat de performance énergétique est-il obligatoire ?', 'Oui. Le certificat de performance énergétique est obligatoire pour vendre ou louer un logement au Luxembourg. Il est valable 10 ans et sa classe doit figurer dans l''annonce.',
  'Is the energy performance certificate mandatory?', 'Yes. The energy performance certificate is mandatory to sell or let a home in Luxembourg. It is valid for 10 years and its class must appear in the listing.',
  'Ist der Energiepass Pflicht?', 'Ja. Der Energiepass ist in Luxemburg für den Verkauf und die Vermietung einer Wohnung Pflicht. Er ist 10 Jahre gültig und seine Klasse muss in der Anzeige stehen.',
  37, true, ARRAY['CPE', 'passeport énergétique']::text[],
  NULL, NULL, NULL, NULL,
  'Fiche bien MAPA', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Le certificat de performance énergétique est-il obligatoire ?');

-- E038 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Pourquoi demandez-vous ma pièce d''identité ?', 'La loi luxembourgeoise contre le blanchiment impose à l''agence de vérifier l''identité de ses clients, et l''origine des fonds pour les acquéreurs. Ces informations restent strictement confidentielles.',
  'Why do you ask for my ID?', 'Luxembourg anti-money-laundering law requires the agency to verify its clients'' identity, and the source of funds for buyers. This information remains strictly confidential.',
  'Warum benötigen Sie meinen Ausweis?', 'Das luxemburgische Geldwäschegesetz verpflichtet die Agentur, die Identität ihrer Kunden und bei Käufern die Herkunft der Mittel zu prüfen. Diese Angaben bleiben streng vertraulich.',
  38, true, ARRAY['KYC', 'blanchiment', 'origine des fonds']::text[],
  NULL, NULL, NULL, NULL,
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Pourquoi demandez-vous ma pièce d''identité ?');

-- E039 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Puis-je vendre sans que mon bien soit publié ?', 'Oui. MAPA Property propose une vente off-market : votre bien n''est présenté qu''à des acquéreurs qualifiés, après signature d''un accord de confidentialité, et n''est jamais publié en ligne.',
  'Can I sell without my property being published?', 'Yes. MAPA Property offers off-market sales: your property is presented only to qualified buyers, after a confidentiality agreement is signed, and is never published online.',
  'Kann ich verkaufen, ohne dass meine Immobilie veröffentlicht wird?', 'Ja. MAPA Property bietet den Off-Market-Verkauf an: Ihre Immobilie wird nur qualifizierten Käufern nach Unterzeichnung einer Vertraulichkeitsvereinbarung vorgestellt und nie online veröffentlicht.',
  39, true, ARRAY['vente discrète', 'confidentielle']::text[],
  '/off-market', 'Off-market', 'Off-market', 'Off-Market',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Puis-je vendre sans que mon bien soit publié ?');

-- E040 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Combien de temps faut-il pour vendre ?', 'Le délai dépend du bien, du prix et du marché. Notre équipe vous donne une estimation réaliste après la visite du bien.',
  'How long does it take to sell?', 'It depends on the property, the price and the market. Our team will give you a realistic estimate after visiting the property.',
  'Wie lange dauert ein Verkauf?', 'Das hängt von der Immobilie, dem Preis und dem Markt ab. Unser Team gibt Ihnen nach der Besichtigung eine realistische Einschätzung.',
  40, true, ARRAY['délai de vente', 'vendre vite']::text[],
  '/services/estimer', 'Estimer mon bien', 'Value my property', 'Immobilie bewerten',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Combien de temps faut-il pour vendre ?');

-- E041 (Vendre)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je suis dans une situation particulière (succession, divorce, urgence)', 'Chaque situation demande un accompagnement adapté. Décrivez-la dans le formulaire de contact : notre équipe vous recontacte en toute confidentialité.',
  'I am in a specific situation (inheritance, divorce, urgency)', 'Every situation needs tailored support. Describe it in the contact form and our team will contact you in complete confidence.',
  'Ich bin in einer besonderen Situation (Erbschaft, Scheidung, Dringlichkeit)', 'Jede Situation verlangt eine passende Begleitung. Beschreiben Sie sie im Kontaktformular, unser Team meldet sich vertraulich bei Ihnen.',
  41, true, ARRAY['succession', 'héritage', 'divorce', 'séparation']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je suis dans une situation particulière (succession, divorce, urgence)');

-- E042 (Estimer)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Combien vaut mon bien ?', 'Le simulateur du site vous donne gratuitement une fourchette indicative. Pour une valeur précise, la visite reste indispensable : elle est gratuite dans le cadre d''un mandat de vente potentiel.',
  'How much is my property worth?', 'The website''s simulator gives you a free indicative range. For a precise value, a visit is essential: it is free as part of a potential sale mandate.',
  'Was ist meine Immobilie wert?', 'Der Rechner der Website gibt Ihnen kostenlos eine Richtspanne. Für einen genauen Wert ist eine Besichtigung unerlässlich: Sie ist im Rahmen eines möglichen Verkaufsauftrags kostenlos.',
  42, true, ARRAY['valeur de ma maison', 'estimation']::text[],
  '/services/estimer', 'Estimer mon bien', 'Value my property', 'Immobilie bewerten',
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Combien vaut mon bien ?');

-- E043 (Estimer)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'L''estimation est-elle payante ?', 'L''estimation indicative en ligne est gratuite. L''estimation avec visite et rapport écrit est gratuite dans le cadre d''un mandat de vente potentiel, et sur devis en dehors.',
  'Is the valuation free?', 'The indicative online valuation is free. A valuation with a visit and a written report is free as part of a potential sale mandate, and on quotation otherwise.',
  'Ist die Bewertung kostenpflichtig?', 'Die Online-Richtbewertung ist kostenlos. Die Bewertung mit Besichtigung und schriftlichem Bericht ist im Rahmen eines möglichen Verkaufsauftrags kostenlos, sonst auf Angebot.',
  43, true, ARRAY['gratuit', 'prix de l''estimation']::text[],
  '/services/estimer', 'Estimer mon bien', 'Value my property', 'Immobilie bewerten',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'L''estimation est-elle payante ?');

-- E044 (Estimer)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Comment fonctionne votre simulateur ?', 'Le modèle est calibré sur les données de l''Observatoire de l''Habitat. Il donne une fourchette indicative ; la visite la rend juste.',
  'How does your simulator work?', 'The model is calibrated on Observatoire de l''Habitat data. It gives an indicative range; the visit makes it accurate.',
  'Wie funktioniert Ihr Rechner?', 'Das Modell ist auf Daten des Observatoire de l''Habitat kalibriert. Es liefert eine Richtspanne; die Besichtigung macht sie genau.',
  44, true, ARRAY['fiabilité', 'méthode d''estimation']::text[],
  '/services/estimer', 'Estimer mon bien', 'Value my property', 'Immobilie bewerten',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Comment fonctionne votre simulateur ?');

-- E045 (Estimer)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quel est le prix au m² dans ma commune ?', 'Les prix varient fortement d''une rue et d''un bien à l''autre, je ne donne donc pas de chiffre général. Le simulateur vous donne une fourchette pour votre bien, et notre équipe une estimation précise sur place.',
  'What is the price per m² in my municipality?', 'Prices vary greatly from one street and one property to another, so I do not give a general figure. The simulator gives you a range for your property, and our team a precise valuation on site.',
  'Wie hoch ist der Quadratmeterpreis in meiner Gemeinde?', 'Die Preise schwanken stark je nach Straße und Objekt, daher nenne ich keine allgemeine Zahl. Der Rechner gibt Ihnen eine Spanne für Ihre Immobilie, unser Team eine genaue Bewertung vor Ort.',
  45, true, ARRAY['prix du m²', 'prix moyen']::text[],
  '/services/estimer', 'Estimer mon bien', 'Value my property', 'Immobilie bewerten',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quel est le prix au m² dans ma commune ?');

-- E046 (Estimer)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Les prix vont-ils baisser ou monter ?', 'Je ne fais pas de prévision de marché. La page Marchés actifs présente les marchés suivis par l''agence, et notre équipe peut analyser votre projet avec vous.',
  'Will prices go up or down?', 'I do not make market forecasts. The Active markets page presents the markets the agency follows, and our team can analyse your project with you.',
  'Werden die Preise steigen oder fallen?', 'Ich mache keine Marktprognosen. Die Seite Aktive Märkte stellt die von der Agentur beobachteten Märkte vor, und unser Team analysiert Ihr Vorhaben gerne mit Ihnen.',
  46, true, ARRAY['évolution du marché', 'bon moment pour acheter']::text[],
  '/services/marches-actifs', 'Marchés actifs', 'Active markets', 'Aktive Märkte',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Les prix vont-ils baisser ou monter ?');

-- E047 (Estimer)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'J''ai fait une estimation en ligne, et maintenant ?', 'Vous avez reçu une fourchette indicative par e-mail. Pour une valeur précise, notre équipe peut visiter le bien : c''est gratuit dans le cadre d''un mandat de vente potentiel.',
  'I did an online valuation, what next?', 'You received an indicative range by email. For a precise value, our team can visit the property: it is free as part of a potential sale mandate.',
  'Ich habe eine Online-Bewertung gemacht, wie geht es weiter?', 'Sie haben per E-Mail eine Richtspanne erhalten. Für einen genauen Wert kann unser Team die Immobilie besichtigen: im Rahmen eines möglichen Verkaufsauftrags kostenlos.',
  47, true, ARRAY['suite de l''estimation']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Page Honoraires', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'J''ai fait une estimation en ligne, et maintenant ?');

-- E048 (Estimer)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je n''ai pas reçu le résultat de mon estimation', 'Vérifiez vos courriers indésirables. Si vous ne trouvez rien, écrivez-nous depuis le formulaire de contact : nous vous renvoyons le résultat.',
  'I did not receive my valuation result', 'Please check your spam folder. If you cannot find it, write to us through the contact form and we will send the result again.',
  'Ich habe das Ergebnis meiner Bewertung nicht erhalten', 'Bitte prüfen Sie Ihren Spam-Ordner. Wenn Sie nichts finden, schreiben Sie uns über das Kontaktformular, wir senden Ihnen das Ergebnis erneut.',
  48, true, ARRAY['pas reçu le mail']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je n''ai pas reçu le résultat de mon estimation');

-- E049 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je cherche un bien', 'Avec plaisir. Dites-moi la commune, le type de bien et votre budget, et je vous montre les biens disponibles.',
  'I am looking for a property', 'With pleasure. Tell me the municipality, the type of property and your budget, and I will show you the available properties.',
  'Ich suche eine Immobilie', 'Sehr gerne. Nennen Sie mir die Gemeinde, die Art der Immobilie und Ihr Budget, und ich zeige Ihnen die verfügbaren Objekte.',
  49, true, ARRAY['je cherche un appartement', 'une maison', 'acheter']::text[],
  '/biens', 'Voir les biens', 'View properties', 'Immobilien ansehen',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je cherche un bien');

-- E050 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quels frais prévoir en plus du prix d''achat ?', 'Au Luxembourg, comptez environ 6 % de droits d''enregistrement, 1 % de droit de transcription et environ 1 % d''honoraires de notaire, soit un total indicatif proche de 8 % du prix.',
  'What costs should I plan on top of the purchase price?', 'In Luxembourg, allow about 6% registration duty, 1% transcription duty and about 1% notary fees, an indicative total of around 8% of the price.',
  'Welche Kosten kommen zum Kaufpreis hinzu?', 'In Luxemburg rechnen Sie mit etwa 6 % Eintragungsgebühren, 1 % Umschreibungsgebühr und etwa 1 % Notarkosten, insgesamt rund 8 % des Preises als Richtwert.',
  50, true, ARRAY['frais de notaire', 'droits d''enregistrement']::text[],
  NULL, NULL, NULL, NULL,
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quels frais prévoir en plus du prix d''achat ?');

-- E051 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce que le Bëllegen Akt ?', 'Un crédit d''impôt sur les droits d''enregistrement pour l''achat de votre résidence principale. Depuis le 16 juillet 2026, il est porté à 45 000 euros par acquéreur.',
  'What is the Bëllegen Akt?', 'A tax credit on registration duties when buying your main residence. Since 16 July 2026, it has been raised to 45,000 euros per buyer.',
  'Was ist der Bëllegen Akt?', 'Eine Steuergutschrift auf die Eintragungsgebühren beim Kauf Ihres Hauptwohnsitzes. Seit dem 16. Juli 2026 beträgt sie 45.000 Euro pro Käufer.',
  51, true, ARRAY['crédit d''impôt achat', 'aide résidence principale']::text[],
  NULL, NULL, NULL, NULL,
  'gouvernement.lu, 16/07/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce que le Bëllegen Akt ?');

-- E052 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Combien puis-je emprunter ?', 'Le simulateur de capacité d''emprunt et le simulateur de financement donnent une première indication, avec les taux du marché luxembourgeois. L''accord final reste celui de la banque.',
  'How much can I borrow?', 'The borrowing capacity and financing simulators give a first indication, using Luxembourg market rates. The final decision remains the bank''s.',
  'Wie viel kann ich leihen?', 'Der Kreditrechner und der Finanzierungsrechner geben eine erste Orientierung mit den Zinsen des luxemburgischen Marktes. Die endgültige Zusage gibt die Bank.',
  52, true, ARRAY['capacité d''emprunt', 'prêt', 'crédit']::text[],
  '/services/simulateurs', 'Simulateurs', 'Simulators', 'Rechner',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Combien puis-je emprunter ?');

-- E053 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quels sont les taux d''intérêt actuels ?', 'Les taux évoluent chaque jour, je ne cite donc pas de chiffre. Les simulateurs du site utilisent les taux du marché luxembourgeois.',
  'What are current interest rates?', 'Rates change every day, so I do not quote a figure. The website''s simulators use Luxembourg market rates.',
  'Wie hoch sind die aktuellen Zinsen?', 'Die Zinsen ändern sich täglich, daher nenne ich keine Zahl. Die Rechner der Website verwenden die Zinsen des luxemburgischen Marktes.',
  53, true, ARRAY['taux', 'taux du crédit', 'Zinssatz']::text[],
  '/services/simulateurs', 'Simulateurs', 'Simulators', 'Rechner',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quels sont les taux d''intérêt actuels ?');

-- E054 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Dois-je payer des honoraires si j''achète un bien chez vous ?', 'Pour un bien vendu par MAPA Property, nos honoraires sont prévus dans le mandat signé avec le vendeur. Si vous nous confiez votre propre recherche, ce sont les honoraires du mandat de recherche qui s''appliquent.',
  'Do I pay fees if I buy a property through you?', 'For a property sold by MAPA Property, our fees are set out in the mandate signed with the seller. If you entrust us with your own search, the search mandate fees apply.',
  'Zahle ich Honorare, wenn ich eine Immobilie bei Ihnen kaufe?', 'Bei einer von MAPA Property verkauften Immobilie sind unsere Honorare im mit dem Verkäufer unterzeichneten Auftrag geregelt. Wenn Sie uns Ihre eigene Suche anvertrauen, gelten die Honorare des Suchauftrags.',
  54, true, ARRAY['frais d''agence acheteur', 'qui paie la commission']::text[],
  '/legal/honoraires', 'Honoraires', 'Fees', 'Honorare',
  'Julien, 12/11/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Dois-je payer des honoraires si j''achète un bien chez vous ?');

-- E055 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Comment visiter un bien ?', 'Depuis la fiche du bien, cliquez sur le bouton de demande : notre équipe vous propose un créneau de visite.',
  'How can I view a property?', 'On the property page, click the request button: our team will offer you a viewing slot.',
  'Wie kann ich eine Immobilie besichtigen?', 'Klicken Sie auf der Objektseite auf die Anfrage-Schaltfläche: unser Team schlägt Ihnen einen Besichtigungstermin vor.',
  55, true, ARRAY['visite', 'voir le bien']::text[],
  '/biens', 'Voir les biens', 'View properties', 'Immobilien ansehen',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Comment visiter un bien ?');

-- E056 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Puis-je faire une offre ?', 'Oui. Contactez-nous depuis la fiche du bien : notre équipe vous accompagne dans la rédaction d''une offre d''achat écrite et la transmet au vendeur.',
  'Can I make an offer?', 'Yes. Contact us from the property page: our team will help you draft a written purchase offer and pass it on to the seller.',
  'Kann ich ein Angebot machen?', 'Ja. Kontaktieren Sie uns über die Objektseite: unser Team hilft Ihnen, ein schriftliches Kaufangebot zu verfassen, und leitet es an den Verkäufer weiter.',
  56, true, ARRAY['proposer un prix', 'offre d''achat']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Offre d''achat MAPA', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Puis-je faire une offre ?');

-- E057 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce qu''un compromis de vente ?', 'C''est le contrat signé entre le vendeur et l''acquéreur avant l''acte notarié. Il fixe le bien, le prix, les conditions suspensives et la date de l''acte. Notre équipe vous accompagne à chaque étape.',
  'What is a sale agreement (compromis)?', 'It is the contract signed between seller and buyer before the notarial deed. It sets out the property, the price, the conditions precedent and the date of the deed. Our team supports you at every step.',
  'Was ist ein Vorvertrag (compromis) ?', 'Das ist der Vertrag zwischen Verkäufer und Käufer vor der notariellen Urkunde. Er legt Objekt, Preis, aufschiebende Bedingungen und Datum der Urkunde fest. Unser Team begleitet Sie bei jedem Schritt.',
  57, true, ARRAY['compromis', 'promesse', 'avant-contrat']::text[],
  NULL, NULL, NULL, NULL,
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce qu''un compromis de vente ?');

-- E058 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je ne trouve pas ce que je cherche', 'Au Luxembourg comme en Europe, de plus en plus de biens se vendent en off-market : ils ne sont jamais publiés nulle part, et on ne peut y accéder que par un mandat de recherche précis. Confiez-nous le vôtre : nous activons notre réseau et ne vous présentons que des biens qui correspondent vraiment à votre projet.',
  'I cannot find what I am looking for', 'In Luxembourg as in Europe, more and more properties are sold off-market: they are never published anywhere, and can only be reached through a precise search mandate. Entrust yours to us: we activate our network and only present properties that truly match your project.',
  'Ich finde nicht, was ich suche', 'In Luxemburg wie in Europa werden immer mehr Immobilien off-market verkauft: Sie werden nirgends veröffentlicht und sind nur über einen genauen Suchauftrag zugänglich. Vertrauen Sie uns Ihren an: Wir aktivieren unser Netzwerk und stellen Ihnen nur Objekte vor, die wirklich zu Ihrem Vorhaben passen.',
  58, true, ARRAY['rien ne correspond', 'aucun bien', 'pas de résultat']::text[],
  '/mandats/recherche', 'Mandat de recherche', 'Search mandate', 'Suchauftrag',
  'Julien, 12/11/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je ne trouve pas ce que je cherche');

-- E059 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Puis-je être prévenu des nouveaux biens ?', 'Laissez votre recherche dans le formulaire de contact : notre équipe vous prévient dès qu''un bien correspond.',
  'Can I be notified of new properties?', 'Leave your search in the contact form: our team will let you know as soon as a property matches.',
  'Kann ich über neue Objekte informiert werden?', 'Hinterlassen Sie Ihre Suche im Kontaktformular: unser Team informiert Sie, sobald ein passendes Objekt verfügbar ist.',
  59, true, ARRAY['alerte', 'nouvelles annonces']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Puis-je être prévenu des nouveaux biens ?');

-- E060 (Acheter)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Pourquoi demandez-vous l''origine de mes fonds ?', 'La loi luxembourgeoise contre le blanchiment impose de vérifier l''identité de l''acquéreur et l''origine des fonds. Ces informations restent strictement confidentielles.',
  'Why do you ask about the source of my funds?', 'Luxembourg anti-money-laundering law requires us to verify the buyer''s identity and the source of funds. This information remains strictly confidential.',
  'Warum fragen Sie nach der Herkunft meiner Mittel?', 'Das luxemburgische Geldwäschegesetz verlangt die Prüfung der Identität des Käufers und der Herkunft der Mittel. Diese Angaben bleiben streng vertraulich.',
  60, true, ARRAY['justificatif fonds', 'blanchiment acheteur']::text[],
  NULL, NULL, NULL, NULL,
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Pourquoi demandez-vous l''origine de mes fonds ?');

-- E061 (Mandat de recherche)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce qu''un mandat de recherche ?', 'Vous confiez votre recherche à MAPA Property, qui travaille exclusivement sur votre projet : définition du besoin, réseau, biens hors marché, visites et négociation.',
  'What is a search mandate?', 'You entrust your search to MAPA Property, which works exclusively on your project: defining the need, network, off-market properties, viewings and negotiation.',
  'Was ist ein Suchauftrag?', 'Sie vertrauen Ihre Suche MAPA Property an, die ausschließlich an Ihrem Vorhaben arbeitet: Bedarfsdefinition, Netzwerk, Off-Market-Objekte, Besichtigungen und Verhandlung.',
  61, true, ARRAY['chasseur immobilier', 'buyer''s agent']::text[],
  '/mandats/recherche', 'Mandat de recherche', 'Search mandate', 'Suchauftrag',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce qu''un mandat de recherche ?');

-- E062 (Mandat de recherche)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Combien coûte un mandat de recherche ?', 'Au Luxembourg, 3 % à 5 % hors TVA du prix d''acquisition. En Europe, France comprise, 3 % à 8 % hors TVA selon la complexité et le pays. Ailleurs, sur devis défini au mandat.',
  'How much does a search mandate cost?', 'In Luxembourg, 3% to 5% excluding VAT of the purchase price. In Europe, including France, 3% to 8% excluding VAT depending on complexity and country. Elsewhere, on quotation set in the mandate.',
  'Was kostet ein Suchauftrag?', 'In Luxemburg 3 % bis 5 % zzgl. MwSt. des Kaufpreises. In Europa, Frankreich eingeschlossen, 3 % bis 8 % zzgl. MwSt. je nach Komplexität und Land. Anderswo auf Angebot, im Auftrag festgelegt.',
  62, true, ARRAY['prix chasseur', 'honoraires recherche']::text[],
  '/mandats/recherche', 'Mandat de recherche', 'Search mandate', 'Suchauftrag',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Combien coûte un mandat de recherche ?');

-- E063 (Mandat de recherche)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'À quoi sert l''avance sur frais ?', 'Elle formalise l''engagement réciproque : l''agence travaille exclusivement sur votre projet. Elle est de 250 euros hors TVA au Luxembourg, à partir de 500 euros hors TVA dans les régions limitrophes jusqu''à 100 km, sur devis ailleurs, et entièrement déduite des honoraires si la transaction se conclut avec MAPA Property.',
  'What is the cost advance for?', 'It formalises the mutual commitment: the agency works exclusively on your project. It is 250 euros excluding VAT in Luxembourg, from 500 euros excluding VAT in neighbouring regions up to 100 km, on quotation elsewhere, and fully deducted from the fees if the transaction is completed with MAPA Property.',
  'Wozu dient der Kostenvorschuss?', 'Er besiegelt das gegenseitige Engagement: Die Agentur arbeitet ausschließlich an Ihrem Vorhaben. Er beträgt 250 Euro zzgl. MwSt. in Luxemburg, ab 500 Euro zzgl. MwSt. in den Grenzregionen bis 100 km, anderswo auf Angebot, und wird vollständig auf die Honorare angerechnet, wenn das Geschäft mit MAPA Property zustande kommt.',
  63, true, ARRAY['avance', 'acompte recherche', '250 euros']::text[],
  '/mandats/recherche', 'Mandat de recherche', 'Search mandate', 'Suchauftrag',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'À quoi sert l''avance sur frais ?');

-- E064 (Mandat de recherche)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'L''avance est-elle remboursée si j''abandonne ?', 'Non. L''avance est acquise si vous renoncez à votre projet. Elle est entièrement déduite des honoraires si la transaction se conclut avec MAPA Property.',
  'Is the advance refunded if I give up?', 'No. The advance is retained if you abandon your project. It is fully deducted from the fees if the transaction is completed with MAPA Property.',
  'Wird der Vorschuss erstattet, wenn ich aufgebe?', 'Nein. Der Vorschuss verbleibt, wenn Sie Ihr Vorhaben aufgeben. Er wird vollständig auf die Honorare angerechnet, wenn das Geschäft mit MAPA Property zustande kommt.',
  64, true, ARRAY['remboursement avance', 'je change d''avis']::text[],
  '/mandats/recherche', 'Mandat de recherche', 'Search mandate', 'Suchauftrag',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'L''avance est-elle remboursée si j''abandonne ?');

-- E065 (Mandat de recherche)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'La recherche inclut-elle les biens hors marché ?', 'Oui. De plus en plus de biens se vendent en off-market, sans jamais être publiés : le mandat de recherche active le réseau confidentiel de l''agence, agences partenaires, propriétaires directs et sources off-market.',
  'Does the search include off-market properties?', 'Yes. More and more properties are sold off-market without ever being published: the search mandate activates the agency''s confidential network, partner agencies, direct owners and off-market sources.',
  'Umfasst die Suche auch Off-Market-Objekte?', 'Ja. Immer mehr Immobilien werden off-market verkauft, ohne je veröffentlicht zu werden: Der Suchauftrag aktiviert das vertrauliche Netzwerk der Agentur, Partneragenturen, direkte Eigentümer und Off-Market-Quellen.',
  65, true, ARRAY['off-market recherche', 'biens non publiés']::text[],
  '/mandats/recherche', 'Mandat de recherche', 'Search mandate', 'Suchauftrag',
  'Julien, 12/11/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'La recherche inclut-elle les biens hors marché ?');

-- E066 (Mandat de recherche)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Que se passe-t-il après la fin du mandat de recherche ?', 'Les conditions générales prévoient une clause de survie : les honoraires restent dus si vous achetez, après la fin du mandat, un bien présenté par MAPA Property pendant celui-ci. Le détail figure dans les conditions générales.',
  'What happens after the search mandate ends?', 'The terms and conditions include a survival clause: fees remain due if, after the mandate ends, you buy a property presented by MAPA Property during it. Details are in the terms and conditions.',
  'Was passiert nach Ende des Suchauftrags?', 'Die AGB enthalten eine Nachwirkungsklausel: Die Honorare bleiben fällig, wenn Sie nach Ende des Auftrags eine Immobilie kaufen, die MAPA Property während des Auftrags vorgestellt hat. Einzelheiten stehen in den AGB.',
  66, true, ARRAY['clause de survie', 'après le mandat']::text[],
  '/legal/cgv', 'Conditions générales', 'Terms and conditions', 'AGB',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Que se passe-t-il après la fin du mandat de recherche ?');

-- E067 (Mandat de recherche)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Voir les recherches de vos clients', 'La page des recherches présente, de façon anonyme, les biens que nos clients cherchent. Si vous avez un bien qui correspond, contactez-nous depuis la recherche concernée.',
  'See your clients'' searches', 'The searches page presents, anonymously, the properties our clients are looking for. If you own a matching property, contact us from the relevant search.',
  'Suchaufträge Ihrer Kunden ansehen', 'Die Seite der Suchaufträge zeigt anonym, welche Immobilien unsere Kunden suchen. Wenn Sie ein passendes Objekt besitzen, kontaktieren Sie uns über den jeweiligen Suchauftrag.',
  67, true, ARRAY['recherches en cours', 'j''ai un bien qui correspond']::text[],
  '/recherches', 'Recherches de nos clients', 'Our clients'' searches', 'Suchaufträge unserer Kunden',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Voir les recherches de vos clients');

-- E068 (Location)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je veux louer mon bien', 'Avec plaisir. MAPA Property assure la mise en location de votre bien, état des lieux inclus, et peut aussi s''occuper des entrées et sorties de vos locataires.',
  'I want to let my property', 'With pleasure. MAPA Property handles letting your property, inventory included, and can also manage your tenants'' move-ins and move-outs.',
  'Ich möchte meine Immobilie vermieten', 'Sehr gerne. MAPA Property übernimmt die Vermietung Ihrer Immobilie, Übergabeprotokoll inklusive, und kann sich auch um Ein- und Auszüge Ihrer Mieter kümmern.',
  68, true, ARRAY['mettre en location', 'bailleur']::text[],
  '/services/louer', 'Louer mon bien', 'Let my property', 'Meine Immobilie vermieten',
  'Julien, 12/11/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je veux louer mon bien');

-- E069 (Location)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quels sont les honoraires de mise en location ?', 'Un mois de loyer hors TVA, état des lieux inclus. Conformément à la loi luxembourgeoise sur le bail d''habitation, ces honoraires sont partagés par moitié entre le bailleur et le locataire.',
  'What are the letting fees?', 'One month''s rent excluding VAT, inventory included. In accordance with Luxembourg residential lease law, these fees are split equally between landlord and tenant.',
  'Wie hoch sind die Vermietungshonorare?', 'Eine Monatsmiete zzgl. MwSt., Übergabeprotokoll inklusive. Gemäß dem luxemburgischen Wohnmietgesetz werden diese Honorare je zur Hälfte zwischen Vermieter und Mieter geteilt.',
  69, true, ARRAY['frais de location', 'commission location']::text[],
  '/legal/honoraires', 'Honoraires', 'Fees', 'Honorare',
  'Loi du 23/07/2024, Mémorial A 311', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quels sont les honoraires de mise en location ?');

-- E070 (Location)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Proposez-vous la gestion locative ?', 'MAPA Property n''encaisse pas les loyers. Nous prenons en charge les entrées et les sorties de vos locataires, avec tous les états des lieux, et nous pouvons vous mettre en relation avec des entreprises si des travaux sont nécessaires. Cette gestion coûte de 6 % à 8 % hors TVA du loyer mensuel, selon les services inclus.',
  'Do you offer property management?', 'MAPA Property does not collect rents. We handle your tenants'' move-ins and move-outs, with all inventories, and can put you in touch with contractors if work is needed. This service costs 6% to 8% excluding VAT of the monthly rent, depending on the services included.',
  'Bieten Sie Mietverwaltung an?', 'MAPA Property zieht keine Mieten ein. Wir übernehmen Ein- und Auszüge Ihrer Mieter mit allen Übergabeprotokollen und vermitteln Ihnen bei Bedarf Handwerksbetriebe. Dieser Service kostet 6 % bis 8 % zzgl. MwSt. der Monatsmiete, je nach enthaltenen Leistungen.',
  70, true, ARRAY['gestion', 'gérer mon bien', 'encaisser les loyers', 'état des lieux', 'travaux']::text[],
  '/services/louer', 'Louer mon bien', 'Let my property', 'Meine Immobilie vermieten',
  'Julien, 12/11/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Proposez-vous la gestion locative ?');

-- E071 (Location)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quel est le loyer maximum autorisé au Luxembourg ?', 'Le loyer annuel ne peut pas dépasser 5 % du capital investi dans le logement (loi du 21 septembre 2006 sur le bail à usage d''habitation).',
  'What is the maximum rent allowed in Luxembourg?', 'Annual rent may not exceed 5% of the capital invested in the home (law of 21 September 2006 on residential leases).',
  'Wie hoch darf die Miete in Luxemburg höchstens sein?', 'Die Jahresmiete darf 5 % des in die Wohnung investierten Kapitals nicht übersteigen (Gesetz vom 21. September 2006 über Wohnraummietverträge).',
  71, true, ARRAY['plafond loyer', '5 %']::text[],
  NULL, NULL, NULL, NULL,
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quel est le loyer maximum autorisé au Luxembourg ?');

-- E072 (Location)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Comment sont choisis les locataires ?', 'Par une sélection rigoureuse sur dossier complet, avec les vérifications d''identité et de lutte contre le blanchiment, avant la signature d''un contrat de bail conforme.',
  'How are tenants selected?', 'Through careful selection based on a complete file, with identity and anti-money-laundering checks, before a compliant lease is signed.',
  'Wie werden die Mieter ausgewählt?', 'Durch eine sorgfältige Auswahl anhand vollständiger Unterlagen, mit Identitäts- und Geldwäscheprüfungen, vor der Unterzeichnung eines rechtskonformen Mietvertrags.',
  72, true, ARRAY['sélection locataire', 'dossier locataire']::text[],
  '/services/louer', 'Louer mon bien', 'Let my property', 'Meine Immobilie vermieten',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Comment sont choisis les locataires ?');

-- E073 (Location)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je cherche une location', 'Dites-moi la commune, le type de bien et votre budget mensuel, et je vous montre les biens à louer.',
  'I am looking for a rental', 'Tell me the municipality, the type of property and your monthly budget, and I will show you the properties to rent.',
  'Ich suche eine Mietwohnung', 'Nennen Sie mir die Gemeinde, die Art der Immobilie und Ihr monatliches Budget, und ich zeige Ihnen die Mietobjekte.',
  73, true, ARRAY['louer un appartement', 'location à']::text[],
  '/biens?transaction=rent', 'Biens à louer', 'Properties to rent', 'Mietobjekte',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je cherche une location');

-- E074 (Location)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quels documents pour louer ?', 'Il faut notamment une pièce d''identité et des justificatifs de revenus. Notre équipe vous remet la liste complète selon votre situation.',
  'Which documents do I need to rent?', 'You will need in particular an identity document and proof of income. Our team will give you the full list for your situation.',
  'Welche Unterlagen brauche ich zum Mieten?', 'Sie benötigen insbesondere einen Ausweis und Einkommensnachweise. Unser Team gibt Ihnen die vollständige Liste für Ihre Situation.',
  74, true, ARRAY['dossier locataire', 'papiers location']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Liste des pièces MAPA', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quels documents pour louer ?');

-- E075 (Location)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Puis-je louer avec option d''achat ?', 'Ce type de projet se traite au cas par cas. Décrivez-le dans le formulaire de contact : notre équipe vous recontacte.',
  'Can I rent with an option to buy?', 'This kind of project is handled case by case. Describe it in the contact form and our team will get back to you.',
  'Kann ich mit Kaufoption mieten?', 'Solche Vorhaben werden im Einzelfall geprüft. Beschreiben Sie es im Kontaktformular, unser Team meldet sich bei Ihnen.',
  75, true, ARRAY['location-accession', 'option d''achat']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Puis-je louer avec option d''achat ?');

-- E076 (Off-market et ARCOVA)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce que l''off-market ?', 'Des biens présentés en toute confidentialité, jamais publiés en ligne, réservés à des acquéreurs qualifiés.',
  'What is off-market?', 'Properties presented in complete confidentiality, never published online, reserved for qualified buyers.',
  'Was bedeutet Off-Market?', 'Immobilien, die streng vertraulich präsentiert, nie online veröffentlicht und qualifizierten Käufern vorbehalten werden.',
  76, true, ARRAY['biens confidentiels', 'non publiés']::text[],
  '/off-market', 'Off-market', 'Off-market', 'Off-Market',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce que l''off-market ?');

-- E077 (Off-market et ARCOVA)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Comment accéder aux biens off-market ?', 'En trois étapes : une demande motivée, la vérification de votre capacité financière avec la signature d''un accord de confidentialité, puis la transmission du dossier complet et les visites.',
  'How can I access off-market properties?', 'In three steps: a reasoned request, verification of your financial capacity with signature of a confidentiality agreement, then the full file and viewings.',
  'Wie erhalte ich Zugang zu Off-Market-Objekten?', 'In drei Schritten: eine begründete Anfrage, die Prüfung Ihrer Finanzkraft mit Unterzeichnung einer Vertraulichkeitsvereinbarung, dann das vollständige Dossier und die Besichtigungen.',
  77, true, ARRAY['voir les biens confidentiels']::text[],
  '/off-market', 'Off-market', 'Off-market', 'Off-Market',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Comment accéder aux biens off-market ?');

-- E078 (Off-market et ARCOVA)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Pourquoi ne puis-je pas voir les photos d''un bien off-market ?', 'Les photos complètes ne sont accessibles qu''après signature de l''accord de confidentialité, pour protéger le vendeur.',
  'Why can''t I see the photos of an off-market property?', 'Full photos are only available after the confidentiality agreement is signed, to protect the seller.',
  'Warum sehe ich keine Fotos eines Off-Market-Objekts?', 'Die vollständigen Fotos sind erst nach Unterzeichnung der Vertraulichkeitsvereinbarung zugänglich, zum Schutz des Verkäufers.',
  78, true, ARRAY['photos floues', 'pas de photos']::text[],
  '/off-market', 'Off-market', 'Off-market', 'Off-Market',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Pourquoi ne puis-je pas voir les photos d''un bien off-market ?');

-- E079 (Off-market et ARCOVA)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qu''est-ce qu''ARCOVA ?', 'ARCOVA est l''espace confidentiel réservé aux clients qualifiés sous mandat MAPA Property, avec vérifications d''identité et accord de confidentialité avant tout accès. La plateforme sera très prochainement disponible ; ces conditions s''appliquent déjà sur demande directe.',
  'What is ARCOVA?', 'ARCOVA is the confidential space reserved for qualified clients under a MAPA Property mandate, with identity checks and a confidentiality agreement before any access. The platform will be available very soon; these conditions already apply on direct request.',
  'Was ist ARCOVA?', 'ARCOVA ist der vertrauliche Bereich für qualifizierte Kunden mit Auftrag bei MAPA Property, mit Identitätsprüfung und Vertraulichkeitsvereinbarung vor jedem Zugang. Die Plattform ist in Kürze verfügbar; diese Bedingungen gelten bereits auf direkte Anfrage.',
  79, true, ARRAY['espace privé', 'plateforme confidentielle']::text[],
  '/off-market/arcova', 'ARCOVA', 'ARCOVA', 'ARCOVA',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qu''est-ce qu''ARCOVA ?');

-- E080 (International)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Intervenez-vous hors du Luxembourg ?', 'Oui. MAPA Property intervient directement sur des biens situés en France, en Allemagne et en Italie grâce à la carte professionnelle européenne. Ailleurs, elle agit comme broker avec une agence locale habilitée et reste votre interlocuteur unique.',
  'Do you work outside Luxembourg?', 'Yes. MAPA Property works directly on properties in France, Germany and Italy thanks to the European Professional Card. Elsewhere, it acts as a broker with a licensed local agency and remains your single point of contact.',
  'Sind Sie auch außerhalb Luxemburgs tätig?', 'Ja. MAPA Property ist dank des Europäischen Berufsausweises direkt bei Immobilien in Frankreich, Deutschland und Italien tätig. Anderswo handelt sie als Broker mit einer zugelassenen lokalen Agentur und bleibt Ihr einziger Ansprechpartner.',
  80, true, ARRAY['étranger', 'France', 'international']::text[],
  '/services/broker-international', 'Broker international', 'International broker', 'Internationaler Broker',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Intervenez-vous hors du Luxembourg ?');

-- E081 (International)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Dans quels pays intervenez-vous ?', 'Directement au Luxembourg, ainsi qu''en France, en Allemagne et en Italie grâce à la carte professionnelle européenne. Ailleurs, sur demande, avec des agences locales habilitées ; la page Marchés actifs présente la couverture régulière.',
  'Which countries do you work in?', 'Directly in Luxembourg, and in France, Germany and Italy thanks to the European Professional Card. Elsewhere, on request, with licensed local agencies; the Active markets page shows our regular coverage.',
  'In welchen Ländern sind Sie tätig?', 'Direkt in Luxemburg sowie dank des Europäischen Berufsausweises in Frankreich, Deutschland und Italien. Anderswo auf Anfrage mit zugelassenen lokalen Agenturen; die Seite Aktive Märkte zeigt unsere regelmäßige Abdeckung.',
  81, true, ARRAY['pays couverts']::text[],
  '/services/marches-actifs', 'Marchés actifs', 'Active markets', 'Aktive Märkte',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Dans quels pays intervenez-vous ?');

-- E082 (International)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Que fait un broker immobilier international ?', 'Il définit précisément le besoin, identifie les biens, choisit le bon partenaire local, pilote le dossier et reste l''interlocuteur unique du client jusqu''à la signature.',
  'What does an international real estate broker do?', 'They define the need precisely, identify properties, choose the right local partner, manage the file and remain the client''s single point of contact until signing.',
  'Was macht ein internationaler Immobilienbroker?', 'Er definiert den Bedarf genau, findet die Objekte, wählt den richtigen lokalen Partner, steuert das Dossier und bleibt bis zur Unterzeichnung der einzige Ansprechpartner des Kunden.',
  82, true, ARRAY['broker', 'c''est quoi un broker']::text[],
  '/services/broker-international', 'Broker international', 'International broker', 'Internationaler Broker',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Que fait un broker immobilier international ?');

-- E083 (International)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Qui réalise la transaction à l''étranger ?', 'En France, en Allemagne et en Italie, MAPA Property peut la conduire elle-même. Dans les autres pays, la négociation et la transaction sont réalisées par une agence locale habilitée, qui représente le client sur place.',
  'Who carries out the transaction abroad?', 'In France, Germany and Italy, MAPA Property can conduct it itself. In other countries, negotiation and the transaction are carried out by a licensed local agency representing the client on site.',
  'Wer wickelt das Geschäft im Ausland ab?', 'In Frankreich, Deutschland und Italien kann MAPA Property es selbst durchführen. In anderen Ländern übernimmt eine zugelassene lokale Agentur Verhandlung und Abschluss und vertritt den Kunden vor Ort.',
  83, true, ARRAY['négociation à l''étranger', 'agence locale']::text[],
  '/services/broker-international', 'Broker international', 'International broker', 'Internationaler Broker',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Qui réalise la transaction à l''étranger ?');

-- E084 (International)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Quels sont les honoraires à l''international ?', 'Pour une recherche en Europe, France comprise, 3 % à 8 % hors TVA du prix d''acquisition selon la complexité et le pays. Hors d''Europe, sur devis défini au mandat.',
  'What are your fees abroad?', 'For a search in Europe, including France, 3% to 8% excluding VAT of the purchase price depending on complexity and country. Outside Europe, on quotation set in the mandate.',
  'Wie hoch sind die Honorare im Ausland?', 'Für eine Suche in Europa, Frankreich eingeschlossen, 3 % bis 8 % zzgl. MwSt. des Kaufpreises je nach Komplexität und Land. Außerhalb Europas auf Angebot, im Auftrag festgelegt.',
  84, true, ARRAY['prix international']::text[],
  '/legal/honoraires', 'Honoraires', 'Fees', 'Honorare',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Quels sont les honoraires à l''international ?');

-- E085 (International)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je cherche une résidence secondaire', 'Avec plaisir. Indiquez-moi le pays ou la région, le type de bien et votre budget, et je vous montre ce qui est disponible. Le mandat de recherche permet aussi d''accéder aux biens non publiés.',
  'I am looking for a second home', 'With pleasure. Tell me the country or region, the type of property and your budget, and I will show you what is available. A search mandate also gives access to unpublished properties.',
  'Ich suche einen Zweitwohnsitz', 'Sehr gerne. Nennen Sie mir Land oder Region, die Art der Immobilie und Ihr Budget, und ich zeige Ihnen, was verfügbar ist. Ein Suchauftrag öffnet auch den Zugang zu nicht veröffentlichten Objekten.',
  85, true, ARRAY['maison de vacances', 'Côte d''Azur']::text[],
  '/mandats/recherche', 'Mandat de recherche', 'Search mandate', 'Suchauftrag',
  'Base actuelle d''Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je cherche une résidence secondaire');

-- E086 (Site et données)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Que faites-vous de mes données ?', 'Vos données servent uniquement à traiter votre demande. Tout est expliqué dans notre politique de confidentialité.',
  'What do you do with my data?', 'Your data is used only to handle your request. Everything is explained in our privacy policy.',
  'Was machen Sie mit meinen Daten?', 'Ihre Daten dienen ausschließlich der Bearbeitung Ihrer Anfrage. Alles ist in unserer Datenschutzerklärung erklärt.',
  86, true, ARRAY['RGPD', 'vie privée']::text[],
  '/legal/rgpd', 'Confidentialité', 'Privacy', 'Datenschutz',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Que faites-vous de mes données ?');

-- E087 (Site et données)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Je veux supprimer mes données', 'Envoyez votre demande depuis le formulaire de contact en précisant « suppression de mes données » : elle est traitée conformément à notre politique de confidentialité.',
  'I want my data deleted', 'Send your request through the contact form stating "deletion of my data": it will be handled in line with our privacy policy.',
  'Ich möchte meine Daten löschen lassen', 'Senden Sie Ihre Anfrage über das Kontaktformular mit dem Hinweis „Löschung meiner Daten“: Sie wird gemäß unserer Datenschutzerklärung bearbeitet.',
  87, true, ARRAY['effacer mes données', 'droit à l''oubli']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Je veux supprimer mes données');

-- E088 (Site et données)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Où lire vos articles ?', 'Nos articles, analyses et conseils sont dans notre Journal.',
  'Where can I read your articles?', 'Our articles, analyses and advice are in our Journal.',
  'Wo finde ich Ihre Artikel?', 'Unsere Artikel, Analysen und Ratschläge finden Sie in unserem Journal.',
  88, true, ARRAY['journal', 'blog', 'actualités', 'conseils']::text[],
  '/blog', 'Journal', 'Journal', 'Journal',
  'Julien, 12/11/2026', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Où lire vos articles ?');

-- E089 (Site et données)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Où trouver vos conditions générales ?', 'Les conditions générales et les mentions légales sont accessibles en bas de chaque page du site.',
  'Where are your terms and conditions?', 'The terms and conditions and the legal notice are available at the bottom of every page.',
  'Wo finde ich Ihre AGB?', 'AGB und Impressum finden Sie unten auf jeder Seite der Website.',
  89, true, ARRAY['CGV', 'CGU', 'conditions']::text[],
  '/legal/cgv', 'Conditions générales', 'Terms and conditions', 'AGB',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Où trouver vos conditions générales ?');

-- E090 (Site et données)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Le site ne fonctionne pas', 'Désolée pour ce désagrément. Décrivez le problème dans le formulaire de contact : notre équipe le corrige au plus vite.',
  'The website is not working', 'Sorry for the inconvenience. Describe the problem in the contact form and our team will fix it as soon as possible.',
  'Die Website funktioniert nicht', 'Entschuldigen Sie die Unannehmlichkeit. Beschreiben Sie das Problem im Kontaktformular, unser Team behebt es so schnell wie möglich.',
  90, true, ARRAY['bug', 'erreur', 'formulaire ne marche pas']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Le site ne fonctionne pas');

-- E091 (Site et données)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Puis-je déposer une annonce sur votre site ?', 'Les biens publiés sur le site sont ceux confiés à MAPA Property sous mandat. Pour faire publier votre bien, la première étape est une estimation.',
  'Can I post a listing on your website?', 'The properties on the website are those entrusted to MAPA Property under a mandate. To have your property published, the first step is a valuation.',
  'Kann ich eine Anzeige auf Ihrer Website aufgeben?', 'Auf der Website stehen die Immobilien, die MAPA Property per Auftrag anvertraut wurden. Der erste Schritt zur Veröffentlichung Ihrer Immobilie ist eine Bewertung.',
  91, true, ARRAY['publier mon annonce moi-même']::text[],
  '/services/estimer', 'Estimer mon bien', 'Value my property', 'Immobilie bewerten',
  'FAQ du site', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Puis-je déposer une annonce sur votre site ?');

-- E092 (Limites d'Eléna)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Question juridique ou fiscale personnelle', 'Je ne donne pas de conseil juridique ou fiscal personnel. Notre équipe peut vous orienter, et votre notaire ou votre conseiller fiscal reste la bonne référence.',
  'Personal legal or tax question', 'I do not give personal legal or tax advice. Our team can point you in the right direction, and your notary or tax adviser remains the right reference.',
  'Persönliche Rechts- oder Steuerfrage', 'Ich gebe keine persönliche Rechts- oder Steuerberatung. Unser Team kann Sie orientieren, und Ihr Notar oder Steuerberater bleibt die richtige Anlaufstelle.',
  92, true, ARRAY['mon cas fiscal', 'impôts', 'litige', 'avocat']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Question juridique ou fiscale personnelle');

-- E093 (Limites d'Eléna)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Que pensez-vous d''une autre agence ?', 'Je ne commente pas les autres agences. Je peux en revanche vous présenter l''accompagnement de MAPA Property.',
  'What do you think of another agency?', 'I do not comment on other agencies. I can, however, present how MAPA Property supports you.',
  'Was halten Sie von einer anderen Agentur?', 'Ich kommentiere keine anderen Agenturen. Gerne stelle ich Ihnen aber die Begleitung durch MAPA Property vor.',
  93, true, ARRAY['avis sur une agence', 'concurrent']::text[],
  '/qui-sommes-nous', 'Qui sommes-nous', 'About us', 'Über uns',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Que pensez-vous d''une autre agence ?');

-- E094 (Limites d'Eléna)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Question sans rapport avec l''immobilier', 'Je suis l''assistante immobilière de MAPA Property et je réponds uniquement aux questions sur nos biens et nos services. Que puis-je faire pour vous dans ce domaine ?',
  'Question unrelated to real estate', 'I am MAPA Property''s real estate assistant and I only answer questions about our properties and services. How can I help you with that?',
  'Frage ohne Bezug zu Immobilien', 'Ich bin die Immobilienassistentin von MAPA Property und beantworte nur Fragen zu unseren Objekten und Leistungen. Wie kann ich Ihnen dabei helfen?',
  94, true, ARRAY['météo', 'recette', 'sport', 'politique', 'blague']::text[],
  NULL, NULL, NULL, NULL,
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Question sans rapport avec l''immobilier');

-- E095 (Limites d'Eléna)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Question dont la réponse n''est pas dans la base', 'Je n''ai pas cette information. Je transmets votre question à notre équipe, qui vous répond rapidement. Souhaitez-vous laisser vos coordonnées ?',
  'Question not covered', 'I do not have this information. I am passing your question on to our team, who will reply shortly. Would you like to leave your contact details?',
  'Nicht vorgesehene Frage', 'Diese Information habe ich nicht. Ich leite Ihre Frage an unser Team weiter, das Ihnen umgehend antwortet. Möchten Sie Ihre Kontaktdaten hinterlassen?',
  95, true, ARRAY['toute question non prévue']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Question dont la réponse n''est pas dans la base');

-- E096 (Limites d'Eléna)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Message incompréhensible', 'Je n''ai pas bien compris votre demande. Vous pouvez me demander par exemple : « maison à Steinfort », « combien vaut mon bien » ou « vos honoraires ».',
  'Unclear message', 'I did not quite understand your request. You can ask me, for example: "house in Steinfort", "how much is my property worth" or "your fees".',
  'Unverständliche Nachricht', 'Ich habe Ihre Anfrage nicht ganz verstanden. Sie können mich zum Beispiel fragen: „Haus in Steinfort“, „Was ist meine Immobilie wert“ oder „Ihre Honorare“.',
  96, true, ARRAY['texte vide', 'caractères au hasard']::text[],
  NULL, NULL, NULL, NULL,
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Message incompréhensible');

-- E097 (Limites d'Eléna)
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Insulte ou message agressif', 'Je reste à votre disposition pour toute question sur nos biens et nos services.',
  'Insult or aggressive message', 'I remain at your disposal for any question about our properties and services.',
  'Beleidigung oder aggressive Nachricht', 'Für Fragen zu unseren Objekten und Leistungen stehe ich Ihnen weiterhin gerne zur Verfügung.',
  97, true, ARRAY['grossièreté', 'insulte']::text[],
  NULL, NULL, NULL, NULL,
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Insulte ou message agressif');

-- E098 (Recherche de biens (modèles))
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Des biens correspondent', 'Voici les biens disponibles qui correspondent à votre recherche. Souhaitez-vous affiner par budget ou nombre de chambres ?',
  'Matching properties', 'Here are the available properties matching your search. Would you like to refine by budget or number of bedrooms?',
  'Passende Objekte', 'Hier sind die verfügbaren Objekte, die zu Ihrer Suche passen. Möchten Sie nach Budget oder Anzahl der Schlafzimmer verfeinern?',
  98, true, ARRAY[]::text[],
  '/biens', 'Voir les biens', 'View properties', 'Immobilien ansehen',
  'Règles de recherche du 12/11/2026', true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Des biens correspondent');

-- E099 (Recherche de biens (modèles))
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Aucun bien sur place, biens proches', 'Aucun bien disponible à {lieu} pour le moment. Voici les biens les plus proches. Vous pouvez aussi nous confier votre recherche.',
  'None here, nearby properties', 'No property available in {lieu} at the moment. Here are the closest properties. You can also entrust us with your search.',
  'Keine vor Ort, Objekte in der Nähe', 'Derzeit ist in {lieu} kein Objekt verfügbar. Hier sind die nächstgelegenen Objekte. Sie können uns auch Ihre Suche anvertrauen.',
  99, true, ARRAY[]::text[],
  '/mandats/recherche', 'Mandat de recherche', 'Search mandate', 'Suchauftrag',
  'Règles de recherche du 12/11/2026', true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Aucun bien sur place, biens proches');

-- E100 (Recherche de biens (modèles))
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Aucun bien du tout', 'Aucun bien ne correspond pour le moment. De plus en plus de biens se vendent en off-market : confiez-nous votre recherche, nous activons notre réseau, y compris les biens jamais publiés.',
  'No property at all', 'No property matches at the moment. More and more properties are sold off-market: entrust us with your search and we will activate our network, including properties never published.',
  'Gar kein Objekt', 'Derzeit passt kein Objekt. Immer mehr Immobilien werden off-market verkauft: Vertrauen Sie uns Ihre Suche an, wir aktivieren unser Netzwerk, auch für nie veröffentlichte Objekte.',
  100, true, ARRAY[]::text[],
  '/mandats/recherche', 'Mandat de recherche', 'Search mandate', 'Suchauftrag',
  'Règles de recherche du 12/11/2026', true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Aucun bien du tout');

-- E101 (Recherche de biens (modèles))
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Aucun pays indiqué', 'Voici d''abord nos biens au Luxembourg. Dans quel pays souhaitez-vous chercher ?',
  'No country given', 'Here are our properties in Luxembourg first. Which country would you like to search in?',
  'Kein Land angegeben', 'Hier zuerst unsere Objekte in Luxemburg. In welchem Land möchten Sie suchen?',
  101, true, ARRAY[]::text[],
  NULL, NULL, NULL, NULL,
  'Règles de recherche du 12/11/2026', true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Aucun pays indiqué');

-- E102 (Recherche de biens (modèles))
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Bien sous compromis', 'Ce bien est sous compromis. Je peux vous montrer des biens similaires, ou vous prévenir s''il redevenait disponible.',
  'Property under offer', 'This property is under offer. I can show you similar properties, or let you know if it becomes available again.',
  'Objekt reserviert', 'Dieses Objekt ist reserviert. Ich kann Ihnen ähnliche Objekte zeigen oder Sie informieren, falls es wieder verfügbar wird.',
  102, true, ARRAY[]::text[],
  '/biens', 'Voir les biens', 'View properties', 'Immobilien ansehen',
  'Chantier bandeaux du 11/11/2026', true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Bien sous compromis');

-- E103 (Recherche de biens (modèles))
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Bien vendu ou loué', 'Ce bien a été vendu par MAPA Property. Voici des biens similaires encore disponibles.',
  'Property sold or let', 'This property has been sold by MAPA Property. Here are similar properties still available.',
  'Objekt verkauft oder vermietet', 'Dieses Objekt wurde von MAPA Property verkauft. Hier sind ähnliche, noch verfügbare Objekte.',
  103, true, ARRAY[]::text[],
  '/biens', 'Voir les biens', 'View properties', 'Immobilien ansehen',
  'Chantier bandeaux du 11/11/2026', true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Bien vendu ou loué');

-- E104 (Recherche de biens (modèles))
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Question sur un bien précis', 'Je vous donne les informations publiées sur la fiche du bien. Pour toute autre précision, notre équipe vous répond depuis le bouton de demande de la fiche.',
  'Question about a specific property', 'I can give you the information published on the property page. For any other detail, our team will reply via the request button on the page.',
  'Frage zu einem bestimmten Objekt', 'Ich gebe Ihnen die auf der Objektseite veröffentlichten Informationen. Für weitere Details antwortet Ihnen unser Team über die Anfrage-Schaltfläche der Seite.',
  104, true, ARRAY['détail d''une annonce', 'charges', 'étage', 'année']::text[],
  '/biens', 'Voir les biens', 'View properties', 'Immobilien ansehen',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Question sur un bien précis');

-- E105 (Recherche de biens (modèles))
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Adresse exacte d''un bien', 'L''adresse exacte est communiquée lors de l''organisation de la visite. Demandez une visite depuis la fiche du bien.',
  'Exact address of a property', 'The exact address is given when the viewing is arranged. Request a viewing from the property page.',
  'Genaue Adresse eines Objekts', 'Die genaue Adresse erhalten Sie bei der Vereinbarung der Besichtigung. Fragen Sie eine Besichtigung über die Objektseite an.',
  105, true, ARRAY['où se trouve exactement', 'rue']::text[],
  '/biens', 'Voir les biens', 'View properties', 'Immobilien ansehen',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Adresse exacte d''un bien');

-- E106 (Recherche de biens (modèles))
INSERT INTO public.faqs (page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position, published, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template)
SELECT 'elena', 'Le prix est-il négociable ?', 'Je ne peux pas répondre pour le vendeur. Vous pouvez faire une offre écrite : notre équipe la lui transmet.',
  'Is the price negotiable?', 'I cannot answer on the seller''s behalf. You can make a written offer and our team will pass it on.',
  'Ist der Preis verhandelbar?', 'Ich kann nicht für den Verkäufer antworten. Sie können ein schriftliches Angebot machen, unser Team leitet es weiter.',
  106, true, ARRAY['négocier le prix', 'dernier prix']::text[],
  '/contact', 'Nous contacter', 'Contact us', 'Kontakt',
  'Règle Eléna', false
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE page_key = 'elena' AND question_fr = 'Le prix est-il négociable ?');

COMMIT;

-- Controle (seul tableau affiche) : nombre de lignes 'elena' (attendu 106).
SELECT count(*) AS lignes_elena,
       count(*) FILTER (WHERE published) AS publiees,
       count(*) FILTER (WHERE is_template) AS modeles
FROM public.faqs
WHERE page_key = 'elena';
