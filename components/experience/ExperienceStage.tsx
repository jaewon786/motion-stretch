"use client";

// 첫 화면 3D 배경 껍데기 — 3D는 브라우저에서만 불러온다 (DESIGN 5: ssr false). 불러오기 전에는 CSS 배경만 보인다.

import dynamic from "next/dynamic";

const HomeExperience = dynamic(() => import("./HomeExperience"), { ssr: false });

export default function ExperienceStage() {
  return <HomeExperience />;
}
