# Biff City en ligne : serveur + back office

## Lancer sur ton Mac
    node server/server.js
- Le jeu : http://localhost:5300/game.html (il se connecte tout seul au serveur)
- Le back office : http://localhost:5300/admin/ : le jeton d'accès est dans `server/.admin-token` (créé au premier lancement, jamais publié sur GitHub)
- Node 22 ou plus récent, aucune installation (`npm install` inutile). Variables possibles : `PORT`, `HOST` (127.0.0.1 par défaut : seul ce Mac, ou Caddy sur le serveur, peut s'y connecter ; `HOST=0.0.0.0` pour tester depuis un téléphone du même wifi), `ADMIN_TOKEN`, `DB` (fichier de base), `TZ` (Europe/Paris par défaut, pour les jours et heures des stats), `AD_EUR` (revenu estimé d'une pub vue, 0,012 € par défaut).

## Voir la démo (400 joueurs fictifs)
    node tools/demo-backoffice.js
    DB=server/demo.db PORT=5301 node server/server.js
Puis http://localhost:5301/admin/ avec le même jeton. La démo est dans une base à part (`server/demo.db`) : ta vraie base `server/hustle.db` n'est jamais touchée. Relancer le script remet la démo à zéro (pense à relancer le serveur ensuite). Une quinzaine de joueurs y restent « en ligne » pendant 4 h.

Astuce : on peut ouvrir directement un onglet avec `…/admin/#page=stats` (ou `map`, `players`, `support`, `live`, `broadcast`, `logs`, `player&pid=…`). Le jeton peut aussi passer dans l'adresse (`#token=…`) : il est retenu puis effacé de l'adresse.

## Ce que fait le back office
Captures de chaque onglet : `server/captures/`.
- **Tableau de bord** : joueurs en ligne, actifs du jour / de la semaine / du mois, nouveaux, rétention, durée des parties, revenu estimé ; qui joue en ce moment (avec leur photo), ce qui vient de se passer, mini-carte, les plus riches, l'entonnoir des niveaux, le SAV.
- **Carte des joueurs** : d'où ils jouent (par ville), ceux en ligne pulsent en vert, avec leur photo ; liste des pays.
- **Statistiques** : audience, rétention en cohortes, sessions et horaires (carte jour × heure), progression et décrochage, économie, argent (offres, payeurs, pubs, revenu par joueur), boutons les plus utilisés, looks, appareils, pays, langues, SAV. Période 7 / 30 / 90 jours.
- **Joueurs** : recherche, filtres (en ligne, nouveaux, payeurs, partis, suspendus, pays, niveau), tris ; **fiche joueur** : photo du jeu avec cadre et pin's, niveau, portefeuille, tout ce qu'il possède, succès, activité, histoire, SAV, cadeaux reçus ; actions : offrir, écrire, suspendre, restaurer une ancienne copie de sa partie, notes internes, code de récupération.
- **SAV** : une messagerie (conversations, fil, réponses toutes prêtes, statut à traiter / en attente / fermé, geste en un clic).
- **Événements et nouveautés** : annonces, maintenance, prochain événement, Tournoi des 6 Quartiers, saisons commerciales, offres du jour, pubs, réglages avancés ; chaque champ est expliqué et un aperçu montre ce que verra le joueur. Rien ne part avant « Publier ».
- **Message à tous** : message + cadeau, à tout le monde ou à une partie des joueurs, avec aperçu et historique.
- **Journal** : ce que font les joueurs et ce que tu as fait dans le back office.

## D'où viennent les joueurs
À la connexion, le jeu envoie son fuseau horaire, sa langue et la taille d'écran. Le serveur localise l'adresse IP avec ip-api.com (gratuit, sans clé, résultat gardé en base) sans jamais faire attendre le joueur. Si l'adresse est locale/privée, la ville est devinée grâce au fuseau horaire (approximatif). Le fond de carte (Esri, gratuit, sans clé) et les graphiques (Chart.js) se chargent depuis internet.

## Publier
Le serveur est un petit programme Node (≥ 22, base SQLite intégrée, aucun service payant). Il se déploie tel quel sur un petit serveur (VPS, Render, Fly…) :
1. copier le dossier du jeu, lancer `ADMIN_TOKEN=un-long-secret node server/server.js` derrière un proxy HTTPS sur la même machine (Caddy : `reverse_proxy 127.0.0.1:5300` ; l'adresse du joueur est lue dans `X-Forwarded-For`) ; sans proxy : `HOST=0.0.0.0` ;
2. si le jeu est servi ailleurs (App Store, GitHub Pages), lui indiquer l'adresse du serveur : `window.HC_API = 'https://ton-serveur'` dans game.html.
La base `server/hustle.db` contient tout : la sauvegarder régulièrement.
