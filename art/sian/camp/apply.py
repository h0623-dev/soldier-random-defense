"""고른 주둔지 시안(E 동물 직원, 2026-11-21 사용자 선택)을 게임에 넣는다. 사용: python3 -I art/sian/camp/cut.py && python3 -I art/sian/camp/apply.py
 · 건물 4채는 cut/e_staff/, 신병 소집 건물은 raw_e_hq.png(강아지를 뾰족 귀로 다시 그린 것) → www/img/bld_<이름>.webp (320×320, 아래 가운데 맞춤)
 · 바닥 판(지역 10곳) → www/img/v2/camp_<지역>.webp (지시문 bases.py)
 · 둘러싸인 흰 바탕을 따로 지우는 단계는 두지 않는다 — 이 시안은 그런 곳이 없고, 순백을 지우면 캐릭터의 흰 얼굴·접시 안테나까지 뚫린다(한 번 그랬다)"""
import sys, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from cutout import matte
def square(c, size=320):
    c = c.crop(c.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()); s = max(c.size)
    o = Image.new('RGBA', (s, s), (0, 0, 0, 0)); o.paste(c, ((s - c.width) // 2, s - c.height), c); return o.resize((size, size), Image.LANCZOS)
for n in ['camp', 'up', 'pick', 'elite']:
    Image.open(f'{HERE}/cut/e_staff/{n}.webp').convert('RGBA').save(f'{ROOT}/www/img/bld_{n}.webp', quality=90)
hq = matte(Image.open(f'{HERE}/raw_e_hq.png').convert('RGB')); hq = hq[0] if isinstance(hq, tuple) else hq
square(hq).save(f'{ROOT}/www/img/bld_summon.webp', quality=90)
# 바닥 판: 지역마다 한 장(raw_bases_1 · 2, 2칸 × 3줄에 5종씩 — 순서는 bases_order.json) → www/img/v2/camp_<지역>.webp. 이어진 덩어리 단위로 자른다
import json, numpy as np, cv2
for i, part in enumerate(json.load(open(f'{HERE}/bases_order.json'))):
    im = matte(Image.open(f'{HERE}/raw_bases_{i + 1}.png').convert('RGB')); im = im[0] if isinstance(im, tuple) else im
    W, H = im.size; cw, ch = W / 2, H / 3; cnt, lab, st, cen = cv2.connectedComponentsWithStats((np.array(im.getchannel('A')) > 24).astype(np.uint8), 8)
    for j, th in enumerate(part):
        ids = [q for q in range(1, cnt) if st[q][4] >= 12 and min(1, int(cen[q][0] // cw)) == j % 2 and min(2, int(cen[q][1] // ch)) == j // 2]
        c = im.copy(); c.putalpha(Image.fromarray((np.isin(lab, ids) * np.array(im.getchannel('A'))).astype(np.uint8))); c = c.crop(c.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
        c = c.resize((720, round(c.height * 720 / c.width)), Image.LANCZOS); c.save(f'{ROOT}/www/img/v2/camp_{th}.webp', quality=88); print('camp_' + th, c.size)
