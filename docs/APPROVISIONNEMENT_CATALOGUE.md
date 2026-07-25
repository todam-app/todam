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
vérification. L'application affiche alors son visuel de remplacement.

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
