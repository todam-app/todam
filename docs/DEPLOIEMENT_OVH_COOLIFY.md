# Déploiement OVHcloud avec Coolify

Ce guide décrit la cible de lancement de Todam : un VPS-2 OVHcloud en France, Coolify
autohébergé sur la même machine, des images construites par GitHub Actions et les objets
stockés séparément dans Cloudflare R2.

Le dépôt prépare cette architecture, mais ne crée aucun compte, serveur, secret, domaine
ou sauvegarde à distance. Ces opérations exigent les accès du titulaire.

## Pourquoi Coolify peut partager le VPS

Le risque principal n'est pas le panneau Coolify au repos. Ce sont les compilations
Node, Expo et Docker, qui peuvent consommer brutalement la mémoire, le processeur et le
disque. Le workflow `publish-images.yml` les exécute sur GitHub Actions, publie les
images dans GHCR, puis demande seulement à Coolify de les télécharger et les relancer.

Ce choix reste adapté au lancement si les limites, alertes et sauvegardes ci-dessous
sont réellement configurées. Le VPS demeure un point de panne unique : le Web, l'API,
les tâches, PostgreSQL et Coolify peuvent alors être indisponibles ensemble.

## Ressources à créer

Dans un projet Coolify `todam` et un environnement `production`, créer :

| Ressource        | Image ou type                                    | Port  | Limite initiale  |
| ---------------- | ------------------------------------------------ | ----- | ---------------- |
| `todam-web`      | `ghcr.io/<proprietaire>/todam-web:latest`        | 8080  | 0,50 CPU, 256 Mo |
| `todam-api`      | `ghcr.io/<proprietaire>/todam-api:latest`        | 3000  | 1,50 CPU, 1,5 Go |
| `todam-jobs`     | `ghcr.io/<proprietaire>/todam-jobs:latest`       | aucun | 0,50 CPU, 512 Mo |
| `todam-postgres` | PostgreSQL personnalisé `postgis/postgis:17-3.5` | privé | 2 CPU, 3 Go      |

Les valeurs sont des plafonds de départ, pas une promesse de capacité. Après mise en
charge, les ajuster à partir de la RAM réellement disponible, du temps de réponse de
l'API et des requêtes PostgreSQL.

## Préparation du VPS

1. Commander le VPS-2 dans un datacenter français avec Ubuntu 24.04 LTS.
2. Activer la 2FA du compte OVHcloud, utiliser une clé SSH et désactiver
   l'authentification SSH par mot de passe après validation de la clé.
3. Dans le pare-feu OVHcloud, laisser publics uniquement les ports 80 et 443.
   Restreindre le port 22 aux adresses d'administration lorsque c'est possible.
4. Installer Coolify avec la procédure officielle, lui attribuer un sous-domaine HTTPS
   et ne pas laisser son port d'installation directement exposé.
5. Activer les mises à jour de sécurité automatiques de l'hôte.

Le port PostgreSQL 5432 ne doit jamais être publié sur Internet. L'API et les tâches
utilisent le nom privé fourni par Coolify dans `DATABASE_URL`.

## Images et publication

Le workflow manuel **Publier les images de production** :

1. exécute les contrôles du monorepo et les tests PostgreSQL ;
2. construit les images Web, API et tâches sur les runners GitHub ;
3. génère les PDF juridiques de production ;
4. publie `latest` et un tag immuable égal au SHA Git dans GHCR ;
5. déclenche les trois webhooks Coolify uniquement si l'option `deploy` est cochée.

Créer un environnement GitHub `production`. Y ajouter :

- `LEGAL_OPERATOR_NAME` ;
- `BREVO_API_KEY` et `EMAIL_FROM`, requis par le contrôle juridique ;
- `COOLIFY_TOKEN`, limité au déploiement ;
- `COOLIFY_WEB_WEBHOOK`, `COOLIFY_API_WEBHOOK` et `COOLIFY_JOBS_WEBHOOK`.

Le jeton automatique `GITHUB_TOKEN` publie les images. Si le dépôt ou les paquets GHCR
sont privés, connecter Coolify à GHCR avec un jeton en lecture seule. Aucun secret de
production ne doit être ajouté au dépôt ou incorporé dans une image serveur.

## Variables Coolify

