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

  const normalized = hex.trim();
  const match = normalized.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
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

const isDarkHex = (hex) => {
  if (typeof hex !== "string") return false;
  const normalized = hex.trim().replace("#", "");

  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) {
    return false;
  }

  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);

  return (r * 299 + g * 587 + b * 114) / 1000 < 150;
};

const getTrackTone = (track) => {
  const dark = isDarkHex(track?.accentColor) || !!track?.backgroundImageUrl;
  return {
    isDark: dark,
    titleClass: dark ? "text-white" : "text-zinc-900",
    descriptionClass: dark ? "text-white/80" : "text-zinc-600",
    badgeClass: dark
      ? "border-white/20 bg-white/10 text-white"
      : "border-white/80 bg-white/85 text-zinc-700",
    metaClass: dark ? "text-white/70" : "text-zinc-500",
    ctaClass: dark
      ? "border-white/18 bg-white/10 text-white"
      : "border-white/70 bg-white/80 text-zinc-900",
  };
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

const getPanelClipPath = (index, count) => {
  const normalizedCount = Math.max(1, Math.min(4, count));
  const clipPaths = {
    1: ["polygon(0 0, 100% 0, 100% 100%, 0 100%)"],
    2: [
      "polygon(0 0, 58% 0, 46% 100%, 0 100%)",
      "polygon(42% 0, 100% 0, 100% 100%, 54% 100%)",
    ],
    3: [
      "polygon(0 0, 40% 0, 29% 100%, 0 100%)",
      "polygon(24% 0, 69% 0, 58% 100%, 13% 100%)",
      "polygon(55% 0, 100% 0, 100% 100%, 42% 100%)",
    ],
    4: [
      "polygon(0 0, 31% 0, 19% 100%, 0 100%)",
      "polygon(25% 0, 56% 0, 44% 100%, 13% 100%)",
      "polygon(50% 0, 81% 0, 69% 100%, 38% 100%)",
      "polygon(75% 0, 100% 0, 100% 100%, 63% 100%)",
    ],
  };

  return clipPaths[normalizedCount][index] || clipPaths[normalizedCount][clipPaths[normalizedCount].length - 1];
};

const buildTrackBackgroundStyle = (track, isHovered) => {
  const accentColor = track?.accentColor || "#004AAD";
  const accentAlpha = isHovered ? 0.45 : 0.22;
  const darkenAlpha = isHovered ? 0.36 : 0.58;

  if (track?.backgroundImageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(4, 4, 6, 0.02), rgba(4, 4, 6, ${darkenAlpha})), url(${track.backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: accentColor,
      filter: isHovered ? "grayscale(0) brightness(1.05)" : "grayscale(1) brightness(0.55) contrast(1.08)",
    };
  }

  return {
    backgroundImage: `linear-gradient(140deg, ${hexToRgba(accentColor, accentAlpha)} 0%, ${hexToRgba(
      accentColor,
      isHovered ? 0.22 : 0.1
    )} 42%, rgba(10, 10, 13, ${darkenAlpha}) 100%)`,
    backgroundColor: hexToRgba(accentColor, 0.08),
    filter: isHovered ? "grayscale(0) brightness(1.03)" : "grayscale(1) brightness(0.62) contrast(1.06)",
  };
};

const TrackSlice = ({
  track,
  index,
  count,
  hoveredTrackId,
  onHover,
  onClick,
}) => {
  const Icon = TRACK_ICON_MAP[track.routeTrack] || Sparkles;
  const tone = getTrackTone(track);
  const isHovered = hoveredTrackId === track.id;
  const hasHover = Boolean(hoveredTrackId);
  const isInactive = hasHover && !isHovered;
  const clipPath = getPanelClipPath(index, count);
  const entryIndex = String(index + 1).padStart(2, "0");

  const flexGrow = !hasHover ? 1 : isHovered ? 3.05 : 0.88;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className="group relative min-w-0 overflow-hidden text-left transition-[flex-grow,transform,opacity,filter] duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        flexGrow,
        flexBasis: 0,
        clipPath,
        marginLeft: index === 0 ? 0 : "-3.5%",
        zIndex: isHovered ? 30 : isInactive ? 8 : 12 - index,
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        opacity: isInactive ? 0.72 : 1,
      }}
    >
      <div
        className="absolute inset-0 transition-all duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={buildTrackBackgroundStyle(track, isHovered)}
      />

      <div
        className={`absolute inset-0 ${
          isHovered
            ? "bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.34)_32%,rgba(0,0,0,0.72)_100%)]"
            : "bg-[linear-gradient(180deg,rgba(0,0,0,0.16)_0%,rgba(0,0,0,0.42)_48%,rgba(0,0,0,0.78)_100%)]"
        }`}
      />

      <div className="absolute inset-0 border border-white/10" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.08)_50%,transparent_68%)] opacity-40" />

      <div className="relative flex h-full min-h-[28rem] flex-col justify-between p-5 md:p-6 lg:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/85 backdrop-blur">
            <CircleDot size={11} />
            {entryIndex} / {getEntryLabel(track.routeTrack)}
          </div>

          <div
            className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur ${
              tone.badgeClass
            }`}
          >
            {track.badgeText || "OPEN"}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="flex items-center gap-3">
            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.18)] backdrop-blur ${
                isHovered ? "text-white" : "text-white/88"
              }`}
            >
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${tone.metaClass}`}>
                {track.eyebrow || "UNFRAME JOIN"}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/58">
                {track.routeTrack}
              </p>
            </div>
          </div>

          <div className="max-w-[30rem]">
            <h2
              className={`text-[1.7rem] font-black tracking-tighter break-keep transition-all duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:text-[2.1rem] lg:text-[2.7rem] ${
                tone.titleClass
              } ${hasHover && !isHovered ? "opacity-55" : "opacity-100"}`}
            >
              {track.title}
            </h2>

            <div
              className={`mt-4 overflow-hidden transition-all duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isHovered ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <p
                className={`max-w-xl text-sm font-medium leading-relaxed break-keep md:text-[0.98rem] ${
                  tone.descriptionClass
                }`}
              >
                {track.description}
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/92 backdrop-blur">
                <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5">
                  {getCtaLabel(track.routeTrack)}
                </span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`flex items-end justify-between gap-3 transition-all duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isHovered ? "opacity-100 translate-y-0" : "opacity-90 translate-y-0"
          }`}
        >
          <div className="max-w-[18rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/48">
              {isHovered ? "ENTER" : "SELECT ENTRY POINT"}
            </p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-white/64 break-keep">
              {isHovered
                ? track.description
                : "Hover to expand the track and reveal the full entry point."}
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isHovered ? tone.ctaClass : "border-white/14 bg-white/8 text-white/72"
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
      className="group flex items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.08]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/85">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">
            {track.eyebrow || "UNFRAME"}
          </p>
          <p className="mt-1 text-sm font-black tracking-tight text-white break-keep">
            {track.title}
          </p>
        </div>
      </div>

      <ArrowRight size={16} className="shrink-0 text-white/24 transition-colors group-hover:text-white/80" />
    </button>
  );
};

