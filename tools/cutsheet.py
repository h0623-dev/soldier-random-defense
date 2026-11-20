"""여러 그림이 한 장에 든 시트를 잘라 게임용 그림으로 만든다.
사용: python3 -I tools/cutsheet.py <시트 폴더> <www/img 폴더> [미리보기 폴더]
  sheet_<군별>_<병과A>__<병과B>.png : 2×2 = [A 대기, A 공격 / B 대기, B 공격]
      → units/<군별>_<병과>.webp (256px, 대기)  +  units/<군별>_<병과>_atk.webp (512px, 공격)
      공격 그림은 대기 그림과 같은 배율이고, 대기 그림 자리가 아래 가운데(가로 128~384, 세로 256~512)에 오게 놓는다.
  enemies_<이름>__<이름>….png : 4종(2×2) 또는 2종(좌우) → enemy_<이름>.webp (256px)
자르는 선은 한가운데 근처에서 그림이 가장 적게 걸리는 줄을 찾아 정한다."""
import sys, os, re
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import matte, finish

BOX, PAD, ATK = 256, 0.04, 512

def split_at(mask, axis):
    """가운데 35~65% 사이에서 그림이 가장 적게 걸리는 줄. axis=0이면 가로줄(y)."""
    prof = mask.sum(1 - axis); n = len(prof); lo, hi = int(n * 0.35), int(n * 0.65)
    zero = np.where(prof[lo:hi] == 0)[0]
    if len(zero): return lo + int(zero[len(zero) // 2]), 0          # 빈 줄들의 가운데
    i = lo + int(np.argmin(prof[lo:hi])); return i, int(prof[i])

def bbox(mask):
    ys, xs = np.where(mask); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def feet_x(mask, box):
    """아래쪽 18% 높이에 있는 그림의 가로 중심 (발 위치)."""
    x0, y0, x1, y1 = box; band = mask[int(y1 - (y1 - y0) * 0.18):y1, x0:x1]
    cols = band.sum(0); return x0 + float((cols * np.arange(len(cols))).sum() / max(1, cols.sum()))

def pair(ii, mi, ia, ma):
    """대기·공격 한 쌍을 같은 배율로 만든다 → (대기 256px, 공격 512px, 경고). 좌표는 모두 원본 픽셀."""
    bi, ba = bbox(mi), bbox(ma)
    w, h = bi[2] - bi[0], bi[3] - bi[1]; side = max(w, h); pad = int(side * PAD); box = side + 2 * pad      # finish()와 같은 계산
    idle = finish(ii, Image.fromarray((mi * 255).astype(np.uint8)), BOX)
    fx_i = feet_x(mi, bi) - bi[0] + (side - w) // 2 + pad            # 대기 상자 안에서 발의 가로 위치
    cw = box * 2                                                     # 공격 캔버스: 대기 상자가 아래 가운데에 오는 2배 크기
    ox = int(round(box / 2 + fx_i - feet_x(ma, ba))); oy = cw - pad - ba[3]      # 발 위치와 바닥을 대기 그림에 맞춘다
    tmp = Image.new('RGBA', (cw * 3, cw * 3), (0, 0, 0, 0)); tmp.alpha_composite(ia, (cw + ox, cw + oy))
    clip = ox + ba[0] < 0 or ox + ba[2] > cw or oy + ba[1] < 0
    return idle, tmp.crop((cw, cw, cw * 2, cw * 2)).resize((ATK, ATK), Image.LANCZOS), ('공격 그림이 캔버스를 넘음' if clip else '')

def main(src_dir, img_dir, prev_dir=None):
    os.makedirs(os.path.join(img_dir, 'units'), exist_ok=True)
    for f in sorted(os.listdir(src_dir)):
        mu = re.fullmatch(r'sheet_([a-z]+)_([a-z-]+)__([a-z-]+)\.png', f); me = re.fullmatch(r'enemies_([a-z0-9_]+)\.png', f)
        if not mu and not me: continue
        img, bg = matte(Image.open(os.path.join(src_dir, f))); mask = np.asarray(img.getchannel('A')) > 24
        notes = []
        if me and len(me.group(1).split('__')) == 2:
            x, t = split_at(mask, 1); cells = [(0, 0, x, mask.shape[0]), (x, 0, mask.shape[1], mask.shape[0])]
            if t: notes.append(f'세로선에 그림 {t}px 걸림')
        else:
            y, t = split_at(mask, 0); cells = []
            if t: notes.append(f'가로선에 그림 {t}px 걸림')
            for ya, yb in ((0, y), (y, mask.shape[0])):
                x, t = split_at(mask[ya:yb], 1)
                if t: notes.append(f'세로선에 그림 {t}px 걸림')
                cells += [(0, ya, x, yb), (x, ya, mask.shape[1], yb)]
        parts = []
        for c in cells:
            sub = img.crop(c); m = np.asarray(sub.getchannel('A')) > 24
            if m.sum() < 2000: notes.append('빈 칸 있음')
            parts.append((sub, m))
        outs = []
        if mu:
            b = mu.group(1)
            for i, k in enumerate((mu.group(2), mu.group(3))):
                (ii, mi), (ia, ma) = parts[i * 2], parts[i * 2 + 1]
                idle, atk, warn = pair(ii, mi, ia, ma)
                if warn: notes.append(f'{k}: {warn}')
                idle.save(os.path.join(img_dir, 'units', f'{b}_{k}.webp'), 'WEBP', quality=88, method=4)
                atk.save(os.path.join(img_dir, 'units', f'{b}_{k}_atk.webp'), 'WEBP', quality=86, method=4)
                outs += [idle, atk]
        else:
            for (sub, m), name in zip(parts, me.group(1).split('__')):
                im = finish(sub, Image.fromarray((m * 255).astype(np.uint8)), BOX)
                im.save(os.path.join(img_dir, f'enemy_{name}.webp'), 'WEBP', quality=88, method=4); outs.append(im)
        if prev_dir:
            os.makedirs(prev_dir, exist_ok=True); sh = Image.new('RGBA', (len(outs) * 260, 260), (126, 166, 96, 255))
            for i, o in enumerate(outs): sh.alpha_composite(o.resize((256, 256)), (i * 260 + 2, 2))
            sh.convert('RGB').save(os.path.join(prev_dir, f[:-4] + '.jpg'), quality=85)
        print(f'{f}: 배경 {bg:.0%}' + ('  ← ' + ', '.join(notes) if notes else ''))

if __name__ == '__main__':
    main(*sys.argv[1:4])
