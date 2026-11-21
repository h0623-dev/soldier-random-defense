// 화면 자동 맞춤 — 앱 실행 시와 화면이 바뀔 때(회전·폴더블 접기/펴기·창 크기 변경·시스템 바가 나타나고 사라질 때) 기기 화면을 읽어
// ① 글자·버튼 배율 ② 전장 크기 ③ 세로/가로 배치 ④ 캔버스 해상도를 정한다. 그런 다음 실제로 그려진 높이를 재서 주둔지가 화면 밖으로 넘치면 건물·전장을 줄인다.
import { FIELD } from './core.js';

const BASE_W = 390;            // 설계 기준 폭 (배율 1)
const BASE_H = 640;            // 세로 배치에서 배율 1로 다 들어가는 최소 높이
const HUD_EST = 5;             // 한 줄 상단바의 대략적인 높이 (rem) — 배치 방식을 고를 때만 쓴다
const CAMP_MIN = 16.5;         // 주둔지(전장 아래 건물 줄)에 남겨 둘 최소 높이 (rem). 세로가 짧은 화면은 CAMP_SHORT
const CAMP_SHORT = 13.2;
const SIDE_MIN = 34;           // 가로 배치의 오른쪽 패널 최소 폭 (rem)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const view = { scale: 1, land: false, w: 0, h: 0, fieldW: 0, fieldH: 0, dpr: 1, quality: 2 };
// 그리기 품질 단계별 최대 해상도 배율 (기기 픽셀 비율 상한). 느린 기기는 main.js가 단계를 내린다.
const DPR_CAP = [1, 1.5, 2.5];

export function initLayout(onChange) {
  const app = document.getElementById('app'), canvas = document.getElementById('field');
  const hud = document.getElementById('hud'), actions = document.getElementById('actions');
  const root = document.documentElement;
  function apply() {
    const cs = getComputedStyle(app);
    const W = app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = app.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (W < 50 || H < 50) return;
    const ratio = FIELD.h / FIELD.w;
    // 배율: 세로는 폭 기준(높이가 모자라면 줄임), 가로는 높이 기준
    // 하한: 작은 화면에서도 글자가 11px 아래로 내려가지 않게. 상한: 태블릿에서 글자·버튼만 커지지 않고 전장이 커지게.
    const sP = clamp(Math.min(W / BASE_W, H / BASE_H), 0.88, 1.6), sL = clamp(Math.min(H / 520, W / 800), 0.85, 1.8);
    // 세로 배치와 가로 배치 중 전장이 더 크게 나오는 쪽을 고른다 (정사각형에 가까운 폴더블 펼친 화면은 가로 배치가 유리)
    const estP = Math.min(W, (H - (HUD_EST + CAMP_MIN) * 10 * sP) / ratio), estL = Math.min(H / ratio, W - SIDE_MIN * 10 * sL);
    const land = W > H * 1.15 || estL > estP * 1.12;
    const s = land ? sL : sP;
    // 세로가 짧은 화면(구형 16:9 휴대폰)은 주둔지를 낮춰 전장을 키운다
    const short = !land && H / (10 * s) < 76, campMin = short ? CAMP_SHORT : CAMP_MIN;
    app.classList.toggle('short', short);
    root.style.fontSize = 10 * s + 'px'; root.style.setProperty('--vy', '0rem');
    app.classList.toggle('land', land);
    const rem = 10 * s;
    // 전장: 세로 배치는 폭에 맞추되 상단바와 주둔지 몫을 뺀 높이를 넘지 않게, 가로 배치는 높이에 맞춘다. 주둔지는 남는 높이를 모두 쓴다
    const fw = Math.max(120, Math.floor(land ? Math.min(H / ratio, W - SIDE_MIN * rem) : Math.min(W, (H - hud.offsetHeight - campMin * rem) / ratio))), fh = Math.floor(fw * ratio);
    // 건물 크기: 주둔지에 남는 높이와 폭에 맞춘다 (세로로 긴 화면에서는 건물이 커지고, 짧은 화면에서는 작아진다)
    const campH = land ? H - hud.offsetHeight : H - hud.offsetHeight - fh, campW = land ? W - fw : W;
    app.classList.toggle('tall', !land && campH / rem > 25.5);      // 주둔지가 넉넉하면 보스 안내를 함께 보여 준다
    let bs = clamp(Math.min((campH / rem - 8.2) / 8.4, campW / rem / 38), 0.72, 1.6), fW = fw, fH = fh;
    // 세로 배치에서는 캔버스를 화면 폭 가득 편다: 전장(4:5)이 폭보다 좁으면 양옆 남는 자리에 땅 그림을 이어 그린다(render.js) — 빈 띠가 보이지 않게
    const put = () => { root.style.setProperty('--bs', bs.toFixed(2)); canvas.style.width = (land ? fW : Math.max(fW, Math.floor(W))) + 'px'; canvas.style.height = fH + 'px'; };
    put();
    // 실제로 재서 맞춘다: 위 계산은 어림값이라(글꼴·간판 글자 수·기기마다 높이가 조금씩 다르다) 주둔지 내용이 화면 아래로 넘칠 수 있다.
    // 넘치면 ① 건물을 조금씩 줄이고 ② 그래도 넘치면 전장을 그만큼 줄인다. 넘치지 않을 때까지 몇 번 되풀이한다.
    const inner = app.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom);      // 쓸 수 있는 맨 아래(안전 영역 안쪽)
    const over = () => (actions.offsetParent === null ? 0 : Math.max(actions.scrollHeight - actions.clientHeight, actions.getBoundingClientRect().bottom - inner));
    for (let i = 0; i < 10; i++) { const o = over(); if (o <= 0.5) break;
      if (bs > 0.72) bs = Math.max(0.72, bs - Math.max(0.04, o / (8.4 * rem)));      // 건물은 누르기 좋은 크기(0.72) 아래로는 줄이지 않는다
      else { fH = Math.max(120, Math.floor(fH - o - 1)); fW = Math.floor(fH / ratio); }
      put(); }
    view.fit = { over: Math.max(0, Math.round(over())), bs: +bs.toFixed(2) };      // 검사용: 맞춘 뒤에도 넘치는 높이(0이어야 한다)
    Object.assign(view, { scale: s, land, w: W, h: H, fieldW: fW, fieldH: fH, canvasW: land ? fW : Math.max(fW, Math.floor(W)) });      // fieldW × fieldH = 전장, canvasW = 양옆 여백까지 포함한 캔버스 폭
    resizeCanvas(); if (onChange) onChange(view);
  }
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP[view.quality]);
    const cw = Math.round((view.canvasW || view.fieldW) * dpr), ch = Math.round(view.fieldH * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    view.dpr = dpr;
  }
  view.setQuality = q => { view.quality = clamp(q, 0, 2); resizeCanvas(); };
  let raf = 0; const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); };
  window.addEventListener('resize', later); window.addEventListener('orientationchange', later);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', later);
  if (window.ResizeObserver) new ResizeObserver(later).observe(app);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  window.addEventListener('load', later); window.addEventListener('pageshow', later);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) later(); });
  for (const im of document.querySelectorAll('#actions img')) if (!im.complete) im.addEventListener('load', later, { once: true });      // 건물 그림이 늦게 뜨면 높이가 달라진다
  view.refit = later;      // 화면 쪽에서 다시 맞추라고 부를 때(전투 시작 · 주둔지 내용이 바뀔 때)
  apply(); for (const ms of [300, 1200, 3000]) setTimeout(later, ms);      // 켜진 직후에는 시스템 바가 사라지며 화면 크기가 바뀌므로 몇 번 더 맞춘다
  return view;
}
