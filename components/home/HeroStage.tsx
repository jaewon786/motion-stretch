"use client";

// 첫 화면 3D 영역 — 3D는 브라우저에서만 불러오고(DESIGN 5: ssr false), 불러오는 동안 자리 표시를 보여 준다

import dynamic from "next/dynamic";

function StageLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-ink">
      <div className="flex flex-col items-center gap-3 text-sm text-muted">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-lime" aria-hidden />
        3D 코치를 불러오는 중…
      </div>
    </div>
  );
}

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false, loading: StageLoading });

export default function HeroStage() {
  return <HeroScene />;
}
