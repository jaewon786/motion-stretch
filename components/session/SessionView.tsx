"use client";

// 스트레칭 화면 전체 조립 — 위 진행 막대, 왼쪽 정답 캐릭터, 오른쪽 내 캐릭터 자리(작업 7~9) / 동작 설명, 아래 정보 막대
// Design Ref: DESIGN 1-3, DESIGN 6 (SessionView)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TargetPanel from "./TargetPanel";
import MoveInfo from "./MoveInfo";
import MirrorPanel from "./MirrorPanel";
import { getSport, getSteps, type SportId } from "@/lib/data/sports";
import { useCamera } from "@/lib/camera/useCamera";
import { usePoseLandmarker } from "@/lib/pose/usePoseLandmarker";
import { usePoseComparison } from "@/lib/pose/usePoseComparison";

export type SessionMode = "camera" | "view";

export default function SessionView({ sportId, mode }: { sportId: SportId; mode: SessionMode }) {
  const sport = getSport(sportId)!;
  const steps = useMemo(() => getSteps(sport), [sport]);
  // 지금 진행 중인 단계 (보기 모드는 [이전]/[다음]으로, 카메라 모드는 작업 11 진행 흐름이 바꾼다)
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // 카메라: 카메라 모드에서만 켜고, 화면을 나가면(컴포넌트가 사라지면) 즉시 끈다 (PRD 7번)
  // 작업 14에서 완료 화면으로 바뀔 때도 enabled를 false로 바꿔 끈다.
  const camera = useCamera(mode === "camera");
  const cameraOn = camera.status === "active";

  // 자세 인식: 카메라가 켜졌을 때만 MediaPipe를 불러와 돌린다 (DESIGN 2 처리 1~2)
  const videoRef = useRef<HTMLVideoElement>(null);
  const pose = usePoseLandmarker(videoRef, cameraOn);

  // 정답과 비교: 핵심 관절별 차이·색·일치도 (DESIGN 2 처리 3b~4, SC-3)
  const comparison = usePoseComparison(pose.frameRef, step, pose.status === "ready");

  // 보기 모드: [이전]/[다음] 버튼과 키보드 ←/→ 로 동작을 넘긴다 (PRD 4번 예외 흐름, DESIGN 1-3 보기 모드)
  const goPrev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setStepIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);
  useEffect(() => {
    if (mode !== "view") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, goPrev, goNext]);

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
              <span className="font-mono font-bold tabular-nums text-lime">
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
                <li key={st.key} aria-current={i === stepIndex ? "step" : undefined} className="flex-1">
                  <button
                    type="button"
                    disabled={mode !== "view"}
                    onClick={() => setStepIndex(i)}
                    aria-label={`${i + 1}단계 ${st.move.name}${st.side ? (st.side === "left" ? " 왼쪽" : " 오른쪽") : ""}`}
                    className={`block h-1.5 w-full rounded-full transition-colors enabled:cursor-pointer enabled:hover:bg-sky/70 ${
                      i < stepIndex ? "bg-lime" : i === stepIndex ? "bg-sky" : "bg-white/10"
                    }`}
                  />
                </li>
              ))}
            </ol>
          </div>
          {/* 카메라를 쓰는 동안 계속 보이는 표시 (PRD 7번) */}
          {cameraOn ? (
            <span
              role="status"
              className="flex items-center gap-2 rounded-full bg-bad/15 px-3 py-1.5 text-xs font-semibold text-red-300 ring-1 ring-bad/40"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-bad" aria-hidden />
              카메라 사용 중
            </span>
          ) : (
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                mode === "camera"
                  ? "bg-lime/15 text-lime ring-1 ring-lime/30"
                  : "bg-sky/15 text-sky ring-1 ring-sky/30"
              }`}
            >
              {mode === "camera" ? "📷 카메라 모드" : "👀 보기 모드"}
            </span>
          )}
        </div>
      </header>

      {/* ── 가운데: 정답 / 나 ── */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-5 py-4 md:grid-cols-2 md:px-8">
        <TargetPanel step={step} lightweight={mode === "camera"} />
        {mode === "camera" && (
          <MirrorPanel
            videoRef={videoRef}
            stream={camera.stream}
            cameraStatus={camera.status}
            cameraError={camera.error}
            onRetry={camera.retry}
            viewModeHref={`/sports/${sport.id}/session?mode=view`}
            poseStatus={pose.status}
            fps={pose.fps}
            people={pose.people}
            frameRef={pose.frameRef}
            comparison={comparison}
          />
        )}
        <MoveInfo
          step={step}
          mode={mode}
          nav={
            mode === "view"
              ? { isFirst, isLast, onPrev: goPrev, onNext: goNext, doneHref: `/sports/${sport.id}` }
              : undefined
          }
        />
      </main>
    </div>
  );
}
