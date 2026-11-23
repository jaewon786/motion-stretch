"use client";

// 오른쪽 "나" 영역 — 카메라 영상(거울 표시), 인식한 관절 점, 자세 인식 준비·속도 표시, 카메라 허용·오류 안내
// Design Ref: DESIGN 1-3 "나 (오른쪽, 거울처럼) · 인식 속도 n회/초 (구석 작게)", DESIGN 6 MirrorPanel
// PLAN 작업 7~9: 큰 화면에는 내 동작을 거울처럼 따라 하는 3D 마네킹, 오른쪽 아래에는 작은 카메라 미리보기(관절 점 포함).
// 영상은 <video>에 그리기만 하고 서버로 보내거나 저장·캡처하지 않는다 (PRD 7번, SC-6).

import dynamic from "next/dynamic";
import { useEffect, type RefObject } from "react";
import CameraGate from "./CameraGate";
import PoseOverlay from "./PoseOverlay";
import type { CameraErrorKind, CameraStatus } from "@/lib/camera/useCamera";
import type { PoseFrame, PoseStatus } from "@/lib/pose/usePoseLandmarker";
import { TARGET_FPS } from "@/lib/config/thresholds";

// 3D는 브라우저에서만 그린다 (DESIGN 5: ssr false)
const MeScene = dynamic(() => import("./MeScene"), { ssr: false });

export type MirrorPanelProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  cameraStatus: CameraStatus;
  cameraError: CameraErrorKind | null;
  onRetry: () => void;
  viewModeHref: string;
  poseStatus: PoseStatus;
  fps: number;
  people: number;
  frameRef: RefObject<PoseFrame | null>;
};

export default function MirrorPanel({
  videoRef,
  stream,
  cameraStatus,
  cameraError,
  onRetry,
  viewModeHref,
  poseStatus,
  fps,
  people,
  frameRef,
}: MirrorPanelProps) {
  // 스트림이 바뀌면 <video>에 연결한다
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) video.play().catch(() => {});
  }, [stream, videoRef]);

  const cameraOn = cameraStatus === "active";

  return (
    <section
      aria-label="내 자세"
      className="glass relative min-h-[420px] overflow-hidden rounded-[2rem] bg-ink md:min-h-[560px]"
    >
      {/* 큰 화면: 내 동작을 거울처럼 따라 하는 3D 마네킹 (자세 인식이 준비된 뒤에 그린다) */}
      {poseStatus === "ready" && (
        <div className="absolute inset-0">
          <MeScene frameRef={frameRef} />
        </div>
      )}

      {/* 오른쪽 아래: 작은 카메라 미리보기 + 관절 점 (거울처럼 좌우 반전, DESIGN 4) */}
      <div className="absolute bottom-4 right-4 aspect-video w-[30%] min-w-36 overflow-hidden rounded-2xl bg-black shadow-xl shadow-black/40 ring-1 ring-line">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          aria-label="내 카메라 영상 (거울 화면)"
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        />
        {poseStatus === "ready" && <PoseOverlay videoRef={videoRef} frameRef={frameRef} />}
      </div>

      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-lime/15 px-3 py-1 text-xs font-semibold text-lime ring-1 ring-lime/30">
        나
      </span>

      {/* 오른쪽 위: 인식 속도 (SC-2: 초당 20번 이상이면 초록) */}
      {poseStatus === "ready" && (
        <span
          className={`pointer-events-none absolute right-4 top-4 rounded-full bg-ink/70 px-3 py-1 text-xs font-semibold tabular-nums ring-1 ${
            fps >= TARGET_FPS ? "text-good ring-good/40" : "text-warn ring-warn/40"
          }`}
          title="카메라 인식 → 내 캐릭터 반영 횟수"
        >
          인식 {fps}회/초
        </span>
      )}

      {/* 여러 사람이 잡힘: 가운데 가장 크게 잡힌 한 명만 인식 (PRD 4번 예외 흐름) */}
      {poseStatus === "ready" && people > 1 && (
        <span className="pointer-events-none absolute bottom-4 left-4 max-w-[55%] rounded-full bg-ink/75 px-3 py-1.5 text-xs text-text ring-1 ring-line">
          👥 {people}명이 보여요 · 가운데 한 명만 인식해요
        </span>
      )}

      {/* 자세 인식 모델 준비 중 (PRD 4번 예외 흐름: 그동안 정답 캐릭터·동작 설명은 먼저 볼 수 있음) */}
      {cameraOn && poseStatus === "loading" && (
        <div role="status" className="absolute inset-x-6 top-16 rounded-2xl bg-ink/80 p-4 ring-1 ring-line backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-line border-t-lime" aria-hidden />
            <div>
              <p className="text-sm font-bold">자세 인식 준비 중…</p>
              <p className="text-xs text-muted">처음 한 번은 몇 초 걸려요. 그동안 왼쪽 정답 자세를 먼저 살펴보세요.</p>
            </div>
          </div>
        </div>
      )}
      {cameraOn && poseStatus === "error" && (
        <div role="alert" className="absolute inset-x-6 top-16 rounded-2xl bg-ink/85 p-4 text-sm ring-1 ring-bad/40">
          자세 인식을 시작하지 못했어요. 페이지를 새로 고치거나, 최신 크롬 브라우저에서 다시 열어 주세요.
        </div>
      )}

      <CameraGate status={cameraStatus} error={cameraError} onRetry={onRetry} viewModeHref={viewModeHref} />
    </section>
  );
}
