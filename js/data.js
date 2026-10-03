/* Hustle City : données du jeu (tout ce qui est réglable est ici) */
(function () {
  'use strict';

  // ---------------------------------------------------------------- joueur
  const START = { cash: 200, lingots: 5 };

  // Skins : le joueur, c'est lui. Visage sans traits, comme les persos de Mama Kana.
  const SKINS = [
    { id: 'survet',   name: 'Le Survêt',    g: 'm', lvl: 1,  cost: 500,  desc: 'Survêt noir, banane, baskets blanches.' },
    { id: 'doudoune', name: 'La Doudoune',  g: 'f', lvl: 1,  cost: 500,  desc: 'Doudoune courte, jogging, créoles.' },
    { id: 'hoodie',   name: 'Le Hoodie',    g: 'm', lvl: 1,  cost: 500,  desc: 'Sweat oversize, casquette, sacoche.' },
    { id: 'sportive', name: 'La Sportive',  g: 'f', lvl: 1,  cost: 500,  desc: 'Ensemble de sport, queue de cheval, air max.' },
    { id: 'flambeur', name: 'Le Flambeur',  g: 'm', lvl: 6,  cost: 2500,  desc: 'Chemise ouverte, chaîne en or, lunettes noires.' },
    { id: 'boss',     name: 'La Boss',      g: 'f', lvl: 10, cost: 6000, desc: 'Tailleur, lunettes, sac de luxe.' }
  ];

  // XP pour passer au niveau suivant (index = niveau actuel)
  const XP_TABLE = [0, 60, 140, 260, 420, 640, 900, 1250, 1650, 2150, 2750, 3450, 4250, 5200, 6300, 7600, 9000, 10600, 12400, 14400, 16600];
  const MAX_LVL = XP_TABLE.length;

  // ---------------------------------------------------------------- la ville
  // Positions en % de la carte (x = centre, y = pied du bâtiment), w = largeur en % de la carte
  const BUILDINGS = [
    { id: 'casino',  name: 'Lucky Palace',        lvl: 3,  x: 59, y: 28, w: 30, tag: 'Machine à sous · roulette' },
    { id: 'appart',  name: 'Mon appart',          lvl: 1,  x: 23.5, y: 52, w: 27, tag: 'Crypto · minage · collection' },
    { id: 'shop',    name: 'Le Comptoir',         lvl: 2,  x: 44, y: 57.5, w: 23, tag: 'Cartes · sneakers' },
    { id: 'balto',   name: 'Le Royal',            lvl: 1,  x: 77, y: 57.5, w: 28, tag: 'Paris sportifs · grattage' },
    { id: 'club',    name: 'Le Club',             lvl: 5,  x: 53, y: 46, w: 25, tag: 'Soirées · rencontres · sortir en boîte' },
    { id: 'kiosque', name: 'Le Kiosque',          lvl: 1,  x: 59, y: 66.5, w: 20, tag: 'Tuyaux du jour · boosters de cartes' },
    { id: 'six',     name: 'Tournoi des 6 Quartiers', lvl: 3,  x: 21, y: 64, w: 16, tag: 'Événements spéciaux' },
    { id: 'bus',     name: 'Arrêt de bus',        lvl: 1,  x: 69, y: 75, w: 22, spot: true, tag: 'Vers les autres quartiers' },
    // apparaît dans la ville dès qu'on possède une voiture ou une moto (Garage Prestige)
    { id: 'parking', name: 'Mon parking',        lvl: 10, x: 88, y: 80, w: 20, needVehicle: true, tag: 'Tes voitures et motos' }
  ];
  // quartiers où mène le bus (pas encore ouverts : on les montre pour donner envie)
  // les places dessinées sur l'image parking-bg (x = centre, y = bas de la voiture, w = largeur, en %), 7 places au maximum
  const PARK_SLOTS = [[26, 34, 30], [70, 34, 30], [26, 56, 32], [70, 56, 32], [26, 80, 34], [70, 80, 34], [48, 98, 36]];
  // le parking du Garage Prestige (une voiture ou une moto par place)
  const GARAGES = [{ slots: 2, cost: 0, name: 'Box simple' }, { slots: 4, cost: 25000, name: 'Garage double' }, { slots: 7, cost: 90000, name: 'Parking privé' }];
  // La Tour : l'immobilier (un loyer par jour, même hors ligne, max 3 jours en attente) et la bourse (actions fictives du quartier)
  const PROPS = [
    { id: 'p-park',   name: 'Place de parking',     price: 3000,   rent: 120,   lvl: 12, icon: '🅿️', desc: 'Petit loyer, zéro souci.' },
    { id: 'p-studio', name: 'Studio étudiant',      price: 15000,  rent: 600,  lvl: 12, icon: '🛏️', desc: 'Toujours loué, parfois en retard.' },
    { id: 'p-flat',   name: 'Appart avec balcon',   price: 60000,  rent: 2400,  lvl: 14, icon: '🏢', desc: 'Le bon rapport, si tout va bien.' },
    { id: 'p-office', name: 'Étage de bureaux',     price: 250000, rent: 9500, lvl: 16, icon: '🏙️', desc: 'Le gros lot : des entreprises qui paient cash.' }
  ];
  const PROP = { maxDays: 3, sellFee: .08, growDay: .004, issue: .15 };   // pépin de proprio : 15 % de chance à l'encaissement
  const STOCKS = [
    { id: 'kbc', name: 'KebabCorp',     sym: 'KBC', p0: 42,  vol: .0025, drift: .000004, div: .006, sector: 'Restauration rapide', color: '#e0662f' },
    { id: 'mtr', name: 'MétroLigne',    sym: 'MTR', p0: 88,  vol: .0015, drift: .000003, div: .010, sector: 'Transports',          color: '#1f6fd1' },
    { id: 'nbk', name: 'NéoBanque',     sym: 'NBK', p0: 130, vol: .0020, drift: .000004, div: .008, sector: 'Banque',              color: '#1f9d55' },
    { id: 'stw', name: 'StreetWear SA', sym: 'STW', p0: 26,  vol: .0040, drift: .000006, div: .002, sector: 'Mode',                color: '#9b5de5' },
    { id: 'pxl', name: 'Pixel Studio',  sym: 'PXL', p0: 15,  vol: .0060, drift: .000008, div: 0,    sector: 'Jeux vidéo',          color: '#ff3cac' },
    { id: 'sol', name: 'SolarCité',     sym: 'SOL', p0: 54,  vol: .0035, drift: .000005, div: .004, sector: 'Énergie',             color: '#f2b01e' }
  ];
  const BOURSE = { fee: .005, lvl: 14, newsEvery: 600 };   // div = part du prix versée chaque jour ; une grosse nouvelle (±) toutes les ~10 h par action
  const EXT_PLACES = [
    { id: 'bijou',  name: 'Bijouterie Diamant', lvl: 6,  tag: 'Montres de luxe, or et raretés' },
    { id: 'garage', name: 'Garage Prestige',    lvl: 10, tag: 'Voitures et motos de collection' },
    { id: 'tour',   name: 'La Tour',            lvl: 12, tag: 'Immobilier, puis la bourse au niveau 14' }
  ];

  // ---------------------------------------------------------------- crypto
  // Prix en billets du jeu. vol = volatilité par minute de jeu (écart-type), drift = tendance par minute.
  // Les cours bougent vraiment : marche aléatoire log-normale + humeur du marché.
  const COINS = [
    { id: 'btk', sym: 'AXN', name: 'Axion',       lvl: 1, p0: 58000, vol: .004, drift: .000003, color: '#f7931a', desc: 'La plus ancienne. Solide, mais chère.' },
    { id: 'eta', sym: 'VKT', name: 'Vektor',      lvl: 1, p0: 2400,  vol: .008, drift: .000002, color: '#7b8cff', desc: 'La deuxième du marché. Bouge un peu plus.' },
    { id: 'slr', sym: 'NVA', name: 'Nova',        lvl: 3, p0: 140,   vol: .012, drift: 0, color: '#14c9a5', desc: 'Rapide et nerveuse.' },
    { id: 'dgk', sym: 'PGN', name: 'PigeonCoin',  lvl: 4, p0: .12,   vol: .02,  drift: 0,      color: '#8a9bb0', desc: 'Né d\'une blague sur les pigeons du quartier. Tout peut arriver.' },
    { id: 'ppc', sym: 'KBB', name: 'KebabCoin',   lvl: 6, p0: .0009, vol: .03,  drift: -.0001, color: '#e0662f', desc: 'Memecoin très spéculatif. Sauce blanche en option.', rug: .0006 },
    { id: 'lmn', sym: 'ZPH', name: 'Zéphyr',      lvl: 8, p0: 3.2,   vol: .025, drift: 0,      color: '#c77dff', desc: '« Stablecoin algorithmique ». Ça tient… jusqu\'au jour où.', rug: .0004 }
  ];
  const CRYPTO_REVERT = .0004;   // force de rappel des cours vers leur prix de départ (par minute) : ça monte et ça baisse, mais ça ne s'écroule pas pour de bon
  const CRYPTO_FEE = .015;         // frais par achat/vente avec le vieux PC (comme une appli grand public)
  // Le PC : un meilleur PC donne accès à de meilleures plateformes, avec moins de frais à chaque achat et vente
  const PC_UPGRADES = false;   // en pause (03/10) : on ne peut plus acheter de meilleur PC, en attendant de bonnes images
  const PCS = [
    { name: 'Vieux PC',            cost: 0,    fee: .015, desc: 'Il rame, mais il marche.' },
    { name: 'PC gamer',            cost: 600,  fee: .008, desc: 'Écran rapide, clavier lumineux.' },
    { name: 'Station de trading',  cost: 4000, fee: .002, desc: 'Plusieurs écrans, comme les pros.' }
  ];
  const TICK_S = 5;                // un point de cours toutes les 5 s
  const HISTORY = 180;             // points gardés pour la courbe (15 min)

  // Humeur du marché : change toutes les 20 min (tirage pondéré)
  const MOODS = [
    // noms simples (pas de jargon) : c'est la « météo du marché » affichée au joueur
    { id: 'calm',  name: '☁️ Calme',       w: 40, drift: 0,      volx: .8,  desc: 'les prix bougent à peine.' },
    { id: 'bull',  name: '☀️ Ça monte',    w: 22, drift: .0012,  volx: 1.1, desc: 'les cryptos vont plutôt grimper. Bon moment pour acheter avant.' },
    { id: 'bear',  name: '🌧️ Ça baisse',   w: 25, drift: -.001,  volx: 1.1, desc: 'les cryptos vont plutôt descendre. Pense à vendre avant.' },
    { id: 'fomo',  name: '🚀 Folie',       w: 8,  drift: .0025,  volx: 1.8, desc: 'tout le monde achète, ça s\'envole… et ça peut retomber d\'un coup.' },
    { id: 'krach', name: '⛈️ Panique',     w: 5,  drift: -.004,  volx: 2.2, desc: 'tout s\'effondre. Vends vite, ou achète pas cher si tu es joueur.' }
  ];
  const MOOD_MIN = 20;

  // Machine à miner (façon Mama Farm) : on CHOISIT quoi miner (comme une graine), elle tourne un temps donné, chauffe,
  // et à la fin on RÉCOLTE (écran de récolte avec trouvailles possibles). btkH = puissance (en Axion par heure au prix de base),
  // heatMin = endurance : plus elle est haute, moins la machine chauffe.
  // MINE : ce qu'on peut miner. min = durée, mult = rendement, heat = chauffe, need = niveau de machine requis (0 = la première),
  // swing = imprévisible (la récolte peut valoir de ×(1-swing) à ×(1+swing)).
  // équilibrage 03/10 : plus c'est long, moins ça rapporte par heure (jouer doit rapporter plus que laisser tourner la nuit)
  const MINE = [
    { id: 'btk', min: 15,  mult: 1.0,  heat: .5,  need: 0, swing: .1,  tag: 'Rapide et sûr' },
    { id: 'eta', min: 45,  mult: .95, heat: .8,  need: 0, swing: .15, tag: 'Le bon compromis' },
    { id: 'dgk', min: 30,  mult: 1.05, heat: 1.1, need: 1, swing: .8,  tag: 'Tout ou rien' },
    { id: 'slr', min: 120, mult: .8,  heat: 1.0, need: 1, swing: .2,  tag: 'Long mais costaud' },
    { id: 'ppc', min: 240, mult: .75, heat: 1.5, need: 2, swing: 1.0, tag: 'Jackpot ou catastrophe' },
    { id: 'lmn', min: 480, mult: .55, heat: .45, need: 1, swing: .15, tag: 'Pour la nuit' }   // équilibrage 03/10 : dès la 2e machine (sinon la machine dormait 20 h par jour)
  ];
  // PC plus vivant (02/10) : alertes flash, actus par crypto avec des sources plus ou moins fiables, ordres automatiques, défi du trader
  const PCX = {
    flashEvery: [10, 20], flashK: [1.08, 1.2], flashBack: .85, flashMin: 3,   // une crypto bondit (ou plonge) d'un coup puis revient à 85 %
    newsEvery: [6, 12], newsMin: 15, newsDrift: .003,                        // une actu fait bouger UNE crypto pendant 15 min (~±5 %)
    sources: [{ name: 'Finance Hebdo', rel: .8, label: 'Sérieux' }, { name: 'CryptoBuzz', rel: .6, label: 'Moyen' }, { name: 'Le Bavard du Web', rel: .45, label: 'Pas fiable' }],
    ordersPc: 0, preAlertPc: 0,   // PC en pause (03/10) : ordres et pré-alerte pour tout le monde
                                                 // PC gamer : ordres automatiques ; station : alerte 1 min avant
    trader: { base: 20, perLvl: 15, lingots: 3 }                             // défi du trader : faire X de bénéfice en crypto dans la journée
  };
  // ---------------------------------------------------------------- l'agence « PrivéFans » (parodie : jamais le vrai nom ; glamour, jamais explicite)
  // Tu manages des créatrices de contenu : tu touches ta part (commission) de leurs abonnements. Plus ta part est grosse,
  // plus leur moral baisse. Activités = durée réelle. cha = charisme (fait grimper les abonnés), reg = régularité (revenu stable),
  // drama = risque de bad buzz et d'agence rivale. Tout est inventé.
  const AGENCE = {
    lvl: 7, subPrice: .035, subsCap: 20000, payCapH: 10, candEvery: 120, eventEvery: [30, 60],
    slots: [{ n: 1, cost: 0 }, { n: 2, cost: 3000 }, { n: 3, cost: 10000 }, { n: 4, cost: 30000 }],
    shares: [.2, .35, .5],
    acts: [
      { id: 'shoot',  name: 'Shooting photo', icon: '📸', min: 120, cost: 60,  subs: .06, mood: -5,  desc: 'Des nouvelles photos : les abonnés montent.' },
      { id: 'live',   name: 'Live',           icon: '🔴', min: 60,  cost: 0,   subs: .02, mood: -10, cash: .15, desc: 'Gros pourboires tout de suite, mais ça fatigue.' },
      { id: 'collab', name: 'Collab',         icon: '🤝', min: 240, cost: 120, subs: .12, mood: 5,   duo: true, desc: 'Avec une autre créatrice de ton agence : abonnés ×2 pour les deux.' },
      { id: 'rest',   name: 'Repos',          icon: '🛌', min: 180, cost: 0,   subs: 0,   mood: 35,  desc: 'Elle recharge les batteries.' },
      { id: 'trip',   name: 'Voyage pro',     icon: '✈️', min: 480, cost: 400, subs: .25, mood: 20,  lvl: 8, desc: 'Shooting au soleil : énorme pour les abonnés et le moral.' }
    ],
    // objets à acheter pour une créatrice (une fois chacun) : rev = revenus, subs = croissance des abonnés, mood = moral par heure
    // niche : ×2 sur l'effet si ça colle à sa spécialité
    // équilibrage 03/10 : un objet « de spécialité » vaut ×2 pour les créatrices de cette spécialité, il est donc plus cher que l'objet pour tout le monde à effet égal
    gear: [
      { id: 'ring',   name: 'Ring light pro',        icon: '💡', cost: 300,  subs: .15, desc: 'Des photos nettes : les abonnés montent plus vite.' },
      { id: 'cam',    name: 'Appareil photo hybride', icon: '📷', cost: 900,  subs: .25, desc: 'Qualité pro pour chaque shooting.' },
      { id: 'mic',    name: 'Micro de stream',       icon: '🎙️', cost: 400,  rev: .10,  desc: 'Les lives rapportent plus de pourboires.' },
      { id: 'sport',  name: 'Tenue de sport premium', icon: '🏋️', cost: 600,  rev: .06, niche: ['Fitness', 'Danse', 'Bien-être'], desc: 'Parfaite pour les vidéos qui bougent.' },
      { id: 'gown',   name: 'Robe de soirée',        icon: '👗', cost: 900,  rev: .07, niche: ['Mode & luxe', 'Beauté', 'Musique'], desc: 'Pour les photos glamour.' },
      { id: 'cosplay', name: 'Costume de héroïne',   icon: '🦸', cost: 800,  rev: .07, niche: ['Cosplay', 'Gaming'], desc: 'Les fans adorent.' },
      { id: 'travel', name: 'Valise de voyage',      icon: '🧳', cost: 650,  rev: .06, niche: ['Voyage', 'Cuisine'], desc: 'Prête à partir tourner au soleil.' },
      { id: 'spa',    name: 'Abonnement spa',        icon: '🧖', cost: 120,  mood: 2,   sub: true, desc: 'Elle récupère toute seule. Prélevé chaque jour, résiliable quand tu veux.' },   // sub = abonnement : cost par jour
      { id: 'studio', name: 'Déco de studio',        icon: '🛋️', cost: 2500, rev: .15, subs: .1, desc: 'Un vrai décor : tout son contenu prend de la valeur.' }
    ],
    dilEvery: [40, 90],   // une créatrice t'écrit pour te demander de choisir, toutes les 40 à 90 min
    crew: [
      { id: 'lola',  name: 'lola_lavande',   niche: 'Fitness',    cha: 3, reg: 4, drama: 2, subs: 1200, desc: 'Coach sportive, toujours motivée.' },
      { id: 'mila',  name: 'mila.mochi', niche: 'Cosplay',    cha: 4, reg: 3, drama: 3, subs: 1800, desc: 'Costumes faits main, fans très fidèles.' },
      { id: 'ines',  name: 'Inès Delacroix',    niche: 'Mode & luxe', cha: 5, reg: 2, drama: 4, subs: 3000, desc: 'Sacs, palaces et caprices.' },
      { id: 'jade',  name: 'jadey404',   niche: 'Gaming',     cha: 3, reg: 5, drama: 1, subs: 1500, desc: 'En live tous les soirs, sans faute.' },
      { id: 'sasha', name: 'Sasha Soleil', niche: 'Voyage',     cha: 4, reg: 3, drama: 2, subs: 2200, desc: 'Une plage différente chaque semaine.' },
      { id: 'nora',  name: 'noranoir',    niche: 'Beauté',     cha: 3, reg: 4, drama: 2, subs: 1400, desc: 'Tutos make-up et routines skincare.' },
      { id: 'kim',   name: 'Kimmy K',    niche: 'Danse',      cha: 4, reg: 4, drama: 3, subs: 2500, desc: 'Ses chorés font le tour des réseaux.' },
      { id: 'leila', name: 'leila.moon',    niche: 'Bien-être',  cha: 3, reg: 5, drama: 1, subs: 1300, desc: 'Yoga au lever du soleil.' },
      { id: 'rose',  name: 'Rosie Vandal',    niche: 'Musique',    cha: 4, reg: 2, drama: 5, subs: 2800, desc: 'Guitare, tatouages et coups de gueule.' },
      { id: 'eva',   name: 'Eva Bonbon', niche: 'Cuisine',   cha: 2, reg: 5, drama: 1, subs: 900,  desc: 'Recettes glamour, toujours de bonne humeur.' }
    ]
  };
  // Trouvailles à la récolte (chances de base, un peu plus avec une grosse machine et un long minage)
  const FINDS = { gold: .04, lingots: .10, card: .05, wallet: .02, virus: .05, virusHot: .25, burnt: .35, coolCd: 5 };
  // équilibrage du 03/10 : minage ×2,5 (la 1re machine se rentabilisait en ~20 jours de jeu, maintenant ~10 h de minage)
  const RIG = [
    { name: 'Vieille tour bricolée', cost: 0,     btkH: .001,   heatMin: 40, desc: 'Elle chauffe, elle souffle, elle crache quelques pièces.' },
    { name: 'Tour gamer',          cost: 900,   btkH: .0026,  heatMin: 75, desc: 'Une vraie machine, ça tourne plus vite.' },
    { name: 'Borne à pièces',      cost: 3500,  btkH: .0065,  heatMin: 120, desc: 'Elle sort des pièces comme une borne d\'arcade.' },
    { name: 'Imprimante à crypto', cost: 12000, btkH: .016,   heatMin: 180, desc: 'Le radiateur de tout l\'immeuble. Mais quel débit.' },
    { name: 'Usine en or',         cost: 40000, btkH: .04,    heatMin: 240, desc: 'Ça déborde de pièces. Bruit garanti.' }
  ];

  // ---------------------------------------------------------------- paris sportifs
  const BOOK_MARGIN = .07;         // marge du bookmaker (~93 % reversé en moyenne, comme en vrai)
  // [nom, force, couleur 1, couleur 2] ; écusson = crest-f<n> / crest-b<n>, joueurs de tennis = player-t<n> (n = rang dans la liste, à partir de 1)
  const TEAMS = {
    foot: [
      ['FC Bitume', 82, '#1d1d1f', '#ffd23f'], ['AS Béton', 74, '#8d99a6', '#ff8a3d'], ['Racing Kebab', 68, '#e63946', '#ffffff'], ['Olympique Périph', 86, '#1f6fd1', '#ffffff'],
      ['Stade Tacos', 63, '#ff8a3d', '#3a9d4a'], ['US Trottinette', 58, '#22c3d6', '#ff6fb5'], ['Sporting Bled', 71, '#2e8b3e', '#f2c230'], ['Real Banlieue', 89, '#6a3fb5', '#f2c230'],
      ['Inter Quartier', 79, '#1b2a5c', '#c9d1db'], ['Dynamo Chicha', 66, '#139c8c', '#ffffff'], ['Atlético Tram', 61, '#c62828', '#9aa3ad'], ['FC Pigeons', 55, '#b9c3cc', '#2a5db0']
    ],
    basket: [
      ['Street Ballers', 80, '#ff7a1a', '#1d1d1f'], ['Les Dunkers', 74, '#1f6fd1', '#ffffff'], ['Cité Hoops', 69, '#3a9d4a', '#8d99a6'], ['Downtown Kings', 85, '#6a3fb5', '#f2c230'],
      ['Asphalt Five', 63, '#3b3f46', '#e63946'], ['Les Paniers Percés', 57, '#f2c230', '#7a4a22']
    ],
    tennis: [
      ['K. Moreau', 84, '#ffffff', '#1f6fd1'], ['S. Diallo', 78, '#8a4dd4', '#ffffff'], ['L. Petit', 71, '#1b2a5c', '#ff7a1a'], ['Y. Benali', 66, '#3a9d4a', '#ffffff'],
      ['T. Garnier', 60, '#1d1d1f', '#c9d1db'], ['M. Rossi', 74, '#e63946', '#ffffff']
    ]
  };
  const SPORTS = {
    foot:   { name: 'Foot',   lvl: 1, icon: '⚽', kind: '1N2', league: 'Ligue du Bitume', img: 'crest-f', pitch: 'foot' },
    basket: { name: 'Basket', lvl: 4, icon: '🏀', kind: '12', league: 'Street League', img: 'crest-b', pitch: 'basket' },
    tennis: { name: 'Tennis', lvl: 5, icon: '🎾', kind: '12', league: 'Open de la Cité', img: 'player-t', pitch: 'tennis' }
  };
  const MATCH = { upcoming: 5, gapMin: 1.5, gapMax: 3, liveS: 60 };  // un coup d'envoi toutes les 1,5 à 3 min, 60 s de direct
  const BET_MAX = lvl => Math.round(20 + lvl * lvl * 15);           // mise max selon le niveau
  const COMBI_LVL = 3;

  // Tickets à gratter : parodies des tickets vendus au tabac. Chacun a sa propre façon de gagner, comme les vrais.
  // Le gain est tiré à l'achat (comme en vrai : le ticket est imprimé gagnant ou perdant), puis la grille est fabriquée pour le montrer.
  // prizes = [gain, probabilité] ; taux de retour ≈ 60-70 %, comme les vrais jeux de grattage.
  // jeux : numbers (tes numéros contre les numéros gagnants), match3 (3 montants identiques), morpion (3 billets alignés),
  //        blackjack (ta main bat la banque), astro (ton signe = le signe du jour)
  const SCRATCH = [
    { id: 'flash',  name: 'Cash Flash',               price: 1,  lvl: 1, game: 'numbers', win: 2, mine: 6, max: 30, c1: '#1aa34a', c2: '#0b5e2a', ink: '#ffe066', emblem: 'tk-flash',
      rule: 'Si un de tes numéros est un numéro gagnant, tu gagnes le montant écrit dessous.',
      prizes: [[2, .13], [5, .04], [10, .011], [50, .0014], [500, .00004]] },
    { id: 'morpion', name: 'Morpion de la Cité',      price: 2,  lvl: 2, game: 'morpion', c1: '#e63946', c2: '#7a1420', ink: '#fff3c4', emblem: 'tk-morpion',
      rule: '3 billets alignés (en ligne, en colonne ou en diagonale) : tu gagnes le gain indiqué.',
      prizes: [[2, .18], [4, .09], [10, .03], [50, .004], [1000, .0001]] },
    { id: 'banco',  name: 'Banco du Bitume',          price: 3,  lvl: 2, game: 'match3', c1: '#2f6fd8', c2: '#142f6e', ink: '#ffd23f', emblem: 'tk-banco',
      rule: '3 montants identiques : tu gagnes ce montant.',
      prizes: [[3, .14], [6, .08], [15, .034], [100, .004], [2000, .00007]] },
    { id: 'black',  name: 'Black Jack du Royal',      price: 3,  lvl: 3, game: 'blackjack', c1: '#1d1d1f', c2: '#0e6b3a', ink: '#ffd23f', emblem: 'tk-black',
      rule: 'Pour chaque main : si ton total bat celui de la banque sans dépasser 21, tu gagnes le gain de la main.',
      prizes: [[3, .16], [6, .08], [15, .035], [100, .004], [3000, .00005]] },
    { id: 'astro',  name: 'Astro-Lascar',             price: 2,  lvl: 4, game: 'astro', c1: '#6a3fb5', c2: '#22114f', ink: '#ffe066', emblem: 'tk-astro',
      rule: 'Si un de tes signes est le signe du jour, tu gagnes le gain écrit à côté.',
      prizes: [[2, .17], [5, .07], [20, .012], [100, .002], [2000, .00005]] },
    { id: 'millio', name: 'Millionnaire du Quartier', price: 10, lvl: 5, game: 'numbers', win: 5, mine: 15, max: 50, c1: '#f2b01e', c2: '#8a5a00', ink: '#fff6c2', emblem: 'tk-millio',
      rule: 'Si un de tes numéros est un numéro gagnant, tu gagnes le montant écrit dessous.',
      prizes: [[10, .16], [20, .08], [50, .034], [500, .0026], [50000, .00001]] }
  ];

  // ---------------------------------------------------------------- casino
  // Machine à sous : 3 rouleaux, 1 ligne. Poids par rouleau et gains (× la mise).
  // RTP calculé ≈ 95 % (voir GAME.slotRtp()).
  const SLOT = {
    machineImage: false,   // l'image casino-machine (machine étroite) est mise de côté : la fenêtre a un CADRE de machine à sous (ui-casino-frame)
    ui: { screen: { x: 18.5, y: 40.5, w: 56.5, h: 17.8 }, led: { x: 14, y: 25.5, w: 64, h: 6.5 }, bets: { x: 11, y: 62.3, w: 69, h: 5.8 }, spin: { x: 36.5, y: 73.8, w: 20.5, h: 10.8 }, lever: { x: 89, y: 38, w: 11, h: 29 } },   // zones sur l'image casino-machine (en %), réglables au back-office (bouton « Machine »)
    lvl: 3,
    bets: [1, 2, 5, 10, 25, 50, 100],
    symbols: [
      { id: 'cherry', w: 6, pay3: 8,   pay2: 2, icon: '🍒' },
      { id: 'lemon',  w: 5, pay3: 14,  icon: '🍋' },
      { id: 'bell',   w: 4, pay3: 24,  icon: '🔔' },
      { id: 'bar',    w: 3, pay3: 50,  icon: '💰' },
      { id: 'diam',   w: 2, pay3: 100, icon: '💎' },
      { id: 'seven',  w: 1, pay3: 500, icon: '7️⃣' }
    ]
  };
  // Roulette européenne : 37 cases (0 à 36), gains officiels
  const ROULETTE = {
    lvl: 5,
    reds: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
    order: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
    chips: [1, 5, 10, 25, 100, 500]
  };

  // ---------------------------------------------------------------- objets de collection
  // p0 = prix de départ ; vol = volatilité par heure ; les prix bougent toutes les minutes.
  // Achat au prix affiché +5 %, revente au prix −10 % (commission du dépôt-vente).
  const ITEM_CATS = {
    // shop : où ça s'achète (comptoir, bijou = Bijouterie Diamant, garage = Garage Prestige) ; place : étagère de l'appart, coffre (aucune place) ou parking du garage
    card:    { name: 'Cartes',    lvl: 2, icon: '🃏', shop: 'comptoir', place: 'binder' },
    sneaker: { name: 'Sneakers',  lvl: 3, icon: '👟', shop: 'comptoir', place: 'shelf' },
    watch:   { name: 'Montres',   lvl: 6, icon: '⌚', shop: 'bijou', place: 'shelf' },
    gold:    { name: 'Or',        lvl: 6, icon: '🪙', shop: 'bijou', place: 'safe' },
    gem:     { name: 'Raretés',   lvl: 7, icon: '💎', shop: 'bijou', place: 'safe' },
    car:     { name: 'Voitures',  lvl: 10, icon: '🚗', shop: 'garage', place: 'park' },
    moto:    { name: 'Motos',     lvl: 10, icon: '🏍️', shop: 'garage', place: 'park' },
    trophy:  { name: 'Trophées',  lvl: 1, icon: '🏆', noBuy: true }
  };
  const ITEMS = [
    { id: 'c-rookie',   cat: 'card',    name: 'Carte rookie Ndiaye',     r: 'R', p0: 18,    vol: .05 },
    { id: 'c-dragon',   cat: 'card',    name: 'Carte Dragon Ardent',     r: 'R', p0: 35,    vol: .06 },
    { id: 'c-holo',     cat: 'card',    name: 'Carte holo Foudre',       r: 'R', p0: 120,   vol: .07 },
    { id: 'c-signed',   cat: 'card',    name: 'Carte dédicacée Real Banlieue', r: 'R', p0: 260, vol: .06 },
    { id: 'c-1st',      cat: 'card',    name: 'Dragon Ardent 1re édition', r: 'E', p0: 1400, vol: .08 },
    { id: 'c-psa10',    cat: 'card',    name: 'Carte gradée 10/10',      r: 'L', p0: 9000,  vol: .07 },
    { id: 's-court',    cat: 'sneaker', name: 'Baskets Court Low',       r: 'C', p0: 140,   vol: .03 },
    { id: 's-runner',   cat: 'sneaker', name: 'Runner Nuage',            r: 'R', p0: 320,   vol: .04 },
    { id: 's-collab',   cat: 'sneaker', name: 'Collab « Désert » édition limitée',    r: 'E', p0: 1300,  vol: .06 },
    { id: 's-gold',     cat: 'sneaker', name: 'Baskets dorées édition limitée', r: 'L', p0: 6500, vol: .07 },
    { id: 'w-quartz',   cat: 'watch',   name: 'Montre quartz vintage',   r: 'C', p0: 250,   vol: .02 },
    { id: 'w-diver',    cat: 'watch',   name: 'Montre de plongée',       r: 'R', p0: 2800,  vol: .025 },
    { id: 'w-chrono',   cat: 'watch',   name: 'Chronographe or',         r: 'E', p0: 14000, vol: .03 },
    { id: 'w-grail',    cat: 'watch',   name: 'La montre « graal »',     r: 'L', p0: 85000, vol: .035 },
    // or : le placement sûr (bouge peu, monte doucement : drift = tendance par minute, revert 0 = ne revient pas vers le prix de départ)
    { id: 'o-napo',     cat: 'gold',    name: 'Pièce d\'or de 20 francs',  r: 'C', p0: 450,    vol: .006, drift: .000004, revert: 0, cap: 1.6 },
    { id: 'o-bar10',    cat: 'gold',    name: 'Petite barre d\'or 10 g',   r: 'R', p0: 900,    vol: .006, drift: .000004, revert: 0, cap: 1.6 },
    { id: 'o-lion',     cat: 'gold',    name: 'Once d\'or « Lion »',       r: 'E', p0: 2600,   vol: .007, drift: .000004, revert: 0, cap: 1.6 },
    { id: 'o-bar100',   cat: 'gold',    name: 'Barre d\'or 100 g',         r: 'L', p0: 9000,   vol: .006, drift: .000004, revert: 0, cap: 1.6 },
    // raretés : bougent peu, sauf quand une rumeur tombe
    { id: 'g-roman',    cat: 'gem',     name: 'Pièce romaine antique',     r: 'R', p0: 1200,   vol: .015 },
    { id: 'g-ruby',     cat: 'gem',     name: 'Rubis certifié',            r: 'R', p0: 1800,   vol: .015 },
    { id: 'g-stamp',    cat: 'gem',     name: 'Timbre rare « Bleu inversé »', r: 'E', p0: 5000, vol: .02 },
    { id: 'g-diam',     cat: 'gem',     name: 'Diamant certifié 2 carats', r: 'L', p0: 30000,  vol: .02 },
    // garage : chaque véhicule prend une place de parking
    { id: 'v-city',     cat: 'car',     name: 'Citadine tunée',            r: 'C', p0: 4000,   vol: .03 },
    { id: 'v-gti',      cat: 'car',     name: 'Compacte sportive rétro',   r: 'R', p0: 12000,  vol: .035 },
    { id: 'v-muscle',   cat: 'car',     name: 'Muscle car américaine',     r: 'E', p0: 45000,  vol: .04 },
    { id: 'v-super',    cat: 'car',     name: 'Supercar italienne',        r: 'L', p0: 180000, vol: .045 },
    { id: 'm-scoot',    cat: 'moto',    name: 'Scooter vintage',           r: 'C', p0: 1500,   vol: .03 },
    { id: 'm-road',     cat: 'moto',    name: 'Roadster sportif',          r: 'R', p0: 8000,   vol: .035 },
    { id: 'm-chopper',  cat: 'moto',    name: 'Chopper chromé',            r: 'E', p0: 25000,  vol: .04 },
    // trophées : on ne les achète pas, on les gagne. Ils ont une cote comme le reste.
    { id: 't-first',    cat: 'trophy',  name: 'Trophée « Premier pari gagné »', r: 'C', p0: 40,  vol: .03 },
    { id: 't-combi',    cat: 'trophy',  name: 'Trophée « Combiné de fou »',     r: 'R', p0: 400, vol: .04 },
    { id: 't-jackpot',  cat: 'trophy',  name: 'Trophée « Jackpot »',            r: 'E', p0: 900, vol: .05 },
    { id: 't-hodl',     cat: 'trophy',  name: 'Trophée « Mains de diamant »',   r: 'R', p0: 200, vol: .04 },
    { id: 't-collect',  cat: 'trophy',  name: 'Trophée « Collectionneur »',     r: 'E', p0: 1000, vol: .05 }
  ];
  // Cartes à collectionner des boosters : écussons des clubs et joueurs de tennis. On ne les achète pas au Comptoir,
  // on les tire dans les boosters ; elles ont une cote comme le reste et se revendent.
  const CARD_RAR = s => s >= 85 ? 'E' : s >= 74 ? 'R' : 'C';
  const CARD_P0 = { C: 8, R: 32, E: 120, L: 600 };
  [['foot', 'f'], ['basket', 'b'], ['tennis', 't']].forEach(([sp, k]) => TEAMS[sp].forEach((t, i) => {
    const r = sp === 'tennis' ? (t[1] >= 84 ? 'L' : CARD_RAR(t[1] + 4)) : CARD_RAR(t[1]);
    ITEMS.push({ id: `k-${k}${i + 1}`, cat: 'card', series: sp, noBuy: true, name: sp === 'tennis' ? t[0] : t[0], r, p0: Math.round(CARD_P0[r] * (0.85 + (t[1] % 7) / 20)), vol: .06,
      img: (sp === 'tennis' ? 'player-t' : sp === 'foot' ? 'crest-f' : 'crest-b') + (i + 1), team: [sp, i] });
  }));
  ['c-rookie', 'c-dragon', 'c-holo', 'c-signed', 'c-1st', 'c-psa10'].forEach(id => { ITEMS.find(x => x.id === id).series = 'classics'; });
  // Séries du classeur : compléter une série = grosse récompense
  const SERIES = [
    { id: 'foot',     name: 'Ligue du Bitume',       sub: 'Écusson',  reward: { cash: 600, lingots: 10 } },
    { id: 'basket',   name: 'Street League',         sub: 'Écusson',  reward: { cash: 500, lingots: 8 } },
    { id: 'tennis',   name: 'Open de la Cité',       sub: 'Joueur',   reward: { cash: 900, lingots: 12 } },
    { id: 'rugby',    name: 'Tournoi des 6 Quartiers', sub: 'Édition limitée', reward: { cash: 1500, lingots: 15 } },
    { id: 'classics', name: 'Les grandes cartes',    sub: 'Collector', reward: { cash: 2500, lingots: 20 } }
  ];
  // ---------------------------------------------------------------- événement : le Tournoi des 6 Quartiers (rugby)
  // Calqué sur le vrai calendrier du tournoi 2027 (heures en temps universel). Les équipes sont inventées : une par quartier.
  // Pronos gratuits (3 points par bon prono), classement avec d'autres joueurs, cartes en édition limitée dans les boosters.
  const SIX = {
    name: 'Tournoi des 6 Quartiers', short: '6 Quartiers', img: 'crest-r',
    // simulation : si une date est indiquée, la journée 1 a lieu ce jour-là et les suivantes un jour après l'autre
    // (mêmes heures que le vrai tournoi). Mettre null pour revenir au vrai calendrier 2027.
    sim: '2026-10-01', pts: 3, liveMin: 100, lingotPerGood: 1, cardChance: .35,
    teams: [
      ['Trèfles du Marché',     87, '#1f9d55', '#ffffff', '☘️'],
      ['Roses du Port',         84, '#ffffff', '#d33a2c', '🌹'],
      ['Chardons de la Colline', 80, '#1b2a5c', '#a867e3', '🦔'],
      ['Loups du Canal',        72, '#2f7fd0', '#ffffff', '🐺'],
      ['Coqs de la Gare',       88, '#1b3a8c', '#e63946', '🐓'],
      ['Dragons des Docks',     70, '#d33a2c', '#1f9d55', '🐉']
    ],
    // [journée, coup d'envoi (UTC), domicile, extérieur]
    matches: [
      [1, '2027-02-05T20:10Z', 0, 1], [1, '2027-02-06T14:10Z', 2, 3], [1, '2027-02-06T16:40Z', 4, 5],
      [2, '2027-02-13T14:10Z', 3, 0], [2, '2027-02-13T16:40Z', 2, 5], [2, '2027-02-14T15:10Z', 1, 4],
      [3, '2027-02-20T14:10Z', 5, 0], [3, '2027-02-20T16:40Z', 1, 3], [3, '2027-02-21T15:10Z', 4, 2],
      [4, '2027-03-05T20:10Z', 2, 0], [4, '2027-03-06T14:10Z', 3, 4], [4, '2027-03-06T16:40Z', 5, 1],
      [5, '2027-03-13T14:10Z', 3, 5], [5, '2027-03-13T16:40Z', 1, 2], [5, '2027-03-13T20:10Z', 0, 4]
    ],
    // boutique de l'événement : objets exclusifs (photos de profil, cadres, décos posées dans la ville). Images à faire plus tard.
    // kind : avatar (photo de profil = écusson d'une équipe), frame (cadre autour de la photo), deco (posée sur la carte de la ville, x/y en %)
    shop: [
      { id: 'av-r1', kind: 'avatar', team: 0, name: 'Photo : Trèfles du Marché', lingots: 6 },
      { id: 'av-r2', kind: 'avatar', team: 1, name: 'Photo : Roses du Port', lingots: 6 },
      { id: 'av-r3', kind: 'avatar', team: 2, name: 'Photo : Chardons de la Colline', lingots: 6 },
      { id: 'av-r4', kind: 'avatar', team: 3, name: 'Photo : Loups du Canal', lingots: 6 },
      { id: 'av-r5', kind: 'avatar', team: 4, name: 'Photo : Coqs de la Gare', lingots: 6 },
      { id: 'av-r6', kind: 'avatar', team: 5, name: 'Photo : Dragons des Docks', lingots: 6 },
      { id: 'fr-six', kind: 'frame', name: 'Cadre « 6 Quartiers »', emo: '🏉', colors: ['#e63946', '#1b2a5c'], cash: 400 },
      { id: 'fr-gold', kind: 'frame', name: 'Cadre doré du champion', emo: '🏆', colors: ['#ffd23f', '#b8860b'], lingots: 25 },
      { id: 'dc-posts', kind: 'deco', name: 'Poteaux de rugby', emo: '🥅', desc: 'Plantés sur la place.', x: 44, y: 34, w: 9, cash: 600 },
      { id: 'dc-flags', kind: 'deco', name: 'Guirlande de drapeaux', emo: '🎏', desc: 'Les couleurs des 6 quartiers.', x: 30, y: 72, w: 8, cash: 350 },
      { id: 'dc-ball', kind: 'deco', name: 'Ballon géant', emo: '🏉', desc: 'Une sculpture de ballon devant le Royal.', x: 88, y: 66, w: 8, lingots: 15 },
      { id: 'dc-trophy', kind: 'deco', name: 'Statue du trophée', emo: '🏆', desc: 'Pour les vrais fans.', x: 9, y: 54, w: 8, lingots: 30 }
    ],
    // classement final : récompenses selon la place
    rewards: [{ top: 1, lingots: 60, boosters: 3 }, { top: 3, lingots: 35, boosters: 2 }, { top: 10, lingots: 20, boosters: 1 }, { top: 999, lingots: 8, boosters: 0 }],
    // les autres joueurs du classement (en attendant un vrai classement en ligne) : pseudo et taux de bons pronos
    rivals: [['Kenzo93', .66], ['LaFouine', .58], ['Mamadou_R', .62], ['Lina.b', .55], ['TiboRugby', .71], ['Sarah_lsc', .6], ['Yanis.zr', .52], ['Big_Moussa', .64],
      ['Chloé77', .57], ['Nono_du_13', .5], ['K-Rim', .61], ['Jojo_la_frite', .48], ['Ines_dz', .63], ['Matteo.p', .56], ['Ryad', .59], ['Lucie_b', .54],
      ['Djibril', .68], ['Momo_officiel', .53], ['Zoé.k', .6], ['Bilal95', .65], ['Emma_r', .51], ['Sofiane', .62], ['Léo_xv', .69], ['Nadia', .57]]
  };
  TEAMS.rugby = SIX.teams;
  // cartes du tournoi : édition limitée, dans les boosters seulement pendant l'événement
  SIX.teams.forEach((t, i) => ITEMS.push({ id: `k-r${i + 1}`, cat: 'card', series: 'rugby', event: 'six', noBuy: true, name: t[0], r: t[1] >= 86 ? 'E' : 'R',
    p0: Math.round(CARD_P0[t[1] >= 86 ? 'E' : 'R'] * (0.85 + (t[1] % 7) / 20)), vol: .06, img: 'crest-r' + (i + 1), team: ['rugby', i] }));

  const BUY_MARKUP = .05, SELL_FEE = .10;
  // Rumeurs : de temps en temps, un objet s'envole ou s'effondre
  const RUMORS = [
    { up: true,  txt: 'Une star a posé avec {n} sur les réseaux. La cote s\'envole !', k: [1.25, 1.6] },
    { up: true,  txt: 'Plus personne n\'arrive à trouver {n} : la cote monte.', k: [1.15, 1.35] },
    { up: false, txt: 'Des fausses copies circulent partout : la cote de {n} baisse.', k: [.65, .85] },
    { up: false, txt: 'Un gros collectionneur revend tout son stock d\'un coup : la cote de {n} baisse.', k: [.7, .88] }
  ];
  const RUMOR_MIN = [6, 12];

  // ---------------------------------------------------------------- kiosque
  // Le journal sort une nouvelle édition toutes les 30 min. Chaque tuyau s'achète une fois par édition.
  // Tuyaux : ils donnent un petit avantage, jamais une certitude (sinon suivre les tuyaux et tout miser rend riche sans risque).
  // tipEdge = combien de points de % on ajoute au hasard pur pour « tomber juste » (journal : 3 issues 39 %, 2 issues 56 % ; potes : 36 % et 53 %).
  // Avec la marge du bookmaker, miser sur le journal rapporte en moyenne +4 à +10 %, sur un pote à peu près rien : on perd souvent (simulé le 02/10).
  const KIOSK = {
    editionMin: 30,
    tips: [
      { id: 'sport',  name: 'Info vestiaire',      icon: '⚽', base: 15, desc: 'Une info sur un match à venir. Fiable… la plupart du temps.' },
      { id: 'crypto', name: 'La rumeur crypto',    icon: '📈', base: 25, desc: 'Ce que va faire le marché dans les prochaines minutes : ça monte ou ça baisse ?', lvl: 1 },
      { id: 'market', name: 'Les potins du Comptoir', icon: '🛍️', base: 30, desc: 'Quel objet va bouger, et dans quel sens.', lvl: 2 }
    ],
    sportEdge: .06, friendEdge: .03,   // journal (payant) un peu plus sûr que les potes (gratuit)
    cryptoTrue: .7, marketTrue: .7,    // la rumeur crypto et les potins disent vrai 7 fois sur 10
    booster: { base: 150, perLvl: 30, lvl: 2 }   // prix = 150 + 30 × niveau : un booster rend ~65-75 % de son prix (équilibré le 02/10)
  };

  // ---------------------------------------------------------------- boosters (comme Mama Kana)
  // Un booster gratuit par jour, un à chaque niveau, un pour les 3 défis du jour ; on en achète aussi (lingots ou au Kiosque).
  // Contenu : 3 cartes récompense + 1 carte de collection (une vraie carte avec une cote, qui va dans ton classeur).
  const BOOSTER = {
    cost: 12,                                   // en lingots
    weights: { C: 58, R: 30, E: 10, L: 2 },     // cartes récompense, en %
    colWeights: { C: 70, R: 24, E: 5, L: 1 },   // carte de collection
    maxCard: 600                                // les cartes très chères (1re édition, gradée 10/10) ne s'achètent qu'au Comptoir
  };

  // ---------------------------------------------------------------- défis du jour (3 par jour)
  // g = objectif [niveau 1, niveau 15 et +]
  const CHALLENGES = [
    { k: 'bets',        t: 'Place {n} paris au Royal',          g: [2, 6] },
    { k: 'scratch',     t: 'Gratte {n} tickets',                g: [3, 8] },
    { k: 'cryptoBuy',   t: 'Achète de la crypto {n} fois',      g: [2, 6] },
    { k: 'rigCollect',  t: 'Récolte {n} minages',               g: [2, 5] },
    { k: 'betsWon',     t: 'Gagne {n} paris',                   g: [1, 3] },
    { k: 'tips',        t: 'Achète {n} tuyau au Kiosque',       g: [1, 2] },
    { k: 'boosters',    t: 'Ouvre {n} booster',                 g: [1, 1] },
    { k: 'spins',       t: 'Fais {n} tours de machine à sous',  g: [10, 40], lvl: 3 },
    { k: 'itemBuy',     t: 'Achète {n} objet au Comptoir',      g: [1, 3], lvl: 2 },
    { k: 'roulette',    t: 'Joue {n} fois à la roulette',       g: [3, 10], lvl: 5 },
    { k: 'cryptoProfit', t: 'Vends {n} fois une crypto en bénéfice', g: [1, 2] }
  ];
  const CHAL_CASH = lvl => 40 + lvl * 15;

  // ---------------------------------------------------------------- mini-événements (quelques minutes, de temps en temps)
  const EVENTS = { lvl: 2, first: 240, every: [600, 1200], time: 180,
    list: [
      { id: 'xp',    name: 'Happy hour',        short: 'XP ×2',       icon: 'star',   desc: 'Toute l\'XP gagnée compte double.' },
      { id: 'boost', name: 'Cotes boostées',    short: 'Cotes +5 %', icon: 'ticket', desc: 'Le Royal booste toutes ses cotes de 5 % sur les paris posés maintenant.' },
      { id: 'rig',   name: 'Heures creuses',    short: 'Minage ×2',   icon: 'bolt',   desc: 'L\'électricité ne coûte rien : les minages lancés maintenant vont deux fois plus vite et rapportent ×1,5.' },
      { id: 'sale',  name: 'Déstockage',        short: 'Comptoir −10 %', icon: 'trophy', desc: 'Le Comptoir vide sa réserve : tout est 10 % moins cher à l\'achat.' }
    ] };

  // ---------------------------------------------------------------- bons plans (les commandes spéciales de Mama, version quartier)
  // Un contact propose une affaire pendant 10 min : il te vend un objet sous la cote, ou il veut racheter un des tiens au-dessus.
  const DEALS = {
    cryptoTipTrue: .6,   // les tuyaux crypto des potes : justes 6 fois sur 10
    lvl: 2, first: 150, every: [420, 840], time: 600,
    contacts: [
      { name: 'Momo', img: 'guide', lines: { sell: ['J\'ai récupéré ça, je te le fais pas cher. Mais faut faire vite.', 'Un pote déménage, il brade tout.'], buy: ['J\'ai un acheteur pour ton objet, il paie bien. Tu vends ?', 'Un collectionneur cherche exactement ça. Je te fais le lien.'] } },
      { name: 'Inès', img: 'skin-doudoune-bust', lines: { sell: ['Je liquide ma collection, je te fais un prix.', 'Je pars en voyage, j\'ai besoin de cash.'], buy: ['Je cherche ça depuis des mois. Je te paie plus que la cote.', 'Mon copain en rêve, tu me le vends ?'] } },
      { name: 'Karim', img: 'skin-hoodie-bust', lines: { sell: ['Je l\'ai eu en double. Prix d\'ami.', 'Faut que je rembourse un pari… Je te le laisse.'], buy: ['Je complète ma série, il me manque que ça.', 'Je te le rachète cash, tout de suite.'] } },
      { name: 'Sofia', img: 'skin-sportive-bust', lines: { sell: ['Je fais de la place chez moi, profite.', 'Vente express, je pars ce soir.'], buy: ['C\'est pour un cadeau, je mets le prix.', 'Je revends à un client, je te prends le tien.'] } },
      { name: 'Le Flambeur', img: 'skin-flambeur-bust', lines: { sell: ['J\'ai tout perdu au casino hier. Je te le brade.', 'Petit souci de liquidités. Ça reste entre nous.'], buy: ['L\'argent, j\'en ai. Ça, je le veux.', 'Je paie 30 % au-dessus. Pas de négociation.'] } },
      { name: 'La Boss', img: 'skin-boss-bust', lines: { sell: ['Mon fonds se sépare de quelques pièces.', 'Je simplifie mon portefeuille.'], buy: ['Je diversifie. Ton objet m\'intéresse.', 'Offre ferme, valable dix minutes.'] } }
    ] };

  // ---------------------------------------------------------------- récompenses de niveau
  const LEVEL_REWARD = L => ({ cash: L * 40, lingots: 2 + Math.floor(L / 5), boosters: 1 });

  // ---------------------------------------------------------------- appart
  const ROOMS = [
    { name: 'Studio sous les toits', cost: 0,     slots: 4,  desc: '12 m², matelas au sol, vue sur la cour.' },
    { name: 'Chambre refaite',       cost: 5000,  slots: 8,  desc: 'Vrai lit, guirlandes, cadres aux murs.' },
    { name: 'Chambre de luxe',       cost: 25000, slots: 12, desc: 'Lit lumineux, néons, déco de collectionneur.' }
  ];

  // Disposition des objets d'action dans la chambre (en % de l'image de la chambre, x = centre, y = pied, w = largeur).
  // À l'échelle réelle : le matelas du fond fait ~80 % de la largeur, un bureau au premier plan en fait ~70 %.
  // Disposition dans la chambre (en % de l'image, x = centre, y = pied, w = largeur).
  // Bureau contre le mur du fond (derrière le lit, qui repasse devant grâce au calque room-N-fg),
  // minage posé par terre devant le lit à gauche, objets de collection posés sur les étagères dessinées.
  const SHELF_SLOTS = [
    [52, 29.6], [58, 29.6], [64, 29.6], [70, 29.6],
    [52, 34.4], [58, 34.4], [64, 34.4], [70, 34.4],
    [51, 39.2], [63, 39.2], [69, 39.2], [74.5, 39.2]
  ];
  // Les 6 chambres (3 niveaux × garçon / fille) ont EXACTEMENT le même angle et le même bureau : une seule disposition pour toutes.
  // x, y = bas de l'objet en % de l'image (posé sur le plateau du bureau à 66,5 %) ; slots = places sur les 3 étagères. Réglable au back-office.
  const shelfRow = ys => ys.flatMap(y => [13, 24, 35, 46].map(x => [x, y]));
  // PC : part de l'image SOUS la ligne des socles des écrans (le clavier dépasse devant) → on cale les socles sur le plateau
  const PC_DROP = [0, 0, 0];
  const ONE_ROOM = { pc: { x: 17.5, y: 66.5, w: 30 }, rig: { x: 40.5, y: 66.5, w: 14 }, light: { x: 83, y: 80, w: 15 }, shelf: { w: 9, h: 6.4 }, slots: shelfRow([39.8, 46.6, 53.4]) };
  const ROOM_LAYOUT = [0, 1, 2].map(() => JSON.parse(JSON.stringify(ONE_ROOM)));

  // ---------------------------------------------------------------- filet de sécurité (réaliste)
  // Payer en lingots : 1 lingot vaut 20 billets quand on complète un achat ; quelques raccourcis payables en lingots
  const LINGOT = { rate: 20, kiosk: 3, club: 2 };
  const BAILOUT = { under: 10, amount: 50, cooldownMin: 60,
    lines: ['Ta daronne t\'a fait un virement. « C\'est la dernière fois. »', 'Ton cousin te rend les 50<i class="cur"></i> qu\'il te devait depuis 2019.', 'Tu as revendu ta vieille console. Pas fier.'] };

  // ---------------------------------------------------------------- habitudes (bonus ET malus permanents)
  // On les prend quand on veut. Arrêter = sevrage de 48 h : les malus restent, les bonus disparaissent.
  const HABITS = [
    { id: 'smoke', name: 'Fumer', icon: '🚬', lvl: 2, perDay: 20, where: 'balto',
      bonus: 'Les pauses clope avec les gars du quartier : tu apprends les rumeurs du Comptoir 5 min avant tout le monde.',
      malus: 'Un paquet par jour : −20<i class="cur"></i> chaque jour, que tu joues ou non.' },
    { id: 'drink', name: 'Boire', icon: '🍺', lvl: 3, perDay: 30, betBoost: .3, where: 'balto',
      bonus: 'Plus de culot : mise max au Royal +30 %.',
      malus: 'Les tournées au bar : −30<i class="cur"></i> chaque jour, que tu joues ou non.' },
    { id: 'club', name: 'Sortir en boîte', icon: '🎉', lvl: 5, perDay: 25, xpBoost: .2, where: 'club', auto: { nights: 3, days: 7 },   // pas un choix : elle vient toute seule à force de sortir, et part après QUIT_H sans y mettre les pieds
      bonus: 'Réseau et rencontres : +20 % d\'XP sur tout.',
      malus: '−25<i class="cur"></i> par jour, et ta machine à crypto surchauffe 25 % plus vite (tu rentres tard).' }
  ];
  // Le Club : une soirée coûte l'entrée, rapporte de l'XP et parfois une rencontre (un contact qui propose un bon plan)
  // Le Club = une vraie pièce : on paie l'entrée au videur, puis la soirée dure nightMin minutes et on touche les coins de la salle
  // (chacun une fois par soirée). Ensuite le videur te reconnaît pendant cooldownMin (sauf avec des lingots).
  // spots : zones à toucher sur l'image de la salle (x, y = centre, w, h en %), réglables plus tard au back-office.
  const CLUB = { lvl: 5, entryBase: 40, entryPer: 12, entry: lvl => CLUB.entryBase + lvl * CLUB.entryPer, xp: lvl => 30 + lvl * 8, meet: .4, vip: .06, cooldownMin: 20, nightMin: 20,
    drinkBase: 15, drinkPer: 4, drink: lvl => CLUB.drinkBase + lvl * CLUB.drinkPer, djTip: 10, vipLingots: 2,
    spots: [
      { id: 'dance', name: 'La piste',        icon: '🕺', x: 62, y: 81, w: 58, h: 20, desc: 'Danser : la grosse dose d\'XP de la soirée.' },
      { id: 'dj',    name: 'Le DJ',           icon: '🎧', x: 38, y: 21, w: 40, h: 16, desc: 'Demander ton son : la piste rapporte ×1,5.' },
      { id: 'bar',   name: 'Le bar',          icon: '🍸', x: 22, y: 53, w: 40, h: 20, desc: 'Un cocktail : un peu d\'XP pour bien finir la soirée.' },
      { id: 'lounge', name: 'Les canapés',    icon: '🛋️', x: 80, y: 57, w: 38, h: 17, desc: 'Discuter : on y rencontre des gens qui ont des plans.' },
      { id: 'vip',   name: 'Le carré VIP',    icon: '🍾', x: 80, y: 23, w: 36, h: 20, desc: 'Pour les lingots : un contact assuré et des lingots possibles.' },
      { id: 'door',  name: 'Le videur',       icon: '🚪', x: 21, y: 85, w: 30, h: 20, desc: 'Sortir du Club.' }
    ] };
  const QUIT_H = 48;                 // durée du sevrage
  // Santé : chaque point sous 100 rend tout 0,5 % plus cher (pharmacie, fatigue, mauvaises décisions)
  const HEALTH_COST = .005;

  // ---------------------------------------------------------------- cadeau du jour (7 jours)
  // c = multiplicateur des billets de base (40 + 10 × niveau), l = lingots, b = boosters ; on repart au jour 1 si on saute un jour
  const DAILY = { base: lvl => 40 + lvl * 10, days: [
    { c: 1, l: 2 }, { c: 1.5, l: 2 }, { c: 2, l: 3, b: 1 }, { c: 2.5, l: 3 },
    { c: 3, l: 4, b: 1 }, { c: 3.5, l: 4 }, { c: 5, l: 8, b: 2, big: true }
  ] };

  // ---------------------------------------------------------------- missions
  // stat = compteur dans st.stats ; n = objectif
  // go = où mène le bouton « Y aller » ; lvl = niveau d'ouverture (les suivantes sont montrées grisées)
  const QUESTS = [
    { id: 'q1',  txt: 'Lance un minage sur ta machine',     stat: 'rigRestart', n: 1,  cash: 30,  xp: 20, go: 'rig' },
    { id: 'q2',  txt: 'Achète ta première crypto',          stat: 'cryptoBuy',  n: 1,  cash: 40,  xp: 25, go: 'pc' },
    { id: 'q3',  txt: 'Place un pari au Royal',             stat: 'bets',       n: 1,  cash: 40,  xp: 25, go: 'balto' },
    { id: 'q17', txt: 'Ouvre ton premier booster',          stat: 'boosters',   n: 1,  cash: 60,  xp: 50, go: 'boosters' },
    { id: 'q4',  txt: 'Gratte 3 tickets',                   stat: 'scratch',    n: 3,  cash: 30,  xp: 25, go: 'scratch' },
    { id: 'q5',  txt: 'Gagne un pari',                      stat: 'betsWon',    n: 1,  cash: 60,  xp: 40, trophy: 't-first', go: 'balto' },
    { id: 'q18', txt: 'Achète 3 tuyaux au Kiosque',         stat: 'tips',       n: 3,  cash: 80,  xp: 60, go: 'kiosque' },
    { id: 'q6',  txt: 'Fais 20 tours de machine à sous',    stat: 'spins',      n: 20, cash: 60,  xp: 40, lvl: 3, go: 'casino' },
    { id: 'q7',  txt: 'Achète un objet au Comptoir',        stat: 'itemBuy',    n: 1,  cash: 50,  xp: 40, lvl: 2, go: 'shop' },
    { id: 'q9',  txt: 'Vends une crypto avec du bénéfice',  stat: 'cryptoProfit', n: 1, cash: 100, xp: 60, go: 'pc' },
    { id: 'q8',  txt: 'Revends un objet avec du bénéfice',  stat: 'itemProfit', n: 1,  cash: 100, xp: 60, lvl: 2, go: 'shop' },
    { id: 'q12', txt: 'Garde une crypto 30 min sans vendre', stat: 'hodl30',    n: 1,  cash: 150, xp: 80, trophy: 't-hodl', go: 'pc' },
    { id: 'q10', txt: 'Joue 10 fois à la roulette',         stat: 'roulette',   n: 10, cash: 80,  xp: 60, lvl: 5, go: 'casino' },
    { id: 'q11', txt: 'Gagne un combiné',                   stat: 'combiWon',   n: 1,  cash: 200, xp: 120, trophy: 't-combi', lvl: 3, go: 'balto' },
    { id: 'q19', txt: 'Complète une série de cartes',       stat: 'series',     n: 1,  cash: 300, xp: 150, go: 'collection' },
    { id: 'q13', txt: 'Possède 6 objets de collection',     stat: 'itemsOwned', n: 6,  cash: 300, xp: 150, trophy: 't-collect', max: true, lvl: 3, go: 'shop' },
    { id: 'q14', txt: 'Touche un gain ×100 à la machine',   stat: 'bigWin',     n: 1,  cash: 0,   xp: 200, trophy: 't-jackpot', lvl: 3, go: 'casino' },
    { id: 'q20', txt: 'Saisis 3 bons plans',                stat: 'deals',      n: 3,  cash: 200, xp: 120, lvl: 2, go: 'deal' },
    { id: 'q15', txt: 'Atteins 5 000<i class="cur"></i> de patrimoine',  stat: 'worth', n: 5000,  cash: 0, lingots: 5,  xp: 200, max: true, go: 'wallet' },
    { id: 'q16', txt: 'Atteins 50 000<i class="cur"></i> de patrimoine', stat: 'worth', n: 50000, cash: 0, lingots: 15, xp: 600, max: true, lvl: 6, go: 'wallet' }
  ];

  // succès : badges débloqués une fois pour toutes (image ach-<id>) ; stat commençant par « ! » = valeur calculée par le jeu
  const ACHIEVEMENTS = [
    {"id":"first-bet","name":"Premier ticket","txt":"Place ton premier pari.","stat":"bets","n":1,"lingots":2,"art":"a betting slip with a gold star"},
    {"id":"bets50","name":"Habitué du Royal","txt":"Place 50 paris.","stat":"bets","n":50,"lingots":5,"art":"a stack of betting slips and a bar stool"},
    {"id":"bets500","name":"Parieur pro","txt":"Place 500 paris.","stat":"bets","n":500,"lingots":15,"art":"a golden betting slip with wings"},
    {"id":"win10","name":"La baraka","txt":"Gagne 10 paris.","stat":"betsWon","n":10,"lingots":5,"art":"a four-leaf clover on a football"},
    {"id":"win100","name":"Roi des pronos","txt":"Gagne 100 paris.","stat":"betsWon","n":100,"lingots":20,"art":"a crown resting on a football"},
    {"id":"combi3","name":"Combiné de génie","txt":"Gagne 3 combinés.","stat":"combiWon","n":3,"lingots":10,"art":"three linked betting slips forming a chain"},
    {"id":"spin100","name":"Bras de fer","txt":"Fais 100 tours de machine à sous.","stat":"spins","n":100,"lingots":3,"art":"a slot machine lever"},
    {"id":"spin1000","name":"Accro aux rouleaux","txt":"Fais 1 000 tours de machine à sous.","stat":"spins","n":1000,"lingots":10,"art":"three slot machine reels showing cherries"},
    {"id":"jackpot","name":"Jackpot !","txt":"Touche un gain ×100 à la machine.","stat":"bigWin","n":1,"lingots":15,"art":"a slot machine exploding with coins"},
    {"id":"roul50","name":"Rien ne va plus","txt":"Joue 50 fois à la roulette.","stat":"roulette","n":50,"lingots":5,"art":"a roulette wheel with a white ball"},
    {"id":"scr50","name":"Gratteur fou","txt":"Gratte 50 tickets.","stat":"scratch","n":50,"lingots":3,"art":"a scratch ticket and a coin"},
    {"id":"scr500","name":"Ongles en or","txt":"Gratte 500 tickets.","stat":"scratch","n":500,"lingots":15,"art":"a golden fingernail scratching a ticket"},
    {"id":"mine10","name":"Mineur du dimanche","txt":"Récolte 10 minages.","stat":"rigCollect","n":10,"lingots":3,"art":"a small pickaxe on a computer chip"},
    {"id":"mine200","name":"Usine à pièces","txt":"Récolte 200 minages.","stat":"rigCollect","n":200,"lingots":15,"art":"a mining machine overflowing with coins"},
    {"id":"rigmax","name":"Usine en or","txt":"Achète la meilleure machine.","stat":"!rig","n":4,"lingots":20,"art":"a golden mining machine"},
    {"id":"cr10","name":"Premier pas en crypto","txt":"Achète de la crypto 10 fois.","stat":"cryptoBuy","n":10,"lingots":3,"art":"a digital coin with a footprint"},
    {"id":"crp25","name":"Trader du quartier","txt":"Vends 25 fois de la crypto avec bénéfice.","stat":"cryptoProfit","n":25,"lingots":10,"art":"a rising green chart arrow with coins"},
    {"id":"hodl","name":"Mains de diamant","txt":"Garde une crypto 30 min sans vendre.","stat":"hodl30","n":1,"lingots":3,"art":"two diamond hands holding a coin"},
    {"id":"item10","name":"Chineur","txt":"Achète 10 objets.","stat":"itemBuy","n":10,"lingots":3,"art":"a magnifying glass over a price tag"},
    {"id":"resell25","name":"Roi de la revente","txt":"Revends 25 objets avec bénéfice.","stat":"itemProfit","n":25,"lingots":10,"art":"a sneaker with a green up arrow price tag"},
    {"id":"ser1","name":"Collectionneur","txt":"Complète une série de cartes.","stat":"series","n":1,"lingots":5,"art":"a card binder with a gold star"},
    {"id":"ser5","name":"Classeur complet","txt":"Complète 5 séries de cartes.","stat":"series","n":5,"lingots":20,"art":"a thick golden card binder"},
    {"id":"boo50","name":"Ouvreur de boosters","txt":"Ouvre 50 boosters.","stat":"boosters","n":50,"lingots":5,"art":"a torn open card booster pack with sparkles"},
    {"id":"club10","name":"Noctambule","txt":"Sors 10 soirs au Club.","stat":"clubNights","n":10,"lingots":5,"art":"a disco ball with a moon"},
    {"id":"deal10","name":"Bon plan","txt":"Saisis 10 bons plans.","stat":"deals","n":10,"lingots":5,"art":"a handshake with a price tag"},
    {"id":"tip20","name":"Lecteur assidu","txt":"Achète 20 tuyaux au Kiosque.","stat":"tips","n":20,"lingots":5,"art":"a rolled newspaper with a lightbulb"},
    {"id":"agr3","name":"Agent de stars","txt":"Recrute 3 créatrices.","stat":"agRecruit","n":3,"lingots":10,"art":"a golden star with a contract"},
    {"id":"aga100","name":"Machine à contenu","txt":"Lance 100 activités PrivéFans.","stat":"agActs","n":100,"lingots":10,"art":"a camera with hearts flying out"},
    {"id":"prop1","name":"Proprio","txt":"Achète ton premier bien.","stat":"props","n":1,"lingots":5,"art":"a house key on a keyring"},
    {"id":"prop4","name":"Magnat de l'immo","txt":"Possède les 4 biens de la Tour.","stat":"!props","n":4,"lingots":25,"art":"a skyscraper with a golden crown"},
    {"id":"stk10","name":"Golden boy","txt":"Vends 10 fois des actions avec bénéfice.","stat":"stockProfit","n":10,"lingots":10,"art":"a stock chart with a golden bull"},
    {"id":"car1","name":"Première caisse","txt":"Achète ton premier véhicule.","stat":"!park","n":1,"lingots":5,"art":"a car key with a red keyring"},
    {"id":"car7","name":"Collection de bolides","txt":"Remplis un parking de 7 places.","stat":"!park","n":7,"lingots":25,"art":"a row of shiny sports cars"},
    {"id":"w10k","name":"Ça décolle","txt":"Atteins 10 000 de patrimoine.","stat":"worth","n":10000,"lingots":5,"art":"a small rocket made of banknotes"},
    {"id":"w100k","name":"Riche","txt":"Atteins 100 000 de patrimoine.","stat":"worth","n":100000,"lingots":15,"art":"a big bag of money with a diamond"},
    {"id":"w1m","name":"Millionnaire du quartier","txt":"Atteins 1 000 000 de patrimoine.","stat":"worth","n":1000000,"lingots":40,"art":"a golden top hat full of banknotes"},
    {"id":"lvl10","name":"Gros bonnet","txt":"Atteins le niveau 10.","stat":"!lvl","n":10,"lingots":10,"art":"a golden badge shaped like a star"},
    {"id":"lvl20","name":"Légende de la cité","txt":"Atteins le niveau 20.","stat":"!lvl","n":20,"lingots":30,"art":"a legendary laurel crown"},
    {"id":"look2","name":"Nouveau visage","txt":"Change le look de ton quartier.","stat":"!looks","n":2,"lingots":5,"art":"a paint roller painting a building"},
    {"id":"skin3","name":"Garde-robe","txt":"Possède 3 looks pour ton perso.","stat":"!skins","n":3,"lingots":5,"art":"a clothes rack with three outfits"}
  ];
  const TIPS = [
    'Un tuyau du Kiosque, c\'est un avis, pas une prophétie. Même le journaliste parie mal.',
    'Momo dit qu\'il a déjà gagné un ×100 à la machine. Momo dit beaucoup de choses.',
    'L\'or bouge peu : c\'est l\'endroit où dormir tranquille.',
    'Encaisse tes loyers au moins tous les 3 jours, sinon ils s\'arrêtent de tomber.',
    'Une créatrice à plat de moral gagne deux fois moins. Un petit cadeau, et ça repart.',
    'Ta machine chauffe ? Refroidis-la avant 100 %, sinon adieu une partie de la récolte.',
    'Les pigeons du quartier n\'ont jamais compris pourquoi une crypto porte leur nom.',
    'Le videur du Club n\'a jamais souri. Une légende dit qu\'il l\'a fait en 2019.',
    'Revendre au Comptoir coûte 10 %. Achète bas, sinon c\'est le Comptoir qui s\'enrichit.',
    'Un combiné, c\'est une grosse cote… et une grosse chance que ça rate.',
    'La KebabCoin n\'a jamais servi à acheter un kebab. Jamais.',
    'Ton cadeau du jour grossit si tu reviens chaque jour. Ne casse pas la série !',
    'Un parking plein, c\'est beau. Un parking plein de voitures qui ont pris de la valeur, c\'est mieux.',
    'Au Lucky Palace, la seule stratégie gagnante, c\'est de s\'arrêter.',
    'Au casino, la maison gagne toujours à la fin. C\'est des maths.',
    'Une crypto qui a pris +300 % en une journée peut en perdre 90 % le lendemain.',
    'Les cotes du Royal reversent environ 93 % des mises. Le reste, c\'est pour le patron.',
    'Un objet se revend 10 % sous sa cote : achète quand c\'est bas, pas quand tout le monde en parle.',
    'Le rig mine même quand tu dors. Pense juste à le relancer.',
    'Une habitude se prend en une seconde. Pour l\'arrêter, compte 48 h de galère.'
  ];

  // ---------------------------------------------------------------- Boutique (bouton du bas)
  // Décos pour la ville, achetées pour toujours. Chacune a SA place sur la carte (réglée dans le back-office, jamais deux au même endroit).
  // looks du quartier : toute la ville (fond + bâtiments) change d'apparence. Images bg-city-<id> et bld-<bâtiment>-<id>.
  const CITY_LOOKS = [
    { id: 'base',  name: 'Quartier d\'origine', desc: 'Le bitume, le vrai.', cash: 0, lvl: 1 },
    { id: 'renov', name: 'Quartier rénové',    desc: 'Façades repeintes, fleurs, fresques : ton quartier monte en gamme.', cash: 20000, lvl: 6 },
    { id: 'neon',  name: 'Nuit néon',          desc: 'Spécial : la ville s\'allume en rose et cyan, comme dans un film.', lingots: 150, lvl: 8, special: true },
    { id: 'hiver', name: 'Hiver enneigé',      desc: 'Spécial : neige sur les toits, guirlandes et vitrines chaudes.', lingots: 150, lvl: 8, special: true }
  ];
  const CITY_SHOP = [
    { id: 'dc-bench',    kind: 'deco', name: 'Banc graffé',          emo: '🪑', desc: 'Le QG des discussions du quartier.', x: 36, y: 78, w: 7,  cash: 250,   lvl: 1 },
    { id: 'dc-lamp',     kind: 'deco', name: 'Lampadaire rétro',     emo: '🏮', desc: 'Pour éclairer tes nuits de hustle.', x: 14, y: 70, w: 5,  cash: 400,   lvl: 2 },
    { id: 'dc-palm',     kind: 'deco', name: 'Palmier en pot',       emo: '🌴', desc: 'Un air de vacances sur la place.',  x: 92, y: 48, w: 7,  cash: 700,   lvl: 3 },
    { id: 'dc-kebab',    kind: 'deco', name: 'Food truck kebab',     emo: '🥙', desc: 'Sauce blanche, toujours.',          x: 84, y: 84, w: 12, cash: 2500,  lvl: 4 },
    { id: 'dc-arcade',   kind: 'deco', name: 'Borne d\'arcade',      emo: '🕹️', desc: 'Le high score est à toi.',          x: 6,  y: 84, w: 6,  cash: 1200,  lvl: 3 },
    { id: 'dc-fountain', kind: 'deco', name: 'Fontaine',             emo: '⛲', desc: 'On y jette une pièce pour la chance.', x: 50, y: 88, w: 10, cash: 5000, lvl: 6 },
    { id: 'dc-car',      kind: 'deco', name: 'Voiture de sport',     emo: '🏎️', desc: 'Garée devant chez toi. Tout le monde regarde.', x: 30, y: 62, w: 14, lingots: 60, lvl: 8 },
    { id: 'dc-statue',   kind: 'deco', name: 'Ta statue en or',      emo: '🗿', desc: 'Toi, en or massif, au milieu de la place.', x: 66, y: 50, w: 8, lingots: 150, lvl: 10 }
  ];
  // Achats intégrés (vrai argent) : affichés, pas encore achetables (il faudra la version App Store / Google Play)
  const IAP = [
    { id: 'l-80',   kind: 'lingots', n: 80,   name: 'Poignée de lingots', price: '1,99 €' },
    { id: 'l-450',  kind: 'lingots', n: 450,  name: 'Sac de lingots',     price: '9,99 €', tag: '+12 %' },
    { id: 'l-1000', kind: 'lingots', n: 1000, name: 'Coffre de lingots',  price: '19,99 €', tag: '+25 %' },
    { id: 'l-2800', kind: 'lingots', n: 2800, name: 'Camion de lingots',  price: '49,99 €', tag: '+40 %' },
    { id: 'x-start', kind: 'pack', name: 'Pack de départ', desc: '200 lingots, 5 boosters, la machine niveau 2', price: '4,99 €', tag: 'Une seule fois' },
    { id: 'x-gold',  kind: 'pack', name: 'Skin exclusif « Gold »', desc: 'Survêt en or, chaîne XXL : introuvable ailleurs', price: '7,99 €', tag: 'Exclusif' }
  ];

  // Bouton « Promos » (à gauche, séparé du coach à droite) : une offre du moment en vrai argent, qui change chaque jour à minuit
  const PROMOS = [
    { id: 'x-start', off: 50, title: 'Pack de départ à −50 %', desc: '200 lingots, 5 boosters et la machine niveau 2' },
    { id: 'l-450',   off: 30, title: 'Sac de lingots +30 %',   desc: '585 lingots au lieu de 450' },
    { id: 'x-gold',  off: 40, title: 'Skin « Gold » à −40 %',  desc: 'Survêt en or, chaîne XXL : exclusif' },
    { id: 'l-1000',  off: 25, title: 'Coffre de lingots +25 %', desc: '1 250 lingots au lieu de 1 000' }
  ];
  // placements publiés depuis le back-office (js/layout.js) : ils remplacent les valeurs ci-dessus
  const LY = window.LAYOUT || {};
  Object.entries(LY.buildings || {}).forEach(([id, p]) => { const b = BUILDINGS.find(x => x.id === id); if (b) Object.assign(b, p); });
  Object.entries(LY.decos || {}).forEach(([id, p]) => { const d = SIX.shop.concat(CITY_SHOP).find(x => x.id === id); if (d) Object.assign(d, p); });
  (LY.rooms || []).forEach((r, i) => { if (r && ROOM_LAYOUT[i]) ROOM_LAYOUT[i] = r; });
  if (LY.slot) Object.assign(SLOT.ui, LY.slot);
  Object.entries(LY.club || {}).forEach(([id, p]) => { const z = CLUB.spots.find(x => x.id === id); if (z) Object.assign(z, p); });
  const TABLES = { CITY_SHOP, IAP, PROMOS, AGENCE, CLUB, RIG, PCS, ROOMS };
  Object.entries(LY.values || {}).forEach(([path, v]) => {
    try {
      const [t, ...rest] = path.split('.'); let [tn, id] = t.split('#'), o = TABLES[tn]; if (!o) return;
      if (id) o = (Array.isArray(o) ? o : o.gear || o.crew).find(x => x.id === id);
      for (let i = 0; i < rest.length - 1; i++) o = o[rest[i]];
      if (o) o[rest[rest.length - 1]] = v;
    } catch (e) {}
  });
  window.DATA = {
    START, SKINS, XP_TABLE, MAX_LVL, BUILDINGS, COINS, CRYPTO_FEE, PCS, TICK_S, HISTORY, MOODS, MOOD_MIN, RIG,
    PC_UPGRADES, PC_DROP, MINE, FINDS, PCX, AGENCE, BOOK_MARGIN, TEAMS, SPORTS, MATCH, BET_MAX, COMBI_LVL, SCRATCH, SLOT, ROULETTE,
    ACHIEVEMENTS, PARK_SLOTS, GARAGES, PROPS, PROP, STOCKS, BOURSE, CITY_LOOKS, CRYPTO_REVERT, ITEM_CATS, ITEMS, BUY_MARKUP, SELL_FEE, RUMORS, RUMOR_MIN, ROOMS, ROOM_LAYOUT, SHELF_SLOTS, KIOSK, BAILOUT, DAILY, QUESTS, TIPS, HABITS, QUIT_H, HEALTH_COST,
    CITY_SHOP, IAP, PROMOS, LINGOT, SIX, CLUB, EXT_PLACES, SERIES, BOOSTER, CHALLENGES, CHAL_CASH, EVENTS, DEALS, LEVEL_REWARD
  };
})();
