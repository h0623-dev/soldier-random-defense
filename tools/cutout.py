"""생성한 캐릭터 그림(흰 배경)을 게임용 투명 배경 그림으로 바꾼다.
사용: python3 -I tools/cutout.py <원본 폴더> <출력 폴더> [크기=256]
가장자리에서 이어진 밝은 무채색(흰 배경·바닥 그림자)만 지우므로 흰 군복처럼 선 안쪽의 흰색은 남는다."""
import sys, os
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

def finish(out, alpha, size):
    box = alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
    out = out.crop(box); side = max(out.size); pad = int(side * 0.04)
    sq = Image.new('RGBA', (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
    sq.paste(out, ((side - out.width) // 2 + pad, side - out.height + pad))    # 발을 바닥에 맞춤
    return sq.resize((size, size), Image.LANCZOS)

def matte(src):
    """그림의 배경을 투명하게 만든 RGBA 그림과 배경 비율을 돌려준다 (자르거나 줄이지 않는다)."""
    if src.mode == 'RGBA':                       # 이미 배경이 투명한 그림은 그대로 쓴다 (가장자리 대부분이 투명할 때)
        al = np.asarray(src.getchannel('A')); edge = np.concatenate([al[0], al[-1], al[:, 0], al[:, -1]])
        if (edge < 16).mean() > 0.9: return src, float((al < 16).mean())
    im = src.convert('RGB'); a = np.asarray(im).astype(np.int16)
    h, w, _ = a.shape
    mn, mx = a.min(2), a.max(2)
    bgish = (mn > 196) & (mx - mn < 26)          # 밝고 색이 거의 없는 픽셀
    seen = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgish[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bgish[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and bgish[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
    alpha = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))   # 흰 테두리 줄이기
    out = im.convert('RGBA'); out.putalpha(alpha)
    return out, float(seen.mean())

def cutout(path, size):
    out, bg = matte(Image.open(path))
    return finish(out, out.getchannel('A'), size), bg

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]; size = int(sys.argv[3]) if len(sys.argv) > 3 else 256
    os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith(('.webp', '.png', '.jpg')): continue
        img, bg = cutout(os.path.join(src, f), size)
        img.save(os.path.join(dst, os.path.splitext(f)[0] + '.webp'), 'WEBP', quality=88, method=6)
        print(f'{f}: 배경 {bg:.0%}' + ('  ← 배경 제거 확인 필요' if bg < 0.25 or bg > 0.85 else ''))
