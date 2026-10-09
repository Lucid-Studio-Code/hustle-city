# Fiches de confidentialité des stores

Ce qu'il faut cocher au moment de publier l'appli. C'est la même chose que ce que dit le jeu dans Réglages → Conditions et confidentialité. **Si le jeu se met à collecter autre chose (pub, achats, connexion Apple/Google), il faut mettre à jour ces fiches ET ce texte.**

## Ce que le jeu collecte vraiment

| Donnée | Pourquoi | Liée au joueur ? | Pistage publicitaire ? |
|---|---|---|---|
| Identifiant de partie (créé au hasard) | Sauvegarde en ligne, classements | Oui (pas de nom réel) | Non |
| Pseudo, perso, sauvegarde | Fonctionnement du jeu, classements | Oui | Non |
| Actions dans le jeu (boutons, niveaux, paris fictifs) | Statistiques pour améliorer le jeu | Oui | Non |
| Modèle de téléphone, langue, fuseau horaire | Statistiques, correction de bugs | Oui | Non |
| Ville approximative (déduite de l'adresse IP, l'IP n'est pas gardée) | Statistiques | Oui | Non |
| Adresse de notification (si acceptée) | Envoyer les rappels | Oui | Non |

Pas d'e-mail, pas de nom réel, pas de contacts, pas de photos, pas de position GPS, pas de pub ciblée, rien de vendu ni partagé.

## Apple : « Confidentialité de l'app » (App Store Connect)

- **Collectez-vous des données ?** Oui.
- Cocher :
  - **Identifiants → ID utilisateur** : Fonctionnalités de l'app, Analyses. Lié à l'identité : Oui. Suivi : Non.
  - **Utilisation → Interactions avec le produit** : Analyses. Lié : Oui. Suivi : Non.
  - **Diagnostic → Autres données de diagnostic** (modèle de téléphone) : Analyses. Lié : Oui. Suivi : Non.
  - **Localisation → Localisation approximative** : Analyses. Lié : Oui. Suivi : Non.
  - **Autres données → Autres types de données** (sauvegarde, pseudo) : Fonctionnalités de l'app. Lié : Oui. Suivi : Non.
- **Suivi (tracking) :** Non, donc pas de demande ATT tant qu'il n'y a pas de pub.
- **Lien vers la politique de confidentialité :** https://game.biffcity.fr/confidentialite.html (à créer avec le même texte que dans le jeu).
- **Suppression du compte :** dans l'appli, Réglages → Supprimer mes données (obligatoire, c'est fait).
- **Classification d'âge :** cocher « Jeux d'argent simulés : fréquent/intense » → l'appli sera **17+**.

## Google Play : « Sécurité des données » (Play Console)

- **Collecte ou partage :** collecte oui, partage non.
- **Chiffrées en transit :** Oui (https).
- **Les utilisateurs peuvent demander la suppression :** Oui (bouton dans l'appli + lien web).
- Types :
  - **Identifiants de l'appareil ou autres ID** : Fonctionnalités de l'appli, Analyses.
  - **Activité dans l'appli → Interactions avec l'appli** : Analyses.
  - **Infos et performances de l'appli → Diagnostics** : Analyses.
  - **Position → Position approximative** : Analyses.
- Toutes « collectées, non partagées, traitement non éphémère, collecte obligatoire ».
- **Questionnaire de classification (IARC) :** répondre Oui à « jeux d'argent simulés ». Public cible : 18 ans et plus.
- **Section « Applications de jeux d'argent » :** préciser que ce n'est PAS de l'argent réel.

## Quand il y aura des achats ou de la pub

- Achats intégrés : ajouter **Achats → Historique d'achats** (Apple) / **Infos financières → Historique d'achats** (Google).
- Pub (AdMob) : ajouter **ID publicitaire**, passer « Suivi » à Oui, ajouter la demande ATT sur iPhone et la fenêtre de consentement en Europe.
