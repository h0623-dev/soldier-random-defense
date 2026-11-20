// 전장 그리기 — 위에서 비스듬히 내려다본 느낌. 바닥은 두께가 있는 발판, 캐릭터는 그 위에 서 있고 아래쪽 줄이 위쪽 줄을 가린다.
import { CLASS_INFO } from './data.js';
import { FIELD, CELL, CFG, AREAS, RANK_GROUP, canMerge, rankName, rankInsig } from './core.js';
import { drawTag, drawSoldierFallback, unitImage, unitAtkImage, unitArtTier, ENEMY_DRAW, ENEMY_R, sprite, enemyArt, loadArt } from './sprites.js';
loadArt();

const DEPTH = 18;                                      // 발판 블록 옆면 두께 (높이감)
const FEET = 34, CHAR = 84;                            // 발판 중심에서 캐릭터 발까지, 캐릭터 그림 크기
// 계급대(계급장 모양으로 구분): 병 · 부사관 · 위관 · 영관 · 장성. 계급대가 오를수록 몸집과 장식이 달라진다
const RANK_SIZE = [0.9, 0.97, 1.04, 1.11, 1.2];
const PEDESTAL = [null, ['#c98a4b', '#7a4a22'], ['#dfe5ea', '#7f8a94'], ['#ffd45e', '#a8780f'], ['#ffe27a', '#b07c08']];
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // 장식 배치용 고정 난수

