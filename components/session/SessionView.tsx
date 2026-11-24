"use client";

// 스트레칭 화면 전체 조립 — 위 진행 막대, 왼쪽 정답 캐릭터, 오른쪽 내 캐릭터(작업 7~10) / 동작 설명, 아래 진행 상태 막대(작업 11)
// Design Ref: DESIGN 1-3, DESIGN 2-1(동작 진행 상태와 타이머), DESIGN 6 (SessionView)

import Icon, { SportIcon } from "@/components/ui/Icon";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import TargetPanel from "./TargetPanel";
import MoveInfo from "./MoveInfo";
import MirrorPanel from "./MirrorPanel";
import FeedbackBar from "./FeedbackBar";
import { getSport, getSteps, type SportId } from "@/lib/data/sports";
import { useCamera } from "@/lib/camera/useCamera";
import { usePoseLandmarker } from "@/lib/pose/usePoseLandmarker";
import { usePoseComparison } from "@/lib/pose/usePoseComparison";
import { useCoachText } from "@/lib/coach/useCoachText";
import {
  averageVisibility,
  initSession,
  isOutOfFrame,
  phaseOf,
  sessionReducer,
} from "@/lib/session/sessionMachine";

export type SessionMode = "camera" | "view";

/** 진행 흐름 시계 주기(밀리초) — 비교(0.1초)와 같은 박자 */
const TICK_MS = 100;
/** 한 번에 흐르게 할 최대 시간(초). 브라우저가 타이머를 늦춰도 시간이 한꺼번에 튀지 않게 */
const MAX_TICK_SEC = 0.25;

export default function SessionView({ sportId, mode }: { sportId: SportId; mode: SessionMode }) {
  const sport = getSport(sportId)!;
  const steps = useMemo(() => getSteps(sport), [sport]);
  const flowOn = mode === "camera";

  // 카메라 모드: 동작 진행 흐름(DESIGN 2-1 상태표)이 단계를 바꾼다 (PLAN 작업 11)
  const [flow, dispatch] = useReducer(sessionReducer, steps.length, initSession);
  const phase = phaseOf(flow);
  // 보기 모드: [이전]/[다음]으로 단계를 바꾼다
  const [viewIndex, setViewIndex] = useState(0);
  const stepIndex = flowOn ? Math.min(flow.stepIndex, steps.length - 1) : viewIndex;
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // 카메라: 카메라 모드에서만 켜고, 화면을 나가거나(컴포넌트가 사라지면) 마지막 단계를 마치면(done) 즉시 끈다 (PRD 7번, DESIGN 2-1 done)
  const camera = useCamera(flowOn && !flow.done);
  const cameraOn = camera.status === "active";

  // 자세 인식: 카메라가 켜졌을 때만 MediaPipe를 불러와 돌린다 (DESIGN 2 처리 1~2)
  const videoRef = useRef<HTMLVideoElement>(null);
  const { status: poseStatus, fps, people, frameRef } = usePoseLandmarker(videoRef, cameraOn);
  const poseReady = poseStatus === "ready";

  // 정답과 비교: 핵심 관절별 차이·색·일치도 (DESIGN 2 처리 3b~4, SC-3)
  const comparison = usePoseComparison(frameRef, step, poseReady);
  // 교정 문구: 자세를 맞추는 동안만 (일시정지·몸 이탈 중에는 AI 요청도 멈춤 — DESIGN 2-1 paused, 2 처리 6)
  const coaching = flowOn && (phase === "aligning" || phase === "confirming" || phase === "holding");
  const coach = useCoachText(comparison, step, coaching);
  // 진행 흐름 시계가 최신 일치도를 읽을 수 있게 ref에 담아 둔다 (화면 다시 그리기와 분리)
  const scoreRef = useRef<number | null>(null);
  useEffect(() => {
    scoreRef.current = comparison?.score ?? null;
  }, [comparison]);

  // loading → orient: 자세 인식 모델이 준비되면 첫 단계를 시작한다
  useEffect(() => {
    if (flowOn && poseReady) dispatch({ type: "READY" });
  }, [flowOn, poseReady]);

  // 탭 숨김·창 내림 → paused, 다시 보이면 직전 상태로 이어서 (DESIGN 7 visibilitychange)
  useEffect(() => {
    if (!flowOn) return;
    const onVisibility = () => dispatch({ type: "VISIBILITY", hidden: document.hidden });
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [flowOn]);

  // 진행 흐름 시계: 0.1초마다 흐른 시간·일치도·몸 이탈·평균 보임 정도를 넣는다
  useEffect(() => {
    if (!flowOn || !poseReady || flow.done) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, MAX_TICK_SEC);
      last = now;
      const image = frameRef.current?.image ?? null;
      dispatch({
        type: "TICK",
        dt,
        score: scoreRef.current,
        outOfFrame: isOutOfFrame(image),
        visibility: averageVisibility(image),
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [flowOn, poseReady, flow.done, frameRef]);

  const onSkip = useCallback(() => dispatch({ type: "SKIP" }), []);

  // 보기 모드: [이전]/[다음] 버튼과 키보드 ←/→ 로 동작을 넘긴다 (PRD 4번 예외 흐름, DESIGN 1-3 보기 모드)
  const goPrev = useCallback(() => setViewIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setViewIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);
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
            className="btn btn-sm btn-gray"
          >
            <Icon name="chevronLeft" /> 나가기
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="text-muted">
                <SportIcon id={sport.id} /> {sport.name}
              </span>
              <span className="font-semibold tabular-nums text-lime">
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
                    onClick={() => setViewIndex(i)}
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
              className={`t-footnote flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${
                mode === "camera"
                  ? "bg-lime/15 text-lime ring-1 ring-lime/30"
                  : "bg-sky/15 text-sky ring-1 ring-sky/30"
              }`}
            >
              <Icon name={mode === "camera" ? "camera" : "eye"} /> {mode === "camera" ? "카메라 모드" : "보기 모드"}
            </span>
          )}
        </div>
      </header>

      {/* ── 가운데: 정답 / 나 ── */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-5 py-4 md:grid-cols-2 md:px-8">
        {/* 카메라 모드: 서는 방향 안내는 진행 흐름의 orient 상태 동안만 보인다 (DESIGN 2-1) */}
        <TargetPanel step={step} lightweight={flowOn} orientOpen={flowOn ? phase === "orient" : undefined} />
        {flowOn && !flow.done && (
          <MirrorPanel
            videoRef={videoRef}
            stream={camera.stream}
            cameraStatus={camera.status}
            cameraError={camera.error}
            onRetry={camera.retry}
            viewModeHref={`/sports/${sport.id}/session?mode=view`}
            poseStatus={poseStatus}
            fps={fps}
            people={people}
            frameRef={frameRef}
            comparison={comparison}
            notice={phase === "outOfFrame" ? "outOfFrame" : flow.lowLight ? "lowLight" : null}
          />
        )}
        {/* 카메라 모드: 일치도 링·상태·타이머·[건너뛰기] (DESIGN 1-3 아래 막대) */}
        {flowOn && (
          <FeedbackBar
            state={flow}
            phase={phase}
            step={step}
            score={comparison?.score ?? null}
            coach={coaching ? coach : null}
            onSkip={onSkip}
            doneHref={`/sports/${sport.id}`}
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
