// 전장에 찍는 그림 조각들 — 그림 파일(www/img/v2, E 광택 캐주얼풍)을 읽어 내주고, 계급장과 이름표를 그린다.
// 2026-11-21: 코드로 그리던 2등신 군인·적(예전 그림체의 대비책)과 예전 그림 파일을 읽던 길은 지웠다. 그림이 아직 안 읽혔을 때 유닛은 받침대만, 적은 둥근 덩어리로 보인다.
const GOLD = '#ffd45e';
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); }
  c.closePath(); c.fill();
}


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
// 계급장 기호 그림(막대 · V자 · 다이아몬드 · 금 다이아몬드 · 꽃 · 별 · 봉오리 · 큰 꽃). 여덟 장이 다 읽혔을 때만 쓴다(그 전에는 아래 코드 그림)
const INSIG_ART = { bar: 'in_bar', chev: 'in_chev', chevstar: 'in_chev', dia: 'in_dia', gdia: 'in_gdia', flower: 'in_flower', star: 'in_star', bud: 'in_bud', tflower: 'in_tflower' };
export const insigReady = () => ['in_bar', 'in_chev', 'in_dia', 'in_gdia', 'in_flower', 'in_star', 'in_bud', 'in_tflower'].every(n => !!v2Art(n));
// (x, y)를 내용의 왼쪽 위로 하여 계급장을 그린다
function drawInsig(c, insig, x, y) {
  const [shape, n] = insig, [w, h] = insigSize(insig); c.fillStyle = c.strokeStyle = INSIG_COL[shape];
  if (insigReady()) { const im = v2Art(INSIG_ART[shape]), at = (cx, cy, sz, pic = im) => c.drawImage(pic, cx - sz / 2, cy - sz / 2, sz, sz);      // 기호 그림을 예전과 같은 자리·개수로 놓는다
    if (shape === 'bar') for (let i = 0; i < n; i++) at(x + 4.5, y + 0.95 + i * 3.1, 9.6);
    else if (shape === 'chev' || shape === 'chevstar') { for (let i = 0; i < n; i++) at(x + 4.7, y + 2.3 + i * 3.3, 9.4); if (shape === 'chevstar') at(x + 9.4 + 4.4, y + h / 2, 9.4, v2Art('in_star')); }
    else for (let i = 0; i < n; i++) at(x + (shape === 'tflower' ? 5 : shape === 'bud' ? 3 : 4) + i * SIDE_STEP[shape], y + h / 2, shape === 'tflower' ? 11.4 : shape === 'bud' ? 8.6 : 10);
    return; }
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
  const key = insig.join('') + (insigReady() ? ':i' : '');      // 기호 그림이 읽힌 뒤에는 그림으로 다시 만든다
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

// ── 그림 파일 ─────────────────────────────────────────────
// 유닛(동물)·적(고철 군단)·배경·효과·화면 틀이 모두 한 그림체다. 그림은 www/img/v2/ (만드는 법: art/ref/jobs.py → art/ref/apply.py), 목록은 www/img/v2/manifest.json.
// 목록에 없는 그림은 대신할 것을 쓴다: 조합 병과 → 첫 병과의 기본 그림, 다른 지역의 땅·길·소품 → 초원, 지역 보스 → 대장 전차.
const art = {};                 // 이름 → 불러온 Image
export const artState = { version: 0 };   // 그림이 새로 준비될 때마다 올라간다 (캐시 키에 넣어 다시 그리게 함)
const loading = new Set(), v2Set = new Set();        // v2Set: 목록에 있는 그림 이름 ('ground_meadow', 'units/army_inf' …)
function loadOne(name) {
  if (art[name] || loading.has(name)) return; loading.add(name);
  const im = new Image(); im.onload = () => { art[name] = im; artState.version++; }; im.src = `img/${name}.webp`;
}
export const v2Has = name => v2Set.has(name);
// 그림 하나: 목록에 있으면 처음 찾을 때 읽기 시작하고, 다 읽힐 때까지는 null (artState.version이 올라가면 다시 찾는다)
export const v2Art = name => art['v2/' + name] || (v2Set.has(name) && loadOne('v2/' + name), null);
// 시작할 때는 유닛 대기 그림 60장과 적만 미리 읽는다. 공격 동작 · 용사 · 지역 그림(땅·길·소품) · 장식 · 효과는 처음 쓰일 때 읽는다(한꺼번에 읽으면 그림 메모리가 커진다)
export function loadArt() {
  fetch('img/v2/manifest.json').then(r => (r.ok ? r.json() : [])).then(list => { for (const n of list) v2Set.add(n);
    for (const n of list) if (/^(units\/[a-z]+_[a-z-]+|enemy_.+)$/.test(n)) loadOne('v2/' + n);
    artState.version++; }).catch(() => { /* 그림을 못 읽으면 받침대와 덩어리로만 보인다 */ });
}
const typeKey = type => (type[0] === type[1] ? type[0] : type.join('-'));
// 유닛 그림: units/<군별>_<병과>(대기, 256칸) · _rdy(준비) · _atk(발사) — 뒤의 둘은 448칸 = 대기 그림의 1.75배이고 머리의 가로 자리와 발바닥 높이가 대기 그림과 같다(art/ref/apply.py cut_anim)
export const unitImage = (branchId, type) => v2Art(v2Set.has(`units/${branchId}_${typeKey(type)}`) ? `units/${branchId}_${typeKey(type)}` : `units/${branchId}_${type[0]}`);
export const unitRdyImage = (branchId, type) => v2Art(`units/${branchId}_${typeKey(type)}_rdy`);
export const unitAtkImage = (branchId, type) => v2Art(`units/${branchId}_${typeKey(type)}_atk`);
// 전설의 용사: units/<군별>_hero_<용사>(대기) · _rdy · _atk. kind = '' | '_rdy' | '_atk'
export const v2HeroArt = (branchId, heroId, kind = '') => v2Art(`units/${branchId}_hero_${heroId}${kind}`);
export const enemyArt = kind => v2Art('enemy_' + kind);      // 지역 보스 그림(boss2 …)이 없으면 render.js의 bossImage가 기본 보스 그림을 쓴다
// 화면(<img>)에 쓸 그림 주소: 조합 병과 그림이 없으면 첫 병과 그림, 용사 그림이 없으면 ''
export const v2UnitSrc = (branchId, key) => { const k = key.replace('+', '-'); return `img/v2/units/${branchId}_${v2Set.size && !v2Set.has(`units/${branchId}_${k}`) ? k.split('-')[0] : k}.webp`; };
export const v2HeroSrc = (branchId, heroId) => (v2Set.has(`units/${branchId}_hero_${heroId}`) ? `img/v2/units/${branchId}_hero_${heroId}.webp` : '');

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
