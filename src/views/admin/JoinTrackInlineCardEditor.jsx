import React from "react";
import {
  ArrowRight,
  Building2,
  Megaphone,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import {
  JOIN_TRACK_DISPLAY_STATES,
  getJoinTrackVisibilityState,
  getSavedTextValue,
} from "../../constants/joinTracks";

const TRACK_ICON_MAP = {
  rental: Building2,
  "open-call": Megaphone,
  salon: Users,
  collaboration: MessageSquare,
};

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

const getEntryLabel = (routeTrack) => {
  if (routeTrack === "rental") return "SPACE";
  if (routeTrack === "open-call") return "OPEN CALL";
  if (routeTrack === "salon") return "SALON";
  if (routeTrack === "collaboration") return "COLLAB";
  return "ENTRY";
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

  return getTextOrFallback(
    track?.ctaLabel,
    track?.routeTrack === "rental"
      ? "신청 시작하기"
      : track?.routeTrack === "open-call"
      ? "공개모집 보기"
      : "준비 중"
  );
};

const buildTrackBackgroundStyle = (track) => {
  const accentColor = track?.accentColor || "#004AAD";

  if (track?.backgroundImageUrl) {
    return {
      backgroundImage: `url(${track.backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: accentColor,
    };
  }

  return {
    backgroundImage: `linear-gradient(135deg, ${hexToRgba(accentColor, 0.56)} 0%, #F6F4EE 58%, #ffffff 100%)`,
    backgroundColor: hexToRgba(accentColor, 0.08),
  };
};

const sharedInlineFieldClass =
  "w-full min-w-0 bg-transparent text-white outline-none transition-all placeholder:text-white/45 hover:bg-white/5 focus:bg-white/10 focus:ring-2 focus:ring-[#004AAD]/30";

const pillInlineFieldClass =
  "rounded-full border border-white/18 bg-white/10 px-3 py-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all hover:bg-white/14 focus-within:bg-white/14 focus-within:ring-2 focus-within:ring-[#004AAD]/30";

const formatOrderDisplay = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "00";
  return String(parsed).padStart(2, "0");
};

const normalizeOrderInput = (value) => {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits;
};

const VISIBILITY_STATE_META = {
  [JOIN_TRACK_DISPLAY_STATES.ACTIVE]: {
    label: "ACTIVE",
    hint: "메인에 표시, 클릭 가능",
    selectClass: "border-[#004aad] bg-[#004aad]/8 text-[#004aad]",
  },
  [JOIN_TRACK_DISPLAY_STATES.DISABLED]: {
    label: "DISABLED",
    hint: "메인에 표시, 클릭 불가",
    selectClass: "border-amber-300 bg-amber-50 text-amber-800",
  },
  [JOIN_TRACK_DISPLAY_STATES.HIDDEN]: {
    label: "HIDE",
    hint: "메인에서 숨김",
    selectClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

const JoinTrackInlineCardEditor = ({
  track,
  index = 0,
  draft = {},
  onChange,
  onOpenAdvanced,
  visibilityState: controlledVisibilityState,
  onChangeVisibility,
}) => {
  const Icon = TRACK_ICON_MAP[track?.routeTrack] || Sparkles;
  const draftTrack = { ...track, ...draft };
  const visibilityState =
    controlledVisibilityState || getJoinTrackVisibilityState(draftTrack);
  const visibilityMeta =
    VISIBILITY_STATE_META[visibilityState] || VISIBILITY_STATE_META.active;

  const resolvedOrder = getSavedTextValue(draft, "order");
  const resolvedShortLabel = getSavedTextValue(draft, "shortLabel");
  const resolvedStatusLabel = getSavedTextValue(draft, "statusLabel");
  const resolvedEyebrow = getSavedTextValue(draft, "eyebrow");
  const resolvedTitle = getSavedTextValue(draft, "title");
  const resolvedDescription = getSavedTextValue(draft, "description");
  const resolvedCtaLabel = getSavedTextValue(draft, "ctaLabel");
  const resolvedAccentColor = getSavedTextValue(draft, "accentColor");
  const resolvedBackgroundImageUrl = getSavedTextValue(draft, "backgroundImageUrl");
  const orderPlaceholder = formatOrderDisplay(track?.order ?? index + 1);

  const handleChange = (patch) => {
    if (onChange) onChange(patch);
  };

  const handleFieldChange = (field) => (event) => {
    handleChange({ [field]: event.target.value });
  };

  const handleNumberChange = (field) => (event) => {
    handleChange({ [field]: normalizeOrderInput(event.target.value) });
  };

  return (
    <div className="overflow-hidden rounded-[32px] border-2 border-zinc-900 bg-white shadow-[6px_6px_0px_#000]">
      <div className="relative overflow-hidden" style={buildTrackBackgroundStyle({ ...track, accentColor: resolvedAccentColor, backgroundImageUrl: resolvedBackgroundImageUrl })}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,16,0.06),rgba(12,12,16,0.72))]" />
        <div className="absolute inset-y-0 -right-10 w-24 skew-x-[-8deg] bg-white/18 opacity-45 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[#F6F4EE]/12 mix-blend-screen" />

        <div className="relative z-10 flex min-h-[420px] flex-col justify-between p-5 md:min-h-[480px] md:p-6 lg:min-h-[520px] lg:p-8">
          <div className="flex items-start justify-between gap-3">
            <label className={`inline-flex items-center gap-2 rounded-full border border-white/18 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/92 ${pillInlineFieldClass}`}>
              <span className="sr-only">트랙 순서</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={resolvedOrder ? formatOrderDisplay(resolvedOrder) : ""}
                onChange={handleNumberChange("order")}
                className="w-10 bg-transparent text-center text-[10px] font-black uppercase tracking-[0.22em] text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="트랙 순서"
                placeholder={orderPlaceholder}
              />
              <span className="opacity-60">/</span>
              <span className="sr-only">짧은 라벨</span>
              <input
                value={resolvedShortLabel}
                onChange={handleFieldChange("shortLabel")}
                className="min-w-[5rem] bg-transparent text-[10px] font-black uppercase tracking-[0.22em] text-white outline-none placeholder:text-white/45"
                aria-label="짧은 라벨"
                placeholder={getTrackShortLabel(track)}
              />
            </label>

            <div className="flex flex-col items-end gap-3">
              {onOpenAdvanced ? (
                <button
                  type="button"
                  onClick={onOpenAdvanced}
                  className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/80 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors hover:bg-white/16"
                >
                  상세 설정
                </button>
              ) : null}

              <div className="flex flex-col items-end gap-2">
                <label className="flex flex-col items-end gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                    메인 카드 상태
                  </span>
                  <select
                    value={visibilityState}
                    onChange={(event) => onChangeVisibility?.(event.target.value)}
                    aria-label="메인 카드 상태"
                    className={`rounded-full border-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[2px_2px_0px_#000] outline-none transition-colors ${visibilityMeta.selectClass}`}
                  >
                    <option value={JOIN_TRACK_DISPLAY_STATES.ACTIVE}>ACTIVE</option>
                    <option value={JOIN_TRACK_DISPLAY_STATES.DISABLED}>DISABLED</option>
                    <option value={JOIN_TRACK_DISPLAY_STATES.HIDDEN}>HIDE</option>
                  </select>
                </label>
                <p className="max-w-[13rem] whitespace-pre-line text-right text-[9px] font-bold leading-relaxed tracking-[0.08em] text-white/72">
                  {`${visibilityMeta.label}: ${visibilityMeta.hint}`}
                </p>

                <label
                  className={`inline-flex items-center gap-2 rounded-full border border-white/18 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/92 ${pillInlineFieldClass}`}
                >
                  <span className="sr-only">카드 우측 상단 배지 문구</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                    배지 문구
                  </span>
                  <input
                    value={resolvedStatusLabel}
                    onChange={handleFieldChange("statusLabel")}
                    className="w-24 bg-transparent text-center text-[10px] font-black uppercase tracking-[0.18em] text-white outline-none placeholder:text-white/45"
                    aria-label="카드 우측 상단 배지 문구"
                    placeholder={getTrackStatusLabel(track)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="max-w-[36rem]">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/14 bg-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-md">
                <Icon size={22} className="text-white" />
              </div>

              <label className="block min-w-0 flex-1">
                <span className="sr-only">중간 라벨</span>
                <input
                  value={resolvedEyebrow}
                  onChange={handleFieldChange("eyebrow")}
                  className={`${sharedInlineFieldClass} text-[10px] font-black uppercase tracking-[0.24em]`}
                  aria-label="중간 라벨"
                  placeholder={getTextOrFallback(track?.eyebrow, "UNFRAME")}
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="sr-only">제목</span>
              <textarea
                rows={2}
                value={resolvedTitle}
                onChange={handleFieldChange("title")}
                className={`${sharedInlineFieldClass} resize-none whitespace-pre-line break-keep text-[1.85rem] font-black tracking-tighter leading-[0.94] md:text-[2.4rem] lg:text-[3.1rem]`}
                aria-label="제목"
                placeholder={getTextOrFallback(track?.title, "공간 대관")}
              />
            </label>

            <label className="mt-4 block">
              <span className="sr-only">설명</span>
              <textarea
                rows={4}
                value={resolvedDescription}
                onChange={handleFieldChange("description")}
                className={`${sharedInlineFieldClass} resize-none whitespace-pre-line break-keep text-sm font-medium leading-relaxed md:text-[0.98rem]`}
                aria-label="설명"
                placeholder={getTextOrFallback(
                  track?.description,
                  "전시, 팝업, 쇼룸, 촬영 등 UNFRAME의 공간을 사용하고 싶은 분들을 위한 입구입니다."
                )}
              />
            </label>

            <label className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-950/10 bg-white/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-950 shadow-[0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-transform duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
              <span className="sr-only">CTA 문구</span>
              <input
                value={resolvedCtaLabel}
                onChange={handleFieldChange("ctaLabel")}
                className="min-w-[8rem] bg-transparent text-[10px] font-black uppercase tracking-[0.18em] text-zinc-950 outline-none placeholder:text-zinc-400"
                aria-label="CTA 문구"
                placeholder={getTrackCtaLabel(track)}
              />
              <ArrowRight size={14} className="shrink-0 text-zinc-500" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinTrackInlineCardEditor;
