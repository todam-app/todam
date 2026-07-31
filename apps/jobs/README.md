# Tâches Todam

CLI d'import normalisé et idempotent du catalogue Todam.

```bash
pnpm catalog:import --file ../../data/fixtures/theatre-des-muses.sample.json --dry-run
pnpm catalog:import --file ../../data/fixtures/theatre-des-muses.sample.json --apply
```

Le mode `--apply` exécute chaque lot dans une transaction. Le mode `catalog:coverage`
produit le rapport de couverture sans modifier PostgreSQL.

Pour remplacer automatiquement le catalogue actif par plusieurs fichiers, utiliser une
seule commande avec un argument `--file` par source :

```bash
pnpm catalog:replace \
  --file ../../data/private/theatre-des-muses.2025-2026.json \
  --file ../../data/private/anthea-antibes.2025-2026.json \
  --file ../../data/private/festival-off-avignon.selection-2026.json
```

Sans option, la commande valide tous les fichiers et produit uniquement un rapport.
`--stage` importe ensuite tous les lots dans une transaction globale sans toucher à
l'ancien catalogue actif. Après modération des nouvelles fiches, `--apply` rejoue les
imports puis passe automatiquement `is_active` à `false` pour chaque ancienne production
qui n'est liée à aucune des nouvelles sources :

```bash
pnpm catalog:replace \
  --file ../../data/private/theatre-des-muses.2025-2026.json \
  --file ../../data/private/anthea-antibes.2025-2026.json \
  --file ../../data/private/festival-off-avignon.selection-2026.json \
  --apply
```

La commande ne supprime aucune ligne et préserve donc les listes, notes et avis liés.
Elle refuse un remplacement sans nouvelle production et annule l'ensemble si l'un des
lots échoue. Elle ne contourne pas la modération : les nouvelles fiches restent soumises
à leurs règles normales de publication. Si l'une d'elles n'est pas encore publiée,
`--apply` annule la bascule et laisse l'ancien catalogue actif.

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
