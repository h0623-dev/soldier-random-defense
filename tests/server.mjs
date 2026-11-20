// 서버 검사: 로컬에 띄운 서버(server 폴더에서 `npx wrangler dev --port 8787`)에 실제로 요청을 보내 본다.  node tests/server.mjs [주소]
import assert from 'node:assert';
const B = process.argv[2] || 'http://127.0.0.1:8787', W = B.replace(/^http/, 'ws');
const get = p => fetch(B + p).then(r => r.json()), post = (p, b) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) }).then(async r => ({ status: r.status, ...(await r.json()) }));
const wait = ms => new Promise(r => setTimeout(r, ms));
function sock(code, q) { const ws = new WebSocket(`${W}/room/${code}/ws?${q}`), got = []; ws.onmessage = e => got.push(JSON.parse(e.data));
  return { ws, got, open: new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }), next: async t => { for (let i = 0; i < 100; i++) { const k = got.findIndex(m => m.t === t); if (k >= 0) return got.splice(k, 1)[0]; await wait(30); } throw new Error('기다리던 글이 오지 않음: ' + t); } }; }

assert.equal((await get('/')).ok, true);
// 랭킹: 좋은 기록만 남고, 점수가 같으면 빨리 끝낸 쪽이 위. 한 사람은 한 줄
const tag = Date.now().toString(36), id = n => `test-${tag}-${n}`;
assert.equal((await post('/rank', { board: 'nope', id: id(1), score: 5 })).status, 400);
assert.equal((await post('/rank', { board: 'rush', id: id(1), score: 11 })).status, 400);        // 보스 러시는 10이 끝
assert.equal((await post('/rank', { board: 'rush', id: 'x', score: 3 })).status, 400);
let r = await post('/rank', { board: 'rush', id: id(1), name: '<b>철수</b>', score: 7, time: 300, branch: 'army' }); assert.equal(r.ok, true); assert.ok(r.rank.all >= 1 && r.rank.week >= 1);
await post('/rank', { board: 'rush', id: id(2), name: '영희', score: 9, time: 500, branch: 'navy' });
await post('/rank', { board: 'rush', id: id(3), name: '아주아주아주긴이름입니다열자넘음', score: 9, time: 400, branch: 'sf' });
await post('/rank', { board: 'rush', id: id(1), name: '철수', score: 5, time: 100, branch: 'army' });      // 더 낮은 기록은 덮지 않는다
let t = await get(`/rank?board=rush&id=${id(1)}`); const mine = t.top.filter(e => e.name === '철수' || e.name === 'b철수/b'), pos = n => t.top.findIndex(e => e.branch && e.name.startsWith(n));
assert.equal(t.top.filter(e => e.me).length, 1); assert.equal(t.top.find(e => e.me).score, 7); assert.equal(t.top.find(e => e.me).name, '철수'); assert.ok(!('id' in t.top[0]), '다른 사람의 식별값은 내보내지 않는다');
assert.ok(pos('아주') < pos('영희') && pos('영희') < t.top.findIndex(e => e.me), '점수 높은 순, 같으면 빠른 순'); assert.equal(t.top[pos('아주')].name.length, 10);
assert.ok((await get('/rank?board=rush&week=1')).top.length >= 3); assert.ok(Array.isArray((await get('/rank?board=coop')).top));
// 방: 만들기 → 두 명 입장 → 서로 글 전달 → 세 번째는 거절 → 한 명이 나가면 알림
const { code } = await post('/room'); assert.match(code, /^\d{4}$/);
const a = sock(code, 'name=' + encodeURIComponent('방장') + '&branch=army'); await a.open; const ha = await a.next('hello'); assert.equal(ha.host, true); assert.equal(ha.peer, null);
const b = sock(code, 'name=' + encodeURIComponent('손님') + '&branch=navy'); await b.open; const hb = await b.next('hello'); assert.equal(hb.host, false); assert.equal(hb.peer.name, '방장'); assert.equal((await a.next('peer')).peer.name, '손님');
a.ws.send(JSON.stringify({ t: 'start', seed: 42 })); assert.equal((await b.next('start')).seed, 42);
b.ws.send(JSON.stringify({ t: 'xfer', hp: 12.5 })); assert.equal((await a.next('xfer')).hp, 12.5);
const c = sock(code, 'name=c'); await c.open; assert.equal((await c.next('refused')).why, 'full');
b.ws.close(); await a.next('left'); a.ws.close(); await wait(300);
const z = sock(code, 'name=z'); await z.open; assert.equal((await z.next('refused')).why, 'no room', '비운 방에는 들어갈 수 없다');
const none = sock('0000', 'name=q').open.catch(() => 'err'); await none;      // 없는 방 번호(네 자리지만 연 적 없음)
// 빠른 매칭: 첫 사람은 새 방의 방장, 두 번째 사람은 그 방으로
const m1 = await get('/match'); assert.equal(m1.host, true); const h = sock(m1.code, 'name=h'); await h.open; await h.next('hello');
const m2 = await get('/match'); assert.equal(m2.host, false); assert.equal(m2.code, m1.code); const j = sock(m2.code, 'name=j'); await j.open; assert.equal((await j.next('hello')).host, false);
const m3 = await get('/match'); assert.equal(m3.host, true); assert.notEqual(m3.code, m1.code);      // 찬 방으로는 보내지 않는다
h.ws.close(); j.ws.close();
console.log('서버 검사 통과');
process.exit(0);
