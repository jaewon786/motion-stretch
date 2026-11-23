"use client";

// 카메라 허용·오류 안내 겹 화면
// Design Ref: DESIGN 7 예외 처리 표, DESIGN 1-3 "카메라를 켜기 직전 PRD 7번 안내 문구를 확인 버튼 없이 보여 준다 (SC-5)"
// PRD 4번 예외 흐름: 카메라 거부 → 이유와 다시 허용 방법 / 카메라 없음·사용 중 → 원인별 안내 + 보기 모드로 진행

import Link from "next/link";
import type { CameraErrorKind, CameraStatus } from "@/lib/camera/useCamera";

/** PRD 7번 처음 카메라를 켤 때 안내 문구 (문장 그대로) */
export const CAMERA_PRIVACY_NOTICE =
  "영상은 이 기기 밖으로 나가지 않습니다. 교정 문구를 만들 때 관절 각도 숫자만 AI에 보냅니다.";

const ERROR_TEXT: Record<CameraErrorKind, { title: string; body: string; steps?: string[] }> = {
  denied: {
    title: "카메라 사용이 허용되지 않았어요",
    body: "내 자세를 정답과 비교하려면 카메라가 필요해요. 영상은 이 기기 안에서만 쓰이고 저장되지 않아요.",
    steps: [
      "주소창 왼쪽의 자물쇠(🔒) 또는 설정 아이콘을 누르세요",
      "카메라를 '허용'으로 바꾸세요",
      "아래 [다시 시도]를 누르세요",
    ],
  },
  notFound: {
    title: "카메라를 찾을 수 없어요",
    body: "연결된 웹캠이 없거나 연결이 끊어졌어요. 웹캠을 연결한 뒤 다시 시도하거나, 카메라 없이 보기 모드로 동작을 익혀 보세요.",
  },
  inUse: {
    title: "다른 앱이 카메라를 쓰고 있어요",
    body: "줌·팀즈·다른 브라우저 탭처럼 카메라를 쓰는 앱을 닫은 뒤 다시 시도해 주세요.",
  },
  insecure: {
    title: "이 주소에서는 카메라를 쓸 수 없어요",
    body: "카메라는 보안 연결(https) 주소에서만 켤 수 있어요. 최신 크롬 브라우저로 https 주소에서 열어 주세요.",
  },
  unknown: {
    title: "카메라를 켜지 못했어요",
    body: "잠시 뒤 다시 시도해 주세요. 계속 안 되면 카메라 없이 보기 모드로 동작을 익힐 수 있어요.",
  },
};

export default function CameraGate({
  status,
  error,
  onRetry,
  viewModeHref,
}: {
  status: CameraStatus;
  error: CameraErrorKind | null;
  onRetry: () => void;
  viewModeHref: string;
}) {
  if (status === "active") return null;

  // 켜는 중: PRD 7번 안내 문구를 버튼 없이 보여 주고, 브라우저 권한 창을 기다린다
  if (status !== "error") {
    return (
      <div role="status" className="absolute inset-0 flex items-center justify-center bg-ink/80 p-6 backdrop-blur-sm">
        <div className="max-w-sm text-center">
          <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-2 border-line border-t-lime" aria-hidden />
          <p className="mt-5 text-lg font-bold">카메라를 켜는 중이에요</p>
          <p className="mt-1 text-sm text-muted">브라우저 위쪽 알림에서 [허용]을 눌러 주세요.</p>
          <p className="mt-5 rounded-2xl border border-lime/25 bg-lime/10 px-4 py-3 text-sm leading-6 text-lime">
            <span aria-hidden>🔒 </span>
            {CAMERA_PRIVACY_NOTICE}
          </p>
        </div>
      </div>
    );
  }

  const text = ERROR_TEXT[error ?? "unknown"];
  return (
    <div role="alert" className="absolute inset-0 flex items-center justify-center bg-ink/90 p-6 backdrop-blur-sm">
      <div className="max-w-md">
        <div className="text-4xl" aria-hidden>
          📷
        </div>
        <h3 className="mt-3 text-xl font-black">{text.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{text.body}</p>
        {text.steps && (
          <ol className="mt-4 space-y-1.5 text-sm">
            {text.steps.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {error !== "insecure" && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-lime px-5 py-2.5 font-bold text-ink transition hover:brightness-110"
            >
              다시 시도
            </button>
          )}
          <Link
            href={viewModeHref}
            className="rounded-full border border-line px-5 py-2.5 font-semibold transition hover:border-sky hover:text-sky"
          >
            👀 보기 모드로 (카메라 없이)
          </Link>
        </div>
      </div>
    </div>
  );
}
