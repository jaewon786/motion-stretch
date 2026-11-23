"use client";

// 카메라 영상 위에 인식한 관절 점과 뼈대 선을 겹쳐 그린다 (인식이 맞는지 눈으로 확인)
// Design Ref: DESIGN 2 처리 1 결과 표시. 영상은 object-cover로 잘려 보이므로 같은 비율로 좌표를 맞춘다.

import { useEffect, useRef, type RefObject } from "react";
import type { PoseFrame } from "@/lib/pose/usePoseLandmarker";
import { MIN_VISIBILITY } from "@/lib/config/thresholds";

/** 그릴 뼈대 선 (MediaPipe 관절 번호) — 얼굴은 빼고 몸통·팔·다리만 */
const BONES: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [15, 19], [12, 14], [14, 16], [16, 20],
  [23, 25], [25, 27], [27, 31], [24, 26], [26, 28], [28, 32],
];
const JOINTS = [11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26, 27, 28, 31, 32];

export default function PoseOverlay({
  videoRef,
  frameRef,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  frameRef: RefObject<PoseFrame | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // 캔버스를 화면에 보이는 크기(고해상도 화면 고려)에 맞춘다
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const frame = frameRef.current;
      if (!frame || !video.videoWidth) return;

      // object-cover: 영상이 칸을 꽉 채우도록 확대되고 넘치는 부분이 잘린다
      const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
      const dw = video.videoWidth * scale;
      const dh = video.videoHeight * scale;
      const ox = (w - dw) / 2;
      const oy = (h - dh) / 2;
      const px = (i: number) => ox + frame.image[i].x * dw;
      const py = (i: number) => oy + frame.image[i].y * dh;
      const seen = (i: number) => (frame.image[i].visibility ?? 1) >= MIN_VISIBILITY;

      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(198, 255, 61, 0.85)";
      for (const [a, b] of BONES) {
        if (!seen(a) || !seen(b)) continue;
        ctx.beginPath();
        ctx.moveTo(px(a), py(a));
        ctx.lineTo(px(b), py(b));
        ctx.stroke();
      }
      for (const i of JOINTS) {
        if (!seen(i)) continue;
        ctx.beginPath();
        ctx.arc(px(i), py(i), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, frameRef]);

  // 영상과 똑같이 거울처럼 좌우 반전
  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100" />;
}
