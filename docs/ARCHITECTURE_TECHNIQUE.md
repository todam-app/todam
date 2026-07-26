# Architecture technique de Todam

## 1. Architecture retenue

Todam sera un monorepo TypeScript « configuration as code » :

```mermaid
flowchart LR
    U["Web, iOS, Android"] --> CF["Cloudflare<br/>DNS et cache"]
    CF --> W["Expo Web statique<br/>Nginx"]
    CF --> B["API REST Fastify"]
    W --> B
    B --> D["PostgreSQL<br/>PostGIS + recherche"]
    B --> E["Cloudflare R2<br/>affiches et sauvegardes"]
    B --> F["Brevo<br/>e-mails transactionnels"]
    G["Imports et tâches planifiées"] --> D
    CI["GitHub Actions"] --> R["Images GHCR"]
    R --> K["Coolify autohébergé"]
    K --> W
    K --> B
    K --> G
```

- **Frontend** : Expo Router + React Native Web.
- **Backend** : Node.js TypeScript + Fastify.
- **Contrats** : Zod + OpenAPI, avec client TypeScript généré pour Expo.
- **Base** : PostgreSQL/PostGIS sur le VPS OVHcloud, piloté par Drizzle et des migrations
  versionnées.
- **Authentification** : Better Auth, compatible Expo Web/natif, avec Apple, Google et connexion par email ou nom d'utilisateur avec mot de passe.
- **Infrastructure** : VPS-2 OVHcloud en France pour Coolify, le Web, l'API, les tâches
  et PostgreSQL ; Cloudflare R2 pour les images et les sauvegardes logiques
  externalisées.
- **Déploiement** : GitHub Actions construit les images Docker, les publie dans GHCR et
  demande à Coolify de télécharger les images déjà construites.
- **Pas de Strapi ni Supabase** : aucun rôle, token ou réglage métier ne dépendra d’une console propriétaire.

Structure prévue :

- `apps/todam` : application Expo universelle et back-office Web protégé.
- `apps/api` : API Fastify et commandes d’administration.
- `apps/jobs` : imports et tâches planifiées, activés progressivement.
- `packages/contracts` : schémas Zod et client OpenAPI.
- `packages/domain` : règles métier indépendantes du transport.
- `packages/database` : schéma Drizzle, migrations et seeds.
- `packages/design-system` : tokens Todam et composants partagés.

