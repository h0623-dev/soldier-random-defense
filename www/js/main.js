// 화면 · 입력 · 저장 연결
import { BRANCHES, CLASS_IDS, CLASS_INFO, GRADES, GROUP_OF_LEVEL, HEROES, COMMENDS, CM_NEED, cmVal } from './data.js';
import * as C from './core.js';
import * as M from './meta.js';
import { draw, areaColors, setSkin } from './render.js';
import { insigUrl, hasArt, unitArtName, loadBranchArt } from './sprites.js';
import { Ads, Store } from './monetize.js';
import { initLayout } from './layout.js';
import { Sound } from './sound.js';
import { checkUpdate, buildInfo } from './update.js';
import { ic, fillIcons } from './icons.js';

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

// 기기에 저장되는 값(훈장·영구 강화·기록·숙련도·표창·출석·일일 임무·뽑기판). 칸의 뜻과 규칙은 meta.js
function loadMeta() { try { return M.fillMeta(JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch { return M.fillMeta({}); } }
const today = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };      // 기기 시계 기준 오늘 날짜
const rnd = Math.random;
// 스킨(도색): 전장의 내 유닛 그림과 카드의 초상에 같은 색 필터를 입힌다
function applySkin() { const f = M.skinOf(meta).filter; setSkin(f); document.documentElement.style.setProperty('--skin', f || 'none'); }
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// 훈장 · 티켓 · 보석 · 행동력을 한 줄로 (본부·상점 위쪽)
const resBar = () => { const now = Date.now(), en = M.energyNow(meta, now), w = M.energyWait(meta, now);
  return `<div class="res"><div class="pill en">${ic('bolt')}<b>${en}/${M.ENERGY.max}</b>${w ? `<small id="en-t">${mmss(w)}</small>` : ''}</div><div class="pill">${ic('gem')}<b>${meta.gems}</b></div><div class="pill">${ic('medal')}<b>${meta.medals}</b></div><div class="pill">${ic('ticket')}<b>${meta.tickets}</b></div></div>`; };
setInterval(() => { const el = document.getElementById('en-t'); if (!el) return; const w = M.energyWait(meta, Date.now()); if (w && M.energyNow(meta, Date.now()) < M.ENERGY.max) el.textContent = mmss(w); else if (!g) ACT.title(); }, 1000);
// 보상형 광고를 보고, 끝까지 봤으면 then(보상 처리)을 부른다. 전투 중이면 그동안 멈춘다
async function watchAd(then) {
  if (!Ads.available()) { toast('지금은 광고를 불러올 수 없습니다'); return; }
  const was = paused; paused = true; const ok = await Ads.showRewarded(); paused = was; last = performance.now();
  if (ok) then(); else toast('광고를 끝까지 봐야 보상을 받습니다');
}
const curMode = () => (M.modeOpen(meta, meta.mode) ? meta.mode : 'normal');
const recText = (mode, n) => (mode === 'rush' ? `보스 ${n}/${C.AREAS.length}` : `최고 ${n}단계`);
// 난이도별 최고 기록: 보통은 meta.best, 그 위는 meta.bestD[난이도]. 위 난이도는 바로 아래 난이도에서 need 단계까지 가면 열린다
const bestOf = d => M.bestMap(meta, 'normal', d);
const diffOpen = d => d === 0 || Math.max(0, ...Object.values(bestOf(d - 1))) >= C.DIFFS[d].need;
// 진행 중인 게임 저장: 단계가 시작될 때, 앱이 뒤로 갈 때, 저장하고 나갈 때. 끝난 게임은 지운다
const RUN_KEY = 'srd_run';
function saveRun() { try { const o = C.saveGame(g); if (o) localStorage.setItem(RUN_KEY, JSON.stringify(o)); } catch { /* 저장 불가 환경 */ } }
function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch { /* 저장 불가 환경 */ } }
function peekRun() { try { const o = JSON.parse(localStorage.getItem(RUN_KEY) || 'null'); const b = o && BRANCHES.find(x => x.id === o.branchId);
  return b && o.wave >= 0 ? { o, name: b.name, wave: o.wave, diff: C.DIFFS[o.diff] ? o.diff : 0, mode: o.mode || 'normal' } : null; } catch { return null; } }
