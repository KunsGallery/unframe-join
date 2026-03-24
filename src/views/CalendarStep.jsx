import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ParkingCircle,
  Calendar,
  Edit3,
} from "lucide-react";
import NoticeItem from "../components/ui/NoticeItem";
import { addDays, isDateInRange } from "../utils/date";

const BLOCKING_STATUSES = ["confirmed", "planned", "preparing"];

const getActiveWritingCount = (reservation) => {
  if (!reservation) return 0;

  const now = Date.now();
  const writingUsers = reservation.writingUsers || {};

  const activeCount = Object.values(writingUsers).filter(
    (expiresAt) => Number(expiresAt) > now
  ).length;

  if (activeCount > 0) return activeCount;
  return reservation.writingCount || 0;
};

const CalendarStep = ({
  reservations = {},
  onSelect,
  onConfirm,
  selectedDate,
  onBack,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(
    () =>
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate(),
    [currentDate]
  );

  const firstDayOfMonth = useMemo(
    () =>
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(),
    [currentDate]
  );

  const blockedRanges = useMemo(() => {
    return Object.entries(reservations)
      .filter(([_, data]) => BLOCKING_STATUSES.includes(data.status))
      .map(([dateStr, data]) => ({
        start: dateStr,
        end: data.endDate || addDays(dateStr, 6),
        type: data.partnerType || "artist",
        title: data.confirmedTitle || data.blockTitle || "예약된 일정",
        artist: data.confirmedArtist || data.blockOwner || "비공개",
        status: data.status,
        selectedProgram: data.selectedProgram || null,
      }));
  }, [reservations]);

  const getBlockedInfo = (dateStr) =>
    blockedRanges.find((range) => isDateInRange(dateStr, range.start, range.end));

  const isSelected = (dateStr) =>
    selectedDate && isDateInRange(dateStr, selectedDate, addDays(selectedDate, 6));

  const getBlockedStyle = (blocked) => {
    if (blocked.status === "planned") {
      return "bg-amber-100 text-amber-700 border-amber-200 cursor-help";
    }
    if (blocked.status === "preparing") {
      return "bg-zinc-200 text-zinc-700 border-zinc-300 cursor-help";
    }
    return blocked.type === "brand"
      ? "bg-[#ff7700]/10 text-[#ff7700] border-[#ff7700]/20 cursor-help"
      : "bg-[#004aad]/10 text-[#004aad] border-[#004aad]/20 cursor-help";
  };

  const getStatusLabel = (status) => {
    if (status === "planned") return "기획";
    if (status === "preparing") return "준비중";
    return "확정";
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto py-20 min-h-screen text-center px-4">
      <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-10 leading-none text-zinc-900 text-center">
        Schedule
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16 px-4">
        <NoticeItem icon={<Calendar size={14} />} text="전시는 최대 7일간 진행됩니다." />
        <NoticeItem icon={<Clock size={14} />} text="수요일 오후 3시 설치 시작" />
        <NoticeItem icon={<Clock size={14} />} text="수요일 오후 12시 철수 완료" />
        <NoticeItem icon={<ParkingCircle size={14} />} text="철수/오프닝 VIP 1시간 주차" />
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[50px] shadow-2xl border border-gray-100 max-w-2xl mx-auto mb-12">
        <div className="flex justify-between items-center mb-10 px-4 text-zinc-900">
          <h3 className="text-xl md:text-2xl font-black uppercase text-left">
            {currentDate.getFullYear()}.{" "}
            {(currentDate.getMonth() + 1).toString().padStart(2, "0")}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
                )
              }
              className="p-2 bg-zinc-50 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
                )
              }
              className="p-2 bg-zinc-50 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-zinc-300 font-black uppercase text-[10px] mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <div key={d} className={i === 0 ? "text-red-400" : ""}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
              .toString()
              .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

            const dateObj = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              day
            );

            const isThu = dateObj.getDay() === 4;
            const isSun = dateObj.getDay() === 0;
            const blocked = getBlockedInfo(dateStr);
            const active = isSelected(dateStr);
            const resData = reservations[dateStr];
            const activeWritingCount = getActiveWritingCount(resData);

            let style = "border-zinc-50 text-zinc-800 font-bold";

            if (blocked) {
              style = getBlockedStyle(blocked);
            } else if (active) {
              style =
                "bg-[#004aad] text-white border-transparent scale-105 z-10 shadow-lg ring-4 ring-[#004aad]/10";
            } else if (!isThu) {
              style = "text-zinc-200 cursor-default opacity-40 border-transparent";
            } else {
              style =
                "border-zinc-100 hover:border-[#004aad] hover:scale-105 shadow-sm";
            }

            return (
              <div key={day} className="relative group aspect-square">
                <button
                  disabled={!isThu || !!blocked}
                  onClick={() => onSelect(dateStr)}
                  className={`w-full h-full rounded-xl flex flex-col items-center justify-center transition-all border text-sm md:text-base relative ${style}`}
                >
                  <span className={isSun && !active ? "text-red-500" : ""}>
                    {day}
                  </span>

                  {isThu && !blocked && !active && resData?.applicantCount > 0 && (
                    <span className="absolute bottom-1 px-1.5 bg-[#004aad] text-white text-[7px] rounded-md font-black shadow-sm">
                      심사중 {resData.applicantCount}
                    </span>
                  )}

                  {isThu && !blocked && !active && activeWritingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[7px] px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-0.5 whitespace-nowrap z-20 font-black shadow-sm">
                      <Edit3 size={7} /> 작성중 {activeWritingCount}
                    </span>
                  )}
                </button>

                {blocked && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-left">
                    <p className="text-[8px] font-black uppercase text-[#004aad] mb-1 text-left">
                      {getStatusLabel(blocked.status)}
                    </p>
                    <h4 className="text-xs font-black leading-tight mb-2 break-keep text-left">
                      {blocked.title}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-medium text-left">
                      Owner: {blocked.artist}
                    </p>
                    {blocked.selectedProgram && (
                      <p className="text-[10px] text-zinc-500 font-medium text-left mt-1">
                        Program: {blocked.selectedProgram.name} · {blocked.selectedProgram.price}만원
                      </p>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="animate-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto">
          <div className="mb-10 inline-flex items-center gap-4 bg-zinc-900 text-white px-8 py-4 rounded-3xl shadow-xl">
            <span className="font-black uppercase tracking-widest text-xs">
              {selectedDate} ~ {addDays(selectedDate, 6)}
            </span>
            <div className="w-1 h-1 bg-zinc-500 rounded-full" />
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-tighter text-center">
              7 Days Selection
            </span>
          </div>

          <button
            onClick={onConfirm}
            className="w-full bg-[#004aad] text-white py-8 rounded-full font-black uppercase tracking-[0.4em] text-xl flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl shadow-[#004aad]/20 active:scale-95 text-center"
          >
            이 기간 신청하기
          </button>
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-20 block mx-auto text-zinc-400 font-black uppercase tracking-widest text-xs hover:text-[#004aad] transition-all text-center"
      >
        ← Back
      </button>
    </section>
  );
};

export default CalendarStep;