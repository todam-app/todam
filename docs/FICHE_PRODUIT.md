# Todam — Fiche produit et design de référence v1

## 1. Identité et vision

### Positionnement

Todam est un journal personnel de spectacles : une application française permettant de retrouver, consigner, noter et partager les spectacles de théâtre, d’opéra et de ballet.

La valeur principale est personnelle : conserver la mémoire de ce que l’on a vu et comprendre ses goûts. La découverte locale et les profils suivis enrichissent cette habitude sans transformer Todam en billetterie ou en réseau social généraliste.

### Principes fondateurs

- Une note de 1 à 10 doit pouvoir être enregistrée en quelques secondes, sans commentaire obligatoire.
- On note une production ou mise en scène précise, pas l’œuvre abstraite ni chaque représentation séparément.
- Une personne peut marquer un spectacle vu sans le noter.
- La billetterie, les prix et les comparateurs sont absents ; seul un lien officiel discret figure dans les informations.
- Les données personnelles sont exportables et la confidentialité varie selon leur sensibilité.
- Le catalogue est national, mais la découverte quotidienne est organisée autour d’une ville choisie.
- Le produit est gratuit au lancement, sans placement sponsorisé susceptible d’influencer notes ou tendances.

### Public et disponibilité

- Grand public français, avec une première communauté composée de spectateurs réguliers capables d’amorcer le catalogue.
- Consultation libre pour tous ; création de compte réservée aux personnes de 15 ans ou plus.
- Interface française uniquement au lancement.
- Web responsive, iOS et Android avec les mêmes fonctions principales.
- Découverte centrée sur la France métropolitaine et ultramarine ; journal personnel capable d’accueillir des souvenirs vus à l’étranger.

### Nom

**Todam** est le nom de produit retenu. Son orthographe de référence est « Todam » ; la forme « TODAM » peut être utilisée dans le logotype. Avant le lancement, ce choix devra encore faire l’objet d’une recherche d’antériorité juridique approfondie ainsi que d’une validation définitive des domaines et des stores.

## 2. Architecture de l’expérience

### Navigation principale

Trois destinations permanentes :

1. **Accueil**
2. **Recherche**
3. **Profil**

Sur mobile, elles apparaissent dans une barre inférieure. Sur le Web, elles deviennent une navigation supérieure sans changer l’architecture.

### Accueil

Lors de la première découverte, l’accueil présente brièvement Todam et les trois actions essentielles : Vu, Noter, À voir. Cette présentation disparaît ensuite.

Accueil connecté, dans cet ordre :

1. Invitation compacte « Qu’as-tu vu récemment ? » menant à la recherche et à la note.
2. « À l’affiche près de [ville] » avec affiches de productions.
3. Aperçu « Explorer les salles », cadré sur la ville choisie.
4. « Tendances cette semaine » au niveau local puis national.
5. Activité publique des profils suivis.
6. Historique de consultation privé sous forme de reprise facultative.

La carte complète utilise des marqueurs regroupés. Sélectionner une salle ouvre une fiche contenant son nom et jusqu’à trois affiches actuelles. L’utilisateur peut dézoomer jusqu’à toute la France.

Les tendances portent sur les spectacles, jamais sur les mots recherchés. Elles utilisent les consultations uniques, ajouts À voir, entrées Vu et notes des sept derniers jours, avec décroissance temporelle et filtrage des activités anormales.

### Recherche

État vide :

- Barre de recherche immédiatement active.
- Recherches récentes privées et effaçables.
- Spectacles populaires du moment.
- Raccourcis Théâtre, Opéra, Ballet et Archives.

Résultats regroupés en :

- Spectacles
- Œuvres
- Artistes
- Lieux

Filtres disponibles : discipline, genre, ville, période, actuellement à l’affiche et archives. Un résultat Spectacle affiche l’affiche, le titre, la discipline, le lieu ou la ville, les prochaines dates et la moyenne lorsqu’elle est disponible.

En l’absence de résultat, Todam propose de corriger la recherche, d’inclure les archives ou de créer une entrée provisoire privée.

### Profil

En-tête :

- Avatar facultatif
- Nom d'utilisateur obligatoire
- Bio facultative
- Ville ou région facultative
- Abonnements et abonnés
- Modification du profil

Quatre compteurs cliquables dans une grille 2 × 2 :

- **Vus** : productions uniques vues
- **Notes** : productions actuellement notées
- **À voir** : productions de la liste système
- **Listes** : listes personnalisées, hors À voir

Contenu du profil personnel :

1. Journal récent unifié
2. Répartition des notes de 1 à 10
3. Deux onglets : genres les plus notés et genres les mieux notés
4. Aperçu À voir
5. Aperçu des listes
6. Liens « Voir tout » vers les pages complètes

