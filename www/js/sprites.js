// 캐릭터 그림 — 코드로 그리는 2등신 군인과 적. 그림 파일 없이 군별·병과·계급대 조합을 모두 그린다.
//  · 군별   → 군복 색, 모자 종류
//  · 병과   → 들고 있는 장비 (보: 소총 / 포: 포신 / 의: 구급낭 / 통: 무전기). 혼성은 양쪽에 하나씩
//  · 계급대 → 병·부사관: 철모·약모 / 장교: 정모 / 장성: 금테 정모 + 별 + 견장
// 좌표계: 유닛은 칸 중심 (0,0), 칸 크기 88×88. 캐릭터는 위쪽, 계급 이름표는 아래쪽.
import { CLASS_INFO } from './data.js';

const SKIN = '#f1c9a5', INK = '#1b1f17', GOLD = '#ffd45e';
// 군별 차림: u 군복, d 어두운 색(바지·모자), acc 포인트 색, hat 병·부사관 모자 종류
const LOOK = {
  army:   { u: '#6f8f4e', d: '#4a6535', acc: '#c9b458', hat: 'helmet' },
  navy:   { u: '#eef2f6', d: '#2b4a7c', acc: '#2b4a7c', hat: 'sailor' },
  marine: { u: '#7c8a52', d: '#55653a', acc: '#d0453a', hat: 'helmet' },
  sf:     { u: '#5a5d6b', d: '#2b2c35', acc: '#b9c0c8', hat: 'beret' },
  air:    { u: '#6ea3d6', d: '#3b6a9c', acc: '#e8eef5', hat: 'garrison' },
  police: { u: '#9cc3ee', d: '#263a66', acc: GOLD, hat: 'cap' },
};

function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); }
  c.closePath(); c.fill();
}

// ── 장비 (오른쪽 기준으로 그리고, 왼쪽은 좌우 반전) ──────────────
const GEAR_BACK = {
  sig(c) {   // 등에 멘 무전기 + 안테나 + 전파
    c.fillStyle = '#39424a'; rr(c, 7, -12, 11, 15, 2.5); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = '#cfd6dc'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(15, -12); c.lineTo(19, -37); c.stroke();
    c.strokeStyle = CLASS_INFO.sig.color; c.lineWidth = 1.8;
    for (const r of [5, 9]) { c.beginPath(); c.arc(19, -37, r, -0.9, 0.5); c.stroke(); }
  },
  art(c) {   // 어깨에 멘 포신
    c.save(); c.translate(4, -9); c.rotate(-0.5);
    c.fillStyle = '#3e463a'; rr(c, -6, -5, 34, 10, 4); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = CLASS_INFO.art.color; rr(c, 24, -6, 5, 12, 2); c.fill(); c.stroke();
    c.restore();
  },
};
const GEAR_FRONT = {
  inf(c) {   // 소총
    c.save(); c.translate(8, 2); c.rotate(-0.95);
    c.fillStyle = '#6b4a2e'; rr(c, -12, -2.5, 10, 5.5, 1.5); c.fill();
    c.fillStyle = '#20241d'; rr(c, -3, -2, 26, 4, 1.5); c.fill(); c.fillRect(4, 1, 3.5, 6);
    c.fillStyle = '#9aa3a8'; c.fillRect(23, -1, 7, 1.8);
    c.restore();
  },
  med(c) {   // 구급낭
    c.strokeStyle = '#8a5a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -11); c.lineTo(13, 1); c.stroke();
    c.fillStyle = '#fafafa'; rr(c, 7, -1, 14, 12, 3); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#e23b4e'; c.fillRect(12.4, 1.5, 3.2, 7); c.fillRect(10.5, 3.4, 7, 3.2);
  },
};

