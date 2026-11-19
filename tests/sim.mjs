// 규칙 검사 + 자동 플레이 봇으로 난이도 확인:  node tests/sim.mjs
import assert from 'node:assert';
import { BRANCHES, CLASS_IDS } from '../www/js/data.js';
import * as C from '../www/js/core.js';

// 1) 조합 규칙
const k = (a, b) => C.typeKey(C.combineTypes(a, b));
assert.equal(k(['inf', 'inf'], ['inf', 'inf']), 'inf');          // 보병+보병 → 보병
assert.equal(k(['inf', 'inf'], ['art', 'art']), 'inf+art');      // 보병+포병 → 혼성
assert.equal(k(['art', 'art'], ['inf', 'inf']), 'inf+art');      // 순서 무관
assert.equal(k(['inf', 'art'], ['inf', 'art']), 'inf+art');
assert.equal(k(['inf', 'inf'], ['inf', 'art']), 'inf');
assert.equal(k(['inf', 'art'], ['med', 'sig']), 'inf+med');
assert.equal(k(['inf', 'art'], ['inf', 'med']), 'inf+art');
// 2) 데이터 완전성: 모든 군별에 10개 병과 · 병기 3단계
const keys = []; CLASS_IDS.forEach((a, i) => CLASS_IDS.slice(i).forEach(b => keys.push(a === b ? a : a + '+' + b)));
for (const b of BRANCHES) for (const key of keys) {
  assert.ok(b.types[key], `${b.name} ${key} 없음`); assert.equal(b.types[key][1].length, 3);
}
// 3) 최종 계급 전투력은 군별 계급 수와 무관하게 동일
const top = b => C.unitStats({ ...b, trait: { key: '' } }, b.ranks.length - 1, ['inf', 'inf']).dmg;
assert.ok(Math.abs(top(BRANCHES[0]) - top(BRANCHES[5])) < 1e-6 * top(BRANCHES[0]));
console.log('규칙·데이터 검사 통과');

// 4) 봇 플레이
function play(branchId, seed, smart = true) {
  const g = C.createGame({ branchId, seed, fx: false });
  let acc = 0;
  while (!g.over && g.time < 4000) {
    C.step(g, 0.05); acc += 0.05;
    if (acc < 0.5) continue; acc = 0;
    for (let n = 0; n < 40; n++) {
      if (smart && C.campCost(g.branch, g.camp) <= g.gold * 0.5 && C.upgradeCamp(g)) continue;
      if (g.units.includes(null)) { if (!C.summon(g)) break; continue; }
      const us = g.units.filter(Boolean).sort((a, b) => a.level - b.level);
      let done = false;
      for (let i = 0; i + 1 < us.length; i++) if (C.canMerge(g, us[i].slot, us[i + 1].slot)) { C.merge(g, us[i].slot, us[i + 1].slot); done = true; break; }
      if (done) continue;
      if (smart && us[0].level < g.camp && g.gold >= C.summonCost(g.branch, g.camp)) { C.sell(g, us[0].slot); continue; }
      break;
    }
  }
  return g;
}
const only = process.argv[2];
for (const b of BRANCHES) {
  if (only && b.id !== only) continue;
  const rs = [1, 2, 3].map(s => play(b.id, s));
  const lazy = play(b.id, 1, false);
  console.log(b.name.padEnd(4), '봇:', rs.map(g => `${g.wave}${g.over?.win ? '승' : '패'}`).join(' '),
    '| 훈련소 미강화 봇:', `${lazy.wave}${lazy.over?.win ? '승' : '패'}`,
    '| 최고계급', b.ranks[Math.max(...rs[0].units.filter(Boolean).map(u => u.level))]);
}
