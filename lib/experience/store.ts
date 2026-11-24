"use client";

// 첫 화면 3D 연출용 작은 저장소 — 스크롤 진행도·마우스 위치·마우스를 올린 종목·움직임 줄이기
// Design Ref: immersive-design 설계 3번 (새 라이브러리 없이 useSyncExternalStore)
// 매 프레임 바뀌는 값(progress, pointer)은 3D가 useFrame에서 바로 읽고, React 다시 그리기는 하지 않는다.

import { useSyncExternalStore } from "react";
import type { SportId } from "@/lib/data/sports";

export const experience = {
  /** 첫 화면 스크롤 진행도 0~1 (화면 3개 높이 = 1막~3막) */
  progress: 0,
  /** 마우스 위치 -1~1 (화면 가운데 0) */
  pointer: { x: 0, y: 0 },
  /** 종목 카드에 마우스를 올린 종목 (3D 코어 강조용) */
  hoveredSport: null as SportId | null,
  /** 운영체제 "움직임 줄이기" 설정 */
  reducedMotion: false,
};

/**
 * 3D 위에 띄우는 HTML 라벨 (캔버스 밖의 일반 DOM). 3D 부품이 매 프레임 화면 좌표를 계산해 위치·글자를 바꾼다.
 * drei Html 대신 이 방식을 쓰는 이유: React 19 개발 모드에서 Html이 다시 만들어질 때 "렌더 중 루트 해제" 오류가 난다.
 */
export const hud = {
  joints: [] as (HTMLDivElement | null)[],
  jointCodes: [] as (HTMLSpanElement | null)[],
  jointVals: [] as (HTMLSpanElement | null)[],
  cores: [] as (HTMLDivElement | null)[],
};

/** 3D 좌표 → 캔버스 안 화면 좌표(px). 카메라 뒤에 있으면 null */
export function toScreen(
  v: { x: number; y: number; z: number },
  camera: import("three").Camera,
  size: { width: number; height: number },
  out: import("three").Vector3,
) {
  out.set(v.x, v.y, v.z).project(camera);
  if (out.z > 1) return null;
  return { x: (out.x * 0.5 + 0.5) * size.width, y: (-out.y * 0.5 + 0.5) * size.height };
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** 종목 카드 마우스 올림/내림 (HTML → 3D 연동, 설계 성공 기준 DS-3) */
export function setHoveredSport(id: SportId | null) {
  if (experience.hoveredSport === id) return;
  experience.hoveredSport = id;
  emit();
}

/** React 쪽에서 마우스를 올린 종목을 읽을 때 */
export function useHoveredSport() {
  return useSyncExternalStore(
    subscribe,
    () => experience.hoveredSport,
    () => null,
  );
}
