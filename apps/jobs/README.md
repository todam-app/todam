# Tâches Todam

CLI d'import normalisé et idempotent du catalogue Todam.

```bash
pnpm catalog:import --file ../../data/fixtures/theatre-des-muses.sample.json --dry-run
pnpm catalog:import --file ../../data/fixtures/theatre-des-muses.sample.json --apply
```

Le mode `--apply` exécute chaque lot dans une transaction. Le mode `catalog:coverage`
produit le rapport de couverture sans modifier PostgreSQL.

La purge quotidienne des comptes jamais vérifiés depuis sept jours s'exécute avec :

```bash
pnpm accounts:purge-unverified
```

Le rapport hebdomadaire du nombre de comptes s'envoie avec :

```bash
pnpm accounts:report
```

Cette commande exige `DATABASE_URL`, `BREVO_API_KEY`, `EMAIL_FROM` et
`TODAM_OPERATIONS_EMAIL`. Le rapport ne contient que des nombres agrégés. Il déclenche
un avertissement à partir de 900 comptes et signale le seuil maximal à 1 000 comptes.

Licence : AGPL-3.0-only.
