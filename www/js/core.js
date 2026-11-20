// 군인 랜덤 디펜스 — 게임 규칙 (화면과 분리된 순수 로직, node 테스트 가능)
import { CLASS_IDS, branchById } from './data.js';

// ── 전장 ─────────────────────────────────────────────────
// 가로 7칸 × 세로 9칸(칸 100×100)의 세로로 긴 전장. 적은 발판 덩어리 사이로 꺾이며 도는 닫힌 길을 계속 돈다.
// 유닛은 길 옆의 발판(높이가 있는 블록) 위에 선다. 발판은 어느 맵이든 25칸.
// 맵은 글자 격자로 적는다:  R 길 · P 발판 · D 장식 · . 빈 땅.  길은 한 줄로 이어진 닫힌 고리여야 한다(검사함).
export const FIELD = { w: 720, h: 900 };
export const CELL = { w: 100, h: 100 };
export const SLOT_COUNT = 25;
const flipH = rows => rows.map(r => [...r].reverse().join('')), flipV = rows => [...rows].reverse();
const L_S = ['RRRRRRR', 'RPPPPPR', 'RPPPPPR', 'RDRRRRR', 'RPRPPPP', 'RPRPPPP', 'RDRRRRR', 'RPPPPPR', 'RRRRRRR'];      // ㄹ자로 꺾이는 길
const L_NOTCH = ['RRRDRRR', 'RPRPRPR', 'RPRPRPR', 'RPRPRPR', 'RPRRRPR', 'RPPPPPR', 'RPPPPPR', 'RPPDPPR', 'RRRRRRR'];  // 위에서 파고드는 길
const L_SIDE = ['RRRRRRR', 'RPPPPPR', 'RRRRRPR', 'DPPPRPR', 'RRRRRPR', 'RPPPPPR', 'RPPPPPR', 'RPPDPPR', 'RRRRRRR'];   // 옆에서 파고드는 길
const L_ZIG = ['RRRRRRR', 'RPPPPPR', 'RRRPPPR', 'DPRPPPR', 'RRRPRRR', 'RPPPRPD', 'RPPPRRR', 'RPPPPPR', 'RRRRRRR'];    // 양쪽에서 엇갈려 파고드는 길

// 작전 지역 10곳: 10단계마다 다음 지역으로 넘어간다. 지역마다 맵 모양·배경이 다르고 마지막 단계에 그 지역의 보스가 나온다.
// boss.hpMul: 보스마다 능력·맵 때문에 잡는 시간이 크게 달라서(봇 측정), 체력 배수를 따로 두어 단계가 오를수록 고르게 어려워지게 맞췄다
export const AREAS = [
  { name: '초원 훈련장', theme: 'meadow', layout: L_S, boss: { name: '지휘 전차', hpMul: 0.9, speed: 48, skill: { id: 'summon', label: '증원 호출', cd: 9, n: 3, kind: 'normal', hp: 0.6 }, text: '증원 호출 — 9초마다 호위병 3명을 부른다' } },
  { name: '해안 교두보', theme: 'beach', layout: L_NOTCH, boss: { name: '상륙 공기부양정', hpMul: 1.3, speed: 58, skill: { id: 'dash', label: '고속 기동', cd: 8, dur: 2.5, cut: 0.5 }, text: '고속 기동 — 8초마다 2.5초간 빨라지고 받는 피해가 절반' } },
  { name: '사막 보급로', theme: 'desert', layout: L_SIDE, boss: { name: '중자주포', hpMul: 0.9, speed: 42, skill: { id: 'stun', label: '포격', cd: 7, n: 4, dur: 3 }, text: '포격 — 7초마다 무작위 유닛 4명을 3초간 기절시킨다' } },
  { name: '설원 고지', theme: 'snow', layout: L_ZIG, boss: { name: '설상 중장갑차', hpMul: 0.67, speed: 46, skill: { id: 'armor', cut: 0.3 }, text: '중장갑 — 체력이 절반 이상이면 받는 피해 30% 감소' } },
  { name: '폐허 도심', theme: 'city', layout: flipH(L_S), boss: { name: '공격 헬기', hpMul: 0.85, speed: 60, fly: true, skill: { id: 'evade', p: 0.15 }, text: '회피 기동 — 공격의 15%를 피한다' } },
  { name: '밀림 강변', theme: 'jungle', layout: flipV(L_NOTCH), boss: { name: '화염방사 장갑차', hpMul: 1.0, speed: 50, skill: { id: 'burn', label: '화염 방사', cd: 6, r: 260, dur: 3, slow: 0.5 }, text: '화염 방사 — 6초마다 주변 유닛의 공격 속도를 3초간 절반으로' } },
  { name: '화산 지대', theme: 'volcano', layout: flipH(L_SIDE), boss: { name: '다연장 로켓차', hpMul: 0.85, speed: 44, skill: { id: 'stun', label: '일제 사격', cd: 10, n: 6, dur: 2.5 }, text: '일제 사격 — 10초마다 무작위 유닛 6명을 2.5초간 기절시킨다' } },
  { name: '군항 부두', theme: 'harbor', layout: flipH(L_ZIG), boss: { name: '드론 모함', hpMul: 1.1, speed: 52, fly: true, skill: { id: 'summon', label: '드론 사출', cd: 7, n: 4, kind: 'fast', hp: 0.4 }, text: '드론 사출 — 7초마다 드론 4기를 내보낸다' } },
  { name: '전방 비행장', theme: 'airfield', layout: flipV(L_S), boss: { name: '전략 폭격기', hpMul: 0.77, speed: 56, fly: true, skill: { id: 'bomb', label: '융단 폭격', cd: 9, r: 150, dur: 3 }, text: '융단 폭격 — 9초마다 한 구역의 유닛을 3초간 기절시킨다' } },
  { name: '적 사령부', theme: 'hq', layout: flipV(L_SIDE), boss: { name: '강철 거인', hpMul: 0.69, speed: 40, skill: { id: 'stun', label: '충격파', cd: 12, n: 5, dur: 2.5, regen: 0.004, rage: 0.3 }, text: '재생 장갑 · 충격파 — 체력을 조금씩 회복하고, 12초마다 유닛 5명을 기절시키며, 체력 30% 아래에서 빨라진다' } },
];
export const areaOfWave = wave => Math.min(AREAS.length - 1, Math.max(0, Math.floor((wave - 1) / 10)));

