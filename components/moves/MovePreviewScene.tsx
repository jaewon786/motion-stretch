"use client";

// 동작 카드의 작은 3D 정답 자세 미리보기 — 가벼운 무대(lite)에 정답 마네킹을 세운다
// Design Ref: DESIGN 1-2 "각 카드에 작은 3D 정답 자세 미리보기"

import { useMemo } from "react";
import StageCanvas from "@/components/three/StageCanvas";
import Mannequin from "@/components/three/Mannequin";
import { solvePose } from "@/lib/pose/skeleton";
import type { JointAngleId, PoseSpec } from "@/lib/pose/types";

export type MovePreviewProps = {
  pose: PoseSpec;
  keyJoints: JointAngleId[];
  /** 옆으로 서는 동작이면 옆모습으로 보여 준다 */
  facing: "front" | "side";
};

export default function MovePreviewScene({ pose, keyJoints, facing }: MovePreviewProps) {
  const points = useMemo(() => solvePose(pose), [pose]);
  const rings = useMemo(() => Object.fromEntries(keyJoints.map((j) => [j, "hint" as const])), [keyJoints]);
  return (
    <StageCanvas className="h-full w-full" lite interactive={false} mirror yawDeg={facing === "side" ? -90 : 0}>
      <Mannequin points={points} variant="target" rings={rings} />
    </StageCanvas>
  );
}
