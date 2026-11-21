// 화면 · 입력 · 저장 연결
import { BRANCHES, CLASS_IDS, CLASS_INFO, GRADES, GROUP_OF_LEVEL, HEROES, COMMENDS, CM_NEED, cmVal } from './data.js';
import * as C from './core.js';
import * as M from './meta.js';
import { draw, areaColors, setSkin } from './render.js';
import { insigUrl, hasArt, unitArtName, loadBranchArt } from './sprites.js';
import { Ads, Store } from './monetize.js';
import { Net } from './net.js';
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
const SPEEDS = [2, 4, 6], okSpeed = v => (SPEEDS.includes(v) ? v : SPEEDS[0]);      // 실제 배수(화면에는 ×1 · ×2 · ×3)
let meta = loadMeta(), g = null, ui = { sel: null, target: null }, speed = 2, paused = true, last = 0, infoKey = '';
const view = initLayout(() => { infoKey = ''; });

// 기기에 저장되는 값(훈장·영구 강화·기록·숙련도·표창·출석·일일 임무·뽑기판). 칸의 뜻과 규칙은 meta.js
function loadMeta() { try { return M.fillMeta(JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch { return M.fillMeta({}); } }
const today = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };      // 기기 시계 기준 오늘 날짜
const rnd = Math.random;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));      // 다른 사람이 정한 글(별명)을 화면에 넣을 때
// ── 2인 협동 (한 전장을 둘이 나눠 쓴다) ───────────────────
// 두 기기가 같은 전장을 똑같이 계산한다. 방장이 걸음(TICK초)을 세고 명령을 실행하면서 그 번호를 알리고, 손님은 같은 걸음에 같은 명령을 실행하며 따라간다.
// coop = { code 방 번호, host 방장인지, me 내 번호(0 방장·1 손님), peer 동료 {name, branch}, conn 연결, tick 지금까지 계산한 걸음,
//          goal (손님) 방장이 알려 준 걸음, q (손님) 실행할 명령 줄, seq 명령 번호, sums·mine 견줄 값, dead 끊김 }
// 주고받는 글: me(전투 계산에 쓰는 내 값) · start(방장→손님: 시작) · tk(방장: 지금 걸음) · cmd(방장: 이 걸음에 이 명령) · req(손님→방장: 명령 부탁)
//             · sum(방장: 견줄 값) · need / snap(어긋나면 방장의 상태를 통째로) · speed · emote
let coop = null;
const TICK = 0.05, EMOTES = ['도와줘!', '좋아!', '보스 집중!', '고마워!'];
const duoLive = () => !!(g && g.duo && coop && !coop.dead);
const myBranch = () => (BRANCHES.find(x => x.id === meta.lastBranch) || BRANCHES[0]);
const peerP = () => g.duo.ps[1 - g.duo.me];
function coopLeave() { if (coop) { const c = coop; coop = null; if (c.conn) c.conn.close(); } }
function coopLost() {      // 동료가 나갔거나 연결이 끊겼다 → 남은 사람이 전장 전체를 맡아 혼자 이어간다
  if (!coop || coop.dead) return;
  if (g && g.duo) { coop.dead = true; g.duo.solo = true; if (coop.conn) coop.conn.close(); if (!g.over) toast('동료와의 연결이 끊겼습니다 — 전장 전체를 맡아 이어갑니다', 3400); infoKey = ''; }
  else { coopLeave(); ACT.coop('동료가 나갔습니다'); }
}
const myInfo = () => ({ branchId: BRANCHES[0].id, name: meta.name, meta: M.metaLite(meta) });      // branchId는 예전 판과 말이 통하게 남겨 둔 값(쓰지 않는다)
const okPlayer = p => !!(p && BRANCHES.some(b => b.id === p.branchId) && p.meta && typeof p.meta === 'object');
function coopBegin(players, seed, me, sp, stage = 1) {
  if (!players.every(okPlayer)) { coopLeave(); return ACT.coop('시작하지 못했습니다 — 다시 해 보세요'); }
  if (!M.spendEnergy(meta, Date.now())) { coopLeave(); return ACT.noenergy(); }
  saveMeta(); for (const x of BRANCHES) loadBranchArt(x.id);
  players = players.map(pl => ({ ...pl, name: M.cleanName(pl.name) || '동료' }));
  g = C.createDuo({ players, seed, me, stage: C.stageInfo(stage).n });
  Object.assign(coop, { me, tick: 0, goal: 0, q: [], seq: 0, sums: {}, mine: {}, acc: 0, beat: performance.now(), beatSent: 0, need: false });
  enter(); setSpeed(sp); hide(); toast(`${peerP().name}와(과) 스테이지 ${g.stage} 협동 시작! ${me === 0 ? '위쪽' : '아래쪽'} 발판이 내 구역입니다`, 3400);
}
function coopMsg(m) {
  if (m.t === 'refused') { coopLeave(); ACT.coop(m.why === 'full' ? '방이 가득 찼습니다' : '없는 방 번호입니다'); }
  else if (m.t === 'hello') { coop.host = !!m.host; coop.peer = m.peer; if (m.peer) coop.conn.send({ t: 'me', p: myInfo() }); if (!g) ACT.cowait(); }
  else if (m.t === 'peer') { coop.peer = m.peer; coop.conn.send({ t: 'me', p: myInfo() }); if (!g) ACT.cowait(); }
  else if (m.t === 'me') { if (coop.host && !g && okPlayer(m.p)) { const seed = Math.floor(Math.random() * 2 ** 31), ps = [myInfo(), m.p]; const stage = Math.min(M.stageOpen(meta), meta.stageSel | 0 || 1); coop.conn.send({ t: 'start', seed, speed: 2, p: ps, stage }); coopBegin(ps, seed, 0, 2, stage); } }      // 스테이지는 방장이 고른 것
  else if (m.t === 'start') { if (!coop.host && !g && Array.isArray(m.p) && m.p.length === 2) coopBegin(m.p, m.seed >>> 0, 1, okSpeed(m.speed), m.stage | 0 || 1); }
  else if (m.t === 'left') coopLost();
  else if (!duoLive()) return;
  else if (m.t === 'emote') { if (EMOTES[m.i]) { toast(`${peerP().name}: ${EMOTES[m.i]}`, 2400); Sound.play('summon'); } }
  else if (coop.host) {      // 방장이 받는 글
    if (m.t === 'req') hostCmd(1, m.c);
    else if (m.t === 'need') coop.conn.send({ t: 'snap', n: coop.tick, seq: coop.seq, s: C.duoSnap(g) });
  } else {                    // 손님이 받는 글
    if (m.t === 'tk') { if (m.n > coop.goal) coop.goal = m.n | 0; coop.beat = performance.now(); }
    else if (m.t === 'cmd') coop.q.push(m);
    else if (m.t === 'sum') { coop.sums[m.n] = m.h; checkSum(m.n); }
    else if (m.t === 'snap') { if (C.duoLoad(g, m.s)) { coop.tick = m.n | 0; coop.goal = Math.max(coop.goal, coop.tick); coop.q = coop.q.filter(x => x.seq > m.seq); coop.sums = {}; coop.mine = {}; infoKey = ''; ui.sel = ui.target = null; coop.resync = (coop.resync || 0) + 1; } coop.need = false; }
    else if (m.t === 'speed') { setSpeed(okSpeed(m.v)); }
  }
}
// 손님: 방장의 값과 내 값이 다르면 방장의 상태를 통째로 받아 맞춘다
function checkSum(n) {
  if (coop.sums[n] == null || coop.mine[n] == null) return;
  if (coop.sums[n] !== coop.mine[n] && !coop.need) { coop.need = true; coop.conn.send({ t: 'need' }); }
  delete coop.sums[n]; delete coop.mine[n];
}
// 조작은 모두 cmd()를 거친다. 혼자 하는 판은 바로 실행하고, 협동에서는 방장이 실행해 두 기기에 알린다(손님은 방장에게 부탁하고, 돌아온 명령을 제 걸음에 실행한다)
function cmd(c) {
  if (!g || g.over) return;
  if (!duoLive()) after(c, C.exec(g, g.duo ? g.duo.me : 0, c));
  else if (coop.host) hostCmd(0, c);
  else coop.conn.send({ t: 'req', c });
}
function hostCmd(by, c) { const r = C.exec(g, by, c); coop.conn.send({ t: 'cmd', n: coop.tick, seq: ++coop.seq, by, c }); if (by === coop.me) after(c, r); }
// 내 명령의 결과를 알림·소리로 알린다
function after(c, r) {
  infoKey = ''; const nm = u => { const ub = C.branchOf(g, u); return `${ub.name} ${C.charName(ub, u)} ${C.rankName(ub, u)}`; }, k = c[0];      // 알림에 쓰는 이름: 육군 바둑이 병장
  if (k === 'summon') {
    if (!r) { toast(C.hasFree(g) ? '군자금이 부족합니다' : '칸이 없습니다 — 같은 군별·등급끼리 조합하거나 짝 없는 유닛을 전역시키세요', 2600); Sound.play('deny'); }
    else if (c[1] != null && !r.hidden && r.level <= g.camp && C.tileAt(g, r.slot)) { const t = C.tileAt(g, r.slot); toast(`${t.name} — ${t.text}`, 1800); Sound.play('summon'); }      // 특수 발판에 세웠으면 효과를 알려 준다
    else if (r.hidden) { toast(`히든 계급! ${nm(r)} 소집`); found(r); Sound.play('hidden'); }
    else { if (r.level > g.camp) toast(`행운! ${nm(r)} 소집`); Sound.play('summon'); }
  } else if (k === 'pick') { if (r) { toast(`${nm(r)} 소집`); Sound.play('summon'); } else { toast('보급품·군자금·빈 칸을 확인하세요'); Sound.play('deny'); } }
  else if (k === 'camp') { if (r) { toast(`훈련소 Lv${g.camp + 1} — ${GRADES[g.camp].name} 등급(${g.branch.grades[g.camp][0][0]}~)부터 소집`); Sound.play('camp'); } }
  else if (k === 'up') { Sound.play(r ? 'camp' : 'deny'); if (overlay.querySelector('[data-act="upc"]')) ACT.upg(); }
  else if (k === 'hire') { Sound.play(r ? 'camp' : 'deny'); if (overlay.querySelector('[data-act="hire"]')) ACT.pick(); }
  else if (k === 'merge') { if (!r) return; const hero = C.heroOf(r);
    if (hero) toast(r.level > hero.level ? `★ ${hero.name} 각성! — ${hero.up}` : `★ 전설의 용사 탄생! ${hero.name} — ${hero.text.split(' — ')[1]}`, 3600, true);
    else toast(r.hidden ? `히든 조합! ${nm(r)} 등장` : `${nm(r)} 진급!`);
    found(r); Sound.play(r.hidden ? 'hidden' : 'merge'); ui.sel = r.slot; ui.target = null; }
  else if (k === 'sell') { if (r) { toast(`전역 처리 +${fmt(r)}`); Sound.play('sell'); } }
  else if (k === 'gamble') { const u = g.units[c[1]];
    if (r === 'up') { toast(`진급 심사 통과! ${nm(u)}`); Sound.play('merge'); } else if (r === 'down') { toast(`심사 탈락 — ${nm(u)}(으)로 강등`); Sound.play('deny'); } else if (r === 'same') { toast('심사 보류 — 변화 없음'); Sound.play('sell'); } }
  else if (k === 'reroll') { if (r) { toast(`병과 교체 → ${nm(r)}`); Sound.play('summon'); } else { toast('보급품이 부족합니다'); Sound.play('deny'); } }
  else if (k === 'elite') { if (r) { toast(`특수 임무 — ${C.CFG.eliteTime}초 안에 정예 표적을 격파하라`); Sound.play('boss'); } }
  else if (k === 'ad') { if (r) { toast(`지원 도착 — 군자금 +${fmt(r)}`); Sound.play('camp'); } if (overlay.querySelector('[data-act="hire"]')) ACT.pick(); }
  else if (k === 'gift') { if (r) { toast(`군자금 ${fmt(r)}을(를) 보냈습니다`); Sound.play('camp'); } if (overlay.querySelector('[data-act="cogift"]')) ACT.cosheet(); }
}
// 협동의 걸음: 방장은 시간을 세어 걸음을 나아가고, 손님은 방장이 알려 준 걸음까지 따라간다
function duoFrame(now) {
  const c = coop, send = o => c.conn.send(o);
  if (c.host) {
    c.acc = Math.min(40, c.acc + Math.min(0.5, (now - last) / 1000) * speed / TICK);
    let n = Math.min(200, Math.floor(c.acc)); c.acc -= n;
    while (n-- > 0 && !g.over) { C.step(g, TICK); c.tick++; if (c.tick % 40 === 0) send({ t: 'sum', n: c.tick, h: C.duoHash(g) }); }
    if (now - c.beatSent > 50) { c.beatSent = now; send({ t: 'tk', n: c.tick }); }
  } else {
    const run = () => { while (c.q.length && c.q[0].n <= c.tick) { const m = c.q.shift(), r = C.exec(g, m.by === 1 ? 1 : 0, m.c); if (m.by === c.me) after(m.c, r); } };
    run();
    let n = Math.min(400, c.goal - c.tick);
    while (n-- > 0 && !g.over) { C.step(g, TICK); c.tick++; if (c.tick % 40 === 0) { c.mine[c.tick] = C.duoHash(g); checkSum(c.tick); } run(); }
  }
}
async function coopJoin(getCode) {
  if (M.energyNow(meta, Date.now()) < 1) return ACT.noenergy();
  const nm = document.getElementById('nm'); if (nm) { const v = M.cleanName(nm.value); if (v.length >= 2) meta.name = v; } saveMeta();
  ACT.coop('연결하는 중…');
  try {
    const r = await getCode(), me = { code: r.code, host: null, peer: null, conn: null }; coop = me;
    me.conn = await Net.join(r.code, { name: meta.name, branch: 'mix' }, { msg: m => { if (coop === me) coopMsg(m); }, close: () => { if (coop === me) coopLost(); } });
    if (coop === me && !g) ACT.cowait();
  } catch { coopLeave(); ACT.coop('연결하지 못했습니다 — 잠시 뒤에 다시 해 보세요'); }
}
let rankReq = 0;
// 스킨(도색): 전장의 내 유닛 그림과 카드의 초상에 같은 색 필터를 입힌다
function applySkin() { const s = M.skinOf(meta); setSkin(s.filter, s.art); if (s.art) loadBranchArt(s.art); document.documentElement.style.setProperty('--skin', s.filter || 'none'); }
// 유닛 초상(카드·결과 화면): 용사 전용 그림 → 내 스킨 그림 → 군별·계급대 그림
function unitPic(b, u) {
  const h = C.heroOf(u), hn = h && `units/hero_${h.id}${u.level > h.level ? 'aw' : ''}`; if (hn && hasArt(hn)) return `img/${hn}.webp`;
  const sk = M.skinOf(meta).art, sn = sk && !h && (!g || !g.duo || C.own(g, u)) && `units/${sk}_${C.typeKey(u.type).replace('+', '-')}`; if (sn && hasArt(sn)) return `img/${sn}.webp`;
  return unitSrc(b, u.type, C.rankGroup(b, u));
}
const iga = w => { const c = (w.charCodeAt(w.length - 1) - 0xac00) % 28; return c > 0 ? '이' : '가'; };      // 조사 이/가
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// 훈장 · 티켓 · 보석 · 행동력을 한 줄로 (본부·상점 위쪽)
const resBar = () => { const now = Date.now(), en = M.energyNow(meta, now), w = M.energyWait(meta, now);
  return `<div class="res"><div class="pill en">${ic('bolt')}<b>${en}/${M.ENERGY.max}</b>${w ? `<small id="en-t">${mmss(w)}</small>` : ''}</div><div class="pill">${ic('gem')}<b>${meta.gems}</b></div><div class="pill">${ic('medal')}<b>${meta.medals}</b></div><div class="pill">${ic('ticket')}<b>${meta.tickets}</b></div></div>`; };