function buildMap(rows, name) {
  const road = new Set(), slots = [], decor = [], key = (r, c) => r * 10 + c;
  rows.forEach((line, r) => [...line].forEach((ch, c) => {
    const at = { x: 60 + c * CELL.w, y: 50 + r * CELL.h, r, c };
    if (ch === 'R') road.add(key(r, c)); else if (ch === 'P') slots.push(at); else if (ch === 'D') decor.push(at);
  }));
  const nb = k => [k + 1, k + 10, k - 1, k - 10].filter(n => road.has(n));
  if (slots.length !== SLOT_COUNT) throw new Error(`${name}: 발판 ${slots.length}칸 (25칸이어야 함)`);
  for (const k of road) if (nb(k).length !== 2) throw new Error(`${name}: 길이 한 줄로 이어지지 않음 (${Math.floor(k / 10)}행 ${k % 10}열)`);
  // 왼쪽 위 길 칸에서 오른쪽으로 출발해 한 바퀴 따라가며 꺾이는 지점을 모은다
  const start = Math.min(...road), cells = [start];
  for (let prev = -1, cur = start; ;) { const next = cur === start && prev < 0 ? (road.has(start + 1) ? start + 1 : nb(start)[0]) : nb(cur).find(n => n !== prev);
    if (next === start) break; cells.push(next); prev = cur; cur = next; }
  if (cells.length !== road.size) throw new Error(`${name}: 길이 하나의 고리가 아님`);
  const pt = k => ({ x: 60 + (k % 10) * CELL.w, y: 50 + Math.floor(k / 10) * CELL.h });
  const path = cells.filter((k, i) => { const a = cells[(i + cells.length - 1) % cells.length], b = cells[(i + 1) % cells.length]; return b - k !== k - a; }).map(pt);
  const segs = path.map((p, i) => { const q = path[(i + 1) % path.length];
    return { p, len: Math.abs(q.x - p.x) + Math.abs(q.y - p.y), dx: Math.sign(q.x - p.x), dy: Math.sign(q.y - p.y) }; });
  const len = segs.reduce((n, g) => n + g.len, 0);
  slots.sort((p, q) => p.r - q.r || p.c - q.c);       // 위쪽 줄부터 (그릴 때 아래 줄이 위 줄을 가리도록)
  // 길 위의 거리 s → 위치와 진행 방향
  const pathPos = s => { s = ((s % len) + len) % len;
    for (const g of segs) { if (s < g.len) return { x: g.p.x + g.dx * s, y: g.p.y + g.dy * s, dx: g.dx, dy: g.dy }; s -= g.len; }
    return { x: path[0].x, y: path[0].y, dx: 1, dy: 0 }; };
  return { slots, decor, path, len, pathPos, padSet: new Set(slots.map(t => key(t.r, t.c))) };
}
export const MAPS = AREAS.map(a => buildMap(a.layout, a.name));

