// 털뭉치수비대 — 게임 규칙 (화면과 분리된 순수 로직, node 테스트 가능)
import { CLASS_IDS, BRANCHES, branchById, GRADES, rankOf, GROUP_OF_LEVEL, HEROES, TYPE_SKILLS, cmOf } from './data.js';

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
  { name: '도토리 초원', theme: 'meadow', layout: L_S, boss: { name: '대장 전차', hpMul: 0.9, speed: 48, skill: { id: 'summon', label: '증원 호출', cd: 9, n: 3, kind: 'normal', hp: 0.6 }, text: '증원 호출 — 9초마다 호위병 3명을 부른다' } },
  { name: '조개껍데기 해변', theme: 'beach', layout: L_NOTCH, boss: { name: '물보라 부양정', hpMul: 1.3, speed: 58, skill: { id: 'dash', label: '고속 기동', cd: 8, dur: 2.5, cut: 0.5 }, text: '고속 기동 — 8초마다 2.5초간 빨라지고 받는 피해가 절반' } },
  { name: '선인장 사막길', theme: 'desert', layout: L_SIDE, boss: { name: '쿵쾅 대포차', hpMul: 0.9, speed: 42, skill: { id: 'stun', label: '포격', cd: 7, n: 4, dur: 3 }, text: '포격 — 7초마다 무작위 유닛 4명을 3초간 기절시킨다' } },
  { name: '눈꽃 언덕', theme: 'snow', layout: L_ZIG, boss: { name: '눈덩이 장갑차', hpMul: 0.67, speed: 46, skill: { id: 'armor', cut: 0.3 }, text: '중장갑 — 체력이 절반 이상이면 받는 피해 30% 감소' } },
  { name: '무너진 장터', theme: 'city', layout: flipH(L_S), boss: { name: '윙윙 헬기', hpMul: 0.85, speed: 60, fly: true, skill: { id: 'evade', p: 0.15 }, text: '회피 기동 — 공격의 15%를 피한다' } },
  { name: '덩굴 강가', theme: 'jungle', layout: flipV(L_NOTCH), boss: { name: '불뿜는 장갑차', hpMul: 1.0, speed: 50, skill: { id: 'burn', label: '화염 방사', cd: 6, r: 260, dur: 3, slow: 0.5 }, text: '화염 방사 — 6초마다 주변 유닛의 공격 속도를 3초간 절반으로' } },
  { name: '불꽃 화산', theme: 'volcano', layout: flipH(L_SIDE), boss: { name: '폭죽 로켓차', hpMul: 0.85, speed: 44, skill: { id: 'stun', label: '일제 사격', cd: 10, n: 6, dur: 2.5 }, text: '일제 사격 — 10초마다 무작위 유닛 6명을 2.5초간 기절시킨다' } },
  { name: '등대 부두', theme: 'harbor', layout: flipH(L_ZIG), boss: { name: '드론 둥지', hpMul: 1.1, speed: 52, fly: true, skill: { id: 'summon', label: '드론 사출', cd: 7, n: 4, kind: 'fast', hp: 0.4 }, text: '드론 사출 — 7초마다 드론 4기를 내보낸다' } },
  { name: '구름 활주로', theme: 'airfield', layout: flipV(L_S), boss: { name: '먹구름 폭격기', hpMul: 0.77, speed: 56, fly: true, skill: { id: 'bomb', label: '융단 폭격', cd: 9, r: 150, dur: 3 }, text: '융단 폭격 — 9초마다 한 구역의 유닛을 3초간 기절시킨다' } },
  { name: '고철 요새', theme: 'hq', layout: flipV(L_SIDE), boss: { name: '강철 거인', hpMul: 0.69, speed: 40, skill: { id: 'stun', label: '충격파', cd: 12, n: 5, dur: 2.5, regen: 0.004, rage: 0.3 }, text: '재생 장갑 · 충격파 — 체력을 조금씩 회복하고, 12초마다 유닛 5명을 기절시키며, 체력 30% 아래에서 빨라진다' } },
];
export const areaOfWave = wave => Math.max(0, Math.floor((wave - 1) / 10)) % AREAS.length;      // 100단계를 넘으면(무한 작전) 첫 지역부터 다시 돈다

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
  // 적 체력은 그보다 빠르게(6.4%) 늘어 뒤로 갈수록 빠듯해진다 — 그 차이는 전설의 용사 · 병과 고유 기술 · 특수 발판 · 보급병으로 메운다
  // (2026-11-20 기획안 1단계를 넣으며 5.9% → 6.4%. 봇 기준: 전부 쓰면 대부분 승리, 용사 없이는 100단계 보스에서 막힌다). 훈련소를 올리면 같은 전력을 20%씩 싸게 산다(summonGrowth 1.6 < 2).
  baseDmg: 10, summonBase: 20, summonGrowth: 1.6, campBase: 120, campGrowth: 2.4,
  hpBase: 26, hpGrowth: 1.064, bountyBase: 0.3, bountyGrowth: 1.055,
  startGold: 100, waveBonus: 15, sellRate: 0.4, auraRadius: 150,   // 옆·위아래·대각선 이웃 발판까지 닿는 거리
  // 병과 강화: 단계당 그 병과 공격력 +upStep, 비용은 upBase × upGrowth^단계
  upBase: 50, upGrowth: 1.35, upStep: 0.08,
  // 보급품(두 번째 재화): 보스·특수 임무·임무 완수로 얻고 선택 소집·진급 심사에 쓴다
  bossSupply: 3, pickSupply: 2, gambleSupply: 1, rerollSupply: 1, gambleUp: [0.55, 0.45, 0.35, 0.22, 0.12], gambleDown: 0.15,      // 진급 심사 성공률은 지금 계급이 높을수록 낮다. 대장(전설)부터는 심사를 받을 수 없다 — 원수는 조합으로만
  // 특수 임무(정예 표적): 직접 불러내는 추가 보스. 제한 시간 안에 잡으면 군자금·보급품
  duoHp: 1.1, duoSplit: 13,      // 2인 협동: 적 체력 배수(두 사람이 저마다 수입을 받지만 훈련소·강화도 저마다 올려야 해서 화력은 2배가 안 된다 — 봇 기준 1.0에서 승률 69%, 1.15에서 50%) · 위쪽 발판 몇 칸이 방장 몫인지
  endlessGrowth: 1.03,  // 무한 작전: 100단계를 넘으면 적 체력이 단계마다 이만큼 더 는다(끝이 나게)
  rushPrep: 20, rushGap: 15, rushSupply: 3, rushBonus: 1.3,      // 보스 러시: 첫 준비 시간 · 보스를 잡은 뒤 다음 보스까지 · 판마다 주는 보급품 · 군자금 배수(특수 임무·임무 보상이 없는 만큼 더 준다)
  eliteTime: 40, eliteCd: 45, eliteHp: 16, eliteHpGrowth: 1.35, eliteBounty: 10, eliteSupply: 2,
  tileCount: 3,         // 지역마다 특수 발판 칸 수 (종류마다 한 칸씩)
  // 보급 기지: 군자금으로 보급병을 고용하면 단계가 시작될 때마다 군자금이 들어오고, 5단계마다 보급품도 들어온다
  depotMax: 10, depotBase: 20, depotGrowth: 1.35, depotFlat: 1, depotRate: 0.03, depotSupEvery: 5, depotSupPer: 5,
};

// 특수 발판: 지역(맵)에 들어설 때마다 발판 25칸 가운데 3칸이 무작위로 특수 발판이 된다. 그 위에 선 유닛만 효과를 받는다
export const TILES = {
  spd: { name: '속사 발판', short: '속사', text: '공격 속도 +25%', color: '#6fe0ff', haste: 0.25 },
  rng: { name: '고지 발판', short: '고지', text: '사거리 +20%', color: '#b8f27a', range: 0.2 },
  crit: { name: '급소 발판', short: '급소', text: '치명타 확률 +15%', color: '#ff8f7a', crit: 0.15 },
};
export const CRIT_MUL = 2.5;
export const critMul = meta => CRIT_MUL + cmOf(meta, 'crit') / 100;      // 명사수 휘장

// 병과 숙련도: 판이 끝나면 그 판에서 싸운 병과에 경험치가 쌓인다(군별 × 병과 60칸, 기기에 저장). 숙련 단계마다 그 병과 공격력 +step
// meta.xp = { 군별 id: { 병과 키: 경험치 } }. 다음 단계까지 필요한 경험치는 need(지금 단계)
export const MASTERY = { max: 10, step: 0.02, need: l => 100 + 60 * l };
export function masteryInfo(xp = 0) { let level = 0; while (level < MASTERY.max && xp >= MASTERY.need(level)) { xp -= MASTERY.need(level); level++; }
  return { level, cur: level < MASTERY.max ? xp : 0, need: level < MASTERY.max ? MASTERY.need(level) : 0 }; }
