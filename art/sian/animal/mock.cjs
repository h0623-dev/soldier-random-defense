// 동물 시안을 실제 전장에 얹어 본다. 저장소 그림은 그대로 두고, 브라우저가 유닛 그림을 달라고 할 때만 시안 그림을 대신 준다
const { chromium } = require('playwright'); const fs = require('fs'); const D = __dirname + '/img/units/';   // 먼저: mkdir sheets && cp raw/sheet_*.png sheets/ && python3 -I ../../../tools/cutsheet.py sheets img
const HAVE = { army: ['inf', 'med', 'sig', 'inf-art'], police: ['inf', 'med', 'sig', 'art'] };
(async () => { const b = await chromium.launch();
  for (const [br, name] of [['army', '육군'], ['police', '의경']]) { const p = await b.newPage({ viewport: { width: 416, height: 579 }, deviceScaleFactor: 3 });
    await p.route(new RegExp('/img/units/' + br + '_[^/]*\\.webp'), r => { const m = r.request().url().match(/units\/[a-z]+_([a-z-]+?)(_t\d)?(_atk)?\.webp/); const t = HAVE[br].includes(m[1]) ? m[1] : HAVE[br][m[1].length % 4];
      r.fulfill({ body: fs.readFileSync(D + br + '_' + t + (m[3] || '') + '.webp'), contentType: 'image/webp' }); });
    await p.goto('http://localhost:8080/'); await p.waitForTimeout(1500); await p.click('text=출격'); await p.click(`.bcard:has-text("${name}")`); await p.waitForTimeout(3000);
    await p.evaluate((have) => { const g = window.__srd.game, C = window.__srd.C; g.gold = 1e9; g.nextWave = 2; const lv = [0,0,0,1,1,2,0,3,0,1,2,0,2,1,0,0,1,3,0,2];
      for (let i = 0; i < 20; i++) { const u = C.summon(g); if (!u) break; u.hidden = null; u.level = lv[i]; u.type = C.keyToType(have[i % 4].replace('-', '+')); u.stats = C.unitStats(g.branch, u.level, u.type, g.meta, g.up); } }, HAVE[br]);
    await p.waitForTimeout(6500); await p.screenshot({ path: __dirname + '/mock-' + br + '.png' }); await p.close(); }
  await b.close(); })();
