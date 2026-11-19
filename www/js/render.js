// 전장 캔버스 그리기 (임시 도형 그래픽 — 정식 그림 자산으로 교체 예정)
import { CLASS_INFO } from './data.js';
import { FIELD, TRACK, SLOTS, canMerge, rankName } from './core.js';
import { drawUnitCard, ENEMY_DRAW, ENEMY_R, sprite } from './sprites.js';


export function draw(ctx, g, ui, quality = 2) {
  const b = g.branch;
  ctx.clearRect(0, 0, FIELD.w, FIELD.h);
  ctx.fillStyle = '#263020'; ctx.fillRect(0, 0, FIELD.w, FIELD.h);
  // 적 이동로
  ctx.lineJoin = 'round'; ctx.strokeStyle = '#6b5d44'; ctx.lineWidth = 58;
  ctx.strokeRect(TRACK.x0, TRACK.y0, TRACK.x1 - TRACK.x0, TRACK.y1 - TRACK.y0);
  ctx.strokeStyle = '#7d6e52'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]);
  ctx.strokeRect(TRACK.x0, TRACK.y0, TRACK.x1 - TRACK.x0, TRACK.y1 - TRACK.y0); ctx.setLineDash([]);
  ctx.fillStyle = '#ffd45e'; ctx.font = '700 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('▶ 적 진입', TRACK.x0 + 52, TRACK.y0);
  // 배치 칸
  const sel = ui.sel != null ? g.units[ui.sel] : null;
  SLOTS.forEach((s, i) => {
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 1.5;
    rr(ctx, s.x - 44, s.y - 44, 88, 88, 14); ctx.fill(); ctx.stroke();
    if (sel && i !== ui.sel && canMerge(g, ui.sel, i)) {
      ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 4; rr(ctx, s.x - 44, s.y - 44, 88, 88, 14); ctx.stroke();
    }
  });
  // 선택 유닛 사거리
  if (sel) {
    const p = SLOTS[sel.slot];
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, sel.stats.range * (1 + sel.rangeUp), 0, 7); ctx.fill(); ctx.stroke();
    if (sel.hidden) { ctx.strokeStyle = '#ffd45e'; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 150, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    if (sel.stats.haste > 0) { ctx.strokeStyle = CLASS_INFO.med.color; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 150, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  // 적
  const k = ctx.getTransform().a;
  for (const e of g.enemies) {
    const r = ENEMY_R[e.kind], half = r + 8;
    if (e.slowT > 0) { ctx.fillStyle = 'rgba(90,150,235,.45)'; ctx.beginPath(); ctx.arc(e.x, e.y, r + 3, 0, 7); ctx.fill(); }
    if (e.vulnT > 0) { ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, r + 4, 0, 7); ctx.stroke(); }
    ctx.drawImage(sprite('e:' + e.kind, half, k, ENEMY_DRAW[e.kind]), e.x - half, e.y - half, half * 2, half * 2);
    ctx.fillStyle = '#000'; ctx.fillRect(e.x - r, e.y - half - 2, r * 2, 4);
    ctx.fillStyle = '#7be36a'; ctx.fillRect(e.x - r, e.y - half - 2, r * 2 * Math.max(0, e.hp / e.maxHp), 4);
  }
  // 아군
  for (const u of g.units) if (u) unit(ctx, b, u, u === sel, k);
  // 사격 효과
  const fxList = quality > 0 ? g.effects : g.effects.slice(-12);   // 최저 품질에서는 사격 효과 수를 줄인다
  for (const f of fxList) {
    const a = Math.min(1, f.t / 0.18);
    ctx.strokeStyle = CLASS_INFO[f.c].color; ctx.globalAlpha = a; ctx.lineWidth = f.crit ? 5 : 2.5;
    ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    if (f.r > 0) { ctx.fillStyle = 'rgba(255,170,80,.45)'; ctx.beginPath(); ctx.arc(f.x2, f.y2, f.r * (1.15 - a * .4), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  if (g.enemies.some(e => e.kind === 'boss')) {
    ctx.fillStyle = '#ff6b5e'; ctx.font = '800 20px sans-serif';
    ctx.fillText(`보스 제한 ${Math.ceil(g.bossTimer)}초`, FIELD.w / 2, FIELD.h - 22);
  }
}

function unit(ctx, b, u, selected, k) {
  const p = SLOTS[u.slot], tier = u.level >= b.tiers[1] ? 2 : u.level >= b.tiers[0] ? 1 : 0, rank = rankName(b, u);
  if (u.flash > 0) { ctx.fillStyle = `rgba(255,212,94,${u.flash})`; ctx.beginPath(); ctx.arc(p.x, p.y, 54, 0, 7); ctx.fill(); }
  const cv = sprite(['u', b.id, u.type.join('+'), tier, rank, u.hidden ? 1 : 0].join(':'), 46, k,
    c => drawUnitCard(c, { branchId: b.id, type: u.type, tier, rank, hidden: !!u.hidden }));
  ctx.drawImage(cv, p.x - 46, p.y - 46, 92, 92);
  if (selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rr(ctx, p.x - 43, p.y - 43, 86, 86, 13); ctx.stroke(); }
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