export const masteryOf = (meta, branchId, key) => masteryInfo(((meta && meta.xp && meta.xp[branchId]) || {})[key] || 0).level;

// 난이도: 적 체력과 훈장 보상이 달라진다. need = 바로 아래 난이도에서 이 단계까지 가면 열린다
// (7계급 경제에서는 화력과 적 체력이 거의 나란히 자라서 배수가 조금만 커도 훨씬 일찍 막힌다. 용사를 쓰는 봇 기준 어려움은 승률 40%쯤, 지옥은 대부분 20~60단계에서 막히고 가끔 이긴다)
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
// 조합 규칙 (2026-11-20 사용자 지정):
//  · 같은 병과끼리 → 같은 병과로 한 등급 진급
//  · 다른 병과끼리 → 한 등급 진급하되, 병과는 그 군별의 10개 병과 가운데 무작위
export const TYPE_KEYS = ['inf', 'art', 'med', 'sig', 'inf+art', 'inf+med', 'inf+sig', 'art+med', 'art+sig', 'med+sig'];
export const keyToType = k => (k.includes('+') ? k.split('+') : [k, k]);
export const sameType = (t1, t2) => typeKey(t1) === typeKey(t2);

// ── 수치 ─────────────────────────────────────────────────
const expo = (branch, level) => level;       // 계급 한 단계 = 전투력 CFG.growth배. (18계급 시절에는 계급 수가 달라도 최종 전투력이 같게 늘려 썼다)
export const maxLevel = branch => branch.grades.length - 1;
export const maxCamp = branch => branch.grades.length - 4;     // 훈련소 최고 단계의 기본 소집 등급 = 영웅. 그 위 3등급(유니크·전설·초월)은 조합으로만 올린다
export const summonCost = (branch, camp, meta) => Math.round(CFG.summonBase * CFG.summonGrowth ** expo(branch, camp) * (1 - cmOf(meta, 'summon') / 100));      // meta: 모병 유공 표창 할인
export const campCost = (branch, camp) => Math.round(CFG.campBase * CFG.campGrowth ** expo(branch, camp));
export const unitValue = (branch, level) => Math.round(CFG.summonBase * CFG.summonGrowth ** expo(branch, level));

export function unitStats(branch, level, type, meta = {}, up = null) {
  const w = { inf: 0, art: 0, med: 0, sig: 0 }; w[type[0]] += 0.5; w[type[1]] += 0.5;
  const k = branch.trait.key;
  const D = CFG.baseDmg * CFG.growth ** expo(branch, level) * (1 + 0.03 * (meta.atk || 0))
    * (1 + CFG.upStep * (up ? (up[type[0]] + up[type[1]]) / 2 : 0))
    * (1 + MASTERY.step * masteryOf(meta, branch.id, typeKey(type))) * (1 + cmOf(meta, 'b_' + branch.id) / 100);      // 병과 숙련도 · 군별 부대 표창
  let dmg = D * (w.inf * 1.0 + w.art * 2.6 + w.med * 0.5 + w.sig * 0.6);
  let cd = w.inf * 0.55 + w.art * 1.5 + w.med * 0.9 + w.sig * 0.8;
  let range = w.inf * 190 + w.art * 290 + w.med * 170 + w.sig * 240;
  let splash = 80 * w.art, slow = 0.4 * w.sig, vuln = 0.3 * w.sig, haste = 0.4 * w.med;
  if (k === 'artDmg' && w.art > 0) dmg *= 1.15;
  if (k === 'range') range *= 1.1;
  if (k === 'infSpeed' && w.inf > 0) cd /= 1.15;
  if (k === 'splash') { splash *= 1.3; if (w.art > 0) dmg *= 1.1; }
  if (k === 'slow') { slow *= 1.3; dmg *= 0.85; }
  // 특수 병과의 고유 기술 (data.js TYPE_SKILLS)
  const sk = (SKILL_ON && TYPE_SKILLS[typeKey(type)]) || {};
  if (sk.vuln) vuln = Math.max(vuln, sk.vuln);
  return { dmg, cd, range, splash, slow, vuln, haste, crit: (k === 'crit' ? 0.15 : 0) + (sk.crit || 0),
    vulnDur: sk.vulnDur || 2, burst: sk.burst || 0, burstMul: sk.burstMul || 1, guard: sk.guard || 0, dot: sk.dot || 0, dotDur: sk.dotDur || 0, rangeAura: sk.rangeAura || 0 };
}
let SKILL_ON = true; export const setSkills = on => { SKILL_ON = on; };      // 봇 비교용
export const typeSkill = type => TYPE_SKILLS[typeKey(type)] || null;

// 모드: 기본 작전(100단계) · 무한 작전(100단계를 넘어 끝없이) · 보스 러시(보스 10종만 연달아). need = 어느 모드·난이도에서든 이 단계까지 가 본 적이 있어야 열린다
export const MODES = [
  { id: 'normal', name: '기본 작전', text: '100단계를 막아 내면 승리' },
  { id: 'endless', name: '무한 작전', need: 50, text: '100단계를 넘어 끝없이 — 최고 기록 도전' },
  { id: 'rush', name: '보스 러시', need: 30, text: '보스 10종을 연달아 격파' },
];
export const maxWaveOf = g => (g.mode === 'endless' ? Infinity : g.mode === 'rush' ? AREAS.length : CFG.maxWave);
// 모드에 맞는 단계 정보 · 지역. 보스 러시의 n번째 판 = 기본 작전 10n단계의 보스
export const waveOf = (g, wave) => (g.mode === 'rush' ? waveInfo(wave * 10) : waveInfo(wave));
export const areaOf = (g, wave) => (g.mode === 'rush' ? Math.min(AREAS.length - 1, Math.max(0, wave - 1)) : areaOfWave(wave));
// 보스 러시에서 n번째 보스 앞에 주는 군자금 = 기본 작전에서 그 앞 아홉 단계 동안 버는 돈(단계 보너스 + 처치 보상)
export function rushStipend(n) {
  let sum = CFG.waveBonus;
  for (let w = n * 10 - 9; w < n * 10; w++) { const i = waveInfo(w); sum += CFG.waveBonus + i.count * i.bounty; }
  return Math.round(sum * CFG.rushBonus);
}
export function waveInfo(wave) {
  const hp = CFG.hpBase * CFG.hpGrowth ** (wave - 1) * (wave > CFG.maxWave ? CFG.endlessGrowth ** (wave - CFG.maxWave) : 1), bounty = CFG.bountyBase * CFG.bountyGrowth ** (wave - 1);
  if (wave % 10 === 0) { const n = areaOfWave(wave), b = AREAS[n].boss;      // 지역마다 다른 보스 (체력 배수는 같고 속도·모습이 다르다)
    return { kind: 'boss', boss: n + 1, fly: !!b.fly, skill: b.skill, name: b.name, count: 1, hp: hp * CFG.bossHp * (b.hpMul || 1), speed: b.speed, bounty: bounty * 25, gap: 1 }; }
  if (wave % 5 === 0) return { kind: 'armor', name: '고철 장갑차', count: 14, hp: hp * 2.3, speed: 52, bounty: bounty * 1.5, gap: 0.85 };
  if (wave % 3 === 0) return { kind: 'fast', name: '고철 드론 떼', count: 26, hp: hp * 0.6, speed: 105, bounty: bounty * 0.75, gap: 0.42 };
  return { kind: 'normal', name: '고철 병정', count: 20, hp, speed: 70, bounty, gap: 0.6 };
}

