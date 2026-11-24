"use client";

// 개발용 자세 확인 화면 — PLAN 작업 2 검증 도구 (배포 환경에서는 열리지 않음)
// 22개 진행 단계의 정답 자세를 3D 마네킹으로 띄우고, 같은 각도 함수로 잰 핵심 관절 각도를 표로 보여 준다.

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { SPORTS, getSteps } from "@/lib/data/sports";
import { solvePose } from "@/lib/pose/skeleton";
import { computeAngles, JOINT_LABEL } from "@/lib/pose/angles";
import type { JointState } from "@/components/three/Mannequin";
import type { JointAngleId } from "@/lib/pose/types";

// 3D는 브라우저에서만 그린다 (DESIGN 5 — ssr: false)
const StageCanvas = dynamic(() => import("@/components/three/StageCanvas"), { ssr: false });
const Mannequin = dynamic(() => import("@/components/three/Mannequin"), { ssr: false });

const RING_DEMO: JointState[] = ["hint", "good", "warn", "bad"];

export default function PoseLab() {
  const [sportIdx, setSportIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [mirror, setMirror] = useState(true);
  const [sideView, setSideView] = useState(false);
  const [ringDemo, setRingDemo] = useState(0);

  const sport = SPORTS[sportIdx];
  const steps = useMemo(() => getSteps(sport), [sport]);
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const points = useMemo(() => solvePose(step.pose), [step]);
  const angles = useMemo(() => computeAngles(points), [points]);
  const rings = useMemo(
    () =>
      Object.fromEntries(step.keyJoints.map((j) => [j, RING_DEMO[ringDemo]])) as Partial<
        Record<JointAngleId, JointState>
      >,
    [step, ringDemo],
  );

  return (
    <main className="min-h-screen bg-[#060a16] p-6 text-slate-100">
      <h1 className="text-2xl font-bold">개발용 자세 확인 (PLAN 작업 2)</h1>
      <p className="mt-1 text-sm text-slate-400">
        정답 자세 데이터 → 포즈 엔진 → 3D 마네킹. 드래그로 돌려 볼 수 있습니다. 배포 환경에서는 열리지 않습니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {SPORTS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              setSportIdx(i);
              setStepIdx(0);
            }}
            className={`rounded-full px-4 py-1.5 text-sm ${i === sportIdx ? "bg-lime-300 text-slate-900" : "bg-slate-800"}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {steps.map((st, i) => (
          <button
            key={st.key}
            onClick={() => setStepIdx(i)}
            className={`rounded-lg px-3 py-1 text-xs ${i === stepIdx ? "bg-sky-400 text-slate-900" : "bg-slate-800"}`}
          >
            {st.move.name}
            {st.side ? ` (${st.side === "left" ? "왼" : "오"})` : ""}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <StageCanvas className="h-[560px] overflow-hidden rounded-2xl" mirror={mirror} yawDeg={sideView ? -90 : 0}>
          <Mannequin points={points} variant="target" rings={rings} />
        </StageCanvas>

        <aside className="space-y-3 text-sm">
          <div className="rounded-xl bg-slate-900 p-4">
            <div className="font-semibold">{step.move.name}</div>
            <div className="text-slate-400">
              {step.move.target} · {step.move.facing === "side" ? "옆으로 서기" : "정면으로 서기"}
            </div>
            <div className="mt-1 text-slate-400">{step.move.caution}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded bg-slate-800 px-3 py-1" onClick={() => setMirror((v) => !v)}>
              거울 표시: {mirror ? "켬" : "끔"}
            </button>
            <button className="rounded bg-slate-800 px-3 py-1" onClick={() => setSideView((v) => !v)}>
              보기: {sideView ? "옆" : "정면"}
            </button>
            <button
              className="rounded bg-slate-800 px-3 py-1"
              onClick={() => setRingDemo((v) => (v + 1) % RING_DEMO.length)}
            >
              링 색: {RING_DEMO[ringDemo]}
            </button>
          </div>
          <table className="w-full rounded-xl bg-slate-900 text-left">
            <thead>
              <tr className="text-slate-400">
                <th className="p-2">핵심 관절</th>
                <th className="p-2">정답 각도</th>
              </tr>
            </thead>
            <tbody>
              {step.keyJoints.map((j) => (
                <tr key={j} className="border-t border-slate-800">
                  <td className="p-2">{JOINT_LABEL[j]}</td>
                  <td className="p-2 tabular-nums">{angles[j].toFixed(0)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </div>
    </main>
  );
}
