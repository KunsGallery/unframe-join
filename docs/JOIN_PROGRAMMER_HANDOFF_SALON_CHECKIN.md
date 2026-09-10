# Join 프로그래머 전달 지시서

## 목표

SALON 참가자의 신청·승인·개인 QR 발급은 `join.unframe.kr`에서 담당하고, 행사 당일 현장 스캔은 `salon.unframe.kr`에서 담당한다.

현장 QR 확인이 끝나면 Salon이 Join에 체크인 완료를 요청하고, Join이 최종 검증과 입장 확인 알림톡 발송을 담당한다.

최종 사용자 흐름:

```text
Join 신청
→ Join 관리자 승인
→ Join 개인 QR 발급 및 참가 확정 알림톡
→ 행사 당일 salon.unframe.kr에서 QR 스캔
→ Salon이 Join에 QR 검증·체크인 완료 요청
→ Join이 최종 검증
→ Join이 입장 완료 기록
→ Join이 입장 확인 알림톡 발송
→ Salon이 자체 출석 명단을 입장 완료로 표시
```

## 현재 Join에 구현된 항목

다음 항목은 `unframe-join`에 이미 구현되어 있다.

- 승인 시 개인 QR 토큰 생성 및 발급
- QR 토큰은 원문이 아닌 해시값으로 Firestore에 저장
- QR 버전과 nonce를 이용한 QR 재발급
- `get-salon-pass`를 통한 개인 QR 유효성 조회
- 살롱 ID, 승인 상태, QR 만료 여부 확인
- 확정 알림톡 및 환영 알림톡의 Solapi 발송 구조
- 살롱별 환영 알림톡 템플릿 ID 설정
- `confirm-salon-check-in` 서버 함수
- 중복 체크인 방지
- 체크인 시간 및 알림톡 발송 상태 저장

관련 함수:

```text
netlify/functions/approve-salon-participant.mjs
netlify/functions/get-salon-pass.mjs
netlify/functions/confirm-salon-check-in.mjs
netlify/functions/_lib/salonShared.mjs
```

## Salon에서 호출해야 하는 Join API

### 요청

```http
POST https://join.unframe.kr/.netlify/functions/confirm-salon-check-in
Content-Type: application/json
x-salon-checkin-secret: <공유 비밀키>
```

```json
{
  "salonId": "salonEvents 문서 ID",
  "token": "개인 QR URL에서 추출한 token"
}
```

QR URL 전체를 전달해야 하는 경우에는 `token` 대신 `qrPayload`를 사용할 수 있다.

```json
{
  "salonId": "salonEvents 문서 ID",
  "qrPayload": "https://join.unframe.kr/salon/check-in-token?token=..."
}
```

### 요청 조건

- 호출은 Salon 브라우저가 아니라 Salon 서버 함수에서 수행한다.
- 공유 비밀키를 브라우저 코드에 노출하지 않는다.
- `salonId`는 Join의 `salonEvents` 문서 ID와 동일해야 한다.
- QR URL에서 `token` query parameter를 추출해 전달한다.
- 동일 QR에 대해 재시도할 수 있도록 요청을 멱등적으로 처리한다.

## 응답 처리

### 최초 체크인 성공

```json
{
  "ok": true,
  "duplicate": false,
  "status": "checked_in",
  "message": "입장이 확인되었습니다.",
  "checkedInAt": "...",
  "notificationStatus": "sent",
  "participant": {
    "id": "application document id",
    "name": "참가자 이름"
  }
}
```

Salon은 `ok: true`와 `status: checked_in`을 확인한 뒤 자체 출석 명단을 입장 완료로 표시한다.

### 이미 체크인된 경우

```json
{
  "ok": true,
  "duplicate": true,
  "status": "already_checked_in",
  "message": "이미 입장 처리된 참가자입니다.",
  "checkedInAt": "...",
  "participant": {
    "id": "application document id",
    "name": "참가자 이름"
  }
}
```

이미 체크인된 요청도 성공적인 상태 동기화로 처리한다. 단, 환영 알림톡은 다시 발송하지 않는다.

### 알림톡만 실패한 경우

`notificationStatus`가 `failed`여도 체크인 자체는 성공이다.

```json
{
  "ok": true,
  "status": "checked_in",
  "notificationStatus": "failed"
}
```

이 경우 Salon 화면에는 입장 완료를 표시하고, 운영자가 Join 관리자 페이지에서 알림톡 실패 상태와 실패 사유를 확인할 수 있도록 한다.

### 검증 실패

다음 응답은 체크인 실패로 처리한다.