const runLabel = run => `${run.name} ${run.mode === 'rush' ? `보스 ${run.wave}/${C.AREAS.length}` : run.wave + '단계'}${run.mode !== 'normal' ? ' · ' + C.MODES.find(m => m.id === run.mode).name : ''}${run.diff ? ' · ' + C.DIFFS[run.diff].name : ''}`;
const saveMeta = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch { /* 저장 불가 환경 */ } };
// 빌드 번호(커밋 시각, 초)를 '11.19 21:08 빌드'처럼 읽기 쉽게
const buildLabel = b => { const d = new Date(b * 1000), z = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())} 빌드`; };
const fmt = n => { n = Math.floor(n); if (n < 1e4) return String(n);
  const u = ['만', '억', '조', '경']; let i = -1; while (n >= 1e4 && i < 3) { n /= 1e4; i++; } return (n >= 100 ? Math.floor(n) : n.toFixed(1)) + u[i]; };
let toastT, toastHold = 0;
// hold = true면 중요한 알림(용사 탄생, 히든 임무): 잠깐 동안은 다른 알림이 덮지 못하고 뒤에 이어서 뜬다
function toast(msg, ms = 1400, hold = false) {
  const now = performance.now();
  if (!hold && now < toastHold) { setTimeout(() => toast(msg, ms), toastHold - now + 60); return; }
  if (hold) toastHold = now + Math.min(ms, 2400);
  const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}
// 겹쳐 뜨는 화면. sheet=true면 아래에서 올라오는 시트로 뜨고 게임은 멈추지 않는다(전장이 계속 보인다)
function show(html, sheet = false, cls = '') {
  overlay.innerHTML = `<div class="panel ${cls}">${sheet ? '<div class="grab"></div>' : ''}${html}</div>`;
  if (!sheet) $('toast').classList.remove('on');      // 전체 화면(처음 화면·결과 등)을 띄울 때는 전투 중 알림을 치운다
  overlay.classList.add('on'); overlay.classList.toggle('sheet', sheet); overlay.scrollTop = 0; if (!sheet) paused = true;
}
const BOARD_LABEL = { big: ['특등', '표창 3장'], cm: ['표창', '1장'], m3: ['훈장', '3개'], m1: ['훈장', '1개'], xp: ['교본', '경험치'] };
const sheetHead = (title, sub) => `<div class="sh"><div><b>${title}</b><small>${sub}</small></div><button class="hbtn" data-act="resume" aria-label="닫기">${ic('x')}</button></div>`;
const unitSrc = (b, type, grp = 0) => `img/${unitArtName(b.id, C.sortType(type), grp)}.webp`;     // 계급대에 맞는 그림이 있으면 그 그림
function hide() { overlay.classList.remove('on', 'sheet'); paused = false; last = performance.now(); }
overlay.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) ACT[b.dataset.act](b.dataset.arg, b);
  else if (e.target === overlay && overlay.classList.contains('sheet')) hide(); });   // 시트 바깥(어두운 부분)을 누르면 닫힌다

// 게임에 들어갈 때(새로 출격·이어하기) 화면 쪽 상태를 처음으로 돌린다
function enter() { logAt = g.log.length; ui = { sel: null, target: null, trans: { t: 2.2, total: 2.2, area: g.area } }; infoKey = ''; speed = 1; $('b-speed').textContent = '×1'; $('app').classList.remove('sel'); }

// ── 화면 ────────────────────────────────────────────────
const ACT = {
  title() {      // 처음 화면: 일러스트(img/title.webp) 위에 제목, 아래에 메뉴
    // 작전 본부: 출격 · 오늘의 임무(출석, 일일 임무 3개) · 전투 밖 성장(표창·숙련도·뽑기판·영구 강화) · 기록
    const run = peekRun(), day = today(), can = M.canAttend(meta, day), ar = M.ATTEND[M.attendDay(meta)], ds = M.dailyState(meta, day), dr = M.DAILY_REWARD;
    const dot = on => (on ? '<i class="dot"></i>' : '');
    show(`<div class="tart"><div class="tlogo"><h1>군인 랜덤 디펜스</h1><p>계급을 올리고 병과를 조합해 100단계를 방어하라</p></div></div>
      <div class="tmenu">
        ${resBar()}
        ${run ? `<button class="wide cont" data-act="cont">${ic('play')}이어하기 <small>${runLabel(run)}</small></button>` : ''}
        <button class="wide${run ? ' sec' : ''}" data-act="branches">${ic('play')}${run ? '새로 출격' : '출격'}</button>
        <div class="hq">
          <div class="hqr${can ? ' can' : ' got'}"><span><b>출석 ${can ? `${meta.att.n % M.ATTEND.length + 1}일차` : '완료'}</b>${can ? M.rewardText(ar) : `다음 보상 · ${M.rewardText(ar)}`}</span><button class="btn gold" data-act="attend" ${can ? '' : 'disabled'}>${can ? '받기' : '내일'}</button></div>
          ${ds.map(m => `<div class="hqr${m.got ? ' got' : m.done ? ' can' : ''}"><span><b>일일</b>${m.text} <em>${m.cur}/${m.need}</em></span><button class="btn gold" data-act="dclaim" data-arg="${m.id}" ${m.done && !m.got ? '' : 'disabled'}>${m.got ? '완료' : `${ic('ticket')}${dr.t} ${ic('medal')}${dr.m}`}</button></div>`).join('')}
        </div>
        <div class="tgrid">
          <button class="wide sec" data-act="commend">${ic('star')}부대 표창${dot(meta.medals >= M.CM_BOX)}</button>
          <button class="wide sec" data-act="mastery">${ic('up')}병과 숙련도</button>
          <button class="wide sec" data-act="board">${ic('ticket')}보급 뽑기판${dot(meta.tickets > 0)}</button>
          <button class="wide sec" data-act="upgrades">${ic('medal')}영구 강화</button>
          <button class="wide sec" data-act="records">${ic('flag')}기록</button>
          <button class="wide sec" data-act="help">${ic('help')}게임 방법</button>
          <button class="wide sec" data-act="shop">${ic('shop')}보급 상점${dot(M.adLeft(meta, day, 'gem') > 0)}</button>
          <button class="wide sec" data-act="mute" data-arg="title">${ic('sound')}소리 ${meta.mute ? '꺼짐' : '켜짐'}</button>
        </div>
        <p class="sub ver">v${buildInfo.version || '0.1.0'} · 시제품${buildInfo.live || buildInfo.bundled ? ` · ${buildLabel(buildInfo.live || buildInfo.bundled)}` : ''}</p>
      </div>`, false, 'title');
  },
  branches() {
    if (!diffOpen(meta.diff)) meta.diff = 0;
    const run = peekRun(), mode = curMode(), best = M.bestMap(meta, mode, meta.diff);
    show(`<h2>작전</h2><div class="diffs">${C.MODES.map(m => { const open = M.modeOpen(meta, m.id); return `<button class="${m.id === mode ? 'on' : ''}" data-act="mode" data-arg="${m.id}" ${open ? '' : 'disabled'}>
        <b>${m.name}</b><small>${open ? m.text : `${m.need}단계 도달 시 열림`}</small></button>`; }).join('')}</div>
      <h2>난이도</h2><div class="diffs">${C.DIFFS.map((d, i) => `<button class="${i === meta.diff ? 'on' : ''}" data-act="diff" data-arg="${i}" ${diffOpen(i) ? '' : 'disabled'}>
        <b>${d.name}</b><small>${diffOpen(i) ? d.text : `${C.DIFFS[i - 1].name} ${d.need}단계 도달 시 열림`}</small></button>`).join('')}</div>
      <h2>군별 선택</h2><div class="cards">${BRANCHES.map(b => `
      <button class="bcard" style="background:${b.color}" data-act="start" data-arg="${b.id}">
        <img src="img/units/${b.id}_inf.webp" alt=""><span><b>${b.name}</b><small>${b.trait.text.split(' (')[0]}</small>
        <i>${b.ranks[0]} → ${b.ranks.at(-1)} · ${recText(mode, best[b.id] || 0)}</i></span></button>`).join('')}</div>
      ${run ? `<p class="sub" style="margin-top:1.4rem">새로 출격하면 이어하던 게임(${runLabel(run)})은 사라집니다</p>` : ''}
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  diff(i) { if (diffOpen(+i)) { meta.diff = +i; saveMeta(); } ACT.branches(); },
  mode(id) { if (M.modeOpen(meta, id)) { meta.mode = id; saveMeta(); } ACT.branches(); },
  start(id) {
    if (!M.spendEnergy(meta, Date.now())) return ACT.noenergy();      // 한 판에 행동력 1 (이어하기는 들지 않는다)
    saveMeta(); loadBranchArt(id); clearRun();
    g = C.createGame({ branchId: id, meta, diff: diffOpen(meta.diff) ? meta.diff : 0, mode: curMode() }); enter();
    hide(); toast(g.mode === 'rush' ? `보스 러시 — ${C.CFG.rushPrep}초 뒤 첫 보스가 옵니다. 받은 군자금으로 부대를 꾸리세요` : `${g.branch.name} 출격! 신병을 소집하세요`, g.mode === 'rush' ? 3200 : 1400);
  },
  cont() {      // 저장해 둔 게임 이어하기
    const run = peekRun(), loaded = run && C.loadGame(run.o, meta);
    if (!loaded) { clearRun(); toast('저장된 게임을 불러오지 못했습니다'); return ACT.title(); }
    g = loaded; loadBranchArt(g.branch.id); enter(); ui.trans = null;
    hide(); toast(`${runLabel(run)} — 이어서 합니다`);
  },
  resume() { hide(); },
  mute(back) { meta.mute = !meta.mute; saveMeta(); Sound.setMuted(meta.mute); if (!meta.mute) Sound.play('summon'); ACT[back](); },
  quit() { g = null; $('app').classList.remove('sel'); ACT.title(); },
  leave() { saveRun(); ACT.quit(); },                                             // 저장하고 나가기 → 처음 화면의 '이어하기'로 돌아올 수 있다
  giveup() { g.over = { win: false, reason: '작전을 포기했습니다' }; hide(); },   // 포기 → 지금까지의 기록으로 결과 화면
  // ── 작전 본부의 화면들 ──
  attend() { const r = M.attend(meta, today(), rnd); if (r) { saveMeta(); Sound.play('camp'); ACT.title(); toast(`출석 보상 — ${M.rewardText(r.reward)}${r.cms.length ? ` (${r.cms.map(c => c.name).join(', ')})` : ''}`, 2600); } },
  dclaim(id) { const r = M.dailyClaim(meta, today(), id, rnd); if (r) { saveMeta(); Sound.play('camp'); ACT.title(); toast(`일일 임무 보상 — ${M.rewardText(r)}`, 2200); } },
  // 병과 숙련도: 군별마다 10개 병과. 판이 끝나면 그 판에서 준 피해 비율대로 경험치가 쌓인다
  mastery(id) {
    const b = BRANCHES.find(x => x.id === id) || BRANCHES.find(x => x.id === meta.lastBranch) || BRANCHES[0], mine = meta.xp[b.id] || {}, pct = Math.round(C.MASTERY.step * 100);
    show(`<h2>병과 숙련도</h2><p class="sub">판이 끝나면 그 판에서 싸운 병과에 경험치가 쌓입니다(준 피해 비율대로). 숙련 한 단계마다 그 병과 공격력 +${pct}% · 최고 ${C.MASTERY.max}단계</p>
      <div class="tabs">${BRANCHES.map(x => `<button class="${x.id === b.id ? 'on' : ''}" data-act="mastery" data-arg="${x.id}">${x.name}</button>`).join('')}</div>
      ${C.TYPE_KEYS.map(k => { const i = C.masteryInfo(mine[k] || 0), top = i.level >= C.MASTERY.max; return `<div class="up"><img src="img/units/${b.id}_${k.replace('+', '-')}.webp" alt="">
        <div><b>${b.types[k][0]} <em>${top ? '최고 단계' : `${i.level}단계`}</em></b><span class="xbar"><u style="width:${top ? 100 : Math.round(i.cur / i.need * 100)}%"></u></span>
          공격력 +${i.level * pct}%${top ? '' : ` · 다음 단계까지 ${i.need - i.cur}`}</div></div>`; }).join('')}
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  // 부대 표창: 모든 판에 적용되는 영구 효과. 같은 표창을 모으면 단계가 오른다
  commend(msg) {
    const sum = Object.values(meta.cmN).reduce((a, n) => a + n, 0);
    show(`<h2>부대 표창</h2><p class="sub">모든 판에 적용되는 영구 효과입니다. 같은 표창을 모으면 단계가 오릅니다(${CM_NEED.join('·')}장). 표창 상자 · 뽑기판 · 출석으로 얻습니다 · 모은 표창 ${sum}장</p>
      <div class="up cmbox"><div><b>표창 상자</b><br>아직 최고 단계가 아닌 표창 가운데 무작위 1장</div><button class="btn gold" data-act="cmbox" ${meta.medals < M.CM_BOX ? 'disabled' : ''}>${ic('medal')}${M.CM_BOX}</button></div>
      <p class="note cmmsg">${msg || `보유 훈장 ${meta.medals}개`}</p>
      ${COMMENDS.map(c => { const n = meta.cmN[c.id] || 0, lv = M.cmLevel(n), nx = M.cmNext(n); return `<div class="up cm${lv ? '' : ' off'}"><div><b>${c.name} <em>${lv ? `${lv}단계` : '없음'}</em></b>
        <span class="pips">${CM_NEED.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>${c.text(cmVal(c, Math.max(1, lv)))}${lv ? '' : ' (1단계)'}
        <small>${nx ? `${n}/${nx}장${lv && lv < CM_NEED.length ? ` · 다음 단계: ${c.text(cmVal(c, lv + 1))}` : ''}` : '최고 단계'}</small></div></div>`; }).join('')}
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  cmbox() { const c = M.buyCmBox(meta, rnd); if (!c) { Sound.play('deny'); return; } saveMeta(); Sound.play('merge');
    ACT.commend(`★ <b>${c.name}</b> 획득 — ${M.cmLevel(meta.cmN[c.id])}단계 (${meta.cmN[c.id]}장) · 보유 훈장 ${meta.medals}개`); },
  // 보급 뽑기판: 티켓 한 장으로 한 칸. 특등을 찾거나 다 뒤집으면 새 판
  board(msg) {
    if (!meta.board) { meta.board = M.newBoard(rnd); saveMeta(); }
    const bd = meta.board, done = M.boardDone(bd), left = k => bd.cells.filter(c => c.r === k && !c.open).length;
    show(`<h2>보급 뽑기판</h2><p class="sub">티켓 한 장으로 한 칸을 뒤집습니다. <b>특등</b>을 찾으면 새 판을 깔 수 있습니다. 티켓은 판을 마치거나(20단계마다 1장, 최대 5장) 일일 임무 · 출석으로 얻습니다</p>
      <div class="res"><div class="pill">${ic('ticket')}<b>${meta.tickets}</b></div><div class="pill">누적 보상 <b>${meta.flips % M.BOARD_BONUS}/${M.BOARD_BONUS}</b></div></div>
      <div class="bgrid">${bd.cells.map((c, i) => (c.open ? `<div class="bc open ${c.r}"><b>${BOARD_LABEL[c.r][0]}</b><small>${BOARD_LABEL[c.r][1]}</small></div>`
        : `<button class="bc" data-act="flip" data-arg="${i}" ${meta.tickets < 1 || done ? 'disabled' : ''}>?</button>`)).join('')}</div>
      <p class="note cmmsg">${msg || (done ? '이 판은 끝났습니다 — 새 판을 까세요' : meta.tickets < 1 ? '티켓이 없습니다' : '뒤집을 칸을 고르세요')}</p>
      <p class="sub" style="margin:0">남은 칸 · 특등 ${left('big')} · 표창 ${left('cm')} · 훈장 3개 ${left('m3')} · 훈장 1개 ${left('m1')} · 숙련 교본 ${left('xp')}<br>${M.BOARD_BONUS}칸을 뒤집을 때마다 표창 1장을 더 받습니다</p>
      ${done ? `<button class="wide" data-act="newboard">새 판 깔기</button>` : ''}
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  flip(i) {
    const o = M.flip(meta, +i, rnd); if (!o) { Sound.play('deny'); return; }
    saveMeta(); Sound.play(o.kind === 'big' ? 'hidden' : o.cms.length || o.bonus ? 'merge' : 'camp');
    const xb = o.xp && BRANCHES.find(b => b.id === o.xp.branch);
    ACT.board(`${o.kind === 'big' ? '★ 특등! ' : ''}${o.xp ? `숙련 교본 — ${xb.name} ${xb.types[o.xp.key][0]} 경험치 +${o.reward.x}` : M.rewardText(o.reward)}${o.cms.length ? ` (${o.cms.map(c => c.name).join(', ')})` : ''}${o.bonus ? ` · 누적 보상: ${o.bonus.name}` : ''}`);
  },
  newboard() { if (M.resetBoard(meta, rnd)) { saveMeta(); Sound.play('camp'); } ACT.board(); },
  // 기록: 군별 × (난이도 3 + 무한 작전 + 보스 러시)
  records() {
    const cols = [...C.DIFFS.map((d, i) => [d.name, M.bestMap(meta, 'normal', i), 100]), ['무한', meta.bestE, 0], ['보스', meta.bestR, C.AREAS.length]];
    show(`<h2>기록</h2><p class="sub">군별 최고 기록 · 마친 작전 ${meta.runs}회</p>
      <div class="rec"><div class="rh"><span></span>${cols.map(c => `<b>${c[0]}</b>`).join('')}</div>
      ${BRANCHES.map(b => `<div class="rr"><span style="background:${b.color}">${b.name}</span>${cols.map(c => { const v = c[1][b.id] || 0; return `<b class="${c[2] && v >= c[2] ? 'top' : v ? '' : 'none'}">${v || '-'}</b>`; }).join('')}</div>`).join('')}</div>
      <p class="sub" style="margin-top:1rem">보통 · 어려움 · 지옥 · 무한은 막아 낸 단계, 보스는 보스 러시에서 잡은 보스 수(10이 끝)</p>
      <div class="list"><p>조합 도감 발견: 히든 계급 ${['wonsa', 'junwi'].filter(k => meta.found[k]).length}/2 · 전설의 용사 ${HEROES.filter(h => meta.found[h.id]).length}/${HEROES.length} · 히든 임무 ${Object.keys(meta.foundM).length}/${C.MISSIONS.filter(m => m.hidden).length}</p></div>
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  upgrades() {
    show(`<h2>영구 강화</h2><p class="sub">보유 훈장 ${meta.medals}개 · 5단계마다 1개, 100단계 방어 시 +20개</p>
      ${UPGRADES.map(u => { const lv = meta[u.key], cost = 2 + lv * 2; return `<div class="up"><div><b>${u.name} <em>Lv${lv}/${u.max}</em></b><br>${u.desc}</div>
        <button class="btn gold" data-act="buy" data-arg="${u.key}" ${lv >= u.max || meta.medals < cost ? 'disabled' : ''}>${lv >= u.max ? '최대' : `${ic('medal')}${cost}`}</button></div>`; }).join('')}
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  buy(key) { const lv = meta[key], cost = 2 + lv * 2; if (meta.medals >= cost) { meta.medals -= cost; meta[key]++; saveMeta(); } ACT.upgrades(); },
  // 행동력이 없을 때
  noenergy() {
    const day = today(), left = M.adLeft(meta, day, 'energy'), it = M.GEM_SHOP.find(x => x.id === 'energy5');
    show(`<h2>행동력이 없습니다</h2><p class="sub">한 판에 행동력 1이 듭니다. 1시간에 1씩 차고 최대 ${M.ENERGY.max}까지 모입니다 · 다음 충전까지 <b id="en-t">${mmss(M.energyWait(meta, Date.now()))}</b></p>
      <div class="up"><div><b>광고 보고 행동력 1</b><br>오늘 ${left}회 남음${Ads.testing ? ' · 시험 광고' : ''}</div><button class="btn gold" data-act="ad" data-arg="energy" data-back="branches" ${left ? '' : 'disabled'}>${ic('play')}광고</button></div>
      <div class="up"><div><b>${it.name}</b><br>보유 보석 ${meta.gems}개</div><button class="btn gold" data-act="gembuy" data-arg="${it.id}" data-back="branches" ${meta.gems < it.cost ? 'disabled' : ''}>${ic('gem')}${it.cost}</button></div>
      <button class="wide sec" data-act="title">작전 본부로</button>`);
  },
  // 보급 상점: 무료 보상(광고) · 보석 충전(결제) · 보석으로 사는 것 · 고급 보급 상자(유료 뽑기) · 스킨
  shop(msg, keep) {
    const day = today(), y = overlay.scrollTop, odds = M.pullOdds(), b0 = BRANCHES.find(x => x.id === meta.lastBranch) || BRANCHES[0];
    const adRow = k => { const p = M.AD_PLACES[k], left = M.adLeft(meta, day, k); return `<div class="up"><div><b>${p.text}</b><br>오늘 ${left}/${p.limit}회 남음</div><button class="btn gold" data-act="ad" data-arg="${k}" ${left ? '' : 'disabled'}>${ic('play')}광고</button></div>`; };
    show(`<h2>보급 상점</h2>${resBar()}
      <p class="note cmmsg">${typeof msg === 'string' && msg ? msg : '광고를 보거나 보석으로 재화를 얻습니다'}</p>
      <h3>무료 보상 — 광고를 끝까지 보면 받습니다${Ads.testing ? ' (지금은 시험 광고)' : ''}</h3>
      ${['gem', 'energy', 'ticket'].map(adRow).join('')}
      <h3>보석 충전</h3>
      ${Store.products.map(p => `<div class="up"><div><b>${ic('gem')}${p.name}</b>${p.note ? ` <em>${p.note}</em>` : ''}</div><button class="btn" data-act="pay" data-arg="${p.id}" ${Store.ready || Store.dev ? '' : 'disabled'}>${Store.ready ? '구매' : Store.dev ? '시험 구매' : '출시 후 이용'}</button></div>`).join('')}
      ${Store.ready ? '' : '<p class="sub" style="margin:.2rem 0 0">결제는 스토어에 앱과 상품을 등록한 뒤에 연결됩니다</p>'}
      <h3>보석으로 사기</h3>
      ${M.GEM_SHOP.map(it => `<div class="up"><div><b>${it.name}</b></div><button class="btn gold" data-act="gembuy" data-arg="${it.id}" ${meta.gems < it.cost ? 'disabled' : ''}>${ic('gem')}${it.cost}</button></div>`).join('')}
      <h3>고급 보급 상자</h3>
      <div class="up cmbox"><div><b>1회 열기</b><br>표창 또는 스킨</div><button class="btn gold" data-act="pull" data-arg="1" ${meta.gems < M.PULL.cost ? 'disabled' : ''}>${ic('gem')}${M.PULL.cost}</button></div>
      <div class="up cmbox"><div><b>10회 열기</b><br>10% 할인</div><button class="btn gold" data-act="pull" data-arg="10" ${meta.gems < M.PULL.cost10 ? 'disabled' : ''}>${ic('gem')}${M.PULL.cost10}</button></div>
      <div class="list odds"><p><b>확률 정보</b></p>${odds.map(o => `<p>${o.name} — <b>${(o.p * 100).toFixed(1)}%</b>${o.each ? ` (종류마다 ${(o.each * 100).toFixed(2)}%)` : ''}</p>`).join('')}
        <p>이미 최고 단계인 표창이 나오면 훈장 ${M.PULL.dupMedals}개, 스킨을 모두 가졌으면 보석 ${M.PULL.dupGems}개로 바뀝니다.</p></div>
      <h3>스킨 — 내 유닛의 도색</h3>
      <div class="skins">${M.SKINS.map(k => { const own = M.skinOwned(meta, k.id), on = meta.skins.on === k.id;
        return `<div class="skin${on ? ' on' : ''}"><img src="img/units/${b0.id}_inf.webp" style="filter:${k.filter || 'none'}" alt=""><b>${k.name}</b>
          <button class="btn${own ? '' : ' gold'}" data-act="${own ? 'skinuse' : 'skinbuy'}" data-arg="${k.id}" ${on || (!own && meta.gems < k.cost) ? 'disabled' : ''}>${on ? '사용 중' : own ? '사용' : `${ic('gem')}${k.cost}`}</button></div>`; }).join('')}</div>
      <p class="sub" style="margin:.6rem 0 0">도색은 겉모습만 바꿉니다(능력은 같음). 고급 보급 상자에서도 나옵니다</p>
      <button class="wide sec" data-act="title">뒤로</button>`);
    if (keep === true) overlay.scrollTop = y;
  },
  ad(place, el) {
    const back = el && el.dataset.back;
    watchAd(() => { const r = M.adReward(meta, today(), place, Date.now()); saveMeta(); Sound.play('camp');
      if (back) { ACT[back](); toast(`광고 보상 — ${M.rewardText(r || {})}`, 2200); } else ACT.shop(r ? `광고 보상 — ${M.rewardText(r)}` : '오늘은 더 받을 수 없습니다', true); });
  },
  async pay(id) { const n = await Store.buy(id); if (n > 0) { meta.gems += n; saveMeta(); Sound.play('merge'); ACT.shop(`보석 ${n}개를 받았습니다${Store.dev ? ' (시험 구매)' : ''}`, true); } else toast('결제는 스토어 출시 후에 이용할 수 있습니다'); },
  gembuy(id, el) { const it = M.buyGem(meta, id, Date.now()); if (!it) { Sound.play('deny'); return; } saveMeta(); Sound.play('camp');
    if (el && el.dataset.back) { ACT[el.dataset.back](); toast(`${it.name} 구매`); } else ACT.shop(`${it.name} 구매`, true); },
  pull(n) { const rs = M.pull(meta, +n, rnd); if (!rs) { Sound.play('deny'); return; } saveMeta(); applySkin(); Sound.play(rs.some(r => r.kind === 'skin') ? 'hidden' : 'merge');
    ACT.shop(`${rs.some(r => r.kind === 'skin') ? '★ ' : ''}${rs.map(r => r.text).join(' / ')}`, true); },
  skinbuy(id) { if (M.buySkin(meta, id)) { M.useSkin(meta, id); saveMeta(); applySkin(); Sound.play('merge'); ACT.shop(`${M.skinOf(meta).name} 구매 — 바로 적용했습니다`, true); } else Sound.play('deny'); },
  skinuse(id) { if (M.useSkin(meta, id)) { saveMeta(); applySkin(); Sound.play('camp'); ACT.shop(`${M.skinOf(meta).name} 적용`, true); } },
  help() {
    show(`<h2>게임 방법</h2><div class="list">
      <p><b>1. 신병 소집</b> — 군자금으로 무작위 병과의 유닛을 뽑습니다. 빈 발판 가운데 무작위 자리에 배치됩니다. 가끔 한두 계급 높은 유닛이 나옵니다.</p>
      <p><b>2. 조합</b> — 유닛을 누른 뒤 <b>같은 등급(같은 색)</b>의 다른 유닛을 누르면 한 등급 위 유닛으로 진급합니다. 등급은 노말 · 매직 · 레어 · 영웅 · 유니크 · 전설 · 초월 7단계입니다. <b>같은 병과끼리</b> 조합하면 그 병과가 유지되고, <b>다른 병과끼리</b> 조합하면 병과가 무작위로 정해집니다.</p>
      <p><b>주둔지</b> — 전장 아래의 건물을 눌러 명령합니다. 왼쪽부터 <b>훈련소</b>(천막) · <b>병과 강화</b>(병기창) · <b>신병 소집</b>(연병장) · <b>보급창</b>(보급병 고용 · 선택 소집) · <b>특수 임무</b>(통신탑). 쓸 수 없는 건물은 흐리게 보이고, 특수 임무를 부를 수 있으면 통신탑이 빛납니다.</p>
      <p><b>3. 훈련소 강화</b> — 소집되는 신병의 기본 등급이 올라갑니다(최고 영웅). 그 위 등급은 조합으로만 올립니다.</p>
      <p><b>병과 고유 기술</b> — 다른 병과끼리 조합할 때 나오는 특수 병과 6종은 저마다 고유 기술이 있습니다(연속 포격, 응급 처치, 조준 사격, 오염, 표적 지정, 지휘 통신). 유닛을 누르면 카드에 적혀 있습니다.</p>
      <p><b>전설의 용사</b> — <b>${GRADES[4].name}</b> 등급의 <b>기본 병과</b> 둘(예: 보병 + 포병)을 조합하면 고유 기술을 가진 용사가 태어납니다. 여섯 가지 짝마다 다른 용사가 나오고, 종류마다 한 명뿐입니다. 용사에 ${GRADES[5].name} 등급 유닛을 조합하면 ${GRADES[6].name}로 <b>각성</b>합니다. 조합식은 조합 도감에 있습니다.</p>
      <p><b>히든 계급</b> — 정규 계급표에 없는 특수 계급이 있습니다. 특정 조합이나 소집 때 낮은 확률로 나타나며, 주변 아군을 강화합니다. 발견하면 조합 도감에 기록됩니다.</p>
      <p><b>보급품</b> — 보스 격파, 특수 임무, 임무 완수로 얻습니다. <b>선택 소집</b>(원하는 병과 고르기), <b>진급 심사</b>(유닛 선택 후 도전: 등급이 낮을수록 잘 붙고, 15%는 강등. 전설 등급부터는 받을 수 없음), <b>병과 교체</b>(유닛 선택 후: 등급은 그대로 두고 병과만 다시 뽑기)에 씁니다.</p>
      <p><b>특수 발판</b> — 지역마다 발판 ${C.CFG.tileCount}칸이 빛납니다. ${Object.values(C.TILES).map(t => `<b style="color:${t.color};-webkit-text-stroke:.03em #4a2f1b">${t.name}</b>(${t.text})`).join(' · ')}. 그 위에 선 유닛만 효과를 받으니 가장 강한 유닛을 올려 두세요. 다음 지역으로 넘어가면 자리가 바뀝니다.</p>
      <p><b>히든 임무</b> — 임무 창 아래쪽에 조건이 가려진 임무가 있습니다. 이것저것 시도하다 보면 달성되고, 한 번 달성한 임무는 다음 판부터 조건이 보입니다.</p>
      <p><b>보급병</b> — 보급창에서 군자금으로 고용합니다(최대 ${C.CFG.depotMax}명). 단계가 시작될 때마다 군자금을 가져오고, ${C.CFG.depotSupPer}명마다 ${C.CFG.depotSupEvery}단계에 한 번 보급품도 가져옵니다. 일찍 고용할수록 오래 받지만 그만큼 초반 전력이 줄어듭니다.</p>
      <p><b>병과 강화</b> — 군자금으로 한 병과의 공격력을 계속 올립니다. 주력 병과에 집중하세요.</p>
      <p><b>특수 임무</b> — 정예 표적을 직접 불러냅니다. ${C.CFG.eliteTime}초 안에 잡으면 큰 보상, 못 잡으면 빠져나갑니다. 성공할수록 다음 표적이 강해집니다.</p>
      <p><b>작전 본부</b> — 처음 화면입니다. <b>출석</b>과 <b>일일 임무</b>로 훈장·뽑기 티켓을 받고, <b>부대 표창</b>(모든 판에 적용되는 영구 효과), <b>병과 숙련도</b>(판을 마치면 싸운 병과에 경험치), <b>보급 뽑기판</b>(티켓으로 칸 뒤집기), <b>영구 강화</b>로 부대를 키웁니다.</p>
      <p><b>행동력</b> — 한 판을 시작할 때 1이 듭니다(이어하기는 들지 않음). 1시간에 1씩 차고 최대 ${M.ENERGY.max}까지 모입니다. 광고나 보석으로 더 받을 수 있습니다.</p>
      <p><b>보급 상점</b> — 광고를 끝까지 보면 보석·행동력·티켓을 받습니다(하루 횟수 제한). 보석으로 행동력·티켓·훈장·스킨을 사고 고급 보급 상자(표창·스킨)를 엽니다. 상자의 확률은 상점에 적혀 있습니다.</p>
      <p><b>작전 종류</b> — <b>기본 작전</b>(100단계) · <b>무한 작전</b>(100단계를 넘어 끝없이, ${C.MODES[1].need}단계 도달 시 열림) · <b>보스 러시</b>(보스 10종만 연달아, ${C.MODES[2].need}단계 도달 시 열림). 출격 화면에서 고릅니다.</p>
      <p><b>4. 배치</b> — 유닛을 누른 뒤 빈 칸을 누르면 이동합니다. 사거리가 짧은 유닛은 바깥쪽, 포병·의무는 안쪽이 유리합니다.</p>
      <p><b>작전 지역</b> — 10단계마다 다음 지역으로 이동합니다. 지역마다 맵 모양과 배경이 다르고, 마지막 단계에 그 지역의 보스가 나옵니다. 보스마다 특수 능력이 다릅니다(기절, 화염, 증원, 회피 등). 유닛은 그대로 따라갑니다.</p>
      <p><b>패배</b> — 전장의 적이 ${C.CFG.enemyLimit}명을 넘거나, 보스를 ${C.CFG.bossTime}초 안에 잡지 못하면 패배합니다.</p>
      ${CLASS_IDS.map(c => `<p><span class="chip" style="background:${CLASS_INFO[c].color};color:#111">${CLASS_INFO[c].short}</span> ${CLASS_INFO[c].role}</p>`).join('')}
      </div><button class="wide sec" data-act="${g ? 'menu' : 'title'}">뒤로</button>`);
  },
  // 보급창: 보급병 고용(단계마다 군자금이 들어오는 투자) + 선택 소집(보급품을 써서 원하는 기본 병과 고르기)
  pick() {
    const b = g.branch, sc = C.summonCost(b, g.camp, meta), can = g.supply >= C.CFG.pickSupply && g.gold >= sc && g.units.includes(null);
    const dc = C.depotCost(g), full = g.depot >= C.CFG.depotMax, inc = C.depotIncome(g), nextInc = C.depotIncome({ depot: g.depot + 1, wave: g.wave, mode: g.mode, meta }), sup = C.depotSupply(g);
    show(`${sheetHead('보급창', '보급병을 고용하면 단계마다 군자금이 들어옵니다')}
      <div class="up depot"><div><b>보급병 <em>${g.depot}/${C.CFG.depotMax}명</em></b>
        <span class="pips">${Array.from({ length: C.CFG.depotMax }, (_, i) => `<i class="${i < g.depot ? 'on' : ''}"></i>`).join('')}</span>
        ${g.depot ? `단계마다 ${ic('coin')}<b>+${fmt(inc)}</b>${sup ? ` · ${C.CFG.depotSupEvery}단계마다 ${ic('box')}<b>+${sup}</b>` : ''}` : '아직 고용한 보급병이 없습니다'}${full ? '' : ` → 고용하면 ${ic('coin')}<b>+${fmt(nextInc)}</b>`}
        <small>단계가 오를수록 수입도 늘어납니다 · 보급병 ${C.CFG.depotSupPer}명마다 ${C.CFG.depotSupEvery}단계에 보급품 1개${g.depotGold ? ` · 지금까지 ${fmt(g.depotGold)} 벌었습니다` : ''}</small></div>
        <button class="btn gold" data-act="hire" ${full || g.gold < dc ? 'disabled' : ''}>${full ? '최대' : `고용 ${ic('coin')}${fmt(dc)}`}</button></div>
      <div class="up"><div><b>지원 요청</b><br>광고를 보면 군자금 ${ic('coin')}<b>+${fmt(C.adSupportGold(g))}</b> · 판마다 한 번${Ads.testing ? ' · 시험 광고' : ''}</div><button class="btn gold" data-act="adgold" ${g.adGold ? 'disabled' : ''}>${g.adGold ? '받음' : `${ic('play')}광고`}</button></div>
      <h3 class="hmh">선택 소집 <small>원하는 병과를 골라 소집 · 보급품 ${C.CFG.pickSupply}개 + 군자금 ${fmt(sc)}</small></h3>
      <div class="cards">${CLASS_IDS.map(c => `<button class="bcard" style="background:${CLASS_INFO[c].color};color:#10140e" data-act="pickc" data-arg="${c}" ${can ? '' : 'disabled'}>
        <img src="${unitSrc(b, [c, c])}" alt=""><span><b>${b.types[c][0]}</b><small>${CLASS_INFO[c].role}</small></span></button>`).join('')}</div>
      <div class="sfoot"><div class="pill sup">${ic('box')}<b>${g.supply}</b></div><div class="pill gold">${ic('coin')}<b>${fmt(g.gold)}</b></div><button class="btn" data-act="resume">닫기</button></div>`, true);
  },
  adgold() { if (g.adGold) return; watchAd(() => { const v = C.adSupport(g); if (v) { toast(`지원 도착 — 군자금 +${fmt(v)}`); Sound.play('camp'); } if (overlay.classList.contains('sheet')) ACT.pick(); }); },
  hire() { if (C.hireDepot(g)) Sound.play('camp'); else Sound.play('deny'); ACT.pick(); },
  pickc(c) { const u = C.summonPick(g, c); hide(); if (u) { toast(`${C.unitName(g.branch, u)} 소집`); Sound.play('summon'); } else { toast('보급품·군자금·빈 칸을 확인하세요'); Sound.play('deny'); } },
  // 병과 강화: 그 병과가 들어간 모든 유닛의 공격력이 오른다 (혼성 병과는 두 병과의 평균)
  upg() {
    const b = g.branch, pct = Math.round(C.CFG.upStep * 100);
    show(`${sheetHead('병과 강화', '그 병과가 들어간 모든 유닛의 공격력이 오릅니다')}
      ${CLASS_IDS.map(c => { const cost = C.classUpCost(g, c), lv = g.up[c]; return `<div class="up"><img src="${unitSrc(b, [c, c])}" alt="">
        <div><b><span class="chip" style="background:${CLASS_INFO[c].color}">${CLASS_INFO[c].short}</span> ${b.types[c][0]} <em>Lv${lv}</em></b>
          <span class="pips">${Array.from({ length: 8 }, (_, i) => `<i class="${i < Math.min(lv, 8) ? 'on' : ''}"></i>`).join('')}</span>공격력 +${lv * pct}% → 다음 단계 +${pct}%</div>
        <button class="btn gold" data-act="upc" data-arg="${c}" ${g.gold < cost ? 'disabled' : ''}>${ic('coin')}${fmt(cost)}</button></div>`; }).join('')}
      <div class="sfoot"><div class="pill gold">${ic('coin')}<b>${fmt(g.gold)}</b></div><button class="btn primary" data-act="resume">전장으로</button></div>`, true);
  },
  upc(c) { if (C.upgradeClass(g, c)) Sound.play('camp'); else Sound.play('deny'); ACT.upg(); },
  missions() {
    const all = C.missionList(g), ms = all.filter(m => !m.hidden), hs = all.filter(m => m.hidden);
    const row = m => `<div class="msn${g.done[m.id] ? ' done' : ''}"><i class="ck">${g.done[m.id] ? '✓' : ''}</i><span>${m.text(g)}</span><div class="pill sup">${ic('box')}<b>+${m.sup}</b></div></div>`;
    // 히든 임무: 달성한 적이 없으면 조건을 가린다. 한 번이라도 달성했으면 다음 판부터는 조건이 보인다
    const hrow = m => (g.done[m.id] || meta.foundM[m.id] ? row(m).replace('class="msn', 'class="msn hm') : `<div class="msn hm lock"><i class="ck">?</i><span>??? — 아직 밝혀지지 않은 임무</span><div class="pill sup">${ic('box')}<b>+?</b></div></div>`);
    show(`${sheetHead('임무', `조건을 채우면 자동으로 완수되고 보급품을 받습니다 · ${ms.filter(m => g.done[m.id]).length}/${ms.length}`)}
      ${[...ms].sort((a, c) => !!g.done[a.id] - !!g.done[c.id]).map(row).join('')}
      <h3 class="hmh">히든 임무 <small>${hs.filter(m => g.done[m.id]).length}/${hs.length} · 조건이 숨겨져 있고 보상이 큽니다</small></h3>
      ${hs.map(hrow).join('')}
      <div class="list"><p>보스 격파 <b>+${C.CFG.bossSupply}</b> · 특수 임무 성공 <b>+${C.CFG.eliteSupply}</b> (횟수 제한 없음)</p></div>
      <div class="sfoot"><div class="pill sup">${ic('box')}<b>${g.supply}</b></div><button class="btn primary" data-act="resume">전장으로</button></div>`, true);
  },
  menu() {
    show(`${sheetHead('일시정지', `${g.branch.name} · ${g.wave}단계 · ${C.AREAS[g.area].name}`)}
      <button class="wide" data-act="resume">${ic('play')}계속하기</button>
      <button class="wide sec" data-act="missions">${ic('list')}임무</button><button class="wide sec" data-act="codex">${ic('book')}조합 도감</button><button class="wide sec" data-act="help">${ic('help')}게임 방법</button>
      <button class="wide sec" data-act="mute" data-arg="menu">${ic('sound')}소리: ${meta.mute ? '꺼짐' : '켜짐'}</button>
      <button class="wide sec" data-act="leave">${ic('exit')}저장하고 나가기</button>
      <button class="wide sec danger" data-act="giveup">포기하고 결과 보기</button>`, true); paused = true; saveRun();
  },
  // 조합 도감: 그림으로 보는 조합 결과 · 병과와 병기 · 계급장 · 히든 계급 · 지역 보스
  codex() {
    const b = g.branch, name = k => b.types[k][0];
    const uimg = (k, cls = 'ui') => `<img class="${cls}" src="img/units/${b.id}_${k.replace('+', '-')}.webp" alt="${name(k)}" onerror="this.style.visibility='hidden'">`;
    const chips = k => k.split('+').map(c => `<span class="chip" style="background:${CLASS_INFO[c].color};color:#111">${CLASS_INFO[c].short}</span>`).join('');
    const mixKeys = C.TYPE_KEYS.filter(k => k.includes('+'));
    const eimg = (file, n) => `<img class="ui" src="img/${file}.webp" alt="" ${n > 1 && file === 'enemy_boss' ? `style="filter:hue-rotate(${(n - 1) * 36}deg)"` : ''}>`;
    show(`<h2>${b.name} 조합 도감</h2>
      <p class="sub">같은 등급 두 유닛을 합치면 한 등급 위 유닛이 됩니다</p>
      <h3>기본 병과 4종 — 신병 소집으로 나옵니다</h3>
      <div class="cx4">${CLASS_IDS.map(c => `<div class="ucard">${uimg(c)}<b>${name(c)}</b><small>${chips(c)} ${CLASS_INFO[c].role}</small></div>`).join('')}</div>
      <h3>같은 병과끼리 → 같은 병과로 진급</h3>
      <div class="rcp">${uimg(CLASS_IDS[0], 'ui s')}<i>+</i>${uimg(CLASS_IDS[0], 'ui s')}<i>→</i>${uimg(CLASS_IDS[0])}<span><b>${name(CLASS_IDS[0])}</b><small>한 등급 위 · 병과 유지</small></span></div>
      <h3>다른 병과끼리 → 무작위 병과로 진급</h3>
      <div class="rcp">${uimg(CLASS_IDS[0], 'ui s')}<i>+</i>${uimg(CLASS_IDS[1], 'ui s')}<i>→</i><b class="qm2">?</b><span><b>무작위 병과</b><small>한 등급 위 · 아래 10종 가운데 하나</small></span></div>
      <h3>특수 병과 6종 — 다른 병과끼리 조합할 때만 나옵니다</h3>
      ${mixKeys.map(k => { const sk = C.typeSkill(k.split('+')); return `<div class="wcard">${uimg(k)}<div><b>${name(k)}</b> ${chips(k)}<p><em>${sk.name}</em> ${sk.text}</p></div></div>`; }).join('')}
      <div class="list" style="margin-top:10px">
      <p>특수 병과는 두 기본 병과의 능력을 절반씩 가지고(예: ${name('inf+art')} = ${name('inf')} + ${name('art')}), 저마다 <b>고유 기술</b>이 하나 있습니다. 기본 병과는 고유 기술이 없는 대신 <b>전설의 용사</b>의 재료가 됩니다. 원하는 병과를 지키려면 <b>같은 병과끼리</b> 조합하세요.</p></div>
      <h2>병과 · 병기</h2>
      ${Object.entries(b.types).map(([k, [n, w]]) => `<div class="wcard">${uimg(k)}<div><b>${n}</b> ${chips(k)}
        <p><em>${GRADES[0].name}~</em> ${w[0]}</p><p><em>${GRADES[b.tiers[0]].name}~</em> ${w[1]}</p><p><em>${GRADES[b.tiers[1]].name}~</em> ${w[2]}</p></div></div>`).join('')}
      <h2>등급과 계급</h2>
      <p class="sub" style="text-align:left;margin:0 0 .8rem">같은 <b>등급(색)</b> 둘을 조합하면 한 등급 오릅니다. 한 등급 안의 계급 이름은 병과에 따라 달라질 뿐 능력은 같습니다 — 순수 병과는 아래 계급, 혼성 병과는 위 계급 이름을 씁니다.</p>
      <div class="grades">${b.grades.map((list, i) => `<div class="gr" style="border-color:${GRADES[i].color}"><b class="gn" style="background:${GRADES[i].color}">${GRADES[i].name}</b>
        <div>${list.map(([name, ins]) => `<span>${ins[1] ? `<img src="${insigUrl(ins)}" alt="">` : ''}${name}</span>`).join('')}</div></div>`).join('')}</div>
      <h3>등급이 오르면 모습이 달라집니다</h3>
      <div class="cx5">${[0, 2, 3, 4, 5].map(lv => `<div class="ucard" style="border-color:${GRADES[lv].color}"><img class="ui" src="${unitSrc(b, ['inf', 'inf'], GROUP_OF_LEVEL[lv])}" alt=""><b>${GRADES[lv].name}~</b></div>`).join('')}</div>
      ${b.hidden.length ? `<h2>히든 계급</h2>${b.hidden.map(h => meta.found[h.id]
        ? `<div class="wcard hid"><div class="hbadge"><img src="${insigUrl(h.insig)}" alt=""><b>${h.name}</b></div><div><b>${h.name}</b> <small>${GRADES[h.level].name} 등급</small><p>${h.text}</p><p><em>얻는 법</em> ${h.how}</p></div></div>`
        : `<div class="wcard hid"><div class="hbadge"><b>?</b></div><div><b>???</b><p>아직 발견하지 못했습니다</p><p><em>단서</em> ${h.recipe ? '어떤 조합에서 나타납니다' : '신병 소집에서 드물게 나타납니다'}</p></div></div>`).join('')}
        <div class="list"><p>히든 계급을 조합 재료로 쓰면 일반 계급으로 진급하고 능력은 사라집니다.</p></div>` : ''}
      <h2>전설의 용사</h2>
      <p class="sub" style="text-align:left;margin:0 0 .8rem"><b>${GRADES[4].name}</b> 등급의 <b>기본 병과</b> 둘(서로 다른 병과)을 조합하면 용사가 태어납니다. 용사는 종류마다 한 명뿐이고, <b>${GRADES[5].name}</b> 등급 유닛과 조합하면 <b>${GRADES[6].name}</b>로 각성해 기술이 강해집니다.</p>
      ${HEROES.map(h => { const k = C.typeKey(h.pair); return `<div class="wcard hero" style="border-color:${h.color}"><div class="hrc">${uimg(h.pair[0], 'ui s')}<i>+</i>${uimg(h.pair[1], 'ui s')}</div>
        <div><b>${h.name}</b> <small>${name(h.pair[0])} + ${name(h.pair[1])} → ${name(k)}</small>${meta.found[h.id] ? '<span class="tag hero">탄생시킴</span>' : ''}<p>${h.text.split(' — ')[1]}</p><p><em>각성</em> ${h.up}</p></div></div>`; }).join('')}
      <h2>작전 지역 · 보스</h2>
      ${C.AREAS.map((a, i) => `<div class="wcard${i === g.area ? ' now' : ''}">${eimg(hasArt('enemy_boss' + (i + 1)) ? 'enemy_boss' + (i + 1) : 'enemy_boss', i + 1)}
        <div><b>${a.boss.name}</b> <small>${(i + 1) * 10}단계 · ${a.name}${i === g.area ? ' · 현재 지역' : ''}</small><p>${a.boss.text}</p></div></div>`).join('')}
      <h2>적</h2>
      <div class="cx4">${[['enemy_normal', '적 보병', '기본'], ['enemy_fast', '드론', '빠름 · 3의 배수 단계'], ['enemy_armor', '장갑차', '단단함 · 5의 배수 단계'], [hasArt('enemy_elite') ? 'enemy_elite' : 'enemy_armor', '정예 표적', '특수 임무']]
        .map(([f, n, t]) => `<div class="ucard">${eimg(f, 0)}<b>${n}</b><small>${t}</small></div>`).join('')}</div>
      <button class="wide" data-act="resume">전장으로</button>`);
  },
  result() {
    const medals = C.medalsFor(g), b = g.branch, d = g.diff || 0, mode = g.mode, best = M.bestMap(meta, mode, d), nextWasOpen = d + 1 < C.DIFFS.length && diffOpen(d + 1);
    const modesBefore = C.MODES.map(m => M.modeOpen(meta, m.id)), rec = C.reached(g), newBest = rec > (best[b.id] || 0), tickets = M.runTickets(g);
    // 판을 마친 보상: 훈장 · 뽑기 티켓 · 병과 숙련 경험치 · 일일 임무 진행 · 최고 기록
    meta.medals += medals; meta.tickets += tickets; best[b.id] = Math.max(best[b.id] || 0, rec);
    const gains = M.addRunXp(meta, g); M.dailyRecord(meta, today(), g); meta.runs++; meta.lastBranch = b.id; saveMeta(); clearRun();
    const opened = d + 1 < C.DIFFS.length && !nextWasOpen && diffOpen(d + 1), modesOpened = C.MODES.filter((m, i) => !modesBefore[i] && M.modeOpen(meta, m.id));
    g.res = { medals, tickets, gains, opened, modesOpened, newBest, rec, doubled: false }; g.reported = true;
    Sound.play(g.over.win ? 'win' : 'lose'); ACT.resultView();
  },
  // 광고를 보면 이번 판 훈장을 한 번 더 받는다
  adx2() { if (!g || !g.res || g.res.doubled) return; watchAd(() => { g.res.doubled = true; meta.medals += g.res.medals; saveMeta(); Sound.play('merge'); ACT.resultView(); }); },
  resultView() {
    const b = g.branch, d = g.diff || 0, mode = g.mode, { medals, tickets, gains, opened, modesOpened, newBest, rec, doubled } = g.res;
    // 최우수 유닛(누적 피해 1위)과 병과별 피해 비율
    const mvp = g.units.filter(Boolean).sort((x, y) => y.dealt - x.dealt)[0], tot = g.dealt || 1;
    const shares = CLASS_IDS.map(c => [c, g.dmg[c] / tot]).filter(x => x[1] > 0.005);
    show(`<h1>${g.over.win ? '승리' : '패배'}</h1><p class="sub">${g.over.reason}</p>
      <div class="card" style="text-align:center;margin:1rem 0"><div class="list"><p><b>${b.name}</b>${mode !== 'normal' ? ` · ${C.MODES.find(m => m.id === mode).name}` : ''}${d ? ` · ${C.DIFFS[d].name}` : ''} · ${mode === 'rush' ? `격파한 보스 ${rec}/${C.AREAS.length}` : `도달 ${g.wave}단계`} · 처치 ${g.kills}${newBest ? ' · <b class="nb">최고 기록!</b>' : ''}</p>
        <p>${ic('medal')}훈장 <b>+${medals * (doubled ? 2 : 1)}</b>${doubled ? ' (광고 2배)' : d ? ` (${C.DIFFS[d].name} ${C.DIFFS[d].medal}배)` : ''} · ${ic('ticket')}뽑기 티켓 <b>+${tickets}</b></p></div></div>
      ${medals > 0 && !doubled ? `<button class="wide sec adx" data-act="adx2">${ic('play')}광고 보고 훈장 한 번 더 <b>+${medals}</b></button>` : ''}
      ${opened ? `<p class="note star" style="text-align:center;font-size:1.4rem">🔓 <b>${C.DIFFS[d + 1].name}</b> 난이도가 열렸습니다</p>` : ''}
      ${modesOpened.map(m => `<p class="note star" style="text-align:center;font-size:1.4rem">🔓 <b>${m.name}</b>이(가) 열렸습니다</p>`).join('')}
      ${gains.length ? `<div class="card xpc"><small>병과 숙련 경험치 +${gains.reduce((a, x) => a + x.xp, 0)}</small><div class="xps">${gains.slice(0, 5).map(x => `<span>${b.types[x.key][0]} <b>+${x.xp}</b>${x.after > x.before ? `<em>▲${x.after}단계</em>` : ''}</span>`).join('')}</div></div>` : ''}
      ${mvp && mvp.dealt > 0 ? `<div class="card mvp"><img class="u" src="${unitSrc(b, mvp.type, C.rankGroup(b, mvp))}" alt="">
        <div><small>최우수 유닛</small><b>${C.unitName(b, mvp)}</b><span>누적 피해 ${fmt(mvp.dealt)} · 전체의 ${Math.round(mvp.dealt / tot * 100)}%</span></div></div>
      <div class="share">${shares.map(([c, v]) => `<i style="flex:${v};background:${CLASS_INFO[c].color}">${v > 0.09 ? `${CLASS_INFO[c].short} ${Math.round(v * 100)}%` : ''}</i>`).join('')}</div>
      <p class="sub" style="margin:.5rem 0 0">병과별 피해 비율 · 전체 피해 ${fmt(g.dealt)}</p>` : ''}
      <button class="wide" data-act="start" data-arg="${b.id}">다시 도전</button>
      <button class="wide sec" data-act="quit">작전 본부로</button>`);
  },
};

// ── 전장 입력 ───────────────────────────────────────────
canvas.addEventListener('pointerdown', e => {
  if (!g || g.over) return;
  const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * C.FIELD.w / r.width, y = (e.clientY - r.top) * C.FIELD.h / r.height;
  const i = g.map.slots.findIndex(s => Math.abs(s.x - x) <= C.CELL.w / 2 && Math.abs(s.y - y) <= C.CELL.h / 2);
  if (i < 0) { ui.sel = ui.target = null; return; }
  if (ui.sel == null || !g.units[ui.sel]) { ui.sel = g.units[i] ? i : null; ui.target = null;
    const t = !g.units[i] && C.tileAt(g, i); if (t) toast(`${t.name} — 이 위의 유닛은 ${t.text}`, 2200);      // 빈 특수 발판을 누르면 효과를 알려 준다
    return; }
  if (i === ui.sel) { ui.sel = ui.target = null; return; }
  if (!g.units[i]) { C.moveUnit(g, ui.sel, i); ui.sel = ui.target = null; return; }      // 빈 칸으로 옮기면 선택도 풀린다 (한 번 이동하면 이동 끝)
  if (C.canMerge(g, ui.sel, i)) { ui.target = i; return; }
  ui.sel = i; ui.target = null;
});
function found(u) { if (u.hidden && !meta.found[u.hidden]) { meta.found[u.hidden] = 1; saveMeta(); } }
function doMerge() {
  const pv = C.mergePreview(g, ui.sel, ui.target), u = C.merge(g, ui.sel, ui.target); if (!u) return;
  const hero = C.heroOf(u);
  if (hero) toast(pv.awaken ? `★ ${hero.name} 각성! — ${hero.up}` : `★ 전설의 용사 탄생! ${hero.name} — ${hero.text.split(' — ')[1]}`, 3600, true);
  else toast(u.hidden ? `히든 조합! ${C.unitName(g.branch, u)} 등장` : `${C.unitName(g.branch, u)} 진급!`);
  found(u); Sound.play(u.hidden ? 'hidden' : 'merge'); ui.sel = u.slot; ui.target = null;
}
$('info').addEventListener('click', e => {
  const a = e.target.dataset.do; if (!a || !g) return;
  if (a === 'merge') doMerge();
  if (a === 'cancel') ui.target = null;
  if (a === 'gamble') { const r = C.gamble(g, ui.sel); infoKey = '';
    if (r === 'up') { toast(`진급 심사 통과! ${C.unitName(g.branch, g.units[ui.sel])}`); Sound.play('merge'); }
    else if (r === 'down') { toast(`심사 탈락 — ${C.unitName(g.branch, g.units[ui.sel])}(으)로 강등`); Sound.play('deny'); }
    else if (r === 'same') { toast('심사 보류 — 변화 없음'); Sound.play('sell'); } }
  if (a === 'reroll') { const u = C.reroll(g, ui.sel); infoKey = '';
    if (u) { toast(`병과 교체 → ${C.unitName(g.branch, u)}`); Sound.play('summon'); } else { toast('보급품이 부족합니다'); Sound.play('deny'); } }
  if (a === 'sell') { const v = C.sell(g, ui.sel); ui.sel = ui.target = null; toast(`전역 처리 +${fmt(v)}`); Sound.play('sell'); }
});
$('b-summon').onclick = () => { if (!g) return; const u = C.summon(g);
  if (!u) { toast(g.units.includes(null) ? '군자금이 부족합니다' : '배치할 칸이 없습니다 — 조합하세요'); Sound.play('deny'); }
  else if (u.hidden) { toast(`히든 계급! ${C.unitName(g.branch, u)} 소집`); found(u); Sound.play('hidden'); }
  else { if (u.level > g.camp) toast(`행운! ${C.unitName(g.branch, u)} 소집`); Sound.play('summon'); } };
$('b-camp').onclick = () => { if (g && C.upgradeCamp(g)) { toast(`훈련소 Lv${g.camp + 1} — ${GRADES[g.camp].name} 등급(${g.branch.grades[g.camp][0][0]}~)부터 소집`); Sound.play('camp'); } };
$('b-pick').onclick = () => g && ACT.pick();
$('b-up').onclick = () => g && ACT.upg();
$('b-mission').onclick = () => g && ACT.missions();
$('b-elite').onclick = () => { if (g && C.callElite(g)) { toast(`특수 임무 — ${C.CFG.eliteTime}초 안에 정예 표적을 격파하라`); Sound.play('boss'); } };
$('b-menu').onclick = () => g && ACT.menu();
$('b-speed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('b-speed').textContent = '×' + speed; };
document.addEventListener('visibilitychange', () => { if (document.hidden && g && !g.over) { saveRun(); if (!paused) ACT.menu(); } });
window.addEventListener('pagehide', () => { if (g && !g.over) saveRun(); });

// ── 표시 갱신 ───────────────────────────────────────────
// 능력치를 작은 칩으로. prev가 있으면 공격력이 얼마나 오르는지 함께 보여준다
function statChips(st, prev, unit) {
  const xs = [`${ic('sword')}공격 <b>${fmt(st.dmg)}</b>${prev && st.dmg > prev.dmg ? `<em>▲${fmt(st.dmg - prev.dmg)}</em>` : ''}`, `${ic('bolt')}초당 <b>${(1 / st.cd).toFixed(1)}회</b>`, `${ic('ring')}사거리 <b>${Math.round(unit ? C.unitRange(unit) : st.range)}</b>`];
  if (st.splash) xs.push(`광역 <b>${Math.round(st.splash)}</b>`); if (st.slow) xs.push(`둔화 <b>${Math.round(st.slow * 100)}%</b>`);
  if (st.vuln) xs.push(`취약 <b>+${Math.round(st.vuln * 100)}%</b>`); if (st.haste) xs.push(`주변 공속 <b>+${Math.round(st.haste * 100)}%</b>`);
  if (st.crit) xs.push(`치명 <b>${Math.round(st.crit * 100)}%</b>`);
  if (unit) xs.push(`누적 피해 <b id="u-dealt">${fmt(unit.dealt)}</b>`);
  return `<div class="stats">${xs.map(x => `<span>${x}</span>`).join('')}</div>`;
}
function renderInfo() {
  const b = g.branch, A = ui.sel != null ? g.units[ui.sel] : null, B = ui.target != null ? g.units[ui.target] : null;
  const key = [A && A.id + A.type.join('') + A.slot, B && B.id, g.wave, g.supply, g.area, CLASS_IDS.map(c => g.up[c]).join(''), g.buff.haste, g.buff.dmg, g.buff.immune].join('|');
  if (key === infoKey) {      // 카드는 그대로 두고 누적 피해 숫자만 바꾼다 (카드를 통째로 다시 만들면 누르던 버튼이 사라진다)
    if (A && !B) { const d = $('u-dealt'), v = fmt(A.dealt); if (d && d.textContent !== v) d.textContent = v; }
    return;
  }
  infoKey = key;
  const el = $('info'), portrait = (u, cls = '') => `<div class="pt ${cls}"><img class="u" src="${unitSrc(b, u.type, C.rankGroup(b, u))}" alt=""><b><i class="gdot" style="background:${GRADES[u.level].color}"></i>${C.heroOf(u) ? C.rankName(b, u) : C.unitName(b, u)}</b><img class="ins" src="${insigUrl(C.rankInsig(b, u))}" alt=""></div>`;
  $('app').classList.toggle('sel', !!A);       // 유닛을 고른 동안에는 하단 버튼 자리까지 카드가 쓴다
  if (A && B) {
    const p = C.mergePreview(g, ui.sel, ui.target), nu = { level: p.level, type: p.type, hidden: p.hidden }, h = C.hiddenDef(b, p.hidden), gr = GRADES[p.level];
    // 같은 병과끼리는 결과가 정해져 있고, 다른 병과끼리는 병과가 무작위라 물음표로 보여 준다
    const result = p.random ? `<div class="pt res rnd" style="border-color:${gr.color}"><div class="qm" style="color:${gr.color}">?</div><b><i class="gdot" style="background:${gr.color}"></i>${h ? h.name + ' · ' : ''}무작위 병과</b></div>` : portrait(nu, 'res');
    const lost = [A, B].filter(x => x.hidden && !(h && h.hero && x.hidden === p.hidden && (x === A || !C.heroOf(A))));      // 조합하면 능력이 사라지는 재료 (각성하는 용사 자신은 빼고)
    el.innerHTML = `<div class="card"><div class="ttl"><b>조합 미리보기</b><span class="tag${h ? (h.hero ? ' hero' : ' hid') : ''}">${h ? (p.awaken ? '★ 용사 각성' : h.hero ? '★ 전설의 용사 탄생' : '★ 히든 조합') : p.random ? `${gr.name} 등급 · 병과 무작위` : `${C.rankName(b, A)} → ${C.rankName(b, nu)} 진급`}</span></div>
      <div class="mix">${portrait(A)}<span class="op">${ic('plus')}</span>${portrait(B)}<span class="op go">${ic('arrow')}</span>${result}</div>
      ${p.random ? `<p class="note">병과가 다른 유닛끼리 조합하면 <b>${gr.name}</b> 등급으로 오르고, 병과는 10종 가운데 무작위로 정해집니다. 같은 병과끼리 조합하면 그 병과가 유지됩니다.</p>` : statChips(C.unitStats(b, p.level, p.type, meta, g.up), A.stats)}
      ${!p.random && C.typeSkill(p.type) ? `<p class="note skill"><b>${C.typeSkill(p.type).name}</b> ${C.typeSkill(p.type).text}</p>` : ''}
      ${h ? `<p class="note star">★ ${p.awaken ? `각성 — ${h.up}` : h.text}</p>` : ''}${lost.length ? `<p class="note">⚠ 재료로 쓰는 ${lost.map(x => C.rankName(b, x)).join(' · ')}의 능력은 조합하면 사라집니다</p>` : ''}
      <div class="acts"><button class="btn" data-do="cancel">취소</button><button class="btn primary" data-do="merge">조합하기</button></div></div>`;
  } else if (A) {
    const h = C.hiddenDef(b, A.hidden), up = [A.dmgUp && `공격력 +${Math.round(A.dmgUp * 100)}%`, A.rangeUp && `사거리 +${Math.round(A.rangeUp * 100)}%`].filter(Boolean), tile = C.tileAt(g, A.slot), sk = C.typeSkill(A.type), ml = C.masteryOf(meta, b.id, C.typeKey(A.type));
    const bf = [g.buff.haste && `공격 속도 +${Math.round(g.buff.haste * 100)}%`, g.buff.dmg && `공격력 +${Math.round(g.buff.dmg * 100)}%`, g.buff.immune && '기절·화염 면역'].filter(Boolean);
    el.innerHTML = `<div class="card"><div class="unit"><img class="u" src="${unitSrc(b, A.type, C.rankGroup(b, A))}" alt="">
      <div><h3><i class="gdot" style="background:${GRADES[A.level].color}"></i>${C.unitName(b, A)}<img src="${insigUrl(C.rankInsig(b, A))}" alt="">${h ? (h.hero ? `<span class="tag hero">${A.level > h.level ? '각성 용사' : '용사'}</span>` : '<span class="tag hid">히든</span>') : ''}</h3>
        <small><b style="color:${GRADES[A.level].color}">${GRADES[A.level].name}</b> · ${C.unitWeapon(b, A)}${ml ? ` · 숙련 ${ml}단계` : ''}</small></div></div>
      ${statChips(A.stats, null, A)}
      ${h ? `<p class="note star">★ ${h.text}${h.hero ? (A.level > h.level ? ` → <b>각성: ${h.up}</b>` : ` <span class="dim">(전설 등급 유닛과 조합하면 각성 — ${h.up})</span>`) : ''}</p>` : ''}${up.length ? `<p class="note star">주변 지원: ${up.join(' · ')}</p>` : ''}
      ${sk ? `<p class="note skill"><b>${sk.name}</b> ${sk.text}</p>` : ''}${A.guard ? '<p class="note star">응급 처치 지원: 기절·화염 시간 절반</p>' : ''}
      ${bf.length ? `<p class="note star">용사 지원: ${bf.join(' · ')}</p>` : ''}
      ${tile ? `<p class="note tile"><i style="background:${tile.color}"></i><b>${tile.name}</b> 위에 있습니다 — ${tile.text}</p>` : ''}
      <p class="note">${A.level < C.maxLevel(b) ? '색칠된 발판의 유닛을 누르면 조합 · 빈 발판을 누르면 그 자리로 이동(이동하면 선택이 풀립니다)' : '최고 계급입니다'}</p>
      <div class="acts three"><button class="btn purple" data-do="gamble" ${C.canGamble(g, ui.sel) ? '' : 'disabled'}>심사 ${Math.round(C.gambleChance(A, meta) * 100)}% ${ic('box')}${C.CFG.gambleSupply}</button>
        <button class="btn blue" data-do="reroll" ${C.canReroll(g, ui.sel) ? '' : 'disabled'}>병과 교체 ${ic('box')}${C.CFG.rerollSupply}</button>
        <button class="btn red" data-do="sell">전역 ${ic('coin')}+${fmt(C.sellValue(g, A))}</button></div></div>`;
  } else el.innerHTML = '';      // 고른 유닛이 없으면 카드를 치우고 주둔지를 보여 준다
}
// 상단바·하단 버튼 글자는 매 프레임 다시 계산하지만, 값이 바뀐 것만 화면에 쓴다 (같은 값을 다시 쓰면 그때마다 화면 배치를 새로 계산한다)
const hudEl = {}, hudVal = {};
const hud = id => hudEl[id] || (hudEl[id] = $(id));
const put = (id, v) => { if (hudVal[id] !== v) { hudVal[id] = v; hud(id).textContent = v; } };
const putW = (id, pct) => { const v = Math.round(pct) + '%', k = id + ':w'; if (hudVal[k] !== v) { hudVal[k] = v; hud(id).style.width = v; } };
const putOff = (id, off) => { const k = id + ':d'; if (hudVal[k] !== off) { hudVal[k] = off; hud(id).disabled = off; } };
const putCls = (id, cls, on) => { const k = id + ':' + cls; if (hudVal[k] !== on) { hudVal[k] = on; hud(id).classList.toggle(cls, on); } };
// 지금 지역의 보스가 몇 단계에 나오는지 (보스 러시는 몇 번째 보스인지)
const bossLabel = () => (g.mode === 'rush' ? `${g.area + 1}번째 보스` : `${(Math.floor(Math.max(0, g.wave - 1) / 10) + 1) * 10}단계 보스`);
function renderHud() {
  const b = g.branch, lim = C.CFG.enemyLimit;
  put('h-area', C.AREAS[g.area].name);
  put('h-wave', g.wave);
  const maxW = C.maxWaveOf(g), rush = g.mode === 'rush', fight = rush && g.enemies.some(e => e.kind === 'boss'), gap = rush ? (g.wave ? C.CFG.rushGap : C.CFG.rushPrep) : C.CFG.waveGap;
  put('h-max', maxW === Infinity ? '/∞' : '/' + maxW);
  put('h-next', g.wave >= maxW ? '최종' : fight ? '교전 중' : Math.ceil(g.nextWave) + '초');
  putW('h-nextbar', g.wave >= maxW || fight ? 100 : Math.max(0, Math.min(100, 100 - g.nextWave / gap * 100)));
  put('h-enemy', `적 ${g.enemies.length}/${lim}`);
  putW('h-enemybar', Math.min(100, g.enemies.length / lim * 100));
  putCls('g-enemy', 'warn', g.enemies.length > lim * 0.7);
  put('h-gold', fmt(g.gold)); put('h-sup', g.supply);
  const sc = C.summonCost(b, g.camp, meta), cc = C.campCost(b, g.camp), maxed = g.camp >= C.maxCamp(b);
  put('c-summon', `${GRADES[g.camp].name}~ · ${fmt(sc)}`); putOff('b-summon', g.gold < sc || !g.units.includes(null));
  put('t-camp', `훈련소 Lv${g.camp + 1}`); put('c-camp', maxed ? '최대' : fmt(cc));
  // 주둔지 위 한 줄 안내: 다음 단계와 이 지역 보스
  const nw = g.wave < maxW ? C.waveOf(g, g.wave + 1) : null, ar = C.AREAS[g.area], bossAt = bossLabel();
  put('t-info', !nw ? '마지막 단계입니다' : rush ? `다음 보스 ${g.wave + 1}/${maxW} · ${nw.name}` : `다음 ${g.wave + 1}단계 ${nw.name} ${nw.count}기 · ${bossAt} ${ar.boss.name}`);
  // 주둔지 땅과 건물 판은 지금 지역의 전장과 같은 색
  if (hudVal.area !== g.area + bossAt) { hudVal.area = g.area + bossAt; const col = areaColors(g.area), st = $('app').style; st.setProperty('--g1', col.ground[0]); st.setProperty('--g2', col.ground[1]); st.setProperty('--p1', col.pad[0]); st.setProperty('--p3', col.pad[3]);
    // 이 지역 보스 안내 (세로로 긴 화면에서만 보인다)
    const n = g.area + 1, f = hasArt('enemy_boss' + n) ? 'enemy_boss' + n : 'enemy_boss'; $('brief-img').src = `img/${f}.webp`;
    $('brief-w').textContent = `${bossAt} · ${ar.name}`; $('brief-t').textContent = ar.boss.name; $('brief-s').textContent = ar.boss.text; }
  putOff('b-camp', maxed || g.gold < cc);
  put('c-pick', `보급병 ${g.depot}/${C.CFG.depotMax}`);
  putCls('b-pick', 'hot', g.depot < C.CFG.depotMax && g.depot < 3 && g.wave >= 3 && g.gold >= C.depotCost(g) * 3);      // 여유가 있는데 보급병이 거의 없으면 보급창이 빛난다
  put('c-up', `합계 Lv${CLASS_IDS.reduce((n, c) => n + g.up[c], 0)}`);
  const es = C.eliteState(g), el = g.enemies.find(e => e.kind === 'elite');
  put('c-elite', es === 'ready' ? '출동 가능' : es === 'active' ? `진행 ${Math.ceil(el ? el.life : 0)}초` : es === 'cd' ? `대기 ${Math.ceil(g.elite.cd)}초` : es === 'off' ? '러시 중 불가' : '1단계부터');
  putOff('b-elite', es !== 'ready'); putCls('b-elite', 'hot', es === 'ready');
  const ms = C.missionList(g).filter(m => !m.hidden); put('c-mission', `${ms.filter(m => g.done[m.id]).length}/${ms.length}`);
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
    if (l.t === 'wave') { const boss = C.waveOf(g, l.wave).kind === 'boss'; saveRun(); Sound.play(boss ? 'boss' : 'wave'); if (boss) toast(`보스 출현 — ${C.AREAS[g.area].boss.text}`, 3200); }
    else if (l.t === 'rush') toast(`보스 격파! 다음 지역으로 — 군자금 +${fmt(l.gold)} · 보급품 +${l.sup}`, 2600);
    else if (l.t === 'area') { ui.trans = { t: 2.6, total: 2.6, area: l.area, label: `${bossLabel()} — ${C.AREAS[l.area].boss.name}` }; hold = 1.3; ui.sel = ui.target = null; infoKey = '';
      for (const u of g.units) if (u) u.flash = 0.9; Sound.play('hidden'); }
    else if (l.t === 'mission') { if (l.hidden) { meta.foundM[l.id] = 1; saveMeta(); toast(`★ 히든 임무 달성: ${l.text} · 보급품 +${l.sup}`, 3200, true); Sound.play('hidden'); }
      else { toast(`임무 완수: ${l.text} · 보급품 +${l.sup}`); Sound.play('camp'); } }
    else if (l.t === 'depot') { if (l.sup && g.wave % 10 && g.mode !== 'rush') toast(`보급 도착 — 군자금 +${fmt(l.gold)} · 보급품 +${l.sup}`); }
    else if (l.t === 'eliteKill') { toast(`특수 임무 성공! 보급품 +${C.CFG.eliteSupply}`); Sound.play('merge'); }
    else if (l.t === 'eliteFail') { toast('특수 임무 실패 — 표적이 빠져나갔습니다'); Sound.play('deny'); } }
  if (ui.sel != null && !g.units[ui.sel]) ui.sel = ui.target = null;
  const k = canvas.width / C.FIELD.w; ctx.setTransform(k, 0, 0, k, 0, 0);
  draw(ctx, g, ui, view.quality); renderHud(); renderInfo();
  if (g.over && !g.reported) ACT.result();
}
Sound.setMuted(meta.mute); applySkin();
document.addEventListener('pointerdown', () => Sound.unlock(), { passive: true });
window.__srd = { get game() { return g; }, C, view };   // 자동 검사용
fillIcons(); ACT.title(); requestAnimationFrame(frame);
try { localStorage.setItem('srd_boot_ok', localStorage.getItem('srd_live_build') || ''); } catch { /* 저장 불가 환경 */ }
// 로딩 화면(index.html의 #boot): 일러스트를 다 읽으면(늦어도 3초) 걷는다. 너무 짧게 번쩍이지 않게 최소 0.7초는 보여 준다
const boot = $('boot');
function bootOff() { if (!boot || boot.classList.contains('off')) return; boot.classList.add('off'); setTimeout(() => { boot.hidden = true; }, 400); }
function bootOn(msg) { if (!boot) return; $('boot-msg').textContent = msg; boot.hidden = false; boot.classList.remove('off'); }
{ const im = new Image(), done = () => setTimeout(bootOff, Math.max(0, 700 - performance.now()));
  im.onload = im.onerror = done; im.src = 'img/title.webp'; setTimeout(bootOff, 3000); }
// 자동 업데이트: 새 버전을 다 받으면, 아직 게임을 시작하지 않았을 때는 바로 다시 열고 아니면 다음 실행부터 적용한다
checkUpdate(() => { if (!g) { bootOn('새 버전 적용 중…'); location.reload(); } else toast('새 버전을 받았습니다 — 다음 실행부터 적용됩니다'); })
  .then(() => { if (!g && overlay.classList.contains('on') && overlay.querySelector('h1')) ACT.title(); });
