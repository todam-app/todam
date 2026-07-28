# Todam

> Mon journal de spectacles.

Todam est un projet français pour découvrir, enregistrer et noter les spectacles vivants
que l'on a vus ou que l'on souhaite voir. L'objectif est de proposer au théâtre, à
l'opéra et au ballet un journal personnel et un catalogue communautaire aussi simple à
utiliser qu'une application de référence pour le cinéma.

La bêta pilote Web comprend un catalogue éditorialisé, une démonstration publique de la
programmation 2026–2027 de l’Hexagone Scène nationale, des fiches spectacle complètes,
un journal filtrable, des avis et des listes partageables. Les lieux et les compagnies
sont lus depuis PostgreSQL par l’API : les routes publiques sont génériques et ne
contiennent aucune fiche métier codée en dur.

Les salles disposent d’un parcours de vérification et de correction. Une compagnie peut
revendiquer sa fiche puis préparer une révision dans un brouillon distinct de la version
publique. La publication, le refus et la restauration restent validés par un rôle Todam
pendant le pilote.

## Documentation

- [Fiche produit](docs/FICHE_PRODUIT.md)
- [Architecture technique](docs/ARCHITECTURE_TECHNIQUE.md)
- [Approvisionnement et qualité du catalogue](docs/APPROVISIONNEMENT_CATALOGUE.md)
- [Fonctions sociales et modération](docs/MODERATION_V2.md)
- [Déploiement OVHcloud avec Coolify](docs/DEPLOIEMENT_OVH_COOLIFY.md)
- [Préparation du lancement légal](docs/LANCEMENT_LEGAL.md)
- [Registre des traitements](docs/REGISTRE_TRAITEMENTS.md)
- [Préparation Google Play Data Safety](docs/GOOGLE_PLAY_DATA_SAFETY.md)
- [Validation du MVP à Avignon et Monaco](docs/MVP_VALIDATION.md)
- [Guide de contribution](CONTRIBUTING.md)
- [Gouvernance](GOVERNANCE.md)
- [Politique de sécurité](SECURITY.md)

## Monorepo

```text
apps/
  todam/          Expo Web, iOS et Android
  api/            API Fastify
  jobs/           imports et tâches serveur
packages/
  contracts/      contrats Zod et OpenAPI partagés
  design-system/  composants universels
  domain/         règles métier serveur
  database/       Drizzle et migrations
```

La frontière de licence est volontairement stricte : le client Apache-2.0 ne peut
dépendre que de modules Apache-2.0. Il communique avec les composants AGPL-3.0 par l'API
et les contrats publics.

## Démarrage local

Prérequis : Node 24, pnpm 11 et Docker Desktop.

Sous Windows, la commande suivante vérifie les prérequis, prépare la base et lance
l'application complète :

```cmd
start-todam.cmd
```

Le script crée automatiquement le fichier `.env` lors du premier lancement et utilise le
corpus privé du Théâtre des Muses lorsqu'il est disponible. Sinon, il importe la fixture
synthétique du dépôt. Ce jeu de développement historique est distinct de la cohorte
publique du pilote.

Le démarrage manuel reste possible :

```bash
cp .env.example .env
pnpm install
pnpm dev:db
pnpm db:migrate
pnpm catalog:import --file data/fixtures/theatre-des-muses.sample.json --apply
pnpm catalog:seed:hexagone --apply
pnpm dev
```

La commande Hexagone importe des métadonnées factuelles sourcées, des résumés originaux
Todam et aucun visuel tiers. Elle conserve les entités dans la base et peut être rejouée
sans transformer les pages React en catalogue codé en dur.

L'application Web répond sur `http://localhost:8081`, l'API sur `http://localhost:3000`
et sa documentation sur `http://localhost:3000/documentation`.

Le corpus réel du Théâtre des Muses reste sous `data/private/`, ignoré par Git. Le dépôt
public fournit uniquement son schéma et une fixture synthétique.

## Documents juridiques

Les pages juridiques sont générées depuis `docs/legal` :

```bash
pnpm legal:generate
pnpm legal:pdf
pnpm legal:check
```

## Licences et marque

Ce monorepo utilise plusieurs licences :

- Apache-2.0 pour l'application, les contrats, le design system, la documentation et les
  outils communs ;
- AGPL-3.0 pour l'API, les tâches serveur, le domaine et la base de données.

Le détail faisant foi se trouve dans [LICENSE.md](LICENSE.md). Le nom et le logo Todam
ne sont pas accordés avec les licences du code : voir [TRADEMARKS.md](TRADEMARKS.md).

Les données personnelles, les affiches et les données culturelles importées ne sont pas
automatiquement placées sous les licences du code.

## Contribuer

Les contributions sont bienvenues. Todam utilise le
[Developer Certificate of Origin](https://developercertificate.org/) (DCO), sans CLA.
Chaque commit doit être signé avec :

```bash
git commit -s
```

Consultez [CONTRIBUTING.md](CONTRIBUTING.md) avant de proposer une modification.

## English summary

Todam is an open-source, France-first journal and community catalogue for live
performances: theatre, opera and ballet. Its Web pilot includes sourced public catalogue
pages, member journals and lists, and moderated venue/company workflows. Client-side
code is licensed under Apache-2.0, server-side code under AGPL-3.0, and contributions
use the DCO without a CLA.