Le journal affiche chaque production une seule fois. Le compteur Vus applique la même règle.

Un genre n’entre dans « mieux notés » qu’après trois notes personnelles. Une production pouvant posséder plusieurs genres, les totaux par genre ne sont pas additionnables.

### Pages publiques

- **Œuvre** : auteur ou compositeur, informations générales et productions associées. Aucune moyenne globale et aucun ajout À voir.
- **Spectacle** : affiche, production, créateurs, note, actions personnelles, résumé, dates, lieux, distribution, équipe artistique, genres, répartition des notes et critiques.
- **Lieu** : adresse, carte, informations pratiques, lien officiel discret, programmation et archives. Les lieux ne sont pas notés.
- **Artiste** : nom, photo autorisée, métiers, crédits présents dans Todam et prochaines apparitions. Pas de biographie éditoriale, de note ni d’abonnement artiste dans le MVP.

### Parcours d’inscription

Le catalogue reste consultable sans compte. L’inscription intervient au premier geste personnel et reprend ensuite automatiquement l’action commencée.

Après inscription :

1. Choix facultatif d’une ville.
2. Création du nom d'utilisateur.
3. Parcours guidé mais ignorable « Note cinq spectacles qui t’ont marqué ».
4. Recherche successive de souvenirs avec option de fiche provisoire privée.

Aucune autorisation GPS ou notification n’est demandée au premier lancement.

### Vu, note et critique

- **Vu** ajoute simplement le spectacle au journal, sans demander de date, de lieu ou de représentation.
- L’état **Déjà vu** confirme que le spectacle figure déjà dans le journal, sans ouvrir de gestion supplémentaire.
- **Noter** enregistre immédiatement un entier de 1 à 10 et marque implicitement la production comme vue.
- Une personne possède une seule note publique modifiable par production.
- Une production apparaît une seule fois dans le journal de la première version.
- Une production notée ou marquée vue quitte automatiquement À voir, avec une action Annuler. Elle peut ensuite être ajoutée de nouveau pour une revisite.
- Après la note, Todam peut proposer sans l’imposer : « Écrire une critique ».
- La gestion de plusieurs séances personnelles et leur rattachement à une représentation sont réservés à une évolution ultérieure.

Une critique publiée exige :

- Un titre
- Au moins 200 caractères
- Une note associée
- Une déclaration facultative « contient des révélations »

Les brouillons sont privés. Les critiques valides sont publiées immédiatement sauf détection automatique d’un risque. Elles peuvent être modifiées, supprimées ou signalées. Une critique contenant des révélations est repliée par défaut.

### À voir, listes et social

- À voir accepte uniquement des productions précises.
- À voir est privée par défaut.
- Les listes personnalisées sont ordonnées, réorganisables et privées à leur création.
- Une liste publique possède un titre, une description facultative et un lien partageable.
- Pas de listes collaboratives dans le MVP.
- Les membres peuvent suivre des profils et consulter leur activité publique.
- Pas de likes, réponses, commentaires entre membres ou messagerie.
- Blocage et signalement d’un profil restent toujours disponibles.

## 3. Catalogue, données et règles publiques

### Modèle conceptuel

| Objet | Rôle |
|---|---|
| Œuvre | Texte, composition ou œuvre chorégraphique intemporelle |
| Spectacle | Production ou mise en scène précise |
| Représentation | Date, heure, lieu et distribution éventuelle |
| Séance personnelle | Trace technique interne conservée pour une évolution ultérieure, non détaillée dans le MVP |
| Note | Un entier de 1 à 10 par membre et spectacle |
| Critique | Titre, texte et statut révélations associés à une note |
| Artiste | Personne créditée et rôles associés |
| Lieu | Salle ou établissement culturel |
| Liste | Collection ordonnée de spectacles |
| Suggestion | Fiche ou correction en attente de validation |

### Éligibilité

Le catalogue public accepte toute représentation publique, vérifiable et relevant du théâtre, de l’opéra ou du ballet, qu’elle soit professionnelle ou amateur.

La catégorie Théâtre comprend notamment théâtre classique et contemporain, comédie, drame, tragédie, théâtre musical, comédie musicale, marionnette, improvisation théâtrale et seul-en-scène théâtral. Stand-up, cirque, concerts et danse hors ballet restent hors MVP.

Les spectacles scolaires ou privés non ouverts au public, ateliers internes et captations vidéo ne rejoignent pas le catalogue public. Ils peuvent rester comme souvenirs privés provisoires.

Il n’existe aucune limite historique arbitraire. Un souvenir ancien incomplet reste privé jusqu’à son rattachement à une production vérifiable.

### Genres

Chaque spectacle possède :