export const CFG = {
  maxWave: 100, enemyLimit: 50, bossTime: 55, waveGap: 24, prepTime: 8,
  bossHp: 36,           // 보스 체력 = 그 단계 일반 적의 몇 배 (보스마다 특수 능력이 있어 42에서 낮춤)
  growth: 1.9,          // 계급 1단계(정규화)당 전투력 배수
  // 7계급 체계(2026-11-20)에 맞춰 다시 잡은 경제. 한 계급 = 전투력 1.9배 = 아래 계급 2명. 군자금으로 살 수 있는 '이등병 몇 명분'이 단계마다 약 5.5%씩 늘고,
  // 적 체력은 그보다 조금 빠르게(5.9%) 늘어 뒤로 갈수록 빠듯해진다. 훈련소를 올리면 같은 전력을 20%씩 싸게 산다(summonGrowth 1.6 < 2).
  baseDmg: 10, summonBase: 20, summonGrowth: 1.6, campBase: 120, campGrowth: 2.4,
  hpBase: 26, hpGrowth: 1.059, bountyBase: 0.3, bountyGrowth: 1.055,
  startGold: 100, waveBonus: 15, sellRate: 0.4, auraRadius: 150,   // 옆·위아래·대각선 이웃 발판까지 닿는 거리
  // 병과 강화: 단계당 그 병과 공격력 +upStep, 비용은 upBase × upGrowth^단계
  upBase: 50, upGrowth: 1.35, upStep: 0.08,
  // 보급품(두 번째 재화): 보스·특수 임무·임무 완수로 얻고 선택 소집·진급 심사에 쓴다
  bossSupply: 3, pickSupply: 2, gambleSupply: 1, gambleUp: [0.55, 0.45, 0.35, 0.22, 0.12], gambleDown: 0.15,      // 진급 심사 성공률은 지금 계급이 높을수록 낮다. 대장(전설)부터는 심사를 받을 수 없다 — 원수는 조합으로만
  // 특수 임무(정예 표적): 직접 불러내는 추가 보스. 제한 시간 안에 잡으면 군자금·보급품
  eliteTime: 40, eliteCd: 45, eliteHp: 16, eliteHpGrowth: 1.35, eliteBounty: 10, eliteSupply: 2,
};

// 난이도: 적 체력과 훈장 보상이 달라진다. need = 바로 아래 난이도에서 이 단계까지 가면 열린다
// (7계급 경제에서는 화력과 적 체력이 거의 나란히 자라서 배수가 조금만 커도 훨씬 일찍 막힌다. 봇 기준 어려움은 70단계 안팎, 지옥은 50단계 안팎)
export const DIFFS = [
  { id: 'normal', name: '보통', hp: 1, medal: 1, text: '기본 난이도' },
  { id: 'hard', name: '어려움', hp: 1.3, medal: 1.6, need: 50, text: '적 체력 1.3배 · 훈장 1.6배' },
  { id: 'hell', name: '지옥', hp: 1.7, medal: 2.5, need: 50, text: '적 체력 1.7배 · 훈장 2.5배' },
];

function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.state = () => a >>> 0;      // 저장용: 이 값으로 rng()를 다시 만들면 같은 순서가 이어진다
  return f;
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
const expo = (branch, level) => level;       // 계급 한 단계 = 전투력 CFG.growth배. (18계급 시절에는 계급 수가 달라도 최종 전투력이 같게 늘려 썼다)
export const maxLevel = branch => branch.ranks.length - 1;
export const maxCamp = branch => branch.ranks.length - 4;      // 훈련소 최고 단계의 기본 소집 계급 = 대위급. 그 위 3계급(대령·대장·원수)은 조합으로만 올린다
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
  if (k === 'slow') { slow *= 1.3; dmg *= 0.85; }
  return { dmg, cd, range, splash, slow, vuln, haste, crit: k === 'crit' ? 0.15 : 0 };
}

