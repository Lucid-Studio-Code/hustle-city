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
    # revue du 03/10 : fonds restés coincés dans des formes fermées
    'slot-bell': 'all', 'ic-club-dj': 'all', 'ic-club-door': 'all', 'ev-sale': 'all', 'gear-gown': 'all', 'gear-cosplay': 'all', 'deco-dc-bench': 'all', 'deco-dc-lamp': 'all',
    # cadres d'avatar : le centre blanc est un trou (l'avatar passe dessous)
    'frame-six': {'n': [0]}, 'frame-gold': {'n': [0]},
    # créatrices PrivéFans (lot 2) : vides entre bras et corps ; cr-mila garde son tablier blanc
    'cr-leila': 'all', 'cr-jade': 'all', 'cr-kim': 'all', 'cr-lola': 'all', 'cr-sasha': 'all', 'cr-nora': 'all',
    'cr-mila': {'n': [0]}, 'cr-ines': 'all', 'cr-rose': 'all', 'cr-eva': 'all', 'gear-cam': 'all', 'gear-sport': {'n': [0, 1, 2, 3, 4, 5]},
    # persos : seulement les vides entre bras et corps (jamais un vêtement blanc)
    'skin-flambeur': [(.384, .252)], 'skin-doudoune': [(.676, .446)],
    'skin-sportive': 'all', 'skin-boss': 'all', 'skin-survet': 'all',
    # objets à anses ou à structure ajourée
    'graded-slab': 'all',   # boîtier de carte gradée : fenêtre et étiquette vides (la carte s'affiche dessous)
    'item-t-collect': 'all', 'item-t-first': 'all', 'item-t-jackpot': 'all', 'item-t-hodl': 'all',
    **{f'rig-{i}': 'all' for i in range(5)}, **{f'rigv-{i}': 'all' for i in range(5)},
    **{f'minerv-{i}': 'all' for i in range(5)}, **{f'pc-{i}': 'all' for i in range(3)}, **{f'pcv-{i}': 'all' for i in range(3)}, 'pcv-1': [], 'minerv-1': [], 'minerv-2': [], 'ringlight': {'n': [1, 2, 3]},   # {'n': [...]} = poches par numéro (--poches)   # écrans blancs / emblèmes blancs : aucun vide à retirer
}
MAX = {'bg': 1080, 'room': 1080, 'club': 1080, 'tkbg': 640, 'bld': 640, 'skin': 560, 'ui': 900, 'default': 420}
NOCUT = ('bg', 'room', 'club', 'tkbg', 'bonus', 'art', 'full', 'parking')   # décors : pas de détourage

# fonds avec une ombre portée grise : on élargit la tolérance pour l'emporter avec le fond
TOL = {'cr-leila': 140}

def cutout(im, keep=None, debug=None, tol=60):
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
        hit = keep == 'all' or (isinstance(keep, dict) and k in keep.get('n', [])) or bool(isinstance(keep, list) and any(abs(fx - cx) < .015 and abs(fy - cy) < .015 for fx, fy in keep))
        if hit: bgmask[list(ys), list(xs)] = True
    alpha = Image.fromarray(np.where(bgmask, 0, 255).astype('uint8'))
    alpha = alpha.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
    return im.crop(bbox) if bbox else im

def run(name):
    im = Image.open(os.path.join(src, name + '.png'))
    kind = name.split('-')[0]
    if name in ('shop-hero', 'pop-starter'): kind = 'bg'   # images avec leur décor
    if name.endswith('-fg'):  # calque de premier plan déjà détouré : on garde la transparence
        im = im.convert('RGBA'); im.thumbnail((1080, 2160), Image.LANCZOS)
        im.save(os.path.join(dst, name + '.png'), optimize=True); print(name, im.size); return
    if kind not in NOCUT:
        im.thumbnail((900, 900)) if max(im.size) > 900 else None
        im = cutout(im, POCKETS.get(name), tol=TOL.get(name, 60))
    m = MAX.get(kind, MAX['default'])
    im.thumbnail((m, m * 2) if kind in NOCUT + ('skin',) else (m, m), Image.LANCZOS)
    if kind in NOCUT:
        im.convert('RGB').quantize(256, method=Image.MEDIANCUT).save(os.path.join(dst, name + '.png'), optimize=True)
    else:
        im.quantize(256, method=Image.FASTOCTREE).save(os.path.join(dst, name + '.png'), optimize=True)
    if kind == 'skin':  # buste pour l'avatar : haut du perso, carré
        w, h = im.size; b = im.crop((0, 0, w, min(h, int(w * 1.0))))
        b.quantize(256, method=Image.FASTOCTREE).save(os.path.join(dst, name + '-bust.png'), optimize=True)
    print(name, im.size, os.path.getsize(os.path.join(dst, name + '.png')) // 1024, 'Ko')

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
