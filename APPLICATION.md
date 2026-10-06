# Hustle City en application (iPhone et Android)

Le jeu est déjà emballé en application avec **Capacitor** (gratuit). Les deux projets sont prêts :
- `ios/` : le projet iPhone (s'ouvre dans Xcode)
- `android/` : le projet Android (s'ouvre dans Android Studio)

Le jeu dans l'application est exactement le même que sur le web : à chaque mise à jour du jeu, une commande suffit pour la recopier dans l'application.

## Ce qui est déjà fait
- Icône de l'application et écran de démarrage (le logo sur fond violet), dans `resources/`. Pour les changer : remplacer `resources/icon.png` (1024×1024) puis `npx @capacitor/assets generate --assetPath resources`.
- Identifiant de l'application : `com.lucidstudio.hustlecity` (dans `capacitor.config.json`).
- **Rappels automatiques** programmés sur le téléphone (pas besoin d'internet) : récolte prête, cadeau du jour (à 10 h), prono à faire 1 h avant un match du tournoi, et « le quartier bouge sans toi » après 3 jours d'absence. Le joueur peut tout couper dans Réglages → Rappels hors du jeu.
- **Notifications envoyées depuis le back office** : dans « Message à tous », la case « Aussi en notification sur leur téléphone ».
- On ne demande l'autorisation des notifications qu'après le tutoriel (sinon les joueurs refusent).

## Ce qu'il te reste à faire, dans l'ordre

### 1. Installer les outils (une seule fois, gratuit)
- **Xcode** : depuis l'App Store du Mac (gros téléchargement).
- **Android Studio** : https://developer.android.com/studio

### 2. Les comptes développeur
- **Apple** : https://developer.apple.com/programs : 99 $ par an. Compte au nom de ta société de préférence.
- **Google Play** : https://play.google.com/console : 25 $ une seule fois.

### 3. Mettre le serveur en ligne
Pour que le back office, la sauvegarde en ligne et les notifications marchent, `server/server.js` doit tourner sur un petit serveur internet (5 à 10 € par mois, ex. Render, Railway, un VPS OVH). Je peux t'aider à le faire le moment venu.
Ensuite, mettre son adresse dans `app.config.json` → `"apiUrl": "https://ton-adresse"`.

### 4. Les clés de notification (gratuites)
- **iPhone** : sur developer.apple.com → Certificates, Identifiers & Profiles → Keys → « + » → coche *Apple Push Notifications service (APNs)* → télécharge le fichier `.p8`.
  Mets-le sur le serveur en `server/apns-key.p8` et donne au serveur `APNS_KEY_ID` (l'identifiant de la clé) et `APNS_TEAM_ID` (ton Team ID, en haut à droite du site Apple). Une fois l'appli publiée sur l'App Store : `APNS_PROD=1`.
- **Android** : crée un projet gratuit sur https://console.firebase.google.com, ajoute une appli Android avec l'identifiant `com.lucidstudio.hustlecity`, télécharge `google-services.json` et mets-le dans `android/app/`.
  Puis Paramètres du projet → Comptes de service → « Générer une nouvelle clé privée » : mets ce fichier sur le serveur en `server/fcm-key.json`.

Ces fichiers sont secrets : ils ne vont jamais sur GitHub (déjà exclus).

### 5. Fabriquer et tester l'application
Dans le Terminal :
```
cd ~/Documents/HUSTLE-CITY
npm run app:ios        # ouvre le projet iPhone dans Xcode
npm run app:android    # ouvre le projet Android dans Android Studio
```
- **Dans Xcode**, la première fois : clique sur « App » → onglet *Signing & Capabilities* → choisis ton équipe Apple → « + Capability » → *Push Notifications* et *Background Modes* (coche *Remote notifications*). Puis le bouton ▶ pour lancer sur ton iPhone branché.
- **Dans Android Studio** : le bouton ▶ pour lancer sur un téléphone Android ou l'émulateur.

### 6. Publier
- iPhone : dans Xcode, *Product → Archive* puis *Distribute App*. On remplit la fiche sur App Store Connect (captures, description, âge : 17+ à cause des jeux d'argent simulés).
- Android : *Build → Generate Signed Bundle* puis on l'envoie sur la Google Play Console.

Attention : les deux stores sont exigeants avec les jeux qui simulent des paris et le casino. Le jeu n'utilise jamais d'argent réel pour parier, ce qui est autorisé, mais il faudra le dire clairement dans la fiche et choisir la bonne catégorie d'âge.

## Mettre à jour l'application après une modification du jeu
```
npm run app:sync
```
puis relancer depuis Xcode / Android Studio.
