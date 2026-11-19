// 군인 랜덤 디펜스 — 게임 규칙 (화면과 분리된 순수 로직, node 테스트 가능)
import { CLASS_IDS, branchById } from './data.js';

// ── 전장 ─────────────────────────────────────────────────
// 가로 7칸 × 세로 9칸(칸 100×100)의 세로로 긴 전장. 적은 발판 덩어리 사이로 꺾이며 도는 닫힌 길을 계속 돈다.
// 유닛은 길 옆의 발판(높이가 있는 블록) 위에 선다. 발판은 크기가 다른 덩어리 4개, 모두 25칸.
//   행0  ━━━━━━━━━━━━━┓      R = 길, 숫자 = 발판 덩어리
//   행1  R 1 1 1 1 1 R
//   행2  R 1 1 1 1 1 R
//   행3  R · R R R R R
//   행4  R 2 R 3 3 3 3
//   행5  R 2 R 3 3 3 3
//   행6  R · R R R R R
//   행7  R 4 4 4 4 4 R
//   행8  R R R R R R R
export const FIELD = { w: 720, h: 900 };
export const CELL = { w: 100, h: 100 };
const cellX = c => 60 + c * CELL.w, cellY = r => 50 + r * CELL.h;
const ROUTE = [[0, 0], [0, 6], [3, 6], [3, 2], [6, 2], [6, 6], [8, 6], [8, 0]];     // 길이 꺾이는 칸 [행, 열], 마지막에서 처음으로 이어진다
const PADS = [[1, 1, 5], [2, 1, 5], [4, 1, 1], [5, 1, 1], [4, 3, 6], [5, 3, 6], [7, 1, 5]];   // 발판 [행, 첫 열, 끝 열]
export const DECOR = [[3, 1], [6, 1]];                                             // 길도 발판도 아닌 칸 (장식)
export const PATH = ROUTE.map(([r, c]) => ({ x: cellX(c), y: cellY(r) }));
const SEG = PATH.map((p, i) => { const q = PATH[(i + 1) % PATH.length];
  return { p, len: Math.abs(q.x - p.x) + Math.abs(q.y - p.y), dx: Math.sign(q.x - p.x), dy: Math.sign(q.y - p.y) }; });
export const PATH_LEN = SEG.reduce((n, g) => n + g.len, 0);
export const SLOTS = [];       // 위쪽 줄부터 차례로 (그릴 때 아래 줄이 위 줄을 가리도록)
for (const [r, a, b] of PADS) for (let c = a; c <= b; c++) SLOTS.push({ x: cellX(c), y: cellY(r), r, c });
SLOTS.sort((p, q) => p.r - q.r || p.c - q.c);
export const decorPos = DECOR.map(([r, c]) => ({ x: cellX(c), y: cellY(r) }));

export const CFG = {
  maxWave: 100, enemyLimit: 50, bossTime: 55, waveGap: 24, prepTime: 8,
  growth: 1.9,          // 계급 1단계(정규화)당 전투력 배수
  baseDmg: 10, summonBase: 20, summonGrowth: 1.75, campBase: 110, campGrowth: 1.95,
  hpBase: 26, hpGrowth: 1.137, bountyBase: 2.2, bountyGrowth: 1.098,
  startGold: 100, sellRate: 0.4, auraRadius: 150,   // 옆·위아래·대각선 이웃 발판까지 닿는 거리
  // 병과 강화: 단계당 그 병과 공격력 +upStep, 비용은 upBase × upGrowth^단계
  upBase: 80, upGrowth: 1.55, upStep: 0.08,
  // 보급품(두 번째 재화): 보스·특수 임무·임무 완수로 얻고 선택 소집·진급 심사에 쓴다
  bossSupply: 3, pickSupply: 2, gambleSupply: 1, gambleUp: 0.45, gambleDown: 0.15,
  // 특수 임무(정예 표적): 직접 불러내는 추가 보스. 제한 시간 안에 잡으면 군자금·보급품
  eliteTime: 40, eliteCd: 45, eliteHp: 16, eliteHpGrowth: 1.35, eliteBounty: 10, eliteSupply: 2,
};

