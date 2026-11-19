// 화면 · 입력 · 저장 연결
import { BRANCHES, CLASS_IDS, CLASS_INFO } from './data.js';
import * as C from './core.js';
import { draw } from './render.js';
import { Monetize } from './monetize.js';
import { initLayout } from './layout.js';
import { Sound } from './sound.js';
import { checkUpdate, buildInfo } from './update.js';

const $ = id => document.getElementById(id);
const canvas = $('field'), ctx = canvas.getContext('2d'), overlay = $('overlay');
const SAVE_KEY = 'srd_meta_v1';
const UPGRADES = [
  { key: 'atk', name: '화력 증강', desc: '모든 유닛 공격력 +3%', max: 20 },
  { key: 'gold', name: '초기 보급', desc: '시작 군자금 +40', max: 10 },
  { key: 'bounty', name: '전리품', desc: '처치 보상 +3%', max: 20 },
];
let slowT = 0, frameMs = 16, logAt = 0, hold = 0;
let meta = loadMeta(), g = null, ui = { sel: null, target: null }, speed = 1, paused = true, last = 0, infoKey = '';
const view = initLayout(() => { infoKey = ''; });

function loadMeta() {
  try { return { medals: 0, atk: 0, gold: 0, bounty: 0, best: {}, found: {}, mute: false, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; }
  catch { return { medals: 0, atk: 0, gold: 0, bounty: 0, best: {}, found: {} }; }
}
const saveMeta = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch { /* 저장 불가 환경 */ } };
// 빌드 번호(커밋 시각, 초)를 '11.19 21:08 빌드'처럼 읽기 쉽게
const buildLabel = b => { const d = new Date(b * 1000), z = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())} 빌드`; };
const fmt = n => { n = Math.floor(n); if (n < 1e4) return String(n);
  const u = ['만', '억', '조', '경']; let i = -1; while (n >= 1e4 && i < 3) { n /= 1e4; i++; } return (n >= 100 ? Math.floor(n) : n.toFixed(1)) + u[i]; };
let toastT;
function toast(msg, ms = 1400) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
function show(html) { overlay.innerHTML = `<div class="panel">${html}</div>`; overlay.classList.add('on'); overlay.scrollTop = 0; paused = true; }
function hide() { overlay.classList.remove('on'); paused = false; last = performance.now(); }
overlay.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) ACT[b.dataset.act](b.dataset.arg); });

// ── 화면 ────────────────────────────────────────────────
const ACT = {
  title() {
    show(`<h1>군인 랜덤 디펜스</h1><p class="sub">계급을 올리고 병과를 조합해 100단계를 방어하라</p>
      <button class="wide" data-act="branches">출격</button>
      <button class="wide sec" data-act="upgrades">영구 강화 · 훈장 ${meta.medals}개</button>
      <button class="wide sec" data-act="shop">보급 상점</button>
      <button class="wide sec" data-act="help">게임 방법</button>
      <button class="wide sec" data-act="mute" data-arg="title">소리: ${meta.mute ? '꺼짐' : '켜짐'}</button>
      <p class="sub" style="margin-top:22px">v${buildInfo.version || '0.1.0'} · 시제품${buildInfo.live || buildInfo.bundled ? ` · ${buildLabel(buildInfo.live || buildInfo.bundled)}` : ''}</p>`);
  },
  branches() {
    show(`<h2>군별 선택</h2><div class="cards">${BRANCHES.map(b => `
      <button class="card" style="background:${b.color}" data-act="start" data-arg="${b.id}">
        <b>${b.name}</b><small>${b.trait.text}</small>
        <i>${b.ranks[0]} → ${b.ranks.at(-1)} (${b.ranks.length}계급) · 최고 ${meta.best[b.id] || 0}단계</i></button>`).join('')}</div>
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  start(id) {
    g = C.createGame({ branchId: id, meta }); logAt = 0; ui = { sel: null, target: null, trans: { t: 2.2, total: 2.2, area: 0 } }; infoKey = ''; speed = 1; $('b-speed').textContent = '×1';
    hide(); toast(`${g.branch.name} 출격! 신병을 소집하세요`);
  },
  resume() { hide(); },
  mute(back) { meta.mute = !meta.mute; saveMeta(); Sound.setMuted(meta.mute); if (!meta.mute) Sound.play('summon'); ACT[back](); },
  quit() { g = null; ACT.title(); },
  upgrades() {
    show(`<h2>영구 강화</h2><p class="sub">보유 훈장 ${meta.medals}개 · 5단계마다 1개, 100단계 방어 시 +20개</p>
      ${UPGRADES.map(u => { const lv = meta[u.key], cost = 2 + lv * 2; return `<div class="up"><div><b>${u.name} Lv${lv}/${u.max}</b><br>${u.desc}</div>
        <button data-act="buy" data-arg="${u.key}" ${lv >= u.max || meta.medals < cost ? 'disabled' : ''}>${lv >= u.max ? '최대' : `훈장 ${cost}`}</button></div>`; }).join('')}
      <button class="wide sec" data-act="${g ? 'menu' : 'title'}">뒤로</button>`);
  },
  buy(key) { const lv = meta[key], cost = 2 + lv * 2; if (meta.medals >= cost) { meta.medals -= cost; meta[key]++; saveMeta(); } ACT.upgrades(); },
  shop() {
    show(`<h2>보급 상점</h2><p class="sub">광고 · 결제는 스토어 출시 단계에서 연결됩니다</p>
      ${Monetize.products.map(p => `<div class="up"><div><b>${p.name}</b></div><button disabled>${p.note}</button></div>`).join('')}
      <div class="up"><div><b>광고 보고 훈장 받기</b></div><button disabled>준비 중</button></div>
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  help() {
    show(`<h2>게임 방법</h2><div class="list">
      <p><b>1. 신병 소집</b> — 군자금으로 무작위 병과의 유닛을 뽑습니다. 빈 발판 가운데 무작위 자리에 배치됩니다. 가끔 한두 계급 높은 유닛이 나옵니다.</p>
      <p><b>2. 조합</b> — 유닛을 누른 뒤 <b>같은 계급</b>의 다른 유닛을 누르면 한 계급 위 유닛으로 진급합니다. 두 병과에 따라 결과 병과가 달라집니다.</p>
      <p><b>3. 훈련소 강화</b> — 소집되는 신병의 기본 계급이 올라갑니다.</p>
      <p><b>히든 계급</b> — 정규 계급표에 없는 특수 계급이 있습니다. 특정 조합이나 소집 때 낮은 확률로 나타나며, 주변 아군을 강화합니다. 발견하면 조합 도감에 기록됩니다.</p>
      <p><b>보급품</b> — 보스 격파, 특수 임무, 임무 완수로 얻습니다. <b>선택 소집</b>(원하는 병과 고르기)과 <b>진급 심사</b>(유닛 선택 후 도전: 45% 진급, 15% 강등)에 씁니다.</p>
      <p><b>병과 강화</b> — 군자금으로 한 병과의 공격력을 계속 올립니다. 주력 병과에 집중하세요.</p>
      <p><b>특수 임무</b> — 정예 표적을 직접 불러냅니다. ${C.CFG.eliteTime}초 안에 잡으면 큰 보상, 못 잡으면 빠져나갑니다. 성공할수록 다음 표적이 강해집니다.</p>
      <p><b>4. 배치</b> — 유닛을 누른 뒤 빈 칸을 누르면 이동합니다. 사거리가 짧은 유닛은 바깥쪽, 포병·의무는 안쪽이 유리합니다.</p>
      <p><b>작전 지역</b> — 10단계마다 다음 지역으로 이동합니다. 지역마다 맵 모양과 배경이 다르고, 마지막 단계에 그 지역의 보스가 나옵니다. 보스마다 특수 능력이 다릅니다(기절, 화염, 증원, 회피 등). 유닛은 그대로 따라갑니다.</p>
      <p><b>패배</b> — 전장의 적이 ${C.CFG.enemyLimit}명을 넘거나, 보스를 ${C.CFG.bossTime}초 안에 잡지 못하면 패배합니다.</p>
      ${CLASS_IDS.map(c => `<p><span class="chip" style="background:${CLASS_INFO[c].color};color:#111">${CLASS_INFO[c].short}</span> ${CLASS_INFO[c].role}</p>`).join('')}
      </div><button class="wide sec" data-act="${g ? 'menu' : 'title'}">뒤로</button>`);
  },
  // 선택 소집: 보급품을 써서 원하는 기본 병과를 고른다
  pick() {
    const b = g.branch, sc = C.summonCost(b, g.camp);
    show(`<h2>선택 소집</h2><p class="sub">보급품 ${C.CFG.pickSupply}개 + 군자금 ${fmt(sc)} · 보유 보급품 ${g.supply}개</p>
      <div class="cards">${CLASS_IDS.map(c => `<button class="card" style="background:${CLASS_INFO[c].color};color:#10140e" data-act="pickc" data-arg="${c}">
        <b>${b.types[c][0]}</b><small>${CLASS_INFO[c].role}</small></button>`).join('')}</div>
      <button class="wide sec" data-act="resume">닫기</button>`);
  },
  pickc(c) { const u = C.summonPick(g, c); hide(); if (u) { toast(`${C.unitName(g.branch, u)} 소집`); Sound.play('summon'); } else { toast('보급품·군자금·빈 칸을 확인하세요'); Sound.play('deny'); } },
  // 병과 강화: 그 병과가 들어간 모든 유닛의 공격력이 오른다 (혼성 병과는 두 병과의 평균)
  upg() {
    const b = g.branch;
    show(`<h2>병과 강화</h2><p class="sub">단계마다 그 병과 공격력 +${Math.round(C.CFG.upStep * 100)}% · 군자금 ${fmt(g.gold)}</p>
      ${CLASS_IDS.map(c => { const cost = C.classUpCost(g, c); return `<div class="up"><div><span class="chip" style="background:${CLASS_INFO[c].color};color:#111">${CLASS_INFO[c].short}</span>
        <b>${b.types[c][0]} Lv${g.up[c]}</b> · 공격력 +${Math.round(g.up[c] * C.CFG.upStep * 100)}%</div>
        <button data-act="upc" data-arg="${c}" ${g.gold < cost ? 'disabled' : ''}>${fmt(cost)}</button></div>`; }).join('')}
      <button class="wide" data-act="resume">전장으로</button>`);
  },
  upc(c) { if (C.upgradeClass(g, c)) Sound.play('camp'); ACT.upg(); },
  missions() {
    show(`<h2>임무</h2><p class="sub">조건을 채우면 자동으로 완수되고 보급품을 받습니다</p><div class="list">
      ${C.missionList(g).map(m => `<p>${g.done[m.id] ? '✅' : '⬜'} ${g.done[m.id] ? `<s>${m.text(g)}</s>` : `<b>${m.text(g)}</b>`} · 보급품 +${m.sup}</p>`).join('')}
      <p>⭐ 보스 격파 · 보급품 +${C.CFG.bossSupply} / 특수 임무 성공 · 보급품 +${C.CFG.eliteSupply} (횟수 제한 없음)</p></div>
      <button class="wide" data-act="resume">전장으로</button>`);
  },
  menu() {
    show(`<h2>일시정지</h2><button class="wide" data-act="resume">계속하기</button>
      <button class="wide sec" data-act="codex">조합 도감</button><button class="wide sec" data-act="help">게임 방법</button>
      <button class="wide sec" data-act="mute" data-arg="menu">소리: ${meta.mute ? '꺼짐' : '켜짐'}</button>
      <button class="wide sec" data-act="quit">포기하고 나가기</button>`);
  },
  codex() {
    const b = g.branch, name = k => b.types[k][0], key = (a, c) => C.typeKey(C.combineTypes([a, a], [c, c]));
    show(`<h2>${b.name} 조합 도감</h2>
      <table><tr><th>+</th>${CLASS_IDS.map(c => `<th>${name(c)}</th>`).join('')}</tr>
      ${CLASS_IDS.map(a => `<tr><th>${name(a)}</th>${CLASS_IDS.map(c => `<td>${name(key(a, c))}</td>`).join('')}</tr>`).join('')}</table>
      <div class="list" style="margin-top:10px">
      <p>같은 계급 두 유닛을 합치면 한 계급 위가 됩니다. 재료의 병과 4칸을 세어 <b>3칸 이상이면 그 병과</b>, 아니면 <b>가장 많은 두 병과의 혼성</b>이 됩니다. 동률이면 먼저 고른 유닛의 병과가 우선합니다.</p></div>
      <h2>병과 · 병기</h2><table><tr><th>병과</th><th>${b.ranks[0]}~</th><th>${b.ranks[b.tiers[0]]}~</th><th>${b.ranks[b.tiers[1]]}~</th></tr>
      ${Object.entries(b.types).map(([k, [n, w]]) => `<tr><th>${n}<br><small>${k.split('+').map(c => CLASS_INFO[c].short).join('·')}</small></th>${w.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table>
      <h2>계급</h2><div class="chips">${b.ranks.map((r, i) => `<span class="chip">Lv${i + 1} ${r}</span>`).join('')}</div>
      ${b.hidden.length ? `<h2>히든 계급</h2><div class="list">${b.hidden.map(h => meta.found[h.id]
        ? `<p><b>${h.name}</b> (${b.ranks[h.level]}급) — ${h.text}<br><small>${h.how}</small></p>`
        : `<p><b>???</b> — 아직 발견하지 못했습니다<br><small>${h.recipe ? '어떤 조합에서 나타납니다' : '신병 소집에서 드물게 나타납니다'}</small></p>`).join('')}
        <p><small>히든 계급을 조합 재료로 쓰면 일반 계급으로 진급하고 능력은 사라집니다.</small></p></div>` : ''}
      <button class="wide" data-act="resume">전장으로</button>`);
  },
  result() {
    const medals = C.medalsFor(g), b = g.branch;
    meta.medals += medals; meta.best[b.id] = Math.max(meta.best[b.id] || 0, g.over.win ? 100 : g.wave - 1); saveMeta();
    Sound.play(g.over.win ? 'win' : 'lose');
    show(`<h1>${g.over.win ? '승리' : '패배'}</h1><p class="sub">${g.over.reason}</p>
      <div class="list"><p><b>${b.name}</b> · 도달 ${g.wave}단계 · 처치 ${g.kills}</p><p>획득 훈장 <b>+${medals}</b> (보유 ${meta.medals})</p></div>
      <button class="wide" data-act="start" data-arg="${b.id}">다시 도전</button>
      <button class="wide sec" data-act="upgrades">영구 강화</button><button class="wide sec" data-act="quit">처음으로</button>`);
    g.reported = true;
  },
};

// ── 전장 입력 ───────────────────────────────────────────
canvas.addEventListener('pointerdown', e => {
  if (!g || g.over) return;
  const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * C.FIELD.w / r.width, y = (e.clientY - r.top) * C.FIELD.h / r.height;
  const i = g.map.slots.findIndex(s => Math.abs(s.x - x) <= C.CELL.w / 2 && Math.abs(s.y - y) <= C.CELL.h / 2);
  if (i < 0) { ui.sel = ui.target = null; return; }
  if (ui.sel == null || !g.units[ui.sel]) { ui.sel = g.units[i] ? i : null; ui.target = null; return; }
  if (i === ui.sel) { ui.sel = ui.target = null; return; }
  if (!g.units[i]) { C.moveUnit(g, ui.sel, i); ui.sel = i; ui.target = null; return; }
  if (C.canMerge(g, ui.sel, i)) { ui.target = i; return; }
  ui.sel = i; ui.target = null;
});
function found(u) { if (u.hidden && !meta.found[u.hidden]) { meta.found[u.hidden] = 1; saveMeta(); } }
function doMerge() {
  const u = C.merge(g, ui.sel, ui.target); if (!u) return;
  toast(u.hidden ? `히든 조합! ${C.unitName(g.branch, u)} 등장` : `${C.unitName(g.branch, u)} 진급!`); found(u); Sound.play(u.hidden ? 'hidden' : 'merge'); ui.sel = u.slot; ui.target = null;
}
$('info').addEventListener('click', e => {
  const a = e.target.dataset.do; if (!a || !g) return;
  if (a === 'merge') doMerge();
  if (a === 'cancel') ui.target = null;
  if (a === 'gamble') { const r = C.gamble(g, ui.sel); infoKey = '';
    if (r === 'up') { toast(`진급 심사 통과! ${C.unitName(g.branch, g.units[ui.sel])}`); Sound.play('merge'); }
    else if (r === 'down') { toast(`심사 탈락 — ${C.unitName(g.branch, g.units[ui.sel])}(으)로 강등`); Sound.play('deny'); }
    else if (r === 'same') { toast('심사 보류 — 변화 없음'); Sound.play('sell'); } }
  if (a === 'sell') { const v = C.sell(g, ui.sel); ui.sel = ui.target = null; toast(`전역 처리 +${fmt(v)}`); Sound.play('sell'); }
});
$('b-summon').onclick = () => { if (!g) return; const u = C.summon(g);
  if (!u) { toast(g.units.includes(null) ? '군자금이 부족합니다' : '배치할 칸이 없습니다 — 조합하세요'); Sound.play('deny'); }
  else if (u.hidden) { toast(`히든 계급! ${C.unitName(g.branch, u)} 소집`); found(u); Sound.play('hidden'); }
  else { if (u.level > g.camp) toast(`행운! ${C.unitName(g.branch, u)} 소집`); Sound.play('summon'); } };
$('b-camp').onclick = () => { if (g && C.upgradeCamp(g)) { toast(`훈련소 Lv${g.camp + 1} — ${g.branch.ranks[g.camp]}부터 소집`); Sound.play('camp'); } };
$('b-codex').onclick = () => g && ACT.codex();
$('b-pick').onclick = () => g && ACT.pick();
$('b-up').onclick = () => g && ACT.upg();
$('b-mission').onclick = () => g && ACT.missions();
$('b-elite').onclick = () => { if (g && C.callElite(g)) { toast(`특수 임무 — ${C.CFG.eliteTime}초 안에 정예 표적을 격파하라`); Sound.play('boss'); } };
$('b-menu').onclick = () => g && ACT.menu();
$('b-speed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('b-speed').textContent = '×' + speed; };
document.addEventListener('visibilitychange', () => { if (document.hidden && g && !g.over && !paused) ACT.menu(); });

// ── 표시 갱신 ───────────────────────────────────────────
function statLine(st) {
  const xs = [`공격 ${fmt(st.dmg)}`, `초당 ${(1 / st.cd).toFixed(1)}회`, `사거리 ${Math.round(st.range)}`];
  if (st.splash) xs.push(`광역 ${Math.round(st.splash)}`); if (st.slow) xs.push(`둔화 ${Math.round(st.slow * 100)}%`);
  if (st.vuln) xs.push(`취약 +${Math.round(st.vuln * 100)}%`); if (st.haste) xs.push(`주변 공속 +${Math.round(st.haste * 100)}%`);
  if (st.crit) xs.push(`치명 ${Math.round(st.crit * 100)}%`); return xs.join(' · ');
}
function renderInfo() {
  const b = g.branch, A = ui.sel != null ? g.units[ui.sel] : null, B = ui.target != null ? g.units[ui.target] : null;
  const key = [A && A.id, B && B.id, g.wave, g.supply, CLASS_IDS.map(c => g.up[c]).join('')].join('|'); if (key === infoKey) return; infoKey = key;
  const el = $('info');
  if (A && B) {
    const p = C.mergePreview(g, ui.sel, ui.target), nu = { level: p.level, type: p.type, hidden: p.hidden }, h = C.hiddenDef(b, p.hidden);
    el.innerHTML = `<p class="pv">${C.unitName(b, A)} + ${C.unitName(b, B)}<br>→ <b>${C.unitName(b, nu)}</b> (${C.unitWeapon(b, nu)})</p>
      <p>${statLine(C.unitStats(b, p.level, p.type, meta, g.up))}</p>
      ${h ? `<p class="hint">★ 히든 조합 — ${h.text}</p>` : ''}${A.hidden || B.hidden ? '<p class="hint">⚠ 히든 계급의 능력은 조합하면 사라집니다</p>' : ''}
      <div class="row"><button class="ok" data-do="merge">조합</button><button class="no" data-do="cancel">취소</button></div>`;
  } else if (A) {
    const h = C.hiddenDef(b, A.hidden), up = [A.dmgUp && `공격력 +${Math.round(A.dmgUp * 100)}%`, A.rangeUp && `사거리 +${Math.round(A.rangeUp * 100)}%`].filter(Boolean);
    el.innerHTML = `<h3>${C.unitName(b, A)}<em>${h ? `히든 · ${b.ranks[A.level]}급` : `Lv${A.level + 1}`} · ${C.unitWeapon(b, A)}</em></h3><p>${statLine(A.stats)}</p>
      ${h ? `<p class="hint">★ ${h.text}</p>` : ''}${up.length ? `<p class="hint">히든 계급 지원: ${up.join(' · ')}</p>` : ''}
      <p class="hint">${A.level < C.maxLevel(b) ? '노란 테두리 유닛을 누르면 조합, 빈 칸을 누르면 이동' : '최고 계급입니다'}</p>
      <div class="row"><button class="gam" data-do="gamble" ${C.canGamble(g, ui.sel) ? '' : 'disabled'}>진급 심사 · 보급 ${C.CFG.gambleSupply}</button>
        <button class="sell" data-do="sell">전역(판매) +${fmt(C.unitValue(b, A.level) * C.CFG.sellRate)}</button></div>`;
  } else {
    const w = g.wave ? C.waveInfo(g.wave) : null;
    const nw = g.wave < C.CFG.maxWave ? C.waveInfo(g.wave + 1) : null;
    el.innerHTML = `<h3>${b.name}<em>${b.trait.text}</em></h3>
      <p class="hint">작전 지역 ${g.area + 1}/${C.AREAS.length} · ${C.AREAS[g.area].name}</p>
      <p class="hint">${(g.area + 1) * 10}단계 보스 ${C.AREAS[g.area].boss.name}: ${C.AREAS[g.area].boss.text}</p>
      <p>${w ? `${g.wave}단계 — ${w.name}` : '곧 적이 진입합니다. 신병을 소집해 방어선을 만드세요.'}</p>
      ${nw ? `<p>다음 ${g.wave + 1}단계 — ${nw.name} ${nw.count}기${nw.kind === 'boss' ? ` · ${C.CFG.bossTime}초 안에 격파` : ''}</p>` : ''}
      <p class="hint">유닛을 눌러 선택 → 같은 계급 유닛을 눌러 조합</p>`;
  }
}
function renderHud() {
  $('h-wave').textContent = `${g.wave}/${C.CFG.maxWave}`;
  $('h-next').textContent = g.wave >= C.CFG.maxWave ? '최종 단계' : `다음 ${Math.ceil(g.nextWave)}초`;
  $('h-sup').textContent = g.supply;
  $('h-enemy').textContent = `${g.enemies.length}/${C.CFG.enemyLimit}`;
  $('h-enemy').parentElement.classList.toggle('warn', g.enemies.length > C.CFG.enemyLimit * 0.7);
  $('h-gold').textContent = fmt(g.gold);
  const sc = C.summonCost(g.branch, g.camp), cc = C.campCost(g.branch, g.camp), maxed = g.camp >= C.maxCamp(g.branch);
  $('c-summon').textContent = `${g.branch.ranks[g.camp]}~ · ${fmt(sc)}`; $('b-summon').disabled = g.gold < sc;
  $('t-camp').textContent = `훈련소 Lv${g.camp + 1}`; $('c-camp').textContent = maxed ? '최대' : `강화 ${fmt(cc)}`;
  $('b-camp').disabled = maxed || g.gold < cc;
  $('c-pick').textContent = `보급 ${C.CFG.pickSupply}`; $('b-pick').disabled = g.supply < C.CFG.pickSupply || g.gold < sc || !g.units.includes(null);
  $('c-up').textContent = `합계 Lv${CLASS_IDS.reduce((n, c) => n + g.up[c], 0)}`;
  const es = C.eliteState(g), el = g.enemies.find(e => e.kind === 'elite');
  $('c-elite').textContent = es === 'ready' ? '출동 가능' : es === 'active' ? `진행 ${Math.ceil(el ? el.life : 0)}초` : es === 'cd' ? `대기 ${Math.ceil(g.elite.cd)}초` : '1단계부터';
  $('b-elite').disabled = es !== 'ready'; $('b-elite').classList.toggle('go', es === 'ready');
  const ms = C.missionList(g); $('c-mission').textContent = `${ms.filter(m => g.done[m.id]).length}/${ms.length}`;
}
function frame(now) {
  requestAnimationFrame(frame);
  if (!g) return;
  if (!paused && !g.over) {
    const real = Math.min(0.1, (now - last) / 1000);
    // 지역 이동 연출: 알림이 뜨는 동안 잠깐 멈췄다가(hold) 다시 진행한다
    if (ui.trans) { ui.trans.t -= real; if (ui.trans.t <= 0) ui.trans = null; }
    if (hold > 0) hold -= real;
    else { let dt = real * speed; while (dt > 0) { const d = Math.min(0.05, dt); C.step(g, d); dt -= d; } }
  }
  // 느린 기기 자동 조정: 프레임이 계속 밀리면 그리기 해상도를 한 단계씩 낮춘다
  if (!paused && !g.over && last) {
    frameMs += (Math.min(100, now - last) - frameMs) * 0.05;
    if (frameMs > 28) { slowT += now - last; if (slowT > 2500 && view.quality > 0) { view.setQuality(view.quality - 1); slowT = 0; frameMs = 16; } } else slowT = 0;
  }
  last = now;
  // 소리: 사격음은 프레임당 몇 개만, 웨이브 시작·보스 등장은 기록을 보고 낸다
  for (const s of g.sfx.splice(0)) Sound.play(s);
  for (; logAt < g.log.length; logAt++) { const l = g.log[logAt];
    if (l.t === 'wave') { Sound.play(l.wave % 10 === 0 ? 'boss' : 'wave'); if (l.wave % 10 === 0) toast(`보스 출현 — ${C.AREAS[g.area].boss.text}`, 3200); }
    else if (l.t === 'area') { ui.trans = { t: 2.6, total: 2.6, area: l.area }; hold = 1.3; ui.sel = ui.target = null; infoKey = '';
      for (const u of g.units) if (u) u.flash = 0.9; Sound.play('hidden'); }
    else if (l.t === 'mission') { toast(`임무 완수: ${l.text} · 보급품 +${l.sup}`); Sound.play('camp'); }
    else if (l.t === 'eliteKill') { toast(`특수 임무 성공! 보급품 +${C.CFG.eliteSupply}`); Sound.play('merge'); }
    else if (l.t === 'eliteFail') { toast('특수 임무 실패 — 표적이 빠져나갔습니다'); Sound.play('deny'); } }
  if (ui.sel != null && !g.units[ui.sel]) ui.sel = ui.target = null;
  const k = canvas.width / C.FIELD.w; ctx.setTransform(k, 0, 0, k, 0, 0);
  draw(ctx, g, ui, view.quality); renderHud(); renderInfo();
  if (g.over && !g.reported) ACT.result();
}
Sound.setMuted(meta.mute);
document.addEventListener('pointerdown', () => Sound.unlock(), { passive: true });
window.__srd = { get game() { return g; }, C, view };   // 자동 검사용
ACT.title(); requestAnimationFrame(frame);
try { localStorage.setItem('srd_boot_ok', localStorage.getItem('srd_live_build') || ''); } catch { /* 저장 불가 환경 */ }
// 자동 업데이트: 새 버전을 다 받으면, 아직 게임을 시작하지 않았을 때는 바로 다시 열고 아니면 다음 실행부터 적용한다
checkUpdate(() => { if (!g) location.reload(); else toast('새 버전을 받았습니다 — 다음 실행부터 적용됩니다'); })
  .then(() => { if (!g && overlay.classList.contains('on') && overlay.querySelector('h1')) ACT.title(); });
