// 주둔지(건물 줄)가 화면 아래에서 잘리는지: 여러 화면 크기 × 위쪽 여백(상태 표시줄 자리)으로 잰다.  사용: npm run serve 를 띄운 뒤  node tests/fit.cjs [가로x세로]
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const bad = [];
  const sizes = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[416, 657], [416, 620], [360, 640], [360, 600], [384, 700], [412, 760], [393, 852], [320, 568], [480, 720], [600, 960], [844, 390]];
  for (const [w, h] of sizes) for (const top of [0, 37]) { const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    if (top) await p.addInitScript(t => { const st = document.createElement('style'); st.textContent = `#app { padding-top: ${t}px !important; }`; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st)); }, top);
    await p.goto('http://localhost:8080/'); await p.waitForTimeout(1500); await p.click('.lplay'); await p.click('[data-act="start"]'); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const vh = window.innerHeight, q = s => document.querySelector(s).getBoundingClientRect(), signs = [...document.querySelectorAll('.bld .sign')].map(x => x.getBoundingClientRect().bottom), a = q('#actions'), f = q('#field');
      return { vh, signBottom: Math.round(Math.max(...signs)), actBottom: Math.round(a.bottom), actH: Math.round(a.height), field: Math.round(f.width) + 'x' + Math.round(f.height), short: document.getElementById('app').className, bs: getComputedStyle(document.documentElement).getPropertyValue('--bs'), rem: getComputedStyle(document.documentElement).fontSize }; });
    const cut = r.signBottom > r.vh - 1; if (cut) bad.push(`${w}x${h}+${top}`);
    console.log(`${w}x${h} 위 여백 ${top}: 전장 ${r.field} 주둔지 높이 ${r.actH} 간판 아래 ${r.signBottom}/${r.vh} ${cut ? '← 잘림 ' + (r.signBottom - r.vh) + 'px' : 'OK'} [${r.short}] bs${r.bs} rem ${r.rem}`);
    await p.close(); }
  console.log('잘린 화면', bad.length, bad.join(' ')); await b.close(); })();
