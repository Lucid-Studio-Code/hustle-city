# Variantes de la ville (rénové, néon, hiver…) : même taille apparente que le bâtiment d'origine.
# À largeur égale, on compare la surface dessinée ; le facteur (racine du rapport) va dans js/data.js (BLD_SCALE).
import os, re, numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img'); out = {}
area = lambda f: (lambda im: (np.asarray(im.resize((400, max(1, round(400 * im.height / im.width)))).split()[-1]) > 128).sum())(Image.open(f).convert('RGBA'))
for f in sorted(os.listdir(D)):
    m = re.match(r'bld-([a-z0-9]+)-(renov|neon|hiver)\.png$', f)
    if not m or not os.path.exists(os.path.join(D, f'bld-{m[1]}.png')): continue
    k = (area(os.path.join(D, f'bld-{m[1]}.png')) / area(os.path.join(D, f))) ** .5
    out[f[:-4]] = float(round(k, 3))
p = os.path.join(os.path.dirname(__file__), '..', 'js', 'data.js'); s = open(p).read()
line = '  const BLD_SCALE = ' + repr(out).replace("'", "'") + ';   // généré par tools/bld-scale.py'
s = re.sub(r'  const BLD_SCALE = .*\n', line + '\n', s) if 'const BLD_SCALE' in s else s.replace('  const CITY_LOOKS = [', line + '\n  const CITY_LOOKS = [', 1)
if 'BLD_SCALE,' not in s: s = s.replace('CITY_LOOKS, CRYPTO_REVERT,', 'CITY_LOOKS, BLD_SCALE, CRYPTO_REVERT,', 1)
open(p, 'w').write(s); print(out)
