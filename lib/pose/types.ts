// 자세(포즈) 관련 공용 타입
// Design Ref: DESIGN 3-2(PoseSpec), 3-3(판정 관절 각도 id)

/** 사용자 몸 기준 왼쪽/오른쪽 */
export type Side = "left" | "right";

/**
 * 판정에 쓰는 관절 각도 id (DESIGN 3-3)
 * - L/R은 항상 "사용자(또는 마네킹) 몸 기준" 왼쪽/오른쪽이다. 화면의 거울 반전과 무관하다.
 */
export type JointAngleId =
  | "kneeL" | "kneeR" // 엉덩이–무릎–발목
  | "hipL" | "hipR" // 어깨–엉덩이–무릎
  | "ankleL" | "ankleR" // 무릎–발목–발끝
  | "elbowL" | "elbowR" // 어깨–팔꿈치–손목
  | "wristL" | "wristR" // 팔꿈치–손목–검지 끝
  | "shoulderL" | "shoulderR" // 엉덩이–어깨–팔꿈치 (팔 들어 올림)
  | "shoulderAcrossL" | "shoulderAcrossR" // 반대 어깨–어깨–팔꿈치 (팔 가로지름)
  | "trunkSide" // 몸통 좌우 기울기 (몸 기준 왼쪽 +, 오른쪽 −)
  | "trunkForward"; // 몸통 앞으로 숙임 (앞 +)

/**
 * 한쪽 팔다리의 해부학적 관절 각도(도). 적지 않은 값은 0(차렷 자세)으로 본다.
 * 마네킹 회전값으로 바꾸는 일은 포즈 엔진(lib/pose/skeleton.ts, PLAN 작업 2)이 맡는다.
 */
export type LimbPose = {
  /** 어깨 굽힘: 팔을 앞으로 들어 올림(+), 뒤로 뻗음(−) */
  shoulderFlex: number;
  /** 어깨 벌림: 팔을 옆으로 들어 올림(+) */
  shoulderAbd: number;
  /** 어깨 수평 모음: 앞으로 든 팔을 몸 반대쪽으로 가로질러 당김(+) */
  shoulderHorizAdd: number;
  /** 팔꿈치 굽힘(+) */
  elbowFlex: number;
  /** 손목 젖힘(+): 손등 쪽으로 꺾음 */
  wristExt: number;
  /** 엉덩이 굽힘: 다리를 앞으로 들어 올림(+), 뒤로 뻗음(−) */
  hipFlex: number;
  /** 엉덩이 벌림: 다리를 옆으로 벌림(+) */
  hipAbd: number;
  /** 엉덩이 바깥 돌림(+): 무릎이 바깥을 향하게 돌림 */
  hipRot: number;
  /** 무릎 굽힘(+) */
  kneeFlex: number;
  /** 발목 발등 굽힘(+): 발끝을 정강이 쪽으로 당김 */
  ankleDorsi: number;
};

/** 정답 자세 = 몸통 + 왼쪽·오른쪽 팔다리 (DESIGN 3-2) */
export type PoseSpec = {
  /** 몸통 앞으로 숙임(+) */
  trunkFlex: number;
  /** 몸통 좌우 기울임: 몸 기준 왼쪽(+), 오른쪽(−) */
  trunkSide: number;
  left: Partial<LimbPose>;
  right: Partial<LimbPose>;
};