// ── 게임 상태 ────────────────────────────────────────────
// 군별: 한 판에 여섯 군별의 유닛이 섞여 나온다(2026-11-21 사용자 결정). 유닛마다 제 군별(u.b)이 있고, **조합은 같은 군별끼리만** 된다.
//  branchId를 주면 그 군별 유닛만 나오는 판이 된다(g.only) — 검사와, 군별을 고르던 시절에 저장한 판을 이어 할 때 쓴다.
//  g.branch는 군별에 상관없는 값(등급 수, 소집·훈련소 비용)을 읽는 기준일 뿐이다. 유닛의 군별은 branchOf(g, u)로 읽는다.
export function createGame({ branchId = null, meta = {}, seed = Date.now(), fx = true, diff = 0, mode = 'normal' }) {
  const only = branchById(branchId) ? branchId : null, branch = branchById(only) || BRANCHES[0], rush = mode === 'rush';
  const g = {
    branch, only, meta, rand: rng(seed), fx, diff, mode, hpMul: DIFFS[diff].hp, dealt: 0, dmg: { inf: 0, art: 0, med: 0, sig: 0 }, time: 0, wave: 0, nextWave: rush ? CFG.rushPrep : CFG.prepTime,
    gold: CFG.startGold + 40 * (meta.gold || 0) + (rush ? rushStipend(1) : 0), camp: 0, units: Array(SLOT_COUNT).fill(null), area: 0, map: MAPS[0],
    supply: cmOf(meta, 'supply') + (rush ? CFG.rushSupply : 0), dmgT: {}, bossKills: 0, bossT0: CFG.bossTime, up: { inf: 0, art: 0, med: 0, sig: 0 }, elite: { n: 0, cd: 0, active: false }, done: {}, hiddenGot: 0, missionT: 0,
    enemies: [], effects: [], sfx: [], spawn: null, bossTimer: 0, over: null, kills: 0, uid: 1, auraDirty: true, log: [],
    tiles: {}, rerolls: 0, streak: 0, fastBoss: 0, crisis: 0,      // 특수 발판 {칸 번호: 종류} · 히든 임무용 기록
    depot: 0, depotGold: 0,                                        // 보급병 수 · 보급 기지로 번 군자금 합계
    duo: null,      // 2인 협동이면 { ps: [방장, 손님], me, cur } (아래 '2인 협동'). 혼자 하는 판은 null
    heroGot: 0, zones: [], buff: { haste: 0, dmg: 0, immune: false },   // 용사 탄생 횟수 · 화염 지대 · 용사가 아군 전체에 주는 효과
  };
  rollTiles(g); return g;
}
// 특수 발판을 새로 정한다 (게임을 시작할 때와 다음 지역으로 넘어갈 때)
function rollTiles(g) {
  const free = Array.from({ length: SLOT_COUNT }, (_, i) => i), kinds = Object.keys(TILES); g.tiles = {};
  for (const kind of kinds.slice(0, CFG.tileCount)) g.tiles[free.splice(Math.floor(g.rand() * free.length), 1)[0]] = kind;
  for (let i = cmShared(g, 'tile'); i > 0; i--) g.tiles[free.splice(Math.floor(g.rand() * free.length), 1)[0]] = kinds[Math.floor(g.rand() * kinds.length)];      // 공병 표창: 종류 무작위로 더
  g.auraDirty = true;
}
export const tileAt = (g, slot) => TILES[g.tiles[slot]] || null;
// 유닛의 실제 사거리 (히든 계급 지원 · 고지 발판 포함)
export const unitRange = u => u.stats.range * (1 + u.rangeUp + (u.padR || 0));

