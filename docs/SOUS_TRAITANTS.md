# Registre des sous-traitants

| Prestataire   | Fonction                          | Région visée                  | Vérifications avant lancement                               |
| ------------- | --------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| Render        | Web, API, PostgreSQL, sauvegardes | Europe                        | DPA, région réelle, sous-traitants ultérieurs, restauration |
| Cloudflare R2 | Stockage d'objets                 | Union européenne si configuré | DPA, localisation, règles de cycle de vie                   |
| Brevo         | E-mails transactionnels           | Union européenne si configuré | DPA, domaine authentifié, rétention, rebonds                |
| Sentry        | Diagnostic d'erreurs              | Région UE                     | DPA, région du projet, scrubbing, échantillon réel          |
| Google Play   | Distribution Android              | Selon Google                  | conditions développeur, Data Safety, transferts             |

Tout changement de SDK ou de prestataire déclenche un nouvel audit de données, une mise
à jour de la politique de confidentialité et, si nécessaire, une information active des
utilisateurs.
