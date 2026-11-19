// 전장 그리기 — 위에서 비스듬히 내려다본 느낌. 바닥은 두께가 있는 발판, 캐릭터는 그 위에 서 있고 아래쪽 줄이 위쪽 줄을 가린다.
import { CLASS_INFO } from './data.js';
import { FIELD, PATH, SLOTS, CELL, PATH_LEN, CFG, decorPos, pathPos, canMerge, rankName, rankInsig } from './core.js';
import { drawTag, drawSoldierFallback, unitImage, ENEMY_DRAW, ENEMY_R, sprite, enemyArt, loadArt } from './sprites.js';
loadArt();

const DEPTH = 18;                                      // 발판 블록 옆면 두께 (높이감)
const FEET = 34, CHAR = 84;                            // 발판 중심에서 캐릭터 발까지, 캐릭터 그림 크기
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // 장식 배치용 고정 난수
const padKey = (r, c) => r * 10 + c, padSet = new Set(SLOTS.map(s => padKey(s.r, s.c)));

// ── 배경(움직이지 않는 부분)은 한 번만 그려 두고 복사한다 ──────────
let bg = null, bgKey = '';
function background(k) {
  const key = k.toFixed(3); if (bg && bgKey === key) return bg;
  bg = document.createElement('canvas'); bg.width = Math.ceil(FIELD.w * k); bg.height = Math.ceil(FIELD.h * k); bgKey = key;
  const c = bg.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
  const hw = CELL.w / 2, hh = CELL.h / 2;
  // 풀밭
  const gr = c.createLinearGradient(0, 0, 0, FIELD.h); gr.addColorStop(0, '#46683a'); gr.addColorStop(1, '#35522d');
  c.fillStyle = gr; c.fillRect(0, 0, FIELD.w, FIELD.h);
  for (let i = 0; i < 110; i++) { c.fillStyle = i % 2 ? 'rgba(140,190,100,.16)' : 'rgba(20,40,18,.2)';
    c.beginPath(); c.ellipse(rnd(i) * FIELD.w, rnd(i + 99) * FIELD.h, 10 + rnd(i + 7) * 24, 5 + rnd(i + 3) * 9, 0, 0, 7); c.fill(); }
  // 길: 발판 사이로 꺾이며 도는 흙길 (테두리 → 흙 → 밝은 가운데 → 진행 방향 표시)
  const road = (w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); PATH.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p.x, p.y)); c.closePath(); c.stroke(); };
  road(98, '#4a3b25'); road(90, '#c9ad74'); road(70, '#d6bc86');
  for (let i = 0; i < 130; i++) { const p = pathPos(rnd(i + 500) * PATH_LEN), ox = (rnd(i + 900) - 0.5) * 70, oy = (rnd(i + 300) - 0.5) * 70;
    c.fillStyle = i % 3 ? 'rgba(120,92,52,.3)' : 'rgba(255,240,200,.3)'; c.beginPath(); c.ellipse(p.x + ox, p.y + oy, 3 + rnd(i) * 5, 2 + rnd(i + 1) * 2, 0, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(110,84,46,.5)';
  for (let s = 60; s < PATH_LEN; s += 120) { const p = pathPos(s); c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.dy, p.dx));
    c.beginPath(); c.moveTo(11, 0); c.lineTo(-7, -10); c.lineTo(-2, 0); c.lineTo(-7, 10); c.closePath(); c.fill(); c.restore(); }
  // 발판 블록: 바닥 그림자 → 옆면 → 윗면(체크 무늬) → 가장자리 선. 이웃한 발판은 한 덩어리로 이어진다
  const has = (r, cc) => padSet.has(padKey(r, cc));
  for (const s of SLOTS) if (!has(s.r + 1, s.c)) { c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(s.x - hw + 4, s.y + hh - 8, CELL.w, DEPTH + 10); }
  for (const s of SLOTS) {
    const x = s.x - hw, y = s.y - hh - 8;       // 윗면은 칸보다 조금 위로 올라가 있다
    if (!has(s.r + 1, s.c)) { const fg = c.createLinearGradient(0, y + CELL.h, 0, y + CELL.h + DEPTH); fg.addColorStop(0, '#5f6f3a'); fg.addColorStop(1, '#46532b');
      c.fillStyle = fg; c.fillRect(x, y + CELL.h - 1, CELL.w, DEPTH + 1);
      c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 1; i < 4; i++) c.fillRect(x + i * 25, y + CELL.h, 2, DEPTH); }
    c.fillStyle = (s.r + s.c) % 2 ? '#a9bb6e' : '#9db063'; c.fillRect(x, y, CELL.w, CELL.h);
    c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x + 6, y + 6, CELL.w - 12, CELL.h - 12);
  }
  c.lineWidth = 3; c.lineCap = 'square';
  for (const s of SLOTS) {
    const x = s.x - hw, y = s.y - hh - 8, edge = (col, x1, y1, x2, y2) => { c.strokeStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    if (!has(s.r - 1, s.c)) edge('#d3e39a', x, y + 1.5, x + CELL.w, y + 1.5);
    if (!has(s.r, s.c - 1)) edge('#c3d488', x + 1.5, y, x + 1.5, y + CELL.h);
    if (!has(s.r, s.c + 1)) edge('#7f9050', x + CELL.w - 1.5, y, x + CELL.w - 1.5, y + CELL.h);
    if (!has(s.r + 1, s.c)) edge('#6f7f43', x, y + CELL.h - 1.5, x + CELL.w, y + CELL.h - 1.5);
  }
  // 장식: 빈 칸의 모래주머니 진지, 가장자리 덤불·바위, 진입 깃발
  for (const d of decorPos) {
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(d.x, d.y + 22, 40, 14, 0, 0, 7); c.fill();
    for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) { const bx = d.x - 30 + i * 24 + row * 12, by = d.y + 14 - row * 15;
      c.fillStyle = row % 2 ? '#b8a57a' : '#a89468'; c.strokeStyle = '#5b4a31'; c.lineWidth = 1.5; rr(c, bx, by, 23, 15, 6); c.fill(); c.stroke(); }
    c.fillStyle = '#2f5a2a'; c.beginPath(); c.arc(d.x - 30, d.y - 22, 13, 0, 7); c.fill(); c.fillStyle = '#4f8a40'; c.beginPath(); c.arc(d.x - 33, d.y - 26, 9, 0, 7); c.fill();
  }
  for (let i = 0; i < 22; i++) {
    const side = i % 2, x = side ? FIELD.w - 6 + (rnd(i) - 0.5) * 6 : 6 + (rnd(i) - 0.5) * 6, y = 20 + rnd(i + 40) * (FIELD.h - 40);
    if (i % 3 === 0) { c.fillStyle = '#7d8474'; c.beginPath(); c.ellipse(x, y, 7, 5, 0, 0, 7); c.fill(); }
    else { c.fillStyle = '#2a4a25'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.fillStyle = '#4b7a3c'; c.beginPath(); c.arc(x - 2, y - 3, 6, 0, 7); c.fill(); }
  }
  const f = PATH[0];
  c.strokeStyle = '#3a2f20'; c.lineWidth = 3; c.beginPath(); c.moveTo(f.x - 38, f.y + 30); c.lineTo(f.x - 38, f.y - 36); c.stroke();
  c.fillStyle = '#d0453a'; c.beginPath(); c.moveTo(f.x - 38, f.y - 36); c.lineTo(f.x - 12, f.y - 28); c.lineTo(f.x - 38, f.y - 20); c.closePath(); c.fill();
  return bg;
}

