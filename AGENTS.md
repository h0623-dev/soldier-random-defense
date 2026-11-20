# 군인 랜덤 디펜스 — 작업 안내 (Codex · 그 밖의 AI 도구용)

이 저장소는 **Claude Code와 Codex가 함께** 작업한다. 평소에는 Claude Code가 주 작업자이고, 그림 생성 같은 일은 Claude가 `codex exec`로 Codex를 불러 맡긴다(`tools/codex_art.py`). 그렇게 불린 경우에는 시킨 일(예: 그림 한 장을 만들어 저장)만 하고 저장소의 다른 파일은 건드리지 않는다. Claude Code는 `CLAUDE.md`를, Codex는 이 파일을 읽는다. 두 파일의 규칙은 같아야 한다 — 한쪽을 고치면 다른 쪽도 맞춘다.

## 먼저 읽을 것
1. `docs/HANDOFF.md` — 지금 상태와 날짜별 작업 기록(맨 위가 최신). **작업을 시작하기 전에 맨 위 두세 항목을 읽는다.**
2. `docs/DESIGN.md` — 규칙과 수치의 근거. 뒤쪽 항목이 앞쪽을 대체한다(같은 주제는 가장 아래 것이 지금 규칙).
3. `docs/CLAUDE_CODE_HANDOFF.md` — 프로젝트 개요, 파일 구조, 사용자가 정한 규칙.
4. 서버·랭킹·협동은 `docs/SERVER.md`, 협타디 대조 기획은 `docs/PLAN_COOPTD_GAP.md`.

## 사용자가 정한 규칙 (어기지 않는다)
- 보고는 **한국어**. "직접 한 작업 / 검사 / 배포 / 남은 한계"를 구분하고, 기능 검사 통과와 보기 좋게 완성됨을 같은 것으로 말하지 않는다. 하지 않은 것, 확인하지 못한 것은 그대로 적는다.
- 다른 게임 저장소(천수, 로드헤이븐, House 등)와 같은 Cloudflare 계정의 `road-haven-meeting`은 건드리지 않는다.
- 앱 ID(`com.steey.soldierdefense`), 서명 키, 스토어 등록, 광고 ID(AdMob), 결제 상품·가격은 사용자 확인 없이 정하거나 바꾸지 않는다.
- 키·토큰을 채팅으로 요청하지 않는다. 저장소에도 적지 않는다.
- 사용자는 여러 컴퓨터를 오가며 개발한다. 특정 기기에만 있는 설정에 의존하지 말고 필요한 것은 저장소에 둔다.
- 수치를 바꾸면 `npm test`로 봇 결과를 확인하고, 결과를 `docs/DESIGN.md`에 근거로 남긴다.

## 구조 (요점)
- 빌드 도구 없는 웹 게임(`www/`, ES 모듈) + Capacitor Android(`android/`). `main`에 올리면 Cloudflare Pages가 `https://soldier-rd-game.pages.dev`에 배포하고, 앱은 다음 실행 때 새 버전을 받는다.
- `www/js/core.js` 게임 규칙(화면과 분리, node에서 검사) · `www/js/data.js` 계급·병과·용사·표창 데이터 · `www/js/meta.js` 전투 밖 성장 · `www/js/main.js` 화면과 입력 · `www/js/render.js` 전장 그리기 · `www/js/net.js`와 `server/` 랭킹·2인 협동.
- **조작은 모두 `C.exec(g, 누가, [명령…])`을 거친다.** 2인 협동은 두 기기가 같은 걸음에 같은 명령을 실행해 똑같이 계산한다. 그래서 `core.js`의 `step()` 안에서는 "이 기기의 플레이어"에 기대는 값(`g.gold`, `g.branch`, `g.meta` …)을 직접 읽으면 안 된다 — `each()`나 유닛의 주인(`u.o`)으로만. 깨지면 협동이 어긋난다(`tests/sim.mjs`의 3-14가 잡는다).

## 검사
```bash
npm ci
npm test                      # 규칙 검사 + 봇 플레이 (반드시 통과)
```
화면을 고쳤으면 로컬 서버를 띄우고(`python3 -m http.server 8080 -d www`) `node tests/screens.cjs`(화면 크기 26종, Playwright 필요)도 돌린다. 서버 코드를 고쳤으면 `cd server && npx wrangler dev --port 8787` 뒤 `node tests/server.mjs`.

## 두 도구가 함께 일하는 규칙
1. **기준은 GitHub의 `main`.** 시작할 때 최신 `main`을 받아 그 위에서 작업한다. 오래 묵힌 가지는 만들지 않는다(`www/js/main.js`·`core.js`는 줄이 길어 충돌이 잘 난다).
2. **가지 이름**: Claude는 `claude/…`, Codex는 `codex/…`. 다른 도구의 가지에는 올리지 않는다. 두 이름 모두 올리면 Android 시험 빌드가 돈다.
3. **`main`에 넣기 전에** `npm test`가 통과해야 한다. Claude는 사용자 허락으로 `main`에 바로 올린다. Codex는 사용자가 따로 정하지 않았다면 **풀 리퀘스트를 만들고 사용자가 합치게** 한다.
4. **같은 파일을 동시에 고치지 않는다.** 큰 작업을 시작할 때 `docs/HANDOFF.md` 맨 위 "진행 중" 줄에 "도구 · 무엇 · 건드리는 파일"을 적고, 끝나면 지운다. 다른 도구가 적어 둔 것이 있으면 그 파일은 피하거나 사용자에게 묻는다.
5. **끝나면 기록한다.** `docs/HANDOFF.md` 맨 위에 "날짜 — 제목" 항목(경위 / 직접 한 작업 / 검사 / 남은 한계)을 더하고, 규칙·수치가 바뀌었으면 `docs/DESIGN.md` 맨 아래에 항목을 더한다. 항목 제목에 어느 도구가 했는지 적는다(예: "… (Codex)"). Notion 기록은 접근할 수 있는 도구만 한다 — 못 하면 HANDOFF에 "Notion 미기록"이라고 적는다.
6. **다른 도구가 한 일을 되돌리거나 크게 갈아엎지 않는다.** 문제를 찾으면 고치기 전에 HANDOFF의 해당 항목과 DESIGN의 근거를 읽고, 그래도 바꿔야 하면 왜 바꾸는지 기록한다.
7. 서버(`server/`)를 고치면 다시 배포해야 반영된다(`docs/SERVER.md`). 배포할 수단이 없으면 고치지 말고 사용자에게 알린다.

## 진행 중 표시를 적는 자리
`docs/HANDOFF.md`의 첫 제목 바로 아래 `> 진행 중:` 줄.
