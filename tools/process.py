#!/usr/bin/env python3
"""originals-2k/<nom>.png → assets/img/<nom>.png : détourage du fond blanc (remplissage depuis les bords),
recadrage serré, redimensionnement, palette 256 couleurs. Les décors (bg-*, room-*) ne sont pas détourés.
Usage : python3 tools/process.py [noms...]   (sans argument : tout)"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, dst = os.path.join(root, 'originals-2k'), os.path.join(root, 'assets/img')
# Poches de fond enfermées à vider (vrais trous : anses, cadres, structures). Par défaut on n'en vide AUCUNE :
# le blanc d'un œil, d'une bande ou d'une basket ressemble à du fond et se faisait trouer.
# 'all' = toutes les poches ; liste de (x, y) en fractions de l'original = seulement les poches qui contiennent ces points.
# (x, y) = centre de la poche, tel que l'affiche --poches ; ou {'n': [numéros]} quand deux poches ont le même centre.
# Pour choisir : python3 tools/process.py --poches <nom>  (écrit /tmp/poches-<nom>.png avec les poches numérotées).
POCKETS = {
    'ic-shop-ville': 'all', 'item-v-electric': [], 'item-v-van': [], 'item-v-city': [], 'item-m-scoot': [],   # carrosseries blanches : pas de trous 'item-g-earrings': [], 'niche-gaming': 'all', 'niche-mode': 'all', 'frame-cdm': 'all', 'ev-cdm-cup': 'sides',   # vides entre le palmier et le banc
    # revue du 03/10 : fonds restés coincés dans des formes fermées
    'slot-bell': 'all', 'slot-cherry': 'all', 'slot-seven': 'all', 'slot-bar': 'all', 'ic-club-dj': 'all', 'ic-club-door': 'all', 'ev-sale': 'all', 'gear-gown': 'all', 'gear-cosplay': 'all', 'deco-dc-bench': 'all', 'deco-dc-lamp': 'all',
    # cadres d'avatar : le centre blanc est un trou (l'avatar passe dessous)
    'frame-six': {'n': [0]}, 'frame-gold': {'n': [0]},
    # créatrices PrivéFans (lot 2) : vides entre bras et corps ; cr-mila garde son tablier blanc
    'cr-leila': 'all', 'cr-jade': 'all', 'cr-kim': 'all', 'cr-lola': 'all', 'cr-sasha': 'all', 'cr-nora': 'all',
    'clubp-danseuse': 'all', 'clubp-dj': 'all', 'clubp-louche': 'all', 'clubp-trader': 'all', 'clubp-boss': 'all', 'clubp-lea': 'all', 'clubp-chloe': 'all', 'clubp-djmax': 'all', 'clubp-valentina': 'all',   # persos du Club : vides entre bras et corps
    'cr-mila': {'n': [0]}, 'cr-ines': 'all', 'cr-rose': 'all', 'cr-eva': 'all', 'gear-cam': 'all', 'gear-sport': {'n': [0, 1, 2, 3, 4, 5]},
    # persos : seulement les vides entre bras et corps (jamais un vêtement blanc)
    'skin-flambeur': [(.384, .252)], 'skin-gold': [(.733, .519)], 'skin-doudoune': [(.676, .446)],
    'skin-sportive': 'all', 'skin-boss': 'all', 'skin-survet': 'all',
    # objets à anses ou à structure ajourée
    'graded-slab': 'all',   # boîtier de carte gradée : fenêtre et étiquette vides (la carte s'affiche dessous)
    'item-t-collect': 'all', 'item-t-first': 'all', 'item-t-jackpot': 'all', 'item-t-hodl': 'all',
    **{f'rig-{i}': 'all' for i in range(5)}, **{f'rigv-{i}': 'all' for i in range(5)},
    **{f'minerv-{i}': 'all' for i in range(5)}, **{f'pc-{i}': 'all' for i in range(3)}, **{f'pcv-{i}': 'all' for i in range(3)}, **{f'pcv-r{i}': 'all' for i in range(1, 5)}, 'medal-bronze': 'all', 'niche-cosplay': 'all', 'pin-gold': 'all', 'pcv-1': [], 'minerv-1': [], 'minerv-2': [], 'ringlight': {'n': [1, 2, 3]},   # {'n': [...]} = poches par numéro (--poches)   # écrans blancs / emblèmes blancs : aucun vide à retirer
}
MAX = {'art': 900, 'full': 900, 'load': 1080, 'parking': 1080, 'bg': 1080, 'room': 1080, 'club': 1080, 'clubp': 1400, 'tkbg': 640, 'bld': 640, 'skin': 560, 'ui': 900, 'default': 420}
NOCUT = ('bg', 'room', 'club', 'tkbg', 'bonus', 'art', 'full', 'parking', 'load')   # décors : pas de détourage

# fonds avec une ombre portée grise : on élargit la tolérance pour l'emporter avec le fond
TOL = {'cr-leila': 140, **{n: 110 for n in ('item-w-pocket', 'item-w-unique', 'item-o-bar100', 'item-o-bar10', 'item-g-roman')}}   # liseré clair autour du trait

# persos : morceaux de fond blanc restés coincés entre deux mèches de cheveux (revue du 08/10/26).
# Choisis à l'œil, jamais en automatique (un liseré blanc ou une basket blanche au bord du perso ressemblent à du fond) :
# python3 tools/process.py --rim <nom> écrit /tmp/rim-<nom>.png avec les candidats numérotés et leur centre (x, y en fractions).
RIM = {
    'cr-lola': [(.354, .021), (.254, .122), (.248, .204), (.731, .26)], 'cr-kim': [(.352, .277)], 'cr-sasha': [(.711, .372), (.283, .44), (.629, .796)],
    'cr-eva': [(.235, .183), (.733, .206), (.756, .32)], 'cr-jade': [(.342, .039), (.274, .135), (.376, .294), (.359, .317), (.62, .297)], 'cr-leila': [(.295, .249), (.303, .281)],
    'cr-mila': [(.439, .012), (.385, .018), (.274, .07), (.235, .103), (.647, .102), (.164, .248)], 'cr-rose': [(.321, .05)],
}
def rim(im, pick=None, frac=.035, maxarea=.004, debug=None):
    """Petites zones blanches enfermées tout près du fond. Sans `pick` : rien n'est vidé (sauf en debug, qui les montre)."""
    import numpy as np
    from scipy import ndimage
    im = im.convert('RGBA'); a = np.asarray(im).copy(); h, w = a.shape[:2]
    bg = a[:, :, 3] < 20
    rgb = a[:, :, :3].astype(int)
    white = (rgb.min(axis=2) > 200) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 45) & ~bg
    lab, n = ndimage.label(white)
    if not n: return im
    dist = ndimage.distance_transform_edt(~bg)
    near = max(3, int(w * frac))
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    mind = ndimage.minimum(dist, lab, range(1, n + 1))
    cand = [i + 1 for i in range(n) if 12 <= sizes[i] <= w * h * maxarea and mind[i] <= near]
    if debug:
        from PIL import ImageDraw
        v = Image.new('RGBA', im.size, (236, 110, 170, 255)); v.alpha_composite(im); d = ImageDraw.Draw(v)
        for k, i in enumerate(cand):
            ys, xs = np.nonzero(lab == i); cx, cy = xs.mean(), ys.mean()
            d.rectangle((xs.min() - 2, ys.min() - 2, xs.max() + 2, ys.max() + 2), outline=(0, 200, 255), width=2); d.text((xs.max() + 4, ys.min()), str(k), fill=(0, 0, 0))
            print(k, (round(cx / w, 3), round(cy / h, 3)), int(sizes[i - 1]))
        v.save(debug); return im
    allc = [i + 1 for i in range(n) if 4 <= sizes[i] <= w * h * maxarea]   # un point choisi à la main vaut aussi un peu plus loin du bord
    kill = [i for i in allc if any(lab[min(h - 1, int(fy * h)), min(w - 1, int(fx * w))] == i or np.hypot(*(np.argwhere(lab == i).mean(axis=0) - (fy * h, fx * w))) < w * .012 for fx, fy in (pick or []))]
    if kill:
        m = np.isin(lab, kill); m = ndimage.binary_dilation(m, iterations=1) & (rgb.min(axis=2) > 170)
        a[m, 3] = 0
    return Image.fromarray(a)

