// 전장 그리기 — 위에서 비스듬히 내려다본 느낌. 바닥은 두께가 있는 발판, 캐릭터는 그 위에 서 있고 아래쪽 줄이 위쪽 줄을 가린다.
import { CLASS_INFO, GRADES } from './data.js';
import { FIELD, CELL, CFG, AREAS, TILES, unitRange, rankGroup, canMerge, sameType, rankName, rankInsig, mergePreview, heroOf, branchOf, charName, mine, own } from './core.js';
import { drawTag, drawSoldierFallback, unitImage, unitAtkImage, unitArtTier, ENEMY_DRAW, ENEMY_R, sprite, spriteBox, enemyArt, loadArt } from './sprites.js';
loadArt();

const DEPTH = 18;                                      // 발판 블록 옆면 두께 (높이감)
const FEET = 27, CHAR = 88;                            // 발판 중심에서 캐릭터 발까지, 캐릭터 그림 크기. 캐릭터가 칸을 거의 채우도록 잡은 값이다(머리는 윗칸 쪽으로 조금 넘어가도 된다 — 이름표는 맨 나중에 따로 찍는다)
const OUTLINE = 2.2, OUTLINE_COL = '#38220f';          // 캐릭터 둘레의 짙은 갈색 윤곽선 굵기(전장 단위)와 색. 옅은 수채 그림이 바닥에 묻히지 않게 한다
// 계급대(계급장 모양으로 구분): 병 · 부사관 · 위관 · 영관 · 장성. 계급대가 오를수록 몸집과 장식이 달라진다
const RANK_SIZE = [0.93, 0.96, 0.99, 1.02, 1.05, 1.08, 1.12];      // 계급(7단계)이 오를수록 조금씩 커진다
const FT_BOX = [-22, -6, 22, 9], UB_BOX = [-40, -16, 40, 24], BADGE_BOX = [8, -55, 50, -33], LABEL_BOX = [-50, 24, 50, 44];      // 미리 그려 두는 조각들의 범위 (유닛 기준 좌표)
// 받침대는 계급(등급) 색: 이등병은 없고, 병장부터 초록 · 파랑 · 보라 · 주황 · 금 · 빨강 원판 위에 선다 (같은 계급을 색으로 찾게)
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // 장식 배치용 고정 난수

// ── 지역별 배경 색과 장식 ──────────────────────────────────
//  ground 땅(위→아래) · speck 땅 무늬(밝은/어두운) · road [테두리, 길, 길 가운데, 진행 표시] · pad [윗면 A, 윗면 B, 옆면 위, 옆면 아래, 밝은 모서리, 어두운 모서리]
const THEMES = {
  meadow:   { ground: ['#46683a', '#35522d'], speck: ['rgba(140,190,100,.16)', 'rgba(20,40,18,.2)'], road: ['#4a3b25', '#c9ad74', '#d6bc86', 'rgba(110,84,46,.5)'],
              pad: ['#a9bb6e', '#9db063', '#5f6f3a', '#46532b', '#d3e39a', '#6f7f43'], decor: 'bush', tuft: 'grass' },
  beach:    { ground: ['#3d93ad', '#2a6f8c'], speck: ['rgba(255,255,255,.2)', 'rgba(10,50,80,.2)'], road: ['#a8915a', '#ecdba2', '#f5e7b8', 'rgba(150,120,60,.45)'],
              pad: ['#e2cf96', '#d6c287', '#a38b55', '#836d3f', '#f6e9bd', '#b39a62'], decor: 'palm', tuft: 'mound' },
  desert:   { ground: ['#d9a95c', '#bf8c43'], speck: ['rgba(255,235,180,.25)', 'rgba(120,70,20,.18)'], road: ['#8a6532', '#f0d9a0', '#f7e6b8', 'rgba(140,100,50,.45)'],
              pad: ['#d2804f', '#c67444', '#93492a', '#70341c', '#eda477', '#a65a35'], decor: 'cactus', tuft: 'mound' },
  snow:     { ground: ['#e3edf5', '#c5d5e4'], speck: ['rgba(255,255,255,.6)', 'rgba(120,150,180,.2)'], road: ['#667487', '#a9b6c5', '#b8c4d1', 'rgba(70,85,105,.45)'],
              pad: ['#f6fafc', '#e7eff6', '#a5b8cb', '#8399b0', '#ffffff', '#b9c9d9'], decor: 'pine', tuft: 'mound' },
  city:     { ground: ['#4c5159', '#3a3e45'], speck: ['rgba(255,255,255,.07)', 'rgba(0,0,0,.2)'], road: ['#22252a', '#6a6f78', '#777d87', 'rgba(255,210,90,.55)'],
              pad: ['#bdb7aa', '#aea89b', '#77726a', '#5a564f', '#dcd6c8', '#8b867b'], decor: 'rubble' },
  jungle:   { ground: ['#1f4d2e', '#153821'], speck: ['rgba(110,200,90,.16)', 'rgba(5,25,10,.3)'], road: ['#3a2b17', '#8c7148', '#9a7f55', 'rgba(60,40,15,.5)'],
              pad: ['#76a350', '#699546', '#3f612d', '#2d4720', '#a3cc78', '#507a36'], decor: 'palm', tuft: 'grass' },
  volcano:  { ground: ['#3b2b29', '#281b1b'], speck: ['rgba(255,120,40,.3)', 'rgba(0,0,0,.3)'], road: ['#160e0e', '#6c5852', '#7a665f', 'rgba(255,140,60,.5)'],
              pad: ['#91867d', '#82776f', '#4e443e', '#372f2a', '#b5aa9f', '#5f554e'], decor: 'rock' },
  harbor:   { ground: ['#2f6682', '#234e66'], speck: ['rgba(255,255,255,.14)', 'rgba(5,30,50,.25)'], road: ['#33383f', '#8d939b', '#9aa0a8', 'rgba(255,255,255,.45)'],
              pad: ['#c4a871', '#b79b65', '#7d653a', '#5f4c2a', '#e0c792', '#927847'], decor: 'crate' },
  airfield: { ground: ['#5f7c4b', '#4d693d'], speck: ['rgba(170,210,120,.15)', 'rgba(20,40,18,.2)'], road: ['#24272b', '#50555b', '#5b6067', 'rgba(255,255,255,.6)'],
              pad: ['#c3c8cd', '#b3b8bd', '#7c8187', '#5f6469', '#e3e7eb', '#8e9399'], decor: 'crate' },
  hq:       { ground: ['#1d2132', '#11131e'], speck: ['rgba(255,70,70,.22)', 'rgba(0,0,0,.35)'], road: ['#07080d', '#3d4359', '#484f69', 'rgba(255,90,90,.55)'],
              pad: ['#5c6689', '#515a7b', '#313752', '#22273c', '#93a3e3', '#3d4563'], decor: 'rock' },
};
const DECOR = {
  bush(c, x, y, z) { c.fillStyle = '#2a4a25'; c.beginPath(); c.arc(x, y, 10 * z, 0, 7); c.fill(); c.fillStyle = '#4b7a3c'; c.beginPath(); c.arc(x - 2 * z, y - 3 * z, 7 * z, 0, 7); c.fill(); },
  palm(c, x, y, z) { c.strokeStyle = '#6b4a2a'; c.lineWidth = 4 * z; c.beginPath(); c.moveTo(x, y + 12 * z); c.quadraticCurveTo(x + 3 * z, y, x - 2 * z, y - 10 * z); c.stroke();
    c.fillStyle = '#2f8a3f'; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.75; c.beginPath(); c.ellipse(x - 2 * z + Math.cos(a) * 9 * z, y - 10 * z + Math.sin(a) * 7 * z, 9 * z, 3.6 * z, a, 0, 7); c.fill(); } },
  cactus(c, x, y, z) { c.fillStyle = '#4f8a45'; c.strokeStyle = '#2d5a2a'; c.lineWidth = 1.5; rr(c, x - 4 * z, y - 14 * z, 8 * z, 26 * z, 4 * z); c.fill(); c.stroke();
    rr(c, x - 12 * z, y - 6 * z, 6 * z, 12 * z, 3 * z); c.fill(); c.stroke(); rr(c, x + 6 * z, y - 10 * z, 6 * z, 12 * z, 3 * z); c.fill(); c.stroke(); },
  pine(c, x, y, z) { c.fillStyle = '#5b4030'; c.fillRect(x - 2 * z, y + 6 * z, 4 * z, 8 * z);
    for (let i = 0; i < 3; i++) { c.fillStyle = '#2f6a4a'; c.beginPath(); c.moveTo(x, y - 18 * z + i * 7 * z); c.lineTo(x + (8 + i * 3) * z, y - 4 * z + i * 6 * z); c.lineTo(x - (8 + i * 3) * z, y - 4 * z + i * 6 * z); c.closePath(); c.fill();
      c.fillStyle = '#f4f9fc'; c.beginPath(); c.moveTo(x, y - 18 * z + i * 7 * z); c.lineTo(x + 4 * z, y - 11 * z + i * 7 * z); c.lineTo(x - 4 * z, y - 11 * z + i * 7 * z); c.closePath(); c.fill(); } },
  rubble(c, x, y, z) { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#8b8f96' : '#6d7178'; c.strokeStyle = '#2b2e33'; c.lineWidth = 1.2;
      rr(c, x - 12 * z + i * 6 * z, y - 4 * z + (i % 2) * 6 * z - i * 2 * z, 11 * z, 8 * z, 2); c.fill(); c.stroke(); } },
  rock(c, x, y, z) { c.fillStyle = '#4a4442'; c.beginPath(); c.moveTo(x - 12 * z, y + 8 * z); c.lineTo(x - 5 * z, y - 10 * z); c.lineTo(x + 6 * z, y - 6 * z); c.lineTo(x + 12 * z, y + 8 * z); c.closePath(); c.fill();
    c.fillStyle = '#7a716c'; c.beginPath(); c.moveTo(x - 5 * z, y - 10 * z); c.lineTo(x + 6 * z, y - 6 * z); c.lineTo(x, y + 2 * z); c.closePath(); c.fill(); },
  crate(c, x, y, z) { c.fillStyle = '#a9824f'; c.strokeStyle = '#4f3a1e'; c.lineWidth = 1.6; rr(c, x - 10 * z, y - 8 * z, 20 * z, 17 * z, 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 10 * z, y - 8 * z); c.lineTo(x + 10 * z, y + 9 * z); c.moveTo(x + 10 * z, y - 8 * z); c.lineTo(x - 10 * z, y + 9 * z); c.stroke(); },
};