export function waveInfo(wave) {
  const hp = CFG.hpBase * CFG.hpGrowth ** (wave - 1), bounty = CFG.bountyBase * CFG.bountyGrowth ** (wave - 1);
  if (wave % 10 === 0) { const n = areaOfWave(wave), b = AREAS[n].boss;      // 지역마다 다른 보스 (체력 배수는 같고 속도·모습이 다르다)
    return { kind: 'boss', boss: n + 1, fly: !!b.fly, skill: b.skill, name: b.name, count: 1, hp: hp * CFG.bossHp * (b.hpMul || 1), speed: b.speed, bounty: bounty * 25, gap: 1 }; }
  if (wave % 5 === 0) return { kind: 'armor', name: '장갑차 부대', count: 14, hp: hp * 2.3, speed: 52, bounty: bounty * 1.5, gap: 0.85 };
  if (wave % 3 === 0) return { kind: 'fast', name: '드론 편대', count: 26, hp: hp * 0.6, speed: 105, bounty: bounty * 0.75, gap: 0.42 };
  return { kind: 'normal', name: '적 보병', count: 20, hp, speed: 70, bounty, gap: 0.6 };
}

// ── 게임 상태 ────────────────────────────────────────────
export function createGame({ branchId, meta = {}, seed = Date.now(), fx = true, diff = 0 }) {
  const branch = branchById(branchId);
  return {
    branch, meta, rand: rng(seed), fx, diff, hpMul: DIFFS[diff].hp, dealt: 0, dmg: { inf: 0, art: 0, med: 0, sig: 0 }, time: 0, wave: 0, nextWave: CFG.prepTime,
    gold: CFG.startGold + 40 * (meta.gold || 0), camp: 0, units: Array(SLOT_COUNT).fill(null), area: 0, map: MAPS[0],
    supply: 0, up: { inf: 0, art: 0, med: 0, sig: 0 }, elite: { n: 0, cd: 0, active: false }, done: {}, hiddenGot: 0, missionT: 0,
    enemies: [], effects: [], sfx: [], spawn: null, bossTimer: 0, over: null, kills: 0, uid: 1, auraDirty: true, log: [],
  };
}