// 빈 발판 가운데 무작위 한 곳 (없으면 -1). 협동에서는 내 몫의 발판만
function randomEmptySlot(g) {
  const free = []; g.units.forEach((u, i) => { if (!u && mine(g, i)) free.push(i); });
  return free.length ? free[Math.floor(g.rand() * free.length)] : -1;
}
// at: 소집할 칸(빈 칸을 눌러 소집). 주지 않으면 빈 칸 가운데 무작위(신병 소집 버튼 · 봇)
export function summon(g, at = -1) {
  const cost = summonCost(g.branch, g.camp, g.meta), slot = at >= 0 ? (at < g.units.length && !g.units[at] && mine(g, at) ? at : -1) : randomEmptySlot(g);
  if (g.over || g.gold < cost || slot < 0) return null;
  g.gold -= cost;
  const r = g.rand(), level = Math.min(maxLevel(g.branch), g.camp + (r < 0.03 ? 2 : r < 0.18 + cmOf(g.meta, 'luck') / 100 ? 1 : 0));      // 3% 두 계급 위, 15% 한 계급 위 (+행운의 군번줄)
  const c = CLASS_IDS[Math.floor(g.rand() * 4)], bid = pickBranch(g);
  // 히든 계급 뽑기 (그 군별에 히든 계급이 있을 때)
  for (const h of BR[bid].hidden) if (h.draw && g.camp >= h.drawCamp[0] && g.camp <= h.drawCamp[1] && g.rand() < h.draw)
    return placeUnit(g, slot, h.level, [c, c], h.id, bid);
  return placeUnit(g, slot, level, [c, c], null, bid);
}
const BR = Object.fromEntries(BRANCHES.map(b => [b.id, b]));
const pickBranch = g => g.only || BRANCHES[Math.floor(g.rand() * BRANCHES.length)].id;      // 새 유닛의 군별: 여섯 가운데 무작위
function placeUnit(g, slot, level, type, hidden = null, bid = pickBranch(g)) {
  const u = { id: g.uid++, slot, level, type, hidden, b: bid, o: g.duo ? g.duo.cur : 0, cd: 0.2, haste: 0, dmgUp: 0, rangeUp: 0, padH: 0, padR: 0, padC: 0, fireT: 0, atkT: 0, faceL: false, stunT: 0, burnT: 0, burn: 0, dealt: 0,
    stats: unitStats(BR[bid] || g.branch, level, type, g.meta, g.up), flash: 0.5 };
  if (hidden) { if (heroDef(hidden)) { if (level === heroDef(hidden).level) g.heroGot++; u.skT = 2; } else g.hiddenGot++; g.log.push({ t: 'hidden', id: hidden }); }
  g.units[slot] = u; g.auraDirty = true; return u;
}
export const heroDef = id => (id ? HEROES.find(h => h.id === id) : null) || null;
// 히든 계급 또는 용사의 정의 (둘 다 유닛의 hidden 칸에 id가 적힌다. 용사는 .hero가 참)
export const hiddenDef = (branch, id) => (id ? branch.hidden.find(h => h.id === id) || heroDef(id) : null) || null;
export const heroOf = u => (u ? heroDef(u.hidden) : null);
const sv = (u, v) => (Array.isArray(v) ? v[u.level > 5 ? 1 : 0] : v);      // 용사 기술 값: 각성(초월)하면 두 번째 값
// 용사 조합식: 재료 둘이 유니크 등급의 순수 병과이고 서로 다른 병과일 때. 용사는 종류마다 한 명뿐이라, 그 용사가 이미 전장에 있으면 일반 조합이 된다
export function heroRecipe(g, A, B) {
  if (!HERO_ON || A.hidden || B.hidden || A.level !== B.level || A.type[0] !== A.type[1] || B.type[0] !== B.type[1] || A.type[0] === B.type[0]) return null;
  const k = typeKey([A.type[0], B.type[0]]), h = HEROES.find(h => h.level - 1 === A.level && typeKey(h.pair) === k);
  return h && !g.units.some(u => u && u.hidden === h.id) ? h : null;
}
let HERO_ON = true; export const setHeroes = on => { HERO_ON = on; };      // 봇 비교용 (용사 없이 돌려 보기)
// 히든 조합 판정: 재료 두 유닛(일반 계급)이 히든 계급 바로 아래이고 조건을 만족하면 히든 계급 id
export function hiddenRecipe(g, A, B) {
  if (A.hidden || B.hidden) return null;
  const hero = heroRecipe(g, A, B); if (hero) return hero.id;
  for (const h of branchOf(g, A).hidden) {
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
  for (const u of g.units) if (u && own(g, u)) u.stats = unitStats(branchOf(g, u), u.level, u.type, g.meta, g.up);
  g.auraDirty = true; return true;
}
// 선택 소집: 보급품을 써서 원하는 기본 병과를 고른다 (계급 운은 일반 소집과 같고 히든 뽑기는 없다)
export function summonPick(g, c) {
  const cost = summonCost(g.branch, g.camp, g.meta), slot = randomEmptySlot(g);
  if (g.over || g.gold < cost || g.supply < CFG.pickSupply || slot < 0) return null;
  g.gold -= cost; g.supply -= CFG.pickSupply;
  const r = g.rand();
  return placeUnit(g, slot, Math.min(maxLevel(g.branch), g.camp + (r < 0.06 ? 2 : r < 0.28 ? 1 : 0)), [c, c]);
}
// 진급 심사: 보급품 1로 선택한 유닛에 도전. 성공하면 한 계급 진급, 실패하면 그대로, 낮은 확률로 강등
export const gambleChance = (u, meta) => (CFG.gambleUp[u.level] ? CFG.gambleUp[u.level] + cmOf(meta, 'gamble') / 100 : 0);
export function canGamble(g, a) {
  const u = g.units[a];
  return !!(u && own(g, u) && !g.over && !u.hidden && g.supply >= CFG.gambleSupply && u.level < CFG.gambleUp.length);
}
export function gamble(g, a) {
  if (!canGamble(g, a)) return null;
  const u = g.units[a], r = g.rand(); g.supply -= CFG.gambleSupply;
  const res = r < gambleChance(u, g.meta) ? 'up' : r < 1 - CFG.gambleDown || u.level === 0 ? 'same' : 'down';
  g.streak = res === 'up' ? g.streak + 1 : 0;      // 연속 통과 횟수 (히든 임무)
  if (res !== 'same') placeUnit(g, a, u.level + (res === 'up' ? 1 : -1), u.type, null, branchOf(g, u).id).dealt = u.dealt;
  return res;
}
// 병과 교체: 보급품을 써서 고른 유닛의 병과를 다시 뽑는다. 등급·누적 피해는 그대로이고, 지금 병과는 다시 나오지 않는다(나머지 9종 가운데 무작위)
export function canReroll(g, a) {
  const u = g.units[a];
  return !!(u && own(g, u) && !g.over && !heroOf(u) && g.supply >= CFG.rerollSupply);      // 용사는 병과가 정해져 있어 바꿀 수 없다
}
export function reroll(g, a) {
  if (!canReroll(g, a)) return null;
  const u = g.units[a], ks = TYPE_KEYS.filter(k => k !== typeKey(u.type));
  g.supply -= CFG.rerollSupply; g.rerolls++;
  u.type = keyToType(ks[Math.floor(g.rand() * ks.length)]); u.stats = unitStats(branchOf(g, u), u.level, u.type, g.meta, g.up);
  u.flash = 0.5; g.auraDirty = true; return u;
}
// 보급 기지: 보급병 한 명이 단계마다 가져오는 군자금 = depotFlat + 그 단계 기본 수입(단계 보너스 + 적 부대 처치 보상)의 depotRate.
// 일찍 고용할수록 오래 받지만 그만큼 초반 전력이 준다. 5단계마다 보급병 5명당 보급품 1개
export const depotCost = g => Math.round(CFG.depotBase * CFG.depotGrowth ** g.depot);
export function depotIncome(g, wave = Math.max(1, g.wave + 1)) {
  const w = waveInfo(wave), base = g.mode === 'rush' ? rushStipend(Math.min(wave, AREAS.length)) : CFG.waveBonus + w.count * w.bounty;      // 보스 러시는 판마다 받는 군자금이 기준
  return Math.round(g.depot * (CFG.depotFlat + CFG.depotRate * base) * (1 + cmOf(g.meta, 'depot') / 100));
}
export const depotSupply = g => Math.floor(g.depot / CFG.depotSupPer);
export function hireDepot(g) {
  const cost = depotCost(g);
  if (g.over || g.depot >= CFG.depotMax || g.gold < cost) return false;
  g.gold -= cost; g.depot++; return true;
}
// 지원 요청(보상형 광고): 판마다 한 번, 지금 단계 수입의 세 단계분을 받는다 (보스 러시는 판 군자금의 30%)
export const adSupportGold = g => { const w = waveOf(g, Math.max(1, g.wave));
  return Math.round(g.mode === 'rush' ? rushStipend(Math.min(AREAS.length, Math.max(1, g.wave))) * 0.3 : 3 * (CFG.waveBonus + w.count * w.bounty)); };
export function adSupport(g) { if (g.over || g.adGold) return 0; const v = adSupportGold(g); g.adGold = 1; g.gold += v; return v; }
export const eliteState = g => (g.mode === 'rush' ? 'off' : g.elite.active ? 'active' : g.wave < 1 ? 'wait' : g.elite.cd > 0 ? 'cd' : 'ready');      // 보스 러시에는 특수 임무가 없다
export function callElite(g) {
  if (g.over || eliteState(g) !== 'ready') return false;
  const w = g.wave - 1, hp = CFG.hpBase * CFG.hpGrowth ** w * CFG.eliteHp * CFG.eliteHpGrowth ** g.elite.n * g.hpMul;
  g.enemies.push({ id: g.uid++, s: 0, hp, maxHp: hp, speed: 55, bounty: CFG.bountyBase * CFG.bountyGrowth ** w * CFG.eliteBounty * (1 + cmOf(g.meta, 'elite') / 100), kind: 'elite',
    life: CFG.eliteTime, slowT: 0, slow: 0, vulnT: 0, vuln: 0 });
  g.elite.active = true; return true;
}
// ── 임무: 조건을 채우면 자동으로 완수되고 보급품을 받는다 ───────
const lvCount = (g, lv) => g.units.filter(u => u && u.level >= lv).length;
export const MISSIONS = [
  { id: 'k50', sup: 1, text: () => '적 50명 처치', ok: g => g.kills >= 50 },
  { id: 'k300', not: 'rush', sup: 2, text: () => '적 300명 처치', ok: g => g.kills >= 300 },
  { id: 'k1000', not: 'rush', sup: 3, text: () => '적 1000명 처치', ok: g => g.kills >= 1000 },
  { id: 'four', sup: 1, text: () => '기본 병과 4종을 모두 배치', ok: g => CLASS_IDS.every(c => g.units.some(u => u && u.type[0] === c && u.type[1] === c)) },
  { id: 'mix3', sup: 2, text: () => '혼성 병과 3종을 동시에 보유', ok: g => new Set(g.units.filter(u => u && u.type[0] !== u.type[1]).map(u => typeKey(u.type))).size >= 3 },
  { id: 'full', sup: 1, text: () => '배치 칸 25칸을 모두 채우기', ok: g => !g.units.includes(null) },      // 협동에서는 둘이 함께 채운다
  { id: 'lv5', sup: 1, text: () => `${GRADES[4].name} 등급 이상 3명 보유`, ok: g => lvCount(g, 4) >= 3 },
  { id: 'officer', sup: 2, text: g => `${GRADES[g.branch.tiers[0]].name} 등급 이상 1명 보유`, ok: g => lvCount(g, g.branch.tiers[0]) >= 1 },
  { id: 'general', sup: 3, text: g => `${GRADES[g.branch.tiers[1]].name} 등급 이상 1명 보유`, ok: g => lvCount(g, g.branch.tiers[1]) >= 1 },
  { id: 'up5', sup: 1, text: () => '병과 강화 합계 5단계', ok: g => CLASS_IDS.reduce((s, c) => s + g.up[c], 0) >= 5 },
  { id: 'el1', not: 'rush', sup: 1, text: () => '특수 임무 1회 완수', ok: g => g.elite.n >= 1 },
  { id: 'el5', not: 'rush', sup: 2, text: () => '특수 임무 5회 완수', ok: g => g.elite.n >= 5 },
  { id: 'hid', sup: 2, text: () => '히든 계급 획득', ok: g => g.hiddenGot > 0, only: g => g.branch.hidden.length > 0 },
  { id: 'hero1', sup: 3, text: () => '전설의 용사 탄생', ok: g => g.heroGot > 0 },
  { id: 'depot5', sup: 2, text: () => '보급병 5명 고용', ok: g => g.depot >= 5 },
  { id: 'w30', not: 'rush', sup: 2, text: () => '30단계 도달', ok: g => g.wave >= 30 },
  { id: 'w60', not: 'rush', sup: 3, text: () => '60단계 도달', ok: g => g.wave >= 60 },
  // 히든 임무: 달성하기 전에는 조건이 보이지 않는다 (한 번 달성하면 다음 판부터는 조건이 보인다 — 화면 쪽에서 기억)
  { id: 'h_mono', hidden: true, sup: 3, text: () => '같은 병과 유닛 8명을 동시에 보유', ok: g => Math.max(0, ...Object.values(typeCounts(g))) >= 8 },
  { id: 'h_all', hidden: true, sup: 4, text: () => '10개 병과를 모두 동시에 보유', ok: g => Object.keys(typeCounts(g)).length >= TYPE_KEYS.length },
  { id: 'h_streak', hidden: true, sup: 3, text: () => '진급 심사 3회 연속 통과', ok: g => g.streak >= 3 },
  { id: 'h_fast', hidden: true, sup: 3, text: () => `보스를 등장 ${FAST_BOSS}초 안에 격파`, ok: g => g.fastBoss > 0 },
  { id: 'h_crisis', hidden: true, not: 'rush', sup: 3, text: () => `적이 ${CRISIS_AT}명 넘게 몰린 뒤 5명 이하로 줄이기`, ok: g => g.crisis > 0 && g.enemies.length <= 5 },
  { id: 'h_tile', hidden: true, sup: 3, text: g => `특수 발판 ${Object.keys(g.tiles).length}칸 모두에 ${GRADES[3].name} 등급 이상 배치`, ok: g => Object.keys(g.tiles).every(i => g.units[i] && g.units[i].level >= 3) },
];
const FAST_BOSS = 12, CRISIS_AT = 40;
function typeCounts(g) { const n = {}; for (const u of g.units) if (u) { const k = typeKey(u.type); n[k] = (n[k] || 0) + 1; } return n; }
export const missionList = g => MISSIONS.filter(m => (!m.only || m.only(g)) && m.not !== g.mode);      // not: 그 모드에서는 달성할 수 없어 빼는 임무

export function upgradeCamp(g) {
  const cost = campCost(g.branch, g.camp);
  if (g.over || g.camp >= maxCamp(g.branch) || g.gold < cost) return false;
  g.gold -= cost; g.camp++; return true;
}
export function canMerge(g, a, b) {
  const A = g.units[a], B = g.units[b];
  return !!(A && B && a !== b && own(g, A) && own(g, B) && A.level === B.level && branchOf(g, A) === branchOf(g, B) && A.level < maxLevel(g.branch));      // 같은 등급 · 같은 군별끼리만
}
export function mergePreview(g, a, b) {
  if (!canMerge(g, a, b)) return null;
  const A = g.units[a], B = g.units[b];
  // 용사 각성: 재료 가운데 용사가 있으면 용사가 한 등급 올라 초월이 된다 (둘 다 용사면 먼저 고른 쪽)
  const hu = heroOf(A) ? A : heroOf(B) ? B : null;
  if (hu) return { level: A.level + 1, type: hu.type, random: false, hidden: hu.hidden, awaken: true };
  const same = sameType(A.type, B.type);      // type이 null이고 random이 true면 조합할 때 병과가 무작위로 정해진다
  const hidden = hiddenRecipe(g, A, B), hero = heroDef(hidden);
  if (hero) return { level: A.level + 1, type: sortType(hero.pair), random: false, hidden, hero: true };      // 용사 탄생: 병과는 두 재료를 섞은 특수 병과
  return { level: A.level + 1, type: same ? A.type : null, random: !same, hidden };
}
// a = 먼저 고른 유닛(주재료), b = 결과가 놓일 자리
export function merge(g, a, b) {
  const p = mergePreview(g, a, b); if (!p || g.over) return null;
  const sum = g.units[a].dealt + g.units[b].dealt;
  const type = p.type || keyToType(TYPE_KEYS[Math.floor(g.rand() * TYPE_KEYS.length)]);
  const bid = branchOf(g, g.units[a]).id; g.units[a] = null; const u = placeUnit(g, b, p.level, type, p.hidden, bid); u.dealt = sum; return u;      // 누적 피해는 두 유닛 것을 이어받는다
}
export function moveUnit(g, a, b) {
  if (!g.units[a] || a === b || !own(g, g.units[a]) || !mine(g, b)) return false;      // 협동: 내 유닛을 내 몫의 발판으로만
  const A = g.units[a], B = g.units[b];
  g.units[b] = A; A.slot = b; g.units[a] = B; if (B) B.slot = a; g.auraDirty = true; return true;
}
export const sellValue = (g, u) => Math.floor(unitValue(g.branch, u.level) * (CFG.sellRate + cmOf(g.meta, 'sell') / 100));
export function sell(g, a) {
  const u = g.units[a]; if (!u || !own(g, u)) return 0;
  const v = sellValue(g, u);
  g.units[a] = null; g.gold += v; g.auraDirty = true; return v;
}
// 계급 이름·계급장은 등급과 병과로 정해진다(같은 등급이라도 병과에 따라 이름이 다르다). 히든 계급은 제 이름과 계급장을 쓴다
export const rankInsig = (branch, u) => (hiddenDef(branch, u.hidden) || {}).insig || rankOf(branch, u.level, typeKey(u.type))[1];
// 계급대: 계급장 모양으로 나눈 5단계 (0 병 · 1 부사관 · 2 위관 · 3 영관 · 4 장성). 겉모습과 그림이 이 단계에 따라 달라진다
export const rankGroup = (branch, u) => { const h = hiddenDef(branch, u.hidden); return h && h.grp != null ? h.grp : GROUP_OF_LEVEL[Math.min(u.level, GROUP_OF_LEVEL.length - 1)]; };
export const rankName = (branch, u) => (hiddenDef(branch, u.hidden) || {}).name || rankOf(branch, u.level, typeKey(u.type))[0];
export const unitName = (branch, u) => `${rankName(branch, u)} ${branch.types[typeKey(u.type)][0]}`;
export const unitWeapon = (branch, u) =>
  branch.types[typeKey(u.type)][1][u.level >= branch.tiers[1] ? 2 : u.level >= branch.tiers[0] ? 1 : 0];

// 다음 작전 지역으로 이동: 맵이 바뀐다. 유닛은 같은 번호의 발판으로 옮겨 서고, 남은 적은 새 길의 같은 진행 비율 지점으로 옮긴다. 특수 발판도 새로 정한다
function enterArea(g, area) {
  if (area === g.area) return;
  const old = g.map; g.area = area; g.map = MAPS[area];
  for (const e of g.enemies) e.s = (e.s % old.len) / old.len * g.map.len;
  rollTiles(g); g.log.push({ t: 'area', area });
}
function startWave(g) {
  g.wave++; const w = waveOf(g, g.wave);
  enterArea(g, areaOf(g, g.wave));
  g.spawn = { ...w, hp: w.hp * g.hpMul, left: w.count, cd: 0 }; g.nextWave = CFG.waveGap;
  if (w.kind === 'boss') g.bossTimer = g.bossT0 = CFG.bossTime + cmShared(g, 'time');
  g.log.push({ t: 'wave', wave: g.wave, name: w.name });
  each(g, isMe => {      // 단계 보너스와 보급 도착은 플레이어마다
    if (g.mode !== 'rush') g.gold += CFG.waveBonus;      // 보스 러시는 보스를 잡을 때 다음 판 군자금을 한꺼번에 받는다
    if (!(g.depot > 0)) return;
    const gold = depotIncome(g, g.wave), sup = g.wave % CFG.depotSupEvery === 0 ? depotSupply(g) : 0;
    g.gold += gold; g.depotGold += gold; g.supply += sup;
    if (isMe) { g.log.push({ t: 'depot', gold, sup }); if (g.fx) g.effects.push({ txt: `보급 +${gold}`, x: FIELD.w * 0.7, y: FIELD.h - 34, t: 1.6 }); }
  });
}
// 돌려주는 값: 실제로 깎은 체력 (누적 피해 기록용). o = 때린 유닛의 주인(협동)
function hit(g, e, dmg, o = 0) {
  const k = e.skill;
  if (k) {      // 보스 방어 능력
    if (k.id === 'evade' && g.rand() < k.p) { if (g.fx) g.effects.push({ txt: '회피', x: e.x, y: e.y - 30, t: 0.6, small: true }); return 0; }
    if (k.id === 'armor' && e.hp > e.maxHp * 0.5) dmg *= 1 - k.cut;
    if (e.dashT > 0) dmg *= 1 - k.cut;
  }
  if (e.kind === 'boss') dmg *= 1 + cmOf(metaOf(g, o), 'boss') / 100;      // 무공 표창
  const full = dmg * (1 + (e.vulnT > 0 ? e.vuln : 0)), real = Math.max(0, Math.min(full, e.hp));
  e.hp -= full;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true; g.kills++;
    if (e.kind === 'boss') { each(g, () => { g.supply += CFG.bossSupply; }); g.bossKills++; if (g.bossTimer >= g.bossT0 - FAST_BOSS) g.fastBoss++; if (g.mode === 'rush') g.rushNext = true; }
    if (e.kind === 'elite') { each(g, () => { g.supply += CFG.eliteSupply; }); g.elite.n++; g.elite.active = false; g.elite.cd = CFG.eliteCd; g.log.push({ t: 'eliteKill' }); }
    if (g.fx) { g.effects.push({ puff: true, x: e.x, y: e.y, r: e.kind === 'boss' ? 60 : 18, t: 0.3 }); if (e.kind === 'boss') g.sfx.push('bossdie'); }
    each(g, () => { g.gold += e.bounty * (hasPolice(g) ? 1.1 : 1) * (1 + 0.03 * (g.meta.bounty || 0)); });      // 협동: 누가 잡든 두 사람 모두 보상을 받는다
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
  const immune = g.buff.immune;      // 불사조: 아군 전체가 기절·화염에 걸리지 않는다
  const stun = (list, dur) => { if (immune) return; for (const u of list) { u.stunT = Math.max(u.stunT, dur * (u.guard || 1)); if (g.fx) g.effects.push({ puff: true, x: slots[u.slot].x, y: slots[u.slot].y, r: 34, t: 0.3 }); } };
  const pick = n => { const a = [...live], out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(g.rand() * a.length), 1)[0]); return out; };
  if (k.id === 'summon') {
    const w = (g.mode === 'rush' ? g.wave * 10 : g.wave) - 1, hp = CFG.hpBase * CFG.hpGrowth ** w * k.hp, bounty = CFG.bountyBase * CFG.bountyGrowth ** w * 0.3;
    for (let i = 0; i < k.n; i++) g.enemies.push({ id: g.uid++, s: e.s - 26 * (i + 1), hp, maxHp: hp, speed: k.kind === 'fast' ? 105 : 70, bounty, kind: k.kind, slowT: 0, slow: 0, vulnT: 0, vuln: 0 });
  } else if (k.id === 'dash') e.dashT = k.dur;
  else if (k.id === 'stun') stun(pick(k.n), k.dur);
  else if (k.id === 'burn') { if (!immune) for (const u of live) { const p = slots[u.slot]; if (Math.hypot(p.x - e.x, p.y - e.y) <= k.r) { u.burnT = k.dur * (u.guard || 1); u.burn = k.slow; } }
    if (g.fx) g.effects.push({ puff: true, x: e.x, y: e.y, r: k.r, t: 0.35, col: '#ff8a3c' }); }
  else if (k.id === 'bomb') { const c = slots[Math.floor(g.rand() * slots.length)];
    stun(live.filter(u => Math.hypot(slots[u.slot].x - c.x, slots[u.slot].y - c.y) <= k.r), k.dur);
    if (g.fx) g.effects.push({ puff: true, x: c.x, y: c.y, r: k.r, t: 0.4, col: '#ffb347' }); }
  if (g.fx) { g.effects.push({ txt: k.label + '!', x: e.x, y: e.y - 46, t: 1.3 }); g.sfx.push('art');
    if (immune && (k.id === 'stun' || k.id === 'burn' || k.id === 'bomb')) g.effects.push({ txt: '불사조가 막아냈다', x: e.x, y: e.y - 72, t: 1.3, small: true }); }
}

