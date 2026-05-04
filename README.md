# 점수께산기

중학교 내신 점수를 편하게 계산하려고 만든 웹앱입니다.

## 바로가기

- 서비스 주소: <https://jumsu33.kro.kr/>
- 정적 랜딩 페이지: `landing/index.html`

3학년 1학기 수행/지필 점수 계산이랑, 전체 가내신 계산을 한 화면에서 할 수 있게 해뒀습니다.

로그인하면 입력한 값이 서버에 저장돼서, 다시 들어와도 전에 적은 점수가 남아 있습니다.  
앱 설치 버튼도 지원해서 휴대폰에서는 앱처럼 열어 쓸 수 있습니다.

## 들어있는 기능

- 3-1 과목별 점수 계산
- 전체 가내신 계산
- 학기별 원점수 / 성취도 입력
- 체육, 미술, 음악 같은 예체능 성취도 반영
- 출결, 봉사, 학교활동 점수 반영
- 3-2 성적을 쓸지 말지 선택
- 로그인 / 회원가입
- 입력값 자동 저장

가내신 계산에서 아예 안 들어가는 과목은 `@ 제외`로 막아놨습니다.  
지금 기준으로 막아둔 건 아래와 같습니다.

- 1-2: 역사, 중국어, 미술
- 2-1: 사회, 음악
- 2-2: 사회, 음악
- 3-1: 도덕, 중국어

## 실행 방법

먼저 패키지를 설치합니다.

```bash
npm install
```

서버를 실행합니다.

```bash
npm start
```

기본 주소는 아래입니다.

```text
http://localhost:12345
```

이미 12345 포트를 쓰고 있으면 다른 포트로 실행하면 됩니다.

```powershell
$env:PORT=12346; npm start
```

## 폴더 구조

```text
score_app/
  public/
    index.html
    app.js
    style.css
    manifest.webmanifest
    service-worker.js
  landing/
    index.html
  data/
    users.json
    users/
  data.json
  server.js
  package.json
```

## 데이터 저장

회원 정보는 `data/users.json`에 저장됩니다.  
각 사용자의 점수 데이터는 `data/users/` 아래에 따로 저장됩니다.

이 프로젝트는 SQLite 같은 DB 없이 JSON 파일로 저장합니다. 그래서 혼자 쓰거나 작은 규모로 쓰기에는 간단하지만, 사람이 많이 몰리는 서비스처럼 쓰려면 DB로 바꾸는 게 맞습니다.

## 참고

가내신 계산식은 프로젝트 안의 `public/app.js`에 들어 있습니다.  
점수 기준이나 제외 과목이 바뀌면 그 파일의 `MS_SUBJECTS`, `MS_SEMESTERS`, `MS_LOCKED_EXCLUSIONS` 쪽을 보면 됩니다.

랜딩 페이지는 `landing/index.html` 하나에 HTML, CSS, JavaScript를 모두 넣은 정적 페이지입니다.  
앱으로 들어가는 버튼은 모두 <https://jumsu33.kro.kr/> 로 연결됩니다.
