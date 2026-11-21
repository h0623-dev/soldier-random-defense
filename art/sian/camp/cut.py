"""주둔지 시안 시트(raw/<시안>.png, 3칸 × 2줄)를 건물 5채 + 바닥 판으로 잘라 cut/<시안>/ 에 둔다. 사용: python3 -I art/sian/camp/cut.py"""
import sys, os
from PIL import Image
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from cutout import matte
NAMES = ['camp', 'up', 'summon', 'pick', 'elite', 'base']
for f in sorted(os.listdir(HERE + '/raw')):
    k = f[:-4]; im = matte(Image.open(f'{HERE}/raw/{f}').convert('RGB')); im = im[0] if isinstance(im, tuple) else im
    W, H = im.size; cw, ch = W / 3, H / 2; cnt, lab, st, cen = cv2.connectedComponentsWithStats((np.array(im.getchannel('A')) > 24).astype(np.uint8), 8); os.makedirs(f'{HERE}/cut/{k}', exist_ok=True)
    for i, n in enumerate(NAMES):
        ids = [j for j in range(1, cnt) if st[j][4] >= 12 and min(2, int(cen[j][0] // cw)) == i % 3 and min(1, int(cen[j][1] // ch)) == i // 3]      # 이어진 덩어리 단위로(그림이 칸 경계를 조금 넘어도 잘리지 않게)
        if not ids: print('빈 칸:', k, n); continue
        c = im.copy(); c.putalpha(Image.fromarray((np.isin(lab, ids) * np.array(im.getchannel('A'))).astype(np.uint8))); c = c.crop(c.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox())
        if n != 'base':      # 건물: 정사각형 칸의 아래 가운데에(게임의 건물 그림과 같은 틀)
            s = max(c.size); o = Image.new('RGBA', (s, s), (0, 0, 0, 0)); o.paste(c, ((s - c.width) // 2, s - c.height), c); c = o.resize((320, 320), Image.LANCZOS)
        c.save(f'{HERE}/cut/{k}/{n}.webp', quality=90)
    print(k, 'ok')
