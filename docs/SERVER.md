# 서버 — 랭킹과 2인 협동

랭킹과 2인 협동은 서버가 있어야 동작한다. 서버 코드는 `server/`(Cloudflare Worker + Durable Objects)에 있고, **아직 배포되지 않았다.**
배포 전에는 게임의 "2인 협동"과 "랭킹" 화면에 "서버가 아직 연결되지 않았습니다"라고 나오고, 나머지 기능은 그대로 동작한다.

## 켜는 순서 (사용자가 할 일)

1. **서버 배포** — 아래 둘 중 하나.
   - **A. Cloudflare 화면에서 저장소 연결** (자동 업데이트용 Pages를 연결했던 것과 같은 방식, 토큰 불필요)
     Cloudflare 대시보드 → Workers & Pages → Create → **Workers** → Import a repository → `soldier-random-defense` 선택 →
     Project name `soldier-rd-server`, **Root directory `server`**, Deploy command `npx wrangler deploy` → 저장.
     이후 main에 push할 때마다 자동으로 다시 배포된다.
   - **B. GitHub Actions** — 저장소 Settings → Secrets and variables → Actions 에 `CLOUDFLARE_API_TOKEN`(Workers 편집 권한)과 `CLOUDFLARE_ACCOUNT_ID`를 넣는다. `.github/workflows/server.yml`이 `server/`가 바뀔 때마다 배포한다. (값은 채팅에 적지 말고 GitHub 화면에 직접 넣는다)
2. **서버 주소 적기** — 배포가 끝나면 Cloudflare가 `https://soldier-rd-server.<계정 이름>.workers.dev` 같은 주소를 준다. 이 주소를 `www/server.json`의 `"url"`에 적고 main에 올린다(주소는 비밀이 아니다 — Claude에게 알려 주면 대신 적는다).
3. 게임에서 "랭킹"과 "2인 협동"이 열리는지 확인한다.

같은 Cloudflare 계정의 다른 프로젝트(`road-haven-meeting` 등)는 건드리지 않는다. 이 서버는 `soldier-rd-server`라는 이름의 Worker 하나만 만든다.

## 비용
- Cloudflare 무료 요금제로 시작할 수 있다(Workers 하루 10만 요청, Durable Objects는 SQLite 방식이라 무료 요금제에서 쓸 수 있다). 2026-11 기준 값이며 바뀔 수 있으니 Cloudflare 요금 안내를 확인한다.
- 협동 한 판은 연결 2개와 걸음 번호(초당 20건쯤)·명령·견줄 값이다. 어긋났을 때만 전장 상태(수만 자)를 통째로 넘긴다. 웹소켓은 '잠드는(hibernation)' 방식이라 글이 오갈 때만 계산된다.
- 이용자가 늘어 한도를 넘으면 그날은 서버 기능이 멈춘다(게임 자체는 계속 된다). 그때 유료 요금제(월 5달러부터)를 정하면 된다.

## 구조
| 주소 | 내용 |
|---|---|
| `GET /` | 상태 확인 |
| `GET /rank?board=&week=1&id=` | 랭킹 상위 50명과 내 순위. board = `normal-0`·`normal-1`·`normal-2`(난이도) · `endless` · `rush` · `coop` |
| `POST /rank` | 기록 올리기 `{ board, id, name, score, time, branch }`. 한 사람은 판마다 가장 좋은 기록 하나. 전체 판과 이번 주 판에 함께 적는다 |
| `POST /room` | 협동 방 만들기 → 네 자리 방 번호 |
| `GET /match` | 빠른 매칭 → 기다리는 방이 있으면 그 방, 없으면 새 방 |
| `GET /room/<번호>/ws` | 웹소켓으로 방에 들어가기(두 명까지). 한쪽이 보낸 글을 다른 쪽에 그대로 넘긴다 |

- `Hub`(하나뿐인 객체): 랭킹 저장, 방 번호 발급, 빠른 매칭 대기.
- `Room`(방마다 하나): 두 사람의 연결을 잇는다. 아무도 없으면 비우고, 2시간이 지나면 닫는다.
- 서버는 **게임 규칙을 모른다.** 협동의 계산은 각자의 기기에서 하고 서버는 글만 넘긴다.

## 한계 (알고 있어야 할 것)
- **기록을 검증하지 못한다.** 서버는 "100단계를 넘는 값" 같은 말이 안 되는 것만 거른다. 앱을 고쳐서 거짓 기록을 올리는 것은 막지 못한다. 막으려면 서버가 게임을 다시 계산하거나 로그인·기기 인증을 붙여야 한다.
- 로그인이 없다. 기기마다 무작위 식별값과 별명을 쓰므로, 앱을 지우면 랭킹의 내 줄과 이어지지 않는다.
- 별명은 10자까지이고 특수 문자만 거른다. **욕설·부적절한 이름을 거르는 장치는 없다.**
- 협동은 방장의 기기가 걸음을 센다. 방장의 화면이 가려지면(다른 앱으로 전환) 손님도 기다린다. 방장이 나가면 손님이 혼자 이어간다.
- 주간 랭킹은 월요일 0시(UTC, 한국 시각 오전 9시)에 새 판으로 바뀐다. 지난 주 판은 지우지 않고 남는다(정리 기능 없음).

## 시험
```bash
cd server && npm install && npx wrangler dev --port 8787
```
```bash
node tests/server.mjs
```
게임을 `http://localhost:8080/?server=http://127.0.0.1:8787` 로 열면 로컬 서버에 붙는다(내 컴퓨터 주소만 허용).
