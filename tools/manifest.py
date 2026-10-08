#!/usr/bin/env python3
"""Liste les images présentes dans assets/img → js/assets.js (le jeu n'essaie que celles-là, sinon emoji de secours).
Versions plus légères fabriquées ici et chargées par le jeu à la place du .png : .jpg pour les images sans transparence (ASSETS_JPG),
.webp pour les autres (ASSETS_WEBP, transparence gardée)."""
import os, json, time, io
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = os.path.join(root, 'assets/img')
names = sorted(f[:-4] for f in os.listdir(d) if f.endswith('.png'))
jpg = []
for n in names:
    p, j = os.path.join(d, n + '.png'), os.path.join(d, n + '.jpg')
    if os.path.exists(j) and os.path.getmtime(j) >= os.path.getmtime(p): jpg.append(n); continue
    im = Image.open(p)
    if im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getchannel('A').getextrema()[0] < 250:
        if os.path.exists(j): os.remove(j)
        continue
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=86, optimize=True, progressive=True)
    if len(b.getvalue()) < os.path.getsize(p) * .7: open(j, 'wb').write(b.getvalue()); jpg.append(n)
    elif os.path.exists(j): os.remove(j)
webp = []
for n in names:
    if n in jpg: continue
    p, w = os.path.join(d, n + '.png'), os.path.join(d, n + '.webp')
    if os.path.exists(w) and os.path.getmtime(w) >= os.path.getmtime(p): webp.append(n); continue
    b = io.BytesIO(); Image.open(p).convert('RGBA').save(b, 'WEBP', quality=80, method=4, alpha_quality=90)
    if len(b.getvalue()) < os.path.getsize(p) * .85: open(w, 'wb').write(b.getvalue()); webp.append(n)
    elif os.path.exists(w): os.remove(w)
for f in os.listdir(d):   # versions légères orphelines (ou devenues inutiles)
    if (f.endswith('.jpg') and f[:-4] not in jpg) or (f.endswith('.webp') and f[:-5] not in webp): os.remove(os.path.join(d, f))
open(os.path.join(root, 'js/assets.js'), 'w').write(
    '/* généré par tools/manifest.py */\nwindow.ASSETS = %s;\nwindow.ASSETS_JPG = %s;\nwindow.ASSETS_WEBP = %s;\nwindow.ASSET_V = %d;\n' % (json.dumps(names), json.dumps(jpg), json.dumps(webp), int(time.time())))
print(len(names), 'images,', len(jpg), 'en jpg,', len(webp), 'en webp')
