"use client";

// 동작 정보·통증 주의 카드 — 이름, 좌/우, 늘어나는 부위, 유지 시간, 서는 방향, 주의사항, 통증 안내
// Design Ref: DESIGN 1-3 "동작 정보: 늘어나는 부위·주의사항 · 통증이 느껴지면 즉시 멈추세요"
// PRD 5번 must 1 규칙: 동작마다 "통증이 느껴지면 즉시 멈추세요" 안내를 반드시 보여 준다

import Icon from "@/components/ui/Icon";
import Link from "next/link";
import type { Step } from "@/lib/data/sports";
import { PAIN_WARNING } from "@/lib/data/sports";
import { HOLD_SEC } from "@/lib/config/thresholds";
import { facingText } from "./TargetPanel";
import type { SessionMode } from "./SessionView";

/** 보기 모드의 [이전]/[다음] 조작 (카메라 모드에서는 없음) */
export type ViewNav = {
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** 마지막 단계에서 [끝내기]를 누르면 갈 곳 */
  doneHref: string;
};

export default function MoveInfo({ step, mode, nav }: { step: Step; mode: SessionMode; nav?: ViewNav }) {
  const facing = facingText(step);
  // 카메라 모드: 정답·나 아래에 가로로 길게 (DESIGN 1-3 아래 정보 영역)
  const wide = mode === "camera";
  return (
    <section
      aria-label="동작 정보"
      className={`grouped flex flex-col p-6 md:p-8 ${wide ? "md:col-span-2" : ""}`}
    >
      <p className="text-sm font-semibold text-sky">{step.move.target}</p>
      <h2 className="t-title1 mt-1">
        {step.move.name}
        {step.side && (
          <span className="ml-2 align-middle text-xl font-bold text-lime">
            {step.side === "left" ? "왼쪽" : "오른쪽"}
          </span>
        )}
      </h2>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-ink-3 p-4">
          <dt className="text-xs text-muted">유지 시간</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums">
            {HOLD_SEC}
            <span className="ml-0.5 text-base font-bold text-muted">초</span>
          </dd>
        </div>
        <div className="rounded-2xl bg-ink-3 p-4">
          <dt className="text-xs text-muted">서는 방향</dt>
          <dd className="mt-1 text-lg font-bold">
            <Icon name={facing.icon} /> {facing.title}
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3 text-sm leading-6">
        <p className="flex gap-2.5 text-text/90">
          <Icon name="compass" className="mt-0.5 text-muted" />
          {facing.detail}
        </p>
        <p className="flex gap-2.5 text-text/90">
          <Icon name="bulb" className="mt-0.5 text-muted" />
          {step.move.caution}
        </p>
      </div>

      <p
        role="note"
        className="mt-6 flex items-center gap-2.5 t-subhead rounded-2xl bg-warn/12 px-4 py-3 font-semibold text-warn md:mt-auto"
      >
        <Icon name="warning" /> {PAIN_WARNING}
      </p>

      {/* 보기 모드: [이전]/[다음] — 카메라 없이 정답 캐릭터만 보며 동작을 익힌다 (PRD 4번 예외 흐름) */}
      {nav && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={nav.onPrev}
            disabled={nav.isFirst}
            className="btn btn-lg btn-gray flex-1"
          >
            <Icon name="chevronLeft" /> 이전
          </button>
          {nav.isLast ? (
            <Link
              href={nav.doneHref}
              className="btn btn-lg btn-filled flex-1"
            >
              끝내기 <Icon name="check" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={nav.onNext}
              className="btn btn-lg btn-filled flex-1"
            >
              다음 <Icon name="chevronRight" />
            </button>
          )}
        </div>
      )}
      {nav && <p className="mt-2 text-center text-xs text-muted">키보드 방향키로도 넘길 수 있어요</p>}
    </section>
  );
}
