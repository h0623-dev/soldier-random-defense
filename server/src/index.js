// 털뭉치 수비대 서버 (Cloudflare Worker)
//  GET  /                      상태 확인
//  GET  /rank?board=&week=1&id=  랭킹 상위 50 (+ 내 순위)
//  POST /rank                  기록 올리기 { board, id, name, score, time, branch }
//  POST /room                  협동 방 만들기 → { code }
//  GET  /match                 빠른 매칭 → { code, host }  (기다리는 방이 있으면 그 방, 없으면 새 방)
//  GET  /room/<code>/ws        방에 웹소켓으로 들어가기 (두 명까지). 한쪽이 보낸 글을 다른 쪽에 그대로 넘긴다 (걸음 번호·명령·견줄 값)
// 서버는 게임 규칙을 모른다(기록을 검증하지 못한다). 말이 안 되는 값만 걸러 낸다.
import { DurableObject } from 'cloudflare:workers';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
// 랭킹 판: 이름 → 올릴 수 있는 가장 큰 점수(도달 단계 · 잡은 보스 수)
export const BOARDS = { 'normal-0': 100, 'normal-1': 100, 'normal-2': 100, endless: 2000, rush: 10, coop: 100 };
const KEEP = 100, SHOW = 50;
export const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').trim().slice(0, 10) || '이름없음';
// 주간 판의 이름: 그 주 월요일(UTC)의 날짜
export function weekKey(now = Date.now()) { const d = new Date(now); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (path === '/') return json({ ok: true, name: 'soldier-rd-server', v: 1 });
      const hub = env.HUB.get(env.HUB.idFromName('hub'));
      if (path === '/rank' || path === '/room' || path === '/match') return await hub.fetch(req);
      const m = path.match(/^\/room\/(\d{4})\/ws$/);
      if (m) return await env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);
      return json({ error: 'not found' }, 404);
    } catch (e) { return json({ error: 'server error' }, 500); }
  },
};

// 랭킹 · 방 번호 · 빠른 매칭을 맡는 하나뿐인 객체
export class Hub extends DurableObject {
  async fetch(req) {
    const url = new URL(req.url), path = url.pathname;
    if (path === '/rank' && req.method === 'GET') return this.rankGet(url);
    if (path === '/rank' && req.method === 'POST') return this.rankPost(await req.json().catch(() => null));
    if (path === '/room' && req.method === 'POST') return json({ code: await this.newRoom() });
    if (path === '/match') return this.match();
    return json({ error: 'not found' }, 404);
  }
  boardKey(board, week) { return (week ? 'w:' + weekKey() + ':' : 'a:') + board; }
  async rankGet(url) {
    const board = url.searchParams.get('board'), id = url.searchParams.get('id') || '';
    if (!(board in BOARDS)) return json({ error: 'bad board' }, 400);
    const list = (await this.ctx.storage.get(this.boardKey(board, url.searchParams.get('week') === '1'))) || [];
    const mine = id ? list.findIndex(e => e.id === id) : -1;
    return json({ board, top: list.slice(0, SHOW).map(({ id: _, ...e }, i) => ({ ...e, me: i === mine })), rank: mine >= 0 ? mine + 1 : 0, total: list.length });
  }
  async rankPost(b) {
    if (!b || !(b.board in BOARDS)) return json({ error: 'bad board' }, 400);
    const score = Math.floor(+b.score), time = Math.max(0, Math.min(1e7, Math.floor(+b.time || 0))), id = String(b.id || '').slice(0, 40);
    if (!(score >= 1 && score <= BOARDS[b.board]) || id.length < 8) return json({ error: 'bad score' }, 400);
    const e = { id, name: cleanName(b.name), score, time, branch: String(b.branch || '').slice(0, 10), at: Date.now() }, out = {};
    for (const week of [false, true]) {      // 전체 판과 이번 주 판에 함께 적는다. 한 사람은 가장 좋은 기록 하나만 남는다(점수가 같으면 빨리 끝낸 쪽)
      const key = this.boardKey(b.board, week), list = (await this.ctx.storage.get(key)) || [], old = list.findIndex(x => x.id === id);
      const better = old < 0 || score > list[old].score || (score === list[old].score && time < list[old].time);
      if (better) { if (old >= 0) list.splice(old, 1); list.push(e); list.sort((x, y) => y.score - x.score || x.time - y.time || x.at - y.at); list.length = Math.min(list.length, KEEP); await this.ctx.storage.put(key, list); }
      else if (list[old].name !== e.name) { list[old].name = e.name; await this.ctx.storage.put(key, list); }
      out[week ? 'week' : 'all'] = list.findIndex(x => x.id === id) + 1;      // 0이면 100위 밖
    }
    return json({ ok: true, rank: out });
  }
  // 방 번호: 지금 쓰이지 않는 네 자리 숫자
  async newRoom() {
    for (let i = 0; i < 30; i++) {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const r = await this.env.ROOM.get(this.env.ROOM.idFromName(code)).fetch(new Request('https://room/open', { method: 'POST' }));
      if (r.ok) return code;
    }
    throw new Error('no room');
  }
  // 빠른 매칭: 기다리는 방이 있으면(만든 지 90초 안, 아직 한 명) 그 방으로, 없으면 새 방을 만들고 기다린다
  async match() {
    const w = await this.ctx.storage.get('waiting');
    if (w && Date.now() - w.at < 90000) {
      const r = await this.env.ROOM.get(this.env.ROOM.idFromName(w.code)).fetch(new Request('https://room/state'));
      const st = r.ok ? await r.json() : null; await this.ctx.storage.delete('waiting');
      if (st && st.open && st.n === 1) return json({ code: w.code, host: false });
    }
    const code = await this.newRoom(); await this.ctx.storage.put('waiting', { code, at: Date.now() });
    return json({ code, host: true });
  }
}

