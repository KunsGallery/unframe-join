import React, { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Clipboard, MapPin, X, Users } from "lucide-react";
import { formatSalonDateTime, getSalonAvailability } from "../../constants/salon";
import { unframeDesign } from "../../components/ui/unframeDesign";
import { useSalonEvent } from "./useSalonEvent";

const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const formatKrwAmount = (value) => {
  if (!hasText(value)) return "";
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return String(value).trim();
  return `${Number(digits).toLocaleString("ko-KR")}원`;
};
const formatAccountCopyText = (payment) =>
  [payment?.bankName, payment?.accountNumber].filter(hasText).map((value) => value.trim()).join(" ");

const SalonDetail = ({ slug, user, applications = [], onBack, onApply, onViewApplication }) => {
  const [dismissedExistingNoticeId, setDismissedExistingNoticeId] = useState("");
  const [copyState, setCopyState] = useState("idle");
  const { loading, event, error } = useSalonEvent(slug);
  const existingApplication = event?.id && user && !user.isAnonymous
    ? (applications || []).find((app) =>
      app.userId === user.uid &&
      app.trackType === "salon" &&
      app.salonId === event.id &&
      app.status !== "cancelled"
    ) || null
    : null;
  const showExistingNotice = Boolean(existingApplication && dismissedExistingNoticeId !== existingApplication.id);

  if (loading) return <div className="py-24 text-center font-black">SALON을 불러오는 중입니다.</div>;
  if (!event) return <div className="py-24 text-center"><p className="text-xl font-black">{error}</p><button onClick={onBack} className={`${unframeDesign.secondaryButton} mt-5`}>목록으로</button></div>;
  const availability = getSalonAvailability(event);
  const payment = event.paymentSettings || {};
  const copyAccountNumber = async () => {
    const copyText = formatAccountCopyText(payment);
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  return <section className="py-4 md:py-8"><button type="button" onClick={onBack} className={unframeDesign.secondaryButton}><ArrowLeft size={14} /> SALON 목록</button>
    <article className="mt-6 overflow-hidden rounded-[36px] border-2 border-zinc-900 bg-white shadow-[8px_8px_0px_#000]">
      {event.posterImageUrl && <div className="aspect-video w-full bg-[#f6f4ee]"><img src={event.posterImageUrl} alt={event.title} className="h-full w-full object-contain" /></div>}
      <div className="grid gap-8 p-7 md:p-10 lg:grid-cols-[1fr_0.45fr]">
        <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">UNFRAME SALON</p><h1 className="mt-4 text-4xl font-black tracking-tighter md:text-6xl break-keep">{event.title}</h1>{event.subtitle && <p className="mt-4 text-xl font-black text-zinc-500 break-keep">{event.subtitle}</p>}<p className="mt-7 whitespace-pre-line text-base font-medium leading-8 text-zinc-700 break-keep">{event.description}</p></div>
        <aside className="rounded-[28px] border-2 border-zinc-900 bg-[#f6f4ee] p-6"><div className="space-y-5 text-sm font-bold"><p className="flex gap-3"><CalendarDays />{formatSalonDateTime(event.eventStartAt)}</p><p className="flex gap-3"><MapPin />{event.venueName || "장소 미정"}<br />{event.venueAddress}</p><p className="flex gap-3"><Users />{event.capacity ? `${event.capacity}명` : "정원 제한 없음"}</p></div>{existingApplication ? <div className="mt-7 space-y-2"><button type="button" onClick={() => setDismissedExistingNoticeId("")} className={`${unframeDesign.primaryButton} w-full justify-center`}>신청 완료 안내 보기<ArrowRight size={14} /></button><button type="button" onClick={() => onViewApplication(existingApplication)} className={`${unframeDesign.secondaryButton} w-full justify-center`}>내 신청서 보기</button></div> : <button type="button" disabled={!availability.available} onClick={onApply} className={`${unframeDesign.primaryButton} mt-7 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40`}>{event.applicationButtonText || "참가 신청"}<ArrowRight size={14} /></button>}{!availability.available && !existingApplication && <p className="mt-3 text-center text-xs font-bold text-red-600">{availability.reason}</p>}</aside>
      </div>
    </article>
    {existingApplication && showExistingNotice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 px-4 py-8 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[32px] border-2 border-zinc-900 bg-white p-6 shadow-[8px_8px_0px_#000]"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#004aad]">Already applied</p><h2 className="mt-2 text-2xl font-black tracking-tight">이미 신청한 살롱입니다.</h2></div><button type="button" onClick={() => setDismissedExistingNoticeId(existingApplication.id)} className="rounded-full border border-zinc-200 p-2"><X size={16} /></button></div><p className="mt-4 text-sm font-bold leading-6 text-zinc-600 break-keep">신청서는 정상 접수되어 있습니다. 입금 확인 후 참가 확정 안내를 보내드립니다.</p><dl className="mt-5 rounded-[24px] border-2 border-zinc-900 bg-[#f6f4ee] px-5">{hasText(payment.amount) && <div className="flex justify-between gap-4 border-b border-zinc-900/10 py-4"><dt className="text-[10px] font-black text-zinc-500">금액</dt><dd className="text-right font-black">{formatKrwAmount(payment.amount)}</dd></div>}{hasText(payment.bankName) && <div className="flex justify-between gap-4 border-b border-zinc-900/10 py-4"><dt className="text-[10px] font-black text-zinc-500">은행</dt><dd className="text-right font-bold">{payment.bankName}</dd></div>}{hasText(payment.accountNumber) && <div className="flex justify-between gap-4 border-b border-zinc-900/10 py-4"><dt className="text-[10px] font-black text-zinc-500">계좌</dt><dd className="text-right font-black">{payment.accountNumber}</dd></div>}{hasText(payment.accountHolder) && <div className="flex justify-between gap-4 py-4"><dt className="text-[10px] font-black text-zinc-500">예금주</dt><dd className="text-right font-bold">{payment.accountHolder}</dd></div>}</dl>{hasText(payment.depositorGuide) && <p className="mt-4 rounded-[20px] bg-[#004aad]/8 p-4 text-sm font-black leading-6 text-[#004aad] break-keep">{payment.depositorGuide.replaceAll("{{name}}", existingApplication.applicantName || "")}</p>}<div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={copyAccountNumber} className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-3 text-sm font-black text-white"><Clipboard size={14} />{copyState === "copied" ? "복사 완료" : copyState === "failed" ? "복사 실패" : "은행/계좌 복사"}</button><button type="button" onClick={() => onViewApplication(existingApplication)} className="rounded-full border-2 border-zinc-900 bg-white px-4 py-3 text-sm font-black">내 신청서 보기</button></div></div></div>}
  </section>;
};
export default SalonDetail;
