import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { auth } from "../../../lib/firebase";

const INPUT = "min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700";

// Destroys an ended open call's applicant data (files, applications, admin notes). Typing the title confirms it.
const PurgeApplicationsDialog = ({ call, applications, onDone, onClose }) => {
  const selectedCount = applications.filter((app) => app.openCallReviewStatus === "selected").length;
  const [scope, setScope] = useState(selectedCount > 0 ? "unselected" : "all");
  const [confirmTitle, setConfirmTitle] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const title = String(call.title || "").trim();
  const count = scope === "all" ? applications.length : applications.length - selectedCount;
  const matches = confirmTitle.trim() === title;

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !working) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, working]);

  const submit = async (event) => {
    event.preventDefault();
    if (!matches || count === 0) return;
    setWorking(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/.netlify/functions/purge-open-call-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ openCallId: call.id, scope, confirmTitle }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "파기하지 못했습니다.");
      onDone(result);
    } catch (purgeError) {
      setError(purgeError.message);
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && !working && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="purge-title" onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl break-keep">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="purge-title" className="text-lg font-bold text-zinc-950">지원 자료 파기</h2>
          <button type="button" aria-label="닫기" disabled={working} onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"><X size={18} /></button>
        </div>

        <p className="text-sm leading-relaxed text-zinc-800">
          개인정보 동의서에 적힌 대로, 접수가 끝난 공고의 지원 자료를 지웁니다. 업로드한 포트폴리오와 작품 이미지, 지원서, 관리자 메모가 함께 지워지며 <strong className="font-semibold text-red-800">되돌릴 수 없습니다.</strong> 필요하면 먼저 CSV를 내려받아 두세요.
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-zinc-900">파기 범위</legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-800">
              <input type="radio" name="purge-scope" className="mt-0.5 accent-red-700" checked={scope === "unselected"} onChange={() => setScope("unselected")} />
              <span>선정되지 않은 지원자만 <span className="text-zinc-600">({applications.length - selectedCount}명 · 선정 {selectedCount}명은 전시 준비를 위해 남김)</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-800">
              <input type="radio" name="purge-scope" className="mt-0.5 accent-red-700" checked={scope === "all"} onChange={() => setScope("all")} />
              <span>모든 지원자 <span className="text-zinc-600">({applications.length}명)</span></span>
            </label>
          </div>
        </fieldset>

        <label className="mt-5 block">
          <span className="block text-sm font-semibold text-zinc-900">확인을 위해 공고명을 그대로 입력해 주세요</span>
          <span className="mt-1 block text-sm text-zinc-600">{title}</span>
          <input className={`${INPUT} mt-1.5`} value={confirmTitle} onChange={(event) => setConfirmTitle(event.target.value)} autoComplete="off" />
        </label>

        {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={working} onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50">취소</button>
          <button type="submit" disabled={!matches || count === 0 || working} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-40">
            {working ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {working ? "파기하는 중" : `${count}명 자료 파기`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurgeApplicationsDialog;
