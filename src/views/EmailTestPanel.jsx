import React, { useState } from "react";

const DEFAULT_EMAIL = "";
const DEFAULT_NAME = "김재우";
const DEFAULT_TITLE = "City Fantasy";
const DEFAULT_DATE = "2026-04-12";
const DEFAULT_PROGRAM = { name: "UN-FRAME", price: 280 };
const DEFAULT_PARTNER = "artist";
const DEFAULT_TEST_PHONE_1 = "01037848885";
const DEFAULT_TEST_PHONE_2 = "01020494878";

const DEFAULT_DETAIL_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/?view=my-page&applicationId=test123&app=test123`
    : "";

const EmailTestPanel = () => {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [phone, setPhone] = useState(DEFAULT_TEST_PHONE_1);
  const [loadingType, setLoadingType] = useState("");
  const [message, setMessage] = useState("");

  const ensureEmail = () => {
    if (!email.trim()) {
      alert("테스트 받을 이메일 주소를 먼저 입력해 주세요.");
      return false;
    }
    return true;
  };

  const ensurePhone = () => {
    if (!phone.trim()) {
      alert("테스트 받을 휴대폰 번호를 먼저 선택해 주세요.");
      return false;
    }
    return true;
  };

  const sendRequest = async (url, payload, label, validator = null) => {
    if (validator && !validator()) return;

    try {
      setLoadingType(label);
      setMessage("");

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `${label} 테스트 발송 실패`);
      }

      setMessage(`${label} 테스트 발송 완료`);
    } catch (err) {
      console.error(err);
      setMessage(err.message || `${label} 테스트 발송 실패`);
    } finally {
      setLoadingType("");
    }
  };

  const testApplicationId = `test-${Date.now()}`;

  const commonEmailPayload = {
    applicantName: DEFAULT_NAME,
    applicantEmail: email.trim(),
    exhibitionTitle: DEFAULT_TITLE,
    selectedDate: DEFAULT_DATE,
    selectedProgram: DEFAULT_PROGRAM,
    partnerType: DEFAULT_PARTNER,
    applicationDetailUrl: DEFAULT_DETAIL_URL,
  };

  const commonKakaoPayload = {
    to: phone.trim(),
    applicantName: DEFAULT_NAME,
    exhibitionTitle: DEFAULT_TITLE,
    selectedDate: DEFAULT_DATE,
    selectedProgram: DEFAULT_PROGRAM,
    applicationId: testApplicationId,
    applicationDetailUrl: DEFAULT_DETAIL_URL,
  };

  const handleSendApplicationReceived = () => {
    sendRequest(
      "/.netlify/functions/send-application-emails",
      {
        ...commonEmailPayload,
        phone: "010-1234-5678",
        brandName: "",
        stageName: "JAEWOO",
        submittedAt: new Date().toISOString(),
        applicationId: testApplicationId,
      },
      "접수 완료 메일",
      ensureEmail
    );
  };

  const handleSendApproved = () => {
    sendRequest(
      "/.netlify/functions/send-application-status-email",
      {
        type: "approved",
        ...commonEmailPayload,
      },
      "승인 메일",
      ensureEmail
    );
  };

  const handleSendRejected = () => {
    sendRequest(
      "/.netlify/functions/send-application-status-email",
      {
        type: "rejected",
        ...commonEmailPayload,
        reviewSummary:
          "이번 회차에서는 제출 자료의 방향성과 전시 구성의 전달 밀도를 중심으로 검토했습니다. 현재 단계에서는 프로젝트의 핵심 메시지가 다소 넓게 퍼져 있어 강점이 한 번에 응집되어 보이기 어려웠습니다.",
        improvementSuggestions:
          "대표 이미지의 선명도와 프로젝트 설명의 구조를 조금 더 정리해 주시면 다음 검토에서 강점이 더 분명하게 전달될 수 있습니다.",
        rejectionReason: "테스트용 미선정 사유",
      },
      "미선정 메일",
      ensureEmail
    );
  };

  const handleSendAdditionalRequested = () => {
    sendRequest(
      "/.netlify/functions/send-application-status-email",
      {
        type: "additional_requested",
        ...commonEmailPayload,
        requestMessage: `아래 항목을 추가로 확인하고자 합니다.

1) 최신 포트폴리오 PDF 또는 ZIP
2) 대표작 이미지 원본 3~5점
3) 이번 전시/프로젝트의 핵심 구성 의도를 3~5문장 정도로 정리한 설명