// 지역의 땅·발판 색 (주둔지를 전장과 같은 색으로 칠하는 데 쓴다)
export const areaColors = area => { const T = THEMES[AREAS[area].theme]; return { ground: T.ground, pad: T.pad }; };

// 종이 결 무늬 (한 번만 만든다): 밝은 점과 갈색 점이 드문드문 섞인 작은 타일
let grainCv = null;
function grain() {
  if (grainCv) return grainCv;
  const N = 128; grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = N;
  const c = grainCv.getContext('2d'), d = c.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { const r = rnd(i * 1.37 + 5), light = rnd(i * 2.11 + 9) > 0.5, a = r > 0.45 ? (r - 0.45) * 90 : 0;
    d.data[i * 4] = light ? 255 : 74; d.data[i * 4 + 1] = light ? 250 : 47; d.data[i * 4 + 2] = light ? 235 : 27; d.data[i * 4 + 3] = a; }
  c.putImageData(d, 0, 0); return grainCv;
}

// ── 배경(움직이지 않는 부분)은 지역마다 한 번만 그려 두고 복사한다 ──────────
let bg = null, bgKey = '';
function background(k, area, map) {
  const key = area + '@' + k.toFixed(3); if (bg && bgKey === key) return bg;
  if (!bg) bg = document.createElement('canvas');
  bg.width = Math.ceil(FIELD.w * k); bg.height = Math.ceil(FIELD.h * k); bgKey = key;
  const c = bg.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
  const T = THEMES[AREAS[area].theme], hw = CELL.w / 2, hh = CELL.h / 2, deco = DECOR[T.decor], seed = area * 1000;
  // 땅
  const gr = c.createLinearGradient(0, 0, 0, FIELD.h); gr.addColorStop(0, T.ground[0]); gr.addColorStop(1, T.ground[1]);
  c.fillStyle = gr; c.fillRect(0, 0, FIELD.w, FIELD.h);
  for (let i = 0; i < 110; i++) { c.fillStyle = T.speck[i % 2];
    c.beginPath(); c.ellipse(rnd(seed + i) * FIELD.w, rnd(seed + i + 99) * FIELD.h, 10 + rnd(i + 7) * 24, 4 + rnd(i + 3) * 8, 0, 0, 7); c.fill(); }
  // 길: 발판 사이로 꺾이며 도는 길. 캐릭터 그림(손그림풍)과 어울리게 딱딱한 검은 테두리 대신 부드러운 가장자리로 그린다
  const road = (w, col, al = 1) => { c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); map.path.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p.x, p.y)); c.closePath(); c.stroke(); c.globalAlpha = 1; };
  road(106, T.road[0], 0.16); road(98, T.road[0], 0.4); road(90, T.road[1]);
  // 가장자리를 울퉁불퉁하게: 길 색 덩어리를 양옆에 흩어 붙여 자로 그은 듯한 선을 없앤다
  c.fillStyle = T.road[1];
  for (let d = 0, i = 0; d < map.len; d += 13, i++) { const p = map.pathPos(d), nx = -p.dy, ny = p.dx;
    for (const sd of [-1, 1]) { const off = 43 + rnd(seed + i * 2 + sd) * 5; c.beginPath(); c.ellipse(p.x + nx * off * sd, p.y + ny * off * sd, 6 + rnd(i + sd + 70) * 5, 5 + rnd(i + sd + 31) * 4, 0, 0, 7); c.fill(); } }
  road(64, T.road[2], 0.6);
  road(92, 'rgb(52,36,20)', 0.24);      // 길 전체를 한 톤 어둡게 눌러 발판보다 밝지 않게 한다 (발판과 유닛이 먼저 눈에 들어오게)
  for (let i = 0; i < 150; i++) { const p = map.pathPos(rnd(seed + i + 500) * map.len), ox = (rnd(i + 900) - 0.5) * 74, oy = (rnd(i + 300) - 0.5) * 74;      // 흙·자갈 얼룩
    c.fillStyle = i % 3 ? 'rgba(74,47,27,.1)' : 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(p.x + ox, p.y + oy, 3 + rnd(i) * 6, 2 + rnd(i + 1) * 3, rnd(i + 5) * 3, 0, 7); c.fill(); }
  c.fillStyle = T.road[3]; c.globalAlpha = 0.55;      // 진행 방향 표시는 옅게
  for (let s = 60; s < map.len; s += 120) { const p = map.pathPos(s); c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.dy, p.dx));
    c.beginPath(); c.moveTo(10, 0); c.lineTo(-6, -8); c.lineTo(-2, 0); c.lineTo(-6, 8); c.closePath(); c.fill(); c.restore(); }
  c.globalAlpha = 1;
  // 발판 블록: 부드러운 바닥 그림자 → 옆면(흙) → 윗면(얼룩·풀 무늬) → 갈색 가장자리 선. 이웃한 발판은 한 덩어리로 이어지고 바깥 모서리는 둥글다
  const has = (r, cc) => map.padSet.has(r * 10 + cc), R = 16, LINE = 'rgba(74,47,27,.6)';
  const nb = s => ({ u: has(s.r - 1, s.c), d: has(s.r + 1, s.c), l: has(s.r, s.c - 1), r: has(s.r, s.c + 1) });
  c.save(); c.shadowColor = 'rgba(50,30,12,.4)'; c.shadowBlur = 16 * k; c.shadowOffsetY = 9 * k; c.fillStyle = T.pad[3];      // 그림자(번지게)
  for (const s of map.slots) { const n = nb(s), x = s.x - hw, y = s.y - hh - 8;
    c.beginPath(); c.roundRect(x, y, CELL.w, CELL.h + (n.d ? 0 : DEPTH), [!n.u && !n.l ? R : 0, !n.u && !n.r ? R : 0, !n.d && !n.r ? R : 0, !n.d && !n.l ? R : 0]); c.fill(); }
  c.restore();
  for (const s of map.slots) { const n = nb(s), x = s.x - hw, y = s.y - hh - 8; if (n.d) continue;      // 옆면: 아래가 비어 있는 칸만
    const fg = c.createLinearGradient(0, y + CELL.h - 4, 0, y + CELL.h + DEPTH); fg.addColorStop(0, T.pad[2]); fg.addColorStop(1, T.pad[3]);
    c.fillStyle = fg; c.beginPath(); c.roundRect(x, y + CELL.h - R, CELL.w, DEPTH + R, [0, 0, n.r ? 0 : R, n.l ? 0 : R]); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const sx = x + 10 + rnd(seed + (s.r * 10 + s.c) * 7 + i) * 70, sy = y + CELL.h + 4 + i * 4; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 10 + rnd(i + (s.r * 10 + s.c)) * 12, sy); c.stroke(); }
  }
  for (const s of map.slots) { const n = nb(s), x = s.x - hw, y = s.y - hh - 8;      // 윗면
    c.save(); c.beginPath(); c.roundRect(x, y, CELL.w, CELL.h, [!n.u && !n.l ? R : 0, !n.u && !n.r ? R : 0, !n.d && !n.r ? R : 0, !n.d && !n.l ? R : 0]); c.clip();
    c.fillStyle = T.pad[0]; c.fillRect(x, y, CELL.w, CELL.h);
    if ((s.r + s.c) % 2) { c.fillStyle = T.pad[1]; c.globalAlpha = 0.55; c.fillRect(x, y, CELL.w, CELL.h); c.globalAlpha = 1; }      // 칸 구분은 옅은 체크 무늬로만
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.1)' : 'rgba(74,47,27,.07)';      // 수채 얼룩
      c.beginPath(); c.ellipse(x + rnd(seed + (s.r * 10 + s.c) * 13 + i) * CELL.w, y + rnd(seed + (s.r * 10 + s.c) * 17 + i + 3) * CELL.h, 16 + rnd(i + (s.r * 10 + s.c)) * 22, 9 + rnd(i + (s.r * 10 + s.c) + 9) * 12, rnd(i) * 3, 0, 7); c.fill(); }
    c.lineWidth = 1.6; c.lineCap = 'round';      // 풀잎(풀밭) 또는 작은 점무늬(그 밖의 지역)
    for (let i = 0; i < 2; i++) { const tx = x + 8 + rnd(seed + (s.r * 10 + s.c) * 5 + i * 3) * (CELL.w - 16), ty = y + 10 + rnd(seed + (s.r * 10 + s.c) * 11 + i * 7) * (CELL.h - 20);
      c.strokeStyle = c.fillStyle = i % 2 ? T.pad[5] : T.pad[4]; c.globalAlpha = 0.45;
      if (T.tuft === 'grass') { c.beginPath(); c.moveTo(tx - 4, ty); c.lineTo(tx - 5, ty - 6); c.moveTo(tx, ty); c.lineTo(tx, ty - 8); c.moveTo(tx + 4, ty); c.lineTo(tx + 5, ty - 6); c.stroke(); }
      else { c.beginPath(); c.ellipse(tx, ty, 3.5, 1.8, 0, 0, 7); c.fill(); } }
    c.globalAlpha = 1;
    // 유닛이 서는 자리: 칸 가운데를 밝게 틔워 캐릭터 뒤가 환하게 받쳐 주고(짙은 윤곽선과 대비), 발밑에는 밝은 타원을 둔다
    const lg = c.createRadialGradient(s.x, s.y - 6, 6, s.x, s.y - 6, 52); lg.addColorStop(0, 'rgba(255,255,240,.3)'); lg.addColorStop(0.6, 'rgba(255,255,240,.14)'); lg.addColorStop(1, 'rgba(255,255,240,0)');
    c.fillStyle = lg; c.fillRect(x, y, CELL.w, CELL.h);
    c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.ellipse(s.x, s.y + FEET - 5, 32, 12.5, 0, 0, 7); c.fill();
    c.restore();
  }
  c.lineCap = 'round'; c.lineWidth = 2.2;      // 덩어리 바깥 가장자리: 갈색 선 + 위쪽 밝은 선
  for (const s of map.slots) { const n = nb(s), x = s.x - hw, y = s.y - hh - 8, x2 = x + CELL.w, y2 = y + CELL.h;
    const tl = !n.u && !n.l ? R : 0, tr = !n.u && !n.r ? R : 0, br = !n.d && !n.r ? R : 0, bl = !n.d && !n.l ? R : 0;
    c.strokeStyle = LINE; c.beginPath();
    if (!n.u) { c.moveTo(x + tl, y); c.lineTo(x2 - tr, y); } if (tr) c.arc(x2 - R, y + R, R, -Math.PI / 2, 0);
    if (!n.r) { c.moveTo(x2, y + tr); c.lineTo(x2, y2 - br + (n.d ? 0 : DEPTH - (br ? R - br : 0))); }
    if (!n.l) { c.moveTo(x, y + tl); c.lineTo(x, y2 - bl + (n.d ? 0 : DEPTH - (bl ? R - bl : 0))); } if (tl) { c.moveTo(x, y + R); c.arc(x + R, y + R, R, Math.PI, Math.PI * 1.5); }
    if (!n.d) { c.moveTo(x + bl, y2 + DEPTH); c.lineTo(x2 - br, y2 + DEPTH); if (br) c.arc(x2 - R, y2 + DEPTH - R, R, Math.PI / 2, 0, true); if (bl) { c.moveTo(x + R, y2 + DEPTH); c.arc(x + R, y2 + DEPTH - R, R, Math.PI / 2, Math.PI); }
      c.moveTo(x + (n.l ? 0 : 3), y2 - 1); c.lineTo(x2 - (n.r ? 0 : 3), y2 - 1); }      // 윗면과 옆면의 경계
    c.stroke();
    if (!n.u) { c.strokeStyle = T.pad[4]; c.globalAlpha = 0.8; c.beginPath(); c.moveTo(x + tl + 2, y + 3); c.lineTo(x2 - tr - 2, y + 3); c.stroke(); c.globalAlpha = 1; }
  }
  // 장식: 빈 칸에는 모래주머니 진지와 지역 장식, 가장자리에도 지역 장식, 길이 시작되는 곳에 깃발
  for (const d of map.decor) {
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(d.x, d.y + 22, 40, 14, 0, 0, 7); c.fill();
    for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) { const bx = d.x - 30 + i * 24 + row * 12, by = d.y + 14 - row * 15;
      c.fillStyle = row % 2 ? '#b8a57a' : '#a89468'; c.strokeStyle = '#5b4a31'; c.lineWidth = 1.5; rr(c, bx, by, 23, 15, 6); c.fill(); c.stroke(); }
    deco(c, d.x - 30, d.y - 22, 1.3);
  }
  for (let i = 0; i < 20; i++) deco(c, i % 2 ? FIELD.w - 7 : 7, 24 + rnd(seed + i + 40) * (FIELD.h - 48), 0.8);
  const f = map.path[0];
  c.strokeStyle = '#3a2f20'; c.lineWidth = 3; c.beginPath(); c.moveTo(f.x - 38, f.y + 30); c.lineTo(f.x - 38, f.y - 36); c.stroke();
  c.fillStyle = '#d0453a'; c.beginPath(); c.moveTo(f.x - 38, f.y - 36); c.lineTo(f.x - 12, f.y - 28); c.lineTo(f.x - 38, f.y - 20); c.closePath(); c.fill();
  // 종이 결: 옅은 잡티를 전체에 깔아 캐릭터 그림(수채·색연필)의 질감과 맞춘다
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.5; const gp = c.createPattern(grain(), 'repeat'); c.fillStyle = gp; c.fillRect(0, 0, bg.width, bg.height); c.globalAlpha = 1;
  return bg;
}

