// 전장 캔버스 그리기 (임시 도형 그래픽 — 정식 그림 자산으로 교체 예정)
import { CLASS_INFO } from './data.js';
import { FIELD, TRACK, SLOTS, PATH_LEN, canMerge, rankName, rankInsig } from './core.js';
import { drawCardBack, drawCardFront, drawSoldierFallback, unitImage, ENEMY_DRAW, ENEMY_R, sprite, enemyArt, loadArt } from './sprites.js';
loadArt();


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
  // 적 (걸음에 맞춰 살짝 흔들리고, 왼쪽으로 갈 때는 좌우를 뒤집는다)
  const k = ctx.getTransform().a, now = performance.now() / 1000;
  const TW = TRACK.x1 - TRACK.x0, TH = TRACK.y1 - TRACK.y0;
  for (const e of g.enemies) {
    const r = ENEMY_R[e.kind], half = r + 8, m = e.s % PATH_LEN, left = m >= TW + TH && m < 2 * TW + TH;
    const by = quality > 0 ? Math.sin(e.s * 0.22 + e.id) * (e.kind === 'boss' ? 1 : 1.8) : 0;
    if (e.slowT > 0) { ctx.fillStyle = 'rgba(90,150,235,.45)'; ctx.beginPath(); ctx.arc(e.x, e.y, r + 3, 0, 7); ctx.fill(); }
    if (e.vulnT > 0) { ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, r + 4, 0, 7); ctx.stroke(); }
    const im = enemyArt(e.kind) || sprite('e:' + e.kind, half, k, ENEMY_DRAW[e.kind]);
    if (left) { ctx.save(); ctx.translate(e.x, e.y + by); ctx.scale(-1, 1); ctx.drawImage(im, -half, -half, half * 2, half * 2); ctx.restore(); }
    else ctx.drawImage(im, e.x - half, e.y - half + by, half * 2, half * 2);
    ctx.fillStyle = '#000'; ctx.fillRect(e.x - r, e.y - half - 2, r * 2, 4);
    ctx.fillStyle = '#7be36a'; ctx.fillRect(e.x - r, e.y - half - 2, r * 2 * Math.max(0, e.hp / e.maxHp), 4);
  }
  // 아군
  for (const u of g.units) if (u) unit(ctx, b, u, u === sel, k, now, quality);
  // 사격 효과
  const fxList = quality > 0 ? g.effects : g.effects.slice(-12);   // 최저 품질에서는 사격 효과 수를 줄인다
  for (const f of fxList) {
    if (f.puff) { const a = Math.max(0, f.t / 0.3); ctx.globalAlpha = a; ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.25 - a * 0.75), 0, 7); ctx.fill(); ctx.globalAlpha = 1; continue; }
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

function unit(ctx, b, u, selected, k, now, quality) {
  const p = SLOTS[u.slot], tier = u.level >= b.tiers[1] ? 2 : u.level >= b.tiers[0] ? 1 : 0, rank = rankName(b, u);
  const o = { branchId: b.id, type: u.type, tier, rank, hidden: !!u.hidden, insig: rankInsig(b, u) }, tk = u.type.join('+');
  if (u.flash > 0) { ctx.fillStyle = `rgba(255,212,94,${u.flash})`; ctx.beginPath(); ctx.arc(p.x, p.y, 54, 0, 7); ctx.fill(); }
  ctx.drawImage(sprite(['ub', tk, o.hidden ? 1 : 0].join(':'), 46, k, c => drawCardBack(c, o)), p.x - 46, p.y - 46, 92, 92);
  // 캐릭터: 가만히 있을 때는 숨쉬듯 조금 움직이고, 사격할 때는 반동으로 튄다
  const fire = u.fireT > 0 ? Math.sin((1 - u.fireT / 0.16) * Math.PI) : 0;
  const dy = (quality > 0 ? Math.sin(now * 2.2 + u.id * 1.7) * 1.1 : 0) - fire * 5, sc = 1 + fire * 0.07;
  const im = unitImage(b.id, u.type) || sprite(['uc', b.id, tk, tier].join(':'), 46, k, c => drawSoldierFallback(c, o));
  const w = (im.width === im.height && im.naturalWidth ? 78 : 92) * sc, cy = im.naturalWidth ? p.y - 9 : p.y;
  ctx.drawImage(im, p.x - w / 2, cy - w / 2 + dy, w, w);
  ctx.drawImage(sprite(['uf', tk, tier, rank, o.hidden ? 1 : 0, o.insig.join('')].join(':'), 46, k, c => drawCardFront(c, o)), p.x - 46, p.y - 46, 92, 92);
  if (selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rr(ctx, p.x - 43, p.y - 43, 86, 86, 13); ctx.stroke(); }
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
