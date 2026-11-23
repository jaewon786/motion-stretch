// 사람 고르기 — 화면에 여러 명이 잡히면 "화면 중앙에 가깝고 가장 크게 잡힌 한 사람"만 쓴다
// Design Ref: DESIGN 2 처리 2 / PRD 5번 must 2 "화면에 여러 사람이 있으면 중앙에 가장 크게 잡힌 한 사람만 인식한다"

import { MIN_VISIBILITY } from "@/lib/config/thresholds";

/** MediaPipe 화면 좌표 한 점 (0~1, 영상 기준) */
export type ImagePoint = { x: number; y: number; visibility?: number };

/**
 * 한 사람의 점수 = 몸이 차지한 넓이 × 중앙에 가까운 정도.
 * 보임 정도가 낮은 관절은 넓이 계산에서 뺀다.
 */
export function personScore(points: ImagePoint[]): number {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let count = 0;
  for (const p of points) {
    if ((p.visibility ?? 1) < MIN_VISIBILITY) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
    count++;
  }
  if (count < 4) return 0;
  const area = Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const dist = Math.hypot(cx - 0.5, cy - 0.5); // 화면 가운데(0.5, 0.5)에서 떨어진 정도
  const centered = Math.max(0.1, 1 - dist / 0.7);
  return area * centered;
}

/** 여러 사람 중 고를 사람의 번호. 아무도 없으면 -1 */
export function selectPerson(people: ImagePoint[][]): number {
  let best = -1;
  let bestScore = 0;
  people.forEach((points, i) => {
    const score = personScore(points);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