// 그림을 화면에 찍힐 크기로 미리 줄여 둔다. 256~512px 원본을 매 프레임 줄여 그리는 것보다 같은 크기로 복사하는 쪽이 훨씬 싸다.
// 그림에서 내용이 있는 부분만 잘라 담으므로(공격 그림은 대부분이 빈 자리다) 화면에 찍는 넓이도 줄어든다.
// flip이면 좌우를 뒤집어 둔다(왼쪽으로 가는 적, 왼쪽을 보는 공격 자세). 돌려주는 값: { cv, x, y, w, h } — (x, y)는 그림 왼쪽 위에서의 위치
const fitCache = new Map(), boxCache = new Map(); let fitCount = 0;
function contentBox(im) {      // 내용이 있는 범위 (0~1). 48px로 줄여 한 번만 잰다
  let b = boxCache.get(im); if (b) return b;
  const N = 48, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(im, 0, 0, N, N);
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  try { const d = c.getImageData(0, 0, N, N).data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  } catch { x1 = -1; }
  b = x1 < 0 ? [0, 0, 1, 1] : [Math.max(0, x0 - 1) / N, Math.max(0, y0 - 1) / N, Math.min(N, x1 + 2) / N, Math.min(N, y1 + 2) / N];
  boxCache.set(im, b); return b;
}
// skin = true면 지금 쓰는 스킨의 색 필터를 입혀 둔다(내 유닛 그림에만 쓴다)
// 스킨: art = 그 스킨의 그림 묶음 이름(units/<art>_<병과>). 그림이 준비돼 있으면 내 유닛을 그 그림으로 그린다(계급대 구분 없이 한 벌). filter는 그림이 없는 스킨의 색 필터
let skinFilter = '', skinArt = '';
export function setSkin(filter, artName = '') { skinArt = artName || ''; if (filter !== skinFilter) { skinFilter = filter || ''; fitCache.clear(); fitCount = 0; } }
function fit(im, w, k, flip = false, skin = false, line = 0) {      // line: 둘레에 입힐 윤곽선 굵기(전장 단위, 0이면 없음)
  let m = fitCache.get(im); if (!m) fitCache.set(im, m = new Map());
  const key = (flip ? -1 : 1) * Math.round(w * k) + (skin ? 0.5 : 0) + (line ? 0.25 : 0); let f = m.get(key);
  if (!f) {
    if (++fitCount > 500) { fitCache.clear(); fitCount = 1; fitCache.set(im, m = new Map()); }      // 화면 크기·품질이 바뀌어 쌓인 것 정리
    const px = Math.max(1, Math.round(w * k)), b = contentBox(im), bx = flip ? [1 - b[2], b[1], 1 - b[0], b[3]] : b;
    const r = line && im.naturalWidth ? Math.max(1, line * k) : 0, pad = r ? Math.ceil(r) + 1 : 0;
    const X0 = Math.floor(bx[0] * px) - pad, Y0 = Math.floor(bx[1] * px) - pad, X1 = Math.ceil(bx[2] * px) + pad, Y1 = Math.ceil(bx[3] * px) + pad;
    let cv = document.createElement('canvas'); cv.width = Math.max(1, X1 - X0); cv.height = Math.max(1, Y1 - Y0);
    const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.translate(-X0, -Y0); if (flip) { c.translate(px, 0); c.scale(-1, 1); }
    if (skin && skinFilter) c.filter = skinFilter;
    c.drawImage(im, 0, 0, px, px);
    if (r) {      // 윤곽선: 그림의 실루엣을 한 색으로 칠해 둘레 여러 방향으로 밀어 찍고, 그 위에 그림을 얹는다 (캐시를 만들 때 한 번만 한다)
      const sil = document.createElement('canvas'); sil.width = cv.width; sil.height = cv.height;
      const sc = sil.getContext('2d'); sc.drawImage(cv, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = OUTLINE_COL; sc.fillRect(0, 0, sil.width, sil.height);
      const out = document.createElement('canvas'); out.width = cv.width; out.height = cv.height; const oc = out.getContext('2d');
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; oc.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
      oc.drawImage(cv, 0, 0); cv = out;
    }
    m.set(key, f = { cv, x: X0 / k, y: Y0 / k, w: cv.width / k, h: cv.height / k });
  }
  return f;
}
const put = (ctx, f, x, y) => ctx.drawImage(f.cv, x + f.x, y + f.y, f.w, f.h);      // fit()으로 만든 그림을 (x, y)를 왼쪽 위로 하여 찍는다

// 보스 그림: 지역 보스 전용 그림(enemy_boss2 …)이 있으면 쓰고, 없으면 기본 전차 그림의 색을 바꿔 쓴다
const tintCache = {};
function bossImage(n) {
  const own = enemyArt('boss' + n); if (own) return own;
  const base = enemyArt('boss'); if (!base || n <= 1) return base;
  if (!tintCache[n]) { const cv = document.createElement('canvas'); cv.width = base.naturalWidth; cv.height = base.naturalHeight;
    const c = cv.getContext('2d'); c.filter = `hue-rotate(${(n - 1) * 36}deg)`; c.drawImage(base, 0, 0); tintCache[n] = cv; }
  return tintCache[n];
}

export function draw(ctx, g, ui, quality = 2) {
  const b = g.branch, k = ctx.getTransform().a, now = performance.now() / 1000, SLOTS = g.map.slots;
  ctx.drawImage(background(k, g.area, g.map), 0, 0, FIELD.w, FIELD.h);
  const sel = ui.sel != null ? g.units[ui.sel] : null;
  // 협동: 동료의 구역은 어둡게 덮어 내 구역과 구분한다
  if (g.duo && !g.duo.solo) { ctx.fillStyle = 'rgba(24,30,66,.46)'; SLOTS.forEach((s, i) => { if (!mine(g, i)) ctx.fillRect(s.x - CELL.w / 2, s.y - CELL.h / 2 - 8, CELL.w, CELL.h); }); }
  // 특수 발판: 종류 색으로 빛나는 테두리와 왼쪽 위 표식 (유닛이 올라가도 보이게 모서리에 둔다)
  for (const i in g.tiles) tile(ctx, SLOTS[i], g.tiles[i], k, now, quality);
  // 아무것도 고르지 않았을 때: 지금 조합할 짝(같은 군별 · 같은 등급)이 있는 내 유닛의 칸에 옅은 노란 점선을 둘러 준다 — 군별이 섞여 나와 짝을 찾기 어렵기 때문
  const pairN = {}; if (!sel) for (const u of g.units) if (u && own(g, u) && u.level < GRADES.length - 1) { const pk = branchOf(g, u).id + u.level; pairN[pk] = (pairN[pk] || 0) + 1; }
  // 발판 강조: 조합할 수 있는 칸(노랑), 선택한 칸(흰색)
  SLOTS.forEach((s, i) => {
    const x = s.x - CELL.w / 2 + 4, y = s.y - CELL.h / 2 - 4, mergeable = sel && i !== ui.sel && canMerge(g, ui.sel, i);
    // 조합할 수 있는 칸: 같은 병과(병과 유지)는 노란색, 다른 병과(무작위)는 보라색 점선
    if (mergeable) { const pv = mergePreview(g, ui.sel, i), keep = !pv.random, star = !!pv.hidden, a = 0.32 + 0.18 * Math.sin(now * 6);
      ctx.fillStyle = star ? `rgba(255,120,80,${a})` : keep ? `rgba(255,212,94,${a})` : `rgba(190,150,255,${a * 0.8})`; rr(ctx, x, y, CELL.w - 8, CELL.h - 8, 12); ctx.fill();
      ctx.strokeStyle = star ? '#ff5a4a' : keep ? '#ffd45e' : '#c9a3ff'; ctx.lineWidth = star ? 5 : 4; if (!keep) ctx.setLineDash([9, 7]); ctx.stroke(); ctx.setLineDash([]);
      if (star) starAt(ctx, s.x + 34, s.y - 42, 11 + 2 * Math.sin(now * 6), '#ffd45e'); }      // 용사·히든 조합이 되는 짝: 붉은 테두리와 별
    else if (sel && i === ui.sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rr(ctx, x, y, CELL.w - 8, CELL.h - 8, 12); ctx.stroke(); }
    else if (!sel && !g.units[i] && ui.hintT > now && mine(g, i)) { ctx.fillStyle = `rgba(255,255,255,${0.22 + 0.16 * Math.sin(now * 9)})`; rr(ctx, x, y, CELL.w - 8, CELL.h - 8, 12); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }      // 신병 소집 건물을 눌렀을 때: 소집할 수 있는 빈 칸
    else if (!sel) { const u = g.units[i]; if (u && own(g, u) && pairN[branchOf(g, u).id + u.level] >= 2) {
      ctx.strokeStyle = `rgba(255,224,110,${0.55 + 0.25 * Math.sin(now * 4)})`; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); rr(ctx, x + 2, y + 2, CELL.w - 12, CELL.h - 12, 11); ctx.stroke(); ctx.setLineDash([]); } }
  });
  // 선택 유닛 사거리 · 지원 범위 (바닥에 눕힌 원)
  if (sel) {
    const p = SLOTS[sel.slot];
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, unitRange(sel), 0, 7); ctx.fill(); ctx.stroke();
    if ((sel.hidden && !heroOf(sel)) || sel.stats.haste > 0) { ctx.strokeStyle = sel.hidden ? '#ffd45e' : CLASS_INFO.med.color; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(p.x, p.y, CFG.auraRadius, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  // 화염 지대(불바다): 바닥에서 일렁이는 불
  for (const z of g.zones) { const a = Math.min(1, z.t / 0.6) * (0.3 + 0.1 * Math.sin(now * 9 + z.x));
    ctx.fillStyle = `rgba(255,110,40,${a})`; ctx.beginPath(); ctx.ellipse(z.x, z.y + 6, z.r, z.r * 0.62, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,214,94,${a * 0.9})`; ctx.beginPath(); ctx.ellipse(z.x, z.y + 6, z.r * 0.55, z.r * 0.34, 0, 0, 7); ctx.fill(); }
  // 적: 화면 아래쪽에 있는 것이 위쪽 것을 가리도록 y 순서로 그린다
  const es = g.enemies.length > 1 ? [...g.enemies].sort((p, q) => p.y - q.y) : g.enemies;
  for (const e of es) enemy(ctx, e, k, quality);
  // 아군 (칸 번호 순서 = 위쪽 줄부터)
  const T = THEMES[AREAS[g.area].theme];
  for (const u of g.units) if (u) unit(ctx, branchOf(g, u), u, SLOTS[u.slot], k, now, quality, T, own(g, u));
  for (const u of g.units) if (u) unitTags(ctx, branchOf(g, u), u, SLOTS[u.slot], k);
  // 사격 효과
  const fxList = quality > 0 ? g.effects : g.effects.slice(-12);   // 최저 품질에서는 사격 효과 수를 줄인다
  for (const f of fxList) {
    if (f.txt) { const a = Math.min(1, f.t / 0.4), up = (1 - Math.min(1, f.t)) * 18; ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${f.small ? 14 : 22}px sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = '#1b1208'; ctx.strokeText(f.txt, f.x, f.y - up);
      ctx.fillStyle = f.small ? '#d7e3ee' : '#ffd45e'; ctx.fillText(f.txt, f.x, f.y - up); ctx.globalAlpha = 1; continue; }
    if (f.puff) { const a = Math.max(0, f.t / 0.3); ctx.globalAlpha = Math.min(1, a) * (f.col ? 0.55 : 1); ctx.fillStyle = f.col || '#fff3c4';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.25 - a * 0.75), 0, 7); ctx.fill(); ctx.globalAlpha = 1; continue; }
    shot(ctx, f, quality);
  }
  // 지역 이동 연출: 화면이 어두워졌다 밝아지며 새 지역이 드러나고, 지역 이름 띠가 지나간다
  if (ui.trans) {
    const el = ui.trans.total - ui.trans.t, A = AREAS[ui.trans.area], T = THEMES[A.theme];
    const dark = el < 0.3 ? 1 : Math.max(0, 1 - (el - 0.3) / 0.7);
    if (dark > 0) { ctx.fillStyle = `rgba(8,10,6,${dark})`; ctx.fillRect(0, 0, FIELD.w, FIELD.h); }
    const inn = Math.min(1, el / 0.35), out = Math.min(1, ui.trans.t / 0.4), a = Math.min(inn, out), cy = FIELD.h * 0.42, slide = (1 - inn) * -160 + (1 - out) * 160;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,10,6,.86)'; ctx.fillRect(0, cy - 92, FIELD.w, 184);
    ctx.fillStyle = T.pad[0]; ctx.fillRect(0, cy - 92, FIELD.w, 6); ctx.fillRect(0, cy + 86, FIELD.w, 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = T.pad[4]; ctx.font = '800 24px sans-serif'; ctx.fillText(`작전 지역 ${ui.trans.area + 1} / ${AREAS.length}`, FIELD.w / 2 + slide, cy - 52);
    ctx.fillStyle = '#fff'; ctx.font = '900 58px sans-serif'; ctx.fillText(A.name, FIELD.w / 2 + slide, cy);
    ctx.fillStyle = '#ffb3a8'; ctx.font = '700 22px sans-serif'; ctx.fillText(ui.trans.label || `${(ui.trans.area + 1) * 10}단계 보스 — ${A.boss.name}`, FIELD.w / 2 - slide, cy + 54);
    ctx.globalAlpha = 1;
  }
  if (g.enemies.some(e => e.kind === 'boss')) {
    ctx.fillStyle = 'rgba(12,16,10,.8)'; rr(ctx, FIELD.w / 2 - 92, FIELD.h - 34, 184, 28, 14); ctx.fill();
    ctx.fillStyle = '#ff8478'; ctx.font = '800 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`보스 제한 ${Math.ceil(g.bossTimer)}초`, FIELD.w / 2, FIELD.h - 19);
  }
}

// 특수 발판 한 칸. 바닥의 빛(숨쉬듯 밝아졌다 어두워짐)은 매번 그리고, 테두리와 표식은 한 번 그려 둔 조각을 찍는다
const TILE_BOX = [-52, -60, 52, 46];
function tile(ctx, s, kind, k, now, quality) {
  const t = TILES[kind]; if (!t || !s) return;
  const a = quality > 0 ? 0.2 + 0.1 * Math.sin(now * 2.4 + s.x) : 0.24;
  ctx.globalAlpha = a; ctx.fillStyle = t.color; rr(ctx, s.x - 45, s.y - 53, 90, 90, 13); ctx.fill(); ctx.globalAlpha = 1;
  ctx.drawImage(spriteBox('tile:' + kind, k, TILE_BOX, c => {
    c.strokeStyle = 'rgba(74,47,27,.75)'; c.lineWidth = 6; rr(c, -45, -53, 90, 90, 13); c.stroke();
    c.strokeStyle = t.color; c.lineWidth = 3.4; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.4; c.setLineDash([5, 6]); rr(c, -40, -48, 80, 80, 10); c.stroke(); c.setLineDash([]);
    // 표식: 둥근 딱지 안에 종류 그림 (속사 = 겹화살, 고지 = 과녁, 급소 = 별)
    c.translate(-33, -41); c.fillStyle = t.color; c.strokeStyle = '#4a2f1b'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fill(); c.stroke();
    c.strokeStyle = c.fillStyle = '#4a2f1b'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
    if (kind === 'spd') { for (const dx of [-4.5, 1.5]) { c.beginPath(); c.moveTo(dx - 1.5, -5); c.lineTo(dx + 3.5, 0); c.lineTo(dx - 1.5, 5); c.stroke(); } }
    else if (kind === 'rng') { c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 5.5, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 1.8, 0, 7); c.fill(); c.beginPath(); c.moveTo(0, -8.5); c.lineTo(0, -5.5); c.moveTo(0, 8.5); c.lineTo(0, 5.5); c.moveTo(-8.5, 0); c.lineTo(-5.5, 0); c.moveTo(8.5, 0); c.lineTo(5.5, 0); c.stroke(); }
    else { c.beginPath(); for (let j = 0; j < 10; j++) { const q = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 3.2 : 7.5; c[j ? 'lineTo' : 'moveTo'](Math.cos(q) * r, Math.sin(q) * r); } c.closePath(); c.fill(); }
  }), s.x + TILE_BOX[0], s.y + TILE_BOX[1], TILE_BOX[2] - TILE_BOX[0], TILE_BOX[3] - TILE_BOX[1]);
}

function starAt(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.strokeStyle = '#4a2f1b'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let j = 0; j < 10; j++) { const q = -Math.PI / 2 + j * Math.PI / 5, rr2 = j % 2 ? r * 0.45 : r; ctx[j ? 'lineTo' : 'moveTo'](x + Math.cos(q) * rr2, y + Math.sin(q) * rr2); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
function enemy(ctx, e, k, quality) {
  const elite = e.kind === 'elite', art = elite ? 'armor' : e.kind;
  const r = ENEMY_R[e.kind], half = r + 8, left = e.left;
  const by = quality > 0 ? Math.sin(e.s * 0.22 + e.id) * (e.kind === 'boss' ? 1 : 1.8) : 0, fly = e.kind === 'fast' ? 9 : e.fly ? 16 : 0;
  // 바닥 그림자 · 상태 표시
  ctx.drawImage(sprite('esh:' + r, r, k, c => { const sg = c.createRadialGradient(0, 0, 1, 0, 0, r); sg.addColorStop(0, 'rgba(50,30,12,.45)'); sg.addColorStop(1, 'rgba(50,30,12,0)'); c.scale(1, 0.4); c.fillStyle = sg; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); }), e.x - r, e.y + r * 0.85 - r, r * 2, r * 2);
  if (elite) { ctx.fillStyle = 'rgba(160,90,220,.4)'; ctx.strokeStyle = '#c99bff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.6, r + 9, (r + 9) * 0.5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  if (e.dashT > 0) { ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y - 4, r + 12, 0, 7); ctx.stroke(); }
  else if (e.skill && e.skill.id === 'armor' && e.hp > e.maxHp * 0.5) { ctx.strokeStyle = '#cfd6dc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y - 4, r + 12, 0, 7); ctx.stroke(); }
  if (e.slowT > 0) { ctx.fillStyle = 'rgba(90,150,235,.5)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 4, (r + 4) * 0.45, 0, 0, 7); ctx.fill(); }
  if (e.freezeT > 0) { ctx.fillStyle = 'rgba(190,240,255,.55)'; ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, e.y - 2, r + 7, 0, 7); ctx.fill(); ctx.stroke(); }      // 빙결
  if (e.vulnT > 0) { ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r + 5, (r + 5) * 0.45, 0, 0, 7); ctx.stroke(); }
  const im = (e.kind === 'boss' && bossImage(e.boss)) || (elite && enemyArt('elite')) || enemyArt(art) || sprite('e:' + art, half, k, ENEMY_DRAW[art]);
  put(ctx, fit(im, half * 2, k, left), e.x - half, e.y - half + by - fly);
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(e.x - r - 1, e.y - half - 4 - fly, r * 2 + 2, 6);
  ctx.fillStyle = '#7be36a'; ctx.fillRect(e.x - r, e.y - half - 3 - fly, r * 2 * Math.max(0, e.hp / e.maxHp), 4);
  if (elite) { ctx.fillStyle = '#e9d6ff'; ctx.font = '800 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.ceil(e.life) + '초', e.x, e.y - half - 14); }
}

// ── 공격 이펙트: 병과 조합마다 날아가는 것과 맞는 모습이 다르다 ───────────
// 총알(보병) · 포탄(포병) · 박격포탄(보+포) · 저격(보+통) · 붕대(의무) · 번개(통신) · 가스(포+의) · 레이저 유도(포+통) · 전파(의+통)
const FX_KIND = { 'inf+inf': 'bullet', 'art+art': 'shell', 'med+med': 'heal', 'sig+sig': 'bolt', 'inf+art': 'mortar', 'inf+med': 'bullet', 'inf+sig': 'snipe', 'art+med': 'gas', 'art+sig': 'laser', 'med+sig': 'wave' };
const INK = '#4a2f1b';
function burst(ctx, x, y, a, r, col, rays = 6) {       // 맞은 자리에서 퍼지는 별 모양 섬광 (a: 0 → 1)
  ctx.globalAlpha = 1 - a; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < rays; i++) { const q = i * Math.PI * 2 / rays + 0.4; ctx.moveTo(x + Math.cos(q) * r * (0.35 + a * 0.5), y + Math.sin(q) * r * (0.35 + a * 0.5)); ctx.lineTo(x + Math.cos(q) * r * (0.8 + a * 0.6), y + Math.sin(q) * r * (0.8 + a * 0.6)); }
  ctx.stroke(); ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(x, y, r * 0.38 * (1 - a), 0, 7); ctx.fill(); ctx.lineCap = 'butt';
}
function boom(ctx, x, y, a, R) {                       // 폭발: 불덩이가 커지며 옅어지고 연기가 위로 흩어진다
  ctx.globalAlpha = (1 - a) * 0.8; ctx.fillStyle = '#ff8a3c'; ctx.beginPath(); ctx.arc(x, y, R * (0.45 + a * 0.6), 0, 7); ctx.fill();
  ctx.globalAlpha = 1 - a; ctx.fillStyle = '#ffe07a'; ctx.beginPath(); ctx.arc(x, y, R * (0.28 + a * 0.4), 0, 7); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.globalAlpha = (1 - a) * 0.7; ctx.beginPath(); ctx.arc(x, y, R * (0.45 + a * 0.6), 0, 7); ctx.stroke();
  ctx.fillStyle = '#8d8478'; ctx.globalAlpha = (1 - a) * 0.6;
  for (let i = 0; i < 4; i++) { const q = i * 1.7 + 0.5; ctx.beginPath(); ctx.arc(x + Math.cos(q) * R * (0.4 + a * 0.5), y + Math.sin(q) * R * 0.35 - a * R * 0.5, R * (0.16 + a * 0.12), 0, 7); ctx.fill(); }
}
function plus(ctx, x, y, r) { ctx.fillRect(x - r, y - r / 3, r * 2, r * 2 / 3); ctx.fillRect(x - r / 3, y - r, r * 2 / 3, r * 2); }
function shot(ctx, f, quality) {
  const T = f.T || 0.18, p = 1 - Math.max(0, f.t) / T, big = f.crit ? 1.5 : 1;       // p: 0(발사) → 1(끝)
  const dir = f.x2 < f.x1 ? -1 : 1, sx = f.x1 + dir * 26, sy = f.y1 - 24, dx = f.x2 - sx, dy = f.y2 - sy, len = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  if (quality === 0) {      // 최저 품질: 선 하나와 폭발 원만
    ctx.globalAlpha = 1 - p; ctx.strokeStyle = CLASS_INFO[f.c].color; ctx.lineWidth = 2.5 * big; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    if (f.r > 0) { ctx.fillStyle = 'rgba(255,170,80,.45)'; ctx.beginPath(); ctx.arc(f.x2, f.y2, f.r * (0.75 + p * 0.4), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1; return;
  }
  const kind = FX_KIND[f.c + '+' + f.c2] || FX_KIND[f.c2 + '+' + f.c] || 'bullet';
  const at = q => [sx + dx * q, sy + dy * q];
  const arc = (q, h) => [sx + dx * q, sy + dy * q - h * 4 * q * (1 - q)];
  ctx.save();
  if (kind === 'bullet' || kind === 'snipe') {
    const fly = kind === 'snipe' ? 0.22 : 0.38;
    if (p < fly) { const q = p / fly, [ax, ay] = at(Math.max(0, q - (kind === 'snipe' ? 0.6 : 0.3))), [bx, by] = at(q);
      ctx.lineCap = 'round'; ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 5 * big; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = '#fffbe6'; ctx.lineWidth = 2 * big; ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
    else burst(ctx, f.x2, f.y2, (p - fly) / (1 - fly), (kind === 'snipe' ? 20 : 13) * big, kind === 'snipe' ? '#fffbe6' : '#ffd45e', kind === 'snipe' ? 8 : 6);
  } else if (kind === 'shell' || kind === 'mortar') {
    const fly = 0.55, h = kind === 'mortar' ? Math.min(130, len * 0.55) : Math.min(60, len * 0.2);
    if (p < fly) { const q = p / fly, [x, y] = arc(q, h), [px, py] = arc(Math.max(0, q - 0.04), h);
      ctx.fillStyle = '#b9b2a6'; for (let i = 1; i <= 3; i++) { const [tx, ty] = arc(Math.max(0, q - i * 0.09), h); ctx.globalAlpha = 0.5 - i * 0.12; ctx.beginPath(); ctx.arc(tx, ty, 6 - i, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.translate(x, y); ctx.rotate(Math.atan2(y - py, x - px)); ctx.fillStyle = '#4b5a3a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 9 * big, 5 * big, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d9b44a'; ctx.beginPath(); ctx.arc(6 * big, 0, 2.5 * big, 0, 7); ctx.fill(); }
    else boom(ctx, f.x2, f.y2, (p - fly) / (1 - fly), Math.max(f.r, 26) * big);
  } else if (kind === 'heal') {
    const fly = 0.5;
    if (p < fly) { const q = p / fly, [x, y] = arc(q, Math.min(50, len * 0.25));
      ctx.fillStyle = '#7fd17a'; ctx.globalAlpha = 0.7; const [tx, ty] = arc(Math.max(0, q - 0.12), Math.min(50, len * 0.25)); plus(ctx, tx, ty, 4);
      ctx.globalAlpha = 1; ctx.translate(x, y); ctx.rotate(p * 20); ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(ctx, -7 * big, -5 * big, 14 * big, 10 * big, 3); ctx.fill(); ctx.stroke(); }
    else { const a = (p - fly) / (1 - fly); ctx.strokeStyle = '#7fd17a'; ctx.lineWidth = 3; ctx.globalAlpha = (1 - a) * 0.8; ctx.beginPath(); ctx.arc(f.x2, f.y2, (10 + a * 18) * big, 0, 7); ctx.stroke();
      ctx.fillStyle = '#58c152'; ctx.globalAlpha = 1 - a; for (let i = 0; i < 4; i++) { const q = i * Math.PI / 2 + 0.6; plus(ctx, f.x2 + Math.cos(q) * (8 + a * 20), f.y2 + Math.sin(q) * (8 + a * 20) - a * 8, 5 * big); } }
  } else if (kind === 'bolt') {
    const seg = 6, nx = -dy / len, ny = dx / len, step = Math.floor(p * 5);      // 지그재그 번개 (잠깐씩 모양이 바뀐다)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy - 12);
    for (let i = 1; i < seg; i++) { const j = (((Math.sin((f.x1 + f.y2) * 0.37 + i * 12.9898 + step * 78.233) * 43758.5453) % 1 + 1) % 1 - 0.5) * 26, [x, y] = at(i / seg); ctx.lineTo(x + nx * j, y - 12 * (1 - i / seg) + ny * j); }
    ctx.lineTo(f.x2, f.y2); ctx.globalAlpha = (1 - p) * 0.9; ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 6 * big; ctx.stroke(); ctx.strokeStyle = '#fffbe6'; ctx.lineWidth = 2 * big; ctx.globalAlpha = 1 - p; ctx.stroke();
    ctx.strokeStyle = '#6cc3ff'; ctx.lineWidth = 3; ctx.globalAlpha = (1 - p) * 0.9; ctx.beginPath(); ctx.arc(f.x2, f.y2, (8 + p * 20) * big, 0, 7); ctx.stroke();
  } else if (kind === 'gas') {
    const R = Math.max(f.r, 28) * big;
    for (let i = 0; i < 5; i++) { const q = Math.min(1, p * 2.2 - i * 0.1); if (q <= 0) continue; const [x, y] = at(q), spread = q >= 1 ? (p - 0.45) * 1.6 : 0, an = i * 1.9;
      ctx.globalAlpha = (q >= 1 ? 1 - p : 0.8) * 0.55; ctx.fillStyle = i % 2 ? '#c9e6a4' : '#a8d47c';
      ctx.beginPath(); ctx.arc(x + Math.cos(an) * R * 0.45 * spread, y + Math.sin(an) * R * 0.35 * spread - spread * 6, 8 + q * 6 + spread * R * 0.35, 0, 7); ctx.fill(); }
  } else if (kind === 'laser') {
    if (p < 0.55) { ctx.globalAlpha = 0.3 * (1 - p); ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.globalAlpha = 1 - p; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x2, f.y2, 9, 0, 7); ctx.moveTo(f.x2 - 13, f.y2); ctx.lineTo(f.x2 + 13, f.y2); ctx.moveTo(f.x2, f.y2 - 13); ctx.lineTo(f.x2, f.y2 + 13); ctx.stroke(); }
    if (p > 0.35) boom(ctx, f.x2, f.y2, (p - 0.35) / 0.65, Math.max(f.r, 24) * big);
  } else {      // wave: 표적 쪽으로 번져 가는 전파 호
    ctx.lineCap = 'round'; ctx.lineWidth = 3 * big;
    for (let i = 0; i < 3; i++) { const q = p * 1.3 - i * 0.16; if (q <= 0 || q > 1) continue; const [x, y] = at(q);
      ctx.globalAlpha = (1 - q) * 0.9 + 0.1; ctx.strokeStyle = i % 2 ? '#7fd17a' : '#6cc3ff'; ctx.beginPath(); ctx.arc(x - Math.cos(ang) * 14, y - Math.sin(ang) * 14, 14 + q * 8, ang - 0.7, ang + 0.7); ctx.stroke(); }
    if (p > 0.6) { const a = (p - 0.6) / 0.4; ctx.fillStyle = '#58c152'; ctx.globalAlpha = 1 - a; plus(ctx, f.x2, f.y2 - a * 10, 6 * big);
      ctx.strokeStyle = '#6cc3ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(f.x2, f.y2, 8 + a * 16, 0, 7); ctx.stroke(); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

function unit(ctx, b, u, p, k, now, quality, T, skin = true) {      // skin: 내 유닛이면 내 스킨을 입힌다(협동에서 동료 유닛은 기본 모습)
  const tier = u.level >= b.tiers[1] ? 2 : u.level >= b.tiers[0] ? 1 : 0, rank = rankName(b, u);
  const lv = Math.min(u.level, GRADES.length - 1), gcol = GRADES[lv].color;
  const o = { branchId: b.id, type: u.type, tier, rank, hidden: !!u.hidden, insig: rankInsig(b, u), gcol }, tk = u.type.join('+');
  const fy = p.y + FEET - 5;
  // 발밑: 소집·진급 때 번쩍임, 히든 계급의 금빛, 병과 색 띠, 그림자
  if (u.flash > 0) { ctx.fillStyle = `rgba(255,212,94,${u.flash})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 50, 26, 0, 0, 7); ctx.fill(); }
  const hero = u.hidden ? heroOf(u) : null;
  if (hero) {      // 전설의 용사: 용사 색으로 타오르는 발밑(각성하면 고리가 하나 더), 위로 피어오르는 불티
    const pu = 0.5 + 0.5 * Math.sin(now * 4 + u.id), aw = u.level > hero.level;
    ctx.fillStyle = hero.color; ctx.globalAlpha = 0.34 + 0.16 * pu; ctx.beginPath(); ctx.ellipse(p.x, fy, 46, 21, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = hero.color; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(p.x, fy, 44 + pu * 2, 20 + pu, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(p.x, fy, 38, 16.5, 0, 0, 7); ctx.stroke();
    if (aw) { ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -now * 26; ctx.beginPath(); ctx.ellipse(p.x, fy, 51, 24, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; }
    if (quality > 0) for (let i = 0; i < (aw ? 5 : 3); i++) { const ph = (now * 0.7 + i * 0.37 + u.id * 0.13) % 1, sx = p.x + Math.sin(i * 2.4 + u.id) * 30, sy = fy - ph * 66;
      ctx.globalAlpha = (1 - ph) * 0.9; ctx.fillStyle = i % 2 ? '#fff6d6' : hero.color; ctx.beginPath(); ctx.arc(sx + Math.sin(now * 3 + i) * 3, sy, 2.6 * (1 - ph * 0.5), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (u.hidden) { ctx.fillStyle = `rgba(255,212,94,${0.3 + 0.12 * Math.sin(now * 3 + u.id)})`; ctx.beginPath(); ctx.ellipse(p.x, fy, 42, 19, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]); }
  // 계급대별 모습: 병 → 부사관 → 위관 → 영관 → 장성으로 갈수록 몸집이 커지고 받침대·깃발·망토·후광이 붙는다
  const grp = rankGroup(b, u), size = CHAR * RANK_SIZE[lv], top = p.y + FEET - size;      // grp: 그림·장식이 바뀌는 계급대(병·부사관·위관·영관·장성), lv: 계급
  if (grp === 4 && quality > 0) {      // 장성: 뒤에서 천천히 도는 금빛 햇살
    ctx.save(); ctx.translate(p.x, p.y - 8); ctx.rotate(now * 0.5 + u.id); ctx.fillStyle = 'rgba(255,214,94,.3)';
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -62); ctx.lineTo(9, -62); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // 발밑(받침대: 청동 → 은 → 금, 병과 색 띠, 그림자)은 바뀌지 않으므로 한 번 그려 두고 복사한다
  // 발밑 원판: 등급 색(노말 회색 · 매직 초록 · 레어 파랑 · 영웅 보라 · 유니크 주황 · 전설 금 · 초월 빨강). 한눈에 등급이 보이도록 크고 진하게, 모든 등급에 깐다
  ctx.drawImage(spriteBox(['ub2', lv].join(':'), k, UB_BOX, c => {
    const rx = 35, ry = 13.5;
    c.fillStyle = 'rgba(40,24,10,.28)'; c.beginPath(); c.ellipse(0, 9, rx + 2, ry + 1, 0, 0, 7); c.fill();                               // 바닥 그림자
    c.fillStyle = gcol; c.beginPath(); c.ellipse(0, 6, rx, ry, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(30,18,8,.5)'; c.fill();              // 옆면: 등급 색을 어둡게
    c.strokeStyle = '#2b2118'; c.lineWidth = 2.2; c.stroke();
    c.fillStyle = gcol; c.beginPath(); c.ellipse(0, 1, rx, ry, 0, 0, 7); c.fill(); c.strokeStyle = '#2b2118'; c.lineWidth = 2.2; c.stroke();   // 윗면: 등급 색 그대로
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 1, rx - 5, ry - 3.6, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();      // 윗면 밝은 테
    c.fillStyle = 'rgba(40,24,10,.22)'; c.beginPath(); c.ellipse(0, 1.5, 17, 5.5, 0, 0, 7); c.fill();                                       // 발 그림자
  }), p.x + UB_BOX[0], fy + UB_BOX[1], UB_BOX[2] - UB_BOX[0], UB_BOX[3] - UB_BOX[1]);
  // 캐릭터: 가만히 있을 때는 숨쉬듯 조금 움직이고, 사격할 때는 반동으로 튄다. 발을 기준으로 커졌다 작아진다
  const fire = u.fireT > 0 ? Math.sin((1 - u.fireT / 0.16) * Math.PI) : 0;
  const dy = (quality > 0 ? Math.sin(now * 2.2 + u.id * 1.7) * 1.2 : 0) - fire * 6, sc = 1 + fire * 0.07;
  // 그림 고르기: 용사 전용 그림(각성하면 각성 그림) → 내 스킨 그림 → 군별·계급대 그림 → 코드 그림
  const hk = hero ? [hero.id + (u.level > hero.level ? 'aw' : ''), hero.id + (u.level > hero.level ? 'aw' : '')] : null;
  const heroIm = hk && unitImage('hero', hk, 0), skinIm = !heroIm && skin && skinArt ? unitImage(skinArt, u.type, 0) : null;
  const im = heroIm || skinIm || unitImage(b.id, u.type, grp) || sprite(['uc', b.id, tk, tier].join(':'), 62, k, c => drawSoldierFallback(c, o));
  const w = size * sc;
  const stunned = u.stunT > 0;
  // 등 뒤 장식 (캐릭터보다 먼저 그려 뒤에 놓는다): 위관 깃발 하나, 영관 깃발 둘, 장성 망토와 후광
  const own = heroIm ? true : skinIm ? false : unitArtTier(b.id, u.type, grp) === grp;      // 이 계급대 전용 그림이 있으면 깃발·망토·후광은 그리지 않는다(그림에 이미 차림이 있다). 스킨은 한 벌이라 계급대 장식을 그려 준다
  if (!own && (grp === 2 || grp === 3)) for (const sd of grp === 3 ? [-1, 1] : [1]) {
    const x0 = p.x + sd * size * 0.12, y0 = fy - 6, x1 = p.x + sd * size * 0.46, y1 = top + size * 0.1;
    ctx.strokeStyle = '#3a2f20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.fillStyle = grp === 3 ? b.color : '#f4f6f8'; ctx.strokeStyle = grp === 3 ? '#ffd45e' : '#1b1f17'; ctx.lineWidth = grp === 3 ? 2 : 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + sd * 20, y1 + 5); ctx.lineTo(x1 + sd * 17, y1 + 19); ctx.lineTo(x1 - sd * 3, y1 + 13); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (grp === 3) { ctx.fillStyle = '#ffd45e'; ctx.beginPath(); ctx.arc(x1 + sd * 8, y1 + 10, 3, 0, 7); ctx.fill(); }
  }
  if (grp === 4 && !own) {
    ctx.fillStyle = '#b3262e'; ctx.strokeStyle = '#1b1f17'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x - size * 0.2, top + size * 0.5); ctx.lineTo(p.x + size * 0.2, top + size * 0.5); ctx.lineTo(p.x + size * 0.42, fy); ctx.quadraticCurveTo(p.x, fy + 7, p.x - size * 0.42, fy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x + size * 0.4, fy - 3); ctx.quadraticCurveTo(p.x, fy + 4, p.x - size * 0.4, fy - 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,94,.95)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, top + size * 0.3, size * 0.4, 0, 7); ctx.stroke();
  }
  if (stunned) ctx.globalAlpha = 0.55;
  // 공격 직후에는 공격 자세 그림(_atk)으로 바꾼다. 그 그림은 가로세로 2배 크기이고 대기 그림 자리가 아래 가운데에 온다. 오른쪽을 보는 그림이라 표적이 왼쪽이면 뒤집는다
  const atk = u.atkT > 0 && !stunned ? (heroIm ? unitAtkImage('hero', hk, 0) : skinIm ? unitAtkImage(skinArt, u.type, 0) : unitAtkImage(b.id, u.type, grp)) : null;
  if (atk) put(ctx, fit(atk, size * 2, k, u.faceL, skin, OUTLINE), p.x - size, p.y + FEET + dy - size * 2);
  else if (sc === 1 || !im.naturalWidth) put(ctx, fit(im, size, k, false, skin, OUTLINE), p.x - w / 2, p.y + FEET - w + (stunned ? 0 : dy));
  else { const f = fit(im, size, k, false, skin, OUTLINE); ctx.drawImage(f.cv, p.x - w / 2 + f.x * sc, p.y + FEET - w + (stunned ? 0 : dy) + f.y * sc, f.w * sc, f.h * sc); }      // 반동: 발을 기준으로 살짝 커진다
  ctx.globalAlpha = 1;
  if (grp === 4 && quality > 0) for (let i = 0; i < 3; i++) {      // 장성: 주변에서 반짝이는 빛
    const ph = now * 2.4 + i * 2.1 + u.id, a = Math.max(0, Math.sin(ph)), sx = p.x + [-0.44, 0.46, 0.1][i] * size, sy = top + [0.3, 0.18, 0.02][i] * size, r = 3 + a * 5;
    ctx.fillStyle = `rgba(255,248,200,${a})`; ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.quadraticCurveTo(sx, sy, sx + r, sy); ctx.quadraticCurveTo(sx, sy, sx, sy + r); ctx.quadraticCurveTo(sx, sy, sx - r, sy); ctx.quadraticCurveTo(sx, sy, sx, sy - r); ctx.fill();
  }
  if (stunned) { ctx.fillStyle = '#ffd45e'; ctx.strokeStyle = '#3a2a08'; ctx.lineWidth = 1.2;     // 기절: 머리 위를 도는 별
    for (let i = 0; i < 3; i++) { const a = now * 5 + i * 2.1, sx = p.x + Math.cos(a) * 22, sy = top + 4 + Math.sin(a) * 6;
      ctx.beginPath(); for (let j = 0; j < 10; j++) { const q = -Math.PI / 2 + j * Math.PI / 5, rr2 = j % 2 ? 2.6 : 6; ctx[j ? 'lineTo' : 'moveTo'](sx + Math.cos(q) * rr2, sy + Math.sin(q) * rr2); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  else if (u.burnT > 0) { const fl = 1 + Math.sin(now * 14 + u.id) * 0.15;                          // 화염: 머리 위 불꽃
    ctx.fillStyle = '#ff7a2e'; ctx.beginPath(); ctx.moveTo(p.x, top + 15 - 24 * fl); ctx.quadraticCurveTo(p.x + 11, top + 9, p.x, top + 15); ctx.quadraticCurveTo(p.x - 11, top + 9, p.x, top + 15 - 24 * fl); ctx.fill();
    ctx.fillStyle = '#ffd45e'; ctx.beginPath(); ctx.arc(p.x, top + 11, 3.5, 0, 7); ctx.fill(); }
}
// 계급장(칸 오른쪽 위)과 이름표(발 아래). 캐릭터를 모두 그린 뒤에 찍는다 — 아랫줄 캐릭터의 머리가 윗줄 이름표를 가리지 않게
function unitTags(ctx, b, u, p, k) {
  const tier = u.level >= b.tiers[1] ? 2 : u.level >= b.tiers[0] ? 1 : 0, rank = rankName(b, u), tk = u.type.join('+');
  const o = { branchId: b.id, bname: b.name, bcol: b.color, nick: charName(b, u), type: u.type, tier, rank, hidden: !!u.hidden, insig: rankInsig(b, u), gcol: GRADES[Math.min(u.level, GRADES.length - 1)].color };
  const tkey = [b.id, tk, tier, rank, u.hidden || 0, o.insig.join('')].join(':');
  ctx.drawImage(spriteBox('utb:' + tkey, k, BADGE_BOX, c => drawTag(c, o, 'badge')), p.x + BADGE_BOX[0], p.y + BADGE_BOX[1], BADGE_BOX[2] - BADGE_BOX[0], BADGE_BOX[3] - BADGE_BOX[1]);
  ctx.drawImage(spriteBox('utl:' + tkey, k, LABEL_BOX, c => drawTag(c, o, 'label')), p.x + LABEL_BOX[0], p.y + LABEL_BOX[1], LABEL_BOX[2] - LABEL_BOX[0], LABEL_BOX[3] - LABEL_BOX[1]);
}
