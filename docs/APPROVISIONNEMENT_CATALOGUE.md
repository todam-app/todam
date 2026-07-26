# Approvisionnement automatisé du catalogue

## Objectif

Todam initialise et actualise un catalogue national de théâtre, d'opéra et de ballet
sans analyser les pages HTML ni les PDF de programmation. Les imports automatiques
acceptent uniquement des API ou des exports structurés dont la provenance et les droits
sont enregistrés.

Le socle ne prétend pas couvrir tous les spectacles français. Il mesure ce qui a
réellement été reçu et distingue toujours :

- la couverture des lieux ;
- la couverture des productions et représentations futures ;
- la couverture des affiches publiables ;
- les éléments exclus ou placés en attente de vérification.

## Sources opérationnelles

| Source                                                                                                        | Apport                                | Accès               | Fréquence recommandée |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------- | --------------------: |
| [Base des lieux culturels](https://www.data.gouv.fr/datasets/base-des-lieux-et-equipements-culturels-basilic) | lieux et géolocalisation              | API ouverte         |               7 jours |
| [DATAtourisme](https://www.datatourisme.fr/)                                                                  | événements, dates et certains visuels | export JSON/JSON-LD |             24 heures |
| [OpenAgenda](https://developers.openagenda.com/evenements/lecture/)                                           | événements, dates, retraits et images | API avec clé        |              6 heures |

Ticketmaster, France Billet, HelloAsso et les flux directs des salles ne sont pas
activés par défaut. Un connecteur ne doit être ouvert qu'après validation du contrat, de
la durée de cache autorisée et des droits propres aux images.

## Modèles de constitution et de croissance du catalogue

Les catalogues les plus fournis ne proviennent généralement pas d'une API publique
unique. Ils combinent quatre mécanismes complémentaires :

1. des données ouvertes pour amorcer la couverture ;
2. des contributions communautaires pour ajouter les spectacles et affiches manquants ;
3. des contributions directes de professionnel·les qui ont intérêt à être visibles ;
4. des flux contractuels de billetterie ou de distribution.

### Contribution communautaire et parcours d'ajout

L'ajout d'un spectacle ou d'une affiche n'est pas réservé aux professionnel·les. Le
parcours s'inspire des catalogues contributifs comme Babelio :

1. l'utilisateur recherche d'abord le spectacle ;
2. Todam élargit la recherche et présente les correspondances déjà connues ;
3. l'utilisateur ajoute la fiche existante lorsqu'il la trouve ;
4. si aucune correspondance ne convient, il crée manuellement le spectacle ;
5. depuis la fiche, il peut proposer ou modifier l'affiche depuis une page web ou en
   chargeant un fichier.

Chaque affiche contributive reste liée au compte qui l'a proposée. Todam conserve la
page source, le crédit et la licence lorsqu'ils sont connus, ainsi que la date du dépôt.
Une procédure de signalement et de retrait permet de masquer rapidement un visuel
contesté. La revendication ultérieure de la fiche par une compagnie ou un théâtre permet
de confirmer ou de remplacer l'affiche, mais elle n'est pas nécessaire pour contribuer.

Todam ne génère pas de fausse affiche pour combler une absence. Une production sans
visuel reste publiable et affiche explicitement « Affiche non disponible ».

L'ajout en masse accepte à terme :

- plusieurs URL de spectacles ou d'événements ;
- une page de programmation d'un théâtre ou d'un festival ;
- des identifiants ou URL OpenAgenda ;
- un fichier CSV, XLSX ou JSON contenant au minimum le titre et la compagnie, et
  éventuellement les représentations, la source et l'URL de l'affiche.

Contrairement au livre et à son ISBN, le spectacle ne possède pas d'identifiant
universel. Avant toute création en masse, Todam présente donc les fiches existantes
trouvées, les rapprochements incertains et les nouvelles fiches proposées. Aucun
rapprochement incertain n'est fusionné automatiquement.

### Contribution directe des organisateurs

[BilletRéduc](https://www.billetreduc.com/annonceur/texte.htm) permet aux
organisateur·rices de référencer gratuitement un événement depuis un espace
professionnel. Ils renseignent les dates, tarifs et quotas de places ; l'équipe de la
plateforme valide et peut adapter la fiche avant sa publication. Le catalogue est donc
principalement alimenté par les structures qui commercialisent leurs spectacles, et non
par une collecte automatique de sites tiers.

Le [festival Off Avignon](https://www.festivaloffavignon.com/page/compagnie) applique un
parcours plus fermé et vérifié :

1. le théâtre contractualise avec la compagnie ;
2. le théâtre s'inscrit aux services d'Avignon Festival & Compagnies et déclare les
   compagnies accueillies ;
3. chaque compagnie reçoit ses propres identifiants et complète son inscription ;
4. l'inscription payante donne notamment accès au programme officiel papier et numérique
   ainsi qu'à Ticket'Off.

Ce modèle explique comment un programme de près de deux mille spectacles peut être
constitué : les théâtres établissent la chaîne de confiance et les compagnies alimentent
progressivement leurs propres fiches.

### Distribution contractuelle

[France Billet](https://www.francebillet.pro/editorial/contact) travaille avec les
producteur·rices et organisateur·rices dans le cadre d'un partenariat de distribution.
L'organisateur reste responsable de l'événement et des billets ; France Billet agit
comme agent distributeur, commercialise le stock confié et diffuse l'offre dans le
réseau Fnac Spectacles et ses autres canaux autorisés.

Le catalogue peut ensuite être exposé à des partenaires autorisés, par exemple au moyen
du
[flux XML quotidien du programme d'affiliation Fnac Spectacles](https://www.francebillet.com/campaign/affiliation-partenaire).
Ce flux est un produit de distribution soumis à partenariat, pas une source ouverte à
recopier.

### Conséquences pour Todam

La stratégie de long terme doit donc superposer plusieurs voies :

- conserver OpenAgenda, DATAtourisme et les autres sources ouvertes comme amorçage ;
- proposer « Ajouter un spectacle » et « Ajouter ou modifier l'affiche » à toute
  personne disposant d'un compte ;
- proposer « Revendiquer cette fiche » aux compagnies, théâtres et producteurs ;
- vérifier le rattachement professionnel avant de leur permettre de corriger une fiche ;
- conserver l'identité de la personne ou de la structure contributrice, la provenance,
  la date et l'historique des modifications ;
- offrir une contrepartie claire aux contributeur·rices : visibilité, lien de
  réservation, avis et indicateurs utiles ;
- rechercher des exports ou API contractuels auprès des festivals, réseaux de salles et
  distributeurs lorsque leur couverture le justifie.

Ces fonctions sont des évolutions candidates, pas des capacités présentes dans le socle.
Aucun catalogue BilletRéduc, France Billet ou festival Off Avignon ne doit être copié
sans accord. Les textes, affiches et photographies restent soumis aux permissions,
licences, crédits et durées d'utilisation propres à chaque partenaire.

## Configuration

Les secrets restent dans l'environnement du service de tâches :

```dotenv
TODAM_DATATOURISME_URL=https://exemple/export-national.json
TODAM_OPENAGENDA_API_KEY=...
TODAM_OPENAGENDA_AGENDA_UIDS=123456,789012
TODAM_OPENAGENDA_API_URL=https://api.openagenda.com/v2/agendas
TODAM_OPENAGENDA_DISCOVERY_TERMS=théâtre,opéra,ballet,spectacle vivant
TODAM_OBJECT_ENDPOINT=https://identifiant.r2.cloudflarestorage.com
TODAM_OBJECT_REGION=auto
TODAM_OBJECT_BUCKET=todam-posters
TODAM_OBJECT_ACCESS_KEY_ID=...
TODAM_OBJECT_SECRET_ACCESS_KEY=...
TODAM_OBJECT_PUBLIC_BASE_URL=https://media.todam.fr
```

La Base des lieux utilise son API publique par défaut. `TODAM_BASE_LIEUX_URL` permet de
la remplacer dans un environnement de test.

La découverte des agendas officiels correspondant aux disciplines est automatisée :

```bash
pnpm catalog:discover:openagenda
```

La commande fournit une liste dédupliquée et la valeur `agendaUids` prête à relire.
L'inscription dans `TODAM_OPENAGENDA_AGENDA_UIDS` reste un contrôle humain volontaire :
elle évite d'aspirer un agenda homonyme ou hors périmètre.

## Commandes

Une exécution sans `--apply` télécharge, normalise et valide le flux sans modifier la
base :

```bash
pnpm catalog:sync -- --source base-lieux
pnpm catalog:sync -- --source datatourisme
pnpm catalog:sync -- --source openagenda
```

Après la migration `0003_national_catalog_media`, l'écriture est explicite :

```bash
pnpm catalog:sync -- --source base-lieux --apply
pnpm catalog:sync -- --source datatourisme --apply
pnpm catalog:sync -- --source openagenda --apply
pnpm catalog:media:mirror
```

L'état mesuré du catalogue est disponible en JSON :

```bash
pnpm catalog:status
```

Il comprend le nombre de productions, les représentations futures, les affiches
publiables, le pourcentage de productions avec affiche et la fraîcheur de chaque source.

Dans l'image de production des tâches, les mêmes entrées sont disponibles sous
`dist/catalog-sync.js` et `dist/catalog-status.js`.

## Planification

Trois tâches planifiées indépendantes doivent être créées dans Coolify :

| Tâche          | Expression cron UTC | Commande                                                  |
| -------------- | ------------------- | --------------------------------------------------------- |
| OpenAgenda     | `17 */6 * * *`      | `node dist/catalog-sync.js --source openagenda --apply`   |
| DATAtourisme   | `43 2 * * *`        | `node dist/catalog-sync.js --source datatourisme --apply` |
| Base des lieux | `11 4 * * 1`        | `node dist/catalog-sync.js --source base-lieux --apply`   |
| Miroir images  | `47 * * * *`        | `node dist/catalog-media-mirror.js`                       |

Les horaires sont décalés pour éviter un démarrage simultané. Une source défaillante
n'empêche pas les deux autres de s'actualiser. Après un échec, son état demande une
nouvelle tentative une heure plus tard et incrémente son compteur d'échecs.

## Identité et mises à jour

L'identité d'une œuvre, d'un lieu, d'un artiste, d'une production ou d'une
représentation repose sur la source et son identifiant externe. Le `slug` sert seulement
à l'URL publique. Un changement de titre ne crée donc pas automatiquement une nouvelle
fiche.

Les identifiants externes de plusieurs sources doivent néanmoins pouvoir être rattachés
au même spectacle canonique. La clé métier de dédoublonnage d'un spectacle est :

```text
titre normalisé + compagnie normalisée
```

Le lieu et la date décrivent une représentation et ne participent pas à l'identité du
spectacle. Un même spectacle présenté par la même compagnie à Paris en 2023 puis à
Avignon en 2026 conserve donc une seule fiche et possède plusieurs représentations.
Lorsque la compagnie est absente, Todam peut suggérer un rapprochement, mais ne fusionne
pas automatiquement les fiches.

Chaque lot enregistre :

- la source et le document observé ;
- l'identifiant externe de chaque entité ;
- l'heure d'observation ;
- l'empreinte du lot ;
- le curseur avant et après synchronisation ;
- les volumes reçus, acceptés et exclus ;
- le statut et l'erreur éventuelle.

OpenAgenda est ensuite lu de manière incrémentale avec `updatedAt[gte]`. Le connecteur
demande aussi les événements retirés ; il désactive alors la production, ses
représentations encore à venir et ses affiches.

## Affiches et droits

Une affiche possède son URL d'origine, son crédit, son détenteur éventuel, sa licence,
sa source et sa période de validité. Sa politique de stockage est indépendante des
métadonnées du spectacle :

| Politique         | Comportement                            |
| ----------------- | --------------------------------------- |
| `mirror`          | copie autorisée vers le stockage objet  |
| `hotlink`         | affichage depuis l'URL de la source     |
| `temporary_cache` | cache limité par le contrat             |
| `metadata_only`   | référence conservée, image non affichée |
| `forbidden`       | aucun usage de l'image                  |

La base refuse `mirror` sans licence ouverte ou permission explicite. Un visuel sans
crédit importé depuis une source ouverte reste en `review_required` et `metadata_only`.
L'API publique filtre les médias inactifs, expirés, interdits ou en attente de
vérification. En l'absence de visuel publiable, l'application affiche explicitement «
Affiche non disponible » sans générer d'affiche de remplacement.

Le téléchargement vers R2 est séparé de l'import de métadonnées. Le job refuse HTTP, les
ports personnalisés, les réseaux privés, les formats actifs comme SVG et les fichiers de
plus de 15 Mo. Il suit au plus cinq redirections, contrôle la signature JPEG, PNG, WebP
ou AVIF, puis utilise une clé adressée par SHA-256. Une modification de l'URL d'origine
invalide automatiquement l'ancienne copie.

## Extension à de nouvelles sources

Un nouveau connecteur doit produire le contrat `CatalogImportSchema` v2 et fournir au
minimum :

1. une clé source stable et un type de connecteur ;
2. une couverture géographique et temporelle ;
3. un document source et sa licence ;
4. des identifiants externes stables ;
5. pour chaque image, un crédit et une politique de stockage explicites.

Les tests doivent prouver la pagination, l'idempotence, les annulations, la disparition
d'une image et le refus d'une copie sans droit. Le connecteur reste désactivé tant que
les conditions d'utilisation n'ont pas été archivées et validées.
