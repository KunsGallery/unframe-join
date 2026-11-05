import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Sparkles, Users, Clock3, Wallet, QrCode, ChevronDown, ChevronUp } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { appId, db } from "../../lib/firebase";
import { formatSalonDateTime, getSalonAvailability, getSalonDisplayStatus, normalizeSalonEvent, SALON_EVENT_COLLECTION, toDate } from "../../constants/salon";
import { unframeDesign } from "../../components/ui/unframeDesign";
import { callSalonFunction } from "../../lib/salonApi";

const getListingState = (event, now) => {
  const state = getSalonDisplayStatus(event, now).state;
  return state === "hidden" ? "closed" : state;
};

const SalonCard = ({ event, state, onOpen, application, onViewApplication, onViewPass }) => {
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const active = state === "open";
  const label = { open: "신청 가능", upcoming: "접수 예정", closed: "접수 마감", ended: "종료된 살롱" }[state];
  const approved = application?.status === "approved";
  const applicationLabel = { approved: "참가 확정 · 내 QR", waitlisted: "대기 신청 · 내역 확인", rejected: "신청 결과 확인" }[application?.status] || "신청 내역 · 입금 안내";
  const buttonLabel = application ? applicationLabel : active ? "자세히 보기" : label;
  const start = toDate(event.eventStartAt);
  const end = toDate(event.eventEndAt);
  const duration = start && end ? Math.round((end - start) / 60_000) : 0;
  const durationLabel = duration > 0 ? [Math.floor(duration / 60) ? `${Math.floor(duration / 60)}시간` : "", duration % 60 ? `${duration % 60}분` : ""].filter(Boolean).join(" ") : "";
  const amount = String(event.paymentSettings?.amount ?? "").trim().replace(/[,\s원]/g, "");
  const fee = amount && /^\d+(\.\d+)?$/.test(amount) ? Number(amount).toLocaleString("ko-KR") + "원" : "";
  const deadline = toDate(event.applicationEndAt);
  const openPass = async () => {
    if (passLoading) return;
    setPassLoading(true);
    setPassError("");
    try {
      const result = await callSalonFunction("get-my-salon-pass", { applicationId: application.id });
      onViewPass(result.token);
    } catch (error) { setPassError(error.message); }
    finally { setPassLoading(false); }
  };
  return (
    <article className={`min-w-0 overflow-hidden rounded-[32px] border-2 bg-white ${active ? "border-zinc-900 shadow-[5px_5px_0px_#000]" : "border-zinc-200"}`}>
      {event.posterImageUrl ? <div className="aspect-video w-full bg-[#f6f4ee]"><img src={event.posterImageUrl} alt={event.title} loading="lazy" className="h-full w-full object-contain" /></div> : <div className={`flex aspect-video w-full items-center justify-center ${active ? "bg-[#004aad] text-white" : "bg-zinc-100 text-zinc-500"}`}><Users size={54} /></div>}
      <div className="p-6">
        <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-black ${active ? "bg-[#AAD004] text-zinc-950" : "bg-zinc-100 text-zinc-600"}`}>{label}</span>{active && event.isFeatured && <span className="rounded-full bg-[#004aad] px-3 py-1 text-[10px] font-black text-white">FEATURED</span>}</div>
        <h3 className="mt-4 text-2xl font-black break-keep">{event.title || "제목 없는 SALON"}</h3>
        {event.subtitle && <p className="mt-2 font-bold text-zinc-500 break-keep">{event.subtitle}</p>}
        <div className="mt-5 space-y-2 text-sm font-bold text-zinc-700"><p className="flex gap-2"><CalendarDays size={17} className="shrink-0" />{formatSalonDateTime(event.eventStartAt)}</p><p className="flex gap-2"><MapPin size={17} className="shrink-0" />{event.venueName || "장소 미정"}</p></div>
        {(fee || durationLabel) && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-zinc-700">{fee && <p className="flex items-center gap-2"><Wallet size={16} />참가비 {fee}</p>}{durationLabel && <p className="flex items-center gap-2"><Clock3 size={16} />{durationLabel}</p>}</div>}
        {deadline && active && <p className="mt-4 text-sm font-bold text-[#004aad]">{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }).format(deadline)}까지 신청</p>}
        <button type="button" disabled={passLoading} onClick={() => application ? approved ? openPass() : ["waitlisted", "rejected"].includes(application.status) ? onViewApplication(application) : onOpen(event.slug || event.id) : onOpen(event.slug || event.id)} aria-label={`${event.title || "SALON"} · ${buttonLabel}`} className={`${active ? unframeDesign.primaryButton : "inline-flex min-h-12 items-center gap-2 rounded-full border border-zinc-300 bg-zinc-50 px-6 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-100"} mt-6 w-full justify-center disabled:opacity-60`}>{approved && <QrCode size={16} />}{passLoading ? "QR 확인 중…" : buttonLabel} <ArrowRight size={14} /></button>
        {application && <button type="button" onClick={() => onOpen(event.slug || event.id)} className="mt-3 min-h-11 w-full text-sm font-semibold text-zinc-600 underline underline-offset-4">살롱 상세 보기</button>}
        {passError && <div className="mt-3 text-sm text-red-700" role="alert"><p>{passError}</p><button type="button" onClick={() => onViewApplication(application)} className="mt-2 min-h-11 font-bold underline">신청 내역 확인</button></div>}
      </div>
    </article>
  );
};

const SalonLanding = ({ onBack, onOpen, user, applications = [], onViewApplication, onViewPass }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [showAllPast, setShowAllPast] = useState(false);
  const findApplication = (event) => user && !user.isAnonymous ? applications.find(application => application.userId === user.uid && application.trackType === "salon" && application.salonId === event.id && application.status !== "cancelled") : null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", SALON_EVENT_COLLECTION);
    return onSnapshot(ref, (snapshot) => {
      setEvents(snapshot.docs.map((item) => normalizeSalonEvent({ id: item.id, ...item.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const visibleEvents = useMemo(() => events
    .filter((event) => event.isVisible !== false && !["draft", "archived"].includes(event.status))
    .sort((a, b) =>
      Number(getSalonAvailability(b, now).available) - Number(getSalonAvailability(a, now).available)
      || Number(b.isFeatured) - Number(a.isFeatured)
    ), [events, now]);
  const openEvents = visibleEvents.filter(event => getListingState(event, now) === "open");
  const upcomingEvents = visibleEvents.filter(event => getListingState(event, now) === "upcoming");
  const closedEvents = visibleEvents.filter(event => ["closed", "ended"].includes(getListingState(event, now)))
    .sort((a, b) => (toDate(b.eventStartAt)?.getTime() || 0) - (toDate(a.eventStartAt)?.getTime() || 0));

  return (
    <section className={`${unframeDesign.surface} py-4 md:py-8`}>
      <div className={unframeDesign.shell}>
        <button type="button" onClick={onBack} className={unframeDesign.secondaryButton}>
          <ArrowLeft size={14} /> 입구 다시 선택
        </button>
        <header className="mt-6 border-b border-zinc-200 pb-6"><h1 className="text-3xl font-black md:text-4xl">UNFRAME SALON</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">대화, 취향, 새로운 연결. 함께할 모임을 선택해 주세요.</p></header>

        <div className="mt-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-black">모집 중 SALON</h2>
          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black">{openEvents.length}개</span>
        </div>

        {loading ? <p className="mt-8 font-bold text-zinc-500">SALON을 불러오는 중입니다.</p> : openEvents.length === 0 ? (
          <div className="mt-8 rounded-[28px] border-2 border-dashed border-zinc-300 bg-white p-10 text-center">
            <Sparkles className="mx-auto text-zinc-400" /><p className="mt-4 text-lg font-black">현재 모집 중인 SALON이 없습니다.</p><p className="mt-2 text-sm font-medium text-zinc-500">새로운 프로그램이 열리면 이곳에서 알려드릴게요.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {openEvents.map(event => <SalonCard key={event.id} event={event} state="open" onOpen={onOpen} application={findApplication(event)} onViewApplication={onViewApplication} onViewPass={onViewPass} />)}
          </div>
        )}
        {!loading && upcomingEvents.length > 0 && <section className="mt-12 border-t border-zinc-200 pt-8"><h2 className="text-2xl font-black">접수 예정 SALON</h2><div className="mt-6 grid gap-6 md:grid-cols-2">{upcomingEvents.map(event => <SalonCard key={event.id} event={event} state="upcoming" onOpen={onOpen} />)}</div></section>}
        {!loading && closedEvents.length > 0 && <section className="mt-12 border-t border-zinc-300 pt-8"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-zinc-600">접수 마감 · 지난 살롱</h2><span className="shrink-0 text-sm font-bold text-zinc-500">{closedEvents.length}개</span></div><div className="mt-5 divide-y divide-zinc-200">{(showAllPast ? closedEvents : closedEvents.slice(0, 4)).map(event => <button key={event.id} type="button" onClick={() => onOpen(event.slug || event.id)} className="flex min-h-24 w-full items-center gap-4 py-4 text-left hover:bg-zinc-50">{event.posterImageUrl && <img src={event.posterImageUrl} alt="" loading="lazy" className="aspect-video w-24 shrink-0 object-contain sm:w-40" />}<span className="min-w-0 flex-1"><span className="text-xs font-semibold text-zinc-500">{getListingState(event, now) === "ended" ? "종료된 살롱" : "접수 마감"}</span><strong className="mt-1 block break-words text-sm text-zinc-800 sm:text-base">{event.title}</strong><span className="mt-1 block text-xs text-zinc-500">{formatSalonDateTime(event.eventStartAt)}</span></span><ArrowRight size={16} className="mr-2 shrink-0 text-zinc-500" /></button>)}</div>{closedEvents.length > 4 && <button type="button" aria-expanded={showAllPast} onClick={() => setShowAllPast(value => !value)} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-zinc-600">{showAllPast ? "지난 살롱 접기" : `지난 살롱 더 보기 (${closedEvents.length - 4}개)`}{showAllPast ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>}</section>}
      </div>
    </section>
  );
};

export default SalonLanding;
