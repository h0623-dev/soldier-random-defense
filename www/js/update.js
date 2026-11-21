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
// onProgress(받은 수, 전체 수): 받는 동안 호출된다 — 화면에 "새 버전 받는 중"을 보여 주는 데 쓴다 (전에는 아무 표시 없이 받아서, 받는 중에 보면 반영이 안 된 것처럼 보였다)
export async function checkUpdate(onReady, onProgress) {
  // 개발용 서버(http://)에서는 받지 않는다 — 고치는 중인 파일 대신 배포된 버전이 실행되는 것을 막는다. 시험하려면 주소에 ?update=1
  if (location.protocol === 'http:' && !/[?&]update=1/.test(location.search)) return 'off';
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
  // 지금 가진 파일 중 내용이 같은 것은 서버에서 받지 않고 그대로 옮긴다 (그림이 많아 매번 전부 받으면 느리다).
  //  · 내려받은 버전을 쓰는 중이면 그 버전의 지문 목록(/__manifest), 아니면 앱에 든 version.json의 지문과 비교한다.
  //  · 내려받은 버전이 있는데 서비스 워커가 이 화면을 맡고 있지 않으면 어느 파일이 나올지 알 수 없으므로 전부 받는다.
  const meta = await caches.open(META), mf = live ? await meta.match('/__manifest') : null;
  const have = live ? (mf && navigator.serviceWorker.controller ? await mf.json().catch(() => ({})) : {}) : (bundled.hashes || {});
  const want = remote.hashes || {}, inApp = bundled.hashes || {};
  let done = 0; const total = remote.files.length, tick = () => { done++; if (onProgress && (done % 8 === 0 || done === total)) try { onProgress(done, total); } catch { /* 표시 실패는 무시 */ } };
  if (onProgress) try { onProgress(0, total); } catch { /* 무시 */ }
  const wrap = async r => new Response(await r.blob(), { headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream' } });
  try {
    const queue = [...remote.files];
    await Promise.all(Array.from({ length: 6 }, async () => {
      for (let f; (f = queue.shift()); tick()) {
        // 앱(APK)에 든 파일과 내용이 같으면 받아 두지 않는다 — sw.js가 받아 둔 것에 없는 파일은 앱에 든 파일을 내준다. (전에는 같은 파일 수백 개도 매번 옮겨 담아 오래 걸렸다)
        if (want[f] && inApp[f] === want[f]) continue;
        if (live && want[f] && have[f] === want[f]) {      // 지금 쓰는 내려받은 버전과 같은 파일은 서버에서 받지 않고 옮긴다
          const local = await fetch(f, { cache: 'no-store' }).catch(() => null);
          if (local && local.ok) { await cache.put('/' + f, await wrap(local)); continue; }
        }
        const r = await fetch(`${base}/${f}?b=${remote.build}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(f);
        // 받은 내용만 새 응답으로 감싸 저장한다. 서버 응답을 그대로 넣으면 그 파일의 주소가 서버 주소로 기억돼,
        // 그 안에서 부르는 다른 파일(import)을 인터넷이 없을 때도 서버에서 찾으려 한다.
        await cache.put('/' + f, await wrap(r));
      }
    }));
  } catch { await caches.delete(name); return 'failed'; }
  await meta.put('/__manifest', new Response(JSON.stringify(want)));
  await (await caches.open(META)).put('/__active', new Response(name));
  localStorage.setItem('srd_live_build', remote.build);
  await dropLive(name);
  if (onReady) onReady(remote);
  return 'updated';
}
