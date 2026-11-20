"""앱 아이콘 시안을 Codex로 그린다(바탕색이 있는 그림이라 tools/codex_art.py 대신 따로 둔다).
사용: python3 art/sian/icon/codex_icons.py   →  art/sian/icon/raw/icon_<a|b|c>.png (이미 있는 것은 건너뛴다)"""
import os, sys, subprocess, tempfile, shutil
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import contextlib, io
with contextlib.redirect_stdout(io.StringIO()): import soft_jobs as S
HEAD = ("A square mobile game app icon illustration, full-bleed: the colored background fills the whole square right to every edge and corner, with no rounded corners, no frame, no border, no device mockup. "
        "No text, no letters, no numbers, no logo. " + S.STYLE + ", but with bolder clean dark brown outlines and slightly brighter, more saturated colors so it reads clearly at a very small size. "
        "Round rosy pink blush on the cheeks, small oval dark brown eyes with a white highlight. ")
DOG = ("a cute anthropomorphic puppy soldier: a fluffy tan-and-cream Korean Jindo-style puppy with pointy ears poking out through the helmet, a black button nose and a cream muzzle, "
       "wearing a round helmet with an olive-brown woodland camouflage cover and chin strap and a matching olive-brown camouflage uniform")
TAIL = " The character has a thick dark brown outline and a thin cream-white sticker-style border around its silhouette, with a soft drop shadow. All important parts stay inside the central 70% of the square. Original character design, no insignia, no emblems, no flags."
ICONS = {
 'a': f"A big close-up portrait of {DOG}. Only the head and shoulders are shown, the head is very large and fills most of the icon, facing the viewer with a happy confident smile, the tip of a black rifle barely visible at the bottom. "
      "Background: bright sky blue, lighter in the center, with soft pale sunburst rays radiating from the center.",
 'b': f"A full-body view of {DOG} with a curled fluffy tail and dark brown boots, in a dynamic action pose aiming and firing a black rifle to the right with a bright orange-yellow star-shaped muzzle flash, determined expression with an open mouth. The character is large and centered. "
      "Background: warm orange, golden yellow in the center, with soft pale sunburst rays radiating from the center.",
 'c': f"Three cute animal soldier friends posing together, shown from the waist up. In the center and in front, the largest: {DOG}, smiling with an open mouth and holding a black rifle. "
      "Behind on the left: a chubby gray spotted seal pup with whiskers, wearing a white sailor cap with a navy blue band and a white sailor uniform with a navy blue collar. "
      "Behind on the right: a chubby Steller's sea eagle chick with dark chocolate-brown feathers, a white forehead patch and a very big bright orange-yellow hooked beak, wearing a navy blue police cap with a black brim and a light blue police shirt. "
      "Background: fresh green, lighter yellow-green in the center, with soft pale sunburst rays radiating from the center.",
}
def run(k):
    out = os.path.join(HERE, 'raw', f'icon_{k}.png')
    if os.path.exists(out): return k, '이미 있음'
    d = tempfile.mkdtemp(prefix='icon_')
    ask = ("$imagegen Generate one image exactly as described below, size 1024x1024, and save it as out.png in the current working directory. "
           "Do not ask questions and do not create any other files. Description: " + HEAD + ICONS[k] + TAIL)
    try:
        r = subprocess.run(['codex', 'exec', '--skip-git-repo-check', '--ephemeral', '--sandbox', 'workspace-write', ask], cwd=d, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=600, text=True)
        f = os.path.join(d, 'out.png')
        if r.returncode == 0 and os.path.exists(f): shutil.move(f, out); return k, '완료'
        return k, '실패: ' + ((r.stdout or '').strip().splitlines() or ['?'])[-1][:200]
    except Exception as e: return k, '실패: ' + repr(e)[:200]
    finally: shutil.rmtree(d, ignore_errors=True)
with ThreadPoolExecutor(3) as ex:
    for k, why in ex.map(run, ICONS): print(k, why, flush=True)