// ── 지역별 배경 색과 장식 ──────────────────────────────────
//  ground 땅(위→아래) · speck 땅 무늬(밝은/어두운) · road [테두리, 길, 길 가운데, 진행 표시] · pad [윗면 A, 윗면 B, 옆면 위, 옆면 아래, 밝은 모서리, 어두운 모서리]
const THEMES = {
  meadow:   { ground: ['#46683a', '#35522d'], speck: ['rgba(140,190,100,.16)', 'rgba(20,40,18,.2)'], road: ['#4a3b25', '#c9ad74', '#d6bc86', 'rgba(110,84,46,.5)'],
              pad: ['#a9bb6e', '#9db063', '#5f6f3a', '#46532b', '#d3e39a', '#6f7f43'], decor: 'bush' },
  beach:    { ground: ['#3d93ad', '#2a6f8c'], speck: ['rgba(255,255,255,.2)', 'rgba(10,50,80,.2)'], road: ['#a8915a', '#ecdba2', '#f5e7b8', 'rgba(150,120,60,.45)'],
              pad: ['#e2cf96', '#d6c287', '#a38b55', '#836d3f', '#f6e9bd', '#b39a62'], decor: 'palm' },
  desert:   { ground: ['#d9a95c', '#bf8c43'], speck: ['rgba(255,235,180,.25)', 'rgba(120,70,20,.18)'], road: ['#8a6532', '#f0d9a0', '#f7e6b8', 'rgba(140,100,50,.45)'],
              pad: ['#d2804f', '#c67444', '#93492a', '#70341c', '#eda477', '#a65a35'], decor: 'cactus' },
  snow:     { ground: ['#e3edf5', '#c5d5e4'], speck: ['rgba(255,255,255,.6)', 'rgba(120,150,180,.2)'], road: ['#667487', '#a9b6c5', '#b8c4d1', 'rgba(70,85,105,.45)'],
              pad: ['#f6fafc', '#e7eff6', '#a5b8cb', '#8399b0', '#ffffff', '#b9c9d9'], decor: 'pine' },
  city:     { ground: ['#4c5159', '#3a3e45'], speck: ['rgba(255,255,255,.07)', 'rgba(0,0,0,.2)'], road: ['#22252a', '#6a6f78', '#777d87', 'rgba(255,210,90,.55)'],
              pad: ['#bdb7aa', '#aea89b', '#77726a', '#5a564f', '#dcd6c8', '#8b867b'], decor: 'rubble' },
  jungle:   { ground: ['#1f4d2e', '#153821'], speck: ['rgba(110,200,90,.16)', 'rgba(5,25,10,.3)'], road: ['#3a2b17', '#8c7148', '#9a7f55', 'rgba(60,40,15,.5)'],
              pad: ['#76a350', '#699546', '#3f612d', '#2d4720', '#a3cc78', '#507a36'], decor: 'palm' },
  volcano:  { ground: ['#3b2b29', '#281b1b'], speck: ['rgba(255,120,40,.3)', 'rgba(0,0,0,.3)'], road: ['#160e0e', '#6c5852', '#7a665f', 'rgba(255,140,60,.5)'],
              pad: ['#91867d', '#82776f', '#4e443e', '#372f2a', '#b5aa9f', '#5f554e'], decor: 'rock' },
  harbor:   { ground: ['#2f6682', '#234e66'], speck: ['rgba(255,255,255,.14)', 'rgba(5,30,50,.25)'], road: ['#33383f', '#8d939b', '#9aa0a8', 'rgba(255,255,255,.45)'],
              pad: ['#c4a871', '#b79b65', '#7d653a', '#5f4c2a', '#e0c792', '#927847'], decor: 'crate' },
  airfield: { ground: ['#5f7c4b', '#4d693d'], speck: ['rgba(170,210,120,.15)', 'rgba(20,40,18,.2)'], road: ['#24272b', '#50555b', '#5b6067', 'rgba(255,255,255,.6)'],
              pad: ['#c3c8cd', '#b3b8bd', '#7c8187', '#5f6469', '#e3e7eb', '#8e9399'], decor: 'crate' },
  hq:       { ground: ['#1d2132', '#11131e'], speck: ['rgba(255,70,70,.22)', 'rgba(0,0,0,.35)'], road: ['#07080d', '#3d4359', '#484f69', 'rgba(255,90,90,.55)'],
              pad: ['#5c6689', '#515a7b', '#313752', '#22273c', '#93a3e3', '#3d4563'], decor: 'rock' },
};
const DECOR = {
  bush(c, x, y, z) { c.fillStyle = '#2a4a25'; c.beginPath(); c.arc(x, y, 10 * z, 0, 7); c.fill(); c.fillStyle = '#4b7a3c'; c.beginPath(); c.arc(x - 2 * z, y - 3 * z, 7 * z, 0, 7); c.fill(); },
  palm(c, x, y, z) { c.strokeStyle = '#6b4a2a'; c.lineWidth = 4 * z; c.beginPath(); c.moveTo(x, y + 12 * z); c.quadraticCurveTo(x + 3 * z, y, x - 2 * z, y - 10 * z); c.stroke();
    c.fillStyle = '#2f8a3f'; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.75; c.beginPath(); c.ellipse(x - 2 * z + Math.cos(a) * 9 * z, y - 10 * z + Math.sin(a) * 7 * z, 9 * z, 3.6 * z, a, 0, 7); c.fill(); } },
  cactus(c, x, y, z) { c.fillStyle = '#4f8a45'; c.strokeStyle = '#2d5a2a'; c.lineWidth = 1.5; rr(c, x - 4 * z, y - 14 * z, 8 * z, 26 * z, 4 * z); c.fill(); c.stroke();
    rr(c, x - 12 * z, y - 6 * z, 6 * z, 12 * z, 3 * z); c.fill(); c.stroke(); rr(c, x + 6 * z, y - 10 * z, 6 * z, 12 * z, 3 * z); c.fill(); c.stroke(); },
  pine(c, x, y, z) { c.fillStyle = '#5b4030'; c.fillRect(x - 2 * z, y + 6 * z, 4 * z, 8 * z);
    for (let i = 0; i < 3; i++) { c.fillStyle = '#2f6a4a'; c.beginPath(); c.moveTo(x, y - 18 * z + i * 7 * z); c.lineTo(x + (8 + i * 3) * z, y - 4 * z + i * 6 * z); c.lineTo(x - (8 + i * 3) * z, y - 4 * z + i * 6 * z); c.closePath(); c.fill();
      c.fillStyle = '#f4f9fc'; c.beginPath(); c.moveTo(x, y - 18 * z + i * 7 * z); c.lineTo(x + 4 * z, y - 11 * z + i * 7 * z); c.lineTo(x - 4 * z, y - 11 * z + i * 7 * z); c.closePath(); c.fill(); } },
  rubble(c, x, y, z) { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#8b8f96' : '#6d7178'; c.strokeStyle = '#2b2e33'; c.lineWidth = 1.2;
      rr(c, x - 12 * z + i * 6 * z, y - 4 * z + (i % 2) * 6 * z - i * 2 * z, 11 * z, 8 * z, 2); c.fill(); c.stroke(); } },
  rock(c, x, y, z) { c.fillStyle = '#4a4442'; c.beginPath(); c.moveTo(x - 12 * z, y + 8 * z); c.lineTo(x - 5 * z, y - 10 * z); c.lineTo(x + 6 * z, y - 6 * z); c.lineTo(x + 12 * z, y + 8 * z); c.closePath(); c.fill();
    c.fillStyle = '#7a716c'; c.beginPath(); c.moveTo(x - 5 * z, y - 10 * z); c.lineTo(x + 6 * z, y - 6 * z); c.lineTo(x, y + 2 * z); c.closePath(); c.fill(); },
  crate(c, x, y, z) { c.fillStyle = '#a9824f'; c.strokeStyle = '#4f3a1e'; c.lineWidth = 1.6; rr(c, x - 10 * z, y - 8 * z, 20 * z, 17 * z, 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 10 * z, y - 8 * z); c.lineTo(x + 10 * z, y + 9 * z); c.moveTo(x + 10 * z, y - 8 * z); c.lineTo(x - 10 * z, y + 9 * z); c.stroke(); },
};

