// 첫 화면 — 앱 소개, 3D 코치, 종목 선택 카드 4개, 안전·개인정보 안내
// Design Ref: DESIGN 1-1 / PLAN 작업 3 / Plan SC: SC-5 (종목 카드 클릭이 시작까지의 1번째 클릭)

import SiteHeader from "@/components/ui/SiteHeader";
import HeroStage from "@/components/home/HeroStage";
import SportCard from "@/components/home/SportCard";
import { SPORTS } from "@/lib/data/sports";
import { HOLD_SEC } from "@/lib/config/thresholds";

const FEATURES = [
  { icon: "🧍", title: "3D 정답 자세", desc: "돌려 보며 옆·뒤까지 확인" },
  { icon: "🎯", title: "실시간 자세 비교", desc: "관절별 초록·노랑·빨강" },
  { icon: "💬", title: "AI 교정 한마디", desc: "가장 어긋난 곳부터 알려 줘요" },
];

const HOW_TO = [
  { n: "1", title: "종목 고르기", desc: "축구·러닝·농구·테니스 중 오늘 할 운동을 골라요." },
  { n: "2", title: "카메라 앞에 서기", desc: "몸 전체가 화면에 들어오게 한두 걸음 물러서요." },
  { n: "3", title: "정답 자세 따라 하기", desc: `관절이 모두 초록이 되면 ${HOLD_SEC}초만 버티면 끝!` },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 md:px-8">
        {/* ── 소개 + 3D 코치 ── */}
        <section className="grid items-center gap-8 pt-4 md:grid-cols-[1.05fr_1fr] md:gap-10 md:pt-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs font-medium text-lime">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" aria-hidden />
              스포츠테크 · 카메라 자세 코치
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
              모션 스트레치
            </h1>
            <p className="mt-4 text-2xl font-bold leading-snug text-text/90 md:text-3xl">
              종목에 맞는 스트레칭,
              <br />
              <span className="bg-gradient-to-r from-lime to-sky bg-clip-text text-transparent">정확한 자세로.</span>
            </p>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">
              옆에 서 있는 3D 코치의 자세를 따라 하면, 카메라가 내 관절 각도를 재서 어디를 고쳐야 하는지 바로 알려
              줍니다. 운동 전 준비운동을 틀린 자세 없이 끝내 보세요.
            </p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="glass rounded-2xl px-4 py-3">
                  <div className="text-xl" aria-hidden>
                    {f.icon}
                  </div>
                  <div className="mt-1 text-sm font-bold">{f.title}</div>
                  <div className="text-xs text-muted">{f.desc}</div>
                </li>
              ))}
            </ul>
            <a
              href="#sports"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 font-bold text-ink shadow-[0_10px_40px_-10px_rgba(198,255,61,0.6)] transition hover:brightness-110"
            >
              종목 고르러 가기 <span aria-hidden>↓</span>
            </a>
          </div>

          <div className="glass relative h-[420px] overflow-hidden rounded-[2rem] md:h-[560px]">
            <HeroStage />
            <span className="pointer-events-none absolute left-5 top-5 rounded-full bg-sky/15 px-3 py-1 text-xs font-medium text-sky ring-1 ring-sky/30">
              3D 정답 자세 미리보기
            </span>
          </div>
        </section>

        {/* ── 종목 선택 ── */}
        <section id="sports" className="scroll-mt-6 pt-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">종목을 고르세요</h2>
              <p className="mt-2 text-muted">종목마다 많이 쓰는 근육을 늘리는 서서 하는 스트레칭 3가지를 준비했어요.</p>
            </div>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SPORTS.map((sport) => (
              <SportCard key={sport.id} sport={sport} />
            ))}
          </div>
        </section>

        {/* ── 이용 방법 ── */}
        <section className="pt-20">
          <h2 className="text-2xl font-black tracking-tight">이렇게 진행돼요</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {HOW_TO.map((s) => (
              <li key={s.n} className="glass flex gap-4 rounded-2xl p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime font-black text-ink">
                  {s.n}
                </span>
                <div>
                  <div className="font-bold">{s.title}</div>
                  <p className="mt-1 text-sm leading-6 text-muted">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── 안전·개인정보 안내 (PRD 7번 안전 고지) ── */}
        <section className="mt-16 grid gap-3 md:grid-cols-2">
          <p className="glass flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 text-muted">
            <span aria-hidden className="text-lg">ⓘ</span>
            <span>
              <strong className="text-text">의료 기기가 아니며 부상 진단을 하지 않습니다.</strong> 통증이 느껴지면 즉시
              멈추고, 부상이 있다면 전문가와 상담하세요.
            </span>
          </p>
          <p className="glass flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 text-muted">
            <span aria-hidden className="text-lg">🔒</span>
            <span>
              <strong className="text-text">카메라 영상은 이 기기 밖으로 나가지 않습니다.</strong> 교정 문구를 만들 때
              관절 각도 숫자만 AI에 보내고, 아무것도 저장하지 않아요.
            </span>
          </p>
        </section>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        © 2026 모션 스트레치 · 운동 전 부상 예방을 위한 스트레칭 코치
      </footer>
    </>
  );
}
