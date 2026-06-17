import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  Loader2,
  Megaphone,
  Minus,
  Plus,
  Sparkles,
  Telescope,
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { appId, db } from "../../lib/firebase";
import {
  DEFAULT_OPEN_CALL_FAQS,
  OPEN_CALL_FALLBACK,
  createFallbackOpenCall,
  getOpenCallDisplayStatus,
  parseOpenCallDate,
  normalizeOpenCallFaqs,
} from "../../constants/openCall";

const Section = ({ index, title, children, accent = false }) => (
  <div
    className={`rounded-[28px] border p-5 md:p-6 ${
      accent ? "border-[#004AAD]/15 bg-[#004AAD]/5" : "border-zinc-200 bg-white/85"
    }`}
  >
    <div className="mb-3 flex items-center gap-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-[10px] font-black text-zinc-500">
        {index}
      </span>
      <h3 className="text-lg font-black tracking-tight text-zinc-900 break-keep md:text-xl">
        {title}
      </h3>
    </div>
    <div className="text-sm font-medium leading-relaxed text-zinc-600 break-keep whitespace-pre-line md:text-base">
      {children}
    </div>
  </div>
);

const normalizeOpenCall = (openCall) =>
  createFallbackOpenCall({
    ...openCall,
    id: openCall?.id || OPEN_CALL_FALLBACK.id,
  });

const pickActiveOpenCall = (calls) => {
  const normalized = (calls || [])
    .map(normalizeOpenCall)
    .filter((call) => call.isVisible !== false && call.status !== "archived");

  const featured = normalized.filter((call) => call.isFeatured);
  const candidateStatuses = ["open", "upcoming", "closed", "draft"];
  const candidates = candidateStatuses
    .flatMap((status) => [
      featured.find((call) => getOpenCallDisplayStatus(call).key === status),
      normalized.find((call) => getOpenCallDisplayStatus(call).key === status),
    ])
    .filter(Boolean);

  return candidates[0] || createFallbackOpenCall();
};

