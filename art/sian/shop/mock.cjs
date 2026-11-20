// 상점 그림 시안 5가지를 실제 상점 화면에 얹어 본다 (그림 요청을 가로채 시안 그림을 준다 — www/는 그대로)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const k of ['none', 'a_soft', 'b_bold', 'c_clay', 'd_pixel', 'e_glossy']) { const p = await b.newPage({ viewport: { width: 412, height: 1500 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('srd_meta_v1', JSON.stringify({ medals: 40, tickets: 3, gems: 400 })); } catch {} });
    if (k !== 'none') await p.route(/\/img\/shop\/[a-z0-9]+\.webp/, r => { const f = __dirname + '/shop/' + k + '/' + r.request().url().split('/').pop(); fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: 'image/webp' }) : r.abort(); });
    await p.goto('http://localhost:8080/'); await p.waitForTimeout(1800); await p.click('.nav5 [data-act="shop"]'); await p.waitForTimeout(900);
    await p.screenshot({ path: `${__dirname}/shopmock-${k}.png` }); await p.close(); }
  console.log('오류', errs.length, errs.slice(0, 3)); await b.close(); })();
