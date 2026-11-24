// 규칙 기반 기본 교정 문구 + 관절별 방향표 (작업 12 최소 범위를 작업 13 안에 포함 — 사용자 결정)
// Design Ref: DESIGN 3-3 "차이의 부호 규칙", "관절별 문구 방향표는 lib/coach/ruleText.ts에 한 번만 정의하고,
//             서버의 AI 프롬프트 문장도 이 표로 만든다", DESIGN 2 처리 6(즉시: 규칙 기반 기본 문구)
// Plan SC: SC-7 — 교정 문구가 항상 보임 (AI가 늦거나 실패하면 이 문구)
// 왼쪽/오른쪽은 항상 사용자 몸 기준이다 (PRD 5번). 브라우저·서버 모두 쓰므로 three 등 무거운 모듈을 가져오지 않는다.

import { GREEN_DEG } from "@/lib/config/thresholds";
import type { JointAngleId } from "@/lib/pose/types";

/** 관절 종류별 문구 규칙 */
type Kind = "bend" | "shoulder" | "across" | "trunkSide" | "trunkForward";

/** 관절 → (종류, 문구에 쓰는 이름) */
const JOINTS: Record<JointAngleId, { kind: Kind; noun: string }> = {
  kneeL: { kind: "bend", noun: "왼쪽 무릎" },
  kneeR: { kind: "bend", noun: "오른쪽 무릎" },
  hipL: { kind: "bend", noun: "왼쪽 고관절" },
  hipR: { kind: "bend", noun: "오른쪽 고관절" },
  ankleL: { kind: "bend", noun: "왼쪽 발목" },
  ankleR: { kind: "bend", noun: "오른쪽 발목" },
  elbowL: { kind: "bend", noun: "왼쪽 팔꿈치" },
  elbowR: { kind: "bend", noun: "오른쪽 팔꿈치" },
  wristL: { kind: "bend", noun: "왼쪽 손목" },
  wristR: { kind: "bend", noun: "오른쪽 손목" },
  shoulderL: { kind: "shoulder", noun: "왼팔" },
  shoulderR: { kind: "shoulder", noun: "오른팔" },
  shoulderAcrossL: { kind: "across", noun: "왼팔" },
  shoulderAcrossR: { kind: "across", noun: "오른팔" },
  trunkSide: { kind: "trunkSide", noun: "몸통" },
  trunkForward: { kind: "trunkForward", noun: "상체" },
};

/** 받침이 있으면 '을', 없으면 '를' */
function eul(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "을";
  return code % 28 === 0 ? "를" : "을";
}

/** 판정 결과가 모두 맞을 때 */
export const GOOD_TEXT = "좋아요, 그 자세 그대로 유지하세요";
/** 판정할 관절이 없을 때 (DESIGN 7 "핵심 부위가 보이게 서 주세요") */
export const NO_JOINT_TEXT = "핵심 부위가 카메라에 보이게 서 주세요";

/**
 * 한 관절의 교정 문구 (DESIGN 3-3 부호 규칙: diff = 내 각도 − 정답 각도)
 * @param target 정답 각도 — 몸통 기울기는 방향이 있어서 정답 쪽을 알아야 한다
 */
export function jointText(joint: JointAngleId, diff: number, target: number): string {
  const { kind, noun } = JOINTS[joint];
  const obj = `${noun}${eul(noun)}`;
  switch (kind) {
    case "bend":
      // 3점 각도: diff < 0 → 정답보다 더 굽음 → 펴기, diff > 0 → 덜 굽음 → 굽히기
      return diff < 0 ? `${obj} 조금 더 펴 주세요` : `${obj} 조금 더 굽혀 주세요`;
    case "shoulder":
      return diff < 0 ? `${obj} 조금 더 올려 주세요` : `${obj} 조금 내려 주세요`;
    case "across":
      // 반대 어깨–어깨–팔꿈치 각: 클수록 덜 가로지름
      return diff > 0 ? `${obj} 몸 쪽으로 더 당겨 주세요` : `${obj} 조금 덜 당겨 주세요`;
    case "trunkSide":
    case "trunkForward": {
      const mine = target + diff;
      const verb = kind === "trunkSide" ? "기울여" : "숙여";
      // 정답이 거의 똑바로 선 자세면 방향 대신 "세우기"
      if (Math.abs(target) < GREEN_DEG) return `${obj} 똑바로 세워 주세요`;
      const where = kind === "trunkSide" ? (target > 0 ? "왼쪽으로 " : "오른쪽으로 ") : "앞으로 ";
      // 정답 방향으로 덜 갔으면 "더", 더 갔으면 "덜"
      const along = mine * Math.sign(target);
      return along < Math.abs(target) ? `${obj} ${where}조금 더 ${verb} 주세요` : `${obj} 조금 덜 ${verb} 주세요`;
    }
  }
}

export type WorstJoint = { joint: JointAngleId; diff: number; target: number };

/** 화면에 바로 보여 줄 기본 문구 — 가장 많이 어긋난 관절 하나 기준 */
export function ruleText(worst: WorstJoint | null): string {
  if (!worst) return NO_JOINT_TEXT;
  if (Math.abs(worst.diff) <= GREEN_DEG) return GOOD_TEXT;
  return jointText(worst.joint, worst.diff, worst.target);
}

/**
 * AI 프롬프트에 넣을 사실 문장 (DESIGN 3-4: 서버가 만들고 AI는 부드럽게 바꾸기만 한다)
 * 예: "왼쪽 무릎 각도가 정답과 22° 다름. 해야 할 일: 왼쪽 무릎을 조금 더 펴 주세요"
 */
export function factText(worst: WorstJoint): string {
  const { noun } = JOINTS[worst.joint];
  return `${noun} 각도가 정답과 ${Math.round(Math.abs(worst.diff))}° 다름. 해야 할 일: ${jointText(worst.joint, worst.diff, worst.target)}`;
}
