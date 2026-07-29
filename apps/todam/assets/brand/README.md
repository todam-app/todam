# Identité Todam

Ces fichiers constituent l’identité visuelle retenue pour Todam. Les fichiers
SVG sont les sources de production à utiliser en priorité.

- `todam-symbol.svg` : symbole vectoriel sur fond transparent.
- `todam-logo-horizontal.svg` : symbole et mot-symbole « Todam » entièrement
  convertis en tracés vectoriels.
- `todam-favicon.svg` : déclinaison vectorielle carrée et transparente, agrandie
  jusqu’à la marge de sécurité du navigateur.
- `todam-app-icon.png` : icône d’application carrée sur fond ivoire.
- `todam-app-icon-foreground.png` : premier plan transparent de l’icône
  adaptative Android.
- Les fichiers PNG de mêmes noms sont des exports haute résolution destinés aux
  usages qui ne prennent pas en charge le SVG.
- `todam-logo-horizontal-ivory.png` : logo horizontal opaque sur fond ivoire.
- `todam-logo-horizontal-inverse.png` : variante opaque pour fond sombre.
- `todam-logo-horizontal-mono-ink.png` et
  `todam-logo-horizontal-mono-inverse.png` : variantes monochromes opaques.
- `todam-tile-opaque.png` : tuile carrée opaque pour les widgets et annuaires.
- `todam-open-graph.png` : visuel social 1200 × 630 px.
- Les fichiers suffixés `-source.png` conservent les maquettes raster validées
  avant vectorisation.

La palette du logo est composée de l’encre `#151515`, de l’ivoire `#FCF8F2` et
du corail doux `#F3A995`. Le point du symbole utilise ce corail ; le tracé et le
mot-symbole restent inchangés. Le symbole et le mot-symbole sont des créations
originales réalisées pour Todam. Le symbole correspond à la piste 3 validée le
24 juillet 2026.

Le logo horizontal doit rester lisible avec une marge libre au moins égale à
la hauteur du point corail. Ne pas l’utiliser sous 120 px de large ; sous
cette taille, utiliser la tuile carrée. Les masters SVG transparents sont
conservés pour la production, tandis que les variantes opaques sont à privilégier
pour les e-mails, widgets et intégrations dont le fond n’est pas maîtrisé.

Les variantes raster sont régénérables avec
`powershell -File scripts/generate-brand-assets.ps1`.
