"use client";

// 완료 화면 — 동작별 최고 일치도와 완료/미완료, [다시 하기] [다른 종목 고르기]
// Design Ref: DESIGN 1-4 (스트레칭 화면 안에서 전환, 이 순간 카메라는 이미 꺼짐), DESIGN 2-1 done
// PRD 4번 이용 흐름 "완료 화면(동작별 최고 일치도) 확인", PRD 6번: 기록은 저장하지 않는다 (화면을 떠나면 사라짐)
// 디자인: iOS 26 토큰 (.grouped 목록·구분선, t-* 글자, 알약 버튼). 이모지 대신 선 아이콘.

import Icon from "@/components/ui/Icon";
import Link from "next/link";
import type { Sport, Step } from "@/lib/data/sports";
import type { StepResult } from "@/lib/session/sessionMachine";

type Row = {
  key: string;
  name: string;
  target: string;
  entries: { side: Step["side"]; result: StepResult | undefined }[];
};

/** 단계 결과를 동작 단위로 묶는다 (한쪽씩 하는 동작은 왼쪽·오른쪽 한 줄에) */
function groupByMove(steps: Step[], results: StepResult[]): Row[] {
  const rows: Row[] = [];
  steps.forEach((step, i) => {
    let row = rows.find((r) => r.key === step.move.id);
    if (!row) {
      row = { key: step.move.id, name: step.move.name, target: step.move.target, entries: [] };
      rows.push(row);
    }
    row.entries.push({ side: step.side, result: results[i] });
  });
  return rows;
}

function ResultChip({ side, result }: { side: Step["side"]; result: StepResult | undefined }) {
  const done = result?.completed ?? false;
  const best = result?.best ?? null;
  const sideName = side === "left" ? "왼쪽" : side === "right" ? "오른쪽" : null;
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${done ? "bg-good/15" : "bg-fill"}`}>
      {sideName && <span className="t-footnote text-muted">{sideName}</span>}
      <span className="t-subhead font-semibold tabular-nums">{best === null ? "–" : `${Math.round(best)}%`}</span>
      <span className={`t-footnote flex items-center gap-1 font-semibold ${done ? "text-good" : "text-muted"}`}>
        {done && <Icon name="check" />}
        {done ? "완료" : "미완료"}
      </span>
    </div>
  );
}

export default function CompletionView({
  sport,
  steps,
  results,
  onRestart,
}: {
  sport: Sport;
  steps: Step[];
  results: StepResult[];
  onRestart: () => void;
}) {
  const rows = groupByMove(steps, results);
  const doneCount = results.filter((r) => r.completed).length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 md:px-8 md:py-12">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-good/15 text-3xl text-good">
          <Icon name="check" />
        </span>
        <div>
          {/* 화면이 바뀐 것을 읽어 준다 */}
          <h1 role="status" className="t-title1">
            {sport.name} 스트레칭 완료!
          </h1>
          <p className="t-subhead mt-1 text-muted">
            {steps.length}단계 중 {doneCount}단계를 15초 동안 유지했어요 · 카메라는 꺼졌어요
          </p>
        </div>
      </div>

      <h2 className="t-footnote mt-8 px-4 text-muted">동작별 최고 일치도</h2>
      <ol className="grouped mt-2 overflow-hidden">
        {rows.map((row, i) => (
          <li
            key={row.key}
            className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 ${i > 0 ? "border-t border-line" : ""}`}
          >
            <span className="t-subhead flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill font-semibold tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 basis-40">
              <p className="t-headline">{row.name}</p>
              <p className="t-footnote text-muted">{row.target}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {row.entries.map((e) => (
                <ResultChip key={e.side ?? "both"} side={e.side} result={e.result} />
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p className="t-footnote mt-2 px-4 text-muted">기록은 저장되지 않아요. 이 화면을 떠나면 사라집니다.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onRestart} className="btn btn-lg btn-filled flex-1">
          <Icon name="rotate" /> 다시 하기
        </button>
        <Link href="/" className="btn btn-lg btn-gray flex-1">
          다른 종목 고르기 <Icon name="chevronRight" />
        </Link>
      </div>
    </main>
  );
}
