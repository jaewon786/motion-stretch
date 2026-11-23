// 종목 선택 카드 — 누르면 그 종목의 동작 목록 화면으로 이동 (클릭 1번째, Plan SC: SC-5)
// Design Ref: DESIGN 1-1 — 종목 카드 4개

import Link from "next/link";
import { getSteps, type Sport, type SportId } from "@/lib/data/sports";
import { CONFIRM_SEC, HOLD_SEC, ORIENT_SEC } from "@/lib/config/thresholds";

/** 종목별 강조색 (카드 빛 번짐) */
const ACCENT: Record<SportId, string> = {
  soccer: "from-emerald-400/25",
  running: "from-sky-400/25",
  basketball: "from-orange-400/25",
  tennis: "from-lime-300/25",
};

/** 자세를 맞추는 데 걸리는 평균 시간 가정(초) — 예상 소요 시간 안내용 */
const ALIGN_GUESS_SEC = 5;

/** 예상 소요 시간(분): 단계마다 방향 안내 + 자세 맞추기 + 자세 확인 + 유지 */
export function estimateMinutes(stepCount: number) {
  return Math.max(1, Math.round((stepCount * (ORIENT_SEC + ALIGN_GUESS_SEC + CONFIRM_SEC + HOLD_SEC)) / 60));
}

export default function SportCard({ sport }: { sport: Sport }) {
  const steps = getSteps(sport).length;
  return (
    <Link
      href={`/sports/${sport.id}`}
      className="group glass relative flex flex-col overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:border-lime/60 hover:shadow-[0_20px_60px_-20px_rgba(198,255,61,0.35)]"
    >
      {/* 카드 위쪽 은은한 빛 */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-gradient-to-br ${ACCENT[sport.id]} to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-70`}
      />
      <div className="flex items-center justify-between">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl ring-1 ring-line">
          <span aria-hidden>{sport.emoji}</span>
        </span>
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-muted transition group-hover:bg-lime group-hover:text-ink"
        >
          →
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-bold tracking-tight">{sport.name}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{sport.summary}</p>
      <ul className="mt-4 space-y-1 text-sm text-text/80">
        {sport.moves.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky" aria-hidden />
            {m.name}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
        <span className="rounded-full bg-white/5 px-2.5 py-1">동작 {sport.moves.length}개</span>
        <span className="rounded-full bg-white/5 px-2.5 py-1">{steps}단계</span>
        <span className="rounded-full bg-white/5 px-2.5 py-1">약 {estimateMinutes(steps)}분</span>
      </div>
    </Link>
  );
}
