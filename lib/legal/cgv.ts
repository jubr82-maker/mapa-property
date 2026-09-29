import type { LegalSection } from "@/components/legal/LegalLayout";

interface LegalContent {
  eyebrow: string;
  title: string;
  updatedAt: string;
  pdfLabel: string;
  disclaimer: string;
  intro?: string[];
  sections: LegalSection[];
  copyright: string;
}

const COPYRIGHT_FR =
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Tous droits réservés. Toute reproduction interdite. Document susceptible d'évolution, version en vigueur consultable sur mapaproperty.lu.";
const COPYRIGHT_EN =
  "© 2026 MAPA Synergy Sàrl, MAPA Property. All rights reserved. Reproduction prohibited. This document is subject to change; the version in force is available on mapaproperty.lu.";
const COPYRIGHT_DE =
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Alle Rechte vorbehalten. Vervielfältigung untersagt. Dieses Dokument kann sich ändern, die geltende Fassung ist auf mapaproperty.lu einsehbar.";

const DISCLAIMER_FR =
  "Ces CGV constituent une base de travail rédigée à titre indicatif. Elles doivent impérativement être validées et amendées par un avocat luxembourgeois inscrit au Barreau avant toute utilisation contractuelle effective. MAPA Synergy Sàrl recommande une revue juridique annuelle.";
const DISCLAIMER_EN =
  "These Terms are a working draft prepared for information purposes. They must be reviewed and amended by a Luxembourg-admitted lawyer before any effective contractual use. MAPA Synergy Sàrl recommends an annual legal review.";
const DISCLAIMER_DE =
  "Diese AGB sind eine zu informativen Zwecken erstellte Arbeitsvorlage. Sie müssen vor jeder tatsächlichen vertraglichen Verwendung von einem in Luxemburg zugelassenen Rechtsanwalt geprüft und ergänzt werden. MAPA Synergy Sàrl empfiehlt eine jährliche Rechtsprüfung.";

