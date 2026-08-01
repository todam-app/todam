# Registre des traitements Todam

Responsable du registre : la personne physique éditant Todam à titre non professionnel.
Son nom est injecté hors Git avec `LEGAL_OPERATOR_NAME` avant l'ouverture.

## Gestion des comptes

- Personnes : utilisateurs inscrits.
- Données : e-mail, nom d'utilisateur, mot de passe haché, déclaration d'âge, versions
  juridiques, canal, horodatages et sessions.
- Finalité : créer, sécuriser et administrer le compte.
- Base : exécution du contrat ; intérêt légitime pour la sécurité.
- Destinataires : Todam, OVHcloud, Brevo et Sentry selon configuration.
- Durée : vie du compte ; 7 jours pour un compte jamais vérifié ; sessions selon leur
  expiration ; journaux techniques 6 mois.
- Mesures : HTTPS, hachage Better Auth, cookies sécurisés, stockage sécurisé Android,
  limitation des tentatives, contrôle d'accès.

## Journal personnel

- Données : spectacles vus, représentations, dates, notes, critiques, listes, biographie
  et réglages de visibilité.
- Finalité : fournir le journal culturel personnel, les fonctions de partage choisies et
  leur export.
- Base : exécution du contrat.
- Destinataires : Todam et OVHcloud.
- Durée : vie du compte, puis suppression active sous 30 jours et sauvegardes sous 90
  jours.
- Mesures : contrôle par identifiant utilisateur et tests d'isolation.

## Revendications et contributions professionnelles

- Personnes : représentants de compagnies qui demandent ou obtiennent un rattachement.
- Données : identité déclarée, rôle, e-mail professionnel, site officiel, preuve ou
  explication, déclaration d'autorité, décision, rattachement, révisions proposées,
  provenance et historique de validation.
- Finalité : vérifier l'autorité du représentant, permettre la correction contrôlée du
  catalogue et conserver sa traçabilité éditoriale.
- Base : exécution du service demandé ; intérêt légitime à préserver un catalogue
  fiable, documenter les droits et protéger les tiers.
- Destinataires : personnes Todam autorisées et OVHcloud pour l'hébergement.
- Durée : vie du compte pour les demandes et rattachements ; suppression avec le compte.
  Les révisions intégrées restent dans l'historique du catalogue, avec suppression du
  lien vers l'auteur lors de la suppression du compte.
- Mesures : contrôle d'accès par rôle, brouillon non public, validation manuelle,
  journal des décisions et autorisations côté serveur.

## E-mails transactionnels

- Données : e-mail, lien à jeton et type de message.
- Finalité : vérification, sécurité, réinitialisation et suppression.
- Base : exécution du contrat et intérêt légitime de sécurité.
- Destinataire : Brevo.
- Durée : vérifier la durée contractuelle des journaux Brevo et la réduire au minimum
  nécessaire.

## Formulaire de contact

- Personnes : visiteurs qui écrivent à Todam, avec ou sans compte.
- Données : nom, adresse e-mail, objet, message et adresse IP pendant la fenêtre de
  limitation des envois.
- Finalité : répondre aux demandes et prévenir les envois abusifs.
- Base : intérêt légitime à répondre aux messages adressés à Todam et à protéger le
  service.
- Destinataires : Todam, Brevo pour la transmission et OVHcloud pour la messagerie.
- Durée : traitement de la demande, puis 12 mois maximum après le dernier échange, sauf
  échange actif, obligation légale ou défense d'un droit. La purge de la messagerie est
  vérifiée au moins une fois par an.
- Mesures : aucun stockage en base Todam, limitation par IP, champ anti-robot, données
  masquées dans les journaux et accès limité à la messagerie.

## Pilotage du nombre de comptes

- Données : nombres agrégés de comptes totaux, vérifiés et créés sur sept jours.
- Finalité : anticiper le passage de Todam en exploitation professionnelle.
- Base : intérêt légitime à piloter et mettre en conformité le service.
- Destinataires : l'éditeur, via Brevo et l'adresse `TODAM_OPERATIONS_EMAIL`.
- Durée : conservation minimale nécessaire au suivi des seuils ; aucun e-mail,
  nom d'utilisateur ou identifiant interne n'est inclus dans le rapport.

## Sécurité et erreurs

- Données : adresse IP, agent utilisateur, route, date et diagnostic filtré.
- Finalité : prévenir les abus, diagnostiquer et traiter les incidents.
- Base : intérêt légitime.
- Destinataires : Todam, OVHcloud et Sentry en région UE.
- Durée : 6 mois maximum, sauf incident documenté.

## Signalements et modération

- Données : contenu public, signalement, motif, décision et recours.
- Finalité : héberger légalement les contenus et protéger les utilisateurs.
- Base : obligation légale et intérêt légitime.
- Destinataires : personnes Todam autorisées et OVHcloud pour l'hébergement.
- Durée : temps nécessaire au traitement et à la justification de la décision. Lors de
  la suppression d'un compte, son lien avec le signalement est retiré ; le signalement
  et sa décision peuvent rester conservés sans cet identifiant.
- Mesures : file réservée aux rôles autorisés, motif de décision et procédure décrits
  dans `MODERATION_V2.md`.
