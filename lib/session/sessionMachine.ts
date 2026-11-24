// 동작 진행 흐름 — 상태(reducer)와 타이머 규칙
// Design Ref: DESIGN 2-1 상태표, DESIGN 2 처리 5, DESIGN 7 예외 처리(몸 이탈·어두움·탭 숨김·30초 건너뛰기)
// Plan SC: SC-4 — 일치도 80% 이상 3초 → 자세 확인 → 15초 유지 → 다음 단계
// 이 파일은 React·three를 쓰지 않는 순수 함수만 둔다 (Node 점검 스크립트로 바로 돌려 볼 수 있게).
// 시간은 매 TICK의 dt(초)로만 흐른다. 그래서 탭이 숨겨져 TICK이 멈추거나 paused면 모든 타이머가 함께 멈춘다.

import {
  CONFIRM_SEC,
  GRACE_SEC,
  HOLD_SEC,
  LOW_LIGHT_SEC,
  LOW_LIGHT_VISIBILITY,
  MIN_VISIBILITY,
  ORIENT_SEC,
  PASS_SCORE,
  SKIP_AFTER_SEC,
} from "@/lib/config/thresholds";

/** 한 단계 안에서 차례로 지나는 상태 (DESIGN 2-1: orient → aligning → confirming → holding) */
export type StepPhase = "orient" | "aligning" | "confirming" | "holding";

/** 화면에 보이는 상태 이름 (DESIGN 2-1 상태표의 8가지) */
export type SessionPhase = "loading" | StepPhase | "paused" | "outOfFrame" | "done";

/** 단계별 결과 — 완료 화면(작업 14)에서 쓴다 */
export type StepResult = {
  /** 그 단계에서 나온 가장 높은 일치도(0~100). 한 번도 판정하지 못했으면 null */
  best: number | null;
  /** 15초 유지까지 마쳤으면 true, [건너뛰기]로 넘어갔으면 false */
  completed: boolean;
};

export type SessionState = {
  /** 모델이 준비되기 전이면 true (loading) */
  loading: boolean;
  /** 마지막 단계까지 끝났으면 true (done) */
  done: boolean;
  /** 탭 숨김으로 일시정지 중 (paused) — 다른 무엇보다 우선한다 */
  paused: boolean;
  /** 몸이 화면을 벗어남 (outOfFrame) — 단계 안 상태(step)는 그대로 두고 3초·15초 타이머만 멈춘다 */
  outOfFrame: boolean;
  /** 어두움 안내를 보여 줄지 (상태가 아니라 안내 — 판정은 계속) */
  lowLight: boolean;
  /** 지금 단계 안 상태. paused·outOfFrame이 풀리면 이 상태로 돌아간다 ("직전 상태로") */
  step: StepPhase;
  stepIndex: number;
  stepCount: number;
  /** 서는 방향 안내가 흐른 시간(초) */
  orientSec: number;
  /** 단계 시작(orient 종료) 후 흐른 시간(초) — 30초 건너뛰기용 */
  stepSec: number;
  /** confirming 상태에서 80% 이상으로 쌓인 시간(초) */
  confirmSec: number;
  /** confirming 상태에서 80% 미만이 이어진 시간(초) — 0.5초 봐주기용 */
  belowSec: number;
  /** holding 상태에서 80% 이상으로 쌓인 시간(초) */
  holdSec: number;
  /** 평균 보임 정도가 낮은 상태가 이어진 시간(초) */
  darkSec: number;
  /** 지금 단계의 가장 높은 일치도 */
  best: number | null;
  results: StepResult[];
};