// 협동 방 하나. 두 명까지 들어오고, 한쪽이 보낸 글을 다른 쪽에 넘긴다. 쉬는 동안 과금되지 않게 '잠드는 웹소켓'을 쓴다
export class Room extends DurableObject {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/open') {      // Hub가 방을 연다. 이미 열려 있으면(2시간 안) 거절
      const at = await this.ctx.storage.get('open'); if (at && Date.now() - at < 7200e3) return json({ error: 'in use' }, 409);
      await this.ctx.storage.put('open', Date.now()); await this.ctx.storage.setAlarm(Date.now() + 7200e3); return json({ ok: true });
    }
    if (url.pathname === '/state') return json({ open: !!(await this.ctx.storage.get('open')), n: this.ctx.getWebSockets().length });
    if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket only' }, 426);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair), others = this.ctx.getWebSockets();
    const refuse = why => { server.accept(); server.send(JSON.stringify({ t: 'refused', why })); server.close(4000, why); return new Response(null, { status: 101, webSocket: client }); };
    if (!(await this.ctx.storage.get('open'))) return refuse('no room');
    if (others.length >= 2) return refuse('full');
    const info = { name: cleanName(url.searchParams.get('name')), branch: String(url.searchParams.get('branch') || '').slice(0, 10), host: others.length === 0 };
    this.ctx.acceptWebSocket(server); server.serializeAttachment(info);
    const peer = others[0] ? others[0].deserializeAttachment() : null;
    server.send(JSON.stringify({ t: 'hello', host: info.host, peer }));
    for (const o of others) o.send(JSON.stringify({ t: 'peer', peer: info }));
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 200000) return;      // 지나치게 큰 글·이진 자료는 버린다 (어긋났을 때 넘기는 전장 상태가 수만 자다)
    for (const o of this.ctx.getWebSockets()) if (o !== ws) { try { o.send(msg); } catch { /* 닫히는 중 */ } }
  }
  webSocketClose(ws) { this.left(ws); }
  webSocketError(ws) { this.left(ws); }
  async left(ws) {
    for (const o of this.ctx.getWebSockets()) if (o !== ws) { try { o.send(JSON.stringify({ t: 'left' })); } catch { /* 닫히는 중 */ } }
    if (this.ctx.getWebSockets().filter(o => o !== ws).length === 0) await this.ctx.storage.deleteAll();      // 아무도 없으면 방을 비운다
  }
  async alarm() { for (const o of this.ctx.getWebSockets()) { try { o.close(4001, 'expired'); } catch { /* 이미 닫힘 */ } } await this.ctx.storage.deleteAll(); }
}
