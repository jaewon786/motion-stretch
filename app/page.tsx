// 첫 화면 — 스크롤하면 뒤의 3D 모션 랩을 카메라가 지나가는 3막 구성 + 종목 선택
// Design Ref: immersive-design 설계 1번 / DESIGN 1-1 / PLAN 작업 3
// Plan SC: SC-5 (종목 카드 클릭이 시작까지의 1번째 클릭) — 카드·버튼은 모두 HTML이라 클릭·키보드·화면 낭독기 그대로

import SiteHeader from "@/components/ui/SiteHeader";
import SportCard from "@/components/home/SportCard";
import ExperienceStage from "@/components/experience/ExperienceStage";
import BootIntro from "@/components/experience/BootIntro";
import { SPORTS } from "@/lib/data/sports";
import { GREEN_DEG, HOLD_SEC, PASS_SCORE } from "@/lib/config/thresholds";

const HOW_TO = [
  { n: "01", title: "종목 고르기", desc: "축구·러닝·농구·테니스 중 오늘 할 운동을 골라요." },
  { n: "02", title: "카메라 앞에 서기", desc: "머리부터 발끝까지 화면에 들어오게 2~3m 물러서요." },
  { n: "03", title: "정답 자세 따라 하기", desc: `관절이 모두 초록이 되면 ${HOLD_SEC}초만 버티면 끝!` },
];

