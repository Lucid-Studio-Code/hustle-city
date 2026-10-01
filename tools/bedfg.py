#!/usr/bin/env python3
"""Calque « lit au premier plan » : tout ce qui, dans la boîte donnée, n'est pas joignable depuis le parquet
du devant sans traverser un trait sombre (contour du dessin). usage : bedfg.py room-N x0 x1 y0 y1"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from collections import deque
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name, x0, x1, y0, y1 = sys.argv[1], *map(float, sys.argv[2:6])
im = Image.open(os.path.join(root, 'originals-2k', name + '.png')).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(int)
dark = a.max(2) < 95                      # traits de contour
X0, X1, Y0, Y1 = int(W * x0), int(W * x1), int(H * y0), int(H * y1)
reach = np.zeros((H, W), bool); q = deque()
for x in range(X0, X1):                    # on part du parquet en bas de la boîte et des côtés
    if not dark[Y1 - 1, x]: reach[Y1 - 1, x] = True; q.append((Y1 - 1, x))
for y in range(Y0, Y1):
    for x in (X1 - 1,):
        if not dark[y, x]: reach[y, x] = True; q.append((y, x))
# le mur du fond aussi (au-dessus du lit, côté bureau) : il ne doit jamais passer au premier plan
for x in range(int(W * .44), int(W * .82)):
    if not dark[Y0, x]: reach[Y0, x] = True; q.append((Y0, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if Y0 <= ny < Y1 and X0 <= nx < X1 and not dark[ny, nx] and not reach[ny, nx]:
            reach[ny, nx] = True; q.append((ny, nx))
m = np.zeros((H, W), bool); m[Y0:Y1, X0:X1] = ~reach[Y0:Y1, X0:X1]
mk = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(.8))
fg = im.convert('RGBA'); fg.putalpha(mk)
fg.save(os.path.join(root, 'originals-2k', name + '-fg.png'))
prev = Image.new('RGBA', im.size, (255, 0, 255, 255)); prev.alpha_composite(fg)
prev.convert('RGB').crop((0, int(H * .45), W, int(H * .8))).resize((W // 3, int(H * .35) // 3)).save('/private/tmp/claude-501/-Users-lucillegarnot-Documents-RESPIRE---RESSOURCES---BACKUP-CLAUDE-/dc19f28c-bd0f-40c1-ae02-86ef71c5cbd6/scratchpad/' + name + '-fg.png')
print('ok', name)
