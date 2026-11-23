"use client";

// 3D 마네킹 — 관절 점 16개를 받아 매끈한 인형 모양으로 그린다
// Design Ref: DESIGN 4 — 설계안 C(마네킹 + 고급 연출): 정답은 유리 느낌 하늘색, 나는 무광 흰색, 핵심 관절에 빛나는 링
// 정답 자세(solvePose 결과)와 카메라로 본 내 관절 점을 같은 컴포넌트로 그린다.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clonePoints, lerpPointsInPlace, type KeypointId, type PosePoints } from "@/lib/pose/skeleton";
import { anchorPosition } from "@/lib/pose/angles";
import type { JointAngleId } from "@/lib/pose/types";

/** 관절 링 상태: 맞음(초록) / 조금 어긋남(노랑) / 많이 어긋남(빨강) / 안내용(하늘색) */
export type JointState = "good" | "warn" | "bad" | "hint";

export type MannequinProps = {
  /** 목표 관절 점. 마네킹은 이 점들을 향해 부드럽게 따라간다 */
  points: PosePoints;
  /** target = 정답 마네킹, me = 내 마네킹 */
  variant: "target" | "me";
  /** 링을 그릴 관절과 그 상태 */
  rings?: Partial<Record<JointAngleId, JointState>>;
  /** 따라가는 빠르기(1초당). 클수록 빨리 붙는다 */
  followSpeed?: number;
};

/** 링 색 (밝기를 1보다 크게 해 빛 번짐 효과가 걸리게 함) */
const RING_COLOR: Record<JointState, THREE.Color> = {
  good: new THREE.Color("#22c55e").multiplyScalar(2.4),
  warn: new THREE.Color("#facc15").multiplyScalar(2.2),
  bad: new THREE.Color("#ef4444").multiplyScalar(2.6),
  hint: new THREE.Color("#38bdf8").multiplyScalar(2.0),
};

/** 팔다리 마디: [시작 관절, 끝 관절, 굵기(반지름)] */
const LIMBS: [KeypointId, KeypointId, number][] = [
  ["shoulderL", "elbowL", 0.048], ["elbowL", "wristL", 0.04], ["wristL", "indexL", 0.032],
  ["shoulderR", "elbowR", 0.048], ["elbowR", "wristR", 0.04], ["wristR", "indexR", 0.032],
  ["hipL", "kneeL", 0.072], ["kneeL", "ankleL", 0.056], ["ankleL", "toeL", 0.04],
  ["hipR", "kneeR", 0.072], ["kneeR", "ankleR", 0.056], ["ankleR", "toeR", 0.04],
];

/** 관절 구슬: [관절, 반지름] */
const BALLS: [KeypointId, number][] = [
  ["shoulderL", 0.058], ["shoulderR", 0.058], ["elbowL", 0.046], ["elbowR", 0.046],
  ["wristL", 0.038], ["wristR", 0.038], ["indexL", 0.034], ["indexR", 0.034],
  ["hipL", 0.075], ["hipR", 0.075], ["kneeL", 0.062], ["kneeR", 0.062],
  ["ankleL", 0.05], ["ankleR", 0.05], ["toeL", 0.04], ["toeR", 0.04],
];

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** 몸통 옆모습 윤곽 (반지름 비율, 높이 비율) — 엉덩이·허리·가슴·어깨 */
const TORSO_PROFILE = [
  [0.0, 0.0], [0.78, 0.01], [0.96, 0.1], [0.92, 0.26], [0.8, 0.42],
  [0.88, 0.6], [1.0, 0.8], [0.92, 0.94], [0.55, 1.0], [0.0, 1.01],
].map(([r, y]) => new THREE.Vector2(r, y));

// 매 프레임 계산에 쓰는 임시 객체 (메모리 재사용)
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpX = new THREE.Vector3();
const tmpZ = new THREE.Vector3();
const tmpMat = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();

