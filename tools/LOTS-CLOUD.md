# Préparer des lots d'images Hustle City (session cloud)

Ton seul rôle : **écrire des lots d'images** (fichiers `tools/lot-*.js`) et les pousser sur `main`.
Tu ne touches PAS au code du jeu (js/, css/, game.html, assets/). Une autre session (en local) installe les images et pousse le jeu.

## Dépôt
- github.com/Lucid-Studio-Code/hustle-city, branche `main`. Lis `CLAUDE.md` (règles de la propriétaire).
- Elle tutoie, parle français, veut des réponses courtes, sans jargon.

## Comment un lot marche
- Un lot = une copie de `tools/lot-base.js` où seule la ligne `HC.LOT = [...]` change. Ne modifie jamais le reste du script.
- Chaque entrée : `["nom-image", "format", "prompt anglais"]` ou `["nom", "format", "prompt", "URL d'image modèle"]`.
  - Formats possibles : `1:1`, `4:3`, `3:4`, `2:3`, `9:16`, `16:9`, `21:9`.
  - La 4e case (URL pikaso d'une image déjà générée) sert d'**image modèle** : à utiliser pour garder le même angle / style (ex. chambres, objets d'une même série).
- Pour fabriquer le fichier : script Python qui lit `tools/lot-base.js` et remplace la ligne `HC.LOT = ` par `json.dumps(lot, ensure_ascii=False)`. Vérifie avec `node --check`.
- Pousse sur main, puis donne-lui le **nom du fichier** à copier. Elle l'ouvre sur GitHub (bouton « copier le fichier brut »), le colle dans la console Chrome de magnific.com (générateur d'images), Entrée.
- Quand c'est fini, elle clique « Copier les résultats » et envoie la liste à la session locale.
- Si la page s'est rechargée en cours de route : `tools/recup-casino.js` montre comment retrouver les images dans l'historique (changer `HC.LOT`).

## Règles NON négociables (images)
- **Mode illimité Magnific uniquement, jamais de crédits** (le script vérifie « Unlimited » tout seul). Jamais cliquer « Switch to credits ».
- **Aucun texte** dans les images (ni lettres, ni chiffres, ni logos, ni marques), sauf exception écrite dans le prompt.
- **Rien qui copie l'existant** : pas de vraies marques, pas de vrais symboles crypto (₿, Ξ…), pas de « $ ».
- Pas de cannabis. Personnages : vrais visages détaillés, chacun son style.
- PrivéFans (créatrices) : sexy façon pin-up (lingerie, bikini, poses aguicheuses) mais **jamais de nudité** (stores 17+).
- Début de prompt commun (style) :
  `2D mobile game art, polished cartoon illustration, thick dark brown outlines, bold saturated colors, soft cel shading with subtle highlights, clean vector-like rendering, high detail, a bit more urban street style.`
- Objets isolés : `Single isolated game item, centered, on a plain pure white background, nothing else.` (détourage automatique du fond blanc).
- **Objets de l'appart (posés sur le bureau / le lit) : vus DE FACE**, à hauteur d'yeux, un peu d'en haut, comme le PC niveau 1. Donner le PC 1 en image modèle :
  `https://pikaso.cdnpk.net/private/production/5623377365/render.png?token=exp=1791331200~hmac=ef6438fb83304494ce82e197f49e36a3dac8117679c423e4af5e60570050742b`
- Chambres : toutes faites à partir de la chambre B (image modèle) :
  `https://pikaso.cdnpk.net/private/production/5623345378/render.png?token=exp=1791331200~hmac=b1002bf47d6abcd456d278237510e1fe3f9caf0fe59350a622c2b9b9af4c8aad`

## Lots déjà prêts dans tools/
- `lot-2.js` (créatrices PrivéFans, objets PrivéFans, décos ville, icônes) — en cours chez elle.
- `lot-3.js` (ordis PrivéFans fille/garçon, salle et entrée du Club, fonds de tickets) — en cours.
- `lot-symboles.js` (symboles de machine à sous version street) — pas encore lancé.

## À faire / idées en attente
- Momo (`guide`) : même perso, maillot SANS trois bandes ni logo.
- PC niveaux 2 et 3 : en pause (elle n'aime pas le rendu). Ne pas relancer sans qu'elle le demande.
- Machine à miner niveau 4 (grise à tuyaux) : la refaire avec une étoile si elle le demande.
