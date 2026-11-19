// 군인 랜덤 디펜스 — 게임 규칙 (화면과 분리된 순수 로직, node 테스트 가능)
import { CLASS_IDS, branchById } from './data.js';

export const FIELD = { w: 720, h: 700 };
const TR = { x0: 60, y0: 60, x1: 660, y1: 640 };
const TW = TR.x1 - TR.x0, TH = TR.y1 - TR.y0;
export const TRACK = TR;
export const PATH_LEN = 2 * (TW + TH);
export const SLOTS = [];
for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) SLOTS.push({ x: 160 + i * 100, y: 150 + j * 100 });

export const CFG = {
  maxWave: 100, enemyLimit: 50, bossTime: 55, waveGap: 24, prepTime: 8,
  growth: 1.9,          // 계급 1단계(정규화)당 전투력 배수
  baseDmg: 10, summonBase: 20, summonGrowth: 1.75, campBase: 110, campGrowth: 1.95,
  hpBase: 26, hpGrowth: 1.124, bountyBase: 2.2, bountyGrowth: 1.098,
  startGold: 100, sellRate: 0.4, auraRadius: 150,
};

export function pathPos(s) {
  s = ((s % PATH_LEN) + PATH_LEN) % PATH_LEN;
  if (s < TW) return { x: TR.x0 + s, y: TR.y0 };
  s -= TW; if (s < TH) return { x: TR.x1, y: TR.y0 + s };
  s -= TH; if (s < TW) return { x: TR.x1 - s, y: TR.y1 };
  s -= TW; return { x: TR.x0, y: TR.y1 - s };
}

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ── 병과 조합 ─────────────────────────────────────────────
// 유닛 병과 = 기본 병과 2칸 [a, b]. 순수 병과는 [a, a].
export const sortType = t => [...t].sort((a, b) => CLASS_IDS.indexOf(a) - CLASS_IDS.indexOf(b));
export const typeKey = t => (t[0] === t[1] ? t[0] : sortType(t).join('+'));
// 조합 규칙: 재료 두 유닛의 병과 4칸을 세어
//  · 한 병과가 3칸 이상 → 그 병과의 순수 유닛
//  · 그 외 → 가장 많은 병과 2개의 혼성 유닛 (동률이면 먼저 고른 유닛의 병과 우선)
//  · 4칸이 모두 다르면 → 두 유닛의 주병과끼리 혼성
export function combineTypes(t1, t2) {
  const tally = {}; for (const c of [...t1, ...t2]) tally[c] = (tally[c] || 0) + 1;
  const pref = c => (t1.includes(c) ? 0 : 1);
  const order = Object.keys(tally).sort((a, b) =>
    tally[b] - tally[a] || pref(a) - pref(b) || CLASS_IDS.indexOf(a) - CLASS_IDS.indexOf(b));
  if (tally[order[0]] >= 3) return [order[0], order[0]];
  if (order.length === 4) return sortType([t1[0], t2[0]]);
  return sortType([order[0], order[1]]);
}

// ── 수치 ─────────────────────────────────────────────────
const expo = (branch, level) => level * 17 / (branch.ranks.length - 1); // 계급 수가 달라도 최종 계급 전투력 동일
export const maxLevel = branch => branch.ranks.length - 1;
export const maxCamp = branch => branch.ranks.length - 5;
export const summonCost = (branch, camp) => Math.round(CFG.summonBase * CFG.summonGrowth ** expo(branch, camp));
export const campCost = (branch, camp) => Math.round(CFG.campBase * CFG.campGrowth ** expo(branch, camp));
export const unitValue = (branch, level) => Math.round(CFG.summonBase * CFG.summonGrowth ** expo(branch, level));

export function unitStats(branch, level, type, meta = {}) {
  const w = { inf: 0, art: 0, med: 0, sig: 0 }; w[type[0]] += 0.5; w[type[1]] += 0.5;
  const k = branch.trait.key;
  const D = CFG.baseDmg * CFG.growth ** expo(branch, level) * (1 + 0.03 * (meta.atk || 0));
  let dmg = D * (w.inf * 1.0 + w.art * 2.6 + w.med * 0.5 + w.sig * 0.6);
  let cd = w.inf * 0.55 + w.art * 1.5 + w.med * 0.9 + w.sig * 0.8;
  let range = w.inf * 190 + w.art * 290 + w.med * 170 + w.sig * 240;
  let splash = 80 * w.art, slow = 0.4 * w.sig, vuln = 0.3 * w.sig, haste = 0.4 * w.med;
  if (k === 'artDmg' && w.art > 0) dmg *= 1.15;
  if (k === 'range') range *= 1.1;
  if (k === 'infSpeed' && w.inf > 0) cd /= 1.15;
  if (k === 'splash') { splash *= 1.3; if (w.art > 0) dmg *= 1.1; }
  if (k === 'slow') { slow *= 1.3; dmg *= 0.48; }
  return { dmg, cd, range, splash, slow, vuln, haste, crit: k === 'crit' ? 0.15 : 0 };
}