const JoinHome = ({ onSelectRental, onSelectOpenCall }) => {
  const [joinTrackDocs, setJoinTrackDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTrackId, setHoveredTrackId] = useState(null);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setJoinTrackDocs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [appId, db]);

  const mergedTracks = useMemo(() => mergeJoinTracks(joinTrackDocs), [joinTrackDocs]);
  const visibleTracks = useMemo(
    () => mergedTracks.filter((track) => track.enabled !== false),
    [mergedTracks]
  );
  const primaryTracks = visibleTracks.slice(0, 4);
  const auxiliaryTracks = visibleTracks.slice(4);
  const hasHover = Boolean(hoveredTrackId);

  const handleTrackClick = (track) => {
    if (track.routeTrack === "rental") {
      onSelectRental?.();
      return;
    }

    if (track.routeTrack === "open-call") {
      onSelectOpenCall?.();
      return;
    }

    window.alert(TRACK_ALERT_MESSAGE);
  };

  return (
    <section className="relative isolate min-h-[calc(100vh-7rem)] overflow-hidden bg-zinc-950 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(170,208,4,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(0,74,173,0.18),transparent_26%),linear-gradient(180deg,#09090b_0%,#111114_48%,#09090b_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(170,208,4,0.05),rgba(0,74,173,0.05))] blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-[1680px] flex-col px-4 py-4 md:px-6 md:py-6">
        <header className="grid gap-4 border-b border-white/10 pb-4 md:grid-cols-[1.1fr_0.9fr] md:items-end md:pb-5">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white">
                <Sparkles size={15} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.34em] text-white/72">
                UNFRAME JOIN
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl text-[2.8rem] font-black tracking-tighter leading-[0.9] break-keep md:text-6xl lg:text-[5.4rem]">
              하나의 방식으로만
              <br />
              연결되지 않습니다.
            </h1>
          </div>

          <div className="max-w-xl justify-self-start md:justify-self-end">
            <p className="text-sm font-medium leading-relaxed text-white/68 break-keep md:text-base">
              공간을 제안할 수도, 전시에 지원할 수도, 프로그램에 참여할 수도 있습니다.
              각 트랙은 열리는 방식이 다르고, 그 입구를 선택하는 순간부터 여정이 시작됩니다.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/52">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <CircleDot size={11} />
                Select your entry point
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#AAD004]/20 bg-[#AAD004]/10 px-3 py-1.5 text-[#d7f05a]">
                Live Tracks
              </span>
            </div>
          </div>
        </header>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/42">
            Select your entry point — UNFRAME JOIN SYSTEM
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">
            {loading ? "SYNCING" : `${visibleTracks.length} TRACKS ACTIVE`}
          </p>
        </div>

        <div className="mt-4 flex-1">
          {primaryTracks.length > 0 ? (
            <>
              <div
                className="hidden h-[clamp(30rem,72vh,52rem)] overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.03] shadow-[0_28px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl md:flex"
                onMouseLeave={() => setHoveredTrackId(null)}
              >
                {primaryTracks.map((track, index) => (
                  <TrackSlice
                    key={track.id}
                    track={track}
                    index={index}
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
                    className="group relative min-h-[16rem] overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] text-left shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
                  >
                    <div
                      className="absolute inset-0"
                      style={buildTrackBackgroundStyle(track, true)}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.38)_46%,rgba(0,0,0,0.72)_100%)]" />
                    <div className="relative flex min-h-[16rem] flex-col justify-between p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/84 backdrop-blur">
                          {String(index + 1).padStart(2, "0")} / {getEntryLabel(track.routeTrack)}
                        </div>
                        <div className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/82 backdrop-blur">
                          {track.badgeText || "OPEN"}
                        </div>
                      </div>

                      <div className="max-w-[18rem]">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/58">
                          {track.eyebrow || "UNFRAME JOIN"}
                        </p>
                        <h2 className="mt-3 text-[1.55rem] font-black tracking-tighter text-white break-keep">
                          {track.title}
                        </h2>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-white/78 break-keep">
                          {track.description}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">
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
            <div className="flex h-full min-h-[26rem] items-center justify-center rounded-[34px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
              <div>
                <p className="text-lg font-black text-white">노출 중인 트랙이 없습니다</p>
                <p className="mt-2 text-sm font-medium text-white/58 break-keep">
                  관리자에서 joinTracks를 활성화하면 이 허브가 열립니다.
                </p>
              </div>
            </div>
          )}

          {auxiliaryTracks.length > 0 ? (
            <div className="mt-5 rounded-[30px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm md:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/48">
                  Auxiliary entry points
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/36">
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

        <footer className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/44">
            Select your entry point — UNFRAME JOIN SYSTEM
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/28">
            BASE STRUCTURE {DEFAULT_JOIN_TRACKS.length} TRACKS
          </p>
        </footer>
      </div>
    </section>
  );
};

export default JoinHome;
