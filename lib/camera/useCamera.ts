"use client";

// 카메라 켜기·끄기·오류 종류 구분 훅
// Design Ref: DESIGN 7 예외 처리 표 (권한 거부 / 카메라 없음 / 다른 앱 사용 중 / 화면 나감 / 완료 시 끔)
// PRD 7번: 카메라는 사용자가 [카메라로 시작]을 누르고 권한 창에서 허용했을 때만 켠다.
//          스트레칭 화면을 나가거나 끝내면 카메라를 즉시 끈다. 영상은 브라우저 밖으로 보내지 않는다.

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "active" | "error";

/** 카메라 오류 종류 — 화면 안내 문구를 고르는 데 쓴다 */
export type CameraErrorKind =
  | "denied" // 사용자가 권한을 거부함 (NotAllowedError)
  | "notFound" // 카메라가 없음, 또는 쓰던 중에 빠짐 (NotFoundError, 트랙 종료)
  | "inUse" // 다른 앱(줌 등)이 이미 쓰는 중 (NotReadableError)
  | "insecure" // https가 아니거나 브라우저가 카메라를 지원하지 않음
  | "unknown";

/** 브라우저 오류 → 오류 종류 */
export function classifyCameraError(err: unknown): CameraErrorKind {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "notFound";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "inUse";
    case "SecurityError":
      return "insecure";
    default:
      return "unknown";
  }
}

/** 요청할 영상 조건: 앞 카메라, 가로 720p 정도 (자세 인식에 충분하고 부담이 적음) */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

/**
 * @param enabled true일 때만 카메라를 켠다 (카메라 모드이고 완료 화면이 아닐 때).
 *                false가 되면 즉시 끈다.
 */
export function useCamera(enabled: boolean) {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<CameraErrorKind | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // [다시 시도]를 누를 때마다 올려서 효과를 다시 실행한다
  const [attempt, setAttempt] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false; // 화면이 먼저 사라지면(또는 개발 모드 이중 실행) 늦게 켜진 카메라를 바로 끈다

    async function start() {
      setStatus("requesting");
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
        setStatus("error");
        setError("insecure");
        return;
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS, audio: false });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = media;
        // 쓰던 중 카메라가 빠지거나 다른 곳에서 끊기면 오류로 바꾼다
        media.getVideoTracks()[0]?.addEventListener("ended", () => {
          if (streamRef.current !== media) return;
          stopTracks();
          setStream(null);
          setStatus("error");
          setError("notFound");
        });
        setStream(media);
        setStatus("active");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(classifyCameraError(err));
      }
    }
    start();

    return () => {
      cancelled = true;
      stopTracks(); // 화면을 나가거나 enabled가 false가 되면 즉시 끈다 (PRD 7번)
      setStream(null);
      setStatus("idle");
    };
  }, [enabled, attempt, stopTracks]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, error, stream, retry };
}
