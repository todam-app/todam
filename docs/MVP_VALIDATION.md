# Sprint 0 — Validation du MVP à Avignon et Monaco

## 1. Objectif

Le Sprint 0 doit vérifier que Todam peut :

1. constituer un catalogue fiable de spectacles et de représentations ;
2. permettre à une personne de retrouver la production exacte qu'elle a vue ;
3. enregistrer une séance, une note ou un ajout « À voir » sans friction ;
4. préserver la distinction entre œuvre, spectacle et représentation ;
5. mesurer l'effort nécessaire pour étendre ensuite le catalogue à la France.

Avignon et Monaco sont les deux territoires pilotes :

- **Avignon** confronte Todam à un volume élevé, des festivals, de nombreux lieux
  temporaires et des archives hétérogènes ;
- **Monaco** confronte Todam à des saisons institutionnelles structurées en théâtre,
  opéra et ballet.

Le Sprint 0 comprend désormais une première boucle Web locale : inscription, recherche,
fiche spectacle, actions personnelles et profil minimal.

## 2. Ambition d'archives

Todam a vocation à répertorier toutes les représentations publiques, vérifiables et
éligibles ayant eu lieu à Avignon et à Monaco, sans limite historique arbitraire.

Cette ambition ne constitue pas un lot de travail fini. L'exhaustivité sera mesurée
**par source et par période**, à l'aide d'un registre de couverture. Todam pourra ainsi
affirmer, par exemple, qu'une édition précise du Festival d'Avignon ou qu'une saison
précise du Théâtre Princesse Grace a été entièrement traitée, sans prétendre que toute
l'histoire culturelle d'un territoire est déjà complète.

### Règle géographique

Une représentation appartient au pilote lorsque son lieu physique se trouve :

- dans la commune d'Avignon ;
- sur le territoire de la Principauté de Monaco.

L'identité du producteur ou de la compagnie ne suffit pas. Une tournée des Ballets de
Monte-Carlo à l'étranger n'est pas une représentation monégasque. Une représentation à
Vedène ou Villeneuve-lès-Avignon n'est pas une représentation avignonnaise, même si elle
est présentée par une institution du Grand Avignon.

Les lieux hors périmètre restent enregistrables dans le futur catalogue national, mais
ne comptent pas dans la couverture du Sprint 0.

### Règle artistique

Sont inclus :

- théâtre ;
- opéra ;
- ballet.

Les lectures scéniques, le théâtre musical, les comédies musicales, les marionnettes,
l'improvisation et les seuls-en-scène théâtraux suivent les règles d'éligibilité de la
fiche produit.

Les concerts seuls, projections, conférences, expositions, ateliers, cirque, stand-up et
danse hors ballet sont exclus du pilote. Une source peut les contenir, mais ils doivent
être écartés explicitement et rester comptabilisés dans le rapport d'import.

## 3. Première tranche de couverture

Le chargement historique sera progressif. La première tranche fermée sert à tester le
modèle et le processus avant de remonter plus loin dans le temps.

### Couverture à Avignon

1. Festival d'Avignon 2025 :
   - productions éligibles ;
   - lieux situés dans la commune ;
   - chaque date et horaire de représentation ;
   - annulations identifiées lorsqu'elles sont documentées.
2. Festival Off Avignon 2025 :
   - audit préalable de l'accès aux données et de leur réutilisation ;
   - import uniquement après obtention d'une source exploitable et d'un cadre de
     réutilisation clair.
3. Saison 2025-2026 de l'Opéra Grand Avignon :
   - uniquement les représentations données à Avignon ;
   - exclusion de L'Autre Scène à Vedène du périmètre pilote.

### Couverture à Monaco

1. Saison 2025-2026 du Théâtre des Muses, programmes adultes, enfants et spectacles
   publics de fin d'atelier.
2. Saison 2025-2026 du Théâtre Princesse Grace.
3. Saison 2025-2026 de l'Opéra de Monte-Carlo.
4. Saison 2025-2026 des Ballets de Monte-Carlo :
   - uniquement les représentations données à Monaco ;
   - exclusion des dates de tournée.

Une fois cette tranche validée, la collecte remontera source par source :

