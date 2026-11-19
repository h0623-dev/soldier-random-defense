// 기기 화면 크기별 자동 맞춤 검사 (Playwright 필요, CI에서는 돌리지 않음)
// 사용: npm run serve 를 띄운 뒤  node tests/screens.cjs <스크린샷 폴더>
const { chromium } = require('playwright');
const DEV = [
  // [이름, CSS 폭, 높이]  (기기 논리 해상도)
  ['iPhone SE 1세대', 320, 568], ['iPhone SE 2·3세대', 375, 667], ['iPhone 13 mini', 375, 812],
  ['iPhone 14·15·16', 390, 844], ['iPhone 16 Pro', 402, 874], ['iPhone 16 Pro Max', 440, 956], ['iPhone 15 Plus', 430, 932],
  ['Galaxy A 보급형', 360, 640], ['Galaxy S22·S23·S24', 360, 780], ['Galaxy S24+ · S25', 384, 832], ['Galaxy S24 Ultra', 412, 915],
  ['Galaxy Z Flip6', 360, 880], ['Galaxy Z Fold6 커버', 344, 882], ['Galaxy Z Fold6 펼침', 768, 884],
  ['Galaxy Tab A9 세로', 600, 960], ['Galaxy Tab S9 세로', 800, 1280], ['Galaxy Tab S9 가로', 1280, 800],
  ['iPad mini 세로', 744, 1133], ['iPad 10세대 세로', 820, 1180], ['iPad Pro 12.9 세로', 1024, 1366], ['iPad Pro 12.9 가로', 1366, 1024],
  ['iPhone 가로', 844, 390], ['PC 창', 1280, 720],
];
(async () => {
  const out = process.argv[2], tag = process.argv[3] || '';
  const b = await chromium.launch(); let bad = 0;
  for (const [name, w, h] of DEV) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && !/favicon/.test(m.text()) && errs.push(m.text()));
    await p.goto('http://localhost:8080/'); await p.click('text=출격'); await p.click('text=육군');
    await p.evaluate(() => { const g = window.__srd.game, C = window.__srd.C; g.gold = 5000; for (let i = 0; i < 9; i++) C.summon(g); });
    const fb = await p.locator('#field').boundingBox();
    await p.mouse.click(fb.x + fb.width * 160 / 720, fb.y + fb.height * 150 / 700); await p.waitForTimeout(250);
    const m = await p.evaluate(() => { const r = id => { const e = document.getElementById(id).getBoundingClientRect(); return [e.left, e.top, e.width, e.height].map(Math.round); };
      const btn = document.getElementById('b-summon').getBoundingClientRect(), info = document.getElementById('info');
      const fs = parseFloat(getComputedStyle(info).fontSize);
      return { field: r('field'), info: r('info'), actions: r('actions'), hud: r('hud'), btnH: Math.round(btn.height), font: +fs.toFixed(1),
        infoOverflow: info.scrollHeight > info.clientHeight + 1, hscroll: document.documentElement.scrollWidth > innerWidth,
        offscreen: ['hud', 'field', 'info', 'actions'].some(id => { const e = document.getElementById(id).getBoundingClientRect(); return e.bottom > innerHeight + 1 || e.right > innerWidth + 1 || e.top < -1 || e.left < -1; }) }; });
    const cover = Math.round(100 * m.field[2] * m.field[3] / (w * h));
    const slot = Math.round(m.field[2] * 88 / 720);
    const flags = [m.offscreen && '화면밖', m.hscroll && '가로스크롤', m.infoOverflow && '정보창넘침', slot < 40 && '칸<40px', m.btnH < 44 && '버튼<44px', m.font < 11.5 && '글자<11.5', errs.length && '오류'].filter(Boolean);
    if (flags.length) bad++;
    console.log(`${name.padEnd(20)} ${w}x${h} 전장 ${m.field[2]}x${m.field[3]} (${cover}%) 칸 ${slot}px 버튼높이 ${m.btnH} 글자 ${m.font} 정보창 ${m.info[2]}x${m.info[3]} ${flags.join(',') || 'OK'}`);
    await p.screenshot({ path: `${out}/${tag}${w}x${h}.png` }); await p.close();
  }
  console.log('문제 기기 수:', bad); await b.close();
})();
