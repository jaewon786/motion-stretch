"use client";

// 내 3D 마네킹 장면 — 카메라로 인식한 내 자세를 거울처럼 따라 움직인다
// Design Ref: DESIGN 1-3 "나 (오른쪽, 거울처럼) 3D 내 마네킹", DESIGN 2 처리 3a, DESIGN 4 거울 표시
// PRD 5번 must 2: "오른쪽 내 캐릭터가 그 동작을 거울처럼 따라 움직인다"

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import StageCanvas from "@/components/three/StageCanvas";
import Mannequin from "@/components/three/Mannequin";
import { REST_POSE, solvePose, type PosePoints } from "@/lib/pose/skeleton";
import { PointsSmoother, worldToPoints } from "@/lib/pose/retarget";
import type { PoseFrame } from "@/lib/pose/usePoseLandmarker";

/** 매 프레임 최신 인식 결과를 관절 점으로 바꿔 livePointsRef에 넣는다 (화면 다시 그리기 없음) */
function LiveDriver({
  frameRef,
  livePointsRef,
}: {
  frameRef: RefObject<PoseFrame | null>;
  livePointsRef: RefObject<PosePoints | null>;
}) {
  const smoother = useMemo(() => new PointsSmoother(), []);
  useFrame(() => {
    const frame = frameRef.current;
    if (!frame) return; // 사람이 안 보이면 마지막 자세를 그대로 둔다
    livePointsRef.current = smoother.update(worldToPoints(frame.world), frame.time);
  });
  return null;
}

export default function MeScene({ frameRef }: { frameRef: RefObject<PoseFrame | null> }) {
  const restPoints = useMemo(() => solvePose(REST_POSE), []);
  const livePointsRef = useRef<PosePoints | null>(null);
  return (
    // 자세 인식에 GPU를 양보하려고 무거운 효과는 끈다 (SC-2)
    <StageCanvas className="h-full w-full" mirror effects={false}>
      <LiveDriver frameRef={frameRef} livePointsRef={livePointsRef} />
      <Mannequin points={restPoints} livePointsRef={livePointsRef} variant="me" followSpeed={18} />
    </StageCanvas>
  );
}