function hat(c, L, tier, kind) {
  c.lineWidth = 1.3; c.strokeStyle = INK;
  if (tier === 0 && kind === 'helmet') {
    c.fillStyle = L.d; c.beginPath(); c.arc(0, -24, 12.5, Math.PI, 0); c.lineTo(13.5, -22); c.lineTo(-13.5, -22); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = L.acc; c.fillRect(-13, -24.5, 26, 2);
  } else if (tier === 0 && kind === 'sailor') {
    c.fillStyle = '#fff'; rr(c, -10.5, -36, 21, 9, 3); c.fill(); c.stroke();
    c.fillStyle = L.d; c.fillRect(-11.5, -29, 23, 3);
  } else if (kind === 'beret') {
    c.fillStyle = '#17181d'; c.beginPath(); c.ellipse(1.5, -30, 13.5, 7, -0.12, 0, 7); c.fill(); c.stroke();
    c.fillStyle = tier === 2 ? GOLD : L.acc; if (tier === 2) star(c, -5, -30, 4); else { c.beginPath(); c.arc(-5, -30, 2.4, 0, 7); c.fill(); }
  } else if (tier === 0 && kind === 'garrison') {
    c.fillStyle = L.d; c.beginPath(); c.moveTo(-12, -27); c.lineTo(-7, -37); c.lineTo(11, -34); c.lineTo(12, -27); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = L.acc; c.fillRect(-11, -29, 22, 1.6);
  } else {   // 정모 (장교·장성·경찰)
    c.fillStyle = kind === 'sailor' && tier > 0 ? '#fff' : L.d;
    c.beginPath(); c.ellipse(0, -33, 14, 5.5, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = L.d; rr(c, -10.5, -32, 21, 6, 1.5); c.fill(); c.stroke();
    if (tier === 2) { c.fillStyle = GOLD; c.fillRect(-10, -29.5, 20, 2.2); }
    c.fillStyle = INK; c.beginPath(); c.ellipse(0, -25.5, 11.5, 3, 0, 0, Math.PI); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.arc(0, -32.5, 2.3, 0, 7); c.fill();
  }
}

// 군인 한 명. type = [왼쪽 장비 병과, 오른쪽 장비 병과] (순수 병과는 오른쪽에만)
export function drawSoldier(c, branchId, type, tier) {
  const L = LOOK[branchId] || LOOK.army, pure = type[0] === type[1];
  const sides = pure ? [[type[0], 1]] : [[type[0], -1], [type[1], 1]];
  const gear = set => { for (const [cls, s] of sides) if (set[cls]) { c.save(); c.scale(s, 1); set[cls](c); c.restore(); } };
  c.lineJoin = 'round'; c.lineCap = 'round';
  // 그림자
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, 19, 15, 4, 0, 0, 7); c.fill();
  gear(GEAR_BACK);
  // 다리 · 전투화
  c.fillStyle = tier > 0 || branchId === 'police' ? L.d : L.u; c.strokeStyle = INK; c.lineWidth = 1.3;
  rr(c, -8, 5, 7, 11, 2); c.fill(); c.stroke(); rr(c, 1, 5, 7, 11, 2); c.fill(); c.stroke();
  c.fillStyle = '#23261f'; rr(c, -9.5, 14, 9, 5, 2); c.fill(); rr(c, 0.5, 14, 9, 5, 2); c.fill();
  // 몸통 · 팔
  const body = tier > 0 && branchId === 'navy' ? L.d : L.u;
  c.fillStyle = body; rr(c, -15, -11, 8, 15, 3.5); c.fill(); c.stroke(); rr(c, 7, -11, 8, 15, 3.5); c.fill(); c.stroke();
  rr(c, -10.5, -13, 21, 21, 5); c.fill(); c.stroke();
  c.fillStyle = SKIN; c.beginPath(); c.arc(-11, 4, 3, 0, 7); c.fill(); c.beginPath(); c.arc(11, 4, 3, 0, 7); c.fill();
  // 군별 포인트
  if (branchId === 'navy' && tier === 0) { c.fillStyle = L.d; c.beginPath(); c.moveTo(-9, -13); c.lineTo(0, -3); c.lineTo(9, -13); c.closePath(); c.fill(); }
  else if (branchId === 'marine') { c.fillStyle = L.acc; rr(c, 2, -7, 7, 3.5, 1); c.fill(); }
  else if (branchId === 'police') { c.fillStyle = GOLD; c.beginPath(); c.arc(5, -5, 2.4, 0, 7); c.fill(); c.fillStyle = L.d; c.fillRect(-1, -13, 2, 12); }
  else if (tier > 0) { c.fillStyle = branchId === 'air' ? L.d : '#2a2e24'; c.fillRect(-1, -12, 2, 10); }
  c.fillStyle = tier > 0 ? '#2a2e24' : L.d; c.fillRect(-10.5, 3, 21, 3);    // 허리띠
  if (tier === 2) { c.fillStyle = GOLD; rr(c, -15.5, -13, 8, 4, 1.5); c.fill(); rr(c, 7.5, -13, 8, 4, 1.5); c.fill(); }   // 견장
  // 머리
  c.fillStyle = SKIN; c.beginPath(); c.arc(0, -22, 11, 0, 7); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke();
  c.fillStyle = INK; c.beginPath(); c.arc(-4, -20.5, 1.7, 0, 7); c.arc(4, -20.5, 1.7, 0, 7); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.arc(0, -17.5, 2.6, 0.25, Math.PI - 0.25); c.stroke();
  hat(c, L, tier, L.hat);
  gear(GEAR_FRONT);
}

