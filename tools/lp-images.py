#!/usr/bin/env python3
"""Copies allégées des images utilisables sur la vitrine (assets/lp/o/<nom>.webp, 800 px de large au plus).
landing/render.js sert ces copies à la place des originaux quand elles existent. Relancer après avoir ajouté des images : python3 tools/lp-images.py"""
import os, re
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, dst = os.path.join(root, 'assets/img'), os.path.join(root, 'assets/lp/o')
os.makedirs(dst, exist_ok=True)
KEEP = re.compile(r'^(bg-|club-|load-|room-|ev-cdm-bg|card-bg|tkbg-|parking-bg|skin-|clubp-|cr-[a-z]+$|player-|guide$|app-|shop-hero|art-)')
n = 0
for f in sorted(os.listdir(src)):
    name, ext = os.path.splitext(f)
    if ext not in ('.png', '.jpg') or not KEEP.match(name): continue
    if ext == '.png' and os.path.exists(os.path.join(src, name + '.jpg')): continue   # le .jpg est la meilleure source d'un décor
    out = os.path.join(dst, name + '.webp')
    if name == 'load-8': continue   # image principale de la vitrine : gardée légère (720 px) pour l'affichage rapide
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(os.path.join(src, f)) and os.path.getmtime(out) > os.path.getmtime(__file__): continue
    perso = name.startswith(('skin-', 'clubp-', 'cr-', 'player-', 'guide', 'app-'))
    o = os.path.join(root, 'originals-2k', name + '.png')   # décors : on repart de l'original en haute définition (bannières larges, écrans Retina)
    im = Image.open(o if not perso and os.path.exists(o) else os.path.join(src, f)); im = im.convert('RGBA' if im.mode in ('RGBA', 'P', 'LA') else 'RGB')
    w = 520 if perso else 1800
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(out, quality=72 if not perso else 78, method=6); n += 1
print(n, 'images allégées dans assets/lp/o')
