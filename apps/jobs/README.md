# Tâches Todam

CLI d'import normalisé et idempotent du catalogue Todam.

```bash
pnpm catalog:import --file ../../data/fixtures/theatre-des-muses.sample.json --dry-run
pnpm catalog:import --file ../../data/fixtures/theatre-des-muses.sample.json --apply
```

Le mode `--apply` exécute chaque lot dans une transaction. Le mode `catalog:coverage`
produit le rapport de couverture sans modifier PostgreSQL.

Licence : AGPL-3.0-only.
