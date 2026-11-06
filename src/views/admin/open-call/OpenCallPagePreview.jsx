import React, { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import OpenCallChapters from "../../open-call/OpenCallChapters";
import { buildOpenCallView } from "../../open-call/openCallView";

// Renders the real public page from the unsaved draft, so what is checked here is what goes live.
const OpenCallPagePreview = ({ call, onClose }) => {
  const view = useMemo(() => buildOpenCallView(call), [call]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="공고 페이지 미리보기" className="fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4">
        <p className="text-sm font-semibold text-zinc-900">미리보기 <span className="font-normal text-zinc-600">저장하지 않은 내용까지 표시됩니다</span></p>
        <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"><X size={16} />닫기</button>
      </div>
      <OpenCallChapters {...view} onBack={onClose} onApply={() => {}} />
    </div>
  );
};

export default OpenCallPagePreview;
