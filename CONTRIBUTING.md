# Contribuer à Todam

Merci de contribuer à Todam. Le projet accueille les corrections, les
propositions produit, les améliorations documentaires et, lorsque le
développement commencera, les contributions de code.

## Avant de commencer

Pour une modification importante, ouvrez d'abord une Issue ou une Discussion.
Les décisions structurantes doivent rester consultables publiquement.

Ne publiez jamais dans Git :

- de secret ou de fichier `.env` réel ;
- de donnée personnelle ou d'export de production ;
- d'affiche, photographie ou contenu sans droits suffisants ;
- de données importées sans provenance et licence documentées.

## Developer Certificate of Origin

Todam utilise le
[Developer Certificate of Origin 1.1](https://developercertificate.org/)
(DCO), sans CLA. En ajoutant une ligne `Signed-off-by` à chaque commit, vous
certifiez être autorisé à proposer cette contribution sous la licence
applicable à son chemin.

Signez vos commits avec :

```bash
git commit -s
```

Pour corriger un dernier commit non signé :

```bash
git commit --amend --signoff --no-edit
```

Le nom et l'adresse de la signature doivent correspondre à l'auteur du commit.
Le contrôle DCO doit être vert avant la fusion.

## Licences et frontière d'architecture

- `apps/todam`, `packages/contracts` et `packages/design-system` sont sous
  Apache-2.0.
- `apps/api`, `apps/jobs`, `packages/domain` et `packages/database` sont sous
  AGPL-3.0.
- Le client Apache ne doit pas importer un package ou un fichier AGPL.
- Les échanges entre les deux zones passent par l'API et les contrats publics
  de `packages/contracts`.

Une contribution est acceptée sous la licence du chemin modifié. Aucun CLA ni
droit spécial de relicenciement fermé n'est demandé.

## Pull requests

Une pull request doit :

1. rester ciblée et expliquer son objectif ;
2. référencer l'Issue concernée lorsque c'est pertinent ;
3. inclure les tests et la documentation adaptés ;
4. conserver la compatibilité des contrats publics ou expliquer la rupture ;
5. passer la CI, le DCO, CodeQL et les contrôles de dépendances ;
6. être fusionnée par squash.

Les mainteneurs peuvent demander de séparer une proposition trop large.

## Langue

La langue principale du produit et de sa documentation est le français. Les
API, noms de code et messages techniques peuvent rester en anglais lorsque cela
améliore leur interopérabilité.
