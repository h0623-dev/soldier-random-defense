// 수익화 연결 지점 (광고 · 인앱결제). 아직 SDK 미연동 — 모두 "준비 중" 상태.
// Play 출시 단계에서 AdMob(보상형 광고)과 Google Play 결제를 이 파일 안에서만 연결하면 됩니다.
export const Monetize = {
  adsReady: false,
  billingReady: false,
  async showRewardedAd() { return false; },   // true = 광고 시청 완료 → 보상 지급
  async purchase(productId) { return false; },
  products: [
    { id: 'medal_pack_s', name: '훈장 30개', note: '준비 중' },
    { id: 'medal_pack_l', name: '훈장 200개', note: '준비 중' },
    { id: 'remove_ads', name: '광고 제거', note: '준비 중' },
  ],
};
