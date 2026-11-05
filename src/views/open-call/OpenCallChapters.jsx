import React, { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ChapterPage, FaqTiles, MarkFooter, Stages } from "../chapters/Chapters";
import { VENUE_ADDRESS } from "../chapters/data";
import { splitIntroText } from "./openCallView";

const DETAIL_TONES = ["on-blue", "on-white", "on-deep", "on-paper", "on-coral"];
const MAX_GHOSTS = 12;
const MIN_TRAVEL_PX = 28;

// The theme word leaves a fading complementary trace wherever the pointer or finger passes.
export const Afterimage = ({ word }) => {
  const stageRef = useRef(null);
  const lastRef = useRef(null);
  const activeRef = useRef(0);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const spawn = (event) => {
      const last = lastRef.current;
      if (last && Math.hypot(event.clientX - last.x, event.clientY - last.y) < MIN_TRAVEL_PX) return;
      if (activeRef.current >= MAX_GHOSTS) return;
      lastRef.current = { x: event.clientX, y: event.clientY };

      const box = stage.getBoundingClientRect();
      const offsetX = (event.clientX - box.left - box.width / 2) * 0.1;
      const offsetY = (event.clientY - box.top - box.height / 2) * 0.16;
      const ghost = document.createElement("span");
      ghost.className = "ch-after__ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.textContent = word;
      stage.appendChild(ghost);
      activeRef.current += 1;

      const animation = ghost.animate(
        [
          { opacity: 0.95, transform: `translate(${offsetX}px, calc(-50% + ${offsetY}px))` },
          { opacity: 0, transform: `translate(${offsetX * 1.6}px, calc(-50% + ${offsetY * 1.6}px))` },
        ],
        { duration: 1500, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "forwards" }
      );
      animation.onfinish = () => {
        ghost.remove();
        activeRef.current -= 1;
      };
    };

    stage.addEventListener("pointermove", spawn);
    stage.addEventListener("pointerdown", spawn);
    return () => {
      stage.removeEventListener("pointermove", spawn);
      stage.removeEventListener("pointerdown", spawn);
    };
  }, [word]);

  return (
    <div ref={stageRef} className="ch-after" aria-hidden="true">
      <span className="ch-after__ghost ch-after__ghost--still">{word}</span>
      <span className="ch-after__word">{word}</span>
    </div>
  );
};

