// 군인 랜덤 디펜스 — 게임 데이터 (군별 · 계급 · 병과 · 병기)
// 이 파일만 고치면 계급/병과/병기 이름과 군별 특성을 바꿀 수 있습니다.

export const CLASS_IDS = ['inf', 'art', 'med', 'sig'];

export const CLASS_INFO = {
  inf: { short: '보', color: '#58b368', role: '단일 대상 속사' },
  art: { short: '포', color: '#f0803c', role: '광역 폭발 피해' },
  med: { short: '의', color: '#ee6c9a', role: '주변 아군 공격속도 증가' },
  sig: { short: '통', color: '#4aa3e8', role: '적 둔화 · 받는 피해 증가' },
};

// 등급 7단계 (2026-11-20 사용자 결정). 조합·전투력은 등급(레벨)으로 정해지고, 화면에서는 색으로 구분한다.
// 한 등급 안에는 계급 이름이 여러 개 있고, 유닛의 병과에 따라 그중 하나가 표시된다(표시만 다르고 능력은 같다).
export const GRADES = [
  { name: '노말', color: '#aeb4bb' }, { name: '매직', color: '#5fd35a' }, { name: '레어', color: '#4aa3e8' }, { name: '영웅', color: '#b15bf0' },
  { name: '유니크', color: '#ff8a3c' }, { name: '전설', color: '#ffcf3f' }, { name: '초월', color: '#ff5a4a' },
];
// 등급별 계급: [이름, 계급장 [모양, 개수]]. 앞쪽이 아래 계급.
// 계급장 모양 — none 없음 / bar 병(가로 막대) / chev 부사관(아래로 겹친 V자) / dia 위관(다이아몬드) / flower 영관(무궁화) / star 장성(별)
//             / bud 경찰 순경~경사(무궁화 봉오리) / tflower 경찰 경무관 이상(큰 무궁화)
const R = (name, shape, n) => [name, [shape, n]];
// 국군(육군·해군·해병대·공군)은 군인사법으로 계급 이름이 같다. 해병대만 훈련병을 '훈병'이라 부르는 관례를 따랐다.
const MIL_GRADES = [
  [R('훈련병', 'none', 0)],
  [R('이등병', 'bar', 1), R('일병', 'bar', 2), R('상병', 'bar', 3), R('병장', 'bar', 4)],
  [R('하사', 'chev', 1), R('중사', 'chev', 2), R('상사', 'chev', 3)],
  [R('소위', 'dia', 1), R('중위', 'dia', 2), R('대위', 'dia', 3)],
  [R('소령', 'flower', 1), R('중령', 'flower', 2), R('대령', 'flower', 3)],
  [R('준장', 'star', 1), R('소장', 'star', 2), R('중장', 'star', 3), R('대장', 'star', 4)],
  [R('원수', 'star', 5)],
];
const MARINE_GRADES = [[R('훈병', 'none', 0)], ...MIL_GRADES.slice(1)];
// 의무경찰 4계급 + 경찰공무원 계급. 경찰은 총경 위가 4계급뿐이라 유니크·전설 등급은 이름이 둘씩이다.
const POLICE_GRADES = [
  [R('교육생', 'none', 0)],
  [R('이경', 'bar', 1), R('일경', 'bar', 2), R('상경', 'bar', 3), R('수경', 'bar', 4)],
  [R('순경', 'bud', 2), R('경장', 'bud', 3), R('경사', 'bud', 4)],
  [R('경위', 'flower', 1), R('경감', 'flower', 2), R('경정', 'flower', 3)],
  [R('총경', 'flower', 4), R('경무관', 'tflower', 1)],
  [R('치안감', 'tflower', 2), R('치안정감', 'tflower', 3)],
  [R('치안총감', 'tflower', 4)],
];
// 한 등급 안에서 어느 계급 이름을 쓸지: 순수 병과는 아래 계급, 혼성 병과는 위 계급. 이 순서에서의 위치를 그 등급의 이름 수에 맞춰 나눈다
const TYPE_ORDER = ['med', 'sig', 'inf', 'art', 'med+sig', 'inf+med', 'inf+sig', 'art+med', 'art+sig', 'inf+art'];
// 등급(level)과 병과 키('inf', 'inf+art' …)로 [이름, 계급장]을 찾는다
export function rankOf(branch, level, typeKey) {
  const list = branch.grades[Math.max(0, Math.min(level, branch.grades.length - 1))], p = Math.max(0, TYPE_ORDER.indexOf(typeKey));
  return list[Math.floor(p * list.length / TYPE_ORDER.length)];
}
// 등급마다 캐릭터 그림이 바뀌는 계급대: 0 기본(노말·매직) · 1 부사관(레어) · 2 위관(영웅) · 3 영관(유니크) · 4 장성(전설·초월)
export const GROUP_OF_LEVEL = [0, 0, 1, 2, 3, 4, 4];

