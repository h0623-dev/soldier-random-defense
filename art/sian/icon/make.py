"""앱 아이콘 시안(적용하지 않음). 새로 그리지 않고 동물 시안 그림(art/sian/animal/raw)을 오려 만든다.
사용: python3 art/sian/icon/make.py   →  art/sian/icon/icon_a.png · icon_b.png · icon_c.png (512px) + preview.png
 A 얼굴: 강아지 병사 얼굴 크게 / B 사격: 총 쏘는 강아지 / C 전우: 물범 · 강아지 · 참수리 셋"""
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from cutout import matte
RAW = os.path.join(ROOT, 'art/sian/animal/raw/'); S = 1024      # 크게 만들어 512로 줄인다

def figure(file, box):
    """시트에서 box 범위의 그림 하나를 배경 없이 꺼낸다(내용이 있는 범위로 자른다)."""
    im = matte(Image.open(RAW + file).convert('RGB')); im = im[0] if isinstance(im, tuple) else im
    im = im.crop(box); return im.crop(im.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox())

def rays(c0, c1, ray, n=14):
    """가운데가 밝은 둥근 바탕 + 옅은 햇살."""
    yy, xx = np.mgrid[0:S, 0:S]; d = np.hypot(xx - S / 2, yy - S * 0.52) / (S * 0.72); d = np.clip(d, 0, 1)[..., None]
    bg = Image.fromarray((np.array(c0) * (1 - d) + np.array(c1) * d).astype('uint8'), 'RGB').convert('RGBA')
    lay = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dr = ImageDraw.Draw(lay)
    for i in range(n):
        a0 = i * 2 * math.pi / n; a1 = a0 + math.pi / n
        dr.polygon([(S / 2, S * 0.52), (S / 2 + math.cos(a0) * S * 1.5, S * 0.52 + math.sin(a0) * S * 1.5), (S / 2 + math.cos(a1) * S * 1.5, S * 0.52 + math.sin(a1) * S * 1.5)], fill=ray)
    return Image.alpha_composite(bg, lay)

def put(bg, fig, h, cx, top, line=14, white=12):
    """그림을 높이 h로 줄여 (가운데 cx, 위 top)에 놓는다. 둘레에 짙은 갈색 선과 흰 테두리, 아래에 그림자."""
    w = round(fig.width * h / fig.height); f = fig.resize((w, round(h)), Image.LANCZOS)
    pad = line + white + 30; lay = Image.new('RGBA', (w + pad * 2, round(h) + pad * 2), (0, 0, 0, 0)); lay.paste(f, (pad, pad), f)
    a = lay.getchannel('A'); grow = lambda r: a.filter(ImageFilter.MaxFilter(r * 2 + 1)).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new('RGBA', lay.size, (0, 0, 0, 0))
    sh = Image.new('RGBA', lay.size, (40, 24, 10, 0)); sh.putalpha(grow(line + white).filter(ImageFilter.GaussianBlur(10)).point(lambda v: v * 0.55)); out.alpha_composite(sh, (0, 14))
    if white: wl = Image.new('RGBA', lay.size, (255, 250, 236, 0)); wl.putalpha(grow(line + white)); out.alpha_composite(wl)
    bl = Image.new('RGBA', lay.size, (56, 34, 15, 0)); bl.putalpha(grow(line)); out.alpha_composite(bl); out.alpha_composite(lay)
    bg.alpha_composite(out, (round(cx - out.width / 2), round(top - pad)))

def frame(im):
    """안쪽 테두리(밝은 선)로 마무리하고 512로 줄인다."""
    dr = ImageDraw.Draw(im); dr.rounded_rectangle([14, 14, S - 15, S - 15], radius=200, outline=(255, 255, 255, 70), width=10)
    return im.resize((512, 512), Image.LANCZOS)

dog = figure('sheet_army_inf__inf-art.png', (0, 0, 512, 512)); dog_fire = figure('sheet_army_inf__inf-art.png', (512, 0, 1024, 512))
L = Image.open(RAW + 'lineup.png'); lw = L.width / 6
seal, eagle, dog2 = [figure('lineup.png', (round(i * lw), 0, round((i + 1) * lw), L.height)) for i in (1, 5, 0)]

a = rays((150, 222, 255), (38, 132, 214), (255, 255, 255, 34)); put(a, dog, 1480, S / 2 + 20, 70); frame(a).save(HERE + '/icon_a.png')
b = rays((255, 226, 120), (240, 120, 40), (255, 255, 255, 46)); put(b, dog_fire, 880, S / 2 - 10, 96); frame(b).save(HERE + '/icon_b.png')
c = rays((190, 232, 130), (70, 150, 70), (255, 255, 255, 36))
put(c, seal, 940, S * 0.2, 250, 12, 0); put(c, eagle, 940, S * 0.8, 250, 12, 0); put(c, dog2, 1180, S / 2, 150); frame(c).save(HERE + '/icon_c.png')

# 미리보기: 둥근 네모(기기 화면) · 원(일부 기기) · 작은 크기(홈 화면에서 보이는 크기)
P = Image.new('RGB', (3 * 600 + 40, 1010), (44, 40, 38)); dr = ImageDraw.Draw(P)
def masked(im, kind, size):
    m = Image.new('L', (512, 512), 0); d = ImageDraw.Draw(m)
    d.ellipse([0, 0, 511, 511], fill=255) if kind == 'circle' else d.rounded_rectangle([0, 0, 511, 511], radius=112, fill=255)
    o = im.copy(); o.putalpha(m); return o.resize((size, size), Image.LANCZOS)
for i, n in enumerate('abc'):
    im = Image.open(HERE + f'/icon_{n}.png').convert('RGBA'); x = 40 + i * 600
    for k, (kind, size, pos) in enumerate([('sq', 512, (x, 40)), ('circle', 300, (x, 600)), ('sq', 144, (x + 340, 600)), ('sq', 96, (x + 340, 770))]):
        t = masked(im, kind, size); P.paste(t, pos, t)
P.save(HERE + '/preview.png')
