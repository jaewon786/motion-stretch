"use client";

// 동작 정보·통증 주의 카드 — 이름, 좌/우, 늘어나는 부위, 유지 시간, 서는 방향, 주의사항, 통증 안내
// Design Ref: DESIGN 1-3 "동작 정보: 늘어나는 부위·주의사항 · ⚠ 통증이 느껴지면 즉시 멈추세요"
// PRD 5번 must 1 규칙: 동작마다 "통증이 느껴지면 즉시 멈추세요" 안내를 반드시 보여 준다

import type { Step } from "@/lib/data/sports";
import { PAIN_WARNING } from "@/lib/data/sports";
import { HOLD_SEC } from "@/lib/config/thresholds";
import { facingText } from "./TargetPanel";
import type { SessionMode } from "./SessionView";

export default function MoveInfo({ step }: { step: Step; mode: SessionMode }) {
  const facing = facingText(step);
  return (
    <section aria-label="동작 정보" className="glass flex flex-col rounded-[2rem] p-6 md:p-8">
      <p className="text-sm font-semibold text-sky">{step.move.target}</p>
      <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight md:text-4xl">
        {step.move.name}
        {step.side && (
          <span className="ml-2 align-middle text-xl font-bold text-lime">
            {step.side === "left" ? "왼쪽" : "오른쪽"}
          </span>
        )}
      </h2>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/5 p-4">
          <dt className="text-xs text-muted">유지 시간</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums">
            {HOLD_SEC}
            <span className="ml-0.5 text-base font-bold text-muted">초</span>
          </dd>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <dt className="text-xs text-muted">서는 방향</dt>
          <dd className="mt-1 text-lg font-bold">
            <span aria-hidden>{facing.icon}</span> {facing.title}
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3 text-sm leading-6">
        <p className="flex gap-2.5 text-text/90">
          <span aria-hidden>🧭</span>
          {facing.detail}
        </p>
        <p className="flex gap-2.5 text-text/90">
          <span aria-hidden>💡</span>
          {step.move.caution}
        </p>
      </div>

      <p
        role="note"
        className="mt-6 flex items-center gap-2.5 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm font-semibold text-warn md:mt-auto"
      >
        <span aria-hidden>⚠️</span> {PAIN_WARNING}
      </p>
    </section>
  );
}
