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
  ['짧은 화면(사용자 기기)', 416, 579], ['짧은 화면 2', 360, 560], ['짧은 화면 3', 412, 640],
];
(async () => {
  const out = process.argv[2], tag = process.argv[3] || '';
  const b = await chromium.launch(); let bad = 0;
  for (const [name, w, h] of DEV) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && !/favicon/.test(m.text()) && errs.push(m.text()));
    await p.goto('http://localhost:8080/'); await p.click('.lplay'); await p.click('[data-act="start"]');
    await p.evaluate(() => { const g = window.__srd.game, C = window.__srd.C; g.gold = 5000; for (let i = 0; i < 9; i++) C.summon(g); });
    const fb = await p.locator('#field').boundingBox();
    const btnH = Math.round((await p.locator('#b-summon').boundingBox()).height);      // 유닛을 고르면 하단 버튼이 카드로 바뀌므로 먼저 잰다
    // 소집 자리는 무작위이므로 실제 유닛이 선 발판을 눌러 선택한다
    const sp = await p.evaluate(() => { const g = window.__srd.game, u = g.units.find(Boolean), s = g.map.slots[u.slot]; return { x: s.x / window.__srd.C.FIELD.w, y: s.y / window.__srd.C.FIELD.h }; });
    await p.mouse.click(fb.x + fb.width * sp.x, fb.y + fb.height * sp.y); await p.waitForTimeout(250);
    const m = await p.evaluate(() => { const r = id => { const e = document.getElementById(id).getBoundingClientRect(); return [e.left, e.top, e.width, e.height].map(Math.round); };
      const info = document.getElementById('info'), card = info.firstElementChild.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(info).fontSize);
      return { field: r('field'), info: r('info'), actions: r('actions'), hud: r('hud'), font: +fs.toFixed(1), cardCut: card.bottom > innerHeight + 1 || card.top < r('hud')[3] - 1,
        infoOverflow: false, hscroll: document.documentElement.scrollWidth > innerWidth,
        offscreen: ['hud', 'field', 'info'].some(id => { const e = document.getElementById(id).getBoundingClientRect(); return e.bottom > innerHeight + 1 || e.right > innerWidth + 1 || e.top < -1 || e.left < -1; }) }; });
    // 카드가 전장을 가리면 그 아래 유닛을 누를 수 없다: 유닛 카드와 조합 미리보기 카드가 전장 아래에 머무는지 본다 (세로 배치)
    const land = await p.evaluate(() => document.getElementById('app').classList.contains('land'));
    const gap = () => p.evaluate(() => Math.round(document.getElementById('info').firstElementChild.getBoundingClientRect().top - document.getElementById('field').getBoundingClientRect().bottom));
    const fitCls = () => p.evaluate(() => document.getElementById('info').className || '-');
    const g1 = await gap(), c1 = await fitCls();
    // 조합 미리보기: 같은 등급 두 유닛을 만들어 차례로 누른다
    // 주둔지(건물과 간판)가 화면 아래로 넘치지 않는가 — 유닛을 고르기 전(건물이 보이는 상태)에 잰다
    const camp = await p.evaluate(() => { const vh = window.innerHeight, b = Math.max(...[...document.querySelectorAll('.bld .sign')].map(x => x.getBoundingClientRect().bottom)), a = document.getElementById('actions'); return Math.round(Math.max(b - vh, a.scrollHeight - a.clientHeight)); });
    const pair = await p.evaluate(() => { const g = window.__srd.game, C = window.__srd.C, us = g.units.filter(Boolean); us[1].level = us[0].level; us[1].b = us[0].b; us[1].stats = C.unitStats(C.branchOf(g, us[1]), us[1].level, us[1].type, g.meta, g.up);      // 조합은 같은 군별 · 같은 등급끼리만 되므로 둘을 맞춘다
      return [us[0], us[1]].map(u => { const s = g.map.slots[u.slot]; return { x: s.x / C.FIELD.w, y: s.y / C.FIELD.h }; }); });
    await p.mouse.click(fb.x + 2, fb.y + 2); await p.waitForTimeout(80);
    for (const q of pair) { await p.mouse.click(fb.x + fb.width * q.x, fb.y + fb.height * q.y); await p.waitForTimeout(160); }
    const hasMerge = await p.locator('[data-do="merge"]').count(), g2 = hasMerge ? await gap() : 0, c2 = await fitCls();
    m.cover1 = !land && g1 < -1; m.cover2 = !land && g2 < -1; m.noMerge = !hasMerge;
    const cover = Math.round(100 * m.field[2] * m.field[3] / (w * h));
    const slot = Math.round(m.field[2] * 100 / 720);
    const flags = [m.cover1 && `유닛카드가 전장 덮음(${g1})`, m.cover2 && `조합카드가 전장 덮음(${g2})`, m.noMerge && '조합카드 안뜸', camp > 1 && `주둔지 잘림(${camp}px)`, m.offscreen && '화면밖', m.hscroll && '가로스크롤', m.cardCut && '카드잘림', slot < 40 && '칸<40px', btnH < 44 && '버튼<44px', m.font < 11.5 && '글자<11.5', errs.length && '오류'].filter(Boolean);
    if (flags.length) bad++;
    console.log(`${name.padEnd(20)} ${w}x${h} 전장 ${m.field[2]}x${m.field[3]} (${cover}%) 칸 ${slot}px 버튼높이 ${btnH} 글자 ${m.font} 정보창 ${m.info[2]}x${m.info[3]} 카드 ${c1}/${c2} ${flags.join(',') || 'OK'}`);
    if (out) await p.screenshot({ path: `${out}/${tag}${w}x${h}.png` });      // 저장할 폴더를 주지 않으면 검사만 한다
    await p.close();
  }
  console.log('문제 기기 수:', bad); await b.close();
})();
