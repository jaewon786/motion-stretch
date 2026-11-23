"use client";

// 스트레칭 화면 전체 조립 — 위 진행 막대, 왼쪽 정답 캐릭터, 오른쪽 내 캐릭터 자리(작업 7~9) / 동작 설명, 아래 정보 막대
// Design Ref: DESIGN 1-3, DESIGN 6 (SessionView)

import { useMemo, useState } from "react";
import Link from "next/link";
import TargetPanel from "./TargetPanel";
import MoveInfo from "./MoveInfo";
import { getSport, getSteps, type SportId } from "@/lib/data/sports";

export type SessionMode = "camera" | "view";

export default function SessionView({ sportId, mode }: { sportId: SportId; mode: SessionMode }) {
  const sport = getSport(sportId)!;
  const steps = useMemo(() => getSteps(sport), [sport]);
  // 지금 진행 중인 단계 (작업 6 보기 모드의 [이전]/[다음], 작업 11 진행 흐름이 바꾼다)
  const [stepIndex] = useState(0);
  const step = steps[stepIndex];

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── 위: 진행 막대 ── */}
      <header className="border-b border-line bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 md:px-8">
          <Link
            href={`/sports/${sport.id}`}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:text-text"
          >
            <span aria-hidden>←</span> 나가기
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="text-muted">
                {sport.emoji} {sport.name}
              </span>
              <span className="font-bold tabular-nums text-lime">
                {stepIndex + 1}/{steps.length}
              </span>
              <span className="truncate font-semibold">
                {step.move.name}
                {step.side && <span className="text-sky"> ({step.side === "left" ? "왼쪽" : "오른쪽"})</span>}
              </span>
            </div>
            {/* 단계 점 */}
            <ol className="mt-2 flex gap-1.5" aria-label="진행 단계">
              {steps.map((st, i) => (
                <li
                  key={st.key}
                  aria-current={i === stepIndex ? "step" : undefined}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < stepIndex ? "bg-lime" : i === stepIndex ? "bg-sky" : "bg-white/10"
                  }`}
                />
              ))}
            </ol>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              mode === "camera" ? "bg-lime/15 text-lime ring-1 ring-lime/30" : "bg-sky/15 text-sky ring-1 ring-sky/30"
            }`}
          >
            {mode === "camera" ? "📷 카메라 모드" : "👀 보기 모드"}
          </span>
        </div>
      </header>

      {/* ── 가운데: 정답 / 나 ── */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-5 py-4 md:grid-cols-2 md:px-8">
        <TargetPanel step={step} />
        <MoveInfo step={step} mode={mode} />
      </main>
    </div>
  );
}
