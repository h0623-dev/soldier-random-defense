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

def cut(sheet, cols, rows, names, size, sub='', pad=0.04, center=False):      # center: 칸 한가운데에 놓는다(효과처럼 돌려 찍는 그림). 아니면 발이 아래 가장자리에 오게
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
        o = Image.new('RGBA', (size, size), (0, 0, 0, 0)); o.paste(c, ((size - c.width) // 2, (size - c.height) // 2 if center else size - round(size * pad) - c.height), c)
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
# 공격 동작 2장(anim_<군별>_<1~4>: 열 = 병과, 위 = 준비 · 아래 = 발사) → units/<이름>_rdy.webp · <이름>_atk.webp (448×448 = 대기 그림의 1.75배 칸).
#  · 크기: 머리(가장 큰 둥근 덩어리)의 크기를 재서 대기 그림의 머리와 같아지게 줄인다 — 한 장 안에서도 캐릭터가 조금씩 다른 크기로 그려지고, 웅크리거나 벌려 선 자세는 키로는 맞출 수 없다.
#  · 자리: 머리 가운데가 대기 그림의 머리 가운데와 같은 가로 자리에 오게 놓는다 — 옆에 포·기관총이 생겨도 몸은 제자리다(전에는 그림 전체의 무게중심으로 놓아 몸이 옆으로 밀렸다). 발바닥은 대기 그림과 같은 높이.
#  · 칸 나누기는 이어진 덩어리 단위(옆 칸으로 넘어간 섬광·연기가 남의 그림에 끼지 않게).   필요: pip install opencv-python-headless
ANIM_SETS = [['inf', 'art', 'med'], ['sig', 'inf-art', 'inf-med'], ['inf-sig', 'art-med'], ['art-sig', 'med-sig']]
ASIZE, BASE, APAD = 448, 256, 0.04
def _flat(im):      # RGBA → 흰 바탕 BGR 배열
    bg = Image.new('RGB', im.size, (255, 255, 255)); bg.paste(im, mask=im.getchannel('A')); return np.array(bg)[:, :, ::-1].copy()
def _bbox(im): return im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
def _find(img, tpl, margin=60):      # img 안에서 tpl을 찾는다(둘레에 흰 여백을 덧대 가장자리에 걸친 것도 찾는다) → (점수, x, y)
    import cv2
    big = cv2.copyMakeBorder(img, margin, margin, margin, margin, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    if big.shape[0] < tpl.shape[0] or big.shape[1] < tpl.shape[1]: return -1, 0, 0
    r = cv2.matchTemplate(big, tpl, cv2.TM_CCOEFF_NORMED); _, sc, _, loc = cv2.minMaxLoc(r); return sc, loc[0] - margin, loc[1] - margin
def _head(im):      # 머리: 2등신 캐릭터에서 가장 크고 둥근 덩어리 → 위쪽 65%에서 '가장 큰 안쪽 원'의 반지름과 그 가운데의 가로 자리 (자세·표정·옆에 놓인 장비에 흔들리지 않는다)
    import cv2
    m = (np.array(im.getchannel('A')) > 24).astype(np.uint8); m[int(m.shape[0] * 0.65):] = 0
    d = cv2.distanceTransform(np.pad(m, 1), cv2.DIST_L2, 5)[1:-1, 1:-1]; r = float(d.max()); ys, xs = np.where(d >= r * 0.92)
    return r, float(xs.mean())
def segment(im, cols, rows):      # 시트를 칸으로 나눈다 → cell(열, 줄)
    # 격자로 자르면 옆 칸으로 넘어간 섬광·연기 조각이 남의 칸에 끼어든다 → 이어진 덩어리 단위로 주인을 정한다.
    #  칸마다 가장 큰 덩어리가 몸이고, 떨어져 있는 작은 덩어리(반짝이·날아가는 붕대·연기)는 같은 줄에서 가장 가까운 몸의 것으로 친다(동작이 오른쪽을 향하므로 왼쪽 몸을 2.5배 더 가깝게 친다).
    import cv2
    W, H = im.size; cw, ch = W / cols, H / rows
    al = (np.array(im.getchannel('A')) > 24).astype(np.uint8); cnt, lab, st, cen = cv2.connectedComponentsWithStats(al, 8)
    body = {}
    for j in range(1, cnt):
        key = (min(cols - 1, int(cen[j][0] // cw)), min(rows - 1, int(cen[j][1] // ch)))
        if key not in body or st[j][4] > st[body[key]][4]: body[key] = j
    owner = {j: key for key, j in body.items()}
    for j in range(1, cnt):
        if j in owner or st[j][4] < 12: continue
        row = min(rows - 1, int(cen[j][1] // ch)); x0, x1 = st[j][0], st[j][0] + st[j][2]; best = None
        for (c, r), bj in body.items():
            if r != row: continue
            b0, b1 = st[bj][0], st[bj][0] + st[bj][2]; gap = max(0, x0 - b1) if x0 >= b0 else max(0, b0 - x1) * 2.5 + 1
            if best is None or gap < best[0]: best = (gap, (c, r))
        if best: owner[j] = best[1]
    def cell(col, row):
        ids = [j for j, key in owner.items() if key == (col, row)]
        if not ids: return None
        c = im.copy(); c.putalpha(Image.fromarray((np.isin(lab, ids) * np.array(im.getchannel('A'))).astype(np.uint8))); bb = _bbox(c); c = c.crop(bb); c.left = bb[0] - round(col * cw); return c      # left: 제 칸 안에서의 가로 자리(준비·발사 장면의 자리를 견주는 데 쓴다)
    return cell
def place_anim(name, idle, rdy, act, log):      # 준비·발사 장면을 대기 그림(256칸)에 머리 크기·자리로 맞춰 448칸에 놓고 저장한다
    ib = _bbox(idle); ir, ix = _head(idle.crop(ib)); rr_, rx = _head(rdy); ar, ax = _head(act)
    k = ir / ((rr_ + ar) / 2); bad = abs(rr_ - ar) > 0.12 * rr_      # 머리 크기가 대기 그림과 같아지는 배율 (두 장면은 같은 배율)
    if bad: k = ir / rr_; ax = rx + (rdy.left - act.left)      # 발사 장면의 머리를 잘못 쟀으면(섬광·연기 덩어리) 준비 장면을 따르고, 자리는 칸 안에서의 자리대로
    left = ASIZE // 2 + (ib[0] + ix - BASE // 2)      # 대기 그림의 머리 가운데가 448칸에서 놓일 가로 자리 (대기 칸 가운데 = 448칸 가운데)
    for src, hx, suffix in ((rdy, rx, '_rdy'), (act, ax, '_atk')):
        im2 = src.resize((max(1, round(src.width * k)), max(1, round(src.height * k))), Image.LANCZOS)
        o = Image.new('RGBA', (ASIZE, ASIZE), (0, 0, 0, 0)); o.paste(im2, (round(left - hx * k), ASIZE - round(BASE * APAD) - im2.height), im2)
        o.save(os.path.join(OUT, 'units', name + suffix + '.webp'), quality=88)
    log.append(f'{name} ×{k:.2f}' + ('*' if bad else ''))
def _sheet(sheet):
    p = os.path.join(RAW, sheet + '.png')
    if not os.path.exists(p): return None
    im = matte(Image.open(p).convert('RGB')); return im[0] if isinstance(im, tuple) else im
def cut_anim(sheet, types, bname, log):      # 열 = 병과, 위 = 준비 · 아래 = 발사
    im = _sheet(sheet)
    if im is None: return
    cell = segment(im, len(types), 2)
    for i, t in enumerate(types):
        name = f'{bname}_{t}'; rdy, act = cell(i, 0), cell(i, 1)
        if not rdy or not act: print('빈 칸:', name); continue
        place_anim(name, Image.open(os.path.join(OUT, 'units', name + '.webp')).convert('RGBA'), rdy, act, log)
# 용사(hero_<용사>_<군별A>_<군별B>: 줄 = 동물, 칸 = 대기 · 준비 · 발사) → units/<군별>_hero_<용사>.webp(256) · _rdy · _atk(448)
def cut_hero(sheet, hid, pair, log):
    im = _sheet(sheet)
    if im is None: return
    cell = segment(im, 3, 2)
    for r, b in enumerate(pair):
        name = f'{b}_hero_{hid}'; c, rdy, act = cell(0, r), cell(1, r), cell(2, r)
        if not c or not rdy or not act: print('빈 칸:', name); continue
        k = BASE * (1 - APAD * 2) / max(c.size); c2 = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS)
        idle = Image.new('RGBA', (BASE, BASE), (0, 0, 0, 0)); idle.paste(c2, ((BASE - c2.width) // 2, BASE - round(BASE * APAD) - c2.height), c2)
        idle.save(os.path.join(OUT, 'units', name + '.webp'), quality=90); place_anim(name, idle, rdy, act, log)
alog = []
for b in 'army navy marine sf air police'.split():
    for si, ts in enumerate(ANIM_SETS): cut_anim(f'anim_{b}_{si + 1}', ts, b, alog)
for hid in 'storm phoenix hawk inferno frost marshal'.split():
    for pair in (('army', 'navy'), ('marine', 'sf'), ('air', 'police')): cut_hero(f'hero_{hid}_{pair[0]}_{pair[1]}', hid, pair, alog)
if alog: print('공격 동작', len(alog), '종 ·', ' | '.join(alog))
# 계급 장식 · 전투 표식/효과 · 결과 화면 그림
cut('ranks', 4, 3, ['rank_' + n for n in 'pennant banner_r banner_b cape sun laurel wings crown star star_s medal spark'.split()], 192)
cut('marks', 4, 3, 'mark_spd mark_rng mark_crit fx_boom fx_smoke fx_heal fx_bolt fx_ice fx_flame fx_coin fx_spark fx_stun'.split(), 160)
cut('result', 2, 2, 'ui_win ui_lose ui_clear ui_guide'.split(), 384)
# 6차: 사격 효과 · 상태 표시 · 등급 받침대 (모두 칸 한가운데에 놓는다)
cut('shots', 4, 3, 'shot_bullet shot_snipe shot_shell shot_mortar shot_band shot_gas shot_aim shot_wave fx_hit fx_ring fx_zap fx_dust'.split(), 160, center=True)
cut('status', 4, 3, 'st_ice st_slow st_bubble st_shield st_fire st_elite st_hero st_vuln fx_up fx_poof fx_dash fx_buff'.split(), 192, center=True)
cut('pedestals', 4, 2, ['ped_%d' % i for i in range(7)] + ['ped_hero'], 192, center=True)
# 아이콘(코드 기호였던 것) → www/img/ic,  스테이지·뽑기 그림 → v2
cut('icons2', 4, 3, ['../ic/' + n for n in 'play plus up arrow star enemy tent hand lock check retry home'.split()], 128, center=True)
cut('stageui', 4, 3, 'node node_on node_clear node_lock chest chest_open crate map warn bubble wreath signarrow'.split(), 192, center=True)
# 메뉴 창 틀 · 버튼: 여백 없이 내용만 잘라 둔다(CSS의 border-image로 가장자리는 그대로, 가운데만 늘여 쓴다)
def cut_tight(sheet, cols, rows, names, maxw):
    im = _sheet(sheet)
    if im is None: return
    cell = segment(im, cols, rows)      # 이어진 덩어리 단위로 나눈다(옆 칸으로 살짝 넘어간 조각이 섞이지 않게)
    for i, n in enumerate(names):
        c = cell(i % cols, i // cols)
        if c is None: print('빈 칸:', n); continue
        k = maxw / c.width; c = c.resize((maxw, max(1, round(c.height * k))), Image.LANCZOS); c.save(os.path.join(OUT, n + '.webp'), quality=92)
    print(sheet, len(names))
cut_tight('uikit', 4, 3, 'ui_btn_green ui_btn_gold ui_btn_blue ui_btn_red ui_btn_gray ui_btn_purple ui_panel ui_wood ui_ribbon ui_plaque ui_cardback ui_cardfront'.split(), 256)
p = os.path.join(RAW, 'title.png')
if os.path.exists(p): Image.open(p).convert('RGB').resize((768, 1152), Image.LANCZOS).save(os.path.join(OUT, 'title.webp'), quality=84); print('title')
# 크림색 버튼(기본 버튼): 회색 버튼의 밝기를 크림색으로 옮겨 만든다(윤곽선은 짙은 갈색 그대로)
_g = os.path.join(OUT, 'ui_btn_gray.webp')
if os.path.exists(_g):
    from PIL import ImageOps
    g = Image.open(_g).convert('RGBA'); c = ImageOps.colorize(g.convert('L'), black='#3a2410', mid='#ecd7a6', white='#fffdf5', blackpoint=45, midpoint=170, whitepoint=250).convert('RGBA'); c.putalpha(g.getchannel('A'))
    c.save(os.path.join(OUT, 'ui_btn_cream.webp'), quality=92)
names = sorted(os.path.relpath(os.path.join(d, f), OUT)[:-5].replace(os.sep, '/') for d, _, fs in os.walk(OUT) for f in fs if f.endswith('.webp'))      # 게임이 읽을 그림 목록
import json; json.dump(names, open(os.path.join(OUT, 'manifest.json'), 'w')); print('목록', len(names))