가능하신 범위에서 보완 후, 신청 상세 페이지에서 재업로드 부탁드립니다.`,
      },
      "추가자료 요청 메일",
      ensureEmail
    );
  };

  const handleSendReceivedKakao = () => {
    sendRequest(
      "/.netlify/functions/send-kakao-alimtalk",
      {
        type: "application_received",
        ...commonKakaoPayload,
      },
      "접수 완료 알림톡",
      ensurePhone
    );
  };

  const handleSendApprovedKakao = () => {
    sendRequest(
      "/.netlify/functions/send-kakao-alimtalk",
      {
        type: "approved",
        ...commonKakaoPayload,
      },
      "승인 알림톡",
      ensurePhone
    );
  };

  const handleSendRejectedKakao = () => {
    sendRequest(
      "/.netlify/functions/send-kakao-alimtalk",
      {
        type: "rejected",
        ...commonKakaoPayload,
      },
      "미선정 알림톡",
      ensurePhone
    );
  };

  const handleSendAdditionalRequestedKakao = () => {
    sendRequest(
      "/.netlify/functions/send-kakao-alimtalk",
      {
        type: "additional_requested",
        ...commonKakaoPayload,
        requestMessage:
          "최신 포트폴리오 PDF 또는 ZIP, 대표작 이미지 원본 3~5점, 전시 핵심 구성 의도를 보완해 주세요.",
      },
      "추가자료 요청 알림톡",
      ensurePhone
    );
  };

  const handleSendAdditionalSubmittedAdminKakao = () => {
    sendRequest(
      "/.netlify/functions/send-kakao-alimtalk",
      {
        type: "additional_submitted_admin",
        ...commonKakaoPayload,
      },
      "추가자료 제출 운영자 알림톡",
      ensurePhone
    );
  };

  return (
    <section className="text-zinc-900">
      <div className="bg-white rounded-4xl border border-zinc-100 shadow-xl p-8 md:p-10">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#004aad] mb-4">
          Email & Kakao Test Panel
        </p>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
          메일 / 알림톡 테스트 발송
        </h1>

        <p className="text-sm font-bold text-zinc-500 leading-relaxed mb-8 break-keep">
          신청서 작성 없이 아래 버튼만 눌러 메일과 알림톡을 테스트할 수 있습니다.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">
              Test Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="메일을 받을 주소 입력"
              className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-sm font-bold outline-none"
            />
          </label>

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">
              Test Phone
            </span>
            <select
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-sm font-bold outline-none"
            >
              <option value={DEFAULT_TEST_PHONE_1}>010-3784-8885</option>
              <option value={DEFAULT_TEST_PHONE_2}>010-2049-4878</option>
            </select>
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={handleSendApplicationReceived}
            disabled={!!loadingType}
            className="rounded-2xl bg-zinc-900 text-white px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loadingType === "접수 완료 메일" ? "발송중..." : "접수 완료 메일"}
          </button>

          <button
            onClick={handleSendApproved}
            disabled={!!loadingType}
            className="rounded-2xl bg-[#004aad] text-white px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loadingType === "승인 메일" ? "발송중..." : "승인 메일"}
          </button>

          <button
            onClick={handleSendRejected}
            disabled={!!loadingType}
            className="rounded-2xl border border-red-200 bg-red-50 text-red-600 px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loadingType === "미선정 메일" ? "발송중..." : "미선정 메일"}
          </button>

          <button
            onClick={handleSendAdditionalRequested}
            disabled={!!loadingType}
            className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loadingType === "추가자료 요청 메일" ? "발송중..." : "추가자료 요청 메일"}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <button
            onClick={handleSendReceivedKakao}
            disabled={!!loadingType}
            className="rounded-2xl border border-[#004aad]/20 bg-[#004aad]/5 text-[#004aad] px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loadingType === "접수 완료 알림톡" ? "발송중..." : "접수 완료 알림톡"}
          </button>

          <button
            onClick={handleSendApprovedKakao}
            disabled={!!loadingType}
            className="rounded-2xl border border-[#004aad]/20 bg-[#004aad]/5 text-[#004aad] px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loadingType === "승인 알림톡" ? "발송중..." : "승인 알림톡"}
          </button>

          <button
            onClick={handleSendRejectedKakao}
            disabled={!!loadingType}
            className="rounded-2xl border border-red-200 bg-red-50 text-red-600 px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loadingType === "미선정 알림톡" ? "발송중..." : "미선정 알림톡"}
          </button>

          <button
            onClick={handleSendAdditionalRequestedKakao}
            disabled={!!loadingType}
            className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loadingType === "추가자료 요청 알림톡" ? "발송중..." : "추가자료 요청 알림톡"}
          </button>

          <button
            onClick={handleSendAdditionalSubmittedAdminKakao}
            disabled={!!loadingType}
            className="sm:col-span-2 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700 px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loadingType === "추가자료 제출 운영자 알림톡"
              ? "발송중..."
              : "추가자료 제출 운영자 알림톡"}
          </button>
        </div>

        {message ? (
          <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-sm font-bold text-zinc-700">
            {message}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default EmailTestPanel;