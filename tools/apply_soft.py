"""art/raw_soft 의 원본을 잘라 게임(www/img)에 넣는다.  사용: python3 -I tools/apply_soft.py [미리보기 폴더] [--all]
 · 군별 기본 그림은 10병과가 모두 그려졌을 때만, 계급대 그림은 그 군별·계급대의 10병과가 모두 그려졌을 때만 넣는다
   (한 판 안에서, 한 계급대 안에서 그림이 섞이지 않게).
 · 적 그림(enemies_*.png)은 있는 대로 넣는다. title_keyart.png 가 있으면 title.webp(768×1152)로 바꾼다.
 · 넣은 시트는 art/soft_applied.json 에 적어 두고 다음에는 건너뛴다(--all 이면 전부 다시).
 · 끝으로 manifest.json 을 다시 만든다."""
import sys, os, re, json, shutil, tempfile
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cutsheet
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, IMG, LOG = os.path.join(ROOT, 'art/raw_soft'), os.path.join(ROOT, 'www/img'), os.path.join(ROOT, 'art/soft_applied.json')
args = [a for a in sys.argv[1:] if a != '--all']; prev = args[0] if args else None
applied = set() if '--all' in sys.argv or not os.path.exists(LOG) else set(json.load(open(LOG)))
groups, enemies = {}, []                      # (군별, 계급대) → [(시트, 병과A, 병과B)]
for f in sorted(os.listdir(RAW)):
    m = re.fullmatch(r'sheet_([a-z]+)_(?:(t\d)_)?([a-z-]+)__([a-z-]+)\.png', f)
    if m: groups.setdefault((m.group(1), m.group(2) or ''), []).append((f, m.group(3), m.group(4)))
    elif f.startswith('enemies_'): enemies.append(f)
todo, done, wait = [], [], []
for (b, t), sheets in sorted(groups.items()):
    n = len({k for _, k1, k2 in sheets for k in (k1, k2)})
    if n < 10: wait.append(f"{b}{'_' + t if t else ''} ({n}/10)"); continue
    new = [f for f, _, _ in sheets if f not in applied]
    if new: todo += new; done.append(b + ('_' + t if t else ''))
todo += [f for f in enemies if f not in applied]
tmp = tempfile.mkdtemp(prefix='soft_')
cutsheet.main(RAW, tmp, prev, only=set(todo))
for d in ('units', ''):
    src = os.path.join(tmp, d)
    for f in (os.listdir(src) if os.path.isdir(src) else []):
        if f.endswith('.webp'): shutil.copyfile(os.path.join(src, f), os.path.join(IMG, d, f))
shutil.rmtree(tmp)
title = os.path.join(RAW, 'title_keyart.png'); newtitle = os.path.exists(title) and 'title_keyart.png' not in applied
if newtitle: Image.open(title).convert('RGB').resize((768, 1152), Image.LANCZOS).save(os.path.join(IMG, 'title.webp'), 'WEBP', quality=80, method=6); todo.append('title_keyart.png')
json.dump(sorted(applied | set(todo)), open(LOG, 'w'), indent=0)
names = sorted(['units/' + f[:-5] for f in os.listdir(os.path.join(IMG, 'units')) if f.endswith('.webp')] + [f[:-5] for f in os.listdir(IMG) if f.startswith('enemy_') and f.endswith('.webp')])
json.dump(names, open(os.path.join(IMG, 'manifest.json'), 'w'))
print('이번에 넣음:', ', '.join(done) or '-', '· 적 시트', len([f for f in todo if f.startswith('enemies_')]), '· 타이틀', '교체' if newtitle else '-')
print('아직 덜 그려짐(넣지 않음):', ', '.join(wait) or '-'); print('manifest', len(names), '개')
