"use client";

// 3D 무대 — 조명·반사 바닥·접지 그림자·환경광·빛 번짐·돌려 보기가 들어간 캔버스
// Design Ref: DESIGN 4 — 설계안 C 연출. 외부 파일(HDR 등)을 불러오지 않고 앱 안에서 환경광을 만든다.
// Design Ref: DESIGN 4 "성능" — 기기가 느리면 후처리·반사를 끄고 해상도를 낮춘다 (SC-2 확보)

import { useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
  PerformanceMonitor,
} from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

export type StageCanvasProps = {
  children: ReactNode;
  /** 캐릭터를 세로축으로 돌리는 각도(도). 옆으로 서는 동작은 ±90 */
  yawDeg?: number;
  /** 거울처럼 좌우 반전해서 보여 줄지 (DESIGN 4 "거울 표시") */
  mirror?: boolean;
  /** 천천히 저절로 돌기 (첫 화면 연출) */
  autoRotate?: boolean;
  /** 마우스로 돌려 보기 허용 */
  interactive?: boolean;
  /** 바닥 발광 원 색 */
  accent?: string;
  /** 가벼운 모드: 작은 미리보기용. 반사 바닥·후처리·실시간 그림자를 끄고, 바뀔 때만 다시 그린다 */
  lite?: boolean;
  /** 반사 바닥·빛 번짐 같은 무거운 효과를 켤지. 카메라 모드에서는 자세 인식에 GPU를 양보하려고 끈다 (SC-2) */
  effects?: boolean;
  className?: string;
};

const BG = "#060a16";

/** 캐릭터 방향 회전을 부드럽게 따라가는 무리 (정면 ↔ 옆 전환이 뚝 끊기지 않게) */
function YawGroup({ yawDeg, mirror, children }: { yawDeg: number; mirror: boolean; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const target = (yawDeg * Math.PI) / 180;
  // 처음 각도만 속성으로 주고, 이후 변화는 useFrame에서 천천히 따라간다 (속성으로 주면 바로 튀어 버림)
  const [initialYaw] = useState(target);
  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const diff = target - g.rotation.y;
    if (Math.abs(diff) < 1e-3) return;
    g.rotation.y += diff * (1 - Math.exp(-6 * Math.min(delta, 0.1)));
    state.invalidate(); // 가벼운 모드(바뀔 때만 그리기)에서도 회전이 끝까지 그려지게
  });
  return (
    <group ref={ref} rotation-y={initialYaw} scale={[mirror ? -1 : 1, 1, 1]}>
      {children}
    </group>
  );
}

export default function StageCanvas({
  children,
  yawDeg = 0,
  mirror = false,
  autoRotate = false,
  interactive = true,
  accent = "#c6ff3d",
  lite = false,
  effects = true,
  className,
}: StageCanvasProps) {
  // 기기 성능에 따라 고급 연출을 켜고 끈다 (가벼운 모드·효과 끔이면 처음부터 끔)
  const [perfOk, setPerfOk] = useState(true);
  const high = perfOk && !lite && effects;
  const [dpr, setDpr] = useState(lite ? 1.5 : 1.75);

  return (
    <div className={className}>
      <Canvas
        shadows={!lite}
        frameloop={lite ? "demand" : "always"}
        dpr={[1, dpr]}
        // 팔을 머리 위로 뻗는 동작(옆구리·삼두근)도 손끝까지 보이도록 거리를 둔다
        camera={{ position: [0, 1.2, 4.4], fov: 32, near: 0.1, far: 40 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        {!lite && (
          <PerformanceMonitor
            onDecline={() => {
              setPerfOk(false);
              setDpr(1);
            }}
            onIncline={() => setDpr(1.75)}
          />
        )}
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 6, 15]} />

        {/* 조명: 은은한 바탕광 + 위쪽 주광(그림자) + 뒤쪽 테두리광 2개 */}
        <ambientLight intensity={0.22} />
        <directionalLight
          position={[2.5, 5, 3.5]}
          intensity={2.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-2}
          shadow-camera-right={2}
          shadow-camera-top={2.5}
          shadow-camera-bottom={-0.5}
          shadow-bias={-0.0004}
        />
        <spotLight position={[-3, 3.2, -3.5]} angle={0.6} penumbra={0.8} intensity={38} color="#38bdf8" />
        <spotLight position={[3.2, 2.6, -3]} angle={0.6} penumbra={0.8} intensity={22} color={accent} />

        {/* 환경광: 외부 HDR 파일 없이 빛 판(Lightformer)으로 만든 반사 환경 */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={1.6} position={[0, 4, -3]} scale={[8, 2, 1]} color="#bfdbfe" />
          <Lightformer form="rect" intensity={1.1} position={[-5, 2, 1]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
          <Lightformer form="rect" intensity={0.8} position={[5, 2, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} color="#ecfccb" />
          <Lightformer form="ring" intensity={0.6} position={[0, 3, 5]} scale={2} color="#7dd3fc" />
        </Environment>

        {/* 캐릭터: 방향 회전 + 거울 반전 */}
        <YawGroup yawDeg={yawDeg} mirror={mirror}>
          {children}
        </YawGroup>

        {/* 바닥: 살짝 반사되는 어두운 바닥 + 발광 원 + 접지 그림자 */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          {high ? (
            <MeshReflectorMaterial
              blur={[300, 80]}
              resolution={512}
              mixBlur={1}
              mixStrength={1.4}
              roughness={0.9}
              depthScale={1}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.2}
              color="#0a1022"
              metalness={0.55}
              mirror={0}
            />
          ) : (
            <meshStandardMaterial color="#0a1022" roughness={0.85} metalness={0.3} />
          )}
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
          <ringGeometry args={[0.62, 0.65, 96]} />
          <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.85} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]}>
          <circleGeometry args={[0.62, 96]} />
          <meshBasicMaterial color="#0f1a33" transparent opacity={0.6} />
        </mesh>
        <ContactShadows position={[0, 0.003, 0]} opacity={0.65} scale={4} blur={2.4} far={2} resolution={512} />

        {/* 조종기는 항상 켜 두어야 카메라가 몸 가운데(target)를 바라본다. 돌려 보기를 막을 때는 회전·확대만 끈다 */}
        <OrbitControls
          enableRotate={interactive}
          enablePan={false}
          enableZoom={interactive}
          target={[0, 0.95, 0]}
          minDistance={2.2}
          maxDistance={6}
          minPolarAngle={0.35}
          maxPolarAngle={1.62}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          enableDamping
        />

        {high && (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1} luminanceSmoothing={0.2} />
            <Vignette offset={0.28} darkness={0.75} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
