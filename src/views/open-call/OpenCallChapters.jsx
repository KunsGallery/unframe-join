import React, { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ChapterPage, FaqTiles, MarkFooter } from "../chapters/Chapters";
import { getThemeWordWeight } from "./openCallView";
import "./openCallPage.css";

const MAX_GHOSTS = 12;
const MIN_TRAVEL_PX = 28;

// The theme word leaves a fading trace wherever the pointer or finger passes.
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
  theme,
  posterUrl,
  lead,
  requirements,
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
  const weight = getThemeWordWeight(word);
  const applyButton = (
    <button type="button" className="oc-btn" disabled={!canApply} onClick={onApply}>
      {canApply ? applyLabel : disabledLabel}
      {canApply ? <ArrowRight size={18} /> : null}
    </button>
  );
  const pageStyle = {
    "--oc-accent": theme.accent,
    "--oc-on": theme.on,
    "--oc-tint": theme.tint,
    "--oc-word-wide": `min(${(posterUrl ? 46 : 84) / weight}vw, ${posterUrl ? 13 : 22}vw)`,
    "--oc-word-narrow": `min(${82 / weight}vw, 34vw)`,
  };

  return (
    <div style={pageStyle} className="oc">
      <ChapterPage>
        <header className={`oc-hero ${posterUrl ? "has-poster" : ""}`}>
          <div className="oc-panel">
            <div>
              <button type="button" className="oc-back" onClick={onBack}><ArrowLeft size={18} /> 메인으로</button>
              <h1 className="ch-sub" style={{ marginTop: 16 }}>{openCall.heroTitle || openCall.title}</h1>
              {openCall.subtitle ? <p style={{ marginTop: 6 }}>{openCall.subtitle}</p> : null}
            </div>
            <Afterimage word={word} />
            <div className="oc-panel__action">
              {applyButton}
              {statusHelpText ? <p>{statusHelpText}</p> : null}
            </div>
          </div>
          {posterUrl ? (
            <div className="oc-poster">
              <img src={posterUrl} alt={`${openCall.title} 포스터`} fetchPriority="high" />
            </div>
          ) : null}
        </header>

        <dl className="oc-dates" aria-label="모집 일정">
          <div><dt>상태</dt><dd>{statusLabel}</dd></div>
          {dateEntries.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>

        {lead ? (
          <section className="oc-section oc-split">
            <h2 className="ch-title rv">이번 주제,<br />{word}</h2>
            <p className="ch-prose rv" style={{ "--i": 1 }}>{lead}</p>
          </section>
        ) : null}

        {requirements.length > 0 || openCall.eligibilityText ? (
          <section className="oc-section oc-on-tint">
            <h2 className="ch-title rv oc-heading">모집 요강</h2>
            <div className="oc-tiles">
              {requirements.map((item) => (
                <div key={`${item.title}-${item.body.slice(0, 12)}`} className="oc-tile rv">
                  {item.title ? <h3 className="ch-sub">{item.title}</h3> : null}
                  <p>{item.body}</p>
                </div>
              ))}
              {openCall.eligibilityText ? (
                <div className="oc-tile oc-tile--ink rv">
                  <h3 className="ch-sub">확인해 주세요</h3>
                  <p>{openCall.eligibilityText}</p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {sections.length > 0 ? (
          <section className="oc-section">
            <h2 className="ch-title rv oc-heading">지원에서 전시까지</h2>
            {openCall.mediumText ? <p className="rv oc-note">{openCall.mediumText}</p> : null}
            <ol className="oc-stages">
              {sections.map((section, index) => (
                <li key={section.id || section.title} className="rv">
                  <p className="oc-stages__no">{index + 1}</p>
                  <h3 className="ch-sub">{section.title}</h3>
                  {section.body ? <p>{section.body}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {openCall.benefitText || openCall.magazineText ? (
          <section className="oc-section oc-split oc-on-ink">
            <h2 className="ch-display rv" style={{ fontSize: "clamp(40px, 6vw, 92px)" }}>선정되면<br />함께하는 일</h2>
            <div>
              {openCall.benefitText ? <p className="ch-sub rv oc-pre" style={{ "--i": 1 }}>{openCall.benefitText}</p> : null}
              {openCall.magazineText ? <p className="ch-sub rv oc-pre" style={{ "--i": 2, marginTop: 24 }}>{openCall.magazineText}</p> : null}
            </div>
          </section>
        ) : null}

        {faqs.length > 0 ? (
          <FaqTiles title={faqTitle} description={faqDescription} items={faqs} id="open-call-faq" />
        ) : null}

        <section className="oc-close">
          <div>
            <h2 className="ch-title rv">{word}, 함께하실래요?</h2>
            {statusHelpText ? <p className="rv" style={{ "--i": 1, marginTop: 12 }}>{statusHelpText}</p> : null}
          </div>
          <div className="rv" style={{ "--i": 2 }}>{applyButton}</div>
        </section>

        <MarkFooter credits={[]} />
      </ChapterPage>
    </div>
  );
};

export default OpenCallChapters;
