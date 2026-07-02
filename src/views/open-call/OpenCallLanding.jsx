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
import { unframeDesign } from "../../components/ui/unframeDesign";
import {
  DEFAULT_OPEN_CALL_FAQS,
  OPEN_CALL_FALLBACK,
  createFallbackOpenCall,
  getOpenCallDisplayStatus,
  getOpenCallDescriptionSections,
  normalizeOpenCallFaqs,
  parseOpenCallDate,
  pickActiveOpenCall,
} from "../../constants/openCall";

const Section = ({ index, title, children, accent = false }) => (
  <div
    className={`rounded-[28px] border-2 border-zinc-900 p-5 shadow-[3px_3px_0px_#000] md:p-6 ${
      accent ? "bg-[#004AAD]/8" : "bg-white"
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
    <div className="whitespace-pre-line break-keep text-sm font-medium leading-relaxed text-zinc-700 md:text-base">
      {children}
    </div>
  </div>
);

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

  const selectedOpenCall = useMemo(() => pickActiveOpenCall(openCalls), [openCalls]);
  const openCall = useMemo(
    () => createFallbackOpenCall(selectedOpenCall || OPEN_CALL_FALLBACK),
    [selectedOpenCall]
  );
  const visibleSections = useMemo(
    () => getOpenCallDescriptionSections(selectedOpenCall || OPEN_CALL_FALLBACK),
    [selectedOpenCall]
  );

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("OPEN_CALL_LANDING_ACTIVE_ID", openCall?.id);
      console.log("OPEN_CALL_LANDING_DESCRIPTION_SECTIONS", visibleSections);
    }
  }, [openCall, visibleSections]);

  const displayStatus = useMemo(
    () => getOpenCallDisplayStatus(openCall),
    [openCall]
  );
  const canApply = displayStatus.canApply && openCall.isVisible !== false;
  const applyButtonText = openCall.applyButtonText?.trim()
    ? openCall.applyButtonText
    : OPEN_CALL_FALLBACK.applyButtonText;
  const landingLabels = openCall.landingLabels || OPEN_CALL_FALLBACK.landingLabels;
  const heroAccent = String(openCall.heroAccent || "").trim();
  const statusLabel = STATUS_LABELS[displayStatus.key] || displayStatus.label;
  const statusHelpText = textOrFallback(
    openCall.statusNoticeText,
    STATUS_HELP_TEXTS[displayStatus.key] || ""
  );
  const disabledButtonText =
    STATUS_DISABLED_BUTTON_TEXTS[displayStatus.key] || displayStatus.label;

  const handleApply = () => {
    if (!canApply) {
      return;
    }
    onApply(openCall);
  };

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
    <section className={`${unframeDesign.surface} relative overflow-hidden py-4 md:py-8`}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,74,173,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(170,208,4,0.12),transparent_26%),linear-gradient(180deg,#f6f4ee_0%,#fbfaf6_50%,#f6f4ee_100%)]" />

      <div className={unframeDesign.shellNarrow}>
        <button
          type="button"
          onClick={onBack}
          className={unframeDesign.secondaryButton}
        >
          <ArrowLeft size={14} />
          신청 유형 다시 선택
        </button>

        <div className={`${unframeDesign.majorCard} mt-6 px-5 py-8 md:px-8 md:py-10`}>
          <div className="flex items-center gap-3 text-[#004AAD]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-zinc-900 bg-[#AAD004] shadow-[2px_2px_0px_#000]">
              <Megaphone size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
              OPEN CALL
            </span>
          </div>

          {loading ? (
            <div className={unframeDesign.pill}>
              <Loader2 size={14} className="animate-spin" />
              공고를 불러오는 중
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className={unframeDesign.pillBlue}>
                  {textOrFallback(openCall.badgeText, "OPEN")}
                </span>
                <span className={unframeDesign.pill}>
                  {statusLabel}
                </span>
                {openCall.isFeatured ? (
                  <span className={unframeDesign.pillLime}>
                    대표 공고
                  </span>
                ) : null}
              </div>

              <h1 className="mt-6 text-[2.7rem] font-black tracking-tighter text-zinc-900 leading-[0.92] break-keep md:text-6xl">
                {textOrFallback(openCall.heroTitle, "2026 UNFRAME OPEN CALL 01.")}
              </h1>

              <p className="mt-4 whitespace-pre-line text-lg font-black text-[#004AAD] break-keep md:text-xl">
                {textOrFallback(openCall.subtitle, OPEN_CALL_FALLBACK.subtitle)}
              </p>

              <p className="mt-5 max-w-3xl whitespace-pre-line text-base font-medium leading-relaxed text-zinc-600 break-keep md:text-lg">
                {textOrFallback(openCall.introText, OPEN_CALL_FALLBACK.introText)}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <span className={unframeDesign.pillBlue}>
                  <CircleDot size={12} />
                  {textOrFallback(openCall.mediumText, OPEN_CALL_FALLBACK.mediumText)}
                </span>
                {heroAccent ? (
                  <span className={unframeDesign.pillLime}>
                    <Sparkles size={12} />
                    {heroAccent}
                  </span>
                ) : null}
              </div>

              <div className="mt-7 grid gap-3 md:grid-cols-2">
                {dateEntries.map(([label, value]) => {
                  const formatted = formatDateTime(value);
                  return (
                    <div
                      key={label}
                      className="rounded-[24px] border-2 border-zinc-900 bg-white px-4 py-4 shadow-[3px_3px_0px_#000]"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004AAD]">
                        {label}
                      </p>
                      <p className="mt-2 text-sm font-black text-zinc-900 break-keep">
                        {formatted || "-"}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border-2 border-zinc-900 bg-[#F6F4EE] px-4 py-3 shadow-[2px_2px_0px_#000]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004AAD]">
                  상태 안내
                </p>
                <p className="mt-1 text-sm font-bold text-zinc-600 break-keep">
                  {statusHelpText}
                </p>
              </div>

              {import.meta.env.DEV ? (
                <p className="mt-3 text-[11px] font-mono text-zinc-400 break-all">
                  activeOpenCallId: {openCall.id}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2">
          {visibleSections.map((section, index) => (
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

        <div className="mt-6 md:mt-8 rounded-[32px] border-2 border-zinc-900 bg-[#004AAD]/8 px-5 py-6 shadow-[6px_6px_0px_#000] md:px-7 md:py-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#004AAD]">
                {textOrFallback(
                  landingLabels.readyToApplyLabel,
                  OPEN_CALL_FALLBACK.landingLabels.readyToApplyLabel
                )}
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
              className={unframeDesign.primaryButton}
            >
              {canApply
                ? applyButtonText
                : disabledButtonText}
              {canApply ? <ArrowRight size={15} /> : null}
            </button>
          </div>
        </div>

        {faqs.length > 0 ? (
          <div className="mt-14 rounded-[32px] border-2 border-zinc-900 bg-white px-5 py-6 shadow-[6px_6px_0px_#000] md:mt-16 md:px-7 md:py-7">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
                  {textOrFallback(
                    landingLabels.faqEyebrow,
                    OPEN_CALL_FALLBACK.landingLabels.faqEyebrow
                  )}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 md:text-3xl">
                  {textOrFallback(
                    landingLabels.faqTitle,
                    OPEN_CALL_FALLBACK.landingLabels.faqTitle
                  )}
                </h2>
              </div>
              <p className="text-sm font-medium leading-relaxed text-zinc-500 break-keep">
                {textOrFallback(
                  landingLabels.faqDescription,
                  OPEN_CALL_FALLBACK.landingLabels.faqDescription
                )}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={`${faq.question}-${faq.order || index}`}
                    className="overflow-hidden rounded-[28px] border-2 border-zinc-900 bg-white shadow-[3px_3px_0px_#000]"
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

        <div className="mt-6 flex justify-center">
          <div className={unframeDesign.pill}>
            <Telescope size={12} />
            {textOrFallback(openCall.title, OPEN_CALL_FALLBACK.title)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OpenCallLanding;
