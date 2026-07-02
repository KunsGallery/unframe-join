import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CircleDot, Clock3, Sparkles, Users } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { appId, db } from "../../lib/firebase";
import { DEFAULT_JOIN_TRACKS, JOIN_TRACK_COLLECTION, mergeJoinTracks } from "../../constants/joinTracks";
import { unframeDesign } from "../../components/ui/unframeDesign";

const hexToRgba = (hex, alpha = 1) => {
  const fallback = `rgba(31, 31, 31, ${alpha})`;
  if (typeof hex !== "string") return fallback;

  const normalized = hex.trim().replace("#", "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) return fallback;

  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SalonLanding = ({ onBack }) => {
  const [joinTrackDocs, setJoinTrackDocs] = useState([]);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", JOIN_TRACK_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setJoinTrackDocs(snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id })));
      },
      (error) => {
        console.error(error);
      }
    );

    return () => unsubscribe();
  }, []);

  const salonTrack = useMemo(() => {
    const mergedTracks = mergeJoinTracks(joinTrackDocs);
    return mergedTracks.find((track) => track.routeTrack === "salon") || DEFAULT_JOIN_TRACKS.find((track) => track.routeTrack === "salon");
  }, [joinTrackDocs]);

  const trackAccent = salonTrack?.accentColor || "#1f1f1f";
  const trackTitle = salonTrack?.title || "프로그램 / 살롱 참여";
  const trackDescription = salonTrack?.description || "모임, 워크숍, 토크, 네트워킹 프로그램 참여";
  const trackShortLabel = salonTrack?.shortLabel || "SALON";
  const trackStatusLabel = salonTrack?.statusLabel || salonTrack?.badgeText || "PREPARING";
  const trackCtaLabel = salonTrack?.ctaLabel || "준비 중";
  const trackOrder = String(salonTrack?.order || 3).padStart(2, "0");
  const heroBackground = salonTrack?.backgroundImageUrl?.trim();

  return (
    <section className={`${unframeDesign.surface} relative overflow-hidden py-4 md:py-8`}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(31,31,31,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(170,208,4,0.12),transparent_24%),linear-gradient(180deg,#f6f4ee_0%,#fbfaf6_48%,#f6f4ee_100%)]" />

      <div className={unframeDesign.shell}>
        <button
          type="button"
          onClick={onBack}
          className={unframeDesign.secondaryButton}
        >
          <ArrowLeft size={14} />
          입구 다시 선택
        </button>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className={`${unframeDesign.majorCard} px-6 py-8 md:px-8 md:py-10`}>
            <div className="flex items-center gap-3 text-[#1f1f1f]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-zinc-900 bg-[#AAD004] shadow-[2px_2px_0px_#000]">
                <Users size={18} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
                SALON
              </span>
            </div>

            <div className={unframeDesign.pill}>
              <CircleDot size={11} />
              {trackShortLabel}
            </div>

            <h1 className="mt-5 max-w-3xl text-[2.7rem] font-black tracking-tighter leading-[0.94] text-zinc-950 break-keep md:text-[3.7rem] lg:text-[4.6rem]">
              살롱은
              <br />
              대화를 꺼내는 입구입니다.
            </h1>

            <p className="mt-5 max-w-2xl whitespace-pre-line text-base font-medium leading-relaxed text-zinc-700 break-keep md:text-lg">
              {trackDescription}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              <span className={unframeDesign.pillBlue}>
                <Sparkles size={11} />
                {trackStatusLabel}
              </span>
              <span className={unframeDesign.pill}>
                {trackOrder} / {trackShortLabel}
              </span>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border-2 border-zinc-900 bg-white p-4 shadow-[3px_3px_0px_#000]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  What it is
                </p>
                <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
                  네트워킹, 토크, 워크숍처럼 사람과 사람이 가까워지는 프로그램이 모이는 입구입니다.
                </p>
              </div>

              <div className="rounded-[24px] border-2 border-zinc-900 bg-white p-4 shadow-[3px_3px_0px_#000]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Status
                </p>
                <p className="mt-2 whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-700 break-keep">
                  {trackCtaLabel}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onBack}
                className={unframeDesign.primaryButton}
              >
                입구 다시 선택
                <ArrowRight size={14} />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
                Salon share URL
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[36px] border-2 border-zinc-900 bg-[#1f1f1f] shadow-[8px_8px_0px_#000]">
            {heroBackground ? (
              <img
                src={heroBackground}
                alt={trackTitle}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${hexToRgba(trackAccent, 0.88)} 0%, ${hexToRgba(trackAccent, 0.6)} 42%, #f6f4ee 100%)`,
                }}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-zinc-950/18 to-white/10" />
            <div className="absolute inset-y-0 right-0 w-16 skew-x-[-8deg] bg-white/20 opacity-40 mix-blend-overlay" />

            <div className="relative z-10 flex min-h-[22rem] flex-col justify-between p-6 text-white md:min-h-[28rem] md:p-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
                <CircleDot size={11} />
                UNFRAME SALON
              </div>

              <div className="max-w-[20rem]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
                  {trackOrder} / {trackShortLabel}
                </p>
                <h2 className="mt-3 text-[2rem] font-black tracking-tighter leading-[0.98] break-keep md:text-[2.8rem]">
                  {trackTitle}
                </h2>
                <p className="mt-4 whitespace-pre-line text-sm font-medium leading-relaxed text-white/86 break-keep md:text-[0.98rem]">
                  {trackDescription}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/88 backdrop-blur-md">
                  <Clock3 size={11} />
                  {trackStatusLabel}
                </div>

                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/88 backdrop-blur-md transition-colors hover:bg-white/18"
                >
                  돌아가기
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className={`${unframeDesign.sectionCard} bg-white p-5`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#004AAD]">
              입구 정보
            </p>
            <p className="mt-3 text-lg font-black tracking-tight text-zinc-950 break-keep">
              살롱 관련 공지는 여기서 한 번에 확인합니다.
            </p>
            <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep">
              트랙 문구는 관리자에서 조정할 수 있고, 이 URL은 그 변경을 그대로 보여줍니다.
            </p>
          </div>

          <div className={`${unframeDesign.sectionCard} bg-white p-5`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#004AAD]">
              Next step
            </p>
            <p className="mt-3 text-lg font-black tracking-tight text-zinc-950 break-keep">
              더 자세한 입구로는 언제든 돌아갈 수 있습니다.
            </p>
            <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep">
              현재는 참여 방식 소개용 단독 페이지이고, 신청은 메인 입구에서 이어집니다.
            </p>
          </div>

          <div className={`${unframeDesign.sectionCard} bg-white p-5`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#004AAD]">
              Share URL
            </p>
            <p className="mt-3 text-lg font-black tracking-tight text-zinc-950 break-keep">
              `/salon`
            </p>
            <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-600 break-keep">
              Netlify 직접 진입 시에도 이 화면이 유지되도록 SPA fallback을 함께 맞춰 두었습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SalonLanding;
