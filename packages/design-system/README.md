# Design system Todam

Tokens et composants universels de Todam. Les primitives restent compatibles avec Expo
Web, iOS et Android et respectent une zone tactile minimale de 44 px.

Licence : Apache-2.0. Ce package ne peut importer aucun module AGPL.

## Surfaces neutres

Les fonds chauds ont chacun un rôle unique :

- `color.background` (`#FCF8F2`) : toile générale des pages ;
- `color.surface` (`#FFFDF8`) : cartes, sections, en-têtes et pieds de page ;
- `color.placeholder` (`#F0E9DF`) : visuel absent ou non publié ;
- `color.disabled` (`#E5E0D8`) : contrôle réellement indisponible ;
- `color.border` (`#D8D1C6`) : séparation, jamais surface de contenu.

Ne pas créer de variantes presque identiques de `color.surface`. Une sous-section de
carte reste sur la même porcelaine et utilise une bordure lorsque sa séparation doit
être visible.

## Bouton standard Todam

Le bouton **01 — filet brique** est la direction officielle des CTA ordinaires sur le
Web. Sa source de vérité exécutable est `tokens.button.standard` dans `src/tokens.ts`.

### Style à conserver

- fond porcelaine `#FFFDF8` ;
- bordure continue de 1 px, tomate `#C43D28` ;
- texte encre `#171412` ;
- rayon de 4 px ;
- libellé Work Sans 500 ;
- hauteur interactive minimale de 44 px ;
- dimensionnement `border-box` ;
- aucune ombre, aucun dégradé et aucune couleur de remplissage décorative.

Les variantes Web `primary` et `secondary` ont volontairement la même apparence. Deux
CTA ordinaires placés côte à côte ne doivent pas être différenciés par des couleurs
arbitraires : leur ordre, leur libellé et leur contexte portent la hiérarchie.

Les CTA construits sans le composant `Button` doivent réutiliser
`tokens.button.standard`, sans recopier les couleurs en dur. La composition de référence
reste `design/mockups/companies-selected-buttons/01-page-filet-brique-exact.png`, mais
les tokens exécutables priment toujours sur les couleurs d’une capture.

### Exceptions fonctionnelles

- `danger` reste un bouton rouge rempli avec texte blanc ;
- `quiet` est réservé aux actions de service secondaires : annuler, modifier, recharger,
  exporter, afficher davantage ou ajouter un champ dans un formulaire ;
- `dangerGhost` prépare une suppression sans donner au premier clic le poids visuel de
  la confirmation finale ;
- un état sélectionné ou réussi peut conserver le vert prévu par le design system ;
- un bouton désactivé reste gris ;
- `ghost` reste une action textuelle discrète pour partager, signaler ou ouvrir une
  ressource connexe ;
- onglets, filtres, notes, choix radio, navigation, cartes et boutons icône ne sont pas
  des CTA standards et ne doivent pas recevoir ce style ;
- iOS et Android conservent leurs variantes actuelles sauf décision produit explicite.

Le survol remplit le bouton en tomate `#C43D28` et passe son texte en porcelaine
`#FFFDF8`, sans modifier son opacité. L’appui le décale de 1 px et le focus clavier
conserve un contour rouge visible de 3 px.

Toute évolution de cette direction nécessite une décision produit explicite et la mise à
jour coordonnée des tokens, des tests de contraste, du test Playwright de la page
`/pour-les-compagnies` et des captures de présentation.

## Hiérarchie des actions

Choisir la variante selon l’effet produit, pas selon la couleur souhaitée :

| Intention                                   | Variante ou composant                  | Exemple de libellé        |
| ------------------------------------------- | -------------------------------------- | ------------------------- |
| Continuer un parcours ou créer un objet     | `primary` ou `secondary`               | « Créer mon journal »     |
| Action utilitaire réversible                | `quiet`                                | « Modifier mon profil »   |
| Action connexe ou navigation contextuelle   | `ghost`                                | « Partager ce journal »   |
| Préparer une suppression                    | `dangerGhost`                          | « Supprimer l’avis »      |
| Confirmer une suppression ou un masquage    | `danger`                               | « Oui, supprimer l’avis » |
| Choisir une option                          | composant de sélection avec `selected` | « Théâtre » coché         |
| Ouvrir un contenu                           | carte ou lien avec survol dédié        | fiche d’un spectacle      |
| Action uniquement représentée par une icône | bouton icône nommé                     | fermer ou faire défiler   |

Les libellés décrivent l’action et son objet. Éviter « Modifier », « Supprimer », «
Retour » ou « Continuer » lorsqu’un libellé plus précis tient dans le même espace. Un
choix actif utilise `color.selectedSurface`, une bordure accentuée et
`accessibilityState.selected` ; il ne dépend jamais de la différence entre `primary` et
`secondary`.

Toutes les variantes conservent une cible de 44 px, un focus clavier visible et un
retour d’appui. Sur Web, le survol d’un bouton `quiet` renforce seulement sa bordure ;
une carte cliquable relève sa bordure et se déplace de 1 px ; un bouton icône reçoit la
surface de sélection. Les états désactivés ne changent pas au survol.
