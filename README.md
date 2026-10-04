# Random Reddit Posts

GitHub Pages에서 동작하는 최소 Reddit ID 난수 생성기다. 버튼을 누르면 Reddit API를 호출하지 않고 전체 설정 범위에서 균등하게 뽑은 ID의 `https://www.reddit.com/comments/{id}` 주소를 새 탭으로 연다.

## 선택 방식

`random.js`의 `MIN_POST_ID`부터 `MAX_POST_ID_BASE36`까지의 **포함 범위**에서 Web Crypto 난수를 뽑는다. 범위에 딱 맞지 않는 난수 바이트는 버리는 rejection sampling을 사용하므로 modulo bias가 없다. ID는 36진수로 인코딩된다. 인기, 점수, 최신순, 서브레딧, 제목, 카탈로그는 선택 과정에 전혀 사용하지 않는다.

현재 상한 `1wfcc8u`은 실제로 열리는 `/r/WLED/comments/1wfcc8u/wledashboard/`를 근거로 둔 수동 관측값이다. 향후 더 최신의 실제 게시물을 확인하면 `random.js`와 Tampermonkey 스크립트의 같은 상수만 바꾸면 된다. 이 상한은 자동 최신값 보장이 아니라 마지막 관측값이다.

기본 사이트는 후보 ID의 존재를 검사하지 않는다. 삭제된 ID, 댓글 ID, 비공개 게시물 등으로 인해 Reddit 오류 페이지가 열릴 수 있으며, 이를 검증된 결과처럼 표시하지 않는다. 브라우저 보안 정책과 Reddit API 승인 제약 때문에 정적 Pages는 다른 도메인에서 이를 안전하게 검사하지 않는다.

## 선택적 Tampermonkey 재시도

`tampermonkey/random-reddit-retry.user.js`를 Tampermonkey에 설치하면 Reddit 게시물 페이지에서만 실행된다.

- 실제 게시물 DOM이 보이면 즉시 중단한다.
- 명시적인 Reddit 오류 페이지 DOM 또는 오류 제목이 보일 때만 새 ID로 이동한다.
- 로그인·챌린지·네트워크·계속 로딩 상태는 `unknown`으로 처리하며, 유효하지 않은 ID로 오인해 재시도하지 않는다.
- 최대 5회, 각 1.5초 간격으로만 재시도한다.
- API 호출, 로그인 우회, 호출 제한 우회 기능은 없다.

## 테스트

```powershell
npm test
```

테스트는 36진수 범위, 난수 편향 제거, 포함 경계, 직전 결과 재추첨을 검사한다.
