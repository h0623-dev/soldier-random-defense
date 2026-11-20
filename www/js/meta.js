// 전투 밖 성장 — 병과 숙련도 · 부대 표창 · 출석 · 일일 임무 · 보급 뽑기판 (화면과 분리된 순수 로직, node 테스트 가능)
// 여기의 함수들은 기기에 저장되는 meta 객체를 고친다. 날짜는 화면 쪽에서 'YYYY-MM-DD' 글자로 넘겨준다(기기 시계 기준).
import { BRANCHES, COMMENDS, CM_NEED } from './data.js';
import { TYPE_KEYS, DIFFS, MODES, masteryInfo, reached } from './core.js';

export const META_DEFAULT = () => ({
  medals: 0, atk: 0, gold: 0, bounty: 0, best: {}, bestD: {}, bestE: {}, bestR: {}, diff: 0, mode: 'normal', found: {}, foundM: {}, mute: false,
  xp: {},                                   // 병과 숙련도 경험치 { 군별: { 병과 키: 값 } }
  cmN: {}, cm: {},                          // 부대 표창: 모은 장수 · 단계(장수에서 계산해 둔 값 — core가 읽는다)
  tickets: 0, flips: 0, board: null,        // 뽑기판: 티켓 · 누적 뒤집은 수 · 지금 판
  att: { last: '', n: 0 },                  // 출석: 마지막으로 받은 날 · 받은 횟수
  daily: { date: '', prog: {}, got: {} },   // 일일 임무: 날짜 · 진행 · 받은 보상
  runs: 0,
});
// 저장된 값에 기본값을 채워 넣는다 (예전 버전의 저장에는 없는 칸이 있다)
export function fillMeta(saved) {
  const d = META_DEFAULT(), m = { ...d, ...(saved || {}) };
  for (const k of ['best', 'bestD', 'bestE', 'bestR', 'found', 'foundM', 'xp', 'cmN', 'cm', 'att', 'daily']) if (!m[k] || typeof m[k] !== 'object') m[k] = d[k];
  m.att = { ...d.att, ...m.att }; m.daily = { ...d.daily, ...m.daily };
  if (!MODES.some(x => x.id === m.mode)) m.mode = 'normal';
  syncCm(m); return m;
}
const rint = (rand, n) => Math.floor(rand() * n);

// ── 기록 · 모드 열림 ─────────────────────────────────────
// 모드·난이도별 최고 기록이 담긴 칸. 기본 작전은 난이도별(best, bestD[난이도]), 무한 작전·보스 러시는 모드별
export function bestMap(meta, mode, diff) {
  if (mode === 'endless') return meta.bestE; if (mode === 'rush') return meta.bestR;
  return diff === 0 ? meta.best : (meta.bestD[DIFFS[diff].id] || (meta.bestD[DIFFS[diff].id] = {}));
}
// 지금까지 가 본 가장 높은 단계 (기본·무한 작전 통틀어)
export const topWave = meta => Math.max(0, ...Object.values(meta.best), ...Object.values(meta.bestE), ...Object.values(meta.bestD).flatMap(o => Object.values(o)));
export const modeOpen = (meta, id) => { const m = MODES.find(x => x.id === id); return !!m && (!m.need || topWave(meta) >= m.need); };

// ── 병과 숙련도 ─────────────────────────────────────────
// 한 판의 경험치 = 도달 단계 × 10 × 난이도 훈장 배수 (보스 러시는 보스 하나에 100). 그 판에서 준 피해 비율대로 병과에 나눈다
export const runXp = g => Math.round((g.mode === 'rush' ? reached(g) * 100 : reached(g) * 10) * DIFFS[g.diff || 0].medal);
export function addRunXp(meta, g) {
  const total = runXp(g), sum = Object.values(g.dmgT || {}).reduce((a, b) => a + b, 0), out = [];
  if (!(total > 0) || !(sum > 0)) return out;
  const mine = meta.xp[g.branch.id] || (meta.xp[g.branch.id] = {});
  for (const k of TYPE_KEYS) { const xp = Math.round(total * (g.dmgT[k] || 0) / sum); if (xp < 1) continue;
    const before = masteryInfo(mine[k] || 0).level; mine[k] = (mine[k] || 0) + xp; out.push({ key: k, xp, before, after: masteryInfo(mine[k]).level }); }
  return out.sort((a, b) => b.xp - a.xp);
}

