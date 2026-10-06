import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "./HomeScreen";

export default function LoadingScreen({ onComplete, destination = "home" }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const duration = window.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches
      ? 350
      : 1650;
    const start = Date.now();
    const interval = setInterval(
      () =>
        setProgress(
          Math.min(100, Math.round(((Date.now() - start) / duration) * 100)),
        ),
      50,
    );
    const timeout = setTimeout(onComplete, duration + 200);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  return (
    <main className="editorial loading-screen" aria-label="Opening SIFT">
      <div className="loading-top">
        <Wordmark />
        <span className="eyebrow">GOOD DECISIONS TAKE A CLOSER LOOK.</span>
      </div>
      <div className="loading-center">
        <div className="loading-stack" aria-hidden="true">
          <div className="loading-sheet sheet-three" />
          <div className="loading-sheet sheet-two" />
          <div className="loading-sheet sheet-one">
            <span className="loading-ribbon" />
            <span className="loading-stamp">S</span>
            <span className="sheet-line long" />
            <span className="sheet-line" />
            <span className="sheet-number">A CONSIDERED SHORTLIST / 001</span>
          </div>
        </div>
        <p className="eyebrow">A LITTLE SPACE FOR A BETTER DECISION.</p>
        <h1>
          {destination === "workspace"
            ? "Your next chapter."
            : "Worth a closer look."}
        </h1>
        <p className="loading-description" role="status">
          {destination === "workspace"
            ? "Opening your shortlist workspace…"
            : "Opening a world of possibilities…"}
        </p>
        <div
          className="loading-progress"
          role="progressbar"
          aria-label="Opening progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: progress + "%" }} />
        </div>
        <button className="text-button loading-skip" onClick={onComplete}>
          Continue <ArrowRight size={13} />
        </button>
      </div>
      <footer className="loading-footer">
        <span>EVIDENCE. EXPERIENCE. POSSIBILITY.</span>
        <span>The SIFT Core Team</span>
      </footer>
    </main>
  );
}
