import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const INPUT = "min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]";

const OpenCallCreateDialog = ({ calls, initialSourceId = "", onCreate, onClose }) => {
  const [title, setTitle] = useState("");
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [copying, setCopying] = useState(Boolean(initialSourceId) );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("공고명을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onCreate({ title: trimmed, sourceId: copying ? sourceId || calls[0]?.id : "" });
    } catch (createError) {
      setError(createError.message || "공고를 만들지 못했습니다.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="open-call-create-title" onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="open-call-create-title" className="text-lg font-bold text-zinc-950">새 오픈콜 만들기</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"><X size={18} /></button>
        </div>

        <label className="block">
          <span className="block text-sm font-semibold text-zinc-900">공고명</span>
          <input autoFocus className={`${INPUT} mt-1.5`} placeholder="예: 2027 UNFRAME OPEN CALL 02" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-zinc-900">시작 방법</legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-800">
              <input type="radio" name="open-call-start" className="accent-[#004aad]" checked={!copying} onChange={() => setCopying(false)} />
              빈 공고로 시작
            </label>
            <label className={`flex items-center gap-2.5 text-sm ${calls.length === 0 ? "text-zinc-400" : "cursor-pointer text-zinc-800"}`}>
              <input type="radio" name="open-call-start" className="accent-[#004aad]" disabled={calls.length === 0} checked={copying} onChange={() => setCopying(true)} />
              기존 공고 내용 복사
            </label>
          </div>
          {copying ? (
            <>
              <select aria-label="복사할 공고" className={`${INPUT} mt-3`} value={sourceId || calls[0]?.id || ""} onChange={(event) => setSourceId(event.target.value)}>
                {calls.map((call) => <option key={call.id} value={call.id}>{call.title || "제목 없음"}</option>)}
              </select>
              <p className="mt-2 text-sm text-zinc-600 break-keep">소개, 진행 단계, FAQ, 신청 양식을 가져옵니다. 일정은 비워 둡니다.</p>
            </>
          ) : null}
        </fieldset>

        <p className="mt-5 text-sm text-zinc-600 break-keep">새 공고는 비공개로 만들어집니다. 공개 설정에서 직접 열기 전까지 외부에 보이지 않습니다.</p>
        {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">취소</button>
          <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "만드는 중…" : "만들기"}</button>
        </div>
      </form>
    </div>
  );
};

export default OpenCallCreateDialog;
