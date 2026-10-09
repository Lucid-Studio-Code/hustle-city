# Biff City

Jeu mobile en HTML/CSS/JS (sans framework) : un jeune lascar veut devenir riche « facilement » entre paris sportifs, tickets à gratter, casino, crypto et cartes à collectionner.
Dérivé du moteur de Mama Kana Farm, avec un univers et des visuels différents.

## Lancer en local

```
node tools/serve.js        # puis ouvrir http://localhost:5190
```

## Organisation

- `index.html` : la page du jeu
- `js/data.js` : tous les réglages (bâtiments, cotes, tickets, boosters, missions…)
- `js/game.js` : la logique (état, sauvegarde locale, simulation)
- `js/ui.js`, `js/balto.js`, `js/casino.js`, `js/scratch.js`, `js/tuto.js` : l'interface
- `assets/img` : les images du jeu (`python3 tools/manifest.py` après tout ajout)
- `tools/` : outils de découpe et de détourage des images

Jeu fictif : l'argent du jeu n'a aucune valeur réelle. Les jeux d'argent sont interdits aux mineurs.