export function draw(ctx, g, ui, quality = 2) {
  const b = g.branch, k = ctx.getTransform().a, now = performance.now() / 1000;
  ctx.drawImage(background(k), 0, 0, FIELD.w, FIELD.h);
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
  for (const u of g.units) if (u) unit(ctx, b, u, u === sel, k, now, quality);
  // 사격 효과
  const fxList = quality > 0 ? g.effects : g.effects.slice(-12);   // 최저 품질에서는 사격 효과 수를 줄인다
  for (const f of fxList) {
    if (f.puff) { const a = Math.max(0, f.t / 0.3); ctx.globalAlpha = a; ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.25 - a * 0.75), 0, 7); ctx.fill(); ctx.globalAlpha = 1; continue; }
    const a = Math.min(1, f.t / 0.18);
    ctx.strokeStyle = CLASS_INFO[f.c].color; ctx.globalAlpha = a; ctx.lineWidth = f.crit ? 5 : 2.5;
    ctx.beginPath(); ctx.moveTo(f.x1, f.y1 - 8); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    if (f.r > 0) { ctx.fillStyle = 'rgba(255,170,80,.45)'; ctx.beginPath(); ctx.arc(f.x2, f.y2, f.r * (1.15 - a * .4), 0, 7); ctx.fill(); }
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
  const by = quality > 0 ? Math.sin(e.s * 0.22 + e.id) * (e.kind === 'boss' ? 1 : 1.8) : 0, fly = e.kind === 'fast' ? 9 : 0;
  // 바닥 그림자 · 상태 표시
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.85, r * 0.95, r * 0.36, 0, 0, 7); ctx.fill();
  if (elite) { ctx.fillStyle = 'rgba(160,90,220,.4)'; ctx.strokeStyle = '#c99bff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.6, r + 9, (r + 9) * 0.5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  if (e.slowT > 0) { ctx.fillStyle = 'rgba(90,150,235,.5)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 4, (r + 4) * 0.45, 0, 0, 7); ctx.fill(); }
  if (e.vulnT > 0) { ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 5, (r + 5) * 0.45, 0, 0, 7); ctx.stroke(); }
  const im = enemyArt(art) || sprite('e:' + art, half, k, ENEMY_DRAW[art]);
  if (left) { ctx.save(); ctx.translate(e.x, e.y + by - fly); ctx.scale(-1, 1); ctx.drawImage(im, -half, -half, half * 2, half * 2); ctx.restore(); }
  else ctx.drawImage(im, e.x - half, e.y - half + by - fly, half * 2, half * 2);
  ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(ctx, e.x - r - 1, e.y - half - 4 - fly, r * 2 + 2, 6, 3); ctx.fill();
  ctx.fillStyle = '#7be36a'; rr(ctx, e.x - r, e.y - half - 3 - fly, r * 2 * Math.max(0, e.hp / e.maxHp), 4, 2); ctx.fill();
  if (elite) { ctx.fillStyle = '#e9d6ff'; ctx.font = '800 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.ceil(e.life) + '초', e.x, e.y - half - 14); }
}