# hauteur gardée (fraction de la silhouette, depuis le haut) pour couper chaque perso du Club à mi-cuisse
# persos du Club : hauteur des yeux et du menton, mesurées sur l'original ramené à 600 px de haut (règle tracée à la main)
CLUB_HEAD = {'clubp-danseuse': (160, 233), 'clubp-trader': (130, 200), 'clubp-dj': (115, 182), 'clubp-boss': (82, 132), 'clubp-louche': (83, 138), 'clubp-lea': (91.5, 128.8), 'clubp-chloe': (79, 127.4), 'clubp-valentina': (90, 160.1), 'clubp-johnny': (75, 152.5), 'clubp-djmax': (129, 191)}
def cutout(im, keep=None, debug=None, tol=60, shadow=False):
    """Détourage : 1) remplissage depuis les bords (couleur du fond détectée, blanc ou gris uni) ;
    2) les poches de fond enfermées (entre les pieds d'une chaise, dans un rig) : zones presque blanches
    et parfaitement unies, d'une certaine taille ; 3) on grignote le liseré clair autour du trait."""
    import numpy as np
    from collections import deque
    im = im.convert('RGBA'); w, h = im.size
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bgc = np.median(border, axis=0)
    dist = np.abs(a - bgc).sum(axis=2)
    near = dist < tol
    bgmask = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not bgmask[y, x]: bgmask[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not bgmask[y, x]: bgmask[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not bgmask[ny, nx]:
                bgmask[ny, nx] = True; q.append((ny, nx))
    # poches enfermées : très proches de la couleur du fond et bien unies
    pocket = (dist < 18) & ~bgmask
    seen = np.zeros((h, w), bool)
    minarea = max(60, int(w * h * 0.0004))
    comps = []
    for y0 in range(h):
        row = pocket[y0]
        if not row.any(): continue
        for x0 in np.nonzero(row & ~seen[y0])[0]:
            if seen[y0, x0]: continue
            comp = [(y0, x0)]; seen[y0, x0] = True; i = 0
            while i < len(comp):
                y, x = comp[i]; i += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and pocket[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; comp.append((ny, nx))
            if len(comp) >= minarea:
                comps.append(comp)
    for k, comp in enumerate(comps):
        ys, xs = zip(*comp)
        if debug is not None: debug.append((k, sum(xs) / len(xs) / w, sum(ys) / len(ys) / h, len(comp), comp))
        cx, cy = sum(xs) / len(xs) / w, sum(ys) / len(ys) / h
        hit = (keep == 'sides' and (cx < .34 or cx > .66)) or keep == 'all' or (isinstance(keep, dict) and k in keep.get('n', [])) or bool(isinstance(keep, list) and any(abs(fx - cx) < .015 and abs(fy - cy) < .015 for fx, fy in keep))
        if hit: bgmask[list(ys), list(xs)] = True
    if shadow:   # ombre portée grise sous l'objet : on la vide (gris clair sans couleur, rattaché au fond, dans le bas de l'objet ; les contours sombres l'arrêtent)
        ys, xs = np.nonzero(~bgmask)
        if len(ys):
            top, bot = ys.min(), ys.max(); lim = top + int((bot - top) * .55)
            mx, mn = a.max(axis=2), a.min(axis=2)
            cand = (~bgmask) & (mx - mn < 22) & (mn > 120) & (mx < 250)
            cand[:lim] = False
            q = deque((y, x) for y, x in zip(*np.nonzero(cand)) if any(0 <= y + dy < h and 0 <= x + dx < w and bgmask[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))))
            for y, x in q: bgmask[y, x] = True
            while q:
                y, x = q.popleft()
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not bgmask[ny, nx]:
                        bgmask[ny, nx] = True; q.append((ny, nx))
    # miettes : petits îlots détachés de l'objet (poussière, restes d'ombre) → fond
    from scipy import ndimage
    lab, nl = ndimage.label(~bgmask)
    if nl > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, nl + 1)); big = sizes.max()
        for k, sz in enumerate(sizes, 1):
            if sz < big * .004: bgmask[lab == k] = True
    alpha = Image.fromarray(np.where(bgmask, 0, 255).astype('uint8'))
    alpha = alpha.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
    return im.crop(bbox) if bbox else im

