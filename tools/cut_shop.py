"""상점 그림 시트(4칸 × 3줄, 흰 바탕)를 물건 12개로 잘라 webp로 만든다.
사용: python3 -I tools/cut_shop.py <시트.png> <나갈 폴더>      (게임에 넣을 때: 나갈 폴더 = www/img/shop)
칸 순서: gem1 gem2 gem3 medal / ticket1 ticket5 bolt1 bolt5 / crate1 crate10 gift mascot"""
import sys, os
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import matte
NAMES = ['gem1', 'gem2', 'gem3', 'medal', 'ticket1', 'ticket5', 'bolt1', 'bolt5', 'crate1', 'crate10', 'gift', 'mascot']
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
im = matte(Image.open(src).convert('RGB')); im = im[0] if isinstance(im, tuple) else im
W, H = im.size; cw, ch = W / 4, H / 3; SIZE, PAD = 256, 0.05
for i, n in enumerate(NAMES):
    c = im.crop((round(i % 4 * cw), round(i // 4 * ch), round((i % 4 + 1) * cw), round((i // 4 + 1) * ch)))
    bb = c.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    if not bb: print('빈 칸:', n); continue
    c = c.crop(bb); k = SIZE * (1 - PAD * 2) / max(c.size); c = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS)
    o = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)); o.paste(c, ((SIZE - c.width) // 2, (SIZE - c.height) // 2), c); o.save(os.path.join(out, n + '.webp'), quality=90)
print(os.path.basename(src), '→', out)
