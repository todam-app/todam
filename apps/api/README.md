# API Todam

API REST Fastify de Todam : catalogue public, tableau de bord personnel, interactions
transactionnelles, Better Auth et contrat OpenAPI.

```bash
pnpm --filter @todam/api dev
```

Les probes sont disponibles sous `/health/live` et `/health/ready`, le contrat sous
`/openapi.json` et Swagger UI sous `/documentation`.

Les contrats juridiques publics sont exposés sous `/v1/legal/current`. Les parcours
authentifiés comprennent l'export `/v1/me/export`; la demande de suppression hors
application utilise `/v1/account-deletion/request` puis `/v1/account-deletion/confirm`.

Licence : AGPL-3.0-only.
