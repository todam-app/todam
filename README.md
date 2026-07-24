# Todam

> Le journal open source du spectacle vivant — théâtre, opéra et ballet.

Todam est un projet français pour découvrir, enregistrer et noter les spectacles vivants
que l'on a vus ou que l'on souhaite voir. L'objectif est de proposer au théâtre, à
l'opéra et au ballet un journal personnel et un catalogue communautaire aussi simple à
utiliser qu'une application de référence pour le cinéma.

Le Sprint 0 contient une première boucle Web fonctionnelle sur le catalogue du Théâtre
des Muses : compte, recherche, représentations, statut « Vu », note, liste « À voir » et
profil.

## Documentation

- [Fiche produit](docs/FICHE_PRODUIT.md)
- [Architecture technique](docs/ARCHITECTURE_TECHNIQUE.md)
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

```bash
cp .env.example .env
pnpm install
pnpm dev:db
pnpm db:migrate
pnpm catalog:import --file data/fixtures/theatre-des-muses.sample.json --apply
pnpm dev
```

L'application Web répond sur `http://localhost:8081`, l'API sur `http://localhost:3000`
et sa documentation sur `http://localhost:3000/documentation`.

Le corpus réel du Théâtre des Muses reste sous `data/private/`, ignoré par Git. Le dépôt
public fournit uniquement son schéma et une fixture synthétique.

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
performances: theatre, opera and ballet. Sprint 0 implements its first end-to-end Web
loop. Client-side code is licensed under Apache-2.0, server-side code under AGPL-3.0,
and contributions use the DCO without a CLA.
