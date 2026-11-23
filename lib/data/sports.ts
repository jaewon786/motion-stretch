// 종목·동작 데이터 — 화면 코드와 분리된 단 하나의 데이터 파일
// Design Ref: DESIGN 3-2 — PRD 5번 must 1 "종목, 동작, 정답 관절 각도는 데이터 파일 하나에서 관리"
// Plan SC: SC-1 — 4개 종목 × 서서 하는 동작 3개
//
// 작성 규칙 (PRD 5번 must 1 AI가 지킬 규칙)
// - 정답 관절 각도는 정상 가동 범위의 약 70% 이내 (아래 SAFE_RATIO, checkPoseSafety로 확인)
// - 서서 하는 동작만 (필요하면 의자·벽을 짚는 정도)
// - 한쪽씩 하는 동작(sided)은 "왼쪽 기준"으로 한 번만 적고, 오른쪽은 좌우 대칭으로 자동 생성
// - 동작마다 판정할 핵심 관절은 2~4개
// - 유지 시간은 동작마다 두지 않고 lib/config/thresholds.ts 의 HOLD_SEC 하나만 쓴다

import type { JointAngleId, LimbPose, PoseSpec, Side } from "@/lib/pose/types";

export type SportId = "soccer" | "running" | "basketball" | "tennis";

export type Facing = "front" | "side";

export type Move = {
  /** 동작 id (서버 교정 문구 요청의 moveId로도 쓴다) */
  id: string;
  /** 동작 이름 */
  name: string;
  /** 늘어나는 부위 */
  target: string;
  /** 주의사항 한 줄 */
  caution: string;
  /** 서는 방향: 카메라를 정면으로 볼지, 옆으로 설지 */
  facing: Facing;
  /** true면 왼쪽 → 오른쪽 두 단계로 나눠 진행 */
  sided: boolean;
  /** 정답 자세 (sided면 왼쪽을 늘리는 자세 기준) */
  pose: PoseSpec;
  /** 판정할 핵심 관절 2~4개 (sided면 왼쪽 기준) */
  keyJoints: JointAngleId[];
};

export type Sport = {
  id: SportId;
  name: string;
  emoji: string;
  /** 종목 카드에 쓰는 한 줄 설명 */
  summary: string;
  moves: Move[];
};

/** 실제 진행 단위. sided 동작은 왼쪽·오른쪽 두 단계가 된다. */
export type Step = {
  /** 단계 고유 키 (예: soccer-quad:left) */
  key: string;
  move: Move;
  /** 늘리는 쪽. 양쪽을 동시에 하는 동작이면 null */
  side: Side | null;
  /** 이 단계의 정답 자세 (오른쪽 단계는 좌우 대칭된 자세) */
  pose: PoseSpec;
  /** 이 단계의 핵심 관절 (오른쪽 단계는 R로 바뀐 id) */
  keyJoints: JointAngleId[];
};

/** 모든 동작에 공통으로 보여 주는 안전 안내 (PRD 5번, 7번 안전 고지) */
export const PAIN_WARNING = "통증이 느껴지면 즉시 멈추세요";

// ─────────────────────────────────────────────────────────────
// 안전 범위 (정상 가동 범위의 약 70%)
// ─────────────────────────────────────────────────────────────

/** 성인 정상 관절 가동 범위(도). [최소, 최대] */
const NORMAL_ROM: Record<keyof LimbPose, readonly [number, number]> = {
  shoulderFlex: [-60, 180],
  shoulderAbd: [0, 180],
  shoulderHorizAdd: [-45, 130],
  elbowFlex: [0, 150],
  wristExt: [-80, 70],
  hipFlex: [-30, 120],
  hipAbd: [-30, 45],
  hipRot: [-45, 45],
  kneeFlex: [0, 135],
  ankleDorsi: [-50, 20],
};
const NORMAL_TRUNK = {
  trunkFlex: [-30, 80] as const,
  trunkSide: [-35, 35] as const,
};

/** 정답 자세로 허용하는 비율 (PRD 5번: 약 70% 이내) */
export const SAFE_RATIO = 0.7;