// 길 위의 거리 s → 위치와 진행 방향
export function pathPos(s) {
  s = ((s % PATH_LEN) + PATH_LEN) % PATH_LEN;
  for (const g of SEG) { if (s < g.len) return { x: g.p.x + g.dx * s, y: g.p.y + g.dy * s, dx: g.dx, dy: g.dy }; s -= g.len; }
  return { x: PATH[0].x, y: PATH[0].y, dx: 1, dy: 0 };
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

export function unitStats(branch, level, type, meta = {}, up = null) {
  const w = { inf: 0, art: 0, med: 0, sig: 0 }; w[type[0]] += 0.5; w[type[1]] += 0.5;
  const k = branch.trait.key;
  const D = CFG.baseDmg * CFG.growth ** expo(branch, level) * (1 + 0.03 * (meta.atk || 0))
    * (1 + CFG.upStep * (up ? (up[type[0]] + up[type[1]]) / 2 : 0));
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
    supply: 0, up: { inf: 0, art: 0, med: 0, sig: 0 }, elite: { n: 0, cd: 0, active: false }, done: {}, hiddenGot: 0, missionT: 0,
    enemies: [], effects: [], sfx: [], spawn: null, bossTimer: 0, over: null, kills: 0, uid: 1, auraDirty: true, log: [],
  };
}

