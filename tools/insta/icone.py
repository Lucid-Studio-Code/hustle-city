# Fabrique une icône d'appli « façon jeu » (cadre arrondi, mur peint, reflet) autour d'un objet détouré.
# python3 icone.py objet.png sortie.png "#haut" "#bas"
import sys, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
obj, out, c1, c2 = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
extra = sys.argv[5] if len(sys.argv) > 5 else None   # 2e objet, posé en bas à droite
S = 420; R = 86
hx = lambda c: tuple(int(c[i:i+2], 16) for i in (1, 3, 5))
def rr(box, r, fill=255):
    m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).rounded_rectangle(box, r, fill=fill); return m
a, b = hx(c1), hx(c2)
grad = Image.new('RGB', (S, S))
for y in range(S):
    t = y / S; ImageDraw.Draw(grad).line([(0, y), (S, y)], fill=tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)))
random.seed(4)
noise = Image.effect_noise((S, S), 38).convert('RGB')
wall = ImageChops.overlay(grad, noise.point(lambda v: 110 + v // 4))
d = ImageDraw.Draw(wall)
for _ in range(14):   # taches de peinture
    x, y, r = random.randint(30, 390), random.randint(30, 390), random.randint(3, 10)
    d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(max(0, v - 25) for v in b))
wall = wall.filter(ImageFilter.GaussianBlur(.8))
ic = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ic.paste((24, 18, 30, 255), (0, 0), rr([4, 4, S - 5, S - 5], R))                      # contour sombre
ic.paste(tuple(min(255, v + 70) for v in a) + (255,), (0, 0), rr([16, 16, S - 17, S - 17], R - 12))   # liseré clair
ic.paste(wall, (0, 0), rr([24, 24, S - 25, S - 25], R - 18))
# ombre intérieure en bas
sh = rr([24, 24, S - 25, S - 25], R - 18); inner = Image.new('L', (S, S), 0); ImageDraw.Draw(inner).rounded_rectangle([24, 10, S - 25, S - 45], R - 18, fill=255)
sh = ImageChops.subtract(sh, inner).filter(ImageFilter.GaussianBlur(10))
ic = Image.alpha_composite(ic, Image.merge('RGBA', [Image.new('L', (S, S), 0)] * 3 + [sh.point(lambda v: v * .55)]))
o = Image.open(obj).convert('RGBA'); o.thumbnail((300, 330) if extra else (300, 300), Image.LANCZOS)
ox, oy = ((S - o.width) // 2 - (40 if extra else 0)), (S - o.height) // 2 + 6
shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0)); shadow.paste((20, 10, 20, 150), (ox + 8, oy + 12), o)
ic = Image.alpha_composite(ic, shadow.filter(ImageFilter.GaussianBlur(6)))
layer = Image.new('RGBA', (S, S), (0, 0, 0, 0)); layer.paste(o, (ox, oy), o); ic = Image.alpha_composite(ic, layer)
if extra:
    e = Image.open(extra).convert('RGBA'); e.thumbnail((170, 170), Image.LANCZOS); ex, ey = S - e.width - 40, S - e.height - 44
    sh2 = Image.new('RGBA', (S, S), (0, 0, 0, 0)); sh2.paste((20, 10, 20, 150), (ex + 6, ey + 10), e); ic = Image.alpha_composite(ic, sh2.filter(ImageFilter.GaussianBlur(5)))
    l2 = Image.new('RGBA', (S, S), (0, 0, 0, 0)); l2.paste(e, (ex, ey), e); ic = Image.alpha_composite(ic, l2)
# reflet brillant en haut
g = Image.new('L', (S, S), 0); ImageDraw.Draw(g).rounded_rectangle([34, 30, S - 35, 150], 70, fill=60)
g = ImageChops.multiply(g.filter(ImageFilter.GaussianBlur(14)), rr([24, 24, S - 25, S - 25], R - 18))
ic = Image.alpha_composite(ic, Image.merge('RGBA', [Image.new('L', (S, S), 255)] * 3 + [g]))
ic.save(out)
