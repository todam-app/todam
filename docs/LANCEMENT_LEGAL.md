# Préparation du lancement légal de Todam

Ce document distingue ce qui est implémenté dans le dépôt des actions qui nécessitent un
compte externe, une identité légale ou un paiement. Le dépôt de marque est
volontairement hors périmètre de cette première mise en conformité. Les textes sont
versionnés et opérationnels, mais ne doivent pas être présentés comme certifiés ou
validés par un avocat.

## Fonctions implémentées

- inscription sans checkbox avec déclaration 15+, versions juridiques et canal ;
- refus serveur d'une déclaration absente ou d'une version obsolète ;
- horodatage serveur et historique des acceptations ;
- vérification de l'adresse e-mail avant activation ;
- e-mail d'activation rappelant les versions et archives présentées ;
- réinitialisation du mot de passe et révocation des sessions ;
- export complet JSON et CSV ;
- suppression authentifiée avec réauthentification et confirmation par e-mail ;
- demande publique de suppression par lien valable 24 heures ;
- suppression en cascade du journal, des notes et de la liste « À voir » ;
- purge des comptes jamais vérifiés après 7 jours ;
- rapport hebdomadaire agrégé du nombre de comptes avec alerte à 900 et 1 000 ;
- limitation des tentatives sensibles par instance API ;
- pages Web et Android issues des mêmes sources Markdown ;
- archives PDF générées depuis ces sources, pages juridiques `noindex` et en-têtes
  `X-Robots-Tag` sur les pages et PDF juridiques ;

Les directives `noindex`, `X-Robots-Tag` et `no-store` réduisent l'indexation et la mise
en cache. Elles n'empêchent ni l'accès direct ni la copie d'une page publique.

## Actions externes bloquant l'ouverture publique

- [ ] réserver `todam.fr`, activer le renouvellement automatique, la 2FA et DNSSEC ;
- [ ] créer `contact@`, `donnees@`, `signalement@` et `securite@todam.fr` avec SPF, DKIM
      et DMARC ;
- [ ] renseigner le nom de l'éditeur dans `LEGAL_OPERATOR_NAME`, sans adresse ni
      téléphone personnels et sans donnée d'entreprise ;
- [ ] vérifier que le contrat est conclu avec OVH SAS, 2 rue Kellermann, 59100 Roubaix,
      France, confirmer son numéro de téléphone contractuel et l'entité contractuelle
      Cloudflare ;
- [ ] signer ou accepter les accords de sous-traitance et garanties de transfert ;
- [ ] configurer Brevo et tester vérification, réinitialisation, reçu juridique et
      suppression ;
- [ ] commander un VPS-2 OVHcloud dans un datacenter français, activer la 2FA, les clés
      SSH et le pare-feu réseau ;
- [ ] installer Coolify sur le VPS sans y exécuter les builds ; configurer GHCR et les
      webhooks produits par GitHub Actions ;
- [ ] créer PostgreSQL avec l'image `postgis/postgis:17-3.5`, sans port public, puis
      exécuter et vérifier les migrations ;
- [ ] configurer les sauvegardes PostgreSQL et Coolify vers R2 avec plusieurs jours de
      rétention, puis réaliser un exercice de restauration ;
- [ ] configurer le nettoyage Docker, les limites des conteneurs et les alertes à 70 %
      de CPU, RAM et disque ;
- [ ] surveiller `/health/live` et `/health/ready` depuis un service extérieur au VPS ;
- [ ] configurer Sentry en région UE après audit de filtrage des données personnelles ;
- [ ] créer et vérifier un compte développeur Google Play personnel non marchand ;
- [ ] vérifier dans Play Console que l'adresse fournie à Google pour la vérification
      reste privée et que seul l'e-mail développeur attendu est affiché publiquement ;
- [ ] compléter la fiche Data Safety après audit du binaire Android final ;
- [ ] fournir `https://todam.fr/suppression-compte` dans Play Console ;
- [ ] générer les PDF définitifs avec le nom de l'éditeur et les coordonnées confirmées
      des hébergeurs, hors Git ;
- [ ] exécuter les contrôles techniques et juridiques de la section suivante.

Cette phase personnelle ne nécessite ni compte bancaire professionnel, ni mise à jour
RNE, ni compte Play professionnel. Elle s'arrête avant toute activité commerciale ou
avant le dépassement de 1 000 comptes, selon la première échéance.

## Publication des documents

Les sources versionnées sont dans `docs/legal`. La commande `pnpm legal:generate` met à
jour les pages intégrées à l'application. `pnpm legal:pdf` produit les PDF dans
`apps/todam/public/legal`.

Une génération sans coordonnées produit volontairement des PDF marqués « brouillon
technique ». Avant publication, fournir toutes les variables de `.env.example`,
positionner `LEGAL_RELEASE_READY=true`, puis exécuter :

```text
pnpm legal:check
pnpm legal:pdf
pnpm check
```

Les PDF contenant les coordonnées réelles sont ignorés par Git. L'archive publiée doit
être conservée de manière immuable sous son nom versionné.

## Exploitation

- Planifier `pnpm accounts:purge-unverified` au moins une fois par jour.
- Planifier `pnpm accounts:report` chaque lundi dans Coolify et vérifier sa réception à
  `TODAM_OPERATIONS_EMAIL`.
- Construire les images de production dans GitHub Actions ; Coolify télécharge les
  images GHCR déjà construites et ne compile jamais le monorepo sur le VPS.
- Conserver au moins 15 Go de disque libres et nettoyer les anciennes images Docker.
- Ne pas exposer PostgreSQL sur Internet ; seuls les ports SSH, HTTP et HTTPS
  nécessaires sont ouverts par le pare-feu OVHcloud.
- La limitation locale des tentatives convient à une instance API. Avant de multiplier
  les instances, la remplacer par un compteur partagé.
- Conserver les journaux techniques au plus 6 mois et filtrer e-mails, jetons, cookies,
  mots de passe et corps de requêtes.
- Tester trimestriellement l'export, la suppression, la restauration PostgreSQL depuis
  R2 et la restauration de la configuration Coolify.
- Dès 900 comptes, préparer les nouveaux textes, les secrets de l'entreprise
  individuelle et les informations Play Console nécessaires au passage professionnel.
- Terminer le passage professionnel avant toute publicité, paiement, commission,
  billetterie ou partenariat commercial, ou au plus tard avant de dépasser 1 000
  comptes.

## Évolutions contractuelles

Les fonctions sociales déjà décrites dans les CGU 1.0 peuvent être activées sans
nouvelle acceptation si les CGU restent strictement inchangées. Une information produit
reste nécessaire et aucun contenu privé ne devient public automatiquement.

Paiement, publicité, nouvelle licence de contenu, nouvelle utilisation des données,
réduction des droits ou changement important de responsabilité imposent une nouvelle
version, une information active et une nouvelle preuve d'acceptation. Export et
suppression restent accessibles en cas de refus.

Avant toute publicité, fonctionnalité payante, commission, billetterie, partenariat
commercial ou autre monétisation, passer Todam en exploitation professionnelle et
réévaluer l'obligation de médiation de la consommation. Si elle devient applicable,
choisir un médiateur, adhérer à son dispositif, publier ses coordonnées dans les CGU et
les mentions légales, rétablir les contrôles de publication correspondants et demander
une nouvelle acceptation des CGU avant l'activation.
