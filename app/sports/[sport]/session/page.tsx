// 스트레칭 화면 경로 — /sports/[sport]/session?mode=camera|view
// Design Ref: DESIGN 1-3 / PLAN 작업 5
// 주소 값(params, searchParams)은 Suspense 안에서 읽는다 (Next 16 cacheComponents·Instant Navigation 권장 방식)

import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import SessionView, { type SessionMode } from "@/components/session/SessionView";
import { SPORTS, getSport } from "@/lib/data/sports";

export function generateStaticParams() {
  return SPORTS.map((s) => ({ sport: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/sports/[sport]/session">): Promise<Metadata> {
  const { sport: id } = await params;
  const sport = getSport(id);
  return { title: sport ? `${sport.name} 스트레칭 진행 중 · 모션 스트레치` : "모션 스트레치" };
}

type Props = PageProps<"/sports/[sport]/session">;

export default function SessionPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<SessionLoading />}>
      <SessionLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function SessionLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink text-muted" aria-busy>
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-lime" aria-hidden />
    </main>
  );
}

async function SessionLoader({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { sport: id } = await params;
  const sport = getSport(id);
  if (!sport) notFound();
  const query = await searchParams;
  // mode가 없거나 이상한 값이면 보기 모드로 (카메라는 사용자가 [카메라로 시작]을 눌렀을 때만 켠다 — PRD 7번)
  const mode: SessionMode = query.mode === "camera" ? "camera" : "view";
  return <SessionView sportId={sport.id} mode={mode} />;
}
