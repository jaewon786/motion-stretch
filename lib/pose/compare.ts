// 관절 각도 비교 — 핵심 관절별 차이·점수·색, 전체 일치도, 가장 많이 어긋난 관절
// Design Ref: DESIGN 2 처리 4, DESIGN 3-1(기준값), 3-3(부호 규칙: diff = 내 각도 − 정답 각도)
// Plan SC: SC-3 — 핵심 관절 2~4개가 ±15° 안이면 "맞음", 일치도 0~100%
// PRD 5번 must 2: 인식 신뢰도가 낮은 관절은 판정에서 빼고, 남은 관절 평균으로 일치도를 낸다.

import { GREEN_DEG, MIN_VISIBILITY, YELLOW_DEG } from "@/lib/config/thresholds";
import { jointKeypoints, type JointAngles } from "./angles";
import type { KeypointId } from "./skeleton";
import type { JointAngleId } from "./types";

/** 관절 상태: 맞음(초록) / 조금 어긋남(노랑) / 많이 어긋남(빨강) */
export type JointGrade = "good" | "warn" | "bad";

export type JointResult = {
  joint: JointAngleId;
  /** 내 각도 − 정답 각도 (도) */
  diff: number;
  /** 0~100 점 */
  score: number;
  grade: JointGrade;
};

export type CompareResult = {
  /** 판정한 핵심 관절 (가려진 관절은 빠짐) */
  joints: JointResult[];
  /** 가려져서 판정에서 뺀 핵심 관절 */
  excluded: JointAngleId[];
  /** 전체 일치도 0~100. 판정할 관절이 하나도 없으면 null (판정 보류) */
  score: number | null;
  /** 가장 많이 어긋난 관절 (교정 문구에 사용). 판정할 관절이 없으면 null */
  worst: JointResult | null;
};

/** 각도 차이 → 점수: 0°면 100점, YELLOW_DEG(30°) 이상이면 0점, 그 사이는 비례 */
export function jointScore(diff: number): number {
  return Math.max(0, 100 * (1 - Math.abs(diff) / YELLOW_DEG));
}

/** 각도 차이 → 색 */
export function jointGrade(diff: number): JointGrade {
  const d = Math.abs(diff);
  if (d <= GREEN_DEG) return "good";
  if (d <= YELLOW_DEG) return "warn";
  return "bad";
}

/**
 * 내 자세와 정답 자세를 핵심 관절 기준으로 비교한다.
 * @param visibility 관절 점별 보임 정도(0~1). 없으면 모두 보이는 것으로 본다 (정답끼리 비교할 때)
 */
export function comparePose(
  mine: JointAngles,
  target: JointAngles,
  keyJoints: JointAngleId[],
  visibility?: Partial<Record<KeypointId, number>>,
): CompareResult {
  const joints: JointResult[] = [];
  const excluded: JointAngleId[] = [];
  for (const joint of keyJoints) {
    const hidden = visibility && jointKeypoints(joint).some((k) => (visibility[k] ?? 0) < MIN_VISIBILITY);
    if (hidden) {
      excluded.push(joint);
      continue;
    }
    const diff = mine[joint] - target[joint];
    joints.push({ joint, diff, score: jointScore(diff), grade: jointGrade(diff) });
  }
  if (joints.length === 0) return { joints, excluded, score: null, worst: null };
  const score = joints.reduce((sum, j) => sum + j.score, 0) / joints.length;
  const worst = joints.reduce((a, b) => (Math.abs(b.diff) > Math.abs(a.diff) ? b : a));
  return { joints, excluded, score, worst };
}