// 피해 기록: 유닛 누적 · 전체 · 기본 병과별(결과 화면) · 병과 키별(숙련도 경험치 배분)
// 의경의 특성(처치 보상 +10%): 지금 다루는 플레이어의 의경 유닛이 전장에 하나라도 있으면
const hasPolice = g => g.units.some(u => u && branchOf(g, u).id === 'police' && own(g, u));
function credit(g, u, type, d, o = 0) {
  if (u) u.dealt += d; g.dealt += d; g.dmg[type[0]] += d / 2; g.dmg[type[1]] += d / 2;
  if (!type.tk) Object.defineProperty(type, 'tk', { value: typeKey(type) });      // 병과 배열에 키를 붙여 둔다(매번 다시 만들지 않게). 열거되지 않아 저장·비교에는 끼지 않는다
  const t = g.duo ? g.duo.ps[o].dmgT : g.dmgT, k = (u ? branchOf(g, u).id : g.branch.id) + ':' + type.tk; t[k] = (t[k] || 0) + d;      // 군별:병과 로 적는다(숙련도는 군별마다 따로)      // 협동: 숙련 경험치는 자기 유닛이 준 피해로
}
// 용사의 주기 기술. 표적이 없으면 쓰지 않고 기다린다
function heroCast(g, u, k, p, base) {
  const live = g.enemies.filter(e => !e.dead);
  if (k.id === 'barrage') {      // 강철비: 전장의 모든 적에게 포격
    if (!live.length) { u.skT = 0.3; return; }
    for (const e of live) credit(g, u, u.type, hit(g, e, base * sv(u, k.mul), u.o), u.o);
    if (g.fx) { live.slice(0, 14).forEach((e, i) => g.effects.push({ x1: e.x - 30, y1: e.y - 320 - i * 9, x2: e.x, y2: e.y, r: 46, t: 0.42, T: 0.42, c: 'art', c2: 'art' }));
      g.effects.push({ txt: '강철비!', x: p.x, y: p.y - 60, t: 1.1 }); g.sfx.push('art'); }
  } else if (k.id === 'freeze') {      // 혹한: 사거리 안의 적을 얼린다
    const r2 = unitRange(u) ** 2, hitList = live.filter(e => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2);
    if (!hitList.length) { u.skT = 0.3; return; }
    for (const e of hitList) e.freezeT = Math.max(e.freezeT || 0, sv(u, k.dur) * (e.kind === 'boss' || e.kind === 'elite' ? 0.5 : 1));
    if (g.fx) { g.effects.push({ puff: true, x: p.x, y: p.y, r: unitRange(u), t: 0.4, col: '#bfefff' }); g.effects.push({ txt: '혹한!', x: p.x, y: p.y - 60, t: 1.1 }); g.sfx.push('sig'); }
  }
  u.skT = k.cd;
}

