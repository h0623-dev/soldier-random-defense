// 화면 · 입력 · 저장 연결
import { BRANCHES, CLASS_IDS, CLASS_INFO } from './data.js';
import * as C from './core.js';
import { draw } from './render.js';
import { Monetize } from './monetize.js';

const $ = id => document.getElementById(id);
const canvas = $('field'), ctx = canvas.getContext('2d'), overlay = $('overlay');
const SAVE_KEY = 'srd_meta_v1';
const UPGRADES = [
  { key: 'atk', name: '화력 증강', desc: '모든 유닛 공격력 +3%', max: 20 },
  { key: 'gold', name: '초기 보급', desc: '시작 군자금 +40', max: 10 },
  { key: 'bounty', name: '전리품', desc: '처치 보상 +3%', max: 20 },
];
let meta = loadMeta(), g = null, ui = { sel: null, target: null }, speed = 1, paused = true, last = 0, infoKey = '';

function loadMeta() {
  try { return { medals: 0, atk: 0, gold: 0, bounty: 0, best: {}, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; }
  catch { return { medals: 0, atk: 0, gold: 0, bounty: 0, best: {} }; }
}
const saveMeta = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch { /* 저장 불가 환경 */ } };
const fmt = n => { n = Math.floor(n); if (n < 1e4) return String(n);
  const u = ['만', '억', '조', '경']; let i = -1; while (n >= 1e4 && i < 3) { n /= 1e4; i++; } return (n >= 100 ? Math.floor(n) : n.toFixed(1)) + u[i]; };
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1400); }
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
      <p class="sub" style="margin-top:22px">v0.1.0 · 시제품</p>`);
  },
  branches() {
    show(`<h2>군별 선택</h2><div class="cards">${BRANCHES.map(b => `
      <button class="card" style="background:${b.color}" data-act="start" data-arg="${b.id}">
        <b>${b.name}</b><small>${b.trait.text}</small>
        <i>${b.ranks[0]} → ${b.ranks.at(-1)} (${b.ranks.length}계급) · 최고 ${meta.best[b.id] || 0}단계</i></button>`).join('')}</div>
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  start(id) {
    g = C.createGame({ branchId: id, meta }); ui = { sel: null, target: null }; infoKey = ''; speed = 1; $('b-speed').textContent = '×1';
    hide(); toast(`${g.branch.name} 출격! 신병을 소집하세요`);
  },
  resume() { hide(); },
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
      <p><b>1. 신병 소집</b> — 군자금으로 무작위 병과의 유닛을 뽑습니다. 가끔 한두 계급 높은 유닛이 나옵니다.</p>
      <p><b>2. 조합</b> — 유닛을 누른 뒤 <b>같은 계급</b>의 다른 유닛을 누르면 한 계급 위 유닛으로 진급합니다. 두 병과에 따라 결과 병과가 달라집니다.</p>
      <p><b>3. 훈련소 강화</b> — 소집되는 신병의 기본 계급이 올라갑니다.</p>
      <p><b>4. 배치</b> — 유닛을 누른 뒤 빈 칸을 누르면 이동합니다. 사거리가 짧은 유닛은 바깥쪽, 포병·의무는 안쪽이 유리합니다.</p>
      <p><b>패배</b> — 전장의 적이 ${C.CFG.enemyLimit}명을 넘거나, 보스를 ${C.CFG.bossTime}초 안에 잡지 못하면 패배합니다.</p>
      ${CLASS_IDS.map(c => `<p><span class="chip" style="background:${CLASS_INFO[c].color};color:#111">${CLASS_INFO[c].short}</span> ${CLASS_INFO[c].role}</p>`).join('')}
      </div><button class="wide sec" data-act="${g ? 'menu' : 'title'}">뒤로</button>`);
  },
  menu() {
    show(`<h2>일시정지</h2><button class="wide" data-act="resume">계속하기</button>
      <button class="wide sec" data-act="codex">조합 도감</button><button class="wide sec" data-act="help">게임 방법</button>
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
      <button class="wide" data-act="resume">전장으로</button>`);
  },
  result() {
    const medals = C.medalsFor(g), b = g.branch;
    meta.medals += medals; meta.best[b.id] = Math.max(meta.best[b.id] || 0, g.over.win ? 100 : g.wave - 1); saveMeta();
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
  const i = C.SLOTS.findIndex(s => Math.abs(s.x - x) <= 48 && Math.abs(s.y - y) <= 48);
  if (i < 0) { ui.sel = ui.target = null; return; }
  if (ui.sel == null || !g.units[ui.sel]) { ui.sel = g.units[i] ? i : null; ui.target = null; return; }
  if (i === ui.sel) { ui.sel = ui.target = null; return; }
  if (!g.units[i]) { C.moveUnit(g, ui.sel, i); ui.sel = i; ui.target = null; return; }
  if (C.canMerge(g, ui.sel, i)) { ui.target = i; return; }
  ui.sel = i; ui.target = null;
});
function doMerge() {
  const u = C.merge(g, ui.sel, ui.target); if (!u) return;
  toast(`${C.unitName(g.branch, u)} 진급!`); ui.sel = u.slot; ui.target = null;
}
$('info').addEventListener('click', e => {
  const a = e.target.dataset.do; if (!a || !g) return;
  if (a === 'merge') doMerge();
  if (a === 'cancel') ui.target = null;
  if (a === 'sell') { const v = C.sell(g, ui.sel); ui.sel = ui.target = null; toast(`전역 처리 +${fmt(v)}`); }
});
$('b-summon').onclick = () => { if (!g) return; const u = C.summon(g);
  if (!u) toast(g.units.includes(null) ? '군자금이 부족합니다' : '배치할 칸이 없습니다 — 조합하세요');
  else if (u.level > g.camp) toast(`행운! ${C.unitName(g.branch, u)} 소집`); };
$('b-camp').onclick = () => { if (g && C.upgradeCamp(g)) toast(`훈련소 Lv${g.camp + 1} — ${g.branch.ranks[g.camp]}부터 소집`); };
$('b-codex').onclick = () => g && ACT.codex();
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
  const key = [A && A.id, B && B.id, g.wave].join('|'); if (key === infoKey) return; infoKey = key;
  const el = $('info');
  if (A && B) {
    const p = C.mergePreview(g, ui.sel, ui.target), nu = { level: p.level, type: p.type };
    el.innerHTML = `<p class="pv">${C.unitName(b, A)} + ${C.unitName(b, B)}<br>→ <b>${C.unitName(b, nu)}</b> (${C.unitWeapon(b, nu)})</p>
      <p>${statLine(C.unitStats(b, p.level, p.type, meta))}</p>
      <div class="row"><button class="ok" data-do="merge">조합</button><button class="no" data-do="cancel">취소</button></div>`;
  } else if (A) {
    el.innerHTML = `<h3>${C.unitName(b, A)}<em>Lv${A.level + 1} · ${C.unitWeapon(b, A)}</em></h3><p>${statLine(A.stats)}</p>
      <p class="hint">${A.level < C.maxLevel(b) ? '노란 테두리 유닛을 누르면 조합, 빈 칸을 누르면 이동' : '최고 계급입니다'}</p>
      <div class="row"><button class="sell" data-do="sell">전역(판매) +${fmt(C.unitValue(b, A.level) * C.CFG.sellRate)}</button></div>`;
  } else {
    const w = g.wave ? C.waveInfo(g.wave) : null;
    el.innerHTML = `<h3>${b.name}<em>${b.trait.text}</em></h3>
      <p>${w ? `${g.wave}단계 — ${w.name}` : '곧 적이 진입합니다. 신병을 소집해 방어선을 만드세요.'}</p>
      <p class="hint">유닛을 눌러 선택 → 같은 계급 유닛을 눌러 조합</p>`;
  }
}
function renderHud() {
  $('h-wave').textContent = `${g.wave}/${C.CFG.maxWave}`;
  $('h-next').textContent = g.wave >= C.CFG.maxWave ? '최종' : Math.ceil(g.nextWave) + '초';
  $('h-enemy').textContent = `${g.enemies.length}/${C.CFG.enemyLimit}`;
  $('h-enemy').parentElement.classList.toggle('warn', g.enemies.length > C.CFG.enemyLimit * 0.7);
  $('h-gold').textContent = fmt(g.gold);
  const sc = C.summonCost(g.branch, g.camp), cc = C.campCost(g.branch, g.camp), maxed = g.camp >= C.maxCamp(g.branch);
  $('c-summon').textContent = `${g.branch.ranks[g.camp]}~ · ${fmt(sc)}`; $('b-summon').disabled = g.gold < sc;
  $('t-camp').textContent = `훈련소 Lv${g.camp + 1}`; $('c-camp').textContent = maxed ? '최대' : `강화 ${fmt(cc)}`;
  $('b-camp').disabled = maxed || g.gold < cc;
}
function frame(now) {
  requestAnimationFrame(frame);
  if (!g) return;
  if (!paused && !g.over) {
    let dt = Math.min(0.1, (now - last) / 1000) * speed;
    while (dt > 0) { const d = Math.min(0.05, dt); C.step(g, d); dt -= d; }
  }
  last = now;
  if (ui.sel != null && !g.units[ui.sel]) ui.sel = ui.target = null;
  draw(ctx, g, ui); renderHud(); renderInfo();
  if (g.over && !g.reported) ACT.result();
}
window.__srd = { get game() { return g; }, C };   // 자동 검사용
ACT.title(); requestAnimationFrame(frame);
