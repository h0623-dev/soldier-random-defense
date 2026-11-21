# 서버 — 랭킹과 2인 협동

랭킹과 2인 협동은 서버가 있어야 동작한다. 서버 코드는 `server/`(Cloudflare Worker + Durable Objects)에 있다.

**2026-11-20 배포됨** — `https://soldier-rd-server.road-haven-h0623-dev-13c8f055.workers.dev` (주소는 `www/server.json`에 적혀 있다).
- 주소의 `road-haven-…` 부분은 이 Cloudflare 계정 전체의 Worker 주소 꼬리표다(계정에서 처음 만든 Worker 이름에서 온 것). 로드헤이븐 프로젝트와는 코드도 데이터도 섞이지 않는다. 꼬리표를 바꾸면 `road-haven-meeting`의 주소도 바뀌므로 바꾸지 않는다.
- 배포 방법: 대시보드에서 Worker 생성이 되지 않아(이름 칸에 오류 표시), 사용자가 만든 **7일짜리 API 토큰**(Workers 편집 권한, Zone 권한 없음)을 이 작업 환경의 Network secrets에 넣고 Claude가 `server/`에서 `npx wrangler deploy`로 올렸다. 토큰은 2026-11-27에 만료된다.
- **서버 코드를 고치면 다시 배포해야 한다.** 지금은 자동 배포가 연결되어 있지 않다. 방법: ① 새 토큰을 같은 식으로 넣고 `cd server && CLOUDFLARE_API_TOKEN=proxy-injected CLOUDFLARE_ACCOUNT_ID=<계정 id> npx wrangler deploy` ② 또는 아래 A(대시보드에서 이미 있는 Worker에 저장소 연결: Settings → Builds → Connect) ③ 또는 아래 B(GitHub Actions 비밀 값).
- 서버 주소가 비어 있으면 게임의 "2인 협동"과 "랭킹" 화면에 "서버가 아직 연결되지 않았습니다"라고 나오고, 나머지 기능은 그대로 동작한다.

## 처음 켜는 순서 (참고 — 이미 켜져 있다)

1. **서버 배포** — 아래 둘 중 하나. (A를 권한다. 2026-11-20에 Cloudflare 공식 문서 "Workers Builds"로 확인한 절차다. 화면의 낱말은 바뀔 수 있다)
   - **A. Cloudflare 화면에서 저장소 연결** (자동 업데이트용 Pages를 연결했던 것과 같은 방식, 토큰 불필요)
     1. https://dash.cloudflare.com 에 로그인 → 왼쪽 메뉴 **Workers & Pages**.
     2. **Create application**(애플리케이션 만들기) → **GitHub** 선택. GitHub 로그인·권한 창이 뜨면 허용한다(Pages를 연결할 때 이미 허용했으면 뜨지 않는다).
     3. 저장소 목록에서 **`soldier-random-defense`** 를 고른다. 목록에 없으면 GitHub 쪽에서 Cloudflare 앱에 이 저장소 접근을 허용해야 한다.
     4. 설정 화면에서 아래 값을 넣는다.
        | 항목 | 값 |
        |---|---|
        | Project name (Worker 이름) | `soldier-rd-server` — **반드시 이 이름**. `server/wrangler.toml`의 `name`과 다르면 빌드가 실패한다 |
        | Git branch (Production branch) | `main` |
        | Root directory | `server` |
        | Build command | 비워 둔다 |
        | Deploy command | `npx wrangler deploy` (기본값 그대로) |
        | API token | 기본값(자동으로 만들어 줌) 그대로 |
     5. **Save and Deploy**. 1~2분 뒤 빌드 기록에 성공이 뜨면 끝.
     6. 주소 확인: 그 Worker 화면 위쪽(또는 Settings → Domains & Routes)에 `https://soldier-rd-server.<계정 이름>.workers.dev` 가 보인다. 브라우저로 열어 `{"ok":true,"name":"soldier-rd-server","v":1}` 이 나오면 정상이다.
     7. (권장) 그 Worker의 **Settings → Build** 에서 ① main이 아닌 가지의 빌드(preview builds)를 끈다 — 이 저장소는 작업용 가지에도 자주 올리는데, 서버는 main만 배포하면 된다. ② Build watch paths의 포함 경로를 `server/*` 로 두면 게임만 바뀐 커밋에서는 서버를 다시 배포하지 않는다.
     이후 main에 `server/`가 바뀐 커밋이 올라오면 자동으로 다시 배포된다.
   - **B. GitHub Actions** — 저장소 Settings → Secrets and variables → Actions 에 `CLOUDFLARE_API_TOKEN`(Workers 편집 권한)과 `CLOUDFLARE_ACCOUNT_ID`를 넣는다. `.github/workflows/server.yml`이 `server/`가 바뀔 때마다 배포한다. (값은 채팅에 적지 말고 GitHub 화면에 직접 넣는다)
2. **서버 주소 적기** — 위 6번의 주소를 `www/server.json`의 `"url"`에 적고 main에 올린다(주소는 비밀이 아니다 — Claude에게 알려 주면 대신 적는다).
3. 게임에서 "랭킹"과 "2인 협동"이 열리는지 확인한다.

**잘 안 될 때**
- 빌드 실패, 기록에 "name … does not match" 비슷한 말 → 4번의 Project name이 `soldier-rd-server`가 아니다. Worker를 지우고 다시 만들거나 이름을 맞춘다.
- 빌드 실패, `wrangler.toml`을 못 찾는다 → Root directory가 `server`가 아니다.
- 주소를 열면 오류 1042/1101 등 → 빌드 기록의 마지막 줄을 Claude에게 보여 주면 된다(비밀 값은 들어 있지 않다).

같은 Cloudflare 계정의 다른 프로젝트(`road-haven-meeting` 등)는 건드리지 않는다. 이 서버는 `soldier-rd-server`라는 이름의 Worker 하나만 만든다.

## 비용
- Cloudflare 무료 요금제로 시작할 수 있다(Workers 하루 10만 요청, Durable Objects는 SQLite 방식이라 무료 요금제에서 쓸 수 있다). 2026-11 기준 값이며 바뀔 수 있으니 Cloudflare 요금 안내를 확인한다.
- 협동 한 판은 연결 2개와 걸음 번호(초당 20건쯤)·명령·견줄 값이다. 어긋났을 때만 전장 상태(수만 자)를 통째로 넘긴다. 웹소켓은 '잠드는(hibernation)' 방식이라 글이 오갈 때만 계산된다.
- 이용자가 늘어 한도를 넘으면 그날은 서버 기능이 멈춘다(게임 자체는 계속 된다). 그때 유료 요금제(월 5달러부터)를 정하면 된다.

## 구조
| 주소 | 내용 |
|---|---|
| `GET /` | 상태 확인 |
| `GET /rank?board=&week=1&id=` | 랭킹 상위 50명과 내 순위. board = `stage`(깬 스테이지 번호) · `endless` · `rush` · `coop`(함께 깬 스테이지 번호). `normal-0~2`는 스테이지가 생기기 전의 판(옛 앱용) |
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