// 히든 계급: 정규 조합으로는 나오지 않고 히든 조합(recipe) 또는 소집 뽑기 확률(draw)로만 얻는다.
//  level  : 조합할 때 취급되는 등급(3 = 영웅). 조합하면 일반 계급으로 진급하며 능력은 사라진다.  grp: 캐릭터 그림 계급대
//  recipe : 'allDiff' = 한 등급 아래(레어) 두 유닛의 병과 4칸이 모두 다를 때
//  draw   : 훈련소 기본 계급이 drawCamp[0]~[1] 범위일 때 신병 소집 1회당 등장 확률
//  aura   : 주변 아군에게 주는 효과 (dmg = 공격력, range = 사거리)
const MIL_HIDDEN = [
  { id: 'wonsa', name: '원사', level: 3, grp: 1, insig: ['chevstar', 3], recipe: 'allDiff', aura: { dmg: 0.2 }, text: '주변 아군 공격력 +20%',
    how: '히든 조합 — 레어 등급(하사·중사·상사) 둘, 두 유닛의 병과 4칸이 모두 다를 때 (보·포·의·통)' },
  { id: 'junwi', name: '준위', level: 3, grp: 2, insig: ['gdia', 1], draw: 0.03, drawCamp: [2, 3], aura: { range: 0.15 }, text: '주변 아군 사거리 +15%',
    how: '뽑기 — 훈련소 기본 등급이 레어~영웅일 때 신병 소집 3% 확률' },
];

// 특수 병과 6종의 고유 기술 (모든 군별 공통 — 병과 이름은 군별마다 다르지만 기술은 병과 조합으로 정해진다). 수치는 core.js unitStats가 읽는다
export const TYPE_SKILLS = {
  'inf+art': { name: '연속 포격', text: '3번째 공격마다 피해 +50% · 광역 범위 2배', burst: 3, burstMul: 1.5 },
  'inf+med': { name: '응급 처치', text: '이웃한 아군의 기절·화염 시간을 절반으로', guard: 0.5 },
  'inf+sig': { name: '조준 사격', text: '치명타 확률 +10% (치명타 = 2.5배)', crit: 0.1 },
  'art+med': { name: '오염', text: '맞은 적에게 3초간 초당 공격력의 12% 지속 피해', dot: 0.12, dotDur: 3 },
  'art+sig': { name: '표적 지정', text: '맞은 적이 받는 피해 +30% (4초)', vuln: 0.3, vulnDur: 4 },
  'med+sig': { name: '지휘 통신', text: '이웃한 아군의 사거리 +10%', rangeAura: 0.1 },
};

// 전설의 용사: 유니크 등급의 순수 병과 둘(서로 다른 병과)을 조합하면 탄생한다. 모든 군별 공통.
//  · 전설 등급으로 태어나고, 병과는 두 재료를 섞은 특수 병과로 정해진다(무작위가 아니다).
//  · 용사에 전설 등급 유닛을 조합하면 용사가 초월 등급으로 '각성'하고 기술이 강해진다.
//  skill 값이 배열이면 [전설, 각성(초월)]
export const HEROES = [
  { id: 'storm', hero: true, name: '강철비', level: 5, pair: ['inf', 'art'], color: '#ff8a3c',
    skill: { id: 'barrage', cd: 6, mul: [1, 1.6] }, text: '강철비 — 6초마다 전장의 모든 적에게 공격력의 100% 포격', up: '포격 피해 160%' },
  { id: 'phoenix', hero: true, name: '불사조', level: 5, pair: ['inf', 'med'], color: '#ff6f9c',
    skill: { id: 'guard', dmg: [0.06, 0.1] }, text: '불굴 — 아군 전체가 기절·화염에 걸리지 않고 공격력 +6%', up: '아군 전체 공격력 +10%' },
  { id: 'hawk', hero: true, name: '매의 눈', level: 5, pair: ['inf', 'sig'], color: '#7fd0ff',
    skill: { id: 'snipe', crit: 0.5, mul: [2.5, 4] }, text: '저격 — 사거리 무제한, 체력이 가장 많은 적을 노리고 치명타 확률 +50%', up: '치명타 피해 4배' },
  { id: 'inferno', hero: true, name: '불바다', level: 5, pair: ['art', 'med'], color: '#ff5a2e',
    skill: { id: 'fire', dur: 4, r: 75, dps: [0.25, 0.4] }, text: '불바다 — 포격이 떨어진 자리가 4초간 불타 그 위의 적에게 초당 공격력의 25% 피해', up: '화염 피해 초당 40%' },
  { id: 'frost', hero: true, name: '동장군', level: 5, pair: ['art', 'sig'], color: '#9fe6ff',
    skill: { id: 'freeze', cd: 8, dur: [1.5, 2.5] }, text: '혹한 — 8초마다 사거리 안의 모든 적을 1.5초간 얼린다 (보스·정예는 절반)', up: '빙결 2.5초' },
  { id: 'marshal', hero: true, name: '총사령관', level: 5, pair: ['med', 'sig'], color: '#ffd45e',
    skill: { id: 'command', haste: [0.12, 0.2] }, text: '총지휘 — 아군 전체 공격 속도 +12%', up: '아군 전체 공격 속도 +20%' },
];