export type SessionEvent =
  /** 자세 인식 모델이 준비됨 → loading 끝, 첫 단계 orient */
  | { type: "READY" }
  /**
   * 시간이 흐름 (약 0.1초마다)
   * dt: 지난 TICK 뒤 흐른 시간(초) / score: 지금 일치도, 판정 보류면 null
   * outOfFrame: 몸이 화면을 벗어났는지(사람이 안 보이는 경우 포함) / visibility: 전체 관절 평균 보임 정도, 사람이 없으면 null
   */
  | { type: "TICK"; dt: number; score: number | null; outOfFrame: boolean; visibility: number | null }
  /** 탭 숨김(true)·다시 보임(false) */
  | { type: "VISIBILITY"; hidden: boolean }
  /** [건너뛰기] — 이 단계는 미완료로 기록하고 다음 단계로 */
  | { type: "SKIP" };

export function initSession(stepCount: number): SessionState {
  return {
    loading: true,
    done: false,
    paused: false,
    outOfFrame: false,
    lowLight: false,
    step: "orient",
    stepIndex: 0,
    stepCount,
    orientSec: 0,
    stepSec: 0,
    confirmSec: 0,
    belowSec: 0,
    holdSec: 0,
    darkSec: 0,
    best: null,
    results: [],
  };
}

/** 화면에 보일 상태 하나로 정리 (우선순위: done > loading > paused > outOfFrame > 단계 안 상태) */
export function phaseOf(s: SessionState): SessionPhase {
  if (s.done) return "done";
  if (s.loading) return "loading";
  if (s.paused) return "paused";
  if (s.outOfFrame) return "outOfFrame";
  return s.step;
}

/** [건너뛰기]를 보여 줄지 — 단계 시작 후 30초가 지나면 aligning·confirming·holding 어느 상태든 (DESIGN 2-1 아래 규칙) */
export function canSkip(s: SessionState): boolean {
  return !s.loading && !s.done && s.step !== "orient" && s.stepSec >= SKIP_AFTER_SEC;
}

/** 지금 단계를 끝내고 다음 단계(orient)로, 마지막이면 done */
function finishStep(s: SessionState, completed: boolean): SessionState {
  const results = [...s.results, { best: s.best, completed }];
  const next = s.stepIndex + 1;
  if (next >= s.stepCount) {
    return { ...s, results, done: true, outOfFrame: false, lowLight: false };
  }
  return {
    ...s,
    results,
    stepIndex: next,
    step: "orient",
    outOfFrame: false,
    orientSec: 0,
    stepSec: 0,
    confirmSec: 0,
    belowSec: 0,
    holdSec: 0,
    best: null,
  };
}

function tick(s: SessionState, e: Extract<SessionEvent, { type: "TICK" }>): SessionState {
  // loading·done·paused: 어떤 타이머도 세지 않는다 (DESIGN 2-1)
  if (s.loading || s.done || s.paused) return s;
  const dt = Math.max(0, e.dt);

  // 어두움 안내: 평균 보임 정도 < 0.3이 3초 넘게 이어지면 (DESIGN 2 처리 2). 판정은 멈추지 않는다
  const dark = e.visibility !== null && e.visibility < LOW_LIGHT_VISIBILITY;
  const darkSec = dark ? s.darkSec + dt : 0;
  let next: SessionState = { ...s, darkSec, lowLight: darkSec > LOW_LIGHT_SEC };

  // orient: 서는 방향 안내 3초. 안내가 끝나야 단계 시작 시각을 기록한다 (몸 이탈 판정도 이때는 하지 않음)
  if (next.step === "orient") {
    const orientSec = next.orientSec + dt;
    if (orientSec >= ORIENT_SEC) return { ...next, orientSec, step: "aligning", stepSec: 0 };
    return { ...next, orientSec };
  }

  // 30초 건너뛰기 타이머는 outOfFrame 중에도 계속 흐른다 (DESIGN 2-1 outOfFrame 행)
  next = { ...next, stepSec: next.stepSec + dt };

  // outOfFrame: 3초·15초 타이머만 멈추고, 몸이 다시 보이면 직전 상태로 (단계 안 상태는 그대로)
  if (e.outOfFrame) return { ...next, outOfFrame: true };
  next = { ...next, outOfFrame: false };

  const score = e.score;
  const pass = score !== null && score >= PASS_SCORE;
  if (score !== null) next = { ...next, best: next.best === null ? score : Math.max(next.best, score) };

  switch (next.step) {
    case "aligning":
      // 일치도 ≥ 80% → confirming (3초 카운트 시작)
      return pass ? { ...next, step: "confirming", confirmSec: 0, belowSec: 0 } : next;

    case "confirming": {
      if (pass) {
        const confirmSec = next.confirmSec + dt;
        // 80% 이상 3초 누적 → 자세 확인, holding
        if (confirmSec >= CONFIRM_SEC) return { ...next, step: "holding", confirmSec, belowSec: 0, holdSec: 0 };
        return { ...next, confirmSec, belowSec: 0 };
      }
      // 80% 미만(판정 보류 포함): 0.5초까지는 봐주고 카운트 유지, 넘으면 0으로 되돌리고 aligning
      const belowSec = next.belowSec + dt;
      if (belowSec > GRACE_SEC) return { ...next, step: "aligning", confirmSec: 0, belowSec: 0 };
      return { ...next, belowSec };
    }

    case "holding": {
      // 80% 미만인 동안 15초 타이머만 멈춘다 (처음부터 다시 세지 않음)
      if (!pass) return next;
      const holdSec = next.holdSec + dt;
      if (holdSec >= HOLD_SEC) return finishStep({ ...next, holdSec }, true);
      return { ...next, holdSec };
    }
  }
  return next;
}