// ── 배경(움직이지 않는 부분)은 지역마다 한 번만 그려 두고 복사한다 ──────────
let bg = null, bgKey = '';
function background(k, area, map) {
  const key = area + '@' + k.toFixed(3); if (bg && bgKey === key) return bg;
  if (!bg) bg = document.createElement('canvas');
  bg.width = Math.ceil(FIELD.w * k); bg.height = Math.ceil(FIELD.h * k); bgKey = key;
  const c = bg.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
  const T = THEMES[AREAS[area].theme], hw = CELL.w / 2, hh = CELL.h / 2, deco = DECOR[T.decor], seed = area * 1000;
  // 땅
  const gr = c.createLinearGradient(0, 0, 0, FIELD.h); gr.addColorStop(0, T.ground[0]); gr.addColorStop(1, T.ground[1]);
  c.fillStyle = gr; c.fillRect(0, 0, FIELD.w, FIELD.h);
  for (let i = 0; i < 110; i++) { c.fillStyle = T.speck[i % 2];
    c.beginPath(); c.ellipse(rnd(seed + i) * FIELD.w, rnd(seed + i + 99) * FIELD.h, 10 + rnd(i + 7) * 24, 4 + rnd(i + 3) * 8, 0, 0, 7); c.fill(); }
  // 길: 발판 사이로 꺾이며 도는 길 (테두리 → 길 → 밝은 가운데 → 진행 방향 표시)
  const road = (w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); map.path.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p.x, p.y)); c.closePath(); c.stroke(); };
  road(98, T.road[0]); road(90, T.road[1]); road(70, T.road[2]);
  for (let i = 0; i < 130; i++) { const p = map.pathPos(rnd(seed + i + 500) * map.len), ox = (rnd(i + 900) - 0.5) * 70, oy = (rnd(i + 300) - 0.5) * 70;
    c.fillStyle = i % 3 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.16)'; c.beginPath(); c.ellipse(p.x + ox, p.y + oy, 3 + rnd(i) * 5, 2 + rnd(i + 1) * 2, 0, 0, 7); c.fill(); }
  c.fillStyle = T.road[3];
  for (let s = 60; s < map.len; s += 120) { const p = map.pathPos(s); c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.dy, p.dx));
    c.beginPath(); c.moveTo(11, 0); c.lineTo(-7, -10); c.lineTo(-2, 0); c.lineTo(-7, 10); c.closePath(); c.fill(); c.restore(); }
  // 발판 블록: 바닥 그림자 → 옆면 → 윗면(체크 무늬) → 가장자리 선. 이웃한 발판은 한 덩어리로 이어진다
  const has = (r, cc) => map.padSet.has(r * 10 + cc);
  for (const s of map.slots) if (!has(s.r + 1, s.c)) { c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(s.x - hw + 4, s.y + hh - 8, CELL.w, DEPTH + 10); }
  for (const s of map.slots) {
    const x = s.x - hw, y = s.y - hh - 8;       // 윗면은 칸보다 조금 위로 올라가 있다
    if (!has(s.r + 1, s.c)) { const fg = c.createLinearGradient(0, y + CELL.h, 0, y + CELL.h + DEPTH); fg.addColorStop(0, T.pad[2]); fg.addColorStop(1, T.pad[3]);
      c.fillStyle = fg; c.fillRect(x, y + CELL.h - 1, CELL.w, DEPTH + 1);
      c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 1; i < 4; i++) c.fillRect(x + i * 25, y + CELL.h, 2, DEPTH); }
    c.fillStyle = T.pad[(s.r + s.c) % 2]; c.fillRect(x, y, CELL.w, CELL.h);
    c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x + 6, y + 6, CELL.w - 12, CELL.h - 12);
  }
  c.lineWidth = 3; c.lineCap = 'square';
  for (const s of map.slots) {
    const x = s.x - hw, y = s.y - hh - 8, edge = (col, x1, y1, x2, y2) => { c.strokeStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    if (!has(s.r - 1, s.c)) edge(T.pad[4], x, y + 1.5, x + CELL.w, y + 1.5);
    if (!has(s.r, s.c - 1)) edge(T.pad[4], x + 1.5, y, x + 1.5, y + CELL.h);
    if (!has(s.r, s.c + 1)) edge(T.pad[5], x + CELL.w - 1.5, y, x + CELL.w - 1.5, y + CELL.h);
    if (!has(s.r + 1, s.c)) edge(T.pad[5], x, y + CELL.h - 1.5, x + CELL.w, y + CELL.h - 1.5);
  }
  // 장식: 빈 칸에는 모래주머니 진지와 지역 장식, 가장자리에도 지역 장식, 길이 시작되는 곳에 깃발
  for (const d of map.decor) {
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(d.x, d.y + 22, 40, 14, 0, 0, 7); c.fill();
    for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) { const bx = d.x - 30 + i * 24 + row * 12, by = d.y + 14 - row * 15;
      c.fillStyle = row % 2 ? '#b8a57a' : '#a89468'; c.strokeStyle = '#5b4a31'; c.lineWidth = 1.5; rr(c, bx, by, 23, 15, 6); c.fill(); c.stroke(); }
    deco(c, d.x - 30, d.y - 22, 1.3);
  }
  for (let i = 0; i < 20; i++) deco(c, i % 2 ? FIELD.w - 7 : 7, 24 + rnd(seed + i + 40) * (FIELD.h - 48), 0.8);
  const f = map.path[0];
  c.strokeStyle = '#3a2f20'; c.lineWidth = 3; c.beginPath(); c.moveTo(f.x - 38, f.y + 30); c.lineTo(f.x - 38, f.y - 36); c.stroke();
  c.fillStyle = '#d0453a'; c.beginPath(); c.moveTo(f.x - 38, f.y - 36); c.lineTo(f.x - 12, f.y - 28); c.lineTo(f.x - 38, f.y - 20); c.closePath(); c.fill();
  return bg;
}

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
  ctx.drawImage(background(k, g.area, g.map), 0, 0, FIELD.w, FIELD.h);
  const sel = ui.sel != null ? g.units[ui.sel] : null;
  // 발판 강조: 조합할 수 있는 칸(노랑), 선택한 칸(흰색)
  SLOTS.forEach((s, i) => {
    const x = s.x - CELL.w / 2 + 4, y = s.y - CELL.h / 2 - 4, mergeable = sel && i !== ui.sel && canMerge(g, ui.sel, i);
    if (mergeable) { ctx.fillStyle = `rgba(255,212,94,${0.32 + 0.18 * Math.sin(now * 6)})`; rr(ctx, x, y, CELL.w - 8, CELL.h - 8, 12); ctx.fill();
      ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 4; ctx.stroke(); }
    else if (sel && i === ui.sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rr(ctx, x, y, CELL.w - 8, CELL.h - 8, 12); ctx.stroke(); }
  });
  // 선택 유닛 사거리 · 지원 범위 (바닥에 눕힌 원)
  if (sel) {
    const p = SLOTS[sel.slot];
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, sel.stats.range * (1 + sel.rangeUp), 0, 7); ctx.fill(); ctx.stroke();
    if (sel.hidden || sel.stats.haste > 0) { ctx.strokeStyle = sel.hidden ? '#ffd45e' : CLASS_INFO.med.color; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(p.x, p.y, CFG.auraRadius, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  // 적: 화면 아래쪽에 있는 것이 위쪽 것을 가리도록 y 순서로 그린다
  const es = g.enemies.length > 1 ? [...g.enemies].sort((p, q) => p.y - q.y) : g.enemies;
  for (const e of es) enemy(ctx, e, k, quality);
  // 아군 (칸 번호 순서 = 위쪽 줄부터)
  for (const u of g.units) if (u) unit(ctx, b, u, SLOTS[u.slot], k, now, quality);
  // 사격 효과
  const fxList = quality > 0 ? g.effects : g.effects.slice(-12);   // 최저 품질에서는 사격 효과 수를 줄인다
  for (const f of fxList) {
    if (f.txt) { const a = Math.min(1, f.t / 0.4), up = (1 - Math.min(1, f.t)) * 18; ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${f.small ? 14 : 22}px sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = '#1b1208'; ctx.strokeText(f.txt, f.x, f.y - up);
      ctx.fillStyle = f.small ? '#d7e3ee' : '#ffd45e'; ctx.fillText(f.txt, f.x, f.y - up); ctx.globalAlpha = 1; continue; }
    if (f.puff) { const a = Math.max(0, f.t / 0.3); ctx.globalAlpha = Math.min(1, a) * (f.col ? 0.55 : 1); ctx.fillStyle = f.col || '#fff3c4';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.25 - a * 0.75), 0, 7); ctx.fill(); ctx.globalAlpha = 1; continue; }
    shot(ctx, f, quality);
  }
  // 지역 이동 연출: 화면이 어두워졌다 밝아지며 새 지역이 드러나고, 지역 이름 띠가 지나간다
  if (ui.trans) {
    const el = ui.trans.total - ui.trans.t, A = AREAS[ui.trans.area], T = THEMES[A.theme];
    const dark = el < 0.3 ? 1 : Math.max(0, 1 - (el - 0.3) / 0.7);
    if (dark > 0) { ctx.fillStyle = `rgba(8,10,6,${dark})`; ctx.fillRect(0, 0, FIELD.w, FIELD.h); }
    const inn = Math.min(1, el / 0.35), out = Math.min(1, ui.trans.t / 0.4), a = Math.min(inn, out), cy = FIELD.h * 0.42, slide = (1 - inn) * -160 + (1 - out) * 160;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,10,6,.86)'; ctx.fillRect(0, cy - 92, FIELD.w, 184);
    ctx.fillStyle = T.pad[0]; ctx.fillRect(0, cy - 92, FIELD.w, 6); ctx.fillRect(0, cy + 86, FIELD.w, 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = T.pad[4]; ctx.font = '800 24px sans-serif'; ctx.fillText(`작전 지역 ${ui.trans.area + 1} / ${AREAS.length}`, FIELD.w / 2 + slide, cy - 52);
    ctx.fillStyle = '#fff'; ctx.font = '900 58px sans-serif'; ctx.fillText(A.name, FIELD.w / 2 + slide, cy);
    ctx.fillStyle = '#ffb3a8'; ctx.font = '700 22px sans-serif'; ctx.fillText(`${(ui.trans.area + 1) * 10}단계 보스 — ${A.boss.name}`, FIELD.w / 2 - slide, cy + 54);
    ctx.globalAlpha = 1;
  }
  if (g.enemies.some(e => e.kind === 'boss')) {
    ctx.fillStyle = 'rgba(12,16,10,.8)'; rr(ctx, FIELD.w / 2 - 92, FIELD.h - 34, 184, 28, 14); ctx.fill();
    ctx.fillStyle = '#ff8478'; ctx.font = '800 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`보스 제한 ${Math.ceil(g.bossTimer)}초`, FIELD.w / 2, FIELD.h - 19);
  }
}