Expo prend officiellement en charge les monorepos pnpm et le partage entre Web, Android et iOS. [Documentation Expo monorepo](https://docs.expo.dev/guides/monorepos/)

## 2. Frontend Expo universel

- Expo Router avec routes typées, TypeScript strict et navigation adaptée :
  - barre inférieure sur mobile ;
  - navigation supérieure sur Web ;
  - mêmes URLs publiques pour œuvres, spectacles, artistes, lieux et profils.
- Design system Todam construit sur les primitives React Native, avec tokens centralisés et NativeWind pour le responsive.
- TanStack Query pour les données serveur, React Hook Form + Zod pour les formulaires et état local minimal.
- Composants `.web.tsx` et `.native.tsx` uniquement lorsque la plateforme le justifie :
  - carte MapLibre Web et adaptateur natif ;
  - tableaux/statistiques accessibles spécifiques au Web ;
  - onglets et interactions mobiles natives.
- Back-office disponible sous `/admin` sur le Web uniquement :
  - catalogue et taxonomie ;
  - validation/fusion des suggestions ;
  - imports ;
  - modération, signalements et audit ;
  - gestion des rôles des comptes.
- WCAG 2.2 AA : HTML sémantique sur les pages Web spécifiques, alternatives aux cartes, tableaux accompagnant les graphiques et tests clavier/lecteur d’écran.

Le Web utilisera le rendu statique stable d’Expo. Les pages dynamiques connues seront générées avec `generateStaticParams`. Toute publication de catalogue déclenchera une reconstruction du site. Le SSR Expo étant encore marqué alpha, il ne sera pas une dépendance du MVP. [Rendu statique](https://docs.expo.dev/router/web/static-rendering/), [état du SSR](https://docs.expo.dev/router/web/server-rendering/)

## 3. Backend, données et interfaces

### API

API REST versionnée sous `/v1`, documentée sous `/openapi.json` :

- `/auth/*` : Better Auth, Apple, Google, connexion par email ou nom d'utilisateur, vérification et réinitialisation.
- `/catalog/*` : œuvres, spectacles, représentations, lieux, artistes et genres.
- `/search` et `/discover` : recherche, carte, programmation et tendances.
- `/me/*` : statut Vu, notes, critiques, À voir, listes, historique et export.
- `/profiles/*` : profil public, abonnements et activité visible.
- `/suggestions/*` : création et suivi des fiches provisoires.
- `/admin/*` : validation, fusion, modération, imports et audit.

Conventions :

- pagination par curseur ;
- erreurs au format Problem Details ;
- dates stockées en UTC, avec fuseau du lieu pour les représentations ;
- identifiants UUID et slugs publics stables ;
- transactions PostgreSQL pour chaque action modifiant plusieurs objets.

### Types et règles publiques

- `Role = member | trusted_contributor | admin`.
- `Discipline = theatre | opera | ballet`.
- Une note est un entier de 1 à 10, unique par membre et spectacle.
- Une note crée le statut Vu si nécessaire et retire le spectacle de « À voir » dans la même transaction.
- Le frontend MVP expose un seul statut Vu par spectacle ; le détail des séances reste une capacité backend non exposée.
- Les rôles et permissions sont déclarés dans le code et couverts par une matrice de tests.
- Aucun secret permanent n’est embarqué dans Expo : session HTTP sécurisée sur le Web et stockage sécurisé Expo sur mobile.
- Apple et Google SSO sont proposés avec une connexion par email ou nom d'utilisateur avec mot de passe en alternative.
- L’adresse email doit être vérifiée pour qu’une note influence une moyenne ; les emails SSO vérifiés sont acceptés.
- L’âge est traité par une déclaration « J’ai 15 ans ou plus », sans conserver inutilement une date de naissance.

### PostgreSQL

Extensions prévues :

- PostGIS pour lieux, distances et carte ;
- `unaccent` et `pg_trgm` pour fautes et accents ;
- recherche plein texte configurée en français.

Entités principales : utilisateurs/profils, œuvres, spectacles, représentations, lieux, artistes, crédits, disciplines, genres, traces personnelles du statut Vu, notes, critiques, À voir, listes ordonnées, abonnements, blocages, suggestions, sources, imports, signalements et actions de modération.

La recherche reste dans PostgreSQL jusqu’à ce que les mesures démontrent un besoin réel d’un moteur séparé.

### Administration sans console cachée

Commandes versionnées :

- `db:migrate`
- `db:seed`
- `admin:grant`
- `admin:revoke`
- `import:venues`
- `import:openagenda`
- `catalog:rebuild-search`
- `web:rebuild`
- `smoke:production`

Le premier compte se connecte normalement, puis `admin:grant` lui attribue le rôle administrateur. Les credentials Apple, Google, Brevo et R2 nécessitent une création initiale chez leurs fournisseurs, mais toutes les règles Todam restent dans le dépôt.

## 4. Déploiement et coûts

Les fichiers `Dockerfile.api`, `Dockerfile.web` et `Dockerfile.jobs` décrivent les images
de production. Le workflow `.github/workflows/publish-images.yml` les construit hors du
VPS, les publie dans GHCR, puis déclenche facultativement les webhooks Coolify. Les
valeurs secrètes sont injectées par GitHub et Coolify, jamais enregistrées dans Git.

Le lancement assume un serveur unique : une panne du VPS interrompt le Web, l'API et
PostgreSQL. Coolify peut néanmoins partager ce VPS sans charge de compilation, car il ne
fait que télécharger et démarrer les images préparées par GitHub Actions.

Estimation au 25 juillet 2026 :

| Ressource | Configuration de lancement | Coût indicatif |
|---|---|---:|
| OVHcloud VPS-2 | 4 vCores, 8 Go RAM, 75 Go NVMe | 8,65 € TTC/mois |
| Coolify autohébergé | panneau et déploiements sur le VPS | 0 € |
| Expo Web, API, tâches et PostGIS | conteneurs sur le VPS | inclus |
| R2 pour 50 000 affiches | environ 50 à 125 Go | 0,65–1,85 € TTC/mois |
| Sauvegardes logiques R2 | faible volume initial | moins de 0,20 € TTC/mois |
| Total infrastructure | hors domaine, messagerie et stores | **environ 9,30–10,60 € TTC/mois** |

Le stockage R2 reste séparé du disque du VPS. PostgreSQL ne conserve que la clé de
l'objet, ses dimensions, son crédit, sa licence et sa provenance. Les originaux et les
variantes optimisées ne sont jamais comptés dans les 75 Go du serveur.

[Tarification VPS OVHcloud](https://www.ovhcloud.com/fr/vps/configurator/),
[tarification R2](https://developers.cloudflare.com/r2/pricing/) et
[documentation Coolify](https://coolify.io/docs/applications/ci-cd/github/actions/).

Déploiement progressif :

1. **Usage personnel Web** : Coolify, site statique, API, PostGIS et saisie catalogue
   sur le VPS-2.
2. **Bêta publique** : images préconstruites, imports contrôlés, limites de ressources,
   surveillance externe et sauvegardes R2 restaurables.
3. **Applications mobiles** : builds EAS du même frontend, liens profonds, Apple/Google
   SSO et notifications.
4. **Échelle ultérieure** : séparer PostgreSQL ou Coolify lorsque les mesures dépassent
   durablement 70 % de CPU, RAM ou disque ; ajouter de la redondance lorsque
   l'indisponibilité d'un VPS unique n'est plus acceptable.

Les frais des stores, du domaine et les dépassements email ne sont pas inclus.

## 5. Validation et exploitation

- Vitest pour domaine, contrats, statistiques et permissions.
- Tests d’intégration sur un vrai PostgreSQL éphémère.
- Playwright pour les parcours Web et le back-office.
- Maestro pour iOS/Android lorsque la phase mobile commence.
- Tests automatiques de confidentialité pour chaque rôle et chaque visibilité.
- Tests WCAG avec axe, clavier et résumés accessibles des graphiques.
- Validation des scénarios de la fiche produit : note en moins de dix secondes, statut Vu simple, retrait de « À voir », seuil des moyennes, suggestion fusionnée sans perte de note et export complet.
- Logs JSON Pino, Sentry frontend/backend, endpoints `/health/live` et `/health/ready`.
- Sauvegarde quotidienne de la machine OVHcloud, sauvegardes PostgreSQL planifiées vers
  R2 et exercice documenté de restauration avant ouverture publique.
- Surveillance depuis un service extérieur au VPS des endpoints `/health/live` et
  `/health/ready`, avec alertes de CPU, RAM et disque à partir de 70 %.
- `AGENTS.md` précisera l’architecture, les commandes, les règles de sécurité et la définition de « terminé » afin que Codex puisse construire, tester et diagnostiquer le projet de façon reproductible.
- Toute modification de schéma passe par une migration relue et testée ; aucune modification directe de production n’est considérée comme source de vérité.

Hypothèses verrouillées : application française, données centrées sur la France, Web personnel en premier, application grand public universelle ensuite, architecture sans Strapi, et aucune implémentation à effectuer tant qu’une phase de construction n’est pas explicitement demandée.
