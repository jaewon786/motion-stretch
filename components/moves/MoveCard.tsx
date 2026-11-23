// 동작 카드 — 작은 3D 정답 자세, 이름, 좌/우, 늘어나는 부위, 유지 시간, 서는 방향, 주의사항
// Design Ref: DESIGN 1-2 / PRD 5번 must 1 "동작마다 이름, 늘어나는 부위, 유지 시간(15초), 서는 방향, 주의사항 한 줄"

import MovePreview from "./MovePreview";
import type { Move } from "@/lib/data/sports";
import { HOLD_SEC } from "@/lib/config/thresholds";

export default function MoveCard({ move, order }: { move: Move; order: number }) {
  return (
    <article className="glass group flex flex-col overflow-hidden rounded-3xl">
      <div className="relative h-56 border-b border-line">
        <MovePreview pose={move.pose} keyJoints={move.keyJoints} facing={move.facing} />
        <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-lime text-sm font-black text-ink">
          {order}
        </span>
        {move.sided && (
          <span className="absolute right-4 top-4 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-text ring-1 ring-line">
            왼쪽 → 오른쪽
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug">{move.name}</h3>
        <p className="mt-1 text-sm text-sky">{move.target}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-xs text-muted">유지 시간</dt>
            <dd className="font-semibold">{move.sided ? `한쪽 ${HOLD_SEC}초` : `${HOLD_SEC}초`}</dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-xs text-muted">서는 방향</dt>
            <dd className="font-semibold">{move.facing === "side" ? "↻ 옆으로 서기" : "⬆ 정면으로 서기"}</dd>
          </div>
        </dl>
        <p className="mt-4 flex gap-2 text-sm leading-6 text-muted">
          <span aria-hidden>💡</span>
          {move.caution}
        </p>
      </div>
    </article>
  );
}
