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
- limitation des tentatives sensibles par instance API ;
- pages Web et Android issues des mêmes sources Markdown ;
- archives PDF générées depuis ces sources et pages `noindex`.

## Actions externes bloquant l'ouverture publique

- [ ] réserver `todam.fr`, activer le renouvellement automatique, la 2FA et DNSSEC ;
- [ ] mettre à jour le nom commercial et l'activité de l'entreprise via le guichet
      compétent ;
- [ ] ouvrir le compte ou sous-compte bancaire dédié et le suivi analytique ;
- [ ] créer `contact@`, `donnees@`, `signalement@` et `securite@todam.fr` avec SPF, DKIM
      et DMARC ;
- [ ] adhérer à un médiateur de la consommation et renseigner ses coordonnées ;
- [ ] renseigner l'identité, le SIREN, l'adresse et le téléphone dans les secrets de
      déploiement ;
- [ ] vérifier les identités et adresses contractuelles exactes de Render et Cloudflare
      ;
- [ ] signer ou accepter les accords de sous-traitance et garanties de transfert ;
- [ ] configurer Brevo et tester vérification, réinitialisation, reçu juridique et
      suppression ;
- [ ] configurer Render en région européenne, les sauvegardes et un exercice de
      restauration ;
- [ ] configurer Sentry en région UE après audit de filtrage des données personnelles ;
- [ ] créer et vérifier le compte Google Play professionnel de l'entreprise individuelle
      ;
- [ ] compléter la fiche Data Safety après audit du binaire Android final ;
- [ ] fournir `https://todam.fr/suppression-compte` dans Play Console ;
- [ ] générer les PDF définitifs avec les vraies coordonnées hors Git ;
- [ ] appliquer `X-Robots-Tag: noindex, nofollow` aux PDF `/legal/*` chez l'hébergeur
      statique ;
- [ ] exécuter les contrôles techniques et juridiques de la section suivante.

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
- La limitation locale des tentatives convient à une instance API. Avant de multiplier
  les instances, la remplacer par un compteur partagé.
- Conserver les journaux techniques au plus 6 mois et filtrer e-mails, jetons, cookies,
  mots de passe et corps de requêtes.
- Tester trimestriellement l'export, la suppression et une restauration.
- À 1 000 comptes, réévaluer la domiciliation, la RC Pro et la couverture cyber.
- Préparer la SASU à 7 500 comptes et terminer le transfert avant 10 000 comptes, ou
  plus tôt en cas de monétisation, associé, investisseur ou incident.

## Évolutions contractuelles

Les fonctions sociales déjà décrites dans les CGU 1.0 peuvent être activées sans
nouvelle acceptation si les CGU restent strictement inchangées. Une information produit
reste nécessaire et aucun contenu privé ne devient public automatiquement.

Paiement, publicité, nouvelle licence de contenu, nouvelle utilisation des données,
réduction des droits ou changement important de responsabilité imposent une nouvelle
version, une information active et une nouvelle preuve d'acceptation. Export et
suppression restent accessibles en cas de refus.
