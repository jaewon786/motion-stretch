// 교정 문구 서버 기능 — POST /api/coach
// Design Ref: DESIGN 3-4 — 형식 검사 → 횟수 제한 → 기본 문구 준비 → OpenAI(1.5초 제한) → 출력 검사 → {text, source}
// Plan SC: SC-6(영상·좌표 없이 각도 차이 숫자만), SC-7(키가 없거나 실패해도 기본 문구)
// 보안 규칙 (CLAUDE.md 앱 고유 규칙, PRD 7번)
// - OPENAI_API_KEY는 이 서버 파일에서만 읽는다 (NEXT_PUBLIC_ 아님)
// - 프롬프트에는 사용자 글을 넣지 않는다. 서버가 동작 이름과 사실 문장을 직접 만든다 (프롬프트 인젝션 차단)
// - 요청·응답 내용과 IP는 저장하거나 console.log로 남기지 않는다

import { COACH_SERVER_TIMEOUT_MS, GREEN_DEG } from "@/lib/config/thresholds";
import { mirrorPose } from "@/lib/data/sports";
import { computeAngles } from "@/lib/pose/angles";
import { solvePose } from "@/lib/pose/skeleton";
import { factText, ruleText, type WorstJoint } from "@/lib/coach/ruleText";
import { checkCoachText, parseCoachRequest } from "@/lib/coach/validate";
import { allowRequest } from "@/lib/coach/rateLimit";

/**
 * 기본 모델 — 1.5초 안에 답해야 해서 직접 재 보고 골랐다 (2026-11-24, 4회 평균):
 * gpt-5.4-mini(추론 none) 약 1.0초 · gpt-5.4-nano 약 1.25초 · gpt-4.1-mini 약 1.5초 · gpt-4o-mini 약 1.5초
 * .env의 OPENAI_MODEL로 바꿀 수 있다.
 */
const DEFAULT_MODEL = "gpt-5.4-mini";

/** 모델 계열별 요청 옵션: gpt-5 계열은 추론을 끄거나 최소로 해야 빠르다 */
function modelOptions(model: string) {
  if (model.startsWith("gpt-5")) {
    return { max_completion_tokens: 200, reasoning_effort: model.startsWith("gpt-5.4") ? "none" : "minimal" };
  }
  return { max_tokens: 60, temperature: 0.4 };
}

/** 요청 본문 크기 상한(글자 수) — 정상 요청은 수백 글자 */
const MAX_BODY_CHARS = 2048;

const SYSTEM_PROMPT = [
  "너는 스트레칭 자세를 바로잡아 주는 친절한 코치다.",
  "주어진 '해야 할 일'을 존댓말 한국어 한 문장으로 부드럽게 바꿔 말한다.",
  "40자 이내, 문장 하나만 출력하고 따옴표·설명·이모지는 붙이지 않는다.",
  "왼쪽/오른쪽과 굽히기/펴기 같은 방향은 절대 바꾸지 않는다.",
  "의학적 진단·치료 표현, 통증을 참거나 더 세게 밀라는 말은 하지 않는다.",
].join(" ");

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** 접속지 식별값 (Vercel은 x-forwarded-for 첫 값이 실제 접속지) */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  // 1) 형식 검사 — 크기·JSON·필드 (DESIGN 3-4 400 조건)
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY_CHARS) return json({ error: "invalid_input" }, 400);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const parsed = parseCoachRequest(body);
  if (!parsed) return json({ error: "invalid_input" }, 400);
  const { request: req, move } = parsed;

  // 2) 횟수 제한 — 접속지당 분당 30회 (최선 노력 수준, rateLimit.ts 주석 참고)
  if (!allowRequest(clientKey(request))) return json({ error: "rate_limited" }, 429);

  // 3) 기본 문구 준비 — 가장 많이 어긋난 관절 1개, 정답 각도는 정답 마네킹과 같은 함수로 잰다 (DESIGN 3-2)
  const pose = req.side === "right" ? mirrorPose(move.pose) : move.pose;
  const target = computeAngles(solvePose(pose));
  const top = req.diffs.reduce((a, b) => (Math.abs(b.diff) > Math.abs(a.diff) ? b : a));
  const worst: WorstJoint = { joint: top.joint, diff: top.diff, target: target[top.joint] };
  const rule = () => json({ text: ruleText(worst), source: "rule" });

  // 키가 없거나(SC-7) 이미 정답 범위(±15°) 안이면 AI를 부르지 않는다
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || Math.abs(worst.diff) <= GREEN_DEG) return rule();

  // 4) OpenAI 호출 — 1.5초 넘으면 끊고 기본 문구
  const sideName = req.side === "left" ? " (왼쪽)" : req.side === "right" ? " (오른쪽)" : "";
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COACH_SERVER_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        ...modelOptions(model),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `동작: ${move.name}${sideName}\n${factText(worst)}` },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return rule();
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    // 5) 출력 검사 — 한글·한 문장·40자·금지어 (DESIGN 3-4)
    const text = checkCoachText(data.choices?.[0]?.message?.content);
    return text ? json({ text, source: "ai" }) : rule();
  } catch {
    return rule(); // 시간 초과·네트워크 오류
  } finally {
    clearTimeout(timer);
  }
}