export function sessionReducer(s: SessionState, e: SessionEvent): SessionState {
  switch (e.type) {
    case "READY":
      return s.loading ? { ...s, loading: false } : s;
    case "TICK":
      return tick(s, e);
    case "VISIBILITY":
      // 탭이 숨겨지면 일시정지, 다시 보이면 직전 상태로 (타이머 값은 그대로 두어 이어서 센다)
      return s.paused === e.hidden ? s : { ...s, paused: e.hidden };
    case "SKIP":
      return canSkip(s) ? finishStep(s, false) : s;
  }
}

// ─────────────────────────────────────────────────────────────
// 인식 결과 점검 — 몸 이탈·어두움 (DESIGN 2 처리 2, DESIGN 7)
// MediaPipe 화면 좌표(0~1)와 보임 정도를 받는다.

type ImagePoint = { x: number; y: number; visibility?: number };

/** 좌우 짝 관절 번호 (MediaPipe): 어깨·엉덩이·무릎·발목 */
const PAIRS: [number, number][] = [
  [11, 12],
  [23, 24],
  [25, 26],
  [27, 28],
];

/** 몸 판정에 쓰는 관절 번호 (어깨~발끝 16개, retarget.ts MP_INDEX와 같은 점) */
const BODY_POINTS = [11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26, 27, 28, 31, 32];

const seen = (p: ImagePoint | undefined) => (p?.visibility ?? 0) >= MIN_VISIBILITY;

/**
 * 몸이 화면을 벗어났는지
 * - 사람이 안 보임(null)
 * - 좌우 짝(어깨·엉덩이·무릎·발목) 중 양쪽 모두 안 보이는 부위가 있음
 * - 보이는 관절의 화면 좌표가 0~1 범위 밖
 */
export function isOutOfFrame(image: ImagePoint[] | null): boolean {
  if (!image) return true;
  if (PAIRS.some(([l, r]) => !seen(image[l]) && !seen(image[r]))) return true;
  return BODY_POINTS.some((i) => {
    const p = image[i];
    return seen(p) && (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1);
  });
}

/** 전체 관절(33개) 평균 보임 정도. 사람이 안 보이면 null */
export function averageVisibility(image: ImagePoint[] | null): number | null {
  if (!image || image.length === 0) return null;
  return image.reduce((sum, p) => sum + (p.visibility ?? 0), 0) / image.length;
}
