"use client";

// MediaPipe 불러오기 · 인식 반복 · 인식 속도 측정 훅
// Design Ref: DESIGN 2 처리 1~2, DESIGN 5 (Pose Landmarker lite, public/mediapipe/ 에 내장), DESIGN 6 usePoseLandmarker
// PRD 7번: 영상은 브라우저 안의 MediaPipe에만 넣는다. 서버로 보내거나 저장하지 않는다. (SC-6)
// Plan SC: SC-2 — "카메라 인식 → 내 캐릭터 반영" 초당 횟수를 재서 화면에 보여 준다.

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Landmark, NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import { selectPerson } from "./personSelect";
import type { KeypointId } from "./skeleton";

/** 앱 안에 넣어 둔 MediaPipe 파일 위치 (외부 서버를 부르지 않는다) */
const WASM_BASE = "/mediapipe/wasm";
// full(정확도형) 모델: lite는 다리·옆모습 인식이 불안정해 사용자 확인 후 바꿨다 (DESIGN 5의 lite와 차이 → CHECK.md에 기록)
const MODEL_PATH = "/mediapipe/pose_landmarker_full.task";

/** 관절 점 이름 → MediaPipe 관절 번호 (왼쪽/오른쪽은 사람 몸 기준으로 MediaPipe와 같다) */
export const MP_INDEX: Record<KeypointId, number> = {
  shoulderL: 11, shoulderR: 12,
  elbowL: 13, elbowR: 14,
  wristL: 15, wristR: 16,
  indexL: 19, indexR: 20,
  hipL: 23, hipR: 24,
  kneeL: 25, kneeR: 26,
  ankleL: 27, ankleR: 28,
  toeL: 31, toeR: 32,
};

/** 한 번 인식한 결과 (고른 한 사람) */
export type PoseFrame = {
  /** 화면 좌표(0~1) 33개 — 영상 위에 점을 그릴 때 사용 */
  image: NormalizedLandmark[];
  /** 3D 좌표(미터, 엉덩이 가운데 기준) 33개 — 각도 계산·내 마네킹에 사용 (작업 9~10) */
  world: Landmark[];
  /** 화면에 잡힌 사람 수 */
  people: number;
  /** 인식한 시각(ms) */
  time: number;
};

export type PoseStatus = "idle" | "loading" | "ready" | "error";

/**
 * @param videoRef 카메라 영상이 나오는 <video>
 * @param enabled  카메라가 켜졌을 때만 true
 */
export function usePoseLandmarker(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean) {
  const [status, setStatus] = useState<PoseStatus>("idle");
  const [fps, setFps] = useState(0);
  const [people, setPeople] = useState(0);
  /** 가장 최근 인식 결과. 매 프레임 바뀌므로 화면 다시 그리기 없이 ref로 읽는다 */
  const frameRef = useRef<PoseFrame | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;
    let rafId = 0;
    let lastVideoTime = -1;
    let lastTimestamp = 0;
    let count = 0;
    let windowStart = performance.now();
    let lastPeople = -1;

    async function load() {
      setStatus("loading");
      try {
        // 무거운 라이브러리는 카메라 모드에서만 불러온다
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        const create = (delegate: "GPU" | "CPU") =>
          PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_PATH, delegate },
            runningMode: "VIDEO",
            numPoses: 2, // 두 명까지 찾아서 그중 한 명을 고른다
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        try {
          landmarker = await create("GPU");
        } catch {
          landmarker = await create("CPU"); // 그래픽 가속이 안 되는 기기
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        setStatus("ready");
        rafId = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        console.error("자세 인식 모델을 불러오지 못했습니다", err);
        setStatus("error");
      }
    }

    function loop() {
      if (cancelled || !landmarker) return;
      const video = videoRef.current;
      // 새 영상 프레임이 있을 때만 인식한다 (같은 프레임을 두 번 넣지 않음)
      if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const now = Math.max(performance.now(), lastTimestamp + 1); // 시각은 항상 늘어나야 한다
        lastTimestamp = now;
        const result = landmarker.detectForVideo(video, now);
        const index = selectPerson(result.landmarks);
        frameRef.current =
          index >= 0
            ? {
                image: result.landmarks[index],
                world: result.worldLandmarks[index],
                people: result.landmarks.length,
                time: now,
              }
            : null;
        count++;
        if (result.landmarks.length !== lastPeople) {
          lastPeople = result.landmarks.length;
          setPeople(lastPeople);
        }
      }
      // 인식 속도: 0.5초마다 초당 횟수로 바꿔 화면에 알린다 (SC-2)
      const t = performance.now();
      if (t - windowStart >= 500) {
        setFps(Math.round((count * 1000) / (t - windowStart)));
        count = 0;
        windowStart = t;
      }
      rafId = requestAnimationFrame(loop);
    }

    load();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      landmarker?.close();
      frameRef.current = null;
      setStatus("idle");
      setFps(0);
      setPeople(0);
    };
  }, [enabled, videoRef]);

  return { status, fps, people, frameRef };
}
