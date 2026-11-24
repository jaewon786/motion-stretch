# HANDOFF — 모션 스트레치 진행 상황 (2026-11-24, 컨텍스트 초기화 전 정리)

> 새 세션은 이 파일 → `CURRICULUM.md` → `CLAUDE.md` → `PLAN.md` → `DESIGN.md` 순서로 읽고 시작한다.
> 사용자 원칙: **CURRICULUM.md 지침을 무조건 따른다.** 작업은 하나씩, 사용자가 확인한 뒤 다음으로. main 병합은 사용자가 지시할 때만.

---

## 1. 커리큘럼 진행 위치 — **Part 4 STEP 3 (Do) 진행 중: PLAN 작업 10까지 완료, 다음은 작업 11**

| Part / STEP | 상태 | 산출물·근거 |
|---|---|---|
| Part 2 STEP 1~4 (bkit, Next.js, .env, PRD 작성·검토·개발 단위) | ✅ 완료 | `PRD.md` (8항목 + 3차 검토 + 개발 단위 7개), 점검표 6/6 통과 |
| Part 3 STEP 1~3 (CLAUDE.md 규칙, 검증 루프, 브랜치 규칙, 연습 병합) | ✅ 완료 | `CLAUDE.md`, `feature/practice` main 병합, 점검표 6/6 통과 |
| Part 4 STEP 1 (PLAN.md·DESIGN.md) | ✅ 완료 | `PLAN.md`(성공 기준 SC-1~7, 작업 14개), `DESIGN.md`(설계안 C: 마네킹+고급 연출) |
| Part 4 STEP 2 (design-validator 정합성 검토) | ✅ 완료 | 지적 12건 모두 반영 (DESIGN 2-1 상태표 등) |
| **Part 4 STEP 3 (Do)** | 🔄 **작업 1~10 완료 / 11~14 남음** | 아래 2번 |
| Part 4 STEP 4 (Check → `CHECK.md`) | ⏳ 시작 전 | gap-detector + 성공 기준 판정 + security-architect |
| Part 4 STEP 5 (Act, CLAUDE.md 새 규칙) | ⏳ 시작 전 | 아래 5번 규칙 후보 |
| Part 4 마무리 점검 → main 병합 → Part 5(배포·발표) | ⏳ | |

## 2. 기능 개발 진행 (PLAN.md 작업 목록 기준)

| 작업 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 1 | 판정 기준값(`lib/config/thresholds.ts`)·4종목 12동작 데이터(`lib/data/sports.ts`) | ✅ | 50d5593 |
| 2 | 포즈 엔진(`lib/pose/skeleton.ts`·`angles.ts`)·3D 마네킹(`components/three/*`)·개발용 `/dev/poses` | ✅ | e141dca, fa168a2 |
| 3 | 첫 화면 | ✅ (이후 디자인 리뉴얼로 교체) | 27b8084 |
| 4 | 동작 목록 `/sports/[sport]` | ✅ | 1750d6a |
| 5 | 스트레칭 화면 `/sports/[sport]/session?mode=` 정답 캐릭터 영역 | ✅ | 5ae79b9 |
| 6 | 보기 모드 [이전]/[다음] — **must 1 완성** | ✅ (main 병합됨) | a187bad |
| 7 | 카메라 켜기·예외 안내(`lib/camera/useCamera.ts`, `CameraGate`) | ✅ 웹캠 확인됨 | f0c4f64 |
| 8 | MediaPipe 인식(`lib/pose/usePoseLandmarker.ts`, `personSelect.ts`, `public/mediapipe/`) | ✅ 웹캠 확인됨 (full 모델로 교체) | 76e8ce2, 712c436 |
| 9 | 내 3D 마네킹 거울 따라 하기(`lib/pose/retarget.ts`, `MeScene`) | ✅ 웹캠 확인됨 | f90d6dc |
| 10 | 비교 엔진(`lib/pose/compare.ts`, `usePoseComparison.ts`) — 관절 링 색·일치도 % | ✅ (실제 자세로 일치도가 오르내리는지는 사용자 웹캠 미확인) | 539784c |
| **11** | **동작 진행 흐름** — DESIGN 2-1 상태표대로 `lib/session/sessionMachine.ts`(reducer) + `FeedbackBar`: 80%·3초 자세 확인(0.5초 봐주기) → 15초 유지 타이머(80% 미만이면 멈춤) → 다음 단계, 단계 시작 30초 후 [건너뛰기], 탭 숨김 일시정지, 몸 이탈(`outOfFrame`)·어두움 안내, 좌우 순서 | ⏳ **다음 작업** | |
| 12 | 규칙 기반 기본 교정 문구 `lib/coach/ruleText.ts` (DESIGN 3-3 부호 규칙·방향표) | ⏳ | |
| 13 | OpenAI 교정 문구 `app/api/coach/route.ts` + `lib/coach/validate.ts`·`rateLimit.ts` (서버 1.5초·브라우저 2초, 3초 간격, 분당 30회, 40자·금지어 검사, 키 없으면 기본 문구) | ⏳ | |
| 14 | 완료 화면 `CompletionView` (동작별 최고 일치도·완료/미완료, **완료 순간 카메라 끄기**) — **must 2 완성** | ⏳ | |