- `401`: 공유 비밀키 불일치
- `403`: 승인되지 않은 신청자
- `404`: 존재하지 않는 QR 또는 살롱
- `409`: 체크인 비활성화 또는 시작 전
- `410`: QR 만료 또는 체크인 종료

실패한 경우 Salon 출석 명단에는 입장 완료를 표시하지 않는다.

## Join Netlify 환경변수

Join Netlify에 다음 값을 등록한다.

```text
SALON_CHECKIN_SHARED_SECRET=<충분히 긴 랜덤 문자열>
```

같은 값을 Salon Netlify에는 다음 이름으로 등록한다.

```text
JOIN_CHECKIN_SHARED_SECRET=<Join과 동일한 값>
```

기존에 필요한 Join 환경변수도 유지되어야 한다.

```text
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON
SALON_QR_TOKEN_SECRET
SOLAPI_API_KEY
SOLAPI_API_SECRET
SOLAPI_PF_ID
SOLAPI_SALON_APPROVAL_TEMPLATE_ID
SOLAPI_SALON_WELCOME_TEMPLATE_ID
```

살롱별 `notificationSettings.welcomeTemplateId`가 저장되어 있으면 환경변수보다 살롱별 설정을 우선 사용한다.

## Solapi 환영 알림톡 변수

입장 확인 알림톡 템플릿에는 필요한 변수만 사용한다.

```text
#{name}
#{salonTitle}
#{eventDateTime}
#{venueName}
#{openChatCode}
```

환영 알림톡 발송 시 `checkedInAt`도 내부 변수로 전달된다.

`openChatCode`는 살롱 설정의 `groupChatUrl`에서 자동 추출한다.

```text
https://open.kakao.com/o/abcdef
→ abcdef
```

참가 확정 알림톡에서 개인 QR 버튼이 필요하면 템플릿 버튼은 다음 형식을 사용한다.

```text
https://#{passUrl}
```

Join 코드는 `passUrl` 값에서 `https://`를 제거한 값을 전달하므로 URL 스킴이 중복되지 않도록 한다.

## 중복 및 보안 요구사항

- QR 원문 또는 공유 비밀키를 로그에 남기지 않는다.
- Join은 QR 토큰의 해시값으로 신청자를 찾는다.
- 찾은 신청자의 `trackType`이 `salon`인지 확인한다.
- 요청의 `salonId`와 신청자의 `salonId`가 일치하는지 확인한다.
- 신청 상태가 `approved`인지 확인한다.
- QR 만료 시간을 확인한다.
- Firestore transaction으로 `checkedInAt`을 기록한다.
- 이미 `checkedInAt`이 있으면 중복으로 응답하고 알림톡은 발송하지 않는다.
- Salon의 로컬 출석 명단만으로 입장 승인 여부를 판단하지 않는다.

## 테스트 시나리오

배포 후 다음 시나리오를 반드시 확인한다.

1. 승인된 참가자의 개인 QR로 최초 체크인
   - Join 신청 문서에 `checkedInAt` 생성
   - Salon 출석 명단에 입장 완료 표시
   - 입장 확인 알림톡 1회 수신

2. 같은 QR 재스캔
   - `already_checked_in` 응답
   - 입장 확인 알림톡 추가 발송 없음

3. 미승인 신청자의 QR
   - 체크인 거부
   - Salon 출석 명단 미변경
   - 알림톡 미발송

4. 만료된 QR
   - 체크인 거부
   - Salon 출석 명단 미변경

5. 다른 살롱의 QR을 현재 살롱 화면에서 스캔
   - 살롱 ID 불일치로 거부

6. 공유 비밀키 불일치
   - `401` 응답
   - 참가자 정보 미노출

7. Solapi 발송 실패
   - Join 체크인은 성공
   - `notificationStatus: failed`
   - 신청 문서에 `welcomeNotificationError` 저장

8. 네트워크 타임아웃 후 Salon 재시도
   - Join은 중복 체크인으로 안전하게 응답
   - 알림톡 중복 발송 없음

## 완료 기준

- Salon 체크인 화면이 Join API를 서버에서 호출한다.
- Join과 Salon에 동일한 공유 비밀키가 등록되어 있다.
- 승인된 참가자의 최초 QR 스캔 시 출석 및 알림톡이 모두 정상 처리된다.
- 중복 스캔 시 알림톡이 중복 발송되지 않는다.
- 실패 응답과 알림톡 실패 상태가 관리자 화면에서 추적된다.
- 운영 환경에서 QR 원문과 비밀키가 브라우저·로그에 노출되지 않는다.
