# Lots d'images du 03/10 (préparés en cloud) — notes pour la session locale

## lot-equipes.js
- Foot (crest-f13 à f24, dans l'ordre) : FC Laverie, AS Scooter, Olympique Merguez, Racing Ascenseur, Stade Croissant, Union Graffiti, FC Pitbull, Sporting Snack, AC Parking, Dynamo Karaoké, Inter Taxi, Real Barbecue.
- Basket (crest-b7 à b12) : Rooftop Flyers, Night Hoopers, Les Crossovers, Metro Jumpers, Concrete Lions, Block Party.
- Tennis (player-t7 à t12) : N. Laurent, A. Traoré, J. Costa, E. Nguyen, R. Haddad, C. Dubois.
- Planches : sheet-crests-f2 (f13-f18), sheet-crests-f3 (f19-f24), sheet-crests-b2 (b7-b12) → split.py.
- À ajouter dans TEAMS (data.js) à la suite des équipes existantes : les ids de cartes suivent (k-f13…, k-b7…, k-t7…). Forces et couleurs à choisir.

## lot-cartes.js
- art-<id de carte> : illustration (4:3) qui remplace l'écusson au centre des cartes communes et « xe ».
- art-coach-foot, art-coach-basket, art-coach-tennis, art-ref-foot, art-fan-ultra, art-mascot : nouvelles cartes (entraîneurs, arbitre, supporter, mascotte).
- full-… : cartes full art holographiques (2:3).
- badge-xe : logo « xe » posé sur les cartes holo (seul texte autorisé).
- graded-slab : boîtier de carte gradée 10/10 ; la fenêtre et l'étiquette sont blanches → à déclarer en poches (process.py --poches) puis la carte et la note s'affichent par-dessus en code.

## lot-dragons.js (2e booster)
- Communes : ember, puddle, moss, pebble, spark, frost, neon, smog. Rares : ruby, tide, volt, graffiti. Épiques : obsidian, aurora. Légendaires : gold, cosmic.
- art-drg-<nom> (4:3) pour toutes, full-drg-<nom> (2:3) pour épiques et légendaires. booster-pack-dragon, card-back-dragon.

## lot-six-cartes.js
- art-k-r1 à r6 (joueurs, communes), art-six-cap-1/2/3 (capitaines, rares), full-six-leg-kick / full-six-leg-trophy (légendaires). Toutes avec card-bg-rugby en image modèle (décor commun).

## lot-icones.js
- Remplace les emojis : act-* (activités PrivéFans), cat-* (onglets Comptoir), tip-* (Kiosque), hab-* (habitudes), ic-club-* (coins du Club, renommés pour ne pas écraser club-door), ev-* (mini-événements), frame-six / frame-gold (cadres d'avatar, centre blanc = poche), bld-bijou / bld-garage / bld-tour (lieux du bus).

## lot-pc.js
- pcv-0 (vieux PC bureautique), pcv-1 (tour sous le bureau + écran), pcv-2 (version or gamer). Image modèle = PC 1. Remesurer PC_DROP. Lever la pause PC_UPGRADES si elle valide.

## À refaire après le lot icônes
- act-live : le téléphone avait l'écran ET les objectifs sur la même face (+ texte REC). Nouveau prompt : vu de dos, seulement les objectifs et un point rouge → tools/lot-redo-2.js (y ajouter les autres ratés du lot icônes avant de le lancer).

## Mini lot à refaire n°3 (tools/lot-redo-3.js)
- gear-spa : la 1re version faisait « soirée romantique » (bougies, lingerie, champagne). Nouveau prompt : peignoir blanc, serviettes, galets, eucalyptus, tons vert menthe.

## Mini lot à refaire n°4 (tools/lot-redo-4.js)
- act-collab : la 1re version montrait deux poings d'hommes. Nouveau : deux jeunes femmes sexy en selfie joue contre joue.
- + ic-truck (arrivage du Comptoir), ic-shelf (place chez toi), ic-rumor (rumeurs du tournoi) : branchés dans le code, emoji en attendant.
- + tip-sport / tip-crypto / tip-market refaits en série assortie (médaillon or et violet, même niveau de détail : 2 éléments chacun) : paris sportifs, crypto, achat-revente (basket + étiquette seulement).
- + bonus-cash / lingots / xp / ticket / freebet / airdrop : illustrations pleine carte (4:3) des cartes Bonus des boosters, branchées (icône en attendant). Pas de détourage (NOCUT).
- + ticket-flash : ticket à gratter (remplace le ticket de cinéma « ADMIT ONE »), déjà branché partout.
- + ev-boost : fusée simple (l'ancienne portait un ticket, trop chargée).
- + coin-slr (Nova) : refaite bien de face, sans épaisseur visible, comme les autres pièces.
- + bed-laptop-f / bed-laptop-m refaits : ordi de face (écran face à nous), sans accessoires, écran = pêche + banane qui font un clin d'œil. + ic-promo : cadeau avec étiquette promo (remplace le 💎 du bouton Promo).
- Le mini lot 4 est découpé en deux : lot-redo-4a.js (icônes) et lot-redo-4b.js (cartes bonus, ordis, promo). Règle : 10 images max par lot.