// 유닛은 네모 카드 없이 발판 위에 서 있는 모습으로 그린다. 여기서는 캐릭터에 붙는 표시(이름표·계급장)만 만든다.
// 좌표: 발판 중심 (0,0), 발은 y=+34 근처, 머리 위는 y=-50 근처.
// 그림 파일이 있으면 그 Image, 없으면 null (그때는 drawSoldierFallback을 캐시에 그려 쓴다)
export const unitImage = (branchId, type, grp) => unitArt(branchId, type, grp);
export function drawSoldierFallback(c, o) { c.save(); c.translate(0, 4); c.scale(1.25, 1.25); drawSoldier(c, o.branchId, o.type, o.tier); c.restore(); }

// ── 계급장: 실제 계급장의 생김새를 단순하게 옮긴 표시 ──
//  bar 병: 가로 막대를 위아래로 쌓는다(이등병 1 ~ 병장 4) · chev 부사관: 아래로 뾰족한 V자를 쌓는다(하사 1 ~ 상사 3) · chevstar 원사: V자 3 + 별
//  dia 위관: 다이아몬드를 옆으로(소위 1 ~ 대위 3) · gdia 준위: 금색 다이아몬드 · flower 영관: 무궁화(소령 1 ~ 대령 3) · star 장성: 별(준장 1 ~ 대장 4, 원수 5)
//  bud 경찰 순경~경사: 무궁화 봉오리 · tflower 경찰 경무관 이상: 큰 무궁화 · none 훈련병: 계급장 없음
const INSIG_COL = { bar: GOLD, chev: GOLD, chevstar: GOLD, dia: '#eef3f7', gdia: GOLD, flower: '#eef3f7', star: GOLD, bud: '#eef3f7', tflower: GOLD };
const SIDE_STEP = { dia: 8.4, gdia: 8.4, flower: 8.8, star: 8.6, bud: 6.6, tflower: 10.6 };
// 계급장 내용의 [폭, 높이]
function insigSize([shape, n]) {
  if (shape === 'none' || !n) return [0, 0];
  if (shape === 'bar') return [9, n * 1.9 + (n - 1) * 1.2];
  if (shape === 'chev') return [9.4, 4.6 + (n - 1) * 3.3];
  if (shape === 'chevstar') return [9.4 + 8.4, 4.6 + (n - 1) * 3.3];
  return [(n - 1) * SIDE_STEP[shape] + (shape === 'tflower' ? 10 : shape === 'bud' ? 6 : 8), shape === 'tflower' ? 10.4 : 9.6];
}
function vee(c, cx, top) { c.beginPath(); c.moveTo(cx - 4, top); c.lineTo(cx, top + 3.8); c.lineTo(cx + 4, top); c.stroke(); }
function flower(c, x, y, r, center) { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; c.beginPath(); c.arc(x + Math.cos(a) * r * 1.24, y + Math.sin(a) * r * 1.24, r, 0, 7); c.fill(); }
  c.fillStyle = center; c.beginPath(); c.arc(x, y, r * 0.68, 0, 7); c.fill(); }
