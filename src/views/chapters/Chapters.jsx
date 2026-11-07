import React, { useEffect, useRef, useState } from "react";
import { PHOTO_CREDITS, VENUE_ADDRESS, getMarkHeights } from "./data";
import "./chapters.css";

const MARK_COLOURS = ["on-blue", "on-lime", "on-coral", "on-ink", "on-paper", "on-blue", "on-lime"];
const MARK_HEIGHTS = [100, 72, 88, 62, 100, 78, 92];

// Marks the page live only once it can reveal content, so nothing stays hidden without script.
export const ChapterPage = ({ className = "", children }) => {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;

    root.classList.add("is-live");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    root.querySelectorAll(".rv").forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  });

  return <div ref={rootRef} className={`ch ${className}`}>{children}</div>;
};

export const Stages = ({ stages }) => {
  const [open, setOpen] = useState(0);
  return (
    <div className="ch-stages rv" style={{ "--open-grow": stages.length > 5 ? 3 : 5 }}>
      {stages.map((stage, index) => (
        <div key={stage.title} className={`ch-stage s-${Math.min(index, 6)} ${open === index ? "is-open" : ""}`}>
          <button type="button" className="ch-stage__head" aria-expanded={open === index} onClick={() => setOpen(index)}>
            {stage.title}
          </button>
          {open === index ? <p className="ch-stage__body">{stage.body}</p> : null}
        </div>
      ))}
    </div>
  );
};

export const FaqTiles = ({ title, description, items, id = "faq" }) => {
  const [open, setOpen] = useState(0);
  return (
    <section id={id} className="ch-field on-paper">
      <div className="ch-faq">
        <div className="ch-faq__head">
          <h2 className="ch-title rv">{title}</h2>
          {description ? <p className="rv" style={{ "--i": 1, marginTop: 16 }}>{description}</p> : null}
        </div>
        <div className="ch-faq__list">
          {items.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.question} className={`ch-q rv ${isOpen ? "is-open" : ""}`}>
                <button type="button" className="ch-q__button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : index)}>
                  {item.question}
                  <span className="ch-q__plus" aria-hidden="true" />
                </button>
                {isOpen ? <p className="ch-q__answer">{item.answer}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const MarkBlocks = () => {
  const rootRef = useRef(null);

  const applyHeights = (pointerRatio) => {
    const heights = getMarkHeights(MARK_HEIGHTS, pointerRatio);
    [...rootRef.current.children].forEach((block, index) => block.style.setProperty("--h", `${heights[index]}%`));
  };
  const track = (event) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = rootRef.current.getBoundingClientRect();
    applyHeights((event.clientX - box.left) / box.width);
  };
  const release = () => applyHeights(null);

  return (
    <div ref={rootRef} className="ch-mark__blocks" aria-hidden="true" onPointerMove={track} onPointerLeave={release} onPointerCancel={release}>
      {"UNFRAME".split("").map((letter, index) => (
        <span key={`${letter}-${index}`} className={MARK_COLOURS[index]} style={{ "--h": `${MARK_HEIGHTS[index]}%` }}>
          <i className={`ch-mark__fill ${MARK_COLOURS[index]}`} />
          <b>{letter}</b>
        </span>
      ))}
    </div>
  );
};

export const MarkFooter = ({ className = "on-paper", children, credits = PHOTO_CREDITS }) => (
  <footer className={`ch-mark ${className}`}>
    <MarkBlocks />
    <div className="ch-mark__info">
      <p className="ch-mark__line">
        <strong className="ch-sub">UNFRAME</strong>
        <span>{VENUE_ADDRESS}</span>
      </p>
      {children}
      {credits.length > 0 ? (
        <p className="ch-credits">
          거리 사진:{" "}
          {credits.map((credit, index) => (
            <React.Fragment key={credit.url}>
              {index > 0 ? ", " : ""}
              <a href={credit.url} target="_blank" rel="noopener noreferrer">{credit.label}</a> ({credit.author})
            </React.Fragment>
          ))}
          . 모두 <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>, Wikimedia Commons.
        </p>
      ) : null}
    </div>
  </footer>
);