setInterval(() => { const el = document.getElementById('en-t'); if (!el) return; const w = M.energyWait(meta, Date.now()); if (w && M.energyNow(meta, Date.now()) < M.ENERGY.max) el.textContent = mmss(w); else if (!g) ACT[tabNow](); }, 1000);
// 보상형 광고를 보고, 끝까지 봤으면 then(보상 처리)을 부른다. 전투 중이면 그동안 멈춘다
async function watchAd(then) {
  if (!Ads.available()) { toast('지금은 광고를 불러올 수 없습니다'); return; }
  const was = paused; paused = true; const ok = await Ads.showRewarded(); paused = was; last = performance.now();
  if (ok) then(); else toast('광고를 끝까지 봐야 보상을 받습니다');
}
const curMode = () => (M.modeOpen(meta, meta.mode) ? meta.mode : 'stage');
const recText = (mode, n) => (mode === 'rush' ? `보스 ${n}/${C.AREAS.length}` : `최고 ${n}라운드`);
// 난이도별 최고 기록: 보통은 meta.best, 그 위는 meta.bestD[난이도]. 위 난이도는 바로 아래 난이도에서 need 단계까지 가면 열린다
const bestOf = d => M.bestMap(meta, 'normal', d);
const diffOpen = d => d === 0 || Math.max(0, ...Object.values(bestOf(d - 1))) >= C.DIFFS[d].need;
// 진행 중인 게임 저장: 단계가 시작될 때, 앱이 뒤로 갈 때, 저장하고 나갈 때. 끝난 게임은 지운다
const RUN_KEY = 'srd_run';
function saveRun() { try { const o = C.saveGame(g); if (o) localStorage.setItem(RUN_KEY, JSON.stringify(o)); } catch { /* 저장 불가 환경 */ } }
function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch { /* 저장 불가 환경 */ } }
function peekRun() { try { const o = JSON.parse(localStorage.getItem(RUN_KEY) || 'null'); const b = o && BRANCHES.find(x => x.id === o.branchId);
  return b && o.wave >= 0 ? { o, name: o.only ? b.name + ' ' : 'only' in o ? '' : b.name + ' ', wave: o.wave, diff: C.DIFFS[o.diff] ? o.diff : 0, mode: o.mode || 'normal', stage: o.stage | 0 } : null; } catch { return null; } }
const runLabel = run => (run.mode === 'stage' ? `스테이지 ${run.stage} · ${run.wave}라운드` : `${run.name}${run.mode === 'rush' ? `보스 ${run.wave}/${C.AREAS.length}` : run.wave + '라운드'}${C.MODES.some(m => m.id === run.mode) ? ' · ' + C.MODES.find(m => m.id === run.mode).name : ''}${run.diff ? ' · ' + C.DIFFS[run.diff].name : ''}`);
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
  tabNow = 'title'; scr = '';
  overlay.innerHTML = `<div class="panel ${cls}">${sheet ? '<div class="grab"></div>' : ''}${html}</div>`;
  if (!sheet) $('toast').classList.remove('on');      // 전체 화면(처음 화면·결과 등)을 띄울 때는 전투 중 알림을 치운다
  overlay.classList.add('on'); overlay.classList.toggle('sheet', sheet); overlay.scrollTop = 0; if (!sheet) paused = true;
}
// 하단 탭 5개(대기실과 그 옆 화면들): 상점 · 부대 · 전투 · 표창 · 뽑기. 탭 화면은 위(프로필·재화) · 가운데(내용 — 여기만 스크롤) · 아래(탭)로 짜인다
let tabNow = 'title', mBranch = '', cmSel = '', scr = '', cxB = '';      // scr: 지금 떠 있는 특별한 화면(menu 일시정지 · exit 종료 물음 · settings 설정) — 뒤로가기가 쓴다      // 지금 떠 있는 탭 화면(ACT 이름) · 부대 탭에서 보던 군별 · 표창 탭에서 고른 표창
const TABS = [['shop', 'cart', '상점', 'nav_shop'], ['mastery', 'paw', '부대', 'nav_unit'], ['title', 'swords', '전투', 'nav_battle'], ['commend', 'star', '표창', 'nav_cm'], ['board', 'tkt', '뽑기', 'nav_draw']];
const pic = (name, icon) => `<span class="pic"><img src="img/ic/${name}.webp" alt="" onerror="this.remove()">${ic(icon)}</span>`;      // 그림 아이콘(없으면 기호)
const navBar = cur => { const day = today(), dots = { shop: M.adLeft(meta, day, 'gem') > 0, commend: meta.medals >= M.CM_BOX, board: meta.tickets > 0 };
  return `<nav class="nav5">${TABS.map(([act, icon, label, img]) => `<button class="${act === cur ? 'on' : ''}" data-act="${act}">${pic(img, icon)}<b>${label}</b>${dots[act] && act !== cur ? '<i class="dot"></i>' : ''}</button>`).join('')}</nav>`; };
const topBar = self => { M.ensureId(meta);
  return `<div class="ltop"><button class="lprof" data-act="rank"><img src="img/icon-192.png" alt=""><span><b>${esc(meta.name)}</b><small>${meta.stage >= C.STAGES ? '스테이지 100 완료' : `스테이지 ${M.stageOpen(meta)} · ${C.stageInfo(M.stageOpen(meta)).name}`}</small></span></button>
    <button class="hbtn${meta.mute ? ' off' : ''}" data-act="mute" data-arg="${self}" aria-label="소리 ${meta.mute ? '꺼짐' : '켜짐'}">${pic(meta.mute ? 'mute' : 'sound', 'sound')}</button>
    <button class="hbtn" data-act="settings" aria-label="설정">${ic('menu')}</button></div>${resBar()}`; };
// tab: 아래 탭에서 불이 켜질 자리, self: 이 화면을 다시 그리는 ACT 이름, sub: 내용과 탭 사이에 붙는 줄(하위 메뉴·실행 버튼), keep: 스크롤 자리 유지
function tabPage(tab, self, html, sub = '', keep = false) {
  const old = overlay.querySelector('.tbody'), y = keep && old && tabNow === self ? old.scrollTop : 0;
  show(`<div class="thead">${topBar(self)}</div><div class="tbody">${html}</div>${sub ? `<div class="subbar">${sub}</div>` : ''}${navBar(tab)}`, false, 'tabp'); tabNow = self;
  if (y) overlay.querySelector('.tbody').scrollTop = y;
}
const unitSub = cur => [['mastery', '숙련도', 'mastery'], ['skins', '스킨', 'skin'], ['upgrades', '영구 강화', 'upgrade']].map(([a, t, img]) => `<button class="${a === cur ? 'on' : ''}" data-act="${a}">${pic(img, 'up')}${t}</button>`).join('');
const c2 = (c, lv) => c.text(cmVal(c, lv));      // 표창의 그 단계 효과 문구
const CM_ICON = { summon: 'plus', luck: 'ring', tile: 'target', depot: 'box', supply: 'box', elite: 'skull', boss: 'sword', crit: 'target', gamble: 'up', time: 'flag', sell: 'exit', medal: 'medal' };
const BOARD_LABEL = { big: ['특등', '표창 3장'], cm: ['표창', '1장'], m3: ['훈장', '3개'], m1: ['훈장', '1개'], xp: ['교본', '경험치'] };
const sheetHead = (title, sub) => `<div class="sh"><div><b>${title}</b><small>${sub}</small></div><button class="hbtn" data-act="resume" aria-label="닫기">${ic('x')}</button></div>`;
const unitSrc = (b, type, grp = 0) => `img/${unitArtName(b.id, C.sortType(type), grp)}.webp`;     // 계급대에 맞는 그림이 있으면 그 그림
function hide() { overlay.classList.remove('on', 'sheet'); paused = false; last = performance.now(); }
overlay.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) ACT[b.dataset.act](b.dataset.arg, b);
  else if (e.target === overlay && overlay.classList.contains('sheet')) hide(); });   // 시트 바깥(어두운 부분)을 누르면 닫힌다

// 게임에 들어갈 때(새로 출격·이어하기) 화면 쪽 상태를 처음으로 돌린다
function enter() { loadBranchArt('hero'); applySkin(); logAt = g.log.length; ui = { sel: null, target: null, trans: { t: 2.2, total: 2.2, area: g.area, ...(g.mode === 'stage' ? { top: `스테이지 ${g.stage} · 라운드 ${g.rounds}`, label: `보스 — ${C.AREAS[g.area].boss.name}` } : {}) } }; infoKey = ''; setSpeed(SPEEDS[0]); $('app').classList.remove('sel'); }