// (x, y)를 내용의 왼쪽 위로 하여 계급장을 그린다
function drawInsig(c, insig, x, y) {
  const [shape, n] = insig, [w, h] = insigSize(insig); c.fillStyle = c.strokeStyle = INSIG_COL[shape];
  if (shape === 'bar') for (let i = 0; i < n; i++) rr(c, x, y + i * 3.1, 9, 1.9, 0.9), c.fill();
  else if (shape === 'chev' || shape === 'chevstar') { c.lineWidth = 1.9; c.lineJoin = 'miter'; c.lineCap = 'round';
    for (let i = 0; i < n; i++) vee(c, x + 4.7, y + 0.4 + i * 3.3);
    if (shape === 'chevstar') star(c, x + 9.4 + 4.4, y + h / 2, 4.2); }
  else for (let i = 0; i < n; i++) { const cx = x + (shape === 'tflower' ? 5 : shape === 'bud' ? 3 : 4) + i * SIDE_STEP[shape], cy = y + h / 2; c.fillStyle = INSIG_COL[shape];
    if (shape === 'dia' || shape === 'gdia') { c.beginPath(); c.moveTo(cx, cy - 4.8); c.lineTo(cx + 3.6, cy); c.lineTo(cx, cy + 4.8); c.lineTo(cx - 3.6, cy); c.closePath(); c.fill(); }
    else if (shape === 'flower') flower(c, cx, cy, 2.1, '#c9a23a');
    else if (shape === 'tflower') { flower(c, cx, cy, 2.6, '#d0453a'); c.fillStyle = '#2f5fbf'; c.beginPath(); c.arc(cx, cy, 1.75, 0, Math.PI); c.fill(); }      // 가운데 태극(빨강·파랑)
    else if (shape === 'bud') { c.beginPath(); c.ellipse(cx, cy - 0.6, 2.4, 3.9, 0, 0, 7); c.fill(); c.fillStyle = '#7fbf6a'; c.beginPath(); c.ellipse(cx, cy + 3.2, 2.6, 1.5, 0, 0, 7); c.fill(); }
    else star(c, cx, cy, 4.8); }
}
// 계급장 알약(바탕 포함)의 [폭, 높이]. 계급장이 없으면 [0, 0]
const badgeSize = insig => { const [w, h] = insigSize(insig); return w ? [w + 7.5, Math.max(15, h + 5.4)] : [0, 0]; };
// 도감 등 HTML 화면에서 쓸 계급장 그림 (data URL, 한 번 만들어 두고 다시 쓴다). 계급장이 없는 계급(훈련병)은 투명한 점 하나
const insigUrls = {};
export function insigUrl(insig) {
  const key = insig.join('');
  if (!insigUrls[key]) {
    const [w, h] = badgeSize(insig), k = 4, [cw, ch] = insigSize(insig);
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w * k)); cv.height = Math.max(1, Math.ceil((h || 15) * k));
    const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
    if (w) { c.fillStyle = 'rgba(62,40,22,.92)'; rr(c, 0, 0, w, h, 7.5); c.fill(); drawInsig(c, insig, (w - cw) / 2, (h - ch) / 2); }
    insigUrls[key] = cv.toDataURL();
  }
  return insigUrls[key];
}

// part: 'badge'면 계급장만, 'label'이면 이름표만, 없으면 둘 다 그린다
export function drawTag(c, o, part) {
  const { type, tier, rank, hidden, insig } = o, pure = type[0] === type[1];
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // 계급장 (머리 오른쪽 위): 계급마다 모양·개수가 달라 같은 계급을 찾기 쉽다
  if (insig && part !== 'label') {
    const [w, h] = badgeSize(insig), [cw, ch] = insigSize(insig);
    if (w) { c.fillStyle = 'rgba(62,40,22,.86)'; rr(c, 48 - w, -53, w, h, 7.5); c.fill(); drawInsig(c, insig, 48 - w + (w - cw) / 2, -53 + (h - ch) / 2); }
  }
  // 이름표 (발 아래, 제 칸 안쪽): 병과 글자 + 계급 이름. 글자 길이에 맞춰 폭이 정해진다
  if (part === 'badge') return;
  // 군별 이름(군별 색 칸) + 캐릭터 이름(바둑이 · 첨벙이 …). 계급은 머리 위 계급장과 발밑 원판 색으로 본다. 병과 글자(보·포·의·통)는 쓰지 않는다 — 조합은 같은 군별끼리만 되므로 군별이 한눈에 보여야 한다(2026-11-21 사용자)
  const bn = o.bname || '', label = o.nick || rank, long = bn.length + label.length > 6, fb = long ? 10.5 : 11.5, fs = long ? 11 : 12.5;
  c.font = `800 ${fb}px sans-serif`; const bw = bn ? Math.ceil(c.measureText(bn).width) + 7 : 0;
  c.font = `800 ${fs}px sans-serif`; const tw = Math.ceil(c.measureText(label).width), w = Math.min(99, bw + tw + 12), x0 = -w / 2;
  c.fillStyle = 'rgba(62,40,22,.9)'; rr(c, x0, 26, w, 15, 7.5); c.fill();      // 캐릭터 그림의 갈색 선과 맞춘 짙은 갈색 바탕
  c.strokeStyle = o.gcol || (hidden ? GOLD : ['#a98a5e', '#e6dcc6', GOLD][tier]); c.lineWidth = 2.2; c.stroke();      // 테두리는 계급(등급) 색
  c.fillStyle = hidden ? GOLD : '#fff6e0'; c.fillText(label, x0 + bw + 4.5 + tw / 2, 34);
  if (bn) { c.fillStyle = o.bcol; rr(c, x0 + 2.2, 27.8, bw, 11.4, 5.2); c.fill(); c.strokeStyle = 'rgba(255,246,224,.85)'; c.lineWidth = 1; c.stroke();
    c.font = `800 ${fb}px sans-serif`; c.fillStyle = '#fff'; c.fillText(bn, x0 + 2.2 + bw / 2, 34.1); }
}

