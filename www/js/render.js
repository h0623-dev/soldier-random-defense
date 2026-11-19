// 전장 그리기 — 위에서 비스듬히 내려다본 느낌. 바닥은 두께가 있는 발판, 캐릭터는 그 위에 서 있고 아래쪽 줄이 위쪽 줄을 가린다.
import { CLASS_INFO } from './data.js';
import { FIELD, TRACK, SLOTS, CELL, PATH_LEN, CFG, canMerge, rankName, rankInsig } from './core.js';
import { drawTag, drawSoldierFallback, unitImage, ENEMY_DRAW, ENEMY_R, sprite, enemyArt, loadArt } from './sprites.js';
loadArt();

const TW = TRACK.x1 - TRACK.x0, TH = TRACK.y1 - TRACK.y0;
const TILE = { w: 88, h: 62, dy: 20, depth: 9 };      // 발판: 윗면 크기, 중심에서 아래로 내린 정도, 옆면 두께
const FEET = 46;                                       // 발판 중심에서 캐릭터 발까지
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // 장식 배치용 고정 난수

// ── 배경(움직이지 않는 부분)은 한 번만 그려 두고 복사한다 ──────────
let bg = null, bgKey = '';
function background(k) {
  const key = k.toFixed(3); if (bg && bgKey === key) return bg;
  bg = document.createElement('canvas'); bg.width = Math.ceil(FIELD.w * k); bg.height = Math.ceil(FIELD.h * k); bgKey = key;
  const c = bg.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
  // 풀밭
  const gr = c.createLinearGradient(0, 0, 0, FIELD.h); gr.addColorStop(0, '#3d5a33'); gr.addColorStop(1, '#2c4426');
  c.fillStyle = gr; c.fillRect(0, 0, FIELD.w, FIELD.h);
  for (let i = 0; i < 90; i++) { c.fillStyle = i % 2 ? 'rgba(120,170,90,.16)' : 'rgba(20,40,18,.18)';
    c.beginPath(); c.ellipse(rnd(i) * FIELD.w, rnd(i + 99) * FIELD.h, 10 + rnd(i + 7) * 26, 5 + rnd(i + 3) * 9, 0, 0, 7); c.fill(); }
  // 이동로: 살짝 파인 흙길 (바깥 그림자 → 턱 → 길 → 바퀴 자국)
  const road = (w, col, off = 0) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; rr(c, TRACK.x0, TRACK.y0 + off, TW, TH, 46); c.stroke(); };
  road(72, 'rgba(0,0,0,.28)', 5); road(68, '#5b4a31'); road(58, '#a08a5e'); road(58, 'rgba(255,255,255,.05)', -2);
  c.setLineDash([16, 14]); road(2.5, 'rgba(70,55,35,.55)'); c.setLineDash([]);
  for (let i = 0; i < 60; i++) { const s = rnd(i + 500) * PATH_LEN, p = trackPos(s), o = (rnd(i + 900) - 0.5) * 40;
    c.fillStyle = 'rgba(70,55,35,.35)'; c.beginPath(); c.ellipse(p.x + o, p.y + o * 0.6, 3 + rnd(i) * 4, 2, 0, 0, 7); c.fill(); }
  // 안쪽 진지: 두께가 있는 바닥판
  const bx = SLOTS[0].x - 62, by = SLOTS[0].y - 70, bw = CELL.w * 4 + 124, bh = CELL.h * 4 + 146;
  c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, bx - 2, by + 14, bw + 4, bh, 26); c.fill();
  c.fillStyle = '#24381f'; rr(c, bx, by + 10, bw, bh, 24); c.fill();
  const g2 = c.createLinearGradient(0, by, 0, by + bh); g2.addColorStop(0, '#4c7040'); g2.addColorStop(1, '#3c5c33');
  c.fillStyle = g2; rr(c, bx, by, bw, bh, 24); c.fill();
  c.strokeStyle = 'rgba(190,230,160,.22)'; c.lineWidth = 2; rr(c, bx + 2, by + 2, bw - 4, bh - 4, 22); c.stroke();
  // 발판 (옆면 → 윗면)
  for (const s of SLOTS) {
    const x = s.x - TILE.w / 2, y = s.y + TILE.dy - TILE.h / 2;
    c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, x - 1, y + TILE.depth + 3, TILE.w + 2, TILE.h, 16); c.fill();
    c.fillStyle = '#5d5846'; rr(c, x, y + TILE.depth, TILE.w, TILE.h, 16); c.fill();
    const tg = c.createLinearGradient(0, y, 0, y + TILE.h); tg.addColorStop(0, '#b3ab8c'); tg.addColorStop(1, '#989073');
    c.fillStyle = tg; rr(c, x, y, TILE.w, TILE.h, 16); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1.5; rr(c, x + 1.5, y + 1.5, TILE.w - 3, TILE.h - 3, 14.5); c.stroke();
  }
  // 장식: 길 바깥 풀·바위, 진입 깃발
  for (let i = 0; i < 26; i++) {
    const side = i % 4, t = rnd(i + 40), x = side < 2 ? (side ? FIELD.w - 14 : 14) + (rnd(i) - 0.5) * 10 : 40 + t * (FIELD.w - 80);
    const y = side < 2 ? 30 + t * (FIELD.h - 60) : (side === 2 ? 16 : FIELD.h - 12) + (rnd(i) - 0.5) * 8;
    if (i % 3 === 0) { c.fillStyle = '#7d8474'; c.beginPath(); c.ellipse(x, y, 8, 5.5, 0, 0, 7); c.fill(); c.fillStyle = '#9aa191'; c.beginPath(); c.ellipse(x - 1.5, y - 1.5, 5, 3, 0, 0, 7); c.fill(); }
    else { c.fillStyle = '#2a4a25'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.fillStyle = '#4b7a3c'; c.beginPath(); c.arc(x - 2, y - 3, 6.5, 0, 7); c.fill(); }
  }
  const fx = TRACK.x0 - 22, fy = TRACK.y0 - 44;
  c.strokeStyle = '#3a2f20'; c.lineWidth = 3; c.beginPath(); c.moveTo(fx, fy + 22); c.lineTo(fx, fy - 12); c.stroke();
  c.fillStyle = '#d0453a'; c.beginPath(); c.moveTo(fx, fy - 12); c.lineTo(fx + 24, fy - 5); c.lineTo(fx, fy + 3); c.closePath(); c.fill();
  c.fillStyle = '#ffe9a6'; c.font = '800 14px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('적 진입 ▶', fx + 30, fy - 3);
  return bg;
}
function trackPos(s) {
  s = ((s % PATH_LEN) + PATH_LEN) % PATH_LEN;
  if (s < TW) return { x: TRACK.x0 + s, y: TRACK.y0 };
  s -= TW; if (s < TH) return { x: TRACK.x1, y: TRACK.y0 + s };
  s -= TH; if (s < TW) return { x: TRACK.x1 - s, y: TRACK.y1 };
  return { x: TRACK.x0, y: TRACK.y1 - (s - TW) };
}

