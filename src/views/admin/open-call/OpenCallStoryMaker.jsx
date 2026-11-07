import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { getOpenCallTheme } from "../../open-call/openCallView";
import { loadPosterImage } from "./posterColor";
import {
  STORY_LAYOUTS,
  STORY_SIZE,
  buildStoryContent,
  drawStoryImage,
  getStoryFileName,
} from "./storyImage";

const FIELD = "mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-normal text-zinc-950 outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad]";
const HEADLINE_FONT = '800 76px "Pretendard Variable"';

const OpenCallStoryMaker = ({ call, onGoToBasics }) => {
  const canvasRef = useRef(null);
  const [layout, setLayout] = useState(STORY_LAYOUTS[0].id);
  const [loaded, setLoaded] = useState({ url: "", image: null, error: "" });
  const [edits, setEdits] = useState({ callId: "", headline: null });
  const [saveError, setSaveError] = useState("");

  const content = useMemo(() => buildStoryContent(call), [call]);
  const posterUrl = String(call.posterUrl ?? "").trim();
  const headline = edits.callId === call.id && edits.headline !== null ? edits.headline : content.headline;
  const poster = loaded.url === posterUrl ? loaded.image : null;
  const loadError = loaded.url === posterUrl ? loaded.error : "";

  useEffect(() => {
    if (!posterUrl) return undefined;
    let stale = false;
    Promise.all([loadPosterImage(posterUrl), document.fonts?.load(HEADLINE_FONT).catch(() => {})])
      .then(([image]) => {
        if (!stale) setLoaded({ url: posterUrl, image, error: "" });
      })
      .catch((error) => {
        console.error(error);
        if (!stale) setLoaded({ url: posterUrl, image: null, error: "포스터를 읽지 못했습니다. 잠시 후 다시 열어 주세요." });
      });
    return () => {
      stale = true;
    };
  }, [posterUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !poster) return;
    drawStoryImage(canvas.getContext("2d"), {
      poster,
      content: { ...content, headline },
      theme: getOpenCallTheme(call.accentColor),
      layout,
    });
  }, [call.accentColor, content, headline, layout, poster]);

  const handleDownload = () => {
    setSaveError("");
    try {
      canvasRef.current.toBlob((blob) => {
        if (!blob) {
          setSaveError("이미지를 만들지 못했습니다. 다시 시도해 주세요.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = getStoryFileName(call, layout);
        link.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (error) {
      console.error(error);
      setSaveError("이미지를 만들지 못했습니다. 다시 시도해 주세요.");
    }
  };

  if (!posterUrl) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center break-keep">
        <p className="text-base font-bold text-zinc-950">먼저 포스터를 올려 주세요</p>
        <p className="mt-1 text-sm text-zinc-600">스토리 이미지는 공고의 포스터로 만듭니다.</p>
        <button type="button" onClick={onGoToBasics} className="mt-4 min-h-11 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">기본 정보로 가기</button>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 break-keep md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
        <canvas
          ref={canvasRef}
          width={STORY_SIZE.width}
          height={STORY_SIZE.height}
          role="img"
          aria-label="인스타그램 스토리 미리보기"
          className="block h-auto w-full"
        />
      </div>

      <div className="space-y-5">
        <div>
          <h5 className="text-lg font-bold text-zinc-950">인스타그램 스토리 이미지</h5>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">1080×1920 크기로 만들고, 인스타그램 화면에 가리는 위아래는 비워 둡니다. 저장하지 않은 수정 내용도 바로 반영됩니다.</p>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-zinc-900">디자인</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {STORY_LAYOUTS.map((option) => (
              <label key={option.id} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${layout === option.id ? "border-zinc-950 bg-zinc-100 text-zinc-950" : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"}`}>
                <input type="radio" name="story-layout" className="accent-[#004aad]" checked={layout === option.id} onChange={() => setLayout(option.id)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-semibold text-zinc-900">
          크게 보일 문구
          <input className={FIELD} maxLength={24} value={headline} onChange={(event) => setEdits({ callId: call.id, headline: event.target.value })} />
        </label>

        <p className="text-sm leading-relaxed text-zinc-700">공고명, 접수 일정, 결과 발표일은 공고 내용에서 가져옵니다. 색은 포인트 색을 따릅니다.</p>

        {loadError ? <p role="alert" className="text-sm font-medium text-red-700">{loadError}</p> : null}
        {saveError ? <p role="alert" className="text-sm font-medium text-red-700">{saveError}</p> : null}

        <button type="button" disabled={!poster} onClick={handleDownload} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">
          <Download size={16} aria-hidden="true" />이미지 내려받기
        </button>
      </div>
    </div>
  );
};

export default OpenCallStoryMaker;