// ── 부대 표창 ───────────────────────────────────────────
export const cmLevel = n => CM_NEED.filter(x => (n || 0) >= x).length;
export const cmNext = n => CM_NEED.find(x => x > (n || 0)) || 0;      // 다음 단계에 필요한 장수 (최고 단계면 0)
function syncCm(meta) { meta.cm = {}; for (const c of COMMENDS) { const lv = cmLevel(meta.cmN[c.id]); if (lv) meta.cm[c.id] = lv; } }
export function grantCm(meta, id, n = 1) { meta.cmN[id] = (meta.cmN[id] || 0) + n; syncCm(meta); return COMMENDS.find(c => c.id === id); }
// 무작위 표창 한 장. 아직 최고 단계가 아닌 것 가운데서 고른다(모두 최고면 아무거나)
export function randomCm(meta, rand) {
  const open = COMMENDS.filter(c => (meta.cmN[c.id] || 0) < CM_NEED.at(-1)), pool = open.length ? open : COMMENDS;
  return grantCm(meta, pool[rint(rand, pool.length)].id);
}
export const CM_BOX = 6;      // 표창 상자 값(훈장)
export function buyCmBox(meta, rand) { if (meta.medals < CM_BOX) return null; meta.medals -= CM_BOX; return randomCm(meta, rand); }

// ── 출석 ────────────────────────────────────────────────
// 하루 한 번. 7일 주기로 보상이 돈다(연속으로 받지 않아도 이어진다). m 훈장 · t 티켓 · c 표창
export const ATTEND = [{ m: 3 }, { t: 1 }, { m: 4 }, { t: 1 }, { m: 5 }, { t: 2 }, { c: 1 }];
export const canAttend = (meta, date) => meta.att.last !== date;
export const attendDay = meta => meta.att.n % ATTEND.length;      // 다음에 받을 보상이 몇 번째 칸인지 (0~6)
export function give(meta, r, rand) {      // 보상 지급. 돌려주는 값: 받은 표창 목록
  meta.medals += r.m || 0; meta.tickets += r.t || 0;
  const got = []; for (let i = 0; i < (r.c || 0); i++) got.push(randomCm(meta, rand)); return got;
}
export function attend(meta, date, rand) {
  if (!canAttend(meta, date)) return null;
  const r = ATTEND[attendDay(meta)]; meta.att.last = date; meta.att.n++;
  return { reward: r, cms: give(meta, r, rand) };
}
export const rewardText = r => [r.m && `훈장 ${r.m}개`, r.t && `뽑기 티켓 ${r.t}장`, r.c && `부대 표창 ${r.c}장`, r.x && `숙련 경험치 ${r.x}`].filter(Boolean).join(' · ');

