// 자동 업데이트용 서비스 워커.
// 앱에 들어 있는 파일보다 새 버전을 내려받아 둔 것이 있으면(캐시 'srd-live-<빌드>') 그 파일을 대신 내준다.
// 내려받은 것이 없거나 거기에 없는 파일은 앱에 들어 있는 원래 파일을 쓴다.
const META = 'srd-live-meta';
async function activeCache() {
  const r = await (await caches.open(META)).match('/__active');
  return r ? r.text() : null;
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  if (u.pathname === '/version.json' || u.pathname === '/sw.js') return;   // 앱에 든 빌드 번호는 항상 원본을 읽는다
  e.respondWith((async () => {
    try {
      const name = await activeCache();
      if (name) {
        const hit = await (await caches.open(name)).match(u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname);
        if (hit) return hit;
      }
    } catch { /* 캐시를 못 읽으면 원본 사용 */ }
    return fetch(e.request);
  })());
});