CREA_CROP = { 'meduzik': (.17, .12, .83, .69), 'esprit': (.14, .16, .86, .7),   # fenêtre de l'illustration dans chaque carte générée (gauche, haut, droite, bas), mesurée à la main
    'betonnard': (.12, .11, .88, .73), 'biscotto': (.14, .13, .86, .74), 'bitumouche': (.13, .11, .86, .73), 'canardo': (.12, .11, .88, .76),
    'chenillette': (.12, .11, .88, .76), 'cosmo': (.11, .09, .89, .80), 'crocodalle': (.13, .10, .86, .72), 'electrochat': (.14, .14, .86, .77),
    'escargoat': (.12, .10, .88, .71), 'fenekko': (.12, .10, .90, .76), 'flamenkoh': (.16, .12, .88, .77), 'fourmidable': (.15, .15, .85, .72),
    'golemneon': (.09, .10, .92, .80), 'gorilleur': (.11, .12, .92, .78), 'grenouf': (.12, .12, .89, .78), 'herissnik': (.14, .13, .89, .74),
    'hiboss': (.13, .14, .86, .80), 'kaiju': (.11, .13, .89, .76), 'kebabzor': (.12, .10, .88, .71), 'kraken': (.11, .14, .89, .75),
    'licornette': (.09, .13, .91, .78), 'liontours': (.11, .10, .91, .77), 'louperiph': (.12, .16, .89, .78), 'matouz': (.13, .12, .89, .73),
    'moustikass': (.12, .10, .88, .74), 'pandagrillz': (.12, .12, .89, .77), 'parrain': (.14, .14, .86, .76), 'phenix': (.09, .14, .91, .80),
    'pigeonnard': (.12, .10, .88, .76), 'poubellou': (.12, .10, .88, .75), 'ratchou': (.11, .10, .90, .80), 'requinoir': (.12, .10, .89, .77),
    'scarabling': (.14, .17, .86, .69), 'serpentdor': (.11, .12, .90, .80), 'taupecash': (.12, .10, .88, .73), 'tigresko': (.11, .10, .90, .84),
    'trotilezard': (.12, .10, .88, .73), 'yetiz': (.09, .13, .92, .80) }

