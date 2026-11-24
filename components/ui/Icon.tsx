// SF Symbols 느낌의 선 아이콘 — 이모지 대신 쓴다 (iOS 26 디자인 적용, 사용자 요청: 이모지 삭제)
// 색은 글자색(currentColor)을 따르고, 크기는 글자 크기에 맞춘다(기본 1.1em).

import type { SportId } from "@/lib/data/sports";

const PATHS = {
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01",
  camera: "M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  play: "M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  warning: "M12 3 2 20h20zM12 10v4M12 17h.01",
  compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15.5 8.5l-2 5-5 2 2-5z",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9",
  hand: "M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5v-7a1.5 1.5 0 0 1 3 0V12M14 6.5a1.5 1.5 0 0 1 3 0V13M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L4 15.5a1.6 1.6 0 0 1 2.5-2L8 15",
  laptop: "M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10H4zM2 19h20",
  check: "M5 12.5 10 17.5 19 7",
  chevronRight: "M9 5l7 7-7 7",
  chevronLeft: "M15 5l-7 7 7 7",
  chevronDown: "M5 9l7 7 7-7",
  rotate: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  arrowUp: "M12 20V4M5 11l7-7 7 7",
  arrowLeftRight: "M7 7h12l-3-3M17 17H5l3 3",
  timer: "M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 10v4l2.5 1.5M9 2h6",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, className = "", label }: { name: IconName; className?: string; label?: string }) {
  const filled = name === "play";
  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block h-[1.1em] w-[1.1em] shrink-0 ${className}`}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** 종목 아이콘 (공·달리는 사람·농구공·테니스공) */
export function SportIcon({ id, className = "" }: { id: SportId; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    className: `inline-block h-[1.1em] w-[1.1em] shrink-0 ${className}`,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (id) {
    case "soccer":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 7.5l3.8 2.8-1.5 4.5H9.7L8.2 10.3zM12 7.5V3M15.8 10.3l4.4-1.4M14.3 14.8l2.6 3.8M9.7 14.8l-2.6 3.8M8.2 10.3 3.8 8.9" />
        </svg>
      );
    case "running":
      return (
        <svg {...common}>
          <circle cx="14.5" cy="4" r="2" />
          <path d="M9 21l3-6-2.5-2.5L11 8l4 2 3 1M11 8 7 9.5 5.5 13M12 15l3.5 2.5L17 21" />
        </svg>
      );
    case "basketball":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.5 12h19M12 2.5v19M5.3 5.3c3.3 3.3 3.3 10.1 0 13.4M18.7 5.3c-3.3 3.3-3.3 10.1 0 13.4" />
        </svg>
      );
    case "tennis":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M5.2 5.4c3.6 3.5 3.6 9.7 0 13.2M18.8 5.4c-3.6 3.5-3.6 9.7 0 13.2" />
        </svg>
      );
  }
}
