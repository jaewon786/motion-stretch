// 종목별 동작 목록 화면 — 동작 카드(작은 3D 미리보기)와 [카메라로 시작]·[보기 모드] 버튼
// Design Ref: DESIGN 1-2 / PLAN 작업 4 / Plan SC: SC-1(종목마다 동작 3개 이상), SC-5([카메라로 시작] = 2번째 클릭)

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/ui/SiteHeader";
import MoveCard from "@/components/moves/MoveCard";
import { estimateMinutes } from "@/components/home/SportCard";
import { PAIN_WARNING, SPORTS, getSport, getSteps } from "@/lib/data/sports";

// 4개 종목 화면을 빌드 때 미리 만든다. 그 밖의 주소는 아래에서 notFound()로 404
// (이 프로젝트는 cacheComponents가 켜져 있어 dynamicParams 설정을 쓸 수 없다)
export function generateStaticParams() {
  return SPORTS.map((s) => ({ sport: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/sports/[sport]">): Promise<Metadata> {
  const { sport: id } = await params;
  const sport = getSport(id);
  return { title: sport ? `${sport.name} 스트레칭 · 모션 스트레치` : "모션 스트레치" };
}

type Params = PageProps<"/sports/[sport]">["params"];

// 페이지 틀(상단 막대)은 바로 그리고, 주소 값(params)을 읽는 내용만 Suspense 안에서 기다린다
// (Next 16 Instant Navigation 권장 방식 — 화면 전환이 막히지 않게)
export default function SportPage({ params }: PageProps<"/sports/[sport]">) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<SportSkeleton />}>
        <SportContent params={params} />
      </Suspense>
    </>
  );
}

/** 내용을 불러오는 동안 보여 줄 자리 표시 */
function SportSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 md:px-8" aria-busy>
      <div className="mt-10 h-14 w-72 animate-pulse rounded-2xl bg-white/5" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-96 animate-pulse rounded-3xl bg-white/5" />
        ))}
      </div>
    </main>
  );
}

async function SportContent({ params }: { params: Params }) {
  const { sport: id } = await params;
  const sport = getSport(id);
  if (!sport) notFound();
  const steps = getSteps(sport);

  return (
    <>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-36 md:px-8">
        <Link href="/#sports" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-text">
          <span aria-hidden>←</span> 종목 다시 고르기
        </Link>

        {/* 종목 제목과 요약 */}
        <section className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-4">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-4xl ring-1 ring-line"
                aria-hidden
              >
                {sport.emoji}
              </span>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">{sport.name} 스트레칭</h1>
            </div>
            <p className="mt-4 max-w-xl text-muted">{sport.summary}을 운동 전에 차례로 늘려 줍니다.</p>
          </div>
          <ul className="flex flex-wrap gap-2 text-sm">
            <li className="glass rounded-full px-4 py-2">
              동작 <strong className="text-lime">{sport.moves.length}</strong>개
            </li>
            <li className="glass rounded-full px-4 py-2">
              <strong className="text-lime">{steps.length}</strong>단계
            </li>
            <li className="glass rounded-full px-4 py-2">
              약 <strong className="text-lime">{estimateMinutes(steps.length)}</strong>분
            </li>
          </ul>
        </section>

        {/* 동작 카드 */}
        <section aria-label="동작 목록" className="mt-10 grid gap-5 md:grid-cols-3">
          {sport.moves.map((move, i) => (
            <MoveCard key={move.id} move={move} order={i + 1} />
          ))}
        </section>

        <p className="mt-8 flex items-center gap-2 text-sm text-muted">
          <span aria-hidden>⚠️</span>
          <span>
            <strong className="text-warn">{PAIN_WARNING}.</strong> 한쪽씩 하는 동작은 왼쪽을 먼저 하고 오른쪽으로
            넘어가요.
          </span>
        </p>
      </main>

      {/* 아래 고정 시작 막대 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
          <p className="hidden text-sm text-muted md:block">
            <span aria-hidden>🔒</span> 카메라 영상은 이 기기 밖으로 나가지 않습니다
          </p>
          <div className="flex w-full gap-3 md:w-auto">
            <Link
              href={`/sports/${sport.id}/session?mode=view`}
              className="flex-1 rounded-full border border-line px-5 py-3 text-center font-semibold text-text transition hover:border-sky hover:text-sky md:flex-none"
            >
              👀 보기 모드 <span className="text-xs text-muted">(카메라 없이)</span>
            </Link>
            <Link
              href={`/sports/${sport.id}/session?mode=camera`}
              className="flex-1 rounded-full bg-lime px-6 py-3 text-center font-bold text-ink shadow-[0_10px_40px_-10px_rgba(198,255,61,0.6)] transition hover:brightness-110 md:flex-none"
            >
              ▶ 카메라로 시작
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
