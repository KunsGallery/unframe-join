import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  CreditCard,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { unframeDesign } from "../../components/ui/unframeDesign";

const hasText = (value) => typeof value === "string" && value.trim().length > 0;

const formatKrwAmount = (value) => {
  if (!hasText(value)) return "";
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return String(value).trim();
  return `${Number(digits).toLocaleString("ko-KR")}원`;
};

const formatAccountCopyText = (payment) =>
  [payment?.bankName, payment?.accountNumber].filter(hasText).map((value) => value.trim()).join(" ");

const PaymentLine = ({ label, value, strong = false }) => {
  if (!hasText(value)) return null;

  return (
    <div className="flex flex-col gap-1 border-b border-zinc-900/10 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </dt>
      <dd
        className={`break-keep text-left text-lg tracking-tight text-zinc-950 sm:text-right ${
          strong ? "font-black" : "font-bold"
        }`}
      >
        {value}
      </dd>
    </div>
  );
};

const SalonApplicationComplete = ({ context, onHome }) => {
  const [copyState, setCopyState] = useState("idle");
  const salonTitle = context?.salonTitle || "SALON";
  const applicantName = context?.applicantName || "신청자";
  const payment = useMemo(() => context?.paymentSettings || {}, [context?.paymentSettings]);
  const paymentEnabled = payment.enabled !== false;
  const isWaitlisted = context?.status === "waitlisted";
  const hasPaymentInfo =
    paymentEnabled &&
    [payment.amount, payment.bankName, payment.accountNumber, payment.accountHolder].some(hasText);
  const formattedAmount = formatKrwAmount(payment.amount);

  const copyText = formatAccountCopyText(payment);

  const copyPaymentInfo = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2200);
    }
  };

  return (
    <section className="mx-auto max-w-5xl py-8 md:py-14">
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
        <div className="rounded-[32px] border-2 border-zinc-900 bg-[#AAD004] p-7 shadow-[8px_8px_0px_#000] md:p-9">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-zinc-900 bg-white shadow-[3px_3px_0px_#000]">
            <CheckCircle2 size={28} className="text-[#004aad]" />
          </div>
          <h1 className="mt-7 text-4xl font-black leading-[0.98] tracking-tighter text-zinc-950 break-keep md:text-5xl">
            신청이 접수되었습니다.
          </h1>
          <p className="mt-5 text-base font-black leading-7 text-zinc-800 break-keep">
            {salonTitle} 신청을 확인했습니다. 아직 참가가 확정된 상태는 아니며,
            운영팀이 입금 내역을 확인한 뒤 참가 확정 안내를 보내드립니다.
          </p>
          <div className="mt-7 inline-flex rounded-full border-2 border-zinc-900 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-950 shadow-[2px_2px_0px_#000]">
            {isWaitlisted ? "대기 신청 접수" : "입금 확인 대기"}
          </div>
        </div>

        <div className="rounded-[32px] border-2 border-zinc-900 bg-white p-6 shadow-[6px_6px_0px_#000] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#004aad] text-white">
                <CreditCard size={22} />
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950">
                참여비 입금 안내
              </h2>
              <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-zinc-600 break-keep">
                입금자명은 신청 정보와 대조합니다. 가능하면 신청자명과 같은 이름으로 입금해 주세요.
              </p>
            </div>
            {hasPaymentInfo ? (
              <button
                type="button"
                onClick={copyPaymentInfo}
                className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-900 bg-[#f6f4ee] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-950 shadow-[2px_2px_0px_#000] transition-all active:translate-y-0.5 active:shadow-none"
              >
                <Clipboard size={14} />
                {copyState === "copied"
                  ? "복사 완료"
                  : copyState === "failed"
                  ? "복사 실패"
                  : "은행/계좌 복사"}
              </button>
            ) : null}
          </div>

          {hasPaymentInfo ? (
            <dl className="mt-6 rounded-[24px] border-2 border-zinc-900 bg-[#f6f4ee] px-5">
              <PaymentLine label="금액" value={formattedAmount} strong />
              <PaymentLine label="은행" value={payment.bankName} />
              <PaymentLine label="계좌" value={payment.accountNumber} strong />
              <PaymentLine label="예금주" value={payment.accountHolder} />
            </dl>
          ) : (
            <div className="mt-6 rounded-[24px] border-2 border-dashed border-zinc-300 bg-zinc-50 p-5">
              <p className="font-black text-zinc-900">입금 안내가 준비 중입니다.</p>
              <p className="mt-2 text-sm font-bold leading-6 text-zinc-500 break-keep">
                운영팀이 별도 안내를 드릴 예정입니다. 참가 확정 전 안내를 기다려 주세요.
              </p>
            </div>
          )}

          {hasText(payment.depositorGuide) ? (
            <p className="mt-5 rounded-[20px] bg-[#004aad]/8 p-4 text-sm font-black leading-6 text-[#004aad] break-keep">
              {payment.depositorGuide.replaceAll("{{name}}", applicantName)}
            </p>
          ) : null}
          {hasText(payment.note) ? (
            <p className="mt-3 whitespace-pre-line rounded-[20px] bg-zinc-100 p-4 text-sm font-bold leading-6 text-zinc-600 break-keep">
              {payment.note}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border-2 border-zinc-900 bg-white p-5 shadow-[3px_3px_0px_#000]">
          <ShieldCheck size={24} className="text-[#004aad]" />
          <h3 className="mt-3 font-black text-zinc-950">확정 안내는 따로 보내드립니다.</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-zinc-600 break-keep">
            신청 완료 화면은 접수 확인입니다. 참가가 확정되면 카카오 알림톡으로 별도 안내가 발송됩니다.
          </p>
        </div>
        <div className="rounded-[24px] border-2 border-zinc-900 bg-white p-5 shadow-[3px_3px_0px_#000]">
          <QrCode size={24} className="text-[#004aad]" />
          <h3 className="mt-3 font-black text-zinc-950">개인 입장 QR은 확정 후 발급됩니다.</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-zinc-600 break-keep">
            행사 당일에는 확정 안내에 포함된 개인 QR 화면을 운영자에게 보여주시면 됩니다.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={onHome} className={unframeDesign.primaryButton}>
          SALON 목록으로
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
};

export default SalonApplicationComplete;
