// 동작 카드 (iOS 26 그룹 카드) — 작은 3D 정답 자세, 이름, 좌/우, 늘어나는 부위, 유지 시간, 서는 방향, 주의사항
// Design Ref: DESIGN 1-2 / PRD 5번 must 1 "동작마다 이름, 늘어나는 부위, 유지 시간(15초), 서는 방향, 주의사항 한 줄"

import MovePreview from "./MovePreview";
import Icon from "@/components/ui/Icon";
import type { Move } from "@/lib/data/sports";
import { HOLD_SEC } from "@/lib/config/thresholds";

export default function MoveCard({ move, order }: { move: Move; order: number }) {
  const rows: [string, string][] = [
    ["유지 시간", move.sided ? `한쪽 ${HOLD_SEC}초` : `${HOLD_SEC}초`],
    ["서는 방향", move.facing === "side" ? "옆으로 서기" : "정면으로 서기"],
    ["진행", move.sided ? "왼쪽 다음 오른쪽" : "양쪽 함께"],
  ];
  return (
    <article className="grouped flex flex-col overflow-hidden">
      <div className="relative h-56">
        <MovePreview pose={move.pose} keyJoints={move.keyJoints} facing={move.facing} />
        <span className="t-footnote absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-lime font-semibold text-white">
          {order}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <h3 className="t-headline text-text">{move.name}</h3>
        <p className="t-subhead mt-0.5 text-sky">{move.target}</p>
        <dl className="mt-4 overflow-hidden rounded-2xl bg-ink-3">
          {rows.map(([k, v], i) => (
            <div key={k} className={`t-subhead flex items-center justify-between px-3.5 py-2.5 ${i ? "border-t border-line" : ""}`}>
              <dt className="text-muted">{k}</dt>
              <dd className="text-text">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="t-footnote mt-4 flex gap-2 text-muted">
          <Icon name="bulb" className="mt-px" />
          {move.caution}
        </p>
      </div>
    </article>
  );
}
