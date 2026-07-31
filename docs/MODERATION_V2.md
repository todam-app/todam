# Fonctions sociales et modération

## Périmètre actif

La bêta Todam autorise :

- les notes et avis publics sur les spectacles ;
- les profils publics sous un nom d'utilisateur, avec journal globalement public ou
  privé ;
- les listes personnalisées privées signalées par leur propriétaire ;
- les signalements concernant une production, un lieu ou une compagnie ;
- les revendications de compagnies et les révisions professionnelles validées par Todam.

Les commentaires, réponses, likes, abonnements, messagerie privée et notifications
sociales restent hors périmètre.

## Signalements

Une fiche publique propose un accès au formulaire de correction. Le signalement
enregistre :

- le type et l'identifiant de la fiche concernée ;
- le motif détaillé fourni par le membre ;
- la date de création ;
- l'état `open`, `reviewing`, `resolved` ou `dismissed` ;
- le modérateur, la décision et la date de décision lorsqu'ils existent.

Le formulaire est utilisable sans compte. La bêta ne demande donc pas l'identité du
déclarant et le signalement peut rester anonyme.

Un visiteur anonyme ne peut signaler que du contenu effectivement public. Un membre peut
aussi signaler sa propre liste ou son propre avis privé ; l’API ne confirme jamais
l’existence d’un contenu privé à un tiers.

Les administrateurs et modérateurs disposent d'une file dédiée. Ils peuvent prendre un
signalement en charge, le résoudre ou l'écarter avec un motif. Une décision terminale ne
peut pas être remplacée par une seconde décision.

Le signalement ne masque pas automatiquement une fiche : Todam contrôle les sources, les
droits et la cohérence avant de corriger ou retirer une information.

## Revendications et révisions professionnelles

Une revendication de compagnie est validée ou refusée manuellement. L'approbation crée
un rattachement explicite entre le compte et la compagnie.

Pendant le pilote, un compte professionnel ne peut être rattaché qu’à une seule
compagnie. Une compagnie peut en revanche autoriser plusieurs représentants distincts,
chacun avec son rôle explicite.

Les représentants autorisés travaillent sur une révision séparée de la version publique.
Une révision soumise reste invisible jusqu'à son approbation par Todam. La décision, son
motif, les anciennes et nouvelles valeurs ainsi que la provenance sont conservés. Une
version approuvée peut être restaurée par un rôle Todam autorisé.

Une publication est bloquée tant que manquent les deux descriptions françaises et leurs
droits, une représentation non annulée, les sources du spectacle, des séances et des
lieux, ou les informations de droits complètes d’un visuel réellement affichable. La
compagnie principale, la durée, la langue, les crédits, la présentation courte d’une
compagnie et son site officiel enrichissent la fiche mais ne bloquent plus sa
publication lorsqu’ils sont absents de la source. Un visuel conservé uniquement comme
métadonnée (`metadata_only`) ne bloque pas la fiche et n’est pas affiché.

## Vie privée

- L'adresse e-mail et les identifiants internes ne figurent jamais sur les profils.
- Les profils publics sont identifiés par un nom d'utilisateur et `noindex` par défaut.
- Un membre peut rendre son journal privé.
- La liste « À voir » et les listes personnalisées sont privées.
- Les brouillons professionnels et les files de modération exigent une authentification
  et une autorisation côté serveur.

## Limites actuelles

La bêta n'envoie pas encore automatiquement de notification au déclarant après la
décision d'un signalement. La contestation est traitée par le canal de contact Todam.
Ces limites doivent rester visibles dans la documentation du pilote jusqu'à l'ouverture
d'un workflow de notification et de recours dédié.
