"use client";

// 화면에 보여 줄 교정 문구 — 즉시 기본 문구, 3초에 1번 AI 문구 요청
// Design Ref: DESIGN 2 처리 6 — 즉시: 규칙 기반 기본 문구 / 3초에 1번: POST /api/coach
//             브라우저 2초 안에 못 받거나 400·429·네트워크 오류 → 기본 문구 유지, 429면 1분간 요청 중단
//             DESIGN 2-1 paused — 탭 숨김 중에는 AI 요청도 멈춘다 (active=false)
// PRD 7번 / SC-6: 보내는 값은 동작 id·방향·관절 이름·각도 차이(정수)뿐. 영상·좌표는 보내지 않는다.

import { useEffect, useRef, useState } from "react";
import {
  COACH_INTERVAL_SEC,
  COACH_RATE_LIMIT_BACKOFF_SEC,
  COACH_TIMEOUT_MS,
  GREEN_DEG,
} from "@/lib/config/thresholds";
import type { CompareResult } from "@/lib/pose/compare";
import type { Step } from "@/lib/data/sports";
import { ruleText } from "./ruleText";

export type CoachLine = { text: string; source: "ai" | "rule" };

/** AI 문구를 보여 주는 시간(밀리초). 지나면 지금 자세 기준 기본 문구로 돌아간다 */
const AI_FRESH_MS = COACH_INTERVAL_SEC * 2 * 1000;

/**
 * @param comparison 지금 비교 결과 (작업 10)
 * @param step       지금 단계
 * @param active     자세를 맞추는 중(aligning·confirming·holding)일 때만 true — 일시정지·몸 이탈 중에는 요청하지 않음
 */
export function useCoachText(comparison: CompareResult | null, step: Step, active: boolean): CoachLine {
  const [ai, setAi] = useState<{ text: string; stepKey: string } | null>(null);
  const comparisonRef = useRef(comparison);
  useEffect(() => {
    comparisonRef.current = comparison;
  }, [comparison]);

  useEffect(() => {
    if (!active) return;
    let backoffUntil = 0;
    let inFlight: AbortController | null = null;
    let clearTimer: ReturnType<typeof setTimeout> | undefined;

    const ask = async () => {
      const cmp = comparisonRef.current;
      const now = Date.now();
      if (inFlight || now < backoffUntil || !cmp?.worst) return;
      if (Math.abs(cmp.worst.diff) <= GREEN_DEG) return; // 이미 맞으면 부르지 않는다 (비용 절약)
      const controller = new AbortController();
      inFlight = controller;
      const timeout = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);
      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moveId: step.move.id,
            side: step.side,
            diffs: cmp.joints.map((j) => ({ joint: j.joint, diff: Math.round(j.diff) })),
          }),
          signal: controller.signal,
        });
        if (res.status === 429) {
          backoffUntil = Date.now() + COACH_RATE_LIMIT_BACKOFF_SEC * 1000;
          return;
        }
        if (!res.ok) return; // 400 등 → 기본 문구 유지
        const data = (await res.json()) as { text?: unknown; source?: unknown };
        if (data.source === "ai" && typeof data.text === "string") {
          setAi({ text: data.text, stepKey: step.key });
          clearTimeout(clearTimer);
          clearTimer = setTimeout(() => setAi(null), AI_FRESH_MS);
        }
      } catch {
        // 2초 초과·네트워크 오류 → 기본 문구 유지
      } finally {
        clearTimeout(timeout);
        if (inFlight === controller) inFlight = null;
      }
    };

    const timer = setInterval(ask, COACH_INTERVAL_SEC * 1000);
    return () => {
      clearInterval(timer);
      clearTimeout(clearTimer);
      inFlight?.abort();
      setAi(null);
    };
  }, [active, step]);

  // AI 문구가 지금 단계 것이면 그것을, 아니면 지금 자세 기준 기본 문구 (SC-7: 항상 문구가 보임)
  if (ai && ai.stepKey === step.key) return { text: ai.text, source: "ai" };
  return { text: ruleText(comparison?.worst ?? null), source: "rule" };
}
