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

// 칸에 놓인 유닛은 세 겹으로 그린다: 카드 뒤(발판) → 캐릭터(움직임) → 카드 앞(이름표·병과·계급장)
export function drawCardBack(c, o) {
  const cols = [CLASS_INFO[o.type[0]].color, CLASS_INFO[o.type[1]].color];
  c.globalAlpha = 0.3; c.fillStyle = cols[0]; rr(c, -41, -41, 41, 82, [12, 0, 0, 12]); c.fill();
  c.fillStyle = cols[1]; rr(c, 0, -41, 41, 82, [0, 12, 12, 0]); c.fill(); c.globalAlpha = 1;
  if (o.hidden) { c.strokeStyle = GOLD; c.lineWidth = 3; c.setLineDash([6, 5]); rr(c, -41, -41, 82, 82, 12); c.stroke(); c.setLineDash([]); }
}
// 그림 파일이 있으면 그 Image, 없으면 null (그때는 drawSoldierFallback을 캐시에 그려 쓴다)
export const unitImage = (branchId, type) => unitArt(branchId, type);
export function drawSoldierFallback(c, o) { c.save(); c.translate(0, -2); c.scale(1.12, 1.12); drawSoldier(c, o.branchId, o.type, o.tier); c.restore(); }

const INSIG_COL = { bar: GOLD, chev: GOLD, dia: '#eef3f7', flower: '#eef3f7', star: GOLD };
function insigShape(c, shape, x, y) {
  c.fillStyle = c.strokeStyle = INSIG_COL[shape];
  if (shape === 'bar') { c.fillRect(x - 1.6, y - 4.5, 3.2, 9); }
  else if (shape === 'chev') { c.lineWidth = 2.2; c.lineJoin = 'miter'; c.beginPath(); c.moveTo(x - 3.6, y + 2.6); c.lineTo(x, y - 2.8); c.lineTo(x + 3.6, y + 2.6); c.stroke(); }
  else if (shape === 'dia') { c.beginPath(); c.moveTo(x, y - 4.8); c.lineTo(x + 3.6, y); c.lineTo(x, y + 4.8); c.lineTo(x - 3.6, y); c.closePath(); c.fill(); }
  else if (shape === 'flower') { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; c.beginPath(); c.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.1, 0, 7); c.fill(); }
    c.fillStyle = '#c9a23a'; c.beginPath(); c.arc(x, y, 1.4, 0, 7); c.fill(); }
  else star(c, x, y, 4.8);
}
export function drawCardFront(c, o) {
  const { type, tier, rank, hidden, insig } = o, pure = type[0] === type[1];
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // 계급장 (오른쪽 위): 계급마다 모양·개수가 달라 같은 계급을 찾기 쉽다
  if (insig) {
    const [shape, n] = insig, step = shape === 'bar' ? 5.2 : 8.6, w = (n - 1) * step + 12;
    c.fillStyle = 'rgba(12,16,10,.88)'; rr(c, 41 - w, -41, w, 15, [0, 11, 0, 7]); c.fill();
    for (let i = 0; i < n; i++) insigShape(c, shape, 41 - w + 6 + i * step, -33.5);
  }
  // 이름표 (아래): 병과 글자 + 계급 이름
  c.fillStyle = 'rgba(12,16,10,.92)'; rr(c, -41, 25, 82, 17, 7); c.fill();
  c.strokeStyle = hidden ? GOLD : ['#3d4a34', '#cfd6dc', GOLD][tier]; c.lineWidth = 2; c.stroke();
  const cls = pure ? [type[0]] : type, cw = cls.length * 14.5;
  c.font = '800 11px sans-serif';
  cls.forEach((k, i) => {
    c.fillStyle = CLASS_INFO[k].color; c.beginPath(); c.arc(-33 + i * 14.5, 33.5, 6.6, 0, 7); c.fill();
    c.fillStyle = '#10140e'; c.fillText(CLASS_INFO[k].short, -33 + i * 14.5, 34.2);
  });
  const tw = 82 - cw - 8, fs = Math.min(15, Math.floor(tw / rank.length));
  c.fillStyle = hidden ? GOLD : '#fff'; c.font = `800 ${fs}px sans-serif`; c.fillText(rank, -41 + cw + 4 + tw / 2, 34);
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
const art = {};                 // 이름 → 불러온 Image
export const artState = { version: 0 };   // 그림이 새로 준비될 때마다 올라간다 (캐시 키에 넣어 다시 그리게 함)
const fullBranch = new Set();
export function loadArt() {
  fetch('img/manifest.json').then(r => (r.ok ? r.json() : [])).then(list => {
    const byBranch = {};
    for (const name of list) { const m = /^units\/([a-z]+)_/.exec(name); if (m) byBranch[m[1]] = (byBranch[m[1]] || 0) + 1; }
    for (const name of list) {
      const im = new Image();
      im.onload = () => { art[name] = im; artState.version++; };
      im.src = `img/${name}.webp`;
    }
    for (const b in byBranch) if (byBranch[b] >= 10) fullBranch.add(b);
  }).catch(() => { /* 그림 파일이 없으면 코드 그림 사용 */ });
}
const unitArt = (branchId, type) => (fullBranch.has(branchId)
  ? art[`units/${branchId}_${type[0] === type[1] ? type[0] : type.join('-')}`] : null) || null;
export const enemyArt = kind => art['enemy_' + kind] || null;

// ── 그림 캐시: 같은 그림은 한 번만 그려 두고 복사한다 ───────────
const cache = new Map();
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
