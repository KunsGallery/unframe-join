import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CircleDot,
  Megaphone,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { appId, db } from "../../lib/firebase";
import { unframeDesign } from "../../components/ui/unframeDesign";
import {
  DEFAULT_JOIN_HOME_CONTENT,
  mergeJoinHomeContent,
} from "../../constants/joinHome";
import {
  JOIN_TRACK_COLLECTION,
  isJoinTrackVisible,
  isJoinTrackClickable,
  getJoinTrackVisibilityState,
  JOIN_TRACK_DISPLAY_STATES,
  mergeJoinTracks,
} from "../../constants/joinTracks";
import {
  JOIN_POPUP_COLLECTION,
  getPopupHideTodayKey,
  getPopupVisibilityStatus,
  isPopupHiddenToday,
  getTodayKey,
  sortJoinPopups,
} from "../../constants/joinPopups";

const TRACK_ICON_MAP = {
  rental: Building2,
  "open-call": Megaphone,
  salon: Users,
  collaboration: MessageSquare,
};

const isVisibleText = (value) => typeof value === "string" && value.trim().length > 0;

const formatCountLabel = (template, count) => {
  if (!isVisibleText(template)) return "";

  return template.replace(/\{\{\s*count\s*\}\}/g, String(count));
};

const getTextOrFallback = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") return value.trim();
  return String(value).trim();
};

const getPresentText = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim();
  return String(value).trim();
};

const hasText = (value) => typeof value === "string" && value.trim().length > 0;

