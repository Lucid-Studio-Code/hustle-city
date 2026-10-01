#!/usr/bin/env python3
"""Liste les images présentes dans assets/img → js/assets.js (le jeu n'essaie que celles-là, sinon emoji de secours)."""
import os, json, time
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
names = sorted(f[:-4] for f in os.listdir(os.path.join(root, 'assets/img')) if f.endswith('.png'))
open(os.path.join(root, 'js/assets.js'), 'w').write(
    '/* généré par tools/manifest.py */\nwindow.ASSETS = %s;\nwindow.ASSET_V = %d;\n' % (json.dumps(names), int(time.time())))
print(len(names), 'images')
