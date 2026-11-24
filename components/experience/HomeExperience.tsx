"use client";

// 첫 화면 고정 배경 3D — 스크롤에 따라 카메라가 3막(스캔 → 비교 → 종목 선택)을 지나가고, 마우스에 살짝 기울어진다
// Design Ref: immersive-design 설계 1~3번, 성공 기준 DS-1(스크롤 3막)·DS-2(마우스 시차)·DS-5(움직임 줄이기)
// 진짜 스크롤을 그대로 쓰고(키보드·화면 낭독기 유지) 카메라만 스크롤 위치를 부드럽게 따라간다.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { experience, hud } from "@/lib/experience/store";
import { SPORTS } from "@/lib/data/sports";
import ParticleAthlete from "./ParticleAthlete";
import LabEnvironment from "./LabEnvironment";
import SportCores from "./SportCores";

/** 카메라 키프레임: 스크롤 진행도 → 카메라 위치·바라보는 점 (x는 화면이 넓을 때 글 반대쪽으로 선수를 밀어내는 값) */
type Key = { p: number; pos: [number, number, number]; look: [number, number, number] };
const KEYS: Key[] = [
  { p: 0.0, pos: [2.4, 1.55, 5.4], look: [-1.15, 1.0, 0] }, // 1막: 글은 왼쪽, 선수는 오른쪽
  { p: 0.33, pos: [-2.9, 1.35, 3.7], look: [0.8, 0.95, 0] }, // 2막: 다가가서 옆에서 (글은 오른쪽)
  { p: 0.66, pos: [2.0, 1.45, 3.6], look: [-0.9, 0.9, 0] }, // 3막: 관절 각도 가까이 (글은 왼쪽)
  { p: 1.0, pos: [0, 3.6, 7.6], look: [0, 0.85, 0] }, // 4막: 높이 물러나 종목 코어 전체
];

const ease = (t: number) => t * t * (3 - 2 * t);

function sampleKeys(p: number, wide: boolean, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = ease(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
  outPos.set(...a.pos).lerp(new THREE.Vector3(...b.pos), t);
  outLook.set(...a.look).lerp(new THREE.Vector3(...b.look), t);
  // 좁은 화면(세로로 긴 휴대폰 등)에서는 선수를 가운데에 둔다
  if (!wide) {
    outLook.x *= 0.15;
    outLook.y += 0.6; // 좁은 화면: 카메라가 위를 보게 해 선수를 글 아래쪽으로 내린다 (글 가독성)
  }
}

/** 스크롤·마우스를 따라 부드럽게 움직이는 카메라 */
function CameraRig() {
  // 매 프레임 고치는 벡터는 ref에 담는다 (React 규칙: 훅이 돌려준 값은 직접 고치지 않음)
  const v = useRef({ look: new THREE.Vector3(0, 1, 0), pos: new THREE.Vector3(), target: new THREE.Vector3() });
  useFrame((state, delta) => {
    // 카메라·화면 크기는 useFrame이 넘겨주는 state에서 읽는다
    const { camera, size } = state;
    const { look, pos, target } = v.current;
    const wide = size.width / size.height > 1.15;
    const reduce = experience.reducedMotion;
    // 움직임 줄이기: 카메라를 1막 위치에 고정 (DS-5)
    sampleKeys(reduce ? 0 : experience.progress, wide, pos, target);
    if (!reduce) {
      pos.x += experience.pointer.x * 0.35;
      pos.y += experience.pointer.y * 0.18;
    }
    const k = reduce ? 1 : 1 - Math.exp(-3.5 * Math.min(delta, 0.1));
    camera.position.lerp(pos, k);
    look.lerp(target, k);
    camera.lookAt(look);
  });
  return null;
}

/** 창의 스크롤·마우스·움직임 줄이기 설정을 저장소에 기록 */
function useWindowInputs() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      experience.reducedMotion = media.matches;
    };
    const onScroll = () => {
      // 화면 3개 높이(1막 HERO + 2막 SCAN + 3막 COMPARE)를 지나면 1 (4막 CHOOSE 시작)
      experience.progress = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 3)));
    };
    const onPointer = (e: PointerEvent) => {
      experience.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      experience.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    onMotion();
    onScroll();
    media.addEventListener("change", onMotion);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      media.removeEventListener("change", onMotion);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointer);
      experience.progress = 0;
    };
  }, []);
}

/** WebGL을 쓸 수 있는지 (없으면 3D 없이 정적 배경만 — 설계 5번 오류 상태) */
function canUseWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function HomeExperience() {
  useWindowInputs();
  const [supported] = useState(() => (typeof window === "undefined" ? false : canUseWebGL()));
  const [effects, setEffects] = useState(true);
  const [dpr, setDpr] = useState(1.5);
  const caOffset = useMemo(() => new THREE.Vector2(0.0006, 0.0005), []);
  if (!supported) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        dpr={[1, dpr]}
        camera={{ position: [2.4, 1.55, 5.4], fov: 34, near: 0.1, far: 60 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      >
        {/* 기기가 느리면 후처리를 끄고 해상도를 낮춘다 (설계 5번 부분 상태) */}
        <PerformanceMonitor
          onDecline={() => {
            setEffects(false);
            setDpr(1);
          }}
        />
        <fogExp2 attach="fog" args={["#070b12", 0.075]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 2]} intensity={1.1} />
        <pointLight position={[0, 2.2, 1.5]} intensity={6} distance={6} color="#7dd3fc" />

        <CameraRig />
        <ParticleAthlete />
        <LabEnvironment />
        <SportCores />

        {effects && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.18} luminanceSmoothing={0.35} />
            <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />
            <Noise opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
            <Vignette offset={0.25} darkness={0.85} />
          </EffectComposer>
        )}
      </Canvas>

      {/* 3D 위 HUD 라벨 층 — 위치·글자는 3D 부품이 매 프레임 직접 바꾼다 */}
      <div className="absolute inset-0 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div
            key={`joint-${i}`}
            ref={(d) => {
              hud.joints[i] = d;
            }}
            className="group absolute left-0 top-0 opacity-0 will-change-transform"
          >
            <div className="flex translate-x-5 -translate-y-9 items-center gap-2 whitespace-nowrap group-data-[flip=1]:-translate-x-[calc(100%+1.25rem)] group-data-[flip=1]:flex-row-reverse">
              <span className="h-px w-8 bg-white/60" />
              <span className="liquid t-caption rounded-full px-2.5 py-1 font-semibold text-text">
                <span
                  ref={(e) => {
                    hud.jointCodes[i] = e;
                  }}
                />
                <span
                  className="ml-1.5 tabular-nums text-good"
                  ref={(e) => {
                    hud.jointVals[i] = e;
                  }}
                />
              </span>
            </div>
          </div>
        ))}
        {SPORTS.map((s, i) => (
          <div
            key={s.id}
            ref={(d) => {
              hud.cores[i] = d;
            }}
            className="t-caption2 absolute left-0 top-0 whitespace-nowrap font-semibold text-muted opacity-0 will-change-transform data-[hovered=1]:text-lime"
          >
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