const sectionsFr: LegalSection[] = [
  {
    heading: "1. Objet et champ d'application",
    paragraphs: [
      "Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre MAPA Synergy Sàrl, agissant sous le nom commercial MAPA Property (ci-après « MAPA » ou « le Mandataire »), et tout client (ci-après « le Mandant ») recourant à ses services d'agence immobilière et de broker (courtier) international.",
      "Sont concernées les prestations suivantes : conseil et accompagnement à la vente, à l'acquisition, à la location, accès off-market, mandat de recherche, estimation, et services connexes.",
      "Toute mission donne lieu à la signature d'un mandat distinct, qui prime sur les présentes CGV en cas de divergence.",
    ],
  },
  {
    heading: "2. Identification du prestataire",
    paragraphs: [
      "MAPA Synergy Sàrl, société à responsabilité limitée de droit luxembourgeois.",
      "Siège : 26, rue du Commerce, L-3450 Dudelange.",
      "RCS Luxembourg B241974. Autorisation d'établissement : 10108681/0-1-2-3. TVA : LU 31988923.",
      "Représentant : Frédéric Mannis, Gérant.",
    ],
  },
  {
    heading: "3. Définitions",
    paragraphs: [
      "« Mandant » : personne physique ou morale donnant mandat à MAPA.",
      "« Mandataire » : MAPA Synergy Sàrl, agissant en qualité d'agent immobilier ou de broker.",
      "« Acquéreur » et « Vendeur » : les contreparties d'une transaction immobilière.",
      "« Bien » : tout bien immobilier objet d'un mandat.",
      "« Off-Market » : bien dont la commercialisation est strictement confidentielle, accessible uniquement sous NDA.",
      "« NDA » : Non-Disclosure Agreement, accord de confidentialité contractuel.",
      "« Compromis » : compromis de vente / promesse synallagmatique.",
      "« Acte authentique » : acte notarié de transfert de propriété.",
    ],
  },
  {
    heading: "4. Formation du contrat",
    paragraphs: [
      "Toute mission débute par un devis ou une proposition de mandat. Sa signature par le Mandant vaut acceptation pleine et entière des CGV et des conditions particulières du mandat.",
      "Pour les contrats conclus à distance ou hors lieux commerciaux avec un consommateur, le Mandant dispose d'un délai de rétractation de quatorze (14) jours calendaires à compter de la signature, sauf prestation déjà entièrement exécutée avec accord exprès du consommateur.",
    ],
  },
  {
    heading: "5. Obligations du Mandataire",
    paragraphs: [
      "MAPA s'engage à exécuter la mission confiée avec diligence, loyauté et conformément aux usages de la profession. Il s'agit d'une obligation de moyens et non de résultat.",
      "MAPA respecte la législation AML/KYC luxembourgeoise (loi du 12 novembre 2004 modifiée) et procède aux vérifications d'identité et d'origine des fonds requises.",
      "MAPA respecte la confidentialité de toute information non publique communiquée par le Mandant.",
    ],
  },
  {
    heading: "6. Obligations du Mandant",
    paragraphs: [
      "Le Mandant s'engage à fournir des informations sincères et complètes sur le bien (titre de propriété, surfaces, charges, vices apparents et cachés connus, état hypothécaire, etc.).",
      "Selon le type de mandat, le Mandant respecte une exclusivité totale ou partielle vis-à-vis de MAPA.",
      "Le Mandant s'engage à ne pas exercer d'activité concurrente avec MAPA pendant la durée du mandat (présentation directe d'acquéreurs identifiés par MAPA, contournement, etc.).",
    ],
  },
  {
    heading: "7. Honoraires",
    paragraphs: [
      "Les honoraires applicables sont précisés dans le mandat signé et dans le document Honoraires officiel MAPA Property accessible sur le site.",
      "Les honoraires sont exprimés HT, sauf mention contraire ; la TVA luxembourgeoise applicable est de 17 % à la date des présentes.",
      "L'honoraire est dû dès lors que l'intervention de MAPA Property a contribué directement ou indirectement à la conclusion de l'opération, y compris si l'acquéreur a été présenté par MAPA et que la vente se conclut postérieurement à la fin du mandat dans un délai de vingt-quatre (24) mois.",
      "Conditions de paiement : à la signature de l'acte authentique, sauf disposition contraire écrite. Tout retard entraîne, après mise en demeure, des pénalités au taux légal majoré de 5 points, ainsi qu'une indemnité forfaitaire pour frais de recouvrement.",
    ],
  },
  {
    heading: "8. Pack Vidéo",
    paragraphs: [
      "Le Pack Vidéo (tournage professionnel, drone si pertinent, montage) est toujours proposé en option, sur devis, quel que soit le mandat souscrit. Il n'est jamais inclus d'office.",
      "En cas de retrait du mandat avant signature du compromis, les frais déjà engagés au titre du Pack Vidéo restent dus par le Mandant.",
    ],
  },
  {
    heading: "9. Off-Market",
    paragraphs: [
      "L'accès aux biens off-market est conditionné à la signature préalable d'un NDA contractuel.",
      "Toute divulgation, publication, transmission ou utilisation des informations off-market en dehors du cadre fixé par le NDA constitue une faute lourde et engage la responsabilité civile et pénale du contrevenant.",
      "MAPA se réserve le droit de réclamer des dommages-intérêts forfaitaires, sans préjudice du préjudice réellement subi.",
    ],
  },
  {
    heading: "10. Mandat de recherche",
    paragraphs: [
      "Le mandat de recherche est exclusif.",
      "L'honoraire est dû en cas d'identification d'un bien correspondant aux critères convenus, et de conclusion d'une opération avec ce bien dans un délai de vingt-quatre (24) mois suivant l'identification.",
      "Toute mission de recherche donne lieu à une avance sur frais, exigible à la signature du mandat. Elle est fixée à 250 euros hors taxes pour le Luxembourg, à un montant minimal de 500 euros hors taxes pour les régions limitrophes situées jusqu'à 100 kilomètres, et sur devis pour les autres pays selon les déplacements nécessaires.",
      "Cette avance est intégralement déduite des honoraires dus si la transaction se conclut avec MAPA Property. Elle reste acquise à MAPA Property si le Mandant renonce à son projet.",
    ],
  },
  {
    heading: "11. Confidentialité",
    paragraphs: [
      "Les parties s'engagent réciproquement à conserver strictement confidentielles toutes les informations échangées dans le cadre de la mission.",
      "Cette obligation de confidentialité demeure en vigueur pendant cinq (5) ans à compter de la fin de la relation contractuelle.",
    ],
  },
  {
    heading: "12. Propriété intellectuelle",
    paragraphs: [
      "Les descriptifs, photographies, vidéos, plans et tous supports créés ou financés par MAPA dans le cadre de la mission demeurent la propriété exclusive de MAPA.",
      "Le Mandant s'engage à ne pas réutiliser ces supports en dehors du cadre du mandat, ni les transmettre à des tiers sans autorisation écrite préalable.",
    ],
  },
  {
    heading: "13. Responsabilité",
    paragraphs: [
      "La responsabilité de MAPA est limitée aux dommages directs et prévisibles résultant d'une faute prouvée. Les dommages indirects (perte de chance, préjudice commercial, perte d'opportunité) sont expressément exclus.",
      "Le plafond annuel de responsabilité de MAPA est limité au montant total des honoraires effectivement perçus du Mandant au cours des douze (12) mois précédant le fait générateur, sauf disposition légale impérative contraire.",
    ],
  },
  {
    heading: "14. Force majeure",
    paragraphs: [
      "Aucune des parties ne pourra être tenue responsable d'un manquement résultant d'un cas de force majeure, entendu au sens large : catastrophe naturelle, conflit armé, pandémie, panne généralisée des télécommunications, décision administrative imprévue, etc.",
    ],
  },
  {
    heading: "15. AML / KYC",
    paragraphs: [
      "MAPA est tenue par la loi du 12 novembre 2004 (modifiée) à des obligations strictes de vigilance et de déclaration.",
      "MAPA se réserve le droit de refuser, suspendre ou résilier toute prestation si le Mandant ne fournit pas les documents requis (pièce d'identité, justificatif de domicile, origine des fonds, structure de propriété ultime).",
    ],
  },
  {
    heading: "16. Données personnelles",
    paragraphs: [
      "Le traitement des données personnelles est encadré par notre Politique RGPD accessible sur le site, conformément au Règlement (UE) 2016/679 et à la loi luxembourgeoise du 1er août 2018.",
    ],
  },
  {
    heading: "17. Droit de rétractation",
    paragraphs: [
      "Pour les contrats conclus à distance ou hors lieux commerciaux avec un consommateur, le Mandant dispose d'un délai de quatorze (14) jours calendaires pour se rétracter, sans avoir à justifier de motif.",
      "La rétractation s'exerce par notification écrite à l'adresse du siège ou par email à j.brebion@mapagroup.org.",
      "Si le Mandant a expressément demandé l'exécution immédiate de la prestation et que celle-ci a été entièrement réalisée avant la fin du délai, le droit de rétractation s'éteint.",
    ],
  },
  {
    heading: "18. Réclamations et médiation",
    paragraphs: [
      "Toute réclamation est à adresser par écrit à MAPA, qui s'engage à y répondre dans un délai raisonnable.",
      "À défaut de résolution amiable, le Mandant consommateur peut saisir le médiateur de la consommation luxembourgeois (https://meco.lu) avant tout recours juridictionnel.",
    ],
  },
  {
    heading: "19. Cession",
    paragraphs: [
      "Aucune partie ne peut céder ses droits ou obligations à un tiers sans l'accord écrit préalable de l'autre, sauf cession à une entité du même groupe.",
    ],
  },
  {
    heading: "20. Modification des CGV",
    paragraphs: [
      "MAPA se réserve le droit de modifier les présentes CGV. Toute modification substantielle fera l'objet d'une notification au Mandant trente (30) jours avant son entrée en vigueur. Le Mandant pourra s'opposer à la modification dans ce délai ; à défaut, l'acceptation sera réputée acquise.",
    ],
  },
  {
    heading: "21. Droit applicable",
    paragraphs: [
      "Les présentes CGV sont exclusivement régies par le droit luxembourgeois.",
    ],
  },
  {
    heading: "22. Juridiction",
    paragraphs: [
      "Tout litige sera de la compétence exclusive des tribunaux de Luxembourg-Ville, sauf disposition impérative contraire en faveur du consommateur résidant dans l'Union européenne.",
    ],
  },
  {
    heading: "23. Clause de sauvegarde",
    paragraphs: [
      "Si une ou plusieurs stipulations des présentes CGV venaient à être déclarées nulles, illégales ou inapplicables, les autres stipulations demeureraient en vigueur.",
    ],
  },
  {
    heading: "24. Anti-scraping",
    paragraphs: [
      "Toute extraction automatisée des données du site, notamment des descriptifs de biens, photographies et prix, est strictement interdite et constitue une violation du droit sui generis du producteur de bases de données (loi du 18 avril 2001) et une atteinte aux systèmes de traitement automatisé de données (article 509-1 du Code pénal luxembourgeois).",
      "Toute infraction fera l'objet de poursuites civiles et pénales.",
    ],
  },
];

