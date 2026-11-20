"""그림 시트(4칸 × 3줄, 흰 바탕)를 물건 12개로 잘라 webp로 만든다. 상점 그림 · 표창 아이콘 · 재화 기호에 쓴다.
사용: python3 -I tools/cut_shop.py <시트.png> <나갈 폴더> [이름12개,쉼표로] [크기=256]
  이름을 안 주면 상점 순서: gem1 gem2 gem3 medal / ticket1 ticket5 bolt1 bolt5 / crate1 crate10 gift mascot.  이름이 '-'인 칸은 건너뛴다.
  상점: python3 -I tools/cut_shop.py art/sian/shop/raw/sheet_e_glossy.png www/img/shop      표창·기호: python3 art/icons/apply.py"""
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import matte
NAMES = ['gem1', 'gem2', 'gem3', 'medal', 'ticket1', 'ticket5', 'bolt1', 'bolt5', 'crate1', 'crate10', 'gift', 'mascot']
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
if len(sys.argv) > 3: NAMES = sys.argv[3].split(',')
im = matte(Image.open(src).convert('RGB')); im = im[0] if isinstance(im, tuple) else im
W, H = im.size; cw, ch = W / 4, H / 3; SIZE, PAD = int(sys.argv[4]) if len(sys.argv) > 4 else 256, 0.05
for i, n in enumerate(NAMES):
    if n == '-': continue
    c = im.crop((round(i % 4 * cw), round(i // 4 * ch), round((i % 4 + 1) * cw), round((i // 4 + 1) * ch)))
    a = np.array(c.getchannel('A')); on = a > 24; rows = on.sum(1); ys = np.where(rows > 0)[0]
    if len(ys):      # 물건에서 세로로 떨어져 있는 아주 작은 얼룩(전체의 0.5% 미만)은 지운다
        runs, s0, p0 = [], ys[0], ys[0]
        for y in list(ys[1:]) + [None]:
            if y is None or y - p0 > 1: runs.append((s0, p0, int(rows[s0:p0 + 1].sum()))); s0 = y
            p0 = y
        for s1, p1, n1 in runs:
            if n1 < on.sum() * 0.005: a[s1:p1 + 1] = 0
        c.putalpha(Image.fromarray(a))
    bb = c.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    if not bb: print('빈 칸:', n); continue
    c = c.crop(bb); k = SIZE * (1 - PAD * 2) / max(c.size); c = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS)
    o = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)); o.paste(c, ((SIZE - c.width) // 2, (SIZE - c.height) // 2), c); o.save(os.path.join(out, n + '.webp'), quality=90)
print(os.path.basename(src), '→', out)