function unit(ctx, b, u, selected, k, now, quality) {
  const p = SLOTS[u.slot], tier = u.level >= b.tiers[1] ? 2 : u.level >= b.tiers[0] ? 1 : 0, rank = rankName(b, u);
  const o = { branchId: b.id, type: u.type, tier, rank, hidden: !!u.hidden, insig: rankInsig(b, u) }, tk = u.type.join('+');
  const fy = p.y + FEET - 5;
  // 발밑: 소집·진급 때 번쩍임, 히든 계급의 금빛, 병과 색 띠, 그림자
  if (u.flash > 0) { ctx.fillStyle = `rgba(255,212,94,${u.flash})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 50, 26, 0, 0, 7); ctx.fill(); }
  if (u.hidden) { ctx.fillStyle = `rgba(255,212,94,${0.3 + 0.12 * Math.sin(now * 3 + u.id)})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 42, 19, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]); }
  ctx.lineWidth = 4;
  ctx.strokeStyle = CLASS_INFO[u.type[0]].color; ctx.beginPath(); ctx.ellipse(p.x, fy, 31, 13, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
  ctx.strokeStyle = CLASS_INFO[u.type[1]].color; ctx.beginPath(); ctx.ellipse(p.x, fy, 31, 13, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(p.x, fy, 24, 9, 0, 0, 7); ctx.fill();
  // 캐릭터: 가만히 있을 때는 숨쉬듯 조금 움직이고, 사격할 때는 반동으로 튄다. 발을 기준으로 커졌다 작아진다
  const fire = u.fireT > 0 ? Math.sin((1 - u.fireT / 0.16) * Math.PI) : 0;
  const dy = (quality > 0 ? Math.sin(now * 2.2 + u.id * 1.7) * 1.2 : 0) - fire * 6, sc = 1 + fire * 0.07;
  const im = unitImage(b.id, u.type) || sprite(['uc', b.id, tk, tier].join(':'), 62, k, c => drawSoldierFallback(c, o));
  const w = CHAR * sc;
  ctx.drawImage(im, p.x - w / 2, p.y + FEET - w + dy, w, w);
  ctx.drawImage(sprite(['ut', tk, tier, rank, o.hidden ? 1 : 0, o.insig.join('')].join(':'), 62, k, c => drawTag(c, o)), p.x - 62, p.y - 62, 124, 124);
}