export function draw(ctx, g, ui, quality = 2) {
  const b = g.branch, k = ctx.getTransform().a, now = performance.now() / 1000;
  ctx.drawImage(background(k), 0, 0, FIELD.w, FIELD.h);
  const sel = ui.sel != null ? g.units[ui.sel] : null;
  // 발판 강조: 조합할 수 있는 칸(노랑), 선택한 칸(흰색)
  SLOTS.forEach((s, i) => {
    const x = s.x - TILE.w / 2, y = s.y + TILE.dy - TILE.h / 2, mergeable = sel && i !== ui.sel && canMerge(g, ui.sel, i);
    if (mergeable) { ctx.fillStyle = `rgba(255,212,94,${0.3 + 0.18 * Math.sin(now * 6)})`; rr(ctx, x, y, TILE.w, TILE.h, 16); ctx.fill();
      ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 4; ctx.stroke(); }
    else if (sel && i === ui.sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rr(ctx, x, y, TILE.w, TILE.h, 16); ctx.stroke(); }
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
  const r = ENEMY_R[e.kind], half = r + 8, m = e.s % PATH_LEN, left = m >= TW + TH && m < 2 * TW + TH;
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
  const fy = p.y + FEET - 6;
  // 발밑: 소집·진급 때 번쩍임, 히든 계급의 금빛, 병과 색 띠, 그림자
  if (u.flash > 0) { ctx.fillStyle = `rgba(255,212,94,${u.flash})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 58, 30, 0, 0, 7); ctx.fill(); }
  if (u.hidden) { ctx.fillStyle = `rgba(255,212,94,${0.3 + 0.12 * Math.sin(now * 3 + u.id)})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 46, 21, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]); }
  ctx.lineWidth = 4;
  ctx.strokeStyle = CLASS_INFO[u.type[0]].color; ctx.beginPath(); ctx.ellipse(p.x, fy, 34, 14, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
  ctx.strokeStyle = CLASS_INFO[u.type[1]].color; ctx.beginPath(); ctx.ellipse(p.x, fy, 34, 14, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(p.x, fy, 27, 10, 0, 0, 7); ctx.fill();
  if (selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, fy, 41, 18, 0, 0, 7); ctx.stroke(); }
  // 캐릭터: 가만히 있을 때는 숨쉬듯 조금 움직이고, 사격할 때는 반동으로 튄다. 발을 기준으로 커졌다 작아진다
  const fire = u.fireT > 0 ? Math.sin((1 - u.fireT / 0.16) * Math.PI) : 0;
  const dy = (quality > 0 ? Math.sin(now * 2.2 + u.id * 1.7) * 1.2 : 0) - fire * 6, sc = 1 + fire * 0.07;
  const im = unitImage(b.id, u.type) || sprite(['uc', b.id, tk, tier].join(':'), 62, k, c => drawSoldierFallback(c, o));
  const w = 102 * sc;
  ctx.drawImage(im, p.x - w / 2, p.y + FEET - w + dy, w, w);
  ctx.drawImage(sprite(['ut', tk, tier, rank, o.hidden ? 1 : 0, o.insig.join('')].join(':'), 62, k, c => drawTag(c, o)), p.x - 62, p.y - 62, 124, 124);
}