// ── 2인 협동 (한 전장을 둘이 나눠 쓴다) ───────────────────
// 전장·적·단계·임무·특수 발판은 함께 쓰고, 군별·군자금·보급품·훈련소·병과 강화·보급병·유닛은 플레이어마다 따로다.
//  · 발판: 위쪽 duoSplit칸은 방장(0), 나머지는 손님(1). 자기 몫의 발판에만 소집·이동하고 자기 유닛만 조합·전역한다.
//  · 수입: 적을 누가 잡든 두 사람 모두 처치 보상·단계 보너스·보스 보급품·임무 보상을 받는다. 그래서 적 체력은 duoHp배.
//  · 용사가 아군 전체에 주는 효과와 의무·히든 계급의 주변 지원은 동료 유닛에게도 미친다.
// 구현: g.duo.ps[i]에 플레이어별 값을 두고, g.gold · g.branch 같은 이름은 '지금 다루는 플레이어(g.duo.cur)'의 값을 가리키게 해 둔다.
//  그래서 혼자 하는 판의 규칙 코드를 그대로 쓴다. 평소 cur는 이 기기의 플레이어(me)이고, 명령을 실행할 때는 act()로, 모두에게 줄 때는 each()로 잠깐 바꾼다.
//  두 기기가 똑같이 계산해야 하므로(방장의 걸음과 명령을 손님이 그대로 따라 한다) step() 안에서는 cur에 기대지 않는다 — 플레이어별 값은 each()나 유닛의 주인(u.o)으로만 읽는다.
const PF = ['gold', 'supply', 'camp', 'up', 'depot', 'depotGold', 'branch', 'meta', 'dmgT', 'adGold'];
export function createDuo({ players, seed, me = 0, fx = true }) {
  const g = createGame({ meta: players[0].meta || {}, seed, fx });      // 협동도 여섯 군별이 섞여 나온다(플레이어가 군별을 고르지 않는다)
  const ps = players.map(p => { const m = p.meta || {}; return { branch: g.branch, meta: m, name: p.name || '', gold: CFG.startGold + 40 * (m.gold || 0), supply: cmOf(m, 'supply'),
    camp: 0, up: { inf: 0, art: 0, med: 0, sig: 0 }, depot: 0, depotGold: 0, dmgT: {}, adGold: 0 }; });
  g.duo = { ps, me, cur: me, solo: false }; g.hpMul *= CFG.duoHp;
  bindDuo(g); rollTiles(g); return g;      // 특수 발판은 두 사람의 공병 표창 가운데 높은 쪽으로 다시 정한다
}
function bindDuo(g) {
  for (const k of PF) { delete g[k]; Object.defineProperty(g, k, { get() { return g.duo.ps[g.duo.cur][k]; }, set(v) { g.duo.ps[g.duo.cur][k] = v; }, enumerable: false, configurable: true }); }
}
export const ownerOf = slot => (slot < CFG.duoSplit ? 0 : 1);
// 지금 다루는 플레이어의 발판 · 유닛인가 (혼자 하는 판, 동료가 나가 혼자 남은 판은 모두 참)
export const mine = (g, slot) => !g.duo || g.duo.solo || ownerOf(slot) === g.duo.cur;
export const own = (g, u) => !g.duo || g.duo.solo || u.o === g.duo.cur;
export const hasFree = g => g.units.some((u, i) => !u && mine(g, i));
export const branchOf = (g, u) => BR[u.b] || g.branch;      // 유닛의 군별
const metaOf = (g, o) => (g.duo ? g.duo.ps[o].meta : g.meta);
const cmShared = (g, id) => (g.duo ? Math.max(...g.duo.ps.map(p => cmOf(p.meta, id))) : cmOf(g.meta, id));      // 함께 쓰는 것(특수 발판 수, 보스 제한 시간)은 둘 중 높은 쪽
// 플레이어 i의 자리에서 f를 실행한다 (명령 실행)
export function act(g, i, f) { if (!g.duo) return f(); const c = g.duo.cur; g.duo.cur = i; try { return f(); } finally { g.duo.cur = c; } }
// 모든 플레이어에게 한 번씩 f를 실행한다. f(isMe): 이 기기의 플레이어 차례인지
function each(g, f) { if (!g.duo) return f(true); const c = g.duo.cur; for (let i = 0; i < g.duo.ps.length; i++) { g.duo.cur = i; f(i === g.duo.me); } g.duo.cur = c; }
// 동료에게 군자금 보내기: 신병 한 명 값
export function giftGold(g) {
  if (!g.duo || g.over) return 0; const cost = summonCost(g.branch, g.camp, g.meta); if (g.gold < cost) return 0;
  g.gold -= cost; g.duo.ps[1 - g.duo.cur].gold += cost; return cost;
}
// 명령 실행: 화면에서 일어나는 모든 조작은 이 함수를 거친다. 협동에서는 두 기기가 같은 걸음에 같은 명령을 실행한다. c = [이름, 값…], i = 누가
const slotArg = v => Math.max(0, Math.min(SLOT_COUNT - 1, v | 0));
export function exec(g, i, c) {
  if (!Array.isArray(c) || g.over) return null;
  const a = slotArg(c[1]), b = slotArg(c[2]), cls = CLASS_IDS.includes(c[1]) ? c[1] : null;
  const f = { summon: () => summon(g, c[1] != null ? a : -1), pick: () => cls && summonPick(g, cls), camp: () => upgradeCamp(g), up: () => cls && upgradeClass(g, cls), merge: () => merge(g, a, b), move: () => moveUnit(g, a, b),
    sell: () => sell(g, a), gamble: () => gamble(g, a), reroll: () => reroll(g, a), elite: () => callElite(g), hire: () => hireDepot(g), ad: () => adSupport(g), gift: () => giftGold(g) }[c[0]];
  return f ? act(g, i === 1 ? 1 : 0, f) : null;
}
// 두 기기의 계산이 같은지 견주는 값 (걸음마다 같아야 한다)
export function duoHash(g) {
  let h = 2166136261; const add = v => { h ^= v | 0; h = Math.imul(h, 16777619); }, f = v => add(Math.round(v * 100));
  add(g.wave); f(g.time); add(g.rand.state()); add(g.uid); add(g.kills); add(g.over ? (g.over.win ? 2 : 1) : 0); add(g.enemies.length);
  for (const e of g.enemies) { add(e.id); f(e.hp); f(e.s); }
  for (const u of g.units) { if (!u) { add(-1); continue; } add(u.id); add(u.level); add(u.o); add(CLASS_IDS.indexOf(u.type[0]) * 4 + CLASS_IDS.indexOf(u.type[1])); f(u.cd); }
  if (g.duo) for (const p of g.duo.ps) { f(p.gold); add(p.supply); add(p.camp); add(p.depot); for (const c of CLASS_IDS) add(p.up[c]); }
  return h >>> 0;
}
// 어긋났을 때 방장의 상태를 통째로 넘겨 맞춘다
export function duoSnap(g) {
  const o = { seed: g.rand.state(), ps: g.duo.ps.map(p => ({ ...p, branch: p.branch.id, meta: undefined })) };
  for (const k in g) if (!SAVE_SKIP.has(k) && k !== 'duo') o[k] = g[k];
  return JSON.parse(JSON.stringify(o, (k, v) => (k === 'stats' ? undefined : v)));
}
export function duoLoad(g, o) {
  if (!g.duo || !o || !Array.isArray(o.ps) || !Array.isArray(o.units) || o.units.length !== SLOT_COUNT || !MAPS[o.area]) return false;
  for (const k in o) if (k !== 'seed' && k !== 'ps') g[k] = o[k];
  o.ps.forEach((p, i) => { const P = g.duo.ps[i]; for (const k of PF) if (k !== 'branch' && k !== 'meta' && p[k] !== undefined) P[k] = p[k]; });
  g.rand = rng(o.seed); g.map = MAPS[g.area]; g.effects = []; g.sfx = [];
  for (const u of g.units) if (u) { const P = g.duo.ps[u.o === 1 ? 1 : 0]; u.stats = unitStats(BR[u.b] || P.branch, u.level, u.type, P.meta, P.up); u.flash = 0; }
  g.auraDirty = true; return true;
}
export const fieldClear = g => g.wave >= maxWaveOf(g) && !!g.spawn && g.spawn.left === 0 && g.enemies.length === 0;

