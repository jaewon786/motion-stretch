// 포즈 엔진 — 정답 자세(관절 각도)를 마네킹 관절 점 16개로 바꾼다 (순운동학, FK)
// Design Ref: DESIGN 3-2 — "정답 관절 각도는 회전값으로 마네킹을 세운 뒤, 사용자 판정과 같은 각도 계산 함수로 뽑아 쓴다"
//
// 좌표계 (three.js 기본과 같음)
// - Y: 위, Z: 캐릭터가 바라보는 앞, X: 캐릭터 몸 기준 왼쪽
// - 단위: 미터. 바닥은 y = 0
// 관절 점 이름은 MediaPipe Pose의 관절(어깨·팔꿈치·손목·검지·엉덩이·무릎·발목·발끝)과 같게 맞춰,
// 카메라로 받은 내 관절 점도 같은 그리기·각도 계산 코드에 그대로 넣을 수 있게 한다.

import { Quaternion, Vector3 } from "three";
import type { LimbPose, PoseSpec } from "./types";

export type KeypointId =
  | "shoulderL" | "shoulderR"
  | "elbowL" | "elbowR"
  | "wristL" | "wristR"
  | "indexL" | "indexR"
  | "hipL" | "hipR"
  | "kneeL" | "kneeR"
  | "ankleL" | "ankleR"
  | "toeL" | "toeR";

export const KEYPOINT_IDS: KeypointId[] = [
  "shoulderL", "shoulderR", "elbowL", "elbowR", "wristL", "wristR", "indexL", "indexR",
  "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR", "toeL", "toeR",
];

/** 관절 점 16개 */
export type PosePoints = Record<KeypointId, Vector3>;

/** 마네킹 몸 치수(미터). 키 약 1.72m 성인 기준 */
export const BODY = {
  pelvisHeight: 0.95, // 골반 가운데 높이 (차렷 자세)
  hipHalfWidth: 0.09,
  hipDrop: 0.04, // 골반 가운데 → 엉덩이 관절
  thigh: 0.43,
  shin: 0.42,
  ankleHeight: 0.07, // 발목 → 발바닥
  footLength: 0.15,
  spine: 0.45, // 골반 가운데 → 가슴 가운데
  shoulderHalfWidth: 0.18,
  upperArm: 0.29,
  forearm: 0.26,
  hand: 0.09,
} as const;

const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);
const DEG = Math.PI / 180;

const rot = (axis: Vector3, deg: number) => new Quaternion().setFromAxisAngle(axis, deg * DEG);

/** 여러 회전을 왼쪽부터 곱한다. 가장 오른쪽 회전이 뼈 자신의 축 기준으로 먼저 적용된다 */
const chain = (...qs: Quaternion[]) => qs.reduce((acc, q) => acc.multiply(q), new Quaternion());

/** 점 + 회전된 벡터 */
const offset = (from: Vector3, q: Quaternion, x: number, y: number, z: number) =>
  from.clone().add(new Vector3(x, y, z).applyQuaternion(q));

const limbValue = (limb: Partial<LimbPose>, key: keyof LimbPose) => limb[key] ?? 0;

/**
 * 정답 자세 → 관절 점 16개.
 * 가장 낮은 발바닥이 바닥(y=0)에 닿도록 몸 전체 높이를 맞춘다 (스쿼트·런지에서 발이 바닥을 뚫지 않게).
 */
