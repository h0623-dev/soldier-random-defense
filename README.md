# 털뭉치수비대 (옛 이름: 군인 랜덤 디펜스)

군별(육군·해군·해병대·특공대·공군·의경)을 고르고, 계급을 올리고 병과를 조합해 100단계를 방어하는 랜덤 디펜스 게임. 1차 목표는 Google Play, 이후 Steam.

- 실행: `npm run serve` 후 http://localhost:8080 (또는 `www/`를 아무 정적 서버로 열기)
- 검사: `npm test` (조합 규칙 · 데이터 · 자동 플레이 봇)
- Android: `npm ci && npx cap sync android` 후 `android/`에서 `./gradlew assembleDebug` (JDK 21). main에 올리면 GitHub Actions가 시험용 APK를 만든다.
- 문서: `docs/DESIGN.md`(설계), `docs/HANDOFF.md`(인수인계·현재 상태)
