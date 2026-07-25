# Registre des traitements Todam

Responsable du registre : l'entrepreneur individuel éditant Todam. Ce modèle doit être
complété avec l'identité réelle hors Git avant l'ouverture.

## Gestion des comptes

- Personnes : utilisateurs inscrits.
- Données : e-mail, pseudonyme, mot de passe haché, déclaration d'âge, versions
  juridiques, canal, horodatages et sessions.
- Finalité : créer, sécuriser et administrer le compte.
- Base : exécution du contrat ; intérêt légitime pour la sécurité.
- Destinataires : Todam, OVHcloud, Brevo et Sentry selon configuration.
- Durée : vie du compte ; 7 jours pour un compte jamais vérifié ; sessions selon leur
  expiration ; journaux techniques 6 mois.
- Mesures : HTTPS, hachage Better Auth, cookies sécurisés, stockage sécurisé Android,
  limitation des tentatives, contrôle d'accès.

## Journal personnel

- Données : spectacles vus, représentations, dates, notes et liste « À voir ».
- Finalité : fournir le journal culturel personnel et son export.
- Base : exécution du contrat.
- Destinataires : Todam et OVHcloud.
- Durée : vie du compte, puis suppression active sous 30 jours et sauvegardes sous 90
  jours.
- Mesures : contrôle par identifiant utilisateur et tests d'isolation.

## E-mails transactionnels

- Données : e-mail, lien à jeton et type de message.
- Finalité : vérification, sécurité, réinitialisation et suppression.
- Base : exécution du contrat et intérêt légitime de sécurité.
- Destinataire : Brevo.
- Durée : vérifier la durée contractuelle des journaux Brevo et la réduire au minimum
  nécessaire.

## Sécurité et erreurs

- Données : adresse IP, agent utilisateur, route, date et diagnostic filtré.
- Finalité : prévenir les abus, diagnostiquer et traiter les incidents.
- Base : intérêt légitime.
- Destinataires : Todam, OVHcloud et Sentry en région UE.
- Durée : 6 mois maximum, sauf incident documenté.

## Modération V2

- Données : contenu public, signalement, motif, décision et recours.
- Finalité : héberger légalement les contenus et protéger les utilisateurs.
- Base : obligation légale et intérêt légitime.
- Activation : interdite avant la procédure et le journal décrits dans
  `MODERATION_V2.md`.
