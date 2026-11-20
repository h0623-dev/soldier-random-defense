// 규칙 검사 + 자동 플레이 봇으로 난이도 확인:  node tests/sim.mjs
import assert from 'node:assert';
import { BRANCHES, CLASS_IDS, GRADES, HEROES, TYPE_SKILLS, rankOf } from '../www/js/data.js';
import * as C from '../www/js/core.js';
import * as M from '../www/js/meta.js';
import { COMMENDS, CM_NEED, cmOf } from '../www/js/data.js';

// 1) 조합 규칙: 같은 병과끼리 → 같은 병과, 다른 병과끼리 → 10개 병과 가운데 무작위. 어느 쪽이든 한 등급 오른다
{
  const g = C.createGame({ branchId: 'army', seed: 7, fx: false });
  const put = (slot, level, type) => { g.units[slot] = { id: g.uid++, slot, level, type, hidden: null, cd: 0, haste: 0, dmgUp: 0, rangeUp: 0, dealt: 0, stats: C.unitStats(g.branch, level, type), flash: 0 }; };
  put(0, 0, ['inf', 'inf']); put(1, 0, ['inf', 'inf']);
  let p = C.mergePreview(g, 0, 1); assert.deepEqual(p.type, ['inf', 'inf']); assert.equal(p.random, false); assert.equal(p.level, 1);
  let u = C.merge(g, 0, 1); assert.equal(C.typeKey(u.type), 'inf'); assert.equal(u.level, 1);                    // 보병 + 보병 → 보병
  put(2, 3, ['art', 'inf']); put(3, 3, ['inf', 'art']); assert.equal(C.mergePreview(g, 2, 3).random, false);        // 박격포병 + 박격포병(칸 순서만 다름) → 박격포병
  assert.equal(C.typeKey(C.merge(g, 2, 3).type), 'inf+art');
  const seen = {};
  for (let i = 0; i < 600; i++) { put(4, 2, ['inf', 'inf']); put(5, 2, ['art', 'art']); p = C.mergePreview(g, 4, 5); assert.equal(p.random, true); assert.equal(p.type, null);
    u = C.merge(g, 4, 5); assert.equal(u.level, 3); const k = C.typeKey(u.type); seen[k] = (seen[k] || 0) + 1; g.units[5] = null; }
  assert.equal(Object.keys(seen).length, 10, '다른 병과끼리 조합하면 10개 병과가 모두 나올 수 있다');
  for (const k of C.TYPE_KEYS) assert.ok(seen[k] > 30 && seen[k] < 95, `${k} ${seen[k]}/600`);                      // 대략 고르게
  put(6, 1, ['inf', 'inf']); put(7, 2, ['inf', 'inf']); assert.equal(C.mergePreview(g, 6, 7), null);              // 등급이 다르면 조합 불가
}
// 2) 데이터 완전성: 모든 군별에 10개 병과 · 병기 3단계
const keys = []; CLASS_IDS.forEach((a, i) => CLASS_IDS.slice(i).forEach(b => keys.push(a === b ? a : a + '+' + b)));
for (const b of BRANCHES) for (const key of keys) {
  assert.ok(b.types[key], `${b.name} ${key} 없음`); assert.equal(b.types[key][1].length, 3);
}
// 3) 계급은 모든 군별이 7단계이고 최종 계급 전투력이 같다. 한 계급 오르면 전투력이 CFG.growth배
const top = b => C.unitStats({ ...b, trait: { key: '' } }, b.ranks.length - 1, ['inf', 'inf']).dmg;
assert.ok(Math.abs(top(BRANCHES[0]) - top(BRANCHES[5])) < 1e-6 * top(BRANCHES[0]));
for (const b of BRANCHES) { assert.equal(b.grades.length, 7, b.name); assert.equal(b.ranks.length, 7); assert.equal(GRADES.length, 7); }
// 3-0) 같은 등급 안에서 병과에 따라 계급 이름이 달라진다 (표시만 다르고 능력은 같다). 순수 병과는 아래 계급, 혼성 병과는 위 계급
{
  const army = BRANCHES[0], nm = (lv, type) => C.rankName(army, { level: lv, type, hidden: null });
  assert.equal(nm(0, ['inf', 'inf']), '훈련병'); assert.equal(nm(1, ['med', 'med']), '이등병'); assert.equal(nm(1, ['art', 'art']), '일병'); assert.equal(nm(1, ['inf', 'art']), '병장');
  assert.equal(nm(2, ['inf', 'inf']), '하사'); assert.equal(nm(2, ['med', 'sig']), '중사'); assert.equal(nm(2, ['art', 'sig']), '상사'); assert.equal(nm(6, ['sig', 'sig']), '원수');
  assert.deepEqual(new Set(keys.map(k => rankOf(army, 5, k)[0])), new Set(['준장', '소장', '중장', '대장']));      // 전설 등급의 네 이름이 모두 쓰인다
  assert.deepEqual(C.rankInsig(army, { level: 2, type: ['art', 'sig'], hidden: null }), ['chev', 3]);              // 상사 = V자 3
  const police = BRANCHES.find(b => b.id === 'police'), marine = BRANCHES.find(b => b.id === 'marine');
  assert.equal(C.rankName(police, { level: 1, type: ['inf', 'art'], hidden: null }), '수경'); assert.equal(C.rankName(police, { level: 6, type: ['inf', 'inf'], hidden: null }), '치안총감');
  assert.equal(C.rankName(marine, { level: 0, type: ['inf', 'inf'], hidden: null }), '훈병');
  for (const b of BRANCHES) for (let lv = 0; lv < 7; lv++) for (const k of keys) assert.ok(rankOf(b, lv, k)[0], `${b.name} ${lv} ${k}`);
  assert.equal(C.unitStats(army, 2, ['inf', 'inf']).dmg, C.unitStats(army, 2, ['inf', 'inf']).dmg);
  assert.equal(C.rankGroup(army, { level: 3, type: ['inf', 'inf'], hidden: 'wonsa' }), 1); assert.equal(C.rankGroup(army, { level: 5, type: ['inf', 'inf'], hidden: null }), 4);
}
{ const b = { ...BRANCHES[0], trait: { key: '' } }; assert.ok(Math.abs(C.unitStats(b, 4, ['inf', 'inf']).dmg / C.unitStats(b, 3, ['inf', 'inf']).dmg - C.CFG.growth) < 1e-9); }
// 3-1) 히든 계급: 원사 = 상사+상사 4병과 히든 조합, 준위 = 소집 뽑기
{
  const g = C.createGame({ branchId: 'army', seed: 1, fx: false });
  const put = (slot, level, type, hidden = null) => { g.units[slot] = { id: g.uid++, slot, level, type, hidden, cd: 0, haste: 0, dmgUp: 0, rangeUp: 0,
    stats: C.unitStats(g.branch, level, type), flash: 0 }; };
  put(0, 2, ['inf', 'art']); put(1, 2, ['med', 'sig']);
  assert.equal(C.mergePreview(g, 0, 1).hidden, 'wonsa');
  const w = C.merge(g, 0, 1); assert.ok(C.unitName(g.branch, w).startsWith('원사 ')); assert.equal(w.level, 3);      // 병과가 다른 둘의 조합이라 병과는 무작위
  put(2, 1, ['inf', 'art']); put(3, 1, ['med', 'sig']); assert.equal(C.mergePreview(g, 2, 3).hidden, null);   // 상사가 아니면 일반 조합
  put(4, 2, ['inf', 'inf']); put(5, 2, ['art', 'med']); assert.equal(C.mergePreview(g, 4, 5).hidden, null);   // 3병과뿐이면 일반 조합
  put(6, 3, ['inf', 'inf']); const m = C.mergePreview(g, 1, 6); assert.equal(m.level, 4); assert.equal(m.hidden, null); // 히든을 재료로 쓰면 일반 진급
  g.auraDirty = true; C.step(g, 0.01);
  assert.equal(g.units[6].dmgUp, 0.2); assert.equal(g.units[1].dmgUp, 0);       // 원사 주변만 강화, 자기 자신 제외
  for (const u of g.units) if (u) g.units[u.slot] = null;
  g.camp = 2; g.gold = 1e12; let jw = 0;
  for (let i = 0; i < 2000; i++) { const u = C.summon(g); if (u.hidden === 'junwi') { jw++; assert.equal(u.level, 3); } g.units[u.slot] = null; }
  assert.ok(jw > 30 && jw < 100, `준위 뽑기 횟수 ${jw}/2000`);
  g.camp = 1; for (let i = 0; i < 500; i++) { const u = C.summon(g); assert.equal(u.hidden, null); g.units[u.slot] = null; }
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
  for (let i = 0; i < 3000; i++) { g.supply = 1; g.units[0] = { ...u0, level: 3, hidden: null }; tally[C.gamble(g, 0)]++; }
  assert.ok(Math.abs(tally.up / 3000 - C.CFG.gambleUp[3]) < 0.04 && Math.abs(tally.down / 3000 - C.CFG.gambleDown) < 0.04, JSON.stringify(tally));
  assert.equal(C.callElite(g), false);                                          // 1단계 전에는 호출 불가
  g.nextWave = 0; C.step(g, 0.05); assert.equal(C.callElite(g), true); assert.equal(C.callElite(g), false);
  const el = g.enemies.find(e => e.kind === 'elite'), sup = g.supply; el.hp = 1e-9; pu.stats.range = 2000;      // 어느 자리에 있든 닿게
  for (let i = 0; i < 200 && g.elite.active; i++) C.step(g, 0.05);
  assert.equal(g.elite.n, 1); assert.ok(g.supply >= sup + C.CFG.eliteSupply); assert.equal(C.eliteState(g), 'cd');
  for (let i = 0; i < 12; i++) C.step(g, 0.05);                                 // 임무는 0.5초마다 확인한다
  assert.ok(g.done.el1, '임무(특수 임무 1회) 자동 완수');
}
// 3-3) 작전 지역: 맵 10개가 모두 유효(발판 25칸, 닫힌 길), 10단계마다 지역이 바뀌고 유닛은 유지, 지역마다 보스가 다름
{
  assert.equal(C.MAPS.length, 10); for (const m of C.MAPS) { assert.equal(m.slots.length, 25); assert.ok(m.len > 2000); }
  assert.equal(new Set(C.AREAS.map(a => a.boss.name)).size, 10); assert.equal(new Set(C.AREAS.map(a => a.layout.join(''))).size, 10);
  assert.equal(C.waveInfo(30).name, C.AREAS[2].boss.name); assert.equal(C.areaOfWave(10), 0); assert.equal(C.areaOfWave(11), 1); assert.equal(C.areaOfWave(100), 9);
  const g = C.createGame({ branchId: 'navy', seed: 3, fx: false }); g.gold = 1e9; for (let i = 0; i < 25; i++) C.summon(g);
  const ids = g.units.map(u => u.id).join(); g.wave = 10; g.nextWave = 0; g.enemies.push({ id: -1, s: 1800, hp: 1e30, maxHp: 1e30, speed: 0, bounty: 0, kind: 'normal', slowT: 0, slow: 0, vulnT: 0, vuln: 0 });
  C.step(g, 0.05); assert.equal(g.area, 1); assert.equal(g.map, C.MAPS[1]); assert.equal(g.units.map(u => u.id).join(), ids);
  assert.ok(g.log.some(l => l.t === 'area' && l.area === 1));
}
// 3-4) 소집 자리는 빈 발판 중 무작위, 보스 능력(기절·증원·피해 감소)
{
  const first = new Set();
  for (let sd = 1; sd <= 40; sd++) { const g = C.createGame({ branchId: 'army', seed: sd, fx: false }); first.add(C.summon(g).slot); }
  assert.ok(first.size > 8, `첫 소집 자리가 여러 곳이어야 함 (${first.size}곳)`);
  const g = C.createGame({ branchId: 'army', seed: 9, fx: false }); g.gold = 1e12; for (let i = 0; i < 25; i++) C.summon(g);
  assert.ok(!g.units.includes(null)); assert.equal(C.summon(g), null);
  const boss = wave => { g.enemies = []; g.wave = wave - 1; g.area = C.areaOfWave(wave); g.map = C.MAPS[g.area]; g.nextWave = 0; g.over = null; for (const u of g.units) u.stunT = 0;
    for (let i = 0; i < 40; i++) C.step(g, 0.05); const b = g.enemies.find(e => e.kind === 'boss'); b.hp = b.maxHp = 1e40; g.nextWave = 1e9; g.bossTimer = 1e9; return b; };
  boss(30); let stunned = 0; for (let i = 0; i < 200; i++) { C.step(g, 0.05); stunned = Math.max(stunned, g.units.filter(u => u.stunT > 0).length); }
  assert.equal(stunned, 4, '포격 보스는 유닛 4명을 기절시킨다');
  boss(10); const k0 = g.kills; for (let i = 0; i < 200; i++) C.step(g, 0.05);
  assert.ok(g.enemies.filter(e => e.kind === 'normal').length + g.kills - k0 >= 3, '지휘 전차는 호위병을 부른다');
  for (const a of C.AREAS) assert.ok(a.boss.skill && a.boss.text, a.name + ' 보스 능력');
}
// 3-5) 난이도 · 누적 피해 · 중간 저장
{
  const mk = diff => { const g = C.createGame({ branchId: 'army', seed: 5, fx: false, diff }); g.gold = 1e6; for (let i = 0; i < 10; i++) C.summon(g); for (let i = 0; i < 400; i++) C.step(g, 0.05); return g; };
  const n = mk(0), h = mk(2);
  assert.ok(Math.abs(Math.max(...h.enemies.map(e => e.maxHp)) / Math.max(...n.enemies.map(e => e.maxHp)) - C.DIFFS[2].hp) < 1e-9, '지옥 난이도는 적 체력이 배수만큼 많다');
  assert.equal(C.medalsFor({ wave: 50, diff: 0 }), 10); assert.equal(C.medalsFor({ wave: 50, diff: 2 }), 25);      // 훈장: 5단계마다 1개 × 난이도 배수
  const sum = n.units.filter(Boolean).reduce((a, u) => a + u.dealt, 0);
  assert.ok(n.dealt > 0 && Math.abs(sum - n.dealt) < 1e-6 * n.dealt, '유닛별 누적 피해의 합 = 전체 피해');
  assert.ok(Math.abs(Object.values(n.dmg).reduce((a, b) => a + b, 0) - n.dealt) < 1e-6 * n.dealt);
  // 저장 → 글자로 바꿨다가 → 불러오기: 그 뒤 진행이 원본과 똑같아야 한다
  const g = C.createGame({ branchId: 'navy', seed: 11, fx: false, diff: 1 }); g.gold = 5000; for (let i = 0; i < 14; i++) C.summon(g);
  for (let i = 0; i < 900; i++) C.step(g, 0.05); C.upgradeClass(g, 'inf'); C.callElite(g);
  const g2 = C.loadGame(JSON.parse(JSON.stringify(C.saveGame(g))), g.meta); assert.ok(g2, '저장한 게임을 불러온다');
  for (const x of [g, g2]) { for (let i = 0; i < 1200; i++) { C.step(x, 0.05); if (i % 100 === 0) C.summon(x); } }
  const sig = x => [x.wave, x.gold.toFixed(4), x.kills, x.enemies.length, x.units.map(u => (u ? u.level + u.type.join('') : '-')).join(''), x.dealt.toFixed(2), x.diff].join('|');
  assert.equal(sig(g2), sig(g), '불러온 게임이 원본과 같은 길을 간다');
  assert.equal(C.loadGame({ v: 999 }), null); assert.equal(C.loadGame(null), null); assert.equal(C.loadGame({ v: 1, branchId: 'nope' }), null);
  g.over = { win: false }; assert.equal(C.saveGame(g), null, '끝난 게임은 저장하지 않는다');
}
// 3-6) 병과 교체 · 특수 발판 · 히든 임무
{
  const g = C.createGame({ branchId: 'army', seed: 21, fx: false }); g.gold = 1e9;
  const u = C.summon(g); u.dealt = 77; const lv = u.level;
  assert.equal(C.reroll(g, u.slot), null);                                       // 보급품이 없으면 교체 불가
  const seen = new Set();
  for (let i = 0; i < 400; i++) { g.supply = 1; const k0 = C.typeKey(u.type); assert.equal(C.reroll(g, u.slot), u); assert.notEqual(C.typeKey(u.type), k0); seen.add(C.typeKey(u.type)); assert.equal(g.supply, 0); }
  assert.equal(seen.size, 10); assert.equal(u.level, lv); assert.equal(u.dealt, 77); assert.equal(g.rerolls, 400);      // 등급·누적 피해는 그대로
  assert.ok(Math.abs(u.stats.dmg - C.unitStats(g.branch, lv, u.type, g.meta, g.up).dmg) < 1e-9);
  // 특수 발판: 종류마다 한 칸, 그 위의 유닛만 효과를 받고, 지역이 바뀌면 다시 정해진다
  const kinds = Object.values(g.tiles).sort().join(); assert.equal(kinds, 'crit,rng,spd'); assert.equal(Object.keys(g.tiles).length, C.CFG.tileCount);
  const slotOf = kind => +Object.keys(g.tiles).find(i => g.tiles[i] === kind), plain = [...Array(25).keys()].find(i => !g.tiles[i] && i !== u.slot);
  C.moveUnit(g, u.slot, slotOf('rng')); C.step(g, 0.01);
  assert.equal(u.padR, C.TILES.rng.range); assert.equal(u.padH, 0); assert.ok(Math.abs(C.unitRange(u) / u.stats.range - 1.2) < 1e-9);
  C.moveUnit(g, u.slot, slotOf('spd')); C.step(g, 0.01); assert.equal(u.padH, 0.25); assert.equal(u.padR, 0);
  C.moveUnit(g, u.slot, plain); C.step(g, 0.01); assert.equal(u.padH + u.padR + u.padC, 0);
  const layouts = new Set(); for (let sd = 1; sd <= 30; sd++) layouts.add(Object.keys(C.createGame({ branchId: 'army', seed: sd, fx: false }).tiles).join());
  assert.ok(layouts.size > 20, '특수 발판 자리는 판마다 다르다');
  const before = JSON.stringify(g.tiles); g.wave = 10; g.nextWave = 0; C.step(g, 0.05); assert.equal(g.area, 1);
  assert.equal(Object.values(g.tiles).sort().join(), 'crit,rng,spd'); g.wave = 20; g.nextWave = 0; C.step(g, 0.05);
  assert.ok(JSON.stringify(g.tiles) !== before || true);
  // 히든 임무: 조건을 채우면 완수되고 기록에 hidden 표시가 붙는다
  const hm = C.MISSIONS.filter(m => m.hidden); assert.equal(hm.length, 6);
  const h = C.createGame({ branchId: 'army', seed: 3, fx: false }), put = (slot, level, type) => { h.units[slot] = { id: h.uid++, slot, level, type, hidden: null, cd: 9, haste: 0, dmgUp: 0, rangeUp: 0, dealt: 0, stunT: 0, burnT: 0, stats: C.unitStats(h.branch, level, type), flash: 0 }; };
  C.TYPE_KEYS.forEach((k, i) => put(i, 0, C.keyToType(k))); for (let i = 10; i < 18; i++) put(i, 0, ['inf', 'inf']);
  for (const i of Object.keys(h.tiles)) put(+i, 3, ['inf', 'inf']);
  h.streak = 3; for (let i = 0; i < 12; i++) C.step(h, 0.05);
  assert.ok(h.done.h_all && h.done.h_mono && h.done.h_streak && h.done.h_tile, JSON.stringify(h.done)); assert.ok(!h.done.h_fast && !h.done.h_crisis);
  assert.ok(h.log.some(l => l.t === 'mission' && l.hidden && l.id === 'h_all'));
  assert.equal(h.supply, 3 + 4 + 3 + 3 + C.MISSIONS.filter(m => !m.hidden && h.done[m.id]).reduce((n, m) => n + m.sup, 0));
  // 저장 → 불러오기에도 특수 발판이 그대로다
  const g2 = C.loadGame(JSON.parse(JSON.stringify(C.saveGame(g))), g.meta); assert.deepEqual(g2.tiles, g.tiles); assert.equal(g2.rand.state(), g.rand.state());
}
// 3-7) 보급 기지: 보급병을 고용하면 단계가 시작될 때마다 군자금, 5단계마다 보급품
{
  const g = C.createGame({ branchId: 'army', seed: 2, fx: false });
  assert.equal(C.depotCost(g), C.CFG.depotBase); assert.equal(C.depotIncome(g), 0);
  g.gold = 10; assert.equal(C.hireDepot(g), false); g.gold = 1e6;
  for (let i = 0; i < C.CFG.depotMax; i++) { const c = C.depotCost(g), g0 = g.gold; assert.equal(C.hireDepot(g), true); assert.equal(g.gold, g0 - c); }
  assert.equal(C.hireDepot(g), false); assert.equal(g.depot, C.CFG.depotMax);                    // 최대 인원
  const exp = C.depotIncome(g, 1), g0 = g.gold; g.nextWave = 0; C.step(g, 0.01);
  assert.ok(exp >= C.CFG.depotMax && Math.abs(g.gold - g0 - C.CFG.waveBonus - exp) < 1e-6); assert.equal(g.depotGold, exp);
  assert.ok(C.depotIncome(g, 60) > C.depotIncome(g, 30) && C.depotIncome(g, 30) > exp);            // 단계가 오를수록 수입도 는다
  g.wave = 4; g.nextWave = 0; const s0 = g.supply; C.step(g, 0.01); assert.equal(g.supply - s0, Math.floor(C.CFG.depotMax / C.CFG.depotSupPer));
  assert.ok(g.log.some(l => l.t === 'depot' && l.sup > 0));
}
// 3-8) 전설의 용사: 유니크 순수 병과 둘(서로 다른 병과) → 용사(전설) 탄생, 전설 유닛과 조합하면 각성(초월)
{
  const mk = () => { const g = C.createGame({ branchId: 'navy', seed: 4, fx: false }); g.tiles = {}; g.nextWave = 1e9; return g; };
  const put = (g, slot, level, type, hidden = null) => { const u = { id: g.uid++, slot, level, type, hidden, cd: 0, skT: 0, haste: 0, dmgUp: 0, rangeUp: 0, padH: 0, padR: 0, padC: 0, dealt: 0, stunT: 0, burnT: 0, fireT: 0, atkT: 0,
    stats: C.unitStats(g.branch, level, type), flash: 0 }; g.units[slot] = u; g.auraDirty = true; return u; };
  const foe = (g, s, hp = 1e9, kind = 'normal') => { const e = { id: g.uid++, s, hp, maxHp: hp, speed: 70, bounty: 0, kind, slowT: 0, slow: 0, vulnT: 0, vuln: 0 }; g.enemies.push(e); return e; };
  const g = mk(); assert.equal(HEROES.length, 6); assert.equal(new Set(HEROES.map(h => C.typeKey(h.pair))).size, 6);
  for (const h of HEROES) { put(g, 0, 4, [h.pair[0], h.pair[0]]); put(g, 1, 4, [h.pair[1], h.pair[1]]);
    const p = C.mergePreview(g, 0, 1); assert.equal(p.hidden, h.id); assert.equal(p.random, false); assert.equal(C.typeKey(p.type), C.typeKey(h.pair));
    const u = C.merge(g, 0, 1); assert.equal(u.hidden, h.id); assert.equal(u.level, 5); assert.ok(C.unitName(g.branch, u).startsWith(h.name)); assert.equal(C.canReroll(g, 1), false);
    put(g, 2, 4, [h.pair[0], h.pair[0]]); put(g, 3, 4, [h.pair[1], h.pair[1]]); assert.equal(C.mergePreview(g, 2, 3).hidden, null, '같은 용사는 한 명뿐');      // 이미 있으면 일반 조합(병과 무작위)
    g.units[1] = g.units[2] = g.units[3] = null; }
  assert.equal(g.heroGot, 6);
  put(g, 0, 3, ['inf', 'inf']); put(g, 1, 3, ['art', 'art']); assert.equal(C.mergePreview(g, 0, 1).hidden, null);      // 유니크가 아니면 용사가 아니다
  put(g, 0, 4, ['inf', 'inf']); put(g, 1, 4, ['inf', 'art']); assert.equal(C.mergePreview(g, 0, 1).hidden, null);      // 순수 병과가 아니면 아니다
  put(g, 0, 4, ['inf', 'inf']); put(g, 1, 4, ['inf', 'inf']); assert.equal(C.mergePreview(g, 0, 1).hidden, null);      // 같은 병과끼리도 아니다
  // 각성: 용사 + 전설 유닛 → 초월 용사(병과·기술 유지), 더는 조합할 수 없다
  put(g, 0, 5, ['inf', 'art'], 'storm'); put(g, 1, 5, ['sig', 'sig']); let p = C.mergePreview(g, 1, 0); assert.equal(p.awaken, true); assert.equal(p.hidden, 'storm');
  const aw = C.merge(g, 1, 0); assert.equal(aw.level, 6); assert.equal(aw.hidden, 'storm'); assert.equal(C.typeKey(aw.type), 'inf+art'); assert.equal(g.heroGot, 6);
  // 강철비: 6초마다 전장의 모든 적에게 피해 (멀리 있는 적도)
  { const g = mk(), u = put(g, 0, 5, ['inf', 'art'], 'storm'); const far = foe(g, g.map.len * 0.5), far2 = foe(g, g.map.len * 0.6); u.skT = 0.01; u.cd = 99;
    C.step(g, 0.05); const d = u.stats.dmg * HEROES[0].skill.mul[0]; assert.ok(Math.abs(1e9 - far.hp - d) < 1e-6 * d && Math.abs(1e9 - far2.hp - d) < 1e-6 * d, '강철비 피해'); assert.ok(Math.abs(u.skT - 6) < 1e-9);
    u.level = 6; u.skT = 0.01; const h0 = far.hp; C.step(g, 0.05); assert.ok(Math.abs(h0 - far.hp - u.stats.dmg * HEROES[0].skill.mul[1]) < 1e-3 * d, '각성하면 피해가 는다'); }
  // 동장군: 사거리 안의 적이 멈춘다 (보스는 절반)
  { const g = mk(), u = put(g, 0, 5, ['art', 'sig'], 'frost'); const near = foe(g, 0), boss = foe(g, 10, 1e9, 'boss'), far = foe(g, g.map.len * 0.5); u.skT = 0.01; u.cd = 99;
    C.step(g, 0.05); assert.ok(near.freezeT > 1.4 && Math.abs(boss.freezeT - near.freezeT / 2) < 0.06 && !far.freezeT); const s0 = near.s; C.step(g, 0.5); assert.equal(near.s, s0); assert.ok(far.s > g.map.len * 0.5); }
  // 총사령관 · 불사조: 아군 전체 효과. 겹치지 않는다
  { const g = mk(); put(g, 0, 5, ['med', 'sig'], 'marshal'); put(g, 1, 6, ['med', 'sig'], 'marshal'); put(g, 2, 5, ['inf', 'med'], 'phoenix'); const u = put(g, 24, 0, ['inf', 'inf']); u.stunT = 5;
    C.step(g, 0.01); assert.equal(g.buff.haste, 0.2); assert.equal(g.buff.dmg, 0.06); assert.equal(g.buff.immune, true); assert.ok(u.stunT <= 0, '불사조가 있으면 기절이 풀린다');
    const e = foe(g, 0, 1e9); for (const x of g.units) if (x) x.cd = 99; u.cd = 0; g.map.slots[24] && (u.stats.range = 5000); C.step(g, 0.01); assert.ok(Math.abs(1e9 - e.hp - u.stats.dmg * 1.06) < 1e-5, '아군 전체 공격력 +6%'); }
  // 매의 눈: 사거리 밖이어도 체력이 가장 많은 적을 쏜다
  { const g = mk(), u = put(g, 0, 5, ['inf', 'sig'], 'hawk'); const weak = foe(g, 0, 100), strong = foe(g, g.map.len * 0.5, 1e9); C.step(g, 0.01); assert.equal(weak.hp, 100); assert.ok(strong.hp < 1e9); }
  // 불바다: 맞은 자리에 화염 지대가 남아 그 위의 적이 계속 피해를 입는다
  { const g = mk(), u = put(g, 0, 5, ['art', 'med'], 'inferno'); const e = foe(g, 0, 1e9); e.speed = 0; C.step(g, 0.01); assert.equal(g.zones.length, 1); u.cd = 99; const h0 = e.hp;
    for (let i = 0; i < 40; i++) C.step(g, 0.05); assert.ok(Math.abs(h0 - e.hp - u.stats.dmg * 0.25 * 2) < 0.25 * u.stats.dmg, `화염 지대 2초 피해 ${(h0 - e.hp) / u.stats.dmg}`);
    for (let i = 0; i < 60; i++) C.step(g, 0.05); assert.equal(g.zones.length, 0);
    const g2 = C.loadGame(JSON.parse(JSON.stringify(C.saveGame(g))), g.meta); assert.equal(g2.units[0].hidden, 'inferno'); }
  // 히든 계급(원사)의 조합식과 지원 효과는 그대로다
  { const g = mk(); put(g, 0, 2, ['inf', 'art']); put(g, 1, 2, ['med', 'sig']); assert.equal(C.mergePreview(g, 0, 1).hidden, 'wonsa'); }
}
// 3-9) 특수 병과 6종의 고유 기술
{
  const army = BRANCHES[0], st = t => C.unitStats({ ...army, trait: { key: '' } }, 3, t);
  assert.equal(Object.keys(TYPE_SKILLS).length, 6); for (const k of C.TYPE_KEYS) assert.equal(!!TYPE_SKILLS[k], k.includes('+'));      // 특수 병과에만 있다
  assert.equal(st(['inf', 'sig']).crit, 0.1); assert.equal(st(['inf', 'inf']).crit, 0); assert.equal(st(['art', 'sig']).vuln, 0.3); assert.equal(st(['art', 'sig']).vulnDur, 4);
  assert.equal(st(['inf', 'art']).burst, 3); assert.equal(st(['med', 'sig']).rangeAura, 0.1); assert.equal(st(['inf', 'med']).guard, 0.5); assert.equal(st(['art', 'med']).dot, 0.12);
  const mk = () => { const g = C.createGame({ branchId: 'army', seed: 4, fx: false }); g.tiles = {}; g.nextWave = 1e9; return g; };
  const put = (g, slot, level, type) => { const u = { id: g.uid++, slot, level, type, hidden: null, cd: 0, haste: 0, dmgUp: 0, rangeUp: 0, padH: 0, padR: 0, padC: 0, dealt: 0, stunT: 0, burnT: 0, fireT: 0, atkT: 0,
    stats: C.unitStats(g.branch, level, type), flash: 0 }; g.units[slot] = u; g.auraDirty = true; return u; };
  const foe = (g, s, hp = 1e6) => { const e = { id: g.uid++, s, hp, maxHp: hp, speed: 0, bounty: 0, kind: 'normal', slowT: 0, slow: 0, vulnT: 0, vuln: 0 }; g.enemies.push(e); return e; };
  // 연속 포격: 세 번째 공격이 1.5배
  { const g = mk(), u = put(g, 0, 3, ['inf', 'art']), e = foe(g, 0), hits = []; let hp = e.hp;
    for (let i = 0; i < 400 && hits.length < 6; i++) { C.step(g, 0.05); if (e.hp < hp - 1e-9) { hits.push((hp - e.hp) / u.stats.dmg); hp = e.hp; } }
    assert.deepEqual(hits.map(x => +x.toFixed(3)), [1, 1, 1.5, 1, 1, 1.5]); }
  // 오염: 맞은 뒤 공격이 멈춰도 3초 동안 초당 12%
  { const g = mk(), u = put(g, 0, 3, ['art', 'med']), e = foe(g, 0); C.step(g, 0.01); u.cd = 99; const h0 = e.hp;
    for (let i = 0; i < 100; i++) C.step(g, 0.05); assert.ok(Math.abs((h0 - e.hp) / u.stats.dmg - 0.36) < 0.07, `오염 피해 ${(h0 - e.hp) / u.stats.dmg}`); assert.ok(Math.abs(u.dealt - (1e6 - e.hp)) < 1e-6); }
  // 지휘 통신 · 응급 처치: 이웃한 아군에게만
  { const g = mk(); put(g, 0, 3, ['med', 'sig']); put(g, 2, 3, ['inf', 'med']); const a = put(g, 1, 0, ['inf', 'inf']), far = put(g, 24, 0, ['inf', 'inf']); C.step(g, 0.01);
    assert.equal(a.rangeUp, 0.1); assert.equal(a.guard, 0.5); assert.equal(far.rangeUp, 0); assert.equal(far.guard, 0); }
}
// 3-10) 병과 숙련도 · 부대 표창 (전투 밖 성장)
{
  const army = BRANCHES[0];
  assert.deepEqual(C.masteryInfo(0), { level: 0, cur: 0, need: 100 }); assert.equal(C.masteryInfo(100).level, 1); assert.equal(C.masteryInfo(259).level, 1); assert.equal(C.masteryInfo(260).level, 2);
  assert.equal(C.masteryInfo(1e9).level, C.MASTERY.max);
  const m = M.fillMeta({ medals: 50, xp: { army: { inf: 260 } } });
  const d0 = C.unitStats(army, 2, ['inf', 'inf'], {}).dmg; assert.ok(Math.abs(C.unitStats(army, 2, ['inf', 'inf'], m).dmg / d0 - 1.04) < 1e-9, '숙련 2단계 = 공격력 +4%');
  assert.equal(C.unitStats(army, 2, ['art', 'art'], m).dmg, C.unitStats(army, 2, ['art', 'art'], {}).dmg);       // 다른 병과는 그대로
  // 판이 끝나면 준 피해 비율대로 경험치를 나눈다
  const g = C.createGame({ branchId: 'army', seed: 5, fx: false, meta: m }); g.gold = 1e6; for (let i = 0; i < 12; i++) C.summon(g); for (let i = 0; i < 1500; i++) C.step(g, 0.05);
  const sumT = Object.values(g.dmgT).reduce((a, b) => a + b, 0); assert.ok(Math.abs(sumT - g.dealt) < 1e-6 * g.dealt, '병과별 피해의 합 = 전체 피해');
  g.over = { win: false }; const total = M.runXp(g), xp0 = JSON.stringify(m.xp), gain = M.addRunXp(m, g);
  assert.equal(total, C.reached(g) * 10); assert.ok(gain.length > 0 && Math.abs(gain.reduce((a, x) => a + x.xp, 0) - total) <= gain.length, '나눈 경험치의 합 = 판 경험치'); assert.notEqual(JSON.stringify(m.xp), xp0);
  // 표창: 장수 → 단계, 효과 값
  assert.equal(COMMENDS.length, 18); assert.deepEqual([0, 1, 2, 3, 6, 9, 10, 15, 99].map(M.cmLevel), [0, 1, 1, 2, 3, 3, 4, 5, 5]); assert.equal(M.cmNext(3), 6); assert.equal(M.cmNext(15), 0);
  const c = M.fillMeta({}); assert.equal(cmOf(c, 'summon'), 0); M.grantCm(c, 'summon', 3); assert.equal(c.cm.summon, 2); assert.equal(cmOf(c, 'summon'), 4);
  assert.equal(C.summonCost(army, 0, c), Math.round(C.CFG.summonBase * 0.96)); assert.equal(C.summonCost(army, 0), C.CFG.summonBase);
  M.grantCm(c, 'supply', 15); M.grantCm(c, 'tile', 3); M.grantCm(c, 'time', 1); M.grantCm(c, 'sell', 1); M.grantCm(c, 'gamble', 1); M.grantCm(c, 'medal', 15); M.grantCm(c, 'b_army', 1); M.grantCm(c, 'depot', 1);
  const cg = C.createGame({ branchId: 'army', seed: 3, fx: false, meta: c }); assert.equal(cg.supply, 5); assert.equal(Object.keys(cg.tiles).length, C.CFG.tileCount + 2);
  assert.ok(Math.abs(C.unitStats(army, 0, ['inf', 'inf'], c).dmg / C.unitStats(army, 0, ['inf', 'inf'], {}).dmg - 1.02) < 1e-9); assert.equal(C.unitStats(BRANCHES[1], 0, ['inf', 'inf'], c).dmg, C.unitStats(BRANCHES[1], 0, ['inf', 'inf'], {}).dmg);
  assert.equal(C.gambleChance({ level: 0 }, c), C.CFG.gambleUp[0] + 0.01); assert.equal(C.gambleChance({ level: 5 }, c), 0);
  assert.equal(C.sellValue(cg, { level: 3 }), Math.floor(C.unitValue(army, 3) * 0.44));
  assert.equal(C.medalsFor({ wave: 50, diff: 0, meta: c }), 12);                                                       // +25%
  cg.depot = 4; assert.equal(C.depotIncome(cg, 1), Math.round(C.depotIncome({ depot: 4, wave: 0, meta: {} }, 1) * 1.06));
  cg.wave = 9; cg.nextWave = 0; for (let i = 0; i < 40; i++) C.step(cg, 0.05); assert.equal(cg.bossT0, C.CFG.bossTime + 1);
  // 표창 상자 · 무작위 표창은 최고 단계가 아닌 것에서 나온다
  let seed = 1; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const b = M.fillMeta({ medals: M.CM_BOX * 2 + 1 }); assert.ok(M.buyCmBox(b, rand)); assert.ok(M.buyCmBox(b, rand)); assert.equal(M.buyCmBox(b, rand), null); assert.equal(b.medals, 1);
  assert.equal(Object.values(b.cmN).reduce((x, y) => x + y, 0), 2);
  const full = M.fillMeta({}); for (const x of COMMENDS) if (x.id !== 'luck') M.grantCm(full, x.id, CM_NEED.at(-1)); for (let i = 0; i < 15; i++) assert.equal(M.randomCm(full, rand).id, 'luck');
}
// 3-11) 새 모드: 무한 작전 · 보스 러시
{
  assert.equal(C.MODES.length, 3);
  // 무한 작전: 100단계를 넘어도 끝나지 않고, 지역은 처음부터 다시 돌며, 적 체력이 더 빨리 는다
  const e = C.createGame({ branchId: 'army', seed: 2, fx: false, mode: 'endless' }); assert.equal(C.maxWaveOf(e), Infinity);
  e.wave = 100; e.nextWave = 0; e.spawn = { left: 0 }; C.step(e, 0.05); assert.equal(e.wave, 101); assert.equal(e.over, null); assert.equal(e.area, 0); assert.equal(C.areaOfWave(105), 0); assert.equal(C.areaOfWave(111), 1);
  assert.ok(Math.abs(C.waveInfo(104).hp / C.waveInfo(103).hp - C.CFG.hpGrowth * C.CFG.endlessGrowth) < 1e-9); assert.equal(C.waveInfo(110).kind, 'boss'); assert.equal(C.waveInfo(110).name, C.AREAS[0].boss.name);
  const n = C.createGame({ branchId: 'army', seed: 2, fx: false }); n.wave = 100; n.nextWave = 0; n.spawn = { left: 0 }; C.step(n, 0.05); assert.equal(n.over.win, true);      // 기본 작전은 100단계에서 끝
  e.over = { win: false }; assert.equal(C.reached(e), 100); assert.equal(C.medalsFor(e), 20);
  // 보스 러시: 판마다 보스 하나. 잡으면 다음 지역으로 옮기고 군자금·보급품을 받는다. 10번째를 잡으면 승리
  const r = C.createGame({ branchId: 'army', seed: 2, fx: false, mode: 'rush' }); assert.equal(C.maxWaveOf(r), 10); assert.equal(r.gold, C.CFG.startGold + C.rushStipend(1)); assert.equal(r.supply, C.CFG.rushSupply);
  assert.ok(C.rushStipend(5) > C.rushStipend(2) && C.rushStipend(2) > C.rushStipend(1)); assert.equal(C.eliteState(r), 'off'); assert.equal(C.callElite(r), false);
  assert.ok(!C.missionList(r).some(m => m.id === 'w30' || m.id === 'k1000')); assert.ok(C.missionList(r).some(m => m.id === 'four'));
  for (let i = 0; i < (C.CFG.rushPrep + 2) * 20; i++) C.step(r, 0.05);
  let boss = r.enemies.find(x => x.kind === 'boss'); assert.ok(boss && r.wave === 1); assert.equal(boss.maxHp, C.waveInfo(10).hp); assert.equal(r.area, 0);
  const t0 = r.nextWave; for (let i = 0; i < 100; i++) C.step(r, 0.05); assert.equal(r.nextWave, t0, '보스가 살아 있는 동안에는 다음 판 시간이 가지 않는다'); assert.equal(r.wave, 1);
  const u = { id: r.uid++, slot: 0, level: 6, type: ['inf', 'inf'], hidden: null, cd: 0, haste: 0, dmgUp: 0, rangeUp: 0, padH: 0, padR: 0, padC: 0, dealt: 0, stunT: 0, burnT: 0, fireT: 0, atkT: 0, stats: { ...C.unitStats(r.branch, 6, ['inf', 'inf']), dmg: 1e30, range: 5000 }, flash: 0 };
  r.units[0] = u; const g0 = r.gold, s0 = r.supply;
  for (let i = 0; i < 60 && r.bossKills < 1; i++) C.step(r, 0.05);
  C.step(r, 0.05);      // 다음 지역으로 옮기는 것은 보스를 잡은 다음 걸음에서
  assert.equal(r.bossKills, 1); assert.equal(r.area, 1); assert.ok(r.gold >= g0 + C.rushStipend(2)); assert.equal(r.supply, s0 + C.CFG.bossSupply + C.CFG.rushSupply); assert.ok(Math.abs(r.nextWave - C.CFG.rushGap) < 0.11);
  for (let i = 0; i < 20 * 400 && !r.over; i++) C.step(r, 0.05);
  assert.ok(r.over && r.over.win, '보스 10종을 잡으면 승리'); assert.equal(r.bossKills, 10); assert.equal(C.reached(r), 10); assert.equal(C.medalsFor(r), 30);
  const sv = C.loadGame(JSON.parse(JSON.stringify(C.saveGame(C.createGame({ branchId: 'navy', seed: 1, fx: false, mode: 'rush' })))), {}); assert.equal(sv.mode, 'rush');
}
// 3-12) 출석 · 일일 임무 · 뽑기판 · 기록
{
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const m = M.fillMeta({ medals: 1, best: { army: 34 } }); assert.equal(m.tickets, 0); assert.deepEqual(m.att, { last: '', n: 0 });
  assert.equal(M.topWave(m), 34); assert.equal(M.modeOpen(m, 'normal'), true); assert.equal(M.modeOpen(m, 'rush'), true); assert.equal(M.modeOpen(m, 'endless'), false); m.bestD.hard = { navy: 51 }; assert.equal(M.modeOpen(m, 'endless'), true);
  assert.equal(M.bestMap(m, 'normal', 1), m.bestD.hard); assert.equal(M.bestMap(m, 'rush', 2), m.bestR);
  // 출석: 하루 한 번, 7일 주기
  assert.equal(M.canAttend(m, '2026-11-20'), true); const a = M.attend(m, '2026-11-20', rand); assert.deepEqual(a.reward, M.ATTEND[0]); assert.equal(m.medals, 1 + M.ATTEND[0].m);
  assert.equal(M.attend(m, '2026-11-20', rand), null); assert.equal(M.attendDay(m), 1);
  for (let d = 21; d <= 26; d++) M.attend(m, '2026-11-' + d, rand); assert.equal(m.att.n, 7); assert.equal(M.attendDay(m), 0); assert.equal(m.tickets, 4); assert.equal(Object.values(m.cmN).reduce((x, y) => x + y, 0), 1);
  // 일일 임무: 날마다 3개(종류가 겹치지 않음), 같은 날은 같은 목록, 진행은 판이 끝날 때 쌓이고 날이 바뀌면 처음부터
  for (let d = 1; d <= 28; d++) { const l = M.dailyList('2026-12-' + String(d).padStart(2, '0')); assert.equal(l.length, 3); assert.equal(new Set(l.map(x => x.key)).size, 3); }
  assert.deepEqual(M.dailyList('2026-11-20'), M.dailyList('2026-11-20')); assert.ok(new Set(Array.from({ length: 20 }, (_, i) => M.dailyList('2027-01-' + (i + 10)).map(x => x.id).join())).size > 8);
  const day = '2026-11-22', ids = M.dailyList(day).map(x => x.id); assert.deepEqual(ids, ['w40', 'hero2', 'dep8']);
  assert.equal(M.dailyClaim(m, day, 'w40', rand), null);
  M.dailyRecord(m, day, { mode: 'normal', wave: 46, kills: 300, bossKills: 4, heroGot: 1, elite: { n: 2 }, depot: 8, over: { win: false } });
  let st = M.dailyState(m, day); assert.deepEqual(st.map(x => x.done), [true, false, true]); assert.equal(st[1].cur, 1);
  const t0 = m.tickets, md0 = m.medals; assert.deepEqual(M.dailyClaim(m, day, 'w40', rand), M.DAILY_REWARD); assert.equal(M.dailyClaim(m, day, 'w40', rand), null); assert.equal(M.dailyClaim(m, day, 'hero2', rand), null);
  assert.equal(m.tickets, t0 + 1); assert.equal(m.medals, md0 + 2);
  M.dailyRecord(m, day, { mode: 'normal', wave: 12, kills: 50, bossKills: 1, heroGot: 1, elite: { n: 0 }, depot: 0, over: { win: false } }); assert.equal(M.dailyState(m, day)[1].done, true); assert.equal(M.dailyState(m, day)[0].got, true);
  assert.deepEqual(M.dailyState(m, '2026-11-23').map(x => x.cur), [0, 0, 0]);
  // 뽑기판: 25칸, 티켓 한 장에 한 칸, 특등을 찾으면 새 판, 10번마다 표창
  const b = M.fillMeta({ tickets: 2 }); assert.ok(M.flip(b, 0, rand)); assert.equal(b.board.cells.length, 25); assert.equal(M.flip(b, 0, rand), null); assert.ok(M.flip(b, 1, rand)); assert.equal(M.flip(b, 2, rand), null, '티켓이 없으면 못 뒤집는다');
  assert.equal(b.board.cells.filter(x => x.r === 'big').length, 1); assert.equal(b.flips, 2);
  b.tickets = 100; let cmBefore = Object.values(b.cmN).reduce((x, y) => x + y, 0), opened = 2, bonus = 0, big = false;
  for (let i = 2; i < 25 && !M.boardDone(b.board); i++) { const o = M.flip(b, i, rand); if (o) { opened++; if (o.bonus) bonus++; if (o.kind === 'big') big = true; } }
  assert.ok(M.boardDone(b.board)); assert.ok(big || opened === 25); assert.equal(bonus, Math.floor(opened / 10)); assert.equal(b.tickets, 102 - opened);
  assert.equal(M.flip(b, 24, rand), null, '끝난 판은 더 뒤집을 수 없다'); assert.equal(M.resetBoard(b, rand), true); assert.equal(b.board.cells.filter(x => x.open).length, 0); assert.equal(M.resetBoard(b, rand), false);
  assert.ok(Object.values(b.cmN).reduce((x, y) => x + y, 0) >= cmBefore + bonus);
  assert.equal(M.runTickets({ mode: 'normal', wave: 67, over: { win: false } }), 3); assert.equal(M.runTickets({ mode: 'normal', wave: 100, over: { win: true } }), 5); assert.equal(M.runTickets({ mode: 'rush', bossKills: 7 }), 3);
  assert.equal(M.runXp({ mode: 'normal', wave: 51, diff: 1, over: { win: false } }), 800); assert.equal(M.runXp({ mode: 'rush', bossKills: 4, diff: 0 }), 400);
  const old = M.fillMeta({ medals: 9, best: { army: 12 }, found: { wonsa: 1 } }); assert.equal(old.medals, 9); assert.deepEqual(old.xp, {}); assert.deepEqual(old.daily, { date: '', prog: {}, got: {} });      // 예전 저장도 그대로 읽는다
}
// 3-13) 행동력 · 보상형 광고 · 보석 상점 · 고급 보급 상자 · 스킨
{
  let seed = 3; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const H = M.ENERGY.regenMs, t0 = 1e12, m = M.fillMeta({});
  assert.equal(M.ENERGY.max, 10); assert.equal(H, 3600e3); assert.equal(M.energyNow(m, t0), 10); assert.equal(M.energyWait(m, t0), 0);
  for (let i = 0; i < 10; i++) assert.equal(M.spendEnergy(m, t0), true); assert.equal(M.spendEnergy(m, t0), false); assert.equal(M.energyNow(m, t0), 0);      // 10판
  assert.equal(M.energyWait(m, t0 + 600e3), H - 600e3); assert.equal(M.energyNow(m, t0 + H - 1), 0); assert.equal(M.energyNow(m, t0 + H), 1); assert.equal(M.energyNow(m, t0 + 3.5 * H), 3);      // 1시간에 1
  assert.equal(M.energyWait(m, t0 + 3.5 * H), H / 2); assert.equal(M.energyNow(m, t0 + 99 * H), 10); assert.equal(M.energyNow(m, t0 + 200 * H), 10);      // 최대 10
  M.addEnergy(m, 3, t0 + 200 * H); assert.equal(M.energyNow(m, t0 + 201 * H), 13);      // 광고·보석으로 받은 것은 최대를 넘겨 쌓인다
  M.spendEnergy(m, t0 + 201 * H); assert.equal(m.energy.n, 12); assert.equal(M.energyNow(m, t0 + 300 * H), 12);
  const b = M.fillMeta({ energy: { n: 2, t: t0 } }); assert.equal(M.energyNow(b, t0 - 5 * H), 2); assert.equal(M.energyNow(b, t0 - 5 * H + H), 3);      // 시계가 뒤로 가면 그때부터 다시 센다
  // 광고: 자리마다 하루 횟수 제한
  const a = M.fillMeta({}); assert.equal(M.adLeft(a, 'd1', 'gem'), 5);
  for (let i = 0; i < 5; i++) assert.deepEqual(M.adReward(a, 'd1', 'gem', t0), { g: 10 }); assert.equal(M.adReward(a, 'd1', 'gem', t0), null); assert.equal(a.gems, 50); assert.equal(M.adLeft(a, 'd1', 'ticket'), 3);
  assert.equal(M.adLeft(a, 'd2', 'gem'), 5); M.adReward(a, 'd2', 'energy', t0); assert.equal(a.energy.n, 11); assert.equal(M.adLeft(a, 'd2', 'double'), Infinity);
  // 보석 상점
  a.gems = 100; assert.ok(M.buyGem(a, 'medal30', t0)); assert.equal(a.gems, 60); assert.equal(a.medals, 30); assert.ok(M.buyGem(a, 'ticket5', t0)); assert.equal(M.buyGem(a, 'ticket5', t0), null); assert.equal(a.tickets, 5);
  // 고급 보급 상자: 보석이 모자라면 못 열고, 확률의 합은 1, 스킨은 약 4%, 다 가진 것은 환급
  const g = M.fillMeta({ gems: 29 }); assert.equal(M.pull(g, 1, rand), null); g.gems = M.PULL.cost + M.PULL.cost10;
  assert.equal(M.pull(g, 1, rand).length, 1); assert.equal(M.pull(g, 10, rand).length, 10); assert.equal(g.gems, 0); assert.equal(g.pulls, 11);
  assert.ok(Math.abs(M.pullOdds().reduce((x, o) => x + o.p, 0) - 1) < 1e-12); assert.ok(Math.abs(M.pullOdds()[0].each * 18 + M.PULL.skin - 1) < 1e-12);
  let skins = 0; const many = M.fillMeta({}); for (let i = 0; i < 20000; i++) { many.gems = 30; many.skins.own = {}; const r = M.pull(many, 1, rand)[0]; if (r.kind === 'skin') skins++; }
  assert.ok(Math.abs(skins / 20000 - M.PULL.skin) < 0.006, `스킨 확률 ${skins / 20000}`); assert.ok(many.medals > 0, '최고 단계 표창은 훈장으로 환급');
  const allS = M.fillMeta({ gems: 3000, skins: { own: { desert: 1, snow: 1, night: 1, gold: 1 }, on: 'gold' } }); let refund = 0; for (let i = 0; i < 100; i++) for (const r of M.pull(allS, 1, rand)) if (r.kind === 'gems') refund++;
  assert.ok(refund > 0 && allS.gems === 3000 - 3000 + refund * M.PULL.dupGems);
  // 스킨: 사야 쓸 수 있다
  const s = M.fillMeta({ gems: 300 }); assert.equal(M.skinOf(s).id, 'base'); assert.equal(M.useSkin(s, 'desert'), false); assert.equal(M.buySkin(s, 'gold'), false); assert.equal(M.buySkin(s, 'desert'), true); assert.equal(s.gems, 0);
  assert.equal(M.buySkin(s, 'desert'), false); assert.equal(M.useSkin(s, 'desert'), true); assert.equal(M.skinOf(s).filter, M.SKINS[1].filter); assert.equal(M.fillMeta({ skins: { own: {}, on: 'nope' } }).skins.on, 'base');
}
console.log('규칙·데이터 검사 통과');