const hexToRgba = (hex, alpha = 1) => {
  const fallback = `rgba(0, 74, 173, ${alpha})`;
  if (typeof hex !== "string") return fallback;

  const normalized = hex.trim().replace("#", "");
  const match = normalized.match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return fallback;

  const value =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((char) => char + char)
          .join("")
      : match[1];

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getEntryLabel = (routeTrack) => {
  if (routeTrack === "rental") return "SPACE";
  if (routeTrack === "open-call") return "OPEN CALL";
  if (routeTrack === "salon") return "SALON";
  if (routeTrack === "collaboration") return "COLLAB";
  return "ENTRY";
};

const getDefaultCtaLabel = (routeTrack) => {
  if (routeTrack === "rental") return "신청 시작하기";
  if (routeTrack === "open-call") return "공개모집 보기";
  return "준비 중";
};

const getTrackShortLabel = (track) =>
  getTextOrFallback(track?.shortLabel, getEntryLabel(track?.routeTrack));

const getTrackStatusLabel = (track) => {
  if (track?.entryStatus === "preparing") {
    const explicitLabel = getPresentText(track?.statusLabel);
    return explicitLabel === null ? "PREPARING" : explicitLabel;
  }

  const explicitLabel = getPresentText(track?.statusLabel);
  if (explicitLabel !== null) return explicitLabel;

  const badgeLabel = getPresentText(track?.badgeText);
  if (badgeLabel !== null) return badgeLabel;

  return track?.routeTrack === "rental"
    ? "신청하기"
    : track?.routeTrack === "open-call"
    ? "공모보기"
    : "PREPARING";
};

const getTrackCtaLabel = (track) => {
  if (track?.entryStatus === "preparing") {
    const explicitLabel = getPresentText(track?.ctaLabel);
    return explicitLabel === null ? "준비 중" : explicitLabel;
  }

  return getTextOrFallback(track?.ctaLabel, getDefaultCtaLabel(track?.routeTrack));
};

const getPanelBasis = (track, hoveredTrackId, trackCount) => {
  if (trackCount <= 1 || !hoveredTrackId) {
    return `${100 / Math.max(trackCount, 1)}%`;
  }

  if (track.id === hoveredTrackId) {
    return "46%";
  }

  return `${54 / Math.max(trackCount - 1, 1)}%`;
};

const getTrackTone = (track) => {
  const brightImage = !!track?.backgroundImageUrl;
  const darkAccent = typeof track?.accentColor === "string" && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(track.accentColor.replace("#", ""));

  return {
    titleClass: "text-zinc-950",
    descriptionClass: "text-zinc-700/90",
    metaClass: "text-zinc-500",
    badgeClass: brightImage || darkAccent
      ? "border-zinc-950/10 bg-white/72 text-zinc-900"
      : "border-white/12 bg-white/70 text-zinc-900",
    accentClass: brightImage ? "text-white" : "text-zinc-950",
  };
};

const buildTrackBackgroundStyle = (track, isHovered) => {
  const accentColor = track?.accentColor || "#004AAD";

  if (track?.backgroundImageUrl) {
    return {
      backgroundImage: `url(${track.backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: accentColor,
      filter: isHovered
        ? "grayscale(0) brightness(1.02) saturate(1.08) contrast(1.02)"
        : "grayscale(1) brightness(0.75) contrast(0.95)",
    };
  }

  return {
    backgroundImage: `linear-gradient(135deg, ${hexToRgba(accentColor, isHovered ? 0.72 : 0.52)} 0%, #F6F4EE 58%, #ffffff 100%)`,
    backgroundColor: hexToRgba(accentColor, 0.08),
    filter: isHovered
      ? "grayscale(0) brightness(1.02) saturate(1.08) contrast(1.02)"
      : "grayscale(1) brightness(0.82) contrast(0.96)",
  };
};

const getTrackVisibilityTone = (visibilityState) => {
  if (visibilityState === JOIN_TRACK_DISPLAY_STATES.ACTIVE) {
    return {
      cardClass: "cursor-pointer",
      panelClass: "border-[#004AAD]/10 bg-white/78",
      ctaLabel: null,
      buttonClass: "",
      hoverEnabled: true,
      opacity: 1,
      transform: "translateY(0)",
      toneClass: "border-[#004AAD]/15 bg-[#004AAD]/8 text-[#004AAD]",
    };
  }

  if (visibilityState === JOIN_TRACK_DISPLAY_STATES.DISABLED) {
    return {
      cardClass: "cursor-not-allowed",
      panelClass: "border-amber-200 bg-amber-50/72",
      ctaLabel: "준비 중",
      buttonClass: "opacity-95",
      hoverEnabled: false,
      opacity: 0.95,
      transform: "translateY(0)",
      toneClass: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    cardClass: "cursor-default",
    panelClass: "border-zinc-200 bg-zinc-50/40",
    ctaLabel: null,
    buttonClass: "opacity-90",
    hoverEnabled: false,
    opacity: 0.9,
    transform: "translateY(0)",
    toneClass: "border-zinc-200 bg-zinc-100 text-zinc-500",
  };
};

const TrackSlice = ({ track, hoveredTrackId, count, onHover, onClick }) => {
  const Icon = TRACK_ICON_MAP[track.routeTrack] || Sparkles;
  const visibilityState = getJoinTrackVisibilityState(track);
  const isClickable = visibilityState === JOIN_TRACK_DISPLAY_STATES.ACTIVE;
  const isDisabled = visibilityState === JOIN_TRACK_DISPLAY_STATES.DISABLED;
  const visibilityTone = getTrackVisibilityTone(visibilityState);
  const isHovered = hoveredTrackId === track.id;
  const hasHover = Boolean(hoveredTrackId);
  const isDimmed = hasHover && !isHovered;
  const tone = getTrackTone(track);
  const orderLabel = String(track.order ?? 0).padStart(2, "0");
  const shortLabel = getTrackShortLabel(track);
  const statusLabel = getTrackStatusLabel(track);
  const eyebrow = getTextOrFallback(track.eyebrow, "UNFRAME JOIN");
  const title = getPresentText(track.title);
  const description = getPresentText(track.description);
  const ctaLabel = visibilityTone.ctaLabel || getTrackCtaLabel(track);
  const handleButtonClick = () => {
    if (!isClickable) return;
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleButtonClick}
      onMouseEnter={onHover}
      aria-disabled={!isClickable}
      className={`group relative min-w-0 overflow-hidden text-left transition-[flex-basis,flex-grow,transform,opacity] duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${visibilityTone.cardClass} ${isDisabled ? "cursor-not-allowed" : ""}`}
      style={{
        flexBasis: getPanelBasis(track, hoveredTrackId, count),
        flexGrow: isHovered ? 2 : 1,
        flexShrink: 1,
        zIndex: isHovered ? 20 : 10,
        opacity: isDimmed ? 0.72 : visibilityTone.opacity,
        transform: isHovered ? "translateY(-2px)" : visibilityTone.transform,
      }}
    >
      <div
        className="absolute inset-0 transition-all duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={buildTrackBackgroundStyle(track, isHovered)}
      />

      <div className="absolute inset-0 bg-[#F6F4EE]/12 mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/48 via-zinc-950/10 to-white/5" />
      <div className="absolute inset-y-0 -right-10 w-24 skew-x-[-8deg] bg-white/18 opacity-45 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-70" />
      <div className="absolute inset-y-0 right-0 w-px bg-white/25" />

        <div className={`relative z-30 flex h-full min-h-[420px] flex-col justify-between p-6 text-white md:min-h-[480px] md:p-8 lg:min-h-[520px] lg:p-10 ${visibilityTone.buttonClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/16 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/92 backdrop-blur-md">
            <CircleDot size={11} />
            {orderLabel}
            {hasText(shortLabel) ? ` / ${shortLabel}` : ""}
          </div>

          {hasText(statusLabel) ? (
            <div
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-md ${tone.badgeClass}`}
            >
              {statusLabel}
            </div>
          ) : null}
        </div>

        <div className="max-w-[34rem]">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/14 bg-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-md">
              <Icon size={22} className={tone.accentClass} />
            </div>
            {hasText(eyebrow) ? (
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${tone.metaClass}`}>
                  {eyebrow}
                </p>
              </div>
            ) : null}
          </div>

          {hasText(title) ? (
            <h2
              className={`mt-5 text-[1.85rem] font-black tracking-tighter break-keep transition-all duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:text-[2.4rem] lg:text-[3.1rem] ${tone.titleClass} ${
                hasHover && !isHovered ? "opacity-55" : "opacity-100"
              }`}
            >
              {title}
            </h2>
          ) : null}

          {hasText(description) ? (
            <p
              className={`mt-4 max-w-[30rem] whitespace-pre-line text-sm font-medium leading-relaxed break-keep md:text-[0.98rem] ${tone.descriptionClass} ${
                isHovered ? "opacity-100" : "opacity-92"
              }`}
            >
              {description}
            </p>
          ) : null}

          {hasText(ctaLabel) ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-950/10 bg-white/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-950 shadow-[0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-transform duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5">
              <span>{ctaLabel}</span>
              <ArrowRight size={14} />
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
};

const AuxiliaryTrackItem = ({ track, onClick }) => {
  const Icon = TRACK_ICON_MAP[track.routeTrack] || Sparkles;
  const visibilityState = getJoinTrackVisibilityState(track);
  const isClickable = visibilityState === JOIN_TRACK_DISPLAY_STATES.ACTIVE;
  const eyebrow = getTextOrFallback(track.eyebrow, "UNFRAME");
  const title = getPresentText(track.title);
  const handleClick = () => {
    if (!isClickable) return;
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group flex items-center justify-between gap-4 rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${
        isClickable
          ? "cursor-pointer border-zinc-950/10 bg-white/85 hover:-translate-y-0.5 hover:border-[#004AAD]/20 hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)]"
          : "cursor-not-allowed border-amber-200 bg-amber-50/80 opacity-95"
      }`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-zinc-950 ${
            isClickable
              ? "border-zinc-950/10 bg-[#F6F4EE]"
              : "border-amber-200 bg-white"
          }`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          {hasText(eyebrow) ? (
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isClickable ? "text-zinc-500" : "text-amber-700"}`}>
              {eyebrow}
            </p>
          ) : null}
          {hasText(title) ? (
            <p className={`mt-1 text-sm font-black tracking-tight break-keep ${isClickable ? "text-zinc-950" : "text-zinc-700"}`}>
              {title}
            </p>
          ) : null}
        </div>
      </div>

      <ArrowRight
        size={16}
        className={`shrink-0 transition-colors ${
          isClickable
            ? "text-zinc-300 group-hover:text-[#004AAD]"
            : "text-amber-300"
        }`}
      />
    </button>
  );
};

