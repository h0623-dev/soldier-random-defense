// 주둔지 시안을 실제 게임 화면(사용자 기기 크기 416×657)에 얹어 찍는다. 게임 코드는 바꾸지 않는다(화면에서만 그림을 갈아 끼운다).
//  먼저: python3 -m http.server 8080 -d www  ·  python3 -m http.server 8091 -d art/sian/camp/cut     사용: node art/sian/camp/mock.cjs <나갈 폴더>
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname, KS = ['now', 'a_forest', 'b_logfort', 'c_toy', 'd_button', 'e_staff'];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 416, height: 657 }, deviceScaleFactor: 3 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { const st = document.createElement('style'); st.textContent = '#app{padding-top:37px !important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st)); });
  await p.goto('http://localhost:8080/'); await p.waitForTimeout(1800); await p.click('.lplay'); await p.click('[data-act="start"]'); await p.waitForTimeout(2600);
  await p.evaluate(() => { const g = window.__srd.game, C = window.__srd.C; g.gold = 900; g.nextWave = 999; for (let i = 0; i < 6; i++) C.summon(g); g.gold = 260; }); await p.waitForTimeout(600);
  for (const k of KS) {
    if (k !== 'now') await p.evaluate(k => { const base = `http://localhost:8091/${k}/`;
      for (const [id, n] of [['b-camp', 'camp'], ['b-up', 'up'], ['b-summon', 'summon'], ['b-pick', 'pick'], ['b-elite', 'elite']]) document.querySelector(`#${id} img.bimg`).src = base + n + '.webp';
      let st = document.getElementById('sian'); if (!st) { st = document.createElement('style'); st.id = 'sian'; document.head.appendChild(st); }
      st.textContent = `.v2 .blds { background: url(${base}base.webp) center bottom / 100% ${k === 'd_button' ? '78%' : '100%'} no-repeat !important; border: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
        .bld img.bimg, .bld.main img.bimg { max-width: calc(${k === 'd_button' ? 7.4 : 8.6}rem * var(--bs, 1)) !important; } .bld.main img.bimg { max-width: calc(${k === 'd_button' ? 9.6 : 11.5}rem * var(--bs, 1)) !important; } .blds { padding-top: 1.4rem !important; }
        .bld img.bimg { animation: none !important; filter: drop-shadow(0 0.3rem 0.2rem rgba(40,25,10,.35)) !important; }`; }, k);
    await p.waitForTimeout(1200); const box = await p.locator('#actions').boundingBox();
    await p.screenshot({ path: `${OUT}/camp-${k}.png`, clip: { x: 0, y: box.y, width: 416, height: box.height } }); if (k === 'a_forest' || k === 'now') await p.screenshot({ path: `${OUT}/campfull-${k}.png` }); }
  console.log('오류', errs.length, errs.slice(0, 3)); await b.close(); })();