const sectionsEn: LegalSection[] = [
  {
    heading: "1. Purpose and scope",
    paragraphs: [
      "These Terms and Conditions of Sale (\"Terms\") govern the contractual relationship between MAPA Synergy Sàrl, trading as MAPA Property (hereafter \"MAPA\" or \"the Agent\"), and any client (hereafter \"the Client\") using its real estate agency and international broking services.",
      "The following services are covered: advice and support for sale, acquisition, rental, off-market access, search mandates, valuation, and related services.",
      "Each engagement is subject to a separate signed mandate, which prevails over these Terms in the event of any conflict.",
    ],
  },
  {
    heading: "2. Provider identification",
    paragraphs: [
      "MAPA Synergy Sàrl, a private limited liability company under Luxembourg law.",
      "Registered office: 26, rue du Commerce, L-3450 Dudelange.",
      "RCS Luxembourg B241974. Establishment authorisation: 10108681/0-1-2-3. VAT: LU 31988923.",
      "Representative: Frédéric Mannis, Manager.",
    ],
  },
  {
    heading: "3. Definitions",
    paragraphs: [
      "\"Client\": the individual or legal entity granting a mandate to MAPA.",
      "\"Agent\": MAPA Synergy Sàrl, acting as real estate agent or broker.",
      "\"Buyer\" and \"Seller\": the counterparties to a real estate transaction.",
      "\"Property\": any real estate property covered by a mandate.",
      "\"Off-Market\": a property whose marketing is strictly confidential, accessible only under NDA.",
      "\"NDA\": Non-Disclosure Agreement, a contractual confidentiality undertaking.",
      "\"Compromis\": preliminary sale agreement, a reciprocal promise to sell and purchase.",
      "\"Notarial deed\": the notarised deed transferring ownership.",
    ],
  },
  {
    heading: "4. Contract formation and consumer 14-day withdrawal",
    paragraphs: [
      "Every engagement begins with a quote or a proposed mandate. Its signature by the Client constitutes full and unconditional acceptance of these Terms and of the specific conditions of the mandate.",
      "For contracts concluded at a distance or off business premises with a consumer, the Client has a period of fourteen (14) calendar days from signature to withdraw, unless the service has already been fully performed with the consumer's express agreement.",
    ],
  },
  {
    heading: "5. Agent's obligations",
    paragraphs: [
      "MAPA undertakes to carry out the engagement with diligence, loyalty and in accordance with professional practice. This is an obligation of means, not of result.",
      "MAPA complies with Luxembourg AML/KYC legislation (law of 12 November 2004, as amended) and carries out the required identity and source of funds checks.",
      "MAPA respects the confidentiality of any non-public information communicated by the Client.",
    ],
  },
  {
    heading: "6. Client's obligations",
    paragraphs: [
      "The Client undertakes to provide sincere and complete information about the property (title deed, surface areas, charges, known apparent and hidden defects, mortgage status, etc.).",
      "Depending on the type of mandate, the Client observes total or partial exclusivity towards MAPA.",
      "The Client undertakes not to engage in activity competing with MAPA during the term of the mandate (directly introducing buyers identified by MAPA, circumvention, etc.).",
    ],
  },
  {
    heading: "7. Fees",
    paragraphs: [
      "Applicable fees are set out in the signed mandate and in the official MAPA Property Fees document available on the site.",
      "Fees are expressed excluding VAT unless stated otherwise; the applicable Luxembourg VAT is 17% as of the date of these Terms.",
      "The fee is due as soon as MAPA Property's involvement has contributed directly or indirectly to the conclusion of the transaction, including where the buyer was introduced by MAPA and the sale concludes after the end of the mandate, within a period of twenty-four (24) months.",
      "Payment terms: on signature of the notarial deed, unless otherwise agreed in writing. Any delay triggers, after formal notice, penalties at the legal rate increased by 5 points, together with a flat-rate indemnity for collection costs.",
    ],
  },
  {
    heading: "8. Video Pack",
    paragraphs: [
      "The Video Pack (professional filming, drone footage where relevant, editing) is always offered as an option, by quotation, regardless of the mandate signed. It is never included by default.",
      "If the mandate is withdrawn before signature of the compromis, the costs already incurred for the Video Pack remain due by the Client.",
    ],
  },
  {
    heading: "9. Off-Market",
    paragraphs: [
      "Access to off-market properties is conditional on the prior signature of a contractual NDA.",
      "Any disclosure, publication, transmission or use of off-market information outside the framework set by the NDA constitutes gross misconduct and engages the civil and criminal liability of the offending party.",
      "MAPA reserves the right to claim flat-rate damages, without prejudice to the damage actually suffered.",
    ],
  },
  {
    heading: "10. Search mandate",
    paragraphs: [
      "The search mandate is exclusive.",
      "The fee is due where a property matching the agreed criteria is identified, and a transaction concludes on that property within twenty-four (24) months of its identification.",
      "Every search engagement carries a fee advance, payable on signature of the mandate. It is set at 250 euros excluding tax for Luxembourg, a minimum of 500 euros excluding tax for neighbouring regions within 100 kilometres, and by quotation for other countries depending on the travel required.",
      "This advance is fully deducted from the fees due if the transaction concludes with MAPA Property. It remains retained by MAPA Property if the Client withdraws from the project.",
    ],
  },
  {
    heading: "11. Confidentiality",
    paragraphs: [
      "The parties mutually undertake to keep strictly confidential all information exchanged in the course of the engagement.",
      "This confidentiality obligation remains in force for five (5) years from the end of the contractual relationship.",
    ],
  },
  {
    heading: "12. Intellectual property",
    paragraphs: [
      "Descriptions, photographs, videos, plans and all materials created or funded by MAPA in the course of the engagement remain the exclusive property of MAPA.",
      "The Client undertakes not to reuse these materials outside the scope of the mandate, nor to transmit them to third parties without prior written authorisation.",
    ],
  },
  {
    heading: "13. Liability",
    paragraphs: [
      "MAPA's liability is limited to direct and foreseeable damages resulting from proven fault. Indirect damages (loss of chance, commercial harm, loss of opportunity) are expressly excluded.",
      "MAPA's annual liability cap is limited to the total amount of fees actually received from the Client during the twelve (12) months preceding the triggering event, unless mandatory legal provisions state otherwise.",
    ],
  },
  {
    heading: "14. Force majeure",
    paragraphs: [
      "Neither party may be held liable for a failure resulting from a case of force majeure, understood broadly: natural disaster, armed conflict, pandemic, widespread telecommunications failure, unforeseen administrative decision, etc.",
    ],
  },
  {
    heading: "15. AML / KYC",
    paragraphs: [
      "MAPA is bound by the law of 12 November 2004 (as amended) to strict vigilance and reporting obligations.",
      "MAPA reserves the right to refuse, suspend or terminate any service if the Client fails to provide the required documents (proof of identity, proof of address, source of funds, ultimate beneficial ownership structure).",
    ],
  },
  {
    heading: "16. Personal data",
    paragraphs: [
      "The processing of personal data is governed by our GDPR Policy available on the site, in accordance with Regulation (EU) 2016/679 and the Luxembourg law of 1 August 2018.",
    ],
  },
  {
    heading: "17. Right of withdrawal",
    paragraphs: [
      "For contracts concluded at a distance or off business premises with a consumer, the Client has a period of fourteen (14) calendar days to withdraw, without having to state a reason.",
      "Withdrawal is exercised by written notice to the registered office address or by email to j.brebion@mapagroup.org.",
      "If the Client has expressly requested immediate performance of the service and it has been fully carried out before the end of the period, the right of withdrawal lapses.",
    ],
  },
  {
    heading: "18. Claims and mediation",
    paragraphs: [
      "Any complaint must be addressed in writing to MAPA, which undertakes to respond within a reasonable time.",
      "Failing an amicable resolution, the consumer Client may refer the matter to the Luxembourg consumer mediator (https://meco.lu) before any court action.",
    ],
  },
  {
    heading: "19. Assignment",
    paragraphs: [
      "Neither party may assign its rights or obligations to a third party without the other's prior written consent, except for assignment to an entity of the same group.",
    ],
  },
  {
    heading: "20. Amendment of these Terms",
    paragraphs: [
      "MAPA reserves the right to amend these Terms. Any substantial amendment will be notified to the Client thirty (30) days before it takes effect. The Client may object to the amendment within that period; failing that, acceptance will be deemed acquired.",
    ],
  },
  {
    heading: "21. Applicable law",
    paragraphs: [
      "These Terms are exclusively governed by Luxembourg law.",
    ],
  },
  {
    heading: "22. Jurisdiction",
    paragraphs: [
      "Any dispute shall fall within the exclusive jurisdiction of the courts of Luxembourg-City, subject to any mandatory provisions to the contrary in favour of a consumer residing in the European Union.",
    ],
  },
  {
    heading: "23. Severability",
    paragraphs: [
      "Should one or more provisions of these Terms be held void, unlawful or unenforceable, the remaining provisions shall remain in force.",
    ],
  },
  {
    heading: "24. Anti-scraping",
    paragraphs: [
      "Any automated extraction of site data, in particular property descriptions, photographs and prices, is strictly prohibited and constitutes a violation of the sui generis right of the database producer (law of 18 April 2001) and an attack on automated data processing systems (article 509-1 of the Luxembourg Criminal Code).",
      "Any infringement will be subject to civil and criminal proceedings.",
    ],
  },
];

