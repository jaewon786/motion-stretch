"use client";

// 오른쪽 "나" 영역 — 카메라 영상(거울 표시)과 카메라 허용·오류 안내
// Design Ref: DESIGN 1-3 "나 (오른쪽, 거울처럼)", DESIGN 6 MirrorPanel
// PLAN 작업 7: 지금은 카메라 영상을 거울처럼 보여 준다. 작업 8~9에서 자세 인식과 3D 내 마네킹을 얹는다.
// 영상은 <video>에 그리기만 하고 서버로 보내거나 저장·캡처하지 않는다 (PRD 7번, SC-6).

import { useEffect, useRef } from "react";
import CameraGate from "./CameraGate";
import type { CameraErrorKind, CameraStatus } from "@/lib/camera/useCamera";

export default function MirrorPanel({
  stream,
  status,
  error,
  onRetry,
  viewModeHref,
}: {
  stream: MediaStream | null;
  status: CameraStatus;
  error: CameraErrorKind | null;
  onRetry: () => void;
  viewModeHref: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 스트림이 바뀌면 <video>에 연결한다
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) video.play().catch(() => {});
  }, [stream]);

  return (
    <section
      aria-label="내 자세"
      className="glass relative min-h-[420px] overflow-hidden rounded-[2rem] bg-ink md:min-h-[560px]"
    >
      {/* 거울처럼 좌우 반전해서 보여 준다 (DESIGN 4 거울 표시) */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        aria-label="내 카메라 영상 (거울 화면)"
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
      />
      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-lime/15 px-3 py-1 text-xs font-semibold text-lime ring-1 ring-lime/30">
        나
      </span>
      <CameraGate status={status} error={error} onRetry={onRetry} viewModeHref={viewModeHref} />
    </section>
  );
}
