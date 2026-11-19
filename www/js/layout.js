// 화면 자동 맞춤 — 앱 실행 시와 화면이 바뀔 때(회전·폴더블 접기/펴기·창 크기 변경) 기기 화면을 읽어
// ① 글자·버튼 배율 ② 전장 크기 ③ 세로/가로 배치 ④ 캔버스 해상도를 정한다.
import { FIELD } from './core.js';

const BASE_W = 390;            // 설계 기준 폭 (배율 1)
const BASE_H = 640;            // 세로 배치에서 배율 1로 다 들어가는 최소 높이
const INFO_MIN = 15;           // 정보창 최소 높이 (rem)
const SIDE_MIN = 30;           // 가로 배치의 오른쪽 패널 최소 폭 (rem)
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
    const land = W > H * 1.15;
    // 배율: 세로는 폭 기준(높이가 모자라면 줄임), 가로는 높이 기준
    // 하한: 작은 화면에서도 글자가 11px 아래로 내려가지 않게. 상한: 태블릿에서 글자·버튼만 커지지 않고 전장이 커지게.
    const s = land ? clamp(Math.min(H / 520, W / 800), 0.85, 1.8) : clamp(Math.min(W / BASE_W, H / BASE_H), 0.88, 1.6);
    root.style.fontSize = 10 * s + 'px'; root.style.setProperty('--vy', '0rem');
    app.classList.toggle('land', land);
    const rem = 10 * s, ratio = FIELD.h / FIELD.w;
    const fit = () => Math.max(120, Math.floor(land ? Math.min(H / ratio, W - SIDE_MIN * rem)
      : Math.min(W, (H - hud.offsetHeight - actions.offsetHeight - INFO_MIN * rem) / ratio)));
    let fw = fit(), fh = Math.floor(fw * ratio);
    if (!land) {
      // 세로로 긴 화면: 남는 높이의 일부를 버튼·상단바 높이로 돌려 누르기 쉽게 한다.
      // 버튼이 커지면 남는 높이가 줄어드므로 전장 크기를 한 번 더 계산한다.
      const spare = (H - hud.offsetHeight - actions.offsetHeight - fh) / rem - 22;
      root.style.setProperty('--vy', clamp(spare * 0.1, 0, 0.9).toFixed(2) + 'rem');
      fw = fit(); fh = Math.floor(fw * ratio);
    }
    canvas.style.width = fw + 'px'; canvas.style.height = fh + 'px';
    Object.assign(view, { scale: s, land, w: W, h: H, fieldW: fw, fieldH: fh });
    resizeCanvas(); if (onChange) onChange(view);
  }
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP[view.quality]);
    const cw = Math.round(view.fieldW * dpr), ch = Math.round(view.fieldH * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    view.dpr = dpr;
  }
  view.setQuality = q => { view.quality = clamp(q, 0, 2); resizeCanvas(); };
  let raf = 0; const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); };
  window.addEventListener('resize', later); window.addEventListener('orientationchange', later);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', later);
  if (window.ResizeObserver) new ResizeObserver(later).observe(app);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  apply();
  return view;
}
