/* Hustle City : données du jeu (tout ce qui est réglable est ici) */
(function () {
  'use strict';

  // ---------------------------------------------------------------- joueur
  const START = { cash: 200, lingots: 5 };

  // Skins : le joueur, c'est lui. Visage sans traits, comme les persos de Mama Kana.
  const SKINS = [
    { id: 'survet',   name: 'Le Survêt',    g: 'm', lvl: 1,  desc: 'Survêt noir, banane, baskets blanches.' },
    { id: 'doudoune', name: 'La Doudoune',  g: 'f', lvl: 1,  desc: 'Doudoune courte, jogging, créoles.' },
    { id: 'hoodie',   name: 'Le Hoodie',    g: 'm', lvl: 1,  desc: 'Sweat oversize, casquette, sacoche.' },
    { id: 'sportive', name: 'La Sportive',  g: 'f', lvl: 1,  desc: 'Ensemble de sport, queue de cheval, air max.' },
    { id: 'flambeur', name: 'Le Flambeur',  g: 'm', lvl: 6,  desc: 'Chemise ouverte, chaîne en or, lunettes noires.' },
    { id: 'boss',     name: 'La Boss',      g: 'f', lvl: 10, desc: 'Tailleur, lunettes, sac de luxe.' }
  ];

  // XP pour passer au niveau suivant (index = niveau actuel)
  const XP_TABLE = [0, 60, 140, 260, 420, 640, 900, 1250, 1650, 2150, 2750, 3450, 4250, 5200, 6300, 7600, 9000, 10600, 12400, 14400, 16600];
  const MAX_LVL = XP_TABLE.length;

  // ---------------------------------------------------------------- la ville
  // Positions en % de la carte (x = centre, y = pied du bâtiment), w = largeur en % de la carte
  const BUILDINGS = [
    { id: 'casino',  name: 'Lucky Palace',        lvl: 2,  x: 59, y: 28, w: 30, tag: 'Machine à sous · roulette' },
    { id: 'appart',  name: 'Mon appart',          lvl: 1,  x: 23.5, y: 52, w: 27, tag: 'Crypto · minage · collection' },
    { id: 'shop',    name: 'Le Comptoir',         lvl: 2,  x: 44, y: 57.5, w: 23, tag: 'Cartes · sneakers · montres' },
    { id: 'balto',   name: 'Le Royal',            lvl: 1,  x: 77, y: 57.5, w: 28, tag: 'Paris sportifs · grattage' },
    { id: 'club',    name: 'Le Club',             lvl: 4,  x: 53, y: 46, w: 25, tag: 'Soirées · rencontres · sortir en boîte' },
    { id: 'kiosque', name: 'Le Kiosque',          lvl: 1,  x: 59, y: 66.5, w: 20, tag: 'Tuyaux du jour · boosters de cartes' },
    { id: 'six',     name: 'Tournoi des 6 Quartiers', lvl: 1,  x: 21, y: 64, w: 16, tag: 'Événements spéciaux' },
    { id: 'bus',     name: 'Arrêt de bus',        lvl: 1,  x: 69, y: 75, w: 22, spot: true, tag: 'Vers les autres quartiers' }
  ];
  // quartiers où mène le bus (pas encore ouverts : on les montre pour donner envie)
  const EXT_PLACES = [
    { id: 'bijou',  name: 'Bijouterie Diamant', lvl: 8,  tag: 'Montres de luxe et or' },
    { id: 'garage', name: 'Garage Prestige',    lvl: 10, tag: 'Voitures de collection' },
    { id: 'tour',   name: 'La Tour',            lvl: 12, tag: 'Bourse et immobilier' }
  ];

  // ---------------------------------------------------------------- crypto
  // Prix en billets du jeu. vol = volatilité par minute de jeu (écart-type), drift = tendance par minute.
  // Les cours bougent vraiment : marche aléatoire log-normale + humeur du marché.
  const COINS = [
    { id: 'btk', sym: 'AXN', name: 'Axion',       lvl: 1, p0: 58000, vol: .006, drift: .00008, color: '#f7931a', desc: 'La plus ancienne. Solide, mais chère.' },
    { id: 'eta', sym: 'VKT', name: 'Vektor',      lvl: 1, p0: 2400,  vol: .008, drift: .00006, color: '#7b8cff', desc: 'La deuxième du marché. Bouge un peu plus.' },
    { id: 'slr', sym: 'NVA', name: 'Nova',        lvl: 3, p0: 140,   vol: .012, drift: .00004, color: '#14c9a5', desc: 'Rapide et nerveuse.' },
    { id: 'dgk', sym: 'PGN', name: 'PigeonCoin',  lvl: 4, p0: .12,   vol: .02,  drift: 0,      color: '#8a9bb0', desc: 'Né d\'une blague sur les pigeons du quartier. Tout peut arriver.' },
    { id: 'ppc', sym: 'KBB', name: 'KebabCoin',   lvl: 6, p0: .0009, vol: .03,  drift: -.0001, color: '#e0662f', desc: 'Memecoin très spéculatif. Sauce blanche en option.', rug: .0006 },
    { id: 'lmn', sym: 'ZPH', name: 'Zéphyr',      lvl: 8, p0: 3.2,   vol: .025, drift: 0,      color: '#c77dff', desc: '« Stablecoin algorithmique ». Ça tient… jusqu\'au jour où.', rug: .0004 }
  ];
  const CRYPTO_FEE = .015;         // frais par achat/vente avec le vieux PC (comme une appli grand public)
  // Le PC : un meilleur PC donne accès à de meilleures plateformes, avec moins de frais à chaque achat et vente
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

  // Rig de minage : produit de l'Axion en continu, chauffe, il faut le relancer
  const RIG = [
    { name: 'Vieille tour bricolée', cost: 0,     btkH: .0004,  heatMin: 20, desc: 'Elle chauffe, elle souffle, elle crache quelques pièces.' },
    { name: 'Tour gamer',          cost: 900,   btkH: .0011,  heatMin: 30, desc: 'Une vraie machine, ça tourne plus vite.' },
    { name: 'Borne à pièces',      cost: 3500,  btkH: .003,   heatMin: 45, desc: 'Elle sort des pièces comme une borne d\'arcade.' },
    { name: 'Imprimante à crypto', cost: 12000, btkH: .0075,  heatMin: 60, desc: 'Le radiateur de tout l\'immeuble. Mais quel débit.' },
    { name: 'Usine en or',         cost: 40000, btkH: .02,    heatMin: 90, desc: 'Ça déborde de pièces. Bruit garanti.' }
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
    lvl: 2,
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
    lvl: 3,
    reds: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
    order: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
    chips: [1, 5, 10, 25, 100, 500]
  };

  // ---------------------------------------------------------------- objets de collection
  // p0 = prix de départ ; vol = volatilité par heure ; les prix bougent toutes les minutes.
  // Achat au prix affiché +5 %, revente au prix −10 % (commission du dépôt-vente).
  const ITEM_CATS = {
    card:    { name: 'Cartes',    lvl: 2, icon: '🃏' },
    sneaker: { name: 'Sneakers',  lvl: 3, icon: '👟' },
    watch:   { name: 'Montres',   lvl: 4, icon: '⌚' },
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
    // trophées : on ne les achète pas, on les gagne. Ils ont une cote comme le reste.
    { id: 't-first',    cat: 'trophy',  name: 'Trophée « Premier pari gagné »', r: 'C', p0: 40,  vol: .03 },
    { id: 't-combi',    cat: 'trophy',  name: 'Trophée « Combiné de fou »',     r: 'R', p0: 400, vol: .04 },
    { id: 't-jackpot',  cat: 'trophy',  name: 'Trophée « Jackpot »',            r: 'E', p0: 2500, vol: .05 },
    { id: 't-hodl',     cat: 'trophy',  name: 'Trophée « Mains de diamant »',   r: 'R', p0: 600, vol: .04 },
    { id: 't-collect',  cat: 'trophy',  name: 'Trophée « Collectionneur »',     r: 'E', p0: 3000, vol: .05 }
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
  // Le tuyau sport n'est fiable qu'à 80 % (comme les vrais « infos vestiaire »).
  const KIOSK = {
    editionMin: 30,
    tips: [
      { id: 'sport',  name: 'Info vestiaire',      icon: '⚽', base: 15, desc: 'Une info sur un match à venir. Fiable… la plupart du temps.' },
      { id: 'crypto', name: 'La rumeur crypto',    icon: '📈', base: 25, desc: 'Ce que va faire le marché dans les prochaines minutes : ça monte ou ça baisse ?', lvl: 1 },
      { id: 'market', name: 'Les potins du Comptoir', icon: '🛍️', base: 30, desc: 'Quel objet va bouger, et dans quel sens.', lvl: 2 }
    ],
    sportReliability: .8,
    booster: { base: 120, perLvl: 25, lvl: 2 }   // prix = 120 + 25 × niveau : un booster rend ~65 % de son prix en moyenne
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
    { k: 'rigCollect',  t: 'Récupère ton minage {n} fois',      g: [2, 5] },
    { k: 'betsWon',     t: 'Gagne {n} paris',                   g: [1, 3] },
    { k: 'tips',        t: 'Achète {n} tuyau au Kiosque',       g: [1, 2] },
    { k: 'boosters',    t: 'Ouvre {n} booster',                 g: [1, 1] },
    { k: 'spins',       t: 'Fais {n} tours de machine à sous',  g: [10, 40], lvl: 2 },
    { k: 'itemBuy',     t: 'Achète {n} objet au Comptoir',      g: [1, 3], lvl: 2 },
    { k: 'roulette',    t: 'Joue {n} fois à la roulette',       g: [3, 10], lvl: 3 },
    { k: 'cryptoProfit', t: 'Vends {n} fois une crypto en bénéfice', g: [1, 2] }
  ];
  const CHAL_CASH = lvl => 40 + lvl * 15;

  // ---------------------------------------------------------------- mini-événements (quelques minutes, de temps en temps)
  const EVENTS = { lvl: 2, first: 240, every: [600, 1200], time: 180,
    list: [
      { id: 'xp',    name: 'Happy hour',        short: 'XP ×2',       icon: 'star',   desc: 'Toute l\'XP gagnée compte double.' },
      { id: 'boost', name: 'Cotes boostées',    short: 'Cotes +15 %', icon: 'ticket', desc: 'Le Royal booste toutes ses cotes de 15 % sur les paris posés maintenant.' },
      { id: 'rig',   name: 'Heures creuses',    short: 'Minage ×2',   icon: 'bolt',   desc: 'L\'électricité ne coûte rien : ta machine mine deux fois plus vite.' },
      { id: 'sale',  name: 'Déstockage',        short: 'Comptoir −15 %', icon: 'trophy', desc: 'Le Comptoir vide sa réserve : tout est 15 % moins cher à l\'achat.' }
    ] };

  // ---------------------------------------------------------------- bons plans (les commandes spéciales de Mama, version quartier)
  // Un contact propose une affaire pendant 10 min : il te vend un objet sous la cote, ou il veut racheter un des tiens au-dessus.
  const DEALS = { lvl: 2, first: 150, every: [420, 840], time: 600,
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
    { name: 'Chambre de luxe',       cost: 60000, slots: 12, desc: 'Lit lumineux, néons, déco de collectionneur.' }
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
  const ROOM_LAYOUT = [   // positions réglées par la propriétaire (#placer-appart)
    { pc: { x: 63, y: 62, w: 32 },   rig: { x: 17, y: 79.5, w: 24 }, shelf: { w: 6, h: 4.6 } },
    { pc: { x: 61, y: 63, w: 38 },   rig: { x: 15.5, y: 82, w: 27 }, shelf: { w: 6, h: 4.6 } },
    { pc: { x: 59, y: 63.5, w: 40 }, rig: { x: 15, y: 82, w: 29 },   shelf: { w: 6, h: 4.6 } }
  ];

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
    { id: 'club', name: 'Sortir en boîte', icon: '🎉', lvl: 4, perDay: 25, xpBoost: .2, where: 'club',
      bonus: 'Réseau et rencontres : +20 % d\'XP sur tout.',
      malus: '−25<i class="cur"></i> par jour, et ta machine à crypto surchauffe 25 % plus vite (tu rentres tard).' }
  ];
  // Le Club : une soirée coûte l'entrée, rapporte de l'XP et parfois une rencontre (un contact qui propose un bon plan)
  const CLUB = { lvl: 4, entry: lvl => 40 + lvl * 12, xp: lvl => 30 + lvl * 8, meet: .4, vip: .06, cooldownMin: 20 };
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
    { id: 'q1',  txt: 'Relance ta machine à crypto',        stat: 'rigRestart', n: 1,  cash: 30,  xp: 20, go: 'rig' },
    { id: 'q2',  txt: 'Achète ta première crypto',          stat: 'cryptoBuy',  n: 1,  cash: 40,  xp: 25, go: 'pc' },
    { id: 'q3',  txt: 'Place un pari au Royal',             stat: 'bets',       n: 1,  cash: 40,  xp: 25, go: 'balto' },
    { id: 'q17', txt: 'Ouvre ton premier booster',          stat: 'boosters',   n: 1,  cash: 60,  xp: 50, go: 'boosters' },
    { id: 'q4',  txt: 'Gratte 3 tickets',                   stat: 'scratch',    n: 3,  cash: 30,  xp: 25, go: 'scratch' },
    { id: 'q5',  txt: 'Gagne un pari',                      stat: 'betsWon',    n: 1,  cash: 60,  xp: 40, trophy: 't-first', go: 'balto' },
    { id: 'q18', txt: 'Achète 3 tuyaux au Kiosque',         stat: 'tips',       n: 3,  cash: 80,  xp: 60, go: 'kiosque' },
    { id: 'q6',  txt: 'Fais 20 tours de machine à sous',    stat: 'spins',      n: 20, cash: 60,  xp: 40, lvl: 2, go: 'casino' },
    { id: 'q7',  txt: 'Achète un objet au Comptoir',        stat: 'itemBuy',    n: 1,  cash: 50,  xp: 40, lvl: 2, go: 'shop' },
    { id: 'q9',  txt: 'Vends une crypto avec du bénéfice',  stat: 'cryptoProfit', n: 1, cash: 100, xp: 60, go: 'pc' },
    { id: 'q8',  txt: 'Revends un objet avec du bénéfice',  stat: 'itemProfit', n: 1,  cash: 100, xp: 60, lvl: 2, go: 'shop' },
    { id: 'q12', txt: 'Garde une crypto 30 min sans vendre', stat: 'hodl30',    n: 1,  cash: 150, xp: 80, trophy: 't-hodl', go: 'pc' },
    { id: 'q10', txt: 'Joue 10 fois à la roulette',         stat: 'roulette',   n: 10, cash: 80,  xp: 60, lvl: 3, go: 'casino' },
    { id: 'q11', txt: 'Gagne un combiné',                   stat: 'combiWon',   n: 1,  cash: 200, xp: 120, trophy: 't-combi', lvl: 3, go: 'balto' },
    { id: 'q19', txt: 'Complète une série de cartes',       stat: 'series',     n: 1,  cash: 300, xp: 150, go: 'collection' },
    { id: 'q13', txt: 'Possède 6 objets de collection',     stat: 'itemsOwned', n: 6,  cash: 300, xp: 150, trophy: 't-collect', max: true, lvl: 3, go: 'shop' },
    { id: 'q14', txt: 'Touche un gain ×100 à la machine',   stat: 'bigWin',     n: 1,  cash: 0,   xp: 200, trophy: 't-jackpot', lvl: 2, go: 'casino' },
    { id: 'q20', txt: 'Saisis 3 bons plans',                stat: 'deals',      n: 3,  cash: 200, xp: 120, lvl: 2, go: 'deal' },
    { id: 'q15', txt: 'Atteins 5 000<i class="cur"></i> de patrimoine',  stat: 'worth', n: 5000,  cash: 0, lingots: 5,  xp: 200, max: true, go: 'wallet' },
    { id: 'q16', txt: 'Atteins 50 000<i class="cur"></i> de patrimoine', stat: 'worth', n: 50000, cash: 0, lingots: 15, xp: 600, max: true, lvl: 6, go: 'wallet' }
  ];

  const TIPS = [
    'Au casino, la maison gagne toujours à la fin. C\'est des maths.',
    'Une crypto qui a pris +300 % en une journée peut en perdre 90 % le lendemain.',
    'Les cotes du Royal reversent environ 93 % des mises. Le reste, c\'est pour le patron.',
    'Un objet se revend 10 % sous sa cote : achète quand c\'est bas, pas quand tout le monde en parle.',
    'Le rig mine même quand tu dors. Pense juste à le relancer.',
    'Une habitude se prend en une seconde. Pour l\'arrêter, compte 48 h de galère.'
  ];

  // placements publiés depuis le back-office (js/layout.js) : ils remplacent les valeurs ci-dessus
  const LY = window.LAYOUT || {};
  Object.entries(LY.buildings || {}).forEach(([id, p]) => { const b = BUILDINGS.find(x => x.id === id); if (b) Object.assign(b, p); });
  Object.entries(LY.decos || {}).forEach(([id, p]) => { const d = SIX.shop.find(x => x.id === id); if (d) Object.assign(d, p); });
  (LY.rooms || []).forEach((r, i) => { if (r && ROOM_LAYOUT[i]) ROOM_LAYOUT[i] = r; });
  window.DATA = {
    START, SKINS, XP_TABLE, MAX_LVL, BUILDINGS, COINS, CRYPTO_FEE, PCS, TICK_S, HISTORY, MOODS, MOOD_MIN, RIG,
    BOOK_MARGIN, TEAMS, SPORTS, MATCH, BET_MAX, COMBI_LVL, SCRATCH, SLOT, ROULETTE,
    ITEM_CATS, ITEMS, BUY_MARKUP, SELL_FEE, RUMORS, RUMOR_MIN, ROOMS, ROOM_LAYOUT, SHELF_SLOTS, KIOSK, BAILOUT, DAILY, QUESTS, TIPS, HABITS, QUIT_H, HEALTH_COST,
    LINGOT, SIX, CLUB, EXT_PLACES, SERIES, BOOSTER, CHALLENGES, CHAL_CASH, EVENTS, DEALS, LEVEL_REWARD
  };
})();
