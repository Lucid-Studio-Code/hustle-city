#!/usr/bin/env python3
"""Simulation : pose les bâtiments (assets/img/bld-*.png) sur un fond. Positions en % : x = centre, y = pied, w = largeur.
usage : python3 tools/mockup.py fond.png sortie.png 'appart:22,62,30' 'balto:78,62,30' ..."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bg = Image.open(sys.argv[1]).convert('RGBA').resize((540, 960))
names = {'appart': 'Mon appart', 'balto': 'Le Balto', 'casino': 'Lucky Palace', 'shop': 'Le Comptoir'}
try: font = ImageFont.truetype(os.path.join(root, 'refs', 'Lilita.ttf'), 20)
except Exception:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 18)
d = ImageDraw.Draw(bg)
for spec in sys.argv[3:]:
    k, v = spec.split(':'); x, y, w = map(float, v.split(','))
    im = Image.open(os.path.join(root, 'assets/img', f'bld-{k}.png')).convert('RGBA')
    W = int(540 * w / 100); H = int(im.height * W / im.width); im = im.resize((W, H), Image.LANCZOS)
    px, py = int(540 * x / 100 - W / 2), int(960 * y / 100 - H)
    bg.alpha_composite(im, (px, py))
    t = names.get(k, k); tw = d.textlength(t, font=font)
    bx, by = int(540 * x / 100 - tw / 2 - 10), int(960 * y / 100 - 14)
    d.rounded_rectangle([bx, by, bx + tw + 20, by + 28], 12, fill=(107, 66, 38), outline=(42, 26, 16), width=3)
    d.text((bx + 10, by + 3), t, fill='white', font=font, stroke_width=2, stroke_fill=(42, 26, 16))
bg.convert('RGB').save(sys.argv[2])
