import React, { useEffect, useRef, useState } from "react";
import "./openCallPage.css";

const ROTATE_MS = 2200;

const pad = (value) => String(value).padStart(2, "0");

const RotatingWords = ({ keywords, label, as, className, suffix }) => {
  const Tag = as;
  const [{ index, previous }, setStep] = useState({ index: 0, previous: null });

  useEffect(() => {
    if (keywords.length < 2) return undefined;

    let timer = null;
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    const start = () => {
      if (timer || document.hidden) return;
      timer = setInterval(() => {
        setStep((current) => ({ index: (current.index + 1) % keywords.length, previous: current.index }));
      }, ROTATE_MS);
    };
    const handleVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [keywords.length]);

  return (
    <Tag className={`oc-rot ${className}`} aria-label={label} role={Tag === "div" ? "img" : undefined}>
      <span className="oc-rot__window" aria-hidden="true">
        {previous !== null ? <span key={`out-${previous}-${index}`} className="oc-rot__word is-out">{keywords[previous]}</span> : null}
        <span key={`in-${index}`} className={`oc-rot__word ${previous !== null ? "is-in" : ""}`}>{keywords[index]}</span>
      </span>
      {keywords.length > 1 ? <span className="oc-rot__count" aria-hidden="true">{pad(index + 1)} / {pad(keywords.length)}</span> : null}
      {suffix ? <span className="oc-rot__suffix" aria-hidden="true">{suffix}</span> : null}
    </Tag>
  );
};

const SpotlightText = ({ label, as, className }) => {
  const Tag = as;
  const rootRef = useRef(null);

  const track = (event) => {
    const root = rootRef.current;
    const box = root.getBoundingClientRect();
    root.style.setProperty("--x", `${event.clientX - box.left}px`);
    root.style.setProperty("--y", `${event.clientY - box.top}px`);
    root.classList.add("is-tracking");
  };
  // With no pointer over it the whole line stays solid, so the text is always readable.
  const release = () => rootRef.current.classList.remove("is-tracking");

  return (
    <Tag ref={rootRef} className={`oc-spot ${className}`} onPointerMove={track} onPointerLeave={release} onPointerCancel={release}>
      {label}
      <span className="oc-spot__light" aria-hidden="true">{label}</span>
    </Tag>
  );
};

// A call's keywords shown one at a time ("rotate") or under a pointer-following light ("spotlight").
const KeywordEffect = ({ keywords, effect = "rotate", as = "div", suffix = "", className = "" }) => {
  const words = keywords.join(", ");
  const label = suffix ? `${words}, ${suffix}` : words;

  if (effect === "spotlight") return <SpotlightText label={label} as={as} className={className} />;
  return <RotatingWords key={words} keywords={keywords} label={label} as={as} className={className} suffix={suffix} />;
};

export default KeywordEffect;