Configurer au minimum sur `todam-api` :

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@<hote-prive>:5432/<base>
BETTER_AUTH_SECRET=<secret-aleatoire-de-32-caracteres-minimum>
BETTER_AUTH_URL=https://api.todam.fr/v1/auth
WEB_APP_URL=https://todam.fr
PUBLIC_WEB_URL=https://todam.fr
BREVO_API_KEY=<secret>
EMAIL_FROM=<adresse-validee>
EMAIL_FROM_NAME=Todam
```

Configurer sur `todam-jobs` :

```dotenv
DATABASE_URL=postgresql://<user>:<password>@<hote-prive>:5432/<base>
BREVO_API_KEY=<secret>
EMAIL_FROM=<adresse-validee>
EMAIL_FROM_NAME=Todam
TODAM_OPERATIONS_EMAIL=<adresse-de-pilotage>
```

Les variables Expo, le nom de l'éditeur et les coordonnées publiques des hébergeurs sont
injectés pendant le build Web par GitHub Actions ; ils ne sont pas lus dynamiquement par
Nginx. Le numéro OVHcloud et l'adresse de Cloudflare sont publics dans le dépôt et ne
doivent pas être recréés comme secrets. Aucune adresse ou aucun téléphone personnel de
l'éditeur ne doit être ajouté à ces variables.

Au lancement, l'entrée de l'image API exécute les migrations Drizzle avant de démarrer
Fastify. Cette stratégie convient à une seule instance. Avant d'en lancer plusieurs,
déplacer les migrations vers une tâche de déploiement unique.

## Domaines et contrôles de santé

- `todam.fr` et `www.todam.fr` pointent vers `todam-web` ; rediriger `www` vers le
  domaine canonique ;
- `api.todam.fr` pointe vers `todam-api` ;
- contrôle Web : `/health/live` ;
- contrôle API : `/health/ready`.

Après la première publication, vérifier la création de compte, la connexion, la
recherche, les statuts « Vu » et « À voir », la note, l'envoi d'e-mail et l'accès aux
quatre PDF juridiques.

## Tâches planifiées

Le conteneur `todam-jobs` reste en attente pour permettre à Coolify d'y exécuter des
commandes planifiées. Ajouter ces deux tâches :

| Fréquence                | Commande                              |
| ------------------------ | ------------------------------------- |
| Chaque jour              | `node dist/purge-unverified-users.js` |
| Chaque lundi à 07:00 UTC | `node dist/account-report.js`         |

Le rapport du lundi est envoyé à `TODAM_OPERATIONS_EMAIL`. À partir de 900 comptes, il
demande explicitement de préparer le passage professionnel ; 1 000 comptes est le seuil
maximal de cette phase personnelle.

L'import du catalogue reste une opération volontaire, avec un fichier dont la provenance
et la licence ont été vérifiées :

```bash
node dist/catalog-import.js --file /imports/catalogue.json --apply
```

Le chemin `/imports` doit être un montage privé. Ne jamais intégrer le catalogue réel ou
les affiches au dépôt ni à l'image Docker.

## Images et sauvegardes R2

Les 75 Go du VPS servent au système, aux images Docker, aux journaux et à PostgreSQL.
Les affiches ne doivent pas y être conservées durablement. L'application stockera les
objets dans un bucket R2 et seulement leur clé, leur provenance, leur licence et leurs
métadonnées en base.

Créer un bucket distinct pour les sauvegardes. Dans Coolify :

- sauvegarde PostgreSQL quotidienne vers R2, rétention glissante d'au moins 14 jours ;
- sauvegarde de la configuration Coolify vers R2 ;
- chiffrement et identifiants R2 limités à chaque bucket ;
- test de restauration trimestriel sur une base isolée.

La sauvegarde de la machine proposée par OVHcloud complète ces exports, mais ne les
remplace pas. Une sauvegarde stockée uniquement avec le VPS ne protège pas d'une erreur
de compte, d'une suppression ou d'une panne affectant la machine.

## Surveillance et seuils

Configurer un service externe, indépendant du VPS, pour interroger les deux contrôles de
santé et envoyer une alerte hors de Coolify.

Déclencher une action avant saturation :

- RAM ou processeur au-dessus de 70 % de façon durable ;
- disque au-dessus de 70 %, ou moins de 15 Go disponibles ;
- sauvegarde absente ou en erreur ;
- temps de réponse API dégradé ;
- redémarrages répétés d'un conteneur.

Le nettoyage Docker doit supprimer les anciennes images non utilisées sans toucher aux
volumes PostgreSQL. Si les alertes deviennent fréquentes, la première évolution est de
séparer PostgreSQL ou Coolify sur une autre machine, pas d'augmenter sans mesure le
nombre de conteneurs.
