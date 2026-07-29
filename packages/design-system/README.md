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
- `color.accent` (`#6651B8`) : liens, notation et certains états actifs ;
- `color.coral` (`#F3A995`), `color.lilac` (`#C8B8F0`) et `color.aqua`
  (`#9FD8D0`) : halos et compositions de scène ;
- `color.selectedSurface` et `color.selectedBorder` : sélection, toujours accompagnée
  d’un libellé, d’une icône ou d’un état accessible ;
- `color.error` : erreurs, suppressions et alertes réellement critiques.

L’ancien vermillon `#C43D28` n’est plus une couleur d’identité ni d’interaction.

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

`PosterPlaceholder` représente uniquement l’absence d’un visuel publiable. Il produit
une composition déterministe de projecteurs, brume, voiles et petites lumières selon la
discipline et le titre. Le titre sert uniquement de graine et de libellé accessible :
aucun titre, logo ou faux marquage d’affiche n’est visible dans le placeholder.

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

- `ghost` est une action textuelle secondaire ;
- `dangerGhost` prépare une suppression ;
- `danger` confirme une action destructive avec le rouge fonctionnel ;
- un bouton désactivé utilise les tokens gris, sans effet de survol.

Les boutons construits hors du composant `Button` réutilisent les mêmes tokens. Le
bouton « Se connecter » du header ajoute seulement la silhouette accessible d’un billet
contemporain : petites encoches latérales, fond porcelaine, bordure fine et halo lilas.

## Sélections, champs et navigation

Les champs utilisent une surface porcelaine, une bordure fine et un focus lilas visible.
Les onglets, filtres, radios et chips sélectionnés utilisent la surface lilas pâle et la
bordure `selectedBorder`. La sélection ne dépend jamais uniquement de la couleur.

La navigation active conserve `aria-current` et ajoute un indicateur de position. Les
modales utilisent un voile sombre translucide, un panneau porcelaine et un focus
clavier contenu par leurs contrôles existants.

## Notation

Une note sur dix est représentée par dix petites lumières. `RatingLights` fournit
l’affichage éditorial et son libellé accessible. `RatingPicker` conserve dix choix
radio accessibles, les flèches clavier et une cible minimale de 44 px par valeur.

## Hiérarchie des actions

| Intention | Variante ou composant |
| --- | --- |
| Action principale d’un écran | `primary` ou `featured` |
| Action secondaire ou annulation | `secondary` ou `quiet` |
| Action contextuelle discrète | `ghost` |
| Préparer une suppression | `dangerGhost` |
| Confirmer une suppression | `danger` |
| Choisir une option | chip, onglet ou radio avec état sélectionné |
| Ouvrir un contenu | lien ou carte interactive |

Toutes les variantes conservent une cible de 44 px, un focus clavier visible, un retour
d’appui et un libellé accessible.
