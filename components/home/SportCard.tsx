"use client";

// 종목 선택 카드 (HUD 스타일) — 누르면 동작 목록으로 이동 (클릭 1번째, Plan SC: SC-5)
// 마우스를 올리거나 키보드로 초점을 주면 첫 화면 3D의 같은 종목 코어가 빛난다 (immersive-design DS-3)

import Link from "next/link";
import { estimateMinutes, getSteps, type Sport } from "@/lib/data/sports";
import { setHoveredSport } from "@/lib/experience/store";

export default function SportCard({ sport, index }: { sport: Sport; index: number }) {
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
      className="group glass bracket relative flex flex-col overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:border-lime/50 hover:bg-ink/70 hover:shadow-[0_24px_70px_-24px_rgba(198,255,61,0.35)]"
    >
      {/* 위: 번호 코드와 종목 코드 */}
      <div className="flex items-center justify-between">
        <span className="hud-label">
          {String(index + 1).padStart(2, "0")} / {sport.id}
        </span>
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-steel transition group-hover:border-lime group-hover:bg-lime group-hover:text-ink"
        >
          →
        </span>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {sport.emoji}
        </span>
        <h3 className="text-2xl font-black tracking-tight text-ice">{sport.name}</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{sport.summary}</p>

      <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm text-text/85">
        {sport.moves.map((m, i) => (
          <li key={m.id} className="flex items-baseline gap-2.5">
            <span className="font-mono text-[10px] text-sky">{String(i + 1).padStart(2, "0")}</span>
            {m.name}
          </li>
        ))}
      </ul>

      {/* 아래: 고정폭 판독값 */}
      <dl className="mt-5 grid grid-cols-3 gap-2 font-mono text-[11px] uppercase tracking-wider">
        <div className="rounded-md border border-line px-2 py-1.5">
          <dt className="text-steel">moves</dt>
          <dd className="text-ice">{sport.moves.length}</dd>
        </div>
        <div className="rounded-md border border-line px-2 py-1.5">
          <dt className="text-steel">steps</dt>
          <dd className="text-ice">{steps}</dd>
        </div>
        <div className="rounded-md border border-line px-2 py-1.5">
          <dt className="text-steel">time</dt>
          <dd className="text-ice">~{estimateMinutes(steps)}m</dd>
        </div>
      </dl>
      <span className="sr-only">
        동작 {sport.moves.length}개, {steps}단계, 약 {estimateMinutes(steps)}분
      </span>
    </Link>
  );
}
