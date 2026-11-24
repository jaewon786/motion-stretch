// 교정 문구 요청 형식 검사 · AI 출력 문구 검사 (서버·브라우저 공용)
// Design Ref: DESIGN 3-4 — 형식 오류(모르는 moveId·joint, diff가 −180~180 밖, 항목 1~4개 아님) → 400
//             출력 검사: ① 한글 ② 한 문장 ③ 40자 이내 ④ 금지어 없음
// PRD 7번: 서버로 오는 값은 동작 id·방향·관절 이름·각도 차이 숫자뿐이다. 그 밖의 값은 받지 않는다.

import { COACH_MAX_CHARS } from "@/lib/config/thresholds";
import { getMove, mirrorJointId, type Move } from "@/lib/data/sports";
import type { JointAngleId, Side } from "@/lib/pose/types";

export type CoachDiff = { joint: JointAngleId; diff: number };

export type CoachRequest = {
  moveId: string;
  /** 한쪽씩 하는 동작이면 left/right, 아니면 null */
  side: Side | null;
  diffs: CoachDiff[];
};

/** 요청 한 번에 받는 관절 차이 개수 (핵심 관절 2~4개 기준) */
const MAX_DIFFS = 4;

/** 이 동작·방향에서 판정하는 핵심 관절 (오른쪽 단계는 R로 바뀐 id) */
export function keyJointsOf(move: Move, side: Side | null): JointAngleId[] {
  return side === "right" ? move.keyJoints.map(mirrorJointId) : move.keyJoints;
}

/**
 * 요청 본문 검사. 통과하면 정리된 요청을, 아니면 null
 * - 모르는 필드는 버리고 필요한 값만 새 객체로 옮긴다 (그 밖의 값이 AI나 로그로 흘러가지 않게)
 */
export function parseCoachRequest(body: unknown): { request: CoachRequest; move: Move } | null {
  if (typeof body !== "object" || body === null) return null;
  const { moveId, side, diffs } = body as Record<string, unknown>;
  if (typeof moveId !== "string" || moveId.length > 64) return null;
  const move = getMove(moveId);
  if (!move) return null;

  // 방향: 한쪽씩 하는 동작은 left/right 필수, 양쪽 동작은 null
  let parsedSide: Side | null;
  if (move.sided) {
    if (side !== "left" && side !== "right") return null;
    parsedSide = side;
  } else {
    if (side !== null && side !== undefined) return null;
    parsedSide = null;
  }

  if (!Array.isArray(diffs) || diffs.length < 1 || diffs.length > MAX_DIFFS) return null;
  const allowed = keyJointsOf(move, parsedSide);
  const seen = new Set<string>();
  const parsed: CoachDiff[] = [];
  for (const item of diffs) {
    if (typeof item !== "object" || item === null) return null;
    const { joint, diff } = item as Record<string, unknown>;
    if (typeof joint !== "string" || !allowed.includes(joint as JointAngleId) || seen.has(joint)) return null;
    if (typeof diff !== "number" || !Number.isFinite(diff) || diff < -180 || diff > 180) return null;
    seen.add(joint);
    parsed.push({ joint: joint as JointAngleId, diff });
  }
  return { request: { moveId: move.id, side: parsedSide, diffs: parsed }, move };
}

/** AI 출력 금지어 (DESIGN 3-4) — 의학적 판단·무리한 동작 권유를 막는다 */
export const BANNED_WORDS = [
  "진단",
  "처방",
  "치료",
  "질환",
  "부상입니다",
  "파열",
  "염증",
  "참고",
  "참으",
  "통증을 무시",
  "더 세게",
  "끝까지 밀",
];

/**
 * AI가 만든 문구 정리 + 검사. 통과하면 정리된 문구, 아니면 null (→ 기본 문구 사용)
 */
export function checkCoachText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // 앞뒤 공백·따옴표만 걷어 낸다
  const text = raw.trim().replace(/^["'“”‘’「」]+|["'“”‘’「」]+$/g, "").trim();
  if (!text) return null;
  if (!/[가-힣]/.test(text)) return null; // ① 한글
  if (/[\r\n]/.test(text)) return null; // ② 한 문장: 줄바꿈 없음
  if ((text.match(/[.!?。]/g) ?? []).length >= 2) return null; //    마침표 2개 이상 없음
  if ([...text].length > COACH_MAX_CHARS) return null; // ③ 40자 이내
  if (BANNED_WORDS.some((w) => text.includes(w))) return null; // ④ 금지어
  return text;
}