// ── 일일 임무 ───────────────────────────────────────────
// 날마다 3개. 날짜로 정해지므로 같은 날에는 누구에게나 같은 임무가 나온다. 진행은 판이 끝날 때 더한다(max: 한 판 최고값, 아니면 합계)
export const DAILY_POOL = [
  { id: 'run1', key: 'runs', need: 1, text: '작전 1회 마치기' },
  { id: 'run3', key: 'runs', need: 3, text: '작전 3회 마치기' },
  { id: 'w40', key: 'wave', need: 40, max: true, text: '한 판에서 40단계 도달' },
  { id: 'w70', key: 'wave', need: 70, max: true, text: '한 판에서 70단계 도달' },
  { id: 'k800', key: 'kills', need: 800, text: '적 800명 처치' },
  { id: 'boss5', key: 'bosses', need: 5, text: '보스 5마리 격파' },
  { id: 'hero2', key: 'heroes', need: 2, text: '전설의 용사 2명 탄생' },
  { id: 'el5', key: 'elites', need: 5, text: '특수 임무 5회 완수' },
  { id: 'dep8', key: 'depot', need: 8, text: '보급병 8명 고용' },
];
export const DAILY_REWARD = { t: 1, m: 2 };
function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function dailyList(date) {
  const pool = [...DAILY_POOL], out = []; let h = hash('srd' + date);
  while (out.length < 3) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; const m = pool.splice(h % pool.length, 1)[0];
    if (!out.some(x => x.key === m.key)) out.push(m); }      // 같은 종류(예: 1회·3회)가 겹치지 않게
  return out;
}
function today(meta, date) { if (meta.daily.date !== date) meta.daily = { date, prog: {}, got: {} }; return meta.daily; }
// 판이 끝났을 때 그날의 진행에 더한다
export function dailyRecord(meta, date, g) {
  const d = today(meta, date), p = d.prog, add = (k, v) => { p[k] = (p[k] || 0) + v; };
  add('runs', 1); add('kills', g.kills || 0); add('bosses', g.bossKills || 0); add('heroes', g.heroGot || 0); add('elites', (g.elite && g.elite.n) || 0); add('depot', g.depot || 0);
  if (g.mode !== 'rush') p.wave = Math.max(p.wave || 0, reached(g));
}
export function dailyState(meta, date) {
  const d = meta.daily.date === date ? meta.daily : { prog: {}, got: {} };
  return dailyList(date).map(m => ({ ...m, cur: Math.min(m.need, d.prog[m.key] || 0), done: (d.prog[m.key] || 0) >= m.need, got: !!d.got[m.id] }));
}
export function dailyClaim(meta, date, id, rand) {
  const m = dailyState(meta, date).find(x => x.id === id); if (!m || !m.done || m.got) return null;
  today(meta, date).got[id] = 1; give(meta, DAILY_REWARD, rand); return DAILY_REWARD;
}

// ── 보급 뽑기판 ─────────────────────────────────────────
// 5×5 = 25칸. 티켓 한 장으로 한 칸을 뒤집는다. 특등 칸을 찾거나 다 뒤집으면 새 판을 깐다. 뒤집은 수가 BOARD_BONUS의 배수가 될 때마다 표창 한 장을 더 받는다.
// 티켓은 판을 마치면(20단계마다 1장, 최대 5장) · 일일 임무 · 출석으로 얻는다. 결제와는 연결하지 않았다.
export const BOARD_CELLS = [['big', 1], ['cm', 4], ['m3', 8], ['m1', 8], ['xp', 4]];
export const BOARD_REWARD = { big: { c: 3 }, cm: { c: 1 }, m3: { m: 3 }, m1: { m: 1 }, xp: { x: 150 } };
export const BOARD_BONUS = 10;
export function newBoard(rand) {
  const cells = BOARD_CELLS.flatMap(([r, n]) => Array.from({ length: n }, () => ({ r, open: false })));
  for (let i = cells.length - 1; i > 0; i--) { const j = rint(rand, i + 1); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  return { cells };
}
export const boardDone = b => !b || b.cells.every(c => c.open) || b.cells.some(c => c.r === 'big' && c.open);
export function flip(meta, i, rand) {
  if (!meta.board) meta.board = newBoard(rand);
  const c = meta.board.cells[i]; if (!c || c.open || meta.tickets < 1 || boardDone(meta.board)) return null;
  meta.tickets--; c.open = true; meta.flips++;
  const r = BOARD_REWARD[c.r], cms = give(meta, r, rand), out = { kind: c.r, reward: r, cms, bonus: null, xp: null };
  if (r.x) { const b = BRANCHES[rint(rand, BRANCHES.length)], k = TYPE_KEYS[rint(rand, TYPE_KEYS.length)], mine = meta.xp[b.id] || (meta.xp[b.id] = {});      // 숙련 교본: 무작위 군별·병과에 경험치
    mine[k] = (mine[k] || 0) + r.x; out.xp = { branch: b.id, key: k }; }
  if (meta.flips % BOARD_BONUS === 0) out.bonus = randomCm(meta, rand);
  return out;
}
export function resetBoard(meta, rand) { if (!boardDone(meta.board)) return false; meta.board = newBoard(rand); return true; }
// 판을 마치고 받는 티켓
export const runTickets = g => (g.mode === 'rush' ? Math.floor(reached(g) / 2) : Math.min(5, Math.floor(reached(g) / 20)));
