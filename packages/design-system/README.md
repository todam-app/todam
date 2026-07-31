# Design system Todam

Tokens et composants universels de Todam. La cible produit actuelle est le Web
responsive. Les primitives partagées conservent des contrats accessibles et une cible
interactive minimale de 44 px.

Licence : Apache-2.0. Ce package ne peut importer aucun module AGPL.

## Direction visuelle

Todam utilise une scène lumineuse contemporaine : une toile ivoire stable, des surfaces
porcelaine, une typographie éditoriale pour les titres et des lumières corail, lilas et
aqua derrière des voiles translucides. Ces lumières soutiennent la hiérarchie sans
devenir des illustrations autonomes.

Les couleurs exécutables sont centralisées dans `src/tokens.ts` :

- `color.background` (`#FCF8F2`) : toile générale ;
- `color.surface` (`#FFFDF8`) : cartes, formulaires, en-têtes et pied de page ;
- `color.ink` (`#151515`) : texte principal et CTA principal ;
- `color.muted` (`#6F6B64`) : informations secondaires ;
- `color.brandSignal` (`#ED2215`) : point du logo et rares accents graphiques de marque,
  jamais les petits textes essentiels ;
- `color.brandText` (`#D9271A`) : petits liens et courts surtitres de marque sur les
  fonds neutres ;
- `color.accent` (`#C34E42`) : certains états fonctionnels, progressions et sélections
  existantes ;
- `color.coral` (`#F3A995`), `color.lilac` (`#C8B8F0`) et `color.aqua` (`#9FD8D0`) :
  halos et compositions de scène ;
- `color.selectedSurface` et `color.selectedBorder` : sélection, toujours accompagnée
  d’un libellé, d’une icône ou d’un état accessible ;
- `color.error` : erreurs, suppressions et alertes réellement critiques.

L’ancien vermillon `#C43D28` reste abandonné. Le vermillon signal `#ED2215` appartient
au signe graphique ; sa variante de texte `#D9271A` est assombrie pour conserver un
contraste WCAG AA sur la toile et les surfaces neutres.

## Surfaces et mise en page

Le Web utilise un canvas central de 1120 px. Les gouttières extérieures portent une
lumière corail à gauche et aqua/lilas à droite ; le contenu central reste ivoire et
lisible. Sous cette largeur, les halos deviennent très discrets.

Les panneaux utilisent :

- `radius.panel` (18 px) pour les cartes et panneaux ;
- `radius.medium` (10 px) pour les contrôles ;
- `radius.media` (16 px) pour les affiches ;
- `shadow.light` ou `shadow.lift` pour des ombres larges et diffuses ;
- `surface.glass` pour les éléments Web sticky ou fixes avec flou.

Les pages légales et les interfaces de gestion emploient les mêmes tokens avec moins de
décoration et une largeur de lecture limitée.

## Affiches

Toute affiche utilise le ratio A5 exact `148 / 210`.

Une affiche publiable est affichée en entier avec `contain`, sur une surface neutre. Le
cadre ne reçoit ni texte, ni badge, ni bouton, ni gradient, ni recadrage destructeur.

Exception Web limitée aux cartes de découverte en grille ou en rail : le marque-page « À
voir » peut chevaucher le coin supérieur droit sous la forme d’un ruban de 44 × 60 px.
Il reste un bouton indépendant du lien de carte, n’apparaît pas sur les cartes isolées
et ne modifie ni le cadrage ni le contenu de l’affiche.

`PosterPlaceholder` représente uniquement l’absence d’un visuel publiable. Sa famille «
faisceau nocturne » partage un fond sombre et distingue les disciplines par le geste de
scène : présence chaude et asymétrique pour le théâtre, voûte lilas symétrique pour
l’opéra, trajectoires aqua croisées pour le ballet. Le titre reste un libellé accessible
et n’est jamais visible dans l’image ; aucun logo ou faux marquage d’affiche n’y est
ajouté.

## Contrat des boutons

Le contrat « 01 — filet brique » est remplacé par le système suivant.

### CTA principal

`primary` et `featured` portent l’action principale :

- fond encre `#151515` ;
- texte porcelaine `#FFFDF8` ;
- bordure encre de 1 px ;
- rayon de 10 px ;
- Work Sans 600 ;
- légère lueur lilas au survol Web.

`featured` reste réservé au CTA principal d’un hero ou d’un premier écran.

### CTA secondaire

`secondary` et `quiet` portent les actions secondaires ou utilitaires :

- fond porcelaine ;
- bordure encre de 1 px ;
- texte encre ;
- rayon de 10 px ;
- surface lilas très pâle au survol Web.

### Actions discrètes et danger

- `ghost` est une action textuelle secondaire en `color.brandText` ;
- `dangerGhost` prépare une suppression ;
- `danger` confirme une action destructive avec le rouge fonctionnel ;
- un bouton désactivé utilise les tokens gris, sans effet de survol.

`TicketButton` fournit la silhouette accessible d’un billet contemporain : encoches
latérales réellement creuses, libellé centré, focus visible et aucune prédécoupe
décorative. La variante `porcelain` est réservée à « Se connecter » dans le header et
aux accès « Billetterie officielle ». La variante `orchestra`, encre et porcelaine, est
réservée au CTA « Créer mon journal » du hero public. Les autres actions conservent le
composant `Button` et ses variantes afin que le motif du billet reste distinctif.

Sur le Web, le focus clavier des boutons utilise un contour brique de 2 px décalé de 2
px et un halo corail compact de 3 px à 22 %. Les boutons en forme de billet transposent
la même intensité sur leur contour.

## Sélections, champs et navigation

Les champs utilisent une surface porcelaine, une bordure fine et un focus lilas visible.
Les onglets, filtres, radios et chips sélectionnés utilisent la surface lilas pâle et la
bordure `selectedBorder`. La sélection ne dépend jamais uniquement de la couleur.

La navigation active conserve `aria-current` et ajoute un indicateur de position. Les
modales utilisent un voile sombre translucide, un panneau porcelaine et un focus clavier
contenu par leurs contrôles existants.

## Notation

Une note sur dix est représentée par dix petites lumières. `RatingLights` fournit
l’affichage éditorial et son libellé accessible. `RatingPicker` conserve dix choix radio
accessibles, les flèches clavier et une cible minimale de 44 px par valeur.

## Hiérarchie des actions

| Intention                       | Variante ou composant                       |
| ------------------------------- | ------------------------------------------- |
| Action principale d’un écran    | `primary` ou `featured`                     |
| Action secondaire ou annulation | `secondary` ou `quiet`                      |
| Action contextuelle discrète    | `ghost`                                     |
| Préparer une suppression        | `dangerGhost`                               |
| Confirmer une suppression       | `danger`                                    |
| Choisir une option              | chip, onglet ou radio avec état sélectionné |
| Ouvrir un contenu               | lien ou carte interactive                   |

Toutes les variantes conservent une cible de 44 px, un focus clavier visible, un retour
d’appui et un libellé accessible.
