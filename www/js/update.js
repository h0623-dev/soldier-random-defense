// 자동 업데이트 — 앱 실행 시 호스팅 서버의 version.json을 보고, 더 새 빌드가 있으면 게임 파일을 내려받아 둔다.
// 내려받은 파일은 sw.js가 앱에 든 파일 대신 내준다. 인터넷이 없으면 가지고 있는 버전으로 그대로 실행된다.
//  · 서버 주소: www/update-config.json 의 "url" (비어 있으면 자동 업데이트를 하지 않는다)
//  · 빌드 번호: tools/make-update.mjs 가 www/version.json 과 배포용 version.json 에 적는다
//  · 새 APK를 설치해 앱에 든 빌드가 더 새로워지면 내려받아 둔 것은 버린다
//  · 내려받은 버전이 시작에 실패하면 다음 실행 때 버리고 앱에 든 버전으로 돌아간다 (index.html 의 시작 점검)
const META = 'srd-live-meta', PREFIX = 'srd-live-';
const getJson = async (url, ms = 6000) => {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { cache: 'no-store', signal: ac.signal }); return r.ok ? await r.json() : null; }
  catch { return null; } finally { clearTimeout(t); }
};
async function dropLive(keep) {
  for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== keep && k !== META) await caches.delete(k);
  if (!keep) { await caches.delete(META); localStorage.removeItem('srd_live_build'); }
}

export const buildInfo = { bundled: 0, live: 0, version: '' };

// onReady(remote): 새 버전을 다 받았을 때 호출된다 (다음 실행 또는 새로고침부터 적용)
export async function checkUpdate(onReady) {
  if (!('caches' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  try { await navigator.serviceWorker.register('sw.js'); } catch { return 'unsupported'; }
  const bundled = await getJson('version.json') || {};
  let live = +localStorage.getItem('srd_live_build') || 0;
  Object.assign(buildInfo, { bundled: bundled.build || 0, live, version: bundled.version || '' });
  // 새 APK를 설치해 앱에 든 빌드가 더 새로우면 받아 둔 것을 버리고, 지금 화면도 앱에 든 파일로 다시 연다
  if (live && buildInfo.bundled >= live) { await dropLive(); location.reload(); return 'reset'; }
  const cfg = await getJson('update-config.json') || {};
  if (!cfg.url) return 'off';
  const base = cfg.url.replace(/\/+$/, '');
  const remote = await getJson(`${base}/version.json?t=${Date.now()}`);
  if (!remote || !remote.build || !Array.isArray(remote.files)) return 'offline';
  if (remote.build <= Math.max(buildInfo.bundled, live)) return 'latest';
  if (String(remote.build) === localStorage.getItem('srd_live_bad')) return 'skipped';
  const name = PREFIX + remote.build, cache = await caches.open(name);
  try {
    const queue = [...remote.files];
    await Promise.all(Array.from({ length: 6 }, async () => {
      for (let f; (f = queue.shift());) {
        const r = await fetch(`${base}/${f}?b=${remote.build}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(f);
        // 받은 내용만 새 응답으로 감싸 저장한다. 서버 응답을 그대로 넣으면 그 파일의 주소가 서버 주소로 기억돼,
        // 그 안에서 부르는 다른 파일(import)을 인터넷이 없을 때도 서버에서 찾으려 한다.
        await cache.put('/' + f, new Response(await r.blob(), { headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream' } }));
      }
    }));
  } catch { await caches.delete(name); return 'failed'; }
  await (await caches.open(META)).put('/__active', new Response(name));
  localStorage.setItem('srd_live_build', remote.build);
  await dropLive(name);
  if (onReady) onReady(remote);
  return 'updated';
}