export default function Mannequin({ points, variant, rings, followSpeed = 8 }: MannequinProps) {
  const current = useRef<PosePoints>(clonePoints(points));
  const target = useRef<PosePoints>(points);
  useEffect(() => {
    target.current = points;
  }, [points]);

  const limbRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ballRefs = useRef<(THREE.Mesh | null)[]>([]);
  const torsoRef = useRef<THREE.Mesh>(null);
  const pelvisRef = useRef<THREE.Mesh>(null);
  const neckRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<Partial<Record<JointAngleId, THREE.Mesh | null>>>({});

  // 재질: 정답은 유리 느낌 하늘색, 나는 무광 흰색
  const material = useMemo(() => {
    if (variant === "target") {
      return new THREE.MeshPhysicalMaterial({
        color: "#8fd8ff",
        roughness: 0.18,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        iridescence: 0.35,
        sheen: 0.4,
        sheenColor: new THREE.Color("#c6f1ff"),
        emissive: new THREE.Color("#0b6aa8"),
        emissiveIntensity: 0.28,
      });
    }
    return new THREE.MeshStandardMaterial({ color: "#eef2f7", roughness: 0.55, metalness: 0.04 });
  }, [variant]);
  const visorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0f172a",
        roughness: 0.15,
        metalness: 0.6,
        emissive: new THREE.Color(variant === "target" ? "#38bdf8" : "#c6ff3d"),
        emissiveIntensity: 0.55,
      }),
    [variant],
  );
  useEffect(
    () => () => {
      material.dispose();
      visorMaterial.dispose();
    },
    [material, visorMaterial],
  );

  // 도형: 마디는 높이 1짜리 원기둥을 길이만큼 늘려 쓰고, 끝은 관절 구슬이 덮는다
  const geo = useMemo(() => {
    return {
      limbs: LIMBS.map(([, , r]) => new THREE.CylinderGeometry(r, r * 0.9, 1, 20, 1, true)),
      balls: BALLS.map(([, r]) => new THREE.SphereGeometry(r, 24, 16)),
      torso: new THREE.LatheGeometry(TORSO_PROFILE, 40),
      pelvis: new THREE.SphereGeometry(1, 32, 20),
      neck: new THREE.CylinderGeometry(0.042, 0.05, 1, 16, 1, true),
      head: new THREE.SphereGeometry(0.105, 32, 24),
      // 얼굴 앞(+Z)을 덮는 띠: 구의 가로 각도 π/2를 가운데로 ±0.9
      visor: new THREE.SphereGeometry(0.1, 32, 16, Math.PI / 2 - 0.9, 1.8, 1.05, 0.62),
      ring: new THREE.TorusGeometry(0.085, 0.011, 12, 48),
    };
  }, []);
  useEffect(
    () => () => {
      for (const g of [...geo.limbs, ...geo.balls, geo.torso, geo.pelvis, geo.neck, geo.head, geo.visor, geo.ring]) {
        g.dispose();
      }
    },
    [geo],
  );

  useFrame((state, delta) => {
    const p = current.current;
    // 목표 자세를 향해 부드럽게 이동 (프레임 속도와 무관하게 같은 빠르기)
    lerpPointsInPlace(p, target.current, 1 - Math.exp(-followSpeed * Math.min(delta, 0.1)));

    // 팔다리 마디
    LIMBS.forEach(([a, b], i) => {
      const mesh = limbRefs.current[i];
      if (!mesh) return;
      tmpDir.subVectors(p[b], p[a]);
      const len = tmpDir.length();
      mesh.position.addVectors(p[a], p[b]).multiplyScalar(0.5);
      if (len > 1e-5) mesh.quaternion.setFromUnitVectors(Y_AXIS, tmpDir.divideScalar(len));
      mesh.scale.set(1, Math.max(len, 1e-3), 1);
    });
    BALLS.forEach(([id], i) => ballRefs.current[i]?.position.copy(p[id]));

    // 몸 축: 위(척추), 왼쪽(어깨선), 앞
    const hipMid = tmpA.addVectors(p.hipL, p.hipR).multiplyScalar(0.5);
    const shoulderMid = tmpB.addVectors(p.shoulderL, p.shoulderR).multiplyScalar(0.5);
    const spine = tmpDir.subVectors(shoulderMid, hipMid);
    const spineLen = spine.length();
    spine.divideScalar(spineLen || 1);
    tmpX.subVectors(p.shoulderL, p.shoulderR);
    tmpX.addScaledVector(spine, -tmpX.dot(spine)).normalize(); // 척추와 직각인 왼쪽 방향
    tmpZ.crossVectors(tmpX, spine).normalize(); // 앞쪽
    tmpMat.makeBasis(tmpX, spine, tmpZ);

    const torso = torsoRef.current;
    if (torso) {
      torso.quaternion.setFromRotationMatrix(tmpMat);
      torso.position.copy(hipMid).addScaledVector(spine, -0.05);
      torso.scale.set(0.165, spineLen + 0.1, 0.105);
    }
    const pelvis = pelvisRef.current;
    if (pelvis) {
      pelvis.quaternion.setFromRotationMatrix(tmpMat);
      pelvis.position.copy(hipMid).addScaledVector(spine, 0.03);
      pelvis.scale.set(0.16, 0.1, 0.11);
    }
    const neck = neckRef.current;
    if (neck) {
      neck.quaternion.setFromUnitVectors(Y_AXIS, spine);
      neck.position.copy(shoulderMid).addScaledVector(spine, 0.06);
      neck.scale.set(1, 0.12, 1);
    }
    const head = headRef.current;
    if (head) {
      head.quaternion.setFromRotationMatrix(tmpMat);
      head.position.copy(shoulderMid).addScaledVector(spine, 0.2);
    }

    // 관절 링: 항상 카메라를 바라보게, 빨강은 맥박처럼 커졌다 작아짐
    // 부모(방향 회전·거울 반전)의 회전을 빼야 화면에서 정면으로 보인다
    const t = state.clock.elapsedTime;
    (Object.entries(ringRefs.current) as [JointAngleId, THREE.Mesh | null][]).forEach(([id, mesh]) => {
      if (!mesh) return;
      mesh.position.copy(anchorPosition(p, id));
      if (mesh.parent) {
        mesh.parent.getWorldQuaternion(tmpQuat);
        mesh.quaternion.copy(tmpQuat.invert().multiply(state.camera.quaternion));
      } else {
        mesh.quaternion.copy(state.camera.quaternion);
      }
      const bad = rings?.[id] === "bad";
      mesh.scale.setScalar(bad ? 1 + 0.18 * Math.sin(t * 7) : 1);
    });
  });

  return (
    <group>
      {LIMBS.map((_, i) => (
        <mesh
          key={`limb-${i}`}
          ref={(m) => {
            limbRefs.current[i] = m;
          }}
          geometry={geo.limbs[i]}
          material={material}
          castShadow
        />
      ))}
      {BALLS.map((_, i) => (
        <mesh
          key={`ball-${i}`}
          ref={(m) => {
            ballRefs.current[i] = m;
          }}
          geometry={geo.balls[i]}
          material={material}
          castShadow
        />
      ))}
      <mesh ref={torsoRef} geometry={geo.torso} material={material} castShadow />
      <mesh ref={pelvisRef} geometry={geo.pelvis} material={material} castShadow />
      <mesh ref={neckRef} geometry={geo.neck} material={material} castShadow />
      <group ref={headRef}>
        <mesh geometry={geo.head} material={material} castShadow />
        {/* 얼굴 방향을 알려 주는 빛나는 가리개 */}
        <mesh geometry={geo.visor} material={visorMaterial} scale={1.06} position={[0, 0.01, 0.006]} />
      </group>
      {rings &&
        (Object.entries(rings) as [JointAngleId, JointState][]).map(([id, state]) => (
          <mesh
            key={`ring-${id}`}
            ref={(m) => {
              ringRefs.current[id] = m;
            }}
            geometry={geo.ring}
            renderOrder={10}
          >
            <meshBasicMaterial color={RING_COLOR[state]} toneMapped={false} depthTest={false} transparent opacity={0.95} />
          </mesh>
        ))}
    </group>
  );
}
