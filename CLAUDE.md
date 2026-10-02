# Hustle City : consignes pour Claude

Jeu mobile HTML/CSS/JS sans framework, dérivé du moteur de Mama Kana Farm (autre projet, **à ne jamais modifier**).
Pitch : un jeune lascar veut devenir riche « facilement » avec les paris sportifs, les tickets à gratter, le casino, la crypto et les cartes à collectionner.
Lancer : `node tools/serve.js` puis http://localhost:5190. Elle joue elle-même sur localhost dans son Chrome.

## Règles de la propriétaire (non négociables)
- **Super simple** : tout doit se comprendre sans rien connaître à la crypto, à la bourse ou aux paris. Aucun jargon (pas de « bear/bull market ») ; parler en « tu as mis → ça vaut → gagné/perdu ».
- **Réaliste** : vraies cotes avec marge du bookmaker (~93 %), roulette européenne, machine à sous 94,4 %, grattage 61-68 %, tuyaux : un petit avantage, jamais une certitude (journal ~+4 à +10 % en moyenne, potes ~0 %, crypto et potins justes 6-7 fois sur 10 ; voir KIOSK dans data.js). Pas de mécanique fantaisiste.
- **Aucune monnaie réelle** et aucun nom de monnaie : chaque montant est suivi de l'icône billet `<i class="cur"></i>`.
- **Rien qui copie l'existant** : pas de vraies marques (PMU, FDJ, Winamax…), ni de vrais symboles crypto. Les tickets à gratter sont des parodies, sans logo réel.
- **Pas de contexte cannabis** (hérité de Mama Kana) : ni image ni texte.
- Personnages avec de **vrais visages détaillés**, chacun avec son style.
- Pas de jauge de santé. Les habitudes se prennent sur place : fumer et boire au Royal (ex-Balto, id `balto` dans le code), sortir au Club.
- Pas de toasts de Momo « Mission validée » : les infos passent par le téléphone (notifications).
- Pas de lieux externes pour l'instant, mais l'arrêt de bus reste cliquable.
- **Back-office** : `game.html#admin` (ou Réglages → Back-office, seulement sur localhost). On fait glisser les bâtiments et TOUS les objets de la ville (même non achetés), taille avec − / +, bouton Appart pour la chambre. Un objet qui chevauche un objet ou un bâtiment passe en rouge et bloque la publication. « Publier » envoie au serveur local (`tools/serve.js`, POST /admin/layout) qui écrit `js/layout.js`, le commit et le pousse. Bandeau rouge « MODE ADMIN » ; entrer dans l'appart ouvre le placement de la chambre ; bouton ✏️ Textes : on touche n'importe quel texte fixe pour le remplacer (table « texte d'origine → nouveau », `texts` dans layout.js, appliquée chez tous par un MutationObserver). `js/layout.js` remplace les positions de data.js : chaque nouvel objet de ville doit avoir un emplacement unique, réglé par elle.
- Panneau « Tests » du back-office (`TESTS` dans ui.js) : cash, lingots, niveau, finir le minage, machine à 90 %, alerte flash, actu, tuyaux, bon plan, rumeur, mini-événement, dilemme PrivéFans, perso garçon/fille, revoir le tuto. Ne touche que la partie de l'admin, rien n'est publié. Ajouter un bouton à chaque nouvelle fonction à tester.
- Éditeur de valeurs (bouton « Valeurs » du back-office) : prix, niveaux, noms et effets des décos, objets PrivéFans, promos, achats intégrés, Club, machines, PC, chambres. Chemins `TABLE#id.champ` / `TABLE.position.champ`, publiés dans `layout.js` (`values`) et appliqués par data.js. Pour rendre un nouveau réglage modifiable : l'ajouter dans `valSchema()` (ui.js) et sa table dans `TABLES` (data.js).
- Éditeur de chambre (bouton « Appart » du back-office) : chambre 1/2/3, version ♂/♀ (image seulement), aperçu de chaque niveau de PC et de machine, liste des objets (PC, machine, ring light, toutes les étagères, chaque place), flèches au demi-%, − / +, ↔ Miroir (`flip`), ⟲ remettre un objet, copier vers les autres chambres, Publier.
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
- Changer de version : incrémenter `V = '?v=N'` dans game.html (le petit chargeur en bas de la page) (la vraie page ; index.html charge la dernière version depuis GitHub) (actuellement 103).

## Événements (le Panneau, sur la place)
- `SIX` dans data.js : « Tournoi des 6 Quartiers » (rugby). `SIX.sim` = date de la journée 1 pour simuler (une journée par jour) ; null = vrai calendrier 2027 (5 févr. → 13 mars). Pronos gratuits (3 pts + 1 lingot par bon prono), classement contre 24 faux joueurs (`rivals`, à remplacer plus tard par un vrai classement en ligne), cartes en édition limitée dans les boosters pendant le tournoi.
- Résultats tirés de façon fixe (identiques pour tout le monde). Tester sans attendre : ajouter `#tournoi-test` à l'adresse (un match toutes les 4 min).
- Boutique de l'événement (`SIX.shop`) : photos de profil (écussons), cadres, décos posées dans la ville (x/y en %). Images à venir : `deco-<id>`. Achetés pour toujours, en vente seulement pendant l'événement.

## Pièges connus
- `.cur` = l'icône billet, et `.money` est déjà pris : ne jamais les utiliser comme classes d'état.
- `pic()` rend un `<span class="pic">` : une règle `span` dans un flex l'étire.
- Une règle de taille sur `.pic` / `.crest` dans un conteneur touche aussi l'écusson DANS une mini-carte (`card-mini`) : toujours viser l'enfant direct (`> .crest`).
- Tout calque caché (toast, bannière) doit avoir `pointer-events: none`, sinon une fenêtre « se rouvre en boucle ».
- Les fenêtres se redessinent chaque seconde : garder l'état ouvert/fermé et le défilement.
- Un `<button>` garde le fond gris du navigateur : mettre `background: transparent`.
- Les emoji récents (🪩) ne s'affichent pas partout.

## Machine à miner (façon Mama Farm, 02/10)
- On CHOISIT quoi miner (`MINE` dans data.js : durée, rendement, chaleur, niveau de machine requis, imprévu « swing »), la quantité est fixée au départ et payée au cours du moment à la récolte.
- La chaleur monte (`heat` × minutes / `heatMin` de la machine) ; « Refroidir » enlève 50 % (une fois toutes les 5 min). À 100 % : surchauffe → −35 % et plus de risque de virus.
- La récolte donne de la CRYPTO (la quantité minée va dans le portefeuille du PC, point de départ = sa valeur à la récolte) ; bouton « Vendre tout de suite » sur l'écran de récolte pour qui veut du cash.
- Récolte = écran avec trouvaille possible (`FINDS` : bloc doré ×3, lingots, carte, vieux portefeuille, virus −40 %). Nouvelle partie et vieilles sauvegardes : un premier minage d'Axion déjà fini (`starterMine`).
- `st.mine` (game.js : mineStart, mineCool, mineHarvest ; rigInfo garde l'ancienne forme pour le reste du jeu).

## PC plus vivant (02/10, `PCX` dans data.js, `simPc` dans game.js)
- Alertes flash : une crypto bondit/plonge de 8-20 % d'un coup puis revient à 85 % en 3 min (la station de trading prévient 1 min avant).
- Actus par crypto : une source Sérieux (80 %), Moyen (60 %) ou Pas fiable (45 %) ; l'actu fait vraiment bouger la crypto (vrai sens) pendant 15 min ; verdict affiché ensuite.
- Ordres automatiques (PC gamer) : tout vendre à +10/25/50 %, tout vendre à −10/−20 %, acheter 50 à −10/−20 %.
- Défi du trader : faire 20 + 15 × niveau de bénéfice en crypto dans la journée → lingots.

## Agence PrivéFans (js/agence.js, `AGENCE` dans data.js, niveau 6)
- App du téléphone + objet « ring light » dans l'appart (position `light` dans la disposition de la chambre, déplaçable au back-office).
- On recrute des créatrices (10 inventées : charisme, régularité, drama), on choisit sa part (20/35/50 %) : plus elle est grosse, plus le moral baisse. Activités en temps réel (shooting, live, collab à deux, repos, voyage pro). Événements : buzz, bad buzz, agence rivale (prime, baisser sa part, ou la laisser partir). Commission plafonnée à 12 h, à encaisser.
- Un « abonnement » est TOUJOURS un paiement récurrent (`sub: true`, prix par jour, prélevé toutes les 24 h, résiliable, arrêté si pas assez de cash), jamais un achat unique. Ex. : spa 120/jour.
- « Ses affaires » : 9 objets par créatrice (`AGENCE.gear` : revenus, abonnés ou moral ; ×2 si ça colle à sa niche).
- Dilemmes : toutes les 40-90 min, une créatrice écrit par message avec 2 choix et de vraies conséquences (partenariat, fatigue, ex qui menace, télé, prix de l'abonnement, collab rivale, tenue, cadeau de fan). `DIL` dans agence.js, réponses via `AGENCE.choose` (act 'ag' dans chatAct).
- Personnage FÉMININ : pas d'agence, elle lance SA page (« Ma page PrivéFans ») : choix de la spécialité, elle est la créatrice (id `me`), la plateforme garde 20 %, « Énergie » au lieu de « Moral », mêmes activités et objets, collab sans partenaire, dilemmes `DIL_ME` envoyés par des marques, fans, une agence, Momo.
- Ton : glamour, jamais explicite, jamais le vrai nom de la plateforme. Portraits à venir : `cr-<id>`.

## Le Club = une vraie pièce (02/10)
- D'abord le videur (entrée payante, ou lingots s'il te reconnaît), puis une soirée de `nightMin` min dans une salle à toucher : piste (XP), DJ (piste ×1,5), bar (cocktail + habitude), canapés (rencontre → bon plan), carré VIP (lingots → contact assuré), porte (sortir). Chaque coin une fois par soirée.
- `CLUB.spots` (data.js) = zones sur l'image `club-room` (néons dessinés en attendant), `club-door` pour l'entrée. Au back-office : bouton « Club », les zones se déplacent au doigt (− / + pour la taille) et partent avec « Publier ».

## Casino (Lucky Palace)
- Même menu (machine à sous, roulette) mais un style à part : `theme: 'casino'` dans openModal → classe `th-casino` (velours rouge, or, ampoules, tapis vert, jetons, numéros autour de la roue). Machine à sous = une vraie machine : image `casino-machine` (vue de face) avec les rouleaux dans son écran, LED, mises, bouton Lancer et levier posés dessus (`SLOT.ui` en %, à caler sur l'image). Symboles propres au jeu `slot-<id>` (pigeon, basket, chaîne, sac, montre, pièce d'Axion), roulette : `roulette-felt`, `roulette-hub`, `chip-<valeur>`. Lot : tools/lot-casino.js.
- Chambres : vue DE FACE (choix du 02/10), et les objets (PC, machines, ring light) refaits de face eux aussi pour respecter la perspective (tools/lot-base.js).

## Boutique (bouton du bas, ex-Trading)
- `CITY_SHOP` (data.js) : décos de ville achetées pour toujours, chacune à SA place (x/y/w, réglables au back-office). `IAP` : achats en vrai argent, affichés « bientôt » (pas de paiement avant la version stores).
- Le téléphone : l'app Boosters est remplacée par l'agence « PrivéFans » (parodie, jamais le vrai nom ; glamour, jamais explicite).

## Bouton Promos (à gauche)
- Séparé du coach (à droite = progression, à gauche = marketing). Offre du moment en vrai argent qui change chaque jour à minuit (`PROMOS` dans data.js), ouvre la Boutique onglet « Lingots & exclus ». Pas encore achetable.
- Back-office : bouton « Machine » pour caler les zones de la machine à sous sur l'image (glisser ; poignée jaune = taille).

## Bouton Momo (ex-Idée, le coach)
- `coach()` dans ui.js : liste d'étapes utiles triées par priorité (récompenses, cadeau, machine pleine, boosters, tournoi, affaire, matos payable, série presque finie, mission, prochain déblocage, objectif d'argent, tuyau). Jamais d'achat au hasard. Un futur bouton « Promos » (achats intégrés) sera séparé.

## Économie
- Booster : cartes ≤ 600 ; prix au Kiosque 150 + 30 × niveau.
- Les cartes > 600 ne se vendent qu'au Comptoir.
- Lingots (`LINGOT` dans data.js) : 1 lingot = 20 billets pour compléter un achat (machine, déménagement) ; journal du Kiosque tout de suite 3, tuyau ≈ prix / 20, videur du Club 2.
- PC (`PCS`) : 3 niveaux, frais crypto 1,5 % → 0,8 % → 0,2 %. Le bouton « améliorer » (image PC + machine, sans texte, petite flèche verte dans le coin en haut à droite, sans déborder) regroupe machine, PC et appart.
- Comptoir : rayons renouvelés toutes les 30 min ; cartes = 3 communes + 1 plus rare à la fois (`cardStock()`).
- Un seul exemplaire par objet (un doublon de booster est revendu tout de suite). Les cartes (toutes) vont au classeur et ne prennent jamais de place chez soi.
- Bons plans : -5 à -15 % sous la cote (vente) ou 0 à +12 % au-dessus (rachat) : jamais de profit garanti en revendant tout de suite.
- Équilibrage du 02/10 (audit complet) : pas d'XP pour les micro-mises (`serious()` dans game.js) ni à la revente d'objets, plafonds d'XP qui grandissent avec le niveau (`xpCap`), cryptos qui ne montent plus toutes seules (dérive ~0,3 %/jour), hors ligne la météo du marché change toutes les 20 min, cotes boostées ×1,05, déstockage -10 %, pause clope juste 7 fois sur 10, trophées moins chers (hodl 200, jackpot 900, collection 1000), booster 150 + 30 × niveau, machine qui tient 40 à 240 min avant de chauffer, chambre de luxe 25 000.

## Images
- Générées sur magnific.com en mode **illimité uniquement** (jamais de crédits), puis `tools/process.py` (détourage) et `tools/split.py` (planches).
- Détourage : `process.py` ne vide plus les zones blanches enfermées (ça trouait le blanc des yeux, les bandes d'écussons). Un vrai vide (anse, cadre, entre bras et corps) se déclare dans `POCKETS` ; `python3 tools/process.py --poches <nom>` montre les poches numérotées. Après chaque lot, contrôler qu'aucune image n'a de trou anormal.
- Les originaux 2K et les références ne sont pas dans le dépôt (seulement sur son Mac). Une session cloud ne peut pas générer d'images : signaler le besoin plutôt que d'en inventer.
- **Sans crédits depuis le cloud** : elle lance un lot `tools/magnific-lot.js` dans la console de Chrome sur Magnific (illimité obligatoire, le script refuse sinon). Pour récupérer les images SANS elle : lire les liens avec le MCP Magnific (`creations_search`, gratuit), les écrire dans `tools/inbox/urls.txt` (« nom url ») et pousser sur main : l'action GitHub « Récupérer les images » les télécharge dans `tools/inbox/` (le cloud n'a pas accès à pikaso.cdnpk.net, GitHub oui). Puis `git pull`, copier dans `originals-2k/`, `split.py`, `process.py`, `manifest.py`, et retirer les PNG de `tools/inbox` du dépôt.
- Mises à jour chez elle : `index.html` charge le CODE de la dernière version de main via jsDelivr (sa partie reste sur localhost) ; les IMAGES viennent de son dossier local (`src()` dans ui.js), et une image absente est reprise sur jsDelivr. La vraie page est `game.html`. Plus de zip à envoyer : pousser sur main suffit.
- Une session cloud n'a pas non plus accès à la version publiée (artifact claude.ai). On travaille dans le dépôt, puis on pousse.
