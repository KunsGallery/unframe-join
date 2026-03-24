import React, { useMemo, useState } from "react";
import {
  Activity,
  FileText,
  Users,
  CheckCircle,
  Calendar,
  ChevronUp,
  ChevronDown,
  Paperclip,
  Image as ImageIcon,
  Globe,
  BarChart3,
} from "lucide-react";
import {
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import StatCard from "../components/ui/StatCard";
import CheckCard from "../components/ui/CheckCard";
import AdminLink from "../components/ui/AdminLink";
import DetailItem from "../components/ui/DetailItem";

const AdminDashboard = ({ applications, db, appId }) => {
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const stats = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((a) => a.status === "review").length,
      confirmed: applications.filter((a) => a.status === "confirmed").length,
    }),
    [applications]
  );

  const groupedApps = useMemo(() => {
    const groups = {};
    applications.forEach((app) => {
      if (!groups[app.selectedDate]) groups[app.selectedDate] = [];
      groups[app.selectedDate].push(app);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [applications]);

  const handleAction = async (appDoc, date, status, reason = "") => {
    try {
      if (status === "confirmed") {
        await updateDoc(
          doc(db, "artifacts", appId, "public", "data", "applications", appDoc.id),
          { status: "confirmed" }
        );

        await setDoc(
          doc(db, "artifacts", appId, "public", "data", "reservations", date),
          {
            status: "confirmed",
            confirmedArtist: appDoc.stageName || appDoc.name,
            confirmedTitle: appDoc.exhibitionTitle,
            partnerType: appDoc.partnerType,
          },
          { merge: true }
        );
      } else if (status === "rejected" || status === "delete") {
        if (status === "rejected") {
          await updateDoc(
            doc(db, "artifacts", appId, "public", "data", "applications", appDoc.id),
            { status: "rejected", rejectionReason: reason }
          );
        } else {
          await deleteDoc(
            doc(db, "artifacts", appId, "public", "data", "applications", appDoc.id)
          );
        }

        const resRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "reservations",
          date
        );

        await runTransaction(db, async (t) => {
          const snap = await t.get(resRef);
          if (snap.exists()) {
            const newCount = Math.max(0, (snap.data().applicantCount || 1) - 1);
            t.update(resRef, {
              status: newCount > 0 ? "review" : null,
              confirmedArtist: null,
              confirmedTitle: null,
              partnerType: null,
              applicantCount: newCount,
            });
          }
        });
      }

      setRejectId(null);
      setRejectReason("");
      alert("Updated successfully.");
    } catch (e) {
      alert("Action failed.");
    }
  };

  return (
    <section className="animate-in fade-in py-20 text-zinc-900 min-h-screen relative z-10 text-left px-4">
      <div className="mb-20 space-y-12 text-left">
        <div className="flex items-center gap-4 text-left">
          <div className="p-4 bg-[#004aad] rounded-3xl text-white shadow-xl shadow-[#004aad]/20">
            <Activity size={32} />
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-left">
            Control Center
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <StatCard
            icon={<FileText size={20} />}
            label="Total Proposals"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={<Users size={20} />}
            label="Pending Review"
            value={stats.pending}
            color="orange"
          />
          <CheckCard
            icon={<CheckCircle size={20} />}
            label="Confirmed"
            value={stats.confirmed}
          />
        </div>
      </div>

      <div className="space-y-24 text-left">
        {groupedApps.length > 0 ? (
          groupedApps.map(([date, apps]) => (
            <div key={date}>
              <div className="sticky top-24 z-10 bg-[#fdfbf7]/80 backdrop-blur-sm py-6 border-b border-gray-100 flex items-center justify-between mb-10 text-left">
                <div className="flex items-center gap-4 text-left">
                  <Calendar size={20} className="text-[#004aad]" />
                  <h3 className="text-xl md:text-3xl font-black uppercase text-left">
                    {date}
                  </h3>
                </div>
                <div className="px-5 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm text-center">
                  {apps.length} Applicants
                </div>
              </div>

              <div className="grid gap-12 text-left">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className={`bg-white rounded-[40px] border overflow-hidden transition-all ${
                      app.status === "confirmed"
                        ? "border-green-400 shadow-xl shadow-green-100/10"
                        : "border-gray-50 shadow-2xl shadow-gray-200/50"
                    }`}
                  >
                    <div className="p-8 md:p-12 text-left">
                      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 text-left">
                        <div className="flex-1 space-y-6 text-left">
                          <div
                            className={`mb-4 px-3 py-1 inline-block rounded text-[8px] font-black uppercase text-white ${
                              app.status === "review"
                                ? "bg-[#004aad]"
                                : app.status === "confirmed"
                                ? "bg-green-500"
                                : "bg-red-400"
                            }`}
                          >
                            {app.status}
                          </div>

                          <h4 className="text-2xl md:text-4xl font-black uppercase leading-tight break-words text-left">
                            {app.exhibitionTitle || "Untitled Project"}
                          </h4>

                          <div className="flex items-center gap-6 text-left">
                            <p className="text-sm font-black text-zinc-400 uppercase">
                              {app.partnerType === "brand"
                                ? app.brandName
                                : app.stageName || app.name}
                            </p>
                            <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                            <p className="text-sm font-black text-zinc-400">
                              {app.phone}
                            </p>
                          </div>

                          <div className="flex gap-4 flex-wrap text-left">
                            {app.portfolioUrl && (
                              <AdminLink
                                href={app.portfolioUrl}
                                icon={<Paperclip size={14} />}
                                label="포트폴리오 파일"
                              />
                            )}
                            {app.workListUrl && (
                              <AdminLink
                                href={app.workListUrl}
                                icon={<FileText size={14} />}
                                label="작품리스트 파일"
                              />
                            )}
                            {app.highResPhotosUrl && (
                              <AdminLink
                                href={app.highResPhotosUrl}
                                icon={<ImageIcon size={14} />}
                                label="대표작 고화질 원본"
                              />
                            )}
                          </div>
                        </div>

                        <div className="w-full lg:w-[280px] space-y-3 text-left">
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === app.id ? null : app.id)
                            }
                            className="w-full py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-zinc-100 transition-all text-center"
                          >
                            {expandedId === app.id ? (
                              <>
                                <ChevronUp size={14} /> 상세내용 닫기
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} /> 신청서 상세 보기
                              </>
                            )}
                          </button>

                          {rejectId === app.id ? (
                            <div className="space-y-3 animate-in fade-in zoom-in-95 text-left">
                              <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="사유 입력..."
                                className="w-full bg-zinc-50 p-4 rounded-xl text-xs outline-none h-24 font-bold border border-red-100 text-left transition-all"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleAction(app, date, "rejected", rejectReason)
                                  }
                                  className="flex-1 py-3 bg-red-400 text-white rounded-xl text-[10px] font-black uppercase transition-all text-center"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setRejectId(null)}
                                  className="py-3 px-4 bg-zinc-100 rounded-xl text-[10px] font-black uppercase transition-all text-center"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 text-left">
                              <button
                                disabled={app.status === "confirmed"}
                                onClick={() => handleAction(app, date, "confirmed")}
                                className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-[#004aad] shadow-xl disabled:bg-zinc-100 transition-all text-center"
                              >
                                Approve
                              </button>
                              <button
                                disabled={app.status === "rejected"}
                                onClick={() => setRejectId(app.id)}
                                className="w-full py-5 border border-red-100 text-red-400 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-red-50 transition-all text-center"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleAction(app, date, "delete")}
                                className="text-[9px] font-black uppercase text-zinc-300 hover:text-red-500 py-2 text-center transition-colors"
                              >
                                Permanent Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedId === app.id && (
                      <div className="bg-zinc-50 border-t border-gray-100 p-8 md:p-16 animate-in slide-in-from-top-4 duration-500 text-left">
                        <div className="grid md:grid-cols-2 gap-20 text-left">
                          <div className="space-y-12 text-left">
                            <div>
                              <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">
                                User Profile Information
                              </h5>
                              <div className="grid gap-4 text-left">
                                <DetailItem
                                  label="전체 성함"
                                  value={
                                    app.partnerType === "brand"
                                      ? app.brandName
                                      : `${app.realName} (${app.englishName || "-"})`
                                  }
                                />
                                <DetailItem
                                  label="활동/예명"
                                  value={
                                    app.partnerType === "brand"
                                      ? "-"
                                      : app.stageName || app.realName
                                  }
                                />
                                <DetailItem label="연락처" value={app.phone} />
                                <DetailItem
                                  label="생년/설립일"
                                  value={app.birthDate}
                                />
                                <DetailItem
                                  label="주소"
                                  value={`${app.addressMain} ${app.addressDetail}`}
                                />
                              </div>
                            </div>

                            <div>
                              <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">
                                Proposal Note
                              </h5>
                              <p className="text-sm font-bold text-zinc-700 leading-relaxed whitespace-pre-wrap text-left">
                                "
                                {app.partnerType === "brand"
                                  ? app.projectPurpose
                                  : app.artistNote}
                                "
                              </p>
                            </div>
                          </div>

                          <div className="space-y-12 text-left">
                            <div>
                              <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">
                                Visual & External Assets
                              </h5>
                              <div className="flex flex-col gap-4 text-left">
                                <a
                                  href={
                                    app.snsLink?.startsWith("http")
                                      ? app.snsLink
                                      : `https://${app.snsLink}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 text-[#004aad] text-xs font-black hover:bg-[#004aad] hover:text-white transition-all shadow-sm"
                                >
                                  <Globe size={18} /> 공식 SNS / 웹사이트 링크 바로가기
                                </a>

                                <a
                                  href={app.profilePhotoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 text-[#004aad] text-xs font-black hover:bg-[#004aad] hover:text-white transition-all shadow-sm"
                                >
                                  <ImageIcon size={18} /> 프로필 사진 / 로고 원본 크게보기
                                </a>

                                {app.highResPhotosUrl && (
                                  <a
                                    href={app.highResPhotosUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 text-[#004aad] text-xs font-black hover:bg-[#004aad] hover:text-white transition-all shadow-sm"
                                  >
                                    <ImageIcon size={18} /> 대표작 고화질 이미지 원본 보기
                                  </a>
                                )}
                              </div>
                            </div>

                            {app.experimentText && (
                              <div>
                                <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">
                                  Experimental Trial
                                </h5>
                                <p className="text-sm font-bold text-zinc-600 italic leading-relaxed whitespace-pre-wrap text-left">
                                  "{app.experimentText}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-60 flex flex-col items-center justify-center text-zinc-300 gap-8 animate-pulse text-center">
            <BarChart3 size={80} strokeWidth={1} />
            <p className="font-black uppercase tracking-[0.4em] text-sm">
              Awaiting New Proposals
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminDashboard;