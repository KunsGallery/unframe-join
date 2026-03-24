import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { PROGRAMS } from "../constants/programs";

const ProgramSelectStep = ({ onSelect, onBack }) => {
  const [index, setIndex] = useState(0);
  const current = useMemo(() => PROGRAMS[index], [index]);

  const prev = () =>
    setIndex((prevIndex) =>
      prevIndex === 0 ? PROGRAMS.length - 1 : prevIndex - 1
    );

  const next = () =>
    setIndex((prevIndex) =>
      prevIndex === PROGRAMS.length - 1 ? 0 : prevIndex + 1
    );

  return (
    <section className="animate-in fade-in slide-in-from-bottom-10 duration-700 py-32 max-w-6xl mx-auto min-h-screen px-4">
      <div className="mb-16 text-center">
        <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 text-zinc-900 leading-tight">
          Select Program
        </h2>
        <p className="text-zinc-400 text-lg font-light uppercase tracking-widest">
          프로그램을 넘겨보며 확인하고 선택해 주세요
        </p>
      </div>

      <div className="relative">
        <div className="bg-white border border-zinc-100 rounded-[56px] shadow-2xl p-8 md:p-14 overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-8">
            <button
              onClick={prev}
              className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center hover:bg-zinc-100 transition-all"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#004aad]/10 text-[#004aad] text-[10px] font-black uppercase tracking-widest">
                {current.badge}
              </span>
            </div>

            <button
              onClick={next}
              className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center hover:bg-zinc-100 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-stretch">
            <div className="bg-zinc-900 rounded-[44px] p-8 md:p-12 text-white flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 mb-4">
                  Program
                </p>
                <h3 className="text-4xl md:text-6xl font-black tracking-tighter leading-none mb-6">
                  {current.name}
                </h3>

                <div className="flex items-end gap-3 mb-8">
                  <span className="text-5xl md:text-7xl font-black tracking-tighter">
                    {current.price}
                  </span>
                  <span className="text-lg md:text-xl text-zinc-400 font-bold mb-2">
                    만원
                  </span>
                </div>

                <p className="text-zinc-300 text-base md:text-lg leading-relaxed break-keep">
                  {current.description}
                </p>
              </div>
            </div>

            <div className="rounded-[44px] bg-[#f8f8f6] border border-zinc-100 p-8 md:p-12 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-300 mb-8">
                  Included
                </p>

                <div className="space-y-4">
                  {current.details.map((item) => (
                    <div
                      key={item}
                      className="bg-white border border-zinc-100 rounded-2xl px-5 py-4 text-sm md:text-base font-bold text-zinc-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onSelect(current)}
                className="mt-10 w-full bg-[#004aad] text-white py-6 rounded-full font-black uppercase tracking-[0.3em] text-sm md:text-base flex items-center justify-center gap-3 hover:scale-[1.02] transition-all"
              >
                이 프로그램으로 신청하기 <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 mt-8">
          {PROGRAMS.map((program, dotIndex) => (
            <button
              key={program.id}
              onClick={() => setIndex(dotIndex)}
              className={`h-2.5 rounded-full transition-all ${
                dotIndex === index
                  ? "w-10 bg-[#004aad]"
                  : "w-2.5 bg-zinc-300 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onBack}
        className="mt-16 block mx-auto text-zinc-400 font-black uppercase tracking-widest text-xs hover:text-zinc-900 transition-colors"
      >
        ← Back
      </button>
    </section>
  );
};

export default ProgramSelectStep;