const formatDateTime = (value) => {
  const date = parseOpenCallDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const textOrFallback = (value, fallback) => (value ?? fallback);

const STATUS_LABELS = {
  draft: "준비 중",
  upcoming: "접수 예정",
  open: "접수 중",
  closed: "접수 마감",
  archived: "아카이브",
};

const STATUS_HELP_TEXTS = {
  draft: "공고 내용을 준비하고 있습니다.",
  upcoming: "접수 시작 전입니다.",
  open: "현재 지원서를 접수하고 있습니다.",
  closed: "이번 오픈콜 접수가 마감되었습니다.",
  archived: "지난 공고입니다.",
};

const STATUS_DISABLED_BUTTON_TEXTS = {
  upcoming: "접수 예정입니다",
  closed: "모집이 마감되었습니다",
  draft: "공고 준비 중입니다",
  archived: "아카이브된 공고입니다",
};

const OpenCallLanding = ({ onBack, onApply }) => {
  const [openCalls, setOpenCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", "openCalls");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setOpenCalls(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const openCall = useMemo(() => pickActiveOpenCall(openCalls), [openCalls]);
  const displayStatus = useMemo(
    () => getOpenCallDisplayStatus(openCall),
    [openCall]
  );
  const canApply = displayStatus.canApply && openCall.isVisible !== false;
  const applyButtonText = openCall.applyButtonText?.trim()
    ? openCall.applyButtonText
    : OPEN_CALL_FALLBACK.applyButtonText;
  const statusLabel = STATUS_LABELS[displayStatus.key] || displayStatus.label;
  const statusHelpText = STATUS_HELP_TEXTS[displayStatus.key] || "";
  const disabledButtonText =
    STATUS_DISABLED_BUTTON_TEXTS[displayStatus.key] || displayStatus.label;

  const handleApply = () => {
    if (!canApply) {
      return;
    }
    onApply(openCall);
  };

  const sections = (Array.isArray(openCall.descriptionSections)
    ? openCall.descriptionSections
    : OPEN_CALL_FALLBACK.descriptionSections
  ).filter((section) => section?.title?.trim() || section?.body?.trim());
  const faqs = useMemo(() => {
    const source = Array.isArray(openCall?.faqs) ? openCall.faqs : DEFAULT_OPEN_CALL_FAQS;
    return normalizeOpenCallFaqs(source)
      .filter((faq) => faq?.isVisible !== false)
      .filter((faq) => faq?.question?.trim() && faq?.answer?.trim())
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [openCall?.faqs]);

  useEffect(() => {
    if (openFaqIndex == null) return;
    if (faqs.length === 0) {
      setOpenFaqIndex(null);
      return;
    }
    if (openFaqIndex >= faqs.length) {
      setOpenFaqIndex(null);
    }
  }, [faqs.length, openFaqIndex]);

  const dateEntries = [
    ["접수 시작", openCall.applicationStartAt],
    ["접수 마감", openCall.applicationEndAt],
    ["결과 발표", openCall.announcementAt],
  ].filter(([, value]) => value);

  const disabledHelpText =
    displayStatus.key === "upcoming"
      ? "접수 예정입니다."
      : displayStatus.key === "closed"
      ? "모집이 마감되었습니다."
      : displayStatus.key === "draft"
      ? "공고 준비 중입니다."
      : displayStatus.key === "archived"
      ? "아카이브된 공고입니다."
    : "";

  const toggleFaq = (index) => {
    setOpenFaqIndex((current) => (current === index ? null : index));
  };

  return (
    <section className="relative overflow-hidden py-4 md:py-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,74,173,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(170,208,4,0.12),transparent_26%),linear-gradient(180deg,#f6f4ee_0%,#fbfaf6_50%,#f6f4ee_100%)]" />

      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:border-[#004AAD]/20 hover:text-[#004AAD]"
        >
          <ArrowLeft size={14} />
          신청 유형 다시 선택
        </button>

        <div className="mt-6 rounded-[36px] border border-white/70 bg-white/65 px-5 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl md:px-8 md:py-10">
          <div className="flex items-center gap-3 text-[#004AAD]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6">
              <Megaphone size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">
              OPEN CALL
            </span>
          </div>

          {loading ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              <Loader2 size={14} className="animate-spin" />
              공고를 불러오는 중
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#004AAD]">
                  {textOrFallback(openCall.badgeText, "OPEN")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  {statusLabel}
                </span>
                {openCall.isFeatured ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    대표 공고
                  </span>
                ) : null}
              </div>

              <h1 className="mt-6 text-[2.7rem] font-black tracking-tighter text-zinc-900 leading-[0.92] break-keep md:text-6xl">
                {textOrFallback(openCall.heroTitle, "2026 UNFRAME OPEN CALL 01.")}
                <br />
                {textOrFallback(openCall.heroAccent, "잔상")}
              </h1>

              <p className="mt-4 whitespace-pre-line text-lg font-black text-[#004AAD] break-keep md:text-xl">
                {textOrFallback(openCall.subtitle, OPEN_CALL_FALLBACK.subtitle)}
              </p>

              <p className="mt-5 max-w-3xl whitespace-pre-line text-base font-medium leading-relaxed text-zinc-600 break-keep md:text-lg">
                {textOrFallback(openCall.introText, OPEN_CALL_FALLBACK.introText)}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#004AAD]">
                  <CircleDot size={12} />
                  {textOrFallback(openCall.mediumText, OPEN_CALL_FALLBACK.mediumText)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#6e8d00]">
                  <Sparkles size={12} />
                  {textOrFallback(openCall.themeHanja, "殘像")}
                </span>
              </div>

              <div className="mt-7 grid gap-3 md:grid-cols-2">
                {dateEntries.map(([label, value]) => {
                  const formatted = formatDateTime(value);
                  return (
                    <div
                      key={label}
                      className="rounded-[24px] border border-white/70 bg-white/75 px-4 py-4"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                        {label}
                      </p>
                      <p className="mt-2 text-sm font-black text-zinc-900 break-keep">
                        {formatted || "-"}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004AAD]">
                    지원 대상
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-700 break-keep">
                    {textOrFallback(
                      openCall.eligibilityText,
                      OPEN_CALL_FALLBACK.eligibilityText
                    )}
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004AAD]">
                    선정 이후
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-700 break-keep">
                    {textOrFallback(openCall.benefitText, OPEN_CALL_FALLBACK.benefitText)}
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/70 bg-white/75 p-5 md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004AAD]">
                    U# 매거진
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-700 break-keep">
                    {textOrFallback(openCall.magazineText, OPEN_CALL_FALLBACK.magazineText)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  상태 안내
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-600 break-keep">
                  {statusHelpText}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2">
          {sections.map((section, index) => (
            <Section
              key={`${section.title}-${index}`}
              index={String(index + 1).padStart(2, "0")}
              title={section.title}
              accent={index % 3 === 0}
            >
              {section.body}
            </Section>
          ))}
        </div>

        {faqs.length > 0 ? (
          <div className="mt-6 md:mt-8 rounded-[32px] border border-zinc-950/10 bg-white/70 px-5 py-6 md:px-7 md:py-7 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
                  Q&amp;A
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 md:text-3xl">
                  자주 묻는 질문
                </h2>
              </div>
              <p className="text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                공고마다 자주 묻는 내용을 먼저 확인할 수 있도록 정리했습니다.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={`${faq.question}-${faq.order || index}`}
                    className="overflow-hidden rounded-[28px] border border-zinc-950/10 bg-white/90"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#004AAD]/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AAD]/30"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                          FAQ {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-2 text-base font-black leading-relaxed text-zinc-950 break-keep md:text-lg">
                          {faq.question}
                        </p>
                      </div>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-950/10 bg-[#F6F4EE] text-zinc-950">
                        {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-zinc-950/10 px-5 py-4">
                        <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep md:text-[0.98rem]">
                          {faq.answer}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-6 md:mt-8 rounded-[32px] border border-[#004AAD]/15 bg-[#004AAD]/5 px-5 py-6 md:px-7 md:py-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#004AAD]">
                Ready to apply
              </p>
              <p className="text-lg font-black tracking-tight text-zinc-900 break-keep md:text-xl">
                {textOrFallback(openCall.title, OPEN_CALL_FALLBACK.title)}
              </p>
              {!canApply && disabledHelpText ? (
                <p className="mt-2 text-sm font-bold text-zinc-500 break-keep">
                  {disabledHelpText}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#004AAD] px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_35px_rgba(0,74,173,0.22)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {canApply
                ? applyButtonText
                : disabledButtonText}
              {canApply ? <ArrowRight size={15} /> : null}
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 shadow-sm backdrop-blur">
            <Telescope size={12} />
            {textOrFallback(openCall.title, OPEN_CALL_FALLBACK.title)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OpenCallLanding;
