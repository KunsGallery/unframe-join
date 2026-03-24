import React from "react";
import { User, AlertCircle, Layers } from "lucide-react";
import { addDays } from "../utils/date";

const MyPage = ({ applications, handleReturn }) => (
  <section className="animate-in fade-in py-20 min-h-screen relative z-10 text-left px-4">
    <div className="flex justify-between items-end mb-20 text-left">
      <div className="flex items-center gap-4 text-zinc-900 text-left">
        <div className="p-4 bg-zinc-900 rounded-3xl text-white shadow-xl shadow-black/10">
          <User size={32} />
        </div>
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-left">
          My Dashboard
        </h2>
      </div>

      <button
        onClick={handleReturn}
        className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-[#004aad] transition-colors font-bold transition-all transition-colors"
      >
        ← Back to Main
      </button>
    </div>

    <div className="grid gap-12 text-left">
      {applications.length > 0 ? (
        applications.map((app) => (
          <div
            key={app.id}
            className="bg-white p-10 md:p-16 rounded-[60px] border border-gray-100 shadow-2xl"
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-10 text-left">
              <div className="flex-1 space-y-6 text-left">
                <div className="flex items-center gap-3 text-left">
                  <span
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white ${
                      app.status === "confirmed"
                        ? "bg-green-500"
                        : app.status === "rejected"
                        ? "bg-red-400"
                        : "bg-[#004aad]"
                    }`}
                  >
                    {app.status}
                  </span>

                  <span className="text-xs font-black text-zinc-300 uppercase tracking-widest text-left">
                    {app.selectedDate} ~ {addDays(app.selectedDate, 6)}
                  </span>
                </div>

                <h3 className="text-3xl md:text-5xl font-black uppercase text-zinc-900 leading-tight break-words text-left">
                  {app.exhibitionTitle}
                </h3>

                {app.status === "rejected" && app.rejectionReason && (
                  <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 space-y-3 animate-in slide-in-from-top-4 text-left">
                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2 text-left">
                      <AlertCircle size={14} /> 심사 결과 피드백
                    </h4>
                    <p className="text-sm font-bold text-zinc-600 leading-relaxed italic text-left">
                      "{app.rejectionReason}"
                    </p>
                  </div>
                )}
              </div>

              <div className="text-right space-y-2 opacity-50">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">
                  Submitted At
                </p>
                <p className="text-sm font-bold text-zinc-900 text-right">
                  {app.submittedAt?.toDate().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="py-60 flex flex-col items-center justify-center text-zinc-300 gap-8 animate-pulse text-center">
          <div className="p-10 bg-white rounded-full shadow-2xl border border-zinc-100 shadow-sm">
            <Layers size={80} strokeWidth={1} />
          </div>
          <p className="font-black uppercase tracking-[0.4em] text-sm text-center">
            No application history found
          </p>
        </div>
      )}
    </div>
  </section>
);

export default MyPage;