export function step(g, dt) {
  if (g.over) return;
  g.time += dt;
  // 웨이브 진행
  // 보스 러시: 보스를 잡으면 다음 지역으로 옮기고 다음 판 군자금·보급품을 받는다. 다음 보스는 rushGap초 뒤에 나오고, 보스가 살아 있는 동안에는 시간이 가지 않는다
  if (g.rushNext) { g.rushNext = false;
    if (g.wave < maxWaveOf(g)) { const gold = rushStipend(g.wave + 1); g.gold += gold; g.supply += CFG.rushSupply; g.nextWave = CFG.rushGap; enterArea(g, areaOf(g, g.wave + 1)); g.log.push({ t: 'rush', gold, sup: CFG.rushSupply }); } }
  if (g.wave < maxWaveOf(g) && !(g.mode === 'rush' && g.enemies.some(e => e.kind === 'boss'))) { g.nextWave -= dt;
    if (g.nextWave <= 0) startWave(g); }
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
    // 협동: 임무는 함께 쓴다. 둘 중 한 사람의 조건이 차면 완수되고 두 사람 모두 보급품을 받는다
    each(g, () => { for (const m of missionList(g)) if (!g.done[m.id] && m.ok(g)) { g.done[m.id] = true; const text = m.text(g);
      each(g, () => { g.supply += m.sup; }); g.log.push({ t: 'mission', id: m.id, text, sup: m.sup, hidden: !!m.hidden }); } });
    if (g.enemies.length > CRISIS_AT) g.crisis = 1;
  }
  // 의무 계열 · 히든 계급 오라 (같은 종류는 겹치지 않고 가장 큰 값만 적용)
  if (g.auraDirty) {
    const bf = g.buff = { haste: 0, dmg: 0, immune: false };      // 용사가 아군 전체에 주는 효과 (같은 효과는 겹치지 않고 큰 값만)
    for (const m of g.units) { const h = heroOf(m), k = h && h.skill;
      if (k && k.id === 'command') bf.haste = Math.max(bf.haste, sv(m, k.haste));
      if (k && k.id === 'guard') { bf.immune = true; bf.dmg = Math.max(bf.dmg, sv(m, k.dmg)); } }
    for (const u of g.units) if (u) {
      u.haste = u.dmgUp = u.rangeUp = u.guard = 0; const p = g.map.slots[u.slot];      // guard: 기절·화염 시간 배수(0이면 그대로)
      if (bf.immune) u.stunT = u.burnT = 0;
      for (const m of g.units) if (m && m !== u) {
        const h = hiddenDef(branchOf(g, m), m.hidden);
        if (!(m.stats.haste > 0) && !(h && h.aura)) continue;
        const q = g.map.slots[m.slot];
        if (Math.hypot(p.x - q.x, p.y - q.y) > CFG.auraRadius) continue;
        u.haste = Math.max(u.haste, m.stats.haste);
        if (m.stats.rangeAura) u.rangeUp = Math.max(u.rangeUp, m.stats.rangeAura);      // 지휘 통신
        if (m.stats.guard) u.guard = m.stats.guard;                                      // 응급 처치
        if (h && h.aura) { u.dmgUp = Math.max(u.dmgUp, h.aura.dmg || 0); u.rangeUp = Math.max(u.rangeUp, h.aura.range || 0); }
      }
      const t = tileAt(g, u.slot); u.padH = (t && t.haste) || 0; u.padR = (t && t.range) || 0; u.padC = (t && t.crit) || 0;      // 특수 발판
    }
    g.auraDirty = false;
  }
  // 적 이동
  for (const e of g.enemies.slice()) if (e.skill && !e.dead) bossSkill(g, e, dt);
  for (const e of g.enemies) {
    e.slowT -= dt; e.vulnT -= dt;
    if (e.freezeT > 0) e.freezeT -= dt;      // 빙결(동장군): 그 자리에 멈춘다
    if (e.dotT > 0 && !e.dead) { e.dotT -= dt;      // 오염: 0.5초마다 지속 피해
      if ((e.dotTk -= dt) <= 0) { e.dotTk += 0.5; const d = hit(g, e, e.dot * 0.5, e.dotO || 0), ou = g.units.find(u => u && u.id === e.dotBy);
        credit(g, ou, e.dotC, d, e.dotO || 0); } }
    const fast = e.dashT > 0 ? 2.2 : e.skill && e.skill.rage && e.hp < e.maxHp * e.skill.rage ? 1.5 : 1;
    if (!(e.freezeT > 0)) e.s += e.speed * fast * (1 - (e.slowT > 0 && !(e.dashT > 0) ? e.slow : 0)) * dt;
    const p = g.map.pathPos(e.s); e.x = p.x; e.y = p.y; e.left = p.dx < 0;
  }
  // 아군 공격
  for (const u of g.units) {
    if (!u) continue;
    u.flash -= dt; u.fireT -= dt; u.atkT -= dt; u.stunT -= dt; u.burnT -= dt;
    if (u.stunT > 0) continue;                                  // 기절: 공격하지 못한다
    const p = g.map.slots[u.slot], st = u.stats, hk = u.hidden ? (heroOf(u) || {}).skill : null, base = st.dmg * (1 + u.dmgUp + g.buff.dmg);
    if (hk && hk.cd && (u.skT -= dt) <= 0) heroCast(g, u, hk, p, base);      // 용사의 주기 기술 (강철비 · 혹한)
    u.cd -= dt * (1 + u.haste + u.padH + g.buff.haste) * (u.burnT > 0 ? 1 - u.burn : 1);   // 화염: 공격 속도 감소
    if (u.cd > 0) continue;
    const r2 = unitRange(u) ** 2, snipe = hk && hk.id === 'snipe';
    let target = null;
    if (snipe) { for (const e of g.enemies) if (!e.dead && (!target || e.hp > target.hp)) target = e; }      // 매의 눈: 어디에 있든 체력이 가장 많은 적
    else for (const e of g.enemies) if (!e.dead && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r2) { target = e; break; }
    if (!target) { u.cd = 0.05; continue; }
    u.cd = st.cd;
    const big = st.burst > 0 && (u.n = (u.n || 0) + 1) % st.burst === 0, sr = st.splash * (big ? 2 : 1);      // 연속 포격: n번째 공격마다 강화탄
    const cp = st.crit + u.padC + (snipe ? hk.crit : 0), crit = cp > 0 && g.rand() < cp, dmg = base * (crit ? (snipe ? sv(u, hk.mul) : critMul(metaOf(g, u.o))) : 1) * (big ? st.burstMul : 1);
    const victims = sr > 0
      ? g.enemies.filter(e => !e.dead && (e.x - target.x) ** 2 + (e.y - target.y) ** 2 <= sr * sr)
      : [target];
    for (const e of victims) {
      if (st.slow > 0) { const s = e.kind === 'boss' || e.kind === 'elite' ? st.slow / 2 : st.slow; if (s >= e.slow || e.slowT <= 0) { e.slow = s; e.slowT = 1.5; } }
      if (st.vuln > 0 && (st.vuln >= e.vuln || e.vulnT <= 0)) { e.vuln = st.vuln; e.vulnT = Math.max(e.vulnT, st.vulnDur); }
      if (st.dot > 0 && !(e.dotT > 0 && e.dot > base * st.dot)) { e.dot = base * st.dot; e.dotT = st.dotDur; e.dotBy = u.id; e.dotC = u.type; e.dotO = u.o; if (!(e.dotTk > 0)) e.dotTk = 0.5; }
      credit(g, u, u.type, hit(g, e, dmg, u.o), u.o);
    }
    if (hk && hk.id === 'fire') g.zones.push({ x: target.x, y: target.y, r: hk.r, t: hk.dur, tk: 0.5, dps: base * sv(u, hk.dps), uid: u.id, c: u.type, o: u.o });      // 불바다: 맞은 자리에 화염 지대
    if (g.fx) { u.fireT = 0.16; u.atkT = 0.3; u.faceL = target.x < p.x;      // atkT 동안 공격 자세 그림을 보여 준다 (faceL: 표적이 왼쪽)
      if (g.sfx.length < 8) g.sfx.push(u.type[0]);
      g.effects.push({ x1: p.x, y1: p.y, x2: target.x, y2: target.y, r: sr, t: 0.36, T: 0.36, crit: crit || big, c: u.type[0], c2: u.type[1] }); }
  }
  // 화염 지대: 0.5초마다 그 위의 적에게 피해
  if (g.zones.length) {
    for (const z of g.zones) { z.t -= dt; if ((z.tk -= dt) > 0) continue; z.tk += 0.5;
      const owner = g.units.find(u => u && u.id === z.uid);
      for (const e of g.enemies) if (!e.dead && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 <= z.r * z.r) credit(g, owner, z.c, hit(g, e, z.dps * 0.5, z.o || 0), z.o || 0); }
    g.zones = g.zones.filter(z => z.t > 0);
  }
  if (g.enemies.some(e => e.dead)) g.enemies = g.enemies.filter(e => !e.dead);
  if (g.fx) { for (const f of g.effects) f.t -= dt; g.effects = g.effects.filter(f => f.t > 0); }
  // 승패
  const boss = g.enemies.some(e => e.kind === 'boss');
  if (boss) { g.bossTimer -= dt; if (g.bossTimer <= 0) g.over = { win: false, reason: '보스를 제한 시간 안에 막지 못했습니다' }; }
  if (g.enemies.length > CFG.enemyLimit) g.over = { win: false, reason: `적이 ${CFG.enemyLimit}명을 넘어 방어선이 무너졌습니다` };
  if (!g.over && fieldClear(g)) g.over = { win: true, reason: g.mode === 'rush' ? '보스 10종 격파!' : '100단계 방어 성공!' };
}

