#!/bin/bash
# usage : lignes "nom url" sur l'entrée standard → originals-2k/nom.png (ne retélécharge pas ce qui existe déjà, sauf FORCE=1)
cd "$(dirname "$0")/../originals-2k"
while read -r name url; do
  [ -z "$name" ] && continue
  if [ -f "$name.png" ] && [ -z "$FORCE" ]; then continue; fi
  curl -s -o "$name.png" "$url" && echo "ok $name"
done
