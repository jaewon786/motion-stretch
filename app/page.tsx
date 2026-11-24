// 첫 화면 — 뒤의 3D 모션 랩을 스크롤로 지나가는 3막 구성 + 종목 선택
// 디자인: iOS 26 디자인 시스템(사용자 제공 피그마) — SF 글꼴 크기 체계, 그룹 목록(모서리 26), 알약 버튼, Liquid Glass
// Plan SC: SC-5 (종목 카드 클릭이 시작까지의 1번째 클릭) — 카드·버튼은 모두 HTML이라 클릭·키보드·화면 낭독기 그대로

import SiteHeader from "@/components/ui/SiteHeader";
import Icon from "@/components/ui/Icon";
import SportCard from "@/components/home/SportCard";
import ExperienceStage from "@/components/experience/ExperienceStage";
import BootIntro from "@/components/experience/BootIntro";
import { SPORTS } from "@/lib/data/sports";
import { GREEN_DEG, HOLD_SEC, PASS_SCORE, YELLOW_DEG } from "@/lib/config/thresholds";

const HOW_TO = [
  { title: "종목 고르기", desc: "축구·러닝·농구·테니스 중 오늘 할 운동을 골라요." },
  { title: "카메라 앞에 서기", desc: "머리부터 발끝까지 화면에 들어오게 2~3m 물러서요." },
  { title: "정답 자세 따라 하기", desc: `관절이 모두 초록이 되면 ${HOLD_SEC}초만 버티면 끝나요.` },
];

