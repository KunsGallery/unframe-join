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

  const value = match[1].length === 3
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
    descriptionClass: dark ? "text-white/75" : "text-zinc-600",
    eyebrowClass: dark ? "text-white/70" : "text-zinc-500",
    badgeClass: dark
      ? "border-white/20 bg-white/10 text-white"
      : "border-white/80 bg-white/85 text-zinc-700",
    arrowClass: dark ? "text-white/80 group-hover:text-white" : "text-zinc-300 group-hover:text-[#004AAD]",
  };
};

const buildTrackBackgroundStyle = (track) => {
  const accentColor = track?.accentColor || "#004AAD";

  if (track?.backgroundImageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(12, 12, 16, 0.08), rgba(12, 12, 16, 0.72)), url(${track.backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: accentColor,
    };
  }

  return {
    backgroundImage: `linear-gradient(135deg, ${hexToRgba(accentColor, 0.25)} 0%, ${hexToRgba(
      accentColor,
      0.12
    )} 55%, rgba(246, 244, 238, 0.98) 100%)`,
    backgroundColor: hexToRgba(accentColor, 0.08),
  };
};

const desktopClipPaths = [
  "polygon(0 0, 100% 0, 86% 100%, 0 100%)",
  "polygon(14% 0, 100% 0, 100% 100%, 0 100%)",
  "polygon(0 0, 100% 0, 100% 100%, 14% 100%)",
  "polygon(0 0, 86% 0, 100% 100%, 0 100%)",
];

const mobileCardShadow =
  "0 18px 42px rgba(15, 23, 42, 0.08), 0 2px 0 rgba(255, 255, 255, 0.35) inset";

