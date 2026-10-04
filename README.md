# Random Reddit Posts

GitHub Pages에서 바로 동작하는 정적 Reddit 게시물 선택기다. API 키, 서버, 브라우저의 Reddit API 요청이 필요 없다. 버튼은 로컬 카탈로그에서 검증된 개별 Reddit permalink 하나를 선택해 새 탭으로 연다.

## 동작 방식

- `data/posts.json`은 ID, 공식 permalink, `over18`, `subredditOver18`, 검증 시각만 가진 정적 카탈로그다. 제목·본문·점수·조회수는 저장하거나 화면에 표시하지 않는다.
- 클릭마다 Web Crypto 난수로 카탈로그의 후보를 균등 선택한다. 모듈러 연산의 편향은 rejection sampling으로 제거한다.
- 직전 ID는 다른 후보가 있는 경우 후보군에서 제외한다.
- `only SFW contents`를 켜면 `over18 === false`와 `subredditOver18 === false`가 모두 확인된 레코드만 남긴 뒤 같은 방식으로 선택한다. 체크를 끄면 NSFW 레코드도 후보군에 포함한다.
- 팝업 차단을 피하기 위해 클릭 이벤트 안에서 빈 새 탭을 먼저 열고, 선택된 검증 permalink로만 이동시킨다. 카탈로그가 없거나 잘못되었으면 해당 탭을 닫고 추측 URL은 열지 않는다.

## 카탈로그 유지보수

초기 카탈로그의 19개 URL은 2026-10-04에 Reddit oEmbed 응답(HTTP 200)으로 존재 여부를 확인했다. 다음 명령은 모든 현재 URL을 1.1초 간격으로 다시 확인한다. 실패한 항목은 수동으로 재검증하거나 삭제한 뒤 커밋한다.

```powershell
npm run verify:catalog
```

이 스크립트는 무단 수집 도구가 아니다. 새 레코드를 추가할 때는 실제 Reddit permalink만 사용하고, Reddit에서 확인한 `over_18` 및 서브레딧 NSFW 상태를 함께 기록해야 한다.

## 한계

정적 모드는 카탈로그 **내부에서만** 균등하다. 현재 카탈로그가 전체 Reddit·모든 시대·모든 공개 서브레딧을 대표하거나 전체 게시물에 균등 확률을 준다고 주장하지 않는다. 전체 범위의 ID 기반 rejection sampling은 Reddit의 승인된 OAuth API를 사용하는 별도 백엔드가 있어야 가능하며, 이 무료 GitHub Pages 배포에는 포함하지 않았다.

## 테스트

```powershell
npm test
```

단위 테스트는 난수 편향 제거, SFW 조건, NSFW 포함/제외, 직전 결과 중복 회피를 검사한다.
