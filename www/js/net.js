// 서버 연결 — 랭킹과 2인 협동. 서버는 server/ 폴더의 Cloudflare Worker.
// 서버 주소는 www/server.json 의 "url" (예: "https://soldier-rd-server.<계정>.workers.dev"). 비어 있으면 서버 기능은 꺼진 채로 둔다.
// 시험할 때는 주소 뒤에 ?server=http://127.0.0.1:8787 을 붙이면 그 서버를 쓴다.
let base;
export async function serverBase() {
  if (base !== undefined) return base;
  const q = typeof location !== 'undefined' && new URLSearchParams(location.search).get('server');
  if (q && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(q)) return (base = q);      // 시험용: 내 컴퓨터의 서버만 허용
  try { const o = await (await fetch('server.json', { cache: 'no-store' })).json(); base = /^https:\/\//.test(o.url || '') ? o.url.replace(/\/+$/, '') : ''; } catch { base = ''; }
  return base;
}
async function call(path, body) {
  const b = await serverBase(); if (!b) throw new Error('no server');
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 7000);
  try {
    const r = await fetch(b + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal } : { signal: ac.signal });
    const o = await r.json(); if (!r.ok) throw new Error(o.error || 'error'); return o;
  } finally { clearTimeout(timer); }
}
export const Net = {
  on: async () => !!(await serverBase()),
  rank: (board, week, id) => call(`/rank?board=${encodeURIComponent(board)}${week ? '&week=1' : ''}&id=${encodeURIComponent(id || '')}`),
  submit: entry => call('/rank', entry),
  createRoom: () => call('/room', {}),
  match: () => call('/match'),
  // 방에 들어간다. on.msg(글)로 서버·동료가 보낸 글을 받고, on.close()는 연결이 끊겼을 때 한 번 불린다
  async join(code, me, on) {
    const b = await serverBase(); if (!b) throw new Error('no server');
    const ws = new WebSocket(`${b.replace(/^http/, 'ws')}/room/${code}/ws?name=${encodeURIComponent(me.name)}&branch=${encodeURIComponent(me.branch)}`);
    let closed = false; const end = () => { if (!closed) { closed = true; on.close && on.close(); } };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } if (m && typeof m.t === 'string') on.msg(m); };
    ws.onclose = end; ws.onerror = end;
    await new Promise((res, rej) => { ws.onopen = res; setTimeout(() => rej(new Error('timeout')), 7000); });
    return { send: o => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }, close: () => { closed = true; try { ws.close(); } catch { /* 이미 닫힘 */ } } };
  },
};