const TrackButton = ({
  track,
  index,
  hoveredTrackId,
  onHover,
  onLeave,
  onClick,
  variant = "desktop",
}) => {
  const Icon = TRACK_ICON_MAP[track.routeTrack] || Sparkles;
  const tone = getTrackTone(track);
  const isHovered = hoveredTrackId === track.id;
  const isDimmed = hoveredTrackId && !isHovered;
  const clipPath = desktopClipPaths[index % desktopClipPaths.length];

  const baseClasses =
    variant === "desktop"
      ? "absolute overflow-hidden text-left transition-all duration-500 ease-out"
      : "relative min-h-[18rem] w-full overflow-hidden rounded-[28px] border border-white/70 text-left transition-all duration-300";

  const layoutStyle =
    variant === "desktop"
      ? {
          top: `${Math.floor(index / 2) * 50}%`,
          left: `${(index % 2) * 50}%`,
          width: "50%",
          height: "50%",
          clipPath,
          transform: isHovered ? "scale(1.035)" : isDimmed ? "scale(0.985)" : "scale(1)",
          zIndex: isHovered ? 20 : 1,
          boxShadow: isHovered
            ? "0 30px 70px rgba(0, 0, 0, 0.18)"
            : "0 12px 32px rgba(0, 0, 0, 0.08)",
        }
      : {
          boxShadow: mobileCardShadow,
          backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02)), ${buildTrackBackgroundStyle(track).backgroundImage}`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        };

  const content = (
    <>
      <div
        className={`absolute inset-0 ${variant === "desktop" ? "" : ""}`}
        style={{
          ...buildTrackBackgroundStyle(track),
          opacity: isDimmed ? 0.74 : 1,
          transform: isHovered ? "scale(1.02)" : "scale(1)",
          transition: "transform 500ms ease, opacity 300ms ease",
        }}
      />

      <div
        className={`absolute inset-0 ${
          tone.isDark
            ? "bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.22)_42%,rgba(0,0,0,0.74)_100%)]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(246,244,238,0.24)_48%,rgba(246,244,238,0.78)_100%)]"
        }`}
      />

      <div
        className={`relative flex h-full flex-col justify-between p-5 md:p-6 ${
          variant === "desktop" ? "lg:p-7" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur ${
              tone.badgeClass
            }`}
          >
            <CircleDot size={12} />
            {track.badgeText || "OPEN"}
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] backdrop-blur ${
              tone.isDark
                ? "border-white/15 bg-white/10 text-white/80"
                : "border-white/80 bg-white/75 text-zinc-500"
            }`}
          >
            {track.eyebrow || "UNFRAME"}
          </div>
        </div>

        <div className="max-w-[22rem]">
          <div
            className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
              tone.isDark ? "bg-white/10 text-white" : "bg-white text-[#004AAD]"
            } shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}
          >
            <Icon size={22} />
          </div>

          <h2
            className={`text-[1.65rem] font-black tracking-tighter break-keep md:text-[1.9rem] ${
              tone.titleClass
            }`}
          >
            {track.title}
          </h2>

          <p
            className={`mt-3 max-w-md text-sm font-medium leading-relaxed break-keep md:text-[0.95rem] ${
              tone.descriptionClass
            }`}
          >
            {track.description}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${
              tone.isDark
                ? "border-white/15 bg-white/10 text-white/90"
                : "border-white/75 bg-white/80 text-zinc-500"
            }`}
          >
            <Sparkles size={12} />
            {track.routeTrack === "rental"
              ? "대관 신청"
              : track.routeTrack === "open-call"
              ? "오픈콜 지원"
              : "준비 중"}
          </span>

          <span className={tone.isDark ? "text-white/80" : "text-zinc-300"}>
            <ArrowRight size={20} className={tone.arrowClass} />
          </span>
        </div>
      </div>
    </>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`${baseClasses} group`}
      style={layoutStyle}
    >
      {content}
    </button>
  );
};

const JoinHome = ({ onSelectRental, onSelectOpenCall }) => {
  const [joinTrackDocs, setJoinTrackDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTrackId, setHoveredTrackId] = useState("");

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
  const overflowTracks = visibleTracks.slice(4);

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
    <section className="relative overflow-hidden py-6 md:py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,74,173,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(170,208,4,0.16),transparent_24%),linear-gradient(180deg,#f6f4ee_0%,#fbfaf6_48%,#f6f4ee_100%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-44 bg-[linear-gradient(90deg,rgba(0,74,173,0.08),rgba(170,208,4,0.1),rgba(0,0,0,0.02))] blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="rounded-[36px] border border-white/70 bg-white/65 px-5 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl md:px-8 md:py-10">
          <div className="flex items-center gap-3 text-[#004AAD]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#004AAD]/15 bg-[#004AAD]/6">
              <Sparkles size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">
              UNFRAME JOIN
            </span>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <h1 className="max-w-3xl text-[2.85rem] font-black tracking-tighter text-zinc-900 leading-[0.92] break-keep md:text-7xl">
                하나의 방식으로만
                <br />
                연결되지 않습니다.
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-zinc-600 break-keep md:text-lg">
                공간을 제안할 수도,
                <br className="md:hidden" />
                전시에 지원할 수도,
                <br className="md:hidden" />
                프로그램에 참여할 수도 있습니다.
              </p>

              <p className="mt-4 max-w-xl text-sm font-bold leading-relaxed text-zinc-500 break-keep md:text-base">
                당신의 방식에 맞는 입구를 선택해 주세요.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[24px] border border-[#004AAD]/12 bg-[#004AAD]/5 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#004AAD]">
                  Live Tracks
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
                  {visibleTracks.length}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-500 break-keep">
                  현재 노출 중인 트랙
                </p>
              </div>

              <div className="rounded-[24px] border border-zinc-100 bg-white/80 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  Source
                </p>
                <p className="mt-2 text-base font-black text-zinc-900">Firestore + fallback</p>
                <p className="mt-1 text-sm font-medium text-zinc-500 break-keep">
                  관리자가 트랙 노출을 제어할 수 있습니다.
                </p>
              </div>

              <div className="rounded-[24px] border border-[#AAD004]/15 bg-[#AAD004]/10 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6e8d00]">
                  Status
                </p>
                <p className="mt-2 text-base font-black text-zinc-900">입구 선택 허브</p>
                <p className="mt-1 text-sm font-medium text-zinc-500 break-keep">
                  rental / open-call / salon / collaboration
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 shadow-sm backdrop-blur-sm">
            <Sparkles size={12} />
            트랙을 불러오는 중입니다
          </div>
        ) : null}

        {visibleTracks.length > 0 ? (
          <>
            <div className="mt-6 hidden min-h-[34rem] overflow-hidden rounded-[40px] border border-white/70 bg-white/50 shadow-[0_24px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl md:block">
              <div className="relative h-[34rem]">
                {primaryTracks.map((track, index) => (
                  <TrackButton
                    key={track.id}
                    track={track}
                    index={index}
                    hoveredTrackId={hoveredTrackId}
                    onHover={() => setHoveredTrackId(track.id)}
                    onLeave={() => setHoveredTrackId("")}
                    onClick={() => handleTrackClick(track)}
                    variant="desktop"
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:hidden">
              {primaryTracks.map((track, index) => (
                <TrackButton
                  key={track.id}
                  track={track}
                  index={index}
                  hoveredTrackId={hoveredTrackId}
                  onHover={() => setHoveredTrackId(track.id)}
                  onLeave={() => setHoveredTrackId("")}
                  onClick={() => handleTrackClick(track)}
                  variant="mobile"
                />
              ))}
            </div>

            {overflowTracks.length > 0 ? (
              <div className="mt-6 rounded-[32px] border border-zinc-200 bg-white/75 p-5 shadow-sm backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  <Sparkles size={12} />
                  추가 트랙
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {overflowTracks.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleTrackClick(track)}
                      className="flex items-center justify-between gap-4 rounded-[22px] border border-zinc-100 bg-white px-4 py-4 text-left shadow-sm transition-colors hover:border-[#004AAD]/20 hover:text-[#004AAD]"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                          {track.eyebrow || "UNFRAME"}
                        </p>
                        <p className="mt-2 text-sm font-black text-zinc-900 break-keep">
                          {track.title}
                        </p>
                      </div>
                      <ArrowRight size={16} className="shrink-0 text-zinc-300" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-6 rounded-[32px] border border-dashed border-zinc-200 bg-white/70 px-6 py-12 text-center shadow-sm backdrop-blur-sm">
            <p className="text-lg font-black text-zinc-900">노출 중인 트랙이 없습니다</p>
            <p className="mt-2 text-sm font-medium text-zinc-500 break-keep">
              관리자에서 joinTracks를 활성화하면 여기에 입구가 표시됩니다.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-center md:mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#AAD004]" />
            {DEFAULT_JOIN_TRACKS.length}개의 기본 트랙 구조를 기반으로 확장합니다
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinHome;
