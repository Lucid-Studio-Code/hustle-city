# Hustle City : consignes pour Claude

Jeu mobile HTML/CSS/JS sans framework, dérivé du moteur de Mama Kana Farm (autre projet, **à ne jamais modifier**).
Pitch : un jeune lascar veut devenir riche « facilement » avec les paris sportifs, les tickets à gratter, le casino, la crypto et les cartes à collectionner.
Lancer : `node tools/serve.js` puis http://localhost:5190. Elle joue elle-même sur localhost dans son Chrome.

## Règles de la propriétaire (non négociables)
- **Super simple** : tout doit se comprendre sans rien connaître à la crypto, à la bourse ou aux paris. Aucun jargon (pas de « bear/bull market ») ; parler en « tu as mis → ça vaut → gagné/perdu ».
- **Réaliste** : vraies cotes avec marge du bookmaker (~93 %), roulette européenne, machine à sous 94,4 %, grattage 61-68 %, tuyaux de potes fiables à 60 %. Pas de mécanique fantaisiste.
- **Aucune monnaie réelle** et aucun nom de monnaie : chaque montant est suivi de l'icône billet `<i class="cur"></i>`.
- **Rien qui copie l'existant** : pas de vraies marques (PMU, FDJ, Winamax…), ni de vrais symboles crypto. Les tickets à gratter sont des parodies, sans logo réel.
- **Pas de contexte cannabis** (hérité de Mama Kana) : ni image ni texte.
- Personnages avec de **vrais visages détaillés**, chacun avec son style.
- Pas de jauge de santé. Les habitudes se prennent sur place : fumer et boire au Royal (ex-Balto, id `balto` dans le code), sortir au Club.
- Pas de toasts de Momo « Mission validée » : les infos passent par le téléphone (notifications).
- Pas de lieux externes pour l'instant, mais l'arrêt de bus reste cliquable.
- Placement des objets de la chambre : `#placer-appart` (PC, machine, places d'étagère, par chambre ; gardé dans son navigateur, `roomLayout()`). Reporter ses valeurs dans `ROOM_LAYOUT` quand elle les envoie.
- Les noms des lieux sont écrits au sol (`data-sign="ground"`). Les positions des bâtiments sont celles qu'elle a placées via `#placer` : ne pas les changer.
- Elle tutoie, parle français, et veut des réponses courtes sans jargon technique.

## Architecture
- `js/data.js` : tous les réglages (BUILDINGS, TEAMS, SPORTS, SCRATCH, MOODS, ITEMS, SERIES, KIOSK, BOOSTER, CHALLENGES, EVENTS, DEALS, CLUB, HABITS, QUESTS…).
- `js/game.js` : état, simulation et sauvegarde dans localStorage `hustleCity.v1`.
- `js/ui.js` : HUD, appart, téléphone (applis, notifications via `notify()`, conversations via `chatPush`/`chatAct`), Comptoir, portefeuille, boosters, récompenses.
- `js/balto.js` : paris (le ticket garde les équipes et le score), tuyaux, onglet « Le bar ».
- `js/scratch.js` : les 6 tickets à gratter (grille construite à partir du gain tiré à l'achat).
- `js/casino.js`, `js/tuto.js` : le tutoriel avec Momo, qui avance au geste du joueur.
- `assets/img` : après tout ajout d'image, lancer `python3 tools/manifest.py` (régénère `js/assets.js`).
- Changer de version : incrémenter `V = '?v=N'` dans game.html (le petit chargeur en bas de la page) (la vraie page ; index.html charge la dernière version depuis GitHub) (actuellement 69).

## Événements (le Panneau, sur la place)
- `SIX` dans data.js : « Tournoi des 6 Quartiers » (rugby). `SIX.sim` = date de la journée 1 pour simuler (une journée par jour) ; null = vrai calendrier 2027 (5 févr. → 13 mars). Pronos gratuits (3 pts + 1 lingot par bon prono), classement contre 24 faux joueurs (`rivals`, à remplacer plus tard par un vrai classement en ligne), cartes en édition limitée dans les boosters pendant le tournoi.
- Résultats tirés de façon fixe (identiques pour tout le monde). Tester sans attendre : ajouter `#tournoi-test` à l'adresse (un match toutes les 4 min).
- Boutique de l'événement (`SIX.shop`) : photos de profil (écussons), cadres, décos posées dans la ville (x/y en %). Images à venir : `deco-<id>`. Achetés pour toujours, en vente seulement pendant l'événement.

## Pièges connus
- `.cur` = l'icône billet, et `.money` est déjà pris : ne jamais les utiliser comme classes d'état.
- `pic()` rend un `<span class="pic">` : une règle `span` dans un flex l'étire.
- Tout calque caché (toast, bannière) doit avoir `pointer-events: none`, sinon une fenêtre « se rouvre en boucle ».
- Les fenêtres se redessinent chaque seconde : garder l'état ouvert/fermé et le défilement.
- Un `<button>` garde le fond gris du navigateur : mettre `background: transparent`.
- Les emoji récents (🪩) ne s'affichent pas partout.

## Économie
- Booster : cartes ≤ 600 ; prix au Kiosque 120 + 25 × niveau (~65 % récupéré).
- Les cartes > 600 ne se vendent qu'au Comptoir.
- Lingots (`LINGOT` dans data.js) : 1 lingot = 20 billets pour compléter un achat (machine, déménagement) ; journal du Kiosque tout de suite 3, tuyau ≈ prix / 20, videur du Club 2.
- PC (`PCS`) : 3 niveaux, frais crypto 1,5 % → 0,8 % → 0,2 %. Le bouton « Matos » regroupe machine, PC et appart.
- Comptoir : rayons renouvelés toutes les 30 min ; cartes = 3 communes + 1 plus rare à la fois (`cardStock()`).
- Un seul exemplaire par objet (un doublon de booster est revendu tout de suite). Les cartes (toutes) vont au classeur et ne prennent jamais de place chez soi.
- Bons plans : -18 à -32 % sous la cote (vente) ou +15 à 35 % au-dessus (rachat).

## Images
- Générées sur magnific.com en mode **illimité uniquement** (jamais de crédits), puis `tools/process.py` (détourage) et `tools/split.py` (planches).
- Détourage : `process.py` ne vide plus les zones blanches enfermées (ça trouait le blanc des yeux, les bandes d'écussons). Un vrai vide (anse, cadre, entre bras et corps) se déclare dans `POCKETS` ; `python3 tools/process.py --poches <nom>` montre les poches numérotées. Après chaque lot, contrôler qu'aucune image n'a de trou anormal.
- Les originaux 2K et les références ne sont pas dans le dépôt (seulement sur son Mac). Une session cloud ne peut pas générer d'images : signaler le besoin plutôt que d'en inventer.
- **Sans crédits depuis le cloud** : elle lance un lot `tools/magnific-lot.js` dans la console de Chrome sur Magnific (illimité obligatoire, le script refuse sinon). Pour récupérer les images SANS elle : lire les liens avec le MCP Magnific (`creations_search`, gratuit), les écrire dans `tools/inbox/urls.txt` (« nom url ») et pousser sur main : l'action GitHub « Récupérer les images » les télécharge dans `tools/inbox/` (le cloud n'a pas accès à pikaso.cdnpk.net, GitHub oui). Puis `git pull`, copier dans `originals-2k/`, `split.py`, `process.py`, `manifest.py`, et retirer les PNG de `tools/inbox` du dépôt.
- Mises à jour chez elle : `index.html` charge le CODE de la dernière version de main via jsDelivr (sa partie reste sur localhost) ; les IMAGES viennent de son dossier local (`src()` dans ui.js), et une image absente est reprise sur jsDelivr. La vraie page est `game.html`. Plus de zip à envoyer : pousser sur main suffit.
- Une session cloud n'a pas non plus accès à la version publiée (artifact claude.ai). On travaille dans le dépôt, puis on pousse.
