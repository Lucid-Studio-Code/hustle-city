# Cartes Créatures : on retrouve la fenêtre de l'illustration dans le cadre généré (traits sombres continus), pour ne garder que le dessin.
import numpy as np
from PIL import Image
def window(im):
    g = np.asarray(im.convert('L'), dtype=np.int16); H, W = g.shape; dark = g < 95
    colfrac = lambda x, y0, y1: dark[y0:y1, x].mean()
    rowfrac = lambda y, x0, x1: dark[y, x0:x1].mean()
    def first(rng, f, thr=.88):
        for i in rng:
            if f(i) >= thr: return i
        return None
    L = first(range(int(W*.035), int(W*.25)), lambda x: colfrac(x, int(H*.2), int(H*.6)))
    R = first(range(int(W*.965), int(W*.75), -1), lambda x: colfrac(x, int(H*.2), int(H*.6)))
    T = first(range(int(H*.025), int(H*.22)), lambda y: rowfrac(y, int(W*.3), int(W*.7)))
    B = first(range(int(H*.55), int(H*.9)), lambda y: rowfrac(y, int(W*.25), int(W*.75)))
    ok = None not in (L, R, T, B)
    L = L if L is not None else int(W*.12); R = R if R is not None else int(W*.88); T = T if T is not None else int(H*.10); B = B if B is not None else int(H*.70)
    m = int(W*.035)   # on passe le liseré coloré de la fenêtre
    return (L + m, T + m, R - m, B - m), ok
