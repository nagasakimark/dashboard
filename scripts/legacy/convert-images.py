"""Convert the old game images (legacy-v1 JPEGs) to small WebP files.

Run after extract-vocab.mjs, from the repo root (needs Pillow):
    python3 scripts/legacy/convert-images.py
"""
import base64
import io
import json
import os
import subprocess

from PIL import Image

MAX = 480  # px, longest side: enough for a projector card, small to cache

mapping = json.load(open('scripts/legacy/images.json'))
total = 0
for dest, src in mapping.items():
    out = os.path.join('public/games/img', dest)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if src.startswith('data:'):  # small images were inlined by the old build
        data = base64.b64decode(src.split(',', 1)[1])
    else:
        data = subprocess.run(['git', 'show', f'legacy-v1:{src}'], capture_output=True, check=True).stdout
    im = Image.open(io.BytesIO(data))
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    im.thumbnail((MAX, MAX))
    im.save(out, 'WEBP', quality=72, method=6)
    total += os.path.getsize(out)
print(f'{len(mapping)} images, {total / 1e6:.1f} MB')
