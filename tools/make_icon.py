"""앱 아이콘을 만든다: 원본 한 장(1024px, 바탕이 네 귀퉁이까지 찬 그림) → Android 아이콘 · 웹 아이콘 · 스토어용 512px.
사용: python3 tools/make_icon.py [원본=art/icon_1024.png] [미리보기 파일]
 · Android 적응형 아이콘(8.0 이상)은 108dp 가운데 72dp만 보이고 기기마다 원·둥근 네모로 잘린다. 그래서 그림을 76%로 줄여 가운데 놓고 둘레는 바탕색으로 잇는다.
 · 옛 기기용 ic_launcher(둥근 네모) · ic_launcher_round(원)는 그림 전체를 쓴다.
 · 웹: www/img/icon-192.png · icon-512.png (index.html이 가리킨다). 스토어 등록용: art/store/icon_512.png"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art/icon_1024.png')
RES = os.path.join(ROOT, 'android/app/src/main/res/'); FG_SCALE = 0.76
im = Image.open(SRC).convert('RGB').resize((1024, 1024), Image.LANCZOS)

# 적응형 아이콘 앞면: 바탕(그림 가장자리 색 → 가운데 색) 위에 그림을 줄여 얹고 가장자리를 부드럽게 잇는다
a = np.asarray(im).astype(float); edge = np.concatenate([a[:12].reshape(-1, 3), a[:300, :12].reshape(-1, 3), a[:300, -12:].reshape(-1, 3)]); ecol = np.median(edge, 0)
N = 1024; yy, xx = np.mgrid[0:N, 0:N]; d = np.clip(np.hypot(xx - N / 2, yy - N / 2) / (N * 0.5), 0, 1)[..., None]
inner = np.median(a[60:200, 400:624].reshape(-1, 3), 0)
bg = Image.fromarray((inner * (1 - d) + ecol * d).astype('uint8'), 'RGB')
s = round(N * FG_SCALE); small = im.resize((s, s), Image.LANCZOS); m = Image.new('L', (s, s), 0); f = round(s * 0.05)
ImageDraw.Draw(m).rectangle([f, f, s - f - 1, s - f - 1], fill=255); m = m.filter(ImageFilter.GaussianBlur(f * 0.55))
fg = bg.copy(); fg.paste(small, ((N - s) // 2, (N - s) // 2), m)
bgcol = '#%02X%02X%02X' % tuple(int(v) for v in ecol)

def mask(kind, n=1024):
    k = Image.new('L', (n, n), 0); dr = ImageDraw.Draw(k)
    dr.ellipse([0, 0, n - 1, n - 1], fill=255) if kind == 'round' else dr.rounded_rectangle([0, 0, n - 1, n - 1], radius=round(n * 0.2), fill=255)
    return k
def legacy(kind): o = im.convert('RGBA'); o.putalpha(mask(kind)); return o
for dpi, n in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    d_ = RES + f'mipmap-{dpi}/'
    legacy('sq').resize((n, n), Image.LANCZOS).save(d_ + 'ic_launcher.png'); legacy('round').resize((n, n), Image.LANCZOS).save(d_ + 'ic_launcher_round.png')
    fg.resize((round(n * 2.25),) * 2, Image.LANCZOS).save(d_ + 'ic_launcher_foreground.png')
open(RES + 'values/ic_launcher_background.xml', 'w').write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{bgcol}</color>\n</resources>\n')
os.makedirs(os.path.join(ROOT, 'art/store'), exist_ok=True)
im.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'art/store/icon_512.png'))
for n in (192, 512): im.resize((n, n), Image.LANCZOS).save(os.path.join(ROOT, f'www/img/icon-{n}.png'), optimize=True)
print('바탕색', bgcol)
if len(sys.argv) > 2:      # 미리보기: 적응형 아이콘이 원 · 둥근 네모로 잘린 모습(가운데 72/108만 보인다)과 옛 기기용
    v = fg.crop((round(N * 1 / 6), round(N * 1 / 6), round(N * 5 / 6), round(N * 5 / 6))).resize((400, 400), Image.LANCZOS).convert('RGBA')
    P = Image.new('RGB', (4 * 440 + 40, 480), (44, 40, 38))
    for i, t in enumerate([('round', v), ('sq', v), ('sq', legacy('sq').resize((400, 400), Image.LANCZOS)), ('sq', v.resize((96, 96), Image.LANCZOS))]):
        o = t[1].copy(); o.putalpha(mask(t[0], o.width)); P.paste(o, (40 + i * 440, 40), o)
    P.save(sys.argv[2])
