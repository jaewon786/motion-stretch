"use client";

// 첫 화면 3D 장면 — 마네킹이 천천히 돌며 여러 종목의 스트레칭 자세를 번갈아 보여 준다
// Design Ref: DESIGN 1-1 (오른쪽 3D 마네킹), DESIGN 4 (움직임: 자세 사이를 부드럽게 보간, 첫 화면에서는 천천히 회전)

import { useEffect, useMemo, useState } from "react";
import StageCanvas from "@/components/three/StageCanvas";
import Mannequin from "@/components/three/Mannequin";
import { SPORTS, getSteps } from "@/lib/data/sports";
import { solvePose } from "@/lib/pose/skeleton";

/** 시범으로 보여 줄 단계 (눈에 잘 띄는 동작 위주, 이 순서대로) */
const SHOWCASE_KEYS = [
  "soccer-quad:left",
  "basketball-sidebend:left",
  "running-calf:left",
  "tennis-triceps:left",
  "soccer-adductor:left",
  "basketball-squat",
];
const SHOWCASE = SPORTS.flatMap((sport) =>
  getSteps(sport)
    .filter((st) => SHOWCASE_KEYS.includes(st.key))
    .map((st) => ({ sport, step: st, points: solvePose(st.pose) })),
).sort((a, b) => SHOWCASE_KEYS.indexOf(a.step.key) - SHOWCASE_KEYS.indexOf(b.step.key));

/** 한 자세를 보여 주는 시간(밀리초) */
const SHOW_MS = 3200;

export default function HeroScene() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SHOWCASE.length), SHOW_MS);
    return () => clearInterval(timer);
  }, []);
  const current = SHOWCASE[index];
  const rings = useMemo(
    () => Object.fromEntries(current.step.keyJoints.map((j) => [j, "hint" as const])),
    [current],
  );

  return (
    <div className="relative h-full w-full">
      <StageCanvas className="h-full w-full" autoRotate interactive={false}>
        <Mannequin points={current.points} variant="target" rings={rings} followSpeed={4} />
      </StageCanvas>
      {/* 지금 보여 주는 자세 이름 */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2">
        <div
          key={current.step.key}
          className="glass flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm text-text shadow-lg shadow-black/30"
        >
          <span aria-hidden>{current.sport.emoji}</span>
          <span className="text-muted">{current.sport.name}</span>
          <span className="h-3 w-px bg-line" />
          <span className="font-medium">{current.step.move.name}</span>
        </div>
      </div>
    </div>
  );
}