export function solvePose(pose: PoseSpec): PosePoints {
  const pelvis = new Vector3(0, BODY.pelvisHeight, 0);

  // 몸통: 좌우로 기울인 뒤 앞으로 숙임 (몸 기준 왼쪽 기울기 = 위쪽이 +X로)
  const qTrunk = chain(rot(AXIS_X, pose.trunkFlex), rot(AXIS_Z, -pose.trunkSide));
  const chest = offset(pelvis, qTrunk, 0, BODY.spine, 0);

  const points = {} as PosePoints;

  for (const side of ["L", "R"] as const) {
    const s = side === "L" ? 1 : -1; // 몸 기준 왼쪽 = +X
    const limb = side === "L" ? pose.left : pose.right;

    // ── 다리 ──
    const hip = pelvis.clone().add(new Vector3(s * BODY.hipHalfWidth, -BODY.hipDrop, 0));
    const qHip = chain(
      rot(AXIS_X, -limbValue(limb, "hipFlex")), // 앞으로 들어 올림
      rot(AXIS_Z, s * limbValue(limb, "hipAbd")), // 바깥으로 벌림
      rot(AXIS_Y, s * limbValue(limb, "hipRot")), // 바깥 돌림 (허벅지 축 기준)
    );
    const knee = offset(hip, qHip, 0, -BODY.thigh, 0);
    const qKnee = qHip.clone().multiply(rot(AXIS_X, limbValue(limb, "kneeFlex"))); // 정강이를 뒤로 접음
    const ankle = offset(knee, qKnee, 0, -BODY.shin, 0);
    const qAnkle = qKnee.clone().multiply(rot(AXIS_X, -limbValue(limb, "ankleDorsi"))); // 발끝을 위로
    const toe = offset(ankle, qAnkle, 0, -0.05, BODY.footLength);

    // ── 팔 ── (몸통 회전을 따라간다)
    const shoulder = offset(chest, qTrunk, s * BODY.shoulderHalfWidth, 0.02, 0);
    const qShoulder = chain(
      qTrunk,
      rot(AXIS_Y, -s * limbValue(limb, "shoulderHorizAdd")), // 몸 반대쪽으로 가로지름
      rot(AXIS_Z, s * limbValue(limb, "shoulderAbd")), // 옆으로 들어 올림
      rot(AXIS_X, -limbValue(limb, "shoulderFlex")), // 앞으로 들어 올림
    );
    const elbow = offset(shoulder, qShoulder, 0, -BODY.upperArm, 0);
    const qElbow = qShoulder.clone().multiply(rot(AXIS_X, -limbValue(limb, "elbowFlex"))); // 아래팔을 앞으로 접음
    const wrist = offset(elbow, qElbow, 0, -BODY.forearm, 0);
    const qWrist = qElbow.clone().multiply(rot(AXIS_X, limbValue(limb, "wristExt"))); // 손등 쪽으로 젖힘
    const index = offset(wrist, qWrist, 0, -BODY.hand, 0);

    Object.assign(points, {
      [`hip${side}`]: hip,
      [`knee${side}`]: knee,
      [`ankle${side}`]: ankle,
      [`toe${side}`]: toe,
      [`shoulder${side}`]: shoulder,
      [`elbow${side}`]: elbow,
      [`wrist${side}`]: wrist,
      [`index${side}`]: index,
    });
  }

  // 바닥 맞춤: 가장 낮은 발바닥(발목 아래 또는 발끝)을 y=0으로
  const lowest = Math.min(
    points.ankleL.y - BODY.ankleHeight,
    points.ankleR.y - BODY.ankleHeight,
    points.toeL.y - 0.02,
    points.toeR.y - 0.02,
  );
  for (const id of KEYPOINT_IDS) points[id].y -= lowest;

  return points;
}

/** 차렷 자세 (모든 관절 0) */
export const REST_POSE: PoseSpec = { trunkFlex: 0, trunkSide: 0, left: {}, right: {} };

/** 관절 점 복사 */
export function clonePoints(points: PosePoints): PosePoints {
  const out = {} as PosePoints;
  for (const id of KEYPOINT_IDS) out[id] = points[id].clone();
  return out;
}

/** current를 target 쪽으로 t(0~1)만큼 옮긴다 (부드러운 자세 전환용, current를 직접 바꿈) */
export function lerpPointsInPlace(current: PosePoints, target: PosePoints, t: number): void {
  for (const id of KEYPOINT_IDS) current[id].lerp(target[id], t);
}
