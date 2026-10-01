#!/usr/bin/env python3
"""Découpe une planche (grille d'objets sur fond blanc) en images séparées.
Usage : python3 tools/split.py originals-2k/sheets/<planche>.png nom1 nom2 ... (ordre de lecture : ligne par ligne ; « - » = ignorer)
Les morceaux vont dans originals-2k/<nom>.png ; passer ensuite tools/process.py <noms> pour le détourage."""
import os, sys
import numpy as np
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def segments(profile, min_gap, min_len):
    on = profile > 0
    segs, start, gap = [], None, 0
    for i, v in enumerate(on):
        if v:
            if start is None: start = i
            gap = 0; end = i
        elif start is not None:
            gap += 1
            if gap >= min_gap: segs.append((start, end)); start = None
    if start is not None: segs.append((start, end))
    return [s for s in segs if s[1] - s[0] >= min_len]

def main():
    path, names = sys.argv[1], sys.argv[2:]
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(np.int16)
    h, w = a.shape[:2]
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    ink = np.abs(a - np.median(border, axis=0)).sum(axis=2) > 40
    rows = segments(ink.sum(axis=1) > w * 0.002, h // 200, h // 12)
    boxes = []
    for (y0, y1) in rows:
        cols = segments(ink[y0:y1 + 1].sum(axis=0) > 2, w // 80, w // 20)
        for (x0, x1) in cols:
            sub = ink[y0:y1 + 1, x0:x1 + 1]; ys = np.where(sub.any(axis=1))[0]
            boxes.append((x0, y0 + ys[0], x1, y0 + ys[-1]))
    print(len(boxes), 'objets trouvés')
    for b, n in zip(boxes, names):
        if n == '-': continue
        m = 24
        crop = im.crop((max(0, b[0] - m), max(0, b[1] - m), min(w, b[2] + m), min(h, b[3] + m)))
        crop.save(os.path.join(root, 'originals-2k', n + '.png')); print('ok', n, crop.size)

main()
