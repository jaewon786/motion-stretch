// 접속지(IP)당 분당 요청 제한 — 메모리 Map, 1분 미끄러지는 창
// Design Ref: DESIGN 3-4 "접속지당 분당 30회 초과 → 429", PRD 7번 "누구나 호출해 OpenAI 비용을 쓰지 못하도록"
// 한계(최선 노력 수준): Vercel 서버 기능은 여러 개로 나뉘어 실행되고 다시 시작되면 메모리가 비므로
// 완전한 제한은 아니다. 실제 서비스로 만들 때는 Vercel 방화벽 규칙이나 외부 저장소 기반 제한을 쓴다 (CHECK.md에 기록).

import { COACH_RATE_PER_MIN } from "@/lib/config/thresholds";

const WINDOW_MS = 60_000;
/** 메모리가 끝없이 늘지 않게 기억하는 접속지 수 상한 */
const MAX_KEYS = 10_000;

const hits = new Map<string, number[]>();

/**
 * 요청 한 번을 기록하고, 허용되면 true
 * @param key 접속지 식별값 (IP). 저장만 하고 로그에는 남기지 않는다
 */
export function allowRequest(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= COACH_RATE_PER_MIN) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > MAX_KEYS) prune(now);
  return true;
}

/** 1분 넘게 조용한 접속지를 지우고, 그래도 많으면 오래된 것부터 지운다 */
function prune(now: number) {
  for (const [k, times] of hits) {
    if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  while (hits.size > MAX_KEYS) {
    const oldest = hits.keys().next().value;
    if (oldest === undefined) break;
    hits.delete(oldest);
  }
}

/** 점검용: 기록 비우기 */
export function resetRateLimit() {
  hits.clear();
}