// 훈장: 5단계마다 1개(보스 러시는 보스 하나에 2개), 승리하면 +20(보스 러시 +10). 난이도 배수와 모범 부대 표창이 곱해진다
export const medalsFor = g => Math.floor((g.mode === 'rush' ? (g.bossKills || 0) * 2 + (g.over && g.over.win ? 10 : 0) : Math.floor(g.wave / 5) + (g.over && g.over.win ? 20 : 0))
  * DIFFS[g.diff || 0].medal * (1 + cmOf(g.meta, 'medal') / 100));
// 기록에 남는 도달 단계: 승리하면 끝 단계, 아니면 막아 낸 마지막 단계. 보스 러시는 잡은 보스 수
export const reached = g => (g.mode === 'rush' ? g.bossKills || 0 : g.over && g.over.win ? maxWaveOf(g) : Math.max(0, g.wave - 1));

// ── 중간 저장 · 이어하기 ─────────────────────────────────
// 진행 중인 게임을 글자로 바꿀 수 있는 값으로 만든다. 군별·맵·난수 함수처럼 다시 만들 수 있는 것은 빼고, 능력치는 불러올 때 다시 계산한다.
const SAVE_V = 2, SAVE_SKIP = new Set(['branch', 'meta', 'rand', 'map', 'effects', 'sfx', 'log']);
export function saveGame(g) {
  if (!g || g.over || g.duo) return null;      // 협동 판은 저장하지 않는다(이어할 수 없다)
  const o = { v: SAVE_V, branchId: g.branch.id, seed: g.rand.state() };
  for (const k in g) if (!SAVE_SKIP.has(k)) o[k] = g[k];
  return JSON.parse(JSON.stringify(o, (k, v) => (k === 'stats' ? undefined : v)));
}
// 저장한 값으로 게임을 되살린다. 형식이 다르거나 망가진 저장이면 null
export function loadGame(o, meta = {}) {
  try {
    if (!o || o.v !== SAVE_V || o.over || !branchById(o.branchId)) return null;
    const mono = 'only' in o ? o.only : o.branchId;      // 군별을 고르던 시절의 저장(only 없음)은 그 군별만 나오는 판으로 이어 한다
    const g = createGame({ branchId: mono, meta, seed: o.seed, diff: DIFFS[o.diff] ? o.diff : 0, mode: MODES.some(m => m.id === o.mode) ? o.mode : 'normal' });
    g.rand = rng(o.seed);      // createGame이 특수 발판을 정하느라 난수를 썼으므로 저장한 상태로 되돌린다
    for (const k in o) if (k !== 'v' && k !== 'branchId' && k !== 'seed' && k !== 'diff' && k !== 'mode' && k !== 'only') g[k] = o[k];
    if (!Array.isArray(g.units) || g.units.length !== SLOT_COUNT || !MAPS[g.area] || !(g.wave >= 0)) return null;
    g.map = MAPS[g.area]; g.hpMul = DIFFS[g.diff].hp;
    for (const u of g.units) if (u) { if (!(u.level >= 0 && u.level <= maxLevel(g.branch))) return null; if (!BR[u.b]) u.b = o.branchId; u.stats = unitStats(BR[u.b], u.level, u.type, g.meta, g.up); u.flash = 0;
      if (u.hidden && !hiddenDef(BR[u.b], u.hidden)) u.hidden = null; }
    if (!Array.isArray(g.zones)) g.zones = [];
    g.auraDirty = true; return g;
  } catch { return null; }
}