/** 각 막의 글 상자: 3D 위에서도 읽히도록 어두운 반투명 바탕 */
function ActCopy({
  code,
  title,
  body,
  align = "left",
  children,
}: {
  code: string;
  title: string;
  body: string;
  align?: "left" | "right";
  children?: React.ReactNode;
}) {
  return (
    <div className={`glass bracket w-full max-w-md rounded-2xl p-6 md:p-8 ${align === "right" ? "md:ml-auto" : ""}`}>
      <p className="hud-label text-sky">{code}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-ice md:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-muted">{body}</p>
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
          {/* ── 1막 HERO ── */}
          <section className="flex min-h-[calc(100svh-5rem)] flex-col justify-center pb-10">
            <div className="max-w-xl">
              <p className="hud-label flex items-center gap-2 text-lime">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" aria-hidden />
                Sports-tech · Pose Lab
              </p>
              <h1 className="mt-5 text-6xl font-black leading-[0.95] tracking-tight text-ice md:text-8xl">
                모션
                <br />
                스트레치
              </h1>
              <p className="mt-6 text-xl font-bold leading-snug text-text/90 md:text-2xl">
                종목에 맞는 스트레칭,{" "}
                <span className="bg-gradient-to-r from-lime to-sky bg-clip-text text-transparent">정확한 자세로.</span>
              </p>
              <p className="mt-4 max-w-md text-base leading-7 text-muted">
                카메라가 내 몸을 관절 점으로 읽고, 3D 코치의 정답 각도와 비교해 어디를 고칠지 바로 알려 줍니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#sports"
                  className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 font-bold text-ink shadow-[0_10px_40px_-10px_rgba(198,255,61,0.6)] transition hover:brightness-110"
                >
                  종목 고르기 <span aria-hidden>↓</span>
                </a>
                <a
                  href="#scan"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-ink/40 px-6 py-3 font-semibold text-text backdrop-blur transition hover:border-sky hover:text-sky"
                >
                  작동 원리 보기
                </a>
              </div>
            </div>

            {/* 오른쪽 아래: HUD 판독값 */}
            <dl className="mt-14 grid max-w-md grid-cols-3 gap-3 font-mono text-[11px] uppercase tracking-wider md:ml-auto md:mt-auto">
              {[
                ["scan", "live"],
                ["joints", "33"],
                ["tolerance", `±${GREEN_DEG}°`],
              ].map(([k, v]) => (
                <div key={k} className="border-l border-line pl-3">
                  <dt className="text-steel">{k}</dt>
                  <dd className="mt-1 text-lg text-ice">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="hud-label mt-8 animate-bounce text-center md:mt-10" aria-hidden>
              scroll ↓
            </p>
          </section>

          {/* ── 2막 SCAN ── */}
          <section id="scan" className="flex min-h-[100svh] items-center py-20">
            <ActCopy
              align="right"
              code="01 / scan"
              title="몸을 관절 33개로 읽어요"
              body="브라우저 안의 자세 인식 AI가 웹캠 영상에서 어깨·팔꿈치·엉덩이·무릎·발목 위치를 1초에 20번 넘게 찾아냅니다. 영상은 이 기기 밖으로 나가지 않아요."
            />
          </section>

          {/* ── 3막 COMPARE ── */}
          <section className="flex min-h-[100svh] items-center py-20">
            <ActCopy
              code="02 / compare"
              title={`정답 각도와 ±${GREEN_DEG}°`}
              body={`종목마다 늘려야 할 핵심 관절의 각도를 정답과 비교해 초록·노랑·빨강으로 보여 줘요. 일치도 ${PASS_SCORE}%를 넘기면 자세 확인, ${HOLD_SEC}초를 버티면 다음 동작으로 넘어가요.`}
            >
              <ul className="mt-6 grid grid-cols-3 gap-2 font-mono text-[11px] uppercase tracking-wider">
                <li className="rounded-md border border-good/40 bg-good/10 px-2 py-2 text-good">≤ {GREEN_DEG}° ok</li>
                <li className="rounded-md border border-warn/40 bg-warn/10 px-2 py-2 text-warn">≤ 30° near</li>
                <li className="rounded-md border border-bad/40 bg-bad/10 px-2 py-2 text-red-300">&gt; 30° fix</li>
              </ul>
            </ActCopy>
          </section>

          {/* ── 4막 CHOOSE: 종목 선택 ── */}
          <section id="sports" className="scroll-mt-6 pb-10 pt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="hud-label text-sky">03 / choose</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-ice md:text-5xl">종목을 고르세요</h2>
                <p className="mt-3 text-muted">종목마다 많이 쓰는 근육을 늘리는 서서 하는 스트레칭 3가지를 준비했어요.</p>
              </div>
              <p className="hud-label hidden md:block">hover → 3d core</p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {SPORTS.map((sport, i) => (
                <SportCard key={sport.id} sport={sport} index={i} />
              ))}
            </div>
          </section>

          {/* ── 이용 방법 ── */}
          <section className="pt-20">
            <p className="hud-label">protocol</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-ice">이렇게 진행돼요</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {HOW_TO.map((s) => (
                <li key={s.n} className="glass bracket flex gap-4 rounded-2xl p-5">
                  <span className="font-mono text-2xl font-light text-lime">{s.n}</span>
                  <div>
                    <div className="font-bold text-ice">{s.title}</div>
                    <p className="mt-1 text-sm leading-6 text-muted">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ── 안전·개인정보 안내 (PRD 7번 안전 고지) ── */}
          <section className="mb-16 mt-16 grid gap-3 md:grid-cols-2">
            <p className="glass flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 text-muted">
              <span aria-hidden className="text-lg">
                ⓘ
              </span>
              <span>
                <strong className="text-text">의료 기기가 아니며 부상 진단을 하지 않습니다.</strong> 통증이 느껴지면 즉시
                멈추고, 부상이 있다면 전문가와 상담하세요.
              </span>
            </p>
            <p className="glass flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 text-muted">
              <span aria-hidden className="text-lg">
                🔒
              </span>
              <span>
                <strong className="text-text">카메라 영상은 이 기기 밖으로 나가지 않습니다.</strong> 교정 문구를 만들 때
                관절 각도 숫자만 AI에 보내고, 아무것도 저장하지 않아요.
              </span>
            </p>
          </section>
        </main>
        <footer className="border-t border-line bg-ink/60 py-6 text-center backdrop-blur">
          <p className="hud-label">© 2026 Motion·Stretch — pre-workout pose lab</p>
        </footer>
      </div>
    </>
  );
}
