# CHECK — 모션 스트레치 점검 결과 (Part 4 STEP 4)

- 점검일: 2026-11-24 · 브랜치: `feature/pose-feedback` (PLAN 작업 1~14 완료, 커밋 `b1e2248`)
- 이번 범위: **보안 점검만** (사용자 지시: "보안 관점도 함께 점검하기 만 진행하고 건너가줘")
  - Gap 분석(gap-detector)·성공 기준(SC-1~7) 판정은 이번에 하지 않았다 → 아래 "하지 않은 점검" 참고

## 결과: **실패** (보안 — 고친 뒤 공개)

공개 전에 막아야 할 중간 위험 3건이 있다 (1~3번). 비밀 키·프롬프트·영상 처리에서는 확인된 문제가 없다.

---

## 1. 고칠 항목 (우선순위 순)

| 순위 | 심각도 | 위치 | 문제 | 고침 제안 | 확인 |
|---|---|---|---|---|---|
| 1 | 중간 | `app/api/coach/route.ts:52-58` | Content-Type·Origin을 확인하지 않음. 다른 사이트가 방문자 브라우저로 `text/plain` POST를 보내면 사전 확인(preflight) 없이 처리되어, 방문자 IP마다 따로 세는 분당 30회 제한을 피해 OpenAI 비용을 쓰게 할 수 있음 | 함수 맨 앞에서 `content-type`이 `application/json`이고 `sec-fetch-site`가 `same-origin`(또는 `origin`이 우리 주소)이 아니면 400/403 | 직접 확인: `text/plain` 요청이 200으로 처리됨 |
| 2 | 중간 | 프로젝트 루트 (`.vercelignore` 없음) | Vercel CLI 배포는 `.gitignore`가 아니라 `.vercelignore`를 따름. `.env`(GITHUB·SUPABASE·VERCEL·OPENAI 토큰)가 배포 소스에 섞여 올라갈 수 있음 | `.vercelignore`에 `.env*` 추가, Vercel 환경 변수에는 `OPENAI_API_KEY`(필요하면 `OPENAI_MODEL`)만 등록 | 직접 확인: `.vercelignore` 없음 |
| 3 | 중간 | `lib/coach/rateLimit.ts`, `route.ts` | 메모리 기반 횟수 제한은 Vercel에서 서버 개수만큼 늘어나고 다시 시작하면 초기화됨 (설계 때 알고 있던 "최선 노력" 한계). 전체 사용량 상한이 없음 | OpenAI 대시보드에서 프로젝트 월 사용 한도(budget) 설정 — 공개 전 필수. 코드에 서버 전체 하루 호출 상한 추가 | 코드 확인 |
| 4 | 낮음 | `route.ts:54-55` | 본문을 다 읽은 뒤 2048자 검사 | `content-length` > 2048이면 먼저 400 | 코드 확인 |
| 5 | 낮음 | `next.config.ts` | 보안 헤더 없음 (클릭재킹 등) | `headers()`로 `X-Frame-Options: DENY`, `Permissions-Policy: camera=(self), microphone=()`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (CSP는 MediaPipe용 `'wasm-unsafe-eval'` 필요) | 코드 확인 |
| 6 | 낮음 | `lib/coach/validate.ts:82-93` | AI 문구가 왼쪽/오른쪽·펴기/굽히기 방향을 바꿔도 걸러내지 못함 (안전) | 출력에 사실 문장의 관절 이름과 동작 단어(펴/굽혀/올려/내려 등)가 있는지 확인, 없으면 기본 문구. 금지어에 "무리해서", "아파도" 추가 검토 | 코드 확인 |
| 7 | 낮음 | `route.ts:47-50`, `rateLimit.ts:35-38` | Vercel 밖에서는 `x-forwarded-for` 위조로 제한 우회 가능, 정리 순서가 "최근 사용"이 아님 | `x-vercel-forwarded-for` 먼저 사용 | 코드 확인 |
| 8 | 낮음(사용성) | `useCoachText.ts`, `thresholds.ts` | 한 사람이 3초마다 요청 = 분당 20회. 교실처럼 같은 공용 IP 2명 이상이면 429 → 1분간 AI 문구 끊김 (기본 문구는 계속 보임) | 시연 환경에 맞춰 상한을 정하고 결정을 기록 | 계산 |

