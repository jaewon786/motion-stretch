"use client";

// 종목 코어 4개 — 4막(종목 선택)에서 선수 주위를 도는 와이어프레임 결정. 종목 카드에 마우스를 올리면 해당 코어가 커지고 빛난다
// Design Ref: immersive-design 설계 2번 (종목 코어), 성공 기준 DS-3 (HTML ↔ 3D 연동)

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SPORTS, type SportId } from "@/lib/data/sports";
import { experience, hud, toScreen } from "@/lib/experience/store";

/** 종목별 모양: 축구=깎은 정이십면체(공), 러닝=트랙 고리, 농구=이음선 구, 테니스=정십이면체 */
function coreGeometry(id: SportId): THREE.BufferGeometry {
  switch (id) {
    case "soccer":
      return new THREE.IcosahedronGeometry(0.3, 1);
    case "running":
      return new THREE.TorusGeometry(0.26, 0.06, 8, 36);
    case "basketball":
      return new THREE.SphereGeometry(0.29, 10, 7);
    case "tennis":
      return new THREE.DodecahedronGeometry(0.29, 0);
  }
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const STEEL = new THREE.Color("#9fb0c4");
const LIME = new THREE.Color("#c6ff3d").multiplyScalar(2.2);

export default function SportCores() {
  const ring = useRef<THREE.Group>(null);
  const cores = useMemo(
    () =>
      SPORTS.map((s, i) => {
        const angle = (i / SPORTS.length) * Math.PI * 2 + Math.PI / 4;
        return {
          sport: s,
          angle,
          geometry: coreGeometry(s.id),
          wire: new THREE.MeshBasicMaterial({ color: STEEL.clone(), wireframe: true, transparent: true, toneMapped: false }),
          glow: new THREE.MeshBasicMaterial({ color: new THREE.Color("#7dd3fc").multiplyScalar(1.5), transparent: true, toneMapped: false }),
        };
      }),
    [],
  );
  const meshRefs = useRef<(THREE.Group | null)[]>([]);
  const screenTmp = useMemo(() => new THREE.Vector3(), []);
  const worldTmp = useMemo(() => new THREE.Vector3(), []);
  const scales = useRef(cores.map(() => 1));

  useFrame((state, delta) => {
    const reduce = experience.reducedMotion;
    const t = reduce ? 0 : state.clock.elapsedTime;
    const show = smooth(0.66, 0.92, experience.progress); // 4막에서만 보임
    if (ring.current) {
      ring.current.visible = show > 0.01;
      if (!reduce) ring.current.rotation.y += delta * 0.12;
    }
    cores.forEach((c, i) => {
      const g = meshRefs.current[i];
      if (!g) return;
      const hovered = experience.hoveredSport === c.sport.id;
      const target = hovered ? 1.45 : 1;
      scales.current[i] += (target - scales.current[i]) * (1 - Math.exp(-8 * Math.min(delta, 0.1)));
      g.scale.setScalar(scales.current[i] * (0.6 + 0.4 * show));
      g.position.y = 1.0 + Math.sin(t * 0.9 + i * 1.7) * 0.08;
      g.rotation.x = t * 0.3 + i;
      g.rotation.y = t * 0.45 + i;
      c.wire.color.copy(hovered ? LIME : STEEL);
      c.wire.opacity = show * (hovered ? 1 : 0.7);
      c.glow.opacity = show * (hovered ? 0.95 : 0.35);
      const label = hud.cores[i];
      if (label) {
        g.getWorldPosition(worldTmp);
        worldTmp.y += 0.5;
        const sp = toScreen(worldTmp, state.camera, state.size, screenTmp);
        label.style.opacity = sp ? String(show) : "0";
        if (sp) label.style.transform = `translate(${sp.x}px, ${sp.y}px) translate(-50%, -100%)`;
        label.dataset.hovered = hovered ? "1" : "0";
      }
    });
  });

  return (
    <group ref={ring}>
      {cores.map((c, i) => (
        <group key={c.sport.id} position={[Math.cos(c.angle) * 2.3, 0, Math.sin(c.angle) * 2.3]}>
          <group
            ref={(g) => {
              meshRefs.current[i] = g;
            }}
          >
            <mesh geometry={c.geometry} material={c.wire} />
            <mesh material={c.glow}>
              <sphereGeometry args={[0.07, 16, 12]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