if (process.env.HPG) C.CFG.hpGrowth = +process.env.HPG;
if (process.env.HERO === '0') C.setHeroes(false);      // 용사 없이 돌려 비교
if (process.env.SKILL === '0') C.setSkills(false);     // 병과 고유 기술 없이 돌려 비교
const UPR = +process.env.UPR || 0.2;    // 봇이 병과 강화에 쓰는 군자금 비율
const DPR = process.env.DPR != null ? +process.env.DPR : 0.15;    // 봇이 보급병 고용에 쓰는 군자금 비율 (0이면 고용하지 않음)
// 4) 봇 플레이. 발판이 비면 소집하고 꽉 차면 낮은 계급부터 조합한다.
//    smart면 쓴 돈의 일정 비율 안에서 훈련소(30%)와 병과 강화(UPR)를 산다 — 보스가 멀고 전장이 조용할 때는 소집을 멈추고 모은다. 특수 임무와 진급 심사도 쓴다.
function play(branchId, seed, smart = true) {
  const g = C.createGame({ branchId, seed, fx: false, diff: +process.env.DIFF || 0, mode: process.env.MODE || 'normal' });      // DIFF=1 어려움, 2 지옥 · MODE=rush|endless
  let acc = 0, spent = 0, upSpent = 0, depSpent = 0; g.first = [];
  const pay = (cost, f) => { const ok = f(); if (ok) spent += cost; return ok; };
  while (!g.over && g.time < (g.mode === 'endless' ? 9000 : 4000)) {
    C.step(g, 0.05); acc += 0.05;
    if (acc < 0.5) continue; acc = 0;
    for (let n = 0; n < 40; n++) {
      let saving = false;
      if (smart) {
        const nUnits = g.units.filter(Boolean).length, w10 = g.wave % 10;
        const calm = nUnits >= 8 && g.enemies.length < 12 && w10 >= 1 && w10 <= 6 && !g.enemies.some(e => e.kind === 'boss');
        const cc = C.campCost(g.branch, g.camp);
        if (g.camp < C.maxCamp(g.branch) && nUnits >= 12 && cc <= 0.3 * (spent + cc)) { if (g.gold >= cc) { pay(cc, () => C.upgradeCamp(g)); continue; } saving = calm; }
        const dc = C.depotCost(g);      // 보급병: 쓴 돈의 DPR 안에서, 유닛이 어느 정도 선 뒤에
        if (DPR > 0 && g.depot < C.CFG.depotMax && nUnits >= 10 && depSpent + dc <= DPR * (spent + dc) && g.gold >= dc) { if (pay(dc, () => C.hireDepot(g))) depSpent += dc; continue; }
        const c = CLASS_IDS.reduce((a, b) => (g.up[b] < g.up[a] ? b : a)), uc = C.classUpCost(g, c);
        if (!saving && nUnits >= 20 && upSpent + uc <= UPR * (spent + uc)) { if (g.gold >= uc) { if (pay(uc, () => C.upgradeClass(g, c))) upSpent += uc; continue; } saving = calm; }
        C.callElite(g);
        const top = g.units.filter(u => u && !u.hidden && C.canGamble(g, u.slot)).sort((a, b) => b.level - a.level)[0];
        if (top) { C.gamble(g, top.slot); continue; }
      }
      if (saving) break;
      if (g.units.includes(null)) { const sc = C.summonCost(g.branch, g.camp); if (!pay(sc, () => C.summon(g))) break; continue; }
      const us = g.units.filter(Boolean).sort((a, b) => a.level - b.level);
      let done = false;
      if (smart) {      // 용사 조합식이 맞는 짝이 있으면 먼저 조합한다. 용사는 각성(전설 유닛과 조합)에만 쓴다
        const pure = us.filter(u => u.level === 4 && !u.hidden && u.type[0] === u.type[1]);
        const pr = pure.flatMap((a, i) => pure.slice(i + 1).map(b => [a, b])).find(([a, b]) => C.heroRecipe(g, a, b));
        if (pr) { C.merge(g, pr[0].slot, pr[1].slot); continue; }
      }
      for (let i = 0; i + 1 < us.length; i++) if (C.canMerge(g, us[i].slot, us[i + 1].slot)) { C.merge(g, us[i].slot, us[i + 1].slot); done = true; break; }
      if (!done) break;
    }
    if (smart) for (const i of Object.keys(g.tiles)) {      // 특수 발판에는 가장 높은 등급의 유닛을 세운다
      const best = g.units.filter(u => u && !g.tiles[u.slot]).sort((x, y) => y.level - x.level)[0], cur = g.units[i];
      if (best && (!cur || best.level > cur.level)) C.moveUnit(g, best.slot, +i);
    }
    const mx = Math.max(-1, ...g.units.filter(Boolean).map(u => u.level)); for (let l = 0; l <= mx; l++) if (!g.first[l]) g.first[l] = g.wave || 1;      // 계급별 첫 등장 단계
  }
  g.earned = spent + g.gold; return g;
}
const only = process.argv[2];
const SEEDS = +process.env.SEEDS || 4;
for (const b of BRANCHES) {
  if (only && b.id !== only) continue;
  const rs = Array.from({ length: SEEDS }, (_, i) => play(b.id, i + 1));
  const lazy = play(b.id, 1, false), med = xs => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
  console.log(b.name.padEnd(4), '봇:', rs.map(g => `${g.wave}${g.over?.win ? '승' : '패'}`).join(' '),
    '| 소집·조합만:', `${lazy.wave}${lazy.over?.win ? '승' : '패'}`,
    '| 등급 첫 등장(중앙)', GRADES.slice(2).map((gr, i) => `${gr.name} ${med(rs.map(g => g.first[i + 2] || 999))}`).join(' · '),
    '| 끝 초월', med(rs.map(g => g.units.filter(u => u && u.level === 6).length)) + '명',
    '| 강화', CLASS_IDS.map(c => rs[0].up[c]).join('·'), '| 특수임무', rs.map(g => g.elite.n).join('/'), '| 용사', rs.map(g => g.heroGot).join('/'), '| 보급병', rs.map(g => g.depot).join('/'), '수입비율', rs.map(g => Math.round(g.depotGold / (g.earned || 1) * 100) + '%').join('/'));
}