// 병기 3단계가 바뀌는 계급 인덱스: [위관/간부 시작, 장성/지휘부 시작]
const MIL_TIERS = [3, 5];
const POLICE_TIERS = [3, 5];

// types 키: 순수 병과는 'inf', 혼성은 'inf+art' (CLASS_IDS 순서로 정렬)
// 값: [병과 이름, [병·부사관 병기, 장교 병기, 장성 병기]]
export const BRANCHES = [
  {
    id: 'army', name: '육군', color: '#4b6b3a', grades: MIL_GRADES, tiers: MIL_TIERS, hidden: MIL_HIDDEN,
    trait: { key: 'artDmg', text: '포병 계열 공격력 +15%' },
    types: {
      'inf': ['보병', ['K2 소총', 'K808 차륜형장갑차', 'K2 흑표 전차']],
      'art': ['포병', ['KH179 견인포', 'K9 자주포', '천무 다연장로켓']],
      'med': ['의무병', ['구급낭', 'K200 구급장갑차', '야전병원']],
      'sig': ['통신병', ['P-999K 무전기', 'TICN 전술통신', '군 위성통신']],
      'inf+art': ['박격포병', ['60mm 박격포', '81mm 박격포', '120mm 자주박격포']],
      'inf+med': ['전투의무병', ['K2 소총 · 구급낭', '차륜형 구급차', '메디온 의무후송헬기']],
      'inf+sig': ['수색정찰병', ['K1A 기관단총', '정찰 드론', '송골매 무인정찰기']],
      'art+med': ['화생방병', ['휴대용 제독기', '제독차', 'K216 화생방정찰차']],
      'art+sig': ['포병관측병', ['TAS-1K 관측장비', '천경-II 대포병레이더', '현무 탄도미사일']],
      'med+sig': ['의무후송병', ['들것 · 무전기', '구급 헬기 유도', '항공의무후송대']],
    },
  },
  {
    id: 'navy', name: '해군', color: '#2f5d8a', grades: MIL_GRADES, tiers: MIL_TIERS, hidden: MIL_HIDDEN,
    trait: { key: 'range', text: '모든 유닛 사거리 +10%' },
    types: {
      'inf': ['갑판병', ['K2 소총 함상경계', '참수리 고속정', '윤영하급 유도탄고속함']],
      'art': ['무장병', ['40mm 함포', '127mm 함포', '세종대왕급 이지스구축함']],
      'med': ['의무병', ['구급낭', '함정 의무실', '의무지원함']],
      'sig': ['전탐병', ['항해 레이더', '대공 탐색레이더', '해상작전 위성통신']],
      'inf+art': ['사통병', ['K6 중기관총', '76mm 함포', '대구급 호위함']],
      'inf+med': ['해난구조대', ['잠수 장비', '심해잠수구조정', '통영급 구조함']],
      'inf+sig': ['조타병', ['조타기', '인천급 호위함', '독도급 대형수송함']],
      'art+med': ['기뢰병', ['기뢰탐색 소나', '양양급 소해함', '남포급 기뢰부설함']],
      'art+sig': ['음탐병', ['소나', '청상어 경어뢰', '도산안창호급 잠수함']],
      'med+sig': ['항공병', ['링스 헬기', 'AW159 와일드캣', 'P-8A 해상초계기']],
    },
  },
  {
    id: 'marine', name: '해병대', color: '#b23a3a', grades: MARINE_GRADES, tiers: MIL_TIERS, hidden: MIL_HIDDEN,
    trait: { key: 'infSpeed', text: '보병 계열 공격속도 +15%' },
    types: {
      'inf': ['상륙보병', ['K2 소총', 'KAAV 상륙돌격장갑차', '마린온 상륙기동헬기']],
      'art': ['포병', ['KH179 견인포', 'K9 자주포', '천무 다연장로켓']],
      'med': ['의무병', ['구급낭', '야전 구급차', '상륙함 의무실']],
      'sig': ['통신병', ['P-999K 무전기', '전술통신 차량', '상륙 지휘통제체계']],
      'inf+art': ['박격포병', ['60mm 박격포', '81mm 박격포', '스파이크 미사일']],
      'inf+med': ['전투구조병', ['K2 소총 · 구급낭', '구급 장갑차', '마린온 의무후송']],
      'inf+sig': ['수색대', ['K1A 기관단총', '고무보트(IBS)', '수색대대 침투장비']],
      'art+med': ['화생방병', ['휴대용 제독기', '제독차', '화생방정찰차']],
      'art+sig': ['화력유도병', ['레이저 표적지시기', '함포 화력유도', '합동화력 유도']],
      'med+sig': ['상륙지원병', ['상륙지원 장비', '공기부양정(LSF)', '독도함']],
    },
  },
  {
    id: 'sf', name: '특공대', color: '#3b3b46', grades: MIL_GRADES, tiers: MIL_TIERS, hidden: MIL_HIDDEN,
    trait: { key: 'crit', text: '15% 확률로 2.5배 치명타' },
    types: {
      'inf': ['화기', ['K1A 기관단총', 'K7 소음기관단총', 'K13 특수작전 기관단총']],
      'art': ['폭파', ['TNT 폭약', 'C4 폭약', '특수 폭파장비']],
      'med': ['의무', ['구급낭', '전술 응급처치 키트', '특수전 의무팀']],
      'sig': ['통신', ['P-999K 무전기', '위성통신 단말', '특수작전 지휘통신']],
      'inf+art': ['유탄수', ['K201 유탄발사기', 'K4 고속유탄기관총', '판저파우스트 3']],
      'inf+med': ['전투의무', ['K1A · 구급낭', '전술 의무키트', 'UH-60 의무후송']],
      'inf+sig': ['저격수', ['K14 저격소총', '대물저격총', '야간 저격조']],
      'art+med': ['폭발물처리', ['EOD 방호복', '폭발물 처리로봇', '화생방 대응장비']],
      'art+sig': ['항공화력유도', ['레이저 표적지시기', '항공화력 유도장비', '합동화력 유도']],
      'med+sig': ['고공침투', ['MC-4 낙하산', 'CH-47 치누크', 'C-130 수송기']],
    },
  },
  {
    id: 'air', name: '공군', color: '#3f7fb5', grades: MIL_GRADES, tiers: MIL_TIERS, hidden: MIL_HIDDEN,
    trait: { key: 'splash', text: '광역 범위 +30% · 광역 피해 +10%' },
    types: {
      'inf': ['군사경찰', ['K2 소총', '기지방호 장갑차', '기지방어 체계']],
      'art': ['방공포병', ['20mm 발칸', '천궁-II', '패트리어트 PAC-3']],
      'med': ['항공의무', ['구급낭', '항공의무 후송', '의무후송기']],
      'sig': ['항공통제', ['관제 레이더', '중앙방공통제소(MCRC)', 'E-737 피스아이']],
      'inf+art': ['전투조종', ['KA-1 경공격기', 'FA-50 파이팅이글', 'KF-21 보라매']],
      'inf+med': ['항공구조사', ['구조 장비', 'HH-60 탐색구조헬기', 'HH-47 탐색구조헬기']],
      'inf+sig': ['정찰비행', ['RF-16 정찰기', '금강 정찰기', 'RQ-4 글로벌호크']],
      'art+med': ['항공무장정비', ['AIM-9 사이드와인더', 'AIM-120 암람', '타우러스 순항미사일']],
      'art+sig': ['전폭비행', ['F-5 제공호', 'F-15K 슬램이글', 'F-35A']],
      'med+sig': ['공수비행', ['CN-235 수송기', 'C-130 수송기', 'KC-330 시그너스']],
    },
  },
  {
    id: 'police', name: '의경', color: '#27408b', grades: POLICE_GRADES, tiers: POLICE_TIERS, hidden: [],
    trait: { key: 'slow', text: '둔화 효과 +30% · 처치 보상 +10% · 공격력 -15%' },
    types: {
      'inf': ['방범순찰', ['경찰봉', '테이저건', '순찰차']],
      'art': ['기동대', ['진압방패', '살수차', '기동대 차벽']],
      'med': ['구급', ['구급함', '응급처치 키트', '경찰병원']],
      'sig': ['무전', ['무전기', '112 종합상황실', '치안종합상황실']],
      'inf+art': ['타격대', ['방패 · 진압봉', '가스총', '경찰 장갑차']],
      'inf+med': ['인명구조', ['구조 로프', '구조 보트', '경찰 헬기 구조']],
      'inf+sig': ['교통경찰', ['경광봉', '교통 오토바이', '교통관제센터']],
      'art+med': ['폭발물처리', ['폭발물 탐지견', 'EOD 방호복', '폭발물 처리로봇']],
      'art+sig': ['경비지휘', ['확성기', '방송 지휘차', '지휘 헬기']],
      'med+sig': ['실종수색', ['수색견', '수색 드론', '경찰 헬기']],
    },
  },
];

