# 지원자 파일 비공개 저장

오픈콜 포트폴리오(`open-call/portfolio`)와 작품 이미지(`open-call/works`)는 비공개 R2 버킷에 저장한다.
지원서에는 공개 주소 대신 `r2-private://<key>` 참조만 남고, 화면에서 볼 때는 `view-files` 함수가
10분짜리 열람 링크를 만든다. 관리자는 모든 파일을, 지원자는 자기 계정으로 올린 파일만 열 수 있다
(키 안에 올린 사람의 uid가 들어 있다).

`R2_PRIVATE_BUCKET_NAME`이 비어 있으면 예전처럼 공개 버킷을 쓴다. 그래서 배포 순서와 상관없이 지원은 막히지 않는다.

## 켜는 방법 (한 번만)

1. Cloudflare 대시보드 → R2 → **Create bucket**. 이름 예: `unframe-join-private`.
   - **Public access는 켜지 않는다** (r2.dev 주소, 커스텀 도메인 모두 연결하지 않음).
2. 새 버킷 → Settings → **CORS policy**에 아래를 넣는다. 브라우저가 서명된 주소로 바로 올리기 때문에 필요하다.
   ```json
   [
     {
       "AllowedOrigins": ["https://join.unframe.kr", "http://localhost:8888"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. 지금 쓰는 R2 API 토큰이 특정 버킷에만 권한이 있다면, 새 버킷에도 **Object Read & Write** 권한을 추가한다.
4. Netlify → Site configuration → Environment variables에 `R2_PRIVATE_BUCKET_NAME=unframe-join-private`를 넣고 다시 배포한다.
5. 확인: 테스트 계정으로 오픈콜에 파일을 올려 보고, 관리자 화면에서 포트폴리오·작품 이미지가 열리는지 본다.
   지원서 문서의 `portfolioUrl`이 `r2-private://`로 시작하면 정상이다.

## 이미 받은 파일

설정 전에 받은 지원서의 파일은 공개 버킷에 그대로 있다(주소는 추측하기 어렵지만 링크가 퍼지면 열린다).
접수가 끝난 공고는 관리자 → 오픈콜 → 지원서 목록의 **지원 자료 파기**로 지우면 공개·비공개 파일 모두 함께 지워진다.

## 지원 자료 파기

`purge-open-call-applications` 함수. 접수가 끝난(마감·아카이브) 공고에서만 동작하고, 공고명을 그대로 입력해야 한다.
범위는 "선정되지 않은 지원자만"(선정 작가는 전시 준비를 위해 남김) 또는 "모든 지원자".
파일 → 지원서 → 관리자 메모 순서로 지우고, 공고 문서의 `applicantDataPurges`에 날짜·건수·실행한 관리자만 기록한다.
