// 전장 캔버스 그리기 (임시 도형 그래픽 — 정식 그림 자산으로 교체 예정)
import { CLASS_INFO } from './data.js';
import { FIELD, TRACK, SLOTS, typeKey, canMerge } from './core.js';

const ENEMY = { normal: ['#c94a3f', 11], fast: ['#e0a13a', 8], armor: ['#8d5a4a', 15], boss: ['#7b1f2b', 26] };

export function draw(ctx, g, ui) {
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
    ctx.beginPath(); ctx.arc(p.x, p.y, sel.stats.range, 0, 7); ctx.fill(); ctx.stroke();
    if (sel.stats.haste > 0) { ctx.strokeStyle = CLASS_INFO.med.color; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 150, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  // 적
  for (const e of g.enemies) {
    const [col, r] = ENEMY[e.kind];
    ctx.fillStyle = e.slowT > 0 ? '#6f8fc0' : col; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = e.vulnT > 0 ? '#ffd45e' : '#1a0d0b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#000'; ctx.fillRect(e.x - r, e.y - r - 8, r * 2, 4);
    ctx.fillStyle = '#7be36a'; ctx.fillRect(e.x - r, e.y - r - 8, r * 2 * Math.max(0, e.hp / e.maxHp), 4);
  }
  // 아군
  for (const u of g.units) if (u) unit(ctx, b, u, u === sel);
  // 사격 효과
  for (const f of g.effects) {
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

function unit(ctx, b, u, selected) {
  const p = SLOTS[u.slot], R = 36, [c1, c2] = [CLASS_INFO[u.type[0]].color, CLASS_INFO[u.type[1]].color];
  const tier = u.level >= b.tiers[1] ? 2 : u.level >= b.tiers[0] ? 1 : 0;
  ctx.save(); ctx.translate(p.x, p.y);
  if (u.flash > 0) { ctx.fillStyle = `rgba(255,212,94,${u.flash})`; ctx.beginPath(); ctx.arc(0, 0, R + 12, 0, 7); ctx.fill(); }
  ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(0, 0, R, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2); ctx.fill();
  ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(0, 0, R - 8, 0, 7); ctx.fill();
  ctx.strokeStyle = selected ? '#fff' : ['#1a1f16', '#cfd6dc', '#ffd45e'][tier]; ctx.lineWidth = selected ? 5 : 3;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
  const rank = b.ranks[u.level];
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${rank.length > 3 ? 13 : 16}px sans-serif`; ctx.fillText(rank, 0, -5);
  ctx.font = '700 11px sans-serif'; ctx.fillStyle = '#ffe9a6';
  const k = typeKey(u.type); ctx.fillText(k.split('+').map(c => CLASS_INFO[c].short).join('·'), 0, 13);
  ctx.fillStyle = '#10140e'; rr(ctx, 14, -R - 4, 30, 17, 8); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 11px sans-serif'; ctx.fillText('Lv' + (u.level + 1), 29, -R + 5);
  ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
