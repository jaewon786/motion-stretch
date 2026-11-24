"use client";

// 아래 막대 — 일치도 링 · 진행 상태 · 3초 확인/15초 유지 타이머 · [건너뛰기]
// Design Ref: DESIGN 1-3 "( 일치도 링 86% )  상태: 자세 확인! 유지 중 ███████░ 9초 … [건너뛰기] (30초 후 표시)"
//             DESIGN 2-1 상태표의 화면 표시 문구, DESIGN 6 FeedbackBar
// Plan SC: SC-4 — 80% 이상 3초 → 자세 확인 → 15초 유지 타이머
// 디자인: iOS 26 토큰 (.grouped 카드, t-* 글자, 알약 버튼, good/warn/bad 시스템 색)

import Icon from "@/components/ui/Icon";
import { CONFIRM_SEC, HOLD_SEC, ORIENT_SEC, PASS_SCORE } from "@/lib/config/thresholds";
import type { Step } from "@/lib/data/sports";
import { canSkip, type SessionPhase, type SessionState } from "@/lib/session/sessionMachine";
import { facingText } from "./TargetPanel";
import type { CoachLine } from "@/lib/coach/useCoachText";

type Props = {
  state: SessionState;
  phase: SessionPhase;
  step: Step;
  /** 지금 일치도 (판정 보류·사람 없음이면 null) */
  score: number | null;
  /** 교정 문구 (작업 13). 자세를 맞추는 중이 아니면 null */
  coach: CoachLine | null;
  onSkip: () => void;
};

/** 남은 초 (올림, 0 아래로 내려가지 않음) */
const left = (total: number, elapsed: number) => Math.max(0, Math.ceil(total - elapsed));

/** 일치도 색 — MirrorPanel 위쪽 표시와 같은 기준 */
function scoreTone(score: number | null) {
  if (score === null) return { stroke: "var(--steel)", text: "text-muted" };
  if (score >= PASS_SCORE) return { stroke: "var(--good)", text: "text-good" };
  if (score >= 50) return { stroke: "var(--warn)", text: "text-warn" };
  return { stroke: "var(--bad)", text: "text-bad" };
}

/** 일치도 링 (SVG 원 둘레를 일치도만큼 채움) */
function ScoreRing({ score }: { score: number | null }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const value = score === null ? 0 : Math.max(0, Math.min(100, score));
  const tone = scoreTone(score);
  return (
    <div
      className="relative h-16 w-16 shrink-0"
      role="img"
      aria-label={score === null ? "일치도 판정 보류" : `일치도 ${Math.round(value)}%`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden>
        {/* SVG 속성(stroke="…")에는 CSS 변수를 쓸 수 없어 style로 색을 넣는다 */}
        <circle cx="32" cy="32" r={r} fill="none" style={{ stroke: "var(--fill-2)" }} strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          style={{ stroke: tone.stroke }}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-200"
        />
      </svg>
      <span className={`t-subhead absolute inset-0 flex items-center justify-center font-semibold tabular-nums ${tone.text}`}>
        {score === null ? "–" : Math.round(value)}
      </span>
    </div>
  );
}

/** 상태별 화면 문구 (DESIGN 2-1 "화면 표시" 열) */
function describe(state: SessionState, phase: SessionPhase, step: Step, passing: boolean) {
  switch (phase) {
    case "loading":
      return { title: "준비 중", detail: "자세 인식을 불러오고 있어요", count: null };
    case "orient":
      return { title: "서는 방향 안내", detail: facingText(step).detail, count: left(ORIENT_SEC, state.orientSec) };
    case "aligning":
      return {
        title: "자세를 맞춰 보세요",
        detail: `왼쪽 정답 자세를 따라 해 보세요 · 일치도 ${PASS_SCORE}% 이상이면 자세 확인을 시작해요`,
        count: null,
      };
    case "confirming":
      return { title: "그대로!", detail: "자세를 확인하는 중이에요", count: left(CONFIRM_SEC, state.confirmSec) };
    case "holding":
      return {
        title: "자세 확인! 유지 중",
        detail: passing ? "그대로 유지하세요" : "자세가 흐트러져 타이머가 멈췄어요",
        count: left(HOLD_SEC, state.holdSec),
      };
    case "paused":
      return { title: "일시정지", detail: "화면으로 돌아오면 이어서 셉니다", count: null };
    case "outOfFrame":
      return { title: "한 걸음 뒤로 물러나 주세요", detail: "몸 전체가 화면에 들어오면 이어서 셉니다", count: null };
    case "done":
      return { title: "스트레칭을 모두 마쳤어요", detail: "카메라를 껐어요", count: null };
  }
}

// 마지막 단계를 마치면(done) 이 막대 대신 CompletionView가 보인다 (작업 14)
export default function FeedbackBar({ state, phase, step, score, coach, onSkip }: Props) {
  const passing = score !== null && score >= PASS_SCORE;
  const { title, detail, count } = describe(state, phase, step, passing);
  const holdStopped = phase === "holding" && !passing;

  // 진행 막대: confirming은 3초 확인, holding은 15초 유지 (다른 상태에서는 숨김)
  const bar =
    phase === "confirming"
      ? { ratio: state.confirmSec / CONFIRM_SEC, color: "bg-lime" }
      : phase === "holding"
        ? { ratio: state.holdSec / HOLD_SEC, color: holdStopped ? "bg-warn" : "bg-good" }
        : null;
  const percent = bar ? Math.min(1, bar.ratio) * 100 : 0;

  return (
    <section
      aria-label="진행 상태"
      className="grouped flex flex-wrap items-center gap-x-5 gap-y-4 p-5 md:col-span-2 md:px-6"
    >
      <ScoreRing score={phase === "done" ? null : score} />

      {/* 글자 영역은 최소 14rem을 지키고, 좁으면 버튼이 아래 줄로 내려간다 */}
      <div className="min-w-0 flex-1 basis-56">
        <div className="flex items-baseline gap-2">
          {/* 상태 이름만 읽어 준다 (초 숫자는 매초 바뀌므로 읽지 않음) */}
          <p role="status" aria-live="polite" className="t-headline">
            {title}
          </p>
          {count !== null && (
            <span className={`t-title3 font-semibold tabular-nums ${holdStopped ? "text-warn" : "text-text"}`}>
              {count}초
            </span>
          )}
        </div>
        <p className="t-footnote mt-0.5 truncate text-muted">{detail}</p>
        {bar && (
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-fill"
            role="progressbar"
            aria-label={phase === "holding" ? "유지 시간" : "자세 확인"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-150 ${bar.color}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      {/* [건너뛰기]: 단계 시작 후 30초가 지나면 표시, 누르면 이 단계는 미완료 (DESIGN 2-1) */}
      {canSkip(state) && (
        <button type="button" onClick={onSkip} className="btn btn-md btn-gray">
          건너뛰기 <Icon name="chevronRight" />
        </button>
      )}

      {/* 교정 문구 — 자세를 맞추는 동안 항상 보임 (SC-7). AI 문구인지 기본 문구인지 작게 표시 (DESIGN 1-3) */}
      {coach && (
        <p className="t-callout flex basis-full items-center gap-3 rounded-2xl bg-fill px-4 py-3">
          <Icon name="bulb" className="shrink-0 text-lime" />
          <span role="status" aria-live="polite" className="min-w-0 flex-1">
            {coach.text}
          </span>
          <span className="t-caption shrink-0 text-muted">{coach.source === "ai" ? "AI" : "기본 문구"}</span>
        </p>
      )}
    </section>
  );
}