export function waveInfo(wave) {
  const hp = CFG.hpBase * CFG.hpGrowth ** (wave - 1), bounty = CFG.bountyBase * CFG.bountyGrowth ** (wave - 1);
  if (wave % 10 === 0) return { kind: 'boss', name: '적 지휘 전차', count: 1, hp: hp * 42, speed: 48, bounty: bounty * 25, gap: 1 };
  if (wave % 5 === 0) return { kind: 'armor', name: '장갑차 부대', count: 14, hp: hp * 2.3, speed: 52, bounty: bounty * 1.5, gap: 0.85 };
  if (wave % 3 === 0) return { kind: 'fast', name: '드론 편대', count: 26, hp: hp * 0.6, speed: 105, bounty: bounty * 0.75, gap: 0.42 };
  return { kind: 'normal', name: '적 보병', count: 20, hp, speed: 70, bounty, gap: 0.6 };
}

// ── 게임 상태 ────────────────────────────────────────────
export function createGame({ branchId, meta = {}, seed = Date.now(), fx = true }) {
  const branch = branchById(branchId);
  return {
    branch, meta, rand: rng(seed), fx, time: 0, wave: 0, nextWave: CFG.prepTime,
    gold: CFG.startGold + 40 * (meta.gold || 0), camp: 0, units: Array(SLOTS.length).fill(null),
    enemies: [], effects: [], spawn: null, bossTimer: 0, over: null, kills: 0, uid: 1, auraDirty: true, log: [],
  };
}

export function summon(g) {
  const cost = summonCost(g.branch, g.camp), slot = g.units.indexOf(null);
  if (g.over || g.gold < cost || slot < 0) return null;
  g.gold -= cost;
  const r = g.rand(), level = Math.min(maxLevel(g.branch), g.camp + (r < 0.06 ? 2 : r < 0.28 ? 1 : 0));
  const c = CLASS_IDS[Math.floor(g.rand() * 4)];
  return placeUnit(g, slot, level, [c, c]);
}
function placeUnit(g, slot, level, type) {
  const u = { id: g.uid++, slot, level, type, cd: 0.2, haste: 0, stats: unitStats(g.branch, level, type, g.meta), flash: 0.5 };
  g.units[slot] = u; g.auraDirty = true; return u;
}
export function upgradeCamp(g) {
  const cost = campCost(g.branch, g.camp);
  if (g.over || g.camp >= maxCamp(g.branch) || g.gold < cost) return false;
  g.gold -= cost; g.camp++; return true;
}
export function canMerge(g, a, b) {
  const A = g.units[a], B = g.units[b];
  return !!(A && B && a !== b && A.level === B.level && A.level < maxLevel(g.branch));
}
export function mergePreview(g, a, b) {
  if (!canMerge(g, a, b)) return null;
  return { level: g.units[a].level + 1, type: combineTypes(g.units[a].type, g.units[b].type) };
}
// a = 먼저 고른 유닛(주재료), b = 결과가 놓일 자리
export function merge(g, a, b) {
  const p = mergePreview(g, a, b); if (!p || g.over) return null;
  g.units[a] = null; return placeUnit(g, b, p.level, p.type);
}
export function moveUnit(g, a, b) {
  if (!g.units[a] || a === b) return false;
  const A = g.units[a], B = g.units[b];
  g.units[b] = A; A.slot = b; g.units[a] = B; if (B) B.slot = a; g.auraDirty = true; return true;
}
export function sell(g, a) {
  const u = g.units[a]; if (!u) return 0;
  const v = Math.floor(unitValue(g.branch, u.level) * CFG.sellRate);
  g.units[a] = null; g.gold += v; g.auraDirty = true; return v;
}
export const unitName = (branch, u) => `${branch.ranks[u.level]} ${branch.types[typeKey(u.type)][0]}`;
export const unitWeapon = (branch, u) =>
  branch.types[typeKey(u.type)][1][u.level >= branch.tiers[1] ? 2 : u.level >= branch.tiers[0] ? 1 : 0];

