#!/bin/zsh
# Double-clique : lance le serveur de test (port 5330, base server/amis-test.db, jamais le jeu en ligne) et ouvre DEUX parties séparées (Joueur 1 et Joueur 2).
# Chaque fenêtre Chrome a son propre profil : deux joueurs différents sur le même Mac. Ajoute l'autre avec son identifiant (appli « Potes » du téléphone).
# Sur ton téléphone (même wifi) : l'adresse s'affiche en bas. Pour tout arrêter : ferme cette fenêtre de Terminal.
cd "$(dirname "$0")"
PORT=5330
if ! lsof -ti tcp:$PORT >/dev/null; then
  DB=server/amis-test.db PORT=$PORT HOST=0.0.0.0 node server/server.js &
  SRV=$!
  trap "kill $SRV 2>/dev/null" EXIT
  sleep 2
fi
URL="http://localhost:$PORT/game.html"
P="$HOME/Library/Application Support/BiffCity-amis"
mkdir -p "$P/joueur1" "$P/joueur2"
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --user-data-dir="$P/joueur1" --no-first-run --window-size=430,900 --window-position=40,40 "$URL"
  open -na "Google Chrome" --args --user-data-dir="$P/joueur2" --no-first-run --window-size=430,900 --window-position=520,40 "$URL"
else
  # sans Chrome : Safari normal + une fenêtre privée (Fichier > Nouvelle fenêtre privée, puis colle l'adresse)
  open -a Safari "$URL"
  echo "Pour le 2e joueur : dans Safari, Fichier > Nouvelle fenêtre privée, puis va sur $URL"
fi
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
echo ""
echo "Joueur 1 et Joueur 2 : deux fenêtres Chrome séparées."
echo "Sur ton téléphone (même wifi) : http://$IP:$PORT/game.html"
echo "Back office de test : http://localhost:$PORT/admin/"
echo "Laisse cette fenêtre ouverte pendant que vous jouez."
wait
