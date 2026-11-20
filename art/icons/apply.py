"""art/icons/raw 의 시트 3장을 잘라 게임에 넣는다: 표창 아이콘 18종 → www/img/cm, 재화 기호 · 대기실 버튼 · 하단 탭 · 메뉴 그림 → www/img/ic.
사용: python3 art/icons/apply.py"""
import os, subprocess, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); cut = lambda *a: subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools/cut_shop.py'), *a], check=True, cwd=ROOT)
cut('art/icons/raw/sheet_cm.png', 'www/img/cm', 'summon,luck,tile,depot,supply,elite,boss,crit,gamble,time,sell,medal', '192')
cut('art/icons/raw/sheet_misc.png', 'www/img/cm', 'b_army,b_navy,b_marine,b_sf,b_air,b_police,-,-,-,-,-,-', '192')
cut('art/icons/raw/sheet_misc.png', 'www/img/ic', '-,-,-,-,-,-,gem,coin,box,mission,trophy,record', '160')
cut('art/icons/raw/sheet_ui.png', 'www/img/ic', 'help,coop,nav_shop,nav_unit,nav_battle,nav_cm,nav_draw,sound,skin,mastery,upgrade,mute', '192')
for src, dst in [('ticket1', 'ticket'), ('bolt1', 'bolt'), ('medal', 'medal')]:      # 상점 그림에서 가져오는 기호
    Image.open(os.path.join(ROOT, 'www/img/shop', src + '.webp')).resize((160, 160), Image.LANCZOS).save(os.path.join(ROOT, 'www/img/ic', dst + '.webp'), quality=90)
print('끝')