const sectionsDe: LegalSection[] = [
  {
    heading: "1. Zweck und Anwendungsbereich",
    paragraphs: [
      "Diese Allgemeinen Verkaufsbedingungen (AGB) regeln die vertraglichen Beziehungen zwischen MAPA Synergy Sàrl, handelnd unter dem Geschäftsnamen MAPA Property (nachfolgend „MAPA\" oder „der Mandatar\"), und jedem Kunden (nachfolgend „der Mandant\"), der ihre Immobilienagentur- und internationalen Brokerdienstleistungen in Anspruch nimmt.",
      "Betroffen sind folgende Leistungen: Beratung und Begleitung beim Verkauf, beim Erwerb, bei der Vermietung, Off-Market-Zugang, Suchmandat, Bewertung und verbundene Dienstleistungen.",
      "Jeder Auftrag führt zur Unterzeichnung eines gesonderten Mandats, das im Fall einer Abweichung Vorrang vor diesen AGB hat.",
    ],
  },
  {
    heading: "2. Identifikation des Dienstleisters",
    paragraphs: [
      "MAPA Synergy Sàrl, Gesellschaft mit beschränkter Haftung luxemburgischen Rechts.",
      "Sitz: 26, rue du Commerce, L-3450 Dudelange.",
      "RCS Luxemburg B241974. Niederlassungsgenehmigung: 10108681/0-1-2-3. MwSt.: LU 31988923.",
      "Vertreter: Frédéric Mannis, Geschäftsführer.",
    ],
  },
  {
    heading: "3. Definitionen",
    paragraphs: [
      "„Mandant\": natürliche oder juristische Person, die MAPA ein Mandat erteilt.",
      "„Mandatar\": MAPA Synergy Sàrl, handelnd als Immobilienmakler oder Broker.",
      "„Käufer\" und „Verkäufer\": die Gegenparteien einer Immobilientransaktion.",
      "„Objekt\": jede Immobilie, die Gegenstand eines Mandats ist.",
      "„Off-Market\": ein Objekt, dessen Vermarktung streng vertraulich ist und nur unter NDA zugänglich ist.",
      "„NDA\": Non-Disclosure Agreement, vertragliche Vertraulichkeitsvereinbarung.",
      "„Vorvertrag\": Verkaufsvorvertrag beziehungsweise gegenseitiges Verkaufsversprechen.",
      "„Notarielle Urkunde\": notarielle Urkunde zur Eigentumsübertragung.",
    ],
  },
  {
    heading: "4. Vertragsabschluss und 14-tägiges Verbraucherwiderrufsrecht",
    paragraphs: [
      "Jeder Auftrag beginnt mit einem Kostenvoranschlag oder einem Mandatsvorschlag. Dessen Unterzeichnung durch den Mandanten gilt als vollständige und vorbehaltlose Annahme der AGB und der besonderen Bedingungen des Mandats.",
      "Bei Fernabsatzverträgen oder außerhalb von Geschäftsräumen geschlossenen Verträgen mit einem Verbraucher hat der Mandant ein Widerrufsrecht von vierzehn (14) Kalendertagen ab Unterzeichnung, außer die Leistung wurde mit ausdrücklicher Zustimmung des Verbrauchers bereits vollständig erbracht.",
    ],
  },
  {
    heading: "5. Pflichten des Mandatars",
    paragraphs: [
      "MAPA verpflichtet sich, den erteilten Auftrag mit Sorgfalt, Loyalität und gemäß den Berufsgepflogenheiten auszuführen. Es handelt sich um eine Bemühens- und keine Erfolgspflicht.",
      "MAPA hält die luxemburgische AML/KYC-Gesetzgebung (Gesetz vom 12. November 2004 in geänderter Fassung) ein und führt die erforderlichen Identitäts- und Herkunftsprüfungen der Mittel durch.",
      "MAPA wahrt die Vertraulichkeit aller nicht öffentlichen Informationen, die vom Mandanten mitgeteilt werden.",
    ],
  },
  {
    heading: "6. Pflichten des Mandanten",
    paragraphs: [
      "Der Mandant verpflichtet sich, wahrheitsgemäße und vollständige Angaben zum Objekt zu machen (Eigentumstitel, Flächen, Lasten, bekannte offene und versteckte Mängel, hypothekarische Situation usw.).",
      "Je nach Mandatstyp beachtet der Mandant eine vollständige oder teilweise Exklusivität gegenüber MAPA.",
      "Der Mandant verpflichtet sich, während der Laufzeit des Mandats keine mit MAPA konkurrierende Tätigkeit auszuüben (direkte Vorstellung von durch MAPA identifizierten Käufern, Umgehung usw.).",
    ],
  },
  {
    heading: "7. Honorare",
    paragraphs: [
      "Die anwendbaren Honorare sind im unterzeichneten Mandat sowie im offiziellen, auf der Website verfügbaren Dokument Honorare von MAPA Property festgelegt.",
      "Die Honorare verstehen sich zzgl. MwSt., sofern nicht anders angegeben; die anwendbare luxemburgische MwSt. beträgt zum Zeitpunkt dieser AGB 17 %.",
      "Das Honorar ist geschuldet, sobald das Eingreifen von MAPA Property direkt oder indirekt zum Abschluss des Geschäfts beigetragen hat, auch wenn der Käufer von MAPA vorgestellt wurde und der Verkauf erst nach Mandatsende, innerhalb einer Frist von vierundzwanzig (24) Monaten, zustande kommt.",
      "Zahlungsbedingungen: bei Unterzeichnung der notariellen Urkunde, sofern nicht schriftlich anders vereinbart. Jeder Verzug löst nach Mahnung Verzugszinsen zum gesetzlichen Satz zuzüglich 5 Punkten sowie eine Pauschalentschädigung für Beitreibungskosten aus.",
    ],
  },
  {
    heading: "8. Videopaket",
    paragraphs: [
      "Das Videopaket (professioneller Dreh, Drohnenaufnahmen falls relevant, Schnitt) wird unabhängig vom unterzeichneten Mandat stets als Option auf Angebot angeboten. Es ist niemals standardmäßig enthalten.",
      "Bei Rücktritt vom Mandat vor Unterzeichnung des Vorvertrags bleiben die bereits angefallenen Kosten des Videopakets vom Mandanten geschuldet.",
    ],
  },
  {
    heading: "9. Off-Market",
    paragraphs: [
      "Der Zugang zu Off-Market-Objekten ist an die vorherige Unterzeichnung einer vertraglichen NDA gebunden.",
      "Jede Offenlegung, Veröffentlichung, Weitergabe oder Nutzung von Off-Market-Informationen außerhalb des durch die NDA festgelegten Rahmens stellt ein schweres Verschulden dar und begründet die zivil- und strafrechtliche Haftung des Zuwiderhandelnden.",
      "MAPA behält sich das Recht vor, pauschalen Schadensersatz zu verlangen, unbeschadet des tatsächlich erlittenen Schadens.",
    ],
  },
  {
    heading: "10. Suchmandat",
    paragraphs: [
      "Das Suchmandat ist exklusiv.",
      "Das Honorar ist geschuldet, wenn ein den vereinbarten Kriterien entsprechendes Objekt identifiziert wird und ein Geschäft mit diesem Objekt innerhalb von vierundzwanzig (24) Monaten nach dessen Identifizierung zustande kommt.",
      "Jeder Suchauftrag zieht einen bei Mandatsunterzeichnung fälligen Vorschuss auf Kosten nach sich. Er beträgt 250 Euro netto für Luxemburg, mindestens 500 Euro netto für angrenzende Regionen bis 100 Kilometer, und für andere Länder je nach erforderlichen Reisen auf Angebot.",
      "Dieser Vorschuss wird vollständig von den geschuldeten Honoraren abgezogen, wenn das Geschäft mit MAPA Property abgeschlossen wird. Er verbleibt bei MAPA Property, wenn der Mandant sein Vorhaben aufgibt.",
    ],
  },
  {
    heading: "11. Vertraulichkeit",
    paragraphs: [
      "Die Parteien verpflichten sich gegenseitig, alle im Rahmen des Auftrags ausgetauschten Informationen streng vertraulich zu behandeln.",
      "Diese Vertraulichkeitspflicht bleibt fünf (5) Jahre ab Ende der Vertragsbeziehung in Kraft.",
    ],
  },
  {
    heading: "12. Geistiges Eigentum",
    paragraphs: [
      "Beschreibungen, Fotografien, Videos, Pläne und alle von MAPA im Rahmen des Auftrags erstellten oder finanzierten Unterlagen bleiben ausschließliches Eigentum von MAPA.",
      "Der Mandant verpflichtet sich, diese Unterlagen nicht außerhalb des Mandatsrahmens weiterzuverwenden und sie nicht ohne vorherige schriftliche Genehmigung an Dritte weiterzugeben.",
    ],
  },
  {
    heading: "13. Haftung",
    paragraphs: [
      "Die Haftung von MAPA ist auf direkte und vorhersehbare Schäden beschränkt, die aus einem nachgewiesenen Verschulden resultieren. Indirekte Schäden (entgangene Chance, wirtschaftlicher Schaden, entgangene Gelegenheit) sind ausdrücklich ausgeschlossen.",
      "Die jährliche Haftungsobergrenze von MAPA ist auf den Gesamtbetrag der vom Mandanten tatsächlich erhaltenen Honorare in den zwölf (12) Monaten vor dem schadensauslösenden Ereignis begrenzt, sofern zwingende gesetzliche Bestimmungen nichts anderes vorsehen.",
    ],
  },
  {
    heading: "14. Höhere Gewalt",
    paragraphs: [
      "Keine der Parteien haftet für eine Pflichtverletzung infolge höherer Gewalt, weit verstanden: Naturkatastrophe, bewaffneter Konflikt, Pandemie, allgemeiner Ausfall der Telekommunikation, unvorhergesehene behördliche Entscheidung usw.",
    ],
  },
  {
    heading: "15. AML / KYC",
    paragraphs: [
      "MAPA unterliegt dem Gesetz vom 12. November 2004 (in geänderter Fassung) mit strengen Sorgfalts- und Meldepflichten.",
      "MAPA behält sich das Recht vor, jede Leistung zu verweigern, auszusetzen oder zu beenden, wenn der Mandant die erforderlichen Unterlagen nicht vorlegt (Identitätsnachweis, Wohnsitznachweis, Herkunft der Mittel, Struktur des wirtschaftlich Berechtigten).",
    ],
  },
  {
    heading: "16. Personenbezogene Daten",
    paragraphs: [
      "Die Verarbeitung personenbezogener Daten unterliegt unserer auf der Website verfügbaren DSGVO-Erklärung, gemäß der Verordnung (EU) 2016/679 und dem luxemburgischen Gesetz vom 1. August 2018.",
    ],
  },
  {
    heading: "17. Widerrufsrecht",
    paragraphs: [
      "Bei Fernabsatzverträgen oder außerhalb von Geschäftsräumen geschlossenen Verträgen mit einem Verbraucher hat der Mandant ein Widerrufsrecht von vierzehn (14) Kalendertagen, ohne einen Grund angeben zu müssen.",
      "Der Widerruf erfolgt durch schriftliche Mitteilung an die Anschrift des Sitzes oder per E-Mail an j.brebion@mapagroup.org.",
      "Hat der Mandant ausdrücklich die sofortige Ausführung der Leistung verlangt und wurde diese vor Ablauf der Frist vollständig erbracht, erlischt das Widerrufsrecht.",
    ],
  },
  {
    heading: "18. Reklamationen und Mediation",
    paragraphs: [
      "Jede Reklamation ist schriftlich an MAPA zu richten, die sich verpflichtet, innerhalb einer angemessenen Frist zu antworten.",
      "Kommt keine gütliche Einigung zustande, kann der Verbraucher-Mandant vor jedem gerichtlichen Vorgehen den luxemburgischen Verbraucherschlichter (https://meco.lu) anrufen.",
    ],
  },
  {
    heading: "19. Abtretung",
    paragraphs: [
      "Keine Partei darf ihre Rechte oder Pflichten ohne vorherige schriftliche Zustimmung der anderen an einen Dritten abtreten, außer bei Abtretung an eine Einheit derselben Unternehmensgruppe.",
    ],
  },
  {
    heading: "20. Änderung der AGB",
    paragraphs: [
      "MAPA behält sich das Recht vor, diese AGB zu ändern. Jede wesentliche Änderung wird dem Mandanten dreißig (30) Tage vor ihrem Inkrafttreten mitgeteilt. Der Mandant kann der Änderung innerhalb dieser Frist widersprechen; andernfalls gilt die Annahme als erteilt.",
    ],
  },
  {
    heading: "21. Anwendbares Recht",
    paragraphs: [
      "Diese AGB unterliegen ausschließlich luxemburgischem Recht.",
    ],
  },
  {
    heading: "22. Gerichtsstand",
    paragraphs: [
      "Jeder Streit fällt in die ausschließliche Zuständigkeit der Gerichte der Stadt Luxemburg, vorbehaltlich zwingender gegenteiliger Bestimmungen zugunsten eines in der Europäischen Union ansässigen Verbrauchers.",
    ],
  },
  {
    heading: "23. Salvatorische Klausel",
    paragraphs: [
      "Sollten eine oder mehrere Bestimmungen dieser AGB für nichtig, rechtswidrig oder unanwendbar erklärt werden, bleiben die übrigen Bestimmungen in Kraft.",
    ],
  },
  {
    heading: "24. Anti-Scraping",
    paragraphs: [
      "Jede automatisierte Extraktion von Website-Daten, insbesondere Objektbeschreibungen, Fotografien und Preise, ist strikt untersagt und stellt eine Verletzung des Schutzrechts sui generis des Datenbankherstellers (Gesetz vom 18. April 2001) sowie einen Angriff auf automatisierte Datenverarbeitungssysteme dar (Artikel 509-1 des luxemburgischen Strafgesetzbuches).",
      "Jeder Verstoß wird zivil- und strafrechtlich verfolgt.",
    ],
  },
];