// ── 화면 ────────────────────────────────────────────────
const ACT = {
  title() {      // 대기실(전투 탭). 한 화면에 다 들어온다: 위 = 프로필·재화, 양옆 = 그림 버튼, 가운데 = 무대, 아래 = 출격 + 탭 5개
    const run = peekRun(), day = today(), ds = M.dailyState(meta, day);
    const todo = M.canAttend(meta, day) || ds.some(m => m.done && !m.got);      // 받을 보상이 있으면 빨간 점
    const tile = (act, icon, label, col, on, pic) => `<button class="lt" data-act="${act}"><span style="background:${col}">${pic ? `<img src="img/ic/${pic}.webp" alt="" onerror="this.remove()">` : ''}${ic(icon)}${on ? '<i class="dot"></i>' : ''}</span><b>${label}</b></button>`;
    show(`<div class="lwrap"><div class="lstage">
        ${topBar('title')}
        <div class="lmid">
          <div class="lcol">${tile('daily', 'list', '임무', '#ffe9a8', todo, 'mission')}${tile('rank', 'ring', '랭킹', '#d9c2ff', false, 'trophy')}</div>
          <div class="lcen"><div class="tlogo"><h1>털뭉치수비대</h1><p>계급을 올리고 병과를 조합해 고철 군단을 막아라</p></div></div>
          <div class="lcol">${tile('records', 'flag', '기록', '#f0deb0', false, 'record')}${tile('help', 'help', '게임 방법', '#bfe9ff', false, 'help')}</div>
        </div>
      </div>
      <div class="lbot">
        ${run ? `<button class="wide cont" data-act="cont">${ic('play')}이어하기 <small>${runLabel(run)}</small></button>` : ''}
        <div class="lgo"><button class="lplay${run ? ' sec' : ''}" data-act="branches"><b>${ic('play')}${run ? '새로 출격' : '출격'}</b><small>${ic('bolt')}1</small></button>
          <button class="lcoop" data-act="coop">${pic('coop', 'hand')}<b>2인 협동</b></button></div>
        <p class="sub ver">v${buildInfo.version || '0.1.0'} · 시제품${buildInfo.live || buildInfo.bundled ? ` · ${buildLabel(buildInfo.live || buildInfo.bundled)}` : ''}</p>
      </div></div>${navBar('title')}`, false, 'title tabp');
  },
  daily() {      // 오늘의 임무: 출석 + 일일 임무 3개
    const day = today(), can = M.canAttend(meta, day), ar = M.ATTEND[M.attendDay(meta)], ds = M.dailyState(meta, day), dr = M.DAILY_REWARD;
    show(`<h2>오늘의 임무</h2><p class="sub">출석과 일일 임무로 훈장·뽑기 티켓을 받습니다</p>
      <div class="hq">
        <div class="hqr${can ? ' can' : ' got'}"><span><b>출석 ${can ? `${meta.att.n % M.ATTEND.length + 1}일차` : '완료'}</b>${can ? M.rewardText(ar) : `다음 보상 · ${M.rewardText(ar)}`}</span><button class="btn gold" data-act="attend" ${can ? '' : 'disabled'}>${can ? '받기' : '내일'}</button></div>
        ${ds.map(m => `<div class="hqr${m.got ? ' got' : m.done ? ' can' : ''}"><span><b>일일</b>${m.text} <em>${m.cur}/${m.need}</em></span><button class="btn gold" data-act="dclaim" data-arg="${m.id}" ${m.done && !m.got ? '' : 'disabled'}>${m.got ? '완료' : `${ic('ticket')}${dr.t} ${ic('medal')}${dr.m}`}</button></div>`).join('')}
      </div>
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  // 출격 화면: 작전 종류(스테이지 · 무한 작전 · 보스 러시). 스테이지는 지역 10곳 × 10개 — 지역을 넘겨 보며 고른다
  branches(areaArg) {
    meta.diff = 0;
    const run = peekRun(), mode = curMode(), open = M.stageOpen(meta);
    meta.stageSel = Math.max(1, Math.min(open, meta.stageSel | 0 || open));
    const modes = `<div class="diffs">${C.MODES.map(m => { const ok = M.modeOpen(meta, m.id); return `<button class="${m.id === mode ? 'on' : ''}" data-act="mode" data-arg="${m.id}" ${ok ? '' : 'disabled'}>
        <b>${m.name}</b><small>${ok ? m.text : `스테이지 ${m.needStage} 클리어 시 열림`}</small></button>`; }).join('')}</div>`;
    const foot = `${run ? `<p class="sub" style="margin-top:1.4rem">새로 출격하면 이어하던 게임(${runLabel(run)})은 사라집니다</p>` : ''}<button class="wide sec" data-act="title">뒤로</button>`;
    if (mode !== 'stage') { const best = M.bestMap(meta, mode, 0);
      return show(`<h2>작전</h2>${modes}
        <div class="mixinfo"><p style="margin:0">${mode === 'rush' ? '지역 10곳의 보스를 차례로 상대합니다. 보스를 잡을 때마다 다음 판 군자금을 받습니다.' : '끝없이 몰려오는 적을 얼마나 오래 막는지 겨룹니다. 10라운드마다 지역이 바뀝니다.'}</p></div>
        <button class="wide go" data-act="start">${ic('play')}출격 <small>${ic('bolt')}1 · ${recText(mode, Math.max(0, ...Object.values(best)))}</small></button>${foot}`); }
    const sel = C.stageInfo(meta.stageSel), a = areaArg != null && areaArg !== '' ? Math.max(0, Math.min(C.AREAS.length - 1, +areaArg)) : sel.area, col = areaColors(a), first = a * 10 + 1;
    const mini = st => `<div class="smap" style="background:${areaColors(st.area).ground[0]}">${st.map.rows.map(r => [...r].map(ch => `<i style="${ch === 'P' ? `background:${areaColors(st.area).pad[0]}` : ch === 'R' ? 'background:#c9ad74' : ''}"></i>`).join('')).join('')}</div>`;
    show(`<h2>작전</h2>${modes}
      <div class="sarea" style="background:${col.ground[0]}"><button data-act="branches" data-arg="${a - 1}" ${a > 0 ? '' : 'disabled'} aria-label="앞 지역">◀</button>
        <div><small>지역 ${a + 1} / ${C.AREAS.length} · 스테이지 ${first}~${first + 9}</small><b>${C.AREAS[a].name}</b></div>
        <button data-act="branches" data-arg="${a + 1}" ${a < C.AREAS.length - 1 ? '' : 'disabled'} aria-label="다음 지역">▶</button></div>
      <div class="sgrid5">${Array.from({ length: 10 }, (_, i) => { const n = first + i, done = n <= meta.stage, can = n <= open;
        return `<button class="st${n === meta.stageSel ? ' on' : ''}${done ? ' done' : can ? ' now' : ' lock'}" data-act="stagesel" data-arg="${n}" ${can ? '' : 'disabled'}><b>${n}</b><small>${done ? '클리어' : can ? '도전' : '잠김'}</small></button>`; }).join('')}</div>
      <div class="sinfo">${mini(sel)}<div><b>스테이지 ${sel.n}</b><small>${sel.name} · 라운드 ${sel.rounds}</small>
        <p>보스 <b>${sel.boss.name}</b> — 10라운드마다, 그리고 마지막 라운드</p><p class="dim">${sel.boss.text}</p></div></div>
      <button class="wide go" data-act="start">${ic('play')}스테이지 ${sel.n} 출격 <small>${ic('bolt')}1 · 라운드 ${sel.rounds}</small></button>
      <p class="sub" style="margin:1rem 0 0">여섯 군별이 섞여 나오고, 조합은 같은 군별 · 같은 등급끼리 됩니다</p>${foot}`);
  },
  stagesel(n) { n = +n; if (n >= 1 && n <= M.stageOpen(meta)) { meta.stageSel = n; saveMeta(); } ACT.branches(C.stageInfo(n).area); },
  diff(i) { if (diffOpen(+i)) { meta.diff = +i; saveMeta(); } ACT.branches(); },
  mode(id) { if (M.modeOpen(meta, id)) { meta.mode = id; saveMeta(); } ACT.branches(); },
  start() {
    if (!M.spendEnergy(meta, Date.now())) return ACT.noenergy();      // 한 판에 행동력 1 (이어하기는 들지 않는다)
    saveMeta(); for (const x of BRANCHES) loadBranchArt(x.id); clearRun();
    const mode = curMode(); g = C.createGame({ meta, mode, stage: Math.min(M.stageOpen(meta), meta.stageSel | 0 || 1) }); enter();
    hide(); toast(g.mode === 'rush' ? `보스 러시 — ${C.CFG.rushPrep}초 뒤 첫 보스가 옵니다. 받은 군자금으로 부대를 꾸리세요` : '빈 칸을 누르면 그 자리에 신병이 소집됩니다', g.mode === 'rush' ? 3200 : 1800);
  },
  cont() {      // 저장해 둔 게임 이어하기
    const run = peekRun(), loaded = run && C.loadGame(run.o, meta);
    if (!loaded) { clearRun(); toast('저장된 게임을 불러오지 못했습니다'); return ACT.title(); }
    g = loaded; for (const x of BRANCHES) loadBranchArt(x.id); enter(); ui.trans = null;
    hide(); toast(`${runLabel(run)} — 이어서 합니다`);
  },
  resume() { hide(); },
  mute(back) { meta.mute = !meta.mute; saveMeta(); Sound.setMuted(meta.mute); if (!meta.mute) Sound.play('summon'); ACT[back](); },
  quit() { coopLeave(); g = null; $('app').classList.remove('sel'); ACT.title(); },
  leave() { saveRun(); ACT.quit(); },                                             // 저장하고 나가기 → 처음 화면의 '이어하기'로 돌아올 수 있다
  giveup() { coopLeave(); g.over = { win: false, reason: '작전을 포기했습니다' }; hide(); },      // 협동이면 연결을 끊고 나온다(동료는 혼자 이어간다)   // 포기 → 지금까지의 기록으로 결과 화면
  // ── 2인 협동 대기실 ──
  async coop(msg) {
    M.ensureId(meta); if (!meta.lastBranch) meta.lastBranch = BRANCHES[0].id; saveMeta(); if (coop && !g) coopLeave();
    const on = await Net.on(), busy = msg === '연결하는 중…';
    show(`<h2>2인 협동</h2><p class="sub">한 전장을 둘이 나눠 맡아 스테이지를 함께 깹니다 · 행동력 1</p>
      <div class="list"><p>· <b>발판을 위아래로 나눕니다</b> — 방장은 위쪽 ${C.CFG.duoSplit}칸, 손님은 아래쪽 ${C.SLOT_COUNT - C.CFG.duoSplit}칸. 자기 구역에만 소집·배치하고 자기 유닛만 조합합니다.</p>
        <p>· <b>스테이지는 방장이 고른 것</b>으로 합니다(내가 방장이면 스테이지 ${Math.min(M.stageOpen(meta), meta.stageSel | 0 || 1)} — 출격 화면에서 바꿉니다). 바로 다음 스테이지를 깨면 내 진행도 앞으로 갑니다.</p>
        <p>· 적과 라운드, 임무는 함께 씁니다. <b>누가 잡든 두 사람 모두 보상</b>을 받고, 군자금·훈련소·병과 강화는 각자입니다. 여섯 군별이 섞여 나오고 조합은 같은 군별끼리만 됩니다. 용사의 전체 효과와 주변 지원은 동료에게도 미칩니다.</p>
        <p>· 군자금을 보내거나 한마디를 건넬 수 있습니다. 배속은 방장이 정합니다. 훈장 ${M.COOP_MEDAL}배. 중간 저장은 되지 않습니다.</p></div>
      <h3>별명 (동료와 랭킹에 보입니다)</h3><div class="namerow"><input id="nm" maxlength="10" value="${esc(meta.name)}" autocomplete="off"><button class="btn" data-act="setname" data-arg="coop">저장</button></div>
      <p class="note cmmsg">${on ? msg || '빠른 매칭은 기다리는 사람과 바로 이어 줍니다' : '서버가 아직 연결되지 않아 협동을 할 수 없습니다 (서버 배포 대기)'}</p>
      <button class="wide" data-act="comatch" ${on && !busy ? '' : 'disabled'}>빠른 매칭</button>
      <button class="wide sec" data-act="comake" ${on && !busy ? '' : 'disabled'}>방 만들기</button>
      <div class="namerow" style="margin-top:1.1rem"><input id="rc" inputmode="numeric" maxlength="4" placeholder="방 번호 4자리" autocomplete="off"><button class="btn" data-act="cojoin" ${on && !busy ? '' : 'disabled'}>참가</button></div>
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  cobranch(id) { if (BRANCHES.some(x => x.id === id)) { meta.lastBranch = id; saveMeta(); } ACT.coop(); },
  setname(back) { const el = document.getElementById('nm'), v = M.cleanName(el && el.value); if (v.length < 2) return toast('별명은 두 글자 이상으로 정하세요'); meta.name = v; saveMeta(); toast('별명을 저장했습니다'); ACT[back](); },
  comatch() { coopJoin(() => Net.match()); },
  comake() { coopJoin(() => Net.createRoom()); },
  cojoin() { const v = (document.getElementById('rc').value || '').trim(); if (!/^\d{4}$/.test(v)) return toast('방 번호 네 자리를 입력하세요'); coopJoin(async () => ({ code: v })); },
  cowait() {
    show(`<h2>2인 협동</h2><p class="sub">방 번호 — 동료에게 알려 주세요</p><div class="roomcode">${coop.code}</div>
      <p class="note cmmsg">${coop.peer ? `${esc(coop.peer.name)} 입장 — 곧 시작합니다` : '동료를 기다리는 중…'}</p>
      <button class="wide sec" data-act="coop">취소</button>`);
  },
  // 전투 중 협동 창: 동료 상태 · 군자금 보내기 · 한마디
  cosheet() {
    if (!g || !g.duo || !coop) return;
    const cost = C.summonCost(g.branch, g.camp, g.meta), P = peerP(), ok = duoLive() && !g.over;
    show(`${sheetHead('2인 협동', `${esc(P.name)} · 방 ${coop.code}${coop.host ? ' · 내가 방장' : ''}`)}
      <div class="list"><p>${ok ? `동료 — 군자금 <b>${fmt(P.gold)}</b> · 보급품 <b>${P.supply}</b> · 훈련소 <b>Lv${P.camp + 1}</b> · 보급병 <b>${P.depot}</b>` : '<b>연결이 끊겼습니다</b> — 전장 전체를 맡아 이어가는 중'}</p>
        <p>내 구역은 <b>${g.duo.me === 0 ? '위쪽' : '아래쪽'}</b> 발판입니다. 어둡게 보이는 발판은 동료의 구역입니다.</p></div>
      <div class="up"><div><b>군자금 보내기</b><br>신병 한 명 값을 동료에게 보냅니다</div><button class="btn gold" data-act="cogift" ${ok && g.gold >= cost ? '' : 'disabled'}>${ic('coin')}${fmt(cost)}</button></div>
      <div class="emotes">${EMOTES.map((t, i) => `<button class="btn" data-act="coemote" data-arg="${i}" ${ok ? '' : 'disabled'}>${t}</button>`).join('')}</div>
      <div class="sfoot"><div class="pill gold">${ic('coin')}<b>${fmt(g.gold)}</b></div><button class="btn primary" data-act="resume">전장으로</button></div>`, true);
  },
  cogift() { if (duoLive()) cmd(['gift']); },
  coemote(i) { if (!duoLive()) return; coop.conn.send({ t: 'emote', i: +i }); hide(); toast(`나: ${EMOTES[+i]}`); },
  // ── 랭킹 ── arg = '판 이름|주간(1)·전체(0)'
  async rank(arg) {
    M.ensureId(meta); saveMeta();
    const [board, wk] = (typeof arg === 'string' && arg.includes('|') ? arg : 'stage|1').split('|'), week = wk === '1', req = ++rankReq, unit = board === 'rush' ? '마리' : board === 'endless' ? '라운드' : ' 스테이지';
    const page = body => show(`<h2>랭킹</h2>
      <div class="tabs t3 t4">${M.RANK_BOARDS.map(([k, n]) => `<button class="${k === board ? 'on' : ''}" data-act="rank" data-arg="${k}|${wk}">${n}</button>`).join('')}</div>
      <div class="tabs t2"><button class="${week ? 'on' : ''}" data-act="rank" data-arg="${board}|1">이번 주</button><button class="${week ? '' : 'on'}" data-act="rank" data-arg="${board}|0">전체</button></div>
      ${body}
      <h3>내 별명</h3><div class="namerow"><input id="nm" maxlength="10" value="${esc(meta.name)}" autocomplete="off"><button class="btn" data-act="setname" data-arg="rank">저장</button></div>
      <p class="sub" style="margin:.8rem 0 0">판을 마치면 기록이 자동으로 올라갑니다. 점수가 같으면 빨리 끝낸 쪽이 위입니다. 별명은 다음 기록부터 반영됩니다</p>
      <button class="wide sec" data-act="title">뒤로</button>`);
    page('<p class="note cmmsg">불러오는 중…</p>');
    try {
      if (!(await Net.on())) { if (req === rankReq) page('<p class="note cmmsg">서버가 아직 연결되지 않아 랭킹을 볼 수 없습니다 (서버 배포 대기)</p>'); return; }
      const r = await Net.rank(board, week, meta.uid); if (req !== rankReq || !overlay.querySelector('.tabs.t3')) return;
      page(`${r.top.length ? `<div class="rks">${r.top.map((e, i) => { const eb = BRANCHES.find(x => x.id === e.branch);
        return `<div class="rk${e.me ? ' me' : ''}"><i class="${i < 3 ? 'top' : ''}">${i + 1}</i><span>${esc(e.name)}</span><small>${eb ? eb.name : ''}</small><b>${board === 'stage' || board === 'coop' ? '스테이지 ' + e.score : e.score + unit}</b></div>`; }).join('')}</div>` : '<p class="note cmmsg">아직 기록이 없습니다 — 첫 기록을 남겨 보세요</p>'}
        <p class="sub" style="margin:.8rem 0 0">${r.rank ? `내 순위 ${r.rank}위` : '내 기록 없음'} · 상위 ${r.top.length}명 표시</p>`);
    } catch { if (req === rankReq) page('<p class="note cmmsg">랭킹을 불러오지 못했습니다 — 연결을 확인하세요</p>'); }
  },
  // ── 작전 본부의 화면들 ──
  attend() { const r = M.attend(meta, today(), rnd); if (r) { saveMeta(); Sound.play('camp'); ACT.daily(); toast(`출석 보상 — ${M.rewardText(r.reward)}${r.cms.length ? ` (${r.cms.map(c => c.name).join(', ')})` : ''}`, 2600); } },
  dclaim(id) { const r = M.dailyClaim(meta, today(), id, rnd); if (r) { saveMeta(); Sound.play('camp'); ACT.daily(); toast(`일일 임무 보상 — ${M.rewardText(r)}`, 2200); } },
  // 병과 숙련도: 군별마다 10개 병과. 판이 끝나면 그 판에서 준 피해 비율대로 경험치가 쌓인다
  mastery(id) {      // 부대 탭 — 병과 카드(그림 · 단계 · 경험치)
    const b = BRANCHES.find(x => x.id === id) || BRANCHES.find(x => x.id === mBranch) || BRANCHES.find(x => x.id === meta.lastBranch) || BRANCHES[0], mine = meta.xp[b.id] || {}, pct = Math.round(C.MASTERY.step * 100);
    mBranch = b.id;
    tabPage('mastery', 'mastery', `<div class="tabs">${BRANCHES.map(x => `<button class="${x.id === b.id ? 'on' : ''}" data-act="mastery" data-arg="${x.id}">${x.name}</button>`).join('')}</div>
      <div class="cgrid">${C.TYPE_KEYS.map(k => { const i = C.masteryInfo(mine[k] || 0), top = i.level >= C.MASTERY.max;
        return `<div class="ci"><div class="cc${i.level ? ' has' : ''}"><img src="img/units/${b.id}_${k.replace('+', '-')}.webp" alt=""><b>Lv.${i.level}</b>
          <span class="cbar"><u style="width:${top ? 100 : Math.round(i.cur / i.need * 100)}%"></u><em>${top ? '최고' : `${i.cur}/${i.need}`}</em></span></div>
          <small>${b.names[k]}<u>${b.types[k][0]}</u><i>공격 +${i.level * pct}%</i></small></div>`; }).join('')}</div>
      <p class="sub">판이 끝나면 그 판에서 싸운 병과에 경험치가 쌓입니다(준 피해 비율대로). 한 단계마다 그 병과 공격력 +${pct}% · 최고 ${C.MASTERY.max}단계</p>`, unitSub('mastery'), id != null);
  },
  skins(msg) {      // 부대 탭 > 스킨
    const b0 = BRANCHES.find(x => x.id === meta.lastBranch) || BRANCHES[0];
    tabPage('mastery', 'skins', `<p class="note cmmsg">${typeof msg === 'string' && msg ? msg : `보유 보석 ${meta.gems}개`}</p>
      <div class="skins">${M.SKINS.map(k => { const own = M.skinOwned(meta, k.id), on = meta.skins.on === k.id;
        return `<div class="skin${on ? ' on' : ''}"><img src="img/units/${k.art || b0.id}_inf.webp" onerror="this.onerror=null;this.src='img/units/${b0.id}_inf.webp'" alt=""><b>${k.name}</b>
          <button class="btn${own ? '' : ' gold'}" data-act="${own ? 'skinuse' : 'skinbuy'}" data-arg="${k.id}" ${on || (!own && meta.gems < k.cost) ? 'disabled' : ''}>${on ? '사용 중' : own ? '사용' : `${ic('gem')}${k.cost}`}</button></div>`; }).join('')}</div>
      <p class="sub" style="margin:1rem 0 0">스킨을 쓰면 내 유닛이 군별·계급에 상관없이 그 복장으로 보입니다(능력은 같음, 용사는 제 모습 그대로). 상점의 고급 보급 상자에서도 나옵니다</p>`, unitSub('skins'), typeof msg === 'string');
  },
  // 부대 표창: 모든 판에 적용되는 영구 효과. 같은 표창을 모으면 단계가 오른다
  commend(msg) {      // 표창 탭 — 표창 카드(단계 · 모은 장수). 카드를 누르면 위에 효과가 나온다
    const sum = Object.values(meta.cmN).reduce((a, n) => a + n, 0), sel = COMMENDS.find(c => c.id === cmSel) || COMMENDS[0];
    const sn = meta.cmN[sel.id] || 0, slv = M.cmLevel(sn), snx = M.cmNext(sn);
    tabPage('commend', 'commend', `<div class="cinfo"><img src="img/cm/${sel.id}.webp" alt="" onerror="this.remove()"><b>${sel.name} <em>${slv ? `${slv}단계` : '없음'}</em></b>
        <span>${slv ? c2(sel, slv) : `${c2(sel, 1)} (1단계부터)`}</span>
        <small>${snx ? `${sn}/${snx}장${slv && slv < CM_NEED.length ? ` · 다음 단계: ${c2(sel, slv + 1)}` : ''}` : '최고 단계'}</small></div>
      <p class="note cmmsg">${typeof msg === 'string' && msg ? msg : `모은 표창 ${sum}장 · 보유 훈장 ${meta.medals}개`}</p>
      <div class="cgrid">${COMMENDS.map(c => { const n = meta.cmN[c.id] || 0, lv = M.cmLevel(n), nx = M.cmNext(n);
        return `<div class="ci"><button class="cc cm${lv ? ' has' : ''}${c.id === sel.id ? ' sel' : ''}" data-act="cmsel" data-arg="${c.id}"><span class="cic"><img src="img/cm/${c.id}.webp" alt="" onerror="this.remove()">${ic(CM_ICON[c.id] || 'star')}</span><b>Lv.${lv}</b>
          <span class="cbar"><u style="width:${nx ? Math.round(n / nx * 100) : 100}%"></u><em>${nx ? `${n}/${nx}` : '최고'}</em></span></button>
          <small>${c.name.replace(/ 표창$/, '')}</small></div>`; }).join('')}</div>
      <p class="sub">모든 판에 적용되는 영구 효과입니다. 같은 표창을 모으면 단계가 오릅니다(${CM_NEED.join('·')}장). 표창 상자 · 뽑기 · 출석으로 얻습니다</p>`,
      `<button class="go" data-act="cmbox" ${meta.medals < M.CM_BOX ? 'disabled' : ''}>표창 상자 열기 ${ic('medal')}${M.CM_BOX}</button>`, msg != null);
  },
  cmsel(id) { cmSel = id; ACT.commend(''); },
  cmbox() { const c = M.buyCmBox(meta, rnd); if (!c) { Sound.play('deny'); return; } saveMeta(); Sound.play('merge');
    cmSel = c.id; ACT.commend(`★ <b>${c.name}</b> 획득 — ${M.cmLevel(meta.cmN[c.id])}단계 (${meta.cmN[c.id]}장) · 보유 훈장 ${meta.medals}개`); },
  // 보급 뽑기판: 티켓 한 장으로 한 칸. 특등을 찾거나 다 뒤집으면 새 판
  board(msg) {      // 뽑기 탭
    if (!meta.board) { meta.board = M.newBoard(rnd); saveMeta(); }
    const bd = meta.board, done = M.boardDone(bd), left = k => bd.cells.filter(c => c.r === k && !c.open).length, adl = M.adLeft(meta, today(), 'ticket');
    tabPage('board', 'board', `<div class="res"><div class="pill">${ic('ticket')}<b>${meta.tickets}</b></div><div class="pill">누적 보상 <b>${meta.flips % M.BOARD_BONUS}/${M.BOARD_BONUS}</b></div></div>
      <div class="bgrid">${bd.cells.map((c, i) => (c.open ? `<div class="bc open ${c.r}"><b>${BOARD_LABEL[c.r][0]}</b><small>${BOARD_LABEL[c.r][1]}</small></div>`
        : `<button class="bc" data-act="flip" data-arg="${i}" ${meta.tickets < 1 || done ? 'disabled' : ''}>?</button>`)).join('')}</div>
      <p class="note cmmsg">${typeof msg === 'string' && msg ? msg : (done ? '이 판은 끝났습니다 — 새 판을 까세요' : meta.tickets < 1 ? '티켓이 없습니다' : '뒤집을 칸을 고르세요')}</p>
      <p class="sub" style="margin:0">남은 칸 · 특등 ${left('big')} · 표창 ${left('cm')} · 훈장 3개 ${left('m3')} · 훈장 1개 ${left('m1')} · 숙련 교본 ${left('xp')}<br>${M.BOARD_BONUS}칸을 뒤집을 때마다 표창 1장을 더 받습니다. <b>특등</b>을 찾으면 새 판을 깔 수 있습니다<br>티켓은 판을 마치거나(10라운드마다 1장, 최대 5장) 일일 임무 · 출석으로 얻습니다</p>`,
      `<button class="go ad" data-act="ad" data-arg="ticket" data-back="board" ${adl ? '' : 'disabled'}>${ic('play')}광고로 티켓 ${adl}/${M.AD_PLACES.ticket.limit}</button>${done ? '<button class="go" data-act="newboard">새 판 깔기</button>' : ''}`, msg != null);
  },
  flip(i) {
    const o = M.flip(meta, +i, rnd); if (!o) { Sound.play('deny'); return; }
    saveMeta(); Sound.play(o.kind === 'big' ? 'hidden' : o.cms.length || o.bonus ? 'merge' : 'camp');
    const xb = o.xp && BRANCHES.find(b => b.id === o.xp.branch);
    ACT.board(`${o.kind === 'big' ? '★ 특등! ' : ''}${o.xp ? `숙련 교본 — ${xb.name} ${xb.names[o.xp.key]}(${xb.types[o.xp.key][0]}) 경험치 +${o.reward.x}` : M.rewardText(o.reward)}${o.cms.length ? ` (${o.cms.map(c => c.name).join(', ')})` : ''}${o.bonus ? ` · 누적 보상: ${o.bonus.name}` : ''}`);
  },
  newboard() { if (M.resetBoard(meta, rnd)) { saveMeta(); Sound.play('camp'); } ACT.board(); },
  // 기록: 군별 × (난이도 3 + 무한 작전 + 보스 러시)
  records() {      // 기록: 스테이지 진행 · 무한 작전 · 보스 러시 · 2인 협동
    const top = o => Math.max(0, ...Object.values(o)), cols = [['스테이지', meta.stage, C.STAGES, '/100'], ['무한 작전', top(meta.bestE), 0, '라운드'], ['보스 러시', top(meta.bestR), C.AREAS.length, '/10'], ['2인 협동', meta.stageC | 0, C.STAGES, '스테이지']];
    show(`<h2>기록</h2><p class="sub">최고 기록 · 마친 작전 ${meta.runs}회</p>
      <div class="rec2 r4">${cols.map(c => `<div class="${c[2] && c[1] >= c[2] ? 'top' : c[1] ? '' : 'none'}"><small>${c[0]}</small><b>${c[1] || '-'}</b><small>${c[3]}</small></div>`).join('')}</div>
      <p class="sub" style="margin-top:1rem">스테이지는 깬 수, 무한 작전은 막아 낸 라운드, 보스 러시는 잡은 보스 수, 2인 협동은 함께 깬 가장 높은 스테이지${M.topWave(meta) ? `<br>예전(100단계 시절) 최고 기록 ${M.topWave(meta)}단계` : ''}</p>
      <div class="list"><p>조합 도감 발견: 히든 계급 ${['wonsa', 'junwi'].filter(k => meta.found[k]).length}/2 · 전설의 용사 ${HEROES.filter(h => meta.found[h.id]).length}/${HEROES.length} · 히든 임무 ${Object.keys(meta.foundM).length}/${C.MISSIONS.filter(m => m.hidden).length}</p></div>
      <button class="wide sec" data-act="title">뒤로</button>`);
  },
  upgrades(keep) {      // 부대 탭 > 영구 강화
    tabPage('mastery', 'upgrades', `<p class="note cmmsg">보유 훈장 ${meta.medals}개</p>
      ${UPGRADES.map(u => { const lv = meta[u.key], cost = 2 + lv * 2; return `<div class="up"><div><b>${u.name} <em>Lv${lv}/${u.max}</em></b><br>${u.desc}</div>
        <button class="btn gold" data-act="buy" data-arg="${u.key}" ${lv >= u.max || meta.medals < cost ? 'disabled' : ''}>${lv >= u.max ? '최대' : `${ic('medal')}${cost}`}</button></div>`; }).join('')}
      <p class="sub">훈장은 5라운드마다 1개, 스테이지를 깨면 +10개(뒤 스테이지일수록 더 많이)</p>`, unitSub('upgrades'), keep === true);
  },
  buy(key) { const lv = meta[key], cost = 2 + lv * 2; if (meta.medals >= cost) { meta.medals -= cost; meta[key]++; saveMeta(); } ACT.upgrades(true); },
  // 행동력이 없을 때
  noenergy() {
    const day = today(), left = M.adLeft(meta, day, 'energy'), it = M.GEM_SHOP.find(x => x.id === 'energy5');
    show(`<h2>행동력이 없습니다</h2><p class="sub">한 판에 행동력 1이 듭니다. 1시간에 1씩 차고 최대 ${M.ENERGY.max}까지 모입니다 · 다음 충전까지 <b id="en-t">${mmss(M.energyWait(meta, Date.now()))}</b></p>
      <div class="up"><div><b>광고 보고 행동력 1</b><br>오늘 ${left}회 남음${Ads.testing ? ' · 시험 광고' : ''}</div><button class="btn gold" data-act="ad" data-arg="energy" data-back="branches" ${left ? '' : 'disabled'}>${ic('play')}광고</button></div>
      <div class="up"><div><b>${it.name}</b><br>보유 보석 ${meta.gems}개</div><button class="btn gold" data-act="gembuy" data-arg="${it.id}" data-back="branches" ${meta.gems < it.cost ? 'disabled' : ''}>${ic('gem')}${it.cost}</button></div>
      <button class="wide sec" data-act="title">작전 본부로</button>`);
  },
  // 보급 상점: 무료 보상(광고) · 보석 충전(결제) · 보석으로 사는 것 · 고급 보급 상자(유료 뽑기) · 스킨
  shop(msg, keep) {      // 상점 탭 — 그림 카드(위 = 무엇을 얼마나, 가운데 = 그림, 아래 = 값). 그림은 img/shop/<이름>.webp, 없으면 기호로 대신한다
    const day = today(), odds = M.pullOdds();
    // 카드 한 장: 제목 · 그림(없으면 기호) · 딱지(할인 등) · 버튼
    const card = (title, pic, icon, btn, tag = '', sub = '') => `<div class="sc">${tag ? `<i class="stag">${tag}</i>` : ''}<b>${title}</b>
      <span class="spic"><img src="img/shop/${pic}.webp" alt="" onerror="this.remove()">${ic(icon)}</span>${sub ? `<small>${sub}</small>` : ''}${btn}</div>`;
    const sec = t => `<h3 class="shead"><span>${t}</span></h3>`;
    const AD_PIC = { gem: ['gem1', 'gem'], energy: ['bolt1', 'bolt'], ticket: ['ticket1', 'ticket'] }, GEM_PIC = { gems_100: 'gem1', gems_550: 'gem2', gems_1200: 'gem3' }, BUY_PIC = { energy5: ['bolt5', 'bolt'], ticket5: ['ticket5', 'ticket'], medal30: ['medal', 'medal'] };
    tabPage('shop', 'shop', `<div class="sban"><img src="img/shop/mascot.webp" alt="" onerror="this.remove()"><p class="note cmmsg">${typeof msg === 'string' && msg ? msg : '어서 오세요! 광고를 보거나 보석으로 재화를 얻습니다'}</p></div>
      ${sec(`무료 보상${Ads.testing ? ' (시험 광고)' : ''}`)}
      <div class="sgrid">${['gem', 'energy', 'ticket'].map(k => { const p = M.AD_PLACES[k], left = M.adLeft(meta, day, k);
        return card(p.text, AD_PIC[k][0], AD_PIC[k][1], `<button class="sbtn ad" data-act="ad" data-arg="${k}" ${left ? '' : 'disabled'}>${ic('play')}광고</button>`, '', `오늘 ${left}/${p.limit}`); }).join('')}</div>
      ${sec('보석')}
      <div class="sgrid">${Store.products.map(p => card(p.name, GEM_PIC[p.id] || 'gem1', 'gem', `<button class="sbtn" data-act="pay" data-arg="${p.id}" ${Store.ready || Store.dev ? '' : 'disabled'}>${Store.ready ? '구매' : Store.dev ? '시험 구매' : '출시 후'}</button>`, p.note || '')).join('')}</div>
      ${Store.ready ? '' : '<p class="sub" style="margin:.6rem 0 0">결제는 스토어에 앱과 상품을 등록한 뒤에 연결됩니다</p>'}
      ${sec('보석으로 사기')}
      <div class="sgrid">${M.GEM_SHOP.map(it => card(it.name, (BUY_PIC[it.id] || ['gift', 'box'])[0], (BUY_PIC[it.id] || ['gift', 'box'])[1], `<button class="sbtn gem" data-act="gembuy" data-arg="${it.id}" ${meta.gems < it.cost ? 'disabled' : ''}>${ic('gem')}${it.cost}</button>`)).join('')}</div>
      ${sec('고급 보급 상자')}
      <div class="sgrid two">${card('1회 열기', 'crate1', 'box', `<button class="sbtn gem" data-act="pull" data-arg="1" ${meta.gems < M.PULL.cost ? 'disabled' : ''}>${ic('gem')}${M.PULL.cost}</button>`, '', '표창 또는 스킨')}
        ${card('10회 열기', 'crate10', 'box', `<button class="sbtn gem" data-act="pull" data-arg="10" ${meta.gems < M.PULL.cost10 ? 'disabled' : ''}>${ic('gem')}${M.PULL.cost10}</button>`, '10% 할인', '표창 또는 스킨')}</div>
      <div class="list odds"><p><b>확률 정보</b></p>${odds.map(o => `<p>${o.name} — <b>${(o.p * 100).toFixed(1)}%</b>${o.each ? ` (종류마다 ${(o.each * 100).toFixed(2)}%)` : ''}</p>`).join('')}
        <p>이미 최고 단계인 표창이 나오면 훈장 ${M.PULL.dupMedals}개, 스킨을 모두 가졌으면 보석 ${M.PULL.dupGems}개로 바뀝니다.</p></div>
      <p class="sub" style="margin:1rem 0 0">스킨은 <b>부대 › 스킨</b>에서 사고 바꿉니다</p>`, '', keep === true);
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
  skinbuy(id) { if (M.buySkin(meta, id)) { M.useSkin(meta, id); saveMeta(); applySkin(); Sound.play('merge'); ACT.skins(`${M.skinOf(meta).name} 구매 — 바로 적용했습니다`); } else Sound.play('deny'); },
  skinuse(id) { if (M.useSkin(meta, id)) { saveMeta(); applySkin(); Sound.play('camp'); ACT.skins(`${M.skinOf(meta).name} 적용`); } },
  help() {
    show(`<h2>게임 방법</h2><div class="list">
      <p>털뭉치 마을에 <b>고철 군단</b>이 쳐들어왔습니다. 털뭉치 병사들을 소집하고 계급을 올려 스테이지 100개를 깨 나가세요. 스테이지 10개마다 지역이 바뀌고, 한 스테이지는 라운드 30~50개입니다.</p>
      <p><b>1. 신병 소집</b> — <b>빈 칸을 누르면 그 자리에</b> 군자금으로 유닛을 뽑습니다(값은 아래 본부 건물에 적혀 있습니다). <b>군별(육군·해군·해병대·특공대·공군·의경)과 병과가 무작위</b>로 정해집니다. 이름표에 <b>군별과 계급</b>이 적혀 있습니다(예: 육군 병장). 가끔 한두 계급 높은 유닛이 나옵니다.</p>
      <p><b>2. 조합</b> — 유닛을 누른 뒤 <b>같은 군별 · 같은 등급(같은 색)</b>의 다른 유닛을 누르면 한 등급 위 유닛으로 진급합니다. 군별이 다르면 조합되지 않습니다. 유닛을 누르면 카드에 <b>같은 병과 조합</b> · <b>랜덤 조합</b> 버튼이 나와, 짝이 있으면 바로 조합됩니다(짝이 없으면 회색). 발밑 <b>원판의 색</b>이 등급입니다. 짝이 있는 유닛의 칸에는 노란 점선이 둘러집니다. 칸이 꽉 찼는데 짝이 없으면 낮은 등급 유닛을 <b>전역</b>시켜 자리를 내세요. 등급은 노말 · 매직 · 레어 · 영웅 · 유니크 · 전설 · 초월 7단계입니다. <b>같은 병과끼리</b> 조합하면 그 병과가 유지되고, <b>다른 병과끼리</b> 조합하면 병과가 무작위로 정해집니다.</p>
      <p><b>주둔지</b> — 전장 아래의 건물을 눌러 명령합니다. 왼쪽부터 <b>훈련소</b>(천막) · <b>병과 강화</b>(병기창) · <b>신병 소집</b>(연병장) · <b>보급창</b>(보급병 고용 · 선택 소집) · <b>특수 임무</b>(통신탑). 쓸 수 없는 건물은 흐리게 보이고, 특수 임무를 부를 수 있으면 통신탑이 빛납니다.</p>
      <p><b>3. 훈련소 강화</b> — 소집되는 신병의 기본 등급이 올라갑니다(최고 영웅). 그 위 등급은 조합으로만 올립니다.</p>
      <p><b>병과 고유 기술</b> — 다른 병과끼리 조합할 때 나오는 특수 병과 6종은 저마다 고유 기술이 있습니다(연속 포격, 응급 처치, 조준 사격, 오염, 표적 지정, 지휘 통신). 유닛을 누르면 카드에 적혀 있습니다.</p>
      <p><b>전설의 용사</b> — <b>${GRADES[4].name}</b> 등급의 <b>기본 병과</b> 둘(예: 보병 + 포병)을 조합하면 고유 기술을 가진 용사가 태어납니다. 여섯 가지 짝마다 다른 용사가 나오고, 종류마다 한 명뿐입니다. 용사에 ${GRADES[5].name} 등급 유닛을 조합하면 ${GRADES[6].name}로 <b>각성</b>합니다. 조합식은 조합 도감에 있습니다.</p>
      <p><b>히든 계급</b> — 정규 계급표에 없는 특수 계급이 있습니다. 특정 조합이나 소집 때 낮은 확률로 나타나며, 주변 아군을 강화합니다. 발견하면 조합 도감에 기록됩니다.</p>
      <p><b>보급품</b> — 보스 격파, 특수 임무, 임무 완수로 얻습니다. <b>선택 소집</b>(원하는 병과 고르기), <b>진급 심사</b>(유닛 선택 후 도전: 등급이 낮을수록 잘 붙고, 15%는 강등. 전설 등급부터는 받을 수 없음), <b>병과 교체</b>(유닛 선택 후: 등급은 그대로 두고 병과만 다시 뽑기)에 씁니다.</p>
      <p><b>특수 발판</b> — 지역마다 발판 ${C.CFG.tileCount}칸이 빛납니다. ${Object.values(C.TILES).map(t => `<b style="color:${t.color};-webkit-text-stroke:.03em #4a2f1b">${t.name}</b>(${t.text})`).join(' · ')}. 그 위에 선 유닛만 효과를 받으니 가장 강한 유닛을 올려 두세요. 다음 지역으로 넘어가면 자리가 바뀝니다.</p>
      <p><b>히든 임무</b> — 임무 창 아래쪽에 조건이 가려진 임무가 있습니다. 이것저것 시도하다 보면 달성되고, 한 번 달성한 임무는 다음 판부터 조건이 보입니다.</p>
      <p><b>보급병</b> — 보급창에서 군자금으로 고용합니다(최대 ${C.CFG.depotMax}명). 라운드가 시작될 때마다 군자금을 가져오고, ${C.CFG.depotSupPer}명마다 ${C.CFG.depotSupEvery}라운드에 한 번 보급품도 가져옵니다. 일찍 고용할수록 오래 받지만 그만큼 초반 전력이 줄어듭니다.</p>
      <p><b>병과 강화</b> — 군자금으로 한 병과의 공격력을 계속 올립니다. 주력 병과에 집중하세요.</p>
      <p><b>특수 임무</b> — 정예 표적을 직접 불러냅니다. ${C.CFG.eliteTime}초 안에 잡으면 큰 보상, 못 잡으면 빠져나갑니다. 성공할수록 다음 표적이 강해집니다.</p>
      <p><b>대기실</b> — 처음 화면입니다. 아래 탭으로 오갑니다: <b>상점</b>(광고 보상·보석) · <b>부대</b>(병과 숙련도 — 판을 마치면 싸운 병과에 경험치, 스킨, 영구 강화) · <b>전투</b>(출격) · <b>표창</b>(모든 판에 적용되는 영구 효과) · <b>뽑기</b>(티켓으로 칸 뒤집기). <b>임무</b> 버튼에서 출석과 일일 임무 보상을 받습니다.</p>
      <p><b>2인 협동</b> — 본부의 <b>2인 협동</b>에서 빠른 매칭을 하거나 방 번호로 만납니다. 한 전장을 둘이 나눠 맡습니다(방장은 위쪽, 손님은 아래쪽 발판). 적과 임무는 함께 쓰고, 누가 잡든 둘 다 보상을 받습니다. 군자금과 유닛은 각자입니다.</p>
      <p><b>랭킹</b> — 판을 마치면 기록이 자동으로 올라갑니다(이번 주 · 전체). 별명은 랭킹 화면에서 바꿉니다.</p>
      <p><b>행동력</b> — 한 판을 시작할 때 1이 듭니다(이어하기는 들지 않음). 1시간에 1씩 차고 최대 ${M.ENERGY.max}까지 모입니다. 광고나 보석으로 더 받을 수 있습니다.</p>
      <p><b>보급 상점</b> — 광고를 끝까지 보면 보석·행동력·티켓을 받습니다(하루 횟수 제한). 보석으로 행동력·티켓·훈장·스킨을 사고 고급 보급 상자(표창·스킨)를 엽니다. 상자의 확률은 상점에 적혀 있습니다.</p>
      <p><b>작전 종류</b> — <b>스테이지</b>(100개, 깨면 다음이 열림) · <b>무한 작전</b>(끝없이, 스테이지 ${C.MODES[1].needStage} 클리어 시 열림) · <b>보스 러시</b>(보스 10종만 연달아, 스테이지 ${C.MODES[2].needStage} 클리어 시 열림). 출격 화면에서 고릅니다.</p>
      <p><b>4. 배치</b> — 유닛을 누른 뒤 빈 칸을 누르면 이동합니다. 사거리가 짧은 유닛은 바깥쪽, 포병·의무는 안쪽이 유리합니다.</p>
      <p><b>스테이지와 지역</b> — 스테이지 10개가 한 지역입니다(1~10 도토리 초원, 11~20 조개껍데기 해변 …). 같은 지역이라도 스테이지마다 맵(길 모양)이 다릅니다. 한 스테이지는 라운드 30~50개이고, 10라운드마다와 마지막 라운드에 그 지역의 보스가 나옵니다. 보스마다 특수 능력이 다릅니다(기절, 화염, 증원, 회피 등). 스테이지마다 유닛 없이 처음부터 시작합니다.</p>
      <p><b>패배</b> — 전장의 적이 ${C.CFG.enemyLimit}명을 넘거나, 보스를 ${C.CFG.bossTime}초 안에 잡지 못하면 패배합니다.</p>
      ${CLASS_IDS.map(c => `<p><b>${CLASS_INFO[c].name} 계열</b> — ${CLASS_INFO[c].role}</p>`).join('')}
      </div><button class="wide sec" data-act="${g ? 'menu' : 'title'}">뒤로</button>`);
  },
  // 보급창: 보급병 고용(단계마다 군자금이 들어오는 투자) + 선택 소집(보급품을 써서 원하는 기본 병과 고르기)
  pick() {
    const b = g.branch, sc = C.summonCost(b, g.camp, g.meta), can = g.supply >= C.CFG.pickSupply && g.gold >= sc && C.hasFree(g);
    const dc = C.depotCost(g), full = g.depot >= C.CFG.depotMax, inc = C.depotIncome(g), nextInc = C.depotIncome(g, undefined, g.depot + 1), sup = C.depotSupply(g);
    show(`${sheetHead('보급창', '보급병을 고용하면 라운드마다 군자금이 들어옵니다')}
      <div class="up depot"><div><b>보급병 <em>${g.depot}/${C.CFG.depotMax}명</em></b>
        <span class="pips">${Array.from({ length: C.CFG.depotMax }, (_, i) => `<i class="${i < g.depot ? 'on' : ''}"></i>`).join('')}</span>
        ${g.depot ? `라운드마다 ${ic('coin')}<b>+${fmt(inc)}</b>${sup ? ` · ${C.CFG.depotSupEvery}라운드마다 ${ic('box')}<b>+${sup}</b>` : ''}` : '아직 고용한 보급병이 없습니다'}${full ? '' : ` → 고용하면 ${ic('coin')}<b>+${fmt(nextInc)}</b>`}
        <small>라운드가 오를수록 수입도 늘어납니다 · 보급병 ${C.CFG.depotSupPer}명마다 ${C.CFG.depotSupEvery}라운드에 보급품 1개${g.depotGold ? ` · 지금까지 ${fmt(g.depotGold)} 벌었습니다` : ''}</small></div>
        <button class="btn gold" data-act="hire" ${full || g.gold < dc ? 'disabled' : ''}>${full ? '최대' : `고용 ${ic('coin')}${fmt(dc)}`}</button></div>
      <div class="up"><div><b>지원 요청</b><br>광고를 보면 군자금 ${ic('coin')}<b>+${fmt(C.adSupportGold(g))}</b> · 판마다 한 번${Ads.testing ? ' · 시험 광고' : ''}</div><button class="btn gold" data-act="adgold" ${g.adGold || duoLive() ? 'disabled' : ''}>${g.adGold ? '받음' : `${ic('play')}광고`}</button></div>
      <h3 class="hmh">선택 소집 <small>원하는 병과를 골라 소집 · 보급품 ${C.CFG.pickSupply}개 + 군자금 ${fmt(sc)}</small></h3>
      <div class="cards">${CLASS_IDS.map(c => `<button class="bcard" style="background:${CLASS_INFO[c].color};color:#10140e" data-act="pickc" data-arg="${c}" ${can ? '' : 'disabled'}>
        <img src="${unitSrc(b, [c, c])}" alt=""><span><b>${b.types[c][0]}</b><small>${CLASS_INFO[c].role}</small></span></button>`).join('')}</div>
      <div class="sfoot"><div class="pill sup">${ic('box')}<b>${g.supply}</b></div><div class="pill gold">${ic('coin')}<b>${fmt(g.gold)}</b></div><button class="btn" data-act="resume">닫기</button></div>`, true);
  },
  adgold() { if (g.adGold || duoLive()) return; watchAd(() => cmd(['ad'])); },      // 협동 중에는 광고로 멈출 수 없어 쓰지 않는다
  hire() { cmd(['hire']); },
  pickc(c) { hide(); cmd(['pick', c]); },
  // 병과 강화: 그 병과가 들어간 모든 유닛의 공격력이 오른다 (혼성 병과는 두 병과의 평균)
  upg() {
    const b = g.branch, pct = Math.round(C.CFG.upStep * 100);
    show(`${sheetHead('병과 강화', '그 병과가 들어간 모든 유닛의 공격력이 오릅니다')}
      ${CLASS_IDS.map(c => { const cost = C.classUpCost(g, c), lv = g.up[c]; return `<div class="up"><img src="${unitSrc(b, [c, c])}" alt="">
        <div><b>${CLASS_INFO[c].name} 계열 <em>Lv${lv}</em></b>
          <span class="pips">${Array.from({ length: 8 }, (_, i) => `<i class="${i < Math.min(lv, 8) ? 'on' : ''}"></i>`).join('')}</span>공격력 +${lv * pct}% → 다음 단계 +${pct}%</div>
        <button class="btn gold" data-act="upc" data-arg="${c}" ${g.gold < cost ? 'disabled' : ''}>${ic('coin')}${fmt(cost)}</button></div>`; }).join('')}
      <div class="sfoot"><div class="pill gold">${ic('coin')}<b>${fmt(g.gold)}</b></div><button class="btn primary" data-act="resume">전장으로</button></div>`, true);
  },
  upc(c) { cmd(['up', c]); },
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
  menu() {      // 일시정지 메뉴 (톱니 버튼 · 뒤로가기 버튼)
    show(`${sheetHead('일시정지', `${g.mode === 'stage' ? `스테이지 ${g.stage} · ` : ''}${g.wave}라운드 · ${C.AREAS[g.area].name}`)}
      <button class="wide" data-act="resume">${ic('play')}계속하기</button>
      <div class="mgrid">
        <button class="wide sec" data-act="missions">${ic('list')}임무</button><button class="wide sec" data-act="codex">${ic('book')}조합 도감</button>
        <button class="wide sec" data-act="help">${ic('help')}게임 방법</button><button class="wide sec" data-act="settings">${ic('menu')}설정</button>
        ${g.duo ? '' : `<button class="wide sec" data-act="restart">${ic('play')}재시작</button><button class="wide sec" data-act="leave">${ic('exit')}저장하고 나가기</button>`}
        <button class="wide sec danger" data-act="giveup">${g.duo ? '협동에서 나가기' : '도전 포기'}</button><button class="wide sec danger" data-act="exitask">게임 종료</button>
      </div>`, true); paused = true; scr = 'menu'; saveRun();
  },
  // 재시작: 이 판을 버리고 같은 군별 · 작전 · 난이도로 처음부터. 새 판이므로 행동력 1이 든다
  restart() {
    const en = M.energyNow(meta, Date.now());
    show(`${sheetHead('재시작', `${g.mode === 'stage' ? `스테이지 ${g.stage} · ` : ''}${g.wave}라운드`)}
      <p class="sub" style="margin:.4rem 0 1rem">이 판을 버리고 ${g.mode === 'stage' ? `스테이지 ${g.stage}를 ` : ''}처음부터 다시 시작합니다. 행동력 1이 듭니다(지금 ${en}).${en < 1 ? '<br><b>행동력이 없어 재시작할 수 없습니다</b>' : ''}</p>
      <button class="wide" data-act="restartgo" ${en < 1 ? 'disabled' : ''}>${ic('play')}재시작 <small>${ic('bolt')}1</small></button>
      <button class="wide sec" data-act="menu">취소</button>`, true); paused = true; scr = 'sub';
  },
  restartgo() { if (!g || g.duo) return; meta.mode = g.mode; if (g.mode === 'stage') meta.stageSel = g.stage; ACT.start(); },
  nextstage() { meta.mode = 'stage'; meta.stageSel = M.stageOpen(meta); saveMeta(); ACT.start(); },      // 결과 화면의 '다음 스테이지'
  again() { if (g && g.mode === 'stage') { meta.mode = 'stage'; meta.stageSel = Math.min(M.stageOpen(meta), g.stage); } ACT.start(); },
  // 설정: 전투 중에는 시트로, 대기실에서는 화면으로
  settings() {
    const inGame = !!g && !g.over, body = `
      <button class="wide sec" data-act="mute" data-arg="settings">${ic('sound')}소리: ${meta.mute ? '꺼짐' : '켜짐'}</button>
      <button class="wide sec" data-act="help">${ic('help')}게임 방법</button>
      ${inGame ? '' : `<button class="wide sec" data-act="rank">${ic('medal')}별명 바꾸기 · 랭킹</button>`}
      <p class="sub ver" style="margin-top:1.2rem">털뭉치수비대 v${buildInfo.version || '0.1.0'}${buildInfo.live || buildInfo.bundled ? ` · ${buildLabel(buildInfo.live || buildInfo.bundled)}` : ''}</p>`;
    if (inGame) { show(`${sheetHead('설정', '소리 · 도움말')}${body}<button class="wide sec" data-act="menu">뒤로</button>`, true); paused = true; scr = 'sub'; }
    else { show(`<h2>설정</h2>${body}<button class="wide sec" data-act="title">뒤로</button>`); scr = 'settings'; }
  },
  // 게임 종료 물음: 전투 중이면 판을 저장하고 끈다
  exitask() {
    const inGame = !!g && !g.over, text = inGame ? (g.duo ? '협동 중에 끄면 연결이 끊어집니다.' : '진행 중인 판은 저장됩니다. 다음에 "이어하기"로 돌아올 수 있습니다.') : '게임을 끌까요?';
    if (inGame) { show(`${sheetHead('게임 종료', text)}<button class="wide danger sec" data-act="exitgo">게임 종료</button><button class="wide" data-act="menu">취소</button>`, true); paused = true; scr = 'sub'; }
    else { show(`<h2>게임 종료</h2><p class="sub">${text}</p><button class="wide sec" data-act="settings">${ic('menu')}설정</button><button class="wide sec danger" data-act="exitgo">게임 종료</button><button class="wide" data-act="title">계속하기</button>`); scr = 'exit'; }
  },
  exitgo() {
    if (g && !g.over && !g.duo) saveRun();
    const A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (A && A.exitApp) A.exitApp(); else toast('여기서는 앱을 끌 수 없습니다 — 창을 닫아 주세요', 2600);
  },
  // 조합 도감: 그림으로 보는 조합 결과 · 병과와 병기 · 계급장 · 히든 계급 · 지역 보스
  codex(id) {
    const picked = ui.sel != null && g.units[ui.sel] ? C.branchOf(g, g.units[ui.sel]) : null, b = BRANCHES.find(x => x.id === id) || BRANCHES.find(x => x.id === cxB) || picked || BRANCHES[0], name = k => b.types[k][0], nick = k => b.names[k]; cxB = b.id;
    const uimg = (k, cls = 'ui') => `<img class="${cls}" src="img/units/${b.id}_${k.replace('+', '-')}.webp" alt="${name(k)}" onerror="this.style.visibility='hidden'">`;
    const mixKeys = C.TYPE_KEYS.filter(k => k.includes('+'));
    const eimg = (file, n) => `<img class="ui" src="img/${file}.webp" alt="" ${n > 1 && file === 'enemy_boss' ? `style="filter:hue-rotate(${(n - 1) * 36}deg)"` : ''}>`;
    show(`<h2>조합 도감</h2><div class="tabs">${BRANCHES.map(x => `<button class="${x.id === b.id ? 'on' : ''}" data-act="codex" data-arg="${x.id}">${x.name}</button>`).join('')}</div>
      <p class="note star" style="text-align:center">${b.name} 특성 — ${b.trait.text}</p>
      <p class="sub"><b>같은 군별 · 같은 등급</b> 두 유닛을 합치면 한 등급 위 유닛이 됩니다. 군별이 다르면 조합되지 않습니다</p>
      <h3>기본 병과 4종 — 신병 소집으로 나옵니다</h3>
      <div class="cx4">${CLASS_IDS.map(c => `<div class="ucard">${uimg(c)}<b>${nick(c)}</b><small>${name(c)} · ${CLASS_INFO[c].role}</small></div>`).join('')}</div>
      <h3>같은 병과끼리 → 같은 병과로 진급</h3>
      <div class="rcp">${uimg(CLASS_IDS[0], 'ui s')}<i>+</i>${uimg(CLASS_IDS[0], 'ui s')}<i>→</i>${uimg(CLASS_IDS[0])}<span><b>${nick(CLASS_IDS[0])}</b><small>한 등급 위 · ${name(CLASS_IDS[0])} 그대로</small></span></div>
      <h3>다른 병과끼리 → 무작위 병과로 진급</h3>
      <div class="rcp">${uimg(CLASS_IDS[0], 'ui s')}<i>+</i>${uimg(CLASS_IDS[1], 'ui s')}<i>→</i><b class="qm2">?</b><span><b>무작위 병과</b><small>한 등급 위 · 아래 10종 가운데 하나</small></span></div>
      <h3>특수 병과 6종 — 다른 병과끼리 조합할 때만 나옵니다</h3>
      ${mixKeys.map(k => { const sk = C.typeSkill(k.split('+')); return `<div class="wcard">${uimg(k)}<div><b>${nick(k)}</b> <small>${name(k)}</small><p><em>${sk.name}</em> ${sk.text}</p></div></div>`; }).join('')}
      <div class="list" style="margin-top:10px">
      <p>특수 병과는 두 기본 병과의 능력을 절반씩 가지고(예: ${name('inf+art')} = ${name('inf')} + ${name('art')}), 저마다 <b>고유 기술</b>이 하나 있습니다. 기본 병과는 고유 기술이 없는 대신 <b>전설의 용사</b>의 재료가 됩니다. 원하는 병과를 지키려면 <b>같은 병과끼리</b> 조합하세요.</p></div>
      <h2>병과 · 병기</h2>
      ${Object.entries(b.types).map(([k, [n, w]]) => `<div class="wcard">${uimg(k)}<div><b>${b.names[k]}</b> <small>${n}</small>
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
      ${HEROES.map(h => { const k = C.typeKey(h.pair); return `<div class="wcard hero" style="border-color:${h.color}"><div class="hrc">${uimg(h.pair[0], 'ui s')}<i>+</i>${uimg(h.pair[1], 'ui s')}<i>→</i><img class="hpic" src="img/units/hero_${h.id}.webp" alt="" onerror="this.style.display='none'"></div>
        <div><b>${h.name}</b> <small>${name(h.pair[0])} + ${name(h.pair[1])} → ${name(k)}</small>${meta.found[h.id] ? '<span class="tag hero">탄생시킴</span>' : ''}<p>${h.text.split(' — ')[1]}</p><p><em>각성</em> ${h.up}</p></div></div>`; }).join('')}
      <h2>작전 지역 · 보스</h2>
      ${C.AREAS.map((a, i) => `<div class="wcard${i === g.area ? ' now' : ''}">${eimg(hasArt('enemy_boss' + (i + 1)) ? 'enemy_boss' + (i + 1) : 'enemy_boss', i + 1)}
        <div><b>${a.boss.name}</b> <small>스테이지 ${i * 10 + 1}~${i * 10 + 10} · ${a.name}${i === g.area ? ' · 현재 지역' : ''}</small><p>${a.boss.text}</p></div></div>`).join('')}
      <h2>적</h2>
      <div class="cx4">${[['enemy_normal', '적 보병', '기본'], ['enemy_fast', '드론', '빠름 · 3의 배수 라운드'], ['enemy_armor', '장갑차', '단단함 · 5의 배수 라운드'], [hasArt('enemy_elite') ? 'enemy_elite' : 'enemy_armor', '정예 표적', '특수 임무']]
        .map(([f, n, t]) => `<div class="ucard">${eimg(f, 0)}<b>${n}</b><small>${t}</small></div>`).join('')}</div>
      <button class="wide" data-act="resume">전장으로</button>`);
  },
  result() {
    const stg = g.mode === 'stage', win = !!(g.over && g.over.win), medals = Math.floor(C.medalsFor(g) * (g.duo ? M.COOP_MEDAL : 1)), d = g.diff || 0, mode = g.mode;
    const modesBefore = C.MODES.map(m => M.modeOpen(meta, m.id)), rec = C.reached(g), tickets = M.runTickets(g);
    // 판을 마친 보상: 훈장 · 뽑기 티켓 · 병과 숙련 경험치 · 일일 임무 진행 · 기록
    meta.medals += medals; meta.tickets += tickets;
    let newBest = false, first = false;
    if (stg) { if (win) { first = M.stageClear(meta, g.stage); if (g.duo) meta.stageC = Math.max(meta.stageC | 0, g.stage); if (first) meta.stageSel = M.stageOpen(meta); } }      // 스테이지: 바로 다음 것을 깼으면 진행이 앞으로 간다
    else { const best = M.bestMap(meta, g.duo ? 'coop' : mode, d), bk = g.only || 'all'; newBest = rec > Math.max(0, ...Object.values(best)); best[bk] = Math.max(best[bk] || 0, rec); }
    const gains = M.addRunXp(meta, g); M.dailyRecord(meta, today(), g); meta.runs++; if (g.only) meta.lastBranch = g.only; saveMeta(); clearRun();
    const modesOpened = C.MODES.filter((m, i) => !modesBefore[i] && M.modeOpen(meta, m.id));
    g.res = { medals, tickets, gains, opened: false, modesOpened, newBest, first, rec, doubled: false, rank: null }; g.reported = true;
    Sound.play(win ? 'win' : 'lose'); ACT.resultView();
    // 랭킹에 올린다(서버가 연결돼 있을 때). 스테이지는 깼을 때만(점수 = 스테이지 번호), 그 밖에는 도달한 라운드 · 잡은 보스 수. 순위가 오면 결과 화면에 적는다
    const score = stg ? (win ? g.stage : 0) : rec;
    if (score >= 1) { M.ensureId(meta); saveMeta(); const run = g;
      Net.on().then(on => on && Net.submit({ board: M.rankBoard(run), id: meta.uid, name: meta.name, score, time: Math.round(run.time), branch: run.only || 'mix' }))
        .then(r => { if (r && r.rank && g === run) { run.res.rank = r.rank; if (overlay.classList.contains('on') && overlay.querySelector('.resbox')) ACT.resultView(); } }).catch(() => {}); }
  },
  // 광고를 보면 이번 판 훈장을 한 번 더 받는다
  adx2() { if (!g || !g.res || g.res.doubled) return; watchAd(() => { g.res.doubled = true; meta.medals += g.res.medals; saveMeta(); Sound.play('merge'); ACT.resultView(); }); },
  resultView() {
    const b = g.branch, d = g.diff || 0, mode = g.mode, stg = mode === 'stage', { medals, tickets, gains, opened, modesOpened, newBest, first, rec, doubled, rank } = g.res;
    // 최우수 유닛(누적 피해 1위)과 병과별 피해 비율
    const mvp = g.units.filter(u => u && C.own(g, u)).sort((x, y) => y.dealt - x.dealt)[0], tot = g.dealt || 1;      // 협동에서는 내 유닛 가운데
    const shares = CLASS_IDS.map(c => [c, g.dmg[c] / tot]).filter(x => x[1] > 0.005);
    show(`<h1>${g.over.win ? '승리' : '패배'}</h1><p class="sub">${g.over.reason}</p>
      <div class="card resbox" style="text-align:center;margin:1rem 0"><div class="list"><p><b>${stg ? `스테이지 ${g.stage}` : C.MODES.some(m => m.id === mode) ? C.MODES.find(m => m.id === mode).name : '털뭉치수비대'}</b>${stg ? ` · ${C.AREAS[g.area].name}` : ''}${g.duo ? ' · 2인 협동' : ''} · ${mode === 'rush' ? `격파한 보스 ${rec}/${C.AREAS.length}` : stg ? `라운드 ${Math.min(g.wave, g.rounds)}/${g.rounds}` : `도달 ${g.wave}라운드`} · 처치 ${g.kills}${first ? ' · <b class="nb">첫 클리어!</b>' : newBest ? ' · <b class="nb">최고 기록!</b>' : ''}</p>
        <p>${ic('medal')}훈장 <b>+${medals * (doubled ? 2 : 1)}</b>${doubled ? ' (광고 2배)' : g.duo ? ` (협동 ${M.COOP_MEDAL}배)` : ''} · ${ic('ticket')}뽑기 티켓 <b>+${tickets}</b></p>
        ${rank ? `<p>랭킹 · 이번 주 <b>${rank.week ? rank.week + '위' : '100위 밖'}</b> · 전체 <b>${rank.all ? rank.all + '위' : '100위 밖'}</b></p>` : ''}</div></div>
      ${medals > 0 && !doubled ? `<button class="wide sec adx" data-act="adx2">${ic('play')}광고 보고 훈장 한 번 더 <b>+${medals}</b></button>` : ''}
      ${opened || modesOpened.length ? `<div class="unlock">${opened ? `<p>🔓 <b>${C.DIFFS[d + 1].name}</b> 난이도가 열렸습니다</p>` : ''}${modesOpened.map(m => `<p>🔓 <b>${m.name}</b>${iga(m.name)} 열렸습니다</p>`).join('')}</div>` : ''}
      ${gains.length ? `<div class="card xpc"><small>병과 숙련 경험치 +${gains.reduce((a, x) => a + x.xp, 0)}</small><div class="xps">${gains.slice(0, 5).map(x => `<span>${BRANCHES.find(q => q.id === x.b).name} ${BRANCHES.find(q => q.id === x.b).names[x.key]} <b>+${x.xp}</b>${x.after > x.before ? `<em>▲${x.after}단계</em>` : ''}</span>`).join('')}</div></div>` : ''}
      ${mvp && mvp.dealt > 0 ? `<div class="card mvp"><img class="u" src="${unitPic(C.branchOf(g, mvp), mvp)}" alt="">
        <div><small>최우수 유닛 · ${C.branchOf(g, mvp).name} ${C.rankName(C.branchOf(g, mvp), mvp)}</small><b>${C.charName(C.branchOf(g, mvp), mvp)} <em>${C.typeName(C.branchOf(g, mvp), mvp)}</em></b><span>누적 피해 ${fmt(mvp.dealt)} · 전체의 ${Math.round(mvp.dealt / tot * 100)}%</span></div></div>
      <div class="share">${shares.map(([c, v]) => `<i style="flex:${v};background:${CLASS_INFO[c].color}">${v > 0.13 ? `${CLASS_INFO[c].name} ${Math.round(v * 100)}%` : v > 0.07 ? `${Math.round(v * 100)}%` : ''}</i>`).join('')}</div>
      <p class="sub" style="margin:.5rem 0 0">병과별 피해 비율 · 전체 피해 ${fmt(g.dealt)}</p>` : ''}
      ${g.duo ? '<button class="wide" data-act="coop">다시 협동</button>' : stg && g.over.win && g.stage < C.STAGES && M.stageOpen(meta) > g.stage ? `<button class="wide" data-act="nextstage">${ic('play')}다음 스테이지 ${M.stageOpen(meta)}</button><button class="wide sec" data-act="again">스테이지 ${g.stage} 다시 하기</button>` : '<button class="wide" data-act="again">다시 도전</button>'}
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
    if (!g.units[i]) { if (C.mine(g, i)) cmd(['summon', i]); else if (g.duo) toast('동료의 구역입니다'); }      // 빈 칸을 누르면 그 자리에 신병 소집
    return; }
  if (i === ui.sel) { ui.sel = ui.target = null; return; }
  if (!g.units[i]) { if (C.own(g, g.units[ui.sel]) && C.mine(g, i)) cmd(['move', ui.sel, i]); else if (g.duo) toast('동료의 구역입니다');
    ui.sel = ui.target = null; return; }      // 빈 칸으로 옮기면 선택도 풀린다 (한 번 이동하면 이동 끝)
  if (C.canMerge(g, ui.sel, i)) { ui.target = i; return; }
  ui.sel = i; ui.target = null;
});
function found(u) { if (u.hidden && !meta.found[u.hidden]) { meta.found[u.hidden] = 1; saveMeta(); } }
$('info').addEventListener('click', e => {
  const bt = e.target.closest('[data-do]'), a = bt && !bt.disabled ? bt.dataset.do : null; if (!a || !g) return;      // 버튼 안의 그림(동전·상자)을 눌러도 버튼으로 친다
  if (a === 'merge') cmd(['merge', ui.sel, ui.target]);
  if ((a === 'msame' || a === 'mrand') && ui.mates) { const m = a === 'msame' ? ui.mates.same : ui.mates.diff; if (m >= 0) cmd(['merge', m, ui.sel]); }      // 바로 조합: 결과는 고른 유닛의 자리에 선다
  if (a === 'cancel') ui.target = null;
  if (a === 'full') { ui.full = !ui.full; infoKey = ''; }      // 줄여 보이던 카드를 다 펼친다 / 다시 접는다
  if (a === 'gamble') cmd(['gamble', ui.sel]);
  if (a === 'reroll') cmd(['reroll', ui.sel]);
  if (a === 'sell') { const i = ui.sel; ui.sel = ui.target = null; cmd(['sell', i]); }
});
// 신병 소집 건물: 소집은 빈 칸을 눌러서 한다(원하는 자리에). 건물을 누르면 빈 칸을 잠깐 빛내 알려 준다
$('b-summon').onclick = () => { if (!g) return; if (!C.hasFree(g)) { toast('칸이 없습니다 — 같은 군별·등급끼리 조합하거나 짝 없는 유닛을 전역시키세요', 2600); Sound.play('deny'); return; }
  ui.sel = ui.target = null; ui.hintT = performance.now() / 1000 + 2.2; toast('소집할 빈 칸을 누르세요', 1800); };
$('b-camp').onclick = () => g && cmd(['camp']);
$('b-pick').onclick = () => g && ACT.pick();
$('b-up').onclick = () => g && ACT.upg();
$('b-mission').onclick = () => g && ACT.missions();
$('b-elite').onclick = () => g && cmd(['elite']);
$('b-menu').onclick = () => g && ACT.menu();
// 배속: 예전의 2배속이 기본이고 화면에는 ×1로 보인다(2026-11-21 사용자). speed는 실제 배수 2 · 4 · 6, 화면 표시는 그 절반 ×1 · ×2 · ×3
function setSpeed(v) { speed = okSpeed(v); $('b-speed').textContent = '×' + speed / SPEEDS[0]; }
$('b-speed').onclick = () => { if (duoLive() && !coop.host) return toast('협동에서는 방장이 배속을 정합니다');
  setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]); if (duoLive()) coop.conn.send({ t: 'speed', v: speed }); };
$('b-coop').onclick = () => g && g.duo && coop && ACT.cosheet();
document.addEventListener('visibilitychange', () => { if (document.hidden && g && !g.over && !duoLive()) { saveRun(); if (!paused) ACT.menu(); } });      // 협동 중에는 멈추지 않는다
window.addEventListener('pagehide', () => { if (g && !g.over) saveRun(); });
// ── 하단 시스템 내비게이션 바 숨기기 (Android) ──
// Capacitor의 SystemBars(기본 내장)가 앱이 켜질 때 시스템 바를 '보이기'로 맞춰 놓는다. 그래서 화면 쪽에서 직접 숨기라고 시키고,
// 앱으로 돌아왔을 때 · 화면을 눌렀을 때(바를 쓸어 올려 꺼낸 뒤)에도 다시 숨긴다. 이미 깔린 앱에서도 재설치 없이 된다(SystemBars는 처음부터 들어 있다).
let navHideAt = 0;
function hideNavBar(force) {
  const cap = window.Capacitor; if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
  const now = Date.now(); if (!force && now - navHideAt < 2500) return; navHideAt = now;
  try { const sb = cap.Plugins && cap.Plugins.SystemBars, o = { bar: 'NavigationBar' };
    const r = sb && sb.hide ? sb.hide(o) : cap.nativePromise ? cap.nativePromise('SystemBars', 'hide', o) : null; if (r && r.catch) r.catch(() => {}); } catch { /* 옛 기기 · 지원하지 않는 환경 */ }
}
hideNavBar(true); setTimeout(() => hideNavBar(true), 600); setTimeout(() => hideNavBar(true), 2000);      // 켜진 직후: 껍데기가 바를 다시 켜는 것보다 늦게 한 번 더
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => hideNavBar(true), 200); });
window.addEventListener('focus', () => hideNavBar(true));
document.addEventListener('pointerdown', () => hideNavBar(false), { passive: true });
// ── 뒤로가기 (Android 뒤로 버튼) ── 앱을 빠져나가지 않고: 전투 중이면 일시정지 메뉴, 대기실이면 종료 물음, 그 밖의 화면이면 한 단계 앞으로
function onBack() {
  if (document.getElementById('fakead')) return;                                   // 광고가 떠 있는 동안은 아무것도 하지 않는다
  const on = overlay.classList.contains('on'), panel = overlay.querySelector('.panel');
  if (g && !g.over) {                                                              // 전투 중
    if (on) { if (scr === 'menu') hide(); else ACT.menu(); return; }               // 메뉴가 떠 있으면 닫고, 다른 시트·화면이면 메뉴로
    if (ui.target != null) { ui.target = null; infoKey = ''; return; }             // 조합 미리보기 → 취소
    if (ui.sel != null) { ui.sel = null; infoKey = ''; $('app').classList.remove('sel'); return; }      // 유닛 선택 → 해제
    return ACT.menu();
  }
  if (!on || !panel) return;
  if (g && g.over) return ACT.quit();                                              // 결과 화면 → 대기실
  if (panel.classList.contains('title')) return ACT.exitask();                     // 대기실 → 종료 물음
  ACT.title();                                                                     // 그 밖의 화면(탭 · 설정 · 종료 물음 · 랭킹 …) → 대기실
}
{ const cap = window.Capacitor, capApp = cap && cap.Plugins && cap.Plugins.App, native = cap && cap.isNativePlatform && cap.isNativePlatform();
  if (native && capApp && capApp.addListener) capApp.addListener('backButton', onBack);       // 새 앱(@capacitor/app 포함): 뒤로 버튼을 직접 받는다
  else if (native) { history.pushState({ srd: 1 }, ''); window.addEventListener('popstate', () => { history.pushState({ srd: 1 }, ''); onBack(); }); }      // 옛 앱: 방문 기록으로 뒤로 버튼을 받는다
}

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
  const A = ui.sel != null ? g.units[ui.sel] : null, B = ui.target != null ? g.units[ui.target] : null, b = A ? C.branchOf(g, A) : g.branch, ownA = !A || C.own(g, A);
  // 바로 조합: 고른 유닛과 조합할 수 있는 짝(같은 군별 · 같은 등급)을 같은 병과 / 다른 병과로 나눈다. 용사는 어느 짝과 조합해도 각성이다
  const mates = A && ownA && !B ? g.units.filter(u => u && u !== A && C.canMerge(g, ui.sel, u.slot)) : [], heroA = A && C.heroOf(A);
  const mSame = heroA ? mates : mates.filter(u => C.sameType(u.type, A.type)), mDiff = heroA ? [] : mates.filter(u => !C.sameType(u.type, A.type));
  const mStar = mDiff.find(u => { const pv = C.mergePreview(g, u.slot, ui.sel); return pv && pv.hidden; });      // 다른 병과 짝 가운데 히든·용사 조합이 되는 것이 있으면 그것부터
  ui.mates = { same: mSame[0] ? mSame[0].slot : -1, diff: mStar ? mStar.slot : mDiff[0] ? mDiff[0].slot : -1 };
  const key = [mSame.length, mDiff.length, mStar ? 1 : 0, A && A.id + A.type.join('') + A.slot + ownA, B && B.id, g.wave, g.supply, g.area, CLASS_IDS.map(c => g.up[c]).join(''), g.buff.haste, g.buff.dmg, g.buff.immune, ui.full ? 1 : 0].join('|');
  if (!A) ui.full = false;
  if (key === infoKey) {      // 카드는 그대로 두고 누적 피해 숫자만 바꾼다 (카드를 통째로 다시 만들면 누르던 버튼이 사라진다)
    if (A && !B) { const d = $('u-dealt'), v = fmt(A.dealt); if (d && d.textContent !== v) d.textContent = v; }
    return;
  }
  infoKey = key;
  const el = $('info'), portrait = (u, cls = '') => `<div class="pt ${cls}"><img class="u" src="${unitPic(b, u)}" alt=""><b><i class="gdot" style="background:${GRADES[u.level].color}"></i>${C.charName(b, u)}</b><img class="ins" src="${insigUrl(C.rankInsig(b, u))}" alt=""></div>`;
  $('app').classList.toggle('sel', !!A);       // 유닛을 고른 동안에는 하단 버튼 자리까지 카드가 쓴다
  if (A && B) {
    const p = C.mergePreview(g, ui.sel, ui.target), nu = { level: p.level, type: p.type, hidden: p.hidden }, h = C.hiddenDef(b, p.hidden), gr = GRADES[p.level];
    // 같은 병과끼리는 결과가 정해져 있고, 다른 병과끼리는 병과가 무작위라 물음표로 보여 준다
    const result = p.random ? `<div class="pt res rnd" style="border-color:${gr.color}"><div class="qm" style="color:${gr.color}">?</div><b><i class="gdot" style="background:${gr.color}"></i>${h ? h.name + ' · ' : ''}무작위 병과</b></div>` : portrait(nu, 'res');
    const lost = [A, B].filter(x => x.hidden && !(h && h.hero && x.hidden === p.hidden && (x === A || !C.heroOf(A))));      // 조합하면 능력이 사라지는 재료 (각성하는 용사 자신은 빼고)
    el.innerHTML = `<div class="card"><div class="ttl"><b>조합 미리보기</b><span class="tag${h ? (h.hero ? ' hero' : ' hid') : ''}">${h ? (p.awaken ? '★ 용사 각성' : h.hero ? '★ 전설의 용사 탄생' : '★ 히든 조합') : p.random ? `${gr.name} 등급 · 병과 무작위` : `${C.rankName(b, A)} → ${C.rankName(b, nu)} 진급`}</span></div>
      <div class="mix">${portrait(A)}<span class="op">${ic('plus')}</span>${portrait(B)}<span class="op go">${ic('arrow')}</span>${result}</div>
      ${p.random ? `<p class="note">병과가 다른 ${b.name} 유닛끼리 조합하면 <b>${gr.name}</b> 등급으로 오르고, 병과는 10종 가운데 무작위로 정해집니다. 같은 병과끼리 조합하면 그 병과가 유지됩니다.</p>` : statChips(C.unitStats(b, p.level, p.type, g.meta, g.up), A.stats)}
      ${!p.random && C.typeSkill(p.type) ? `<p class="note skill"><b>${C.typeSkill(p.type).name}</b> ${C.typeSkill(p.type).text}</p>` : ''}
      ${h ? `<p class="note star">★ ${p.awaken ? `각성 — ${h.up}` : h.text}</p>` : ''}${lost.length ? `<p class="note">⚠ 재료로 쓰는 ${lost.map(x => C.rankName(b, x)).join(' · ')}의 능력은 조합하면 사라집니다</p>` : ''}
      <div class="acts"><button class="more" data-do="full">자세히</button><button class="btn" data-do="cancel">취소</button><button class="btn primary" data-do="merge">조합하기</button></div></div>`;
  } else if (A) {
    const h = C.hiddenDef(b, A.hidden), up = [A.dmgUp && `공격력 +${Math.round(A.dmgUp * 100)}%`, A.rangeUp && `사거리 +${Math.round(A.rangeUp * 100)}%`].filter(Boolean), tile = C.tileAt(g, A.slot), sk = C.typeSkill(A.type), ml = ownA ? C.masteryOf(g.meta, b.id, C.typeKey(A.type)) : 0;
    const bf = [g.buff.haste && `공격 속도 +${Math.round(g.buff.haste * 100)}%`, g.buff.dmg && `공격력 +${Math.round(g.buff.dmg * 100)}%`, g.buff.immune && '기절·화염 면역'].filter(Boolean);
    el.innerHTML = `<div class="card"><div class="unit"><img class="u" src="${unitPic(b, A)}" alt="">
      <div><small class="uline"><span class="btag" style="background:${b.color}">${b.name}</span>${C.unitWeapon(b, A)} · <b>${C.rankName(b, A)}</b><img src="${insigUrl(C.rankInsig(b, A))}" alt=""></small>
        <h3>${C.charName(b, A)}<small class="tname">${C.typeName(b, A)}</small><span class="gtag" style="background:${GRADES[A.level].color}">${GRADES[A.level].name}</span>${h ? (h.hero ? `<span class="tag hero">${A.level > h.level ? '각성 용사' : '용사'}</span>` : '<span class="tag hid">히든</span>') : ''}${ml ? `<em class="mlv">숙련 ${ml}</em>` : ''}</h3></div><button class="more" data-do="full">자세히</button></div>
      ${statChips(A.stats, null, A)}
      ${h ? `<p class="note star">★ ${h.text}${h.hero ? (A.level > h.level ? ` → <b>각성: ${h.up}</b>` : ` <span class="dim">(전설 등급 유닛과 조합하면 각성 — ${h.up})</span>`) : ''}</p>` : ''}${up.length ? `<p class="note star">주변 지원: ${up.join(' · ')}</p>` : ''}
      ${sk ? `<p class="note skill"><b>${sk.name}</b> ${sk.text}</p>` : ''}${A.guard ? '<p class="note star">응급 처치 지원: 기절·화염 시간 절반</p>' : ''}
      ${bf.length ? `<p class="note star">용사 지원: ${bf.join(' · ')}</p>` : ''}
      ${tile ? `<p class="note tile"><i style="background:${tile.color}"></i><b>${tile.name}</b> 위에 있습니다 — ${tile.text}</p>` : ''}
      <p class="note"><b>${b.name}</b> 특성 — ${b.trait.text}</p>
      <p class="note hint">${!ownA ? '동료의 유닛입니다 — 조합·이동은 동료가 합니다' : A.level < C.maxLevel(b) ? `색칠된 발판(같은 ${b.name} · 같은 등급)의 유닛을 누르면 조합 · 빈 발판을 누르면 그 자리로 이동(이동하면 선택이 풀립니다)` : '최고 계급입니다'}</p>
      <div class="acts two"><button class="btn primary" data-do="msame" ${mSame.length ? '' : 'disabled'}>${heroA ? '용사 각성' : '같은 병과 조합'}${mSame.length ? ` <b>${mSame.length}</b>` : ''}</button>
        <button class="btn${mStar ? ' star' : ' violet'}" data-do="mrand" ${mDiff.length ? '' : 'disabled'}>${mStar ? '★ 특별 조합' : '랜덤 조합'}${mDiff.length ? ` <b>${mDiff.length}</b>` : ''}</button></div>
      <div class="acts three"><button class="btn purple" data-do="gamble" ${C.canGamble(g, ui.sel) ? '' : 'disabled'}>심사 ${Math.round(C.gambleChance(A, g.meta) * 100)}% ${ic('box')}${C.CFG.gambleSupply}</button>
        <button class="btn blue" data-do="reroll" ${C.canReroll(g, ui.sel) ? '' : 'disabled'}>병과 교체 ${ic('box')}${C.CFG.rerollSupply}</button>
        <button class="btn red" data-do="sell" ${ownA ? '' : 'disabled'}>전역 ${ic('coin')}+${fmt(C.sellValue(g, A))}</button></div></div>`;
  } else el.innerHTML = '';      // 고른 유닛이 없으면 카드를 치우고 주둔지를 보여 준다
  fitCard();
}
// 카드가 전장을 가리면 그 아래 유닛을 누를 수 없다. 주둔지 높이에 들어가지 않으면 카드를 단계적으로 줄인다:
//  c1 = 안내 문구를 빼고 능력치·설명을 한 줄씩으로 → 그래도 넘치면 c2 = 이름과 버튼만.  '자세히'를 누르면(full) 다 펼쳐 보여 주고(이때만 전장 위로 올라온다) '접기'로 되돌린다
function fitCard() {
  const el = $('info'); el.classList.remove('c1', 'c2', 'full');
  if (!el.firstElementChild) return;
  const room = $('actions').offsetHeight + 1, mb = el.querySelector('.more');
  if (el.offsetHeight <= room) return;
  if (ui.full) { el.classList.add('full'); if (mb) mb.textContent = '접기'; return; }
  el.classList.add('c1'); if (el.offsetHeight > room) el.classList.add('c2');
}
// 상단바·하단 버튼 글자는 매 프레임 다시 계산하지만, 값이 바뀐 것만 화면에 쓴다 (같은 값을 다시 쓰면 그때마다 화면 배치를 새로 계산한다)
const hudEl = {}, hudVal = {};
const hud = id => hudEl[id] || (hudEl[id] = $(id));
const put = (id, v) => { if (hudVal[id] !== v) { hudVal[id] = v; hud(id).textContent = v; } };
const putW = (id, pct) => { const v = Math.round(pct) + '%', k = id + ':w'; if (hudVal[k] !== v) { hudVal[k] = v; hud(id).style.width = v; } };
const putOff = (id, off) => { const k = id + ':d'; if (hudVal[k] !== off) { hudVal[k] = off; hud(id).disabled = off; } };
const putCls = (id, cls, on) => { const k = id + ':' + cls; if (hudVal[k] !== on) { hudVal[k] = on; hud(id).classList.toggle(cls, on); } };
// 지금 지역의 보스가 몇 단계에 나오는지 (보스 러시는 몇 번째 보스인지)
const bossLabel = () => (g.mode === 'rush' ? `${g.area + 1}번째 보스` : `${Math.min(C.maxWaveOf(g), (Math.floor(Math.max(0, g.wave - 1) / 10) + 1) * 10)}라운드 보스`);
function renderHud() {
  const b = g.branch, lim = C.CFG.enemyLimit;
  put('h-area', g.mode === 'stage' ? `스테이지 ${g.stage}` : C.AREAS[g.area].name);
  put('h-wave', g.wave);
  const maxW = C.maxWaveOf(g), rush = g.mode === 'rush', fight = rush && g.enemies.some(e => e.kind === 'boss'), gap = rush ? (g.wave ? C.CFG.rushGap : C.CFG.rushPrep) : C.CFG.waveGap;
  put('h-max', maxW === Infinity ? '/∞' : '/' + maxW);
  put('h-next', g.wave >= maxW ? '최종' : fight ? '교전 중' : Math.ceil(g.nextWave) + '초');
  putW('h-nextbar', g.wave >= maxW || fight ? 100 : Math.max(0, Math.min(100, 100 - g.nextWave / gap * 100)));
  put('h-enemy', `적 ${g.enemies.length}/${lim}`);
  putW('h-enemybar', Math.min(100, g.enemies.length / lim * 100));
  putCls('g-enemy', 'warn', g.enemies.length > lim * 0.7);
  put('h-gold', fmt(g.gold)); put('h-sup', g.supply);
  const sc = C.summonCost(b, g.camp, g.meta), cc = C.campCost(b, g.camp), maxed = g.camp >= C.maxCamp(b);
  put('c-summon', `${GRADES[g.camp].name}~ · ${fmt(sc)}`); putOff('b-summon', g.gold < sc || !C.hasFree(g));
  put('t-camp', `훈련소 Lv${g.camp + 1}`); put('c-camp', maxed ? '최대' : fmt(cc));
  // 주둔지 위 한 줄 안내: 다음 단계와 이 지역 보스
  const nw = g.wave < maxW ? C.waveOf(g, g.wave + 1) : null, ar = C.AREAS[g.area], bossAt = bossLabel();
  const co = !!(g.duo && coop); if (hudVal.co !== co) { hudVal.co = co; $('b-coop').hidden = !co; }
  if (duoLive()) put('t-info', !coop.host && performance.now() - coop.beat > 2000 ? '방장을 기다리는 중…' : `동료 ${peerP().name} · 군자금 ${fmt(peerP().gold)} · 훈련소 Lv${peerP().camp + 1}`);
  else put('t-info', !nw ? '마지막 라운드입니다' : rush ? `다음 보스 ${g.wave + 1}/${maxW} · ${nw.name}` : `다음 ${g.wave + 1}라운드 ${nw.name} ${nw.count}기 · ${bossAt} ${ar.boss.name}`);
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
  put('c-elite', es === 'ready' ? '출동 가능' : es === 'active' ? `진행 ${Math.ceil(el ? el.life : 0)}초` : es === 'cd' ? `대기 ${Math.ceil(g.elite.cd)}초` : es === 'off' ? '러시 중 불가' : '1라운드부터');
  putOff('b-elite', es !== 'ready'); putCls('b-elite', 'hot', es === 'ready');
  const ms = C.missionList(g).filter(m => !m.hidden); put('c-mission', `${ms.filter(m => g.done[m.id]).length}/${ms.length}`);
}
function frame(now) {
  requestAnimationFrame(frame);
  if (!g) return;
  const lk = duoLive();
  if (lk) { if (!g.over) duoFrame(now); if (ui.trans) { ui.trans.t -= Math.min(0.1, (now - last) / 1000); if (ui.trans.t <= 0) ui.trans = null; } }      // 협동: 창을 열어도 멈추지 않는다
  else if (!paused && !g.over) {
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
    else if (l.t === 'area') { ui.trans = { t: 2.6, total: 2.6, area: l.area, label: `${bossLabel()} — ${C.AREAS[l.area].boss.name}` }; hold = lk ? 0 : 1.3; ui.sel = ui.target = null; infoKey = '';
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
window.__srd = { get game() { return g; }, C, view, duo: () => coop, back: onBack };   // 자동 검사용
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
