"""주둔지 건물 그림: art/raw_soft/bld_<id>.png 의 배경을 걷어 내고 www/img/bld_<id>.webp(384×384)로 만든다.
사용: python3 -I tools/cut_buildings.py   (그 뒤 python3 -I tools/apply_soft.py 가 manifest를 다시 만든다)"""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import matte, finish
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for bid in ['camp', 'up', 'summon', 'pick', 'elite']:
    src = os.path.join(ROOT, 'art/raw_soft', f'bld_{bid}.png')
    if not os.path.exists(src): print(bid, '원본 없음'); continue
    out, bg = matte(Image.open(src))
    im = finish(out, out.getchannel('A'), 384)
    im.save(os.path.join(ROOT, 'www/img', f'bld_{bid}.webp'), 'WEBP', quality=88, method=4)
    print(bid, f'배경 {bg * 100:.0f}%', im.size)
