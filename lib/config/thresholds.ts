// 판정 기준값 — 이 파일 한곳에서만 정의한다.
// Design Ref: DESIGN 3-1 — PRD 5번 "판정 기준값은 한곳에서 정의한다" 규칙
// 다른 파일은 숫자를 직접 쓰지 말고 반드시 여기서 가져다 쓴다.

/** 정답과의 차이가 ±15° 안이면 초록(맞음) */
export const GREEN_DEG = 15;

/** ±30° 안이면 노랑, 넘으면 빨강. 관절 점수가 0점이 되는 기준 */
export const YELLOW_DEG = 30;

/** 자세 확인 기준 일치도(%) — Plan SC: SC-4 */
export const PASS_SCORE = 80;

/** 자세 확인에 필요한 유지 시간(초) — Plan SC: SC-4 */
export const CONFIRM_SEC = 3;

/** 자세 확인 중 봐주는 흔들림 시간(초) */
export const GRACE_SEC = 0.5;

/** 자세 확인 후 유지 타이머(초). 동작마다 따로 두지 않고 이 값 하나만 쓴다 — Plan SC: SC-4 */
export const HOLD_SEC = 15;

/** 동작 단계 시작 후 [건너뛰기] 버튼이 나오는 시간(초) */
export const SKIP_AFTER_SEC = 30;

/** 동작 시작 전 서는 방향 안내를 보여 주는 시간(초) — DESIGN 2-1 orient 상태 */
export const ORIENT_SEC = 3;

/** 어두움 안내까지 걸리는 시간(초) */
export const LOW_LIGHT_SEC = 3;

/** 이보다 보임 정도가 낮은 관절은 판정에서 제외 */
export const MIN_VISIBILITY = 0.5;

/** 전체 관절 평균 보임 정도가 이보다 낮은 상태가 LOW_LIGHT_SEC 넘게 이어지면 어두움 안내 */
export const LOW_LIGHT_VISIBILITY = 0.3;

/** AI 교정 문구 요청 간격(초) */
export const COACH_INTERVAL_SEC = 3;

/** 브라우저가 교정 문구 응답을 기다리는 한도(밀리초) — Plan SC: SC-7 */
export const COACH_TIMEOUT_MS = 2000;

/** 서버가 OpenAI 응답을 기다리는 한도(밀리초). 브라우저 한도 안에 기본 문구라도 돌려주려고 더 짧게 둔다 */
export const COACH_SERVER_TIMEOUT_MS = 1500;

/** 서버의 접속지(IP)당 분당 교정 문구 요청 한도 */
export const COACH_RATE_PER_MIN = 30;

/** 교정 문구 최대 글자 수 */
export const COACH_MAX_CHARS = 40;

/** 서버가 429를 돌려줬을 때 브라우저가 요청을 쉬는 시간(초) */
export const COACH_RATE_LIMIT_BACKOFF_SEC = 60;

/** 인식 속도 목표(초당 횟수) — Plan SC: SC-2 */
export const TARGET_FPS = 20;
