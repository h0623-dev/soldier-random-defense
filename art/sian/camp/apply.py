"""고른 주둔지 시안(E 동물 직원, 2026-11-21 사용자 선택)을 게임에 넣는다. 사용: python3 -I art/sian/camp/cut.py && python3 -I art/sian/camp/apply.py
 · 건물 4채는 cut/e_staff/, 신병 소집 건물은 raw_e_hq.png(강아지를 뾰족 귀로 다시 그린 것) → www/img/bld_<이름>.webp (320×320, 아래 가운데 맞춤)
 · 바닥 판 → www/img/v2/camp_base.webp
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
b = Image.open(f'{HERE}/cut/e_staff/base.webp').convert('RGBA'); b = b.resize((720, round(b.height * 720 / b.width)), Image.LANCZOS); b.save(f'{ROOT}/www/img/v2/camp_base.webp', quality=88); print('base', b.size)
