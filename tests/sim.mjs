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
// 3-1) 히든 계급: 원사 = 상사+상사 4병과 히든 조합, 준위 = 소집 뽑기
{
  const g = C.createGame({ branchId: 'army', seed: 1, fx: false });
  const put = (slot, level, type, hidden = null) => { g.units[slot] = { id: g.uid++, slot, level, type, hidden, cd: 0, haste: 0, dmgUp: 0, rangeUp: 0,
    stats: C.unitStats(g.branch, level, type), flash: 0 }; };
  put(0, 6, ['inf', 'art']); put(1, 6, ['med', 'sig']);
  assert.equal(C.mergePreview(g, 0, 1).hidden, 'wonsa');
  const w = C.merge(g, 0, 1); assert.equal(C.unitName(g.branch, w), '원사 전투의무병'); assert.equal(w.level, 7);
  put(2, 5, ['inf', 'art']); put(3, 5, ['med', 'sig']); assert.equal(C.mergePreview(g, 2, 3).hidden, null);   // 상사가 아니면 일반 조합
  put(4, 6, ['inf', 'inf']); put(5, 6, ['art', 'med']); assert.equal(C.mergePreview(g, 4, 5).hidden, null);   // 3병과뿐이면 일반 조합
  put(6, 7, ['inf', 'inf']); const m = C.mergePreview(g, 1, 6); assert.equal(m.level, 8); assert.equal(m.hidden, null); // 히든을 재료로 쓰면 일반 진급
  g.auraDirty = true; C.step(g, 0.01);
  assert.equal(g.units[6].dmgUp, 0.2); assert.equal(g.units[1].dmgUp, 0);       // 원사 주변만 강화, 자기 자신 제외
  for (const u of g.units) if (u) g.units[u.slot] = null;
  g.camp = 5; g.gold = 1e12; let jw = 0;
  for (let i = 0; i < 2000; i++) { const u = C.summon(g); if (u.hidden === 'junwi') { jw++; assert.equal(u.level, 7); } g.units[u.slot] = null; }
  assert.ok(jw > 30 && jw < 100, `준위 뽑기 횟수 ${jw}/2000`);
  g.camp = 3; for (let i = 0; i < 500; i++) { const u = C.summon(g); assert.equal(u.hidden, null); g.units[u.slot] = null; }
  assert.equal(BRANCHES.find(b => b.id === 'police').hidden.length, 0);
}
// 3-2) 병과 강화 · 선택 소집 · 진급 심사 · 특수 임무 · 임무
{
  const g = C.createGame({ branchId: 'army', seed: 5, fx: false });
  g.gold = 1e9; const u0 = C.summon(g), d0 = u0.stats.dmg, c = u0.type[0];
  assert.equal(C.upgradeClass(g, c), true); assert.ok(Math.abs(u0.stats.dmg / d0 - (1 + C.CFG.upStep)) < 1e-9);     // 순수 병과는 단계당 +8%
  assert.equal(C.classUpCost(g, c), Math.round(C.CFG.upBase * C.CFG.upGrowth));
  assert.equal(C.summonPick(g, 'art'), null);                                   // 보급품이 없으면 선택 소집 불가
  g.supply = 10; const pu = C.summonPick(g, 'art'); assert.deepEqual(pu.type, ['art', 'art']); assert.equal(g.supply, 10 - C.CFG.pickSupply);
  const tally = { up: 0, same: 0, down: 0 };
  for (let i = 0; i < 3000; i++) { g.supply = 1; g.units[0] = { ...u0, level: 5, hidden: null }; tally[C.gamble(g, 0)]++; }
  assert.ok(Math.abs(tally.up / 3000 - C.CFG.gambleUp) < 0.04 && Math.abs(tally.down / 3000 - C.CFG.gambleDown) < 0.04, JSON.stringify(tally));
  assert.equal(C.callElite(g), false);                                          // 1단계 전에는 호출 불가
  g.nextWave = 0; C.step(g, 0.05); assert.equal(C.callElite(g), true); assert.equal(C.callElite(g), false);
  const el = g.enemies.find(e => e.kind === 'elite'), sup = g.supply; el.hp = 1e-9;
  for (let i = 0; i < 200 && g.elite.active; i++) C.step(g, 0.05);
  assert.equal(g.elite.n, 1); assert.ok(g.supply >= sup + C.CFG.eliteSupply); assert.equal(C.eliteState(g), 'cd');
  for (let i = 0; i < 12; i++) C.step(g, 0.05);                                 // 임무는 0.5초마다 확인한다
  assert.ok(g.done.el1, '임무(특수 임무 1회) 자동 완수');
}
console.log('규칙·데이터 검사 통과');

if (process.env.HPG) C.CFG.hpGrowth = +process.env.HPG;
const UPR = +process.env.UPR || 0.12;   // 봇이 병과 강화에 쓰는 군자금 비율
// 4) 봇 플레이
function play(branchId, seed, smart = true) {
  const g = C.createGame({ branchId, seed, fx: false });
  let acc = 0;
  while (!g.over && g.time < 4000) {
    C.step(g, 0.05); acc += 0.05;
    if (acc < 0.5) continue; acc = 0;
    for (let n = 0; n < 40; n++) {
      if (smart && C.campCost(g.branch, g.camp) <= g.gold * 0.5 && C.upgradeCamp(g)) continue;
      if (smart) {      // 새 시스템도 단순하게 사용: 가장 낮은 병과 강화, 특수 임무는 될 때마다, 보급품은 최고 계급 유닛 진급 심사
        const c = CLASS_IDS.reduce((a, b) => (g.up[b] < g.up[a] ? b : a));
        if (C.classUpCost(g, c) <= g.gold * UPR && C.upgradeClass(g, c)) continue;
        C.callElite(g);
        const top = g.units.filter(u => u && !u.hidden && u.level < C.maxLevel(g.branch)).sort((a, b) => b.level - a.level)[0];
        if (top && C.canGamble(g, top.slot)) { C.gamble(g, top.slot); continue; }
      }
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
    '| 최고계급', b.ranks[Math.max(...rs[0].units.filter(Boolean).map(u => u.level))],
    '| 히든', rs.map(g => g.log.filter(l => l.t === 'hidden').length).join('/'),
    '| 강화', CLASS_IDS.map(c => rs[0].up[c]).join('·'), '| 특수임무', rs.map(g => g.elite.n).join('/'), '| 임무', rs.map(g => Object.keys(g.done).length).join('/'));
}
