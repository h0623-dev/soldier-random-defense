// 전장 그리기 — 위에서 비스듬히 내려다본 느낌. 바닥은 두께가 있는 발판, 캐릭터는 그 위에 서 있고 아래쪽 줄이 위쪽 줄을 가린다.
// 그림은 모두 www/img/v2(E 광택 캐주얼풍)에서 온다. 그림이 아직 안 읽힌 동안에만 아래의 코드 그림(받침대 원판 · 사격 효과 · 선택 표시 …)이 대신 나온다.
import { CLASS_INFO, GRADES } from './data.js';
import { FIELD, CELL, CFG, AREAS, TILES, unitRange, rankGroup, canMerge, rankName, rankInsig, mergePreview, heroOf, branchOf, charName, mine, own } from './core.js';
import { drawTag, unitImage, unitAtkImage, unitRdyImage, v2HeroArt, insigReady, ENEMY_R, sprite, spriteBox, enemyArt, loadArt, v2Art, v2Has } from './sprites.js';
loadArt();

const FEET = 27, CHAR = 98;                            // 발판 중심에서 캐릭터 발까지, 캐릭터 그림 크기. 캐릭터가 칸을 거의 채우도록 잡은 값이다(머리는 윗칸 쪽으로 조금 넘어가도 된다 — 이름표는 맨 나중에 따로 찍는다)
const OUTLINE = 1.5, OUTLINE_COL = '#3a2410';          // 캐릭터 둘레의 짙은 갈색 윤곽선 굵기(전장 단위)와 색. 옅은 수채 그림이 바닥에 묻히지 않게 한다
// 계급대(계급장 모양으로 구분): 병 · 부사관 · 위관 · 영관 · 장성. 계급대가 오를수록 몸집과 장식이 달라진다
const RANK_SIZE = [0.93, 0.96, 0.99, 1.02, 1.05, 1.08, 1.12];      // 계급(7단계)이 오를수록 조금씩 커진다
const UB_BOX = [-40, -16, 40, 24], BADGE_BOX = [8, -55, 50, -33], LABEL_BOX = [-50, 24, 50, 44];      // 미리 그려 두는 조각들의 범위 (유닛 기준 좌표)
// 전장 글자 글꼴: 굵은 게임용 글꼴(www/fonts). 캔버스는 글꼴을 스스로 읽지 않으므로 미리 읽혀 둔다
const FONT = '"Bagel Fat One", "Jua", sans-serif';
if (typeof document !== 'undefined' && document.fonts) for (const f of ['400 20px "Bagel Fat One"', '400 20px "Jua"']) document.fonts.load(f, '가1').catch(() => {});
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // 장식 배치용 고정 난수

// 지역의 땅·발판 색 (주둔지를 전장과 같은 색으로 칠하는 데 쓴다)
export const areaColors = area => { const th = v2Has('ground_' + AREAS[area].theme) ? AREAS[area].theme : 'meadow', P = V2_THEME[th];      // 그 지역의 땅 그림 · 발판 색 · 길 색 (주둔지와 스테이지 고르기 화면의 작은 맵에 쓴다)
  return { ground: [P.base, P.base], pad: [P.tile[0], P.tile[3], P.side, P.side, '#fff', P.lip], line: P.line, road: P.mini, img: `img/v2/ground_${th}.webp`,
    camp: `img/v2/camp_${v2Has('camp_' + AREAS[area].theme) ? AREAS[area].theme : 'meadow'}.webp` }; };      // camp: 주둔지 바닥 그림(지역마다)

