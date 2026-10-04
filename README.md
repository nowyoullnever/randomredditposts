# Random Reddit Posts

GitHub Pages에서 동작하는 최소 Reddit ID 난수 생성기다. 버튼을 누르면 Reddit API나 미리 수집한 목록을 사용하지 않고, 설정된 전체 ID 범위에서 균등하게 뽑은 `https://www.reddit.com/comments/{id}`를 새 탭으로 연다.

## 난수 선택

`random.js`는 `MIN_POST_ID`부터 `MAX_POST_ID_BASE36`까지의 **포함 범위**에서 Web Crypto 난수를 뽑는다. 범위에 딱 맞지 않는 난수 바이트는 버리는 rejection sampling을 사용하므로 modulo bias가 없다. ID는 난수 문자열 조합이 아니라 균등 정수 추첨 후 36진수로 인코딩된다. 점수, 인기, 작성 시기, 댓글 수, 서브레딧은 선택 과정에 쓰이지 않는다.

현재 상한 `1wfcc8u`은 실제로 열리는 [`/r/WLED/comments/1wfcc8u/wledashboard/`](https://www.reddit.com/r/WLED/comments/1wfcc8u/wledashboard/)를 근거로 둔 마지막 수동 관측값이다. 더 최신의 실제 게시물을 확인하면 `random.js`와 `randomreddit.user.js`의 같은 상수를 갱신한다. 이 상한은 자동 최신값 보장이 아니다.

기본 웹사이트는 후보 존재 여부를 검증하지 않는다. 삭제된 ID, 접근 제한, 또는 Reddit이 게시물로 해석하지 못하는 ID가 열릴 수 있다. 이 결과를 검증된 게시물로 표시하지 않으며 Reddit API도 호출하지 않는다.

## Tampermonkey 자동 검증

[`randomreddit.user.js`](https://nowyoullnever.github.io/randomredditposts/randomreddit.user.js)는 다음 두 페이지에서만 실행된다.

- GitHub Pages 사이트: 설치 여부를 비민감 커스텀 이벤트로 표시한다. Reddit 쿠키·로그인 정보·탐색 기록을 전달하지 않는다.
- `rrp=1` 및 탭별 `rrps` 세션 식별자가 있는 Reddit 게시물 URL: 실제 DOM을 관찰한다.

Userscript는 게시물 컨테이너가 보이면 종료한다. 삭제 마커 또는 명시적인 오류 DOM이 있을 때만 같은 탭에서 새 ID로 이동한다. 로그인, 네트워크 오류, 챌린지, 429/접근 차단, 계속 로딩, 예상하지 못한 DOM은 잘못된 ID로 단정하지 않고 중단한다. 재시도는 최대 15회, 1.8초 간격이며 새 탭을 추가로 열지 않는다.

일반 Reddit 탐색·검색·수동 방문에는 `rrp=1`과 올바른 세션 ID가 없으므로 동작하지 않는다.

## 설치

1. [Tampermonkey](https://www.tampermonkey.net/)를 설치한다.
2. 사이트 하단의 **Install userscript** 또는 위 Userscript 링크를 연다.
3. Tampermonkey 설치 화면에서 설치한다.
4. 사이트를 다시 열면 하단 문구가 `Automatic validation enabled.`로 바뀐다.

## 테스트

```powershell
npm test
```

단위 테스트는 36진수 범위, 난수 편향 제거, 경계, 연속 중복 재추첨, 세션 식별 URL을 검사한다.
