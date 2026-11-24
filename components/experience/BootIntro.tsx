"use client";

// 부팅 인트로 — "센서 보정 중" 숫자가 00→100으로 올라간 뒤 사라진다 (세션당 1번, 움직임 줄이기면 생략)
// Design Ref: immersive-design 설계 1번 [부팅 인트로], 5번 로딩 상태
// 클릭을 막지 않도록 사라지는 동안 pointer-events를 끈다 (SC-5 클릭 수 유지)

import { useEffect, useRef, useState } from "react";

const KEY = "motion-stretch:boot-seen";
const DURATION_MS = 1400;

function alreadySeen() {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export default function BootIntro() {
  // 서버에서는 그리지 않고, 브라우저에서 처음 보는 세션일 때만 보여 준다
  const [phase, setPhase] = useState<"hidden" | "run" | "out">("hidden");
  const numRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || alreadySeen()) return;
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      // 저장이 막힌 브라우저에서도 그냥 진행
    }
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      if (numRef.current) numRef.current.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${eased})`;
      if (t < 1) raf = requestAnimationFrame(tick);
      else setPhase("out");
    };
    // 첫 그리기 뒤에 시작 (effect 안에서 바로 상태를 바꾸지 않음)
    raf = requestAnimationFrame(() => {
      setPhase("run");
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== "out") return;
    const timer = setTimeout(() => setPhase("hidden"), 700);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;
  return (
    <div
      role="status"
      aria-label="준비 중"
      className={`fixed inset-0 z-[80] flex items-center justify-center bg-ink transition-opacity duration-700 ${
        phase === "out" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex w-64 flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-lime text-white shadow-[0_10px_30px_rgba(10,132,255,0.35)]">
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="4.5" r="2" fill="currentColor" stroke="none" />
            <path d="M5 9.5l7 1.5 7-3.5M12 11v5l-3.5 5M12 16l4 4.5" />
          </svg>
        </span>
        <p className="t-title3 mt-5 text-text">모션 스트레치</p>
        <p className="t-footnote mt-1 text-muted">
          센서 준비 중 <span ref={numRef} className="tabular-nums">000</span>%
        </p>
        <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-fill">
          <span ref={barRef} className="block h-full w-full origin-left scale-x-0 rounded-full bg-lime" />
        </div>
      </div>
    </div>
  );
}
