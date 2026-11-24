"use client";

// 정답 캐릭터 3D 장면 — 거울 표시 + 서는 방향(정면/옆) 회전 + 드래그로 돌려 보기
// Design Ref: DESIGN 1-3 "정답(왼쪽) 3D 정답 마네킹, 드래그로 돌려 보기", DESIGN 4 "거울 표시"

import { useMemo } from "react";
import StageCanvas from "@/components/three/StageCanvas";
import Mannequin from "@/components/three/Mannequin";
import { solvePose } from "@/lib/pose/skeleton";
import type { Step } from "@/lib/data/sports";

/**
 * 옆으로 서는 동작에서 마네킹을 돌릴 각도(도).
 * 늘리는 쪽 몸이 카메라(화면)를 향하게 한다. 거울 표시에서는 좌우가 뒤집히므로 회전 방향도 반대다.
 * - 거울 표시 + 왼쪽: +90°  /  거울 표시 + 오른쪽: −90°
 */
export function facingYaw(step: Step, mirror: boolean): number {
  if (step.move.facing !== "side") return 0;
  const left = step.side !== "right"; // 양쪽 동시 동작은 왼쪽 기준
  const yaw = left ? -90 : 90;
  return mirror ? -yaw : yaw;
}

/** @param lightweight 카메라 모드에서 true — 자세 인식이 쓸 GPU 여유를 위해 무거운 효과를 끈다 (SC-2) */
export default function TargetScene({ step, lightweight = false }: { step: Step; lightweight?: boolean }) {
  const points = useMemo(() => solvePose(step.pose), [step]);
  const rings = useMemo(() => Object.fromEntries(step.keyJoints.map((j) => [j, "hint" as const])), [step]);
  return (
    <StageCanvas
      className="h-full w-full"
      mirror
      yawDeg={facingYaw(step, true)}
      accent="#38bdf8"
      effects={!lightweight}
    >
      <Mannequin points={points} variant="target" rings={rings} followSpeed={5} />
    </StageCanvas>
  );
}