// 빈 발판 가운데 무작위 한 곳 (없으면 -1)
function randomEmptySlot(g) {
  const free = []; g.units.forEach((u, i) => { if (!u) free.push(i); });
  return free.length ? free[Math.floor(g.rand() * free.length)] : -1;
}
export function summon(g) {
  const cost = summonCost(g.branch, g.camp), slot = randomEmptySlot(g);
  if (g.over || g.gold < cost || slot < 0) return null;
  g.gold -= cost;
  const r = g.rand(), level = Math.min(maxLevel(g.branch), g.camp + (r < 0.03 ? 2 : r < 0.18 ? 1 : 0));      // 3% 두 계급 위, 15% 한 계급 위
  const c = CLASS_IDS[Math.floor(g.rand() * 4)];
  // 히든 계급 뽑기
  for (const h of g.branch.hidden) if (h.draw && g.camp >= h.drawCamp[0] && g.camp <= h.drawCamp[1] && g.rand() < h.draw)
    return placeUnit(g, slot, h.level, [c, c], h.id);
  return placeUnit(g, slot, level, [c, c]);
}
function placeUnit(g, slot, level, type, hidden = null) {
  const u = { id: g.uid++, slot, level, type, hidden, cd: 0.2, haste: 0, dmgUp: 0, rangeUp: 0, fireT: 0, atkT: 0, faceL: false, stunT: 0, burnT: 0, burn: 0, dealt: 0,
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
  const cost = summonCost(g.branch, g.camp), slot = randomEmptySlot(g);
  if (g.over || g.gold < cost || g.supply < CFG.pickSupply || slot < 0) return null;
  g.gold -= cost; g.supply -= CFG.pickSupply;
  const r = g.rand();
  return placeUnit(g, slot, Math.min(maxLevel(g.branch), g.camp + (r < 0.06 ? 2 : r < 0.28 ? 1 : 0)), [c, c]);
}
// 진급 심사: 보급품 1로 선택한 유닛에 도전. 성공하면 한 계급 진급, 실패하면 그대로, 낮은 확률로 강등
export const gambleChance = u => CFG.gambleUp[u.level] || 0;
export function canGamble(g, a) {
  const u = g.units[a];
  return !!(u && !g.over && !u.hidden && g.supply >= CFG.gambleSupply && u.level < CFG.gambleUp.length);
}
export function gamble(g, a) {
  if (!canGamble(g, a)) return null;
  const u = g.units[a], r = g.rand(); g.supply -= CFG.gambleSupply;
  const res = r < gambleChance(u) ? 'up' : r < 1 - CFG.gambleDown || u.level === 0 ? 'same' : 'down';
  if (res !== 'same') placeUnit(g, a, u.level + (res === 'up' ? 1 : -1), u.type);
  return res;
}
export const eliteState = g => (g.elite.active ? 'active' : g.wave < 1 ? 'wait' : g.elite.cd > 0 ? 'cd' : 'ready');
export function callElite(g) {
  if (g.over || eliteState(g) !== 'ready') return false;
  const w = g.wave - 1, hp = CFG.hpBase * CFG.hpGrowth ** w * CFG.eliteHp * CFG.eliteHpGrowth ** g.elite.n * g.hpMul;
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
  const sum = g.units[a].dealt + g.units[b].dealt;
  g.units[a] = null; const u = placeUnit(g, b, p.level, p.type, p.hidden); u.dealt = sum; return u;      // 누적 피해는 두 유닛 것을 이어받는다
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
// 계급대: 계급장 모양으로 나눈 5단계 (0 병 · 1 부사관 · 2 위관 · 3 영관 · 4 장성). 겉모습과 그림이 이 단계에 따라 달라진다
export const RANK_GROUP = { bar: 0, chev: 1, dia: 2, flower: 3, star: 4 };
export const rankGroup = (branch, u) => RANK_GROUP[rankInsig(branch, u)[0]] || 0;
export const rankName = (branch, u) => (hiddenDef(branch, u.hidden) || {}).name || branch.ranks[u.level];
export const unitName = (branch, u) => `${rankName(branch, u)} ${branch.types[typeKey(u.type)][0]}`;
export const unitWeapon = (branch, u) =>
  branch.types[typeKey(u.type)][1][u.level >= branch.tiers[1] ? 2 : u.level >= branch.tiers[0] ? 1 : 0];

function startWave(g) {
  g.wave++; const w = waveInfo(g.wave);
  // 다음 작전 지역으로 이동: 맵이 바뀐다. 유닛은 같은 번호의 발판으로 옮겨 서고, 남은 적은 새 길의 같은 진행 비율 지점으로 옮긴다
  const area = areaOfWave(g.wave);
  if (area !== g.area) { const old = g.map; g.area = area; g.map = MAPS[area];
    for (const e of g.enemies) e.s = (e.s % old.len) / old.len * g.map.len;
    g.auraDirty = true; g.log.push({ t: 'area', area }); }
  g.spawn = { ...w, hp: w.hp * g.hpMul, left: w.count, cd: 0 }; g.nextWave = CFG.waveGap;
  if (w.kind === 'boss') g.bossTimer = CFG.bossTime;
  g.gold += CFG.waveBonus; g.log.push({ t: 'wave', wave: g.wave, name: w.name });
}
// 돌려주는 값: 실제로 깎은 체력 (누적 피해 기록용)
function hit(g, e, dmg) {
  const k = e.skill;
  if (k) {      // 보스 방어 능력
    if (k.id === 'evade' && g.rand() < k.p) { if (g.fx) g.effects.push({ txt: '회피', x: e.x, y: e.y - 30, t: 0.6, small: true }); return 0; }
    if (k.id === 'armor' && e.hp > e.maxHp * 0.5) dmg *= 1 - k.cut;
    if (e.dashT > 0) dmg *= 1 - k.cut;
  }
  const full = dmg * (1 + (e.vulnT > 0 ? e.vuln : 0)), real = Math.max(0, Math.min(full, e.hp));
  e.hp -= full;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true; g.kills++;
    if (e.kind === 'boss') g.supply += CFG.bossSupply;
    if (e.kind === 'elite') { g.supply += CFG.eliteSupply; g.elite.n++; g.elite.active = false; g.elite.cd = CFG.eliteCd; g.log.push({ t: 'eliteKill' }); }
    if (g.fx) { g.effects.push({ puff: true, x: e.x, y: e.y, r: e.kind === 'boss' ? 60 : 18, t: 0.3 }); if (e.kind === 'boss') g.sfx.push('bossdie'); }
    g.gold += e.bounty * (g.branch.trait.key === 'slow' ? 1.1 : 1) * (1 + 0.03 * (g.meta.bounty || 0));
  }
  return real;
}

// 보스 특수 능력: 주기적으로 발동하는 것(증원·고속 기동·기절·화염·폭격)과 늘 적용되는 것(재생). 방어 능력은 hit()에서 처리
function bossSkill(g, e, dt) {
  const k = e.skill;
  if (k.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * k.regen * dt);
  if (e.dashT > 0) e.dashT -= dt;
  if (!k.cd || (e.skT -= dt) > 0) return;
  e.skT = k.cd;
  const live = g.units.filter(Boolean), slots = g.map.slots;
  const stun = (list, dur) => { for (const u of list) { u.stunT = Math.max(u.stunT, dur); if (g.fx) g.effects.push({ puff: true, x: slots[u.slot].x, y: slots[u.slot].y, r: 34, t: 0.3 }); } };
  const pick = n => { const a = [...live], out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(g.rand() * a.length), 1)[0]); return out; };
  if (k.id === 'summon') {
    const w = g.wave - 1, hp = CFG.hpBase * CFG.hpGrowth ** w * k.hp, bounty = CFG.bountyBase * CFG.bountyGrowth ** w * 0.3;
    for (let i = 0; i < k.n; i++) g.enemies.push({ id: g.uid++, s: e.s - 26 * (i + 1), hp, maxHp: hp, speed: k.kind === 'fast' ? 105 : 70, bounty, kind: k.kind, slowT: 0, slow: 0, vulnT: 0, vuln: 0 });
  } else if (k.id === 'dash') e.dashT = k.dur;
  else if (k.id === 'stun') stun(pick(k.n), k.dur);
  else if (k.id === 'burn') { for (const u of live) { const p = slots[u.slot]; if (Math.hypot(p.x - e.x, p.y - e.y) <= k.r) { u.burnT = k.dur; u.burn = k.slow; } }
    if (g.fx) g.effects.push({ puff: true, x: e.x, y: e.y, r: k.r, t: 0.35, col: '#ff8a3c' }); }
  else if (k.id === 'bomb') { const c = slots[Math.floor(g.rand() * slots.length)];
    stun(live.filter(u => Math.hypot(slots[u.slot].x - c.x, slots[u.slot].y - c.y) <= k.r), k.dur);
    if (g.fx) g.effects.push({ puff: true, x: c.x, y: c.y, r: k.r, t: 0.4, col: '#ffb347' }); }
  if (g.fx) { g.effects.push({ txt: k.label + '!', x: e.x, y: e.y - 46, t: 1.3 }); g.sfx.push('art'); }
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
      g.enemies.push({ id: g.uid++, s: 0, hp: s.hp, maxHp: s.hp, speed: s.speed, bounty: s.bounty, kind: s.kind, boss: s.boss, fly: s.fly,
        skill: s.skill, skT: s.skill && s.skill.cd ? s.skill.cd * 0.6 : 0, dashT: 0,
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
      u.haste = u.dmgUp = u.rangeUp = 0; const p = g.map.slots[u.slot];
      for (const m of g.units) if (m && m !== u) {
        const h = hiddenDef(g.branch, m.hidden);
        if (!(m.stats.haste > 0) && !h) continue;
        const q = g.map.slots[m.slot];
        if (Math.hypot(p.x - q.x, p.y - q.y) > CFG.auraRadius) continue;
        u.haste = Math.max(u.haste, m.stats.haste);
        if (h) { u.dmgUp = Math.max(u.dmgUp, h.aura.dmg || 0); u.rangeUp = Math.max(u.rangeUp, h.aura.range || 0); }
      }
    }
    g.auraDirty = false;
  }
  // 적 이동
  for (const e of g.enemies.slice()) if (e.skill && !e.dead) bossSkill(g, e, dt);
  for (const e of g.enemies) {
    e.slowT -= dt; e.vulnT -= dt;
    const fast = e.dashT > 0 ? 2.2 : e.skill && e.skill.rage && e.hp < e.maxHp * e.skill.rage ? 1.5 : 1;
    e.s += e.speed * fast * (1 - (e.slowT > 0 && !(e.dashT > 0) ? e.slow : 0)) * dt;
    const p = g.map.pathPos(e.s); e.x = p.x; e.y = p.y; e.left = p.dx < 0;
  }
  // 아군 공격
  for (const u of g.units) {
    if (!u) continue;
    u.flash -= dt; u.fireT -= dt; u.atkT -= dt; u.stunT -= dt; u.burnT -= dt;
    if (u.stunT > 0) continue;                                  // 기절: 공격하지 못한다
    u.cd -= dt * (1 + u.haste) * (u.burnT > 0 ? 1 - u.burn : 1);   // 화염: 공격 속도 감소
    if (u.cd > 0) continue;
    const p = g.map.slots[u.slot], st = u.stats, r2 = (st.range * (1 + u.rangeUp)) ** 2;
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
      const d = hit(g, e, dmg); u.dealt += d; g.dealt += d; g.dmg[u.type[0]] += d / 2; g.dmg[u.type[1]] += d / 2;
    }
    if (g.fx) { u.fireT = 0.16; u.atkT = 0.3; u.faceL = target.x < p.x;      // atkT 동안 공격 자세 그림을 보여 준다 (faceL: 표적이 왼쪽)
      if (g.sfx.length < 8) g.sfx.push(u.type[0]);
      g.effects.push({ x1: p.x, y1: p.y, x2: target.x, y2: target.y, r: st.splash, t: 0.36, T: 0.36, crit, c: u.type[0], c2: u.type[1] }); }
  }
  if (g.enemies.some(e => e.dead)) g.enemies = g.enemies.filter(e => !e.dead);
  if (g.fx) { for (const f of g.effects) f.t -= dt; g.effects = g.effects.filter(f => f.t > 0); }
  // 승패
  const boss = g.enemies.some(e => e.kind === 'boss');
  if (boss) { g.bossTimer -= dt; if (g.bossTimer <= 0) g.over = { win: false, reason: '보스를 제한 시간 안에 막지 못했습니다' }; }
  if (g.enemies.length > CFG.enemyLimit) g.over = { win: false, reason: `적이 ${CFG.enemyLimit}명을 넘어 방어선이 무너졌습니다` };
  if (!g.over && g.wave >= CFG.maxWave && g.spawn.left === 0 && g.enemies.length === 0) g.over = { win: true, reason: '100단계 방어 성공!' };
}