export function summon(g) {
  const cost = summonCost(g.branch, g.camp), slot = g.units.indexOf(null);
  if (g.over || g.gold < cost || slot < 0) return null;
  g.gold -= cost;
  const r = g.rand(), level = Math.min(maxLevel(g.branch), g.camp + (r < 0.06 ? 2 : r < 0.28 ? 1 : 0));
  const c = CLASS_IDS[Math.floor(g.rand() * 4)];
  // 히든 계급 뽑기
  for (const h of g.branch.hidden) if (h.draw && g.camp >= h.drawCamp[0] && g.camp <= h.drawCamp[1] && g.rand() < h.draw)
    return placeUnit(g, slot, h.level, [c, c], h.id);
  return placeUnit(g, slot, level, [c, c]);
}
function placeUnit(g, slot, level, type, hidden = null) {
  const u = { id: g.uid++, slot, level, type, hidden, cd: 0.2, haste: 0, dmgUp: 0, rangeUp: 0, fireT: 0,
    stats: unitStats(g.branch, level, type, g.meta, g.up), flash: 0.5 };
  if (hidden) { g.hiddenGot++; g.log.push({ t: 'hidden', id: hidden }); }
  g.units[slot] = u; g.auraDirty = true; return u;
}
export const hiddenDef = (branch, id) => (id ? branch.hidden.find(h => h.id === id) : null) || null;
// 히든 조합 판정: 재료 두 유닛(일반 계급)이 히든 계급 바로 아래이고 조건을 만족하면 히든 계급 id
export function hiddenRecipe(branch, A, B) {
  if (A.hidden || B.hidden) return null;
  for (const h of branch.hidden) {
    if (!h.recipe || A.level !== h.level - 1) continue;
    if (h.recipe === 'allDiff' && new Set([...A.type, ...B.type]).size === 4) return h.id;
  }
  return null;
}
// ── 병과 강화 · 선택 소집 · 진급 심사 · 특수 임무 ─────────────
export const classUpCost = (g, c) => Math.round(CFG.upBase * CFG.upGrowth ** g.up[c]);
export function upgradeClass(g, c) {
  const cost = classUpCost(g, c);
  if (g.over || g.gold < cost) return false;
  g.gold -= cost; g.up[c]++;
  for (const u of g.units) if (u) u.stats = unitStats(g.branch, u.level, u.type, g.meta, g.up);
  g.auraDirty = true; return true;
}
// 선택 소집: 보급품을 써서 원하는 기본 병과를 고른다 (계급 운은 일반 소집과 같고 히든 뽑기는 없다)
export function summonPick(g, c) {
  const cost = summonCost(g.branch, g.camp), slot = g.units.indexOf(null);
  if (g.over || g.gold < cost || g.supply < CFG.pickSupply || slot < 0) return null;
  g.gold -= cost; g.supply -= CFG.pickSupply;
  const r = g.rand();
  return placeUnit(g, slot, Math.min(maxLevel(g.branch), g.camp + (r < 0.06 ? 2 : r < 0.28 ? 1 : 0)), [c, c]);
}
// 진급 심사: 보급품 1로 선택한 유닛에 도전. 성공하면 한 계급 진급, 실패하면 그대로, 낮은 확률로 강등
export function canGamble(g, a) {
  const u = g.units[a];
  return !!(u && !g.over && !u.hidden && g.supply >= CFG.gambleSupply && u.level < maxLevel(g.branch));
}
export function gamble(g, a) {
  if (!canGamble(g, a)) return null;
  const u = g.units[a], r = g.rand(); g.supply -= CFG.gambleSupply;
  const res = r < CFG.gambleUp ? 'up' : r < 1 - CFG.gambleDown || u.level === 0 ? 'same' : 'down';
  if (res !== 'same') placeUnit(g, a, u.level + (res === 'up' ? 1 : -1), u.type);
  return res;
}
export const eliteState = g => (g.elite.active ? 'active' : g.wave < 1 ? 'wait' : g.elite.cd > 0 ? 'cd' : 'ready');
export function callElite(g) {
  if (g.over || eliteState(g) !== 'ready') return false;
  const w = g.wave - 1, hp = CFG.hpBase * CFG.hpGrowth ** w * CFG.eliteHp * CFG.eliteHpGrowth ** g.elite.n;
  g.enemies.push({ id: g.uid++, s: 0, hp, maxHp: hp, speed: 55, bounty: CFG.bountyBase * CFG.bountyGrowth ** w * CFG.eliteBounty, kind: 'elite',
    life: CFG.eliteTime, slowT: 0, slow: 0, vulnT: 0, vuln: 0 });
  g.elite.active = true; return true;
}
// ── 임무: 조건을 채우면 자동으로 완수되고 보급품을 받는다 ───────
const lvCount = (g, lv) => g.units.filter(u => u && u.level >= lv).length;
export const MISSIONS = [
  { id: 'k50', sup: 1, text: () => '적 50명 처치', ok: g => g.kills >= 50 },
  { id: 'k300', sup: 2, text: () => '적 300명 처치', ok: g => g.kills >= 300 },
  { id: 'k1000', sup: 3, text: () => '적 1000명 처치', ok: g => g.kills >= 1000 },
  { id: 'four', sup: 1, text: () => '기본 병과 4종을 모두 배치', ok: g => CLASS_IDS.every(c => g.units.some(u => u && u.type[0] === c && u.type[1] === c)) },
  { id: 'mix3', sup: 2, text: () => '혼성 병과 3종을 동시에 보유', ok: g => new Set(g.units.filter(u => u && u.type[0] !== u.type[1]).map(u => typeKey(u.type))).size >= 3 },
  { id: 'full', sup: 1, text: () => '배치 칸 25칸을 모두 채우기', ok: g => !g.units.includes(null) },
  { id: 'lv5', sup: 1, text: g => `${g.branch.ranks[4]} 이상 3명 보유`, ok: g => lvCount(g, 4) >= 3 },
  { id: 'officer', sup: 2, text: g => `${g.branch.ranks[g.branch.tiers[0]]} 이상 1명 보유`, ok: g => lvCount(g, g.branch.tiers[0]) >= 1 },
  { id: 'general', sup: 3, text: g => `${g.branch.ranks[g.branch.tiers[1]]} 이상 1명 보유`, ok: g => lvCount(g, g.branch.tiers[1]) >= 1 },
  { id: 'up5', sup: 1, text: () => '병과 강화 합계 5단계', ok: g => CLASS_IDS.reduce((s, c) => s + g.up[c], 0) >= 5 },
  { id: 'el1', sup: 1, text: () => '특수 임무 1회 완수', ok: g => g.elite.n >= 1 },
  { id: 'el5', sup: 2, text: () => '특수 임무 5회 완수', ok: g => g.elite.n >= 5 },
  { id: 'hid', sup: 2, text: () => '히든 계급 획득', ok: g => g.hiddenGot > 0, only: g => g.branch.hidden.length > 0 },
  { id: 'w30', sup: 2, text: () => '30단계 도달', ok: g => g.wave >= 30 },
  { id: 'w60', sup: 3, text: () => '60단계 도달', ok: g => g.wave >= 60 },
];
export const missionList = g => MISSIONS.filter(m => !m.only || m.only(g));

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
  const A = g.units[a], B = g.units[b];
  return { level: A.level + 1, type: combineTypes(A.type, B.type), hidden: hiddenRecipe(g.branch, A, B) };
}
// a = 먼저 고른 유닛(주재료), b = 결과가 놓일 자리
export function merge(g, a, b) {
  const p = mergePreview(g, a, b); if (!p || g.over) return null;
  g.units[a] = null; return placeUnit(g, b, p.level, p.type, p.hidden);
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
export const rankInsig = (branch, u) => (hiddenDef(branch, u.hidden) || {}).insig || branch.insig[u.level];
export const rankName = (branch, u) => (hiddenDef(branch, u.hidden) || {}).name || branch.ranks[u.level];
export const unitName = (branch, u) => `${rankName(branch, u)} ${branch.types[typeKey(u.type)][0]}`;
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
    if (e.kind === 'boss') g.supply += CFG.bossSupply;
    if (e.kind === 'elite') { g.supply += CFG.eliteSupply; g.elite.n++; g.elite.active = false; g.elite.cd = CFG.eliteCd; g.log.push({ t: 'eliteKill' }); }
    if (g.fx) { g.effects.push({ puff: true, x: e.x, y: e.y, r: e.kind === 'boss' ? 60 : 18, t: 0.3 }); if (e.kind === 'boss') g.sfx.push('bossdie'); }
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
  // 특수 임무 표적: 제한 시간이 지나면 떠난다
  g.elite.cd -= dt;
  for (const e of g.enemies) if (e.kind === 'elite' && !e.dead && (e.life -= dt) <= 0) {
    e.dead = true; g.elite.active = false; g.elite.cd = CFG.eliteCd; g.log.push({ t: 'eliteFail' });
  }
  // 임무 확인 (0.5초마다)
  if ((g.missionT -= dt) <= 0) {
    g.missionT = 0.5;
    for (const m of missionList(g)) if (!g.done[m.id] && m.ok(g)) { g.done[m.id] = true; g.supply += m.sup; g.log.push({ t: 'mission', text: m.text(g), sup: m.sup }); }
  }
  // 의무 계열 · 히든 계급 오라 (같은 종류는 겹치지 않고 가장 큰 값만 적용)
  if (g.auraDirty) {
    for (const u of g.units) if (u) {
      u.haste = u.dmgUp = u.rangeUp = 0; const p = SLOTS[u.slot];
      for (const m of g.units) if (m && m !== u) {
        const h = hiddenDef(g.branch, m.hidden);
        if (!(m.stats.haste > 0) && !h) continue;
        const q = SLOTS[m.slot];
        if (Math.hypot(p.x - q.x, p.y - q.y) > CFG.auraRadius) continue;
        u.haste = Math.max(u.haste, m.stats.haste);
        if (h) { u.dmgUp = Math.max(u.dmgUp, h.aura.dmg || 0); u.rangeUp = Math.max(u.rangeUp, h.aura.range || 0); }
      }
    }
    g.auraDirty = false;
  }
  // 적 이동
  for (const e of g.enemies) {
    e.slowT -= dt; e.vulnT -= dt;
    e.s += e.speed * (1 - (e.slowT > 0 ? e.slow : 0)) * dt;
    const p = pathPos(e.s); e.x = p.x; e.y = p.y; e.left = p.dx < 0;
  }
  // 아군 공격
  for (const u of g.units) {
    if (!u) continue;
    u.flash -= dt; u.fireT -= dt; u.cd -= dt * (1 + u.haste);
    if (u.cd > 0) continue;
    const p = SLOTS[u.slot], st = u.stats, r2 = (st.range * (1 + u.rangeUp)) ** 2;
    let target = null;
    for (const e of g.enemies) if (!e.dead && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) { target = e; break; }
    if (!target) { u.cd = 0.05; continue; }
    u.cd = st.cd;
    const crit = st.crit && g.rand() < st.crit, dmg = st.dmg * (1 + u.dmgUp) * (crit ? 2.5 : 1);
    const victims = st.splash > 0
      ? g.enemies.filter(e => !e.dead && (e.x - target.x) ** 2 + (e.y - target.y) ** 2 <= st.splash * st.splash)
      : [target];
    for (const e of victims) {
      if (st.slow > 0) { const s = e.kind === 'boss' || e.kind === 'elite' ? st.slow / 2 : st.slow; if (s >= e.slow || e.slowT <= 0) { e.slow = s; e.slowT = 1.5; } }
      if (st.vuln > 0 && (st.vuln >= e.vuln || e.vulnT <= 0)) { e.vuln = st.vuln; e.vulnT = 2; }
      hit(g, e, dmg);
    }
    if (g.fx) { u.fireT = 0.16; if (g.sfx.length < 8) g.sfx.push(u.type[0]);
      g.effects.push({ x1: p.x, y1: p.y, x2: target.x, y2: target.y, r: st.splash, t: 0.18, crit, c: u.type[0] }); }
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
