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
import { collection, onSnapshot } from "firebase/firestore";
import { appId, db } from "../../lib/firebase";
import {
  DEFAULT_JOIN_TRACKS,
  JOIN_TRACK_COLLECTION,
  mergeJoinTracks,
} from "../../constants/joinTracks";
import {
  JOIN_POPUP_COLLECTION,
  JOIN_POPUP_DISMISS_PREFIX,
  getPopupVisibilityStatus,
  isPopupDismissed,
  sortJoinPopups,
} from "../../constants/joinPopups";

const TRACK_ICON_MAP = {
  rental: Building2,
  "open-call": Megaphone,
  salon: Users,
  collaboration: MessageSquare,
};

const TRACK_ALERT_MESSAGE = "준비 중입니다.";

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

const getCtaLabel = (routeTrack) => {
  if (routeTrack === "rental") return "신청 시작하기";
  if (routeTrack === "open-call") return "공개모집 보기";
  return "준비 중";
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
    ctaClass: "border-zinc-950/10 bg-white/85 text-zinc-950",
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

const TrackSlice = ({ track, hoveredTrackId, count, onHover, onClick }) => {
  const Icon = TRACK_ICON_MAP[track.routeTrack] || Sparkles;
  const isHovered = hoveredTrackId === track.id;
  const hasHover = Boolean(hoveredTrackId);
  const isDimmed = hasHover && !isHovered;
  const tone = getTrackTone(track);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className="group relative min-w-0 overflow-hidden text-left transition-[flex-basis,flex-grow,transform,opacity] duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        flexBasis: getPanelBasis(track, hoveredTrackId, count),
        flexGrow: isHovered ? 2 : 1,
        flexShrink: 1,
        zIndex: isHovered ? 20 : 10,
        opacity: isDimmed ? 0.72 : 1,
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
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

      <div className="relative z-30 flex h-full min-h-[620px] flex-col justify-between p-6 text-white md:p-8 lg:p-10">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/16 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/92 backdrop-blur-md">
            <CircleDot size={11} />
            {String(track.order || 0).padStart(2, "0")} / {getEntryLabel(track.routeTrack)}
          </div>

          <div
            className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-md ${tone.badgeClass}`}
          >
            {track.badgeText || "OPEN"}
          </div>
        </div>

        <div className="max-w-[34rem]">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/14 bg-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-md">
              <Icon size={22} className={tone.accentClass} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${tone.metaClass}`}>
                {track.eyebrow || "UNFRAME JOIN"}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500/90">
                {track.routeTrack}
              </p>
            </div>
          </div>

          <h2
            className={`mt-5 text-[1.85rem] font-black tracking-tighter break-keep transition-all duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:text-[2.4rem] lg:text-[3.1rem] ${tone.titleClass} ${
              hasHover && !isHovered ? "opacity-55" : "opacity-100"
            }`}
          >
            {track.title}
          </h2>

          <p
            className={`mt-4 max-w-[30rem] text-sm font-medium leading-relaxed break-keep md:text-[0.98rem] ${tone.descriptionClass} ${
              isHovered ? "opacity-100" : "opacity-92"
            }`}
          >
            {track.description}
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-950/10 bg-white/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-950 shadow-[0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-transform duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5">
            <span>{getCtaLabel(track.routeTrack)}</span>
            <ArrowRight size={14} />
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="max-w-[18rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500/90">
              {isHovered ? "ENTER" : "SELECT ENTRY POINT"}
            </p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-700/85 break-keep">
              {isHovered
                ? "Hover active track for entry actions and extended copy."
                : "Hover to expand the panel and reveal the full route."}
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isHovered ? tone.ctaClass : "border-zinc-950/10 bg-white/80 text-zinc-950"
            }`}
          >
            <span>{getCtaLabel(track.routeTrack)}</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </button>
  );
};

const AuxiliaryTrackItem = ({ track, onClick }) => {
  const Icon = TRACK_ICON_MAP[track.routeTrack] || Sparkles;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between gap-4 rounded-[24px] border border-zinc-950/10 bg-white/85 px-4 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[#004AAD]/20 hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-950/10 bg-[#F6F4EE] text-zinc-950">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            {track.eyebrow || "UNFRAME"}
          </p>
          <p className="mt-1 text-sm font-black tracking-tight text-zinc-950 break-keep">
            {track.title}
          </p>
        </div>
      </div>

      <ArrowRight size={16} className="shrink-0 text-zinc-300 transition-colors group-hover:text-[#004AAD]" />
    </button>
  );
};

const JoinPopupModal = ({ popup, onClose, onCta }) => {
  if (!popup) return null;

  const poster = popup.posterImageUrl?.trim();
  const ctaLabel = popup.ctaLabel?.trim() || "신청하러 가기";
  const dismissLabel = popup.dismissLabel?.trim() || "닫기";

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
            <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
              <Sparkles size={11} />
              UNFRAME NOTICE
            </div>
          </div>

          <div className="flex flex-col justify-between p-6 text-zinc-950 md:p-8 lg:p-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#004AAD]">
                UNFRAME NOTICE
              </p>
              <h2 className="mt-4 text-[2rem] font-black tracking-tighter text-zinc-950 break-keep md:text-[2.6rem]">
                {popup.title || "공지"}
              </h2>
              <p className="mt-4 text-base font-bold leading-relaxed text-zinc-700 break-keep md:text-lg">
                {popup.subtitle || ""}
              </p>
              <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-zinc-600 break-keep md:text-[0.98rem]">
                {popup.body || ""}
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6 px-3 py-1.5 text-[#004AAD]">
                  <CircleDot size={11} />
                  {popup.targetTrack || "open-call"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/12 px-3 py-1.5 text-[#6f8f00]">
                  {popup.priority != null ? `priority ${popup.priority}` : "priority 999"}
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onCta}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg transition-opacity hover:opacity-90"
              >
                {ctaLabel}
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-950/10 bg-white px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700 transition-colors hover:border-[#004AAD]/20 hover:text-[#004AAD]"
              >
                {dismissLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const JoinHome = ({ onSelectRental, onSelectOpenCall }) => {
  const [joinTrackDocs, setJoinTrackDocs] = useState([]);
  const [joinPopupDocs, setJoinPopupDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popupLoading, setPopupLoading] = useState(true);
  const [hoveredTrackId, setHoveredTrackId] = useState(null);
  const [popupBlockedForVisit, setPopupBlockedForVisit] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

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
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const currentTime = useMemo(() => new Date(nowTick), [nowTick]);
  const mergedTracks = useMemo(() => mergeJoinTracks(joinTrackDocs), [joinTrackDocs]);
  const visibleTracks = useMemo(
    () => mergedTracks.filter((track) => track.enabled !== false),
    [mergedTracks]
  );
  const primaryTracks = visibleTracks.slice(0, 4);
  const auxiliaryTracks = visibleTracks.slice(4);
  const popupStatuses = useMemo(
    () =>
      sortJoinPopups(joinPopupDocs).map((popup) => {
        const status = getPopupVisibilityStatus(popup, currentTime);
        const dismissed = isPopupDismissed(popup.id);

        return {
          ...popup,
          status,
          dismissed,
          finalVisible: status.canShow && !dismissed,
        };
      }),
    [currentTime, joinPopupDocs]
  );
  const eligiblePopups = useMemo(
    () => popupStatuses.filter((popup) => popup.status.canShow),
    [popupStatuses]
  );
  const activePopup = useMemo(() => {
    if (popupBlockedForVisit) return null;

    return eligiblePopups.find((popup) => !popup.dismissed) || null;
  }, [eligiblePopups, popupBlockedForVisit]);

  // Debug-only logs for popup visibility investigation.
  useEffect(() => {
    console.log("JOIN_POPUPS_RAW", joinPopupDocs);
    console.log("JOIN_POPUPS_STATUS", popupStatuses);
    console.log("JOIN_ACTIVE_POPUP", activePopup);
  }, [activePopup, joinPopupDocs, popupStatuses]);

  const handleTrackSelect = (routeTrack) => {
    if (routeTrack === "rental") {
      onSelectRental?.();
      return;
    }

    if (routeTrack === "open-call") {
      onSelectOpenCall?.();
      return;
    }

    window.alert(TRACK_ALERT_MESSAGE);
  };

  const dismissPopup = (popup) => {
    if (!popup?.id) return;

    try {
      window.localStorage.setItem(`${JOIN_POPUP_DISMISS_PREFIX}${popup.id}`, "true");
    } catch (error) {
      console.error(error);
    }

    setPopupBlockedForVisit(true);
  };

  const popupToShow = popupLoading ? null : activePopup;
  const handlePopupClose = () => dismissPopup(popupToShow);
  const handlePopupCta = () => {
    if (!popupToShow) return;
    dismissPopup(popupToShow);
    handleTrackSelect(popupToShow.targetTrack);
  };

  useEffect(() => {
    if (!popupToShow) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        dismissPopup(popupToShow);
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

  const handleTrackClick = (track) => {
    handleTrackSelect(track.routeTrack);
  };

  return (
    <section className="min-h-[calc(100vh-7rem)] bg-[#F6F4EE] text-zinc-950">
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-[1600px] flex-col px-4 py-4 md:px-6 md:py-6">
        <header className="grid gap-5 border-b border-zinc-950/10 pb-5 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-zinc-950/10 bg-white/80 px-4 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.05)]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#004AAD] text-white">
                <Sparkles size={15} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.34em] text-zinc-500">
                UNFRAME JOIN
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl text-[2.8rem] font-black tracking-tighter leading-[0.9] break-keep text-zinc-950 md:text-6xl lg:text-[5.2rem]">
              하나의 방식으로만
              <br />
              연결되지 않습니다.
            </h1>
          </div>

          <div className="max-w-xl justify-self-start md:justify-self-end">
            <p className="text-sm font-medium leading-relaxed text-zinc-700 break-keep md:text-base">
              공간을 제안할 수도, 전시에 지원할 수도, 프로그램에 참여할 수도 있습니다.
              각 트랙은 열리는 방식이 다르고, 그 입구를 선택하는 순간부터 여정이 시작됩니다.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-950/10 bg-white/85 px-3 py-1.5">
                <CircleDot size={11} />
                Select your entry point
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/12 px-3 py-1.5 text-[#6f8f00]">
                Live Tracks
              </span>
            </div>
          </div>
        </header>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
            Select your entry point — UNFRAME JOIN SYSTEM
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
            {loading ? "SYNCING" : `${visibleTracks.length} TRACKS ACTIVE`}
          </p>
        </div>

        <div className="mt-4 flex-1">
          {primaryTracks.length > 0 ? (
            <>
              <div
                className="hidden overflow-hidden rounded-[36px] border border-zinc-950/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.12)] md:flex"
                style={{ minHeight: "clamp(32rem, 72vh, 52rem)" }}
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
                {primaryTracks.map((track, index) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleTrackClick(track)}
                    className="group relative min-h-[18rem] overflow-hidden rounded-[30px] border border-zinc-950/10 bg-white text-left shadow-[0_18px_50px_rgba(0,0,0,0.1)]"
                  >
                    <div
                      className="absolute inset-0"
                      style={buildTrackBackgroundStyle(track, true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/30 via-zinc-950/5 to-white/15" />
                    <div className="absolute inset-y-0 -right-8 w-16 skew-x-[-8deg] bg-white/18 opacity-50 mix-blend-overlay" />

                    <div className="relative z-30 flex min-h-[18rem] flex-col justify-between p-5 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-full border border-white/12 bg-white/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] backdrop-blur-md">
                          {String(index + 1).padStart(2, "0")} / {getEntryLabel(track.routeTrack)}
                        </div>
                        <div className="rounded-full border border-white/12 bg-white/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-md">
                          {track.badgeText || "OPEN"}
                        </div>
                      </div>

                      <div className="max-w-[18rem]">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/72">
                          {track.eyebrow || "UNFRAME JOIN"}
                        </p>
                        <h2 className="mt-3 text-[1.55rem] font-black tracking-tighter text-white break-keep">
                          {track.title}
                        </h2>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-white/82 break-keep">
                          {track.description}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-950">
                          {getCtaLabel(track.routeTrack)}
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[26rem] items-center justify-center rounded-[34px] border border-dashed border-zinc-950/10 bg-white/80 px-6 text-center">
              <div>
                <p className="text-lg font-black text-zinc-950">노출 중인 트랙이 없습니다</p>
                <p className="mt-2 text-sm font-medium text-zinc-700 break-keep">
                  관리자에서 joinTracks를 활성화하면 이 허브가 열립니다.
                </p>
              </div>
            </div>
          )}

          {auxiliaryTracks.length > 0 ? (
            <div className="mt-5 rounded-[30px] border border-zinc-950/10 bg-white/80 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.06)] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                  Auxiliary entry points
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                  more than four tracks
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {auxiliaryTracks.map((track) => (
                  <AuxiliaryTrackItem
                    key={track.id}
                    track={track}
                    onClick={() => handleTrackClick(track)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="mt-4 flex flex-col gap-2 border-t border-zinc-950/10 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
            Select your entry point — UNFRAME JOIN SYSTEM
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
            BASE STRUCTURE {DEFAULT_JOIN_TRACKS.length} TRACKS
          </p>
        </footer>
      </div>

      <JoinPopupModal
        popup={popupToShow}
        onClose={handlePopupClose}
        onCta={handlePopupCta}
      />
    </section>
  );
};

export default JoinHome;
