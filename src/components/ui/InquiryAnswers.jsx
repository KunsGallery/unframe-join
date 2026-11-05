import React from "react";

export default function InquiryAnswers({ application }) {
  const app = application;
  const fields = app.trackType === "collaboration"
    ? [["제안 제목", app.title], ["팀 / 브랜드명", app.organization], ["담당자 이름", app.name], ["연락처", app.phone], ["회신 이메일", app.email || app.applicantEmail], ["협업 분야", app.category], ["아이디어와 목표", app.idea], ["희망하는 UNFRAME의 역할", app.desiredRole], ["일정 / 예산 메모", app.timelineBudget], ["소개 자료 / 참고 링크", app.referenceUrl]]
    : [["문의 제목", app.title], ["이용 목적", app.purpose], ["팀 / 브랜드명", app.organization], ["담당자 이름", app.name], ["연락처", app.phone], ["회신 이메일", app.email || app.applicantEmail], ["희망 날짜", app.date || "미정"], ["이용 시간 / 기간", app.hours || "미정"], ["예상 인원", app.attendees || "미정"], ["예산 범위", app.budget || "미정"], ["공간 활용 계획", app.plan], ["반입 장비 / 설치 요청", app.equipment]];
  if (app.inquiryType === "space-rental") fields.splice(10, 0, ["필요한 지원 범위", app.supportScope || "공간 이용"]);
  return <dl className="min-w-0 divide-y divide-zinc-200">{fields.map(([label, value]) => (
    <div key={label} className="grid min-w-0 gap-2 py-4 sm:grid-cols-[160px_minmax(0,1fr)]">
      <dt className="text-sm font-semibold text-zinc-600">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-900">{value || "-"}</dd>
    </div>
  ))}</dl>;
}
