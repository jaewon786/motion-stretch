"use client";

// 종목 선택 카드 (iOS 26 그룹 카드: 모서리 26, SF 글자 크기 체계) — 누르면 동작 목록으로 이동 (클릭 1번째, Plan SC: SC-5)
// 마우스를 올리거나 키보드로 초점을 주면 첫 화면 3D의 같은 종목 코어가 빛난다 (immersive-design DS-3)

import Link from "next/link";
import Icon, { SportIcon } from "@/components/ui/Icon";
import { estimateMinutes, getSteps, type Sport } from "@/lib/data/sports";
import { setHoveredSport } from "@/lib/experience/store";

export default function SportCard({ sport }: { sport: Sport }) {
  const steps = getSteps(sport).length;
  const on = () => setHoveredSport(sport.id);
  const off = () => setHoveredSport(null);
  return (
    <Link
      href={`/sports/${sport.id}`}
      onPointerEnter={on}
      onPointerLeave={off}
      onFocus={on}
      onBlur={off}
      className="glass group flex flex-col rounded-[26px] p-5 transition duration-200 hover:bg-ink-2/80 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime/18 text-[22px] text-lime">
          <SportIcon id={sport.id} />
        </span>
        <h3 className="t-title3 flex-1 text-text">{sport.name}</h3>
        <Icon name="chevronRight" className="text-steel transition group-hover:translate-x-0.5 group-hover:text-muted" />
      </div>
      <p className="t-subhead mt-3 text-muted">{sport.summary}</p>

      <ul className="mt-4 overflow-hidden rounded-2xl bg-fill">
        {sport.moves.map((m, i) => (
          <li key={m.id} className={`t-subhead px-3.5 py-2.5 text-text ${i ? "border-t border-line" : ""}`}>
            {m.name}
          </li>
        ))}
      </ul>

      <p className="t-footnote mt-4 text-muted">
        동작 {sport.moves.length}개 · {steps}단계 · 약 {estimateMinutes(steps)}분
      </p>
    </Link>
  );
}