function enemy(ctx, e, k, quality) {
  const elite = e.kind === 'elite', art = elite ? 'armor' : e.kind;
  const r = ENEMY_R[e.kind], half = r + 8, left = e.left;
  const by = quality > 0 ? Math.sin(e.s * 0.22 + e.id) * (e.kind === 'boss' ? 1 : 1.8) : 0, fly = e.kind === 'fast' ? 9 : e.fly ? 16 : 0;
  // 바닥 그림자 · 상태 표시
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.85, r * 0.95, r * 0.36, 0, 0, 7); ctx.fill();
  if (elite) { ctx.fillStyle = 'rgba(160,90,220,.4)'; ctx.strokeStyle = '#c99bff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.6, r + 9, (r + 9) * 0.5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  if (e.dashT > 0) { ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y - 4, r + 12, 0, 7); ctx.stroke(); }
  else if (e.skill && e.skill.id === 'armor' && e.hp > e.maxHp * 0.5) { ctx.strokeStyle = '#cfd6dc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y - 4, r + 12, 0, 7); ctx.stroke(); }
  if (e.slowT > 0) { ctx.fillStyle = 'rgba(90,150,235,.5)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 4, (r + 4) * 0.45, 0, 0, 7); ctx.fill(); }
  if (e.vulnT > 0) { ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 5, (r + 5) * 0.45, 0, 0, 7); ctx.stroke(); }
  const im = (e.kind === 'boss' && bossImage(e.boss)) || (elite && enemyArt('elite')) || enemyArt(art) || sprite('e:' + art, half, k, ENEMY_DRAW[art]);
  if (left) { ctx.save(); ctx.translate(e.x, e.y + by - fly); ctx.scale(-1, 1); ctx.drawImage(im, -half, -half, half * 2, half * 2); ctx.restore(); }
  else ctx.drawImage(im, e.x - half, e.y - half + by - fly, half * 2, half * 2);
  ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(ctx, e.x - r - 1, e.y - half - 4 - fly, r * 2 + 2, 6, 3); ctx.fill();
  ctx.fillStyle = '#7be36a'; rr(ctx, e.x - r, e.y - half - 3 - fly, r * 2 * Math.max(0, e.hp / e.maxHp), 4, 2); ctx.fill();
  if (elite) { ctx.fillStyle = '#e9d6ff'; ctx.font = '800 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.ceil(e.life) + '초', e.x, e.y - half - 14); }
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
function boom(ctx, x, y, a, R) {                       // 폭발: 불덩이가 커지며 옅어지고 연기가 위로 흩어진다
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

function unit(ctx, b, u, p, k, now, quality) {
  const tier = u.level >= b.tiers[1] ? 2 : u.level >= b.tiers[0] ? 1 : 0, rank = rankName(b, u);
  const o = { branchId: b.id, type: u.type, tier, rank, hidden: !!u.hidden, insig: rankInsig(b, u) }, tk = u.type.join('+');
  const fy = p.y + FEET - 5;
  // 발밑: 소집·진급 때 번쩍임, 히든 계급의 금빛, 병과 색 띠, 그림자
  if (u.flash > 0) { ctx.fillStyle = `rgba(255,212,94,${u.flash})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 50, 26, 0, 0, 7); ctx.fill(); }
  if (u.hidden) { ctx.fillStyle = `rgba(255,212,94,${0.3 + 0.12 * Math.sin(now * 3 + u.id)})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 42, 19, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]); }
  // 계급대별 모습: 병 → 부사관 → 위관 → 영관 → 장성으로 갈수록 몸집이 커지고 받침대·깃발·망토·후광이 붙는다
  const grp = RANK_GROUP[o.insig[0]] || 0, size = CHAR * RANK_SIZE[grp], top = p.y + FEET - size;
  if (grp === 4 && quality > 0) {      // 장성: 뒤에서 천천히 도는 금빛 햇살
    ctx.save(); ctx.translate(p.x, p.y - 8); ctx.rotate(now * 0.5 + u.id); ctx.fillStyle = 'rgba(255,214,94,.3)';
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -62); ctx.lineTo(9, -62); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  if (grp > 0) {                       // 받침대: 청동 → 은 → 금 (두께가 있는 원판)
    const [topC, rimC] = PEDESTAL[grp], rx = 30 + grp * 2.5, ry = 12 + grp;
    ctx.fillStyle = rimC; ctx.beginPath(); ctx.ellipse(p.x, fy + 6, rx, ry, 0, 0, 7); ctx.fill();
    ctx.fillStyle = topC; ctx.beginPath(); ctx.ellipse(p.x, fy + 1, rx, ry, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, fy, rx - 3, ry - 2.5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = CLASS_INFO[u.type[0]].color; ctx.beginPath(); ctx.ellipse(p.x, fy, 31, 13, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
  ctx.strokeStyle = CLASS_INFO[u.type[1]].color; ctx.beginPath(); ctx.ellipse(p.x, fy, 31, 13, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(p.x, fy, 24, 9, 0, 0, 7); ctx.fill();
  // 캐릭터: 가만히 있을 때는 숨쉬듯 조금 움직이고, 사격할 때는 반동으로 튄다. 발을 기준으로 커졌다 작아진다
  const fire = u.fireT > 0 ? Math.sin((1 - u.fireT / 0.16) * Math.PI) : 0;
  const dy = (quality > 0 ? Math.sin(now * 2.2 + u.id * 1.7) * 1.2 : 0) - fire * 6, sc = 1 + fire * 0.07;
  const im = unitImage(b.id, u.type, grp) || sprite(['uc', b.id, tk, tier].join(':'), 62, k, c => drawSoldierFallback(c, o));
  const w = size * sc;
  const stunned = u.stunT > 0;
  // 등 뒤 장식 (캐릭터보다 먼저 그려 뒤에 놓는다): 위관 깃발 하나, 영관 깃발 둘, 장성 망토와 후광
  const own = unitArtTier(b.id, u.type, grp) === grp;      // 이 계급대 전용 그림이 있으면 깃발·망토·후광은 그리지 않는다(그림에 이미 차림이 있다)
  if (!own && (grp === 2 || grp === 3)) for (const sd of grp === 3 ? [-1, 1] : [1]) {
    const x0 = p.x + sd * size * 0.12, y0 = fy - 6, x1 = p.x + sd * size * 0.46, y1 = top + size * 0.1;
    ctx.strokeStyle = '#3a2f20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.fillStyle = grp === 3 ? b.color : '#f4f6f8'; ctx.strokeStyle = grp === 3 ? '#ffd45e' : '#1b1f17'; ctx.lineWidth = grp === 3 ? 2 : 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + sd * 20, y1 + 5); ctx.lineTo(x1 + sd * 17, y1 + 19); ctx.lineTo(x1 - sd * 3, y1 + 13); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (grp === 3) { ctx.fillStyle = '#ffd45e'; ctx.beginPath(); ctx.arc(x1 + sd * 8, y1 + 10, 3, 0, 7); ctx.fill(); }
  }
  if (grp === 4 && !own) {
    ctx.fillStyle = '#b3262e'; ctx.strokeStyle = '#1b1f17'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x - size * 0.2, top + size * 0.5); ctx.lineTo(p.x + size * 0.2, top + size * 0.5); ctx.lineTo(p.x + size * 0.42, fy); ctx.quadraticCurveTo(p.x, fy + 7, p.x - size * 0.42, fy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x + size * 0.4, fy - 3); ctx.quadraticCurveTo(p.x, fy + 4, p.x - size * 0.4, fy - 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,94,.95)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, top + size * 0.3, size * 0.4, 0, 7); ctx.stroke();
  }
  if (stunned) ctx.globalAlpha = 0.55;
  // 공격 직후에는 공격 자세 그림(_atk)으로 바꾼다. 그 그림은 가로세로 2배 크기이고 대기 그림 자리가 아래 가운데에 온다. 오른쪽을 보는 그림이라 표적이 왼쪽이면 뒤집는다
  const atk = u.atkT > 0 && !stunned ? unitAtkImage(b.id, u.type, grp) : null;
  if (atk) { ctx.save(); ctx.translate(p.x, p.y + FEET + dy); if (u.faceL) ctx.scale(-1, 1); ctx.drawImage(atk, -w, -w * 2, w * 2, w * 2); ctx.restore(); }
  else ctx.drawImage(im, p.x - w / 2, p.y + FEET - w + (stunned ? 0 : dy), w, w);
  ctx.globalAlpha = 1;
  if (grp === 4 && quality > 0) for (let i = 0; i < 3; i++) {      // 장성: 주변에서 반짝이는 빛
    const ph = now * 2.4 + i * 2.1 + u.id, a = Math.max(0, Math.sin(ph)), sx = p.x + [-0.44, 0.46, 0.1][i] * size, sy = top + [0.3, 0.18, 0.02][i] * size, r = 3 + a * 5;
    ctx.fillStyle = `rgba(255,248,200,${a})`; ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.quadraticCurveTo(sx, sy, sx + r, sy); ctx.quadraticCurveTo(sx, sy, sx, sy + r); ctx.quadraticCurveTo(sx, sy, sx - r, sy); ctx.quadraticCurveTo(sx, sy, sx, sy - r); ctx.fill();
  }
  if (stunned) { ctx.fillStyle = '#ffd45e'; ctx.strokeStyle = '#3a2a08'; ctx.lineWidth = 1.2;     // 기절: 머리 위를 도는 별
    for (let i = 0; i < 3; i++) { const a = now * 5 + i * 2.1, sx = p.x + Math.cos(a) * 20, sy = p.y - 46 + Math.sin(a) * 6;
      ctx.beginPath(); for (let j = 0; j < 10; j++) { const q = -Math.PI / 2 + j * Math.PI / 5, rr2 = j % 2 ? 2.6 : 6; ctx[j ? 'lineTo' : 'moveTo'](sx + Math.cos(q) * rr2, sy + Math.sin(q) * rr2); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  else if (u.burnT > 0) { const fl = 1 + Math.sin(now * 14 + u.id) * 0.15;                          // 화염: 머리 위 불꽃
    ctx.fillStyle = '#ff7a2e'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 62 * fl + 8); ctx.quadraticCurveTo(p.x + 11, p.y - 44, p.x, p.y - 38); ctx.quadraticCurveTo(p.x - 11, p.y - 44, p.x, p.y - 62 * fl + 8); ctx.fill();
    ctx.fillStyle = '#ffd45e'; ctx.beginPath(); ctx.arc(p.x, p.y - 42, 3.5, 0, 7); ctx.fill(); }
  ctx.drawImage(sprite(['ut', tk, tier, rank, o.hidden ? 1 : 0, o.insig.join('')].join(':'), 62, k, c => drawTag(c, o)), p.x - 62, p.y - 62, 124, 124);
}
