// 관절 각도 계산 — 정답 마네킹과 카메라로 본 사용자 모두 이 함수 하나로 잰다
// Design Ref: DESIGN 3-3 — 판정 관절 각도 정의, 왼쪽/오른쪽은 항상 몸 기준
//
// 입력 관절 점은 y가 위쪽인 좌표여야 한다. (카메라 좌표는 작업 8에서 이 좌표로 바꿔 넣는다)
// 각도 계산에는 MediaPipe에도 있는 관절 점만 쓴다. 그래야 정답과 사용자를 같은 기준으로 비교할 수 있다.

import { Vector3 } from "three";
import type { JointAngleId } from "./types";
import type { KeypointId, PosePoints } from "./skeleton";

const RAD = 180 / Math.PI;
const UP = new Vector3(0, 1, 0);

/** 세 점 a–b–c 에서 b의 각도(0~180도) */
export function angle3(a: Vector3, b: Vector3, c: Vector3): number {
  const ba = a.clone().sub(b);
  const bc = c.clone().sub(b);
  const len = ba.length() * bc.length();
  if (len === 0) return 0;
  const cos = Math.min(1, Math.max(-1, ba.dot(bc) / len));
  return Math.acos(cos) * RAD;
}

const mid = (a: Vector3, b: Vector3) => a.clone().add(b).multiplyScalar(0.5);

/** 3점 각도 정의 (DESIGN 3-3 표) */
const TRIPLES: Partial<Record<JointAngleId, [KeypointId, KeypointId, KeypointId]>> = {
  kneeL: ["hipL", "kneeL", "ankleL"],
  kneeR: ["hipR", "kneeR", "ankleR"],
  hipL: ["shoulderL", "hipL", "kneeL"],
  hipR: ["shoulderR", "hipR", "kneeR"],
  ankleL: ["kneeL", "ankleL", "toeL"],
  ankleR: ["kneeR", "ankleR", "toeR"],
  elbowL: ["shoulderL", "elbowL", "wristL"],
  elbowR: ["shoulderR", "elbowR", "wristR"],
  wristL: ["elbowL", "wristL", "indexL"],
  wristR: ["elbowR", "wristR", "indexR"],
  shoulderL: ["hipL", "shoulderL", "elbowL"],
  shoulderR: ["hipR", "shoulderR", "elbowR"],
  shoulderAcrossL: ["shoulderR", "shoulderL", "elbowL"],
  shoulderAcrossR: ["shoulderL", "shoulderR", "elbowR"],
};

export type JointAngles = Record<JointAngleId, number>;

/** 관절 점 16개 → 판정 관절 각도 17개 */
export function computeAngles(p: PosePoints): JointAngles {
  const out = {} as JointAngles;
  for (const [id, [a, b, c]] of Object.entries(TRIPLES) as [JointAngleId, [KeypointId, KeypointId, KeypointId]][]) {
    out[id] = angle3(p[a], p[b], p[c]);
  }

  // 몸통 기울기: 양 엉덩이 가운데 → 양 어깨 가운데 선이 수직선에서 기운 정도
  const trunk = mid(p.shoulderL, p.shoulderR).sub(mid(p.hipL, p.hipR));
  // 몸 기준 왼쪽 방향 = 오른 엉덩이 → 왼 엉덩이, 수평면에 눕힘
  const left = p.hipL.clone().sub(p.hipR).setY(0);
  if (left.lengthSq() === 0) left.set(1, 0, 0);
  left.normalize();
  const forward = new Vector3().crossVectors(left, UP).normalize(); // 몸 앞쪽
  const up = trunk.dot(UP);
  out.trunkSide = Math.atan2(trunk.dot(left), up) * RAD; // 왼쪽으로 기울면 +
  out.trunkForward = Math.atan2(trunk.dot(forward), up) * RAD; // 앞으로 숙이면 +
  return out;
}

/** 관절 링을 붙일 위치: 관절 각도 id → 관절 점 (몸통은 양 어깨·엉덩이 가운데 사이) */
export const JOINT_ANCHOR: Record<JointAngleId, KeypointId | "trunk"> = {
  kneeL: "kneeL",
  kneeR: "kneeR",
  hipL: "hipL",
  hipR: "hipR",
  ankleL: "ankleL",
  ankleR: "ankleR",
  elbowL: "elbowL",
  elbowR: "elbowR",
  wristL: "wristL",
  wristR: "wristR",
  shoulderL: "shoulderL",
  shoulderR: "shoulderR",
  shoulderAcrossL: "shoulderL",
  shoulderAcrossR: "shoulderR",
  trunkSide: "trunk",
  trunkForward: "trunk",
};

/** 관절 링 위치 좌표 */
export function anchorPosition(p: PosePoints, id: JointAngleId): Vector3 {
  const anchor = JOINT_ANCHOR[id];
  if (anchor === "trunk") {
    return mid(p.shoulderL, p.shoulderR).lerp(mid(p.hipL, p.hipR), 0.45);
  }
  return p[anchor].clone();
}

/** 화면에 보여 줄 한국어 관절 이름 (교정 문구·각도 표에서 사용, 몸 기준 왼쪽/오른쪽) */
export const JOINT_LABEL: Record<JointAngleId, string> = {
  kneeL: "왼쪽 무릎",
  kneeR: "오른쪽 무릎",
  hipL: "왼쪽 엉덩이",
  hipR: "오른쪽 엉덩이",
  ankleL: "왼쪽 발목",
  ankleR: "오른쪽 발목",
  elbowL: "왼쪽 팔꿈치",
  elbowR: "오른쪽 팔꿈치",
  wristL: "왼쪽 손목",
  wristR: "오른쪽 손목",
  shoulderL: "왼쪽 어깨",
  shoulderR: "오른쪽 어깨",
  shoulderAcrossL: "왼쪽 어깨(가로)",
  shoulderAcrossR: "오른쪽 어깨(가로)",
  trunkSide: "몸통 옆 기울기",
  trunkForward: "몸통 앞 숙임",
};