export const medalsFor = g => Math.floor((Math.floor(g.wave / 5) + (g.over && g.over.win ? 20 : 0)) * DIFFS[g.diff || 0].medal);

// ── 중간 저장 · 이어하기 ─────────────────────────────────
// 진행 중인 게임을 글자로 바꿀 수 있는 값으로 만든다. 군별·맵·난수 함수처럼 다시 만들 수 있는 것은 빼고, 능력치는 불러올 때 다시 계산한다.
const SAVE_V = 2, SAVE_SKIP = new Set(['branch', 'meta', 'rand', 'map', 'effects', 'sfx', 'log']);
export function saveGame(g) {
  if (!g || g.over) return null;
  const o = { v: SAVE_V, branchId: g.branch.id, seed: g.rand.state() };
  for (const k in g) if (!SAVE_SKIP.has(k)) o[k] = g[k];
  return JSON.parse(JSON.stringify(o, (k, v) => (k === 'stats' ? undefined : v)));
}
// 저장한 값으로 게임을 되살린다. 형식이 다르거나 망가진 저장이면 null
export function loadGame(o, meta = {}) {
  try {
    if (!o || o.v !== SAVE_V || o.over || !branchById(o.branchId)) return null;
    const g = createGame({ branchId: o.branchId, meta, seed: o.seed, diff: DIFFS[o.diff] ? o.diff : 0 });
    for (const k in o) if (k !== 'v' && k !== 'branchId' && k !== 'seed' && k !== 'diff') g[k] = o[k];
    if (!Array.isArray(g.units) || g.units.length !== SLOT_COUNT || !MAPS[g.area] || !(g.wave >= 0)) return null;
    g.map = MAPS[g.area]; g.hpMul = DIFFS[g.diff].hp;
    for (const u of g.units) if (u) { if (!(u.level >= 0 && u.level <= maxLevel(g.branch))) return null; u.stats = unitStats(g.branch, u.level, u.type, g.meta, g.up); u.flash = 0; }
    g.auraDirty = true; return g;
  } catch { return null; }
}
