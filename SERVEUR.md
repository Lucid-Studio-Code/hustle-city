# Le serveur en ligne (OVH)

- **Adresse du jeu :** https://game.biffcity.fr/game.html (l'ancienne adresse hustle.lucidstudio.fr y renvoie avec la partie)
- **Back office :** https://game.biffcity.fr/admin/ (le jeton est dans `server/.admin-token-en-ligne` sur ton Mac, à garder dans ton gestionnaire de mots de passe, jamais sur GitHub)
- **Serveur :** VPS OVH `vps-baacc328.vps.ovh.net` (57.129.175.70), Debian 13, utilisateur `debian`. Connexion uniquement avec la clé de ton Mac (le mot de passe ne sert plus à se connecter).

## Ce qui tourne
- Le serveur du jeu (`hustle-city`), relancé tout seul s'il plante ou si le VPS redémarre.
- Caddy : le https (certificat renouvelé tout seul) et les adresses game.biffcity.fr (jeu), biffcity.fr (vitrine), www.biffcity.fr (renvoi) et hustle.lucidstudio.fr (ancienne).
- Pare-feu (seulement le web et la connexion sécurisée), blocage des tentatives d'intrusion, mises à jour de sécurité automatiques.

## Où sont les données
- Joueurs : `/srv/hustle/data/hustle.db`
- Images ajoutées depuis le back office : `/srv/hustle/data/uploads/`
- Sauvegardes : chaque nuit à 4 h 30 dans `/srv/hustle/data/backups/` (gardées 30 jours), en plus de la sauvegarde quotidienne d'OVH.

## Mettre à jour le serveur après une modification du jeu
```
ssh debian@57.129.175.70 sudo hustle-deploy
```
(récupère la dernière version sur GitHub et redémarre)

## Ajouter une autre appli plus tard
Une entrée DNS (type A) `nom-de-l-appli` → 57.129.175.70 dans la zone de lucidstudio.fr, puis un bloc dans `/etc/caddy/Caddyfile`.