function startWave(g) {
  g.wave++; const w = waveInfo(g.wave);
  g.spawn = { ...w, left: w.count, cd: 0 }; g.nextWave = CFG.waveGap;
  if (w.kind === 'boss') g.bossTimer = CFG.bossTime;
  g.gold += 10 + g.wave * 2; g.log.push({ t: 'wave', wave: g.wave, name: w.name });
}
function hit(g, e, dmg) {
  e.hp -= dmg * (1 + (e.vulnT > 0 ? e.vuln : 0));
  if (e.hp <= 0 && !e.dead) {
    e.dead = true; g.kills++;
    g.gold += e.bounty * (g.branch.trait.key === 'slow' ? 1.1 : 1) * (1 + 0.03 * (g.meta.bounty || 0));
  }
}

export function step(g, dt) {
  if (g.over) return;
  g.time += dt;
  // 웨이브 진행
  if (g.wave < CFG.maxWave) { g.nextWave -= dt; if (g.nextWave <= 0) startWave(g); }
  if (g.spawn && g.spawn.left > 0) {
    g.spawn.cd -= dt;
    if (g.spawn.cd <= 0) {
      const s = g.spawn; s.left--; s.cd += s.gap;
      g.enemies.push({ id: g.uid++, s: 0, hp: s.hp, maxHp: s.hp, speed: s.speed, bounty: s.bounty, kind: s.kind,
        slowT: 0, slow: 0, vulnT: 0, vuln: 0 });
    }
  }
  // 의무 계열 오라
  if (g.auraDirty) {
    for (const u of g.units) if (u) {
      u.haste = 0; const p = SLOTS[u.slot];
      for (const m of g.units) if (m && m !== u && m.stats.haste > 0) {
        const q = SLOTS[m.slot];
        if (Math.hypot(p.x - q.x, p.y - q.y) <= CFG.auraRadius) u.haste = Math.max(u.haste, m.stats.haste);
      }
    }
    g.auraDirty = false;
  }
  // 적 이동
  for (const e of g.enemies) {
    e.slowT -= dt; e.vulnT -= dt;
    e.s += e.speed * (1 - (e.slowT > 0 ? e.slow : 0)) * dt;
    const p = pathPos(e.s); e.x = p.x; e.y = p.y;
  }
  // 아군 공격
  for (const u of g.units) {
    if (!u) continue;
    u.flash -= dt; u.cd -= dt * (1 + u.haste);
    if (u.cd > 0) continue;
    const p = SLOTS[u.slot], st = u.stats, r2 = st.range * st.range;
    let target = null;
    for (const e of g.enemies) if (!e.dead && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) { target = e; break; }
    if (!target) { u.cd = 0.05; continue; }
    u.cd = st.cd;
    const crit = st.crit && g.rand() < st.crit, dmg = st.dmg * (crit ? 2.5 : 1);
    const victims = st.splash > 0
      ? g.enemies.filter(e => !e.dead && (e.x - target.x) ** 2 + (e.y - target.y) ** 2 <= st.splash * st.splash)
      : [target];
    for (const e of victims) {
      if (st.slow > 0) { const s = e.kind === 'boss' ? st.slow / 2 : st.slow; if (s >= e.slow || e.slowT <= 0) { e.slow = s; e.slowT = 1.5; } }
      if (st.vuln > 0 && (st.vuln >= e.vuln || e.vulnT <= 0)) { e.vuln = st.vuln; e.vulnT = 2; }
      hit(g, e, dmg);
    }
    if (g.fx) g.effects.push({ x1: p.x, y1: p.y, x2: target.x, y2: target.y, r: st.splash, t: 0.18, crit, c: u.type[0] });
  }
  if (g.enemies.some(e => e.dead)) g.enemies = g.enemies.filter(e => !e.dead);
  if (g.fx) { for (const f of g.effects) f.t -= dt; g.effects = g.effects.filter(f => f.t > 0); }
  // 승패
  const boss = g.enemies.some(e => e.kind === 'boss');
  if (boss) { g.bossTimer -= dt; if (g.bossTimer <= 0) g.over = { win: false, reason: '보스를 제한 시간 안에 막지 못했습니다' }; }
  if (g.enemies.length > CFG.enemyLimit) g.over = { win: false, reason: `적이 ${CFG.enemyLimit}명을 넘어 방어선이 무너졌습니다` };
  if (!g.over && g.wave >= CFG.maxWave && g.spawn.left === 0 && g.enemies.length === 0) g.over = { win: true, reason: '100단계 방어 성공!' };
}

export const medalsFor = g => Math.floor(g.wave / 5) + (g.over && g.over.win ? 20 : 0);
