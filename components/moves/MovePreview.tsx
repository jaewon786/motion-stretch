"use client";

// 작은 3D 미리보기 껍데기 — 3D는 브라우저에서만 불러오고(DESIGN 5: ssr false), 그동안 자리 표시를 보여 준다

import dynamic from "next/dynamic";
import type { MovePreviewProps } from "./MovePreviewScene";

const MovePreviewScene = dynamic(() => import("./MovePreviewScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ink">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-sky" aria-hidden />
    </div>
  ),
});

export default function MovePreview(props: MovePreviewProps) {
  return <MovePreviewScene {...props} />;
}