/** 안전 범위를 넘은 항목 목록을 돌려준다. 빈 배열이면 안전 */
export function checkPoseSafety(pose: PoseSpec): string[] {
  const problems: string[] = [];
  const within = (name: string, value: number, [lo, hi]: readonly [number, number]) => {
    if (value > hi * SAFE_RATIO || value < lo * SAFE_RATIO) {
      problems.push(
        `${name}=${value}° (허용 ${Math.round(lo * SAFE_RATIO)}~${Math.round(hi * SAFE_RATIO)}°)`,
      );
    }
  };
  within("trunkFlex", pose.trunkFlex, NORMAL_TRUNK.trunkFlex);
  within("trunkSide", pose.trunkSide, NORMAL_TRUNK.trunkSide);
  for (const side of ["left", "right"] as const) {
    const limb = pose[side];
    for (const key of Object.keys(limb) as (keyof LimbPose)[]) {
      within(`${side}.${key}`, limb[key] ?? 0, NORMAL_ROM[key]);
    }
  }
  return problems;
}

// ─────────────────────────────────────────────────────────────
// 종목·동작 데이터 (PRD 5번 표 그대로)
// ─────────────────────────────────────────────────────────────

export const SPORTS: Sport[] = [
  {
    id: "soccer",
    name: "축구",
    emoji: "⚽",
    summary: "킥과 방향 전환에 쓰는 허벅지 앞·뒤·안쪽",
    moves: [
      {
        id: "soccer-quad",
        name: "서서 허벅지 앞 스트레칭",
        target: "허벅지 앞 (대퇴사두근)",
        caution: "두 무릎을 나란히 두고, 허리가 뒤로 꺾이지 않게 하세요",
        facing: "side",
        sided: true,
        // 왼발을 뒤로 접어 왼손으로 발목을 잡고, 오른팔은 옆으로 벌려 균형
        pose: {
          trunkFlex: 0,
          trunkSide: 0,
          left: { hipFlex: -10, kneeFlex: 94, shoulderFlex: -35, elbowFlex: 20 },
          right: { shoulderAbd: 40, elbowFlex: 10 },
        },
        keyJoints: ["kneeL", "hipL"],
      },
      {
        id: "soccer-hamstring",
        name: "서서 햄스트링 스트레칭",
        target: "허벅지 뒤 (햄스트링)",
        caution: "등을 곧게 편 채 엉덩이를 뒤로 빼며 숙이세요",
        facing: "side",
        sided: true,
        // 왼다리를 앞으로 뻗어 뒤꿈치를 대고 발끝을 세움, 오른 무릎은 살짝 굽힘, 상체를 앞으로 숙임
        pose: {
          trunkFlex: 40,
          trunkSide: 0,
          left: { hipFlex: 30, kneeFlex: 0, ankleDorsi: 14, shoulderFlex: 40, elbowFlex: 10 },
          right: { hipFlex: 20, kneeFlex: 25, shoulderFlex: 40, elbowFlex: 10 },
        },
        keyJoints: ["kneeL", "hipL", "trunkForward"],
      },
      {
        id: "soccer-adductor",
        name: "사이드 런지",
        target: "허벅지 안쪽 (내전근)",
        caution: "굽힌 무릎이 발끝보다 앞으로 나가지 않게 하세요",
        facing: "front",
        sided: true,
        // 왼다리를 옆으로 곧게 펴고, 오른 무릎을 굽혀 체중을 오른쪽으로 옮김
        pose: {
          trunkFlex: 15,
          trunkSide: 0,
          left: { hipAbd: 30, kneeFlex: 0, shoulderFlex: 60, elbowFlex: 30 },
          right: { hipAbd: 25, hipFlex: 50, kneeFlex: 80, shoulderFlex: 60, elbowFlex: 30 },
        },
        keyJoints: ["kneeL", "kneeR", "hipL"],
      },
    ],
  },
  {
    id: "running",
    name: "러닝",
    emoji: "🏃",
    summary: "착지와 보폭을 받쳐 주는 종아리·고관절·엉덩이",
    moves: [
      {
        id: "running-calf",
        name: "벽 짚고 종아리 스트레칭",
        target: "종아리 (비복근)",
        caution: "뒤꿈치를 바닥에서 떼지 말고, 발끝은 정면을 향하게 하세요",
        facing: "side",
        sided: true,
        // 왼다리를 뒤로 곧게 뻗어 뒤꿈치를 누르고, 오른 무릎을 굽혀 두 손으로 앞(벽)을 짚음
        pose: {
          trunkFlex: 15,
          trunkSide: 0,
          left: { hipFlex: -20, kneeFlex: 0, ankleDorsi: 14, shoulderFlex: 90, elbowFlex: 20 },
          right: { hipFlex: 40, kneeFlex: 45, shoulderFlex: 90, elbowFlex: 20 },
        },
        keyJoints: ["kneeL", "ankleL", "kneeR"],
      },
      {
        id: "running-hipflexor",
        name: "런지 자세 고관절 앞쪽 스트레칭",
        target: "고관절 앞쪽 (장요근)",
        caution: "상체를 세우고, 골반을 앞으로 살짝 밀어 주세요",
        facing: "side",
        sided: true,
        // 왼다리를 뒤로 보내고 오른 무릎을 굽힌 선 런지, 두 손은 허리에
        pose: {
          trunkFlex: 0,
          trunkSide: 0,
          left: { hipFlex: -20, kneeFlex: 20, shoulderAbd: 25, elbowFlex: 90 },
          right: { hipFlex: 60, kneeFlex: 85, shoulderAbd: 25, elbowFlex: 90 },
        },
        keyJoints: ["hipL", "kneeR", "trunkForward"],
      },
      {
        id: "running-figure4",
        name: "의자 잡고 4자 엉덩이 스트레칭",
        target: "엉덩이 (둔근·이상근)",
        caution: "의자나 벽을 꼭 잡고, 엉덩이를 천천히 뒤로 빼세요",
        facing: "front",
        sided: true,
        // 왼발목을 오른 무릎 위에 걸고(4자), 오른 무릎을 굽혀 엉덩이를 뒤로 뺌, 두 손은 앞(의자)
        pose: {
          trunkFlex: 25,
          trunkSide: 0,
          left: { hipFlex: 70, hipRot: 30, kneeFlex: 90, shoulderFlex: 60, elbowFlex: 15 },
          right: { hipFlex: 60, kneeFlex: 70, shoulderFlex: 60, elbowFlex: 15 },
        },
        keyJoints: ["kneeR", "hipL", "kneeL"],
      },
    ],
  },
  {
    id: "basketball",
    name: "농구",
    emoji: "🏀",
    summary: "점프·리바운드에 쓰는 옆구리·하체·어깨",
    moves: [
      {
        id: "basketball-sidebend",
        name: "팔 위로 뻗어 옆구리 스트레칭",
        target: "옆구리 (광배근·복사근)",
        caution: "상체가 앞으로 숙여지지 않게 옆으로만 기울이세요",
        facing: "front",
        sided: true,
        // 왼팔을 머리 위로 뻗고 몸을 오른쪽으로 기울임, 오른손은 허리에
        pose: {
          trunkFlex: 0,
          trunkSide: -24,
          left: { shoulderAbd: 125, elbowFlex: 10 },
          right: { shoulderAbd: 25, elbowFlex: 90 },
        },
        keyJoints: ["shoulderL", "trunkSide"],
      },
      {
        id: "basketball-squat",
        name: "깊은 스쿼트 유지",
        target: "발목·고관절",
        caution: "뒤꿈치를 붙인 채 편한 깊이까지만 앉으세요",
        facing: "front",
        sided: false,
        // 두 발을 어깨너비로 벌리고 앉은 자세, 두 팔은 앞으로
        pose: {
          trunkFlex: 30,
          trunkSide: 0,
          left: { hipFlex: 84, hipAbd: 15, kneeFlex: 94, ankleDorsi: 14, shoulderFlex: 80 },
          right: { hipFlex: 84, hipAbd: 15, kneeFlex: 94, ankleDorsi: 14, shoulderFlex: 80 },
        },
        keyJoints: ["kneeL", "kneeR", "hipL", "hipR"],
      },
      {
        id: "basketball-crossbody",
        name: "팔 가로질러 어깨 스트레칭",
        target: "어깨 뒤쪽 (후면 삼각근)",
        caution: "어깨를 으쓱 올리지 말고 팔꿈치 위쪽을 당기세요",
        facing: "front",
        sided: true,
        // 왼팔을 앞으로 들어 가슴 앞으로 가로지르고, 오른팔로 감싸 당김
        pose: {
          trunkFlex: 0,
          trunkSide: 0,
          left: { shoulderFlex: 90, shoulderHorizAdd: 40, elbowFlex: 5 },
          right: { shoulderFlex: 70, shoulderHorizAdd: 30, elbowFlex: 100 },
        },
        keyJoints: ["shoulderAcrossL", "elbowL"],
      },
    ],
  },
  {
    id: "tennis",
    name: "테니스",
    emoji: "🎾",
    summary: "스윙과 서브에 쓰는 팔·가슴·손목",
    moves: [
      {
        id: "tennis-triceps",
        name: "팔 머리 뒤로 삼두근 스트레칭",
        target: "위팔 뒤쪽 (삼두근)",
        caution: "고개를 숙이지 말고, 팔꿈치를 천천히 눌러 주세요",
        facing: "front",
        sided: true,
        // 왼팔을 위로 들어 팔꿈치를 굽혀 손을 머리 뒤로, 오른손으로 왼 팔꿈치를 받침
        pose: {
          trunkFlex: 0,
          trunkSide: 0,
          left: { shoulderFlex: 125, elbowFlex: 105 },
          right: { shoulderFlex: 110, shoulderHorizAdd: 30, elbowFlex: 100 },
        },
        keyJoints: ["shoulderL", "elbowL"],
      },
      {
        id: "tennis-chest",
        name: "뒤로 깍지 껴 가슴 열기",
        target: "가슴·어깨 앞쪽 (대흉근)",
        caution: "허리를 젖히지 말고 가슴만 앞으로 내미세요",
        facing: "side",
        sided: false,
        // 두 손을 등 뒤에서 깍지 끼고 팔을 뒤로 뻗음
        pose: {
          trunkFlex: 0,
          trunkSide: 0,
          left: { shoulderFlex: -40, elbowFlex: 5 },
          right: { shoulderFlex: -40, elbowFlex: 5 },
        },
        keyJoints: ["shoulderL", "shoulderR", "elbowL"],
      },
      {
        id: "tennis-wrist",
        name: "팔 앞으로 뻗어 손목·전완 스트레칭",
        target: "아래팔 안쪽 (손목 굽힘근)",
        caution: "팔꿈치를 편 채 손가락을 천천히 몸 쪽으로 당기세요",
        facing: "front",
        sided: true,
        // 왼팔을 앞으로 곧게 뻗어 손바닥을 위로, 오른손으로 손가락을 아래로 당김
        pose: {
          trunkFlex: 0,
          trunkSide: 0,
          left: { shoulderFlex: 90, elbowFlex: 0, wristExt: 49 },
          right: { shoulderFlex: 80, shoulderHorizAdd: 20, elbowFlex: 30 },
        },
        keyJoints: ["elbowL", "shoulderL", "wristL"],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// 좌우 대칭과 단계 펼치기
// ─────────────────────────────────────────────────────────────

/** 관절 id의 왼쪽↔오른쪽을 바꾼다 (몸통 관절은 그대로) */
export function mirrorJointId(id: JointAngleId): JointAngleId {
  if (id.endsWith("L")) return (id.slice(0, -1) + "R") as JointAngleId;
  if (id.endsWith("R")) return (id.slice(0, -1) + "L") as JointAngleId;
  return id;
}

/** 정답 자세의 왼쪽↔오른쪽을 바꾼다. 좌우 기울기는 부호가 반대가 된다 */
export function mirrorPose(pose: PoseSpec): PoseSpec {
  return {
    trunkFlex: pose.trunkFlex,
    trunkSide: -pose.trunkSide,
    left: { ...pose.right },
    right: { ...pose.left },
  };
}

/** 종목 id로 종목을 찾는다. 없으면 undefined */
export function getSport(id: string): Sport | undefined {
  return SPORTS.find((s) => s.id === id);
}

/** 동작 id로 동작을 찾는다 (서버 형식 검사에도 쓴다) */
export function getMove(id: string): Move | undefined {
  for (const sport of SPORTS) {
    const move = sport.moves.find((m) => m.id === id);
    if (move) return move;
  }
  return undefined;
}

/** 종목의 동작을 진행 단계로 펼친다. sided 동작은 왼쪽 → 오른쪽 두 단계 */
export function getSteps(sport: Sport): Step[] {
  return sport.moves.flatMap((move): Step[] => {
    if (!move.sided) {
      return [{ key: move.id, move, side: null, pose: move.pose, keyJoints: move.keyJoints }];
    }
    return [
      { key: `${move.id}:left`, move, side: "left", pose: move.pose, keyJoints: move.keyJoints },
      {
        key: `${move.id}:right`,
        move,
        side: "right",
        pose: mirrorPose(move.pose),
        keyJoints: move.keyJoints.map(mirrorJointId),
      },
    ];
  });
}