const FeaturedProjectCard = ({ popup, content, onCta }) => {
  const poster = popup?.posterImageUrl?.trim();
  const targetTrack = popup?.targetTrack || "open-call";
  const targetLabel = getEntryLabel(targetTrack);
  const ctaLabel = popup?.ctaLabel?.trim() || "자세히 보기";
  const currentProgramLabel = content?.currentProgramLabel?.trim() || "";
  const preparedProgramLabel = content?.preparedProgramLabel?.trim() || "";
  const featuredProgramLabel = content?.featuredProgramLabel?.trim() || "";
  const featuredProjectsLabel = content?.featuredProjectsLabel?.trim() || "";
  const cardLabel = popup ? currentProgramLabel : preparedProgramLabel;

  return (
    <section className="overflow-hidden rounded-[32px] border border-zinc-950/10 bg-white/78 shadow-[0_18px_48px_rgba(0,0,0,0.06)]">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between p-6 md:p-8 lg:p-10">
          <div>
            {isVisibleText(cardLabel) ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#004AAD]">
                <CircleDot size={11} />
                {cardLabel}
              </div>
            ) : null}

            {popup ? (
              <>
                <h2 className="mt-5 max-w-3xl text-[2rem] font-black tracking-tighter text-zinc-950 break-keep md:text-[2.8rem] lg:text-[3.4rem]">
                  {popup.title || "현재 대표 공지"}
                </h2>
                <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-bold leading-relaxed text-zinc-700 break-keep md:text-lg">
                  {popup.subtitle || "활성화된 공지와 프로젝트를 이 영역에서 함께 보여줍니다."}
                </p>
                <p className="mt-5 max-w-2xl whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep md:text-[0.98rem]">
                  {popup.body || ""}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-5 max-w-3xl text-[2rem] font-black tracking-tighter text-zinc-950 break-keep md:text-[2.8rem] lg:text-[3.4rem]">
                  현재 대표 공지가 없습니다.
                </h2>
                <p className="mt-4 max-w-2xl whitespace-pre-line text-base font-bold leading-relaxed text-zinc-700 break-keep md:text-lg">
                  대표 공지가 활성화되면 이 영역에 표시됩니다.
                </p>
                <p className="mt-5 max-w-2xl whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep md:text-[0.98rem]">
                  UNFRAME JOIN의 현재 입구와 공지를 한눈에 보여주는 자리입니다.
                </p>
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-950/10 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                {targetLabel}
              </span>
              {popup?.priority != null ? (
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-900 bg-[#AAD004] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-950 shadow-[2px_2px_0px_#000]">
                대표 공지
              </span>
              ) : null}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            {popup ? (
              <button
                type="button"
                onClick={onCta}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-zinc-950/10 transition-opacity hover:opacity-90"
              >
                {ctaLabel}
                <ArrowRight size={14} />
              </button>
            ) : null}

            {popup && isVisibleText(featuredProjectsLabel) ? (
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
                {featuredProjectsLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative min-h-[18rem] overflow-hidden border-t border-zinc-950/10 bg-[#F6F4EE] lg:min-h-[24rem] lg:border-t-0 lg:border-l">
          {poster ? (
            <img
              src={poster}
              alt={popup?.title || "Featured project"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#004AAD_0%,#AAD004_48%,#F6F4EE_100%)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/35 via-zinc-950/8 to-white/10" />
          <div className="absolute inset-y-0 right-0 w-20 skew-x-[-8deg] bg-white/20 opacity-45 mix-blend-overlay" />

          {isVisibleText(featuredProgramLabel) ? (
            <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
              {featuredProgramLabel}
            </div>
          ) : null}

          {!poster ? (
            <div className="absolute bottom-5 left-5 right-5 rounded-[24px] border border-white/18 bg-white/10 p-4 text-white backdrop-blur-md">
              {isVisibleText(currentProgramLabel) ? (
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/80">
                  {currentProgramLabel}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-white/90 break-keep">
                포스터가 없어도 대표 공지의 분위기를 유지할 수 있도록 그래픽 대체 화면을 보여줍니다.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

const FeaturedProjectSlider = ({
  items,
  content,
  activeIndex,
  onPrev,
  onNext,
  onSelect,
  onJump,
}) => {
  if (!items.length) return null;

  if (items.length === 1) {
    return (
      <FeaturedProjectCard
        popup={items[0]}
        content={content}
        onCta={() => onSelect(items[0])}
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[32px]">
        <div
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {items.map((popup) => (
            <div key={popup.id} className="w-full shrink-0">
              <FeaturedProjectCard popup={popup} content={content} onCta={() => onSelect(popup)} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[24px] border border-zinc-950/10 bg-white/78 px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-950/10 bg-white text-zinc-700 transition-colors hover:border-[#004AAD]/20 hover:text-[#004AAD]"
            aria-label="이전 피쳐 프로젝트"
          >
            <ArrowRight size={16} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-950/10 bg-white text-zinc-700 transition-colors hover:border-[#004AAD]/20 hover:text-[#004AAD]"
            aria-label="다음 피쳐 프로젝트"
          >
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {items.map((popup, index) => (
            <button
              key={popup.id}
              type="button"
              onClick={() => onJump(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeIndex ? "w-8 bg-[#004AAD]" : "w-2.5 bg-zinc-300"
              }`}
              aria-label={`피쳐 프로젝트 ${index + 1}로 이동`}
            />
          ))}
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
          {activeIndex + 1} / {items.length}
        </p>
      </div>
    </section>
  );
};

const BrandHero = ({ content }) => (
  <section
    className={`grid gap-8 ${
      content.brandNoteEnabled ? "lg:grid-cols-[1.15fr_0.85fr] lg:items-end" : "grid-cols-1"
    }`}
  >
    <div className="max-w-4xl">
      {isVisibleText(content.heroBadgeText) ? (
        <div className="inline-flex items-center gap-3 rounded-full border-2 border-zinc-900 bg-white px-4 py-2 shadow-[3px_3px_0px_#000]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#004AAD] text-white">
            <Sparkles size={15} />
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.34em] text-zinc-500">
            {content.heroBadgeText}
          </span>
        </div>
      ) : null}

      {isVisibleText(content.heroTitle) ? (
        <h1 className="mt-6 max-w-4xl whitespace-pre-line text-[3rem] font-black tracking-tighter leading-[0.92] text-zinc-950 break-keep md:text-[4.3rem] lg:text-[5.2rem]">
          {content.heroTitle}
        </h1>
      ) : null}

      {isVisibleText(content.heroDescription) ? (
        <p className="mt-5 max-w-2xl whitespace-pre-line text-base font-medium leading-relaxed text-zinc-700 break-keep md:text-lg">
          {content.heroDescription}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {isVisibleText(content.heroPrimaryChip) ? (
          <span className={unframeDesign.pill}>
            <CircleDot size={11} />
            {content.heroPrimaryChip}
          </span>
        ) : null}
        {isVisibleText(content.heroSecondaryChip) ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/12 px-3 py-1.5 text-[#6f8f00]">
            {content.heroSecondaryChip}
          </span>
        ) : null}
      </div>
    </div>

    {content.brandNoteEnabled ? (
      <div className="rounded-[32px] border-2 border-zinc-900 bg-white p-5 shadow-[4px_4px_0px_#000] md:p-6">
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              {isVisibleText(content.brandNoteLabel) ? (
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
                  {content.brandNoteLabel}
                </p>
              ) : null}
              {isVisibleText(content.brandNoteTitle) ? (
                <p className="mt-2 text-lg font-black tracking-tight text-zinc-950">
                  {content.brandNoteTitle}
                </p>
              ) : null}
            </div>

            {isVisibleText(content.brandNoteLiveLabel) ? (
              <div className="rounded-full border border-[#AAD004]/20 bg-[#AAD004]/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#6f8f00]">
                {content.brandNoteLiveLabel}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {isVisibleText(content.brandNoteLeftLabel) ||
            isVisibleText(content.brandNoteLeftText) ? (
              <div className="rounded-[24px] border-2 border-zinc-900 bg-white p-4 shadow-[2px_2px_0px_#000]">
                {isVisibleText(content.brandNoteLeftLabel) ? (
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                    {content.brandNoteLeftLabel}
                  </p>
                ) : null}
                {isVisibleText(content.brandNoteLeftText) ? (
                  <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
                    {content.brandNoteLeftText}
                  </p>
                ) : null}
              </div>
            ) : null}

            {isVisibleText(content.brandNoteRightLabel) ||
            isVisibleText(content.brandNoteRightText) ? (
              <div className="rounded-[24px] border-2 border-zinc-900 bg-white p-4 shadow-[2px_2px_0px_#000]">
                {isVisibleText(content.brandNoteRightLabel) ? (
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                    {content.brandNoteRightLabel}
                  </p>
                ) : null}
                {isVisibleText(content.brandNoteRightText) ? (
                  <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
                    {content.brandNoteRightText}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      </div>
    ) : null}
  </section>
);

const EntryPanel = ({
  loading,
  content,
  visibleTracks,
  primaryTracks,
  auxiliaryTracks,
  hoveredTrackId,
  setHoveredTrackId,
  handleTrackClick,
}) => (
  <section className="rounded-[32px] border-2 border-zinc-900 bg-white p-4 shadow-[4px_4px_0px_#000] md:p-6">
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {content.waysToJoinEnabled ? (
          <>
            {isVisibleText(content.waysToJoinEyebrow) ? (
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
                {content.waysToJoinEyebrow}
              </p>
            ) : null}
            {isVisibleText(content.waysToJoinTitle) ? (
              <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 md:text-3xl">
                {content.waysToJoinTitle}
              </h2>
            ) : null}
            {isVisibleText(content.waysToJoinDescription) ? (
              <p className="mt-2 max-w-2xl whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep">
                {content.waysToJoinDescription}
              </p>
            ) : null}
          </>
        ) : null}

        {!content.waysToJoinEnabled && isVisibleText(content.trackMetaNote) ? (
          <p className="text-sm font-medium leading-relaxed text-zinc-600 break-keep">
            {content.trackMetaNote}
          </p>
        ) : null}
      </div>

      {content.activeTrackCountEnabled ? (
        isVisibleText(
          loading
            ? "SYNCING"
            : formatCountLabel(content.activeTrackCountLabelTemplate, visibleTracks.length)
        ) ? (
          <div className={unframeDesign.pill}>
            {loading
              ? "SYNCING"
              : formatCountLabel(content.activeTrackCountLabelTemplate, visibleTracks.length)}
          </div>
        ) : null
      ) : null}
    </div>

    {content.waysToJoinEnabled && isVisibleText(content.trackMetaNote) ? (
      <p className="mb-5 max-w-3xl text-sm font-medium leading-relaxed text-zinc-500 break-keep">
        {content.trackMetaNote}
      </p>
    ) : null}

    {primaryTracks.length > 0 ? (
      <>
        <div
          className="hidden overflow-hidden rounded-[30px] border border-zinc-950/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.12)] md:flex"
          style={{ minHeight: "clamp(26rem, 48vh, 32rem)" }}
          onMouseLeave={() => setHoveredTrackId(null)}
        >
          {primaryTracks.map((track) => (
            <TrackSlice
              key={track.id}
              track={track}
              count={primaryTracks.length}
              hoveredTrackId={hoveredTrackId}
              onHover={() => setHoveredTrackId(track.id)}
              onClick={() => handleTrackClick(track)}
            />
          ))}
        </div>

        <div className="grid gap-4 md:hidden">
          {primaryTracks.map((track, index) => {
            const visibilityState = getJoinTrackVisibilityState(track);
            const isClickable = visibilityState === JOIN_TRACK_DISPLAY_STATES.ACTIVE;
            const isDisabled = visibilityState === JOIN_TRACK_DISPLAY_STATES.DISABLED;
            const mobileCtaLabel = isClickable ? getTrackCtaLabel(track) : "준비 중";

            return (
              <button
                key={track.id}
                type="button"
                aria-disabled={!isClickable}
                onClick={() => {
                  if (!isClickable) return;
                  handleTrackClick(track);
                }}
                className={`group relative min-h-[16rem] overflow-hidden rounded-[30px] border text-left shadow-[0_18px_50px_rgba(0,0,0,0.1)] ${
                  isClickable
                    ? "cursor-pointer border-zinc-950/10 bg-white"
                    : "cursor-not-allowed border-amber-200 bg-amber-50/80"
                }`}
              >
                <div
                  className="absolute inset-0"
                  style={buildTrackBackgroundStyle(track, isClickable)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/30 via-zinc-950/5 to-white/15" />
                <div className="absolute inset-y-0 -right-8 w-16 skew-x-[-8deg] bg-white/18 opacity-50 mix-blend-overlay" />

                <div
                  className={`relative z-30 flex min-h-[16rem] flex-col justify-between p-5 ${
                    isDisabled ? "text-white/92" : "text-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] backdrop-blur-md ${
                        isClickable
                          ? "border-white/12 bg-white/12"
                          : "border-amber-200 bg-white/18 text-amber-50"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                      {hasText(getTrackShortLabel(track)) ? ` / ${getTrackShortLabel(track)}` : ""}
                    </div>
                    {hasText(getTrackStatusLabel(track)) ? (
                      <div
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-md ${
                          isClickable
                            ? "border-white/12 bg-white/12"
                            : "border-amber-200 bg-white/18 text-amber-50"
                        }`}
                      >
                        {getTrackStatusLabel(track)}
                      </div>
                    ) : null}
                  </div>

                  <div className="max-w-[18rem]">
                    {hasText(getTextOrFallback(track.eyebrow, "UNFRAME JOIN")) ? (
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/72">
                        {getTextOrFallback(track.eyebrow, "UNFRAME JOIN")}
                      </p>
                    ) : null}
                    {hasText(getPresentText(track.title)) ? (
                      <h3 className="mt-3 text-[1.55rem] font-black tracking-tighter text-white break-keep">
                        {getPresentText(track.title)}
                      </h3>
                    ) : null}
                    {hasText(getPresentText(track.description)) ? (
                      <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-white/82 break-keep">
                        {getPresentText(track.description)}
                      </p>
                    ) : null}
                    {hasText(mobileCtaLabel) ? (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-950">
                        {mobileCtaLabel}
                        <ArrowRight size={14} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </>
    ) : (
      <div className="flex h-full min-h-[24rem] items-center justify-center rounded-[34px] border border-dashed border-zinc-950/10 bg-white/80 px-6 text-center">
        <div>
          <p className="text-lg font-black text-zinc-950">노출 중인 트랙이 없습니다</p>
          <p className="mt-2 text-sm font-medium text-zinc-700 break-keep">
            현재 노출 가능한 트랙이 없습니다.
          </p>
        </div>
      </div>
    )}

    {auxiliaryTracks.length > 0 ? (
      <div className="mt-5 rounded-[28px] border border-zinc-950/10 bg-white/80 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.06)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          {isVisibleText(content?.auxiliaryEntryPointsLabel) ? (
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
              {content.auxiliaryEntryPointsLabel}
            </p>
          ) : null}
          {isVisibleText(content?.auxiliaryEntryPointsSubLabel) ? (
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
              {content.auxiliaryEntryPointsSubLabel}
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {auxiliaryTracks.map((track) => (
            <AuxiliaryTrackItem key={track.id} track={track} onClick={() => handleTrackClick(track)} />
          ))}
        </div>
      </div>
    ) : null}

    {content.footerNoteEnabled && isVisibleText(content.footerNoteText) ? (
      <div className="mt-5 rounded-[24px] border border-zinc-950/10 bg-white/75 px-4 py-3 text-sm font-medium leading-relaxed text-zinc-600 break-keep">
        {content.footerNoteText}
      </div>
    ) : null}
  </section>
);

const JoinPopupModal = ({ popup, onClose, onHideToday, onCta }) => {
  if (!popup) return null;

  const poster = popup.posterImageUrl?.trim();
  const ctaLabel =
    popup.ctaLabel?.trim() ||
    (popup.targetTrack === "open-call" ? "오픈콜 신청하러 가기" : "신청하러 가기");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-zinc-950/10 bg-[#F6F4EE] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="팝업 닫기"
          className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-950/10 bg-white/90 text-zinc-700 shadow-sm transition-colors hover:text-zinc-950"
        >
          <span className="text-2xl leading-none">×</span>
        </button>

        <div className="grid min-h-[32rem] md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[18rem] overflow-hidden bg-[#004AAD]">
            {poster ? (
              <img
                src={poster}
                alt={popup.title || "Join popup"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#004AAD_0%,#AAD004_54%,#F6F4EE_100%)]" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/55 via-zinc-950/10 to-white/10" />
            <div className="absolute inset-y-0 right-0 w-16 skew-x-[-8deg] bg-white/20 opacity-40 mix-blend-overlay" />
          </div>

          <div className="flex flex-col justify-between p-6 text-zinc-950 md:p-8 lg:p-10">
            <div>
              <h2 className="mt-4 whitespace-pre-line break-keep text-[2rem] font-black tracking-tighter text-zinc-950 leading-tight md:text-[2.6rem]">
                {popup.title || "공지"}
              </h2>
              <p className="mt-4 whitespace-pre-line text-base font-bold leading-relaxed text-zinc-700 break-keep md:text-lg">
                {popup.subtitle || ""}
              </p>
              <p className="mt-5 max-w-2xl whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep md:text-[0.98rem]">
                {popup.body || ""}
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6 px-3 py-1.5 text-[#004AAD]">
                  <CircleDot size={11} />
                  {popup.targetTrack || "open-call"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-900 bg-[#AAD004] px-3 py-1.5 text-zinc-950 shadow-[2px_2px_0px_#000]">
                  대표 공지
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onCta}
                className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-zinc-950 px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg transition-opacity hover:opacity-90"
              >
                {ctaLabel}
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={onHideToday}
                className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border border-zinc-950/10 bg-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700 transition-colors hover:border-[#004AAD]/20 hover:text-[#004AAD]"
              >
                오늘 하루 보지 않기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PreparingDialog = ({ track, onClose }) => {
  if (!track) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/45 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preparing-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[32px] border border-zinc-950/10 bg-[#F6F4EE] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.3)] md:p-8">
        <div className="inline-flex rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#004AAD]">
          PREPARING
        </div>
        <h2 id="preparing-dialog-title" className="mt-5 text-2xl font-black tracking-tight text-zinc-950 break-keep">
          {track.preparingTitle || "준비 중입니다."}
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep">
          {track.preparingMessage || "현재 해당 접수는 준비 중입니다."}
        </p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-7 w-full rounded-2xl bg-zinc-950 px-5 py-4 text-sm font-black text-white transition-opacity hover:opacity-90"
        >
          {track.preparingConfirmLabel || "확인"}
        </button>
      </div>
    </div>
  );
};

const JoinHome = ({ onSelectRental, onSelectOpenCall, onSelectSalon }) => {
  const [joinTrackDocs, setJoinTrackDocs] = useState([]);
  const [joinPopupDocs, setJoinPopupDocs] = useState([]);
  const [joinHomeContent, setJoinHomeContent] = useState(
    DEFAULT_JOIN_HOME_CONTENT
  );
  const [loading, setLoading] = useState(true);
  const [popupLoading, setPopupLoading] = useState(true);
  const [hoveredTrackId, setHoveredTrackId] = useState(null);
  const [dismissedPopupIdsThisSession, setDismissedPopupIdsThisSession] = useState([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [preparingTrack, setPreparingTrack] = useState(null);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setJoinTrackDocs(snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id })));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [appId, db]);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", JOIN_POPUP_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setJoinPopupDocs(snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id })));
        setPopupLoading(false);
      },
      (error) => {
        console.error(error);
        setPopupLoading(false);
      }
    );

    return () => unsubscribe();
  }, [appId, db]);

  useEffect(() => {
    const ref = doc(db, "artifacts", appId, "public", "data", "joinHome", "settings");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setJoinHomeContent(DEFAULT_JOIN_HOME_CONTENT);
        } else {
          setJoinHomeContent(mergeJoinHomeContent(snapshot.data()));
        }
      },
      (error) => {
        console.error(error);
        setJoinHomeContent(DEFAULT_JOIN_HOME_CONTENT);
      }
    );

    return () => unsubscribe();
  }, [appId, db]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const currentTime = useMemo(() => new Date(nowTick), [nowTick]);
  const mergedTracks = useMemo(() => mergeJoinTracks(joinTrackDocs), [joinTrackDocs]);
  const visibleTracks = useMemo(
    () => mergedTracks.filter(isJoinTrackVisible),
    [mergedTracks]
  );
  const primaryTracks = visibleTracks.slice(0, 4);
  const auxiliaryTracks = visibleTracks.slice(4);
  const popupStatuses = useMemo(
    () =>
      sortJoinPopups(joinPopupDocs).map((popup) => {
        const status = getPopupVisibilityStatus(popup, currentTime);
        const hiddenToday = isPopupHiddenToday(popup.id, currentTime);
        const dismissedThisSession = dismissedPopupIdsThisSession.includes(popup.id);
        const popupLocationEnabled = popup.showAsPopup !== false;
        const featuredLocationEnabled = popup.showAsFeatured !== false;
        const popupVisible = status.canShow && popupLocationEnabled && !hiddenToday && !dismissedThisSession;
        const featuredVisible = status.canShow && featuredLocationEnabled;

        return {
          ...popup,
          status,
          hiddenToday,
          dismissedThisSession,
          popupLocationEnabled,
          featuredLocationEnabled,
          popupVisible,
          featuredVisible,
        };
      }),
    [currentTime, dismissedPopupIdsThisSession, joinPopupDocs]
  );
  const popupCandidates = useMemo(
    () => popupStatuses.filter((popup) => popup.popupVisible),
    [popupStatuses]
  );
  const featuredProjects = useMemo(
    () => popupStatuses.filter((popup) => popup.featuredVisible),
    [popupStatuses]
  );
  const activePopup = useMemo(() => popupCandidates[0] || null, [popupCandidates]);

  useEffect(() => {
    if (featuredProjects.length === 0) {
      if (featuredIndex !== 0) setFeaturedIndex(0);
      return;
    }

    if (featuredIndex >= featuredProjects.length) {
      setFeaturedIndex(featuredProjects.length - 1);
    }
  }, [featuredIndex, featuredProjects.length]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    console.log("JOIN_POPUPS_RAW", joinPopupDocs);
    console.log("JOIN_POPUPS_STATUS", popupStatuses);
    console.log("JOIN_POPUP_CANDIDATES", popupCandidates);
    console.log("JOIN_FEATURED_PROJECTS", featuredProjects);
    console.log("JOIN_ACTIVE_POPUP", activePopup);
  }, [activePopup, featuredProjects, joinPopupDocs, popupCandidates, popupStatuses]);

  const handleTrackSelect = (routeTrack) => {
    const targetTrack = mergedTracks.find((track) => track.routeTrack === routeTrack);
    if (!isJoinTrackVisible(targetTrack)) return;
    if (targetTrack?.entryStatus === "preparing") {
      setPreparingTrack(targetTrack);
      return;
    }
    if (!isJoinTrackClickable(targetTrack)) {
      return;
    }

    if (routeTrack === "rental") {
      onSelectRental?.();
      return;
    }

    if (routeTrack === "open-call") {
      onSelectOpenCall?.();
      return;
    }

    if (routeTrack === "salon") {
      onSelectSalon?.();
      return;
    }

  };

  const dismissPopupForSession = (popup) => {
    if (!popup?.id) return;
    setDismissedPopupIdsThisSession((prev) =>
      prev.includes(popup.id) ? prev : [...prev, popup.id]
    );
  };

  const hidePopupForToday = (popup) => {
    if (!popup?.id) return;

    try {
      window.localStorage.setItem(getPopupHideTodayKey(popup.id), getTodayKey(currentTime));
    } catch (error) {
      console.error(error);
    }

    dismissPopupForSession(popup);
  };

  const popupToShow = popupLoading ? null : activePopup;
  const handleFeaturedPrev = () => {
    if (featuredProjects.length < 2) return;
    setFeaturedIndex((current) =>
      (current - 1 + featuredProjects.length) % featuredProjects.length
    );
  };
  const handleFeaturedNext = () => {
    if (featuredProjects.length < 2) return;
    setFeaturedIndex((current) => (current + 1) % featuredProjects.length);
  };
  const handleFeaturedJump = (index) => {
    if (index < 0 || index >= featuredProjects.length) return;
    setFeaturedIndex(index);
  };
  const handlePopupClose = () => dismissPopupForSession(popupToShow);
  const handlePopupHideToday = () => hidePopupForToday(popupToShow);
  const handlePopupCta = () => {
    if (!popupToShow) return;
    dismissPopupForSession(popupToShow);
    handleTrackSelect(popupToShow.targetTrack);
  };
  const handleFeaturedProjectCta = (popup) => {
    if (!popup) return;
    handleTrackSelect(popup.targetTrack);
  };

  useEffect(() => {
    if (!popupToShow) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        dismissPopupForSession(popupToShow);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [popupToShow]);

  useEffect(() => {
    if (!preparingTrack) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setPreparingTrack(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [preparingTrack]);

  const handleTrackClick = (track) => {
    if (!isJoinTrackVisible(track)) return;
    if (track.entryStatus === "preparing") {
      setPreparingTrack(track);
      return;
    }
    if (!isJoinTrackClickable(track)) return;
    handleTrackSelect(track.routeTrack);
  };

  return (
    <main className="min-h-screen bg-[#F6F4EE] text-zinc-950">
      <div className="mx-auto max-w-7xl px-5 pt-10 pb-8 md:px-6 md:pt-16 md:pb-10">
        <BrandHero content={joinHomeContent} />
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-10 md:px-6 md:pb-12">
        <FeaturedProjectSlider
          items={featuredProjects}
          content={joinHomeContent}
          activeIndex={featuredProjects.length === 0 ? 0 : featuredIndex}
          onPrev={handleFeaturedPrev}
          onNext={handleFeaturedNext}
          onSelect={handleFeaturedProjectCta}
          onJump={handleFeaturedJump}
        />
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-14 md:px-6 md:pb-20">
        <EntryPanel
          loading={loading}
          content={joinHomeContent}
          visibleTracks={visibleTracks}
          primaryTracks={primaryTracks}
          auxiliaryTracks={auxiliaryTracks}
          hoveredTrackId={hoveredTrackId}
          setHoveredTrackId={setHoveredTrackId}
          handleTrackClick={handleTrackClick}
        />
      </div>

      <footer className="mx-auto max-w-7xl px-5 pb-10 md:px-6 md:pb-12">
        <div className="flex flex-col gap-2 border-t border-zinc-950/10 pt-4 md:flex-row md:items-center md:justify-between">
          {joinHomeContent.activeTrackCountEnabled ? (
            isVisibleText(
              formatCountLabel(joinHomeContent.activeTrackCountLabelTemplate, visibleTracks.length)
            ) ? (
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
                {formatCountLabel(joinHomeContent.activeTrackCountLabelTemplate, visibleTracks.length)}
              </p>
            ) : null
          ) : null}
          {isVisibleText(joinHomeContent.footerNoteText) && joinHomeContent.footerNoteEnabled ? (
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
              {joinHomeContent.footerNoteText}
            </p>
          ) : null}
        </div>
      </footer>

      <PreparingDialog track={preparingTrack} onClose={() => setPreparingTrack(null)} />

      <JoinPopupModal
        popup={popupToShow}
        onClose={handlePopupClose}
        onHideToday={handlePopupHideToday}
        onCta={handlePopupCta}
      />
    </main>
  );
};

export default JoinHome;