// ── 배경(움직이지 않는 부분)은 지역마다 한 번만 그려 두고 복사한다 ──────────
let bg = null, bgKey = '';
// 새 그림체 배경: 땅 그림 한 장 위에 길(길 바닥 그림을 길 모양으로 오려 붙임) · 두께 있는 발판 · 소품 그림을 얹는다. 한 지역의 맵(길 모양)이 달라도 같은 그림을 쓴다.
// 지역(theme)마다 그림 한 벌(ground_ · road_ · prop_<지역>_b1~b6 큰 소품 · s1~s6 작은 소품)과 아래 색 한 벌이 있다. 그 지역 그림이 아직 없으면 초원 것을 쓴다.
//  mini 작은 맵의 길 색 · tile 발판 타일 [밝은 칸 위, 아래, 어두운 칸 위, 아래] · grout 줄눈 · lip 타일 아랫단 · side 옆면 · foot 옆면 아래 · line 둘레 선 · tone 땅을 누르는 색 · sh 그림자 · rim 길 [테두리, 안쪽 밝은 선] · shade 길 [가장자리, 가운데] 누르는 색 · arrow 진행 표시
const STONE = { tile: ['#f7efd9', '#e9ddbf', '#efe5cb', '#dfd2b2'], grout: '#cbbd9e', lip: '#bcae90', side: '#8f7f6c', foot: '#6f6050', line: '#4a3a2c' };
const WOOD = { tile: ['#f6e3bd', '#e6cd9c', '#efd9ad', '#ddc18c'], grout: '#bd9d63', lip: '#ab8b52', side: '#80623a', foot: '#614829', line: '#3f2c16' };
const CONC = { tile: ['#f3f2ed', '#dfddd5', '#e9e8e2', '#d3d1c8'], grout: '#b6b3a7', lip: '#a6a397', side: '#7d7a70', foot: '#605d55', line: '#3a3833' };
const V2_THEME = {
  meadow:   { mini: '#d9a968', ...STONE, base: '#86c832', tone: 'rgba(20,80,40,.2)', sh: 'rgba(14,56,24,.38)', rim: ['#6a421c', '#ffe3a6'], shade: ['rgba(104,66,34,.52)', 'rgba(150,112,78,.34)'], arrow: 'rgba(96,58,22,.5)' },
  beach:    { mini: '#c9a676', tile: ['#f6fcfb', '#e0f1ef', '#ebf7f5', '#d4e9e6'], grout: '#b6d3d0', lip: '#a4c4c1', side: '#709b9d', foot: '#567c7f', line: '#2f4f52',
              base: '#f0d79a', tone: 'rgba(130,90,30,.1)', sh: 'rgba(100,66,20,.32)', rim: ['#7a5a2e', '#fff0c8'], shade: ['rgba(90,60,30,.42)', 'rgba(110,80,50,.16)'], arrow: 'rgba(96,66,30,.45)' },
  desert:   { mini: '#c98a52', tile: ['#fff7e8', '#f2e3c8', '#f9edd8', '#e9d7b8'], grout: '#d3bc95', lip: '#c3aa80', side: '#a47f53', foot: '#81613b', line: '#4f3520',
              base: '#ecd08a', tone: 'rgba(150,90,20,.1)', sh: 'rgba(110,60,10,.32)', rim: ['#6e3d1c', '#ffd9a0'], shade: ['rgba(96,64,44,.46)', 'rgba(128,98,78,.26)'], arrow: 'rgba(90,50,20,.45)' },
  snow:     { mini: '#a5825e', ...WOOD, base: '#eef4fa', tone: 'rgba(60,90,140,.1)', sh: 'rgba(40,70,120,.3)', rim: ['#5a4028', '#f3e6d4'], shade: ['rgba(70,48,30,.42)', 'rgba(90,66,44,.14)'], arrow: 'rgba(70,46,26,.45)' },
  city:     { mini: '#b0624a', ...CONC, base: '#b9b7ae', tone: 'rgba(30,30,40,.16)', sh: 'rgba(20,20,30,.36)', rim: ['#5a2f22', '#f0c9b0'], shade: ['rgba(70,36,26,.42)', 'rgba(90,56,44,.14)'], arrow: 'rgba(70,34,24,.45)' },
  jungle:   { mini: '#7a4a30', tile: ['#f3f5da', '#e0e4be', '#e9eccc', '#d4d9af'], grout: '#b5bc8d', lip: '#a3ab7b', side: '#78815b', foot: '#5a6345', line: '#34402a',
              base: '#3f8a3a', tone: 'rgba(0,40,20,.2)', sh: 'rgba(0,30,10,.42)', rim: ['#4a2a16', '#e8c79a'], shade: ['rgba(60,34,18,.42)', 'rgba(80,52,34,.14)'], arrow: 'rgba(255,230,190,.4)' },
  volcano:  { mini: '#4a3a38', tile: ['#f3ebe4', '#dfd4ca', '#e9e0d8', '#d3c7bc'], grout: '#b4a699', lip: '#a39587', side: '#7c6d61', foot: '#5d5046', line: '#2e2622',
              base: '#3d3636', tone: 'rgba(0,0,0,.1)', sh: 'rgba(0,0,0,.46)', rim: ['#1c1210', '#ff9a4a'], shade: ['rgba(20,12,10,.4)', 'rgba(30,20,16,.1)'], arrow: 'rgba(255,170,90,.5)' },
  harbor:   { mini: '#a57a4c', ...WOOD, base: '#b9bcbd', tone: 'rgba(20,40,60,.14)', sh: 'rgba(20,34,50,.36)', rim: ['#4a321c', '#f0dcb8'], shade: ['rgba(60,40,22,.42)', 'rgba(80,58,38,.14)'], arrow: 'rgba(60,38,18,.45)' },
  airfield: { mini: '#5c5f66', ...CONC, base: '#9fcf6a', tone: 'rgba(30,70,40,.14)', sh: 'rgba(20,50,30,.36)', rim: ['#26282c', '#f4f4ee'], shade: ['rgba(20,22,26,.36)', 'rgba(30,32,36,.1)'], arrow: 'rgba(255,255,255,.5)' },
  hq:       { mini: '#3c4258', tile: ['#ebf0f6', '#d4dce8', '#e1e8f0', '#c8d1de'], grout: '#a5b0c1', lip: '#94a0b2', side: '#68748c', foot: '#4e586d', line: '#232a3a',
              base: '#2b3146', tone: 'rgba(0,0,10,.08)', sh: 'rgba(0,0,0,.5)', rim: ['#0c0e16', '#ff6a5a'], shade: ['rgba(8,10,18,.36)', 'rgba(14,16,26,.08)'], arrow: 'rgba(255,120,110,.5)' },
};
let bgW = null;      // 양옆 여백까지 포함한 넓은 배경(세로 화면에서 전장이 화면 폭보다 좁을 때)
function background(k, area, map, bleed = 0) {
  const want = AREAS[area].theme, th = v2Has('ground_' + want) ? want : 'meadow', P = V2_THEME[th], pth = v2Has(`prop_${th}_b1`) ? th : 'meadow';
  const G = v2Art('ground_' + th), RD = v2Art(v2Has('road_' + th) ? 'road_' + th : 'road_meadow');
  const big = [1, 2, 3, 4, 5, 6].map(i => `prop_${pth}_b${i}`), small = [1, 2, 3, 4, 5, 6].map(i => `prop_${pth}_s${i}`).filter(v2Has);
  const TI = v2Art('tile_' + th);      // 발판 타일 그림(지역마다 한 장)
  const ready = [G, RD, TI, v2Art('prop_flag'), ...big.map(v2Art), ...small.map(v2Art)].filter(Boolean).length;
  const key = 'v2:' + area + ':' + th + ':' + (map.id || '') + '@' + k.toFixed(3) + ':' + ready + ':' + bleed.toFixed(2); if (bg && bgKey === key) return bleed > 0 ? bgW : bg;
  // 땅 그림은 여백까지 덮게 같은 비율로 키워 가운데에 놓는다(위아래 가장자리 장식이 조금 잘린다) — 전장 안과 여백이 한 장으로 이어진다
  const gs = (FIELD.w + 2 * bleed) / FIELD.w, ground = cc => { if (G) cc.drawImage(G, -bleed, -(gs - 1) * FIELD.h / 2, FIELD.w * gs, FIELD.h * gs); else { cc.fillStyle = P.base; cc.fillRect(-bleed, 0, FIELD.w + 2 * bleed, FIELD.h); }
    cc.fillStyle = P.tone; cc.fillRect(-bleed, 0, FIELD.w + 2 * bleed, FIELD.h); };      // 땅을 한 톤 눌러 길·발판·캐릭터가 먼저 보이게
  if (!bg) bg = document.createElement('canvas');
  bg.width = Math.ceil(FIELD.w * k); bg.height = Math.ceil(FIELD.h * k); bgKey = key;
  const c = bg.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0); c.imageSmoothingQuality = 'high';
  const hw = CELL.w / 2, hh = CELL.h / 2, seed = area * 1000;
  ground(c);
  // 길
  const line = (cc, w, col, dy = 0) => { cc.save(); cc.translate(0, dy); cc.lineJoin = cc.lineCap = 'round'; cc.lineWidth = w; cc.strokeStyle = col;
    cc.beginPath(); map.path.forEach((p, i) => cc[i ? 'lineTo' : 'moveTo'](p.x, p.y)); cc.closePath(); cc.stroke(); cc.restore(); };
  line(c, 104, P.sh, 5); line(c, 102, P.rim[0]); line(c, 95, P.rim[1]);
  const pat = document.createElement('canvas'); pat.width = bg.width; pat.height = bg.height; const pc = pat.getContext('2d'); pc.setTransform(k, 0, 0, k, 0, 0);      // 길 바닥 무늬: 그림을 절반 크기로 네 번(거울처럼 뒤집어 이음매가 안 보이게) — 돌·풀이 캐릭터보다 커 보이지 않게
  if (RD) for (let iy = 0; iy < 2; iy++) for (let ix = 0; ix < 2; ix++) { pc.save(); pc.translate(ix ? FIELD.w : 0, iy ? FIELD.h : 0); pc.scale(ix ? -1 : 1, iy ? -1 : 1); pc.drawImage(RD, 0, 0, FIELD.w / 2 + 1, FIELD.h / 2 + 1); pc.restore(); }
  else { pc.fillStyle = '#c9a36a'; pc.fillRect(0, 0, FIELD.w, FIELD.h); }
  // 길 바닥 그림을 길 모양으로 오려 붙인다: 먼저 길 전체(가장자리는 그늘지게), 그 위에 가운데만 다시 밝게
  const rc = document.createElement('canvas'); rc.width = bg.width; rc.height = bg.height; const r = rc.getContext('2d');
  const tex = (w, shade) => { r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'source-over'; r.clearRect(0, 0, rc.width, rc.height); r.setTransform(k, 0, 0, k, 0, 0);
    line(r, w, '#fff'); r.globalCompositeOperation = 'source-in'; r.drawImage(pat, 0, 0, FIELD.w, FIELD.h);
    r.globalCompositeOperation = 'source-atop'; r.fillStyle = shade; r.fillRect(0, 0, FIELD.w, FIELD.h);      // 길을 살짝 눌러 적과 발판이 묻히지 않게
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(rc, 0, 0); c.setTransform(k, 0, 0, k, 0, 0); };
  tex(89, P.shade[0]); tex(75, P.shade[1]);
  c.fillStyle = P.arrow;      // 진행 방향 표시
  for (let d = 60; d < map.len; d += 120) { const p = map.pathPos(d); c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.dy, p.dx));
    c.beginPath(); c.moveTo(11, 0); c.lineTo(-5, -9); c.lineTo(-1, 0); c.lineTo(-5, 9); c.closePath(); c.fill(); c.restore(); }
  // 발판: 두께가 있는 판 덩어리. 이웃한 칸은 한 덩어리로 이어지고, 칸마다 둥근 타일을 얹는다
  const has = (rw, cc) => map.padSet.has(rw * 10 + cc), R = 18, D = 16;
  const cell = (s, grow, dy, extra = 0) => { const u = has(s.r - 1, s.c), d = has(s.r + 1, s.c), l = has(s.r, s.c - 1), rt = has(s.r, s.c + 1), q = R + grow;
    c.beginPath(); c.roundRect(s.x - hw - grow, s.y - hh - 8 - grow + dy, CELL.w + grow * 2, CELL.h + grow * 2 + extra, [!u && !l ? q : 0, !u && !rt ? q : 0, !d && !rt ? q : 0, !d && !l ? q : 0]); c.fill(); };
  c.fillStyle = P.sh; for (const s of map.slots) cell(s, 5, D + 5);                              // 바닥 그림자
  c.fillStyle = P.line; for (const s of map.slots) cell(s, 3.5, 0, D);                           // 둘레 선
  c.fillStyle = P.side; for (const s of map.slots) cell(s, 0, D);                                // 옆면
  c.fillStyle = P.foot; for (const s of map.slots) if (!has(s.r + 1, s.c)) c.fillRect(s.x - hw + (has(s.r, s.c - 1) ? 0 : 8), s.y + hh - 8 + D - 5, CELL.w - (has(s.r, s.c - 1) ? 0 : 8) - (has(s.r, s.c + 1) ? 0 : 8), 5);
  c.fillStyle = P.grout; for (const s of map.slots) cell(s, 0, 0);                               // 윗면(타일 사이 줄눈)
  for (const s of map.slots) { const x = s.x - hw + 3.5, y = s.y - hh - 8 + 3.5, w = CELL.w - 7, alt = (s.r + s.c) % 2;
    c.fillStyle = P.lip; rr(c, x, y + 2.5, w, w, 13); c.fill();                                       // 타일 아랫단
    if (TI) { c.drawImage(TI, x, y, w, w - 2); if (alt) { c.fillStyle = 'rgba(60,40,20,.07)'; rr(c, x, y, w, w - 2, 13); c.fill(); } c.fillStyle = P.lip; c.globalAlpha = 0.16; c.beginPath(); c.ellipse(s.x, s.y + FEET - 4, 33, 12.5, 0, 0, 7); c.fill(); c.globalAlpha = 1; continue; }      // 타일 그림(칸이 번갈아 살짝 어둡다)
    const tg = c.createLinearGradient(0, y, 0, y + w); tg.addColorStop(0, P.tile[alt ? 2 : 0]); tg.addColorStop(1, P.tile[alt ? 3 : 1]);
    c.fillStyle = tg; rr(c, x, y, w, w - 2, 13); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + 13, y + 3); c.lineTo(x + w - 13, y + 3); c.stroke();
    c.fillStyle = P.lip; c.globalAlpha = 0.3;
    for (let i = 0; i < 3; i++) { const px = x + 12 + rnd(seed + (s.r * 10 + s.c) * 7 + i) * (w - 24), py = y + 14 + rnd(seed + (s.r * 10 + s.c) * 13 + i) * (w - 30);      // 무늬 점
      c.beginPath(); c.ellipse(px, py, 3 + rnd(i + s.r) * 3, 2 + rnd(i + s.c) * 1.5, 0, 0, 7); c.fill(); }
    c.globalAlpha = 0.16; c.beginPath(); c.ellipse(s.x, s.y + FEET - 4, 33, 12.5, 0, 0, 7); c.fill(); c.globalAlpha = 1; }      // 유닛이 설 자리
  // 소품: 빈 칸에 큰 소품 하나와 작은 소품 하나, 길이 시작되는 곳에 깃발 (아래쪽 것이 위쪽 것을 가리게 y 순서로)
  const props = [];
  map.decor.forEach((d, i) => { props.push([big[(i + area) % big.length], d.x, d.y + 38, 106]);
    if (small.length) props.push([small[(i * 2 + area) % small.length], d.x + (i % 2 ? -31 : 31), d.y + 45, 46]); });
  const f = map.path[0]; props.push(['prop_flag', f.x - 36, f.y + 30, 66]);
  props.sort((p, q) => p[2] - q[2]);
  for (const [n, x, y, sz] of props) { const im = v2Art(n); if (!im) continue;
    c.fillStyle = P.sh; c.beginPath(); c.ellipse(x, y - 3, sz * 0.36, sz * 0.11, 0, 0, 7); c.fill();
    c.drawImage(im, x - sz / 2, y - sz * 0.96, sz, sz); }
  if (bleed > 0) { if (!bgW) bgW = document.createElement('canvas'); const off = Math.round(bleed * k); bgW.width = bg.width + off * 2; bgW.height = bg.height;      // 넓은 배경: 여백의 땅 + 가운데 전장
    const wc = bgW.getContext('2d'); wc.imageSmoothingQuality = 'high'; wc.setTransform(k, 0, 0, k, off, 0); ground(wc); wc.setTransform(1, 0, 0, 1, 0, 0); wc.drawImage(bg, off, 0); return bgW; }
  return bg;
}
// 그림을 화면에 찍힐 크기로 미리 줄여 둔다. 256~512px 원본을 매 프레임 줄여 그리는 것보다 같은 크기로 복사하는 쪽이 훨씬 싸다.
// 그림에서 내용이 있는 부분만 잘라 담으므로(공격 그림은 대부분이 빈 자리다) 화면에 찍는 넓이도 줄어든다.
// flip이면 좌우를 뒤집어 둔다(왼쪽으로 가는 적, 왼쪽을 보는 공격 자세). 돌려주는 값: { cv, x, y, w, h } — (x, y)는 그림 왼쪽 위에서의 위치
const fitCache = new Map(), boxCache = new Map(); let fitCount = 0;
function contentBox(im) {      // 내용이 있는 범위 (0~1). 48px로 줄여 한 번만 잰다
  let b = boxCache.get(im); if (b) return b;
  const N = 48, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(im, 0, 0, N, N);
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  try { const d = c.getImageData(0, 0, N, N).data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  } catch { x1 = -1; }
  b = x1 < 0 ? [0, 0, 1, 1] : [Math.max(0, x0 - 1) / N, Math.max(0, y0 - 1) / N, Math.min(N, x1 + 2) / N, Math.min(N, y1 + 2) / N];
  boxCache.set(im, b); return b;
}
function fit(im, w, k, flip = false, line = 0, lineCol = OUTLINE_COL) {      // line: 둘레에 입힐 윤곽선 굵기(전장 단위, 0이면 없음)
  let m = fitCache.get(im); if (!m) fitCache.set(im, m = new Map());
  const key = (flip ? -1 : 1) * Math.round(w * k) + (line ? 0.25 : 0); let f = m.get(key);
  if (!f) {
    if (++fitCount > 500) { fitCache.clear(); fitCount = 1; fitCache.set(im, m = new Map()); }      // 화면 크기·품질이 바뀌어 쌓인 것 정리
    const px = Math.max(1, Math.round(w * k)), b = contentBox(im), bx = flip ? [1 - b[2], b[1], 1 - b[0], b[3]] : b;
    const r = line && im.naturalWidth ? Math.max(1, line * k) : 0, pad = r ? Math.ceil(r) + 1 : 0;
    const X0 = Math.floor(bx[0] * px) - pad, Y0 = Math.floor(bx[1] * px) - pad, X1 = Math.ceil(bx[2] * px) + pad, Y1 = Math.ceil(bx[3] * px) + pad;
    let cv = document.createElement('canvas'); cv.width = Math.max(1, X1 - X0); cv.height = Math.max(1, Y1 - Y0);
    const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.translate(-X0, -Y0); if (flip) { c.translate(px, 0); c.scale(-1, 1); }
    c.drawImage(im, 0, 0, px, px);
    if (r) {      // 윤곽선: 그림의 실루엣을 한 색으로 칠해 둘레 여러 방향으로 밀어 찍고, 그 위에 그림을 얹는다 (캐시를 만들 때 한 번만 한다)
      const sil = document.createElement('canvas'); sil.width = cv.width; sil.height = cv.height;
      const sc = sil.getContext('2d'); sc.drawImage(cv, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = lineCol; sc.fillRect(0, 0, sil.width, sil.height);
      const out = document.createElement('canvas'); out.width = cv.width; out.height = cv.height; const oc = out.getContext('2d');
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; oc.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
      oc.drawImage(cv, 0, 0); cv = out;
    }
    m.set(key, f = { cv, x: X0 / k, y: Y0 / k, w: cv.width / k, h: cv.height / k });
  }
  return f;
}
const put = (ctx, f, x, y) => ctx.drawImage(f.cv, x + f.x, y + f.y, f.w, f.h);      // fit()으로 만든 그림을 (x, y)를 왼쪽 위로 하여 찍는다

// 보스 그림: 지역 보스 전용 그림(enemy_boss2 …)이 있으면 쓰고, 없으면 기본 전차 그림의 색을 바꿔 쓴다
const tintCache = {};
function bossImage(n) {
  const own = enemyArt('boss' + n); if (own) return own;
  const base = enemyArt('boss'); if (!base || n <= 1) return base;
  if (!tintCache[n]) { const cv = document.createElement('canvas'); cv.width = base.naturalWidth; cv.height = base.naturalHeight;
    const c = cv.getContext('2d'); c.filter = `hue-rotate(${(n - 1) * 36}deg)`; c.drawImage(base, 0, 0); tintCache[n] = cv; }
  return tintCache[n];
}

export function draw(ctx, g, ui, quality = 2) {
  const b = g.branch, k = ctx.getTransform().a, now = performance.now() / 1000, SLOTS = g.map.slots;
  const bleed = Math.max(0, ctx.getTransform().e / k), bgc = background(k, g.area, g.map, bleed);      // bleed: 전장 양옆의 여백(전장 단위) — 세로 화면에서 전장이 화면 폭보다 좁을 때
  if (bleed > 0) ctx.drawImage(bgc, -bleed, 0, bgc.width / k, FIELD.h); else ctx.drawImage(bgc, 0, 0, FIELD.w, FIELD.h);
  const sel = ui.sel != null ? g.units[ui.sel] : null;
  // 협동: 동료의 구역은 어둡게 덮어 내 구역과 구분한다
  if (g.duo && !g.duo.solo) { ctx.fillStyle = 'rgba(24,30,66,.46)'; SLOTS.forEach((s, i) => { if (!mine(g, i)) ctx.fillRect(s.x - CELL.w / 2, s.y - CELL.h / 2 - 8, CELL.w, CELL.h); }); }
  // 특수 발판: 종류 색으로 빛나는 테두리와 왼쪽 위 표식 (유닛이 올라가도 보이게 모서리에 둔다)
  for (const i in g.tiles) tile(ctx, SLOTS[i], g.tiles[i], k, now, quality);
  // 아무것도 고르지 않았을 때: 지금 조합할 짝(같은 군별 · 같은 등급)이 있는 내 유닛의 칸에 옅은 노란 점선을 둘러 준다 — 군별이 섞여 나와 짝을 찾기 어렵기 때문
  const pairN = {}; if (!sel) for (const u of g.units) if (u && own(g, u) && u.level < GRADES.length - 1) { const pk = branchOf(g, u).id + u.level; pairN[pk] = (pairN[pk] || 0) + 1; }
  // 발판 강조: 조합할 수 있는 칸(노랑), 선택한 칸(흰색)
  SLOTS.forEach((s, i) => {
    const x = s.x - CELL.w / 2 + 4, y = s.y - CELL.h / 2 - 4, mergeable = sel && i !== ui.sel && canMerge(g, ui.sel, i);
    // 조합할 수 있는 칸: 같은 병과(병과 유지)는 노란색, 다른 병과(무작위)는 보라색 점선
    const cy = s.y - 8;      // 칸 가운데 높이
    if (mergeable && v2Art('hl_merge') && v2Art('hl_rand') && v2Art('hl_star')) { const pv = mergePreview(g, ui.sel, i), a = 0.32 + 0.18 * Math.sin(now * 6);      // 새 그림체: 조합할 수 있는 칸에 빛나는 틀 그림(같은 병과 = 금색 · 다른 병과 = 보라 점선 · 용사/히든 = 별 달린 붉은 틀)
      ctx.fillStyle = pv.hidden ? `rgba(255,120,80,${a * 0.7})` : !pv.random ? `rgba(255,212,94,${a * 0.7})` : `rgba(190,150,255,${a * 0.55})`; rr(ctx, x + 2, y + 2, CELL.w - 12, CELL.h - 12, 12); ctx.fill();
      fx(ctx, pv.hidden ? 'hl_star' : !pv.random ? 'hl_merge' : 'hl_rand', s.x, cy, 104 + 3 * Math.sin(now * 6), 0, 0.82 + 0.18 * Math.sin(now * 6)); }
    else if (mergeable) { const pv = mergePreview(g, ui.sel, i), keep = !pv.random, star = !!pv.hidden, a = 0.32 + 0.18 * Math.sin(now * 6);
      ctx.fillStyle = star ? `rgba(255,120,80,${a})` : keep ? `rgba(255,212,94,${a})` : `rgba(190,150,255,${a * 0.8})`; rr(ctx, x, y, CELL.w - 8, CELL.h - 8, 12); ctx.fill();
      ctx.strokeStyle = star ? '#ff5a4a' : keep ? '#ffd45e' : '#c9a3ff'; ctx.lineWidth = star ? 5 : 4; if (!keep) ctx.setLineDash([9, 7]); ctx.stroke(); ctx.setLineDash([]);
      if (star) starAt(ctx, s.x + 34, s.y - 42, 11 + 2 * Math.sin(now * 6), '#ffd45e'); }      // 용사·히든 조합이 되는 짝: 붉은 테두리와 별
    else if (sel && i === ui.sel && fx(ctx, 'hl_sel', s.x, cy, 104)) { /* 고른 칸: 하늘색 틀 그림 */ }
    else if (sel && i === ui.sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rr(ctx, x, y, CELL.w - 8, CELL.h - 8, 12); ctx.stroke(); }
    else if (!sel) { const u = g.units[i]; if (u && own(g, u) && pairN[branchOf(g, u).id + u.level] >= 2) {
      if (fx(ctx, 'hl_merge', s.x, cy, 98, 0, 0.42 + 0.2 * Math.sin(now * 4))) return;      // 짝이 있는 칸: 금색 틀 그림을 옅게
      ctx.strokeStyle = `rgba(255,224,110,${0.55 + 0.25 * Math.sin(now * 4)})`; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); rr(ctx, x + 2, y + 2, CELL.w - 12, CELL.h - 12, 11); ctx.stroke(); ctx.setLineDash([]); } }
  });
  // 선택 유닛 사거리 · 지원 범위 (바닥에 눕힌 원)
  if (sel) {
    const p = SLOTS[sel.slot];
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, unitRange(sel), 0, 7); ctx.fill(); if (!fx(ctx, 'ring_sel', p.x, p.y, unitRange(sel) * 2.06, now * 0.15, 0.9)) ctx.stroke();      // 사거리: 천천히 도는 점선 고리 그림
    if (((sel.hidden && !heroOf(sel)) || sel.stats.haste > 0) && fx(ctx, 'ring_aura', p.x, p.y, CFG.auraRadius * 2.06, -now * 0.2, 0.9)) { /* 지원 범위: 연두색 점선 고리 그림 */ }
    else if ((sel.hidden && !heroOf(sel)) || sel.stats.haste > 0) { ctx.strokeStyle = sel.hidden ? '#ffd45e' : CLASS_INFO.med.color; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(p.x, p.y, CFG.auraRadius, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  // 화염 지대(불바다): 바닥에서 일렁이는 불
  for (const z of g.zones) { const a = Math.min(1, z.t / 0.6) * (0.3 + 0.1 * Math.sin(now * 9 + z.x));
    if (fx(ctx, 'st_fire', z.x, z.y - z.r * 0.1, z.r * 2.3 * (1 + 0.04 * Math.sin(now * 11 + z.x)), 0, Math.min(1, z.t / 0.6) * 0.92)) continue;      // 새 그림체: 불타는 땅 그림
    ctx.fillStyle = `rgba(255,110,40,${a})`; ctx.beginPath(); ctx.ellipse(z.x, z.y + 6, z.r, z.r * 0.62, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,214,94,${a * 0.9})`; ctx.beginPath(); ctx.ellipse(z.x, z.y + 6, z.r * 0.55, z.r * 0.34, 0, 0, 7); ctx.fill(); }
  // 적: 화면 아래쪽에 있는 것이 위쪽 것을 가리도록 y 순서로 그린다
  const es = g.enemies.length > 1 ? [...g.enemies].sort((p, q) => p.y - q.y) : g.enemies;
  for (const e of es) enemy(ctx, e, k, quality);
  // 아군 (칸 번호 순서 = 위쪽 줄부터)
  for (const u of g.units) if (u) unit(ctx, branchOf(g, u), u, SLOTS[u.slot], k, now, quality);
  if (sel) unitTags(ctx, branchOf(g, sel), sel, SLOTS[sel.slot], k);      // 동물 생김새와 발밑 받침대 색으로 구분하고, 이름표·계급장은 고른 유닛에만 띄운다
  // 사격 효과
  const fxList = quality > 0 ? g.effects : g.effects.slice(-12);   // 최저 품질에서는 사격 효과 수를 줄인다
  for (const f of fxList) {
    if (f.num != null) {      // 피해 숫자: 튀어 올랐다가 위로 떠오르며 옅어진다. 치명타는 크고 노랗게
      const e = 1 - f.t / 0.75, pop = e < 0.14 ? 0.6 + e / 0.14 * 0.65 : 1.25 - Math.min(1, (e - 0.14) / 0.16) * 0.25, fs = (f.crit ? 27 : 19) * pop, y = Math.max(14, f.y - 8 - e * 30);
      ctx.globalAlpha = Math.min(1, f.t / 0.22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${fs}px ${FONT}`; ctx.lineJoin = 'round';
      ctx.lineWidth = f.crit ? 6 : 4.5; ctx.strokeStyle = f.crit ? '#6a1d08' : '#3a2410'; ctx.strokeText(f.s, f.x, y); ctx.fillStyle = f.crit ? '#ffd23e' : '#fff'; ctx.fillText(f.s, f.x, y); ctx.globalAlpha = 1; continue; }
    if (f.puff && !f.col) {      // 처치: 별 모양 섬광과 퍼지는 고리, 고철 더미가 튀었다 사라진다
      const a = Math.max(0, f.t / 0.3), e = 1 - a, im = v2Art('enemy_scrap'), R = f.r * 1.5;
      ctx.globalAlpha = a; burst(ctx, f.x, f.y - 4, e, R * 1.1, '#fff3c4', 8);
      ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3.5 * a + 0.5; ctx.beginPath(); ctx.arc(f.x, f.y - 4, R * (0.5 + e * 0.9), 0, 7); ctx.stroke();
      if (im) { const sz = R * 1.5; ctx.drawImage(im, f.x - sz / 2, f.y - sz * 0.6 - Math.sin(e * Math.PI) * 8, sz, sz); }
      ctx.globalAlpha = 1; continue; }
    if (f.txt) { const a = Math.min(1, f.t / 0.4), up = (1 - Math.min(1, f.t)) * 18; ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${f.small ? 14 : 22}px ${FONT}`; ctx.lineWidth = 4; ctx.strokeStyle = '#1b1208'; ctx.strokeText(f.txt, f.x, f.y - up);
      ctx.fillStyle = f.small ? '#d7e3ee' : '#ffd45e'; ctx.fillText(f.txt, f.x, f.y - up); ctx.globalAlpha = 1; continue; }
    if (f.puff) { const a = Math.max(0, f.t / 0.3); ctx.globalAlpha = Math.min(1, a) * (f.col ? 0.55 : 1); ctx.fillStyle = f.col || '#fff3c4';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.25 - a * 0.75), 0, 7); ctx.fill(); ctx.globalAlpha = 1; continue; }
    shot(ctx, f, quality);
  }
  // 지역 이동 연출: 화면이 어두워졌다 밝아지며 새 지역이 드러나고, 지역 이름 띠가 지나간다
  if (ui.trans) {
    const el = ui.trans.total - ui.trans.t, A = AREAS[ui.trans.area], T = V2_THEME[A.theme];
    const dark = el < 0.3 ? 1 : Math.max(0, 1 - (el - 0.3) / 0.7);
    if (dark > 0) { ctx.fillStyle = `rgba(8,10,6,${dark})`; ctx.fillRect(-bleed, 0, FIELD.w + 2 * bleed, FIELD.h); }
    const inn = Math.min(1, el / 0.35), out = Math.min(1, ui.trans.t / 0.4), a = Math.min(inn, out), cy = FIELD.h * 0.42, slide = (1 - inn) * -160 + (1 - out) * 160;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,10,6,.86)'; ctx.fillRect(-bleed, cy - 92, FIELD.w + 2 * bleed, 184);
    ctx.fillStyle = T.rim[1]; ctx.fillRect(-bleed, cy - 92, FIELD.w + 2 * bleed, 6); ctx.fillRect(-bleed, cy + 86, FIELD.w + 2 * bleed, 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = T.tile[0]; ctx.font = '800 24px ' + FONT; ctx.fillText(ui.trans.top || `작전 지역 ${ui.trans.area + 1} / ${AREAS.length}`, FIELD.w / 2 + slide, cy - 52);
    ctx.fillStyle = '#fff'; ctx.font = '900 58px ' + FONT; ctx.fillText(A.name, FIELD.w / 2 + slide, cy);
    ctx.fillStyle = '#ffb3a8'; ctx.font = '700 22px ' + FONT; ctx.fillText(ui.trans.label || `${(ui.trans.area + 1) * 10}단계 보스 — ${A.boss.name}`, FIELD.w / 2 - slide, cy + 54);
    ctx.globalAlpha = 1;
  }
  if (g.enemies.some(e => e.kind === 'boss')) {
    ctx.fillStyle = 'rgba(12,16,10,.8)'; rr(ctx, FIELD.w / 2 - 92, FIELD.h - 34, 184, 28, 14); ctx.fill();
    ctx.fillStyle = '#ff8478'; ctx.font = '800 18px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`보스 제한 ${Math.ceil(g.bossTimer)}초`, FIELD.w / 2, FIELD.h - 19);
  }
}

// 특수 발판 한 칸. 바닥의 빛(숨쉬듯 밝아졌다 어두워짐)은 매번 그리고, 테두리와 표식은 한 번 그려 둔 조각을 찍는다
const TILE_BOX = [-52, -60, 52, 46];
function tile(ctx, s, kind, k, now, quality) {
  const t = TILES[kind]; if (!t || !s) return;
  const a = quality > 0 ? 0.2 + 0.1 * Math.sin(now * 2.4 + s.x) : 0.24;
  ctx.globalAlpha = a; ctx.fillStyle = t.color; rr(ctx, s.x - 45, s.y - 53, 90, 90, 13); ctx.fill(); ctx.globalAlpha = 1;
  const mk = v2Art('mark_' + kind);
  ctx.drawImage(spriteBox('tile:' + kind + (mk ? ':m' : ''), k, TILE_BOX, c => {
    c.strokeStyle = 'rgba(74,47,27,.75)'; c.lineWidth = 6; rr(c, -45, -53, 90, 90, 13); c.stroke();
    c.strokeStyle = t.color; c.lineWidth = 3.4; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.4; c.setLineDash([5, 6]); rr(c, -40, -48, 80, 80, 10); c.stroke(); c.setLineDash([]);
    if (mk) { c.drawImage(mk, -48, -57, 31, 31); return; }      // 새 그림체: 표식 그림(속사 · 고지 · 급소)
    // 표식: 둥근 딱지 안에 종류 그림 (속사 = 겹화살, 고지 = 과녁, 급소 = 별)
    c.translate(-33, -41); c.fillStyle = t.color; c.strokeStyle = '#4a2f1b'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fill(); c.stroke();
    c.strokeStyle = c.fillStyle = '#4a2f1b'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
    if (kind === 'spd') { for (const dx of [-4.5, 1.5]) { c.beginPath(); c.moveTo(dx - 1.5, -5); c.lineTo(dx + 3.5, 0); c.lineTo(dx - 1.5, 5); c.stroke(); } }
    else if (kind === 'rng') { c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 5.5, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 1.8, 0, 7); c.fill(); c.beginPath(); c.moveTo(0, -8.5); c.lineTo(0, -5.5); c.moveTo(0, 8.5); c.lineTo(0, 5.5); c.moveTo(-8.5, 0); c.lineTo(-5.5, 0); c.moveTo(8.5, 0); c.lineTo(5.5, 0); c.stroke(); }
    else { c.beginPath(); for (let j = 0; j < 10; j++) { const q = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 3.2 : 7.5; c[j ? 'lineTo' : 'moveTo'](Math.cos(q) * r, Math.sin(q) * r); } c.closePath(); c.fill(); }
  }), s.x + TILE_BOX[0], s.y + TILE_BOX[1], TILE_BOX[2] - TILE_BOX[0], TILE_BOX[3] - TILE_BOX[1]);
}

function starAt(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.strokeStyle = '#4a2f1b'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let j = 0; j < 10; j++) { const q = -Math.PI / 2 + j * Math.PI / 5, rr2 = j % 2 ? r * 0.45 : r; ctx[j ? 'lineTo' : 'moveTo'](x + Math.cos(q) * rr2, y + Math.sin(q) * rr2); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
function enemy(ctx, e, k, quality) {
  const elite = e.kind === 'elite', art = elite ? 'armor' : e.kind;
  const r = ENEMY_R[e.kind] * (e.kind === 'boss' ? 1.35 : 1.6), half = r + 8, left = e.left;      // 적은 크게 그린다(길 폭의 절반 남짓)
  const by = quality > 0 ? Math.sin(e.s * 0.22 + e.id) * (e.kind === 'boss' ? 1 : 1.8) : 0, fly = e.kind === 'fast' ? 9 : e.fly ? 16 : 0;
  // 바닥 그림자 · 상태 표시
  ctx.drawImage(sprite('esh:' + r, r, k, c => { const sg = c.createRadialGradient(0, 0, 1, 0, 0, r); sg.addColorStop(0, 'rgba(50,30,12,.45)'); sg.addColorStop(1, 'rgba(50,30,12,0)'); c.scale(1, 0.4); c.fillStyle = sg; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); }), e.x - r, e.y + r * 0.85 - r, r * 2, r * 2);
  const gy = e.y + r * 0.62;      // 발밑 높이
  if (elite && fx(ctx, 'st_elite', e.x, gy, (r + 12) * 2.5)) { /* 정예 표적: 보라색 표식 그림 */ }
  else if (elite) { ctx.fillStyle = 'rgba(160,90,220,.4)'; ctx.strokeStyle = '#c99bff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.6, r + 9, (r + 9) * 0.5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  const bubble = v2Art('st_bubble') && (e.dashT > 0 || (e.skill && e.skill.id === 'armor' && e.hp > e.maxHp * 0.5));      // 고속 기동 · 중장갑: 방어막 그림(적 위에 덮는다)
  if (bubble) { /* 아래에서 적을 찍은 뒤에 덮는다 */ }
  else if (e.dashT > 0) { ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y - 4, r + 12, 0, 7); ctx.stroke(); }
  else if (e.skill && e.skill.id === 'armor' && e.hp > e.maxHp * 0.5) { ctx.strokeStyle = '#cfd6dc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y - 4, r + 12, 0, 7); ctx.stroke(); }
  if (e.slowT > 0 && fx(ctx, 'st_slow', e.x, gy + 2, (r + 6) * 2.5, 0, 0.9)) { /* 둔화: 물웅덩이 그림 */ }
  else if (e.slowT > 0) { ctx.fillStyle = 'rgba(90,150,235,.5)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 4, (r + 4) * 0.45, 0, 0, 7); ctx.fill(); }
  const ice = v2Art('st_ice') && e.freezeT > 0;      // 빙결: 얼음 그림(적 위에 덮는다)
  if (!ice && e.freezeT > 0) { ctx.fillStyle = 'rgba(190,240,255,.55)'; ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, e.y - 2, r + 7, 0, 7); ctx.fill(); ctx.stroke(); }      // 빙결
  if (e.vulnT > 0 && fx(ctx, 'st_vuln', e.x, gy + 1, (r + 8) * 2.5, 0, 0.9)) { /* 표적 지정(받는 피해 증가): 갈라진 붉은 고리 그림 */ }
  else if (e.vulnT > 0) { ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 5, (r + 5) * 0.45, 0, 0, 7); ctx.stroke(); }
  const im = (e.kind === 'boss' && bossImage(e.boss)) || (elite && enemyArt('elite')) || enemyArt(art) || sprite('e:blob:' + Math.round(half), half, k, c => { c.fillStyle = '#7d8794'; c.strokeStyle = '#3a2410'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, half * 0.62, 0, 7); c.fill(); c.stroke(); });      // 그림이 아직 안 읽혔으면 둥근 덩어리
  const ef = fit(im, half * 2, k, left, 1.3); put(ctx, ef, e.x - half, e.y - half + by - fly);
  if (ice) fx(ctx, 'st_ice', e.x, e.y - fly, half * 2.1, 0, 0.62);
  if (bubble) fx(ctx, 'st_bubble', e.x, e.y - 2 - fly, half * 2.7, 0, 0.6 + 0.12 * Math.sin(performance.now() / 120));
  if (e.hitT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, e.hitT / 0.12) * 0.75; put(ctx, ef, e.x - half, e.y - half + by - fly); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }      // 맞는 순간 밝게 번쩍
  { const bw = Math.max(26, r * 1.7), bx = e.x - bw / 2, byy = Math.max(4, e.y - half - 9 - fly), hp = Math.max(0, e.hp / e.maxHp);      // 체력 막대: 둥근 테두리, 체력이 줄면 초록 → 노랑 → 빨강
    const tr = v2Art('ui_trough'), fl = v2Art(hp > 0.5 ? 'ui_fill_green' : hp > 0.25 ? 'ui_fill_gold' : 'ui_fill_red');
    if ((hp < 1 || e.kind === 'boss' || elite) && tr && fl) { ctx.drawImage(tr, bx - 2.5, byy - 2.5, bw + 5, 10);      // 체력 막대: 막대 틀 그림 안에 남은 만큼 색 막대 그림(체력이 줄면 초록 → 노랑 → 빨강)
      const fw = Math.max(0.06, hp); ctx.drawImage(fl, 0, 0, fl.naturalWidth * fw, fl.naturalHeight, bx, byy, bw * fw, 5); }
    else if (hp < 1 || e.kind === 'boss' || elite) { ctx.fillStyle = '#2b1a0c'; rr(ctx, bx - 2, byy - 2, bw + 4, 9, 4.5); ctx.fill(); ctx.fillStyle = '#5a4634'; rr(ctx, bx, byy, bw, 5, 2.5); ctx.fill();
      ctx.fillStyle = hp > 0.5 ? '#6fe04a' : hp > 0.25 ? '#ffc93a' : '#ff5a44'; rr(ctx, bx, byy, Math.max(3, bw * hp), 5, 2.5); ctx.fill(); } }
  if (elite) { ctx.fillStyle = '#e9d6ff'; ctx.font = '800 14px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.ceil(e.life) + '초', e.x, e.y - half - 14); }
}

// 새 그림체의 사격 효과: 총알·저격(빛줄기 그림 → 착탄 별) · 포탄·박격포탄(포탄 그림 → 폭발) · 붕대(붕대 그림 → 초록 십자) · 번개(지그재그 선 + 전기 불꽃) · 가스(구름 그림) · 유도(붉은 선 + 조준 그림 → 폭발) · 전파(전파 그림)
function shot2(ctx, f, kind, o) {
  const { sx, sy, len, ang, p, big, at, arc } = o, need = { bullet: 'shot_bullet', snipe: 'shot_snipe', shell: 'shot_shell', mortar: 'shot_mortar', heal: 'shot_band', bolt: 'fx_zap', gas: 'shot_gas', laser: 'shot_aim', wave: 'shot_wave' }[kind];
  if (!need || !v2Art(need)) return false;
  if (kind === 'bullet' || kind === 'snipe') { const fly = kind === 'snipe' ? 0.22 : 0.38;
    if (p < fly) { const [x, y] = at(p / fly); fx(ctx, need, x, y, (kind === 'snipe' ? 92 : 58) * big, ang); }
    else { const a = (p - fly) / (1 - fly); if (!fx(ctx, 'fx_hit', f.x2, f.y2, (kind === 'snipe' ? 50 : 34) * big * (0.55 + a * 0.75), a * 1.4 + f.x1, 1 - a)) burst(ctx, f.x2, f.y2, a, 13 * big, '#ffd45e', 6); }
  } else if (kind === 'shell' || kind === 'mortar') { const fly = 0.55, h = kind === 'mortar' ? Math.min(130, len * 0.55) : Math.min(60, len * 0.2);
    if (p < fly) { const q = p / fly, [x, y] = arc(q, h), [px, py] = arc(Math.max(0, q - 0.04), h); fx(ctx, 'fx_dust', px, py, 16 * big, 0, 0.5); fx(ctx, need, x, y, 36 * big, Math.atan2(y - py, x - px)); }
    else boom(ctx, f.x2, f.y2, (p - fly) / (1 - fly), Math.max(f.r, 26) * big);
  } else if (kind === 'heal') { const fly = 0.5, h = Math.min(50, len * 0.25);
    if (p < fly) { const [x, y] = arc(p / fly, h); fx(ctx, need, x, y, 30 * big, p * 12); }
    else { const a = (p - fly) / (1 - fly); fx(ctx, 'fx_ring', f.x2, f.y2, (26 + a * 34) * big, 0, (1 - a) * 0.8); fx(ctx, 'fx_heal', f.x2, f.y2 - a * 12, 38 * big * (0.7 + a * 0.4), 0, 1 - a); }
  } else if (kind === 'bolt') { const seg = 6, nx = -Math.sin(ang), ny = Math.cos(ang), step = Math.floor(p * 5);      // 지그재그 번개(길이가 제각각이라 선으로 그린다) + 맞은 자리의 전기 불꽃
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy - 12);
    for (let i = 1; i < seg; i++) { const j = (((Math.sin((f.x1 + f.y2) * 0.37 + i * 12.9898 + step * 78.233) * 43758.5453) % 1 + 1) % 1 - 0.5) * 26, [x, y] = at(i / seg); ctx.lineTo(x + nx * j, y + ny * j); }
    ctx.lineTo(f.x2, f.y2); ctx.globalAlpha = (1 - p) * 0.95; ctx.strokeStyle = '#3a6fd8'; ctx.lineWidth = 9 * big; ctx.stroke(); ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = 5.5 * big; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2 * big; ctx.stroke(); ctx.restore();
    fx(ctx, need, f.x2, f.y2, (34 + p * 30) * big, step * 0.7, 1 - p);
  } else if (kind === 'gas') { const R = Math.max(f.r, 28) * big, q = Math.min(1, p * 2.2);
    if (q < 1) { const [x, y] = at(q); fx(ctx, need, x, y, 26 + q * 14, 0, 0.9); }
    else { const a = (p - 0.45) / 0.55; fx(ctx, need, f.x2, f.y2 - a * 6, R * (1.3 + a * 1.1), 0, (1 - a) * 0.85); }
  } else if (kind === 'laser') {
    if (p < 0.55) { ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = 0.35 * (1 - p); ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore(); fx(ctx, need, f.x2, f.y2, 34 - p * 10, p * 2, 1); }
    if (p > 0.35) boom(ctx, f.x2, f.y2, (p - 0.35) / 0.65, Math.max(f.r, 24) * big);
  } else { const q = Math.min(1, p * 1.3);      // 전파: 표적 쪽으로 가며 커지고 옅어진다
    if (q < 1) { const [x, y] = at(q); fx(ctx, need, x, y, (26 + q * 26) * big, ang, 1 - q * 0.7); }
    if (p > 0.6) { const a = (p - 0.6) / 0.4; fx(ctx, 'fx_ring', f.x2, f.y2, (20 + a * 30) * big, 0, (1 - a) * 0.8); fx(ctx, 'fx_heal', f.x2, f.y2 - a * 10, 30 * big, 0, 1 - a); } }
  return true;
}
// ── 공격 이펙트: 병과 조합마다 날아가는 것과 맞는 모습이 다르다 ───────────
// 총알(보병) · 포탄(포병) · 박격포탄(보+포) · 저격(보+통) · 붕대(의무) · 번개(통신) · 가스(포+의) · 레이저 유도(포+통) · 전파(의+통)
const FX_KIND = { 'inf+inf': 'bullet', 'art+art': 'shell', 'med+med': 'heal', 'sig+sig': 'bolt', 'inf+art': 'mortar', 'inf+med': 'bullet', 'inf+sig': 'snipe', 'art+med': 'gas', 'art+sig': 'laser', 'med+sig': 'wave' };
const INK = '#4a2f1b';
function burst(ctx, x, y, a, r, col, rays = 6) {       // 맞은 자리에서 퍼지는 별 모양 섬광 (a: 0 → 1)
  ctx.globalAlpha = 1 - a; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < rays; i++) { const q = i * Math.PI * 2 / rays + 0.4; ctx.moveTo(x + Math.cos(q) * r * (0.35 + a * 0.5), y + Math.sin(q) * r * (0.35 + a * 0.5)); ctx.lineTo(x + Math.cos(q) * r * (0.8 + a * 0.6), y + Math.sin(q) * r * (0.8 + a * 0.6)); }
  ctx.stroke(); ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(x, y, r * 0.38 * (1 - a), 0, 7); ctx.fill(); ctx.lineCap = 'butt';
}
// 효과 그림 한 장을 (x, y) 가운데에 찍는다. w: 칸 한 변, rot: 회전(라디안), a: 불투명도. 그림이 아직 없으면 false — 그때는 예전 코드 그림으로 그린다
function fx(ctx, name, x, y, w, rot = 0, a = 1) {
  const im = v2Art(name); if (!im) return false; if (a <= 0.01) return true;
  if (rot) { ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(im, -w / 2, -w / 2, w, w); ctx.restore(); }
  else { const g0 = ctx.globalAlpha; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(im, x - w / 2, y - w / 2, w, w); ctx.globalAlpha = g0; }
  return true;
}
function boom(ctx, x, y, a, R) {                       // 폭발: 불덩이가 커지며 옅어지고 연기가 위로 흩어진다
  const bi = v2Art('fx_boom');
  if (bi) { const w = R * 2.3 * (0.55 + a * 0.6), sm = v2Art('fx_smoke'); ctx.globalAlpha = a < 0.55 ? 1 : (1 - a) / 0.45; ctx.drawImage(bi, x - w / 2, y - w * 0.56, w, w);      // 새 그림체: 폭발 그림이 커지며 옅어지고, 연기 그림이 위로 떠오른다
    if (sm && a > 0.35) { const sw = R * 1.3 * (0.6 + a * 0.5); ctx.globalAlpha = (1 - a) * 0.9; ctx.drawImage(sm, x - sw / 2, y - sw * 0.6 - a * R * 0.5, sw, sw); }
    ctx.globalAlpha = 1; return; }
  ctx.globalAlpha = (1 - a) * 0.8; ctx.fillStyle = '#ff8a3c'; ctx.beginPath(); ctx.arc(x, y, R * (0.45 + a * 0.6), 0, 7); ctx.fill();
  ctx.globalAlpha = 1 - a; ctx.fillStyle = '#ffe07a'; ctx.beginPath(); ctx.arc(x, y, R * (0.28 + a * 0.4), 0, 7); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.globalAlpha = (1 - a) * 0.7; ctx.beginPath(); ctx.arc(x, y, R * (0.45 + a * 0.6), 0, 7); ctx.stroke();
  ctx.fillStyle = '#8d8478'; ctx.globalAlpha = (1 - a) * 0.6;
  for (let i = 0; i < 4; i++) { const q = i * 1.7 + 0.5; ctx.beginPath(); ctx.arc(x + Math.cos(q) * R * (0.4 + a * 0.5), y + Math.sin(q) * R * 0.35 - a * R * 0.5, R * (0.16 + a * 0.12), 0, 7); ctx.fill(); }
}
function plus(ctx, x, y, r) { ctx.fillRect(x - r, y - r / 3, r * 2, r * 2 / 3); ctx.fillRect(x - r / 3, y - r, r * 2 / 3, r * 2); }
function shot(ctx, f, quality) {
  const T = f.T || 0.18, p = 1 - Math.max(0, f.t) / T, big = f.crit ? 1.5 : 1;       // p: 0(발사) → 1(끝)
  const dir = f.x2 < f.x1 ? -1 : 1, sx = f.x1 + dir * 26, sy = f.y1 - 24, dx = f.x2 - sx, dy = f.y2 - sy, len = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  if (quality === 0) {      // 최저 품질: 선 하나와 폭발 원만
    ctx.globalAlpha = 1 - p; ctx.strokeStyle = CLASS_INFO[f.c].color; ctx.lineWidth = 2.5 * big; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    if (f.r > 0) { ctx.fillStyle = 'rgba(255,170,80,.45)'; ctx.beginPath(); ctx.arc(f.x2, f.y2, f.r * (0.75 + p * 0.4), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; return;
  }
  const kind = FX_KIND[f.c + '+' + f.c2] || FX_KIND[f.c2 + '+' + f.c] || 'bullet';
  const at = q => [sx + dx * q, sy + dy * q];
  const arc = (q, h) => [sx + dx * q, sy + dy * q - h * 4 * q * (1 - q)];
  if (shot2(ctx, f, kind, { sx, sy, len, ang, p, big, at, arc })) return;      // 새 그림체: 날아가는 것과 맞는 모습을 그림으로 (그림이 아직 안 읽혔으면 아래 코드 그림)
  ctx.save();
  if (kind === 'bullet' || kind === 'snipe') {
    const fly = kind === 'snipe' ? 0.22 : 0.38;
    if (p < fly) { const q = p / fly, [ax, ay] = at(Math.max(0, q - (kind === 'snipe' ? 0.6 : 0.3))), [bx, by] = at(q);
      ctx.lineCap = 'round'; ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 5 * big; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = '#fffbe6'; ctx.lineWidth = 2 * big; ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
    else burst(ctx, f.x2, f.y2, (p - fly) / (1 - fly), (kind === 'snipe' ? 20 : 13) * big, kind === 'snipe' ? '#fffbe6' : '#ffd45e', kind === 'snipe' ? 8 : 6);
  } else if (kind === 'shell' || kind === 'mortar') {
    const fly = 0.55, h = kind === 'mortar' ? Math.min(130, len * 0.55) : Math.min(60, len * 0.2);
    if (p < fly) { const q = p / fly, [x, y] = arc(q, h), [px, py] = arc(Math.max(0, q - 0.04), h);
      ctx.fillStyle = '#b9b2a6'; for (let i = 1; i <= 3; i++) { const [tx, ty] = arc(Math.max(0, q - i * 0.09), h); ctx.globalAlpha = 0.5 - i * 0.12; ctx.beginPath(); ctx.arc(tx, ty, 6 - i, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.translate(x, y); ctx.rotate(Math.atan2(y - py, x - px)); ctx.fillStyle = '#4b5a3a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 9 * big, 5 * big, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d9b44a'; ctx.beginPath(); ctx.arc(6 * big, 0, 2.5 * big, 0, 7); ctx.fill(); }
    else boom(ctx, f.x2, f.y2, (p - fly) / (1 - fly), Math.max(f.r, 26) * big);
  } else if (kind === 'heal') {
    const fly = 0.5;
    if (p < fly) { const q = p / fly, [x, y] = arc(q, Math.min(50, len * 0.25));
      ctx.fillStyle = '#7fd17a'; ctx.globalAlpha = 0.7; const [tx, ty] = arc(Math.max(0, q - 0.12), Math.min(50, len * 0.25)); plus(ctx, tx, ty, 4);
      ctx.globalAlpha = 1; ctx.translate(x, y); ctx.rotate(p * 20); ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, -7 * big, -5 * big, 14 * big, 10 * big, 3); ctx.fill(); ctx.stroke(); }
    else { const a = (p - fly) / (1 - fly); ctx.strokeStyle = '#7fd17a'; ctx.lineWidth = 3; ctx.globalAlpha = (1 - a) * 0.8; ctx.beginPath(); ctx.arc(f.x2, f.y2, (10 + a * 18) * big, 0, 7); ctx.stroke();
      ctx.fillStyle = '#58c152'; ctx.globalAlpha = 1 - a; for (let i = 0; i < 4; i++) { const q = i * Math.PI / 2 + 0.6; plus(ctx, f.x2 + Math.cos(q) * (8 + a * 20), f.y2 + Math.sin(q) * (8 + a * 20) - a * 8, 5 * big); } }
  } else if (kind === 'bolt') {
    const seg = 6, nx = -dy / len, ny = dx / len, step = Math.floor(p * 5);      // 지그재그 번개 (잠깐씩 모양이 바뀐다)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy - 12);
    for (let i = 1; i < seg; i++) { const j = (((Math.sin((f.x1 + f.y2) * 0.37 + i * 12.9898 + step * 78.233) * 43758.5453) % 1 + 1) % 1 - 0.5) * 26, [x, y] = at(i / seg); ctx.lineTo(x + nx * j, y - 12 * (1 - i / seg) + ny * j); }
    ctx.lineTo(f.x2, f.y2); ctx.globalAlpha = (1 - p) * 0.9; ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 6 * big; ctx.stroke(); ctx.strokeStyle = '#fffbe6'; ctx.lineWidth = 2 * big; ctx.globalAlpha = 1 - p; ctx.stroke();
    ctx.strokeStyle = '#6cc3ff'; ctx.lineWidth = 3; ctx.globalAlpha = (1 - p) * 0.9; ctx.beginPath(); ctx.arc(f.x2, f.y2, (8 + p * 20) * big, 0, 7); ctx.stroke();
  } else if (kind === 'gas') {
    const R = Math.max(f.r, 28) * big;
    for (let i = 0; i < 5; i++) { const q = Math.min(1, p * 2.2 - i * 0.1); if (q <= 0) continue; const [x, y] = at(q), spread = q >= 1 ? (p - 0.45) * 1.6 : 0, an = i * 1.9;
      ctx.globalAlpha = (q >= 1 ? 1 - p : 0.8) * 0.55; ctx.fillStyle = i % 2 ? '#c9e6a4' : '#a8d47c';
      ctx.beginPath(); ctx.arc(x + Math.cos(an) * R * 0.45 * spread, y + Math.sin(an) * R * 0.35 * spread - spread * 6, 8 + q * 6 + spread * R * 0.35, 0, 7); ctx.fill(); }
  } else if (kind === 'laser') {
    if (p < 0.55) { ctx.globalAlpha = 0.3 * (1 - p); ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.globalAlpha = 1 - p; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x2, f.y2, 9, 0, 7); ctx.moveTo(f.x2 - 13, f.y2); ctx.lineTo(f.x2 + 13, f.y2); ctx.moveTo(f.x2, f.y2 - 13); ctx.lineTo(f.x2, f.y2 + 13); ctx.stroke(); }
    if (p > 0.35) boom(ctx, f.x2, f.y2, (p - 0.35) / 0.65, Math.max(f.r, 24) * big);
  } else {      // wave: 표적 쪽으로 번져 가는 전파 호
    ctx.lineCap = 'round'; ctx.lineWidth = 3 * big;
    for (let i = 0; i < 3; i++) { const q = p * 1.3 - i * 0.16; if (q <= 0 || q > 1) continue; const [x, y] = at(q);
      ctx.globalAlpha = (1 - q) * 0.9 + 0.1; ctx.strokeStyle = i % 2 ? '#7fd17a' : '#6cc3ff'; ctx.beginPath(); ctx.arc(x - Math.cos(ang) * 14, y - Math.sin(ang) * 14, 14 + q * 8, ang - 0.7, ang + 0.7); ctx.stroke(); }
    if (p > 0.6) { const a = (p - 0.6) / 0.4; ctx.fillStyle = '#58c152'; ctx.globalAlpha = 1 - a; plus(ctx, f.x2, f.y2 - a * 10, 6 * big);
      ctx.strokeStyle = '#6cc3ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(f.x2, f.y2, 8 + a * 16, 0, 7); ctx.stroke(); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

const anim = new WeakMap();      // 유닛마다 공격 동작의 시작 시각(화면용, 실제 시간) — 유닛이 사라지면 같이 사라진다
function unit(ctx, b, u, p, k, now, quality) {
  const lv = Math.min(u.level, GRADES.length - 1), gcol = GRADES[lv].color;
  const fy = p.y + FEET - 5;
  // 발밑: 소집·진급 때 번쩍임, 히든 계급의 금빛, 병과 색 띠, 그림자
  if (u.flash > 0) { ctx.fillStyle = `rgba(255,212,94,${u.flash})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 50, 26, 0, 0, 7); ctx.fill();
    fx(ctx, 'fx_poof', p.x, p.y - 4, 96 * (1.35 - u.flash * 0.45), 0, u.flash * 0.9); }      // 소집·진급 순간: 별이 튀는 구름
  const hero = u.hidden ? heroOf(u) : null;
  if (hero) {      // 전설의 용사: 용사 색으로 타오르는 발밑(각성하면 고리가 하나 더), 위로 피어오르는 불티
    const pu = 0.5 + 0.5 * Math.sin(now * 4 + u.id), aw = u.level > hero.level;
    ctx.fillStyle = hero.color; ctx.globalAlpha = 0.34 + 0.16 * pu; ctx.beginPath(); ctx.ellipse(p.x, fy, 46, 21, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = hero.color; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(p.x, fy, 44 + pu * 2, 20 + pu, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(p.x, fy, 38, 16.5, 0, 0, 7); ctx.stroke();
    if (aw) { ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -now * 26; ctx.beginPath(); ctx.ellipse(p.x, fy, 51, 24, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; }
    if (quality > 0) for (let i = 0; i < (aw ? 5 : 3); i++) { const ph = (now * 0.7 + i * 0.37 + u.id * 0.13) % 1, sx = p.x + Math.sin(i * 2.4 + u.id) * 30, sy = fy - ph * 66;
      ctx.globalAlpha = (1 - ph) * 0.9; ctx.fillStyle = i % 2 ? '#fff6d6' : hero.color; ctx.beginPath(); ctx.arc(sx + Math.sin(now * 3 + i) * 3, sy, 2.6 * (1 - ph * 0.5), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (u.hidden) { ctx.fillStyle = `rgba(255,212,94,${0.3 + 0.12 * Math.sin(now * 3 + u.id)})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 42, 19, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]); }
  // 계급대별 모습: 병 → 부사관 → 위관 → 영관 → 장성으로 갈수록 몸집이 커지고 받침대·깃발·망토·후광이 붙는다
  const grp = rankGroup(b, u), size = CHAR * RANK_SIZE[lv], top = p.y + FEET - size;      // grp: 그림·장식이 바뀌는 계급대(병·부사관·위관·영관·장성), lv: 계급
  if (grp === 4 && quality > 0) {      // 장성: 뒤에서 천천히 도는 금빛 햇살
    ctx.save(); ctx.translate(p.x, p.y - 8); ctx.rotate(now * 0.5 + u.id); ctx.fillStyle = 'rgba(255,214,94,.3)';
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -62); ctx.lineTo(9, -62); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // 발밑(받침대: 청동 → 은 → 금, 병과 색 띠, 그림자)은 바뀌지 않으므로 한 번 그려 두고 복사한다
  // 발밑 원판: 등급 색(노말 회색 · 매직 초록 · 레어 파랑 · 영웅 보라 · 유니크 주황 · 전설 금 · 초월 빨강). 한눈에 등급이 보이도록 크고 진하게, 모든 등급에 깐다
  const ped = v2Art('ped_' + lv);
  if (ped) { if (hero) fx(ctx, 'st_hero', p.x, fy + 3, 118 + 6 * Math.sin(now * 4 + u.id), 0, 0.9); put(ctx, fit(ped, 84, k), p.x - 42, fy + 4 - 42); }      // 새 그림체: 등급 색 받침대 그림(용사는 그 아래 금빛 마법진)
  else ctx.drawImage(spriteBox(['ub2', lv].join(':'), k, UB_BOX, c => {
    const rx = 35, ry = 13.5;
    c.fillStyle = 'rgba(40,24,10,.28)'; c.beginPath(); c.ellipse(0, 9, rx + 2, ry + 1, 0, 0, 7); c.fill();                               // 바닥 그림자
    c.fillStyle = gcol; c.beginPath(); c.ellipse(0, 6, rx, ry, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(30,18,8,.5)'; c.fill();              // 옆면: 등급 색을 어둡게
    c.strokeStyle = '#2b2118'; c.lineWidth = 2.2; c.stroke();
    c.fillStyle = gcol; c.beginPath(); c.ellipse(0, 1, rx, ry, 0, 0, 7); c.fill(); c.strokeStyle = '#2b2118'; c.lineWidth = 2.2; c.stroke();   // 윗면: 등급 색 그대로
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 1, rx - 5, ry - 3.6, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();      // 윗면 밝은 테
    c.fillStyle = 'rgba(40,24,10,.22)'; c.beginPath(); c.ellipse(0, 1.5, 17, 5.5, 0, 0, 7); c.fill();                                       // 발 그림자
  }), p.x + UB_BOX[0], fy + UB_BOX[1], UB_BOX[2] - UB_BOX[0], UB_BOX[3] - UB_BOX[1]);
  // 캐릭터: 가만히 있을 때는 숨쉬듯 조금 움직이고, 사격할 때는 반동으로 튄다. 발을 기준으로 커졌다 작아진다
  const fire = u.fireT > 0 ? Math.sin((1 - u.fireT / 0.16) * Math.PI) : 0;
  // 그림 고르기: 용사는 그 군별의 용사 그림, 그 밖에는 군별·병과 그림. 아직 안 읽혔으면 null(받침대만 보인다)
  const heroIm = hero ? v2HeroArt(b.id, hero.id) : null, im = heroIm || unitImage(b.id, u.type);
  const stunned = u.stunT > 0;
  // 계급 장식(그림): 위관 = 흰 깃발 하나, 영관 = 붉은·푸른 깃발, 장성 = 햇살 + 망토(+ 머리 위 금별). 각성한 용사 = 금빛 날개(+ 왕관). 캐릭터보다 먼저 찍어 뒤에 놓는다
  const deco = (name, cx, by, w, flip = false) => { const im2 = v2Art(name); if (!im2) return; const f2 = fit(im2, w, k, flip); put(ctx, f2, cx - w / 2, by - w); };      // (cx, by): 그림 칸의 가로 가운데 · 아랫변
  const awake = hero && u.level > hero.level;
  if (awake) deco('rank_wings', p.x, p.y + FEET - size * 0.26, size * 1.22);
  else if (!hero && grp === 2) deco('rank_pennant', p.x + size * 0.36, p.y + FEET - size * 0.3, size * 0.62);
  else if (!hero && grp === 3) { deco('rank_banner_r', p.x - size * 0.36, p.y + FEET - size * 0.28, size * 0.7, true); deco('rank_banner_b', p.x + size * 0.36, p.y + FEET - size * 0.28, size * 0.7); }
  else if (!hero && grp === 4) { deco('rank_sun', p.x, p.y + FEET - size * 0.3, size * 1.02); deco('rank_cape', p.x, p.y + FEET + 2, size * 0.98); }      // 햇살은 머리 뒤에만(윗줄 유닛을 덮지 않게)
  if (stunned) ctx.globalAlpha = 0.55;
  if (im) {
    // 공격 동작: 대기 → 준비(겨눔, 몸을 살짝 뒤로) → 발사(앞으로 튀며 커졌다 돌아옴) → 준비(되돌아옴) → 대기. 그림 세 장을 바꿔 찍고 그 사이는 밀고 당기는 움직임으로 잇는다.
    //  A: 동작이 흐른 정도(0 → 1). 게임 시간이 아니라 실제 시간으로 흐른다 — 배속을 올려도 동작이 눈에 보이게(게임 시간으로 하면 ×1에서 0.15초, ×3에서 0.05초 만에 지나간다).
    //  길이는 0.26초, 공격이 그보다 잦으면 공격 간격의 90%. 준비·발사 그림은 1.75배 칸이고 머리 자리와 발 높이가 대기 그림과 같아, 같은 발 자리에 겹쳐 찍으면 몸이 제자리에 있다.
    let an = anim.get(u); if (!an) anim.set(u, an = { t: -9, last: 0, len: 0.26 });
    if (u.atkT > an.last + 0.001) { an.len = Math.max(0.1, Math.min(0.26, (now - an.t) * 0.9)); an.t = now; }      // 코어가 atkT를 다시 채웠다 = 방금 공격했다
    an.last = u.atkT;
    const A = !stunned && now - an.t < an.len ? (now - an.t) / an.len : -1, dir = u.faceL ? -1 : 1;
    const fireIm = A < 0 ? null : heroIm ? v2HeroArt(b.id, hero.id, '_atk') : unitAtkImage(b.id, u.type), rdyIm = A < 0 ? null : (heroIm ? v2HeroArt(b.id, hero.id, '_rdy') : unitRdyImage(b.id, u.type)) || fireIm;      // 용사는 용사 전용 동작 그림
    let pic = im, S = size, dx = 0, zx = 1, zy = 1;
    if (fireIm) { S = size * 1.75;
      if (A < 0.2) { const t = A / 0.2; pic = rdyIm; dx = -dir * 3 * t; zx = 1 - 0.02 * t; zy = 1 + 0.02 * t; }                       // 준비: 뒤로 살짝 당기며 늘어난다
      else if (A < 0.6) { const t = (A - 0.2) / 0.4, e = 1 - t; pic = fireIm; dx = dir * (5 * e * e - 1); zx = 1 + 0.07 * e * e; zy = 1 - 0.035 * e * e; }      // 발사: 앞으로 튀며 옆으로 늘었다 돌아온다
      else { const t = (A - 0.6) / 0.4; pic = rdyIm; dx = -dir * 2 * (1 - t); zx = 1; zy = 1 + 0.015 * (1 - t); } }                      // 되돌아옴
    const br = stunned || quality === 0 || fireIm ? 0 : Math.sin(now * 2.6 + u.id * 1.7) * 0.022, sx = (1 + br) * zx, sy = (1 - br) * zy;      // 가만히 있을 때: 숨쉬듯 통통(발을 기준으로 가로세로가 번갈아 늘었다 준다)
    const hop = fireIm ? 0 : fire * 5, f = fit(pic, S, k, !!u.faceL, OUTLINE);      // 공격 그림이 아직 없을 때만 위로 튄다
    ctx.drawImage(f.cv, p.x + dx + (f.x - S / 2) * sx, p.y + FEET - hop + (f.y - S) * sy, f.w * sx, f.h * sy); }
  ctx.globalAlpha = 1;
  if (!stunned) {      // 머리 위: 장성의 금별, 각성 용사의 왕관 (살짝 떠서 오르내린다)
    const bob = quality > 0 ? Math.sin(now * 3 + u.id) * 1.5 : 0;
    if (awake) deco('rank_crown', p.x, top + size * 0.1 + bob, size * 0.36); else if (!hero && grp === 4) deco('rank_star', p.x, top + size * 0.08 + bob, size * 0.3); }
  if (grp === 4 && quality > 0) for (let i = 0; i < 3; i++) {      // 장성: 주변에서 반짝이는 빛
    const ph = now * 2.4 + i * 2.1 + u.id, a = Math.max(0, Math.sin(ph)), sx = p.x + [-0.44, 0.46, 0.1][i] * size, sy = top + [0.3, 0.18, 0.02][i] * size, r = 3 + a * 5;
    ctx.fillStyle = `rgba(255,248,200,${a})`; ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.quadraticCurveTo(sx, sy, sx + r, sy); ctx.quadraticCurveTo(sx, sy, sx, sy + r); ctx.quadraticCurveTo(sx, sy, sx - r, sy); ctx.quadraticCurveTo(sx, sy, sx, sy - r); ctx.fill();
  }
  if (stunned && v2Art('fx_stun')) { const w2 = size * 0.5, wob = Math.sin(now * 7 + u.id) * 3; put(ctx, fit(v2Art('fx_stun'), w2, k), p.x - w2 / 2 + wob, top - w2 * 0.75); }      // 기절: 머리 위에서 흔들리는 별 그림
  else if (u.burnT > 0 && v2Art('fx_flame')) { const w2 = size * 0.42 * (1 + Math.sin(now * 14 + u.id) * 0.08); put(ctx, fit(v2Art('fx_flame'), size * 0.42, k), p.x - w2 / 2, top - w2 * 0.7); }      // 화염: 머리 위 불꽃 그림
  else if (stunned) { ctx.fillStyle = '#ffd45e'; ctx.strokeStyle = '#3a2a08'; ctx.lineWidth = 1.2;     // 기절: 머리 위를 도는 별
    for (let i = 0; i < 3; i++) { const a = now * 5 + i * 2.1, sx = p.x + Math.cos(a) * 22, sy = top + 4 + Math.sin(a) * 6;
      ctx.beginPath(); for (let j = 0; j < 10; j++) { const q = -Math.PI / 2 + j * Math.PI / 5, rr2 = j % 2 ? 2.6 : 6; ctx[j ? 'lineTo' : 'moveTo'](sx + Math.cos(q) * rr2, sy + Math.sin(q) * rr2); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  else if (u.burnT > 0) { const fl = 1 + Math.sin(now * 14 + u.id) * 0.15;                          // 화염: 머리 위 불꽃
    ctx.fillStyle = '#ff7a2e'; ctx.beginPath(); ctx.moveTo(p.x, top + 15 - 24 * fl); ctx.quadraticCurveTo(p.x + 11, top + 9, p.x, top + 15); ctx.quadraticCurveTo(p.x - 11, top + 9, p.x, top + 15 - 24 * fl); ctx.fill();
    ctx.fillStyle = '#ffd45e'; ctx.beginPath(); ctx.arc(p.x, top + 11, 3.5, 0, 7); ctx.fill(); }
}
// 계급장(칸 오른쪽 위)과 이름표(발 아래). 캐릭터를 모두 그린 뒤에 찍는다 — 아랫줄 캐릭터의 머리가 윗줄 이름표를 가리지 않게
function unitTags(ctx, b, u, p, k) {
  const tier = u.level >= b.tiers[1] ? 2 : u.level >= b.tiers[0] ? 1 : 0, rank = rankName(b, u), tk = u.type.join('+');
  const o = { branchId: b.id, bname: b.name, bcol: b.color, nick: charName(b, u), type: u.type, tier, rank, hidden: !!u.hidden, insig: rankInsig(b, u), gcol: GRADES[Math.min(u.level, GRADES.length - 1)].color };
  const tkey = [b.id, tk, tier, rank, u.hidden || 0, o.insig.join(''), insigReady() ? 'i' : ''].join(':');
  ctx.drawImage(spriteBox('utb:' + tkey, k, BADGE_BOX, c => drawTag(c, o, 'badge')), p.x + BADGE_BOX[0], p.y + BADGE_BOX[1], BADGE_BOX[2] - BADGE_BOX[0], BADGE_BOX[3] - BADGE_BOX[1]);
  ctx.drawImage(spriteBox('utl:' + tkey, k, LABEL_BOX, c => drawTag(c, o, 'label')), p.x + LABEL_BOX[0], p.y + LABEL_BOX[1], LABEL_BOX[2] - LABEL_BOX[0], LABEL_BOX[3] - LABEL_BOX[1]);
}