- 비교 결과(`CompareResult`: joints/excluded/score/worst)는 이미 `SessionView`에서 `comparison`으로 받고 있다 → 작업 11은 이것을 상태 머신에 넣으면 된다.
- 작업 12·13은 `comparison.worst`(가장 많이 어긋난 관절, `diff = 내 각도 − 정답`)를 쓴다.

## 3. 커리큘럼 밖 디자인 작업 (사용자 요청, 확정됨)

- 계획·설계: `docs/01-plan/features/immersive-design.plan.md`, `docs/02-design/features/immersive-design.design.md`
- c46a146: igloo.inc 3D 기법 참고 첫 화면(입자 스캔 선수, 스크롤 3막 카메라, 각도 라벨, 종목 코어 hover 연동, 부팅 인트로) — `components/experience/*`, `lib/experience/*`
- 3b3ad51: **iOS 26 디자인 시스템 적용(사용자 확정)** — 사용자 제공 `C:\Users\jaewo\Downloads\iOS and iPadOS 26 (Community).fig`에서 뽑은 값. 새 화면도 반드시 이 규칙으로:
  - 글자: `app/globals.css`의 `t-xl / t-large / t-title1~3 / t-headline / t-body / t-callout / t-subhead / t-footnote / t-caption / t-caption2`
  - 박스: `.grouped`(#1C1C1E, 모서리 26), `.glass`(3D 위 반투명), `.liquid`(Liquid Glass), 목록 행은 `bg-fill`/`bg-ink-3` + `border-line` 구분선
  - 버튼: `.btn .btn-lg|md|sm .btn-filled|gray|glass` (알약)
  - 색 토큰: `lime`=iOS Blue(강조), `sky`=Cyan(정답), `good/warn/bad`=iOS Green/Yellow/Red, `muted`=Secondary label
  - 아이콘: `components/ui/Icon.tsx` (`Icon`, `SportIcon`) — **이모지 금지**, 3D 장면 색은 그대로 유지

## 4. git 브랜치 상태 (중요)

```
main ─ a3e2944 (must 1 병합)
        └ feature/pose-feedback ─ 작업 7~10 (539784c)        ← main 미병합
              └ feature/immersive-design ─ c46a146, 3b3ad51, 이 HANDOFF 커밋  ← 현재 체크아웃, main 미병합
```
- 디자인 브랜치는 같은 파일(StageCanvas 등)을 고쳐서 pose-feedback **위에 쌓았다**.
- **다음 세션 첫 결정(사용자에게 물을 것)**: 작업 11~14를 어느 브랜치에서 할지. 추천: `feature/pose-feedback`을 `feature/immersive-design`까지 빨리 감기(fast-forward)해서 디자인이 들어간 상태로 작업 11~14를 이어 가고, must 2 완성 후 사용자 지시로 main 병합.

## 5. Check(STEP 4)·Act(STEP 5)에서 반드시 기록할 것

**설계와 달라진 점 (CHECK.md Gap 후보)**
1. 글꼴: DESIGN 5는 Noto Sans KR(next/font/google) → Google Fonts 시간 초과로 빌드 실패해 **Pretendard 로컬**, 이후 iOS 26 적용으로 SF(애플 기기) + Pretendard(대체)
2. 자세 인식 모델: DESIGN 5 lite → 사용자 웹캠 확인 후 **full** (`public/mediapipe/pose_landmarker_full.task`)
3. 개발용 `/dev/poses` 화면 추가 (배포 시 404)
4. 첫 화면 디자인 리뉴얼(커리큘럼 밖 사용자 요청) — DESIGN 1-1 배치와 다름
5. `next.config.ts`의 `cacheComponents` 때문에 `dynamicParams` 대신 페이지 안 `notFound()` + Suspense

**CLAUDE.md 규칙 후보 (Act STEP 5)**
- 코드 쓰기 전 `node_modules/next/dist/docs/` 확인 (cacheComponents·Instant Navigation 제약 실제로 겪음)
- 렌더 중 `Math.random()`·훅 반환값 직접 수정 금지 (React 규칙 lint) → 고정 씨앗 난수(`lib/experience/random.ts`)·ref 사용
- `eslint.config.mjs` 수정은 플러그인이 막음 → 외부 파일은 파일 머리 주석으로 제외
- 외부 다운로드가 필요한 글꼴은 쓰지 않고 로컬 파일 사용
- 이모지 금지, iOS 26 토큰만 사용

**아직 확인 못 한 것**
- 움직임 줄이기 설정(DS-5), 애플 기기에서 SF Pro 표시, 디자인 변경 후 카메라 모드 인식 속도(직전 측정 28회/초), 작업 10 일치도가 실제 자세로 오르내리는지(사용자 웹캠)

## 6. 작업 환경 메모

- 개발 서버: `.claude/launch.json`의 `dev` (Claude 브라우저 `preview_start`), 또는 터미널 `npm run dev`
- Claude 미리보기 창은 **실제 카메라를 막는다** → 카메라 모드 점검은 탭 안에서 `navigator.mediaDevices.getUserMedia`를 캔버스 `captureStream(30)`으로 바꿔 끼운 뒤 클라이언트 이동으로 들어가서 확인 (실제 인식은 사용자 웹캠으로)
- 미리보기 창이 숨겨져 있거나 1440 화면 흉내 중이면 rAF가 초당 1~2번으로 떨어져 측정값이 틀린다 → 기본 크기·창 표시 상태에서 잰다
- 점검 스크립트(임시 폴더): Node `--experimental-strip-types` + `.ts`·`@/` 경로 로더. 데이터·포즈·좌표변환·비교 점검을 이 방식으로 돌렸다
- 훅: 새 파일을 만들기 전 "부르는 곳·겹치는 파일 없음·사용자 지시 인용"을 먼저 말해야 쓰기가 허용된다 (Glob/Grep 검색 후)
- `trash-can/`(git 제외): 옛 히어로 파일(`*.tsx.bak`), lite 모델 — 사용자가 확인 후 삭제

## 7. 새 세션에서 바로 쓸 첫 요청 예시

> HANDOFF.md를 읽고, 브랜치 방향을 나에게 물은 뒤 PLAN 작업 11(동작 진행 흐름)을 DESIGN 2-1 상태표대로 구현해줘. CLAUDE.md의 검증 루프·브랜치 규칙을 지키고, 디자인은 iOS 26 토큰(HANDOFF 3번)을 써줘.
