// 규칙 검사 + 자동 플레이 봇으로 난이도 확인:  node tests/sim.mjs
import assert from 'node:assert';
import { BRANCHES, CLASS_IDS, GRADES } from '../www/js/data.js';
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
// 3) 계급은 모든 군별이 7단계이고 최종 계급 전투력이 같다. 한 계급 오르면 전투력이 CFG.growth배
const top = b => C.unitStats({ ...b, trait: { key: '' } }, b.ranks.length - 1, ['inf', 'inf']).dmg;
assert.ok(Math.abs(top(BRANCHES[0]) - top(BRANCHES[5])) < 1e-6 * top(BRANCHES[0]));
for (const b of BRANCHES) { assert.equal(b.ranks.length, 7, b.name); assert.equal(b.insig.length, 7); assert.equal(GRADES.length, 7); }
{ const b = { ...BRANCHES[0], trait: { key: '' } }; assert.ok(Math.abs(C.unitStats(b, 4, ['inf', 'inf']).dmg / C.unitStats(b, 3, ['inf', 'inf']).dmg - C.CFG.growth) < 1e-9); }
// 3-1) 히든 계급: 원사 = 상사+상사 4병과 히든 조합, 준위 = 소집 뽑기
{
  const g = C.createGame({ branchId: 'army', seed: 1, fx: false });
  const put = (slot, level, type, hidden = null) => { g.units[slot] = { id: g.uid++, slot, level, type, hidden, cd: 0, haste: 0, dmgUp: 0, rangeUp: 0,
    stats: C.unitStats(g.branch, level, type), flash: 0 }; };
  put(0, 2, ['inf', 'art']); put(1, 2, ['med', 'sig']);
  assert.equal(C.mergePreview(g, 0, 1).hidden, 'wonsa');
  const w = C.merge(g, 0, 1); assert.equal(C.unitName(g.branch, w), '원사 전투의무병'); assert.equal(w.level, 3);
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
  const el = g.enemies.find(e => e.kind === 'elite'), sup = g.supply; el.hp = 1e-9;
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
console.log('규칙·데이터 검사 통과');

if (process.env.HPG) C.CFG.hpGrowth = +process.env.HPG;
const UPR = +process.env.UPR || 0.2;    // 봇이 병과 강화에 쓰는 군자금 비율
// 4) 봇 플레이. 발판이 비면 소집하고 꽉 차면 낮은 계급부터 조합한다.
//    smart면 쓴 돈의 일정 비율 안에서 훈련소(30%)와 병과 강화(UPR)를 산다 — 보스가 멀고 전장이 조용할 때는 소집을 멈추고 모은다. 특수 임무와 진급 심사도 쓴다.
function play(branchId, seed, smart = true) {
  const g = C.createGame({ branchId, seed, fx: false });
  let acc = 0, spent = 0, upSpent = 0; g.first = [];
  const pay = (cost, f) => { const ok = f(); if (ok) spent += cost; return ok; };
  while (!g.over && g.time < 4000) {
    C.step(g, 0.05); acc += 0.05;
    if (acc < 0.5) continue; acc = 0;
    for (let n = 0; n < 40; n++) {
      let saving = false;
      if (smart) {
        const nUnits = g.units.filter(Boolean).length, w10 = g.wave % 10;
        const calm = nUnits >= 8 && g.enemies.length < 12 && w10 >= 1 && w10 <= 6 && !g.enemies.some(e => e.kind === 'boss');
        const cc = C.campCost(g.branch, g.camp);
        if (g.camp < C.maxCamp(g.branch) && nUnits >= 12 && cc <= 0.3 * (spent + cc)) { if (g.gold >= cc) { pay(cc, () => C.upgradeCamp(g)); continue; } saving = calm; }
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
      for (let i = 0; i + 1 < us.length; i++) if (C.canMerge(g, us[i].slot, us[i + 1].slot)) { C.merge(g, us[i].slot, us[i + 1].slot); done = true; break; }
      if (!done) break;
    }
    const mx = Math.max(-1, ...g.units.filter(Boolean).map(u => u.level)); for (let l = 0; l <= mx; l++) if (!g.first[l]) g.first[l] = g.wave || 1;      // 계급별 첫 등장 단계
  }
  return g;
}
const only = process.argv[2];
const SEEDS = +process.env.SEEDS || 4;
for (const b of BRANCHES) {
  if (only && b.id !== only) continue;
  const rs = Array.from({ length: SEEDS }, (_, i) => play(b.id, i + 1));
  const lazy = play(b.id, 1, false), med = xs => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
  console.log(b.name.padEnd(4), '봇:', rs.map(g => `${g.wave}${g.over?.win ? '승' : '패'}`).join(' '),
    '| 소집·조합만:', `${lazy.wave}${lazy.over?.win ? '승' : '패'}`,
    '| 계급 첫 등장(중앙)', b.ranks.slice(2).map((r, i) => `${r} ${med(rs.map(g => g.first[i + 2] || 999))}`).join(' · '),
    '| 끝 ' + b.ranks.at(-1), med(rs.map(g => g.units.filter(u => u && u.level === 6).length)) + '명',
    '| 강화', CLASS_IDS.map(c => rs[0].up[c]).join('·'), '| 특수임무', rs.map(g => g.elite.n).join('/'));
}
