import React from "react";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { formatSalonDateTime, getSalonAvailability } from "../../constants/salon";
import { unframeDesign } from "../../components/ui/unframeDesign";
import { useSalonEvent } from "./useSalonEvent";

const SalonDetail = ({ slug, onBack, onApply }) => {
  const { loading, event, error } = useSalonEvent(slug);
  if (loading) return <div className="py-24 text-center font-black">SALON을 불러오는 중입니다.</div>;
  if (!event) return <div className="py-24 text-center"><p className="text-xl font-black">{error}</p><button onClick={onBack} className={`${unframeDesign.secondaryButton} mt-5`}>목록으로</button></div>;
  const availability = getSalonAvailability(event);
  return <section className="py-4 md:py-8"><button type="button" onClick={onBack} className={unframeDesign.secondaryButton}><ArrowLeft size={14} /> SALON 목록</button>
    <article className="mt-6 overflow-hidden rounded-[36px] border-2 border-zinc-900 bg-white shadow-[8px_8px_0px_#000]">
      {event.posterImageUrl && <img src={event.posterImageUrl} alt={event.title} className="max-h-[34rem] w-full object-cover" />}
      <div className="grid gap-8 p-7 md:p-10 lg:grid-cols-[1fr_0.45fr]">
        <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">UNFRAME SALON</p><h1 className="mt-4 text-4xl font-black tracking-tighter md:text-6xl break-keep">{event.title}</h1>{event.subtitle && <p className="mt-4 text-xl font-black text-zinc-500 break-keep">{event.subtitle}</p>}<p className="mt-7 whitespace-pre-line text-base font-medium leading-8 text-zinc-700 break-keep">{event.description}</p></div>
        <aside className="rounded-[28px] border-2 border-zinc-900 bg-[#f6f4ee] p-6"><div className="space-y-5 text-sm font-bold"><p className="flex gap-3"><CalendarDays />{formatSalonDateTime(event.eventStartAt)}</p><p className="flex gap-3"><MapPin />{event.venueName || "장소 미정"}<br />{event.venueAddress}</p><p className="flex gap-3"><Users />{event.capacity ? `${event.capacity}명` : "정원 제한 없음"}</p></div><button type="button" disabled={!availability.available} onClick={onApply} className={`${unframeDesign.primaryButton} mt-7 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40`}>{event.applicationButtonText || "참가 신청"}<ArrowRight size={14} /></button>{!availability.available && <p className="mt-3 text-center text-xs font-bold text-red-600">{availability.reason}</p>}</aside>
      </div>
    </article>
  </section>;
};
export default SalonDetail;
