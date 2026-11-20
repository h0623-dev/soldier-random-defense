"""아직 그리지 않은 그림의 지시문을 사람이 다른 그림 AI(젠스파크 등)에 붙여 넣기 좋게 정리한다 → art/genspark/
사용: python3 tools/make_genspark.py    (art/jobs_soft.json 중 art/raw_soft 에 파일이 없는 것만 담는다)"""
import json, os, re, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(ROOT, 'art/genspark'); os.makedirs(OUT, exist_ok=True)
jobs = [dict(j, n=i) for i, j in enumerate(json.load(open(os.path.join(ROOT, 'art/jobs_soft.json'))))]
todo = [j for j in jobs if not os.path.exists(os.path.join(ROOT, j['file']))]
BR = {'army': '육군', 'navy': '해군', 'marine': '해병대', 'sf': '특공대', 'air': '공군', 'police': '의경'}
TI = {'t1': '부사관급', 't2': '위관급', 't3': '영관급', 't4': '장성급'}
KO = {'inf': '보병', 'art': '포병', 'med': '의무', 'sig': '통신', 'inf-art': '보+포', 'inf-med': '보+의', 'inf-sig': '보+통', 'art-med': '포+의', 'art-sig': '포+통', 'med-sig': '의+통'}
def info(j):
    """(묶음 이름, 설명, 함께 올릴 참고 그림)"""
    f = os.path.basename(j['file'])
    m = re.fullmatch(r'sheet_([a-z]+)_(?:(t\d)_)?([a-z-]+)__([a-z-]+)\.png', f)
    if m:
        b, t, k1, k2 = m.groups(); what = f'{KO[k1]} · {KO[k2]} (각각 대기 + 공격)'
        if t: return f'{BR[b]} {TI[t]} 계급대 ({b} {t})', what, f'이 묶음의 첫 장을 만든 뒤에는 그 그림을 참고로 올린다 (첫 장은 reference/sheet_{b}_inf__art.png)'
        return f'{BR[b]} 기본 그림 ({b})', what, f'reference/sheet_{b}_inf__art.png, reference/sheet_{b}_med__sig.png'
    if f.startswith('enemies_'): return '적 · 보스', ', '.join(f[8:-4].split('__')), 'reference/enemies_boss__boss2__boss3__boss4.png'
    return '타이틀 일러스트', '세로 2:3 한 장', 'reference/sheet_army_inf__inf-art.png, reference/sheet_navy_inf__art.png'
groups = []
for j in todo:
    g, what, ref = info(j)
    if not groups or groups[-1][0] != g: groups.append((g, ref, []))
    groups[-1][2].append((j, what))
md = [f'# 그림 지시문 — 남은 {len(todo)}장\n\n지시문은 영어 그대로 붙여 넣는다. 그림 1장 = 지시문 1개. 저장할 때는 적힌 **파일 이름 그대로**.\n']
rows = []
for g, ref, items in groups:
    md.append(f'\n## {g} — {len(items)}장\n\n함께 올릴 참고 그림: {ref}\n')
    rows.append(f'<h2>{html.escape(g)} <small>{len(items)}장</small></h2><p class="ref">함께 올릴 참고 그림: {html.escape(ref)}</p>')
    for j, what in items:
        f = os.path.basename(j['file']); size = f"{j['w']}×{j['h']}"
        md.append(f"### {j['n']}. `{f}` — {what} · {size}\n```\n{j['prompt']}\n```\n")
        rows.append(f'<div class="job" data-f="{f}"><div class="head"><label><input type="checkbox"> <b>{j["n"]}.</b> <code>{f}</code></label><span>{html.escape(what)} · {size}</span>'
                    f'<button data-copy="name">파일 이름 복사</button><button class="main" data-copy="prompt">지시문 복사</button></div><pre>{html.escape(j["prompt"])}</pre></div>')
open(os.path.join(OUT, 'prompts.md'), 'w').write(''.join(md))
open(os.path.join(OUT, 'checklist.txt'), 'w').write('\n'.join(os.path.basename(j['file']) for j in todo) + '\n')
open(os.path.join(OUT, 'prompts.html'), 'w').write('''<!DOCTYPE html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>군인 랜덤 디펜스 — 그림 지시문</title>
<style>body{font-family:system-ui,"Malgun Gothic",sans-serif;max-width:920px;margin:0 auto;padding:16px;background:#fbf5e6;color:#2b2118}h1{font-size:22px}h2{margin:34px 0 4px;font-size:19px;border-top:3px solid #2b2118;padding-top:14px}h2 small{color:#7b6a55;font-weight:400}
.ref{margin:0 0 10px;color:#7b6a55;font-size:13px}.bar{position:sticky;top:0;background:#2b2118;color:#fff;padding:10px 14px;border-radius:10px;z-index:2;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.job{background:#fff;border:2px solid #2b2118;border-radius:12px;margin:10px 0;padding:10px 12px}.job.done{opacity:.45}.head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.head span{color:#7b6a55;font-size:13px;flex:1}
button{font:inherit;border:2px solid #2b2118;border-radius:8px;padding:6px 10px;background:#fff;cursor:pointer}button.main{background:#5fd35a;font-weight:700}button.ok{background:#ffd45e}
pre{white-space:pre-wrap;font-size:12px;line-height:1.45;background:#f4ecd8;border-radius:8px;padding:8px;margin:8px 0 0;max-height:7.5em;overflow:auto}code{font-size:13px}label{cursor:pointer}</style>
<h1>군인 랜덤 디펜스 — 그림 지시문 (남은 ''' + str(len(todo)) + '''장)</h1>
<p>① 참고 그림을 올리고 ② <b>지시문 복사</b>를 눌러 그림 AI에 붙여 넣고 ③ 나온 그림을 <b>파일 이름 복사</b>로 복사한 이름으로 저장한 뒤 ④ 체크합니다. 체크는 이 브라우저에 저장됩니다.</p>
<div class="bar"><b id="cnt"></b><label><input type="checkbox" id="hide"> 끝낸 것 숨기기</label></div>
''' + '\n'.join(rows) + '''
<script>
const K='srd-genspark-done', done=new Set(JSON.parse(localStorage.getItem(K)||'[]')), jobs=[...document.querySelectorAll('.job')], hide=document.getElementById('hide');
function paint(){ let n=0; for(const j of jobs){ const d=done.has(j.dataset.f); n+=d; j.classList.toggle('done',d); j.querySelector('input').checked=d; j.style.display=d&&hide.checked?'none':''; }
  document.getElementById('cnt').textContent='끝낸 그림 '+n+' / '+jobs.length; localStorage.setItem(K,JSON.stringify([...done])); }
document.addEventListener('change',e=>{ const j=e.target.closest('.job'); if(j){ e.target.checked?done.add(j.dataset.f):done.delete(j.dataset.f); } paint(); });
document.addEventListener('click',async e=>{ const b=e.target.closest('button[data-copy]'); if(!b) return; const j=b.closest('.job'), t=b.dataset.copy==='name'?j.dataset.f:j.querySelector('pre').textContent;
  try{ await navigator.clipboard.writeText(t); }catch{ const a=document.createElement('textarea'); a.value=t; document.body.append(a); a.select(); document.execCommand('copy'); a.remove(); }
  const o=b.textContent; b.textContent='복사됨'; b.classList.add('ok'); setTimeout(()=>{ b.textContent=o; b.classList.remove('ok'); },900); });
paint();
</script></html>''')
print(len(todo), '장 ·', len(groups), '묶음'); [print(' ', g, len(it)) for g, _, it in groups]
