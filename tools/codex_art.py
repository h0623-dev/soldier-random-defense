"""Codex(OpenAI)의 그림 생성으로 art/jobs_soft.json 에서 아직 없는 그림을 이어 그린다.
사용: python3 tools/codex_art.py [동시에 몇 장=3] [최대 몇 장=전부] [지시문 파일=art/jobs_soft.json]
 · 먼저 이 기기에 Codex CLI가 깔려 있고 로그인돼 있어야 한다:  npm i -g @openai/codex  →  codex login --device-auth
   (ChatGPT 계정의 Codex 사용 한도에서 차감된다. 그림은 일반 작업보다 한도를 3~5배 빨리 쓴다.)
 · 그림마다 빈 임시 폴더에서 `codex exec`를 돌려 out.png를 받고, 크기를 확인한 뒤 jobs의 file 자리에 옮긴다.
 · 지시문에 "scene": true 가 있으면 흰 바탕을 요구하지 않는다(배경처럼 화면을 가득 채우는 그림).
 · 연달아 3장이 실패하면(대개 사용 한도) 멈춘다. 다시 돌리면 없는 그림부터 이어 간다.
 · 다 받은 뒤:  python3 -I tools/apply_soft.py <미리보기 폴더>  로 잘라서 게임에 넣는다."""
import sys, os, json, subprocess, tempfile, shutil, threading, time
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAR = int(sys.argv[1]) if len(sys.argv) > 1 else 3
LIMIT = int(sys.argv[2]) if len(sys.argv) > 2 else 10 ** 6
JOBS = sys.argv[3] if len(sys.argv) > 3 else 'art/jobs_soft.json'      # 세 번째 값으로 다른 지시문 파일(예: art/jobs_extra.json)
jobs = json.load(open(os.path.join(ROOT, JOBS)))
todo = [(i, j) for i, j in enumerate(jobs) if not os.path.exists(os.path.join(ROOT, j['file']))][:LIMIT]
print(f'남은 그림 {len(todo)}장 · 동시에 {PAR}장', flush=True)
lock, fails, stop = threading.Lock(), [0], threading.Event()

def run(item):
    i, j = item
    if stop.is_set(): return
    d = tempfile.mkdtemp(prefix=f'cx{i}_'); t0 = time.time(); why = ''
    ask = (f"$imagegen Generate one image exactly as described below, size {j['w']}x{j['h']}, and save it as out.png in the current working directory. "
           f"{'' if j.get('scene') else 'Keep the plain pure white background. '}Do not ask questions and do not create any other files. Description: {j['prompt']}")
    try:
        r = subprocess.run(['codex', 'exec', '--skip-git-repo-check', '--ephemeral', '--sandbox', 'workspace-write', ask], cwd=d, stdin=subprocess.DEVNULL,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=600, text=True)
        out = os.path.join(d, 'out.png')
        if r.returncode == 0 and os.path.exists(out):
            with Image.open(out) as im: ok = im.size[0] >= 768 and im.size[1] >= 768 and os.path.getsize(out) > 60000
            if ok: shutil.move(out, os.path.join(ROOT, j['file']))
            else: why = '그림이 너무 작거나 비어 있음'
        else: why = (r.stdout or '').strip().splitlines()[-1][:200] if (r.stdout or '').strip() else f'종료 코드 {r.returncode}'
    except subprocess.TimeoutExpired: why = '10분 넘게 걸림'
    except Exception as e: why = repr(e)[:200]
    shutil.rmtree(d, ignore_errors=True)
    with lock:
        if why: fails[0] += 1
        else: fails[0] = 0
        print(f"[{i}] {os.path.basename(j['file'])} — {'실패: ' + why if why else '완료'} ({time.time() - t0:.0f}초)", flush=True)
        if fails[0] >= 3: stop.set()

with ThreadPoolExecutor(PAR) as ex: list(ex.map(run, todo))
left = sum(1 for j in jobs if not os.path.exists(os.path.join(ROOT, j['file'])))
print(f"끝 — 아직 없는 그림 {left}장" + (' (연달아 실패해 멈춤 — 사용 한도일 수 있다)' if stop.is_set() else ''), flush=True)
