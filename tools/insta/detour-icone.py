# Détoure une icône générée sur fond blanc : remplissage depuis les bords (le blanc à l'intérieur de la tuile est gardé), recadrage, 420 px.
# python3 detour-icone.py entree.png sortie.png
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
im = Image.open(sys.argv[1]).convert('RGB'); w, h = im.size
m = im.copy()
for p in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
    ImageDraw.floodfill(m, p, (255, 0, 255), thresh=40)
bg = ImageChops.difference(m, Image.new('RGB', (w, h), (255, 0, 255))).convert('L').point(lambda v: 255 if v > 8 else 0)
a = bg.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.5))   # ronge le liseré blanc
out = im.convert('RGBA'); out.putalpha(a); out = out.crop(a.getbbox())
s = max(out.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(out, ((s - out.width) // 2, (s - out.height) // 2), out)
sq.resize((420, 420), Image.LANCZOS).save(sys.argv[2])
