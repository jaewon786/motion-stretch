// 종목별 동작 목록 화면 — 동작 카드(작은 3D 미리보기)와 [카메라로 시작]·[보기 모드] 버튼
// Design Ref: DESIGN 1-2 / PLAN 작업 4 / Plan SC: SC-1(종목마다 동작 3개 이상), SC-5([카메라로 시작] = 2번째 클릭)

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/ui/SiteHeader";
import MoveCard from "@/components/moves/MoveCard";
import Icon, { SportIcon } from "@/components/ui/Icon";
import { PAIN_WARNING, SPORTS, estimateMinutes, getSport, getSteps } from "@/lib/data/sports";

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
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-40 pt-6 md:px-8">
        <Link href="/#sports" className="btn btn-sm btn-gray">
          <Icon name="chevronLeft" /> 종목
        </Link>

        {/* 종목 제목과 요약 — iOS Large Title */}
        <section className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lime/18 text-[26px] text-lime">
                <SportIcon id={sport.id} />
              </span>
              <h1 className="t-large text-text md:text-[48px] md:leading-[56px]">{sport.name} 스트레칭</h1>
            </div>
            <p className="t-body mt-3 max-w-xl text-muted">{sport.summary}을 운동 전에 차례로 늘려 줍니다.</p>
          </div>
          <p className="t-subhead text-muted">
            동작 <span className="font-semibold text-text">{sport.moves.length}</span>개 ·{" "}
            <span className="font-semibold text-text">{steps.length}</span>단계 · 약{" "}
            <span className="font-semibold text-text">{estimateMinutes(steps.length)}</span>분
          </p>
        </section>

        {/* 동작 카드 */}
        <section aria-label="동작 목록" className="mt-8 grid gap-4 md:grid-cols-3">
          {sport.moves.map((move, i) => (
            <MoveCard key={move.id} move={move} order={i + 1} />
          ))}
        </section>

        <p className="t-subhead mt-6 flex items-start gap-2 text-muted">
          <Icon name="warning" className="mt-0.5 text-warn" />
          <span>
            <span className="font-semibold text-warn">{PAIN_WARNING}.</span> 한쪽씩 하는 동작은 왼쪽을 먼저 하고
            오른쪽으로 넘어가요.
          </span>
        </p>
      </main>

      {/* 아래 고정 시작 막대 — Liquid Glass */}
      <div className="fixed inset-x-0 bottom-4 z-40 px-3 md:px-6">
        <div className="liquid mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-[30px] p-2 md:rounded-full md:pl-6">
          <p className="t-footnote hidden items-center gap-1.5 text-muted md:flex">
            <Icon name="lock" /> 카메라 영상은 이 기기 밖으로 나가지 않습니다
          </p>
          <div className="flex w-full gap-2 md:w-auto">
            <Link href={`/sports/${sport.id}/session?mode=view`} className="btn btn-lg btn-gray flex-1 md:flex-none">
              <Icon name="eye" /> 보기 모드
            </Link>
            <Link href={`/sports/${sport.id}/session?mode=camera`} className="btn btn-lg btn-filled flex-1 md:flex-none">
              <Icon name="play" /> 카메라로 시작
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