## 2. 문제없음으로 확인한 항목

- **비밀 키 — git:** `.gitignore`에 `.env*`·`trash-can/` 등록. `.env`는 추적되지 않고, `git log --all -- .env` 결과 과거 커밋에도 없음 (직접 확인).
- **비밀 키 — 브라우저:** `NEXT_PUBLIC_` 사용 0건, `OPENAI_API_KEY`는 `app/api/coach/route.ts` 한 곳에서만 읽음. `.next/static` 빌드 결과에서 키 이름·키 값 앞부분 검색 0건 (직접 확인, SC-6).
- **사용자 입력:** 모르는 moveId·관절, 다른 쪽 관절, 중복, −180~180 밖, NaN, 항목 0개·5개 이상 → 400. 모르는 필드는 버림. 오류 응답은 `invalid_input`/`rate_limited`뿐 (단위 점검·curl로 확인).
- **프롬프트 인젝션:** 프롬프트에 들어가는 값은 서버 데이터의 동작 이름, 서버 상수 방향, 고정 표로 만든 사실 문장, 반올림한 정수뿐 — 사용자 글이 들어갈 길 없음. AI 출력은 한글·한 문장·40자·금지어 검사 후 React 텍스트로만 그림 (`dangerouslySetInnerHTML` 없음).
- **개인정보·영상:** 서버로 가는 값은 `moveId`·`side`·`joint`·정수 `diff`뿐. 영상은 `<video>`와 브라우저 안 MediaPipe에만 들어가고 캡처·전송·저장 없음. 화면을 나가거나 완료 화면이 되면 카메라 트랙 정지 (완료·다시 하기 화면 점검에서 트랙 `ended` 확인). 쿠키 없음, 브라우저 저장소는 부팅 인트로 표시값 하나. 기록은 저장하지 않음.
- **외부 요청:** MediaPipe 파일·글꼴 모두 앱 안(`public/`)에서 불러옴. 앱 코드의 외부 요청은 서버의 OpenAI 호출 하나.
- **개발용 화면:** `/dev/poses`는 빌드 결과에서 404.
- **의존성:** `npm audit --omit=dev` 취약점 0건 (직접 확인).

## 3. 실제 서비스로 만들 때 챙길 것 (실습 범위 밖)

- 메모리 횟수 제한 대신 여러 서버가 함께 보는 제한 (Vercel 방화벽 규칙, Upstash 같은 외부 저장소), 서버 전체 하루 상한과 비용 알림
- `/api/coach` 앞에 봇 차단 또는 짧게 유효한 서명 토큰
- 개인정보 처리 방침에 Vercel 요청 기록(IP·경로)과 OpenAI의 오남용 감시용 보관 가능성 안내 (보내는 것은 관절 이름과 숫자뿐)
- 전체 CSP·HSTS, `npm audit`·의존성 자동 업데이트 정기 실행
- `.env`의 GITHUB·SUPABASE·VERCEL 토큰을 범위를 줄인 토큰으로 바꾸고 주기적으로 재발급
- 배포 후 브라우저 네트워크 탭에서 MediaPipe 라이브러리 내부의 외부 요청이 없는지 한 번 더 확인

## 4. 하지 않은 점검 (다음에 할 때 참고)

- Gap 분석(설계 ↔ 구현)과 성공 기준 SC-1~7 판정 — 사용자 지시로 이번에는 건너뜀. 설계와 달라진 점 후보는 `HANDOFF.md` 5번과 아래에 정리돼 있음:
  - 작업 12를 따로 하지 않고 작업 13 안에 최소 범위로 포함 (사용자 결정)
  - AI 기본 모델: DESIGN "소형 모델" → 실측 후 `gpt-5.4-mini`(추론 none, 약 1.0초). `gpt-4.1-mini`·`gpt-4o-mini`는 약 1.5초로 서버 1.5초 제한에 자주 걸림
  - 진행 흐름 시계를 별도 훅 파일 없이 `SessionView` 안에 둠
- 실제 웹캠으로 하는 사람 점검(L3): 자세 확인 3초 → 15초 유지 → 다음 단계, 교정 문구가 실제 자세에 맞게 바뀌는지, 완료 화면에 "완료"가 찍히는지
