# Hustle City en ligne : serveur + back office

## Lancer sur ton Mac
    node server/server.js
- Le jeu : http://localhost:5300/game.html (il se connecte tout seul au serveur)
- Le back office : http://localhost:5300/admin/ — le jeton d'accès s'affiche au démarrage (gardé dans `server/.admin-token`, jamais publié sur GitHub)

## Ce que fait le back office
- **Tableau de bord** : joueurs, actifs du jour / de la semaine, rétention J1-J7-J30, niveau moyen, temps de jeu, pubs vues, clics sur les offres, boutons les plus touchés.
- **Joueurs** : recherche par pseudo ou #tag, fiche complète (niveau, patrimoine, lingots, appareil, activité), notes internes, cadeau ou message, suspension, téléchargement / restauration de la sauvegarde, code de récupération.
- **SAV** : les messages envoyés depuis le jeu (Paramètres → Contacter le support) ; la réponse (avec un geste en lingots si besoin) arrive dans le téléphone du joueur.
- **Événements et nouveautés** : annonces, date du prochain événement, début du Tournoi des 6 Quartiers, saisons commerciales (Halloween, Black Friday, Noël…), offres du jour et jours de promo, réglages des pubs, maintenance, et n'importe quelle valeur du jeu (data.js) — sans republier le jeu.
- **Message à tous** : un message (et un cadeau) à tous les joueurs.
- **Journal** : ce que font les joueurs, et ce que tu as fait dans le back office.

## Publier
Le serveur est un seul fichier Node (≥ 22, base SQLite intégrée, aucun service payant). Il se déploie tel quel sur un petit serveur (VPS, Render, Fly…) :
1. copier le dossier du jeu, lancer `PORT=80 ADMIN_TOKEN=un-long-secret node server/server.js` (ou derrière un proxy HTTPS) ;
2. si le jeu est servi ailleurs (App Store, GitHub Pages), lui indiquer l'adresse du serveur : `window.HC_API = 'https://ton-serveur'` dans game.html.
La base `server/hustle.db` contient tout : la sauvegarder régulièrement.