export const cgv: Record<"fr" | "en" | "de", LegalContent> = {
  fr: {
    eyebrow: "Légal",
    title: "Conditions Générales de Vente",
    updatedAt: "Mise à jour : 2026-05-08",
    pdfLabel: "Télécharger le PDF officiel",
    disclaimer: DISCLAIMER_FR,
    intro: [
      "Les présentes Conditions Générales de Vente (CGV) constituent le cadre contractuel entre MAPA Synergy Sàrl (« MAPA Property ») et ses clients pour l'ensemble des prestations d'agence immobilière et de broker international.",
    ],
    sections: sectionsFr,
    copyright: COPYRIGHT_FR,
  },
  en: {
    eyebrow: "Legal",
    title: "Terms and Conditions of Sale",
    updatedAt: "Updated: 2026-05-08",
    pdfLabel: "Download the official PDF",
    disclaimer: DISCLAIMER_EN,
    intro: [
      "These Terms and Conditions of Sale set out the contractual framework between MAPA Synergy Sàrl (\"MAPA Property\") and its clients for all real estate agency and international broking services. In the event of any divergence in interpretation, the French version shall prevail.",
    ],
    sections: sectionsEn,
    copyright: COPYRIGHT_EN,
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Allgemeine Verkaufsbedingungen",
    updatedAt: "Aktualisiert: 2026-05-08",
    pdfLabel: "Offizielles PDF herunterladen",
    disclaimer: DISCLAIMER_DE,
    intro: [
      "Diese Allgemeinen Verkaufsbedingungen bilden den vertraglichen Rahmen zwischen MAPA Synergy Sàrl („MAPA Property\") und ihren Kunden für sämtliche Immobilienagentur- und internationalen Brokerdienstleistungen. Bei Auslegungsabweichungen ist die französische Fassung maßgeblich.",
    ],
    sections: sectionsDe,
    copyright: COPYRIGHT_DE,
  },
};