def run(name):
    im = Image.open(os.path.join(src, name + '.png'))
    kind = name.split('-')[0]
    if name in ('shop-hero', 'pop-starter', 'ev-cdm-bg'): kind = 'bg'   # images avec leur décor
    if name.startswith('item-cr-'):   # créatures : on ne garde que l'illustration, le jeu dessine le même cadre pour toutes
        w, h = im.size; b = CREA_CROP.get(name[8:], (.12, .11, .88, .75))
        im = im.convert('RGB').crop((int(w * b[0]), int(h * b[1]), int(w * b[2]), int(h * b[3]))); im.thumbnail((720, 920), Image.LANCZOS)
        im.save(os.path.join(dst, name + '.png'), optimize=True); print(name, im.size); return   # pleine couleur : le jeu sert la version .jpg
    if name.endswith('-fg'):  # calque de premier plan déjà détouré : on garde la transparence
        im = im.convert('RGBA'); im.thumbnail((1080, 2160), Image.LANCZOS)
        im.save(os.path.join(dst, name + '.png'), optimize=True); print(name, im.size); return
    if name.startswith('app-') and name != 'app-agence':   # icônes d'appli : un carré arrondi net (le détourage classique rongeait le contour sombre)
        import numpy as np
        from PIL import ImageDraw
        im = im.convert('RGBA'); im.thumbnail((900, 900)); g = np.asarray(im.convert('L')); ys, xs = np.nonzero(g < 235)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1; im = im.crop((x0, y0, x1, y1)); w, h = im.size
        k = 4; m = Image.new('L', (w * k, h * k), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w * k - 1, h * k - 1), radius=int(min(w, h) * .23 * k), fill=255)
        im.putalpha(m.resize((w, h), Image.LANCZOS)); m_ = MAX.get(kind, MAX['default']); im.thumbnail((m_, m_), Image.LANCZOS)
        im.save(os.path.join(dst, name + '.png'), optimize=True); print(name, im.size); return
    if kind not in NOCUT:
        lim = 1800 if name in CLUB_HEAD else 900   # persos du Club : on garde du détail (ils s'affichent en grand)
        im.thumbnail((lim, lim)) if max(im.size) > lim else None
        jewel = name.startswith(('item-o-', 'item-g-', 'item-w-', 'item-m-', 'item-v-'))   # + motos et voitures : vides entre rayons, cadre, vitres   # bijoux et montres : les creux (chaîne, anneau, bracelet) sont des trous
        im = cutout(im, POCKETS.get(name, 'sides' if name.startswith(('ach-', 'item-t-')) else 'all' if jewel else None), tol=TOL.get(name, 60),
                    shadow=name.startswith('item-') and not name.startswith('item-cr-'))   # trophées : on vide le creux des anses ; objets : jamais d'ombre portée
        if name in RIM: im = rim(im, RIM[name])
        if name in CLUB_HEAD:   # persos du Club : même taille de tête et même coupure pour tous (de 0,7 tête au-dessus du crâne à 2,7 têtes sous le menton)
            eyes, chin = CLUB_HEAD[name]; W0, H0 = im.size; k = H0 / 600; H = 2 * (chin - eyes); crown = chin - H
            top, bot = int((crown - .7 * H) * k), int((chin + 2.7 * H) * k)
            box = Image.new('RGBA', (W0, bot - top), (0, 0, 0, 0)); box.alpha_composite(im.convert('RGBA'), (0, -top) if top < 0 else (0, 0), (0, max(0, top)))
            bb = box.getbbox(); im = box.crop((bb[0], 0, bb[2], box.size[1]))
    m = MAX.get(kind, MAX['default'])
    im.thumbnail((m, m * 2) if kind in NOCUT + ('skin',) else (m, m), Image.LANCZOS)
    if kind in ('art', 'full'):   # illustrations de cartes : pleine couleur (256 couleurs les abîmait), le jeu sert la version .jpg
        im.convert('RGB').save(os.path.join(dst, name + '.png'), optimize=True)
    elif kind in NOCUT:
        im.convert('RGB').quantize(256, method=Image.MEDIANCUT).save(os.path.join(dst, name + '.png'), optimize=True)
    else:
        im.quantize(256, method=Image.FASTOCTREE).save(os.path.join(dst, name + '.png'), optimize=True)
    if kind == 'skin':  # buste pour l'avatar : haut du perso, carré
        w, h = im.size; b = im.crop((0, 0, w, min(h, int(w * 1.0))))
        b.quantize(256, method=Image.FASTOCTREE).save(os.path.join(dst, name + '-bust.png'), optimize=True)
    print(name, im.size, os.path.getsize(os.path.join(dst, name + '.png')) // 1024, 'Ko')

if sys.argv[1:2] == ['--rim']:   # candidats « fond coincé dans les cheveux », numérotés
    for n in sys.argv[2:]:
        im = Image.open(os.path.join(src, n + '.png')); im.thumbnail((900, 900))
        im = cutout(im, POCKETS.get(n), tol=TOL.get(n, 60)); print(n); rim(im, debug=f'/tmp/rim-{n}.png')
    sys.exit()
if sys.argv[1:2] == ['--poches']:
    from PIL import ImageFont
    for n in sys.argv[2:]:
        im = Image.open(os.path.join(src, n + '.png')); im.thumbnail((900, 900)); dbg = []
        cutout(im.copy(), None, dbg); v = im.convert('RGB'); px = v.load(); d = ImageDraw.Draw(v)
        for k, fx, fy, size, comp in dbg:
            for y, x in comp: px[x, y] = (255, 0, 255)
        for k, fx, fy, size, comp in dbg:
            d.text((fx * v.width - 6, fy * v.height - 6), str(k), fill=(0, 0, 0), font=ImageFont.load_default(size=28))
            print(n, k, round(fx, 3), round(fy, 3), size)
        v.save(f'/tmp/poches-{n}.png')
    sys.exit()
names = sys.argv[1:] or [f[:-4] for f in os.listdir(src) if f.endswith('.png')]
for n in names: run(n)