/** 각 막의 설명 카드 (3D 위의 반투명 유리) */
function ActCard({
  step,
  title,
  body,
  align = "left",
  children,
}: {
  step: string;
  title: string;
  body: string;
  align?: "left" | "right";
  children?: React.ReactNode;
}) {
  return (
    <div className={`glass w-full max-w-md rounded-[26px] p-6 md:p-7 ${align === "right" ? "md:ml-auto" : ""}`}>
      <p className="t-footnote font-semibold text-sky">{step}</p>
      <h2 className="t-title1 mt-1.5 text-text">{title}</h2>
      <p className="t-body mt-3 text-muted">{body}</p>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <BootIntro />
      {/* 고정 배경 3D (내용 뒤, 화면 낭독기에서는 숨김) */}
      <ExperienceStage />

      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto w-full max-w-6xl px-5 md:px-8">
          {/* ── 1막: 소개 ── */}
          <section className="flex min-h-[calc(100svh-6rem)] flex-col justify-center pb-10">
            {/* 소개 글 묶음만 20px 아래로 (사용자 요청) — 세로 가운데 정렬은 그대로 두고 보이는 위치만 옮긴다 */}
            <div className="max-w-xl translate-y-5">
              <p className="t-subhead font-semibold text-lime">운동 전 자세 코치</p>
              <h1 className="t-large mt-2 text-text md:text-[56px] md:leading-[64px] md:tracking-[-0.5px]">
                종목에 맞는 스트레칭,
                <br />
                정확한 자세로.
              </h1>
              <p className="t-body mt-4 max-w-md text-muted md:text-[19px] md:leading-[26px]">
                카메라가 내 몸을 관절 점으로 읽고, 3D 코치의 정답 각도와 비교해 어디를 고칠지 바로 알려 줍니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#sports" className="btn btn-lg btn-filled">
                  종목 고르기
                </a>
                <a href="#scan" className="btn btn-lg btn-glass liquid">
                  작동 원리 보기
                </a>
              </div>
            </div>

            {/* 핵심 수치 — Liquid Glass 막대 */}
            <dl className="liquid t-footnote mt-14 inline-flex w-fit flex-wrap items-center gap-x-5 gap-y-1 self-start rounded-full px-5 py-2.5 md:ml-auto md:mt-auto md:self-end">
              {[
                ["인식 관절", "33개"],
                ["허용 오차", `±${GREEN_DEG}°`],
                ["유지 시간", `${HOLD_SEC}초`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-1.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold tabular-nums text-text">{v}</dd>
                </div>
              ))}
            </dl>
            <a href="#scan" className="t-footnote mt-8 flex items-center justify-center gap-1 text-muted md:mt-10">
              스크롤해서 살펴보기 <Icon name="chevronDown" />
            </a>
          </section>

          {/* ── 2막: 스캔 ── */}
          <section id="scan" className="flex min-h-[100svh] items-center py-20">
            <ActCard
              align="right"
              step="1단계 · 스캔"
              title="몸을 관절 33개로 읽어요"
              body="브라우저 안의 자세 인식 AI가 웹캠 영상에서 어깨·팔꿈치·엉덩이·무릎·발목 위치를 1초에 20번 넘게 찾아냅니다. 영상은 이 기기 밖으로 나가지 않아요."
            />
          </section>

          {/* ── 3막: 비교 ── */}
          <section className="flex min-h-[100svh] items-center py-20">
            <ActCard
              step="2단계 · 비교"
              title={`정답 각도와 ±${GREEN_DEG}°`}
              body={`늘려야 할 핵심 관절의 각도를 정답과 비교해 색으로 보여 줘요. 일치도 ${PASS_SCORE}%를 넘기면 자세 확인, ${HOLD_SEC}초를 버티면 다음 동작으로 넘어가요.`}
            >
              <ul className="t-footnote mt-5 overflow-hidden rounded-2xl bg-fill">
                {[
                  ["bg-good", "맞음", `±${GREEN_DEG}° 안`],
                  ["bg-warn", "조금 어긋남", `±${YELLOW_DEG}° 안`],
                  ["bg-bad", "많이 어긋남", `${YELLOW_DEG}° 넘음`],
                ].map(([dot, label, range], i) => (
                  <li key={label} className={`flex items-center gap-3 px-4 py-2.5 ${i ? "border-t border-line" : ""}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
                    <span className="flex-1 text-text">{label}</span>
                    <span className="tabular-nums text-muted">{range}</span>
                  </li>
                ))}
              </ul>
            </ActCard>
          </section>

          {/* ── 4막: 종목 선택 ── */}
          <section id="sports" className="scroll-mt-24 pb-10 pt-24">
            <p className="t-footnote font-semibold text-sky">3단계 · 선택</p>
            <h2 className="t-large mt-1 text-text">종목을 고르세요</h2>
            <p className="t-body mt-2 text-muted">종목마다 많이 쓰는 근육을 늘리는 서서 하는 스트레칭 3가지를 준비했어요.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SPORTS.map((sport) => (
                <SportCard key={sport.id} sport={sport} />
              ))}
            </div>
          </section>

          {/* ── 이용 방법: iOS 그룹 목록 ── */}
          <section className="pt-16">
            <h2 className="t-title2 text-text">이렇게 진행돼요</h2>
            <ol className="glass mt-4 overflow-hidden rounded-[26px]">
              {HOW_TO.map((s, i) => (
                <li key={s.title} className="flex items-start gap-4 px-5 py-4">
                  <span className="t-subhead flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime font-semibold text-white">
                    {i + 1}
                  </span>
                  <div className={`flex-1 ${i ? "" : ""}`}>
                    <div className="t-headline text-text">{s.title}</div>
                    <p className="t-subhead mt-0.5 text-muted">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ── 안전·개인정보 안내 (PRD 7번 안전 고지) ── */}
          <section className="mb-16 mt-8">
            <ul className="glass overflow-hidden rounded-[26px]">
              <li className="flex items-start gap-3 px-5 py-4">
                <Icon name="info" className="mt-0.5 text-[20px] text-sky" />
                <p className="t-subhead text-muted">
                  <span className="font-semibold text-text">의료 기기가 아니며 부상 진단을 하지 않습니다.</span> 통증이
                  느껴지면 즉시 멈추고, 부상이 있다면 전문가와 상담하세요.
                </p>
              </li>
              <li className="ml-14 border-t border-line" aria-hidden />
              <li className="flex items-start gap-3 px-5 py-4">
                <Icon name="lock" className="mt-0.5 text-[20px] text-sky" />
                <p className="t-subhead text-muted">
                  <span className="font-semibold text-text">카메라 영상은 이 기기 밖으로 나가지 않습니다.</span> 교정 문구를
                  만들 때 관절 각도 숫자만 AI에 보내고, 아무것도 저장하지 않아요.
                </p>
              </li>
            </ul>
          </section>
        </main>
        <footer className="t-footnote border-t border-line bg-ink/70 py-6 text-center text-muted backdrop-blur-xl">
          © 2026 모션 스트레치 · 운동 전 부상 예방을 위한 스트레칭 코치
        </footer>
      </div>
    </>
  );
}