// 부대 표창: 전투 밖에서 모으는 영구 효과(모든 판에 적용). 같은 표창을 여러 장 모으면 단계가 오른다 — CM_NEED[n]장째에 n+1단계, 최고 5단계.
//  per: 단계당 효과 값 · vals: 단계별 값을 따로 적을 때 · branch: 그 군별로 출격할 때만 적용
export const CM_NEED = [1, 3, 6, 10, 15];
export const COMMENDS = [
  { id: 'summon', name: '모병 유공 표창', per: 2, text: v => `신병 소집 비용 -${v}%` },
  { id: 'luck', name: '행운의 군번줄', per: 1, text: v => `소집 때 한 등급 위가 나올 확률 +${v}%p` },
  { id: 'tile', name: '공병 표창', per: 1, text: v => `특수 발판 +${v}칸` },
  { id: 'depot', name: '군수 표창', per: 6, text: v => `보급병 수입 +${v}%` },
  { id: 'supply', name: '보급 유공 표창', per: 1, text: v => `시작 보급품 +${v}개` },
  { id: 'elite', name: '특임 표창', per: 10, text: v => `특수 임무 군자금 보상 +${v}%` },
  { id: 'boss', name: '무공 표창', per: 2, text: v => `보스에게 주는 피해 +${v}%` },
  { id: 'crit', name: '명사수 휘장', per: 6, text: v => `치명타 피해 +${v}%p (기본 250%)` },
  { id: 'gamble', name: '심사 위원 표창', per: 1, text: v => `진급 심사 성공률 +${v}%p` },
  { id: 'time', name: '방어 유공 표창', per: 1, text: v => `보스 제한 시간 +${v}초` },
  { id: 'sell', name: '전역 지원 표창', per: 4, text: v => `전역 환급 +${v}%p (기본 40%)` },
  { id: 'medal', name: '모범 부대 표창', per: 5, text: v => `훈장 획득 +${v}%` },
  ...BRANCHES.map(b => ({ id: 'b_' + b.id, name: `${b.name} 부대 표창`, per: 2, branch: b.id, text: v => `${b.name}으로 출격하면 모든 유닛 공격력 +${v}%` })),
];
export const cmVal = (c, lv) => (c.vals ? c.vals[lv] : c.per * lv);
const CM_BY_ID = Object.fromEntries(COMMENDS.map(c => [c.id, c]));
// 표창 효과 값: meta.cm = { 표창 id: 단계 }. 없는 표창은 0
export const cmOf = (meta, id) => cmVal(CM_BY_ID[id], Math.min(CM_NEED.length, (meta && meta.cm && meta.cm[id]) || 0));

// ranks: 등급마다 대표 계급(그 등급에서 가장 높은 이름) — '훈련병 → 원수'처럼 한 줄로 보여 줄 때 쓴다
for (const b of BRANCHES) b.ranks = b.grades.map(g => g.at(-1)[0]);

export const branchById = id => BRANCHES.find(b => b.id === id);
