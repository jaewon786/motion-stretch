"use client";

// 정답 캐릭터 영역 — 3D 정답 마네킹, 드래그로 돌려 보기, 서는 방향 안내
// Design Ref: DESIGN 1-3 "정답(왼쪽) · 드래그로 돌려 보기 · ↻ 서는 방향", 안내 겹 화면 "서는 방향 안내(동작 시작 전 3초)"
// PRD 4번 이용 흐름: "동작마다 서는 방향(정면/옆) 안내 확인"

import Icon, { type IconName } from "@/components/ui/Icon";
import dynamic from "next/dynamic";
import { memo, useEffect, useState } from "react";
import type { Step } from "@/lib/data/sports";
import { ORIENT_SEC } from "@/lib/config/thresholds";

const TargetScene = dynamic(() => import("./TargetScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-sky" aria-hidden />
    </div>
  ),
});

/** 서는 방향 안내 문구 */
export function facingText(step: Step): { icon: IconName; title: string; detail: string } {
  const sideName = step.side === "right" ? "오른쪽" : "왼쪽";
  if (step.move.facing === "side") {
    return {
      icon: "rotate",
      title: "옆으로 서기",
      detail: `${sideName} 몸이 카메라를 향하게 옆으로 서세요`,
    };
  }
  return { icon: "arrowUp", title: "정면으로 서기", detail: "카메라를 정면으로 바라보고 서세요" };
}

function TargetPanel({
  step,
  lightweight = false,
  orientOpen,
}: {
  step: Step;
  lightweight?: boolean;
  /** 카메라 모드: 진행 흐름의 orient 상태일 때만 true (DESIGN 2-1). 없으면(보기 모드) 단계가 바뀔 때 3초 동안 스스로 보여 준다 */
  orientOpen?: boolean;
}) {
  const facing = facingText(step);
  // 단계가 바뀌면 서는 방향 안내를 ORIENT_SEC 동안 크게 보여 준다
  // (안내를 이미 닫은 단계의 key만 기록 — 새 단계가 되면 자동으로 다시 보인다)
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  useEffect(() => {
    const key = step.key;
    const timer = setTimeout(() => setDismissedKey(key), ORIENT_SEC * 1000);
    return () => clearTimeout(timer);
  }, [step.key]);
  const showOrient = orientOpen ?? dismissedKey !== step.key;

  return (
    <section
      aria-label="정답 자세"
      className="grouped relative min-h-[420px] overflow-hidden  md:min-h-[560px]"
    >
      <TargetScene step={step} lightweight={lightweight} />

      {/* 왼쪽 위: 이름표 */}
      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-sky/15 px-3 py-1 text-xs font-semibold text-sky ring-1 ring-sky/30">
        정답 자세
      </span>
      {/* 오른쪽 위: 서는 방향 배지 (항상 보임) */}
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-text ring-1 ring-line">
        <Icon name={facing.icon} /> {facing.title}
      </span>
      {/* 아래: 돌려 보기 도움말 */}
      <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/60 px-3 py-1 text-xs text-muted">
        <Icon name="hand" /> 드래그해서 돌려 보기 · 휠로 확대
      </span>

      {/* 서는 방향 안내 (단계 시작 후 3초) */}
      {showOrient && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-3xl bg-ink/75 p-6 text-center ring-1 ring-sky/40 backdrop-blur-md"
        >
          <Icon name={facing.icon} className="mx-auto text-5xl text-sky" />
          <div className="t-title2 mt-2">{facing.title}</div>
          <p className="mt-1 text-sm text-muted">{facing.detail}</p>
        </div>
      )}
    </section>
  );
}

// 카메라 모드에서는 진행 흐름 시계 때문에 부모가 0.1초마다 다시 그려지므로, 받는 값이 같으면 다시 그리지 않는다
export default memo(TargetPanel);
