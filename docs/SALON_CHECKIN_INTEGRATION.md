# Salon 체크인 연동

`salon.unframe.kr`는 참가자의 Join 개인 QR을 읽은 뒤 Join의 서버 함수에 체크인 확인을 요청합니다.

## Join 환경변수

Netlify의 Join 프로젝트에 `SALON_CHECKIN_SHARED_SECRET`를 추가합니다. 충분히 긴 랜덤 문자열을 사용하고, 값은 Salon 프로젝트의 `JOIN_CHECKIN_SHARED_SECRET`와 동일해야 합니다.

## 요청

```http
POST https://join.unframe.kr/.netlify/functions/confirm-salon-check-in
Content-Type: application/json
x-salon-checkin-secret: <shared-secret>

{
  "salonId": "salon-event-document-id",
  "token": "<Join 개인 QR URL에서 추출한 token>"
}
```

Salon 서버가 QR URL 전체를 전달해야 한다면 `token` 대신 `qrPayload`를 사용할 수 있습니다.

## 성공 응답

최초 체크인은 `status: "checked_in"`, 이미 처리된 QR은 `status: "already_checked_in"`으로 반환됩니다. 이미 처리된 경우에도 `ok: true`이므로 Salon 출석 명단을 중복 생성하지 않고 현재 상태를 동기화하면 됩니다.

최초 체크인이면 Join에서 `checkedInAt`을 기록하고, 살롱의 환영 알림 설정과 템플릿을 사용해 입장 확인 알림톡을 발송합니다. 알림톡 실패는 체크인 자체를 실패시키지 않으며 `notificationStatus: "failed"`로 반환되고 신청 문서에도 실패 사유가 기록됩니다.

## 검증 항목

- 공유 연동 키
- QR 토큰 해시와 Join 신청자 일치 여부
- 살롱 ID 일치 여부
- 참가 승인 상태
- QR 만료 여부
- 살롱 체크인 운영 시간
- 중복 체크인 여부
