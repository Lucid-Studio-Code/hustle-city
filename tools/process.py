#!/usr/bin/env python3
"""originals-2k/<nom>.png → assets/img/<nom>.png : détourage du fond blanc (remplissage depuis les bords),
recadrage serré, redimensionnement, palette 256 couleurs. Les décors (bg-*, room-*) ne sont pas détourés.
Usage : python3 tools/process.py [noms...]   (sans argument : tout)"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, dst = os.path.join(root, 'originals-2k'), os.path.join(root, 'assets/img')
MAX = {'bg': 1080, 'room': 1080, 'bld': 640, 'skin': 560, 'default': 420}

def cutout(im):
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
    near = dist < 60
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
                ys, xs = zip(*comp); bgmask[list(ys), list(xs)] = True
    alpha = Image.fromarray(np.where(bgmask, 0, 255).astype('uint8'))
    alpha = alpha.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
    return im.crop(bbox) if bbox else im

def run(name):
    im = Image.open(os.path.join(src, name + '.png'))
    kind = name.split('-')[0]
    if name.endswith('-fg'):  # calque de premier plan déjà détouré : on garde la transparence
        im = im.convert('RGBA'); im.thumbnail((1080, 2160), Image.LANCZOS)
        im.save(os.path.join(dst, name + '.png'), optimize=True); print(name, im.size); return
    if kind not in ('bg', 'room'):
        im.thumbnail((900, 900)) if max(im.size) > 900 else None
        im = cutout(im)
    m = MAX.get(kind, MAX['default'])
    im.thumbnail((m, m * 2) if kind in ('bg', 'room', 'skin') else (m, m), Image.LANCZOS)
    if kind in ('bg', 'room'):
        im.convert('RGB').quantize(256, method=Image.MEDIANCUT).save(os.path.join(dst, name + '.png'), optimize=True)
    else:
        im.quantize(256, method=Image.FASTOCTREE).save(os.path.join(dst, name + '.png'), optimize=True)
    if kind == 'skin':  # buste pour l'avatar : haut du perso, carré
        w, h = im.size; b = im.crop((0, 0, w, min(h, int(w * 1.0))))
        b.quantize(256, method=Image.FASTOCTREE).save(os.path.join(dst, name + '-bust.png'), optimize=True)
    print(name, im.size, os.path.getsize(os.path.join(dst, name + '.png')) // 1024, 'Ko')

names = sys.argv[1:] or [f[:-4] for f in os.listdir(src) if f.endswith('.png')]
for n in names: run(n)