- Une discipline principale : Théâtre, Opéra ou Ballet.
- Plusieurs genres provenant d’une taxonomie contrôlée.
- Aucun genre libre utilisé dans les statistiques.

Les membres peuvent suggérer une correction, mais seuls les imports validés, contributeurs de confiance ou administrateurs modifient la taxonomie publique.

### Approvisionnement

- La Base des lieux culturels du ministère sert de point de départ à la carte nationale : [API des lieux](https://basedeslieux.culture.gouv.fr/dictionnaire-des-donnees).
- OpenAgenda alimente les dates et événements lorsque les agendas et licences le permettent : [API OpenAgenda](https://developers.openagenda.com/).
- Les flux officiels de lieux partenaires peuvent compléter ou remplacer ces données.
- Les Archives du spectacle constituent une possibilité de partenariat, mais leur API professionnelle ne doit pas être considérée comme acquise : [services professionnels](https://lesarchivesduspectacle.net/services-aux-professionnels).
- Les affiches ne sont jamais reprises par scraping sans droit explicite. Une image générique par discipline remplace toute affiche indisponible.
- Chaque fiche indique ses sources et sa date de dernière mise à jour.

Un événement importé n’est pas automatiquement une nouvelle production : un processus de rapprochement doit d’abord rechercher œuvre, production, lieu et dates existantes.

### Contributions

Si un spectacle manque :

1. Le membre renseigne titre, discipline, année ou date approximative et lieu si connu.
2. Un lien officiel est recommandé et exigé pour publier rapidement une production actuelle.
3. L’entrée devient immédiatement utilisable dans son journal, avec le badge privé « À vérifier ».
4. Un contributeur de confiance ou administrateur approuve, corrige, fusionne ou refuse la suggestion.
5. La séance et la note sont automatiquement rattachées à la fiche validée.

Rôles : visiteur, membre, contributeur de confiance et administrateur.

### Moyennes

- Seuls les comptes vérifiés influencent la moyenne.
- Une note privée reste comptée anonymement.
- Une production affichant moins de cinq notes montre uniquement le nombre de notes.
- À partir de cinq notes, Todam affiche la moyenne arithmétique sur 10 avec une décimale.
- Toucher la moyenne ouvre la répartition complète de 1 à 10 avec nombres et pourcentages.
- Les activités suspectes sont exclues avant calcul ; le MVP n’utilise pas de pondération secrète.
- Il n’existe pas de classement public « meilleurs spectacles » dans le MVP.

### Confidentialité et conformité

- Profil minimal public sous nom d'utilisateur.
- Notes publiques par défaut, avec réglage global permettant de les masquer.
- Journal public limité au spectacle et à la note éventuelle.
- Date exacte, lieu, distribution, À voir, historique de consultation et fiches provisoires restent privés par défaut.
- Publication volontaire nécessaire pour chaque liste et critique.
- Ville facultative ; aucune position GPS stockée.
- Export CSV et JSON du journal, notes, critiques, À voir et listes.
- Suppression du compte et exercice des droits accessibles dans les paramètres.

La limite de 15 ans évite initialement le parcours de consentement parental requis en France pour certains traitements fondés sur le consentement : [règles de la CNIL](https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans).

Les critiques et profils publics imposent un mécanisme clair de signalement, une justification des décisions de modération et une voie de contestation, à valider juridiquement au regard du DSA : [synthèse de l’Arcom](https://www.arcom.fr/espace-professionnel/reglement-sur-les-services-numeriques-ou-dsa-obligations-et-services-concernes).

## 4. Direction design

### Identité visuelle retenue

Direction **éditoriale contemporaine** : lumineuse, chaleureuse, française et culturelle, avec davantage de densité utilitaire sur les écrans de recherche et de statistiques.

La référence visuelle produite pendant la conception fixe l’atmosphère, pas les contenus, dates ou composants définitifs.

Tokens provisoires :

- Fond principal : ivoire `#F7F3EC`
- Surface : `#FFFDF8`
- Texte principal : encre `#151515`
- Texte secondaire : `#6F6B64`
- Accent accessible : vermillon `#C43D28`
- Titres : Source Serif 4
- Interface et données : Inter
- Affiches : ratio 2:3
- Grille : multiples de 8 px
- Coins : 12 px par défaut, sans surutilisation

### Langage visuel

- Affiches dominantes ; décoration de marque discrète.
- Aucun rideau rouge, masque, dorure ou projecteur comme cliché graphique.
- Titres éditoriaux en serif ; contrôles, filtres et métadonnées en sans-serif.
- Cartes sobres, ombres très légères et hiérarchie obtenue par l’espace et la typographie.
- Icônes linéaires accompagnées d’un libellé pour les actions importantes.
- Ton rédactionnel chaleureux, direct et non élitiste.
- Signature : **Mon journal de spectacles**.
- Périmètre du catalogue au lancement : **Théâtre, opéra et ballet**.

### Accessibilité

- Conformité visée : WCAG 2.2 AA.
- Contraste minimal de 4,5:1 pour le texte courant.
- Zones tactiles d’au moins 44 × 44 px.
- Tailles de texte adaptatives et zoom sans perte de fonction.
- Aucun état communiqué uniquement par une couleur.
- Alternatives textuelles aux affiches et à la carte.
- Histogrammes accompagnés d’un tableau ou résumé lisible par lecteur d’écran.
- Révélations masquées par un contrôle explicite.
- Animations courtes et compatibles avec la préférence de réduction des mouvements.
- Le mode sombre reste dans la roadmap, pas dans le MVP.

### États essentiels

- Aucun spectacle dans la ville : élargir la zone, changer de ville ou suggérer une fiche.
- Moins de cinq notes publiques : afficher le compteur sans moyenne.
- Moins de trois notes personnelles par genre : expliquer combien manquent pour débloquer la statistique.
- Affiche absente : visuel Todam par discipline, jamais une image récupérée arbitrairement.
- Suggestion en attente : fiche privée utilisable avec statut détaillé.
- Contenu retiré : explication et accès à la contestation.
- Erreur réseau : conserver les saisies et proposer Réessayer.
- Carte inaccessible : liste équivalente des salles.

## 5. MVP, validation et évolutions

### Première version publique

Le MVP inclut :

- Catalogue, recherche et pages Œuvre, Spectacle, Lieu et Artiste.
- Carte par ville.
- Comptes sous nom d'utilisateur, 15+.
- Statut Vu simple, note sur 10 et critiques structurées.
- Profil, journal, quatre compteurs et statistiques.
- À voir et listes personnalisées.
- Profils suivis sans réactions.
- Suggestions privées et outil de modération.
- Signalement, blocage, confidentialité, export et suppression.
- Notifications limitées : nouvel abonné, suggestion validée et nouvelle date d’un spectacle À voir.
- Web public indexable et applications iOS et Android cohérentes.

### Validation produit

Scénarios obligatoires avant ouverture :

- Retrouver et noter cinq souvenirs sans aide.
- Distinguer une œuvre de plusieurs mises en scène portant le même titre.
- Noter en moins de dix secondes sans remplir date ou commentaire.
- Marquer vu sans noter.
- Vérifier qu’un spectacle vu apparaît une seule fois dans le journal.
- Retirer automatiquement un spectacle de À voir puis annuler.
- Comprendre pourquoi une moyenne n’apparaît pas avant cinq notes.
- Vérifier depuis une session déconnectée que les actions personnelles restent privées.
- Créer une fiche provisoire, la valider puis conserver le statut Vu et la note.
- Résoudre un homonyme artiste et fusionner un doublon de production.
- Publier, masquer, signaler, modifier et supprimer une critique.
- Utiliser recherche, carte, histogramme et navigation avec des technologies d’assistance.
- Exporter toutes les données dans les deux formats annoncés.

Indicateurs à suivre :

- Taux de nouveaux comptes atteignant cinq spectacles consignés sous sept jours.
- Temps médian pour enregistrer une note.
- Taux de recherches menant à une fiche ou une suggestion.
- Recherches sans résultat et doublons créés.
- Rétention à 30 et 90 jours des membres activés.
- Nombre de spectacles consignés par membre actif sur 90 jours.
- Délai de traitement des suggestions et signalements.
- Part des notes accompagnées d’une critique, sans en faire un objectif de croissance.

### Boîte à idées et roadmap

- Sous-notes facultatives par discipline.
- Gestion de plusieurs séances personnelles avec date et représentation précises.
- Import CSV avec résolution des correspondances.
- Rétrospective annuelle partageable.
- Votes « critique utile ».
- Recommandations personnalisées.
- Suivi des artistes, œuvres et lieux.
- Mode sombre.
- Listes collaboratives.
- Badges et objectifs culturels.
- Extension à la danse, au cirque et à l’humour.
- Ouverture éditoriale à la francophonie.
- Modèle économique, uniquement après validation de l’usage.

### Hypothèses explicites

- Todam est le nom retenu, sous réserve de la validation juridique et commerciale préalable au lancement.
- Aucun choix de technologie, d’hébergement ou d’architecture logicielle n’est inclus dans cette fiche.
- L’accès aux données professionnelles et aux droits d’affiches devra être audité avant développement.
- Les obligations RGPD, DSA, propriété intellectuelle et modération devront être relues par un professionnel avant lancement.
- Les propositions visuelles sont des références de direction, pas des maquettes finales prêtes au développement.
