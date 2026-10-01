#!/usr/bin/env python3
"""Calque « lit au premier plan » à partir d'un contour relevé à la main (en % de l'image)."""
import os
from PIL import Image, ImageDraw, ImageFilter
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POLY = {
 'room-m-0': [(30,58.0),(60,58.0),(65.8,58.6),(68.6,59.9),(71,62),(72.8,63.5),(81.6,67.4),(74.5,67.2),(73.2,70.5),(58,71),(46.3,73.9),(30,72.4)],
 'room-m-1': [(30,58.4),(60,58.2),(66,58.7),(68,59.6),(70.5,62),(72,65),(73.4,66.7),(73.4,71.3),(70.4,71.3),(70.4,69.3),(30,69.3)],
 'room-m-2': [(30,55.2),(60,55.2),(65.8,55.8),(68.5,57.5),(71,61),(72.3,65),(74.6,67.2),(74.6,70),(72,70.9),(30,70.9)],
 'room-f-0': [(30,58.2),(60,58.3),(66,58.5),(68.7,59.9),(71.5,62.5),(74.7,63.4),(81.7,67.6),(73.6,66.4),(73.3,70.3),(54.7,70.8),(45.4,73.9),(30,72.9)],
 'room-f-1': [(30,58.1),(60,58.1),(67.2,58.4),(70,60.5),(72.3,63),(73.7,64.6),(81.6,67.4),(76,67.8),(73.7,67.5),(73.7,70.3),(71.4,71.6),(58,71.2),(45.8,73.6),(30,72.4)],
 'room-f-2': [(30,54.9),(55,54.9),(62,55.3),(66,56),(69,59),(71.5,62),(74,65),(76.5,68.5),(78.3,70.6),(70,71.3),(30,71.3)],
}
for name, pts in POLY.items():
    im = Image.open(os.path.join(root, 'originals-2k', name + '.png')).convert('RGBA'); W, H = im.size
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon([(W * x / 100, H * y / 100) for x, y in pts], fill=255)
    im.putalpha(m.filter(ImageFilter.GaussianBlur(1.2)))
    im.save(os.path.join(root, 'originals-2k', name + '-fg.png')); print('ok', name)
