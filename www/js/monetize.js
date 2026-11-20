// 수익화 연결 지점 — 보상형 광고와 인앱 결제. 게임 쪽은 이 파일의 Ads · Store만 부른다.
//
// 보상형 광고 (AdMob)
//  · 앱(Android): Capacitor 플러그인 @capacitor-community/admob 으로 실제 광고를 띄운다. 광고 단위 ID는 아래 ADMOB.rewarded.
//    지금 값은 구글이 공개한 '테스트 광고' ID다 — 출시 전에 AdMob 계정에서 만든 진짜 ID로 바꿔야 수익이 난다.
//    (앱 ID는 android/app/src/main/AndroidManifest.xml 의 com.google.android.gms.ads.APPLICATION_ID 에 따로 적는다)
//  · 웹(시험용 주소): 광고 SDK가 없어 '시험 광고'(5초 기다리는 화면)로 대신한다. 실제 광고가 아니고 수익도 없다.
// 인앱 결제 (Google Play)
//  · 아직 연결하지 않았다. Play Console에 앱과 상품을 등록한 뒤 결제 플러그인을 붙여 Store.buy 안을 채운다.
//    그 전까지 보석 충전 버튼은 '출시 후 이용'으로 막혀 있다. 주소에 ?dev 를 붙인 웹에서만 시험 구매가 된다.
export const ADMOB = { rewarded: 'ca-app-pub-3940256099942544/5224354917', testing: true };      // 구글 공개 테스트 ID (보상형)

const cap = typeof window !== 'undefined' ? window.Capacitor : null;
const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
const AdMob = native && cap.registerPlugin ? cap.registerPlugin('AdMob') : null;
const DEV = typeof location !== 'undefined' && /[?&]dev\b/.test(location.search);

let inited = null, busy = false;
function init() {      // 처음 광고를 쓸 때 한 번
  return inited || (inited = AdMob.initialize({ initializeForTesting: ADMOB.testing }).catch(() => { inited = null; throw new Error('init'); }));
}
// 시험 광고(웹): 5초 뒤에 닫을 수 있다. 끝까지 기다리면 true
function fakeAd() {
  return new Promise(done => {
    const el = document.createElement('div'); el.id = 'fakead'; let left = 5;
    el.innerHTML = '<div><small>시험 광고 — 실제 광고가 아닙니다</small><b>광고 화면</b><p id="fakead-t"></p><button id="fakead-x">건너뛰기 (보상 없음)</button></div>';
    document.body.appendChild(el);
    const end = ok => { clearInterval(iv); el.remove(); done(ok); }, t = el.querySelector('#fakead-t'), x = el.querySelector('#fakead-x');
    const show = () => { t.textContent = left > 0 ? `${left}초 뒤에 보상을 받습니다` : '시청 완료'; if (left <= 0) { x.textContent = '보상 받기'; x.className = 'ok'; } };
    x.onclick = () => end(left <= 0); show();
    const iv = setInterval(() => { left--; show(); }, 1000);
  });
}
export const Ads = {
  native, testing: !native || ADMOB.testing,
  available: () => (native ? !!AdMob : true),
  // 보상형 광고를 보여 준다. 끝까지 봐서 보상 조건을 채우면 true, 닫거나 실패하면 false
  async showRewarded() {
    if (busy) return false; busy = true;
    try {
      if (!native) return await fakeAd();
      if (!AdMob) return false;
      await init();
      let got = false; const subs = [];
      const closed = new Promise(res => {
        const on = (name, f) => { const h = AdMob.addListener(name, f); subs.push(h); };
        on('onRewardedVideoAdReward', () => { got = true; });
        on('onRewardedVideoAdDismissed', () => res());
        on('onRewardedVideoAdFailedToShow', () => res());
      });
      try { await AdMob.prepareRewardVideoAd({ adId: ADMOB.rewarded, isTesting: ADMOB.testing }); await AdMob.showRewardVideoAd(); await Promise.race([closed, new Promise(r => setTimeout(r, 90000))]); }
      finally { for (const h of subs) Promise.resolve(h).then(x => x && x.remove && x.remove()).catch(() => {}); }
      return got;
    } catch { return false; } finally { busy = false; }
  },
};

// 인앱 결제 상품(보석). 값은 Play Console에서 정하므로 여기에는 적지 않는다 — 연결되면 스토어가 알려 주는 값을 보여 준다
export const Store = {
  ready: false, dev: DEV && !native,
  products: [
    { id: 'gems_100', gems: 100, name: '보석 100개' },
    { id: 'gems_550', gems: 550, name: '보석 550개', note: '+10%' },
    { id: 'gems_1200', gems: 1200, name: '보석 1200개', note: '+20%' },
  ],
  // 구매가 끝나면 받은 보석 수, 아니면 0. (지금은 ?dev 시험 구매만 된다)
  async buy(id) { const p = Store.products.find(x => x.id === id); if (!p) return 0; return Store.dev ? p.gems : 0; },
};
