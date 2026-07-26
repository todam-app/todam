# Registre des sous-traitants

| Prestataire   | Fonction                                               | Région visée                  | Vérifications avant lancement                                 |
| ------------- | ------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------- |
| OVHcloud      | VPS : Web, API, PostgreSQL et sauvegarde de la machine | France                        | DPA, datacenter réel, sous-traitants ultérieurs, restauration |
| Cloudflare R2 | Affiches et sauvegardes logiques externalisées         | Union européenne si configuré | DPA, localisation, cache, rétention, restauration             |
| Brevo         | E-mails transactionnels et rapports agrégés            | Union européenne si configuré | DPA, domaine authentifié, rétention, rebonds                  |
| Sentry        | Diagnostic d'erreurs                                   | Région UE                     | DPA, région du projet, scrubbing, échantillon réel            |
| Google Play   | Distribution Android                                   | Selon Google                  | conditions développeur, Data Safety, transferts               |

Coolify est autohébergé sur le VPS OVHcloud et n'est donc pas un destinataire externe
supplémentaire. GitHub Actions construit des images à partir du code sans accès aux
données de production.

Tout changement de SDK ou de prestataire déclenche un nouvel audit de données, une mise
à jour de la politique de confidentialité et, si nécessaire, une information active des
utilisateurs.
