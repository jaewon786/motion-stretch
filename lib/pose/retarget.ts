// MediaPipe 3D 좌표 → 마네킹 관절 점 16개 (거울 표시는 무대에서 한다)
// Design Ref: DESIGN 2 처리 3a, DESIGN 6 retarget.ts
// - MediaPipe 3D 좌표(world): 미터 단위, 엉덩이 가운데가 원점, x = 사람 몸 기준 왼쪽, y = 아래, z = 카메라에서 멀어지는 쪽
// - 이 앱의 좌표(lib/pose/skeleton.ts): x = 몸 기준 왼쪽, y = 위, z = 몸 앞쪽(카메라를 보고 서면 카메라 쪽)
//   → (x, y, z) 를 (x, −y, −z) 로 바꾸고, 발바닥이 바닥(y=0)에 닿게 높이를 맞춘다.
// - 왼쪽/오른쪽은 사람 몸 기준 그대로 둔다. 판정에 쓰는 각도도 이 점으로 잰다 (DESIGN 3-3).

import { Vector3 } from "three";
import type { Landmark } from "@mediapipe/tasks-vision";
import { BODY, KEYPOINT_IDS, type KeypointId, type PosePoints } from "./skeleton";

/** 관절 점 이름 → MediaPipe 관절 번호 (왼쪽/오른쪽은 사람 몸 기준으로 MediaPipe와 같다) */
export const MP_INDEX: Record<KeypointId, number> = {
  shoulderL: 11, shoulderR: 12,
  elbowL: 13, elbowR: 14,
  wristL: 15, wristR: 16,
  indexL: 19, indexR: 20,
  hipL: 23, hipR: 24,
  kneeL: 25, kneeR: 26,
  ankleL: 27, ankleR: 28,
  toeL: 31, toeR: 32,
};

/** MediaPipe 결과의 보임 정도(0~1) → 관절 점별 보임 정도 (판정 제외에 사용, DESIGN 2 처리 2) */
export function visibilityOf(image: { visibility?: number }[]): Record<KeypointId, number> {
  const out = {} as Record<KeypointId, number>;
  for (const id of KEYPOINT_IDS) out[id] = image[MP_INDEX[id]]?.visibility ?? 0;
  return out;
}

/** MediaPipe 3D 좌표 → 관절 점 (바닥 맞춤 포함). 새 객체를 돌려준다 */
export function worldToPoints(world: Landmark[]): PosePoints {
  const points = {} as PosePoints;
  for (const id of KEYPOINT_IDS) {
    const lm = world[MP_INDEX[id]];
    points[id] = new Vector3(lm.x, -lm.y, -lm.z);
  }
  // 가장 낮은 발바닥(발목 아래 또는 발끝)을 y = 0 으로 (정답 마네킹과 같은 규칙)
  const lowest = Math.min(
    points.ankleL.y - BODY.ankleHeight,
    points.ankleR.y - BODY.ankleHeight,
    points.toeL.y - 0.02,
    points.toeR.y - 0.02,
  );
  for (const id of KEYPOINT_IDS) points[id].y -= lowest;
  return points;
}

/**
 * 떨림 줄이기 필터 (One Euro Filter)
 * - 천천히 움직일 때는 많이 부드럽게(떨림 제거), 빠르게 움직일 때는 덜 부드럽게(늦게 따라오지 않게)
 */
class OneEuro {
  private x: number | null = null;
  private dx = 0;
  /** 낮을수록 가만히 있을 때 더 부드럽다 */
  private minCutoff = 1.2;
  /** 높을수록 빠른 움직임에 빨리 반응한다 */
  private beta = 0.6;
  private dCutoff = 1.0;
  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(value: number, dt: number): number {
    if (this.x === null || dt <= 0) {
      this.x = value;
      return value;
    }
    const dxRaw = (value - this.x) / dt;
    this.dx += this.alpha(this.dCutoff, dt) * (dxRaw - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += this.alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
}

/** 관절 점 16개 × (x, y, z) 에 떨림 필터를 건다. 인식할 때마다 같은 객체를 다시 쓴다 */
export class PointsSmoother {
  private filters = new Map<string, OneEuro>();
  private lastTime = -1;
  private out: PosePoints | null = null;

  /** @param time 인식 시각(ms). 같은 시각이 다시 오면 계산하지 않고 이전 결과를 돌려준다 */
  update(raw: PosePoints, time: number): PosePoints {
    if (time === this.lastTime && this.out) return this.out;
    const dt = this.lastTime < 0 ? 0 : (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (!this.out) {
      this.out = {} as PosePoints;
      for (const id of KEYPOINT_IDS) this.out[id] = new Vector3();
    }
    for (const id of KEYPOINT_IDS) {
      const v = raw[id];
      this.out[id].set(this.f(id, "x").filter(v.x, dt), this.f(id, "y").filter(v.y, dt), this.f(id, "z").filter(v.z, dt));
    }
    return this.out;
  }

  private f(id: KeypointId, axis: "x" | "y" | "z") {
    const key = id + axis;
    let filter = this.filters.get(key);
    if (!filter) {
      filter = new OneEuro();
      this.filters.set(key, filter);
    }
    return filter;
  }
}
