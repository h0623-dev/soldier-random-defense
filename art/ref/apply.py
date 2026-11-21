"""기준 화면 그림(art/ref/raw/*.png)을 잘라 www/img/v2/ 에 넣는다. 사용: python3 -I art/ref/apply.py
 · ground · road: 가운데를 4:5(전장 비율)로 잘라 줄인다.   · props(4×3) · enemies(3×2) · units_<군별>(2×2): 흰 바탕을 지우고 칸마다 잘라 정사각형 webp로."""
import sys, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from cutout import matte
RAW, OUT = os.path.join(ROOT, 'art/ref/raw'), os.path.join(ROOT, 'www/img/v2')
os.makedirs(OUT + '/units', exist_ok=True)

def scene(name, w, q):
    p = os.path.join(RAW, name + '.png')
    if not os.path.exists(p): return print('없음:', name)
    im = Image.open(p).convert('RGB'); W, H = im.size; h = round(W * 5 / 4); im = im.crop((0, (H - h) // 2, W, (H - h) // 2 + h)).resize((w, round(w * 5 / 4)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), quality=q); print(name, im.size)

def cut(sheet, cols, rows, names, size, sub='', pad=0.04):
    p = os.path.join(RAW, sheet + '.png')
    if not os.path.exists(p): return print('없음:', sheet)
    im = matte(Image.open(p).convert('RGB')); im = im[0] if isinstance(im, tuple) else im
    W, H = im.size; cw, ch = W / cols, H / rows
    for i, n in enumerate(names):
        if n == '-': continue
        c = im.crop((round(i % cols * cw), round(i // cols * ch), round((i % cols + 1) * cw), round((i // cols + 1) * ch)))
        bb = c.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
        if not bb: print('빈 칸:', n); continue
        c = c.crop(bb); k = size * (1 - pad * 2) / max(c.size); c = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS)
        o = Image.new('RGBA', (size, size), (0, 0, 0, 0)); o.paste(c, ((size - c.width) // 2, size - round(size * pad) - c.height), c)      # 발이 아래 가장자리에 오게(가로는 가운데)
        o.save(os.path.join(OUT, sub + n + '.webp'), quality=90)
    print(sheet, len(names))

scene('ground', 864, 84); scene('road', 720, 80)
cut('props', 4, 3, ['prop_' + n for n in 'tree bush mushroom rock acorns sign fence flowers stump sacks flag barrel'.split()], 192)
cut('enemies', 3, 2, ['enemy_' + n for n in 'normal fast armor elite boss scrap'.split()], 256)
for b in 'army navy marine sf air police'.split(): cut('units_' + b, 2, 2, [f'{b}_{c}' for c in 'inf art med sig'.split()], 256, 'units/')
