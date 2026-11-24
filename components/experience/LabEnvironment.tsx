"use client";

// 모션 캡처 실험실 환경 — 셰이더 바닥 격자, 둘레의 모션 캡처 카메라, 위아래로 훑는 스캐너 고리, 떠다니는 먼지
// Design Ref: immersive-design 설계 2번 (스캐너·바닥·먼지)

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experience } from "@/lib/experience/store";
import { seededRandom } from "@/lib/experience/random";

/** 스캔 높이(미터): 시간에 따라 바닥 근처 ↔ 머리 위를 오간다. 입자 선수 셰이더도 같은 값을 쓴다 */
export function scanHeight(t: number) {
  return 0.1 + (0.5 + 0.5 * Math.sin(t * 0.7)) * 1.75;
}

/** 바닥: 가운데에서 멀어질수록 사라지는 격자 + 숨 쉬는 동심원 */
function LabFloor() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vXZ;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vXZ = wp.xz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec2 vXZ;
          float gridLine(vec2 p, float size, float width) {
            vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
            return 1.0 - min(min(g.x, g.y) / width, 1.0);
          }
          void main() {
            float r = length(vXZ);
            float fade = 1.0 - smoothstep(1.5, 9.0, r);
            float fine = gridLine(vXZ, 0.5, 1.0) * 0.35;
            float coarse = gridLine(vXZ, 2.0, 1.2) * 0.6;
            float ring = 1.0 - smoothstep(0.0, 0.015, abs(r - 0.95));
            float pulse = 1.0 - smoothstep(0.0, 0.02, abs(r - mod(uTime * 0.6, 6.0)));
            vec3 col = vec3(0.55, 0.62, 0.72) * (fine + coarse) + vec3(0.78, 1.0, 0.24) * ring * 0.9
                     + vec3(0.49, 0.83, 0.99) * pulse * 0.35 * (1.0 - smoothstep(1.0, 6.0, r));
            float a = (fine + coarse) * 0.5 + ring * 0.8 + pulse * 0.25;
            gl_FragColor = vec4(col, a * fade);
          }`,
      }),
    [],
  );
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = mesh.current?.material as THREE.ShaderMaterial | undefined;
    if (m && !experience.reducedMotion) m.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} position-y={0.001} material={material}>
      <planeGeometry args={[24, 24]} />
    </mesh>
  );
}

/** 둘레에 선 모션 캡처 카메라 8대 (기둥 + 머리 + 빛나는 표시등) — 스포츠 과학 실험실 상징 */
function MocapRig() {
  const rigs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const r = 4.4; // 카메라 앞을 가로지르지 않도록 넓게
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, rotY: -a + Math.PI / 2, h: 2.1 + (i % 2) * 0.35 };
      }),
    [],
  );
  const ledRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    if (experience.reducedMotion) return;
    const t = state.clock.elapsedTime;
    ledRefs.current.forEach((m, i) => {
      if (!m) return;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.45 * Math.sin(t * 2 + i * 0.8);
    });
  });
  return (
    <group>
      {rigs.map((r, i) => (
        <group key={i} position={[r.x, 0, r.z]} rotation-y={r.rotY}>
          <mesh position-y={r.h / 2}>
            <cylinderGeometry args={[0.012, 0.018, r.h, 6]} />
            <meshStandardMaterial color="#2a3442" metalness={0.8} roughness={0.35} />
          </mesh>
          {/* 카메라 머리: 가운데(선수)를 바라보게 살짝 숙임 */}
          <group position-y={r.h} rotation-x={0.35}>
            <mesh>
              <boxGeometry args={[0.12, 0.08, 0.16]} />
              <meshStandardMaterial color="#1a222d" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh
              position-z={0.085}
              ref={(m) => {
                ledRefs.current[i] = m;
              }}
            >
              <circleGeometry args={[0.025, 16]} />
              <meshBasicMaterial color={i % 3 === 0 ? "#c6ff3d" : "#ff5a5a"} transparent toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** 위아래로 훑는 스캐너 고리 2개 + 스캔 빛 판 */
function Scanner() {
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const sheet = useRef<THREE.Mesh>(null);
  const sheetMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uOpacity: { value: 0.5 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uOpacity; varying vec2 vUv;
          void main(){ float r = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.2, r) * 0.18 + (1.0 - smoothstep(0.0, 0.04, abs(r - 0.92))) * 0.6;
            gl_FragColor = vec4(vec3(0.6, 0.9, 1.0) * a, a * uOpacity); }`,
      }),
    [],
  );
  useFrame((state) => {
    const t = experience.reducedMotion ? 2.2 : state.clock.elapsedTime;
    const y = scanHeight(t);
    ringA.current?.position.setY(y);
    sheet.current?.position.setY(y);
    if (ringB.current) {
      ringB.current.position.setY(scanHeight(t + Math.PI / 0.7));
      ringB.current.rotation.z = Math.sin(t * 0.5) * 0.12;
    }
  });
  return (
    <group>
      <mesh ref={ringA} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.78, 0.005, 8, 96]} />
        <meshBasicMaterial color={new THREE.Color("#7dd3fc").multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.95, 0.003, 8, 96]} />
        <meshBasicMaterial color={new THREE.Color("#c6ff3d").multiplyScalar(1.6)} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      <mesh ref={sheet} rotation-x={-Math.PI / 2} material={sheetMat}>
        <planeGeometry args={[1.7, 1.7]} />
      </mesh>
    </group>
  );
}

/** 떠다니는 먼지 */
function Dust({ count = 1200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const rnd = seededRandom(11);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * 14;
      pos[i * 3 + 1] = rnd() * 6;
      pos[i * 3 + 2] = (rnd() - 0.5) * 14;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  useFrame((state, delta) => {
    if (!ref.current || experience.reducedMotion) return;
    ref.current.rotation.y += delta * 0.01;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.15;
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.018}
        color="#9fb3c8"
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

export default function LabEnvironment() {
  return (
    <group>
      <LabFloor />
      <MocapRig />
      <Scanner />
      <Dust />
    </group>
  );
}