// ── 적 ───────────────────────────────────────────────────
export const ENEMY_R = { normal: 12, fast: 10, armor: 17, boss: 28, elite: 21 };   // elite(특수 임무 표적)는 장갑차 그림을 크게 쓴다
export const ENEMY_DRAW = {
  normal(c) {   // 적 보병
    c.strokeStyle = INK; c.lineWidth = 1.2;
    c.fillStyle = '#a8392f'; rr(c, -6, -1, 12, 11, 3); c.fill(); c.stroke();
    c.fillStyle = '#23261f'; rr(c, -6, 8, 5, 4, 1.5); c.fill(); rr(c, 1, 8, 5, 4, 1.5); c.fill();
    c.fillStyle = '#e8bf9c'; c.beginPath(); c.arc(0, -6, 6.5, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#6e1f19'; c.beginPath(); c.arc(0, -7.5, 7.3, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = INK; c.fillRect(-3.5, -5.5, 2, 2); c.fillRect(1.5, -5.5, 2, 2);
    c.fillStyle = '#20241d'; c.save(); c.translate(5, 3); c.rotate(-0.6); c.fillRect(-2, -1.2, 13, 2.4); c.restore();
  },
  fast(c) {     // 드론
    c.strokeStyle = '#3a3320'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-7, -7); c.lineTo(7, 7); c.moveTo(7, -7); c.lineTo(-7, 7); c.stroke();
    for (const [x, y] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) {
      c.fillStyle = 'rgba(255,236,170,.45)'; c.beginPath(); c.arc(x, y, 4.6, 0, 7); c.fill();
      c.strokeStyle = '#e0a13a'; c.lineWidth = 1.2; c.stroke();
    }
    c.fillStyle = '#e0a13a'; rr(c, -4.5, -4.5, 9, 9, 3); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#ff5b4d'; c.beginPath(); c.arc(0, 0, 1.8, 0, 7); c.fill();
  },
  armor(c) {    // 장갑차
    c.strokeStyle = INK; c.lineWidth = 1.4;
    c.fillStyle = '#23261f'; for (const x of [-10, 0, 10]) { c.beginPath(); c.arc(x, 9, 5, 0, 7); c.fill(); }
    c.fillStyle = '#8d5a4a'; c.beginPath(); c.moveTo(-16, 8); c.lineTo(-16, -3); c.lineTo(-9, -9); c.lineTo(11, -9); c.lineTo(16, -2); c.lineTo(16, 8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#6f4438'; rr(c, -6, -15, 12, 7, 2); c.fill(); c.stroke();
    c.fillStyle = '#20241d'; c.fillRect(5, -13, 13, 2.6);
    c.fillStyle = '#c9d6dc'; c.fillRect(7, -6, 6, 3.5);
  },
  boss(c) {     // 적 지휘 전차
    c.strokeStyle = INK; c.lineWidth = 1.8;
    c.fillStyle = '#23261f'; rr(c, -27, 4, 54, 15, 7); c.fill(); c.stroke();
    c.fillStyle = '#55584d'; for (const x of [-19, -9.5, 0, 9.5, 19]) { c.beginPath(); c.arc(x, 11.5, 4.3, 0, 7); c.fill(); }
    c.fillStyle = '#7b1f2b'; c.beginPath(); c.moveTo(-25, 6); c.lineTo(-21, -5); c.lineTo(21, -5); c.lineTo(25, 6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#20241d'; rr(c, 8, -16, 26, 5, 2); c.fill();
    c.fillStyle = '#9c2a38'; rr(c, -13, -21, 25, 17, 6); c.fill(); c.stroke();
    c.fillStyle = GOLD; star(c, -1, -12, 6);
    c.strokeStyle = '#cfd6dc'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-9, -21); c.lineTo(-12, -31); c.stroke();
  },
};

// ── 그림 파일 (만화풍 일러스트) ────────────────────────────
// www/img/manifest.json에 적힌 그림만 불러온다. 군별 10병과가 모두 준비된 군별만 그림 파일을 쓰고,
// 아니면 위의 코드 그림을 쓴다(한 화면에 두 그림체가 섞이지 않게). 파일 이름: units/<군별>_<병과>.webp, enemy_<종류>.webp
// ── 새 그림체(2026-11-21 사용자 확정) ──────────────────────
// 유닛(동물)·적(고철 군단)·배경을 한 그림체(E 광택 캐주얼풍)로 그린다. 그림은 www/img/v2/ (만드는 법: art/ref/jobs.py → art/ref/apply.py), 목록은 www/img/v2/manifest.json.
// 목록에 없는 그림은 대신할 것을 쓴다: 조합 병과 → 첫 병과의 기본 그림, 다른 지역의 땅·길·소품 → 초원, 지역 보스 → 대장 전차.
// 주소에 ?art=1 을 붙이면 예전 그림(사람 병사 · 코드로 그린 전장)으로 본다 — 비교용이고, 새 그림이 자리 잡으면 예전 그림과 함께 없앤다.
export const V2 = !(typeof location !== 'undefined' && /[?&]art=1\b/.test(location.search));
const v2Set = new Set();        // 목록에 있는 새 그림 이름 ('ground_meadow', 'units/army_inf' …)
export const v2Has = name => v2Set.has(name);
// 새 그림 하나: 목록에 있으면 처음 찾을 때 읽기 시작하고, 다 읽힐 때까지는 null (artState.version이 올라가면 다시 찾는다)
export const v2Art = name => art['v2/' + name] || (v2Set.has(name) && loadOne('v2/' + name), null);
const v2Unit = (branchId, type) => { const k = type[0] === type[1] ? type[0] : type.join('-'); return v2Art(v2Set.has(`units/${branchId}_${k}`) ? `units/${branchId}_${k}` : `units/${branchId}_${type[0]}`); };
// 화면(<img>)에 쓸 유닛 그림 주소: 조합 병과 그림이 아직 없으면 첫 병과 그림
export const v2UnitSrc = (branchId, typeKey) => { const k = typeKey.replace('+', '-'); return `img/v2/units/${branchId}_${v2Set.size && !v2Set.has(`units/${branchId}_${k}`) ? k.split('-')[0] : k}.webp`; };

const art = {};                 // 이름 → 불러온 Image
export const artState = { version: 0 };   // 그림이 새로 준비될 때마다 올라간다 (캐시 키에 넣어 다시 그리게 함)
const fullBranch = new Set();
let artList = [];
function loadOne(name) {
  if (art[name] || loading.has(name)) return; loading.add(name);
  const im = new Image(); im.onload = () => { art[name] = im; artState.version++; }; im.src = `img/${name}.webp`;
}
const loading = new Set();
// 시작할 때는 메뉴와 전장에 바로 필요한 것(군별 기본 대기 그림, 적)만 읽는다
export function loadArt() {
  if (V2) { fetch('img/v2/manifest.json').then(r => (r.ok ? r.json() : [])).then(list => { for (const n of list) v2Set.add(n);
    for (const n of list) if (/^(units\/|enemy_)/.test(n)) loadOne('v2/' + n);      // 유닛·적은 미리 읽고, 지역 그림(땅·길·소품)은 그 지역에 들어갈 때 읽는다
    artState.version++; }).catch(() => {}); return; }
  fetch('img/manifest.json').then(r => (r.ok ? r.json() : [])).then(list => {
    artList = list; const byBranch = {};
    for (const name of list) { const m = /^units\/([a-z]+)_[a-z-]+$/.exec(name); if (m) byBranch[m[1]] = (byBranch[m[1]] || 0) + 1; }   // 공격(_atk)·계급대(_t1 …) 그림은 세지 않는다
    // 용사(units/hero_…)와 스킨(units/skin…) 그림은 쓸 때 읽는다 (loadBranchArt('hero') · loadBranchArt('skindesert') …)
    for (const name of list) if (!name.startsWith('units/') || (/^units\/[a-z]+_[a-z-]+$/.test(name) && !/^units\/(hero|skin)/.test(name))) loadOne(name);
    for (const b in byBranch) if (byBranch[b] >= 10) fullBranch.add(b);
    for (const b of wanted) loadBranchArt(b);
  }).catch(() => { /* 그림 파일이 없으면 코드 그림 사용 */ });
}
// 군별을 골라 출격할 때 그 군별의 공격 자세·계급대 그림을 마저 읽는다 (다 읽기 전에는 기본 그림이 나온다)
const wanted = new Set();
export function loadBranchArt(branchId) { wanted.add(branchId); for (const name of artList) if (name.startsWith(`units/${branchId}_`)) loadOne(name); }
// 유닛 그림 이름: 계급대(grp 0 병 ~ 4 장성)에 맞는 그림(_t1 ~ _t4)이 있으면 그것을, 없으면 아래 계급대 그림, 끝으로 기본 그림을 쓴다
const unitArtKey = (branchId, type) => `units/${branchId}_${type[0] === type[1] ? type[0] : type.join('-')}`;
export function unitArtName(branchId, type, grp = 0) {
  const base = unitArtKey(branchId, type);
  for (let t = grp; t > 0; t--) if (art[`${base}_t${t}`]) return `${base}_t${t}`;
  return base;
}
// 지금 쓰이는 그림이 몇 번째 계급대용인지 (0이면 기본 그림)
export const unitArtTier = (branchId, type, grp = 0) => { const m = /_t(\d)$/.exec(unitArtName(branchId, type, grp)); return m ? +m[1] : 0; };
const unitArt = (branchId, type, grp = 0) => (V2 ? v2Unit(branchId, type) : fullBranch.has(branchId) ? art[unitArtName(branchId, type, grp)] : null) || null;
// 공격 자세 그림(<이름>_atk): 지금 쓰는 대기 그림과 짝이 맞는 것이 있을 때만
// 새 그림체의 공격 자세: units/<군별>_<병과>_atk (384칸 = 대기 그림의 1.5배, 발 위치가 칸 가로 가운데 · 발바닥 높이는 대기 그림과 같다)
export const unitAtkImage = (branchId, type, grp = 0) => (V2 ? v2Art(`units/${branchId}_${type[0] === type[1] ? type[0] : type.join('-')}_atk`) : fullBranch.has(branchId) ? art[unitArtName(branchId, type, grp) + '_atk'] : null) || null;
export const enemyArt = kind => (V2 ? v2Art('enemy_' + kind) : art['enemy_' + kind]) || null;      // 지역 보스 그림(boss2 …)이 없으면 render.js의 bossImage가 기본 보스 그림을 쓴다
export const hasArt = name => !!art[name];     // 그림 파일이 준비됐는지 (도감에서 <img> 주소를 고를 때 쓴다)

// ── 그림 캐시: 같은 그림은 한 번만 그려 두고 복사한다 ───────────
const cache = new Map();
// box = [x0, y0, x1, y1] (그리기 좌표): 그 범위만 담은 작은 그림을 만든다. 쓸 때는 drawImage(cv, x + x0, y + y0, x1 - x0, y1 - y0).
// 정사각형 sprite()보다 빈 자리가 적어 화면에 찍는 넓이가 줄어든다.
export function spriteBox(key, k, box, paint) {
  const id = key + '@' + k.toFixed(2);
  let cv = cache.get(id);
  if (!cv) {
    if (cache.size > 400) cache.clear();
    cv = document.createElement('canvas'); cv.width = Math.ceil((box[2] - box[0]) * k); cv.height = Math.ceil((box[3] - box[1]) * k);
    const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, -box[0] * k, -box[1] * k); paint(c);
    cache.set(id, cv);
  }
  return cv;
}
export function sprite(key, half, k, paint) {
  const id = key + '@' + k.toFixed(2);
  let cv = cache.get(id);
  if (!cv) {
    if (cache.size > 400) cache.clear();
    cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(half * 2 * k);
    const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, half * k, half * k); paint(c);
    cache.set(id, cv);
  }
  return cv;
}