- Festival d'Avignon depuis 1947 ;
- saisons antérieures du Festival Off selon les données accessibles ;
- saisons permanentes des salles avignonnaises ;
- saisons antérieures des institutions monégasques ;
- autres salles et festivals des deux territoires.

## 4. Sources prioritaires à auditer

La présence d'informations sur un site public n'autorise pas automatiquement leur
réutilisation en masse. Chaque source doit être évaluée selon sa complétude, son format,
ses conditions d'utilisation, sa stabilité et les droits associés.

### Sources à Avignon

| Priorité | Source                                                                                                   | Couverture pressentie                         | Vigilance                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| 1        | [Archives du Festival d'Avignon](https://festival-avignon.com/fr/archives)                               | Programmation depuis 1947                     | Vérifier format, dates détaillées et conditions de réutilisation          |
| 1        | [Ancien portail d'archives du Festival](https://archive.festival-avignon.com/fr/archives)                | Programmation 1947-2019 et documents          | Utiliser comme source complémentaire, sans reprendre les images           |
| 1        | [Opéra Grand Avignon](https://www.operagrandavignon.fr/)                                                 | Saisons d'opéra, théâtre et ballet            | Distinguer Avignon de L'Autre Scène à Vedène                              |
| 2        | Festival Off Avignon / AF&C                                                                              | Volume principal du Off                       | Demander un export ou un partenariat ; ne pas aspirer le site sans accord |
| 2        | BnF — Maison Jean Vilar                                                                                  | Archives du In et fonds du Off                | Accès et réutilisation à convenir avec l'institution                      |
| 3        | [Programmation culturelle de la Ville](https://www.avignon.fr/ma-ville/culture/programmation-culturelle) | Salles municipales et programmes transversaux | Données souvent disponibles en PDF                                        |
| 3        | Sites officiels des théâtres permanents                                                                  | Saisons hors festivals                        | Couverture et conservation variables selon les lieux                      |

### Sources à Monaco

| Priorité | Source                                                                            | Couverture pressentie                                              | Vigilance                                                                                                         |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1        | [Théâtre des Muses](https://www.letheatredesmuses.com/)                           | Saison 2025-2026 adulte, enfant et spectacles publics des ateliers | Métadonnées factuelles uniquement ; corpus complet conservé hors Git dans l'attente d'une décision sur les droits |
| 1        | [Théâtre Princesse Grace](https://www.tpgmonaco.mc/fr/2026-2027/programme)        | Saisons en ligne depuis 2022-2023 au moins                         | Vérifier les saisons antérieures et les changements de lieu                                                       |
| 1        | [Opéra de Monte-Carlo](https://www.opera.mc/)                                     | Saisons et brochures d'opéra                                       | Les brochures PDF peuvent compléter les pages Web                                                                 |
| 1        | [Ballets de Monte-Carlo](https://www.balletsdemontecarlo.com/fr/saison-2025-2026) | Saisons récentes, dates et lieux                                   | Séparer Monaco des tournées                                                                                       |
| 2        | Grimaldi Forum Monaco                                                             | Spectacles accueillis sur le territoire                            | Éviter les doublons avec les producteurs et institutions                                                          |
| 2        | Monte-Carlo Société des Bains de Mer                                              | Salle Garnier et archives historiques                              | Clarifier les droits et la profondeur des archives                                                                |
| 3        | Agenda officiel de la Principauté                                                 | Événements complémentaires                                         | Utiliser comme contrôle, pas comme seule preuve d'identité                                                        |

### Politique relative aux affiches

- Aucune affiche ou photographie n'est copiée durant le Sprint 0 sans licence ou
  autorisation explicite.
- Le catalogue de validation utilise les visuels génériques Todam.
- La source d'une affiche potentielle, son crédit et son statut juridique peuvent être
  consignés sans télécharger le fichier.

## 5. Unité de catalogue

### Œuvre

Le texte, la composition ou l'œuvre chorégraphique de référence, indépendante d'une mise
en scène particulière.

Exemples : `Hamlet`, `Carmen`, `Roméo et Juliette`.

### Spectacle

Une production ou mise en scène identifiable par une combinaison d'éléments :

- titre public ;
- metteur en scène ou chorégraphe ;
- compagnie ou producteur ;
- distribution et équipe artistique ;
- année ou période de création.

Un même spectacle joué plusieurs fois ou dans plusieurs lieux reste une seule
production.

### Représentation

Une occurrence programmée du spectacle :

- date ;
- heure ;
- lieu ;
- statut éventuel : programmée, passée, annulée ou reportée ;
- distribution spécifique, lorsqu'elle est connue.

Une série annoncée sous la forme « du 12 au 15 juillet » doit être transformée en
séances individuelles seulement si les dates et horaires sont vérifiables.

### Séance personnelle

Le souvenir créé par un membre. Il peut être rattaché à une représentation précise ou
seulement au spectacle lorsque la date est inconnue.

## 6. Données minimales à collecter

### Lieu

- nom officiel ;
- adresse ;
- territoire ;
- coordonnées géographiques lorsque leur source est connue ;
- fuseau horaire ;
- source officielle ;
- éventuels noms historiques ou alternatifs.

### Données du spectacle

- titre tel qu'affiché par la source ;
- discipline ;
- œuvre associée lorsqu'elle est identifiable ;
- metteur en scène, chorégraphe ou responsable artistique principal ;
- compagnie ou producteur ;
- année de création lorsqu'elle est documentée ;
- langue éventuelle ;
- durée éventuelle ;
- source officielle ;
- date de dernière vérification.

### Données de la représentation

- spectacle ;
- lieu ;
- date et heure locales ;
- fuseau horaire ;
- statut ;
- source officielle ;
- date de dernière vérification.

### Provenance

Chaque valeur importée doit pouvoir être reliée à :

- une URL ou une référence d'archive ;
- un organisme source ;
- une date de consultation ;
- une méthode de collecte ;
- une période annoncée comme couverte ;
- un statut de réutilisation ;
- une note sur les incertitudes ou transformations effectuées.

## 7. Registre de couverture

Le futur processus de collecte devra produire un registre suivant ce modèle :

| Territoire | Source                  | Période      | Éléments découverts | Éligibles | Intégrés | Vérifiés |                                     Couverture | Droits                                            |
| ---------- | ----------------------- | ------------ | ------------------: | --------: | -------: | -------: | ---------------------------------------------: | ------------------------------------------------- |
| Avignon    | Festival d'Avignon      | Édition 2025 |           À mesurer | À mesurer |        0 |        0 |                                            0 % | À auditer                                         |
| Avignon    | Festival Off            | Édition 2025 |           À mesurer | À mesurer |        0 |        0 |                                            0 % | À auditer                                         |
| Avignon    | Opéra Grand Avignon     | 2025-2026    |           À mesurer | À mesurer |        0 |        0 |                                            0 % | À auditer                                         |
| Monaco     | Théâtre des Muses       | 2025-2026    |       240 décisions |       233 |      233 |      233 | 100 % des éléments découverts ont une décision | Métadonnées factuelles ; redistribution à valider |
| Monaco     | Théâtre Princesse Grace | 2025-2026    |           À mesurer | À mesurer |        0 |        0 |                                            0 % | À auditer                                         |
| Monaco     | Opéra de Monte-Carlo    | 2025-2026    |           À mesurer | À mesurer |        0 |        0 |                                            0 % | À auditer                                         |
| Monaco     | Ballets de Monte-Carlo  | 2025-2026    |           À mesurer | À mesurer |        0 |        0 |                                            0 % | À auditer                                         |

Une couverture de 100 % signifie que tous les éléments éligibles publiés par la source
pour la période ont été traités. Elle ne garantit pas que la source elle-même décrit
toute l'activité du territoire.

## 8. Prototype à tester

Le prototype Sprint 0 couvre uniquement :

1. recherche par titre, artiste ou lieu ;
2. résultats distinguant œuvre et spectacle ;
3. fiche Spectacle avec ses représentations ;
4. actions « Vu », « Noter » et « À voir » ;
5. choix facultatif d'une représentation précise ;
6. création d'un souvenir sans date ;
7. fiche provisoire privée lorsque le spectacle manque ;
8. profil avec journal récent et répartition des notes.

Le premier corpus privé validé contient 51 productions, 182 représentations horodatées
et 7 exclusions ou mises en attente documentées pour le Théâtre des Muses. Il n'est pas
versionné tant que ses droits de redistribution ne sont pas confirmés.

Ne font pas partie du prototype :

- carte nationale ;
- critiques ;
- listes personnalisées ;
- abonnements et fil social ;
- notifications ;
- applications natives ;
- recommandations ;
- statistiques avancées.

## 9. Tests utilisateurs

### Participants

Recruter 8 à 12 personnes :

- au moins quatre ayant assisté à des spectacles à Avignon ;
- au moins quatre ayant assisté à des spectacles à Monaco ;
- un mélange de spectateurs occasionnels et réguliers ;
- au moins deux personnes ayant vu plusieurs mises en scène d'une même œuvre.

### Missions

Chaque participant doit :

1. retrouver cinq spectacles réellement vus ;
2. identifier la bonne production parmi des titres similaires ;
3. marquer un spectacle vu sans le noter ;
4. noter un autre spectacle ;
5. sélectionner une représentation lorsqu'il se souvient de la date ;
6. enregistrer un souvenir ancien sans date ;
7. signaler un spectacle manquant ;
8. retrouver ses entrées dans son profil.

### Mesures

- taux de spectacles retrouvés ;
- temps jusqu'à la bonne fiche ;
- taux de confusion entre œuvre, spectacle et représentation ;
- temps pour enregistrer une note ;
- part des souvenirs enregistrables malgré une date inconnue ;
- nombre de doublons ou fiches provisoires créés ;
- compréhension de « Vu », « À voir » et de la note sur 10 ;
- confiance exprimée dans la précision du catalogue.

## 10. Livrables du Sprint 0

1. Registre des sources et de leurs conditions de réutilisation.
2. Inventaire des lieux inclus dans chaque territoire.
3. Première couverture normalisée d'au moins 30 spectacles et 150 représentations à
   Monaco, puis échantillon équivalent à Avignon.
4. Journal des ambiguïtés et décisions de rapprochement.
5. Prototype cliquable des huit parcours retenus.
6. Guide d'entretien et comptes rendus anonymisés.
7. Rapport de validation avec décision :
   - poursuivre ;
   - corriger le modèle ;
   - réduire le périmètre ;
   - interrompre.
8. Estimation de l'effort nécessaire pour couvrir une saison supplémentaire et une année
   historique supplémentaire.

Les données d'essai ne seront ajoutées au dépôt public que si leurs droits de
réutilisation sont compatibles et si elles ne contiennent aucune donnée personnelle non
nécessaire.

## 11. Critères de sortie

Le Sprint 0 est validé si :

- 100 % des éléments éligibles de l'échantillon de sources et de périodes ont reçu une
  décision : intégrer, exclure, fusionner ou mettre en attente ;
- au moins 95 % des représentations éligibles de l'échantillon peuvent être décrites
  avec une date, un lieu, un spectacle et une provenance ;
- au moins 80 % des cinq souvenirs recherchés par participant sont retrouvés ou peuvent
  être créés sans produire de doublon public ;
- la médiane d'enregistrement d'une note est inférieure à dix secondes une fois la fiche
  ouverte ;
- la distinction œuvre/spectacle/représentation est comprise par au moins 80 % des
  participants après le premier parcours ;
- aucun contenu visuel sans droit ni donnée personnelle inutile n'est utilisé ;
- l'effort éditorial par spectacle et par représentation est mesuré ;
- les principaux risques juridiques et techniques des imports sont documentés.

## 12. Ordre d'exécution

1. Auditer les sept sources prioritaires de la première tranche, en commençant par le
   Théâtre des Muses.
2. Fixer leurs conditions de réutilisation et leur profondeur réelle.
3. Construire l'inventaire des lieux.
4. Constituer manuellement l'échantillon normalisé.
5. Tester le modèle œuvre/spectacle/représentation sur les cas ambigus.
6. Concevoir le prototype.
7. Réaliser les tests utilisateurs.
8. Décider du périmètre de la première version développée.

La première décision à obtenir n'est donc pas « comment tout importer », mais « quelles
sources permettent de revendiquer une couverture fiable, traçable et légalement
réutilisable ».
