# Préparation Google Play Data Safety

Cette fiche est un brouillon d'audit, pas une déclaration à recopier sans vérifier le
binaire Android final. Google exige que la déclaration couvre aussi les SDK tiers et
reste exacte après chaque changement.

Références officielles :

- [formulaire Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=fr)
- [suppression des comptes](https://support.google.com/googleplay/android-developer/answer/13327111?hl=fr)

## Collecte actuellement prévue

| Type Google Play probable                     | Données Todam                     | Finalité                         | Obligatoire                    |
| --------------------------------------------- | --------------------------------- | -------------------------------- | ------------------------------ |
| Informations personnelles — adresse e-mail    | Compte et vérification            | Gestion de compte                | Oui pour un compte             |
| Identifiants utilisateur                      | Identifiant et nom d'utilisateur  | Fonctionnement, personnalisation | Oui pour un compte             |
| Activité dans l'application                   | Journal, notes, liste « À voir »  | Fonctionnalité                   | Non, sauf usage de la fonction |
| Contenu généré par l'utilisateur              | Futures critiques et listes       | Fonctionnalité sociale           | Non, V2 seulement              |
| Informations et performances de l'application | Erreurs Sentry filtrées           | Diagnostic                       | À confirmer dans le binaire    |
| Appareil ou autres identifiants               | Jetons et données SDK éventuelles | Sécurité                         | À auditer dans chaque SDK      |

Todam ne prévoit ni vente de données, ni publicité, ni partage à des fins publicitaires.
Le mot « partage » doit toutefois être réévalué selon la définition exacte de Google
pour chaque transfert à un prestataire.

## Réponses de sécurité à confirmer

- données chiffrées en transit : oui, après vérification HTTPS en production ;
- demande de suppression : oui, dans l'application et sur
  `https://todam.fr/suppression-compte` ;
- politique de confidentialité : `https://todam.fr/confidentialite` ;
- package Android : `app.todam.mobile` ;
- collecte facultative ou obligatoire : décider ligne par ligne selon le comportement
  réel ;
- revue indépendante : ne pas la déclarer sans audit effectivement obtenu.

## Audit final

1. produire le bundle Android destiné au Store ;
2. inventorier permissions, trafic réseau et SDK ;
3. tester un compte neuf, un export et les deux suppressions ;
4. comparer les flux observés avec ce tableau et la politique ;
5. remplir Play Console puis conserver une capture datée de la déclaration ;
6. recommencer après tout ajout de SDK, permission ou traitement.
