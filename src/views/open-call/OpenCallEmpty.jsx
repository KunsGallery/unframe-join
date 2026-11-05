import React from "react";
import { ArrowLeft } from "lucide-react";
import { ChapterPage, MarkFooter } from "../chapters/Chapters";
import { Afterimage } from "./OpenCallChapters";

const OpenCallEmpty = ({ onBack }) => (
  <ChapterPage>
    <header className="ch-hero" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="ch-panel">
        <div>
          <button type="button" className="ch-back" onClick={onBack}><ArrowLeft size={18} /> 메인으로</button>
          <h1 className="ch-title" style={{ marginTop: 16 }}>지금 열린 오픈콜이 없습니다</h1>
          <p style={{ marginTop: 12, maxWidth: "46ch" }}>다음 모집이 시작되면 이곳에 공고가 올라옵니다. 그동안 UNFRAME의 소식은 메인에서 확인해 주세요.</p>
        </div>
        <Afterimage word="다음" />
      </div>
    </header>
    <MarkFooter credits={[]} />
  </ChapterPage>
);

export default OpenCallEmpty;