const OpenCallChapters = ({
  openCall,
  sections,
  faqs,
  statusLabel,
  statusHelpText,
  dateEntries,
  canApply,
  applyLabel,
  disabledLabel,
  faqTitle,
  faqDescription,
  onApply,
  onBack,
}) => {
  const word = String(openCall.themeKeyword || "").trim() || "OPEN";
  const intro = splitIntroText(openCall.introText);
  const applyButton = (tone) => (
    <button type="button" className={`ch-btn ${tone}`} disabled={!canApply} onClick={onApply}>
      {canApply ? applyLabel : disabledLabel}
      {canApply ? <ArrowRight size={18} /> : null}
    </button>
  );

  return (
    <ChapterPage>
      <header className="ch-hero">
        <div className="ch-panel">
          <div>
            <button type="button" className="ch-back" onClick={onBack}><ArrowLeft size={18} /> 메인으로</button>
            <h1 className="ch-title" style={{ marginTop: 16 }}>{openCall.heroTitle || openCall.title}</h1>
            <p className="ch-sub" style={{ marginTop: 8 }}>{openCall.subtitle}</p>
          </div>
          <Afterimage word={word} />
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
            {applyButton("ch-btn--lime")}
            {statusHelpText ? <p style={{ flex: "1 1 240px", maxWidth: "44ch" }}>{statusHelpText}</p> : null}
          </div>
        </div>
        <dl className="ch-swatches" aria-label="모집 일정">
          <div className="ch-swatch on-lime"><dt><small>상태</small></dt><dd>{statusLabel}</dd></div>
          {dateEntries.map(([label, value], index) => (
            <div key={label} className={`ch-swatch ${["on-coral", "on-deep", "on-ink"][index] || "on-white"}`}>
              <dt><small>{label}</small></dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="ch-field on-paper">
        <div className="ch-intro" style={{ marginBottom: 0 }}>
          <h2 className="ch-title rv">이번 주제, {word}</h2>
          <p className="ch-prose rv" style={{ "--i": 1 }}>{intro.lead}</p>
        </div>
      </section>

      {intro.details.length > 0 || openCall.eligibilityText ? (
        <section className="ch-field on-lime">
          <h2 className="ch-title rv" style={{ marginBottom: 40 }}>모집 요강</h2>
          <div className="ch-mosaic">
            {intro.details.map((detail, index) => (
              <div key={detail.title} className={`ch-tile ${DETAIL_TONES[index % DETAIL_TONES.length]} ${index < 2 ? "t-6-3" : "t-4-3"} rv`} style={{ "--i": index % 3 }}>
                <h3 className="ch-sub">{detail.title}</h3>
                <p style={{ whiteSpace: "pre-line" }}>{detail.body}</p>
              </div>
            ))}
            {openCall.eligibilityText ? (
              <div className="ch-tile on-ink t-12-2 rv">
                <p className="ch-sub">확인해 주세요</p>
                <p style={{ whiteSpace: "pre-line" }}>{openCall.eligibilityText}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {sections.length > 0 ? (
        <section className="ch-field on-white">
          <div className="ch-intro">
            <h2 className="ch-title rv">지원에서 전시까지</h2>
            {openCall.mediumText ? <p className="rv" style={{ "--i": 1 }}>{openCall.mediumText}</p> : <span />}
          </div>
          <Stages stages={sections.map((section) => ({ title: section.title, body: section.body }))} />
        </section>
      ) : null}

      {openCall.benefitText || openCall.magazineText ? (
        <section className="ch-field on-ink">
          <div className="ch-split" style={{ alignItems: "start" }}>
            <h2 className="ch-display rv" style={{ fontSize: "clamp(40px, 6vw, 92px)" }}>선정되면<br />함께하는 일</h2>
            <div>
              {openCall.benefitText ? <p className="ch-sub rv" style={{ "--i": 1, whiteSpace: "pre-line" }}>{openCall.benefitText}</p> : null}
              {openCall.magazineText ? <p className="ch-sub rv" style={{ "--i": 2, marginTop: 24, whiteSpace: "pre-line" }}>{openCall.magazineText}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="ch-field on-coral">
        <div className="ch-split">
          <img className="ch-plate-img rv" src="/images/insadong/annyeong.jpg" alt="서울 인사동의 복합 문화 건물" loading="lazy" />
          <div>
            <h2 className="ch-title rv">UNFRAME은<br />인사동에 있습니다</h2>
            <p className="rv" style={{ "--i": 1, marginTop: 20 }}>{VENUE_ADDRESS}</p>
          </div>
        </div>
      </section>

      {faqs.length > 0 ? (
        <FaqTiles title={faqTitle} description={faqDescription} items={faqs} id="open-call-faq" />
      ) : null}

      <section className="ch-close">
        <div className="ch-close__side"><img src="/images/insadong/insadong-gil.jpg" alt="인사동길" loading="lazy" /></div>
        <div className="ch-close__main on-blue">
          <h2 className="ch-title rv">{openCall.title}</h2>
          <p className="rv" style={{ "--i": 1 }}>{statusHelpText || statusLabel}</p>
          <div className="rv" style={{ "--i": 2 }}>{applyButton("ch-btn--lime")}</div>
        </div>
        <div className="ch-close__side"><img src="/images/insadong/pavilion.jpg" alt="인사동의 전통 정자" loading="lazy" /></div>
      </section>

      <MarkFooter />
    </ChapterPage>
  );
};

export default OpenCallChapters;
