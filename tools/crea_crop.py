# Cartes Créatures : on garde seulement l'illustration (la fenêtre du cadre généré), le jeu dessine un cadre identique pour toutes.
import sys, numpy as np
from PIL import Image
def window(im):
    g = np.asarray(im.convert('L'), dtype=np.int16); H, W = g.shape; dark = g < 80
    def line(idx, axis, lo, hi):   # la ligne la plus intérieure qui est un trait sombre continu
        best = None
        for i in idx:
            seg = dark[lo:hi, i] if axis == 'col' else dark[i, lo:hi]
            if seg.mean() > .7: best = i
        return best
    L = line(range(int(W*.02), int(W*.22)), 'col', int(H*.25), int(H*.6))
    R = line(range(int(W*.98), int(W*.78), -1), 'col', int(H*.25), int(H*.6))
    T = line(range(int(H*.02), int(H*.18)), 'row', int(W*.3), int(W*.7))
    B = line(range(int(H*.92), int(H*.6), -1), 'row', int(W*.3), int(W*.7))
    L = L or int(W*.1); R = R or int(W*.9); T = T or int(H*.08); B = B or int(H*.72)
    m = int(W*.012)
    return (L+m, T+m, R-m, B-m)
if __name__ == '__main__':
    for p in sys.argv[1:]:
        im = Image.open(p); print(p, im.size, window(im))
