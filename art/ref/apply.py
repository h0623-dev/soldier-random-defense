"""기준 화면 그림(art/ref/raw/*.png)을 잘라 www/img/v2/ 에 넣는다. 사용: python3 -I art/ref/apply.py
 · ground · road(지역마다): 가운데를 4:5(전장 비율)로 잘라 줄인다.   · props(4×3) · enemies · bosses · units_<군별>(2×2) · mix_<군별>(3×2): 흰 바탕을 지우고 칸마다 잘라 정사각형 webp로.
 · 끝에 www/img/v2/manifest.json(그림 이름 목록)을 다시 쓴다 — 게임은 이 목록에 있는 그림만 읽고, 없는 것은 초원·기본 병과 그림으로 대신한다."""
import sys, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from cutout import matte
RAW, OUT = os.path.join(ROOT, 'art/ref/raw'), os.path.join(ROOT, 'www/img/v2')
os.makedirs(OUT + '/units', exist_ok=True)

def scene(name, w, q, out=None):
    p = os.path.join(RAW, name + '.png')
    if not os.path.exists(p): return
    im = Image.open(p).convert('RGB'); W, H = im.size; h = round(W * 5 / 4); im = im.crop((0, (H - h) // 2, W, (H - h) // 2 + h)).resize((w, round(w * 5 / 4)), Image.LANCZOS)
    im.save(os.path.join(OUT, (out or name) + '.webp'), quality=q); print(out or name, im.size)

def cut(sheet, cols, rows, names, size, sub='', pad=0.04):
    p = os.path.join(RAW, sheet + '.png')
    if not os.path.exists(p): return
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

THEMES = 'meadow beach desert snow city jungle volcano harbor airfield hq'.split()
MIX = 'inf-art inf-med inf-sig art-med art-sig med-sig'.split()
for th in THEMES:      # 지역마다: 땅 · 길 바닥 · 소품 12개(큰 것 b1~b6 · 작은 것 s1~s6). 초원은 1차 때 이름 없이 만든 파일(ground · road · props)을 쓴다
    src = '' if th == 'meadow' else '_' + th
    scene('ground' + src, 864, 84, 'ground_' + th); scene('road' + src, 720, 80, 'road_' + th)
    if th == 'meadow': cut('props', 4, 3, ['-' if n == '-' else 'prop_meadow_' + n for n in 'b1 b2 s1 b3 s2 s3 s4 s5 b4 b5 - b6'.split()], 192); cut('props', 4, 3, ['-'] * 10 + ['prop_flag'], 192)
    else: cut('props' + src, 4, 3, [f'prop_{th}_{n}' for n in 'b1 b2 b3 b4 b5 b6 s1 s2 s3 s4 s5 s6'.split()], 192)
cut('enemies', 3, 2, ['enemy_' + n for n in 'normal fast armor elite boss scrap'.split()], 256)
cut('bosses_a', 3, 2, ['enemy_boss%d' % n for n in range(2, 8)], 256); cut('bosses_b', 2, 2, ['enemy_boss8', 'enemy_boss9', 'enemy_boss10', 'enemy_dummy'], 256)
for b in 'army navy marine sf air police'.split():
    cut('units_' + b, 2, 2, [f'{b}_{c}' for c in 'inf art med sig'.split()], 256, 'units/'); cut('mix_' + b, 3, 2, [f'{b}_{m}' for m in MIX], 256, 'units/')
p = os.path.join(RAW, 'title.png')
if os.path.exists(p): Image.open(p).convert('RGB').resize((768, 1152), Image.LANCZOS).save(os.path.join(OUT, 'title.webp'), quality=84); print('title')
names = sorted(os.path.relpath(os.path.join(d, f), OUT)[:-5].replace(os.sep, '/') for d, _, fs in os.walk(OUT) for f in fs if f.endswith('.webp'))      # 게임이 읽을 그림 목록
import json; json.dump(names, open(os.path.join(OUT, 'manifest.json'), 'w')); print('목록', len(names))
