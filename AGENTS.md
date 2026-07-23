# Instructions pour les agents de code

## Portée

Todam est un monorepo TypeScript en phase de conception. Ne créez pas
d'implémentation fonctionnelle sans demande explicite. Préservez les
modifications existantes et limitez chaque changement au besoin demandé.

## Architecture et licences

- `apps/todam` : Expo universel — Apache-2.0.
- `apps/api` : Fastify — AGPL-3.0.
- `apps/jobs` : imports et tâches serveur — AGPL-3.0.
- `packages/contracts` : Zod/OpenAPI — Apache-2.0.
- `packages/design-system` : composants universels — Apache-2.0.
- `packages/domain` : règles serveur — AGPL-3.0.
- `packages/database` : Drizzle/migrations — AGPL-3.0.

Le code Apache ne doit jamais importer de code AGPL. Les échanges se font par
HTTP et par le client généré depuis `packages/contracts`.

## Règles de travail

- TypeScript strict lorsque le code sera créé.
- Toute évolution d'API met à jour OpenAPI et ses tests.
- Toute évolution de schéma passe par une migration versionnée.
- Les rôles, permissions et règles métier sont déclarés dans le code.
- Aucun secret, export de production, contenu sans droits ou donnée
  personnelle réelle dans Git.
- Les affiches et données importées exigent une provenance et une licence
  documentées.
- Le français est la langue principale du produit et de la documentation.
- Utiliser des commits DCO avec `git commit -s`.

## Vérifications

À ce stade :

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm validate:openapi
pnpm check:licenses
```

Les commandes sont volontairement limitées aux contrôles du socle tant qu'il
n'existe aucun code produit. Elles devront devenir de vrais contrôles de build
et de tests au démarrage de l'implémentation.

## Définition de terminé

Une modification est terminée lorsque sa documentation et ses tests sont à
jour, que la CI est verte, que la frontière de licence est respectée et
qu'aucune validation prétendue n'excède ce qui a réellement été exécuté.
