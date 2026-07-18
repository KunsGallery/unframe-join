import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Sparkles, Users } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { appId, db } from "../../lib/firebase";
import { formatSalonDateTime, getSalonAvailability, normalizeSalonEvent, SALON_EVENT_COLLECTION } from "../../constants/salon";
import { unframeDesign } from "../../components/ui/unframeDesign";

const SalonLanding = ({ onBack, onOpen }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", SALON_EVENT_COLLECTION);
    return onSnapshot(ref, (snapshot) => {
      setEvents(snapshot.docs.map((item) => normalizeSalonEvent({ id: item.id, ...item.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const visibleEvents = useMemo(() => events
    .filter((event) => event.isVisible !== false && !["draft", "archived"].includes(event.status))
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)), [events]);

  return (
    <section className={`${unframeDesign.surface} py-4 md:py-8`}>
      <div className={unframeDesign.shell}>
        <button type="button" onClick={onBack} className={unframeDesign.secondaryButton}>
          <ArrowLeft size={14} /> 입구 다시 선택
        </button>
        <div className="mt-6 rounded-[36px] border-2 border-zinc-900 bg-[#AAD004] p-7 shadow-[8px_8px_0px_#000] md:p-12">
          <p className="text-[10px] font-black uppercase tracking-[0.35em]">UNFRAME SALON</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.98] tracking-tighter md:text-7xl">대화가 시작되는<br />오늘의 살롱.</h1>
          <p className="mt-6 max-w-2xl text-base font-bold leading-relaxed text-zinc-800 break-keep">모집 중인 토크, 워크숍, 네트워킹 프로그램을 확인하고 참가를 신청하세요.</p>
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#004aad]">Now open</p><h2 className="mt-2 text-3xl font-black">모집 중 SALON</h2></div>
          <span className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black">{visibleEvents.length} events</span>
        </div>

        {loading ? <p className="mt-8 font-bold text-zinc-500">SALON을 불러오는 중입니다.</p> : visibleEvents.length === 0 ? (
          <div className="mt-8 rounded-[28px] border-2 border-dashed border-zinc-300 bg-white p-10 text-center">
            <Sparkles className="mx-auto text-zinc-400" /><p className="mt-4 text-lg font-black">현재 공개된 SALON이 없습니다.</p><p className="mt-2 text-sm font-medium text-zinc-500">새로운 프로그램이 열리면 이곳에서 알려드릴게요.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {visibleEvents.map((event) => {
              const availability = getSalonAvailability(event);
              return <article key={event.id} className="overflow-hidden rounded-[32px] border-2 border-zinc-900 bg-white shadow-[5px_5px_0px_#000]">
                {event.posterImageUrl ? <img src={event.posterImageUrl} alt={event.title} className="h-56 w-full object-cover" /> : <div className="flex h-44 items-center justify-center bg-[#004aad] text-white"><Users size={54} /></div>}
                <div className="p-6">
                  <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-black ${availability.available ? "bg-[#AAD004]" : "bg-zinc-200"}`}>{availability.available ? "신청 가능" : "접수 마감"}</span>{event.isFeatured && <span className="rounded-full bg-[#004aad] px-3 py-1 text-[10px] font-black text-white">FEATURED</span>}</div>
                  <h3 className="mt-4 text-2xl font-black tracking-tight break-keep">{event.title || "제목 없는 SALON"}</h3>
                  {event.subtitle && <p className="mt-2 font-bold text-zinc-500 break-keep">{event.subtitle}</p>}
                  <div className="mt-5 space-y-2 text-sm font-bold text-zinc-700"><p className="flex gap-2"><CalendarDays size={17} />{formatSalonDateTime(event.eventStartAt)}</p><p className="flex gap-2"><MapPin size={17} />{event.venueName || "장소 미정"}</p></div>
                  <button type="button" onClick={() => onOpen(event.slug || event.id)} className={`${unframeDesign.primaryButton} mt-6 w-full justify-center`}>자세히 보기 <ArrowRight size={14} /></button>
                </div>
              </article>;
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default SalonLanding;
