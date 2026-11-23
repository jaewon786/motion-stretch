"use client";

// 실시간 비교 훅 — 최신 인식 결과를 현재 단계의 정답과 1초에 10번 비교한다
// Design Ref: DESIGN 2 처리 3b~4 (각도 계산 → 정답과 비교)
// 1초에 10번이면 화면 표시에는 충분하고, React 다시 그리기 부담은 작다.

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { computeAngles } from "./angles";
import { comparePose, type CompareResult } from "./compare";
import { PointsSmoother, visibilityOf, worldToPoints } from "./retarget";
import { solvePose } from "./skeleton";
import type { PoseFrame } from "./usePoseLandmarker";
import type { Step } from "@/lib/data/sports";

/** 비교 주기(밀리초) */
const COMPARE_MS = 100;

/**
 * @param frameRef 최신 인식 결과
 * @param step     지금 단계 (정답 자세·핵심 관절)
 * @param enabled  자세 인식이 준비됐을 때만 true
 * @returns 비교 결과. 사람이 안 보이면 null
 */
export function usePoseComparison(frameRef: RefObject<PoseFrame | null>, step: Step, enabled: boolean) {
  const [result, setResult] = useState<CompareResult | null>(null);
  // 정답 각도는 단계가 바뀔 때만 다시 잰다 (정답 마네킹과 같은 함수 — DESIGN 3-2)
  const targetAngles = useMemo(() => computeAngles(solvePose(step.pose)), [step]);
  const smoother = useRef<PointsSmoother | null>(null);

  useEffect(() => {
    if (!enabled) return;
    smoother.current = new PointsSmoother(); // 단계가 바뀌면 필터도 새로
    let lastTime = -1;
    const timer = setInterval(() => {
      const frame = frameRef.current;
      if (!frame) {
        setResult(null);
        return;
      }
      if (frame.time === lastTime) return; // 새 인식 결과가 없으면 그대로
      lastTime = frame.time;
      const points = smoother.current!.update(worldToPoints(frame.world), frame.time);
      const mine = computeAngles(points);
      setResult(comparePose(mine, targetAngles, step.keyJoints, visibilityOf(frame.image)));
    }, COMPARE_MS);
    return () => {
      clearInterval(timer);
      setResult(null);
    };
  }, [enabled, frameRef, step, targetAngles]);

  return result;
}
